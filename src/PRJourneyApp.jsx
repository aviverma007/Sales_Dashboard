import React, { useState, useEffect, useMemo } from 'react';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, ComposedChart,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LabelList
} from 'recharts';

const T = {
  navy: '#0d2137', tealD: '#006978', teal: '#0097a7',
  amber: '#f57c00', red: '#d32f2f', green: '#2e7d32',
  purple: '#6a1b9a', blue: '#1565c0', orange: '#e65100',
  gray: '#546e7a', textM: '#1a2f45', white: '#fff', pink: '#c2185b'
};

const CC = ['#0097a7', '#1565c0', '#2e7d32', '#f57c00', '#d32f2f', '#6a1b9a', '#00838f', '#e65100'];

const logout = () => { sessionStorage.removeItem('prjourney_auth'); window.location.reload(); };

// ── UI COMPONENTS ─────────────────────────────────────────────────────────────
const GC = ({ children, style = {} }) => (
  <div style={{
    background: 'rgba(255,255,255,0.97)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
    border: '1px solid rgba(255,255,255,0.9)', borderRadius: 14,
    boxShadow: '0 4px 24px rgba(0,80,120,0.10)', position: 'relative', overflow: 'hidden', ...style
  }}>
    {children}
  </div>
);

const KpiCard = ({ icon, label, value, sub, color, pct }) => (
  <div style={{
    background: 'rgba(255,255,255,0.97)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
    border: '1px solid rgba(255,255,255,0.9)', borderLeft: `4px solid ${color}`, borderRadius: 14,
    boxShadow: '0 4px 24px rgba(0,40,80,0.15)', padding: '14px 16px', position: 'relative'
  }}>
    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 6 }}>
      <span style={{ fontSize: 20 }}>{icon}</span>
      {pct != null && <span style={{ fontSize: 9, fontWeight: 800, color: '#fff', background: color, borderRadius: 20, padding: '2px 8px' }}>{pct}%</span>}
    </div>
    <div style={{ fontSize: 24, fontWeight: 900, color, letterSpacing: -1, lineHeight: 1, marginBottom: 3 }}>{value}</div>
    <div style={{ fontSize: 9, fontWeight: 800, color: T.textM, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 }}>{label}</div>
    <div style={{ fontSize: 9, color: T.gray }}>{sub}</div>
    {pct != null && <div style={{ marginTop: 8, height: 3, background: 'rgba(0,60,100,0.08)', borderRadius: 2 }}>
      <div style={{ width: `${Math.min(pct, 100)}%`, height: '100%', background: color, borderRadius: 2 }} />
    </div>}
  </div>
);

const CTip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return <div style={{
    background: 'rgba(255,255,255,0.98)', border: '1px solid rgba(0,151,167,0.25)', borderRadius: 10,
    padding: '8px 12px', boxShadow: '0 8px 32px rgba(0,80,120,0.15)', fontSize: 11
  }}>
    <p style={{ color: T.tealD, fontWeight: 700, marginBottom: 4 }}>{label}</p>
    {payload.map((p, i) => <p key={i} style={{ color: p.color || T.navy, margin: '2px 0' }}>
      <span style={{ color: T.gray }}>{p.name}: </span>{typeof p.value === 'number' ? p.value.toLocaleString() : p.value}
    </p>)}
  </div>;
};

const SH = ({ title, sub }) => <div style={{ marginBottom: 10 }}>
  <p style={{ fontSize: 11, fontWeight: 800, color: T.tealD, textTransform: 'uppercase', letterSpacing: 0.4, margin: 0 }}>{title}</p>
  {sub && <p style={{ fontSize: 9, color: T.gray, margin: '2px 0 0' }}>{sub}</p>}
</div>;

