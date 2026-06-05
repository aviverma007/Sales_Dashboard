/**
 * PRPO Live Data Server
 * Connects to SAP SQL + QMS APIs
 * Run: node prpo_server.js
 * Dashboard reads from: http://localhost:3001/api/
 */

const http  = require('http');
const https = require('https');
const url   = require('url');

// Try to load mssql — install with: npm install mssql
let sql;
try { sql = require('mssql'); } catch(e) { console.log('⚠️  mssql not installed. Run: npm install mssql'); }

const PORT = 3001;

// ── CONFIG ────────────────────────────────────────────────────────────────────
const SAP_CONFIG = {
  server:   '192.168.66.33',
  database: 'SWDBIDB',
  user:     'sa',
  password: 'Admin#123',
  options:  { encrypt: false, trustServerCertificate: true, connectTimeout: 30000 },
  pool:     { max: 5, min: 0, idleTimeoutMillis: 30000 },
};

const QMS_BASE  = 'smartworlddevelopersonline.com';
const QMS_EMAIL = 'sunny.batra@smartworlddevelopers.com';
const QMS_PASS  = 'swd@2021';

// ── CACHE ─────────────────────────────────────────────────────────────────────
let cache = {
  pr: [], nfa: [], market: [], eot: [],
  sap_pr: [], sap_po: [],
  lastFetch: null, errors: {}
};

let QMS_COOKIE = '';

// ── SAP SQL QUERIES ───────────────────────────────────────────────────────────
const SAP_QUERIES = {
  sap_pr: `
    SELECT
      Banfn    AS pr_number,
      Bnfpo    AS pr_item,
      Eknam    AS department,
      Txz01    AS description,
      Matnr    AS material,
      Matkl    AS material_group,
      Menge    AS quantity,
      Meins    AS unit,
      Preis    AS price,
      Netwr    AS net_value,
      Werks    AS plant,
      PlantDesc AS plant_desc,
      Ekgrp    AS purch_group,
      Afnam    AS requester,
      Ernam    AS created_by,
      Erdat    AS created_date,
      Badat    AS pr_date,
      Frgdt    AS release_date,
      Frgst    AS release_status,
      Frgkz    AS rel_indicator,
      RelStatus AS rel_status_text,
      Procstat AS proc_status,
      Ebeln    AS po_number,
      Bsart    AS doc_type,
      Statu    AS status,
      Loekz    AS deleted,
      Bedat    AS po_date,
      Monat    AS month_num,
      Gjahr    AS year_num
    FROM dbo.PRD_PR
    WHERE (Loekz = 0 OR Loekz IS NULL)
    ORDER BY Badat DESC`,

  sap_po: `
    SELECT
      EBELN    AS po_number,
      EBELP    AS po_item,
      EKNAM    AS department,
      TXZ01    AS description,
      NAME1    AS vendor_name,
      MATNR    AS material,
      MATKL    AS material_group,
      MENGE    AS quantity,
      MEINS    AS unit,
      NETPR    AS net_price,
      NETWR    AS net_value,
      WAERS    AS currency,
      MENGE_DEL AS qty_delivered,
      MENGE_INV AS qty_invoiced,
      NETWR_INV AS inv_value,
      WERKS    AS plant,
      PLANT_DESC AS plant_desc,
      EKGRP    AS purch_group,
      BSART    AS po_type,
      BADAT    AS po_date,
      KDATB    AS valid_from,
      KDATE    AS valid_to,
      FRGZU    AS pr_release,
      FRGKE    AS po_release,
      PROCSTAT AS proc_status,
      LOEKZ    AS deleted,
      AEDAT    AS changed_date,
      MONAT    AS month_num,
      GJAHR    AS year_num
    FROM dbo.PRD_PurchaseOrder
    WHERE (LOEKZ IS NULL OR LOEKZ = '')
    ORDER BY BADAT DESC`,
};

