#!/usr/bin/env python3
"""
rebuild_trump_dapp_kpi.py
--------------------------
Rebuilds public/data/trump_dapp_kpi.json (Trump Demand & Collection page KPIs)
from public/data/trump_dapp.XLSX.

Classification: Trump's Payment Plan Name values are ratio-style
("30:30:40", "35:65", "BARESHELL", etc.) and never contain literal "CLP"
text (confirmed against this file - 0 of 41 unique plan names). Per the
documented decision (doc section 6.3), ALL Trump milestones are classified
as TLP; the "clp" bucket is kept present but empty for schema consistency
with Edition/Sky Arc.

Towers: Tower-1, Tower-2, plus a combined "Tower-1 & 2" bucket (not split
into T-columns, per doc). The milestone table's T1-T6 columns are hardcoded
in the frontend, so Tower-1->T1, Tower-2->T2; the combined bucket
contributes to the milestone's totalCr but isn't attributed to a specific
T-column (T3-T6 stay 0 for Trump).

Usage:
    python3 scripts/rebuild_trump_dapp_kpi.py
"""
import openpyxl
import json
import os
from datetime import datetime
from collections import defaultdict

BASE = os.path.join(os.path.dirname(__file__), '..', 'public', 'data')
FNAME = 'trump_dapp.XLSX'
OUT = 'trump_dapp_kpi.json'

TOWER_MAP = {'Tower-1': 'T1', 'Tower-2': 'T2'}


def num(v):
    try:
        return float(v) if v not in (None, '') else 0.0
    except Exception:
        return 0.0


def load_rows():
    wb = openpyxl.load_workbook(os.path.join(BASE, FNAME), data_only=True)
    ws = wb.active
    headers = [c.value for c in next(ws.iter_rows(min_row=1, max_row=1))]
    rows = []
    for row in ws.iter_rows(min_row=2):
        rows.append({headers[i]: row[i].value for i in range(len(headers))})
    return rows


# Dates from Trump Tower schedule (20260702_Trump_Tower_L0.xlsx, '31.10.2025'
# sheet), using MAX across Tower-1/Tower-2 finish dates (latest tower to
# reach that milestone), same convention as Edition/Sky Arc. Substring-
# matched against the lowercased milestone text since Trump's milestones
# combine floor completion with a booking-month alternative ("On Completion
# of 40th Floor Slab/36th Months of Booking, whichever is earlier"). Milestones
# with no clear schedule match (Structure - approximated via LMR/Mumty Roof
# Slab as top-of-structure proxy) are noted; anything truly unmatched is left
# blank rather than guessed.
SLAB_SCHEDULE_KEYWORDS = [
    ('40th floor', '2028-06'),
    ('10th floor', '2027-03'),
    ('25th floor', '2027-11'),
    ('finishing', '2029-09'),
    ('occupation certificate', '2029-10'),
    ('application of oc', '2029-10'),
    ('possession', '2029-10'),
    ('hand over', '2029-10'),
    ('structure', '2029-01'),  # LMR/Mumty Roof Slab used as structure-complete proxy
]


def slab_schedule_lookup(mkey):
    for kw, date in SLAB_SCHEDULE_KEYWORDS:
        if kw in mkey:
            return date
    return ''


def to_month(v):
    if v is None:
        return ''
    if isinstance(v, datetime):
        return f"{v.year}-{v.month:02d}"
    try:
        s = str(v)[:10]
        d = datetime.strptime(s, '%Y-%m-%d')
        return f"{d.year}-{d.month:02d}"
    except Exception:
        return ''


def mlabel(m):
    try:
        return datetime.strptime(m, '%Y-%m').strftime("%b'%y")
    except Exception:
        return m


