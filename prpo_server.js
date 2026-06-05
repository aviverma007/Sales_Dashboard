/**
 * PRPO Live Data Server v3.0
 * - QMS APIs: called directly (IP whitelisted on company network)
 * - SAP SQL: connects with sa credentials
 * Run: node prpo_server.js
 */

const http  = require('http');
const https = require('https');
const url   = require('url');

let sql;
try { sql = require('mssql'); } catch(e) { console.log('⚠️  Run: npm install mssql'); }

const PORT = 3001;

const SAP_CONFIG = {
  server:   '192.168.66.33',
  database: 'SWDBIDB',
  user:     'sa',
  password: 'Admin#123',
  options:  { encrypt:false, trustServerCertificate:true, connectTimeout:30000 },
  pool:     { max:5, min:0, idleTimeoutMillis:30000 },
};

const QMS_APIS = {
  pr:     'https://smartworlddevelopersonline.com/bi-power/bi_prs.php',
  nfa:    'https://smartworlddevelopersonline.com/bi-power/bi_nfas.php',
  market: 'https://smartworlddevelopersonline.com/bi-power/bi_market_place.php',
  eot:    'https://smartworlddevelopersonline.com/bi-power/bi_eot.php',
};

const SAP_QUERIES = {
  sap_pr: `SELECT Banfn AS pr_number, Bnfpo AS pr_item, Eknam AS department,
    Txz01 AS description, Matnr AS material, Matkl AS material_group,
    Menge AS quantity, Meins AS unit, Preis AS price, Netwr AS net_value,
    Werks AS plant, PlantDesc AS plant_desc, Ekgrp AS purch_group,
    Afnam AS requester, Ernam AS created_by, Erdat AS created_date,
    Badat AS pr_date, Frgdt AS release_date, Frgst AS release_status,
    RelStatus AS rel_status_text, Procstat AS proc_status,
    Ebeln AS po_number, Bsart AS doc_type, Statu AS status, Loekz AS deleted
    FROM dbo.PRD_PR WHERE (Loekz=0 OR Loekz IS NULL) ORDER BY Badat DESC`,

  sap_po: `SELECT EBELN AS po_number, EBELP AS po_item, EKNAM AS department,
    TXZ01 AS description, NAME1 AS vendor_name, MATNR AS material,
    MATKL AS material_group, MENGE AS quantity, MEINS AS unit,
    NETPR AS net_price, NETWR AS net_value, WAERS AS currency,
    MENGE_DEL AS qty_delivered, MENGE_INV AS qty_invoiced, NETWR_INV AS inv_value,
    WERKS AS plant, PLANT_DESC AS plant_desc, EKGRP AS purch_group,
    BSART AS po_type, BADAT AS po_date, KDATE AS valid_to,
    FRGZU AS pr_release, FRGKE AS po_release, PROCSTAT AS proc_status
    FROM dbo.PRD_PurchaseOrder WHERE (LOEKZ IS NULL OR LOEKZ='') ORDER BY BADAT DESC`,
};

let cache = { pr:[], nfa:[], market:[], eot:[], sap_pr:[], sap_po:[], lastFetch:null, errors:{} };

// ── Fetch QMS API directly (no login — IP whitelisted) ──────────────────────
function fetchQMS(key) {
  return new Promise((resolve) => {
    const apiUrl = QMS_APIS[key];
    const req = https.request(apiUrl, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        'Accept':     'application/json',
      },
      rejectUnauthorized: false,
    }, (res) => {
      let data = '';
      res.on('data', d => data += d);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          if (json.status === 'unauthorized') {
            console.log(`❌ QMS ${key}: unauthorized — not on company WiFi?`);
            resolve([]);
          } else {
            const arr = Array.isArray(json) ? json : (json.data || []);
            console.log(`✅ QMS ${key}: ${arr.length} rows`);
            resolve(arr);
          }
        } catch(e) {
          console.log(`❌ QMS ${key}: invalid JSON — ${data.slice(0,100)}`);
          resolve([]);
        }
      });
    });
    req.on('error', (e) => {
      console.log(`❌ QMS ${key}: ${e.message}`);
      resolve([]);
    });
    req.setTimeout(15000, () => { req.destroy(); resolve([]); });
    req.end();
  });
}

