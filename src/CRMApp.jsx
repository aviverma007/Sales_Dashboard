import React, { useState, useEffect, useMemo } from 'react';
import * as XLSX from 'xlsx';
import {
  BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, LabelList
} from 'recharts';

// ─── THEME (matches other dashboards) ────────────────────────────────────────
const T = {
  glass:      'rgba(255,255,255,0.96)',
  glassH:     'rgba(255,255,255,1.0)',
  glassDark:  'rgba(15,35,60,0.88)',
  border:     'rgba(255,255,255,0.85)',
  borderB:    'rgba(255,255,255,0.2)',
  teal:   '#0097a7', tealL:'#00bcd4', tealD:'#006978',
  red:    '#d32f2f', redL:'#ef5350',
  navy:   '#0d2137', navyM:'#1a3a5c',
  amber:  '#f57c00', amberL:'#ffb300',
  green:  '#2e7d32', greenL:'#43a047',
  gray:   '#546e7a',
  text:   '#0a1628', textM:'#1a2f45', textL:'#2d4a66',
  orange: '#e65100',
  purple: '#6a1b9a',
};
const CC = ['#0097a7','#1565c0','#2e7d32','#f57c00','#d32f2f','#6a1b9a','#00838f','#37474f','#e65100','#00695c'];

// ─── GLASS CARD ───────────────────────────────────────────────────────────────
const GC = ({ children, style = {}, dark = false }) => {
  const [h, sH] = useState(false);
  return (
    <div onMouseEnter={() => sH(true)} onMouseLeave={() => sH(false)} style={{
      background: dark ? (h ? 'rgba(15,35,60,0.95)' : T.glassDark) : (h ? T.glassH : T.glass),
      border: `1px solid ${dark ? T.borderB : T.border}`,
      borderRadius: 14, boxShadow: dark ? '0 8px 32px rgba(0,0,0,0.35)' : '0 4px 24px rgba(0,80,120,0.12)',
      transition: 'all 0.25s ease', position: 'relative', overflow: 'hidden', ...style
    }}>
      {!dark && <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, background: 'rgba(255,255,255,0.95)' }} />}
      {children}
    </div>
  );
};

// ─── SECTION HEADER ──────────────────────────────────────────────────────────
const SH = ({ title, sub, light = false }) => (
  <div style={{ marginBottom: 10 }}>
    <p style={{ fontSize: 11, fontWeight: 800, color: light ? 'rgba(255,255,255,0.97)' : T.tealD, letterSpacing: 0.4, margin: 0, textTransform: 'uppercase' }}>{title}</p>
    {sub && <p style={{ fontSize: 10, color: light ? 'rgba(255,255,255,0.8)' : T.textM, margin: '2px 0 0', fontWeight: 600 }}>{sub}</p>}
  </div>
);

// ─── TOOLTIP ─────────────────────────────────────────────────────────────────
const CTip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: 'rgba(255,255,255,0.97)', border: '1px solid rgba(0,151,167,0.3)', borderRadius: 10, padding: '8px 12px', boxShadow: '0 8px 32px rgba(0,80,120,0.18)', fontFamily: 'Inter,sans-serif', fontSize: 11 }}>
      <p style={{ color: T.tealD, fontWeight: 700, marginBottom: 4 }}>{label}</p>
      {payload.map((p, i) => <p key={i} style={{ color: p.color || T.text, margin: '2px 0' }}><span style={{ color: T.textL }}>{p.name}: </span>{p.value?.toLocaleString()}</p>)}
    </div>
  );
};

// ─── STAT CARD ───────────────────────────────────────────────────────────────
const StatCard = ({ label, value, color = T.teal, icon }) => (
  <GC style={{ padding: '14px 18px', minWidth: 110 }}>
    <div style={{ fontSize: 22, marginBottom: 2 }}>{icon}</div>
    <div style={{ fontSize: 22, fontWeight: 900, color, letterSpacing: -0.5 }}>{typeof value === 'number' ? value.toLocaleString() : value}</div>
    <div style={{ fontSize: 10, fontWeight: 700, color: T.gray, textTransform: 'uppercase', letterSpacing: 0.4 }}>{label}</div>
  </GC>
);

