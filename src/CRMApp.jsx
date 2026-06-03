import React from 'react';

export default function CRMApp() {
  const logout = () => {
    sessionStorage.removeItem('crm_auth');
    window.location.reload();
  };

  return (
    <div style={{ minHeight: '100vh', background: '#f0f4f8', fontFamily: 'Inter, sans-serif' }}>
      {/* Header */}
      <div style={{ background: '#0d1f3c', padding: '0 32px', height: 60, display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 2px 12px rgba(0,0,0,0.2)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: '#0097a7', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>📋</div>
          <div>
            <div style={{ color: '#fff', fontWeight: 800, fontSize: 15, letterSpacing: 0.3 }}>CRM Dashboard</div>
            <div style={{ color: '#90a4ae', fontSize: 11 }}>Smartworld Group</div>
          </div>
        </div>
        <button
          onClick={logout}
          style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', color: '#cfd8dc', borderRadius: 8, padding: '6px 16px', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}
        >
          Sign Out
        </button>
      </div>

      {/* Coming Soon */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 'calc(100vh - 60px)', gap: 16 }}>
        <div style={{ fontSize: 64 }}>🚧</div>
        <h2 style={{ fontSize: 24, fontWeight: 800, color: '#0d2137', margin: 0 }}>CRM Dashboard</h2>
        <p style={{ fontSize: 14, color: '#546e7a', margin: 0 }}>Coming soon — this module is under construction.</p>
      </div>
    </div>
  );
}
