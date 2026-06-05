/**
 * PRPO Live Data Server v4.0
 * - QMS: reads cookie from Chrome automatically
 * - SAP: connects directly with sa credentials
 * Run: node prpo_server.js
 */

const http  = require('http');
const https = require('https');
const url   = require('url');
const fs    = require('fs');
const path  = require('path');
const os    = require('os');

let sql;
try { sql = require('mssql'); } catch(e) { console.log('⚠️  Run: npm install mssql'); }

const PORT = 3001;

// ── CONFIG ────────────────────────────────────────────────────────────────────
const QMS_HOST = 'smartworlddevelopersonline.com';
const QMS_APIS = {
  pr:     '/bi-power/bi_prs.php',
  nfa:    '/bi-power/bi_nfas.php',
  market: '/bi-power/bi_market_place.php',
  eot:    '/bi-power/bi_eot.php',
};

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

let cache = { pr:[], nfa:[], market:[], eot:[], sap_pr:[], sap_po:[], lastFetch:null, errors:{}, cookieSource:'none' };

// ── READ CHROME COOKIE FILE ───────────────────────────────────────────────────
function getChromeCookieFile() {
  const user = os.homedir();
  const paths = [
    // Chrome
    path.join(user,'AppData','Local','Google','Chrome','User Data','Default','Cookies'),
    path.join(user,'AppData','Local','Google','Chrome','User Data','Profile 1','Cookies'),
    // Edge
    path.join(user,'AppData','Local','Microsoft','Edge','User Data','Default','Cookies'),
    // Chrome Beta
    path.join(user,'AppData','Local','Google','Chrome Beta','User Data','Default','Cookies'),
  ];
  return paths.find(p => fs.existsSync(p)) || null;
}

// ── READ QMS COOKIE FROM CHROME DB ───────────────────────────────────────────
async function getCookieFromChrome() {
  return new Promise((resolve) => {
    const cookieFile = getChromeCookieFile();
    if (!cookieFile) { resolve(null); return; }

    // Copy the cookie file (Chrome locks it)
    const tmpFile = path.join(os.tmpdir(), 'qms_cookies_tmp.db');
    try {
      fs.copyFileSync(cookieFile, tmpFile);
    } catch(e) {
      resolve(null); return;
    }

    // Try sqlite3 package
    let sqlite3;
    try { sqlite3 = require('better-sqlite3'); } catch(e) {
      try { sqlite3 = require('sqlite3').verbose(); } catch(e2) {
        resolve(null); return;
      }
    }

    try {
      // better-sqlite3 (synchronous)
      const db = sqlite3(tmpFile, { readonly: true });
      const rows = db.prepare(
        `SELECT name, value, encrypted_value FROM cookies 
         WHERE host_key LIKE '%smartworlddevelopersonline%' 
         ORDER BY last_access_utc DESC`
      ).all();
      db.close();

      const cookies = rows.map(r => `${r.name}=${r.value||'[encrypted]'}`).join('; ');
      if (cookies.includes('ci_session')) {
        console.log('✅ Got QMS cookie from Chrome DB');
        resolve(cookies);
      } else {
        resolve(null);
      }
    } catch(e) {
      resolve(null);
    }
  });
}

// ── READ COOKIE FROM SAVED FILE (set by browser) ─────────────────────────────
function getCookieFromFile() {
  const cookiePath = path.join(__dirname, 'data', 'qms_cookie.txt');
  if (fs.existsSync(cookiePath)) {
    const cookie = fs.readFileSync(cookiePath, 'utf8').trim();
    if (cookie && cookie.includes('ci_session')) {
      console.log('✅ Got QMS cookie from saved file');
      return cookie;
    }
  }
  return null;
}

// ── GET BEST AVAILABLE COOKIE ─────────────────────────────────────────────────
async function getQMSCookie() {
  // 1. Try reading from Chrome cookie database
  const chromeCookie = await getCookieFromChrome();
  if (chromeCookie) { cache.cookieSource = 'chrome'; return chromeCookie; }

  // 2. Try reading from saved file (set via /api/set-cookie endpoint)
  const fileCookie = getCookieFromFile();
  if (fileCookie) { cache.cookieSource = 'file'; return fileCookie; }

  console.log('⚠️  No QMS cookie found. Open QMS in Chrome, then visit http://localhost:3001/api/set-cookie');
  cache.cookieSource = 'none';
  return null;
}