// ── QMS LOGIN ─────────────────────────────────────────────────────────────────
function qmsLogin() {
  return new Promise((resolve) => {
    console.log('🔐 Logging into QMS...');

    const getReq = https.request({
      hostname: QMS_BASE, path: '/bi-power/home/login', method: 'GET',
      headers: { 'User-Agent': 'Mozilla/5.0' },
      rejectUnauthorized: false,
    }, (res) => {
      const initCookie = (res.headers['set-cookie']||[]).map(c=>c.split(';')[0]).join('; ');
      let d=''; res.on('data',c=>d+=c); res.on('end',()=>{
        const body = `email=${encodeURIComponent(QMS_EMAIL)}&password=${encodeURIComponent(QMS_PASS)}`;
        const postReq = https.request({
          hostname: QMS_BASE, path: '/bi-power/home/login', method: 'POST',
          headers: {
            'User-Agent':     'Mozilla/5.0',
            'Content-Type':   'application/x-www-form-urlencoded',
            'Content-Length': Buffer.byteLength(body),
            'Cookie':         initCookie,
            'Referer':        `https://${QMS_BASE}/bi-power/home/login`,
          },
          rejectUnauthorized: false,
        }, (res2) => {
          QMS_COOKIE = (res2.headers['set-cookie']||[]).map(c=>c.split(';')[0]).join('; ');
          let d2=''; res2.on('data',c=>d2+=c);
          res2.on('end',()=>{
            if(QMS_COOKIE) { console.log('✅ QMS login successful'); resolve(true); }
            else { console.log('❌ QMS login failed — trying without login...'); resolve(false); }
          });
        });
        postReq.on('error',()=>resolve(false));
        postReq.write(body); postReq.end();
      });
    });
    getReq.on('error',()=>resolve(false));
    getReq.end();
  });
}

// ── FETCH QMS API ─────────────────────────────────────────────────────────────
function fetchQMS(path) {
  return new Promise((resolve) => {
    const req = https.request({
      hostname: QMS_BASE, path: `/bi-power/${path}`, method: 'GET',
      headers: {
        'User-Agent':       'Mozilla/5.0',
        'Accept':           'application/json',
        'Cookie':           QMS_COOKIE,
        'Referer':          `https://${QMS_BASE}/bi-power/home/dashboard`,
        'X-Requested-With': 'XMLHttpRequest',
      },
      rejectUnauthorized: false,
    }, (res) => {
      let data=''; res.on('data',d=>data+=d);
      res.on('end',()=>{
        try {
          const json = JSON.parse(data);
          if(json.status==='unauthorized') { resolve([]); return; }
          const arr = Array.isArray(json)?json:(json.data||[]);
          resolve(arr);
        } catch(e) { resolve([]); }
      });
    });
    req.on('error',()=>resolve([]));
    req.end();
  });
}

// ── FETCH SAP SQL ─────────────────────────────────────────────────────────────
async function fetchSAP(queryKey) {
  if (!sql) return [];
  try {
    const pool = await sql.connect(SAP_CONFIG);
    const result = await pool.request().query(SAP_QUERIES[queryKey]);
    await pool.close();
    console.log(`✅ SAP ${queryKey}: ${result.recordset.length} rows`);
    return result.recordset;
  } catch(e) {
    console.log(`❌ SAP ${queryKey} error:`, e.message);
    cache.errors[queryKey] = e.message;
    return [];
  }
}

