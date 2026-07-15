#!/usr/bin/env python3
import pandas as pd
import json
import os
from collections import defaultdict

DATA_DIR = 'public/data'

print("📊 Rebuilding Sky Arc Overview Data from Excel...")

# Read Sky Arc files
pdrn_df = pd.read_excel(f'{DATA_DIR}/skyarc_pdrn.XLSX', sheet_name='Sheet1')
invr_df = pd.read_excel(f'{DATA_DIR}/skyarc_invr.XLSX', sheet_name='Sheet1')
dapp_df = pd.read_excel(f'{DATA_DIR}/skyarc_dapp.XLSX', sheet_name='Sheet1')

# Load existing dashboard data
with open(f'{DATA_DIR}/dashboard_data.json', 'r') as f:
    data = json.load(f)

print("\n1️⃣ Processing PDRN (Bookings)...")
# Filter active bookings
pdrn_active = pdrn_df[pdrn_df['Booking Status'] != 'Cancelled'].copy()

# Convert to records format
pdrn_records = []
for _, row in pdrn_active.iterrows():
    record = {
        'project': 'SMARTWORLD SKY ARC',
        'unit': str(row['Unit No.']),
        'bhk': str(row['BHK']),
        'tower': str(row['Tower']) if pd.notna(row['Tower']) else 'N/A',
        'floor': str(row['Floor']) if pd.notna(row['Floor']) else 'N/A',
        'status': str(row['Booking Status']),
        'broker': str(row['Broker Code']) if pd.notna(row['Broker Code']) else '',
        'brokerName': str(row['Broker Name (SFDC)']) if pd.notna(row['Broker Name (SFDC)']) else '',
        'bsp': float(row['Total BSP Net Value']) if pd.notna(row['Total BSP Net Value']) else 0,
        'tcv': float(row['TCV (With Tax)']) if pd.notna(row['TCV (With Tax)']) else 0,
        'demand': float(row['Total Demand Amount']) if pd.notna(row['Total Demand Amount']) else 0,
        'received': float(row['Total Received']) if pd.notna(row['Total Received']) else 0,
        'superArea': float(row['Super Area']) if pd.notna(row['Super Area']) else 0,
        'carpet': float(row['Carpet']) if pd.notna(row['Carpet']) else 0,
        'bookingDate': str(row['SFDC Booking Date']).split()[0] if pd.notna(row['SFDC Booking Date']) else '',
        'customer': str(row['Latest Customer Name']) if pd.notna(row['Latest Customer Name']) else '',
    }
    pdrn_records.append(record)

print(f"  ✓ {len(pdrn_records)} active bookings")

# Filter existing PDRN to remove old Sky Arc data, keep Edition & Trump
data['pdrn'] = [r for r in data.get('pdrn', []) if r.get('project') != 'SMARTWORLD SKY ARC']
# Add new Sky Arc PDRN
data['pdrn'].extend(pdrn_records)

print("\n2️⃣ Processing INVR (Inventory)...")
# Convert inventory records
invr_records = []
for _, row in invr_df.iterrows():
    record = {
        'project': 'SMARTWORLD SKY ARC',
        'unit': str(row['Unit Number']) if pd.notna(row['Unit Number']) else '',
        'bhk': str(row['BHK']) if pd.notna(row['BHK']) else '',
        'tower': str(row['Tower']) if pd.notna(row['Tower']) else 'N/A',
        'floor': str(row['Floor']) if pd.notna(row['Floor']) else 'N/A',
        'status': str(row['Status']),
        'superArea': float(row['Total Super Area']) if pd.notna(row['Total Super Area']) else 0,
        'carpetArea': float(row['Carpet Area']) if pd.notna(row['Carpet Area']) else 0,
    }
    invr_records.append(record)

print(f"  ✓ {len(invr_records)} total units")

# Update INVR
data['invr'] = [r for r in data.get('invr', []) if r.get('project') != 'SMARTWORLD SKY ARC']
data['invr'].extend(invr_records)

print("\n3️⃣ Processing DAPP (Collections)...")
# Convert DAPP records
dapp_records = []
for _, row in dapp_df.iterrows():
    record = {
        'project': 'SMARTWORLD SKY ARC',
        'unit': str(row['Unit Number']) if pd.notna(row['Unit Number']) else '',
        'tower': str(row['Tower']) if pd.notna(row['Tower']) else 'N/A',
        'milestone': str(row['Milestone']) if pd.notna(row['Milestone']) else '',
        'demand': float(row['Total Demand With Tax']) if pd.notna(row['Total Demand With Tax']) else 0,
        'received': float(row['Received Amount']) if pd.notna(row['Received Amount']) else 0,
        'outstanding': float(row['Outstanding Amount']) if pd.notna(row['Outstanding Amount']) else 0,
    }
    dapp_records.append(record)

print(f"  ✓ {len(dapp_records)} collection records")

# Update DAPP
data['dapp'] = [r for r in data.get('dapp', []) if r.get('project') != 'SMARTWORLD SKY ARC']
data['dapp'].extend(dapp_records)

print("\n4️⃣ Calculating KPI Extras...")
# Calculate aggregates for Sky Arc
total_bsp = pdrn_active['Total BSP Net Value'].fillna(0).sum()
total_tcv = pdrn_active['TCV (With Tax)'].fillna(0).sum()
booked_area = pdrn_active['Super Area'].fillna(0).sum()
carpet_area = pdrn_active['Carpet'].fillna(0).sum()
cancelled_bsp = pdrn_df[pdrn_df['Booking Status'] == 'Cancelled']['Total BSP Net Value'].fillna(0).sum()
avg_rate = (total_bsp / booked_area) if booked_area > 0 else 0

data['skyarcKpiExtra'] = {
    'totalBSPCr': round(total_bsp / 10000000, 2),
    'totalTCVCr': round(total_tcv / 10000000, 2),
    'bookedAreaSqft': int(booked_area),
    'carpetAreaSqft': int(carpet_area),
    'cancelledBSPCr': round(cancelled_bsp / 10000000, 2),
    'avgRatePerSqft': int(avg_rate),
    'gstRate': 5,
    'advanceNote': 'Updated from latest Sky Arc Excel files'
}

print(f"  ✓ Total BSP: ₹{data['skyarcKpiExtra']['totalBSPCr']:.2f} Cr")
print(f"  ✓ Total TCV: ₹{data['skyarcKpiExtra']['totalTCVCr']:.2f} Cr")
print(f"  ✓ Booked Area: {data['skyarcKpiExtra']['bookedAreaSqft']:,} sqft")
print(f"  ✓ Avg Rate: ₹{data['skyarcKpiExtra']['avgRatePerSqft']:,}/sqft")

# Save updated data
with open(f'{DATA_DIR}/dashboard_data.json', 'w') as f:
    json.dump(data, f, indent=2)

print("\n✅ Sky Arc Overview data updated successfully!")
print(f"   📍 Location: {DATA_DIR}/dashboard_data.json")
print(f"   📊 Total PDRN records: {len([r for r in data['pdrn'] if r.get('project') == 'SMARTWORLD SKY ARC'])}")
print(f"   📊 Total INVR records: {len([r for r in data['invr'] if r.get('project') == 'SMARTWORLD SKY ARC'])}")
print(f"   📊 Total DAPP records: {len([r for r in data['dapp'] if r.get('project') == 'SMARTWORLD SKY ARC'])}")

