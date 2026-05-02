import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  RadialBarChart, RadialBar
} from 'recharts';

// ─── THEME ────────────────────────────────────────────────────────────────────
const T = {
  glass:      'rgba(255,255,255,0.82)',
  glassH:     'rgba(255,255,255,0.92)',
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
  text:   '#0a1628', textM:'#1a2f45', textL:'#2d4a66', textW:'rgba(255,255,255,0.97)',
};
const CC = ['#0097a7','#1565c0','#2e7d32','#f57c00','#d32f2f','#6a1b9a','#00838f','#37474f'];

// ─── UTILS ────────────────────────────────────────────────────────────────────
const fmtCr  = v => { if(!v||isNaN(v)) return '₹0 Cr'; const c=v/1e7; if(c>=1000) return `₹${(c/1000).toFixed(1)}K Cr`; if(c>=100) return `₹${c.toFixed(0)} Cr`; return `₹${c.toFixed(1)} Cr`; };
const fmtML  = m => { if(!m) return ''; const [yr,mo]=m.split('-'); return `${['','Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][+mo]}'${yr.slice(2)}`; };
const pct    = (a,b) => b>0?Math.round((a/b)*100):0;

const CTip = ({active,payload,label,fmt}) => {
  if(!active||!payload?.length) return null;
  return (
    <div style={{background:'rgba(255,255,255,0.97)',border:'1px solid rgba(0,151,167,0.3)',borderRadius:10,padding:'8px 12px',boxShadow:'0 8px 32px rgba(0,80,120,0.18)',fontFamily:'Inter,sans-serif',fontSize:11}}>
      <p style={{color:T.tealD,fontWeight:700,marginBottom:4}}>{label}</p>
      {payload.map((p,i)=>(<p key={i} style={{color:p.color||T.text,margin:'2px 0'}}><span style={{color:T.textL}}>{p.name}: </span>{fmt?fmt(p.value,p.name):(typeof p.value==='number'?p.value.toLocaleString('en-IN'):p.value)}</p>))}
    </div>
  );
};

// ─── GLASS CARD ───────────────────────────────────────────────────────────────
const GC = ({children,style={},cls='',dark=false}) => {
  const [h,sH]=useState(false);
  return (
    <div className={cls} onMouseEnter={()=>sH(true)} onMouseLeave={()=>sH(false)} style={{
      background: dark?(h?T.glassDarkH:T.glassDark):(h?T.glassH:T.glass),
      border:`1px solid ${dark?T.borderB:T.border}`,
      borderRadius:14, boxShadow: dark?'0 8px 32px rgba(0,0,0,0.35)':'0 4px 24px rgba(0,80,120,0.12)',
      transition:'all 0.25s ease', position:'relative', overflow:'hidden', ...style
    }}>
      {!dark&&<div style={{position:'absolute',top:0,left:0,right:0,height:1,background:'rgba(255,255,255,0.95)'}}/>}
      {children}
    </div>
  );
};

// ─── SECTION HEADER ──────────────────────────────────────────────────────────
const SH = ({title,sub,light=false,compact=false}) => (
  <div style={{marginBottom:compact?8:12}}>
    <p style={{fontSize:compact?10:12,fontWeight:800,color:light?T.textW:T.tealD,letterSpacing:0.4,margin:0,textTransform:'uppercase',textShadow:'0 1px 2px rgba(255,255,255,0.6)'}}>{title}</p>
    {sub&&<p style={{fontSize:10,color:light?'rgba(255,255,255,0.8)':T.textM,margin:'2px 0 0',fontWeight:600}}>{sub}</p>}
  </div>
);

// ─── FILTER SELECT ────────────────────────────────────────────────────────────
const FSel = ({label,options,value,onChange}) => (
  <div style={{display:'flex',flexDirection:'column',gap:2}}>
    <label style={{color:T.textM,fontSize:9,fontWeight:800,letterSpacing:1,textTransform:'uppercase'}}>{label}</label>
    <select value={value} onChange={e=>onChange(e.target.value)} style={{
      background:'rgba(255,255,255,0.88)',border:`1px solid ${value?T.teal:'rgba(0,100,140,0.25)'}`,borderRadius:7,
      color:value?T.tealD:T.textM,padding:'5px 10px',fontSize:11,fontFamily:'Inter,sans-serif',
      minWidth:120,cursor:'pointer',outline:'none',appearance:'none',fontWeight:value?600:400,
    }}>
      <option value="">All</option>
      {options.map(o=><option key={o} value={o}>{o}</option>)}
    </select>
  </div>
);

// ─── CHIP ────────────────────────────────────────────────────────────────────
const Chip = ({label,value,color=T.teal,small=false}) => (
  <div style={{display:'inline-flex',alignItems:'center',gap:4,background:`${color}18`,border:`1px solid ${color}33`,borderRadius:20,padding:small?'2px 8px':'3px 10px'}}>
    <div style={{width:5,height:5,borderRadius:'50%',background:color,flexShrink:0}}/>
    <span style={{color:T.text,fontSize:small?9:10,fontWeight:700}}>{label}:</span>
    <span style={{color,fontSize:small?9:10,fontWeight:700}}>{value}</span>
  </div>
);

// ─── BADGE ───────────────────────────────────────────────────────────────────
const Badge = ({label,color=T.teal}) => (
  <span style={{display:'inline-flex',padding:'1px 7px',borderRadius:10,fontSize:9,fontWeight:700,background:`${color}18`,border:`1px solid ${color}33`,color}}>{label}</span>
);

