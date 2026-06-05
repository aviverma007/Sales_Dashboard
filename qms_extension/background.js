// QMS Data Bridge - Background Service Worker
// Fetches QMS data automatically every 30 minutes

const APIS = {
  pr:     'https://smartworlddevelopersonline.com/bi-power/bi_prs.php',
  nfa:    'https://smartworlddevelopersonline.com/bi-power/bi_nfas.php',
  market: 'https://smartworlddevelopersonline.com/bi-power/bi_market_place.php',
  eot:    'https://smartworlddevelopersonline.com/bi-power/bi_eot.php',
};
const SERVER = 'http://localhost:3001/api/push';

async function fetchAndPush() {
  console.log('[QMS Bridge] Fetching data...');
  try {
    const results = await Promise.all(
      Object.entries(APIS).map(([key, url]) =>
        fetch(url, { credentials: 'include', headers: { 'X-Requested-With': 'XMLHttpRequest' } })
          .then(r => r.json())
          .then(d => ({ key, data: Array.isArray(d) ? d : (d.data || []) }))
          .catch(() => ({ key, data: [] }))
      )
    );

    const payload = {};
    results.forEach(r => { payload[r.key] = r.data; });

    const counts = Object.entries(payload).map(([k,v]) => `${k}:${v.length}`).join(', ');
    console.log('[QMS Bridge] Fetched:', counts);

    // Push to local server
    const res = await fetch(SERVER, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const result = await res.json();
    console.log('[QMS Bridge] Pushed:', result);

    // Save last fetch time
    await chrome.storage.local.set({ lastFetch: new Date().toISOString(), counts });
  } catch(e) {
    console.error('[QMS Bridge] Error:', e.message);
  }
}

// Run on install
chrome.runtime.onInstalled.addListener(() => {
  console.log('[QMS Bridge] Installed — fetching now...');
  fetchAndPush();
  // Set alarm for every 30 minutes
  chrome.alarms.create('qmsFetch', { periodInMinutes: 30 });
});

// Run on alarm
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'qmsFetch') fetchAndPush();
});

// Run on browser startup
chrome.runtime.onStartup.addListener(() => {
  console.log('[QMS Bridge] Browser started — fetching...');
  fetchAndPush();
});

// Handle manual fetch from popup
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.action === 'fetchNow') {
    fetchAndPush().then(() => sendResponse({ok:true}));
    return true;
  }
});
