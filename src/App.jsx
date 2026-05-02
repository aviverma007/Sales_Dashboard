import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  RadialBarChart, RadialBar
} from 'recharts';

const T = {
  bg: '#030712', surface: '#0a0f1e', card: '#0d1426', border: '#1a2540', borderGlow: '#1e3a6e',
  primary: '#00d4ff', primaryDim: '#0099bb', accent: '#7c3aed', accentBright: '#a855f7',
  gold: '#f59e0b', green: '#10b981', red: '#ef4444', orange: '#f97316',
  text: '#e2e8f0', textMuted: '#64748b', textDim: '#94a3b8',
};
const CC = ['#00d4ff','#7c3aed','#10b981','#f59e0b','#ef4444','#a855f7','#06b6d4','#8b5cf6'];

const fmtCr = (val) => {
  if (!val || isNaN(val)) return '₹0 Cr';
  const cr = val / 1e7;
  if (cr >= 1000) return `₹${(cr/1000).toFixed(1)}K Cr`;
  if (cr >= 100) return `₹${cr.toFixed(0)} Cr`;
  return `₹${cr.toFixed(1)} Cr`;
};
const fmtMonthLabel = (m) => {
  if (!m) return '';
  const [yr, mo] = m.split('-');
  const months = ['','Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${months[parseInt(mo)]} ${yr.slice(2)}`;
};

const CTip = ({ active, payload, label, fmt }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: '#0d1426', border: '1px solid #1e3a6e', borderRadius: 10, padding: '10px 14px', boxShadow: '0 0 20px rgba(0,212,255,0.15)' }}>
      <p style={{ color: '#00d4ff', fontFamily: 'Orbitron, monospace', fontSize: 11, marginBottom: 6 }}>{label}</p>
      {payload.map((p,i) => (
        <p key={i} style={{ color: p.color || '#e2e8f0', fontSize: 12, margin: '2px 0' }}>
          <span style={{ color: '#64748b' }}>{p.name}: </span>
          {fmt ? fmt(p.value, p.name) : p.value?.toLocaleString?.('en-IN') ?? p.value}
        </p>
      ))}
    </div>
  );
};

const GCard = ({ children, style={}, glow=T.primary, onHover }) => {
  const [hov, setHov] = useState(false);
  return (
    <div
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{
        background: T.card, border: `1px solid ${hov ? glow : T.border}`, borderRadius: 16,
        boxShadow: hov ? `0 0 25px ${glow}22, 0 0 50px ${glow}11` : 'none',
        position: 'relative', overflow: 'hidden', transition: 'all 0.3s ease', ...style
      }}
    >
      <div style={{ position:'absolute', top:0, left:0, right:0, height:1, background:`linear-gradient(90deg, transparent, ${glow}66, transparent)` }} />
      {children}
    </div>
  );
};

const SH = ({ title, sub, icon }) => (
  <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:20 }}>
    {icon && <span style={{ fontSize:18 }}>{icon}</span>}
    <div>
      <h2 style={{ fontFamily:'Orbitron, monospace', fontSize:12, fontWeight:700, letterSpacing:3, color:T.primary, textTransform:'uppercase', margin:0 }}>{title}</h2>
      {sub && <p style={{ color:T.textMuted, fontSize:11, margin:'2px 0 0' }}>{sub}</p>}
    </div>
    <div style={{ flex:1, height:1, background:`linear-gradient(90deg, ${T.borderGlow}, transparent)`, marginLeft:12 }} />
  </div>
);

const FSel = ({ label, options, value, onChange }) => (
  <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
    <label style={{ color:T.textMuted, fontSize:10, fontFamily:'Orbitron, monospace', letterSpacing:1, textTransform:'uppercase' }}>{label}</label>
    <select value={value} onChange={e => onChange(e.target.value)} style={{
      background:T.surface, border:`1px solid ${value ? T.primary : T.border}`, borderRadius:8,
      color:value ? T.primary : T.textMuted, padding:'6px 10px', fontSize:12, fontFamily:'Rajdhani, sans-serif',
      minWidth:130, cursor:'pointer', outline:'none', appearance:'none',
    }}>
      <option value="">All {label}s</option>
      {options.map(o => <option key={o} value={o}>{o}</option>)}
    </select>
  </div>
);

const Chip = ({ label, value, color=T.primary }) => (
  <div style={{ display:'inline-flex', alignItems:'center', gap:6, background:`${color}15`, border:`1px solid ${color}33`, borderRadius:20, padding:'3px 10px' }}>
    <div style={{ width:6, height:6, borderRadius:'50%', background:color, boxShadow:`0 0 6px ${color}` }} />
    <span style={{ color:T.textDim, fontSize:10 }}>{label}:</span>
    <span style={{ color, fontSize:11, fontWeight:700, fontFamily:'Orbitron, monospace' }}>{value}</span>
  </div>
);

