#!/usr/bin/env python3
"""
rebuild_skyarc_dapp_kpi.py
--------------------------
Rebuilds public/data/skyarc_dapp_kpi.json (Sky Arc Demand & Collection page KPIs)
from public/data/skyarc_dapp.XLSX.

Classification (per documented Sky Arc convention, confirmed against the new
file): CLP if "Payment Plan Name" contains the literal text "CLP", else TLP.
Sky Arc's plan names actually contain this text (unlike Edition/Trump), so
no milestone-content classification is needed here.

Tower mapping for the milestone table: TA->T1, TB->T2, TC->T3, TD->T4,
TE->T5, TF->T6 (fixed positional mapping, per doc).

Usage:
    python3 scripts/rebuild_skyarc_dapp_kpi.py
"""
import openpyxl
import json
import os
from datetime import datetime
from collections import defaultdict

BASE = os.path.join(os.path.dirname(__file__), '..', 'public', 'data')
FNAME = 'skyarc_dapp.XLSX'
OUT = 'skyarc_dapp_kpi.json'

TOWER_MAP = {'TA': 'T1', 'TB': 'T2', 'TC': 'T3', 'TD': 'T4', 'TE': 'T5', 'TF': 'T6'}


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


def classify(payment_plan_name):
    return 'clp' if 'CLP' in (payment_plan_name or '').upper() else 'tlp'


