#!/usr/bin/env python3
import pandas as pd
import json
import os
from datetime import datetime

DATA_DIR = 'public/data'

# Read Sky Arc files
pdrn = pd.read_excel(f'{DATA_DIR}/skyarc_pdrn.XLSX', sheet_name='Sheet1')
invr = pd.read_excel(f'{DATA_DIR}/skyarc_invr.XLSX', sheet_name='Sheet1')
dapp = pd.read_excel(f'{DATA_DIR}/skyarc_dapp.XLSX', sheet_name='Sheet1')
zrec = pd.read_excel(f'{DATA_DIR}/skyarc_zrec.XLSX', sheet_name='Sheet1')

print("📊 Rebuilding Sky Arc Overview Data...")

# PDRN Processing
print("\n1. PDRN (Bookings)...")
pdrn_active = pdrn[pdrn['Booking Status'] != 'Cancelled'].copy()
pdrn_count = len(pdrn_active)
pdrn_bsp = pdrn_active['Total BSP Net Value'].fillna(0).sum() / 10000000
pdrn_tcv = pdrn_active['TCV (With Tax)'].fillna(0).sum() / 10000000
pdrn_demand = pdrn_active['Total Demand Amount'].fillna(0).sum() / 10000000
pdrn_received = pdrn_active['Total Received'].fillna(0).sum() / 10000000
pdrn_area = pdrn_active['Super Area'].fillna(0).sum()

print(f"  • Active bookings: {pdrn_count}")
print(f"  • BSP: ₹{pdrn_bsp:.2f} Cr")
print(f"  • TCV: ₹{pdrn_tcv:.2f} Cr")
print(f"  • Booked Area: {pdrn_area:,.0f} sqft")

# INVR Processing
print("\n2. INVR (Inventory)...")
invr_total = len(invr)
invr_area = invr['Total Super Area'].fillna(0).sum()
print(f"  • Total units: {invr_total}")
print(f"  • Total area: {invr_area:,.0f} sqft")

# DAPP Processing
print("\n3. DAPP (Collections)...")
dapp_records = len(dapp)
dapp_demand = dapp['Total Demand With Tax'].fillna(0).sum() / 10000000
dapp_received = dapp['Received Amount'].fillna(0).sum() / 10000000
dapp_outstanding = dapp['Outstanding Amount'].fillna(0).sum() / 10000000

print(f"  • Records: {dapp_records}")
print(f"  • Demand: ₹{dapp_demand:.2f} Cr")
print(f"  • Received: ₹{dapp_received:.2f} Cr")
print(f"  • Outstanding: ₹{dapp_outstanding:.2f} Cr")

# Load existing dashboard data
with open(f'{DATA_DIR}/dashboard_data.json', 'r') as f:
    data = json.load(f)

# Update Sky Arc section with PDRN data
if 'pdrn' not in data:
    data['pdrn'] = {}

data['pdrn']['SMARTWORLD SKY ARC'] = {
    'count': pdrn_count,
    'bsp_cr': round(pdrn_bsp, 2),
    'tcv_cr': round(pdrn_tcv, 2),
    'demand_cr': round(pdrn_demand, 2),
    'received_cr': round(pdrn_received, 2),
    'area_sqft': round(pdrn_area, 0),
    'last_updated': datetime.now().isoformat()
}

# Update inventory
if 'invr' not in data:
    data['invr'] = {}

data['invr']['SMARTWORLD SKY ARC'] = {
    'total': invr_total,
    'area_sqft': round(invr_area, 0),
    'last_updated': datetime.now().isoformat()
}

# Update DAPP (collections)
if 'dapp' not in data:
    data['dapp'] = {}

data['dapp']['SMARTWORLD SKY ARC'] = {
    'records': dapp_records,
    'demand_cr': round(dapp_demand, 2),
    'received_cr': round(dapp_received, 2),
    'outstanding_cr': round(dapp_outstanding, 2),
    'last_updated': datetime.now().isoformat()
}

# KPI Extras
data['skyarcKpiExtra'] = {
    'totalBSPCr': round(pdrn_bsp, 2),
    'totalTCVCr': round(pdrn_tcv, 2),
    'bookedAreaSqft': int(pdrn_area),
    'carpetAreaSqft': int(pdrn_active['Carpet'].fillna(0).sum()),
    'cancelledBSPCr': round(pdrn[pdrn['Booking Status'] == 'Cancelled']['Total BSP Net Value'].fillna(0).sum() / 10000000, 2),
    'avgRatePerSqft': int(pdrn_bsp * 10000000 / pdrn_area) if pdrn_area > 0 else 0,
    'last_updated': datetime.now().isoformat()
}

# Save updated data
with open(f'{DATA_DIR}/dashboard_data.json', 'w') as f:
    json.dump(data, f, indent=2)

print("\n✅ Sky Arc data updated successfully!")
print(f"📁 Saved to: {DATA_DIR}/dashboard_data.json")