export default function App() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ year:'', month:'', company:'', project:'', paymentPlan:'' });
  const sf = useCallback((k,v) => setFilters(p => ({...p, [k]:v})), []);

  useEffect(() => {
    fetch('/data/dashboard_data.json').then(r=>r.json()).then(d=>{setData(d);setLoading(false);}).catch(()=>setLoading(false));
  }, []);

  const monthly = useMemo(() => {
    if (!data) return [];
    let d = data.monthlyTrend || [];
    if (filters.year) d = d.filter(x => x.month.startsWith(filters.year));
    if (filters.month) {
      const mn = String(['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'].indexOf(filters.month)+1).padStart(2,'0');
      d = d.filter(x => x.month.endsWith(`-${mn}`));
    }
    return d.map(x => ({ ...x, label:fmtMonthLabel(x.month), bspCr:+(x.bsp/1e7).toFixed(1), demCr:+(x.demand/1e7).toFixed(1), recCr:+(x.received/1e7).toFixed(1) }));
  }, [data, filters.year, filters.month]);

  const bvc = useMemo(() => {
    if (!data) return [];
    const am={}, cm={};
    (data.bookingVsCancelled?.activeByMonth||[]).forEach(d=>{am[d.BookingMonth]=d.count;});
    (data.bookingVsCancelled?.cancelledByMonth||[]).forEach(d=>{cm[d.BookingMonth]=d.count;});
    let rows = Array.from(new Set([...Object.keys(am),...Object.keys(cm)])).sort().map(m=>({ month:m, label:fmtMonthLabel(m), booked:am[m]||0, cancelled:cm[m]||0 }));
    if (filters.year) rows = rows.filter(r => r.month.startsWith(filters.year));
    return rows;
  }, [data, filters.year]);

  const byProject = useMemo(() => {
    if (!data) return [];
    let d = data.salesByProject || [];
    if (filters.project) d = d.filter(x=>x.name===filters.project);
    return d.map(x => ({ ...x, bspCr:+(x.bsp/1e7).toFixed(1) }));
  }, [data, filters.project]);

  const topCP = useMemo(() => (data?.topCP||[]).map(x=>({...x, bspCr:+(x.bsp/1e7).toFixed(1)})), [data]);
  const bhk = useMemo(() => (data?.bhkSales||[]).map(x=>({...x, bspCr:+(x.bsp/1e7).toFixed(1)})), [data]);

  const top10 = useMemo(() => {
    if (!data) return [];
    let d = data.top10Deals || [];
    if (filters.company) d = d.filter(x=>x.company===filters.company);
    if (filters.project) d = d.filter(x=>x.project===filters.project);
    return d.slice(0,10);
  }, [data, filters.company, filters.project]);

  const openBkg = useMemo(() => {
    if (!data) return [];
    let d = data.openBookings || [];
    if (filters.company) d = d.filter(x=>x.company===filters.company);
    if (filters.project) d = d.filter(x=>x.project===filters.project);
    return d.slice(0,20);
  }, [data, filters.company, filters.project]);

  const kpi = data?.kpi || {};
  const fo = data?.filterOptions || {};
  const tgtAch = kpi.totalDemand > 0 ? Math.round((kpi.totalReceived/kpi.totalDemand)*100) : 0;

  if (loading) return (
    <div style={{ minHeight:'100vh', background:T.bg, display:'flex', alignItems:'center', justifyContent:'center', flexDirection:'column', gap:20 }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@700&display=swap'); @keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <div style={{ width:60, height:60, border:`2px solid ${T.border}`, borderTop:`2px solid ${T.primary}`, borderRadius:'50%', animation:'spin 1s linear infinite' }} />
      <div style={{ fontFamily:'Orbitron, monospace', color:T.primary, fontSize:16, letterSpacing:4 }}>LOADING NEXUS...</div>
    </div>
  );

  const TH = ({c}) => (
    <th style={{ padding:'8px 12px', textAlign:'left', color:c||T.primary, fontFamily:'Orbitron, monospace', fontSize:9, letterSpacing:1, fontWeight:600, whiteSpace:'nowrap' }} />
  );

  return (
    <div style={{ minHeight:'100vh', background:T.bg, fontFamily:'Rajdhani, sans-serif', color:T.text }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;500;600;700;900&family=Rajdhani:wght@300;400;500;600;700&display=swap');
        * { box-sizing:border-box; scrollbar-width:thin; scrollbar-color:#1e3a6e #030712; }
        ::-webkit-scrollbar { width:6px; height:6px; } ::-webkit-scrollbar-track { background:#030712; } ::-webkit-scrollbar-thumb { background:#1e3a6e; border-radius:3px; }
        @keyframes spin { to { transform:rotate(360deg); } }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
        @keyframes gridFlow { 0%{background-position:0 0} 100%{background-position:40px 40px} }
        .tr-hover:hover { background:rgba(0,212,255,0.04) !important; }
        .kc { transition:transform 0.3s ease; } .kc:hover { transform:translateY(-3px); }
        select option { background:#0d1426; color:#e2e8f0; }
        .gtxt { background:linear-gradient(135deg,#00d4ff,#a855f7); -webkit-background-clip:text; -webkit-text-fill-color:transparent; }
      `}</style>

      {/* BG Grid */}
      <div style={{ position:'fixed', inset:0, pointerEvents:'none', zIndex:0,
        backgroundImage:`linear-gradient(rgba(0,212,255,0.025) 1px,transparent 1px),linear-gradient(90deg,rgba(0,212,255,0.025) 1px,transparent 1px)`,
        backgroundSize:'40px 40px', animation:'gridFlow 8s linear infinite' }} />

      {/* HEADER */}
      <header style={{ position:'sticky', top:0, zIndex:100, background:`${T.surface}ee`, backdropFilter:'blur(20px)', borderBottom:`1px solid ${T.border}`, padding:'0 32px' }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', height:64 }}>
          <div style={{ display:'flex', alignItems:'center', gap:16 }}>
            <div style={{ width:40, height:40, borderRadius:10, background:'linear-gradient(135deg,#00d4ff,#7c3aed)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:20, boxShadow:'0 0 20px rgba(0,212,255,0.4)' }}>⬡</div>
            <div>
              <div className="gtxt" style={{ fontFamily:'Orbitron, monospace', fontWeight:900, fontSize:16, letterSpacing:3 }}>SKYARC NEXUS</div>
              <div style={{ color:T.textMuted, fontSize:10, letterSpacing:2 }}>SALES INTELLIGENCE PLATFORM v2.0</div>
            </div>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:24 }}>
            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
              <div style={{ width:8, height:8, borderRadius:'50%', background:T.green, boxShadow:`0 0 8px ${T.green}`, animation:'pulse 2s ease infinite' }} />
              <span style={{ color:T.textMuted, fontSize:11, fontFamily:'Orbitron, monospace', letterSpacing:1 }}>LIVE</span>
            </div>
            <div style={{ color:T.textMuted, fontSize:11, fontFamily:'Orbitron, monospace' }}>{new Date().toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'})}</div>
          </div>
        </div>
      </header>

      <div style={{ position:'relative', zIndex:1, padding:'24px 32px', maxWidth:1800, margin:'0 auto' }}>

        {/* FILTERS */}
        <GCard style={{ padding:'16px 24px', marginBottom:28, background:`${T.surface}aa` }}>
          <div style={{ display:'flex', alignItems:'flex-end', gap:20, flexWrap:'wrap' }}>
            <div style={{ display:'flex', alignItems:'center', gap:8, marginRight:8 }}>
              <span style={{ color:T.primary, fontSize:16 }}>⚡</span>
              <span style={{ fontFamily:'Orbitron, monospace', fontSize:11, color:T.primary, letterSpacing:2 }}>FILTERS</span>
            </div>
            <FSel label="Year" options={(fo.years||[]).map(String)} value={filters.year} onChange={v=>sf('year',v)} />
            <FSel label="Month" options={fo.months||[]} value={filters.month} onChange={v=>sf('month',v)} />
            <FSel label="Company" options={fo.companies||[]} value={filters.company} onChange={v=>sf('company',v)} />
            <FSel label="Project" options={fo.projects||[]} value={filters.project} onChange={v=>sf('project',v)} />
            <FSel label="Payment Plan" options={fo.paymentPlans||[]} value={filters.paymentPlan} onChange={v=>sf('paymentPlan',v)} />
            {Object.values(filters).some(Boolean) && (
              <button onClick={()=>setFilters({year:'',month:'',company:'',project:'',paymentPlan:''})}
                style={{ background:`${T.red}22`, border:`1px solid ${T.red}44`, borderRadius:8, color:T.red, padding:'6px 16px', fontSize:12, cursor:'pointer', fontFamily:'Orbitron, monospace', letterSpacing:1 }}>
                ✕ RESET
              </button>
            )}
          </div>
        </GCard>

        {/* ═══ KPI ROW ═══ */}
        <div style={{ display:'grid', gridTemplateColumns:'2fr 1fr 1fr 1fr 1.2fr 1fr', gap:16, marginBottom:28 }}>

          {/* Units Pie */}
          <GCard style={{ padding:20 }} glow={T.primary}>
            <p style={{ color:T.textMuted, fontSize:10, fontFamily:'Orbitron, monospace', letterSpacing:2, marginBottom:8 }}>TOTAL UNITS INVENTORY</p>
            <div style={{ display:'flex', gap:16, alignItems:'center' }}>
              <div>
                <p style={{ fontFamily:'Orbitron, monospace', fontSize:32, fontWeight:900, color:T.primary, margin:0 }}>{kpi.totalUnits?.toLocaleString('en-IN')}</p>
                <div style={{ display:'flex', flexDirection:'column', gap:5, marginTop:10 }}>
                  <Chip label="Booked" value={kpi.bookedUnits?.toLocaleString('en-IN')} color={T.green} />
                  <Chip label="Available" value={kpi.availableUnits?.toLocaleString('en-IN')} color={T.primary} />
                  <Chip label="In Progress" value={kpi.inProgressUnits} color={T.gold} />
                </div>
              </div>
              <div style={{ flex:1, height:140 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={[{name:'Booked',value:kpi.bookedUnits},{name:'Available',value:kpi.availableUnits},{name:'In Progress',value:kpi.inProgressUnits||1}]}
                      cx="50%" cy="50%" innerRadius={38} outerRadius={58} paddingAngle={3} dataKey="value">
                      <Cell fill={T.green}/><Cell fill={T.primary}/><Cell fill={T.gold}/>
                    </Pie>
                    <Tooltip content={<CTip />} />
                    <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize:10, color:T.textMuted }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </GCard>

          {/* Total Sales */}
          <GCard className="kc" style={{ padding:20 }} glow={T.accentBright}>
            <div style={{ display:'flex', justifyContent:'space-between' }}>
              <p style={{ color:T.textMuted, fontSize:10, fontFamily:'Orbitron, monospace', letterSpacing:2, margin:0 }}>TOTAL SALES</p>
              <span style={{ fontSize:20 }}>💎</span>
            </div>
            <p style={{ fontFamily:'Orbitron, monospace', fontSize:20, fontWeight:900, color:T.accentBright, margin:'8px 0 2px' }}>{fmtCr(kpi.totalSales)}</p>
            <p style={{ color:T.textMuted, fontSize:11, margin:0 }}>Net BSP — Active</p>
            <div style={{ marginTop:10, height:36 }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={monthly.slice(-8)}><defs><linearGradient id="g1" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={T.accentBright} stopOpacity={0.3}/><stop offset="95%" stopColor={T.accentBright} stopOpacity={0}/></linearGradient></defs>
                  <Area type="monotone" dataKey="bspCr" stroke={T.accentBright} fill="url(#g1)" strokeWidth={2} dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </GCard>

          {/* Total Demand */}
          <GCard className="kc" style={{ padding:20 }} glow={T.gold}>
            <div style={{ display:'flex', justifyContent:'space-between' }}>
              <p style={{ color:T.textMuted, fontSize:10, fontFamily:'Orbitron, monospace', letterSpacing:2, margin:0 }}>TOTAL DEMAND</p>
              <span style={{ fontSize:20 }}>📋</span>
            </div>
            <p style={{ fontFamily:'Orbitron, monospace', fontSize:20, fontWeight:900, color:T.gold, margin:'8px 0 2px' }}>{fmtCr(kpi.totalDemand)}</p>
            <p style={{ color:T.textMuted, fontSize:11, margin:0 }}>Demands Raised (DAPP)</p>
            <div style={{ marginTop:10, height:36 }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={monthly.slice(-8)}><defs><linearGradient id="g2" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={T.gold} stopOpacity={0.3}/><stop offset="95%" stopColor={T.gold} stopOpacity={0}/></linearGradient></defs>
                  <Area type="monotone" dataKey="demCr" stroke={T.gold} fill="url(#g2)" strokeWidth={2} dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </GCard>

          {/* Total Received */}
          <GCard className="kc" style={{ padding:20 }} glow={T.green}>
            <div style={{ display:'flex', justifyContent:'space-between' }}>
              <p style={{ color:T.textMuted, fontSize:10, fontFamily:'Orbitron, monospace', letterSpacing:2, margin:0 }}>TOTAL RECEIVED</p>
              <span style={{ fontSize:20 }}>💰</span>
            </div>
            <p style={{ fontFamily:'Orbitron, monospace', fontSize:20, fontWeight:900, color:T.green, margin:'8px 0 2px' }}>{fmtCr(kpi.totalReceived)}</p>
            <p style={{ color:T.textMuted, fontSize:11, margin:0 }}>Collections to date</p>
            <div style={{ marginTop:10, height:36 }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={monthly.slice(-8)}><defs><linearGradient id="g3" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={T.green} stopOpacity={0.3}/><stop offset="95%" stopColor={T.green} stopOpacity={0}/></linearGradient></defs>
                  <Area type="monotone" dataKey="recCr" stroke={T.green} fill="url(#g3)" strokeWidth={2} dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </GCard>

          {/* Target Achievement */}
          <GCard className="kc" style={{ padding:20 }} glow={T.orange}>
            <p style={{ color:T.textMuted, fontSize:10, fontFamily:'Orbitron, monospace', letterSpacing:2, marginBottom:10, marginTop:0 }}>TARGET ACHIEVEMENT</p>
            <div style={{ display:'flex', alignItems:'center', gap:12 }}>
              <div style={{ position:'relative', width:72, height:72, flexShrink:0 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <RadialBarChart cx="50%" cy="50%" innerRadius="60%" outerRadius="100%" startAngle={90} endAngle={-270} data={[{value:tgtAch}]}>
                    <RadialBar background={{fill:`${T.orange}22`}} dataKey="value" fill={tgtAch>80?T.green:tgtAch>50?T.gold:T.red} cornerRadius={4} />
                  </RadialBarChart>
                </ResponsiveContainer>
                <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center' }}>
                  <span style={{ fontFamily:'Orbitron, monospace', fontSize:12, fontWeight:700, color:tgtAch>80?T.green:tgtAch>50?T.gold:T.red }}>{tgtAch}%</span>
                </div>
              </div>
              <div>
                <p style={{ fontSize:10, color:T.textMuted, margin:'0 0 3px' }}>Demand Raised vs Received</p>
                <p style={{ fontSize:11, color:T.textDim, margin:'0 0 2px' }}>Demand: {fmtCr(kpi.totalDemand)}</p>
                <p style={{ fontSize:11, color:T.textDim }}>Collected: {fmtCr(kpi.totalReceived)}</p>
              </div>
            </div>
          </GCard>

          {/* Pipeline */}
          <GCard className="kc" style={{ padding:20 }} glow={T.red}>
            <div style={{ display:'flex', justifyContent:'space-between' }}>
              <p style={{ color:T.textMuted, fontSize:10, fontFamily:'Orbitron, monospace', letterSpacing:2, margin:0 }}>PIPELINE</p>
              <span style={{ fontSize:20 }}>⏳</span>
            </div>
            <p style={{ fontFamily:'Orbitron, monospace', fontSize:32, fontWeight:900, color:T.red, margin:'8px 0 2px' }}>{kpi.pipelineBookings}</p>
            <p style={{ color:T.textMuted, fontSize:11, margin:'0 0 10px' }}>In Progress Units</p>
            <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
              <Chip label="Active" value={kpi.activeBookings?.toLocaleString('en-IN')} color={T.green} />
              <Chip label="Cancelled" value={kpi.cancelledBookings} color={T.red} />
            </div>
          </GCard>
        </div>

        {/* ═══ CHARTS ROW 1: Monthly Trend + Sales by Channel ═══ */}
        <div style={{ display:'grid', gridTemplateColumns:'1.6fr 1fr', gap:20, marginBottom:20 }}>
          <GCard style={{ padding:24 }} glow={T.primary}>
            <SH title="Monthly Sales Trend" sub="BSP · Demand · Collections — Crores (₹)" icon="📈" />
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={monthly} margin={{ top:10, right:10, bottom:24, left:0 }}>
                <defs>
                  <linearGradient id="ga" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={T.primary} stopOpacity={0.25}/><stop offset="95%" stopColor={T.primary} stopOpacity={0}/></linearGradient>
                  <linearGradient id="gb" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={T.gold} stopOpacity={0.25}/><stop offset="95%" stopColor={T.gold} stopOpacity={0}/></linearGradient>
                  <linearGradient id="gc" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={T.green} stopOpacity={0.25}/><stop offset="95%" stopColor={T.green} stopOpacity={0}/></linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={T.border} vertical={false} />
                <XAxis dataKey="label" stroke={T.border} tick={{ fill:T.textMuted, fontSize:9 }} tickLine={false} interval={2} angle={-30} dy={8} />
                <YAxis stroke={T.border} tick={{ fill:T.textMuted, fontSize:10 }} tickLine={false} tickFormatter={v=>`${v}Cr`} />
                <Tooltip content={<CTip fmt={(v)=>`₹${v} Cr`} />} />
                <Legend wrapperStyle={{ color:T.textMuted, fontSize:11 }} />
                <Area type="monotone" dataKey="bspCr" name="Sales (BSP)" stroke={T.primary} fill="url(#ga)" strokeWidth={2} dot={false} activeDot={{r:4}} />
                <Area type="monotone" dataKey="demCr" name="Demand" stroke={T.gold} fill="url(#gb)" strokeWidth={2} dot={false} activeDot={{r:4}} />
                <Area type="monotone" dataKey="recCr" name="Received" stroke={T.green} fill="url(#gc)" strokeWidth={2} dot={false} activeDot={{r:4}} />
              </AreaChart>
            </ResponsiveContainer>
          </GCard>

          <GCard style={{ padding:24 }} glow={T.accentBright}>
            <SH title="Sales by Channel" sub="Project-wise Unit Distribution" icon="🔀" />
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie data={byProject} cx="45%" cy="46%" outerRadius={90} innerRadius={45} paddingAngle={3} dataKey="units" nameKey="name"
                  label={({name, percent}) => `${name?.split(' ').pop()} ${(percent*100).toFixed(0)}%`}
                  labelLine={{ stroke:T.borderGlow, strokeWidth:1 }}>
                  {byProject.map((_,i) => <Cell key={i} fill={CC[i%CC.length]} />)}
                </Pie>
                <Tooltip content={<CTip fmt={(v,n) => n==='bspCr' ? `₹${v} Cr` : v?.toLocaleString?.('en-IN')} />} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize:10, color:T.textMuted }} />
              </PieChart>
            </ResponsiveContainer>
          </GCard>
        </div>

        {/* ═══ CHARTS ROW 2: Top CP + Booking vs Cancelled ═══ */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:20, marginBottom:20 }}>
          <GCard style={{ padding:24 }} glow={T.gold}>
            <SH title="Sales by Top CP-10" sub="Channel Partners — Units Booked" icon="🏆" />
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={topCP} layout="vertical" margin={{ top:0, right:30, bottom:0, left:0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={T.border} horizontal={false} />
                <XAxis type="number" stroke={T.border} tick={{ fill:T.textMuted, fontSize:10 }} tickLine={false} />
                <YAxis type="category" dataKey="name" stroke={T.border} tick={{ fill:T.textDim, fontSize:10 }} tickLine={false} width={145} tickFormatter={v=>v?.length>20?v.slice(0,20)+'…':v} />
                <Tooltip content={<CTip fmt={(v,n)=>n==='bspCr'?`₹${v} Cr`:v?.toLocaleString?.('en-IN')} />} />
                <Bar dataKey="units" name="Units" radius={[0,4,4,0]}>
                  {topCP.map((_,i)=><Cell key={i} fill={CC[i%CC.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </GCard>

          <GCard style={{ padding:24 }} glow={T.red}>
            <SH title="Booking vs. Cancelled" sub="Monthly Comparison" icon="📊" />
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={bvc} margin={{ top:10, right:10, bottom:24, left:0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={T.border} vertical={false} />
                <XAxis dataKey="label" stroke={T.border} tick={{ fill:T.textMuted, fontSize:9 }} tickLine={false} angle={-30} dy={8} interval={2} />
                <YAxis stroke={T.border} tick={{ fill:T.textMuted, fontSize:10 }} tickLine={false} />
                <Tooltip content={<CTip />} />
                <Legend wrapperStyle={{ color:T.textMuted, fontSize:11 }} />
                <Bar dataKey="booked" name="Booked" fill={T.primary} radius={[3,3,0,0]} />
                <Bar dataKey="cancelled" name="Cancelled" fill={T.red} radius={[3,3,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </GCard>
        </div>

        {/* ═══ PRODUCT-WISE SALES (BHK) ═══ */}
        <GCard style={{ padding:24, marginBottom:20 }} glow={T.green}>
          <SH title="Product-wise Sales — Unit Type" sub="2BHK / 3BHK / 4BHK+ | Units & BSP (Cr)" icon="🏢" />
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:20, marginBottom:20 }}>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={bhk} margin={{ top:10, right:10, bottom:0, left:0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={T.border} vertical={false} />
                <XAxis dataKey="bhk" stroke={T.border} tick={{ fill:T.textDim, fontSize:11 }} tickLine={false} />
                <YAxis stroke={T.border} tick={{ fill:T.textMuted, fontSize:10 }} tickLine={false} />
                <Tooltip content={<CTip />} />
                <Bar dataKey="units" name="Units Sold" radius={[6,6,0,0]}>
                  {bhk.map((_,i)=><Cell key={i} fill={CC[i%CC.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={bhk} margin={{ top:10, right:10, bottom:0, left:0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={T.border} vertical={false} />
                <XAxis dataKey="bhk" stroke={T.border} tick={{ fill:T.textDim, fontSize:11 }} tickLine={false} />
                <YAxis stroke={T.border} tick={{ fill:T.textMuted, fontSize:10 }} tickLine={false} tickFormatter={v=>`${v}Cr`} />
                <Tooltip content={<CTip fmt={v=>`₹${v} Cr`} />} />
                <Bar dataKey="bspCr" name="BSP (Cr)" radius={[6,6,0,0]}>
                  {bhk.map((_,i)=><Cell key={i} fill={CC[(i+2)%CC.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(150px,1fr))', gap:12 }}>
            {bhk.map((d,i) => (
              <GCard key={d.bhk} style={{ padding:'12px 16px' }} glow={CC[i]}>
                <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8 }}>
                  <div style={{ width:8, height:8, borderRadius:2, background:CC[i] }} />
                  <span style={{ fontFamily:'Orbitron, monospace', fontSize:10, color:CC[i] }}>{d.bhk}</span>
                </div>
                <div style={{ display:'flex', justifyContent:'space-between' }}>
                  <div><p style={{ color:T.textMuted, fontSize:10, margin:0 }}>Units</p><p style={{ color:T.text, fontSize:18, fontWeight:700, margin:0, fontFamily:'Orbitron, monospace' }}>{d.units}</p></div>
                  <div style={{ textAlign:'right' }}><p style={{ color:T.textMuted, fontSize:10, margin:0 }}>BSP</p><p style={{ color:T.text, fontSize:13, fontWeight:700, margin:0 }}>{fmtCr(d.bsp)}</p></div>
                </div>
              </GCard>
            ))}
          </div>
        </GCard>

        {/* ═══ TOP 10 DEALS TABLE ═══ */}
        <GCard style={{ padding:24, marginBottom:20 }} glow={T.accentBright}>
          <SH title="Top 10 Deals" sub="Ranked by Total Contract Value" icon="🎯" />
          <div style={{ overflowX:'auto' }}>
            <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
              <thead>
                <tr style={{ borderBottom:`1px solid ${T.border}` }}>
                  {['#','Customer','Project','Unit','Type','TCV','Received','Channel Partner','Date'].map(h => (
                    <th key={h} style={{ padding:'8px 12px', textAlign:'left', color:T.accentBright, fontFamily:'Orbitron, monospace', fontSize:9, letterSpacing:1, fontWeight:600, whiteSpace:'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {top10.map((d,i) => (
                  <tr key={i} className="tr-hover" style={{ borderBottom:`1px solid ${T.border}22` }}>
                    <td style={{ padding:'10px 12px', color:T.accentBright, fontFamily:'Orbitron, monospace', fontSize:11 }}>
                      {i===0?'🥇':i===1?'🥈':i===2?'🥉':`#${i+1}`}
                    </td>
                    <td style={{ padding:'10px 12px', color:T.text, fontWeight:600, maxWidth:180 }}>{d.customer}</td>
                    <td style={{ padding:'10px 12px', color:T.textDim, whiteSpace:'nowrap' }}>{d.project}</td>
                    <td style={{ padding:'10px 12px', color:T.primary, fontFamily:'monospace', fontSize:11 }}>{d.unit}</td>
                    <td style={{ padding:'10px 12px' }}>
                      <span style={{ background:T.border, borderRadius:4, padding:'2px 6px', color:T.textDim, fontSize:10 }}>{d.bhk?.split('+')[0].trim()}</span>
                    </td>
                    <td style={{ padding:'10px 12px', color:T.gold, fontWeight:700, fontFamily:'Orbitron, monospace', fontSize:11, whiteSpace:'nowrap' }}>{fmtCr(d.tcv)}</td>
                    <td style={{ padding:'10px 12px', color:T.green, fontWeight:600, whiteSpace:'nowrap' }}>{fmtCr(d.received)}</td>
                    <td style={{ padding:'10px 12px', color:T.textDim, maxWidth:160, fontSize:11 }}>{d.broker||'—'}</td>
                    <td style={{ padding:'10px 12px', color:T.textMuted, whiteSpace:'nowrap', fontSize:11 }}>{d.date}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </GCard>

        {/* ═══ OPEN BOOKINGS TABLE ═══ */}
        <GCard style={{ padding:24, marginBottom:28 }} glow={T.green}>
          <SH title="Open Bookings / Opportunities" sub="Active bookings — Highest deal value" icon="📂" />
          <div style={{ overflowX:'auto' }}>
            <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
              <thead>
                <tr style={{ borderBottom:`1px solid ${T.border}` }}>
                  {['Customer','Project','Unit','Type','BSP','Demand','Received','Balance','Funding','Broker','Date'].map(h => (
                    <th key={h} style={{ padding:'8px 12px', textAlign:'left', color:T.green, fontFamily:'Orbitron, monospace', fontSize:9, letterSpacing:1, fontWeight:600, whiteSpace:'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {openBkg.map((b,i) => {
                  const bal = (b.demand||0)-(b.received||0);
                  const pct = b.demand>0?Math.round((b.received/b.demand)*100):0;
                  return (
                    <tr key={i} className="tr-hover" style={{ borderBottom:`1px solid ${T.border}22` }}>
                      <td style={{ padding:'10px 12px', color:T.text, fontWeight:600, maxWidth:160 }}>{b.customer}</td>
                      <td style={{ padding:'10px 12px', color:T.textDim, whiteSpace:'nowrap', fontSize:11 }}>{b.project}</td>
                      <td style={{ padding:'10px 12px', color:T.primary, fontFamily:'monospace', fontSize:11 }}>{b.unit}</td>
                      <td style={{ padding:'10px 12px' }}>
                        <span style={{ background:T.border, borderRadius:4, padding:'2px 6px', color:T.textDim, fontSize:10 }}>{b.bhk?.split('+')[0].trim()}</span>
                      </td>
                      <td style={{ padding:'10px 12px', color:T.accentBright, fontWeight:700, whiteSpace:'nowrap' }}>{fmtCr(b.bsp)}</td>
                      <td style={{ padding:'10px 12px', color:T.gold, whiteSpace:'nowrap' }}>{fmtCr(b.demand)}</td>
                      <td style={{ padding:'10px 12px', color:T.green, whiteSpace:'nowrap' }}>{fmtCr(b.received)}</td>
                      <td style={{ padding:'10px 12px', whiteSpace:'nowrap' }}>
                        <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                          <div style={{ width:44, height:4, background:T.border, borderRadius:2 }}>
                            <div style={{ width:`${pct}%`, height:'100%', background:pct>80?T.green:pct>50?T.gold:T.red, borderRadius:2 }} />
                          </div>
                          <span style={{ color:bal>0?T.red:T.green, fontSize:11 }}>{fmtCr(Math.abs(bal))}</span>
                        </div>
                      </td>
                      <td style={{ padding:'10px 12px' }}>
                        <span style={{ background:b.loanStatus==='BANK FUNDED'?`${T.primary}22`:`${T.accentBright}22`, border:`1px solid ${b.loanStatus==='BANK FUNDED'?T.primary:T.accentBright}44`, borderRadius:4, padding:'2px 6px', color:b.loanStatus==='BANK FUNDED'?T.primary:T.accentBright, fontSize:10 }}>
                          {b.loanStatus==='BANK FUNDED'?'🏦 Bank':'💼 Self'}
                        </span>
                      </td>
                      <td style={{ padding:'10px 12px', color:T.textMuted, fontSize:11, maxWidth:150 }}>{b.broker||'—'}</td>
                      <td style={{ padding:'10px 12px', color:T.textMuted, whiteSpace:'nowrap', fontSize:11 }}>{b.date}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </GCard>

        {/* FOOTER */}
        <div style={{ borderTop:`1px solid ${T.border}`, paddingTop:20, display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:12 }}>
          <div style={{ display:'flex', gap:12, flexWrap:'wrap' }}>
            <Chip label="Source" value="DAPP Report" color={T.primary} />
            <Chip label="Inventory" value="SKYARC INVR" color={T.accentBright} />
            <Chip label="Active Bookings" value={kpi.activeBookings?.toLocaleString('en-IN')} color={T.green} />
            <Chip label="Total Units" value={kpi.totalUnits?.toLocaleString('en-IN')} color={T.gold} />
          </div>
          <div style={{ color:T.textMuted, fontSize:10, fontFamily:'Orbitron, monospace', letterSpacing:2 }}>SKYARC NEXUS v2.0 · SMARTWORLD GROUP</div>
        </div>
      </div>
    </div>
  );
}