// ── FETCH ALL DATA ────────────────────────────────────────────────────────────
async function fetchAll() {
  console.log('\n📡 Fetching all data...\n');

  // QMS APIs
  if(!QMS_COOKIE) await qmsLogin();

  const [pr, nfa, market, eot] = await Promise.all([
    fetchQMS('bi_prs.php'),
    fetchQMS('bi_nfas.php'),
    fetchQMS('bi_market_place.php'),
    fetchQMS('bi_eot.php'),
  ]);

  // If still unauthorized — re-login and retry
  if(!pr.length) {
    await qmsLogin();
    const [pr2, nfa2] = await Promise.all([fetchQMS('bi_prs.php'), fetchQMS('bi_nfas.php')]);
    cache.pr  = pr2;
    cache.nfa = nfa2;
  } else {
    cache.pr  = pr;
    cache.nfa = nfa;
  }
  cache.market = market;
  cache.eot    = eot;

  // SAP SQL
  const [sap_pr, sap_po] = await Promise.all([
    fetchSAP('sap_pr'),
    fetchSAP('sap_po'),
  ]);
  cache.sap_pr = sap_pr;
  cache.sap_po = sap_po;

  cache.lastFetch = new Date().toISOString();
  console.log(`\n✅ All data fetched at ${cache.lastFetch}`);
  console.log(`   QMS PR: ${cache.pr.length} | NFA: ${cache.nfa.length} | Market: ${cache.market.length} | EOT: ${cache.eot.length}`);
  console.log(`   SAP PR: ${cache.sap_pr.length} | SAP PO: ${cache.sap_po.length}`);
  console.log(`   ⏰ Next refresh in 30 minutes\n`);
}

// ── HTTP SERVER ───────────────────────────────────────────────────────────────
const server = http.createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Content-Type', 'application/json');
  if(req.method==='OPTIONS'){res.end();return;}

  const { pathname } = url.parse(req.url);

  const routes = {
    '/api/pr':      ()=>cache.pr,
    '/api/nfa':     ()=>cache.nfa,
    '/api/market':  ()=>cache.market,
    '/api/eot':     ()=>cache.eot,
    '/api/sap_pr':  ()=>cache.sap_pr,
    '/api/sap_po':  ()=>cache.sap_po,
    '/api/all':     ()=>({
      pr:cache.pr, nfa:cache.nfa, market:cache.market, eot:cache.eot,
      sap_pr:cache.sap_pr, sap_po:cache.sap_po,
    }),
    '/api/status':  ()=>({
      lastFetch: cache.lastFetch,
      errors: cache.errors,
      counts: {
        pr:cache.pr.length, nfa:cache.nfa.length,
        market:cache.market.length, eot:cache.eot.length,
        sap_pr:cache.sap_pr.length, sap_po:cache.sap_po.length,
      }
    }),
    '/api/refresh': async ()=>{ await fetchAll(); return {ok:true, lastFetch:cache.lastFetch}; },
  };

  const handler = routes[pathname];
  if(handler) {
    const data = await Promise.resolve(handler());
    const arr  = Array.isArray(data)?data:null;
    res.end(JSON.stringify({
      status:'success', data,
      count: arr?arr.length:undefined,
      lastFetch: cache.lastFetch,
    }));
  } else {
    res.writeHead(404);
    res.end(JSON.stringify({error:'Not found', routes: Object.keys(routes)}));
  }
});

// ── START ─────────────────────────────────────────────────────────────────────
async function start() {
  console.log('');
  console.log('╔══════════════════════════════════════════╗');
  console.log('║       PRPO Live Data Server v1.0         ║');
  console.log('║  QMS APIs + SAP SQL → localhost:3001     ║');
  console.log('╚══════════════════════════════════════════╝');
  console.log('');

  await fetchAll();

  server.listen(PORT, () => {
    console.log(`🚀 Server: http://localhost:${PORT}`);
    console.log(`   /api/pr      → QMS Purchase Requests (${cache.pr.length} rows)`);
    console.log(`   /api/nfa     → QMS NFAs (${cache.nfa.length} rows)`);
    console.log(`   /api/market  → QMS Marketplace`);
    console.log(`   /api/eot     → QMS EOT`);
    console.log(`   /api/sap_pr  → SAP PRD_PR (${cache.sap_pr.length} rows)`);
    console.log(`   /api/sap_po  → SAP PRD_PurchaseOrder (${cache.sap_po.length} rows)`);
    console.log(`   /api/status  → Connection status`);
    console.log(`   /api/refresh → Force refresh now`);
    console.log('');
    console.log('📌 Keep this window open. Dashboard reads from here.');
    console.log('🔄 Auto-refreshing every 30 minutes...');
  });

  // Auto refresh every 30 min
  setInterval(fetchAll, 30 * 60 * 1000);
}

start().catch(console.error);
