import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  RadialBarChart, RadialBar, LabelList
} from 'recharts';

// ─── THEME (same as main dashboard) ──────────────────────────────────────────
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
  text:   '#0a1628', textM:'#1a2f45', textL:'#2d4a66', textW:'rgba(255,255,255,0.97)',
  orange: '#e65100',
  purple: '#6a1b9a',
};
const CC = ['#0097a7','#1565c0','#2e7d32','#f57c00','#d32f2f','#6a1b9a','#00838f','#37474f','#e65100','#00695c'];

// ─── UTILS ───────────────────────────────────────────────────────────────────
const fmtCr  = v => { if(!v||isNaN(v)) return '₹0 Cr'; const c=Number(v); if(c>=1000) return `₹${(c/1000).toFixed(1)}K Cr`; if(c>=100) return `₹${c.toFixed(0)} Cr`; return `₹${c.toFixed(1)} Cr`; };
const pct    = (a,b) => b>0?Math.round((a/b)*100):0;

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

const SH = ({title,sub,light=false,compact=false}) => (
  <div style={{marginBottom:compact?8:12}}>
    <p style={{fontSize:compact?10:12,fontWeight:800,color:light?T.textW:T.tealD,letterSpacing:0.4,margin:0,textTransform:'uppercase'}}>{title}</p>
    {sub&&<p style={{fontSize:10,color:light?'rgba(255,255,255,0.8)':T.textM,margin:'2px 0 0',fontWeight:600}}>{sub}</p>}
  </div>
);

const Chip = ({label,value,color=T.teal,small=false}) => (
  <div style={{display:'inline-flex',alignItems:'center',gap:4,background:`${color}18`,border:`1px solid ${color}33`,borderRadius:20,padding:small?'2px 8px':'3px 10px'}}>
    <div style={{width:5,height:5,borderRadius:'50%',background:color,flexShrink:0}}/>
    <span style={{color:T.text,fontSize:small?9:10,fontWeight:700}}>{label}:</span>
    <span style={{color,fontSize:small?9:10,fontWeight:700}}>{value}</span>
  </div>
);

const CTip = ({active,payload,label,fmt}) => {
  if(!active||!payload?.length) return null;
  return (
    <div style={{background:'rgba(255,255,255,0.97)',border:'1px solid rgba(0,151,167,0.3)',borderRadius:10,padding:'8px 12px',boxShadow:'0 8px 32px rgba(0,80,120,0.18)',fontFamily:'Inter,sans-serif',fontSize:11}}>
      <p style={{color:T.tealD,fontWeight:700,marginBottom:4}}>{label}</p>
      {payload.map((p,i)=>(<p key={i} style={{color:p.color||T.text,margin:'2px 0'}}><span style={{color:T.textL}}>{p.name}: </span>{fmt?fmt(p.value,p.name):(typeof p.value==='number'?fmtCr(p.value):p.value)}</p>))}
    </div>
  );
};

