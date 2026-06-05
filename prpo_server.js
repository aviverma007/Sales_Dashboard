/**
 * PRPO Live Data Server v5.0
 * - QMS: browser fetches data and pushes to this server
 * - SAP: direct SQL connection
 * 
 * HOW IT WORKS:
 * 1. A small script runs on the QMS page in your browser
 * 2. It fetches data (same origin, no CORS) every 30 mins
 * 3. Pushes data to this server
 * 4. Dashboard reads from this server
 */

const http  = require('http');
const https = require('https');
const url   = require('url');
const fs    = require('fs');
const path  = require('path');

let sql;
try { sql = require('mssql'); } catch(e) { console.log('⚠️  Run: npm install mssql'); }

const PORT = 3001;
const DATA_DIR = path.join(__dirname, 'data');

const SAP_CONFIG = {
  server:   '192.168.66.33',
  database: 'SWDBIDB',
  user:     'sa',
  password: 'Admin#123',
  options:  { encrypt:false, trustServerCertificate:true, connectTimeout:30000 },
  pool:     { max:5, min:0, idleTimeoutMillis:30000 },
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

// Load cache from disk on startup
function loadCache() {
  const files = { pr:'qms_pr.json', nfa:'qms_nfa.json', market:'qms_market.json', eot:'qms_eot.json' };
  const result = { pr:[], nfa:[], market:[], eot:[], sap_pr:[], sap_po:[], lastFetch:null, lastQMS:null };
  for (const [key, file] of Object.entries(files)) {
    const fp = path.join(DATA_DIR, file);
    if (fs.existsSync(fp)) {
      try { result[key] = JSON.parse(fs.readFileSync(fp,'utf8')); } catch(e){}
    }
  }
  return result;
}

let cache = loadCache();

// Save QMS data to disk
function saveQMS(key, data) {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, {recursive:true});
  fs.writeFileSync(path.join(DATA_DIR, `qms_${key}.json`), JSON.stringify(data), 'utf8');
}

async function fetchSAP(key) {
  if (!sql) return [];
  try {
    const pool = await sql.connect(SAP_CONFIG);
    const result = await pool.request().query(SAP_QUERIES[key]);
    await pool.close();
    return result.recordset.map(r => {
      const clean = {};
      for (const [k,v] of Object.entries(r)) {
        clean[k] = v instanceof Date ? v.toISOString().slice(0,10) : v;
      }
      return clean;
    });
  } catch(e) {
    console.log(`❌ SAP ${key}: ${e.message}`);
    return [];
  }
}

async function refreshSAP() {
  console.log('📡 Refreshing SAP data...');
  const [sap_pr, sap_po] = await Promise.all([fetchSAP('sap_pr'), fetchSAP('sap_po')]);
  if (sap_pr.length) cache.sap_pr = sap_pr;
  if (sap_po.length) cache.sap_po = sap_po;
  cache.lastFetch = new Date().toISOString();
  console.log(`✅ SAP PR=${cache.sap_pr.length} PO=${cache.sap_po.length}`);
}