// ═══════════════════════════════════════════════════════════════════════════════
export default function App() {
  const [raw,setRaw]=useState(null);
  const [loading,setLoading]=useState(true);
  const [tab,setTab]=useState('overview'); // overview | collections | pipeline
  const [filters,setFilters]=useState({company:'',project:'',year:'',month:'',broker:'',bhk:''});
  const sf=useCallback((k,v)=>setFilters(p=>({...p,[k]:v})),[]);

  useEffect(()=>{fetch('/data/dashboard_data.json').then(r=>r.json()).then(d=>{setRaw(d);setLoading(false);}).catch(()=>setLoading(false));}, []);

  const fo=raw?.filterOptions||{};
  const availProj=useMemo(()=>(!raw||!filters.company)?fo.projects||[]:(fo.projects||[]).filter(p=>(fo.projCompany||{})[p]===filters.company),[raw,filters.company,fo]);
  const availComp=useMemo(()=>(!raw||!filters.project)?fo.companies||[]:[(fo.projCompany||{})[filters.project]].filter(Boolean),[raw,filters.project,fo]);
  const matchMo=useCallback(m=>{if(!filters.month)return true;const idx=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'].indexOf(filters.month)+1;return m?.endsWith(`-${String(idx).padStart(2,'0')}`);},[filters.month]);

  const pF=useMemo(()=>{if(!raw?.pdrn)return[];return raw.pdrn.filter(r=>{if(filters.company&&r.companyNorm!==filters.company)return false;if(filters.project&&r.project!==filters.project)return false;if(filters.year&&String(r.bookingYear)!==filters.year)return false;if(filters.month&&!matchMo(r.bookingMonth))return false;if(filters.broker&&r.broker!==filters.broker)return false;if(filters.bhk&&r.bhk!==filters.bhk)return false;return true;});},[raw,filters,matchMo]);
  const pA=useMemo(()=>pF.filter(r=>r.status==='ACTIVE'),[pF]);
  const pC=useMemo(()=>pF.filter(r=>r.status==='CANCELLED'),[pF]);
  const dF=useMemo(()=>{if(!raw?.dapp)return[];return raw.dapp.filter(r=>{if(filters.company&&r.companyNorm!==filters.company)return false;if(filters.project&&r.project!==filters.project)return false;if(filters.year&&!r.billMonth?.startsWith(filters.year))return false;if(filters.month&&!matchMo(r.billMonth))return false;return true;});},[raw,filters,matchMo]);
  const iF=useMemo(()=>{if(!raw?.invr)return[];return raw.invr.filter(r=>{if(filters.company&&r.companyNorm!==filters.company)return false;if(filters.project&&r.project!==filters.project)return false;if(filters.bhk&&r.bhk!==filters.bhk)return false;return true;});},[raw,filters]);
  const wF=useMemo(()=>{if(!raw?.workflow)return[];return raw.workflow.filter(r=>{if(filters.company&&r.companyNorm!==filters.company)return false;if(filters.project&&r.project!==filters.project)return false;return true;});},[raw,filters]);

  const availBrokers=useMemo(()=>{const src=(filters.company||filters.project)?pF:(raw?.pdrn||[]);const cnt={};src.forEach(r=>{if(r.broker)cnt[r.broker]=(cnt[r.broker]||0)+1;});return Object.entries(cnt).sort((a,b)=>b[1]-a[1]).slice(0,40).map(e=>e[0]);},[raw,pF,filters]);

  const kpi=useMemo(()=>{const tS=pA.reduce((s,r)=>s+(r.bsp||0),0),tD=dF.reduce((s,r)=>s+(r.demand||0),0),tR=dF.reduce((s,r)=>s+(r.received||0),0),tO=dF.reduce((s,r)=>s+(r.outstanding||0),0);const ws={APPROVED:0,PENDING:0,REJECTED:0};wF.forEach(r=>{if(ws[r.status]!==undefined)ws[r.status]++;});return{totalUnits:iF.length,bookedUnits:iF.filter(r=>r.status==='Booked').length,availableUnits:iF.filter(r=>r.status==='Available').length,inProgressUnits:iF.filter(r=>r.status==='In Progress').length,totalSales:tS,dappDemand:tD,dappReceived:tR,dappOutstanding:tO,activeBookings:pA.length,cancelledBookings:pC.length,pipelineBookings:wF.filter(r=>r.status==='PENDING').length,wfApproved:ws.APPROVED,wfPending:ws.PENDING,wfRejected:ws.REJECTED};},[pA,pC,dF,iF,wF]);

  const monthly=useMemo(()=>{const map={};pA.forEach(r=>{const m=r.bookingMonth;if(!m)return;if(!map[m])map[m]={month:m,label:fmtML(m),units:0,bspCr:0,demCr:0,recCr:0};map[m].units++;map[m].bspCr+=(r.bsp||0)/1e7;map[m].demCr+=(r.demand||0)/1e7;map[m].recCr+=(r.received||0)/1e7;});return Object.values(map).sort((a,b)=>a.month.localeCompare(b.month)).map(r=>({...r,bspCr:+r.bspCr.toFixed(1),demCr:+r.demCr.toFixed(1),recCr:+r.recCr.toFixed(1)}));},[pA]);
  const dappM=useMemo(()=>{const map={};dF.forEach(r=>{const m=r.billMonth;if(!m)return;if(!map[m])map[m]={month:m,label:fmtML(m),demCr:0,recCr:0,outCr:0};map[m].demCr+=(r.demand||0)/1e7;map[m].recCr+=(r.received||0)/1e7;map[m].outCr+=(r.outstanding||0)/1e7;});return Object.values(map).sort((a,b)=>a.month.localeCompare(b.month)).map(r=>({...r,demCr:+r.demCr.toFixed(1),recCr:+r.recCr.toFixed(1),outCr:+r.outCr.toFixed(1)}));},[dF]);
  const bvc=useMemo(()=>{const aM={},cM={};pA.forEach(r=>{if(r.bookingMonth)aM[r.bookingMonth]=(aM[r.bookingMonth]||0)+1;});pC.forEach(r=>{if(r.bookingMonth)cM[r.bookingMonth]=(cM[r.bookingMonth]||0)+1;});const all=Array.from(new Set([...Object.keys(aM),...Object.keys(cM)])).sort();return all.map(m=>({month:m,label:fmtML(m),booked:aM[m]||0,cancelled:cM[m]||0}));},[pA,pC]);
  const byProj=useMemo(()=>{const map={};pA.forEach(r=>{const p=r.project;if(!p)return;if(!map[p])map[p]={name:p,units:0,bspCr:0};map[p].units++;map[p].bspCr+=(r.bsp||0)/1e7;});return Object.values(map).sort((a,b)=>b.units-a.units).map(r=>({...r,bspCr:+r.bspCr.toFixed(1)}));},[pA]);
  const topCP=useMemo(()=>{const map={};pA.forEach(r=>{const b=r.broker;if(!b)return;if(!map[b])map[b]={name:b,units:0,bspCr:0};map[b].units++;map[b].bspCr+=(r.bsp||0)/1e7;});return Object.values(map).sort((a,b)=>b.units-a.units).slice(0,8).map(r=>({...r,bspCr:+r.bspCr.toFixed(1)}));},[pA]);
  const bhkS=useMemo(()=>{const map={};pA.forEach(r=>{const b=r.bhk||'Other';if(!map[b])map[b]={bhk:b,units:0,bsp:0};map[b].units++;map[b].bsp+=(r.bsp||0);});return Object.values(map).sort((a,b)=>b.units-a.units);},[pA]);
  const dappByP=useMemo(()=>{const map={};dF.forEach(r=>{const p=r.project;if(!p)return;if(!map[p])map[p]={name:p,demCr:0,recCr:0,outCr:0};map[p].demCr+=(r.demand||0)/1e7;map[p].recCr+=(r.received||0)/1e7;map[p].outCr+=(r.outstanding||0)/1e7;});return Object.values(map).map(r=>({...r,demCr:+r.demCr.toFixed(1),recCr:+r.recCr.toFixed(1),outCr:+r.outCr.toFixed(1)}));},[dF]);
  const top10=useMemo(()=>[...pA].sort((a,b)=>(b.tcv||0)-(a.tcv||0)).slice(0,10),[pA]);
  const openBkg=useMemo(()=>[...pA].sort((a,b)=>(b.bsp||0)-(a.bsp||0)).slice(0,15),[pA]);
  const pendingWF=useMemo(()=>wF.filter(r=>r.status==='PENDING'),[wF]);
  const tgtAch=pct(kpi.dappReceived,kpi.dappDemand);
  const last12=monthly.slice(-12);
  const dappLast12=dappM.slice(-12);

  if(loading) return (
    <div style={{minHeight:'100vh',backgroundImage:'url(/bg.jpg)',backgroundSize:'cover',backgroundPosition:'center',display:'flex',alignItems:'center',justifyContent:'center',flexDirection:'column',gap:16}}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      <div style={{background:'rgba(255,255,255,0.85)',backdropFilter:'blur(20px)',borderRadius:20,padding:'32px 48px',textAlign:'center',boxShadow:'0 8px 40px rgba(0,0,0,0.2)'}}>
        <div style={{width:44,height:44,border:`3px solid rgba(0,151,167,0.2)`,borderTop:`3px solid ${T.teal}`,borderRadius:'50%',animation:'spin 0.8s linear infinite',margin:'0 auto 16px'}}/>
        <p style={{fontFamily:'Inter,sans-serif',color:T.tealD,fontSize:14,fontWeight:700,margin:0}}>Loading SkyArc Nexus...</p>
      </div>
    </div>
  );

  // Tab labels
  const tabs=[{k:'overview',l:'Overview'},{k:'collections',l:'Collections & DAPP'},{k:'pipeline',l:'Pipeline & Deals'}];

  return (
    <div style={{minHeight:'100vh',backgroundImage:'url(/bg.jpg)',backgroundSize:'cover',backgroundPosition:'center',backgroundAttachment:'fixed',fontFamily:'Inter,sans-serif',color:T.text}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap');
        *{box-sizing:border-box;scrollbar-width:thin;scrollbar-color:rgba(0,151,167,0.3) transparent}
        ::-webkit-scrollbar{width:4px;height:4px}::-webkit-scrollbar-thumb{background:rgba(0,151,167,0.4);border-radius:2px}
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes fadeIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}
        .kc{transition:transform 0.2s ease,box-shadow 0.2s ease}.kc:hover{transform:translateY(-2px);box-shadow:0 8px 32px rgba(0,80,120,0.18)!important}
        .tr:hover td{background:rgba(0,151,167,0.06)!important}
        select option{background:#fff;color:#0d2137}
        .tab{transition:all 0.2s;cursor:pointer}
        .tab:hover{background:rgba(255,255,255,0.5)!important}
        .card-text{text-shadow:0 1px 3px rgba(255,255,255,0.8)}
        .kc p,.kc span,.kc div{font-weight:inherit}
      `}</style>

      {/* BG overlay — very subtle darkening for readability */}
      <div style={{position:'fixed',inset:0,background:'rgba(0,20,40,0.25)',pointerEvents:'none',zIndex:0}}/>

      {/* ── HEADER ── */}
      <header style={{position:'sticky',top:0,zIndex:200,background:'rgba(255,255,255,0.80)',WebkitBackdropFilter:'blur(24px)',borderBottom:'1px solid rgba(255,255,255,0.9)',boxShadow:'0 2px 20px rgba(0,60,100,0.12)'}}>
        <div style={{maxWidth:1440,margin:'0 auto',padding:'0 24px',display:'flex',alignItems:'center',justifyContent:'space-between',height:54}}>
          {/* Logo */}
          <div style={{display:'flex',alignItems:'center',gap:12}}>
            <div style={{width:36,height:36,borderRadius:9,background:'linear-gradient(135deg,#006978,#00bcd4)',display:'flex',alignItems:'center',justifyContent:'center',color:'#fff',fontSize:18,boxShadow:'0 4px 14px rgba(0,188,212,0.45)',flexShrink:0}}>⬡</div>
            <div>
              <div style={{fontWeight:800,fontSize:15,letterSpacing:0.3,color:T.navy}}>SALES DASHBOARD</div>
              <div style={{color:T.textM,fontSize:9,letterSpacing:1.5,fontWeight:700}}>SMARTWORLD GROUP · SALES INTELLIGENCE</div>
            </div>
          </div>

          {/* Tabs */}
          <div style={{display:'flex',gap:4,background:'rgba(0,100,140,0.08)',borderRadius:10,padding:4}}>
            {tabs.map(t=>(
              <button key={t.k} className="tab" onClick={()=>setTab(t.k)} style={{
                background:tab===t.k?'rgba(255,255,255,0.95)':'transparent',
                border:'none',borderRadius:7,padding:'6px 16px',fontSize:11,fontWeight:tab===t.k?700:500,
                color:tab===t.k?T.tealD:T.text,cursor:'pointer',fontFamily:'Inter,sans-serif',fontWeight:tab===t.k?800:600,
                boxShadow:tab===t.k?'0 2px 8px rgba(0,80,120,0.12)':'none',
              }}>{t.l}</button>
            ))}
          </div>

          {/* Right */}
          <div style={{display:'flex',alignItems:'center',gap:14}}>

            <div style={{display:'flex',alignItems:'center',gap:5,background:'rgba(46,125,50,0.1)',border:'1px solid rgba(46,125,50,0.3)',borderRadius:16,padding:'3px 10px'}}>
              <div style={{width:6,height:6,borderRadius:'50%',background:T.greenL,animation:'pulse 2s ease infinite'}}/>
              <span style={{color:T.green,fontSize:9,fontWeight:700}}>LIVE</span>
            </div>
            <span style={{color:T.textM,fontSize:10,fontWeight:700}}>{new Date().toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'})}</span>
          </div>
        </div>

        {/* Filter strip */}
        <div style={{maxWidth:1440,margin:'0 auto',padding:'0 24px 10px',display:'flex',alignItems:'flex-end',gap:12,flexWrap:'wrap'}}>
          <FSel label="Company"  options={availComp}              value={filters.company} onChange={v=>{sf('company',v);if(v)sf('project','');}}/>
          <FSel label="Project"  options={availProj}              value={filters.project} onChange={v=>{sf('project',v);if(v)sf('company','');}}/>
          <FSel label="Year"     options={(fo.years||[]).map(String)} value={filters.year}  onChange={v=>sf('year',v)}/>
          <FSel label="Month"    options={fo.months||[]}          value={filters.month}   onChange={v=>sf('month',v)}/>
          <FSel label="CP"       options={availBrokers}           value={filters.broker}  onChange={v=>sf('broker',v)}/>
          <FSel label="BHK"      options={fo.bhkCats||[]}         value={filters.bhk}     onChange={v=>sf('bhk',v)}/>
          {Object.values(filters).some(Boolean)&&(
            <button onClick={()=>setFilters({company:'',project:'',year:'',month:'',broker:'',bhk:''})}
              style={{background:'linear-gradient(135deg,#c62828,#ef5350)',border:'none',borderRadius:7,color:'#fff',padding:'5px 14px',fontSize:10,cursor:'pointer',fontWeight:700,boxShadow:'0 2px 8px rgba(200,40,40,0.3)',alignSelf:'flex-end'}}>
              ✕ Reset
            </button>
          )}
          {/* Active tags */}
          {Object.entries(filters).filter(([,v])=>v).map(([k,v])=>(
            <div key={k} onClick={()=>sf(k,'')} style={{display:'inline-flex',alignItems:'center',gap:4,background:`${T.teal}15`,border:`1px solid ${T.teal}30`,borderRadius:16,padding:'3px 8px',cursor:'pointer',fontSize:10,color:T.tealD,alignSelf:'flex-end'}}>
              <span style={{color:T.teal,fontSize:8,fontWeight:700,textTransform:'uppercase'}}>{k}</span>: {v} <span style={{color:T.red,fontSize:10}}>✕</span>
            </div>
          ))}
        </div>
      </header>

      {/* ── MAIN CONTENT — floats on BG ── */}
      <div style={{position:'relative',zIndex:1,maxWidth:1440,margin:'0 auto',padding:'16px 24px 24px',animation:'fadeIn 0.35s ease'}}>

        {/* ══════════════════════════════════════════════════════
            TAB: OVERVIEW
        ══════════════════════════════════════════════════════ */}
        {tab==='overview'&&(
          <div style={{display:'flex',flexDirection:'column',gap:14}}>

            {/* ROW 1: 8 KPI CARDS */}
            <div style={{display:'grid',gridTemplateColumns:'repeat(8,1fr)',gap:12}}>
              {/* Units Pie */}
              <GC style={{padding:14,gridColumn:'span 2'}} cls="kc">
                <SH title="Total Units" compact/>
                <div style={{display:'flex',alignItems:'center',gap:8}}>
                  <div style={{width:90,height:90,flexShrink:0}}>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={[{name:'Booked',value:kpi.bookedUnits||0},{name:'Available',value:kpi.availableUnits||0},{name:'InProgress',value:kpi.inProgressUnits||0.01}]}
                          cx="50%" cy="50%" innerRadius={28} outerRadius={42} paddingAngle={3} dataKey="value" strokeWidth={2} stroke="rgba(255,255,255,0.8)">
                          <Cell fill={T.teal}/><Cell fill={T.greenL}/><Cell fill={T.amberL}/>
                        </Pie>
                        <Tooltip content={<CTip/>}/>
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div>
                    <p style={{fontSize:22,fontWeight:900,color:T.navy,margin:'0 0 6px',letterSpacing:-0.5}}>{kpi.totalUnits?.toLocaleString('en-IN')}</p>
                    <div style={{display:'flex',flexDirection:'column',gap:3}}>
                      <Chip label="Bkd" value={kpi.bookedUnits?.toLocaleString('en-IN')} color={T.teal} small/>
                      <Chip label="Avl" value={kpi.availableUnits?.toLocaleString('en-IN')} color={T.greenL} small/>
                    </div>
                  </div>
                </div>
              </GC>

              {/* Total Sales */}
              <GC style={{padding:14}} cls="kc">
                <SH title="Total Sales" compact/>
                <p style={{fontSize:18,fontWeight:800,color:T.navy,margin:'4px 0 2px',letterSpacing:-0.5}}>{fmtCr(kpi.totalSales)}</p>
                <p style={{color:T.textM,fontSize:10,margin:0,fontWeight:600}}>Net BSP · {kpi.activeBookings} Active</p>
                <div style={{position:'absolute',bottom:0,left:0,right:0,height:3,background:`linear-gradient(90deg,${T.navy},transparent)`,borderRadius:'0 0 14px 14px'}}/>
              </GC>

              {/* Demand */}
              <GC style={{padding:14}} cls="kc">
                <SH title="Demand (DAPP)" compact/>
                <p style={{fontSize:18,fontWeight:800,color:T.amber,margin:'4px 0 2px',letterSpacing:-0.5}}>{fmtCr(kpi.dappDemand)}</p>
                <p style={{color:T.textM,fontSize:10,margin:0,fontWeight:600}}>Demands Raised</p>
                <div style={{position:'absolute',bottom:0,left:0,right:0,height:3,background:`linear-gradient(90deg,${T.amber},transparent)`,borderRadius:'0 0 14px 14px'}}/>
              </GC>

              {/* Received */}
              <GC style={{padding:14}} cls="kc">
                <SH title="Received (DAPP)" compact/>
                <p style={{fontSize:18,fontWeight:800,color:T.teal,margin:'4px 0 2px',letterSpacing:-0.5}}>{fmtCr(kpi.dappReceived)}</p>
                <p style={{color:T.textM,fontSize:10,margin:0,fontWeight:600}}>Collections to date</p>
                <div style={{position:'absolute',bottom:0,left:0,right:0,height:3,background:`linear-gradient(90deg,${T.teal},transparent)`,borderRadius:'0 0 14px 14px'}}/>
              </GC>

              {/* Target */}
              <GC style={{padding:14}} cls="kc">
                <SH title="Target Ach." compact/>
                <div style={{display:'flex',alignItems:'center',gap:8,marginTop:4}}>
                  <div style={{position:'relative',width:56,height:56,flexShrink:0}}>
                    <ResponsiveContainer width="100%" height="100%">
                      <RadialBarChart cx="50%" cy="50%" innerRadius="55%" outerRadius="100%" startAngle={90} endAngle={-270} data={[{value:tgtAch}]}>
                        <RadialBar background={{fill:`rgba(0,151,167,0.1)`}} dataKey="value" fill={tgtAch>80?T.teal:tgtAch>50?T.amber:T.red} cornerRadius={4}/>
                      </RadialBarChart>
                    </ResponsiveContainer>
                    <div style={{position:'absolute',inset:0,display:'flex',alignItems:'center',justifyContent:'center'}}>
                      <span style={{fontSize:11,fontWeight:800,color:tgtAch>80?T.tealD:tgtAch>50?T.amber:T.red}}>{tgtAch}%</span>
                    </div>
                  </div>
                  <div>
                    <p style={{color:T.textL,fontSize:8,margin:'0 0 2px'}}>Demand vs Rcvd</p>
                    <p style={{color:T.red,fontSize:11,fontWeight:700,margin:0}}>{fmtCr(kpi.dappOutstanding)}</p>
                    <p style={{color:T.textL,fontSize:8,margin:0}}>Outstanding</p>
                  </div>
                </div>
              </GC>

              {/* Pipeline */}
              <GC style={{padding:14}} cls="kc">
                <SH title="Pipeline" compact/>
                <p style={{fontSize:28,fontWeight:900,color:T.tealD,margin:'2px 0',letterSpacing:-1}}>{kpi.pipelineBookings}</p>
                <p style={{color:T.textM,fontSize:10,margin:0,fontWeight:600}}>Pending Workflow</p>
                <div style={{position:'absolute',bottom:0,left:0,right:0,height:3,background:`linear-gradient(90deg,${T.teal},transparent)`,borderRadius:'0 0 14px 14px'}}/>
              </GC>

              {/* Workflow */}
              <GC style={{padding:14}} cls="kc">
                <SH title="Workflow" compact/>
                <div style={{height:64,marginTop:2}}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={[{name:'Approved',value:kpi.wfApproved||0.01},{name:'Pending',value:kpi.wfPending||0.01},{name:'Rejected',value:kpi.wfRejected||0.01}]}
                        cx="50%" cy="50%" innerRadius={20} outerRadius={30} paddingAngle={3} dataKey="value" strokeWidth={1} stroke="rgba(255,255,255,0.8)">
                        <Cell fill={T.teal}/><Cell fill={T.amber}/><Cell fill={T.red}/>
                      </Pie>
                      <Tooltip content={<CTip/>}/>
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div style={{display:'flex',gap:4,flexWrap:'wrap'}}>
                  <Chip label="✓" value={kpi.wfApproved} color={T.teal} small/>
                  <Chip label="✕" value={kpi.wfRejected} color={T.red} small/>
                </div>
              </GC>
            </div>

            {/* ROW 2: MONTHLY TREND (wide) + SALES BY CHANNEL + BHK PIE */}
            <div style={{display:'grid',gridTemplateColumns:'2fr 1fr 1fr',gap:12}}>

              <GC style={{padding:16}}>
                <SH title="Monthly Sales Trend" sub="BSP · Demand · Collections — ₹ Crores"/>
                <ResponsiveContainer width="100%" height={200}>
                  <AreaChart data={last12} margin={{top:5,right:8,bottom:18,left:0}}>
                    <defs>
                      {[['a1',T.teal],['a2',T.amber],['a3',T.greenL]].map(([id,c])=>(
                        <linearGradient key={id} id={id} x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={c} stopOpacity={0.25}/><stop offset="95%" stopColor={c} stopOpacity={0}/></linearGradient>
                      ))}
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,60,100,0.2)" vertical={false}/>
                    <XAxis dataKey="label" tick={{fill:T.textM,fontSize:9,fontWeight:600}} axisLine={false} tickLine={false} interval="preserveStartEnd" angle={-25} dy={6}/>
                    <YAxis tick={{fill:T.textM,fontSize:9,fontWeight:600}} axisLine={false} tickLine={false} tickFormatter={v=>`${v}Cr`} width={32}/>
                    <Tooltip content={<CTip fmt={v=>`₹${v} Cr`}/>}/>
                    <Legend wrapperStyle={{color:T.text,fontSize:10,fontWeight:700}} iconSize={8}/>
                    <Area type="monotone" dataKey="bspCr"  name="Sales(BSP)"  stroke={T.teal}   fill="url(#a1)" strokeWidth={2} dot={false} activeDot={{r:3}}/>
                    <Area type="monotone" dataKey="demCr"  name="Demand"      stroke={T.amber}  fill="url(#a2)" strokeWidth={2} dot={false} activeDot={{r:3}}/>
                    <Area type="monotone" dataKey="recCr"  name="Received"    stroke={T.greenL} fill="url(#a3)" strokeWidth={2} dot={false} activeDot={{r:3}}/>
                  </AreaChart>
                </ResponsiveContainer>
              </GC>

              <GC style={{padding:16}}>
                <SH title="Sales by Channel" sub="Project-wise Units & BSP"/>
                {(()=>{
                  const SHORT={'Smartworld Sky Arc':'Sky Arc','SMARTWORLD THE EDITION':'Edition','Trump Residences Gurgaon':'Trump','Smartworld Le Courtyard':'Le Courtyard','Smartworld Suites':'Suites','Smartworld Residencies':'Residencies'};
                  const pd=byProj.map(r=>({...r,label:SHORT[r.name]||r.name.split(' ').pop()}));
                  const tot=pd.reduce((s,r)=>s+r.units,0);
                  return(
                    <div style={{display:'flex',alignItems:'center',gap:10}}>
                      <div style={{width:130,height:130,flexShrink:0}}>
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie data={pd} cx="50%" cy="50%" outerRadius={58} innerRadius={28} paddingAngle={3} dataKey="units" nameKey="label" strokeWidth={2} stroke="rgba(255,255,255,0.9)">
                              {pd.map((_,i)=><Cell key={i} fill={CC[i%CC.length]}/>)}
                            </Pie>
                            <Tooltip content={<CTip/>}/>
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                      <div style={{flex:1,display:'flex',flexDirection:'column',gap:6}}>
                        {pd.map((d,i)=>{
                          const p=tot>0?Math.round((d.units/tot)*100):0;
                          return(
                            <div key={i} style={{display:'flex',alignItems:'center',gap:6}}>
                              <div style={{width:8,height:8,borderRadius:2,background:CC[i%CC.length],flexShrink:0}}/>
                              <div style={{flex:1}}>
                                <div style={{display:'flex',justifyContent:'space-between'}}>
                                  <span style={{fontSize:10,fontWeight:700,color:T.textM}}>{d.label}</span>
                                  <span style={{fontSize:10,fontWeight:800,color:CC[i%CC.length]}}>{p}%</span>
                                </div>
                                <div style={{display:'flex',justifyContent:'space-between'}}>
                                  <span style={{fontSize:9,color:T.textM,fontWeight:700}}>{d.units} units</span>
                                  <span style={{fontSize:9,color:T.textM,fontWeight:700}}>₹{d.bspCr}Cr</span>
                                </div>
                                <div style={{width:'100%',height:3,background:'rgba(0,100,140,0.1)',borderRadius:2,marginTop:1}}>
                                  <div style={{width:`${p}%`,height:'100%',background:CC[i%CC.length],borderRadius:2,opacity:0.8}}/>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })()}
              </GC>

              <GC style={{padding:16}}>
                <SH title="Product-wise" sub="BHK Unit Distribution"/>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={bhkS} layout="vertical" margin={{top:5,right:10,bottom:5,left:0}}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,60,100,0.2)" horizontal={false}/>
                    <XAxis type="number" tick={{fill:T.textM,fontSize:9,fontWeight:600}} axisLine={false} tickLine={false}/>
                    <YAxis type="category" dataKey="bhk" tick={{fill:T.text,fontSize:10,fontWeight:700}} axisLine={false} tickLine={false} width={85}/>
                    <Tooltip content={<CTip/>}/>
                    <Bar dataKey="units" name="Units" radius={[0,4,4,0]}>
                      {bhkS.map((_,i)=><Cell key={i} fill={CC[i%CC.length]}/>)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </GC>
            </div>

            {/* ROW 3: TOP CP + BOOKING vs CANCELLED */}
            <div style={{display:'grid',gridTemplateColumns:'1.3fr 1fr',gap:12}}>

              <GC style={{padding:16}}>
                <SH title="Top CP-10" sub="Channel Partners by Units Booked"/>
                <ResponsiveContainer width="100%" height={185}>
                  <BarChart data={topCP} layout="vertical" margin={{top:0,right:20,bottom:0,left:0}}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,60,100,0.2)" horizontal={false}/>
                    <XAxis type="number" tick={{fill:T.textM,fontSize:9,fontWeight:600}} axisLine={false} tickLine={false}/>
                    <YAxis type="category" dataKey="name" tick={{fill:T.text,fontSize:10,fontWeight:700}} axisLine={false} tickLine={false} width={145} tickFormatter={v=>v?.length>20?v.slice(0,20)+'…':v}/>
                    <Tooltip content={<CTip fmt={(v,n)=>n==='bspCr'?`₹${v} Cr`:v?.toLocaleString?.('en-IN')}/>}/>
                    <Bar dataKey="units" name="Units" radius={[0,4,4,0]}>
                      {topCP.map((_,i)=><Cell key={i} fill={CC[i%CC.length]}/>)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </GC>

              <GC style={{padding:16}}>
                <SH title="Booking vs. Cancelled" sub="Monthly Comparison"/>
                <ResponsiveContainer width="100%" height={185}>
                  <BarChart data={bvc.slice(-18)} margin={{top:5,right:8,bottom:18,left:0}}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,60,100,0.2)" vertical={false}/>
                    <XAxis dataKey="label" tick={{fill:T.textM,fontSize:9,fontWeight:600}} axisLine={false} tickLine={false} angle={-25} dy={6} interval="preserveStartEnd"/>
                    <YAxis tick={{fill:T.textM,fontSize:9,fontWeight:600}} axisLine={false} tickLine={false} width={24}/>
                    <Tooltip content={<CTip/>}/>
                    <Legend wrapperStyle={{color:T.text,fontSize:10,fontWeight:700}} iconSize={8}/>
                    <Bar dataKey="booked"    name="Booked"    fill={T.teal}  radius={[2,2,0,0]} fillOpacity={0.85}/>
                    <Bar dataKey="cancelled" name="Cancelled" fill={T.red}   radius={[2,2,0,0]} fillOpacity={0.8}/>
                  </BarChart>
                </ResponsiveContainer>
              </GC>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════
            TAB: COLLECTIONS & DAPP
        ══════════════════════════════════════════════════════ */}
        {tab==='collections'&&(
          <div style={{display:'flex',flexDirection:'column',gap:14}}>

            {/* KPI strip */}
            <div style={{display:'grid',gridTemplateColumns:'repeat(5,1fr)',gap:12}}>
              {[
                {l:'DAPP Demand',v:fmtCr(kpi.dappDemand),c:T.amber},
                {l:'DAPP Received',v:fmtCr(kpi.dappReceived),c:T.teal},
                {l:'Outstanding',v:fmtCr(kpi.dappOutstanding),c:T.red},
                {l:'Collection Rate',v:`${tgtAch}%`,c:tgtAch>80?T.teal:tgtAch>50?T.amber:T.red},
                {l:'Total Sales (PDRN)',v:fmtCr(kpi.totalSales),c:T.navy},
              ].map((d,i)=>(
                <GC key={i} style={{padding:14}} cls="kc">
                  <p style={{color:T.textM,fontSize:9,fontWeight:800,textTransform:'uppercase',letterSpacing:0.5,margin:'0 0 4px'}}>{d.l}</p>
                  <p style={{fontSize:20,fontWeight:900,color:d.c,margin:0,letterSpacing:-0.5}}>{d.v}</p>
                  <div style={{position:'absolute',bottom:0,left:0,right:0,height:3,background:`linear-gradient(90deg,${d.c},transparent)`,borderRadius:'0 0 14px 14px'}}/>
                </GC>
              ))}
            </div>

            {/* Charts row */}
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
              <GC style={{padding:16}}>
                <SH title="DAPP Monthly — Demand vs. Collection" sub="₹ Crores"/>
                <ResponsiveContainer width="100%" height={230}>
                  <BarChart data={dappLast12} margin={{top:5,right:8,bottom:18,left:0}}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,60,100,0.2)" vertical={false}/>
                    <XAxis dataKey="label" tick={{fill:T.textM,fontSize:9,fontWeight:600}} axisLine={false} tickLine={false} angle={-25} dy={6} interval="preserveStartEnd"/>
                    <YAxis tick={{fill:T.textM,fontSize:9,fontWeight:600}} axisLine={false} tickLine={false} tickFormatter={v=>`${v}Cr`} width={30}/>
                    <Tooltip content={<CTip fmt={v=>`₹${v} Cr`}/>}/>
                    <Legend wrapperStyle={{color:T.text,fontSize:10,fontWeight:700}} iconSize={8}/>
                    <Bar dataKey="demCr"  name="Demand"      fill={T.amber}  radius={[3,3,0,0]} fillOpacity={0.85}/>
                    <Bar dataKey="recCr"  name="Received"    fill={T.teal}   radius={[3,3,0,0]} fillOpacity={0.85}/>
                    <Bar dataKey="outCr"  name="Outstanding" fill={T.red}    radius={[3,3,0,0]} fillOpacity={0.75}/>
                  </BarChart>
                </ResponsiveContainer>
              </GC>

              <GC style={{padding:16}}>
                <SH title="DAPP Collection by Project" sub="₹ Crores"/>
                <ResponsiveContainer width="100%" height={230}>
                  <BarChart data={dappByP} margin={{top:5,right:8,bottom:0,left:0}}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,60,100,0.2)" vertical={false}/>
                    <XAxis dataKey="name" tick={{fill:T.textM,fontSize:10,fontWeight:600}} axisLine={false} tickLine={false} tickFormatter={v=>v?.split(' ').pop()}/>
                    <YAxis tick={{fill:T.textM,fontSize:9,fontWeight:600}} axisLine={false} tickLine={false} tickFormatter={v=>`${v}Cr`} width={30}/>
                    <Tooltip content={<CTip fmt={v=>`₹${v} Cr`}/>}/>
                    <Legend wrapperStyle={{color:T.text,fontSize:10,fontWeight:700}} iconSize={8}/>
                    <Bar dataKey="demCr"  name="Demand"      fill={T.amber} radius={[3,3,0,0]} fillOpacity={0.85}/>
                    <Bar dataKey="recCr"  name="Received"    fill={T.teal}  radius={[3,3,0,0]} fillOpacity={0.85}/>
                    <Bar dataKey="outCr"  name="Outstanding" fill={T.red}   radius={[3,3,0,0]} fillOpacity={0.75}/>
                  </BarChart>
                </ResponsiveContainer>
              </GC>
            </div>

            {/* Outstanding collection progress per project */}
            <GC style={{padding:16}}>
              <SH title="Collection Progress by Project" sub="Total Demand · Received · Outstanding"/>
              <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(240px,1fr))',gap:12}}>
                {dappByP.map((d,i)=>{
                  const p=d.demCr>0?Math.min(Math.round((d.recCr/d.demCr)*100),100):0;
                  const col=p>=100?T.teal:p>80?T.tealD:p>50?T.amber:T.red;
                  return(
                    <div key={i} style={{padding:'14px 16px',background:'rgba(255,255,255,0.75)',borderRadius:12,border:'1px solid rgba(255,255,255,0.85)',boxShadow:'0 2px 12px rgba(0,80,120,0.08)'}}>
                      <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:6}}>
                        <span style={{fontSize:12,fontWeight:800,color:T.navy,maxWidth:'70%',lineHeight:1.3}}>{d.name}</span>
                        <span style={{fontSize:13,fontWeight:900,color:col,letterSpacing:-0.5}}>{p}%</span>
                      </div>
                      <div style={{marginBottom:8}}>
                        <div style={{display:'flex',justifyContent:'space-between',marginBottom:3}}>
                          <span style={{fontSize:9,color:T.textL,fontWeight:600}}>TOTAL DEMAND</span>
                          <span style={{fontSize:11,fontWeight:800,color:T.navy}}>₹{d.demCr}Cr</span>
                        </div>
                        <div style={{width:'100%',height:7,background:'rgba(0,100,140,0.1)',borderRadius:4}}>
                          <div style={{width:`${Math.min(p,100)}%`,height:'100%',background:`linear-gradient(90deg,${col},${p>=100?T.greenL:p>80?T.tealL:p>50?T.amberL:T.redL})`,borderRadius:4,transition:'width 0.5s ease'}}/>
                        </div>
                      </div>
                      <div style={{display:'flex',justifyContent:'space-between',paddingTop:6,borderTop:'1px solid rgba(0,100,140,0.08)'}}>
                        <div>
                          <p style={{fontSize:9,color:T.textM,margin:'0 0 1px',fontWeight:800}}>RECEIVED</p>
                          <p style={{fontSize:11,color:T.tealD,fontWeight:700,margin:0}}>₹{d.recCr}Cr</p>
                        </div>
                        <div style={{textAlign:'right'}}>
                          <p style={{fontSize:9,color:T.textM,margin:'0 0 1px',fontWeight:800}}>OUTSTANDING</p>
                          <p style={{fontSize:11,color:d.outCr>0?T.red:T.greenL,fontWeight:700,margin:0}}>₹{d.outCr}Cr</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </GC>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════
            TAB: PIPELINE & DEALS
        ══════════════════════════════════════════════════════ */}
        {tab==='pipeline'&&(
          <div style={{display:'flex',flexDirection:'column',gap:14}}>

            {/* Top 10 Deals — dark card */}
            <GC dark style={{padding:18}}>
              <SH title="Top 10 Deals" sub="Ranked by Total Contract Value" light/>
              <div style={{overflowX:'auto'}}>
                <table style={{width:'100%',borderCollapse:'collapse',fontSize:11}}>
                  <thead><tr style={{borderBottom:'1px solid rgba(255,255,255,0.12)'}}>
                    {['#','Customer','Project','Unit','BHK','TCV','Received','CP / Broker','Date'].map(h=>(
                      <th key={h} style={{padding:'6px 10px',textAlign:'left',color:'rgba(255,255,255,0.45)',fontSize:9,fontWeight:700,letterSpacing:0.8,whiteSpace:'nowrap',textTransform:'uppercase'}}>{h}</th>
                    ))}
                  </tr></thead>
                  <tbody>{top10.map((d,i)=>(
                    <tr key={i} className="tr" style={{borderBottom:'1px solid rgba(255,255,255,0.06)'}}>
                      <td style={{padding:'8px 10px',color:'#00bcd4',fontWeight:700,fontSize:11}}>{i===0?'🥇':i===1?'🥈':i===2?'🥉':`#${i+1}`}</td>
                      <td style={{padding:'8px 10px',color:'rgba(255,255,255,0.9)',fontWeight:600,maxWidth:160}}>{d.customer}</td>
                      <td style={{padding:'8px 10px',color:'rgba(255,255,255,0.5)',fontSize:10,whiteSpace:'nowrap'}}>{d.project}</td>
                      <td style={{padding:'8px 10px',color:'#00bcd4',fontFamily:'monospace',fontSize:10}}>{d.unit}</td>
                      <td style={{padding:'8px 10px'}}><span style={{background:'rgba(255,255,255,0.08)',borderRadius:4,padding:'1px 6px',color:'rgba(255,255,255,0.5)',fontSize:9}}>{d.bhk}</span></td>
                      <td style={{padding:'8px 10px',color:T.amberL,fontWeight:700,whiteSpace:'nowrap'}}>{fmtCr(d.tcv)}</td>
                      <td style={{padding:'8px 10px',color:'#00e5ff',whiteSpace:'nowrap'}}>{fmtCr(d.received)}</td>
                      <td style={{padding:'8px 10px',color:'rgba(255,255,255,0.4)',fontSize:10,maxWidth:150}}>{d.broker||'—'}</td>
                      <td style={{padding:'8px 10px',color:'rgba(255,255,255,0.3)',fontSize:10,whiteSpace:'nowrap'}}>{d.bookingDate}</td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>
            </GC>

            {/* Open Bookings */}
            <GC style={{padding:18}}>
              <SH title="Open Bookings / Opportunities" sub="Active · Highest Deal Value"/>
              <div style={{overflowX:'auto'}}>
                <table style={{width:'100%',borderCollapse:'collapse',fontSize:11}}>
                  <thead><tr style={{borderBottom:`2px solid rgba(0,151,167,0.2)`}}>
                    {['Customer','Project','Unit','BHK','BSP','Demand','Received','Balance','Funding','Broker','Date'].map(h=>(
                      <th key={h} style={{padding:'6px 10px',textAlign:'left',color:T.textM,fontSize:10,fontWeight:800,letterSpacing:0.5,whiteSpace:'nowrap',textTransform:'uppercase'}}>{h}</th>
                    ))}
                  </tr></thead>
                  <tbody>{openBkg.map((b,i)=>{
                    const bal=(b.demand||0)-(b.received||0);
                    const p=b.demand>0?Math.round((b.received/b.demand)*100):0;
                    return(
                      <tr key={i} className="tr" style={{borderBottom:`1px solid rgba(0,100,140,0.1)`}}>
                        <td style={{padding:'7px 10px',color:T.text,fontWeight:600,maxWidth:140}}>{b.customer}</td>
                        <td style={{padding:'7px 10px',color:T.textM,fontSize:10,whiteSpace:'nowrap'}}>{b.project}</td>
                        <td style={{padding:'7px 10px',color:T.tealD,fontFamily:'monospace',fontSize:10,fontWeight:600}}>{b.unit}</td>
                        <td style={{padding:'7px 10px'}}><span style={{background:`${T.teal}12`,borderRadius:4,padding:'1px 6px',color:T.tealD,fontSize:9,fontWeight:600}}>{b.bhk}</span></td>
                        <td style={{padding:'7px 10px',color:T.navyM,fontWeight:700,whiteSpace:'nowrap'}}>{fmtCr(b.bsp)}</td>
                        <td style={{padding:'7px 10px',color:T.amber,whiteSpace:'nowrap'}}>{fmtCr(b.demand)}</td>
                        <td style={{padding:'7px 10px',color:T.tealD,fontWeight:600,whiteSpace:'nowrap'}}>{fmtCr(b.received)}</td>
                        <td style={{padding:'7px 10px',whiteSpace:'nowrap'}}>
                          <div style={{display:'flex',alignItems:'center',gap:5}}>
                            <div style={{width:40,height:4,background:'rgba(0,100,140,0.1)',borderRadius:2}}>
                              <div style={{width:`${p}%`,height:'100%',background:p>80?T.teal:p>50?T.amber:T.red,borderRadius:2}}/>
                            </div>
                            <span style={{color:bal>0?T.red:T.tealD,fontSize:10,fontWeight:600}}>{fmtCr(Math.abs(bal))}</span>
                          </div>
                        </td>
                        <td style={{padding:'7px 10px'}}><Badge label={b.loanStatus==='BANK FUNDED'?'🏦 Bank':'💼 Self'} color={b.loanStatus==='BANK FUNDED'?T.teal:T.navyM}/></td>
                        <td style={{padding:'7px 10px',color:T.textM,fontSize:10,fontWeight:600,maxWidth:120}}>{b.broker||'—'}</td>
                        <td style={{padding:'7px 10px',color:T.textM,fontSize:10,fontWeight:600,whiteSpace:'nowrap'}}>{b.bookingDate}</td>
                      </tr>
                    );
                  })}</tbody>
                </table>
              </div>
            </GC>

            {/* Pending Pipeline */}
            {pendingWF.length>0&&(
              <GC style={{padding:16}}>
                <SH title="Pipeline — Pending Workflow" sub={`${pendingWF.length} bookings awaiting approval`}/>
                <div style={{overflowX:'auto'}}>
                  <table style={{width:'100%',borderCollapse:'collapse',fontSize:11}}>
                    <thead><tr style={{borderBottom:`2px solid rgba(0,151,167,0.2)`}}>
                      {['Unit','Customer','Project','Company','L1 Status','L2 Status'].map(h=>(
                        <th key={h} style={{padding:'6px 10px',textAlign:'left',color:T.textM,fontSize:10,fontWeight:800,letterSpacing:0.5,whiteSpace:'nowrap',textTransform:'uppercase'}}>{h}</th>
                      ))}
                    </tr></thead>
                    <tbody>{pendingWF.map((r,i)=>(
                      <tr key={i} className="tr" style={{borderBottom:`1px solid rgba(0,100,140,0.1)`}}>
                        <td style={{padding:'7px 10px',color:T.tealD,fontFamily:'monospace',fontSize:10,fontWeight:600}}>{r.unit}</td>
                        <td style={{padding:'7px 10px',color:T.text,fontWeight:600}}>{r.customer}</td>
                        <td style={{padding:'7px 10px',color:T.textM,fontSize:10}}>{r.project}</td>
                        <td style={{padding:'7px 10px',color:T.textL,fontSize:10}}>{r.companyNorm}</td>
                        <td style={{padding:'7px 10px'}}><Badge label={r.l1} color={r.l1==='APPROVED'?T.teal:T.amber}/></td>
                        <td style={{padding:'7px 10px'}}><Badge label={r.l2} color={T.red}/></td>
                      </tr>
                    ))}</tbody>
                  </table>
                </div>
              </GC>
            )}
          </div>
        )}

        {/* FOOTER */}
        <div style={{marginTop:16,display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:8,background:'rgba(255,255,255,0.80)',borderRadius:12,padding:'8px 16px',border:'1px solid rgba(255,255,255,0.9)'}}>
          <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
            <Chip label="Units"    value={kpi.totalUnits?.toLocaleString('en-IN')} color={T.teal} small/>
            <Chip label="Active"   value={kpi.activeBookings?.toLocaleString('en-IN')} color={T.navy} small/>
            <Chip label="Demand"   value={fmtCr(kpi.dappDemand)} color={T.amber} small/>
            <Chip label="Workflow" value={`${kpi.wfApproved} approved`} color={T.greenL} small/>
          </div>
          <div style={{display:'flex',flexDirection:'column',alignItems:'flex-end',gap:1}}><span style={{color:T.text,fontSize:9,fontWeight:700,letterSpacing:1}}>SKYARC NEXUS v2.0 · SMARTWORLD GROUP</span><span style={{color:T.tealD,fontSize:9,fontWeight:700,letterSpacing:0.5}}>✦ Created &amp; Developed by ANIRUDH VERMA</span></div>
        </div>
      </div>
    </div>
  );
}
