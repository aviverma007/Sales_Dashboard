import React, { useState, useEffect } from 'react';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, ComposedChart,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LabelList
} from 'recharts';

// ─── THEME ────────────────────────────────────────────────────────────────────
const T = {
  glass:      'rgba(255,255,255,0.96)',
  glassH:     'rgba(255,255,255,1.0)',
  glassDark:  'rgba(15,35,60,0.88)',
  glassDarkH: 'rgba(15,35,60,0.95)',
  border:     'rgba(255,255,255,0.85)',
  borderB:    'rgba(255,255,255,0.2)',
  teal:   '#0097a7', tealL:'#00bcd4', tealD:'#006978',
  red:    '#d32f2f', redL:'#ef5350',
  navy:   '#0d2137', navyM:'#1a3a5c',
  amber:  '#f57c00', amberL:'#ffb300',
  green:  '#2e7d32', greenL:'#43a047',
  gray:   '#546e7a',
  text:   '#040d1a', textM:'#0d1f3c', textD:'#000d1f', textL:'#1a3352', textW:'rgba(255,255,255,1.0)',
};

const logout = () => { sessionStorage.removeItem('prjourney_auth'); window.location.reload(); };

// ─── LOADING SKELETON ──────────────────────────────────────────────────────────
const KpiSkeleton = () => (
  <div style={{
    background: T.glass, backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
    border: `1px solid ${T.borderB}`, borderLeft: `4px solid ${T.gray}`, borderRadius: 14,
    boxShadow: '0 2px 16px rgba(0,60,100,0.08)', padding: '14px 16px', position: 'relative'
  }}>
    <div style={{ animation: 'pulse 2s infinite', opacity: 0.6 }}>
      <div style={{ height: 8, background: T.gray, borderRadius: 4, marginBottom: 8, width: '60%' }}></div>
      <div style={{ height: 28, background: T.gray, borderRadius: 4, marginBottom: 6, width: '80%' }}></div>
      <div style={{ height: 6, background: T.gray, borderRadius: 4, width: '50%' }}></div>
    </div>
  </div>
);

// ─── KPI CARD ──────────────────────────────────────────────────────────────────
const KpiCard = ({ icon, label, value, sub, color, loading }) => (
  <div style={{
    background: T.glass, backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
    border: `1px solid ${T.borderB}`, borderLeft: `4px solid ${color}`, borderRadius: 14,
    boxShadow: '0 2px 16px rgba(0,60,100,0.08)', padding: '14px 16px', position: 'relative'
  }}>
    {loading ? (
      <KpiSkeleton />
    ) : (
      <>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 6 }}>
          <span style={{ fontSize: 20 }}>{icon}</span>
        </div>
        <div style={{ fontSize: 24, fontWeight: 900, color, letterSpacing: -1, lineHeight: 1, marginBottom: 3 }}>
          {value || '—'}
        </div>
        <div style={{ fontSize: 9, fontWeight: 800, color: T.textM, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 }}>
          {label}
        </div>
        <div style={{ fontSize: 9, color: T.gray }}>{sub}</div>
      </>
    )}
  </div>
);

// ─── SECTION HEADER ───────────────────────────────────────────────────────────
const SectionHeader = ({ title, subtitle }) => (
  <div style={{ marginBottom: 12 }}>
    <p style={{ fontSize: 12, fontWeight: 800, color: T.tealD, textTransform: 'uppercase', letterSpacing: 0.4, margin: 0 }}>
      {title}
    </p>
    {subtitle && <p style={{ fontSize: 10, color: T.gray, margin: '2px 0 0' }}>{subtitle}</p>}
  </div>
);

// ─── CHART CONTAINER ──────────────────────────────────────────────────────────
const ChartContainer = ({ title, subtitle, children, loading }) => (
  <div style={{
    background: T.glass, backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
    border: `1px solid ${T.borderB}`, borderRadius: 14,
    boxShadow: '0 2px 16px rgba(0,60,100,0.08)', padding: '18px', position: 'relative'
  }}>
    <SectionHeader title={title} subtitle={subtitle} />
    {loading ? (
      <div style={{ height: 280, display: 'flex', alignItems: 'center', justifyContent: 'center', color: T.gray }}>
        <span style={{ fontSize: 12 }}>Loading data...</span>
      </div>
    ) : (
      children
    )}
  </div>
);

