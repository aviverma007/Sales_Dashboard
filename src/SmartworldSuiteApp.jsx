import React, { useState } from 'react';

// ─── Smartworld Sales Intelligence Suite ───────────────────────────────────
// Wraps the 4 standalone modules (Footfall, RM activity & performance,
// Inventory, Bookings) extracted from the uploaded static suite. Each module
// is a fully self-contained HTML page (own charts/KPIs/data) served from
// /salesintel/*.html and swapped into an iframe. Look & feel (Inter font,
// bg.jpg backdrop, teal/navy glass header, teal accent tabs, red logout)
// matches the main Sales Dashboard (App.jsx) exactly.

const T = {
  teal: '#0097a7', tealD: '#006978',
  navy: '#0d2137', textM: '#0d1f3c',
  red: '#d32f2f', green: '#2e7d32', greenL: '#43a047',
};

const MODULES = [
  { key: 'footfall',  label: 'Footfall',                 src: '/salesintel/footfall.html'  },
  { key: 'rm',        label: 'RM activity & performance', src: '/salesintel/rm.html'        },
  { key: 'inventory', label: 'Inventory',                 src: '/salesintel/inventory.html' },
  { key: 'bookings',  label: 'Bookings',                  src: '/salesintel/bookings.html'  },
];

const logout = () => {
  sessionStorage.removeItem('salesintel_auth');
  window.location.reload();
};

export default function SmartworldSuiteApp() {
  const [active, setActive] = useState('footfall');

  return (
    <div
      style={{
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        backgroundImage: 'url(/bg.jpg)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed',
        fontFamily: 'Inter,sans-serif',
      }}
    >
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap');`}</style>

      {/* subtle darkening overlay for readability, matching App.jsx */}
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,20,40,0.25)', pointerEvents: 'none', zIndex: 0 }} />

      <header
        style={{
          position: 'relative',
          zIndex: 200,
          flexShrink: 0,
          background: 'rgba(255,255,255,0.95)',
          WebkitBackdropFilter: 'blur(24px)',
          backdropFilter: 'blur(24px)',
          borderBottom: '1px solid rgba(255,255,255,0.9)',
          boxShadow: '0 2px 20px rgba(0,60,100,0.12)',
        }}
      >
        <div style={{ maxWidth: 1440, margin: '0 auto', padding: '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 54 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 38, height: 38, borderRadius: 9, background: '#0d1f3c', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 14px rgba(0,30,80,0.3)', flexShrink: 0, overflow: 'hidden' }}>
              <img src="/swd-logo.png" alt="SWD" style={{ width: 26, height: 26, objectFit: 'contain' }} />
            </div>
            <div>
              <div style={{ fontWeight: 900, fontSize: 15, letterSpacing: 0.5, color: T.navy }}>Sales Intelligence</div>
              <div style={{ color: T.textM, fontSize: 9, letterSpacing: 1.5, fontWeight: 700 }}>SMARTWORLD GROUP · FOOTFALL · RM · INVENTORY · BOOKINGS</div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 4, background: 'rgba(0,100,140,0.08)', borderRadius: 10, padding: 4 }}>
            {MODULES.map((m) => {
              const isActive = active === m.key;
              return (
                <button
                  key={m.key}
                  onClick={() => setActive(m.key)}
                  style={{
                    background: isActive ? 'rgba(255,255,255,0.95)' : 'transparent',
                    border: 'none',
                    borderRadius: 7,
                    padding: '6px 16px',
                    fontSize: 11,
                    fontWeight: isActive ? 800 : 600,
                    color: isActive ? T.tealD : '#040d1a',
                    cursor: 'pointer',
                    fontFamily: 'Inter,sans-serif',
                    boxShadow: isActive ? '0 2px 8px rgba(0,80,120,0.12)' : 'none',
                    transition: 'all 0.15s',
                  }}
                >
                  {m.label}
                </button>
              );
            })}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'rgba(46,125,50,0.1)', border: '1px solid rgba(46,125,50,0.3)', borderRadius: 16, padding: '3px 10px' }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: T.greenL, animation: 'pulse 2s ease infinite' }} />
              <span style={{ color: T.green, fontSize: 10, fontWeight: 700 }}>LIVE</span>
            </div>
            <span style={{ color: T.textM, fontSize: 11, fontWeight: 700 }}>
              {new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
            </span>
            <button
              onClick={logout}
              style={{
                display: 'flex', alignItems: 'center', gap: 6, padding: '6px 14px', borderRadius: 10,
                border: '1px solid rgba(200,40,40,0.25)', background: 'rgba(211,47,47,0.07)', cursor: 'pointer',
                fontSize: 11, fontWeight: 700, color: T.red, fontFamily: 'Inter,sans-serif', transition: 'all 0.15s',
              }}
              onMouseOver={(e) => { e.currentTarget.style.background = 'rgba(211,47,47,0.14)'; }}
              onMouseOut={(e) => { e.currentTarget.style.background = 'rgba(211,47,47,0.07)'; }}
            >
              🔒 Logout
            </button>
          </div>
        </div>
      </header>

      <div style={{ position: 'relative', flex: 1, zIndex: 1 }}>
        {MODULES.map((m) => (
          <iframe
            key={m.key}
            src={m.src}
            title={m.label}
            style={{
              width: '100%',
              height: '100%',
              border: 'none',
              display: active === m.key ? 'block' : 'none',
            }}
          />
        ))}
      </div>
    </div>
  );
}