// ─── LOADING ─────────────────────────────────────────────────────────────────
const Loading = () => (
  <div style={{ minHeight: '100vh', backgroundImage: 'url(/bg.jpg)', backgroundSize: 'cover', backgroundPosition: 'center', backgroundAttachment: 'fixed', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16 }}>
    <div style={{ background: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(20px)', borderRadius: 20, padding: '32px 48px', textAlign: 'center', boxShadow: '0 8px 40px rgba(0,0,0,0.2)' }}>
      <div style={{ width: 60, height: 60, borderRadius: '50%', background: '#0d1f3c', margin: '0 auto 16px', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ position: 'absolute', inset: 8, background: '#0d1f3c', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <img src="/swd-logo.png" alt="SWD" style={{ width: 30, height: 30, objectFit: 'contain' }} />
        </div>
      </div>
      <div style={{ color: T.navy, fontWeight: 800, fontSize: 16 }}>Loading CRM Dashboard…</div>
      <div style={{ color: T.gray, fontSize: 12, marginTop: 6 }}>Processing case data</div>
    </div>
  </div>
);

// ─── MAIN COMPONENT ──────────────────────────────────────────────────────────
export default function CRMApp() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('overall');
  const [filterOwner, setFilterOwner] = useState('All');
  const [filterArea, setFilterArea] = useState('All');

  const logout = () => { sessionStorage.removeItem('crm_auth'); window.location.reload(); };

  useEffect(() => {
    fetch('/data/crm_case_management.xlsx')
      .then(r => r.arrayBuffer())
      .then(buf => {
        const wb = XLSX.read(buf, { type: 'array' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const raw = XLSX.utils.sheet_to_json(ws, { header: 1 });
        // Find header row (row with "Case Number")
        let hIdx = raw.findIndex(r => r.includes('Case Number'));
        const headers = raw[hIdx];
        const rows = raw.slice(hIdx + 1).filter(r => r.some(v => v != null && v !== ''));
        const records = rows.map(r => {
          const obj = {};
          headers.forEach((h, i) => { if (h) obj[String(h).trim()] = r[i]; });
          return obj;
        });
        setData(processData(records));
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return <Loading />;
  if (!data) return <div style={{ color: '#fff', padding: 40 }}>Failed to load data.</div>;

  const { total, openCount, closedCount, statusCounts, originCounts, caseTypeCounts,
    byOwner, areaSub, ageing, respTime, recentCases, tatStats, owners, areas } = data;

  // Filter recent cases
  const filteredCases = useMemo(() => recentCases.filter(c =>
    (filterOwner === 'All' || c.caseOwner === filterOwner) &&
    (filterArea === 'All' || c.area === filterArea)
  ), [recentCases, filterOwner, filterArea]);

  const closedTotal = (statusCounts['Closed'] || 0) + (statusCounts['Resolved'] || 0) + (statusCounts['Close'] || 0);
  const openTotal = (statusCounts['In Progress'] || 0) + (statusCounts['New'] || 0) + (statusCounts['Pending for Clarification'] || 0) + (statusCounts['Re-Open'] || 0);

  const statusPie = [
    { name: 'In Progress', value: statusCounts['In Progress'] || 0, color: '#0097a7' },
    { name: 'New', value: statusCounts['New'] || 0, color: '#1565c0' },
    { name: 'Pending for Clarification', value: statusCounts['Pending for Clarification'] || 0, color: '#f57c00' },
    { name: 'Re-Open', value: statusCounts['Re-Open'] || 0, color: '#d32f2f' },
  ];

  const originData = Object.entries(originCounts).map(([k, v], i) => ({ name: k, value: v, color: CC[i % CC.length] }));
  const ownerData = Object.entries(byOwner).slice(0, 10).map(([k, v]) => ({ name: k.split(' ')[0] + (k.split(' ')[1] ? ' ' + k.split(' ')[1][0] + '.' : ''), fullName: k, value: v }));
  const areaData = areaSub.slice(0, 10).map(a => ({ name: a.area.length > 18 ? a.area.slice(0, 16) + '…' : a.area, subArea: a.subArea, value: a.count }));
  const agingData = [
    { name: 'Under 24H', value: ageing.under24h, color: '#2e7d32' },
    { name: '1–5 Days', value: ageing['1to5'], color: '#0097a7' },
    { name: '5–15 Days', value: ageing['5to15'], color: '#f57c00' },
    { name: '15–30 Days', value: ageing['15to30'], color: '#e65100' },
    { name: '> 30 Days', value: ageing.over30, color: '#d32f2f' },
  ];
  const tatBeyond = tatStats.beyond;
  const tatWithin = tatStats.within;

  const TABS = [
    { k: 'overall', l: '📊 Overall' },
    { k: 'open', l: '🔓 Open Tickets' },
    { k: 'closed', l: '✅ Closed Tickets' },
  ];

  return (
    <div style={{ minHeight: '100vh', backgroundImage: 'url(/bg.jpg)', backgroundSize: 'cover', backgroundPosition: 'center', backgroundAttachment: 'fixed', fontFamily: 'Inter, sans-serif', color: T.text }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
        ::-webkit-scrollbar{width:4px;height:4px}
        ::-webkit-scrollbar-thumb{background:rgba(0,151,167,0.4);border-radius:2px}
        .crm-tab:hover{background:rgba(255,255,255,0.5)!important}
        .tr:hover td{background:rgba(0,151,167,0.06)!important}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.5}}
      `}</style>
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,20,40,0.25)', pointerEvents: 'none', zIndex: 0 }} />

      {/* ── HEADER ── */}
      <header style={{ position: 'sticky', top: 0, zIndex: 200, background: 'rgba(255,255,255,0.95)', WebkitBackdropFilter: 'blur(24px)', backdropFilter: 'blur(24px)', borderBottom: '1px solid rgba(255,255,255,0.9)', boxShadow: '0 2px 20px rgba(0,60,100,0.12)' }}>
        <div style={{ maxWidth: 1500, margin: '0 auto', padding: '0 20px', height: 56, display: 'flex', alignItems: 'center', gap: 16, justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 38, height: 38, borderRadius: 9, background: '#0d1f3c', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 14px rgba(0,30,80,0.3)', overflow: 'hidden' }}>
              <img src="/swd-logo.png" alt="SWD" style={{ width: 26, height: 26, objectFit: 'contain' }} />
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: 14, color: T.navy }}>CRM Dashboard</div>
              <div style={{ fontSize: 10, color: T.gray, fontWeight: 500 }}>Smartworld Group · Case Management</div>
            </div>
          </div>

          {/* Tabs */}
          <div style={{ display: 'flex', gap: 4, background: 'rgba(0,100,140,0.08)', borderRadius: 10, padding: 4 }}>
            {TABS.map(t => (
              <button key={t.k} className="crm-tab" onClick={() => setTab(t.k)}
                style={{ background: tab === t.k ? 'rgba(255,255,255,0.95)' : 'transparent', border: 'none', borderRadius: 7, padding: '6px 16px', fontSize: 11, fontWeight: tab === t.k ? 800 : 600, color: tab === t.k ? T.tealD : T.text, cursor: 'pointer', fontFamily: 'Inter,sans-serif', boxShadow: tab === t.k ? '0 2px 8px rgba(0,80,120,0.12)' : 'none' }}>
                {t.l}
              </button>
            ))}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'rgba(46,125,50,0.1)', border: '1px solid rgba(46,125,50,0.3)', borderRadius: 16, padding: '3px 10px' }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: T.greenL, animation: 'pulse 2s ease infinite' }} />
              <span style={{ fontSize: 10, fontWeight: 700, color: T.green }}>Live</span>
            </div>
            <button onClick={logout}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 14px', borderRadius: 10, border: '1px solid rgba(200,40,40,0.25)', background: 'rgba(211,47,47,0.07)', cursor: 'pointer', fontSize: 11, fontWeight: 700, color: '#d32f2f', fontFamily: 'Inter,sans-serif' }}
              onMouseOver={e => e.currentTarget.style.background = 'rgba(211,47,47,0.14)'}
              onMouseOut={e => e.currentTarget.style.background = 'rgba(211,47,47,0.07)'}>
              Sign Out
            </button>
          </div>
        </div>
      </header>

      {/* ── MAIN CONTENT ── */}
      <main style={{ position: 'relative', zIndex: 1, maxWidth: 1500, margin: '0 auto', padding: '16px 20px 32px' }}>

        {/* ── OVERALL TAB ── */}
        {tab === 'overall' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {/* KPI Row */}
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <StatCard label="Total Tickets" value={total} icon="🎫" color={T.navy} />
              <StatCard label="Open Tickets" value={openCount} icon="🔓" color={T.amber} />
              <StatCard label="Closed Tickets" value={closedCount} icon="✅" color={T.green} />
              <StatCard label="Beyond TAT" value={tatBeyond} icon="⚠️" color={T.red} />
              <StatCard label="Within TAT" value={tatWithin} icon="⏱️" color={T.teal} />
              <StatCard label="Within 24 Hrs" value={respTime['Within 24 Hrs'] || 0} icon="⚡" color={T.teal} />
              <StatCard label="Above 24 Hrs" value={respTime['Above 24 Hrs'] || 0} icon="🕐" color={T.orange} />
            </div>

            {/* Row 2: Case Type + Status + Case Origin */}
            <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr 1fr', gap: 12 }}>
              {/* Case Type Pie */}
              <GC style={{ padding: '14px 16px' }}>
                <SH title="Case Type" />
                <div style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
                  {Object.entries(caseTypeCounts).map(([k], i) => (
                    <span key={k} style={{ fontSize: 9, fontWeight: 700, color: CC[i], display: 'flex', alignItems: 'center', gap: 3 }}>
                      <span style={{ width: 7, height: 7, borderRadius: '50%', background: CC[i], display: 'inline-block' }} />{k}
                    </span>
                  ))}
                </div>
                <ResponsiveContainer width="100%" height={140}>
                  <PieChart>
                    <Pie data={Object.entries(caseTypeCounts).map(([k, v], i) => ({ name: k, value: v, color: CC[i] }))}
                      cx="50%" cy="50%" outerRadius={58} dataKey="value">
                      {Object.entries(caseTypeCounts).map(([k, v], i) => <Cell key={k} fill={CC[i]} />)}
                    </Pie>
                    <Tooltip content={<CTip />} />
                  </PieChart>
                </ResponsiveContainer>
              </GC>

              {/* Status */}
              <GC style={{ padding: '14px 16px' }}>
                <SH title="Ticket Status" />
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {[
                    { label: 'Closed + Resolved', value: closedTotal, color: T.green, bg: 'rgba(46,125,50,0.12)' },
                    { label: 'In Progress', value: statusCounts['In Progress'] || 0, color: T.teal, bg: 'rgba(0,151,167,0.1)' },
                    { label: 'New', value: statusCounts['New'] || 0, color: T.tealD, bg: 'rgba(0,105,120,0.1)' },
                    { label: 'Pending for Clarification', value: statusCounts['Pending for Clarification'] || 0, color: T.amber, bg: 'rgba(245,124,0,0.1)' },
                    { label: 'Re-Open', value: statusCounts['Re-Open'] || 0, color: T.red, bg: 'rgba(211,47,47,0.1)' },
                  ].map(({ label, value, color, bg }) => (
                    <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ flex: 1, fontSize: 11, fontWeight: 600, color: T.textM }}>{label}</div>
                      <div style={{ background: bg, border: `1px solid ${color}33`, borderRadius: 6, padding: '2px 10px', minWidth: 70, textAlign: 'right' }}>
                        <span style={{ fontSize: 13, fontWeight: 800, color }}>{value.toLocaleString()}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </GC>

              {/* Case Origin */}
              <GC style={{ padding: '14px 16px' }}>
                <SH title="Case Origin" />
                <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                  {originData.slice(0, 6).map(({ name, value, color }) => {
                    const pct = Math.round(value / total * 100 * 100) / 100;
                    return (
                      <div key={name} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <div style={{ width: 8, height: 8, borderRadius: 2, background: color, flexShrink: 0 }} />
                        <div style={{ flex: 1, fontSize: 10, fontWeight: 600, color: T.textM, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{name}</div>
                        <div style={{ width: 80, height: 6, background: 'rgba(0,100,140,0.08)', borderRadius: 3 }}>
                          <div style={{ width: `${Math.min(pct * 1.5, 100)}%`, height: '100%', background: color, borderRadius: 3 }} />
                        </div>
                        <div style={{ fontSize: 10, fontWeight: 700, color, width: 36, textAlign: 'right' }}>{pct}%</div>
                      </div>
                    );
                  })}
                </div>
              </GC>
            </div>

            {/* Row 3: Cases by Owner + Area/Sub Area */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <GC style={{ padding: '14px 16px' }}>
                <SH title="No. of Cases by Case Owner" sub="Excluding CRM FrontEnd Executives" />
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={ownerData} layout="vertical" margin={{ left: 0, right: 30, top: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,100,140,0.08)" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 9, fill: T.gray }} />
                    <YAxis type="category" dataKey="name" width={90} tick={{ fontSize: 9, fill: T.textM, fontWeight: 600 }} />
                    <Tooltip content={<CTip />} />
                    <Bar dataKey="value" name="Cases" radius={[0, 4, 4, 0]} fill={T.teal}>
                      {ownerData.map((_, i) => <Cell key={i} fill={CC[i % CC.length]} />)}
                      <LabelList dataKey="value" position="right" style={{ fontSize: 9, fill: T.textM, fontWeight: 700 }} />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </GC>

              {/* Area Sub Area Table */}
              <GC style={{ padding: '14px 16px' }}>
                <SH title="Cases by Area & Sub Area" />
                <div style={{ overflowY: 'auto', maxHeight: 230 }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 10 }}>
                    <thead>
                      <tr style={{ background: 'rgba(0,151,167,0.08)' }}>
                        <th style={{ padding: '5px 8px', textAlign: 'left', color: T.tealD, fontWeight: 700, borderBottom: '1px solid rgba(0,151,167,0.15)' }}>Area</th>
                        <th style={{ padding: '5px 8px', textAlign: 'left', color: T.tealD, fontWeight: 700, borderBottom: '1px solid rgba(0,151,167,0.15)' }}>Sub Area</th>
                        <th style={{ padding: '5px 8px', textAlign: 'right', color: T.tealD, fontWeight: 700, borderBottom: '1px solid rgba(0,151,167,0.15)' }}>Cases</th>
                      </tr>
                    </thead>
                    <tbody>
                      {areaSub.map((r, i) => (
                        <tr key={i} className="tr" style={{ background: i % 2 === 0 ? 'transparent' : 'rgba(0,100,140,0.02)' }}>
                          <td style={{ padding: '4px 8px', color: T.textM, borderBottom: '1px solid rgba(0,100,140,0.05)' }}>{r.area}</td>
                          <td style={{ padding: '4px 8px', color: T.textL, borderBottom: '1px solid rgba(0,100,140,0.05)' }}>{r.subArea}</td>
                          <td style={{ padding: '4px 8px', textAlign: 'right', fontWeight: 700, color: T.teal, borderBottom: '1px solid rgba(0,100,140,0.05)' }}>{r.count.toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </GC>
            </div>

            {/* Cases Data Table */}
            <CasesTable cases={filteredCases} owners={owners} areas={areas}
              filterOwner={filterOwner} setFilterOwner={setFilterOwner}
              filterArea={filterArea} setFilterArea={setFilterArea} title="All Cases" />
          </div>
        )}

        {/* ── OPEN TICKETS TAB ── */}
        {tab === 'open' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <StatCard label="Open Tickets" value={openCount} icon="🔓" color={T.amber} />
              <StatCard label="In Progress" value={statusCounts['In Progress'] || 0} icon="🔄" color={T.teal} />
              <StatCard label="New" value={statusCounts['New'] || 0} icon="🆕" color={T.tealD} />
              <StatCard label="Pending Clarification" value={statusCounts['Pending for Clarification'] || 0} icon="⏳" color={T.amber} />
              <StatCard label="Re-Open" value={statusCounts['Re-Open'] || 0} icon="🔁" color={T.red} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 260px', gap: 12 }}>
              {/* Open by Owner */}
              <GC style={{ padding: '14px 16px' }}>
                <SH title="Open Cases by Case Owner" />
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={ownerData.slice(0, 8)} layout="vertical" margin={{ left: 0, right: 30 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,100,140,0.08)" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 9, fill: T.gray }} />
                    <YAxis type="category" dataKey="name" width={90} tick={{ fontSize: 9, fill: T.textM, fontWeight: 600 }} />
                    <Tooltip content={<CTip />} />
                    <Bar dataKey="value" name="Open Cases" radius={[0, 4, 4, 0]}>
                      {ownerData.map((_, i) => <Cell key={i} fill={CC[i % CC.length]} />)}
                      <LabelList dataKey="value" position="right" style={{ fontSize: 9, fill: T.textM, fontWeight: 700 }} />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </GC>

              {/* Ageing */}
              <GC style={{ padding: '14px 16px' }}>
                <SH title="Cases by Ageing" />
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={agingData} layout="vertical" margin={{ left: 0, right: 50 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,100,140,0.08)" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 9, fill: T.gray }} />
                    <YAxis type="category" dataKey="name" width={70} tick={{ fontSize: 9, fill: T.textM, fontWeight: 600 }} />
                    <Tooltip content={<CTip />} />
                    <Bar dataKey="value" name="Cases" radius={[0, 4, 4, 0]}>
                      {agingData.map((d, i) => <Cell key={i} fill={d.color} />)}
                      <LabelList dataKey="value" position="right" style={{ fontSize: 9, fill: T.textM, fontWeight: 700 }} formatter={v => v.toLocaleString()} />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </GC>

              {/* Status donut */}
              <GC style={{ padding: '14px 16px' }}>
                <SH title="Status Breakdown" />
                <ResponsiveContainer width="100%" height={140}>
                  <PieChart>
                    <Pie data={statusPie.filter(d => d.value > 0)} cx="50%" cy="50%" innerRadius={36} outerRadius={58} dataKey="value">
                      {statusPie.map((d, i) => <Cell key={i} fill={d.color} />)}
                    </Pie>
                    <Tooltip content={<CTip />} />
                  </PieChart>
                </ResponsiveContainer>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                  {statusPie.filter(d => d.value > 0).map(d => (
                    <div key={d.name} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                      <div style={{ width: 7, height: 7, borderRadius: '50%', background: d.color, flexShrink: 0 }} />
                      <span style={{ fontSize: 9, color: T.textM, flex: 1 }}>{d.name}</span>
                      <span style={{ fontSize: 10, fontWeight: 700, color: d.color }}>{d.value.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </GC>
            </div>

            {/* Case Origin */}
            <GC style={{ padding: '14px 16px' }}>
              <SH title="Case Origin" />
              <ResponsiveContainer width="100%" height={100}>
                <BarChart data={originData.slice(0, 8)} margin={{ left: 0, right: 0, top: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,100,140,0.08)" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 9, fill: T.textM }} />
                  <YAxis tick={{ fontSize: 9, fill: T.gray }} />
                  <Tooltip content={<CTip />} />
                  <Bar dataKey="value" name="Cases" radius={[4, 4, 0, 0]}>
                    {originData.map((d, i) => <Cell key={i} fill={d.color} />)}
                    <LabelList dataKey="value" position="top" style={{ fontSize: 9, fill: T.textM, fontWeight: 700 }} formatter={v => v.toLocaleString()} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </GC>

            <CasesTable cases={filteredCases.filter(c => c.status !== 'Closed' && c.status !== 'Resolved' && c.status !== 'Close')}
              owners={owners} areas={areas}
              filterOwner={filterOwner} setFilterOwner={setFilterOwner}
              filterArea={filterArea} setFilterArea={setFilterArea} title="Open Cases" />
          </div>
        )}

        {/* ── CLOSED TICKETS TAB ── */}
        {tab === 'closed' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <StatCard label="Closed Tickets" value={closedCount} icon="✅" color={T.green} />
              <StatCard label="Closed" value={statusCounts['Closed'] || 0} icon="🔒" color={T.green} />
              <StatCard label="Resolved" value={statusCounts['Resolved'] || 0} icon="✔️" color={T.teal} />
              <StatCard label="Within 24 Hrs" value={respTime['Within 24 Hrs'] || 0} icon="⚡" color={T.teal} />
              <StatCard label="Above 24 Hrs" value={respTime['Above 24 Hrs'] || 0} icon="🕐" color={T.orange} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              {/* Closed by owner */}
              <GC style={{ padding: '14px 16px' }}>
                <SH title="Closed Cases by Case Owner" />
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={ownerData} layout="vertical" margin={{ left: 0, right: 30 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,100,140,0.08)" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 9, fill: T.gray }} />
                    <YAxis type="category" dataKey="name" width={90} tick={{ fontSize: 9, fill: T.textM, fontWeight: 600 }} />
                    <Tooltip content={<CTip />} />
                    <Bar dataKey="value" name="Closed Cases" radius={[0, 4, 4, 0]}>
                      {ownerData.map((_, i) => <Cell key={i} fill={CC[i % CC.length]} />)}
                      <LabelList dataKey="value" position="right" style={{ fontSize: 9, fill: T.textM, fontWeight: 700 }} />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </GC>

              {/* Cases by ageing */}
              <GC style={{ padding: '14px 16px' }}>
                <SH title="Cases by Ageing (Closed)" />
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={agingData} layout="vertical" margin={{ left: 0, right: 60 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,100,140,0.08)" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 9, fill: T.gray }} />
                    <YAxis type="category" dataKey="name" width={70} tick={{ fontSize: 9, fill: T.textM, fontWeight: 600 }} />
                    <Tooltip content={<CTip />} />
                    <Bar dataKey="value" name="Cases" radius={[0, 4, 4, 0]}>
                      {agingData.map((d, i) => <Cell key={i} fill={d.color} />)}
                      <LabelList dataKey="value" position="right" style={{ fontSize: 9, fill: T.textM, fontWeight: 700 }} formatter={v => v.toLocaleString()} />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </GC>
            </div>

            {/* Case Origin Closed */}
            <GC style={{ padding: '14px 16px' }}>
              <SH title="Case Origin (All Records)" />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {originData.map(({ name, value, color }) => {
                  const pct = (value / total * 100).toFixed(2);
                  return (
                    <div key={name} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 8, height: 8, borderRadius: 2, background: color, flexShrink: 0 }} />
                      <div style={{ width: 160, fontSize: 11, fontWeight: 600, color: T.textM }}>{name}</div>
                      <div style={{ flex: 1, height: 6, background: 'rgba(0,100,140,0.08)', borderRadius: 3 }}>
                        <div style={{ width: `${Math.min(Number(pct) * 1.5, 100)}%`, height: '100%', background: color, borderRadius: 3 }} />
                      </div>
                      <div style={{ fontSize: 11, fontWeight: 700, color, width: 50, textAlign: 'right' }}>{pct}%</div>
                    </div>
                  );
                })}
              </div>
            </GC>

            <CasesTable cases={filteredCases.filter(c => c.status === 'Closed' || c.status === 'Resolved' || c.status === 'Close')}
              owners={owners} areas={areas}
              filterOwner={filterOwner} setFilterOwner={setFilterOwner}
              filterArea={filterArea} setFilterArea={setFilterArea} title="Closed Cases" />
          </div>
        )}
      </main>
    </div>
  );
}

// ─── CASES TABLE ──────────────────────────────────────────────────────────────
function CasesTable({ cases, owners, areas, filterOwner, setFilterOwner, filterArea, setFilterArea, title }) {
  const statusColor = s => {
    if (!s) return T.gray;
    if (s === 'Closed' || s === 'Resolved' || s === 'Close') return T.green;
    if (s === 'In Progress') return T.teal;
    if (s === 'Re-Open') return T.red;
    if (s === 'New') return T.tealD;
    return T.amber;
  };
  return (
    <GC style={{ padding: '14px 16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <SH title={title} sub={`${cases.length.toLocaleString()} records`} />
        <div style={{ display: 'flex', gap: 8 }}>
          <select value={filterOwner} onChange={e => setFilterOwner(e.target.value)}
            style={{ fontSize: 10, fontWeight: 600, color: T.textM, background: 'rgba(255,255,255,0.88)', border: '1px solid rgba(0,100,140,0.2)', borderRadius: 7, padding: '4px 8px', cursor: 'pointer', fontFamily: 'Inter,sans-serif' }}>
            <option value="All">All Owners</option>
            {owners.map(o => <option key={o} value={o}>{o}</option>)}
          </select>
          <select value={filterArea} onChange={e => setFilterArea(e.target.value)}
            style={{ fontSize: 10, fontWeight: 600, color: T.textM, background: 'rgba(255,255,255,0.88)', border: '1px solid rgba(0,100,140,0.2)', borderRadius: 7, padding: '4px 8px', cursor: 'pointer', fontFamily: 'Inter,sans-serif' }}>
            <option value="All">All Areas</option>
            {areas.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
        </div>
      </div>
      <div style={{ overflowX: 'auto', maxHeight: 280, overflowY: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 10 }}>
          <thead style={{ position: 'sticky', top: 0, background: 'rgba(255,255,255,0.97)' }}>
            <tr style={{ background: 'rgba(0,151,167,0.1)' }}>
              {['Case Number', 'Case Owner', 'Team Leader', 'Area', 'Sub Area', 'Status', 'TAT Status', 'Age (Days)'].map(h => (
                <th key={h} style={{ padding: '6px 8px', textAlign: 'left', color: T.tealD, fontWeight: 700, borderBottom: '2px solid rgba(0,151,167,0.2)', whiteSpace: 'nowrap' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {cases.slice(0, 100).map((c, i) => (
              <tr key={i} className="tr" style={{ background: i % 2 === 0 ? 'transparent' : 'rgba(0,100,140,0.025)' }}>
                <td style={{ padding: '4px 8px', borderBottom: '1px solid rgba(0,100,140,0.05)', fontWeight: 700, color: T.teal }}>{c.caseNumber}</td>
                <td style={{ padding: '4px 8px', borderBottom: '1px solid rgba(0,100,140,0.05)', color: T.textM }}>{c.caseOwner}</td>
                <td style={{ padding: '4px 8px', borderBottom: '1px solid rgba(0,100,140,0.05)', color: T.textL }}>{c.teamLeader || '–'}</td>
                <td style={{ padding: '4px 8px', borderBottom: '1px solid rgba(0,100,140,0.05)', color: T.textM }}>{c.area}</td>
                <td style={{ padding: '4px 8px', borderBottom: '1px solid rgba(0,100,140,0.05)', color: T.textL }}>{c.subArea}</td>
                <td style={{ padding: '4px 8px', borderBottom: '1px solid rgba(0,100,140,0.05)' }}>
                  <span style={{ background: `${statusColor(c.status)}18`, color: statusColor(c.status), border: `1px solid ${statusColor(c.status)}33`, borderRadius: 10, padding: '1px 7px', fontWeight: 700, fontSize: 9 }}>{c.status}</span>
                </td>
                <td style={{ padding: '4px 8px', borderBottom: '1px solid rgba(0,100,140,0.05)', color: c.tatStatus === 'Beyond TAT' ? T.red : T.textL, fontWeight: c.tatStatus === 'Beyond TAT' ? 700 : 400 }}>{c.tatStatus !== 'nan' ? c.tatStatus : '–'}</td>
                <td style={{ padding: '4px 8px', borderBottom: '1px solid rgba(0,100,140,0.05)', textAlign: 'center', color: c.age > 15 ? T.red : c.age > 5 ? T.amber : T.textM, fontWeight: 700 }}>{c.age}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </GC>
  );
}

// ─── DATA PROCESSOR ──────────────────────────────────────────────────────────
function processData(records) {
  const count = (key, filter = null) => {
    const obj = {};
    records.forEach(r => {
      if (filter && !filter(r)) return;
      const v = String(r[key] || '').trim();
      if (v) obj[v] = (obj[v] || 0) + 1;
    });
    return obj;
  };

  const total = records.length;
  const openCount = records.filter(r => String(r['Open']) === 'TRUE' || r['Open'] === true || r['Open'] === 1).length;
  const closedCount = records.filter(r => String(r['Closed']) === 'TRUE' || r['Closed'] === true || r['Closed'] === 1).length;
  const statusCounts = count('Status');
  const originCounts = count('Case Origin');
  const caseTypeCounts = count('Case Type');

  // By Owner (exclude CRM FrontEnd)
  const ownerCounts = count('Case Owner', r => r['Case Owner'] !== 'CRM FrontEnd Executives');
  const byOwner = Object.fromEntries(Object.entries(ownerCounts).sort((a, b) => b[1] - a[1]).slice(0, 10));

  // Area / SubArea
  const areaSubMap = {};
  records.forEach(r => {
    const key = `${r['Area']}|||${r['Sub Area']}`;
    areaSubMap[key] = (areaSubMap[key] || 0) + 1;
  });
  const areaSub = Object.entries(areaSubMap)
    .map(([k, v]) => { const [area, subArea] = k.split('|||'); return { area, subArea, count: v }; })
    .sort((a, b) => b.count - a.count).slice(0, 15);

  // Ageing
  const ages = records.map(r => Number(r['Age'])).filter(v => !isNaN(v));
  const ageing = {
    under24h: ages.filter(v => v < 1).length,
    '1to5': ages.filter(v => v >= 1 && v <= 5).length,
    '5to15': ages.filter(v => v > 5 && v <= 15).length,
    '15to30': ages.filter(v => v > 15 && v <= 30).length,
    over30: ages.filter(v => v > 30).length,
  };

  // Response time
  const respTime = count('Response Time Category');

  // TAT
  const tatBeyond = records.filter(r => r['TAT Status'] === 'Beyond TAT').length;
  const tatWithin = records.filter(r => r['TAT Status'] && r['TAT Status'] !== 'Beyond TAT').length;

  // Recent cases (show all, tables handle filter)
  const recentCases = records.slice(0, 500).map(r => ({
    caseNumber: String(r['Case Number'] || '').replace('.0', ''),
    caseOwner: String(r['Case Owner'] || ''),
    teamLeader: String(r['Team Leader name'] || '').trim(),
    area: String(r['Area'] || ''),
    subArea: String(r['Sub Area'] || ''),
    status: String(r['Status'] || ''),
    tatStatus: String(r['TAT Status'] || ''),
    age: Number(r['Age']) || 0,
  }));

  const owners = [...new Set(records.map(r => String(r['Case Owner'] || '')).filter(Boolean))].sort();
  const areas = [...new Set(records.map(r => String(r['Area'] || '')).filter(Boolean))].sort();

  return { total, openCount, closedCount, statusCounts, originCounts, caseTypeCounts, byOwner, areaSub, ageing, respTime, recentCases, tatStats: { beyond: tatBeyond, within: tatWithin }, owners, areas };
}
