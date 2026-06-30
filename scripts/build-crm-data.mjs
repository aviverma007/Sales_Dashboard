// Build the CRM dashboard data file (public/data/crm_cases.json) from a Case Management Excel export.
//
// USAGE:
//   npm run crm:data -- "C:\\path\\to\\Case_Management_Report.xlsx"
//   (or)  node scripts/build-crm-data.mjs "path/to/file.xlsx"
//
// The header row in the export is row 15 (data starts row 16). This matches the dashboard loader.

import * as XLSX from 'xlsx';
import fs from 'fs';
import path from 'path';

// Columns pulled into the dashboard (order is preserved in the JSON).
const COLS = [
  'Account Name','Case Number','Subject','Priority','Description','Category','Sub Category',
  'Case Type','Status','TAT Status','Area','Sub Area','Case Owner','Team Leader name','Case Origin',
  'HNI Customer','Active Legal Case','Number of Reassigns','Age','Response Time Category',
  'Resolution Time Category','Date/Time Opened','Closed Date','Case Applicability','Created Time','First Response At',
  'Project','Property','Parent Case Number',
];

// Resolve the Excel to read:
//  - if a path is passed as an argument, use it
//  - otherwise pick the NEWEST .xlsx in the data-source/ folder
//  - if none is found, keep the existing crm_cases.json and exit cleanly (so `npm start` never breaks)
let inPath = process.argv[2];
if (!inPath) {
  const dir = 'data-source';
  let newest = null, newestT = -1;
  if (fs.existsSync(dir)) {
    for (const f of fs.readdirSync(dir)) {
      if (!/\.xlsx$/i.test(f)) continue;
      const fp = path.join(dir, f);
      const t = fs.statSync(fp).mtimeMs;
      if (t > newestT) { newestT = t; newest = fp; }
    }
  }
  if (!newest) {
    console.log('CRM data: no Excel in data-source/ — keeping existing crm_cases.json.');
    process.exit(0);
  }
  inPath = newest;
} else if (!fs.existsSync(inPath)) {
  console.error('File not found: ' + inPath);
  process.exit(1);
}

function fmt(v) {
  if (v instanceof Date && !isNaN(v)) {
    const y = v.getFullYear(), m = String(v.getMonth() + 1).padStart(2, '0'), d = String(v.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  if (typeof v === 'string' && v.length > 300) return v.slice(0, 300); // cap long descriptions
  return v;
}

console.log('Reading ' + inPath + ' ...');
const buf = fs.readFileSync(inPath);
const wb = XLSX.read(buf, { type: 'buffer', cellDates: true });
const ws = wb.Sheets[wb.SheetNames[0]];

// header:1 + range:14 -> first returned row is the header row (row 15), rest is data
const aoa = XLSX.utils.sheet_to_json(ws, { header: 1, range: 14, defval: null });
const header = aoa[0] || [];
const idx = {};
header.forEach((h, i) => { if (h != null && String(h).trim() !== '') idx[String(h).trim()] = i; });

const missing = COLS.filter(c => !(c in idx));
if (missing.length) console.warn('NOTE: columns not found in export (left blank): ' + missing.join(', '));

const caseIdx = idx['Case Number'];
const rows = [];
for (let r = 1; r < aoa.length; r++) {
  const row = aoa[r];
  if (!row) continue;
  const cn = row[caseIdx];
  if (cn == null || cn === '') continue; // skip rows without a case number
  rows.push(COLS.map(c => { const i = idx[c]; return i == null ? null : fmt(row[i]); }));
}

const outDir = path.join('public', 'data');
fs.mkdirSync(outDir, { recursive: true });
const outPath = path.join(outDir, 'crm_cases.json');
fs.writeFileSync(outPath, JSON.stringify({ cols: COLS, rows }));

const mb = (fs.statSync(outPath).size / 1024 / 1024).toFixed(1);
console.log(`\u2713 Wrote ${outPath}  \u2014  ${rows.length.toLocaleString()} records, ${mb} MB`);
console.log('Now rebuild/redeploy the dashboard (or just refresh if running the dev server).');
