#!/usr/bin/env python3
"""
rebuild_edition_dapp_kpi.py
---------------------------
Rebuilds public/data/dapp_kpi.json (Edition Demand & Collection page KPIs)
from public/data/edition_dapp.XLSX.

Classification rule (per instruction, 2 buckets only):
  CLP = milestone references a construction event (floor/slab, excavation,
        structure, OC, possession, flooring, finishing, plaster, basement,
        top floor), OR is a construction-event/fixed-date hybrid ("whichever
        is later/earlier" - the date is just a backstop on a real construction
        milestone), OR is a booking-stage milestone (Booking Amount/On
        Allotment - first installment, same convention as prior builds), OR
        is a fixed time offset FROM a construction event (e.g. "24 months
        from Application of OC").
  TLP = milestone is a pure calendar date or day/month interval with NO
        construction-event anchor (e.g. "On or Before 22 July 2026",
        "Within 60 Days From Date of Allotment").

Usage:
    python3 scripts/rebuild_edition_dapp_kpi.py
"""
import openpyxl
import json
import os
import re
from datetime import datetime
from collections import defaultdict

BASE = os.path.join(os.path.dirname(__file__), '..', 'public', 'data')
FNAME = 'edition_dapp.XLSX'
OUT = 'dapp_kpi.json'

CONSTRUCTION_KW = ['floor', 'slab', 'excavation', 'structure', 'occupation certificate',
                   'occupat', 'possession', 'flooring', 'finishing work', 'plaster',
                   'top floor', 'basement', 'plinth']


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


def classify(milestone):
    n = (milestone or '').lower()
    has_constr = any(k in n for k in CONSTRUCTION_KW) or bool(re.search(r'\boc\b', n))
    if 'whichever is later' in n or 'whichever is earlier' in n:
        return 'clp'   # hybrid: construction event with a fixed-date backstop
    if has_constr:
        return 'clp'
    if 'booking amount' in n or n.strip() in ('on booking', 'on allotment'):
        return 'clp'   # booking-stage first installment
    if re.search(r'from application of', n) or re.search(r'from\s+occupat', n):
        return 'clp'   # time offset anchored to a construction event
    return 'tlp'        # pure fixed date or day/month interval from allotment/booking


def short_name(milestone, mtype):
    n = (milestone or '').strip()
    nl = n.lower()

    # floor/slab number
    m = re.search(r'(\d+)\s*(st|nd|rd|th)?\s*floor', nl)
    if m and 'flooring' not in nl:
        return f"{m.group(1)}{_ord_suffix(int(m.group(1)))} Floor Slab" if 'slab' in nl or True else f"{m.group(1)} Floor"
    if 'top floor' in nl:
        return 'Top Floor Slab'
    if 'occupation certificate' in nl or re.search(r'\boc\b', nl) or 'occupat' in nl:
        return 'OC Application'
    if 'possession' in nl:
        return 'Possession'
    if 'finishing work' in nl:
        return 'Finishing Work'
    if 'plaster' in nl:
        return 'External Plaster'
    if 'structure' in nl:
        return 'Structure Complete'
    if 'flooring' in nl:
        return 'Flooring'
    if 'basement' in nl:
        return 'Upper Basement'
    if 'plinth' in nl:
        return 'Plinth'
    if 'excavation' in nl:
        return 'Excavation Complete' if 'complet' in nl else 'Excavation Start'
    if 'booking amount' in nl or nl in ('on booking',):
        return 'Booking Amount'
    if nl == 'on allotment':
        return 'On Allotment'
    m2 = re.search(r'within\s+(\d+)\s*(days|months)', nl)
    if m2:
        return f"Within {m2.group(1)} {m2.group(2).title()} of Allotment"
    if 'execution' in nl or 'signing' in nl:
        return 'Agreement Execution'
    # fallback: pure fixed date with no other description
    return 'Fixed-Date Installment'


def _ord_suffix(n):
    if 11 <= n % 100 <= 13:
        return 'th'
    return {1: 'st', 2: 'nd', 3: 'rd'}.get(n % 10, 'th')