def main():
    print("Loading trump_dapp.XLSX...")
    rows = load_rows()
    print(f"  rows: {len(rows)}")

    buckets = {t: defaultdict(float) for t in ('all', 'tlp', 'clp')}
    tower_acc = defaultdict(lambda: defaultdict(float))
    monthly_acc = defaultdict(lambda: defaultdict(float))
    milestone_acc = defaultdict(lambda: defaultdict(float))
    milestone_dates = defaultdict(list)
    milestone_display_name = {}

    adv_raw_all = 0.0

    for r in rows:
        mtype = 'tlp'  # all Trump milestones classified TLP per doc 6.3
        milestone = (r.get('Milestone') or '').strip()

        demand = num(r.get('Demand Amount W/O Tax'))
        installment = num(r.get('Installment Amount'))
        bank = num(r.get('Received Amt (in Bank)'))
        cgst = num(r.get('CGST'))
        sgst = num(r.get('SGST'))
        recv_wot = bank - cgst - sgst
        outstanding = num(r.get('Outstanding 1'))
        tower_raw = (r.get('Tower') or 'Unknown').strip() or 'Unknown'
        month = to_month(r.get('Bill creation date') or r.get('SAP Booking date'))
        due_month = to_month(r.get('Due Installment Date'))

        for t in ('all', mtype):
            buckets[t]['totalInstallment'] += demand
            buckets[t]['totalReceivedBank'] += bank
            buckets[t]['totalReceivedWoT'] += recv_wot
            buckets[t]['totalOutstanding'] += outstanding
            buckets[t]['totalDemandWoTax'] += demand

        if demand == 0 and bank > 0:
            adv_raw_all += bank

        tk = tower_acc[tower_raw]
        tk[f'{mtype}_dem'] += demand
        tk[f'{mtype}_rec'] += recv_wot
        tk[f'{mtype}_out'] += outstanding

        if month:
            mk = monthly_acc[month]
            mk[f'{mtype}_dem'] += demand
            mk[f'{mtype}_rec'] += recv_wot

        # milestone rollup - case-insensitive, whitespace-trimmed grouping
        # (per doc 6.4), using Installment Amount (full scheduled plan value)
        norm_key = milestone.lower().strip()
        acc = milestone_acc[norm_key]
        acc['totalCr'] += installment
        acc[tower_raw] = acc.get(tower_raw, 0) + installment
        if norm_key not in milestone_display_name:
            milestone_display_name[norm_key] = milestone
        if due_month:
            milestone_dates[norm_key].append(due_month)

    def round_bucket(b):
        return {k: round(v / 1e7, 2) for k, v in b.items()}

    kpi = {t: round_bucket(buckets[t]) for t in buckets}
    # clp bucket kept empty for schema consistency (per doc 6.3)
    kpi['clp'] = {k: 0.0 for k in kpi['all']}

    GST_RATE = 0.05
    adv_net = adv_raw_all / (1 + GST_RATE)
    adv_gst = adv_raw_all - adv_net
    advance_all = {'rawCr': round(adv_raw_all / 1e7, 2), 'netCr': round(adv_net / 1e7, 2), 'gstCr': round(adv_gst / 1e7, 2)}
    advance = {
        'tlp': dict(advance_all),
        'clp': {'rawCr': 0.0, 'netCr': 0.0, 'gstCr': 0.0},
    }

    advance_note = (f"\u26a0\ufe0f Advance Money: \u20b9{advance_all['rawCr']} Cr received before SAP demand was raised. "
                    f"GST @5% back-calculated (\u20b9{advance_all['gstCr']} Cr) to show net W/O Tax of \u20b9{advance_all['netCr']} Cr.")

    tower_order = ['Tower-1', 'Tower-2', 'Tower-1 & 2']
    towerKpi = []
    for t in tower_order:
        v = tower_acc.get(t, {})
        towerKpi.append({
            'tower': t,
            'tlp_dem': round(v.get('tlp_dem', 0) / 1e7, 2),
            'clp_dem': 0.0,
            'tlp_rec': round(v.get('tlp_rec', 0) / 1e7, 2),
            'clp_rec': 0.0,
            'tlp_out': round(v.get('tlp_out', 0) / 1e7, 2),
            'clp_out': 0.0,
        })
    for t, v in tower_acc.items():
        if t not in tower_order:
            towerKpi.append({
                'tower': t,
                'tlp_dem': round(v.get('tlp_dem', 0) / 1e7, 2), 'clp_dem': 0.0,
                'tlp_rec': round(v.get('tlp_rec', 0) / 1e7, 2), 'clp_rec': 0.0,
                'tlp_out': round(v.get('tlp_out', 0) / 1e7, 2), 'clp_out': 0.0,
            })

    monthlyTrend = []
    for m in sorted(monthly_acc.keys()):
        v = monthly_acc[m]
        dem = v.get('tlp_dem', 0)
        rec = v.get('tlp_rec', 0)
        monthlyTrend.append({
            'month': m,
            'label': mlabel(m),
            'tlp_dem': round(v.get('tlp_dem', 0) / 1e7, 2),
            'clp_dem': 0.0,
            'tlp_rec': round(v.get('tlp_rec', 0) / 1e7, 2),
            'clp_rec': 0.0,
            'dem': round(dem / 1e7, 2),
            'rec': round(rec / 1e7, 2),
        })

    milestonesUpcoming = []
    for mkey, acc in sorted(milestone_acc.items(), key=lambda x: -x[1]['totalCr']):
        mname = milestone_display_name.get(mkey, mkey)
        entry = {
            'name': mname,
            'type': 'tlp',
            'totalCr': round(acc['totalCr'] / 1e7, 2),
        }
        for raw_t, mapped_t in TOWER_MAP.items():
            entry[mapped_t] = round(acc.get(raw_t, 0) / 1e7, 2)
        for t in ['T3', 'T4', 'T5', 'T6']:
            entry[t] = 0.0
        dates = milestone_dates.get(mkey, [])
        entry['expectedDate'] = max(dates) if dates else slab_schedule_lookup(mkey)
        short = mname if len(mname) <= 32 else mname[:32].rstrip()
        entry['shortName'] = f"TLP \u2014 {short}"
        milestonesUpcoming.append(entry)

    out = {
        'kpi': kpi,
        'gstRate': GST_RATE,
        'advanceNote': advance_note,
        'advance': advance,
        'advance_all': advance_all,
        'milestonesUpcoming': milestonesUpcoming,
        'monthlyTrend': monthlyTrend,
        'towerKpi': towerKpi,
    }

    existing_path = os.path.join(BASE, OUT)
    if os.path.exists(existing_path):
        existing = json.load(open(existing_path))
        if existing.get('projectMeta'):
            out['projectMeta'] = existing['projectMeta']

    json.dump(out, open(existing_path, 'w'), separators=(',', ':'))

    print("\n\u2705 Done! trump_dapp_kpi.json rebuilt.")
    print(f"  kpi.all: {kpi['all']}")
    print(f"  advance_all: {advance_all}")
    print(f"  milestone rows: {len(milestonesUpcoming)}")
    print(f"  monthly trend points: {len(monthlyTrend)}")


if __name__ == '__main__':
    main()
