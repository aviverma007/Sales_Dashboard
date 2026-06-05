/**
 * build_journey.js
 * Run: node build_journey.js
 * 
 * Reads fresh CSV/Excel files from data/ folder
 * Rebuilds pr_journey.json with live SAP data
 * 
 * FILES NEEDED in data/ folder:
 *   qms_pr.csv  or qms_pr.xlsx   ← export from Power BI / QMS
 *   qms_nfa.csv or qms_nfa.xlsx  ← export from Power BI / QMS
 */

const fs   = require('fs');
const path = require('path');

let sql;
try { sql = require('mssql'); } catch(e) { console.log('⚠️  mssql not installed'); }

let XLSX;
try { XLSX = require('xlsx'); } catch(e) {}

const DATA_DIR   = path.join(__dirname, 'data');
const OUTPUT     = path.join(__dirname, 'public', 'data', 'pr_journey.json');
const SAP_CONFIG = {
  server: '192.168.66.33', database: 'SWDBIDB', user: 'sa', password: 'Admin#123',
  options: { encrypt:false, trustServerCertificate:true, connectTimeout:30000 },
};

// ── Read CSV or Excel file ────────────────────────────────────────────────────
function readFile(name) {
  const bases = [name, name.replace('.csv','.xlsx'), name.replace('.xlsx','.csv')];
  for (const base of bases) {
    const fp = path.join(DATA_DIR, base);
    if (!fs.existsSync(fp)) continue;
    const ext = fp.split('.').pop().toLowerCase();
    if (ext === 'csv') {
      const text = fs.readFileSync(fp, 'utf8');
      return parseCSV(text);
    }
    if (ext === 'xlsx' && XLSX) {
      const wb = XLSX.readFile(fp);
      const ws = wb.Sheets[wb.SheetNames[0]];
      return XLSX.utils.sheet_to_json(ws, {defval:null});
    }
  }
  return [];
}

function parseCSV(text) {
  const lines = text.replace(/\r/g,'').split('\n').filter(Boolean);
  if (!lines.length) return [];
  const headers = splitCSVLine(lines[0]);
  return lines.slice(1).map(line => {
    const vals = splitCSVLine(line);
    const obj = {};
    headers.forEach((h,i) => { obj[h] = vals[i] || null; });
    return obj;
  });
}

function splitCSVLine(line) {
  const vals = []; let cur = '', inQ = false;
  for (const ch of line) {
    if (ch === '"') { inQ = !inQ; continue; }
    if (ch === ',' && !inQ) { vals.push(cur.trim()); cur = ''; continue; }
    cur += ch;
  }
  vals.push(cur.trim());
  return vals;
}

// ── Extract SAP PR number from QMS scope ─────────────────────────────────────
function extractSAPPR(scope) {
  if (!scope) return null;
  let m = String(scope).match(/SAP PR(?:\s+No\.?)?\s*[:\.]?\s*(\d{10})/i);
  if (m) return m[1];
  m = String(scope).match(/\b(8[12]\d{8})\b/);
  return m ? m[1] : null;
}