// ─── FILTER SELECT ────────────────────────────────────────────────────────────
const FSel = ({label,options,value,onChange,openId='',activeOpen=null,setActiveOpen=()=>{}}) => {
  const vals = value?value.split('||').filter(Boolean):[];
  const toggle = v => { const n=vals.includes(v)?vals.filter(x=>x!==v):[...vals,v]; onChange(n.join('||')); };
  const open = activeOpen===openId;
  const setOpen = () => setActiveOpen(open?null:openId);
  return(
    <div style={{display:'flex',flexDirection:'column',gap:2,position:'relative'}}>
      <label style={{color:T.textM,fontSize:9,fontWeight:800,letterSpacing:1,textTransform:'uppercase'}}>{label}</label>
      <div onClick={setOpen} style={{background:'rgba(255,255,255,0.88)',border:`1px solid ${vals.length?T.teal:'rgba(0,100,140,0.25)'}`,borderRadius:7,color:vals.length?T.tealD:T.textM,padding:'5px 10px',fontSize:11,fontFamily:'Inter,sans-serif',minWidth:110,cursor:'pointer',fontWeight:vals.length?600:400,userSelect:'none',display:'flex',justifyContent:'space-between',alignItems:'center',gap:6}}>
        <span style={{overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',maxWidth:100}}>{vals.length?vals.join(', '):'All'}</span>
        <span style={{fontSize:8,opacity:0.6}}>{open?'▲':'▼'}</span>
      </div>
      {open&&(
        <div onClick={e=>e.stopPropagation()} style={{position:'absolute',top:'100%',left:0,zIndex:999,background:'#fff',border:`1px solid ${T.teal}30`,borderRadius:8,boxShadow:'0 8px 24px rgba(0,80,120,0.15)',minWidth:180,maxHeight:220,overflowY:'auto',padding:4,marginTop:2}}>
          {options.map(o=>(
            <div key={o} onClick={()=>toggle(o)}
              style={{display:'flex',alignItems:'center',gap:8,padding:'6px 10px',borderRadius:5,cursor:'pointer',background:vals.includes(o)?`${T.teal}10`:'transparent',fontSize:10,fontWeight:vals.includes(o)?700:400,color:vals.includes(o)?T.tealD:T.text}}>
              <span style={{width:13,height:13,borderRadius:3,border:`1.5px solid ${vals.includes(o)?T.teal:'rgba(0,100,140,0.3)'}`,background:vals.includes(o)?T.teal:'transparent',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                {vals.includes(o)&&<span style={{color:'#fff',fontSize:9,lineHeight:1,fontWeight:900}}>✓</span>}
              </span>
              <span>{o}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ─── CHART CONTROLS ──────────────────────────────────────────────────────────
const ChartControls = ({mode,setMode,offset,setOffset,total,window:win=6}) => {
  const maxOffset = Math.max(0,total-win);
  useEffect(()=>{ if(offset===9999) setOffset(maxOffset); },[maxOffset]);
  const dispOff = Math.min(offset,maxOffset);
  return(
    <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:8}}>
      <div style={{display:'flex',gap:3,background:'rgba(0,100,140,0.07)',borderRadius:20,padding:2}}>
        {[['monthly','Monthly'],['quarterly','Quarterly']].map(([k,l])=>(
          <button key={k} onClick={()=>{setMode(k);setOffset(9999);}} style={{padding:'3px 12px',borderRadius:18,border:'none',cursor:'pointer',fontSize:10,fontWeight:700,background:mode===k?'#0097a7':'transparent',color:mode===k?'#fff':'#546e7a'}}>{l}</button>
        ))}
      </div>
      <button onClick={()=>setOffset(o=>Math.max(0,Math.min(o,maxOffset)-1))} disabled={dispOff===0} style={{width:24,height:24,borderRadius:'50%',border:'1px solid rgba(0,100,140,0.2)',background:'rgba(255,255,255,0.8)',cursor:dispOff===0?'default':'pointer',fontSize:14,color:dispOff===0?'#ccc':T.teal,display:'flex',alignItems:'center',justifyContent:'center'}}>‹</button>
      <div style={{flex:1,height:5,background:'rgba(0,100,140,0.1)',borderRadius:3,cursor:'pointer'}} onClick={e=>{const r=e.currentTarget.getBoundingClientRect();setOffset(Math.round((e.clientX-r.left)/r.width*maxOffset));}}>
        <div style={{position:'relative',left:`${maxOffset>0?(dispOff/maxOffset)*(100-win/total*100):0}%`,width:`${total>0?(win/total)*100:100}%`,height:'100%',background:`linear-gradient(90deg,${T.teal},${T.tealL})`,borderRadius:3}}/>
      </div>
      <button onClick={()=>setOffset(o=>Math.min(maxOffset,Math.min(o,maxOffset)+1))} disabled={dispOff>=maxOffset} style={{width:24,height:24,borderRadius:'50%',border:'1px solid rgba(0,100,140,0.2)',background:'rgba(255,255,255,0.8)',cursor:dispOff>=maxOffset?'default':'pointer',fontSize:14,color:dispOff>=maxOffset?'#ccc':T.teal,display:'flex',alignItems:'center',justifyContent:'center'}}>›</button>
      <span style={{fontSize:9,color:'#90a4ae',whiteSpace:'nowrap',fontWeight:600}}>{dispOff+1}–{Math.min(dispOff+win,total)}/{total}</span>
    </div>
  );
};

const toQuarterly = (data, labelKey='label') => {
  const qMap={};
  data.forEach(d=>{
    const lbl=String(d[labelKey]||'');
    const m=lbl.match(/([A-Za-z]{3})'(\d{2})/);
    if(!m)return;
    const monNum={'Jan':1,'Feb':2,'Mar':3,'Apr':4,'May':5,'Jun':6,'Jul':7,'Aug':8,'Sep':9,'Oct':10,'Nov':11,'Dec':12}[m[1]]||0;
    const q=`Q${Math.ceil(monNum/3)}'${m[2]}`;
    if(!qMap[q]){qMap[q]={...d,[labelKey]:q};Object.keys(d).forEach(k=>{if(typeof d[k]==='number')qMap[q][k]=0;});}
    Object.keys(d).forEach(k=>{if(typeof d[k]==='number')qMap[q][k]=+(qMap[q][k]+d[k]).toFixed(2);});
  });
  return Object.values(qMap);
};

// ─── LOGIN ────────────────────────────────────────────────────────────────────
const COST_CREDS = { username: 'Cost', password: 'Smart@2026' };

function CostLogin({ onLogin }) {
  const [u, setU] = useState('');
  const [p, setP] = useState('');
  const [err, setErr] = useState('');
  const [show, setShow] = useState(false);
  const submit = () => {
    if (u === COST_CREDS.username && p === COST_CREDS.password) {
      sessionStorage.setItem('cost_auth', '1');
      onLogin();
    } else {
      setErr('Invalid username or password');
      setTimeout(() => setErr(''), 2500);
    }
  };
  return (
    <div style={{minHeight:'100vh',backgroundImage:'url(/bg.jpg)',backgroundSize:'cover',backgroundPosition:'center',display:'flex',alignItems:'center',justifyContent:'center',fontFamily:'Inter,sans-serif'}}>
      <div style={{background:'rgba(255,255,255,0.97)',borderRadius:20,padding:'40px 44px',width:360,boxShadow:'0 24px 80px rgba(0,40,80,0.25)'}}>
        <div style={{textAlign:'center',marginBottom:28}}>
          <div style={{margin:'0 auto 14px',width:80,height:80,borderRadius:20,background:'#0d1f3c',display:'flex',alignItems:'center',justifyContent:'center',boxShadow:'0 8px 28px rgba(0,30,80,0.35)',overflow:'hidden'}}>
            <img src="/swd-logo.png" alt="SWD" style={{width:56,height:56,objectFit:'contain'}}/>
          </div>
          <h2 style={{fontSize:20,fontWeight:900,color:'#0d2137',margin:'0 0 4px'}}>Cost Intelligence</h2>
          <p style={{fontSize:12,color:'#546e7a',margin:0,fontWeight:500}}>Smartworld Group · Procurement & Budget</p>
        </div>
        <div style={{marginBottom:14}}>
          <label style={{fontSize:11,fontWeight:700,color:'#1a2f45',display:'block',marginBottom:5,textTransform:'uppercase',letterSpacing:0.4}}>Username</label>
          <input value={u} onChange={e=>setU(e.target.value)} onKeyDown={e=>e.key==='Enter'&&submit()} placeholder="Enter username"
            style={{width:'100%',padding:'10px 14px',borderRadius:10,border:'1.5px solid rgba(0,100,140,0.2)',fontSize:13,outline:'none',fontFamily:'Inter,sans-serif',boxSizing:'border-box',color:'#0d2137'}}
            onFocus={e=>e.target.style.border='1.5px solid #0097a7'} onBlur={e=>e.target.style.border='1.5px solid rgba(0,100,140,0.2)'}/>
        </div>
        <div style={{marginBottom:22}}>
          <label style={{fontSize:11,fontWeight:700,color:'#1a2f45',display:'block',marginBottom:5,textTransform:'uppercase',letterSpacing:0.4}}>Password</label>
          <div style={{position:'relative'}}>
            <input type={show?'text':'password'} value={p} onChange={e=>setP(e.target.value)} onKeyDown={e=>e.key==='Enter'&&submit()} placeholder="Enter password"
              style={{width:'100%',padding:'10px 40px 10px 14px',borderRadius:10,border:'1.5px solid rgba(0,100,140,0.2)',fontSize:13,outline:'none',fontFamily:'Inter,sans-serif',boxSizing:'border-box',color:'#0d2137'}}
              onFocus={e=>e.target.style.border='1.5px solid #0097a7'} onBlur={e=>e.target.style.border='1.5px solid rgba(0,100,140,0.2)'}/>
            <button onClick={()=>setShow(s=>!s)} style={{position:'absolute',right:12,top:'50%',transform:'translateY(-50%)',background:'none',border:'none',cursor:'pointer',fontSize:14,color:'#546e7a',padding:0}}>{show?'🙈':'👁️'}</button>
          </div>
        </div>
        {err&&<div style={{background:'#ffeaea',border:'1px solid #f5c6cb',borderRadius:8,padding:'8px 12px',marginBottom:14,fontSize:12,color:'#d32f2f',fontWeight:600,textAlign:'center'}}>{err}</div>}
        <button onClick={submit} style={{width:'100%',padding:'12px',borderRadius:12,border:'none',background:'linear-gradient(135deg,#0097a7,#006978)',color:'#fff',fontSize:14,fontWeight:800,cursor:'pointer',letterSpacing:0.3,boxShadow:'0 6px 20px rgba(0,151,167,0.35)'}}>
          Sign In →
        </button>
        <p style={{textAlign:'center',fontSize:11,color:'#90a4ae',marginTop:20,marginBottom:0}}>Smartworld Group · Confidential</p>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// COST DASHBOARD MAIN
// ═══════════════════════════════════════════════════════════════════════════════
export default function CostApp() {
  const [authed, setAuthed] = useState(()=>sessionStorage.getItem('cost_auth')==='1');
  const [raw, setRaw] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('overview');
  const [activeFilter, setActiveFilter] = useState(null);
  const [tMode, setTMode] = useState('monthly');
  const [tOff, setTOff] = useState(9999);
  const [poExpanded, setPoExpanded] = useState(false);
  const [wbsExpanded, setWbsExpanded] = useState(false);
  const [filters, setFilters] = useState({businessArea:'', projectType:'', docType:'', year:''});
  const sf = useCallback((k,v)=>setFilters(p=>({...p,[k]:v})),[]);

  useEffect(()=>{
    document.addEventListener('click',()=>setActiveFilter(null));
    return()=>document.removeEventListener('click',()=>setActiveFilter(null));
  },[]);

  useEffect(()=>{
    fetch('/data/cost_dashboard_data.json').then(r=>r.json()).then(d=>{setRaw(d);setLoading(false);}).catch(()=>setLoading(false));
  },[]);

  // ── FILTERED DATA ──────────────────────────────────────────────────────────
  const fWbs = useMemo(()=>{
    if(!raw?.wbsSummary) return [];
    return raw.wbsSummary;  // pre-aggregated
  },[raw]);

  const fVendors = useMemo(()=>{
    if(!raw?.topVendors) return [];
    return raw.topVendors;
  },[raw]);

  const fTrend = useMemo(()=>{
    if(!raw?.monthlyTrend) return [];
    // Filter by year if selected
    if(filters.year){
      const yrs = filters.year.split('||').filter(Boolean);
      return raw.monthlyTrend.filter(m=>yrs.some(y=>m.month.startsWith(y)));
    }
    return raw.monthlyTrend;
  },[raw, filters.year]);

  const fPO = useMemo(()=>{
    if(!raw?.poTable) return [];
    return raw.poTable;
  },[raw]);

  const fBudgetStatus = useMemo(()=>raw?.budgetStatus||[],[raw]);
  const fDocType = useMemo(()=>raw?.docTypeData||[],[raw]);
  const fBA = useMemo(()=>raw?.businessAreaData||[],[raw]);
  const fPnP = useMemo(()=>raw?.projectTypeData||[],[raw]);

  const kpi = useMemo(()=>raw?.kpi||{},[raw]);
  const fo = useMemo(()=>raw?.filterOptions||{},[raw]);

  // ── TREND SLICING ──────────────────────────────────────────────────────────
  const WIN = 8;
  const trendBase = tMode==='quarterly'?toQuarterly(fTrend,'label'):fTrend;
  const maxOff = Math.max(0, trendBase.length - WIN);
  const trendOff = Math.min(tOff===9999?maxOff:tOff, maxOff);
  const trendSlice = trendBase.slice(trendOff, trendOff+WIN);

  if(!authed) return <CostLogin onLogin={()=>setAuthed(true)}/>;

  if(loading) return (
    <div style={{minHeight:'100vh',backgroundImage:'url(/bg.jpg)',backgroundSize:'cover',display:'flex',alignItems:'center',justifyContent:'center',flexDirection:'column',gap:16}}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800;900&display=swap');@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      <div style={{background:'rgba(255,255,255,0.9)',backdropFilter:'blur(20px)',borderRadius:20,padding:'32px 48px',textAlign:'center',boxShadow:'0 8px 40px rgba(0,0,0,0.2)'}}>
        <div style={{position:'relative',width:64,height:64,margin:'0 auto 16px'}}>
          <div style={{position:'absolute',inset:0,border:'3px solid rgba(13,31,60,0.12)',borderTop:'3px solid #0d1f3c',borderRadius:'50%',animation:'spin 0.9s linear infinite'}}/>
          <div style={{position:'absolute',inset:8,background:'#0d1f3c',borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center'}}>
            <img src="/swd-logo.png" alt="SWD" style={{width:28,height:28,objectFit:'contain'}}/>
          </div>
        </div>
        <p style={{fontFamily:'Inter,sans-serif',color:'#0d1f3c',fontSize:14,fontWeight:900,margin:'0 0 4px'}}>Cost Intelligence</p>
        <p style={{fontFamily:'Inter,sans-serif',color:T.textM,fontSize:11,fontWeight:500,margin:0}}>Loading procurement data...</p>
      </div>
    </div>
  );

  const tabs=[{k:'overview',l:'Overview'},{k:'vendors',l:'Vendors & POs'},{k:'wbs',l:'WBS & Budget'}];
  const utilizationPct = kpi.utilizationPct || 0;
  const utilColor = utilizationPct >= 90 ? T.red : utilizationPct >= 70 ? T.amber : T.teal;

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
        .tab{transition:all 0.2s;cursor:pointer}
        .tab:hover{background:rgba(255,255,255,0.5)!important}
      `}</style>
      <div style={{position:'fixed',inset:0,background:'rgba(0,20,40,0.25)',pointerEvents:'none',zIndex:0}}/>

      {/* ── HEADER ── */}
      <header style={{position:'sticky',top:0,zIndex:200,background:'rgba(255,255,255,0.95)',WebkitBackdropFilter:'blur(24px)',borderBottom:'1px solid rgba(255,255,255,0.9)',boxShadow:'0 2px 20px rgba(0,60,100,0.12)'}}>
        <div style={{maxWidth:1440,margin:'0 auto',padding:'0 24px',display:'flex',alignItems:'center',justifyContent:'space-between',height:54}}>
          <div style={{display:'flex',alignItems:'center',gap:12}}>
            <div style={{width:38,height:38,borderRadius:9,background:'#0d1f3c',display:'flex',alignItems:'center',justifyContent:'center',boxShadow:'0 4px 14px rgba(0,30,80,0.3)',overflow:'hidden'}}>
              <img src="/swd-logo.png" alt="SWD" style={{width:26,height:26,objectFit:'contain'}}/>
            </div>
            <div>
              <div style={{fontWeight:900,fontSize:15,letterSpacing:0.5,color:T.navy}}>Cost Intelligence</div>
              <div style={{color:T.textM,fontSize:9,letterSpacing:1.5,fontWeight:700}}>SMARTWORLD GROUP · PROCUREMENT & BUDGET</div>
            </div>
          </div>

          <div style={{display:'flex',gap:4,background:'rgba(0,100,140,0.08)',borderRadius:10,padding:4}}>
            {tabs.map(t=>(
              <button key={t.k} className="tab" onClick={()=>setTab(t.k)} style={{background:tab===t.k?'rgba(255,255,255,0.95)':'transparent',border:'none',borderRadius:7,padding:'6px 16px',fontSize:11,fontWeight:tab===t.k?800:600,color:tab===t.k?T.tealD:T.text,cursor:'pointer',fontFamily:'Inter,sans-serif',boxShadow:tab===t.k?'0 2px 8px rgba(0,80,120,0.12)':'none'}}>{t.l}</button>
            ))}
          </div>

          <div style={{display:'flex',alignItems:'center',gap:14}}>
            <div style={{display:'flex',alignItems:'center',gap:5,background:'rgba(46,125,50,0.1)',border:'1px solid rgba(46,125,50,0.3)',borderRadius:16,padding:'3px 10px'}}>
              <div style={{width:6,height:6,borderRadius:'50%',background:T.greenL,animation:'pulse 2s ease infinite'}}/>
              <span style={{color:T.green,fontSize:9,fontWeight:700}}>LIVE</span>
            </div>
            <span style={{color:T.textM,fontSize:10,fontWeight:700}}>{new Date().toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'})}</span>
            <button onClick={()=>{sessionStorage.removeItem('cost_auth');setAuthed(false);}} style={{display:'flex',alignItems:'center',gap:6,padding:'6px 14px',borderRadius:10,border:'1px solid rgba(200,40,40,0.25)',background:'rgba(211,47,47,0.07)',cursor:'pointer',fontSize:11,fontWeight:700,color:'#d32f2f',fontFamily:'Inter,sans-serif',transition:'all 0.15s'}} onMouseOver={e=>{e.currentTarget.style.background='rgba(211,47,47,0.14)';}} onMouseOut={e=>{e.currentTarget.style.background='rgba(211,47,47,0.07)';}}>
              🔒 Logout
            </button>
          </div>
        </div>

        {/* Filter strip */}
        <div onClick={e=>e.stopPropagation()} style={{maxWidth:1440,margin:'0 auto',padding:'4px 24px 8px',display:'flex',alignItems:'flex-end',gap:10,flexWrap:'wrap'}}>
          <FSel label="Business Area" options={fo.businessAreas||[]} value={filters.businessArea} onChange={v=>sf('businessArea',v)} openId="ba" activeOpen={activeFilter} setActiveOpen={setActiveFilter}/>
          <FSel label="Proj/Non-Proj" options={fo.projectTypes||[]} value={filters.projectType} onChange={v=>sf('projectType',v)} openId="ptype" activeOpen={activeFilter} setActiveOpen={setActiveFilter}/>
          <FSel label="Doc Type" options={fo.documentTypes||[]} value={filters.docType} onChange={v=>sf('docType',v)} openId="dtype" activeOpen={activeFilter} setActiveOpen={setActiveFilter}/>
          <FSel label="Year" options={fo.years||[]} value={filters.year} onChange={v=>sf('year',v)} openId="year" activeOpen={activeFilter} setActiveOpen={setActiveFilter}/>
          {Object.values(filters).some(Boolean)&&(
            <button onClick={()=>setFilters({businessArea:'',projectType:'',docType:'',year:''})}
              style={{background:'linear-gradient(135deg,#c62828,#ef5350)',border:'none',borderRadius:7,color:'#fff',padding:'5px 14px',fontSize:10,cursor:'pointer',fontWeight:700,boxShadow:'0 2px 8px rgba(200,40,40,0.3)',alignSelf:'flex-end'}}>
              ✕ Reset
            </button>
          )}
        </div>
      </header>

      {/* ── MAIN ── */}
      <div style={{position:'relative',zIndex:1,maxWidth:1440,margin:'0 auto',padding:'16px 24px 24px',animation:'fadeIn 0.35s ease'}}>

        {/* ══════════════════ TAB: OVERVIEW ══════════════════ */}
        {tab==='overview'&&(
          <div style={{display:'flex',flexDirection:'column',gap:14}}>

            {/* Section header */}
            <div style={{display:'flex',alignItems:'center',gap:12}}>
              <div style={{background:'linear-gradient(135deg,#006978,#00bcd4)',borderRadius:10,padding:'5px 18px',display:'flex',alignItems:'center',gap:8,boxShadow:'0 2px 10px rgba(0,151,167,0.25)'}}>
                <span style={{fontSize:13}}>💰</span>
                <span style={{fontSize:11,fontWeight:900,color:'#fff',textTransform:'uppercase',letterSpacing:1}}>Budget Overview</span>
              </div>
              <div style={{flex:1,height:1,background:'rgba(0,151,167,0.15)',borderRadius:1}}/>
            </div>

            {/* ── ROW 1: KPI CARDS ── */}
            <div style={{display:'grid',gridTemplateColumns:'2fr 1fr 1fr 1fr 1fr 1fr',gap:12}}>

              {/* Budget Utilization — Big card */}
              <GC style={{padding:16}} cls="kc">
                <SH title="Budget Utilization" sub="Total Budget vs Actual Spend" compact/>
                <div style={{display:'flex',alignItems:'center',gap:16,marginTop:4}}>
                  <div style={{position:'relative',width:90,height:90,flexShrink:0}}>
                    <ResponsiveContainer width="100%" height="100%">
                      <RadialBarChart cx="50%" cy="50%" innerRadius="52%" outerRadius="100%" startAngle={90} endAngle={-270} data={[{value:Math.min(utilizationPct,100)}]}>
                        <RadialBar background={{fill:'rgba(0,151,167,0.12)'}} dataKey="value" fill={utilColor} cornerRadius={6}/>
                      </RadialBarChart>
                    </ResponsiveContainer>
                    <div style={{position:'absolute',inset:0,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center'}}>
                      <span style={{fontSize:14,fontWeight:900,color:utilColor,lineHeight:1}}>{utilizationPct}%</span>
                      <span style={{fontSize:7,color:T.textM,fontWeight:700,textTransform:'uppercase'}}>Used</span>
                    </div>
                  </div>
                  <div style={{flex:1,display:'flex',flexDirection:'column',gap:6}}>
                    {[
                      {label:'🏦 Total Budget',val:fmtCr(kpi.totalBudgetCr),color:T.navy},
                      {label:'✅ Actual Spend',val:fmtCr(kpi.totalActualCr),color:T.teal},
                      {label:'📋 Commitment',val:fmtCr(kpi.totalCommitmentCr),color:T.amber},
                      {label:'💚 Available',val:fmtCr(kpi.totalAvailableCr),color:T.greenL},
                    ].map((d,i)=>(
                      <div key={i} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'4px 10px',background:`${d.color}10`,borderRadius:7,border:`1px solid ${d.color}20`}}>
                        <span style={{fontSize:10,color:T.textM,fontWeight:700}}>{d.label}</span>
                        <span style={{fontSize:12,color:d.color,fontWeight:800}}>{d.val}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div style={{position:'absolute',bottom:0,left:0,right:0,height:3,background:`linear-gradient(90deg,${utilColor},transparent)`,borderRadius:'0 0 14px 14px'}}/>
              </GC>

              {/* Ordered */}
              <GC style={{padding:14}} cls="kc">
                <SH title="Total Ordered" compact/>
                <p style={{fontSize:20,fontWeight:900,color:T.navy,margin:'4px 0 4px',letterSpacing:-0.5}}>{fmtCr(kpi.totalOrderedCr)}</p>
                <p style={{color:T.textM,fontSize:10,margin:0,fontWeight:600}}>{kpi.poCount?.toLocaleString('en-IN')} POs raised</p>
                <div style={{position:'absolute',bottom:0,left:0,right:0,height:3,background:`linear-gradient(90deg,${T.teal},transparent)`,borderRadius:'0 0 14px 14px'}}/>
              </GC>

              {/* Delivered */}
              <GC style={{padding:14}} cls="kc">
                <SH title="Delivered Value" compact/>
                <p style={{fontSize:20,fontWeight:900,color:T.greenL,margin:'4px 0 4px',letterSpacing:-0.5}}>{fmtCr(kpi.totalDeliveredCr)}</p>
                <p style={{color:T.textM,fontSize:10,margin:0,fontWeight:600}}>{kpi.totalOrderedCr>0?Math.round((kpi.totalDeliveredCr/kpi.totalOrderedCr)*100):0}% of ordered</p>
                <div style={{position:'absolute',bottom:0,left:0,right:0,height:3,background:`linear-gradient(90deg,${T.greenL},transparent)`,borderRadius:'0 0 14px 14px'}}/>
              </GC>

              {/* Invoiced */}
              <GC style={{padding:14}} cls="kc">
                <SH title="Invoiced" compact/>
                <p style={{fontSize:20,fontWeight:900,color:T.amber,margin:'4px 0 4px',letterSpacing:-0.5}}>{fmtCr(kpi.totalInvoicedCr)}</p>
                <p style={{color:T.textM,fontSize:10,margin:0,fontWeight:600}}>{kpi.totalOrderedCr>0?Math.round((kpi.totalInvoicedCr/kpi.totalOrderedCr)*100):0}% of ordered</p>
                <div style={{position:'absolute',bottom:0,left:0,right:0,height:3,background:`linear-gradient(90deg,${T.amber},transparent)`,borderRadius:'0 0 14px 14px'}}/>
              </GC>

              {/* Vendors */}
              <GC style={{padding:14}} cls="kc">
                <SH title="Vendors" compact/>
                <p style={{fontSize:26,fontWeight:900,color:T.navy,margin:'4px 0 4px',letterSpacing:-1}}>{kpi.vendorCount?.toLocaleString('en-IN')}</p>
                <p style={{color:T.textM,fontSize:10,margin:0,fontWeight:600}}>active suppliers</p>
                <div style={{position:'absolute',bottom:0,left:0,right:0,height:3,background:`linear-gradient(90deg,${T.purple},transparent)`,borderRadius:'0 0 14px 14px'}}/>
              </GC>

              {/* WBS Count */}
              <GC style={{padding:14}} cls="kc">
                <SH title="WBS Elements" compact/>
                <p style={{fontSize:26,fontWeight:900,color:T.navy,margin:'4px 0 4px',letterSpacing:-1}}>{kpi.wbsCount?.toLocaleString('en-IN')}</p>
                <p style={{color:T.textM,fontSize:10,margin:0,fontWeight:600}}>cost elements tracked</p>
                <div style={{position:'absolute',bottom:0,left:0,right:0,height:3,background:`linear-gradient(90deg,${T.orange},transparent)`,borderRadius:'0 0 14px 14px'}}/>
              </GC>
            </div>

            {/* Section header */}
            <div style={{display:'flex',alignItems:'center',gap:12}}>
              <div style={{background:'linear-gradient(135deg,#b45309,#f59e0b)',borderRadius:10,padding:'5px 18px',display:'flex',alignItems:'center',gap:8,boxShadow:'0 2px 10px rgba(245,158,11,0.3)'}}>
                <span style={{fontSize:13}}>📈</span>
                <span style={{fontSize:11,fontWeight:900,color:'#fff',textTransform:'uppercase',letterSpacing:1}}>Spend Trend & Distribution</span>
              </div>
              <div style={{flex:1,height:1,background:'rgba(245,158,11,0.15)',borderRadius:1}}/>
            </div>

            {/* ── ROW 2: TREND + PIE ── */}
            <div style={{display:'grid',gridTemplateColumns:'2fr 1fr 1fr',gap:12}}>

              {/* Monthly Trend */}
              <GC style={{padding:16}}>
                <SH title="Monthly Procurement Trend" sub="Ordered · Actual · Invoiced — ₹ Crores"/>
                <ChartControls mode={tMode} setMode={setTMode} offset={tOff} setOffset={setTOff} total={trendBase.length} window={WIN}/>
                <ResponsiveContainer width="100%" height={210}>
                  <AreaChart data={trendSlice} margin={{top:5,right:8,bottom:18,left:0}}>
                    <defs>
                      {[['ga1',T.teal],['ga2',T.amber],['ga3',T.greenL]].map(([id,c])=>(
                        <linearGradient key={id} id={id} x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={c} stopOpacity={0.25}/><stop offset="95%" stopColor={c} stopOpacity={0}/></linearGradient>
                      ))}
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,60,100,0.2)" vertical={false}/>
                    <XAxis dataKey="label" tick={{fill:T.textM,fontSize:9,fontWeight:600}} axisLine={false} tickLine={false} angle={-25} dy={6} interval={0}/>
                    <YAxis tick={{fill:T.textM,fontSize:9,fontWeight:600}} axisLine={false} tickLine={false} tickFormatter={v=>v+'Cr'} width={42}/>
                    <Tooltip content={<CTip fmt={v=>`₹${v} Cr`}/>}/>
                    <Legend wrapperStyle={{color:T.text,fontSize:10,fontWeight:700}} iconSize={8}/>
                    <Area type="monotone" dataKey="orderedCr" name="Ordered" stroke={T.teal} fill="url(#ga1)" strokeWidth={2} dot={{r:3,fill:T.teal}}>
                      <LabelList dataKey="orderedCr" position="top" style={{fill:T.tealD,fontSize:7,fontWeight:700}} formatter={v=>v>0?v+'Cr':''}/>
                    </Area>
                    <Area type="monotone" dataKey="actualCr" name="Actual" stroke={T.amber} fill="url(#ga2)" strokeWidth={2} dot={{r:3,fill:T.amber}}>
                      <LabelList dataKey="actualCr" position="top" style={{fill:T.amber,fontSize:7,fontWeight:700}} formatter={v=>v>0?v+'Cr':''}/>
                    </Area>
                    <Area type="monotone" dataKey="invoicedCr" name="Invoiced" stroke={T.greenL} fill="url(#ga3)" strokeWidth={2} dot={{r:3,fill:T.greenL}}>
                      <LabelList dataKey="invoicedCr" position="top" style={{fill:T.greenL,fontSize:7,fontWeight:700}} formatter={v=>v>0?v+'Cr':''}/>
                    </Area>
                  </AreaChart>
                </ResponsiveContainer>
              </GC>

              {/* Business Area Pie */}
              <GC style={{padding:16}}>
                <SH title="By Business Area" sub="Budget Distribution"/>
                <ResponsiveContainer width="100%" height={160}>
                  <PieChart>
                    <Pie data={fBA} cx="50%" cy="50%" outerRadius={70} innerRadius={35} paddingAngle={4} dataKey="budgetCr" nameKey="name" strokeWidth={2} stroke="rgba(255,255,255,0.9)" label={({name,percent})=>`${name} ${(percent*100).toFixed(0)}%`} labelLine={false}>
                      {fBA.map((_,i)=><Cell key={i} fill={CC[i%CC.length]}/>)}
                    </Pie>
                    <Tooltip content={<CTip fmt={v=>`₹${v} Cr`}/>}/>
                  </PieChart>
                </ResponsiveContainer>
                <div style={{display:'flex',flexDirection:'column',gap:5,marginTop:6}}>
                  {fBA.map((d,i)=>(
                    <div key={i} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'4px 8px',background:`${CC[i%CC.length]}10`,borderRadius:6}}>
                      <div style={{display:'flex',alignItems:'center',gap:6}}>
                        <div style={{width:8,height:8,borderRadius:2,background:CC[i%CC.length]}}/>
                        <span style={{fontSize:10,fontWeight:700,color:T.navy}}>{d.name}</span>
                      </div>
                      <div style={{textAlign:'right'}}>
                        <span style={{fontSize:10,fontWeight:800,color:CC[i%CC.length]}}>{fmtCr(d.budgetCr)}</span>
                        <span style={{fontSize:9,color:T.textM,marginLeft:4}}>{d.utilizationPct}% used</span>
                      </div>
                    </div>
                  ))}
                </div>
              </GC>

              {/* Project vs Non-Project */}
              <GC style={{padding:16}}>
                <SH title="Project vs Non-Project" sub="Spend Classification"/>
                <ResponsiveContainer width="100%" height={150}>
                  <PieChart>
                    <Pie data={fPnP} cx="50%" cy="50%" outerRadius={65} innerRadius={30} paddingAngle={5} dataKey="orderedCr" nameKey="name" strokeWidth={2} stroke="rgba(255,255,255,0.9)" label={({name,percent})=>`${(percent*100).toFixed(0)}%`} labelLine={false}>
                      {fPnP.map((_,i)=><Cell key={i} fill={i===0?T.teal:T.navy}/>)}
                    </Pie>
                    <Tooltip content={<CTip fmt={v=>`₹${v} Cr`}/>}/>
                  </PieChart>
                </ResponsiveContainer>
                <div style={{display:'flex',flexDirection:'column',gap:6,marginTop:8}}>
                  {fPnP.map((d,i)=>(
                    <div key={i} style={{padding:'8px 12px',background:`${i===0?T.teal:T.navy}0d`,borderRadius:8,border:`1px solid ${i===0?T.teal:T.navy}22`}}>
                      <div style={{display:'flex',justifyContent:'space-between',marginBottom:4}}>
                        <span style={{fontSize:11,fontWeight:800,color:i===0?T.tealD:T.navy}}>{d.name}</span>
                      </div>
                      <div style={{display:'flex',gap:10}}>
                        <div><p style={{fontSize:8,color:T.textM,margin:0}}>Budget</p><p style={{fontSize:11,fontWeight:700,color:T.navy,margin:0}}>{fmtCr(d.budgetCr)}</p></div>
                        <div><p style={{fontSize:8,color:T.textM,margin:0}}>Actual</p><p style={{fontSize:11,fontWeight:700,color:i===0?T.tealD:T.amber,margin:0}}>{fmtCr(d.actualCr)}</p></div>
                        <div><p style={{fontSize:8,color:T.textM,margin:0}}>Ordered</p><p style={{fontSize:11,fontWeight:700,color:T.orange,margin:0}}>{fmtCr(d.orderedCr)}</p></div>
                      </div>
                    </div>
                  ))}
                </div>
              </GC>
            </div>

            {/* ── ROW 3: BUDGET STATUS + DOC TYPE ── */}
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
              {/* Budget Status Donut */}
              <GC style={{padding:16}}>
                <SH title="Budget Health — WBS Status" sub="Available Budget Bands across WBS elements"/>
                <div style={{display:'flex',alignItems:'center',gap:20}}>
                  <ResponsiveContainer width="50%" height={160}>
                    <PieChart>
                      <Pie data={fBudgetStatus} cx="50%" cy="50%" outerRadius={70} innerRadius={35} paddingAngle={4} dataKey="count" nameKey="name" strokeWidth={2} stroke="rgba(255,255,255,0.9)" label={({percent})=>`${(percent*100).toFixed(0)}%`} labelLine={false}>
                        {fBudgetStatus.map((d,i)=>{
                          const col = d.name==='Healthy'?T.greenL:d.name==='Moderate'?T.amber:d.name==='Near Full'?T.orange:T.red;
                          return <Cell key={i} fill={col}/>;
                        })}
                      </Pie>
                      <Tooltip content={({active,payload})=>{
                        if(!active||!payload?.length) return null;
                        return <div style={{background:'rgba(255,255,255,0.97)',border:'1px solid rgba(0,151,167,0.3)',borderRadius:10,padding:'8px 12px',fontSize:11}}><p style={{color:T.tealD,fontWeight:700}}>{payload[0].name}: {payload[0].value} WBS</p></div>;
                      }}/>
                    </PieChart>
                  </ResponsiveContainer>
                  <div style={{flex:1,display:'flex',flexDirection:'column',gap:8}}>
                    {fBudgetStatus.map((d,i)=>{
                      const col = d.name==='Healthy'?T.greenL:d.name==='Moderate'?T.amber:d.name==='Near Full'?T.orange:T.red;
                      const icon = d.name==='Healthy'?'🟢':d.name==='Moderate'?'🟡':d.name==='Near Full'?'🟠':'🔴';
                      const total = fBudgetStatus.reduce((s,x)=>s+x.count,0);
                      return (
                        <div key={i} style={{display:'flex',alignItems:'center',gap:8}}>
                          <span style={{fontSize:12}}>{icon}</span>
                          <div style={{flex:1}}>
                            <div style={{display:'flex',justifyContent:'space-between',marginBottom:2}}>
                              <span style={{fontSize:10,fontWeight:700,color:T.navy}}>{d.name}</span>
                              <span style={{fontSize:10,fontWeight:800,color:col}}>{d.count} WBS</span>
                            </div>
                            <div style={{width:'100%',height:5,background:'rgba(0,100,140,0.08)',borderRadius:3}}>
                              <div style={{width:`${total>0?Math.round((d.count/total)*100):0}%`,height:'100%',background:col,borderRadius:3}}/>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    <p style={{fontSize:9,color:T.textM,margin:'4px 0 0',fontWeight:600}}>Healthy: &gt;50% budget free · Near Full: &lt;10% · Overrun: deficit</p>
                  </div>
                </div>
              </GC>

              {/* Document Type Bar */}
              <GC style={{padding:16}}>
                <SH title="Document Type Distribution" sub="PO count & Ordered Value by Doc Type"/>
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={fDocType} layout="vertical" margin={{top:4,right:70,bottom:4,left:0}}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,60,100,0.1)" horizontal={false}/>
                    <XAxis type="number" tick={{fill:T.textM,fontSize:9,fontWeight:600}} axisLine={false} tickLine={false}/>
                    <YAxis type="category" dataKey="name" tick={{fill:T.text,fontSize:11,fontWeight:700}} axisLine={false} tickLine={false} width={50}/>
                    <Tooltip content={({active,payload,label})=>{
                      if(!active||!payload?.length) return null;
                      return <div style={{background:'rgba(255,255,255,0.97)',border:'1px solid rgba(0,151,167,0.3)',borderRadius:10,padding:'8px 12px',fontSize:11}}><p style={{color:T.tealD,fontWeight:700,margin:'0 0 4px'}}>{label}</p>{payload.map((p,i)=><p key={i} style={{color:T.navy,margin:'2px 0'}}>{p.name}: {p.value.toLocaleString()}</p>)}</div>;
                    }}/>
                    <Bar dataKey="count" name="PO Count" radius={[0,4,4,0]}>
                      {fDocType.map((_,i)=><Cell key={i} fill={CC[i%CC.length]}/>)}
                      <LabelList content={({x,y,width,height,value,index})=>{
                        const d=fDocType[index];
                        return(<g><text x={x+width+6} y={y+height/2-4} textAnchor="start" dominantBaseline="middle" fill={T.textM} fontSize={9} fontWeight={700}>{value} POs</text><text x={x+width+6} y={y+height/2+8} textAnchor="start" dominantBaseline="middle" fill={T.amber} fontSize={8} fontWeight={700}>{fmtCr(d?.orderedCr)}</text></g>);
                      }}/>
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </GC>
            </div>

          </div>
        )}

        {/* ══════════════════ TAB: VENDORS & POs ══════════════════ */}
        {tab==='vendors'&&(
          <div style={{display:'flex',flexDirection:'column',gap:14}}>

            <div style={{display:'flex',alignItems:'center',gap:12}}>
              <div style={{background:'linear-gradient(135deg,#5b21b6,#7c3aed)',borderRadius:10,padding:'5px 18px',display:'flex',alignItems:'center',gap:8,boxShadow:'0 2px 10px rgba(124,58,237,0.3)'}}>
                <span style={{fontSize:13}}>🏭</span>
                <span style={{fontSize:11,fontWeight:900,color:'#fff',textTransform:'uppercase',letterSpacing:1}}>Top Vendors by Ordered Value</span>
              </div>
              <div style={{flex:1,height:1,background:'rgba(124,58,237,0.12)',borderRadius:1}}/>
            </div>

            {/* Vendor Horizontal Bar */}
            <GC style={{padding:16}}>
              <SH title="Top 20 Vendors" sub="Ordered · Delivered · Invoiced — ₹ Crores"/>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16}}>
                {/* Left: Bar chart top 10 */}
                <ResponsiveContainer width="100%" height={Math.max(220, fVendors.slice(0,10).length*26+40)}>
                  <BarChart data={fVendors.slice(0,10)} layout="vertical" margin={{top:0,right:80,bottom:0,left:0}}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,60,100,0.1)" horizontal={false}/>
                    <XAxis type="number" tick={{fill:T.textM,fontSize:9}} axisLine={false} tickLine={false}/>
                    <YAxis type="category" dataKey="name" tick={{fill:T.text,fontSize:9,fontWeight:700}} axisLine={false} tickLine={false} width={150} tickFormatter={v=>v?.length>22?v.slice(0,22)+'…':v}/>
                    <Tooltip content={<CTip fmt={v=>`₹${v} Cr`}/>}/>
                    <Bar dataKey="orderedCr" name="Ordered" radius={[0,4,4,0]}>
                      {fVendors.slice(0,10).map((_,i)=><Cell key={i} fill={CC[i%CC.length]}/>)}
                      <LabelList content={({x,y,width,height,value,index})=>{
                        const d=fVendors[index];
                        return(<g><text x={x+width+6} y={y+height/2-3} textAnchor="start" dominantBaseline="middle" fill={T.textM} fontSize={9} fontWeight={700}>{fmtCr(value)}</text><text x={x+width+6} y={y+height/2+9} textAnchor="start" dominantBaseline="middle" fill={T.textL} fontSize={8} fontWeight={600}>{d?.poCount} POs</text></g>);
                      }}/>
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
                {/* Right: Vendor table */}
                <div style={{overflowY:'auto',maxHeight:320}}>
                  <table style={{width:'100%',borderCollapse:'collapse',fontSize:10}}>
                    <thead><tr style={{borderBottom:`2px solid rgba(0,151,167,0.18)`}}>
                      {['#','Vendor','POs','Ordered','Delivered','Invoiced'].map(h=>(
                        <th key={h} style={{padding:'5px 8px',textAlign:'left',color:T.textM,fontSize:9,fontWeight:800,textTransform:'uppercase',whiteSpace:'nowrap'}}>{h}</th>
                      ))}
                    </tr></thead>
                    <tbody>{fVendors.map((d,i)=>(
                      <tr key={i} className="tr" style={{borderBottom:'1px solid rgba(0,100,140,0.07)'}}>
                        <td style={{padding:'6px 8px',color:CC[i%CC.length],fontWeight:800,fontSize:10}}>#{i+1}</td>
                        <td style={{padding:'6px 8px',color:T.text,fontWeight:600,maxWidth:160}}>{d.name?.length>25?d.name.slice(0,25)+'…':d.name}</td>
                        <td style={{padding:'6px 8px',color:T.textM,fontWeight:600}}>{d.poCount}</td>
                        <td style={{padding:'6px 8px',color:T.tealD,fontWeight:700,whiteSpace:'nowrap'}}>{fmtCr(d.orderedCr)}</td>
                        <td style={{padding:'6px 8px',color:T.greenL,fontWeight:700,whiteSpace:'nowrap'}}>{fmtCr(d.deliveredCr)}</td>
                        <td style={{padding:'6px 8px',color:T.amber,fontWeight:700,whiteSpace:'nowrap'}}>{fmtCr(d.invoicedCr)}</td>
                      </tr>
                    ))}</tbody>
                  </table>
                </div>
              </div>
            </GC>

            {/* PO Table */}
            <div style={{display:'flex',alignItems:'center',gap:12}}>
              <div style={{background:'linear-gradient(135deg,#006978,#00bcd4)',borderRadius:10,padding:'5px 18px',display:'flex',alignItems:'center',gap:8,boxShadow:'0 2px 10px rgba(0,151,167,0.25)'}}>
                <span style={{fontSize:13}}>📄</span>
                <span style={{fontSize:11,fontWeight:900,color:'#fff',textTransform:'uppercase',letterSpacing:1}}>Purchase Orders — Top 30 by Value</span>
              </div>
              <div style={{flex:1,height:1,background:'rgba(0,151,167,0.15)',borderRadius:1}}/>
            </div>

            <GC style={{padding:16}}>
              <SH title="PO Register" sub="Ordered · Delivered · Invoiced · Pending Invoice"/>
              <div style={{overflowX:'auto'}}>
                <table style={{width:'100%',borderCollapse:'collapse',fontSize:11}}>
                  <thead><tr style={{borderBottom:`2px solid rgba(0,151,167,0.18)`}}>
                    {['#','PO No.','Vendor','WBS Description','Date','Net Value','Ordered','Delivered','Invoiced','Pending'].map(h=>(
                      <th key={h} style={{padding:'6px 10px',textAlign:'left',color:T.textM,fontSize:9,fontWeight:800,textTransform:'uppercase',whiteSpace:'nowrap'}}>{h}</th>
                    ))}
                  </tr></thead>
                  <tbody>{(poExpanded?fPO:fPO.slice(0,15)).map((d,i)=>{
                    const pendingColor = (d.pendingCr||0) > 0 ? T.amber : T.greenL;
                    return(
                      <tr key={i} className="tr" style={{borderBottom:'1px solid rgba(0,100,140,0.08)'}}>
                        <td style={{padding:'7px 10px',color:T.textM,fontWeight:700,fontSize:10}}>#{i+1}</td>
                        <td style={{padding:'7px 10px',color:T.tealD,fontFamily:'monospace',fontSize:10,fontWeight:700,whiteSpace:'nowrap'}}>{d.po}</td>
                        <td style={{padding:'7px 10px',color:T.text,fontWeight:600,maxWidth:150}}>{d.vendor?.length>22?d.vendor.slice(0,22)+'…':d.vendor}</td>
                        <td style={{padding:'7px 10px',color:T.textM,fontSize:10,maxWidth:180}}>{d.wbs?.length>30?d.wbs.slice(0,30)+'…':d.wbs}</td>
                        <td style={{padding:'7px 10px',color:T.textM,fontSize:10,whiteSpace:'nowrap'}}>{d.docDate||'—'}</td>
                        <td style={{padding:'7px 10px',color:T.navy,fontWeight:700,whiteSpace:'nowrap'}}>{fmtCr(d.netValueCr)}</td>
                        <td style={{padding:'7px 10px',color:T.tealD,fontWeight:700,whiteSpace:'nowrap'}}>{fmtCr(d.orderedCr)}</td>
                        <td style={{padding:'7px 10px',color:T.greenL,fontWeight:700,whiteSpace:'nowrap'}}>{fmtCr(d.deliveredCr)}</td>
                        <td style={{padding:'7px 10px',color:T.amber,fontWeight:700,whiteSpace:'nowrap'}}>{fmtCr(d.invoicedCr)}</td>
                        <td style={{padding:'7px 10px'}}>
                          <span style={{background:`${pendingColor}18`,border:`1px solid ${pendingColor}33`,borderRadius:8,padding:'2px 8px',color:pendingColor,fontWeight:700,fontSize:10,whiteSpace:'nowrap'}}>
                            {fmtCr(d.pendingCr)}
                          </span>
                        </td>
                      </tr>
                    );
                  })}</tbody>
                </table>
              </div>
              {fPO.length>15&&(
                <button onClick={()=>setPoExpanded(e=>!e)} style={{display:'flex',alignItems:'center',gap:6,margin:'10px auto 0',padding:'6px 20px',background:'rgba(0,151,167,0.06)',border:'1px solid rgba(0,151,167,0.2)',borderRadius:20,cursor:'pointer',fontSize:10,fontWeight:700,color:T.tealD}}>
                  {poExpanded?'▲ Show less':`▼ Show ${fPO.length-15} more POs`}
                </button>
              )}
            </GC>
          </div>
        )}

        {/* ══════════════════ TAB: WBS & BUDGET ══════════════════ */}
        {tab==='wbs'&&(
          <div style={{display:'flex',flexDirection:'column',gap:14}}>

            <div style={{display:'flex',alignItems:'center',gap:12}}>
              <div style={{background:'linear-gradient(135deg,#166534,#22c55e)',borderRadius:10,padding:'5px 18px',display:'flex',alignItems:'center',gap:8,boxShadow:'0 2px 10px rgba(34,197,94,0.3)'}}>
                <span style={{fontSize:13}}>📊</span>
                <span style={{fontSize:11,fontWeight:900,color:'#fff',textTransform:'uppercase',letterSpacing:1}}>WBS Budget vs Actual</span>
              </div>
              <div style={{flex:1,height:1,background:'rgba(34,197,94,0.15)',borderRadius:1}}/>
            </div>

            {/* WBS Bar Chart */}
            <GC style={{padding:16}}>
              <SH title="Top WBS Elements — Budget vs Actual" sub="₹ Crores — sorted by Budget"/>
              <ResponsiveContainer width="100%" height={Math.max(300, fWbs.length*28+40)}>
                <BarChart data={fWbs} layout="vertical" margin={{top:0,right:100,bottom:0,left:0}} barCategoryGap="25%">
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,60,100,0.1)" horizontal={false}/>
                  <XAxis type="number" tick={{fill:T.textM,fontSize:9,fontWeight:600}} axisLine={false} tickLine={false}/>
                  <YAxis type="category" dataKey="name" tick={{fill:T.text,fontSize:9,fontWeight:700}} axisLine={false} tickLine={false} width={200} tickFormatter={v=>v?.length>28?v.slice(0,28)+'…':v}/>
                  <Tooltip content={<CTip fmt={v=>`₹${v} Cr`}/>}/>
                  <Legend wrapperStyle={{color:T.text,fontSize:10,fontWeight:700}} iconSize={8}/>
                  <Bar dataKey="budgetCr" name="Budget" fill={`${T.navy}55`} radius={[0,4,4,0]} barSize={8}/>
                  <Bar dataKey="actualCr" name="Actual" fill={T.teal} radius={[0,4,4,0]} barSize={8}>
                    <LabelList content={({x,y,width,height,value,index})=>{
                      const d=fWbs[index];
                      return(<g><text x={x+width+6} y={y+height/2-3} textAnchor="start" dominantBaseline="middle" fill={T.tealD} fontSize={9} fontWeight={700}>{fmtCr(value)}</text><text x={x+width+6} y={y+height/2+8} textAnchor="start" dominantBaseline="middle" fill={d?.utilizationPct>90?T.red:T.amber} fontSize={8} fontWeight={700}>{d?.utilizationPct}% used</text></g>);
                    }}/>
                  </Bar>
                  <Bar dataKey="commitmentCr" name="Commitment" fill={T.amber} radius={[0,4,4,0]} barSize={8}/>
                </BarChart>
              </ResponsiveContainer>
            </GC>

            {/* WBS Detail Table */}
            <GC style={{padding:16}}>
              <SH title="WBS Detail Table" sub="Budget · Actual · Commitment · Available · Ordered · Delivered · Invoiced"/>
              <div style={{overflowX:'auto'}}>
                <table style={{width:'100%',borderCollapse:'collapse',fontSize:11}}>
                  <thead><tr style={{borderBottom:`2px solid rgba(0,151,167,0.18)`}}>
                    {['#','WBS Description','Budget','Actual','Commitment','Available','Utilization','Ordered','Delivered','Invoiced'].map(h=>(
                      <th key={h} style={{padding:'6px 10px',textAlign:'left',color:T.textM,fontSize:9,fontWeight:800,textTransform:'uppercase',whiteSpace:'nowrap'}}>{h}</th>
                    ))}
                  </tr></thead>
                  <tbody>{(wbsExpanded?fWbs:fWbs.slice(0,15)).map((d,i)=>{
                    const col = d.utilizationPct>=100?T.red:d.utilizationPct>=80?T.amber:d.utilizationPct>=50?T.teal:T.greenL;
                    return(
                      <tr key={i} className="tr" style={{borderBottom:'1px solid rgba(0,100,140,0.08)'}}>
                        <td style={{padding:'7px 10px',color:T.textM,fontWeight:700,fontSize:10}}>#{i+1}</td>
                        <td style={{padding:'7px 10px',color:T.text,fontWeight:700,maxWidth:220}}>{d.name}</td>
                        <td style={{padding:'7px 10px',color:T.navy,fontWeight:700,whiteSpace:'nowrap'}}>{fmtCr(d.budgetCr)}</td>
                        <td style={{padding:'7px 10px',color:T.tealD,fontWeight:700,whiteSpace:'nowrap'}}>{fmtCr(d.actualCr)}</td>
                        <td style={{padding:'7px 10px',color:T.amber,fontWeight:700,whiteSpace:'nowrap'}}>{fmtCr(d.commitmentCr)}</td>
                        <td style={{padding:'7px 10px',color:d.availableCr<0?T.red:T.greenL,fontWeight:700,whiteSpace:'nowrap'}}>{fmtCr(d.availableCr)}</td>
                        <td style={{padding:'7px 10px'}}>
                          <div style={{display:'flex',alignItems:'center',gap:6}}>
                            <div style={{width:44,height:5,background:'rgba(0,100,140,0.1)',borderRadius:3}}>
                              <div style={{width:`${Math.min(d.utilizationPct,100)}%`,height:'100%',background:col,borderRadius:3}}/>
                            </div>
                            <span style={{color:col,fontWeight:800,fontSize:10}}>{d.utilizationPct}%</span>
                          </div>
                        </td>
                        <td style={{padding:'7px 10px',color:T.teal,fontWeight:600,whiteSpace:'nowrap'}}>{fmtCr(d.orderedCr)}</td>
                        <td style={{padding:'7px 10px',color:T.greenL,fontWeight:600,whiteSpace:'nowrap'}}>{fmtCr(d.deliveredCr)}</td>
                        <td style={{padding:'7px 10px',color:T.amber,fontWeight:600,whiteSpace:'nowrap'}}>{fmtCr(d.invoicedCr)}</td>
                      </tr>
                    );
                  })}</tbody>
                </table>
              </div>
              {fWbs.length>15&&(
                <button onClick={()=>setWbsExpanded(e=>!e)} style={{display:'flex',alignItems:'center',gap:6,margin:'10px auto 0',padding:'6px 20px',background:'rgba(0,151,167,0.06)',border:'1px solid rgba(0,151,167,0.2)',borderRadius:20,cursor:'pointer',fontSize:10,fontWeight:700,color:T.tealD}}>
                  {wbsExpanded?'▲ Show less':`▼ Show ${fWbs.length-15} more`}
                </button>
              )}
            </GC>

          </div>
        )}

        {/* FOOTER */}
        <div style={{marginTop:16,display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:8,background:'rgba(255,255,255,0.95)',borderRadius:12,padding:'8px 16px',border:'1px solid rgba(255,255,255,0.9)'}}>
          <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
            <Chip label="Budget" value={fmtCr(kpi.totalBudgetCr)} color={T.navy} small/>
            <Chip label="Actual" value={fmtCr(kpi.totalActualCr)} color={T.teal} small/>
            <Chip label="Vendors" value={kpi.vendorCount?.toLocaleString('en-IN')} color={T.purple} small/>
            <Chip label="POs" value={kpi.poCount?.toLocaleString('en-IN')} color={T.amber} small/>
          </div>
          <div style={{display:'flex',flexDirection:'column',alignItems:'flex-end',gap:1}}>
            <div style={{display:'flex',alignItems:'center',gap:10}}>
              <span style={{color:T.text,fontSize:9,fontWeight:700,letterSpacing:1}}>SMARTWORLD COST INTELLIGENCE v1.0</span>

            </div>
            <span style={{color:T.tealD,fontSize:9,fontWeight:700,letterSpacing:0.5}}>✦ Created &amp; Developed by ANIRUDH VERMA</span>
          </div>
        </div>
      </div>
    </div>
  );
}