// ── Fetch SAP SQL ─────────────────────────────────────────────────────────────
async function fetchSAP(key) {
  if (!sql) return [];
  try {
    const pool   = await sql.connect(SAP_CONFIG);
    const result = await pool.request().query(SAP_QUERIES[key]);
    await pool.close();
    // Convert dates to strings
    const rows = result.recordset.map(r => {
      const clean = {};
      for (const [k,v] of Object.entries(r)) {
        clean[k] = v instanceof Date ? v.toISOString().slice(0,10) : v;
      }
      return clean;
    });
    console.log(`✅ SAP ${key}: ${rows.length} rows`);
    return rows;
  } catch(e) {
    console.log(`❌ SAP ${key}: ${e.message}`);
    cache.errors[key] = e.message;
    return [];
  }
}

// ── Refresh all ───────────────────────────────────────────────────────────────
async function fetchAll() {
  console.log(`\n📡 Fetching all data... [${new Date().toLocaleTimeString()}]\n`);
  cache.errors = {};

  // QMS — parallel, no login needed
  const [pr, nfa, market, eot] = await Promise.all([
    fetchQMS('pr'), fetchQMS('nfa'), fetchQMS('market'), fetchQMS('eot')
  ]);
  cache.pr = pr; cache.nfa = nfa; cache.market = market; cache.eot = eot;

  // SAP — parallel
  const [sap_pr, sap_po] = await Promise.all([
    fetchSAP('sap_pr'), fetchSAP('sap_po')
  ]);
  cache.sap_pr = sap_pr; cache.sap_po = sap_po;
  cache.lastFetch = new Date().toISOString();

  console.log(`\n📊 Summary: QMS PR=${cache.pr.length} NFA=${cache.nfa.length} | SAP PR=${cache.sap_pr.length} PO=${cache.sap_po.length}`);
  console.log('⏰ Next auto-refresh in 30 minutes\n');
}

// ── HTTP server ───────────────────────────────────────────────────────────────
const server = http.createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');
  if (req.method === 'OPTIONS') { res.end(); return; }

  const { pathname } = url.parse(req.url);
  const routes = {
    '/api/pr':      ()=>cache.pr,
    '/api/nfa':     ()=>cache.nfa,
    '/api/market':  ()=>cache.market,
    '/api/eot':     ()=>cache.eot,
    '/api/sap_pr':  ()=>cache.sap_pr,
    '/api/sap_po':  ()=>cache.sap_po,
    '/api/status':  ()=>({ lastFetch:cache.lastFetch, errors:cache.errors,
      counts:{pr:cache.pr.length,nfa:cache.nfa.length,sap_pr:cache.sap_pr.length,sap_po:cache.sap_po.length} }),
    '/api/refresh': async()=>{ await fetchAll(); return {ok:true}; },
  };

  const handler = routes[pathname];
  if (handler) {
    const data = await Promise.resolve(handler());
    res.end(JSON.stringify({ status:'success', data, count:Array.isArray(data)?data.length:undefined, lastFetch:cache.lastFetch }));
  } else {
    res.writeHead(404);
    res.end(JSON.stringify({ error:'Unknown route', available:Object.keys(routes) }));
  }
});

// ── Start ─────────────────────────────────────────────────────────────────────
(async () => {
  console.log('\n╔══════════════════════════════════════════╗');
  console.log('║       PRPO Live Data Server v3.0         ║');
  console.log('║  QMS (direct) + SAP SQL → localhost:3001 ║');
  console.log('╚══════════════════════════════════════════╝\n');

  await fetchAll();

  server.listen(PORT, () => {
    console.log(`🚀 Running at http://localhost:${PORT}`);
    console.log(`   /api/pr     → ${cache.pr.length} QMS PRs`);
    console.log(`   /api/nfa    → ${cache.nfa.length} NFAs`);
    console.log(`   /api/sap_pr → ${cache.sap_pr.length} SAP PRs`);
    console.log(`   /api/sap_po → ${cache.sap_po.length} SAP POs`);
    console.log(`   /api/refresh → force refresh now`);
    console.log(`   /api/status  → connection status\n`);
    console.log('📌 Keep this window open. Auto-refreshes every 30 min.');
  });

  setInterval(fetchAll, 30 * 60 * 1000);
})();