// ── Main build ────────────────────────────────────────────────────────────────
async function build() {
  console.log('\n🔨 Building PR Journey data...\n');

  // 1. Read QMS files
  const qmsPR  = readFile('qms_pr.csv')  || readFile('qms_pr.xlsx')  || [];
  const qmsNFA = readFile('qms_nfa.csv') || readFile('qms_nfa.xlsx') || readFile('nfa.csv') || readFile('nfa.xlsx') || [];

  console.log(`📂 QMS PR:  ${qmsPR.length} rows`);
  console.log(`📂 QMS NFA: ${qmsNFA.length} rows`);

  if (!qmsPR.length) {
    console.log('\n❌ No QMS PR file found in data/ folder');
    console.log('   Add: data/qms_pr.csv  (export from Power BI)');
    process.exit(1);
  }

  // 2. Fetch SAP data live
  let sapPR = [], sapPO = [];
  if (sql) {
    try {
      console.log('📡 Connecting to SAP...');
      const pool = await sql.connect(SAP_CONFIG);
      const r1 = await pool.request().query(`
        SELECT Banfn, Eknam, Txz01, Matkl, Werks, PlantDesc, Ekgrp,
               Afnam, Ernam, Badat, Frgdt, Frgst, RelStatus, Procstat,
               Ebeln, Bsart, Netwr, Menge, Meins
        FROM dbo.PRD_PR WHERE (Loekz=0 OR Loekz IS NULL) ORDER BY Badat DESC`);
      const r2 = await pool.request().query(`
        SELECT EBELN, EBELP, EKNAM, TXZ01, NAME1, MATKL, WERKS, PLANT_DESC,
               EKGRP, MENGE, MEINS, NETPR, NETWR, WAERS,
               MENGE_DEL, MENGE_INV, NETWR_INV, FRGZU, FRGKE,
               BADAT, KDATE, PROCSTAT, BSART, LOEKZ, AEDAT, MONAT, GJAHR
        FROM dbo.PRD_PurchaseOrder WHERE (LOEKZ IS NULL OR LOEKZ='') ORDER BY BADAT DESC`);
      await pool.close();
      sapPR = r1.recordset.map(r => {
        const o={};
        for (const [k,v] of Object.entries(r)) o[k] = v instanceof Date ? v.toISOString().slice(0,10) : v;
        return o;
      });
      sapPO = r2.recordset.map(r => {
        const o={};
        for (const [k,v] of Object.entries(r)) o[k] = v instanceof Date ? v.toISOString().slice(0,10) : v;
        return o;
      });
      console.log(`✅ SAP PR: ${sapPR.length} rows`);
      console.log(`✅ SAP PO: ${sapPO.length} rows`);
    } catch(e) {
      console.log(`⚠️  SAP failed: ${e.message}`);
    }
  }

  // 3. Build lookups
  // QMS PR lookup: SAP PR number → QMS row
  const sapToQMS = {};
  for (const r of qmsPR) {
    const sapNo = extractSAPPR(r['data.Scope'] || r['Scope'] || r['scope']);
    if (sapNo) sapToQMS[sapNo] = r;
  }

  // QMS PR_Id → NFA
  const qmsIdToNFA = {};
  for (const r of qmsNFA) {
    const pid = r['data.PR_Id'] || r['PR_Id'] || r['pr_id'];
    if (pid) qmsIdToNFA[String(Math.round(Number(pid)))] = r;
  }

  // SAP PO lookup by EBELN
  const poLookup = {};
  const seen = new Set();
  for (const r of sapPO) {
    const k = String(r.EBELN);
    if (!seen.has(k)) { poLookup[k] = r; seen.add(k); }
  }

  // SAP PR unique by Banfn
  const prSeen = new Set();
  const sapPRUnique = sapPR.filter(r => {
    const k = String(r.Banfn);
    if (prSeen.has(k)) return false;
    prSeen.add(k); return true;
  });

  console.log(`\n🔗 Linking ${sapPRUnique.length} SAP PRs...`);

  // 4. Build rows
  const stats = {total:0,has_qms:0,l1:0,l2:0,cp:0,has_nfa:0,
    nfa_l1:0,nfa_l2:0,nfa_l3:0,nfa_l4:0,vendor:0,
    has_po:0,po_rel:0,po_del:0,po_inv:0,
    pend_pr:0,pend_qms:0,pend_nfa:0,pend_po:0,complete:0};

  const rows = [], deptMap = {}, plantMap = {};

  for (const s of sapPRUnique) {
    stats.total++;
    const banfn = String(s.Banfn);
    const q  = sapToQMS[banfn];
    const pid = q ? String(Math.round(Number(q['data.PR_Id']||q['PR_Id']||0))) : null;
    const n  = pid ? qmsIdToNFA[pid] : null;
    const ebeln = s.Ebeln ? String(Math.round(Number(s.Ebeln))) : null;
    const po = ebeln ? poLookup[ebeln] : null;

    const ok = (obj, key) => {
      if (!obj) return false;
      const v = obj[key] || obj[key.replace('data.','')];
      return v != null && String(v).trim() !== '' && String(v).trim() !== 'nan';
    };

    const l1  = ok(q,'data.Validator_One_E_Sign');
    const l2  = ok(q,'data.Validator_Two_E_Sign');
    const cp  = ok(q,'data.CP_Team_E_Sign');
    const nl1 = ok(n,'data.Level_One_E_Sign');
    const nl2 = ok(n,'data.Level_Two_E_Sign');
    const nl3 = ok(n,'data.Level_Three_E_Sign');
    const nl4 = ok(n,'data.Level_Four_E_Sign');
    const vnd = ok(n,'data.Vendor_Name');
    const por = po && String(po.FRGKE||'').trim() === 'G';
    const qty = po ? Number(po.MENGE||1)||1 : 1;
    const pod = po && Number(po.MENGE_DEL||0) >= qty;
    const poi = po && Number(po.MENGE_INV||0) >= qty;

    if (q)  stats.has_qms++;
    if (l1) stats.l1++;
    if (l2) stats.l2++;
    if (cp) stats.cp++;
    if (n)  stats.has_nfa++;
    if (nl1)stats.nfa_l1++;
    if (nl2)stats.nfa_l2++;
    if (nl3)stats.nfa_l3++;
    if (nl4)stats.nfa_l4++;
    if (vnd)stats.vendor++;
    if (po) stats.has_po++;
    if (por)stats.po_rel++;
    if (pod)stats.po_del++;
    if (poi)stats.po_inv++;

    let stage;
    if (por)       { stage='Complete';        stats.complete++; }
    else if (po)   { stage='Pending at PO';   stats.pend_po++; }
    else if (n)    { stage='Pending at NFA';  stats.pend_nfa++; }
    else if (q)    { stage='Pending at QMS';  stats.pend_qms++; }
    else           { stage='Pending at PR';   stats.pend_pr++; }

    const dept  = String(s.Eknam||'').trim();
    const plant = String(s.PlantDesc||'').trim();
    const poVal = po ? Number(po.NETWR||0) : 0;

    for (const [k,store] of [[dept,deptMap],[plant,plantMap]]) {
      if (!k || k==='nan') continue;
      if (!store[k]) store[k]={total:0,po_rel:0,pend_pr:0,pend_qms:0,pend_nfa:0,pend_po:0};
      store[k].total++;
      if (por)   store[k].po_rel++;
      const sk = {Complete:'po_rel','Pending at PR':'pend_pr','Pending at QMS':'pend_qms',
                  'Pending at NFA':'pend_nfa','Pending at PO':'pend_po'}[stage];
      if (sk && sk!=='po_rel') store[k][sk]++;
    }

    const prDt = s.Badat ? new Date(s.Badat) : null;
    const poDt = po?.BADAT ? new Date(po.BADAT) : null;
    const tat  = prDt && poDt ? Math.round((poDt-prDt)/86400000) : null;

    rows.push({
      sap_pr: banfn, desc: String(s.Txz01||'').slice(0,80),
      dept, plant, mat_group: String(s.Matkl||''),
      pr_date: String(s.Badat||'').slice(0,10),
      pr_release: String(s.RelStatus||''),
      has_qms: !!q,
      qms_epr: q ? Number(q['data.EPR_No']||q['EPR_No']||0)||null : null,
      qms_pr_id: pid,
      l1,l2,cp,
      l1_who: q ? String(q['data.Validator_One']||q['Validator_One']||'').split('@')[0] : '',
      l2_who: q ? String(q['data.Validator_Two']||q['Validator_Two']||'').split('@')[0] : '',
      cp_who: q ? String(q['data.CP_Team']||q['CP_Team']||'').split('@')[0] : '',
      has_nfa: !!n,
      nfa_no: n ? Number(n['data.NFA_No']||n['NFA_No']||0)||null : null,
      nfa_l1:nl1,nfa_l2:nl2,nfa_l3:nl3,nfa_l4:nl4,
      nfa_l1_team: n ? String(n['data.Level_One_Team']||'').split('@')[0] : '',
      nfa_l2_team: n ? String(n['data.Level_Two_Team']||'').split('@')[0] : '',
      nfa_l3_team: n ? String(n['data.Level_Three_Team']||'').split('@')[0] : '',
      nfa_l4_team: n ? String(n['data.Level_Four_Team']||'').split('@')[0] : '',
      nfa_vendor: vnd ? String(n['data.Vendor_Name']||n['Vendor_Name']||'') : '',
      nfa_amount: n ? Number(n['data.Excl_Numeric']||n['Excl_Numeric']||0) : 0,
      po_num: ebeln, po_value: poVal, po_released: por,
      po_delivered: pod, po_invoiced: poi,
      po_vendor: po ? String(po.NAME1||'') : '',
      po_date: po ? String(po.BADAT||'').slice(0,10) : '',
      inv_value: po ? Number(po.NETWR_INV||0) : 0,
      stage, tat_days: tat,
    });
  }

  const tats = rows.map(r=>r.tat_days).filter(t=>t&&t>0).sort((a,b)=>a-b);
  const medTAT = tats[Math.floor(tats.length/2)] || 0;
  const avgTAT = tats.length ? Math.round(tats.reduce((a,b)=>a+b,0)/tats.length) : 0;

  const deptList  = Object.entries(deptMap).map(([k,v])=>({name:k,...v})).sort((a,b)=>b.total-a.total).slice(0,15);
  const plantList = Object.entries(plantMap).map(([k,v])=>({name:k,...v})).sort((a,b)=>b.total-a.total).slice(0,10);

  const monthMap = {};
  for (const r of rows) {
    const mo = r.pr_date?.slice(0,7) || 'Unknown';
    if (!monthMap[mo]) monthMap[mo]={month:mo,total:0,po_rel:0,pend_nfa:0,pend_qms:0,pend_pr:0,pend_po:0};
    monthMap[mo].total++;
    if (r.po_released) monthMap[mo].po_rel++;
    if (r.stage==='Pending at NFA') monthMap[mo].pend_nfa++;
    if (r.stage==='Pending at QMS') monthMap[mo].pend_qms++;
    if (r.stage==='Pending at PR')  monthMap[mo].pend_pr++;
    if (r.stage==='Pending at PO')  monthMap[mo].pend_po++;
  }
  const monthList = Object.values(monthMap).sort((a,b)=>a.month.localeCompare(b.month)).slice(-18);

  const out = { kpi:stats, medianTAT:medTAT, avgTAT, deptData:deptList,
    plantData:plantList, monthData:monthList, rows,
    builtAt: new Date().toISOString() };

  fs.writeFileSync(OUTPUT, JSON.stringify(out));

  console.log('\n✅ Done!');
  console.log(`   Total PRs:     ${stats.total.toLocaleString()}`);
  console.log(`   Has QMS:       ${stats.has_qms.toLocaleString()}`);
  console.log(`   Has NFA:       ${stats.has_nfa.toLocaleString()}`);
  console.log(`   Has PO:        ${stats.has_po.toLocaleString()}`);
  console.log(`   PO Released:   ${stats.po_rel.toLocaleString()}`);
  console.log(`   Pending at PR: ${stats.pend_pr.toLocaleString()}`);
  console.log(`   Pending QMS:   ${stats.pend_qms.toLocaleString()}`);
  console.log(`   Pending NFA:   ${stats.pend_nfa.toLocaleString()}`);
  console.log(`   Pending PO:    ${stats.pend_po.toLocaleString()}`);
  console.log(`   Median TAT:    ${medTAT} days`);
  console.log(`\n📊 Dashboard will show fresh data on next refresh!`);
  process.exit(0);
}

build().catch(e => { console.error('Error:', e); process.exit(1); });