// ─── CUSTOM TOOLTIP ───────────────────────────────────────────────────────────
const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: T.glassH, border: `1px solid ${T.borderB}`, borderRadius: 10,
      padding: '8px 12px', boxShadow: '0 8px 32px rgba(0,80,120,0.15)', fontSize: 11
    }}>
      <p style={{ color: T.tealD, fontWeight: 700, marginBottom: 4 }}>{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color || T.navy, margin: '2px 0' }}>
          <span style={{ color: T.gray }}>{p.name}: </span>{typeof p.value === 'number' ? p.value.toLocaleString() : p.value}
        </p>
      ))}
    </div>
  );
};

// ─── MAIN APP ─────────────────────────────────────────────────────────────────
export default function PRJourneyApp() {
  const [loading, setLoading] = useState(true);
  const [kpiData, setKpiData] = useState({
    totalCreated: null,
    totalApproved: null,
    prReleased: null,
    poInitiated: null,
    poReleased: null,
    conversionRate: null,
    avgCycleTime: null
  });
  const [chartData, setChartData] = useState({
    timeline: [],
    statusDist: [],
    bottleneck: [],
    details: []
  });

  // ─── FETCH DATA FROM SQL DATABASE ─────────────────────────────────────────
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // TODO: Replace with your actual API endpoint
        // Example: const response = await fetch('http://192.168.66.34:5002/api/pr-journey');
        // const data = await response.json();
        
        // Placeholder for SQL data structure:
        // const { kpis, timeline, statusDist, bottleneck } = data;
        // setKpiData(kpis);
        // setChartData({ timeline, statusDist, bottleneck, details: [] });
        
        // For now, just set loading to false when ready
        setTimeout(() => setLoading(false), 1000);
      } catch (error) {
        console.error('Error fetching PR/PO journey data:', error);
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  return (
    <div style={{
      minHeight: '100vh',
      backgroundImage: 'url(/bg.jpg)',
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      backgroundAttachment: 'fixed',
      padding: '20px',
      fontFamily: 'Inter,sans-serif'
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
      `}</style>

      {/* ─── HEADER ──────────────────────────────────────────────────────────── */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '24px',
        background: T.glass,
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        border: `1px solid ${T.borderB}`,
        borderRadius: 14,
        padding: '20px',
        boxShadow: '0 2px 16px rgba(0,60,100,0.08)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{
            width: 48, height: 48, borderRadius: 12,
            background: 'linear-gradient(135deg, #d32f2f, #b71c1c)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff', fontSize: 24, fontWeight: 900, boxShadow: '0 4px 12px rgba(0,60,100,0.12)'
          }}>
            🛣️
          </div>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 900, color: T.textM, margin: '0 0 2px' }}>
              PR/PO Journey Dashboard
            </h1>
            <p style={{ fontSize: 11, color: T.gray, margin: 0, fontWeight: 500 }}>
              Purchase Request to PO release tracking • Live data from database
            </p>
          </div>
        </div>
        <button
          onClick={logout}
          style={{
            background: 'rgba(211,47,47,0.85)',
            color: '#fff',
            border: 'none',
            borderRadius: 10,
            padding: '9px 18px',
            fontSize: 12,
            fontWeight: 800,
            cursor: 'pointer',
            boxShadow: '0 4px 12px rgba(0,60,100,0.12)'
          }}
        >
          🚪 Logout
        </button>
      </div>

      {/* ─── KPI SUMMARY ROW ─────────────────────────────────────────────────── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '14px',
        marginBottom: '20px'
      }}>
        <KpiCard icon="📝" label="Created" value={kpiData.totalCreated} sub="Total PRs initiated" color={T.blue} loading={loading} />
        <KpiCard icon="✓" label="Approved" value={kpiData.totalApproved} sub="PRs approved" color={T.purple} loading={loading} />
        <KpiCard icon="📤" label="PR Released" value={kpiData.prReleased} sub="Purchase Requests released" color={T.teal} loading={loading} />
        <KpiCard icon="📋" label="PO Initiated" value={kpiData.poInitiated} sub="Purchase Orders created" color={T.amber} loading={loading} />
        <KpiCard icon="🎯" label="PO Released" value={kpiData.poReleased} sub="Final completions" color={T.green} loading={loading} />
        <KpiCard icon="📊" label="Conversion Rate" value={kpiData.conversionRate} sub="Created → Released %" color={T.red} loading={loading} />
      </div>

      {/* ─── CHARTS ROW 1 ────────────────────────────────────────────────────── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '14px',
        marginBottom: '20px'
      }}>
        <ChartContainer title="Journey Progress Timeline" subtitle="Weekly progression across all stages" loading={loading}>
          {chartData.timeline.length > 0 && (
            <ResponsiveContainer width="100%" height={280}>
              <ComposedChart data={chartData.timeline}>
                <CartesianGrid strokeDasharray="0" stroke="rgba(0,80,120,0.08)" />
                <XAxis dataKey="week" stroke={T.gray} style={{ fontSize: 10 }} />
                <YAxis stroke={T.gray} style={{ fontSize: 10 }} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: 10, paddingTop: 12 }} />
                <Bar dataKey="created" fill={T.blue} radius={[6, 6, 0, 0]} />
                <Bar dataKey="approved" fill={T.purple} radius={[6, 6, 0, 0]} />
              </ComposedChart>
            </ResponsiveContainer>
          )}
        </ChartContainer>

        <ChartContainer title="Status Distribution" subtitle="Overall breakdown of PRs by status" loading={loading}>
          {chartData.statusDist.length > 0 && (
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie data={chartData.statusDist} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" paddingAngle={2}>
                  {chartData.statusDist.map((d, i) => (
                    <Cell key={i} fill={d.color || T.teal} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </ChartContainer>
      </div>

      {/* ─── BOTTLENECK ANALYSIS ─────────────────────────────────────────────── */}
      <ChartContainer title="Bottleneck Analysis" subtitle="Stages with highest delays and pending items" loading={loading} style={{ marginBottom: '20px' }}>
        {chartData.bottleneck.length > 0 && (
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={chartData.bottleneck} layout="vertical">
              <CartesianGrid strokeDasharray="0" stroke="rgba(0,80,120,0.08)" />
              <XAxis type="number" stroke={T.gray} style={{ fontSize: 10 }} />
              <YAxis dataKey="stage" width={140} stroke={T.gray} style={{ fontSize: 10 }} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: 10, paddingTop: 12 }} />
              <Bar dataKey="delay" fill={T.red} radius={[0, 6, 6, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </ChartContainer>

      {/* ─── DETAILED TABLE ───────────────────────────────────────────────────── */}
      <div style={{
        background: T.glass,
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        border: `1px solid ${T.borderB}`,
        borderRadius: 14,
        boxShadow: '0 2px 16px rgba(0,60,100,0.08)',
        padding: '18px'
      }}>
        <SectionHeader title="Detailed Stage Analysis" subtitle="Count, average cycle time, and status per stage" />
        {loading ? (
          <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', color: T.gray }}>
            <span style={{ fontSize: 12 }}>Loading data...</span>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
              <thead>
                <tr style={{ background: 'rgba(0,80,120,0.06)', borderBottom: `1px solid ${T.borderB}` }}>
                  <th style={{ textAlign: 'left', padding: '10px 12px', fontWeight: 800, color: T.tealD, textTransform: 'uppercase' }}>Stage</th>
                  <th style={{ textAlign: 'right', padding: '10px 12px', fontWeight: 800, color: T.tealD, textTransform: 'uppercase' }}>Count</th>
                  <th style={{ textAlign: 'right', padding: '10px 12px', fontWeight: 800, color: T.tealD, textTransform: 'uppercase' }}>Avg Days</th>
                  <th style={{ textAlign: 'center', padding: '10px 12px', fontWeight: 800, color: T.tealD, textTransform: 'uppercase' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {chartData.details.length > 0 ? (
                  chartData.details.map((row, i) => (
                    <tr key={i} style={{ borderBottom: `1px solid ${T.borderB}`, background: i % 2 === 0 ? 'transparent' : 'rgba(0,80,120,0.02)' }}>
                      <td style={{ padding: '10px 12px', color: T.navy, fontWeight: 600 }}>
                        <span style={{ fontSize: 12, marginRight: 6 }}>{row.icon}</span>{row.stage}
                      </td>
                      <td style={{ textAlign: 'right', padding: '10px 12px', color: T.navy, fontWeight: 700 }}>{row.count || '—'}</td>
                      <td style={{ textAlign: 'right', padding: '10px 12px', color: T.navy, fontWeight: 700 }}>{row.avgDays || '—'}</td>
                      <td style={{ padding: '10px 12px', textAlign: 'center', color: T.tealD, fontWeight: 700 }}>{row.status || '—'}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="4" style={{ textAlign: 'center', padding: '20px 12px', color: T.gray }}>
                      Waiting for data from database...
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ─── FOOTER ───────────────────────────────────────────────────────────── */}
      <div style={{ textAlign: 'center', marginTop: '24px', fontSize: 11, color: T.gray }}>
        <p style={{ margin: 0 }}>Smartworld Group · PR/PO Journey Dashboard · Confidential</p>
      </div>
    </div>
  );
}
