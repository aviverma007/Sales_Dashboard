import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  RadialBarChart, RadialBar, LineChart, Line
} from 'recharts';

// ─── LIGHT GLASSMORPHIC THEME (matching reference) ───────────────────────────
const T = {
  // Backgrounds
  bg:        'linear-gradient(135deg, #c8dff0 0%, #daeaf7 40%, #e8f4fd 70%, #cfe8f5 100%)',
  glass:     'rgba(255,255,255,0.72)',
  glassHov:  'rgba(255,255,255,0.88)',
  glassDark: 'rgba(255,255,255,0.55)',
  sidebar:   'rgba(255,255,255,0.65)',
  header:    'rgba(255,255,255,0.80)',
  // Borders
  border:    'rgba(255,255,255,0.9)',
  borderSoft:'rgba(180,210,235,0.6)',
  // Text
  textDark:  '#1a2b3c',
  textMid:   '#4a6a8a',
  textLight: '#7a9ab8',
  textWhite: '#ffffff',
  // Accents
  red:       '#e02020',
  redLight:  '#ff4444',
  teal:      '#00b8c8',
  tealLight: '#00d4e8',
  tealDark:  '#008a9a',
  navy:      '#1a3a5c',
  navyMid:   '#2a5080',
  blue:      '#3a7aff',
  green:     '#00c878',
  orange:    '#ff8c00',
  amber:     '#f5a623',
  // Card header dark (teal)
  cardHeaderBg: 'linear-gradient(135deg, #1a4a5c 0%, #006878 100%)',
  redBtnBg:     'linear-gradient(135deg, #c01818 0%, #e02828 100%)',
};

const CC_TEAL = ['#00b8c8','#00d4e8','#008a9a','#006878','#004858','#00c8a8','#00a8d4','#0088b8'];
const CC_MIX  = ['#00b8c8','#e02020','#3a7aff','#f5a623','#00c878','#9b59b6','#ff8c00','#00a8d4'];

// ─── UTILS ────────────────────────────────────────────────────────────────────
const fmtCr  = v => { if(!v||isNaN(v)) return '₹0 Cr'; const c=v/1e7; if(c>=1000) return `₹${(c/1000).toFixed(1)}K Cr`; if(c>=100) return `₹${c.toFixed(0)} Cr`; return `₹${c.toFixed(1)} Cr`; };
const fmtML  = m => { if(!m) return ''; const [yr,mo]=m.split('-'); return `${['','Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][+mo]}'${yr.slice(2)}`; };
const pct    = (a,b) => b>0?Math.round((a/b)*100):0;

// ─── TOOLTIP ─────────────────────────────────────────────────────────────────
const CTip = ({ active, payload, label, fmt }) => {
  if (!active||!payload?.length) return null;
  return (
    <div style={{background:'rgba(255,255,255,0.97)',border:'1px solid rgba(0,184,200,0.4)',borderRadius:10,padding:'10px 14px',boxShadow:'0 8px 32px rgba(0,100,150,0.15)',fontFamily:'Inter,sans-serif'}}>
      <p style={{color:T.tealDark,fontSize:11,fontWeight:700,marginBottom:6,letterSpacing:0.5}}>{label}</p>
      {payload.map((p,i)=>(
        <p key={i} style={{color:p.color||T.textDark,fontSize:12,margin:'2px 0'}}>
          <span style={{color:T.textLight}}>{p.name}: </span>
          {fmt?fmt(p.value,p.name):(typeof p.value==='number'?p.value.toLocaleString('en-IN'):p.value)}
        </p>
      ))}
    </div>
  );
};

// ─── GLASS CARD ───────────────────────────────────────────────────────────────
const GCard = ({ children, style={}, cls='', glow=false, dark=false, red=false }) => {
  const [h,sH] = useState(false);
  const bg = dark ? T.cardHeaderBg : red ? T.redBtnBg : (h ? T.glassHov : T.glass);
  return (
    <div className={cls} onMouseEnter={()=>sH(true)} onMouseLeave={()=>sH(false)} style={{
      background: bg,
      backdropFilter: 'blur(16px) saturate(180%)',
      WebkitBackdropFilter: 'blur(16px) saturate(180%)',
      border: dark||red ? 'none' : `1px solid ${h ? 'rgba(0,184,200,0.5)' : T.border}`,
      borderRadius: 16,
      boxShadow: h && !dark && !red
        ? '0 8px 40px rgba(0,100,160,0.18), 0 2px 8px rgba(0,0,0,0.06)'
        : '0 4px 24px rgba(0,80,130,0.10), 0 1px 4px rgba(0,0,0,0.04)',
      transition: 'all 0.3s ease',
      position: 'relative', overflow: 'hidden', ...style
    }}>
      {children}
    </div>
  );
};

// ─── SECTION HEADER ──────────────────────────────────────────────────────────
const SH = ({ title, sub, icon, light=false }) => (
  <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:16}}>
    {icon&&<span style={{fontSize:16}}>{icon}</span>}
    <div>
      <h2 style={{fontSize:13,fontWeight:700,letterSpacing:0.5,color:light?'rgba(255,255,255,0.9)':T.textDark,margin:0,fontFamily:'Inter,sans-serif'}}>{title}</h2>
      {sub&&<p style={{color:light?'rgba(255,255,255,0.65)':T.textLight,fontSize:11,margin:'2px 0 0',fontFamily:'Inter,sans-serif'}}>{sub}</p>}
    </div>
    <div style={{flex:1,height:1,background:light?'rgba(255,255,255,0.2)':`linear-gradient(90deg,${T.teal}44,transparent)`,marginLeft:8}}/>
  </div>
);

// ─── FILTER SELECT ────────────────────────────────────────────────────────────
const FSel = ({ label, options, value, onChange }) => (
  <div style={{display:'flex',flexDirection:'column',gap:3}}>
    <label style={{color:T.textLight,fontSize:9,fontWeight:600,letterSpacing:1.2,textTransform:'uppercase',fontFamily:'Inter,sans-serif'}}>{label}</label>
    <select value={value} onChange={e=>onChange(e.target.value)} style={{
      background:'rgba(255,255,255,0.85)',border:`1px solid ${value?T.teal:T.borderSoft}`,borderRadius:8,
      color:value?T.tealDark:T.textMid,padding:'7px 12px',fontSize:12,fontFamily:'Inter,sans-serif',
      minWidth:140,cursor:'pointer',outline:'none',appearance:'none',
      boxShadow:value?`0 0 0 2px ${T.teal}33`:'none',transition:'all 0.2s',fontWeight:500,
    }}>
      <option value="">All {label}s</option>
      {options.map(o=><option key={o} value={o}>{o}</option>)}
    </select>
  </div>
);