// ── JOURNEY FLOW STAGE ────────────────────────────────────────────────────────
const JourneyStage = ({ stage, count, avgDays, status }) => (
  <div style={{
    flex: 1, padding: '12px', background: 'rgba(255,255,255,0.97)', border: '1px solid rgba(0,151,167,0.2)',
    borderRadius: 10, textAlign: 'center', position: 'relative'
  }}>
    <div style={{ fontSize: 24, marginBottom: 6 }}>{stage.icon}</div>
    <div style={{ fontSize: 13, fontWeight: 800, color: T.navy, marginBottom: 4 }}>{stage.name}</div>
    <div style={{ fontSize: 18, fontWeight: 900, color: stage.color, marginBottom: 2 }}>{count.toLocaleString()}</div>
    <div style={{ fontSize: 9, color: T.gray, marginBottom: 6 }}>Avg: {avgDays.toFixed(1)} days</div>
    <div style={{
      display: 'inline-block', fontSize: 8, fontWeight: 700, background: stage.color, color: '#fff',
      borderRadius: 12, padding: '2px 8px'
    }}>
      {status}
    </div>
  </div>
);

// ── MAIN COMPONENT ────────────────────────────────────────────────────────────
export default function PRJourneyApp() {
  const [journeyData] = useState({
    created: 245,
    approved: 198,
    prReleased: 187,
    poInitiated: 176,
    poReleased: 162,
    avgDays: { created: 2.3, approved: 3.5, prReleased: 4.1, poInitiated: 5.2, poReleased: 6.8 }
  });

  const [stageData] = useState([
    { name: 'Created', count: 245, status: 'Active' },
    { name: 'Approved', count: 198, status: 'In Progress' },
    { name: 'PR Released', count: 187, status: 'Processing' },
    { name: 'PO Initiated', count: 176, status: 'Pending' },
    { name: 'PO Released', count: 162, status: 'Complete' }
  ]);

  const [timelineData] = useState([
    { week: 'W1', created: 50, approved: 42, prReleased: 38, poInitiated: 35, poReleased: 28 },
    { week: 'W2', created: 45, approved: 40, prReleased: 38, poInitiated: 35, poReleased: 30 },
    { week: 'W3', created: 52, approved: 48, prReleased: 45, poInitiated: 42, poReleased: 38 },
    { week: 'W4', created: 48, approved: 44, prReleased: 42, poInitiated: 40, poReleased: 35 },
    { week: 'W5', created: 50, approved: 44, prReleased: 42, poInitiated: 40, poReleased: 31 }
  ]);

  const [statusDist] = useState([
    { name: 'Released', value: 162, color: T.green },
    { name: 'In Process', value: 83, color: T.amber },
    { name: 'Pending', value: 22, color: T.red }
  ]);

  const [bottleneckData] = useState([
    { stage: 'Created→Approved', delay: 3.5, count: 47, pct: 19.2 },
    { stage: 'Approved→PR', delay: 4.1, count: 11, pct: 5.5 },
    { stage: 'PR→PO Init', delay: 5.2, count: 11, pct: 6.3 },
    { stage: 'PO Init→Released', delay: 6.8, count: 14, pct: 8.6 }
  ]);

  const conversionRate = ((journeyData.poReleased / journeyData.created) * 100).toFixed(1);
  const avgCycleTime = (2.3 + 3.5 + 4.1 + 5.2 + 6.8).toFixed(1);

  const stageDetails = [
    { icon: '📝', name: 'Created', color: T.blue, count: journeyData.created, avgDays: journeyData.avgDays.created, status: 'Active' },
    { icon: '✓', name: 'Approved', color: T.purple, count: journeyData.approved, avgDays: journeyData.avgDays.approved, status: 'In Prog' },
    { icon: '📤', name: 'PR Released', color: T.teal, count: journeyData.prReleased, avgDays: journeyData.avgDays.prReleased, status: 'Done' },
    { icon: '📋', name: 'PO Initiated', color: T.amber, count: journeyData.poInitiated, avgDays: journeyData.avgDays.poInitiated, status: 'Pending' },
    { icon: '🎯', name: 'PO Released', color: T.green, count: journeyData.poReleased, avgDays: journeyData.avgDays.poReleased, status: 'Final' }
  ];

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, rgba(240,244,248,0.8), rgba(224,242,245,0.8))', padding: 20, fontFamily: 'Inter,sans-serif' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
      `}</style>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ width: 56, height: 56, borderRadius: 14, background: 'linear-gradient(135deg, #d32f2f, #b71c1c)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 28, fontWeight: 900 }}>
            🛣️
          </div>
          <div>
            <h1 style={{ fontSize: 28, fontWeight: 900, color: T.navy, margin: '0 0 2px' }}>PR/PO Journey Dashboard</h1>
            <p style={{ fontSize: 12, color: T.gray, margin: 0, fontWeight: 500 }}>Purchase Request to PO release tracking • Real-time monitoring</p>
          </div>
        </div>
        <button onClick={logout} style={{ background: 'rgba(211,47,47,0.9)', color: '#fff', border: 'none', borderRadius: 10, padding: '9px 18px', fontSize: 12, fontWeight: 800, cursor: 'pointer' }}>🚪 Logout</button>
      </div>

      {/* KPI Summary Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14, marginBottom: 20 }}>
        <KpiCard icon="📊" label="Conversion Rate" value={`${conversionRate}%`} sub="Created → Released" color={T.green} pct={parseFloat(conversionRate)} />
        <KpiCard icon="⏱️" label="Avg Cycle Time" value={`${avgCycleTime}d`} sub="End-to-end days" color={T.teal} />
        <KpiCard icon="📈" label="Total Created" value={journeyData.created.toLocaleString()} sub="PRs initiated" color={T.blue} pct={100} />
        <KpiCard icon="🎯" label="Completed" value={journeyData.poReleased.toLocaleString()} sub="POs released" color={T.purple} pct={parseFloat(conversionRate)} />
      </div>

      {/* Journey Flow */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 10, marginBottom: 20 }}>
        {stageDetails.map((stage, i) => (
          <JourneyStage key={i} stage={stage} count={stage.count} avgDays={stage.avgDays} status={stage.status} />
        ))}
      </div>

      {/* Charts Row 1 */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 20 }}>
        {/* Journey Progress Timeline */}
        <GC style={{ padding: 18 }}>
          <SH title="Journey Progress by Week" sub="Count at each stage" />
          <ResponsiveContainer width="100%" height={280}>
            <ComposedChart data={timelineData}>
              <CartesianGrid strokeDasharray="0" stroke="rgba(0,80,120,0.08)" />
              <XAxis dataKey="week" stroke={T.gray} style={{ fontSize: 11 }} />
              <YAxis stroke={T.gray} style={{ fontSize: 11 }} />
              <Tooltip content={<CTip />} />
              <Legend wrapperStyle={{ fontSize: 11, paddingTop: 12 }} />
              <Bar dataKey="created" fill={T.blue} radius={[6, 6, 0, 0]} />
              <Bar dataKey="approved" fill={T.purple} radius={[6, 6, 0, 0]} />
              <Bar dataKey="prReleased" fill={T.teal} radius={[6, 6, 0, 0]} />
              <Bar dataKey="poInitiated" fill={T.amber} radius={[6, 6, 0, 0]} />
              <Bar dataKey="poReleased" fill={T.green} radius={[6, 6, 0, 0]} />
            </ComposedChart>
          </ResponsiveContainer>
        </GC>

        {/* Status Distribution */}
        <GC style={{ padding: 18 }}>
          <SH title="Current Status Distribution" sub="Overall breakdown" />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, alignItems: 'center' }}>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={statusDist} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" paddingAngle={2}>
                  {statusDist.map((d, i) => <Cell key={i} fill={d.color} />)}
                </Pie>
                <Tooltip content={<CTip />} />
              </PieChart>
            </ResponsiveContainer>
            <div>
              {statusDist.map((d, i) => (
                <div key={i} style={{ marginBottom: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                    <div style={{ width: 10, height: 10, borderRadius: 2, background: d.color, flexShrink: 0 }} />
                    <span style={{ fontSize: 11, color: T.textM, flex: 1, fontWeight: 600 }}>{d.name}</span>
                    <span style={{ fontSize: 12, fontWeight: 800, color: d.color }}>{d.value.toLocaleString()}</span>
                  </div>
                  <div style={{ fontSize: 10, color: T.gray, marginLeft: 16 }}>{((d.value / 267) * 100).toFixed(1)}%</div>
                </div>
              ))}
            </div>
          </div>
        </GC>
      </div>

      {/* Bottleneck Analysis */}
      <GC style={{ padding: 18, marginBottom: 20 }}>
        <SH title="Bottleneck Analysis" sub="Stages with highest delays and pending items" />
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={bottleneckData} layout="vertical">
            <CartesianGrid strokeDasharray="0" stroke="rgba(0,80,120,0.08)" />
            <XAxis type="number" stroke={T.gray} style={{ fontSize: 11 }} />
            <YAxis dataKey="stage" width={140} stroke={T.gray} style={{ fontSize: 10 }} />
            <Tooltip content={<CTip />} />
            <Legend wrapperStyle={{ fontSize: 11, paddingTop: 12 }} />
            <Bar dataKey="delay" fill={T.red} radius={[0, 6, 6, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </GC>

      {/* Stage Details Table */}
      <GC style={{ padding: 18 }}>
        <SH title="Detailed Stage Analysis" sub="Count, average cycle time, and status per stage" />
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
            <thead>
              <tr style={{ background: 'rgba(0,80,120,0.06)', borderBottom: '1px solid rgba(0,80,120,0.12)' }}>
                <th style={{ textAlign: 'left', padding: '10px 12px', fontWeight: 800, color: T.tealD, textTransform: 'uppercase' }}>Stage</th>
                <th style={{ textAlign: 'right', padding: '10px 12px', fontWeight: 800, color: T.tealD, textTransform: 'uppercase' }}>Count</th>
                <th style={{ textAlign: 'right', padding: '10px 12px', fontWeight: 800, color: T.tealD, textTransform: 'uppercase' }}>Avg Days</th>
                <th style={{ textAlign: 'center', padding: '10px 12px', fontWeight: 800, color: T.tealD, textTransform: 'uppercase' }}>% Complete</th>
                <th style={{ textAlign: 'left', padding: '10px 12px', fontWeight: 800, color: T.tealD, textTransform: 'uppercase' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {stageDetails.map((stage, i) => {
                const pct = ((stage.count / journeyData.created) * 100).toFixed(1);
                return (
                  <tr key={i} style={{ borderBottom: '1px solid rgba(0,80,120,0.08)', background: i % 2 === 0 ? 'transparent' : 'rgba(0,80,120,0.02)' }}>
                    <td style={{ padding: '10px 12px', color: T.navy, fontWeight: 600 }}>
                      <span style={{ fontSize: 14, marginRight: 8 }}>{stage.icon}</span>{stage.name}
                    </td>
                    <td style={{ textAlign: 'right', padding: '10px 12px', color: T.navy, fontWeight: 700 }}>{stage.count.toLocaleString()}</td>
                    <td style={{ textAlign: 'right', padding: '10px 12px', color: T.navy, fontWeight: 700 }}>{stage.avgDays.toFixed(1)}d</td>
                    <td style={{ textAlign: 'center', padding: '10px 12px' }}>
                      <div style={{ display: 'inline-block', background: 'rgba(0,80,120,0.08)', borderRadius: 6, padding: '4px 10px', fontSize: 10, fontWeight: 700, color: stage.color }}>
                        {pct}%
                      </div>
                    </td>
                    <td style={{ padding: '10px 12px', color: stage.color, fontWeight: 700 }}>{stage.status}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </GC>

      {/* Footer */}
      <div style={{ textAlign: 'center', marginTop: 24, fontSize: 11, color: T.gray }}>
        <p style={{ margin: 0 }}>Smartworld Group · PR/PO Journey Dashboard · Confidential</p>
      </div>
    </div>
  );
}