// ── FETCH QMS API ─────────────────────────────────────────────────────────────
function fetchQMS(apiPath, cookie) {
  return new Promise((resolve) => {
    if (!cookie) { resolve([]); return; }

    const req = https.request({
      hostname: QMS_HOST,
      path: apiPath,
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json, text/plain, */*',
        'Cookie': cookie,
        'Referer': `https://${QMS_HOST}/bi-power/home/dashboard`,
        'X-Requested-With': 'XMLHttpRequest',
      },
      rejectUnauthorized: false,
    }, (res) => {
      let data = '';
      res.on('data', d => data += d);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          if (json.status === 'unauthorized') {
            console.log(`  ❌ QMS ${apiPath}: unauthorized — cookie may be expired`);
            resolve(null); // null = need fresh cookie
          } else {
            const arr = Array.isArray(json) ? json : (json.data || []);
            resolve(arr);
          }
        } catch(e) {
          resolve([]);
        }
      });
    });
    req.on('error', () => resolve([]));
    req.setTimeout(20000, () => { req.destroy(); resolve([]); });
    req.end();
  });
}

// ── FETCH SAP ─────────────────────────────────────────────────────────────────
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
    console.log(`  ❌ SAP ${key}: ${e.message}`);
    return [];
  }
}

// ── FETCH ALL ─────────────────────────────────────────────────────────────────
async function fetchAll() {
  console.log(`\n📡 Fetching all data... [${new Date().toLocaleTimeString()}]`);
  cache.errors = {};

  // Get cookie
  const cookie = await getQMSCookie();

  // Fetch QMS in parallel
  const [pr, nfa, market, eot] = await Promise.all([
    fetchQMS(QMS_APIS.pr, cookie),
    fetchQMS(QMS_APIS.nfa, cookie),
    fetchQMS(QMS_APIS.market, cookie),
    fetchQMS(QMS_APIS.eot, cookie),
  ]);

  if (pr === null) {
    // Cookie expired — clear saved file so next attempt tries Chrome again
    const cookiePath = path.join(__dirname, 'data', 'qms_cookie.txt');
    if (fs.existsSync(cookiePath)) fs.unlinkSync(cookiePath);
    console.log('  🔄 Cookie expired — will retry with fresh cookie on next refresh');
  } else {
    cache.pr = pr || cache.pr;
    cache.nfa = nfa || cache.nfa;
    cache.market = market || cache.market;
    cache.eot = eot || cache.eot;
  }

  // SAP in parallel
  const [sap_pr, sap_po] = await Promise.all([fetchSAP('sap_pr'), fetchSAP('sap_po')]);
  if (sap_pr.length) cache.sap_pr = sap_pr;
  if (sap_po.length) cache.sap_po = sap_po;

  cache.lastFetch = new Date().toISOString();
  console.log(`  ✅ QMS PR=${cache.pr.length} NFA=${cache.nfa.length} | SAP PR=${cache.sap_pr.length} PO=${cache.sap_po.length} [cookie: ${cache.cookieSource}]`);
}

// ── HTTP SERVER ───────────────────────────────────────────────────────────────
const server = http.createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');
  if (req.method === 'OPTIONS') { res.end(); return; }

  const parsed = url.parse(req.url, true);
  const pathname = parsed.pathname;

  // Special: save cookie sent from browser
  if (pathname === '/api/set-cookie' && req.method === 'POST') {
    let body = '';
    req.on('data', d => body += d);
    req.on('end', async () => {
      try {
        const { cookie } = JSON.parse(body);
        if (cookie) {
          const dir = path.join(__dirname, 'data');
          if (!fs.existsSync(dir)) fs.mkdirSync(dir, {recursive:true});
          fs.writeFileSync(path.join(dir, 'qms_cookie.txt'), cookie);
          console.log('✅ Cookie saved from browser');
          await fetchAll();
          res.end(JSON.stringify({ok:true, counts:{pr:cache.pr.length, nfa:cache.nfa.length}}));
        } else {
          res.end(JSON.stringify({error:'No cookie provided'}));
        }
      } catch(e) { res.end(JSON.stringify({error:e.message})); }
    });
    return;
  }

  // Reload from file
  if (pathname === '/api/reload') {
    await fetchAll();
    res.end(JSON.stringify({ok:true}));
    return;
  }

  const routes = {
    '/api/pr':      ()=>cache.pr,
    '/api/nfa':     ()=>cache.nfa,
    '/api/market':  ()=>cache.market,
    '/api/eot':     ()=>cache.eot,
    '/api/sap_pr':  ()=>cache.sap_pr,
    '/api/sap_po':  ()=>cache.sap_po,
    '/api/status':  ()=>({lastFetch:cache.lastFetch, cookieSource:cache.cookieSource, errors:cache.errors,
      counts:{pr:cache.pr.length,nfa:cache.nfa.length,sap_pr:cache.sap_pr.length,sap_po:cache.sap_po.length}}),
    '/api/refresh': async()=>{ await fetchAll(); return {ok:true, lastFetch:cache.lastFetch}; },
  };

  const handler = routes[pathname];
  if (handler) {
    const data = await Promise.resolve(handler());
    res.end(JSON.stringify({status:'success', data, count:Array.isArray(data)?data.length:undefined, lastFetch:cache.lastFetch}));
  } else {
    res.writeHead(404);
    res.end(JSON.stringify({error:'Unknown route', routes:Object.keys(routes)}));
  }
});

// ── START ─────────────────────────────────────────────────────────────────────
(async () => {
  console.log('\n╔═══════════════════════════════════════════════╗');
  console.log('║      PRPO Live Data Server v4.0               ║');
  console.log('║  Auto cookie renewal + SAP SQL live           ║');
  console.log('╚═══════════════════════════════════════════════╝\n');

  if (!fs.existsSync(path.join(__dirname,'data'))) {
    fs.mkdirSync(path.join(__dirname,'data'), {recursive:true});
  }

  await fetchAll();

  server.listen(PORT, () => {
    console.log(`\n🚀 Server: http://localhost:${PORT}`);
    console.log(`   QMS PR:  ${cache.pr.length} rows [cookie: ${cache.cookieSource}]`);
    console.log(`   QMS NFA: ${cache.nfa.length} rows`);
    console.log(`   SAP PR:  ${cache.sap_pr.length} rows`);
    console.log(`   SAP PO:  ${cache.sap_po.length} rows`);

    if (cache.pr.length === 0) {
      console.log('\n⚡ QMS DATA MISSING — Do this ONE TIME:');
      console.log('   1. Open Chrome → login to smartworlddevelopersonline.com/qms');
      console.log('   2. Press F12 → Console → paste:');
      console.log('');
      console.log(`      fetch('http://localhost:3001/api/set-cookie',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({cookie:document.cookie})}).then(r=>r.json()).then(console.log)`);
      console.log('');
      console.log('   3. Press Enter → done! Data loads automatically from now on.');
      console.log('   (Cookie auto-renews from Chrome — no manual work after this)\n');
    }
  });

  // Auto-refresh every 30 minutes
  setInterval(fetchAll, 30 * 60 * 1000);
})();