// ─── KPI METRIC CARD ─────────────────────────────────────────────────────────
const KpiCard = ({ label, value, sub, icon, color=T.teal, spark, sparkKey }) => (
  <GCard style={{padding:20}} cls="kc">
    <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:8}}>
      <p style={{color:T.textLight,fontSize:10,fontWeight:600,letterSpacing:0.8,textTransform:'uppercase',margin:0,fontFamily:'Inter,sans-serif'}}>{label}</p>
      <div style={{width:32,height:32,borderRadius:8,background:`${color}18`,border:`1px solid ${color}33`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:16}}>{icon}</div>
    </div>
    <p style={{fontSize:24,fontWeight:800,color:T.textDark,margin:'0 0 2px',fontFamily:'Inter,sans-serif',letterSpacing:-0.5}}>{value}</p>
    {sub&&<p style={{color:T.textLight,fontSize:11,margin:'0 0 8px',fontFamily:'Inter,sans-serif'}}>{sub}</p>}
    {spark&&sparkKey&&(
      <div style={{height:36}}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={spark}>
            <defs><linearGradient id={`kg${color.replace('#','')}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={color} stopOpacity={0.3}/><stop offset="95%" stopColor={color} stopOpacity={0}/>
            </linearGradient></defs>
            <Area type="monotone" dataKey={sparkKey} stroke={color} fill={`url(#kg${color.replace('#','')})`} strokeWidth={1.5} dot={false}/>
          </AreaChart>
        </ResponsiveContainer>
      </div>
    )}
    <div style={{position:'absolute',bottom:0,left:0,right:0,height:3,background:`linear-gradient(90deg,${color},${color}44,transparent)`,borderRadius:'0 0 16px 16px'}}/>
  </GCard>
);

// ─── STAT CHIP ───────────────────────────────────────────────────────────────
const Chip = ({ label, value, color=T.teal }) => (
  <div style={{display:'inline-flex',alignItems:'center',gap:5,background:`${color}14`,border:`1px solid ${color}33`,borderRadius:20,padding:'3px 10px'}}>
    <div style={{width:5,height:5,borderRadius:'50%',background:color}}/>
    <span style={{color:T.textMid,fontSize:10,fontFamily:'Inter,sans-serif'}}>{label}:</span>
    <span style={{color:color,fontSize:11,fontWeight:700,fontFamily:'Inter,sans-serif'}}>{value}</span>
  </div>
);

// ─── BADGE ───────────────────────────────────────────────────────────────────
const Badge = ({ label, color=T.teal }) => (
  <span style={{display:'inline-flex',alignItems:'center',padding:'2px 8px',borderRadius:12,fontSize:10,fontWeight:600,background:`${color}18`,border:`1px solid ${color}33`,color,fontFamily:'Inter,sans-serif'}}>{label}</span>
);

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN APP
// ═══════════════════════════════════════════════════════════════════════════════
export default function App() {
  const [raw, setRaw] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ company:'', project:'', year:'', month:'', broker:'', bhk:'' });
  const sf = useCallback((k,v) => setFilters(p=>({...p,[k]:v})), []);

  useEffect(() => {
    fetch('/data/dashboard_data.json').then(r=>r.json()).then(d=>{setRaw(d);setLoading(false);}).catch(()=>setLoading(false));
  }, []);

  const fo = raw?.filterOptions || {};

  const availableProjects = useMemo(() => {
    if (!raw||!filters.company) return fo.projects||[];
    return (fo.projects||[]).filter(p=>(fo.projCompany||{})[p]===filters.company);
  }, [raw,filters.company,fo]);

  const availableCompanies = useMemo(() => {
    if (!raw||!filters.project) return fo.companies||[];
    const c=(fo.projCompany||{})[filters.project];
    return c?[c]:fo.companies||[];
  }, [raw,filters.project,fo]);

  const matchMonthNum = useCallback(month => {
    if(!filters.month) return true;
    const idx=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'].indexOf(filters.month)+1;
    return month?.endsWith(`-${String(idx).padStart(2,'0')}`);
  }, [filters.month]);

  const pdrnFiltered = useMemo(() => {
    if(!raw?.pdrn) return [];
    return raw.pdrn.filter(r=>{
      if(filters.company && r.companyNorm!==filters.company) return false;
      if(filters.project && r.project!==filters.project) return false;
      if(filters.year    && String(r.bookingYear)!==filters.year) return false;
      if(filters.month   && !matchMonthNum(r.bookingMonth)) return false;
      if(filters.broker  && r.broker!==filters.broker) return false;
      if(filters.bhk     && r.bhk!==filters.bhk) return false;
      return true;
    });
  }, [raw,filters,matchMonthNum]);

  const pdrnActive    = useMemo(()=>pdrnFiltered.filter(r=>r.status==='ACTIVE'),[pdrnFiltered]);
  const pdrnCancelled = useMemo(()=>pdrnFiltered.filter(r=>r.status==='CANCELLED'),[pdrnFiltered]);

  const dappFiltered = useMemo(() => {
    if(!raw?.dapp) return [];
    return raw.dapp.filter(r=>{
      if(filters.company && r.companyNorm!==filters.company) return false;
      if(filters.project && r.project!==filters.project) return false;
      if(filters.year    && !r.billMonth?.startsWith(filters.year)) return false;
      if(filters.month   && !matchMonthNum(r.billMonth)) return false;
      return true;
    });
  }, [raw,filters,matchMonthNum]);

  const invrFiltered = useMemo(() => {
    if(!raw?.invr) return [];
    return raw.invr.filter(r=>{
      if(filters.company && r.companyNorm!==filters.company) return false;
      if(filters.project && r.project!==filters.project) return false;
      if(filters.bhk     && r.bhk!==filters.bhk) return false;
      return true;
    });
  }, [raw,filters]);

  const wfFiltered = useMemo(() => {
    if(!raw?.workflow) return [];
    return raw.workflow.filter(r=>{
      if(filters.company && r.companyNorm!==filters.company) return false;
      if(filters.project && r.project!==filters.project) return false;
      return true;
    });
  }, [raw,filters]);

  const availableBrokers = useMemo(() => {
    const src=(filters.company||filters.project)?pdrnFiltered:(raw?.pdrn||[]);
    const cnt={};
    src.forEach(r=>{if(r.broker)cnt[r.broker]=(cnt[r.broker]||0)+1;});
    return Object.entries(cnt).sort((a,b)=>b[1]-a[1]).slice(0,40).map(e=>e[0]);
  }, [raw,pdrnFiltered,filters.company,filters.project]);

  const kpi = useMemo(()=>{
    const tS=pdrnActive.reduce((s,r)=>s+(r.bsp||0),0);
    const tD=dappFiltered.reduce((s,r)=>s+(r.demand||0),0);
    const tR=dappFiltered.reduce((s,r)=>s+(r.received||0),0);
    const tO=dappFiltered.reduce((s,r)=>s+(r.outstanding||0),0);
    const ws={APPROVED:0,PENDING:0,REJECTED:0};
    wfFiltered.forEach(r=>{if(ws[r.status]!==undefined)ws[r.status]++;});
    return {
      totalUnits:invrFiltered.length,
      bookedUnits:invrFiltered.filter(r=>r.status==='Booked').length,
      availableUnits:invrFiltered.filter(r=>r.status==='Available').length,
      inProgressUnits:invrFiltered.filter(r=>r.status==='In Progress').length,
      totalSales:tS, dappDemand:tD, dappReceived:tR, dappOutstanding:tO,
      activeBookings:pdrnActive.length, cancelledBookings:pdrnCancelled.length,
      pipelineBookings:wfFiltered.filter(r=>r.status==='PENDING').length,
      wfApproved:ws.APPROVED, wfPending:ws.PENDING, wfRejected:ws.REJECTED,
    };
  }, [pdrnActive,pdrnCancelled,dappFiltered,invrFiltered,wfFiltered]);

  const monthlyTrend = useMemo(()=>{
    const map={};
    pdrnActive.forEach(r=>{const m=r.bookingMonth;if(!m)return;if(!map[m])map[m]={month:m,label:fmtML(m),units:0,bspCr:0,demCr:0,recCr:0};map[m].units++;map[m].bspCr+=(r.bsp||0)/1e7;map[m].demCr+=(r.demand||0)/1e7;map[m].recCr+=(r.received||0)/1e7;});
    return Object.values(map).sort((a,b)=>a.month.localeCompare(b.month)).map(r=>({...r,bspCr:+r.bspCr.toFixed(1),demCr:+r.demCr.toFixed(1),recCr:+r.recCr.toFixed(1)}));
  },[pdrnActive]);

  const dappMonthly = useMemo(()=>{
    const map={};
    dappFiltered.forEach(r=>{const m=r.billMonth;if(!m)return;if(!map[m])map[m]={month:m,label:fmtML(m),demCr:0,recCr:0,outCr:0};map[m].demCr+=(r.demand||0)/1e7;map[m].recCr+=(r.received||0)/1e7;map[m].outCr+=(r.outstanding||0)/1e7;});
    return Object.values(map).sort((a,b)=>a.month.localeCompare(b.month)).map(r=>({...r,demCr:+r.demCr.toFixed(1),recCr:+r.recCr.toFixed(1),outCr:+r.outCr.toFixed(1)}));
  },[dappFiltered]);

  const bvc = useMemo(()=>{
    const aM={},cM={};
    pdrnActive.forEach(r=>{if(r.bookingMonth)aM[r.bookingMonth]=(aM[r.bookingMonth]||0)+1;});
    pdrnCancelled.forEach(r=>{if(r.bookingMonth)cM[r.bookingMonth]=(cM[r.bookingMonth]||0)+1;});
    const all=Array.from(new Set([...Object.keys(aM),...Object.keys(cM)])).sort();
    return all.map(m=>({month:m,label:fmtML(m),booked:aM[m]||0,cancelled:cM[m]||0}));
  },[pdrnActive,pdrnCancelled]);

  const byProject = useMemo(()=>{
    const map={};
    pdrnActive.forEach(r=>{const p=r.project;if(!p)return;if(!map[p])map[p]={name:p,units:0,bspCr:0};map[p].units++;map[p].bspCr+=(r.bsp||0)/1e7;});
    return Object.values(map).sort((a,b)=>b.units-a.units).map(r=>({...r,bspCr:+r.bspCr.toFixed(1)}));
  },[pdrnActive]);

  const topCP = useMemo(()=>{
    const map={};
    pdrnActive.forEach(r=>{const b=r.broker;if(!b)return;if(!map[b])map[b]={name:b,units:0,bspCr:0};map[b].units++;map[b].bspCr+=(r.bsp||0)/1e7;});
    return Object.values(map).sort((a,b)=>b.units-a.units).slice(0,10).map(r=>({...r,bspCr:+r.bspCr.toFixed(1)}));
  },[pdrnActive]);

  const bhkSales = useMemo(()=>{
    const map={};
    pdrnActive.forEach(r=>{const b=r.bhk||'Other';if(!map[b])map[b]={bhk:b,units:0,bsp:0,bspCr:0};map[b].units++;map[b].bsp+=(r.bsp||0);map[b].bspCr+=(r.bsp||0)/1e7;});
    return Object.values(map).sort((a,b)=>b.units-a.units).map(r=>({...r,bspCr:+r.bspCr.toFixed(1)}));
  },[pdrnActive]);

  const dappByProject = useMemo(()=>{
    const map={};
    dappFiltered.forEach(r=>{const p=r.project;if(!p)return;if(!map[p])map[p]={name:p,demCr:0,recCr:0,outCr:0};map[p].demCr+=(r.demand||0)/1e7;map[p].recCr+=(r.received||0)/1e7;map[p].outCr+=(r.outstanding||0)/1e7;});
    return Object.values(map).map(r=>({...r,demCr:+r.demCr.toFixed(1),recCr:+r.recCr.toFixed(1),outCr:+r.outCr.toFixed(1)}));
  },[dappFiltered]);

  const top10       = useMemo(()=>[...pdrnActive].sort((a,b)=>(b.tcv||0)-(a.tcv||0)).slice(0,10),[pdrnActive]);
  const openBkg     = useMemo(()=>[...pdrnActive].sort((a,b)=>(b.bsp||0)-(a.bsp||0)).slice(0,20),[pdrnActive]);
  const pendingWF   = useMemo(()=>wfFiltered.filter(r=>r.status==='PENDING'),[wfFiltered]);
  const tgtAch      = pct(kpi.dappReceived,kpi.dappDemand);
  const last8       = monthlyTrend.slice(-8);
  const dappLast8   = dappMonthly.slice(-8);

  if(loading) return (
    <div style={{minHeight:'100vh',background:T.bg,display:'flex',alignItems:'center',justifyContent:'center',flexDirection:'column',gap:16}}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap');@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      <div style={{width:48,height:48,border:'3px solid rgba(0,184,200,0.2)',borderTop:`3px solid ${T.teal}`,borderRadius:'50%',animation:'spin 0.8s linear infinite'}}/>
      <p style={{fontFamily:'Inter,sans-serif',color:T.tealDark,fontSize:15,fontWeight:600,letterSpacing:1}}>Loading Dashboard...</p>
    </div>
  );

  return (
    <div style={{minHeight:'100vh',background:T.bg,fontFamily:'Inter,sans-serif',color:T.textDark}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap');
        *{box-sizing:border-box;scrollbar-width:thin;scrollbar-color:rgba(0,184,200,0.4) transparent}
        ::-webkit-scrollbar{width:5px;height:5px}
        ::-webkit-scrollbar-track{background:transparent}
        ::-webkit-scrollbar-thumb{background:rgba(0,184,200,0.4);border-radius:3px}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.5}}
        @keyframes fadeIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
        .kc{transition:transform 0.25s ease,box-shadow 0.25s ease}.kc:hover{transform:translateY(-3px)}
        .tr:hover td{background:rgba(0,184,200,0.05)!important}
        select option{background:#fff;color:#1a2b3c}
        th,td{font-family:'Inter',sans-serif}
        .filter-tag{transition:all 0.2s}.filter-tag:hover{background:rgba(224,32,32,0.1)!important}
      `}</style>

      {/* ── FROSTED BG OVERLAY ── */}
      <div style={{position:'fixed',inset:0,pointerEvents:'none',zIndex:0,background:'radial-gradient(ellipse 70% 40% at 70% 10%,rgba(255,255,255,0.35),transparent),radial-gradient(ellipse 50% 50% at 10% 80%,rgba(200,230,255,0.3),transparent)'}}/>

      {/* ── HEADER ── */}
      <header style={{position:'sticky',top:0,zIndex:100,background:'rgba(255,255,255,0.82)',backdropFilter:'blur(20px)',WebkitBackdropFilter:'blur(20px)',borderBottom:'1px solid rgba(255,255,255,0.9)',boxShadow:'0 2px 20px rgba(0,80,130,0.08)',padding:'0 32px'}}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',height:60}}>
          <div style={{display:'flex',alignItems:'center',gap:14}}>
            <div style={{width:38,height:38,borderRadius:10,background:'linear-gradient(135deg,#006878,#00b8c8)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:18,boxShadow:'0 4px 16px rgba(0,184,200,0.4)'}}>⬡</div>
            <div>
              <div style={{fontWeight:800,fontSize:16,letterSpacing:0.5,color:T.textDark}}>SKYARC NEXUS</div>
              <div style={{color:T.textLight,fontSize:9,letterSpacing:1.5,fontWeight:500}}>SALES INTELLIGENCE PLATFORM · SMARTWORLD GROUP</div>
            </div>
          </div>
          <div style={{display:'flex',alignItems:'center',gap:16}}>
            <div style={{display:'flex',gap:8}}>
              {[['INVR',T.teal],['PDRN',T.navy],['DAPP',T.amber],['WORKFLOW',T.green]].map(([l,c])=>(
                <span key={l} style={{display:'inline-flex',alignItems:'center',padding:'3px 10px',borderRadius:12,fontSize:10,fontWeight:600,background:`${c}15`,border:`1px solid ${c}30`,color:c}}>{l}</span>
              ))}
            </div>
            <div style={{display:'flex',alignItems:'center',gap:6,background:'rgba(0,200,120,0.1)',border:'1px solid rgba(0,200,120,0.3)',borderRadius:20,padding:'4px 10px'}}>
              <div style={{width:7,height:7,borderRadius:'50%',background:T.green,animation:'pulse 2s ease infinite'}}/>
              <span style={{color:T.tealDark,fontSize:10,fontWeight:600,letterSpacing:0.5}}>LIVE DATA</span>
            </div>
            <div style={{color:T.textLight,fontSize:11,fontWeight:500}}>{new Date().toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'})}</div>
          </div>
        </div>
      </header>

      <div style={{position:'relative',zIndex:1,padding:'24px 32px',maxWidth:1800,margin:'0 auto',animation:'fadeIn 0.4s ease'}}>

        {/* ── FILTER BAR ── */}
        <GCard style={{padding:'14px 22px',marginBottom:24}}>
          <div style={{display:'flex',alignItems:'flex-end',gap:16,flexWrap:'wrap'}}>
            <div style={{display:'flex',alignItems:'center',gap:8,marginRight:4}}>
              <div style={{width:28,height:28,borderRadius:8,background:T.cardHeaderBg,display:'flex',alignItems:'center',justifyContent:'center',color:'#fff',fontSize:14}}>⚙</div>
              <span style={{fontWeight:700,fontSize:12,color:T.textDark,letterSpacing:0.5}}>Filters</span>
            </div>
            <FSel label="Company"  options={availableCompanies}        value={filters.company} onChange={v=>{sf('company',v);if(v)sf('project','');}}/>
            <FSel label="Project"  options={availableProjects}         value={filters.project} onChange={v=>{sf('project',v);if(v)sf('company','');}}/>
            <FSel label="Year"     options={(fo.years||[]).map(String)} value={filters.year}    onChange={v=>sf('year',v)}/>
            <FSel label="Month"    options={fo.months||[]}             value={filters.month}   onChange={v=>sf('month',v)}/>
            <FSel label="Channel Partner" options={availableBrokers}   value={filters.broker}  onChange={v=>sf('broker',v)}/>
            <FSel label="BHK Type" options={fo.bhkCats||[]}            value={filters.bhk}     onChange={v=>sf('bhk',v)}/>
            {Object.values(filters).some(Boolean)&&(
              <button onClick={()=>setFilters({company:'',project:'',year:'',month:'',broker:'',bhk:''})}
                style={{background:T.redBtnBg,border:'none',borderRadius:8,color:'#fff',padding:'8px 18px',fontSize:12,cursor:'pointer',fontWeight:600,boxShadow:'0 4px 12px rgba(224,32,32,0.3)',alignSelf:'flex-end',transition:'all 0.2s'}}>
                ✕ Reset
              </button>
            )}
          </div>
          {Object.entries(filters).some(([,v])=>v)&&(
            <div style={{display:'flex',gap:8,flexWrap:'wrap',marginTop:10,paddingTop:10,borderTop:`1px solid ${T.borderSoft}`}}>
              {Object.entries(filters).filter(([,v])=>v).map(([k,v])=>(
                <div key={k} className="filter-tag" onClick={()=>sf(k,'')} style={{display:'inline-flex',alignItems:'center',gap:5,background:`${T.teal}12`,border:`1px solid ${T.teal}33`,borderRadius:20,padding:'3px 10px',cursor:'pointer',fontSize:11,color:T.textMid}}>
                  <span style={{color:T.teal,textTransform:'uppercase',fontSize:9,fontWeight:600}}>{k}</span>: {v}
                  <span style={{color:T.red,marginLeft:3,fontSize:11,fontWeight:700}}>✕</span>
                </div>
              ))}
            </div>
          )}
        </GCard>

        {/* ═══ KPI ROW 1: INVENTORY PIE + 3 METRICS ═══ */}
        <div style={{display:'grid',gridTemplateColumns:'2fr 1fr 1fr 1fr',gap:16,marginBottom:16}}>

          {/* Units Inventory with Pie */}
          <GCard style={{padding:22}} cls="kc">
            <div style={{display:'flex',gap:16,alignItems:'center'}}>
              <div style={{flex:1}}>
                <p style={{color:T.textLight,fontSize:10,fontWeight:600,letterSpacing:0.8,textTransform:'uppercase',margin:'0 0 4px'}}>Total Units · Inventory</p>
                <p style={{fontSize:36,fontWeight:900,color:T.textDark,margin:'0 0 12px',letterSpacing:-1}}>{kpi.totalUnits?.toLocaleString('en-IN')}</p>
                <div style={{display:'flex',flexDirection:'column',gap:6}}>
                  <Chip label="Booked"      value={kpi.bookedUnits?.toLocaleString('en-IN')} color={T.teal}/>
                  <Chip label="Available"   value={kpi.availableUnits?.toLocaleString('en-IN')} color={T.green}/>
                  <Chip label="In Progress" value={kpi.inProgressUnits} color={T.amber}/>
                </div>
              </div>
              <div style={{width:160,height:160}}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={[{name:'Booked',value:kpi.bookedUnits||0},{name:'Available',value:kpi.availableUnits||0},{name:'In Progress',value:kpi.inProgressUnits||0.01}]}
                      cx="50%" cy="50%" innerRadius={45} outerRadius={65} paddingAngle={3} dataKey="value" strokeWidth={2} stroke="rgba(255,255,255,0.8)">
                      <Cell fill={T.teal}/><Cell fill={T.green}/><Cell fill={T.amber}/>
                    </Pie>
                    <Tooltip content={<CTip/>}/>
                    <Legend iconType="circle" iconSize={7} wrapperStyle={{fontSize:10,color:T.textMid}}/>
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div style={{position:'absolute',bottom:0,left:0,right:0,height:3,background:`linear-gradient(90deg,${T.teal},${T.green},transparent)`,borderRadius:'0 0 16px 16px'}}/>
          </GCard>

          <KpiCard label="Total Sales" value={fmtCr(kpi.totalSales)} sub={`${kpi.activeBookings} Active Bookings`} icon="💎" color={T.navy} spark={last8} sparkKey="bspCr"/>
          <KpiCard label="Total Demand" value={fmtCr(kpi.dappDemand)} sub="Demands Raised · DAPP" icon="📋" color={T.amber} spark={dappLast8} sparkKey="demCr"/>
          <KpiCard label="Total Received" value={fmtCr(kpi.dappReceived)} sub="Collections · DAPP" icon="💰" color={T.teal} spark={dappLast8} sparkKey="recCr"/>
        </div>

        {/* ═══ KPI ROW 2: TARGET + OUTSTANDING + PIPELINE + WORKFLOW ═══ */}
        <div style={{display:'grid',gridTemplateColumns:'1.6fr 1fr 1fr 1fr',gap:16,marginBottom:24}}>

          {/* Target Achievement */}
          <GCard style={{padding:22}} cls="kc">
            <p style={{color:T.textLight,fontSize:10,fontWeight:600,letterSpacing:0.8,textTransform:'uppercase',margin:'0 0 14px'}}>Target Achievement (DAPP)</p>
            <div style={{display:'flex',alignItems:'center',gap:20}}>
              <div style={{position:'relative',width:96,height:96,flexShrink:0}}>
                <ResponsiveContainer width="100%" height="100%">
                  <RadialBarChart cx="50%" cy="50%" innerRadius="55%" outerRadius="100%" startAngle={90} endAngle={-270} data={[{value:tgtAch}]}>
                    <RadialBar background={{fill:'rgba(0,184,200,0.1)'}} dataKey="value" fill={tgtAch>80?T.teal:tgtAch>50?T.amber:T.red} cornerRadius={5}/>
                  </RadialBarChart>
                </ResponsiveContainer>
                <div style={{position:'absolute',inset:0,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center'}}>
                  <span style={{fontSize:20,fontWeight:900,color:tgtAch>80?T.tealDark:tgtAch>50?T.amber:T.red,letterSpacing:-1}}>{tgtAch}%</span>
                  <span style={{fontSize:9,color:T.textLight,fontWeight:500}}>Collected</span>
                </div>
              </div>
              <div style={{flex:1,display:'flex',flexDirection:'column',gap:6}}>
                <Chip label="Demand"    value={fmtCr(kpi.dappDemand)}      color={T.amber}/>
                <Chip label="Received"  value={fmtCr(kpi.dappReceived)}    color={T.teal}/>
                <Chip label="Outstanding" value={fmtCr(kpi.dappOutstanding)} color={T.red}/>
              </div>
            </div>
            <div style={{position:'absolute',bottom:0,left:0,right:0,height:3,background:`linear-gradient(90deg,${tgtAch>80?T.teal:tgtAch>50?T.amber:T.red},transparent)`,borderRadius:'0 0 16px 16px'}}/>
          </GCard>

          {/* Outstanding */}
          <GCard style={{padding:22}} cls="kc">
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8}}>
              <p style={{color:T.textLight,fontSize:10,fontWeight:600,letterSpacing:0.8,textTransform:'uppercase',margin:0}}>Outstanding</p>
              <span style={{fontSize:18}}>⚠️</span>
            </div>
            <p style={{fontSize:22,fontWeight:800,color:T.red,margin:'0 0 4px',letterSpacing:-0.5}}>{fmtCr(kpi.dappOutstanding)}</p>
            <p style={{color:T.textLight,fontSize:11,margin:'0 0 12px'}}>Pending collection</p>
            <div style={{width:'100%',height:6,background:'rgba(0,184,200,0.1)',borderRadius:3}}>
              <div style={{width:`${pct(kpi.dappReceived,kpi.dappDemand)}%`,height:'100%',background:`linear-gradient(90deg,${T.teal},${T.green})`,borderRadius:3,transition:'width 0.5s ease'}}/>
            </div>
            <p style={{color:T.textLight,fontSize:10,marginTop:4}}>{pct(kpi.dappReceived,kpi.dappDemand)}% collected</p>
            <div style={{position:'absolute',bottom:0,left:0,right:0,height:3,background:`linear-gradient(90deg,${T.red},transparent)`,borderRadius:'0 0 16px 16px'}}/>
          </GCard>

          {/* Pipeline */}
          <GCard style={{padding:22}} cls="kc">
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8}}>
              <p style={{color:T.textLight,fontSize:10,fontWeight:600,letterSpacing:0.8,textTransform:'uppercase',margin:0}}>Pipeline</p>
              <span style={{fontSize:18}}>⏳</span>
            </div>
            <p style={{fontSize:36,fontWeight:900,color:T.tealDark,margin:'0 0 4px',letterSpacing:-1}}>{kpi.pipelineBookings}</p>
            <p style={{color:T.textLight,fontSize:11,margin:'0 0 10px'}}>Pending in Workflow</p>
            <Chip label="Active" value={kpi.activeBookings?.toLocaleString('en-IN')} color={T.teal}/>
            <div style={{position:'absolute',bottom:0,left:0,right:0,height:3,background:`linear-gradient(90deg,${T.teal},transparent)`,borderRadius:'0 0 16px 16px'}}/>
          </GCard>

          {/* Workflow */}
          <GCard style={{padding:22}} cls="kc">
            <p style={{color:T.textLight,fontSize:10,fontWeight:600,letterSpacing:0.8,textTransform:'uppercase',margin:'0 0 10px'}}>Workflow Status</p>
            <div style={{height:90}}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={[{name:'Approved',value:kpi.wfApproved||0.01},{name:'Pending',value:kpi.wfPending||0.01},{name:'Rejected',value:kpi.wfRejected||0.01}]}
                    cx="40%" cy="50%" innerRadius={28} outerRadius={42} paddingAngle={3} dataKey="value" strokeWidth={2} stroke="rgba(255,255,255,0.8)">
                    <Cell fill={T.teal}/><Cell fill={T.amber}/><Cell fill={T.red}/>
                  </Pie>
                  <Tooltip content={<CTip/>}/>
                  <Legend iconType="circle" iconSize={7} wrapperStyle={{fontSize:9,color:T.textMid}}/>
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div style={{display:'flex',gap:6,flexWrap:'wrap',marginTop:4}}>
              <Chip label="✓"  value={kpi.wfApproved} color={T.teal}/>
              <Chip label="⏳" value={kpi.wfPending}  color={T.amber}/>
              <Chip label="✕"  value={kpi.wfRejected} color={T.red}/>
            </div>
          </GCard>
        </div>

        {/* ═══ CHARTS ROW 1: Monthly Trend + DAPP ═══ */}
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:20,marginBottom:20}}>

          <GCard style={{padding:24}}>
            <SH title="Monthly Sales Trend" sub="BSP · Demand · Collections — ₹ Crores" icon="📈"/>
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={monthlyTrend} margin={{top:10,right:10,bottom:24,left:0}}>
                <defs>
                  {[['t1',T.teal],['t2',T.amber],['t3',T.green]].map(([id,c])=>(
                    <linearGradient key={id} id={id} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={c} stopOpacity={0.25}/><stop offset="95%" stopColor={c} stopOpacity={0}/>
                    </linearGradient>
                  ))}
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,100,150,0.1)" vertical={false}/>
                <XAxis dataKey="label" tick={{fill:T.textLight,fontSize:9}} axisLine={false} tickLine={false} interval="preserveStartEnd" angle={-30} dy={8}/>
                <YAxis tick={{fill:T.textLight,fontSize:10}} axisLine={false} tickLine={false} tickFormatter={v=>`${v}Cr`}/>
                <Tooltip content={<CTip fmt={v=>`₹${v} Cr`}/>}/>
                <Legend wrapperStyle={{color:T.textMid,fontSize:11}}/>
                <Area type="monotone" dataKey="bspCr"  name="Sales (BSP)"  stroke={T.teal}  fill="url(#t1)" strokeWidth={2} dot={false} activeDot={{r:4,fill:T.teal,stroke:'#fff',strokeWidth:2}}/>
                <Area type="monotone" dataKey="demCr"  name="Demand"       stroke={T.amber} fill="url(#t2)" strokeWidth={2} dot={false} activeDot={{r:4}}/>
                <Area type="monotone" dataKey="recCr"  name="Received"     stroke={T.green} fill="url(#t3)" strokeWidth={2} dot={false} activeDot={{r:4}}/>
              </AreaChart>
            </ResponsiveContainer>
          </GCard>

          <GCard style={{padding:24}}>
            <SH title="DAPP — Demand vs. Collection" sub="Monthly: Demand · Received · Outstanding (₹Cr)" icon="🧾"/>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={dappMonthly} margin={{top:10,right:10,bottom:24,left:0}}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,100,150,0.1)" vertical={false}/>
                <XAxis dataKey="label" tick={{fill:T.textLight,fontSize:9}} axisLine={false} tickLine={false} interval="preserveStartEnd" angle={-30} dy={8}/>
                <YAxis tick={{fill:T.textLight,fontSize:10}} axisLine={false} tickLine={false} tickFormatter={v=>`${v}Cr`}/>
                <Tooltip content={<CTip fmt={v=>`₹${v} Cr`}/>}/>
                <Legend wrapperStyle={{color:T.textMid,fontSize:11}}/>
                <Bar dataKey="demCr"  name="Demand"      fill={T.amber} radius={[3,3,0,0]} fillOpacity={0.85}/>
                <Bar dataKey="recCr"  name="Received"    fill={T.teal}  radius={[3,3,0,0]} fillOpacity={0.85}/>
                <Bar dataKey="outCr"  name="Outstanding" fill={T.red}   radius={[3,3,0,0]} fillOpacity={0.75}/>
              </BarChart>
            </ResponsiveContainer>
          </GCard>
        </div>

        {/* ═══ CHARTS ROW 2: Sales by Channel + Top CP ═══ */}
        <div style={{display:'grid',gridTemplateColumns:'1fr 1.4fr',gap:20,marginBottom:20}}>

          <GCard style={{padding:24}}>
            <SH title="Sales by Channel" sub="Project-wise Unit Distribution" icon="🔀"/>
            <ResponsiveContainer width="100%" height={270}>
              <PieChart>
                <Pie data={byProject} cx="45%" cy="46%" outerRadius={95} innerRadius={48} paddingAngle={3} dataKey="units" nameKey="name"
                  label={({name,percent})=>`${name?.split(' ').pop()} ${(percent*100).toFixed(0)}%`}
                  labelLine={{stroke:T.teal,strokeWidth:1,opacity:0.6}} strokeWidth={2} stroke="rgba(255,255,255,0.8)">
                  {byProject.map((_,i)=><Cell key={i} fill={CC_TEAL[i%CC_TEAL.length]}/>)}
                </Pie>
                <Tooltip content={<CTip/>}/>
                <Legend iconType="circle" iconSize={8} wrapperStyle={{fontSize:10,color:T.textMid}}/>
              </PieChart>
            </ResponsiveContainer>
          </GCard>

          <GCard style={{padding:24}}>
            <SH title="Sales by Top CP-10" sub="Channel Partners by Units Booked" icon="🏆"/>
            <ResponsiveContainer width="100%" height={270}>
              <BarChart data={topCP} layout="vertical" margin={{top:0,right:30,bottom:0,left:0}}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,100,150,0.1)" horizontal={false}/>
                <XAxis type="number" tick={{fill:T.textLight,fontSize:10}} axisLine={false} tickLine={false}/>
                <YAxis type="category" dataKey="name" tick={{fill:T.textMid,fontSize:10}} axisLine={false} tickLine={false} width={155} tickFormatter={v=>v?.length>22?v.slice(0,22)+'…':v}/>
                <Tooltip content={<CTip fmt={(v,n)=>n==='bspCr'?`₹${v} Cr`:v?.toLocaleString?.('en-IN')}/>}/>
                <Bar dataKey="units" name="Units" radius={[0,4,4,0]}>
                  {topCP.map((_,i)=><Cell key={i} fill={CC_TEAL[i%CC_TEAL.length]}/>)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </GCard>
        </div>

        {/* ═══ CHARTS ROW 3: Booking vs Cancelled + DAPP by Project ═══ */}
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:20,marginBottom:20}}>

          <GCard style={{padding:24}}>
            <SH title="Booking vs. Cancelled" sub="Monthly Comparison" icon="📊"/>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={bvc} margin={{top:10,right:10,bottom:24,left:0}}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,100,150,0.1)" vertical={false}/>
                <XAxis dataKey="label" tick={{fill:T.textLight,fontSize:9}} axisLine={false} tickLine={false} angle={-30} dy={8} interval="preserveStartEnd"/>
                <YAxis tick={{fill:T.textLight,fontSize:10}} axisLine={false} tickLine={false}/>
                <Tooltip content={<CTip/>}/>
                <Legend wrapperStyle={{color:T.textMid,fontSize:11}}/>
                <Bar dataKey="booked"    name="Booked"    fill={T.teal}  radius={[3,3,0,0]} fillOpacity={0.85}/>
                <Bar dataKey="cancelled" name="Cancelled" fill={T.red}   radius={[3,3,0,0]} fillOpacity={0.75}/>
              </BarChart>
            </ResponsiveContainer>
          </GCard>

          <GCard style={{padding:24}}>
            <SH title="DAPP Collection by Project" sub="Demand · Received · Outstanding — ₹Cr" icon="🏗️"/>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={dappByProject} margin={{top:10,right:10,bottom:0,left:0}}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,100,150,0.1)" vertical={false}/>
                <XAxis dataKey="name" tick={{fill:T.textLight,fontSize:10}} axisLine={false} tickLine={false} tickFormatter={v=>v?.split(' ').pop()}/>
                <YAxis tick={{fill:T.textLight,fontSize:10}} axisLine={false} tickLine={false} tickFormatter={v=>`${v}Cr`}/>
                <Tooltip content={<CTip fmt={v=>`₹${v} Cr`}/>}/>
                <Legend wrapperStyle={{color:T.textMid,fontSize:11}}/>
                <Bar dataKey="demCr"  name="Demand"      fill={T.amber} radius={[3,3,0,0]} fillOpacity={0.85}/>
                <Bar dataKey="recCr"  name="Received"    fill={T.teal}  radius={[3,3,0,0]} fillOpacity={0.85}/>
                <Bar dataKey="outCr"  name="Outstanding" fill={T.red}   radius={[3,3,0,0]} fillOpacity={0.75}/>
              </BarChart>
            </ResponsiveContainer>
          </GCard>
        </div>

        {/* ═══ PRODUCT-WISE BHK ═══ */}
        <GCard style={{padding:24,marginBottom:20}}>
          <SH title="Product-wise Sales — Unit Type" sub="2BHK / 3BHK / 4BHK+ | Units & BSP" icon="🏢"/>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:20,marginBottom:16}}>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={bhkSales} margin={{top:10,right:10,bottom:0,left:0}}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,100,150,0.1)" vertical={false}/>
                <XAxis dataKey="bhk" tick={{fill:T.textMid,fontSize:10}} axisLine={false} tickLine={false}/>
                <YAxis tick={{fill:T.textLight,fontSize:10}} axisLine={false} tickLine={false}/>
                <Tooltip content={<CTip/>}/>
                <Bar dataKey="units" name="Units Sold" radius={[5,5,0,0]}>
                  {bhkSales.map((_,i)=><Cell key={i} fill={CC_TEAL[i%CC_TEAL.length]}/>)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={bhkSales} margin={{top:10,right:10,bottom:0,left:0}}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,100,150,0.1)" vertical={false}/>
                <XAxis dataKey="bhk" tick={{fill:T.textMid,fontSize:10}} axisLine={false} tickLine={false}/>
                <YAxis tick={{fill:T.textLight,fontSize:10}} axisLine={false} tickLine={false} tickFormatter={v=>`${v}Cr`}/>
                <Tooltip content={<CTip fmt={v=>`₹${v} Cr`}/>}/>
                <Bar dataKey="bspCr" name="BSP (Cr)" radius={[5,5,0,0]}>
                  {bhkSales.map((_,i)=><Cell key={i} fill={CC_MIX[i%CC_MIX.length]}/>)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(140px,1fr))',gap:12}}>
            {bhkSales.map((d,i)=>(
              <GCard key={d.bhk} style={{padding:'14px 16px'}} cls="kc">
                <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:8}}>
                  <div style={{width:8,height:8,borderRadius:2,background:CC_TEAL[i%CC_TEAL.length]}}/>
                  <span style={{fontSize:10,fontWeight:700,color:T.textMid,textTransform:'uppercase',letterSpacing:0.5}}>{d.bhk}</span>
                </div>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-end'}}>
                  <div><p style={{color:T.textLight,fontSize:9,margin:0}}>Units</p><p style={{color:T.textDark,fontSize:22,fontWeight:800,margin:0,letterSpacing:-0.5}}>{d.units}</p></div>
                  <div style={{textAlign:'right'}}><p style={{color:T.textLight,fontSize:9,margin:0}}>BSP</p><p style={{color:CC_TEAL[i%CC_TEAL.length],fontSize:13,fontWeight:700,margin:0}}>{fmtCr(d.bsp)}</p></div>
                </div>
                <div style={{position:'absolute',bottom:0,left:0,right:0,height:3,background:`linear-gradient(90deg,${CC_TEAL[i%CC_TEAL.length]},transparent)`,borderRadius:'0 0 16px 16px'}}/>
              </GCard>
            ))}
          </div>
        </GCard>

        {/* ═══ PIPELINE TABLE ═══ */}
        {pendingWF.length>0&&(
          <GCard style={{padding:24,marginBottom:20}}>
            <SH title="Pipeline — Pending Workflow" sub={`${pendingWF.length} bookings awaiting approval`} icon="⏳"/>
            <div style={{overflowX:'auto'}}>
              <table style={{width:'100%',borderCollapse:'collapse',fontSize:12}}>
                <thead><tr style={{borderBottom:`2px solid ${T.borderSoft}`}}>
                  {['Unit','Customer','Project','Company','L1 Status','L2 Status','SO No.'].map(h=>(
                    <th key={h} style={{padding:'8px 12px',textAlign:'left',color:T.textLight,fontSize:10,fontWeight:600,letterSpacing:0.5,whiteSpace:'nowrap',textTransform:'uppercase'}}>{h}</th>
                  ))}
                </tr></thead>
                <tbody>{pendingWF.map((r,i)=>(
                  <tr key={i} className="tr" style={{borderBottom:`1px solid ${T.borderSoft}`}}>
                    <td style={{padding:'10px 12px',color:T.tealDark,fontFamily:'monospace',fontSize:11,fontWeight:600}}>{r.unit}</td>
                    <td style={{padding:'10px 12px',color:T.textDark,fontWeight:600}}>{r.customer}</td>
                    <td style={{padding:'10px 12px',color:T.textMid,fontSize:11}}>{r.project}</td>
                    <td style={{padding:'10px 12px',color:T.textLight,fontSize:11}}>{r.companyNorm}</td>
                    <td style={{padding:'10px 12px'}}>
                      <Badge label={r.l1} color={r.l1==='APPROVED'?T.teal:T.amber}/>
                    </td>
                    <td style={{padding:'10px 12px'}}>
                      <Badge label={r.l2} color={T.red}/>
                    </td>
                    <td style={{padding:'10px 12px',color:T.textLight,fontFamily:'monospace',fontSize:11}}>{r.soNo||'—'}</td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          </GCard>
        )}

        {/* ═══ TOP 10 DEALS — DARK CARD ═══ */}
        <GCard dark style={{padding:24,marginBottom:20}}>
          <SH title="Top 10 Deals" sub="Ranked by Total Contract Value" icon="🎯" light/>
          <div style={{overflowX:'auto'}}>
            <table style={{width:'100%',borderCollapse:'collapse',fontSize:12}}>
              <thead><tr style={{borderBottom:'1px solid rgba(255,255,255,0.15)'}}>
                {['#','Customer','Project','Unit','BHK','TCV','Received','CP / Broker','Date'].map(h=>(
                  <th key={h} style={{padding:'8px 12px',textAlign:'left',color:'rgba(255,255,255,0.55)',fontSize:9,fontWeight:600,letterSpacing:0.8,whiteSpace:'nowrap',textTransform:'uppercase'}}>{h}</th>
                ))}
              </tr></thead>
              <tbody>{top10.map((d,i)=>(
                <tr key={i} className="tr" style={{borderBottom:'1px solid rgba(255,255,255,0.07)'}}>
                  <td style={{padding:'10px 12px',color:T.tealLight,fontWeight:700,fontSize:11}}>
                    {i===0?'🥇':i===1?'🥈':i===2?'🥉':<span style={{color:'rgba(255,255,255,0.4)'}}>{`#${i+1}`}</span>}
                  </td>
                  <td style={{padding:'10px 12px',color:'rgba(255,255,255,0.9)',fontWeight:600,maxWidth:180}}>{d.customer}</td>
                  <td style={{padding:'10px 12px',color:'rgba(255,255,255,0.55)',whiteSpace:'nowrap',fontSize:11}}>{d.project}</td>
                  <td style={{padding:'10px 12px',color:T.tealLight,fontFamily:'monospace',fontSize:11}}>{d.unit}</td>
                  <td style={{padding:'10px 12px'}}>
                    <span style={{background:'rgba(255,255,255,0.1)',borderRadius:4,padding:'2px 7px',color:'rgba(255,255,255,0.6)',fontSize:10}}>{d.bhk}</span>
                  </td>
                  <td style={{padding:'10px 12px',color:T.amber,fontWeight:700,fontSize:11,whiteSpace:'nowrap'}}>{fmtCr(d.tcv)}</td>
                  <td style={{padding:'10px 12px',color:T.tealLight,fontWeight:600,whiteSpace:'nowrap'}}>{fmtCr(d.received)}</td>
                  <td style={{padding:'10px 12px',color:'rgba(255,255,255,0.5)',fontSize:11,maxWidth:160}}>{d.broker||'—'}</td>
                  <td style={{padding:'10px 12px',color:'rgba(255,255,255,0.35)',whiteSpace:'nowrap',fontSize:11}}>{d.bookingDate}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        </GCard>

        {/* ═══ OPEN BOOKINGS ═══ */}
        <GCard style={{padding:24,marginBottom:28}}>
          <SH title="Open Bookings / Opportunities" sub="Active — Highest Deal Value" icon="📂"/>
          <div style={{overflowX:'auto'}}>
            <table style={{width:'100%',borderCollapse:'collapse',fontSize:12}}>
              <thead><tr style={{borderBottom:`2px solid ${T.borderSoft}`}}>
                {['Customer','Project','Unit','BHK','BSP','Demand','Received','Balance','Funding','Broker','Date'].map(h=>(
                  <th key={h} style={{padding:'8px 12px',textAlign:'left',color:T.textLight,fontSize:9,fontWeight:600,letterSpacing:0.5,whiteSpace:'nowrap',textTransform:'uppercase'}}>{h}</th>
                ))}
              </tr></thead>
              <tbody>{openBkg.map((b,i)=>{
                const bal=(b.demand||0)-(b.received||0);
                const p=b.demand>0?Math.round((b.received/b.demand)*100):0;
                return(
                  <tr key={i} className="tr" style={{borderBottom:`1px solid ${T.borderSoft}`}}>
                    <td style={{padding:'10px 12px',color:T.textDark,fontWeight:600,maxWidth:160}}>{b.customer}</td>
                    <td style={{padding:'10px 12px',color:T.textMid,whiteSpace:'nowrap',fontSize:11}}>{b.project}</td>
                    <td style={{padding:'10px 12px',color:T.tealDark,fontFamily:'monospace',fontSize:11,fontWeight:600}}>{b.unit}</td>
                    <td style={{padding:'10px 12px'}}><span style={{background:`${T.teal}12`,borderRadius:4,padding:'2px 7px',color:T.tealDark,fontSize:10,fontWeight:600}}>{b.bhk}</span></td>
                    <td style={{padding:'10px 12px',color:T.navy,fontWeight:700,whiteSpace:'nowrap'}}>{fmtCr(b.bsp)}</td>
                    <td style={{padding:'10px 12px',color:T.amber,fontWeight:600,whiteSpace:'nowrap'}}>{fmtCr(b.demand)}</td>
                    <td style={{padding:'10px 12px',color:T.tealDark,fontWeight:600,whiteSpace:'nowrap'}}>{fmtCr(b.received)}</td>
                    <td style={{padding:'10px 12px',whiteSpace:'nowrap'}}>
                      <div style={{display:'flex',alignItems:'center',gap:6}}>
                        <div style={{width:48,height:5,background:'rgba(0,100,150,0.1)',borderRadius:3}}>
                          <div style={{width:`${p}%`,height:'100%',background:`linear-gradient(90deg,${p>80?T.teal:p>50?T.amber:T.red},${p>80?T.green:p>50?T.orange:T.red}88)`,borderRadius:3}}/>
                        </div>
                        <span style={{color:bal>0?T.red:T.teal,fontSize:11,fontWeight:600}}>{fmtCr(Math.abs(bal))}</span>
                      </div>
                    </td>
                    <td style={{padding:'10px 12px'}}>
                      <Badge label={b.loanStatus==='BANK FUNDED'?'🏦 Bank':'💼 Self'} color={b.loanStatus==='BANK FUNDED'?T.teal:T.navy}/>
                    </td>
                    <td style={{padding:'10px 12px',color:T.textLight,fontSize:11,maxWidth:150}}>{b.broker||'—'}</td>
                    <td style={{padding:'10px 12px',color:T.textLight,whiteSpace:'nowrap',fontSize:11}}>{b.bookingDate}</td>
                  </tr>
                );
              })}</tbody>
            </table>
          </div>
        </GCard>

        {/* FOOTER */}
        <div style={{borderTop:`1px solid ${T.borderSoft}`,paddingTop:20,display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:12}}>
          <div style={{display:'flex',gap:10,flexWrap:'wrap'}}>
            <Chip label="INVR"     value={`${kpi.totalUnits?.toLocaleString('en-IN')} units`} color={T.teal}/>
            <Chip label="PDRN"     value={`${kpi.activeBookings?.toLocaleString('en-IN')} active`} color={T.navy}/>
            <Chip label="DAPP"     value={fmtCr(kpi.dappDemand)} color={T.amber}/>
            <Chip label="Workflow" value={`${kpi.wfApproved} approved`} color={T.green}/>
          </div>
          <div style={{color:T.textLight,fontSize:9,fontWeight:600,letterSpacing:1.5,textTransform:'uppercase'}}>SKYARC NEXUS v2.0 · SMARTWORLD GROUP · ALL 4 DATA SOURCES</div>
        </div>
      </div>
    </div>
  );
}