# Slab-matrix-derived expected dates (MAX across towers = latest tower to
# reach that milestone), used only to fill milestones with NO Due Installment
# Date anywhere in the source DAPP file (per Edition_Slab_Matrix, AOP 30-06-2026).
SLAB_MATRIX_DATES = {
    'Excavation Start': '2024-02',
    'Excavation Complete': '2025-07',   # Ground Floor Slab completion per slab matrix
    '5th Floor Slab': '2025-12',
    '15th Floor Slab': '2026-05',
    '25th Floor Slab': '2026-09',
    '40th Floor Slab': '2027-04',
    'Structure Complete': '2027-03',
    'OC Application': '2027-12',
    # Not explicitly dated in the slab matrix (only 5th/15th/25th/top floor
    # + structure/OC are listed) - left blank rather than interpolated/guessed:
    #   20th Floor Slab, 29th Floor Slab, 32nd Floor Slab, 34th Floor Slab,
    #   Flooring, Finishing Work, Top Floor Slab, Possession ("After OC", no date)
}


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
    print("Loading edition_dapp.XLSX...")
    rows = load_rows()
    print(f"  rows: {len(rows)}")

    buckets = {t: defaultdict(float) for t in ('all', 'tlp', 'clp')}
    tower_acc = defaultdict(lambda: defaultdict(float))
    monthly_acc = defaultdict(lambda: defaultdict(float))
    milestone_acc = defaultdict(lambda: defaultdict(float))
    milestone_type = {}
    milestone_tower = defaultdict(lambda: defaultdict(float))
    milestone_dates = defaultdict(list)

    adv_raw = {t: 0.0 for t in ('tlp', 'clp')}
    adv_raw_all = 0.0

    for r in rows:
        milestone = r.get('Milestone') or ''
        mtype = classify(milestone)
        sname = short_name(milestone, mtype)

        demand = num(r.get('Demand Amount W/O Tax'))
        installment = num(r.get('Installment Amount'))
        bank = num(r.get('Received Amt (in Bank)'))
        cgst = num(r.get('CGST'))
        sgst = num(r.get('SGST'))
        recv_wot = bank - cgst - sgst
        outstanding = num(r.get('Outstanding 1'))
        tower = (r.get('Tower') or 'Unknown').strip() or 'Unknown'
        month = to_month(r.get('Bill creation date') or r.get('SAP Booking date'))
        due_month = to_month(r.get('Due Installment Date'))

        for t in ('all', mtype):
            buckets[t]['totalInstallment'] += demand
            buckets[t]['totalReceivedBank'] += bank
            buckets[t]['totalReceivedWoT'] += recv_wot
            buckets[t]['totalOutstanding'] += outstanding
            buckets[t]['totalDemandWoTax'] += demand

        # advance: billed demand not yet raised but money already received in bank
        if demand == 0 and bank > 0:
            adv_raw_all += bank
            adv_raw[mtype] += bank

        # tower rollup (dem/rec/out split by type)
        tk = tower_acc[tower]
        tk[f'{mtype}_dem'] += demand
        tk[f'{mtype}_rec'] += recv_wot
        tk[f'{mtype}_out'] += outstanding

        # monthly rollup
        if month:
            mk = monthly_acc[month]
            mk[f'{mtype}_dem'] += demand
            mk[f'{mtype}_rec'] += recv_wot

        # milestone rollup (grouped by shortName, not raw text)
        milestone_acc[sname]['totalCr'] += installment
        milestone_acc[sname][f'{tower}'] = milestone_acc[sname].get(tower, 0) + installment
        milestone_type[sname] = mtype
        if due_month:
            milestone_dates[sname].append(due_month)

    # ---- kpi buckets ----
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

    # ---- towerKpi ----
    tower_order = ['T-1', 'T-2', 'T-3', 'T-4', 'T-5', 'T-6']
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
    # any other towers not in the standard 6
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

    # ---- monthlyTrend ----
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

    # ---- milestonesUpcoming ----
    milestonesUpcoming = []
    for sname, acc in sorted(milestone_acc.items(), key=lambda x: -x[1]['totalCr']):
        mtype = milestone_type[sname]
        entry = {
            'name': sname,
            'type': mtype,
            'totalCr': round(acc['totalCr'] / 1e7, 2),
        }
        for t in tower_order:
            entry[t.replace('-', '')] = round(acc.get(t, 0) / 1e7, 2)
        dates = milestone_dates.get(sname, [])
        entry['expectedDate'] = max(dates) if dates else SLAB_MATRIX_DATES.get(sname, '')
        prefix = 'CLP' if mtype == 'clp' else 'TLP'
        entry['shortName'] = f"{prefix} \u2014 {sname}"
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

    # preserve projectMeta (unrelated to Edition; e.g. SKY ARC chip data lives here)
    existing_path = os.path.join(BASE, OUT)
    if os.path.exists(existing_path):
        existing = json.load(open(existing_path))
        out['projectMeta'] = existing.get('projectMeta', {})

    json.dump(out, open(existing_path, 'w'), separators=(',', ':'))

    print("\n\u2705 Done! dapp_kpi.json rebuilt.")
    print(f"  kpi.all: {kpi['all']}")
    print(f"  kpi.tlp: {kpi['tlp']}")
    print(f"  kpi.clp: {kpi['clp']}")
    print(f"  advance_all: {advance_all}")
    print(f"  milestone rows: {len(milestonesUpcoming)}")
    print(f"  monthly trend points: {len(monthlyTrend)}")


if __name__ == '__main__':
    main()
