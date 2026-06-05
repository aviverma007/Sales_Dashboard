/**
 * PRPO Local Data Server
 * Run: node prpo_server.js
 * Fetches live data from QMS and serves to your dashboard
 */

const http  = require('http');
const https = require('https');
const url   = require('url');

const PORT   = 3001;
const BASE   = 'smartworlddevelopersonline.com';
const EMAIL  = 'sunny.batra@smartworlddevelopers.com';
const PASS   = 'swd@2021';

let SESSION_COOKIE = '';
let cache = { pr:[], nfa:[], market:[], eot:[], lastFetch: null };

// ── Login to QMS ──────────────────────────────────────────────────────────────
function login() {
  return new Promise((resolve, reject) => {
    console.log('🔐 Logging into QMS...');

    // Step 1: GET login page to get initial cookie
    const getReq = https.request({
      hostname: BASE, path: '/bi-power/home/login', method: 'GET',
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
      rejectUnauthorized: false,
    }, (res) => {
      let cookies = res.headers['set-cookie'] || [];
      let initCookie = cookies.map(c => c.split(';')[0]).join('; ');

      // Step 2: POST credentials
      const body = `email=${encodeURIComponent(EMAIL)}&password=${encodeURIComponent(PASS)}`;
      const postReq = https.request({
        hostname: BASE, path: '/bi-power/home/login', method: 'POST',
        headers: {
          'User-Agent':     'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
          'Content-Type':   'application/x-www-form-urlencoded',
          'Content-Length': Buffer.byteLength(body),
          'Cookie':         initCookie,
          'Referer':        `https://${BASE}/bi-power/home/login`,
          'Origin':         `https://${BASE}`,
        },
        rejectUnauthorized: false,
      }, (res2) => {
        let setCookies = res2.headers['set-cookie'] || [];
        SESSION_COOKIE = setCookies.map(c => c.split(';')[0]).join('; ');
        let data = '';
        res2.on('data', d => data += d);
        res2.on('end', () => {
          if (SESSION_COOKIE) {
            console.log('✅ Login successful!');
            resolve(SESSION_COOKIE);
          } else {
            reject(new Error('Login failed — no cookie received'));
          }
        });
      });
      postReq.on('error', reject);
      postReq.write(body);
      postReq.end();
    });
    getReq.on('error', reject);
    getReq.end();
  });
}

// ── Fetch one API endpoint ────────────────────────────────────────────────────
function fetchAPI(path) {
  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: BASE, path: `/bi-power/${path}`, method: 'GET',
      headers: {
        'User-Agent':        'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        'Accept':            'application/json',
        'Cookie':            SESSION_COOKIE,
        'Referer':           `https://${BASE}/bi-power/home/dashboard`,
        'X-Requested-With':  'XMLHttpRequest',
      },
      rejectUnauthorized: false,
    }, (res) => {
      let data = '';
      res.on('data', d => data += d);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          if (json.status === 'unauthorized') {
            reject(new Error('unauthorized'));
          } else {
            resolve(json);
          }
        } catch(e) {
          reject(new Error('Invalid JSON: ' + data.slice(0,100)));
        }
      });
    });
    req.on('error', reject);
    req.end();
  });
}

// ── Fetch all APIs ────────────────────────────────────────────────────────────
async function fetchAll() {
  try {
    console.log('\n📡 Fetching all QMS data...');

    const [pr, nfa, market, eot] = await Promise.all([
      fetchAPI('bi_prs.php').catch(async (e) => {
        if (e.message === 'unauthorized') { await login(); return fetchAPI('bi_prs.php'); }
        throw e;
      }),
      fetchAPI('bi_nfas.php').catch(e => ({ data: [] })),
      fetchAPI('bi_market_place.php').catch(e => ({ data: [] })),
      fetchAPI('bi_eot.php').catch(e => ({ data: [] })),
    ]);

    const extract = (r) => Array.isArray(r) ? r : (r?.data || []);

    cache.pr      = extract(pr);
    cache.nfa     = extract(nfa);
    cache.market  = extract(market);
    cache.eot     = extract(eot);
    cache.lastFetch = new Date().toISOString();

    console.log(`✅ Data fetched: PR=${cache.pr.length} NFA=${cache.nfa.length} Market=${cache.market.length} EOT=${cache.eot.length}`);
    console.log(`⏰ Next refresh in 30 minutes`);
  } catch(e) {
    console.error('❌ Fetch error:', e.message);
  }
}

// ── HTTP Server ───────────────────────────────────────────────────────────────
const server = http.createServer((req, res) => {
  // CORS headers — allow dashboard to read data
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'OPTIONS') { res.end(); return; }

  const { pathname } = url.parse(req.url);

  const routes = {
    '/api/pr':     () => cache.pr,
    '/api/nfa':    () => cache.nfa,
    '/api/market': () => cache.market,
    '/api/eot':    () => cache.eot,
    '/api/status': () => ({
      lastFetch: cache.lastFetch,
      counts: { pr: cache.pr.length, nfa: cache.nfa.length, market: cache.market.length, eot: cache.eot.length }
    }),
    '/api/refresh': async () => { await fetchAll(); return { refreshed: true, lastFetch: cache.lastFetch }; },
  };

  const handler = routes[pathname];
  if (handler) {
    Promise.resolve(handler()).then(data => {
      res.end(JSON.stringify({ status:'success', data, count: Array.isArray(data)?data.length:1 }));
    });
  } else {
    res.writeHead(404);
    res.end(JSON.stringify({ error: 'Not found. Use /api/pr /api/nfa /api/market /api/eot /api/status /api/refresh' }));
  }
});

// ── Start ─────────────────────────────────────────────────────────────────────
async function start() {
  console.log('🚀 PRPO Local Data Server starting...');
  console.log(`📡 Dashboard will fetch from: http://localhost:${PORT}/api/`);

  try {
    await login();
    await fetchAll();
  } catch(e) {
    console.error('⚠️  Initial fetch failed:', e.message);
    console.log('Will retry on first dashboard request...');
  }

  server.listen(PORT, () => {
    console.log(`\n✅ Server running at http://localhost:${PORT}`);
    console.log(`   PR data:     http://localhost:${PORT}/api/pr`);
    console.log(`   NFA data:    http://localhost:${PORT}/api/nfa`);
    console.log(`   Market data: http://localhost:${PORT}/api/market`);
    console.log(`   EOT data:    http://localhost:${PORT}/api/eot`);
    console.log(`   Status:      http://localhost:${PORT}/api/status`);
    console.log(`   Force refresh: http://localhost:${PORT}/api/refresh`);
    console.log('\n🔄 Auto-refreshing every 30 minutes...\n');
  });

  // Auto-refresh every 30 minutes
  setInterval(fetchAll, 30 * 60 * 1000);
}

start();
