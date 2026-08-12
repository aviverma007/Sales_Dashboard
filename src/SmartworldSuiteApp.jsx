import React, { useState } from 'react';

// ─── Smartworld Sales Intelligence Suite ───────────────────────────────────
// Wraps the 4 standalone modules (Footfall, RM activity & performance,
// Inventory, Bookings) extracted from the uploaded static suite. Each module
// is a fully self-contained HTML page (own charts/KPIs/data) served from
// /salesintel/*.html and swapped into an iframe, mirroring the original
// file's own tab-switch architecture.

const MODULES = [
  { key: 'footfall',  label: 'Footfall',                     src: '/salesintel/footfall.html'  },
  { key: 'rm',        label: 'RM activity & performance',     src: '/salesintel/rm.html'        },
  { key: 'inventory', label: 'Inventory',                     src: '/salesintel/inventory.html' },
  { key: 'bookings',  label: 'Bookings',                      src: '/salesintel/bookings.html'  },
];

const logout = () => {
  sessionStorage.removeItem('salesintel_auth');
  window.location.reload();
};

export default function SmartworldSuiteApp() {
  const [active, setActive] = useState('footfall');

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: '#F4F2EC' }}>
      <div
        style={{
          height: 58,
          flexShrink: 0,
          background: 'linear-gradient(115deg,#111C36 0%,#1E3163 55%,#2A4488 100%)',
          borderBottom: '3px solid #B8893C',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '0 20px',
          boxShadow: '0 2px 14px rgba(20,33,61,.28)',
        }}
      >
        <img src="/swd-logo.png" alt="SWD" style={{ height: 28, marginRight: 20 }} />
        <div style={{ display: 'flex', gap: 2, height: '100%', flex: 1 }}>
          {MODULES.map((m) => {
            const isActive = active === m.key;
            return (
              <button
                key={m.key}
                onClick={() => setActive(m.key)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: isActive ? '#fff' : '#B9C1D4',
                  fontFamily: 'inherit',
                  fontSize: 14.5,
                  fontWeight: 500,
                  padding: '0 22px',
                  cursor: 'pointer',
                  position: 'relative',
                  height: '100%',
                  letterSpacing: 0.2,
                  borderBottom: isActive ? '3px solid #B8893C' : '3px solid transparent',
                  marginBottom: -3,
                }}
              >
                {m.label}
              </button>
            );
          })}
        </div>
        <button
          onClick={logout}
          style={{
            background: 'rgba(211,47,47,0.9)',
            color: '#fff',
            border: 'none',
            borderRadius: 8,
            padding: '7px 16px',
            fontSize: 12,
            fontWeight: 800,
            cursor: 'pointer',
          }}
        >
          🚪 Logout
        </button>
      </div>

      {MODULES.map((m) => (
        <iframe
          key={m.key}
          src={m.src}
          title={m.label}
          style={{
            width: '100%',
            flex: 1,
            border: 'none',
            display: active === m.key ? 'block' : 'none',
          }}
        />
      ))}
    </div>
  );
}