// ── HTTP SERVER ───────────────────────────────────────────────────────────────
const server = http.createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', '*');
  res.setHeader('Content-Type', 'application/json');
  if (req.method === 'OPTIONS') { res.writeHead(200); res.end(); return; }

  const parsed   = url.parse(req.url, true);
  const pathname = parsed.pathname;

  // ── BROWSER PUSHES QMS DATA HERE ─────────────────────────────────────────
  if (pathname === '/api/push' && req.method === 'POST') {
    let body = '';
    req.on('data', d => body += d);
    req.on('end', () => {
      try {
        const payload = JSON.parse(body);
        let updated = [];
        for (const [key, data] of Object.entries(payload)) {
          if (Array.isArray(data) && data.length > 0) {
            cache[key] = data;
            saveQMS(key, data);
            updated.push(`${key}:${data.length}`);
          }
        }
        cache.lastQMS = new Date().toISOString();
        console.log(`✅ QMS data received from browser: ${updated.join(', ')}`);
        res.end(JSON.stringify({ok:true, received:updated}));
      } catch(e) {
        res.end(JSON.stringify({error:e.message}));
      }
    });
    return;
  }

  // ── SERVE BROWSER SCRIPT ──────────────────────────────────────────────────
  if (pathname === '/qms-bridge.js') {
    res.setHeader('Content-Type', 'application/javascript');
    res.end(`
// QMS Data Bridge — runs on QMS page, fetches data, pushes to local server
(function() {
  var SERVER = 'http://localhost:3001';
  var APIS = {
    pr:     '/bi-power/bi_prs.php',
    nfa:    '/bi-power/bi_nfas.php',
    market: '/bi-power/bi_market_place.php',
    eot:    '/bi-power/bi_eot.php'
  };

  function fetchAndPush() {
    console.log('[QMS Bridge] Fetching data...');
    var promises = Object.keys(APIS).map(function(key) {
      return fetch(APIS[key], {credentials:'include'})
        .then(function(r){ return r.json(); })
        .then(function(d){ return {key:key, data:Array.isArray(d)?d:(d.data||[])}; })
        .catch(function(e){ console.error('[QMS Bridge] Error '+key, e); return {key:key, data:[]}; });
    });

    Promise.all(promises).then(function(results) {
      var payload = {};
      results.forEach(function(r){ payload[r.key] = r.data; });
      
      var counts = Object.keys(payload).map(function(k){ return k+':'+payload[k].length; }).join(', ');
      console.log('[QMS Bridge] Fetched: ' + counts);

      return fetch(SERVER + '/api/push', {
        method: 'POST',
        headers: {'Content-Type':'application/json'},
        body: JSON.stringify(payload)
      });
    }).then(function(r){ return r.json(); })
    .then(function(r){ console.log('[QMS Bridge] Pushed to server:', r); })
    .catch(function(e){ console.error('[QMS Bridge] Push failed:', e); });
  }

  // Run immediately then every 30 minutes
  fetchAndPush();
  setInterval(fetchAndPush, 30 * 60 * 1000);
  console.log('[QMS Bridge] Running. Will refresh every 30 minutes.');
})();
    `);
    return;
  }

  // ── STANDARD API ROUTES ───────────────────────────────────────────────────
  const routes = {
    '/api/pr':      ()=>cache.pr,
    '/api/nfa':     ()=>cache.nfa,
    '/api/market':  ()=>cache.market,
    '/api/eot':     ()=>cache.eot,
    '/api/sap_pr':  ()=>cache.sap_pr,
    '/api/sap_po':  ()=>cache.sap_po,
    '/api/status':  ()=>({
      lastFetch: cache.lastFetch,
      lastQMS:   cache.lastQMS,
      counts:    {pr:cache.pr.length, nfa:cache.nfa.length, sap_pr:cache.sap_pr.length, sap_po:cache.sap_po.length}
    }),
    '/api/refresh': async()=>{ await refreshSAP(); return {ok:true}; },
  };

  const handler = routes[pathname];
  if (handler) {
    const data = await Promise.resolve(handler());
    res.end(JSON.stringify({status:'success', data, count:Array.isArray(data)?data.length:undefined}));
  } else {
    res.writeHead(404);
    res.end(JSON.stringify({error:'Unknown route', routes:Object.keys(routes)}));
  }
});

// ── START ─────────────────────────────────────────────────────────────────────
(async () => {
  console.log('\n╔══════════════════════════════════════════════════╗');
  console.log('║         PRPO Live Data Server v5.0              ║');
  console.log('║   Browser Bridge + SAP SQL → localhost:3001     ║');
  console.log('╚══════════════════════════════════════════════════╝\n');

  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, {recursive:true});

  // Load cached QMS data from disk (from last session)
  console.log(`📂 Loaded from disk: QMS PR=${cache.pr.length} NFA=${cache.nfa.length}`);

  // Refresh SAP data
  await refreshSAP();

  server.listen(PORT, () => {
    console.log(`\n🚀 Server: http://localhost:${PORT}`);
    console.log(`   SAP PR:  ${cache.sap_pr.length} rows ✅`);
    console.log(`   SAP PO:  ${cache.sap_po.length} rows ✅`);
    console.log(`   QMS PR:  ${cache.pr.length} rows ${cache.pr.length>0?'✅':'⏳'}`);
    console.log(`   QMS NFA: ${cache.nfa.length} rows ${cache.nfa.length>0?'✅':'⏳'}`);

    if (cache.pr.length === 0) {
      console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('⚡ ONE-TIME SETUP for QMS data:');
      console.log('');
      console.log('   Open Chrome → go to any QMS page → F12 → Console');
      console.log('   Paste this ONE LINE and press Enter:');
      console.log('');
      console.log("   var s=document.createElement('script');s.src='http://localhost:3001/qms-bridge.js';document.head.appendChild(s)");
      console.log('');
      console.log('   ✅ Data will load in 5 seconds automatically!');
      console.log('   ✅ Runs every 30 mins while Chrome is open');
      console.log('   ✅ Data saved to disk — persists after restart');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    }
  });

  // Auto-refresh SAP every 30 minutes
  setInterval(refreshSAP, 30 * 60 * 1000);
})();
