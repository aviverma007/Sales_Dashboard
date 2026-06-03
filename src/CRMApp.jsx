import React from 'react';

const T = {
  teal: '#0097a7', tealL: '#00bcd4', tealD: '#006978',
  navy: '#0d2137', navyM: '#1a3a5c',
  text: '#0a1628', textM: '#1a2f45',
  glass: 'rgba(255,255,255,0.96)',
  border: 'rgba(255,255,255,0.85)',
};

export default function CRMApp() {
  const logout = () => {
    sessionStorage.removeItem('crm_auth');
    window.location.reload();
  };

  return (
    <div style={{ minHeight: '100vh', backgroundImage: 'url(/bg.jpg)', backgroundSize: 'cover', backgroundPosition: 'center', backgroundAttachment: 'fixed', fontFamily: 'Inter, sans-serif', color: T.text }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');`}</style>

      {/* Dark overlay */}
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,20,40,0.25)', pointerEvents: 'none', zIndex: 0 }} />

      {/* Header */}
      <header style={{ position: 'sticky', top: 0, zIndex: 200, background: 'rgba(255,255,255,0.95)', WebkitBackdropFilter: 'blur(24px)', backdropFilter: 'blur(24px)', borderBottom: '1px solid rgba(255,255,255,0.9)', boxShadow: '0 2px 20px rgba(0,60,100,0.12)' }}>
        <div style={{ maxWidth: 1400, margin: '0 auto', padding: '0 24px', height: 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 38, height: 38, borderRadius: 9, background: '#0d1f3c', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 14px rgba(0,30,80,0.3)', overflow: 'hidden' }}>
              <img src="/swd-logo.png" alt="SWD" style={{ width: 26, height: 26, objectFit: 'contain' }} />
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: 14, color: T.navy, letterSpacing: 0.2 }}>CRM Dashboard</div>
              <div style={{ fontSize: 10, color: '#546e7a', fontWeight: 500 }}>Smartworld Group</div>
            </div>
          </div>
          <button
            onClick={logout}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 14px', borderRadius: 10, border: '1px solid rgba(200,40,40,0.25)', background: 'rgba(211,47,47,0.07)', cursor: 'pointer', fontSize: 11, fontWeight: 700, color: '#d32f2f', fontFamily: 'Inter,sans-serif', transition: 'all 0.15s' }}
            onMouseOver={e => e.currentTarget.style.background = 'rgba(211,47,47,0.14)'}
            onMouseOut={e => e.currentTarget.style.background = 'rgba(211,47,47,0.07)'}
          >
            Sign Out
          </button>
        </div>
      </header>

      {/* Coming Soon */}
      <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 'calc(100vh - 56px)', gap: 16 }}>
        <div style={{ background: T.glass, border: `1px solid ${T.border}`, borderRadius: 20, padding: '48px 64px', textAlign: 'center', boxShadow: '0 8px 40px rgba(0,80,120,0.15)', backdropFilter: 'blur(12px)' }}>
          <div style={{ fontSize: 56, marginBottom: 16 }}>🚧</div>
          <h2 style={{ fontSize: 22, fontWeight: 900, color: T.navy, margin: '0 0 8px' }}>CRM Dashboard</h2>
          <p style={{ fontSize: 13, color: '#546e7a', margin: 0, fontWeight: 500 }}>Coming soon — this module is under construction.</p>
        </div>
      </div>
    </div>
  );
}