# Dates from Sky Arc schedule (11__Sky_Arc_schedule_-_Update-01_Jul_26_.xlsx,
# 'Summary' sheet, CRM Milestone Completions table). Using the latest tower's
# actual/CRM date, same MAX-across-towers convention as Edition's slab matrix.
# Substring-matched against the lowercased milestone text since Sky Arc's
# milestones are compound phrases ("Within X months ... or On completion of
# Nth floor Slab (whichever is later)"). Milestones with no explicit date in
# the schedule (OC Application, Possession, Super Structure) are left blank
# rather than interpolated/guessed.
SLAB_SCHEDULE_KEYWORDS = [
    ('40th floor slab', '2027-10'),
    ('30th floor slab', '2027-04'),
    ('20th floor slab', '2026-11'),
    ('5th floor slab', '2026-07'),
    ('external plaster', '2028-04'),
    ('flooring', '2028-11'),
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
    print("Loading skyarc_dapp.XLSX...")
    rows = load_rows()
    print(f"  rows: {len(rows)}")

    buckets = {t: defaultdict(float) for t in ('all', 'tlp', 'clp')}
    tower_acc = defaultdict(lambda: defaultdict(float))
    monthly_acc = defaultdict(lambda: defaultdict(float))
    milestone_acc = defaultdict(lambda: defaultdict(float))
    milestone_type = {}
    milestone_dates = defaultdict(list)
    milestone_display_name = {}

    adv_raw = {t: 0.0 for t in ('tlp', 'clp')}
    adv_raw_all = 0.0

    for r in rows:
        plan = r.get('Payment Plan Name') or ''
        mtype = classify(plan)
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
            adv_raw[mtype] += bank

        tk = tower_acc[tower_raw]
        tk[f'{mtype}_dem'] += demand
        tk[f'{mtype}_rec'] += recv_wot
        tk[f'{mtype}_out'] += outstanding

        if month:
            mk = monthly_acc[month]
            mk[f'{mtype}_dem'] += demand
            mk[f'{mtype}_rec'] += recv_wot

        # milestone rollup - grouped by case-insensitive, whitespace-trimmed
        # Milestone text + type (per doc 6.4 normalization), using Installment
        # Amount (full scheduled plan value), same convention as Edition
        norm_key = (milestone.lower().strip(), mtype)
        acc = milestone_acc[norm_key]
        acc['totalCr'] += installment
        acc[tower_raw] = acc.get(tower_raw, 0) + installment
        milestone_type[norm_key] = mtype
        if norm_key not in milestone_display_name:
            milestone_display_name[norm_key] = milestone
        if due_month:
            milestone_dates[norm_key].append(due_month)

    def round_bucket(b):
        return {k: round(v / 1e7, 2) for k, v in b.items()}

    kpi = {t: round_bucket(buckets[t]) for t in buckets}

    GST_RATE = 0.05
    def adv_split(raw):
        net = raw / (1 + GST_RATE)
        gst = raw - net
        return round(raw / 1e7, 2), round(net / 1e7, 2), round(gst / 1e7, 2)

    adv_all_raw, adv_all_net, adv_all_gst = adv_split(adv_raw_all)
    advance_all = {'rawCr': adv_all_raw, 'netCr': adv_all_net, 'gstCr': adv_all_gst}
    advance = {}
    for t in ('tlp', 'clp'):
        rc, nc, gc = adv_split(adv_raw[t])
        advance[t] = {'rawCr': rc, 'netCr': nc, 'gstCr': gc}

    advance_note = (f"\u26a0\ufe0f Advance Money: \u20b9{adv_all_raw} Cr received before SAP demand was raised. "
                    f"GST @5% back-calculated (\u20b9{adv_all_gst} Cr) to show net W/O Tax of \u20b9{adv_all_net} Cr.")

    # towerKpi - use real tower codes (TA..TF), fixing the old "TTF" typo
    tower_order = ['TA', 'TB', 'TC', 'TD', 'TE', 'TF']
    towerKpi = []
    for t in tower_order:
        v = tower_acc.get(t, {})
        towerKpi.append({
            'tower': t,
            'tlp_dem': round(v.get('tlp_dem', 0) / 1e7, 2),
            'clp_dem': round(v.get('clp_dem', 0) / 1e7, 2),
            'tlp_rec': round(v.get('tlp_rec', 0) / 1e7, 2),
            'clp_rec': round(v.get('clp_rec', 0) / 1e7, 2),
            'tlp_out': round(v.get('tlp_out', 0) / 1e7, 2),
            'clp_out': round(v.get('clp_out', 0) / 1e7, 2),
        })
    for t, v in tower_acc.items():
        if t not in tower_order:
            towerKpi.append({
                'tower': t,
                'tlp_dem': round(v.get('tlp_dem', 0) / 1e7, 2),
                'clp_dem': round(v.get('clp_dem', 0) / 1e7, 2),
                'tlp_rec': round(v.get('tlp_rec', 0) / 1e7, 2),
                'clp_rec': round(v.get('clp_rec', 0) / 1e7, 2),
                'tlp_out': round(v.get('tlp_out', 0) / 1e7, 2),
                'clp_out': round(v.get('clp_out', 0) / 1e7, 2),
            })

    monthlyTrend = []
    for m in sorted(monthly_acc.keys()):
        v = monthly_acc[m]
        dem = v.get('tlp_dem', 0) + v.get('clp_dem', 0)
        rec = v.get('tlp_rec', 0) + v.get('clp_rec', 0)
        monthlyTrend.append({
            'month': m,
            'label': mlabel(m),
            'tlp_dem': round(v.get('tlp_dem', 0) / 1e7, 2),
            'clp_dem': round(v.get('clp_dem', 0) / 1e7, 2),
            'tlp_rec': round(v.get('tlp_rec', 0) / 1e7, 2),
            'clp_rec': round(v.get('clp_rec', 0) / 1e7, 2),
            'dem': round(dem / 1e7, 2),
            'rec': round(rec / 1e7, 2),
        })

    milestonesUpcoming = []
    for (mkey, mtype), acc in sorted(milestone_acc.items(), key=lambda x: -x[1]['totalCr']):
        mname = milestone_display_name.get((mkey, mtype), mkey)
        entry = {
            'name': mname,
            'type': mtype,
            'totalCr': round(acc['totalCr'] / 1e7, 2),
        }
        for raw_t, mapped_t in TOWER_MAP.items():
            entry[mapped_t] = round(acc.get(raw_t, 0) / 1e7, 2)
        dates = milestone_dates.get((mkey, mtype), [])
        entry['expectedDate'] = max(dates) if dates else slab_schedule_lookup(mkey)
        short = mname if len(mname) <= 32 else mname[:32].rstrip()
        prefix = 'CLP' if mtype == 'clp' else 'TLP'
        entry['shortName'] = f"{prefix} \u2014 {short}"
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

    print("\n\u2705 Done! skyarc_dapp_kpi.json rebuilt.")
    print(f"  kpi.all: {kpi['all']}")
    print(f"  kpi.tlp: {kpi['tlp']}")
    print(f"  kpi.clp: {kpi['clp']}")
    print(f"  advance_all: {advance_all}")
    print(f"  milestone rows: {len(milestonesUpcoming)}")
    print(f"  monthly trend points: {len(monthlyTrend)}")


if __name__ == '__main__':
    main()
