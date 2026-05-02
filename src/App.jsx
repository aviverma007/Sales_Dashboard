import React, { useState, useMemo, useCallback } from 'react';
import { DASHBOARD_DATA as RAW } from './dashboardData';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  RadialBarChart, RadialBar
} from 'recharts';

// ─── VIVID ELECTRIC THEME ────────────────────────────────────────────────────
const T = {
  bg:       '#04071a',
  surface:  '#080e2a',
  card:     '#0a1235',
  cardH:    '#0e183f',
  border:   '#1a2a6c',
  borderH:  '#3a5aff',
  cyan:     '#00f0ff',
  violet:   '#a855f7',
  lime:     '#39ff14',
  amber:    '#ffcc00',
  pink:     '#ff2d78',
  orange:   '#ff7700',
  blue:     '#3a8eff',
  text:     '#e8f4ff',
  textMid:  '#8ab0d0',
  textDim:  '#3a5a7a',
};
const CC = [T.cyan, T.violet, T.lime, T.amber, T.pink, T.orange, T.blue, '#c084fc'];

// ─── UTILS ───────────────────────────────────────────────────────────────────
const fmtCr = (v) => {
  if (!v || isNaN(v)) return '₹0 Cr';
  const cr = v / 1e7;
  if (cr >= 1000) return `₹${(cr/1000).toFixed(1)}K Cr`;
  if (cr >= 100)  return `₹${cr.toFixed(0)} Cr`;
  return `₹${cr.toFixed(1)} Cr`;
};
const fmtML = (m) => {
  if (!m) return '';
  const [yr, mo] = m.split('-');
  const mn = ['','Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${mn[+mo]}'${yr.slice(2)}`;
};
const pct = (a, b) => b > 0 ? Math.round((a / b) * 100) : 0;

// ─── TOOLTIP ─────────────────────────────────────────────────────────────────
const CTip = ({ active, payload, label, fmt }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background:'#0a1235', border:`1px solid ${T.borderH}`, borderRadius:10, padding:'10px 14px', boxShadow:`0 0 24px ${T.cyan}44`, fontFamily:'Rajdhani,sans-serif' }}>
      <p style={{ color:T.cyan, fontFamily:'Orbitron,monospace', fontSize:10, marginBottom:6, letterSpacing:1 }}>{label}</p>
      {payload.map((p,i) => (
        <p key={i} style={{ color:p.color||T.text, fontSize:12, margin:'2px 0' }}>
          <span style={{ color:T.textDim }}>{p.name}: </span>
          {fmt ? fmt(p.value,p.name) : (typeof p.value==='number' ? p.value.toLocaleString('en-IN') : p.value)}
        </p>
      ))}
    </div>
  );
};

// ─── GLOW CARD ───────────────────────────────────────────────────────────────
const GC = ({ children, glow=T.cyan, style={}, cls='' }) => {
  const [h, sH] = useState(false);
  return (
    <div className={cls} onMouseEnter={()=>sH(true)} onMouseLeave={()=>sH(false)} style={{
      background: h ? T.cardH : T.card,
      border: `1px solid ${h ? glow : T.border}`,
      borderRadius:18,
      boxShadow: h ? `0 0 35px ${glow}44, 0 4px 40px ${glow}18, inset 0 1px 0 ${glow}30` : `0 2px 20px rgba(0,0,0,0.6)`,
      position:'relative', overflow:'hidden',
      transition:'all 0.3s cubic-bezier(0.4,0,0.2,1)', ...style
    }}>
      <div style={{ position:'absolute', top:0, left:0, right:0, height:2, background:`linear-gradient(90deg,transparent,${glow}${h?'cc':'55'},transparent)`, transition:'all 0.3s' }} />
      <div style={{ position:'absolute', top:0, right:0, width:80, height:80, background:`radial-gradient(circle at 80% 0%, ${glow}18, transparent 70%)` }} />
      {children}
    </div>
  );
};

// ─── SECTION HEADER ──────────────────────────────────────────────────────────
const SH = ({ title, sub, icon, color=T.cyan }) => (
  <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:18 }}>
    {icon && <span style={{ fontSize:18 }}>{icon}</span>}
    <div>
      <h2 style={{ fontFamily:'Orbitron,monospace', fontSize:12, fontWeight:700, letterSpacing:3, color, textTransform:'uppercase', margin:0 }}>{title}</h2>
      {sub && <p style={{ color:T.textMid, fontSize:11, margin:'2px 0 0' }}>{sub}</p>}
    </div>
    <div style={{ flex:1, height:1, background:`linear-gradient(90deg,${color}66,transparent)`, marginLeft:10 }} />
  </div>
);

// ─── FILTER SELECT ───────────────────────────────────────────────────────────
const FSel = ({ label, options, value, onChange }) => (
  <div style={{ display:'flex', flexDirection:'column', gap:3 }}>
    <label style={{ color:T.textMid, fontSize:9, fontFamily:'Orbitron,monospace', letterSpacing:1.5, textTransform:'uppercase' }}>{label}</label>
    <select value={value} onChange={e=>onChange(e.target.value)} style={{
      background:T.surface, border:`1px solid ${value?T.cyan:T.border}`, borderRadius:8,
      color:value?T.cyan:T.textMid, padding:'7px 12px', fontSize:12, fontFamily:'Rajdhani,sans-serif',
      minWidth:140, cursor:'pointer', outline:'none', appearance:'none',
      boxShadow: value ? `0 0 10px ${T.cyan}44` : 'none', transition:'all 0.2s',
    }}>
      <option value="">All {label}s</option>
      {options.map(o=><option key={o} value={o}>{o}</option>)}
    </select>
  </div>
);

// ─── STAT CHIP ───────────────────────────────────────────────────────────────
const Chip = ({ label, value, color=T.cyan }) => (
  <div style={{ display:'inline-flex', alignItems:'center', gap:6, background:`${color}18`, border:`1px solid ${color}44`, borderRadius:20, padding:'3px 10px' }}>
    <div style={{ width:6, height:6, borderRadius:'50%', background:color, boxShadow:`0 0 6px ${color}` }} />
    <span style={{ color:T.textMid, fontSize:10 }}>{label}:</span>
    <span style={{ color, fontSize:11, fontWeight:700, fontFamily:'Orbitron,monospace' }}>{value}</span>
  </div>
);

// ─── MINI SPARK ──────────────────────────────────────────────────────────────
const Spark = ({ data, dataKey, color }) => (
  <ResponsiveContainer width="100%" height={40}>
    <AreaChart data={data}>
      <defs><linearGradient id={`sp${color.replace('#','')}`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="5%" stopColor={color} stopOpacity={0.4}/>
        <stop offset="95%" stopColor={color} stopOpacity={0}/>
      </linearGradient></defs>
      <Area type="monotone" dataKey={dataKey} stroke={color} fill={`url(#sp${color.replace('#','')})`} strokeWidth={2} dot={false} />
    </AreaChart>
  </ResponsiveContainer>
);

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN APP
// ═══════════════════════════════════════════════════════════════════════════════
export default function App() {
  const [filters, setFilters] = useState({ year:'', month:'', company:'', project:'', paymentPlan:'' });
  const sf = useCallback((k,v) => setFilters(p=>({...p,[k]:v})), []);
  const fo = RAW.filterOptions || {};
  const kpi = RAW.kpi || {};

  // ── Monthly Trend (PDRN bookings) ────────────────────────────────────────
  const monthly = useMemo(() => {
    let d = RAW.monthlyTrend || [];
    if (filters.year) d = d.filter(x=>x.month.startsWith(filters.year));
    if (filters.month) {
      const mn = String(['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'].indexOf(filters.month)+1).padStart(2,'0');
      d = d.filter(x=>x.month.endsWith(`-${mn}`));
    }
    return d.map(x=>({ ...x, label:fmtML(x.month), bspCr:+(x.bsp/1e7).toFixed(1), demCr:+(x.demand/1e7).toFixed(1), recCr:+(x.received/1e7).toFixed(1) }));
  }, [filters.year, filters.month]);

  // ── DAPP Monthly ─────────────────────────────────────────────────────────
  const dappMonthly = useMemo(() => {
    let d = RAW.dappMonthly || [];
    if (filters.year) d = d.filter(x=>x.BillMonth?.startsWith(filters.year));
    return d.map(x=>({ ...x, label:fmtML(x.BillMonth), demCr:+(x.demand/1e7).toFixed(1), recCr:+(x.received/1e7).toFixed(1), outCr:+(x.outstanding/1e7).toFixed(1) }));
  }, [filters.year]);

  // ── Booking vs Cancelled ─────────────────────────────────────────────────
  const bvc = useMemo(() => {
    const am={}, cm={};
    (RAW.bookingVsCancelled?.activeByMonth||[]).forEach(d=>{am[d.month]=d.count;});
    (RAW.bookingVsCancelled?.cancelledByMonth||[]).forEach(d=>{cm[d.month]=d.count;});
    let rows = Array.from(new Set([...Object.keys(am),...Object.keys(cm)])).sort().map(m=>({ month:m, label:fmtML(m), booked:am[m]||0, cancelled:cm[m]||0 }));
    if (filters.year) rows = rows.filter(r=>r.month.startsWith(filters.year));
    return rows;
  }, [filters.year]);

  // ── Project filter ────────────────────────────────────────────────────────
  const byProject = useMemo(() => {
    let d = RAW.salesByProject || [];
    if (filters.project) d = d.filter(x=>x.name===filters.project);
    return d.map(x=>({...x, bspCr:+(x.bsp/1e7).toFixed(1)}));
  }, [filters.project]);

  const topCP   = useMemo(() => (RAW.topCP||[]).map(x=>({...x,bspCr:+(x.bsp/1e7).toFixed(1)})), []);
  const bhk     = useMemo(() => (RAW.bhkSales||[]).map(x=>({...x,bspCr:+(x.bsp/1e7).toFixed(1)})), []);
  const dappProj = useMemo(() => (RAW.dappByProject||[]).map(x=>({...x, demCr:+(x.demand/1e7).toFixed(1), recCr:+(x.received/1e7).toFixed(1), outCr:+(x.outstanding/1e7).toFixed(1)})), []);

  const top10 = useMemo(() => {
    let d = RAW.top10Deals||[];
    if (filters.company) d = d.filter(x=>x.company===filters.company);
    if (filters.project) d = d.filter(x=>x.project===filters.project);
    return d.slice(0,10);
  }, [filters.company, filters.project]);

  const openBkg = useMemo(() => {
    let d = RAW.openBookings||[];
    if (filters.company) d = d.filter(x=>x.company===filters.company);
    if (filters.project) d = d.filter(x=>x.project===filters.project);
    return d.slice(0,20);
  }, [filters.company, filters.project]);

  const pendingWF = RAW.workflowPending || [];
  const tgtAch = pct(kpi.dappReceived, kpi.dappDemand);
  const collRate = pct(kpi.totalReceived, kpi.totalSales);

  // ── Spark data last 8 months ──────────────────────────────────────────────
  const last8 = monthly.slice(-8);
  const dappLast8 = dappMonthly.slice(-8);

  return (
    <div style={{ minHeight:'100vh', background:T.bg, fontFamily:'Rajdhani,sans-serif', color:T.text }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;500;600;700;900&family=Rajdhani:wght@300;400;500;600;700&display=swap');
        *{box-sizing:border-box;scrollbar-width:thin;scrollbar-color:#1a2a6c #04071a}
        ::-webkit-scrollbar{width:5px;height:5px}::-webkit-scrollbar-track{background:#04071a}::-webkit-scrollbar-thumb{background:#1a2a6c;border-radius:3px}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.3}}
        @keyframes grid{0%{background-position:0 0}100%{background-position:40px 40px}}
        @keyframes scanline{0%{top:-100%}100%{top:200%}}
        .kc{transition:transform 0.3s ease}.kc:hover{transform:translateY(-4px)}
        .tr:hover{background:rgba(0,240,255,0.04)!important}
        select option{background:#0a1235;color:#e8f4ff}
        .gtxt{background:linear-gradient(135deg,#00f0ff,#a855f7);-webkit-background-clip:text;-webkit-text-fill-color:transparent}
        .atxt{background:linear-gradient(135deg,#ffcc00,#ff7700);-webkit-background-clip:text;-webkit-text-fill-color:transparent}
        .badge{display:inline-flex;align-items:center;padding:2px 8px;border-radius:12px;font-size:10px;font-weight:600}
      `}</style>

      {/* BG Effects */}
      <div style={{ position:'fixed', inset:0, pointerEvents:'none', zIndex:0,
        backgroundImage:`linear-gradient(rgba(0,240,255,0.025) 1px,transparent 1px),linear-gradient(90deg,rgba(0,240,255,0.025) 1px,transparent 1px)`,
        backgroundSize:'40px 40px', animation:'grid 10s linear infinite' }} />
      <div style={{ position:'fixed', inset:0, pointerEvents:'none', zIndex:0,
        background:'radial-gradient(ellipse 80% 50% at 50% -20%, rgba(58,90,255,0.15), transparent)' }} />

      {/* ── HEADER ── */}
      <header style={{ position:'sticky', top:0, zIndex:100, background:`${T.surface}f0`, backdropFilter:'blur(24px)', borderBottom:`1px solid ${T.border}`, padding:'0 32px' }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', height:62 }}>
          <div style={{ display:'flex', alignItems:'center', gap:14 }}>
            <div style={{ width:40, height:40, borderRadius:12, background:'linear-gradient(135deg,#00f0ff,#7b2fff)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:20, boxShadow:'0 0 20px rgba(0,240,255,0.5)', flexShrink:0 }}>⬡</div>
            <div>
              <div className="gtxt" style={{ fontFamily:'Orbitron,monospace', fontWeight:900, fontSize:15, letterSpacing:3 }}>SKYARC NEXUS</div>
              <div style={{ color:T.textMid, fontSize:9, letterSpacing:2 }}>SALES INTELLIGENCE PLATFORM v2.0 · ALL DATA LIVE</div>
            </div>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:28 }}>
            <div style={{ display:'flex', gap:12 }}>
              <span className="badge" style={{ background:`${T.cyan}22`, border:`1px solid ${T.cyan}44`, color:T.cyan }}>INVR</span>
              <span className="badge" style={{ background:`${T.violet}22`, border:`1px solid ${T.violet}44`, color:T.violet }}>PDRN</span>
              <span className="badge" style={{ background:`${T.amber}22`, border:`1px solid ${T.amber}44`, color:T.amber }}>DAPP</span>
              <span className="badge" style={{ background:`${T.lime}22`, border:`1px solid ${T.lime}44`, color:T.lime }}>WORKFLOW</span>
            </div>
            <div style={{ display:'flex', alignItems:'center', gap:6 }}>
              <div style={{ width:8, height:8, borderRadius:'50%', background:T.lime, boxShadow:`0 0 10px ${T.lime}`, animation:'pulse 2s ease infinite' }} />
              <span style={{ color:T.textMid, fontSize:10, fontFamily:'Orbitron,monospace', letterSpacing:1 }}>LIVE</span>
            </div>
            <div style={{ color:T.textMid, fontSize:11, fontFamily:'Orbitron,monospace' }}>{new Date().toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'})}</div>
          </div>
        </div>
      </header>

      <div style={{ position:'relative', zIndex:1, padding:'24px 32px', maxWidth:1800, margin:'0 auto' }}>

        {/* ── FILTERS ── */}
        <GC style={{ padding:'14px 24px', marginBottom:26, background:`${T.surface}cc` }}>
          <div style={{ display:'flex', alignItems:'flex-end', gap:20, flexWrap:'wrap' }}>
            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
              <span style={{ color:T.cyan, fontSize:18 }}>⚡</span>
              <span style={{ fontFamily:'Orbitron,monospace', fontSize:11, color:T.cyan, letterSpacing:2 }}>FILTERS</span>
            </div>
            <FSel label="Year"         options={(fo.years||[]).map(String)} value={filters.year}        onChange={v=>sf('year',v)} />
            <FSel label="Month"        options={fo.months||[]}              value={filters.month}       onChange={v=>sf('month',v)} />
            <FSel label="Company"      options={fo.companies||[]}           value={filters.company}     onChange={v=>sf('company',v)} />
            <FSel label="Project"      options={fo.projects||[]}            value={filters.project}     onChange={v=>sf('project',v)} />
            <FSel label="Payment Plan" options={fo.paymentPlans||[]}        value={filters.paymentPlan} onChange={v=>sf('paymentPlan',v)} />
            {Object.values(filters).some(Boolean) && (
              <button onClick={()=>setFilters({year:'',month:'',company:'',project:'',paymentPlan:''})}
                style={{ background:`${T.pink}22`, border:`1px solid ${T.pink}55`, borderRadius:8, color:T.pink, padding:'7px 16px', fontSize:12, cursor:'pointer', fontFamily:'Orbitron,monospace', letterSpacing:1, transition:'all 0.2s' }}>
                ✕ RESET
              </button>
            )}
          </div>
        </GC>

        {/* ══════════════════════════════════════════════════════════════
            KPI ROW 1 — INVENTORY + SALES + DEMAND + RECEIVED
        ══════════════════════════════════════════════════════════════ */}
        <div style={{ display:'grid', gridTemplateColumns:'2fr 1fr 1fr 1fr', gap:16, marginBottom:16 }}>

          {/* 1. Total Units Pie */}
          <GC glow={T.cyan} style={{ padding:22 }} cls="kc">
            <div style={{ display:'flex', gap:16, alignItems:'center' }}>
              <div style={{ flex:1 }}>
                <p style={{ color:T.textMid, fontSize:9, fontFamily:'Orbitron,monospace', letterSpacing:2, margin:'0 0 6px' }}>TOTAL UNITS INVENTORY</p>
                <p style={{ fontFamily:'Orbitron,monospace', fontSize:34, fontWeight:900, margin:0 }} className="gtxt">{kpi.totalUnits?.toLocaleString('en-IN')}</p>
                <div style={{ display:'flex', flexDirection:'column', gap:5, marginTop:12 }}>
                  <Chip label="Booked"      value={kpi.bookedUnits?.toLocaleString('en-IN')} color={T.lime} />
                  <Chip label="Available"   value={kpi.availableUnits?.toLocaleString('en-IN')} color={T.cyan} />
                  <Chip label="In Progress" value={kpi.inProgressUnits} color={T.amber} />
                </div>
              </div>
              <div style={{ width:150, height:150 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={[{name:'Booked',value:kpi.bookedUnits},{name:'Available',value:kpi.availableUnits},{name:'In Progress',value:kpi.inProgressUnits||1}]}
                      cx="50%" cy="50%" innerRadius={42} outerRadius={62} paddingAngle={4} dataKey="value" strokeWidth={0}>
                      <Cell fill={T.lime}/><Cell fill={T.cyan}/><Cell fill={T.amber}/>
                    </Pie>
                    <Tooltip content={<CTip />} />
                    <Legend iconType="circle" iconSize={7} wrapperStyle={{ fontSize:10, color:T.textMid }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </GC>

          {/* 2. Total Sales */}
          <GC glow={T.violet} style={{ padding:22 }} cls="kc">
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
              <p style={{ color:T.textMid, fontSize:9, fontFamily:'Orbitron,monospace', letterSpacing:2, margin:0 }}>TOTAL SALES</p>
              <div style={{ width:38, height:38, borderRadius:10, background:`${T.violet}25`, border:`1px solid ${T.violet}55`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:18 }}>💎</div>
            </div>
            <p style={{ fontFamily:'Orbitron,monospace', fontSize:22, fontWeight:900, color:T.violet, margin:'10px 0 2px' }}>{fmtCr(kpi.totalSales)}</p>
            <p style={{ color:T.textMid, fontSize:11, margin:'0 0 10px' }}>Net BSP — Active Bookings</p>
            <Spark data={last8} dataKey="bspCr" color={T.violet} />
          </GC>

          {/* 3. Total Demand (DAPP) */}
          <GC glow={T.amber} style={{ padding:22 }} cls="kc">
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
              <p style={{ color:T.textMid, fontSize:9, fontFamily:'Orbitron,monospace', letterSpacing:2, margin:0 }}>TOTAL DEMAND</p>
              <div style={{ width:38, height:38, borderRadius:10, background:`${T.amber}25`, border:`1px solid ${T.amber}55`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:18 }}>📋</div>
            </div>
            <p style={{ fontFamily:'Orbitron,monospace', fontSize:22, fontWeight:900, color:T.amber, margin:'10px 0 2px' }}>{fmtCr(kpi.dappDemand)}</p>
            <p style={{ color:T.textMid, fontSize:11, margin:'0 0 10px' }}>Demands Raised (DAPP)</p>
            <Spark data={dappLast8} dataKey="demCr" color={T.amber} />
          </GC>

          {/* 4. Total Received */}
          <GC glow={T.lime} style={{ padding:22 }} cls="kc">
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
              <p style={{ color:T.textMid, fontSize:9, fontFamily:'Orbitron,monospace', letterSpacing:2, margin:0 }}>TOTAL RECEIVED</p>
              <div style={{ width:38, height:38, borderRadius:10, background:`${T.lime}25`, border:`1px solid ${T.lime}55`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:18 }}>💰</div>
            </div>
            <p style={{ fontFamily:'Orbitron,monospace', fontSize:22, fontWeight:900, color:T.lime, margin:'10px 0 2px' }}>{fmtCr(kpi.dappReceived)}</p>
            <p style={{ color:T.textMid, fontSize:11, margin:'0 0 10px' }}>Collections (DAPP)</p>
            <Spark data={dappLast8} dataKey="recCr" color={T.lime} />
          </GC>
        </div>

        {/* ── KPI ROW 2 — TARGET + OUTSTANDING + PIPELINE + WORKFLOW ── */}
        <div style={{ display:'grid', gridTemplateColumns:'1.4fr 1fr 1fr 1fr', gap:16, marginBottom:26 }}>

          {/* 5. Target Achievement */}
          <GC glow={T.orange} style={{ padding:22 }} cls="kc">
            <p style={{ color:T.textMid, fontSize:9, fontFamily:'Orbitron,monospace', letterSpacing:2, margin:'0 0 14px' }}>TARGET ACHIEVEMENT (DAPP)</p>
            <div style={{ display:'flex', alignItems:'center', gap:16 }}>
              <div style={{ position:'relative', width:90, height:90, flexShrink:0 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <RadialBarChart cx="50%" cy="50%" innerRadius="55%" outerRadius="100%" startAngle={90} endAngle={-270} data={[{value:tgtAch}]}>
                    <RadialBar background={{fill:`${T.orange}18`}} dataKey="value" fill={tgtAch>80?T.lime:tgtAch>50?T.amber:T.pink} cornerRadius={5} />
                  </RadialBarChart>
                </ResponsiveContainer>
                <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center' }}>
                  <span style={{ fontFamily:'Orbitron,monospace', fontSize:14, fontWeight:900, color:tgtAch>80?T.lime:tgtAch>50?T.amber:T.pink }}>{tgtAch}%</span>
                </div>
              </div>
              <div style={{ flex:1 }}>
                <p style={{ fontSize:11, color:T.textMid, margin:'0 0 8px' }}>Demand Raised vs. Collected</p>
                <div style={{ display:'flex', flexDirection:'column', gap:5 }}>
                  <Chip label="Demand"   value={fmtCr(kpi.dappDemand)}   color={T.amber} />
                  <Chip label="Received" value={fmtCr(kpi.dappReceived)} color={T.lime} />
                  <Chip label="Pending"  value={fmtCr(kpi.dappOutstanding)} color={T.pink} />
                </div>
              </div>
            </div>
          </GC>

          {/* 6. Outstanding */}
          <GC glow={T.pink} style={{ padding:22 }} cls="kc">
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
              <p style={{ color:T.textMid, fontSize:9, fontFamily:'Orbitron,monospace', letterSpacing:2, margin:0 }}>OUTSTANDING</p>
              <span style={{ fontSize:20 }}>⚠️</span>
            </div>
            <p style={{ fontFamily:'Orbitron,monospace', fontSize:22, fontWeight:900, color:T.pink, margin:'10px 0 2px' }}>{fmtCr(kpi.dappOutstanding)}</p>
            <p style={{ color:T.textMid, fontSize:11, margin:'0 0 8px' }}>Pending collection</p>
            <div style={{ width:'100%', height:6, background:T.border, borderRadius:3 }}>
              <div style={{ width:`${pct(kpi.dappReceived,kpi.dappDemand)}%`, height:'100%', background:`linear-gradient(90deg,${T.lime},${T.cyan})`, borderRadius:3 }} />
            </div>
            <p style={{ color:T.textDim, fontSize:10, marginTop:4 }}>{pct(kpi.dappReceived,kpi.dappDemand)}% collected</p>
          </GC>

          {/* 7. Pipeline Bookings */}
          <GC glow={T.cyan} style={{ padding:22 }} cls="kc">
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
              <p style={{ color:T.textMid, fontSize:9, fontFamily:'Orbitron,monospace', letterSpacing:2, margin:0 }}>PIPELINE</p>
              <span style={{ fontSize:20 }}>⏳</span>
            </div>
            <p style={{ fontFamily:'Orbitron,monospace', fontSize:34, fontWeight:900, color:T.cyan, margin:'8px 0 4px' }}>{kpi.pipelineBookings}</p>
            <p style={{ color:T.textMid, fontSize:11, margin:'0 0 8px' }}>Pending Workflow</p>
            <Chip label="Active"    value={kpi.activeBookings?.toLocaleString('en-IN')} color={T.lime} />
          </GC>

          {/* 8. Workflow Status */}
          <GC glow={T.blue} style={{ padding:22 }} cls="kc">
            <p style={{ color:T.textMid, fontSize:9, fontFamily:'Orbitron,monospace', letterSpacing:2, margin:'0 0 12px' }}>WORKFLOW STATUS</p>
            <div style={{ height:90 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={[{name:'Approved',value:kpi.wfApproved},{name:'Pending',value:kpi.wfPending},{name:'Rejected',value:kpi.wfRejected}]}
                    cx="40%" cy="50%" innerRadius={28} outerRadius={42} paddingAngle={3} dataKey="value" strokeWidth={0}>
                    <Cell fill={T.lime}/><Cell fill={T.amber}/><Cell fill={T.pink}/>
                  </Pie>
                  <Tooltip content={<CTip />} />
                  <Legend iconType="circle" iconSize={7} wrapperStyle={{ fontSize:9, color:T.textMid }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginTop:4 }}>
              <Chip label="✓" value={kpi.wfApproved} color={T.lime} />
              <Chip label="⏳" value={kpi.wfPending} color={T.amber} />
              <Chip label="✕" value={kpi.wfRejected} color={T.pink} />
            </div>
          </GC>
        </div>

        {/* ══════════════════════════════════════════════════════════════
            CHARTS ROW 1: Monthly Sales Trend + DAPP Demand vs Collection
        ══════════════════════════════════════════════════════════════ */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:20, marginBottom:20 }}>

          <GC glow={T.cyan} style={{ padding:24 }}>
            <SH title="Monthly Sales Trend" sub="BSP · Demand · Collections — ₹ Crores (PDRN)" icon="📈" />
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={monthly} margin={{top:10,right:10,bottom:24,left:0}}>
                <defs>
                  {[['ga',T.cyan],['gb',T.amber],['gc',T.lime]].map(([id,c])=>(
                    <linearGradient key={id} id={id} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={c} stopOpacity={0.3}/><stop offset="95%" stopColor={c} stopOpacity={0}/>
                    </linearGradient>
                  ))}
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={T.border} vertical={false} />
                <XAxis dataKey="label" stroke={T.border} tick={{fill:T.textDim,fontSize:9}} tickLine={false} interval={2} angle={-30} dy={8} />
                <YAxis stroke={T.border} tick={{fill:T.textDim,fontSize:10}} tickLine={false} tickFormatter={v=>`${v}Cr`} />
                <Tooltip content={<CTip fmt={v=>`₹${v} Cr`} />} />
                <Legend wrapperStyle={{color:T.textMid,fontSize:11}} />
                <Area type="monotone" dataKey="bspCr"  name="Sales (BSP)"  stroke={T.cyan}  fill="url(#ga)" strokeWidth={2} dot={false} activeDot={{r:4,fill:T.cyan}} />
                <Area type="monotone" dataKey="demCr"  name="Demand"       stroke={T.amber} fill="url(#gb)" strokeWidth={2} dot={false} activeDot={{r:4,fill:T.amber}} />
                <Area type="monotone" dataKey="recCr"  name="Received"     stroke={T.lime}  fill="url(#gc)" strokeWidth={2} dot={false} activeDot={{r:4,fill:T.lime}} />
              </AreaChart>
            </ResponsiveContainer>
          </GC>

          <GC glow={T.amber} style={{ padding:24 }}>
            <SH title="DAPP — Demand vs. Collection" sub="Monthly: Demand Raised · Received · Outstanding (₹Cr)" icon="🧾" color={T.amber} />
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={dappMonthly} margin={{top:10,right:10,bottom:24,left:0}}>
                <CartesianGrid strokeDasharray="3 3" stroke={T.border} vertical={false} />
                <XAxis dataKey="label" stroke={T.border} tick={{fill:T.textDim,fontSize:9}} tickLine={false} interval={2} angle={-30} dy={8} />
                <YAxis stroke={T.border} tick={{fill:T.textDim,fontSize:10}} tickLine={false} tickFormatter={v=>`${v}Cr`} />
                <Tooltip content={<CTip fmt={v=>`₹${v} Cr`} />} />
                <Legend wrapperStyle={{color:T.textMid,fontSize:11}} />
                <Bar dataKey="demCr"  name="Demand"      fill={T.amber} radius={[3,3,0,0]} opacity={0.85} />
                <Bar dataKey="recCr"  name="Received"    fill={T.lime}  radius={[3,3,0,0]} opacity={0.85} />
                <Bar dataKey="outCr"  name="Outstanding" fill={T.pink}  radius={[3,3,0,0]} opacity={0.85} />
              </BarChart>
            </ResponsiveContainer>
          </GC>
        </div>

        {/* ══════════════════════════════════════════════════════════════
            CHARTS ROW 2: Sales by Channel + Top CP-10
        ══════════════════════════════════════════════════════════════ */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1.4fr', gap:20, marginBottom:20 }}>

          <GC glow={T.violet} style={{ padding:24 }}>
            <SH title="Sales by Channel" sub="Project-wise Unit Distribution" icon="🔀" color={T.violet} />
            <ResponsiveContainer width="100%" height={270}>
              <PieChart>
                <Pie data={byProject} cx="45%" cy="46%" outerRadius={95} innerRadius={48} paddingAngle={3} dataKey="units" nameKey="name"
                  label={({name,percent})=>`${name?.split(' ').pop()} ${(percent*100).toFixed(0)}%`}
                  labelLine={{stroke:T.borderH, strokeWidth:1}} strokeWidth={0}>
                  {byProject.map((_,i)=><Cell key={i} fill={CC[i%CC.length]} />)}
                </Pie>
                <Tooltip content={<CTip fmt={(v,n)=>n==='bspCr'?`₹${v} Cr`:v?.toLocaleString?.('en-IN')} />} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{fontSize:10,color:T.textMid}} />
              </PieChart>
            </ResponsiveContainer>
          </GC>

          <GC glow={T.amber} style={{ padding:24 }}>
            <SH title="Sales by Top CP-10" sub="Channel Partners by Units Booked" icon="🏆" color={T.amber} />
            <ResponsiveContainer width="100%" height={270}>
              <BarChart data={topCP} layout="vertical" margin={{top:0,right:30,bottom:0,left:0}}>
                <CartesianGrid strokeDasharray="3 3" stroke={T.border} horizontal={false} />
                <XAxis type="number" stroke={T.border} tick={{fill:T.textDim,fontSize:10}} tickLine={false} />
                <YAxis type="category" dataKey="name" stroke={T.border} tick={{fill:T.textMid,fontSize:10}} tickLine={false} width={150} tickFormatter={v=>v?.length>22?v.slice(0,22)+'…':v} />
                <Tooltip content={<CTip fmt={(v,n)=>n==='bspCr'?`₹${v} Cr`:v?.toLocaleString?.('en-IN')} />} />
                <Bar dataKey="units" name="Units" radius={[0,4,4,0]}>
                  {topCP.map((_,i)=><Cell key={i} fill={CC[i%CC.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </GC>
        </div>

        {/* ══════════════════════════════════════════════════════════════
            CHARTS ROW 3: Booking vs Cancelled + DAPP by Project
        ══════════════════════════════════════════════════════════════ */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:20, marginBottom:20 }}>

          <GC glow={T.pink} style={{ padding:24 }}>
            <SH title="Booking vs. Cancelled" sub="Monthly Comparison" icon="📊" color={T.pink} />
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={bvc} margin={{top:10,right:10,bottom:24,left:0}}>
                <CartesianGrid strokeDasharray="3 3" stroke={T.border} vertical={false} />
                <XAxis dataKey="label" stroke={T.border} tick={{fill:T.textDim,fontSize:9}} tickLine={false} angle={-30} dy={8} interval={2} />
                <YAxis stroke={T.border} tick={{fill:T.textDim,fontSize:10}} tickLine={false} />
                <Tooltip content={<CTip />} />
                <Legend wrapperStyle={{color:T.textMid,fontSize:11}} />
                <Bar dataKey="booked"    name="Booked"    fill={T.cyan} radius={[3,3,0,0]} />
                <Bar dataKey="cancelled" name="Cancelled" fill={T.pink} radius={[3,3,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </GC>

          <GC glow={T.lime} style={{ padding:24 }}>
            <SH title="DAPP Collection by Project" sub="Demand · Received · Outstanding — ₹Cr" icon="🏗️" color={T.lime} />
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={dappProj} margin={{top:10,right:10,bottom:0,left:0}}>
                <CartesianGrid strokeDasharray="3 3" stroke={T.border} vertical={false} />
                <XAxis dataKey="name" stroke={T.border} tick={{fill:T.textDim,fontSize:10}} tickLine={false} tickFormatter={v=>v?.split(' ').pop()} />
                <YAxis stroke={T.border} tick={{fill:T.textDim,fontSize:10}} tickLine={false} tickFormatter={v=>`${v}Cr`} />
                <Tooltip content={<CTip fmt={v=>`₹${v} Cr`} />} />
                <Legend wrapperStyle={{color:T.textMid,fontSize:11}} />
                <Bar dataKey="demCr"  name="Demand"      fill={T.amber} radius={[3,3,0,0]} />
                <Bar dataKey="recCr"  name="Received"    fill={T.lime}  radius={[3,3,0,0]} />
                <Bar dataKey="outCr"  name="Outstanding" fill={T.pink}  radius={[3,3,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </GC>
        </div>

        {/* ══════════════════════════════════════════════════════════════
            PRODUCT-WISE SALES (BHK)
        ══════════════════════════════════════════════════════════════ */}
        <GC glow={T.cyan} style={{ padding:24, marginBottom:20 }}>
          <SH title="Product-wise Sales — Unit Type" sub="2BHK / 3BHK / 4BHK+ | Units Sold & BSP" icon="🏢" />
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:20, marginBottom:16 }}>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={bhk} margin={{top:10,right:10,bottom:0,left:0}}>
                <CartesianGrid strokeDasharray="3 3" stroke={T.border} vertical={false} />
                <XAxis dataKey="bhk" stroke={T.border} tick={{fill:T.textMid,fontSize:11}} tickLine={false} />
                <YAxis stroke={T.border} tick={{fill:T.textDim,fontSize:10}} tickLine={false} />
                <Tooltip content={<CTip />} />
                <Bar dataKey="units" name="Units Sold" radius={[6,6,0,0]}>
                  {bhk.map((_,i)=><Cell key={i} fill={CC[i%CC.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={bhk} margin={{top:10,right:10,bottom:0,left:0}}>
                <CartesianGrid strokeDasharray="3 3" stroke={T.border} vertical={false} />
                <XAxis dataKey="bhk" stroke={T.border} tick={{fill:T.textMid,fontSize:11}} tickLine={false} />
                <YAxis stroke={T.border} tick={{fill:T.textDim,fontSize:10}} tickLine={false} tickFormatter={v=>`${v}Cr`} />
                <Tooltip content={<CTip fmt={v=>`₹${v} Cr`} />} />
                <Bar dataKey="bspCr" name="BSP (Cr)" radius={[6,6,0,0]}>
                  {bhk.map((_,i)=><Cell key={i} fill={CC[(i+2)%CC.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(140px,1fr))', gap:12 }}>
            {bhk.map((d,i)=>(
              <GC key={d.bhk} glow={CC[i]} style={{ padding:'12px 16px' }}>
                <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8 }}>
                  <div style={{ width:8, height:8, borderRadius:2, background:CC[i], boxShadow:`0 0 6px ${CC[i]}` }} />
                  <span style={{ fontFamily:'Orbitron,monospace', fontSize:10, color:CC[i] }}>{d.bhk}</span>
                </div>
                <div style={{ display:'flex', justifyContent:'space-between' }}>
                  <div><p style={{ color:T.textDim, fontSize:9, margin:0 }}>Units</p><p style={{ color:T.text, fontSize:20, fontWeight:700, margin:0, fontFamily:'Orbitron,monospace' }}>{d.units}</p></div>
                  <div style={{ textAlign:'right' }}><p style={{ color:T.textDim, fontSize:9, margin:0 }}>BSP</p><p style={{ color:T.text, fontSize:12, fontWeight:700, margin:0 }}>{fmtCr(d.bsp)}</p></div>
                </div>
              </GC>
            ))}
          </div>
        </GC>

        {/* ══════════════════════════════════════════════════════════════
            PIPELINE — PENDING WORKFLOW
        ══════════════════════════════════════════════════════════════ */}
        {pendingWF.length > 0 && (
          <GC glow={T.amber} style={{ padding:24, marginBottom:20 }}>
            <SH title="Pipeline — Pending Workflow" sub="Bookings awaiting approval (Overall Status: PENDING)" icon="⏳" color={T.amber} />
            <div style={{ overflowX:'auto' }}>
              <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
                <thead>
                  <tr style={{ borderBottom:`1px solid ${T.border}` }}>
                    {['Unit','Customer','Project','L1 Status','L2 Status','SO No.','Timestamp'].map(h=>(
                      <th key={h} style={{ padding:'8px 12px', textAlign:'left', color:T.amber, fontFamily:'Orbitron,monospace', fontSize:9, letterSpacing:1, fontWeight:600, whiteSpace:'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {pendingWF.map((r,i)=>(
                    <tr key={i} className="tr" style={{ borderBottom:`1px solid ${T.border}22` }}>
                      <td style={{ padding:'10px 12px', color:T.cyan, fontFamily:'monospace', fontSize:11 }}>{r.unit}</td>
                      <td style={{ padding:'10px 12px', color:T.text, fontWeight:600 }}>{r.customer}</td>
                      <td style={{ padding:'10px 12px', color:T.textMid, whiteSpace:'nowrap', fontSize:11 }}>{r.project}</td>
                      <td style={{ padding:'10px 12px' }}>
                        <span className="badge" style={{ background:r.l1==='APPROVED'?`${T.lime}22`:`${T.amber}22`, border:`1px solid ${r.l1==='APPROVED'?T.lime:T.amber}44`, color:r.l1==='APPROVED'?T.lime:T.amber }}>{r.l1}</span>
                      </td>
                      <td style={{ padding:'10px 12px' }}>
                        <span className="badge" style={{ background:`${T.pink}22`, border:`1px solid ${T.pink}44`, color:T.pink }}>{r.l2}</span>
                      </td>
                      <td style={{ padding:'10px 12px', color:T.textMid, fontFamily:'monospace', fontSize:11 }}>{r.soNo||'—'}</td>
                      <td style={{ padding:'10px 12px', color:T.textDim, fontSize:11 }}>{r.ts ? `${String(r.ts).slice(0,4)}-${String(r.ts).slice(4,6)}-${String(r.ts).slice(6,8)}` : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </GC>
        )}

        {/* ══════════════════════════════════════════════════════════════
            TOP 10 DEALS
        ══════════════════════════════════════════════════════════════ */}
        <GC glow={T.violet} style={{ padding:24, marginBottom:20 }}>
          <SH title="Top 10 Deals" sub="Ranked by Total Contract Value" icon="🎯" color={T.violet} />
          <div style={{ overflowX:'auto' }}>
            <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
              <thead>
                <tr style={{ borderBottom:`1px solid ${T.border}` }}>
                  {['#','Customer','Project','Unit','Type','TCV','Received','Channel Partner','Date'].map(h=>(
                    <th key={h} style={{ padding:'8px 12px', textAlign:'left', color:T.violet, fontFamily:'Orbitron,monospace', fontSize:9, letterSpacing:1, fontWeight:600, whiteSpace:'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {top10.map((d,i)=>(
                  <tr key={i} className="tr" style={{ borderBottom:`1px solid ${T.border}22` }}>
                    <td style={{ padding:'10px 12px', color:T.violet, fontFamily:'Orbitron,monospace', fontSize:11, fontWeight:700 }}>
                      {i===0?'🥇':i===1?'🥈':i===2?'🥉':`#${i+1}`}
                    </td>
                    <td style={{ padding:'10px 12px', color:T.text, fontWeight:600, maxWidth:180 }}>{d.customer}</td>
                    <td style={{ padding:'10px 12px', color:T.textMid, whiteSpace:'nowrap', fontSize:11 }}>{d.project}</td>
                    <td style={{ padding:'10px 12px', color:T.cyan, fontFamily:'monospace', fontSize:11 }}>{d.unit}</td>
                    <td style={{ padding:'10px 12px' }}>
                      <span style={{ background:`${T.border}aa`, borderRadius:4, padding:'2px 6px', color:T.textMid, fontSize:10 }}>{d.bhk?.split('+')[0].trim()}</span>
                    </td>
                    <td style={{ padding:'10px 12px', color:T.amber, fontWeight:700, fontFamily:'Orbitron,monospace', fontSize:11, whiteSpace:'nowrap' }}>{fmtCr(d.tcv)}</td>
                    <td style={{ padding:'10px 12px', color:T.lime, fontWeight:600, whiteSpace:'nowrap' }}>{fmtCr(d.received)}</td>
                    <td style={{ padding:'10px 12px', color:T.textMid, fontSize:11, maxWidth:160 }}>{d.broker||'—'}</td>
                    <td style={{ padding:'10px 12px', color:T.textDim, whiteSpace:'nowrap', fontSize:11 }}>{d.date}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </GC>

        {/* ══════════════════════════════════════════════════════════════
            OPEN BOOKINGS
        ══════════════════════════════════════════════════════════════ */}
        <GC glow={T.lime} style={{ padding:24, marginBottom:28 }}>
          <SH title="Open Bookings / Opportunities" sub="Active — Highest Deal Value" icon="📂" color={T.lime} />
          <div style={{ overflowX:'auto' }}>
            <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
              <thead>
                <tr style={{ borderBottom:`1px solid ${T.border}` }}>
                  {['Customer','Project','Unit','Type','BSP','Demand','Received','Balance','Funding','Broker','Date'].map(h=>(
                    <th key={h} style={{ padding:'8px 12px', textAlign:'left', color:T.lime, fontFamily:'Orbitron,monospace', fontSize:9, letterSpacing:1, fontWeight:600, whiteSpace:'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {openBkg.map((b,i)=>{
                  const bal = (b.demand||0)-(b.received||0);
                  const p = b.demand>0?Math.round((b.received/b.demand)*100):0;
                  return (
                    <tr key={i} className="tr" style={{ borderBottom:`1px solid ${T.border}22` }}>
                      <td style={{ padding:'10px 12px', color:T.text, fontWeight:600, maxWidth:160 }}>{b.customer}</td>
                      <td style={{ padding:'10px 12px', color:T.textMid, whiteSpace:'nowrap', fontSize:11 }}>{b.project}</td>
                      <td style={{ padding:'10px 12px', color:T.cyan, fontFamily:'monospace', fontSize:11 }}>{b.unit}</td>
                      <td style={{ padding:'10px 12px' }}>
                        <span style={{ background:`${T.border}aa`, borderRadius:4, padding:'2px 6px', color:T.textMid, fontSize:10 }}>{b.bhk?.split('+')[0].trim()}</span>
                      </td>
                      <td style={{ padding:'10px 12px', color:T.violet, fontWeight:700, whiteSpace:'nowrap' }}>{fmtCr(b.bsp)}</td>
                      <td style={{ padding:'10px 12px', color:T.amber, whiteSpace:'nowrap' }}>{fmtCr(b.demand)}</td>
                      <td style={{ padding:'10px 12px', color:T.lime, whiteSpace:'nowrap' }}>{fmtCr(b.received)}</td>
                      <td style={{ padding:'10px 12px', whiteSpace:'nowrap' }}>
                        <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                          <div style={{ width:44, height:4, background:T.border, borderRadius:2 }}>
                            <div style={{ width:`${p}%`, height:'100%', background:p>80?T.lime:p>50?T.amber:T.pink, borderRadius:2, transition:'width 0.3s' }} />
                          </div>
                          <span style={{ color:bal>0?T.pink:T.lime, fontSize:11 }}>{fmtCr(Math.abs(bal))}</span>
                        </div>
                      </td>
                      <td style={{ padding:'10px 12px' }}>
                        <span className="badge" style={{ background:b.loanStatus==='BANK FUNDED'?`${T.cyan}22`:`${T.violet}22`, border:`1px solid ${b.loanStatus==='BANK FUNDED'?T.cyan:T.violet}44`, color:b.loanStatus==='BANK FUNDED'?T.cyan:T.violet }}>
                          {b.loanStatus==='BANK FUNDED'?'🏦 Bank':'💼 Self'}
                        </span>
                      </td>
                      <td style={{ padding:'10px 12px', color:T.textDim, fontSize:11, maxWidth:150 }}>{b.broker||'—'}</td>
                      <td style={{ padding:'10px 12px', color:T.textDim, whiteSpace:'nowrap', fontSize:11 }}>{b.date}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </GC>

        {/* FOOTER */}
        <div style={{ borderTop:`1px solid ${T.border}`, paddingTop:20, display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:12 }}>
          <div style={{ display:'flex', gap:10, flexWrap:'wrap' }}>
            <Chip label="INVR"     value={`${kpi.totalUnits?.toLocaleString('en-IN')} units`} color={T.cyan} />
            <Chip label="PDRN"     value={`${kpi.activeBookings?.toLocaleString('en-IN')} bookings`} color={T.violet} />
            <Chip label="DAPP"     value={fmtCr(kpi.dappDemand)} color={T.amber} />
            <Chip label="Workflow" value={`${kpi.wfApproved} approved`} color={T.lime} />
          </div>
          <div style={{ color:T.textDim, fontSize:9, fontFamily:'Orbitron,monospace', letterSpacing:2 }}>SKYARC NEXUS v2.0 · SMARTWORLD GROUP · ALL 4 DATA SOURCES</div>
        </div>
      </div>
    </div>
  );
}
