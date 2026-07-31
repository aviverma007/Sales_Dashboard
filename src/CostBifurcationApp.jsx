import React, { useState, useEffect, useMemo } from 'react';
import {
  BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LabelList
} from 'recharts';

// ─── THEME (same as main dashboard) ──────────────────────────────────────────
const T = {
  glass:      'rgba(255,255,255,0.96)',
  glassH:     'rgba(255,255,255,1.0)',
  border:     'rgba(255,255,255,0.85)',
  teal:   '#0097a7', tealL:'#00bcd4', tealD:'#006978',
  red:    '#d32f2f', redL:'#ef5350',
  navy:   '#0d2137', navyM:'#1a3a5c',
  amber:  '#f57c00', amberL:'#ffb300',
  green:  '#2e7d32', greenL:'#43a047',
  gray:   '#546e7a',
  text:   '#0a1628', textM:'#1a2f45', textL:'#2d4a66',
  orange: '#e65100',
  purple: '#6a1b9a',
  blue:   '#1565c0',
};
const CC = ['#00acc1','#3f51b5','#43a047','#fb8c00','#e53935','#8e24aa','#00897b','#5c6bc0'];

// ─── UTILS ────────────────────────────────────────────────────────────────────
const fmtL = v => { if(v===undefined||v===null||isNaN(v)) return '₹0 L'; const n=Number(v); return `₹${n.toLocaleString('en-IN',{maximumFractionDigits:2})} L`; };
const pct = (a,b) => b>0 ? Math.round((a/b)*100) : 0;

// ─── GLASS CARD ───────────────────────────────────────────────────────────────
const GC = ({children,style={},cls=''}) => {
  const [h,sH]=useState(false);
  return (
    <div className={cls} onMouseEnter={()=>sH(true)} onMouseLeave={()=>sH(false)} style={{
      background: h?T.glassH:T.glass,
      border:`1px solid ${T.border}`,
      borderRadius:14, boxShadow:'0 4px 24px rgba(0,80,120,0.12)',
      transition:'all 0.25s ease', position:'relative', overflow:'hidden', ...style
    }}>
      <div style={{position:'absolute',top:0,left:0,right:0,height:1,background:'rgba(255,255,255,0.95)'}}/>
      {children}
    </div>
  );
};

const SH = ({title,sub,compact=false}) => (
  <div style={{marginBottom:compact?8:12}}>
    <p style={{fontSize:compact?10:12,fontWeight:800,color:T.tealD,letterSpacing:0.4,margin:0,textTransform:'uppercase'}}>{title}</p>
    {sub&&<p style={{fontSize:10,color:T.textM,margin:'2px 0 0',fontWeight:600}}>{sub}</p>}
  </div>
);

const CTip = ({active,payload,label,fmt}) => {
  if(!active||!payload?.length) return null;
  return (
    <div style={{background:'rgba(255,255,255,0.97)',border:'1px solid rgba(0,151,167,0.3)',borderRadius:10,padding:'8px 12px',boxShadow:'0 8px 32px rgba(0,80,120,0.18)',fontFamily:'Inter,sans-serif',fontSize:11,maxWidth:220}}>
      <p style={{color:T.tealD,fontWeight:700,marginBottom:4}}>{label}</p>
      {payload.map((p,i)=>(<p key={i} style={{color:p.color||T.text,margin:'2px 0'}}><span style={{color:T.textL}}>{p.name}: </span>{fmt?fmt(p.value,p.name):(typeof p.value==='number'?fmtL(p.value):p.value)}</p>))}
    </div>
  );
};

// ─── SINGLE FILTER (Budget Head) ─────────────────────────────────────────────
const FSel = ({label,options,value,onChange,open,setOpen}) => {
  const vals = value?value.split('||').filter(Boolean):[];
  const toggle = v => { const n=vals.includes(v)?vals.filter(x=>x!==v):[...vals,v]; onChange(n.join('||')); };
  return(
    <div style={{display:'flex',flexDirection:'column',gap:2,position:'relative'}}>
      <label style={{color:T.textM,fontSize:9,fontWeight:800,letterSpacing:1,textTransform:'uppercase'}}>{label}</label>
      <div onClick={()=>setOpen(!open)} style={{background:'rgba(255,255,255,0.88)',border:`1px solid ${vals.length?T.teal:'rgba(0,100,140,0.25)'}`,borderRadius:7,color:vals.length?T.tealD:T.textM,padding:'6px 12px',fontSize:11,fontFamily:'Inter,sans-serif',minWidth:200,cursor:'pointer',fontWeight:vals.length?600:400,userSelect:'none',display:'flex',justifyContent:'space-between',alignItems:'center',gap:6}}>
        <span style={{overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',maxWidth:190}}>{vals.length?vals.join(', '):`All ${label}s`}</span>
        <span style={{fontSize:8,opacity:0.6}}>{open?'▲':'▼'}</span>
      </div>
      {open&&(
        <div onClick={e=>e.stopPropagation()} style={{position:'absolute',top:'100%',left:0,zIndex:999,background:'#fff',border:`1px solid ${T.teal}30`,borderRadius:8,boxShadow:'0 8px 24px rgba(0,80,120,0.15)',minWidth:260,maxHeight:260,overflowY:'auto',padding:4,marginTop:2}}>
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

// ═══════════════════════════════════════════════════════════════════════════════
// COST BIFURCATION DASHBOARD
// ═══════════════════════════════════════════════════════════════════════════════
export default function CostBifurcationApp() {
  const [authed] = useState(()=>sessionStorage.getItem('costbif_auth')==='1');
  const [raw, setRaw] = useState(null);
  const [loading, setLoading] = useState(true);
  const [budgetHead, setBudgetHead] = useState('');
  const [department, setDepartment] = useState('');
  const [activeFilter, setActiveFilter] = useState(null); // 'budgetHead' | 'department' | null

  useEffect(()=>{
    document.addEventListener('click',()=>setActiveFilter(null));
    return ()=>document.removeEventListener('click',()=>setActiveFilter(null));
  },[]);

  useEffect(()=>{
    fetch('/data/cost_bifurcation_data.json').then(r=>r.json()).then(d=>{setRaw(d);setLoading(false);}).catch(()=>setLoading(false));
  },[]);

  if (!authed) return null;

  // ── FILTERED DATA — fWbs is filtered by BOTH Budget Head and Department;
  // fBudgetHead/fDepartment are then re-aggregated live FROM fWbs (not read
  // from the pre-computed raw.byBudgetHead/byDepartment), so cross-filtering
  // (e.g. Department=IT narrowing what shows per Budget Head) is always
  // correct rather than showing stale unfiltered totals.
  const selectedHeads = budgetHead ? budgetHead.split('||').filter(Boolean) : [];
  const selectedDepts = department ? department.split('||').filter(Boolean) : [];

  const fWbs = useMemo(()=>{
    if(!raw?.wbsTable) return [];
    return raw.wbsTable.filter(w=>
      (!selectedHeads.length || selectedHeads.includes(w.budgetHead)) &&
      (!selectedDepts.length || selectedDepts.includes(w.department))
    );
  },[raw, budgetHead, department]);

  const aggBy = (rows, keyField) => {
    const acc = {};
    rows.forEach(r=>{
      const k = r[keyField];
      if(!acc[k]) acc[k]={budget:0,assigned:0,actual:0,commitment:0,available:0,wbsCount:0};
      acc[k].budget+=r.budget; acc[k].assigned+=r.assigned; acc[k].actual+=r.actual;
      acc[k].commitment+=r.commitment; acc[k].available+=r.available; acc[k].wbsCount++;
    });
    return Object.entries(acc).map(([k,v])=>({
      [keyField]: k,
      budget:v.budget, assigned:v.assigned, actual:v.actual, commitment:v.commitment, available:v.available,
      budgetL:+(v.budget/1e5).toFixed(2), assignedL:+(v.assigned/1e5).toFixed(2), actualL:+(v.actual/1e5).toFixed(2),
      commitmentL:+(v.commitment/1e5).toFixed(2), availableL:+(v.available/1e5).toFixed(2),
      wbsCount:v.wbsCount,
      utilPct: v.budget>0?+((v.actual/v.budget)*100).toFixed(1):0,
      availPct: v.budget>0?+((v.available/v.budget)*100).toFixed(1):0,
    })).sort((a,b)=>b.budget-a.budget);
  };

  const fBudgetHead = useMemo(()=>aggBy(fWbs,'budgetHead'),[fWbs]);
  const fDepartment = useMemo(()=>aggBy(fWbs,'department'),[fWbs]);

  // ── RECOMPUTED KPIs based on filtered set ──
  const kpi = useMemo(()=>{
    if(!fWbs.length) return {totalBudget:0,totalAssigned:0,totalActual:0,totalCommitment:0,totalAvailable:0,wbsCount:0,totalBudgetL:0,totalAssignedL:0,totalActualL:0,totalCommitmentL:0,totalAvailableL:0,utilizationPct:0};
    const s = fWbs.reduce((acc,r)=>{
      acc.totalBudget+=r.budget; acc.totalAssigned+=r.assigned; acc.totalActual+=r.actual;
      acc.totalCommitment+=r.commitment; acc.totalAvailable+=r.available; acc.wbsCount++;
      return acc;
    },{totalBudget:0,totalAssigned:0,totalActual:0,totalCommitment:0,totalAvailable:0,wbsCount:0});
    s.totalBudgetL = +(s.totalBudget/100000).toFixed(2);
    s.totalAssignedL = +(s.totalAssigned/100000).toFixed(2);
    s.totalActualL = +(s.totalActual/100000).toFixed(2);
    s.totalCommitmentL = +(s.totalCommitment/100000).toFixed(2);
    s.totalAvailableL = +(s.totalAvailable/100000).toFixed(2);
    s.utilizationPct = s.totalBudget ? +((s.totalActual/s.totalBudget)*100).toFixed(1) : 0;
    return s;
  },[fWbs]);

  const fo = raw?.filterOptions || {budgetHeads:[],departments:[]};

  // ── Pie: Budget distribution by Budget Head ──
  const pieBudget = fBudgetHead.map(b=>({name:b.budgetHead, value:b.budgetL}));
  // ── Pie: Actual vs Available (utilization split) ──
  const pieUtil = [
    {name:'Actual Spent', value:kpi.totalActualL||0},
    {name:'Available', value:kpi.totalAvailableL||0},
  ];

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
        <p style={{fontFamily:'Inter,sans-serif',color:'#0d1f3c',fontSize:14,fontWeight:900,margin:'0 0 4px'}}>Cost Bifurcation</p>
        <p style={{fontFamily:'Inter,sans-serif',color:T.textM,fontSize:11,fontWeight:500,margin:0}}>Loading IT budget data...</p>
      </div>
    </div>
  );

  return (
    <div style={{minHeight:'100vh',backgroundImage:'url(/bg.jpg)',backgroundSize:'cover',backgroundPosition:'center',backgroundAttachment:'fixed',fontFamily:'Inter,sans-serif',color:T.text}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap');
        *{box-sizing:border-box;scrollbar-width:thin;scrollbar-color:rgba(0,151,167,0.3) transparent}
        ::-webkit-scrollbar{width:4px;height:4px}::-webkit-scrollbar-thumb{background:rgba(0,151,167,0.4);border-radius:2px}
        @keyframes fadeIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}
        .kc{transition:transform 0.2s ease,box-shadow 0.2s ease}.kc:hover{transform:translateY(-2px);box-shadow:0 8px 32px rgba(0,80,120,0.18)!important}
        .tr:hover td{background:rgba(0,151,167,0.06)!important}
      `}</style>
      <div style={{position:'fixed',inset:0,background:'rgba(0,20,40,0.25)',pointerEvents:'none',zIndex:0}}/>

      {/* HEADER */}
      <header style={{position:'sticky',top:0,zIndex:200,background:'rgba(255,255,255,0.95)',WebkitBackdropFilter:'blur(24px)',borderBottom:'1px solid rgba(255,255,255,0.9)',boxShadow:'0 2px 20px rgba(0,60,100,0.12)'}}>
        <div style={{maxWidth:1440,margin:'0 auto',padding:'0 24px',display:'flex',alignItems:'center',justifyContent:'space-between',height:54}}>
          <div style={{display:'flex',alignItems:'center',gap:12}}>
            <div style={{width:38,height:38,borderRadius:9,background:'#0d1f3c',display:'flex',alignItems:'center',justifyContent:'center',boxShadow:'0 4px 14px rgba(0,30,80,0.3)',flexShrink:0,overflow:'hidden'}}>
              <img src="/swd-logo.png" alt="SWD" style={{width:26,height:26,objectFit:'contain'}}/>
            </div>
            <div>
              <div style={{fontWeight:900,fontSize:15,letterSpacing:0.5,color:T.navy}}>Cost Bifurcation</div>
              <div style={{color:T.textM,fontSize:9,letterSpacing:1.5,fontWeight:700}}>SMARTWORLD GROUP · IT BUDGET FY 2026-27</div>
            </div>
          </div>
          <button onClick={()=>{sessionStorage.removeItem('costbif_auth');window.location.reload();}} style={{display:'flex',alignItems:'center',gap:6,padding:'6px 14px',borderRadius:10,border:'1px solid rgba(200,40,40,0.25)',background:'rgba(211,47,47,0.07)',cursor:'pointer',fontSize:11,fontWeight:700,color:T.red,fontFamily:'Inter,sans-serif',transition:'all 0.15s'}} onMouseOver={e=>{e.currentTarget.style.background='rgba(211,47,47,0.14)';}} onMouseOut={e=>{e.currentTarget.style.background='rgba(211,47,47,0.07)';}}>
            🔒 Logout
          </button>
        </div>

        {/* Filter strip — Budget Head + Department */}
        <div onClick={e=>e.stopPropagation()} style={{maxWidth:1440,margin:'0 auto',padding:'4px 24px 10px',display:'flex',alignItems:'flex-end',gap:10,flexWrap:'wrap'}}>
          <FSel label="Budget Head" options={fo.budgetHeads||[]} value={budgetHead} onChange={setBudgetHead} open={activeFilter==='budgetHead'} setOpen={o=>setActiveFilter(o?'budgetHead':null)}/>
          <FSel label="Department" options={fo.departments||[]} value={department} onChange={setDepartment} open={activeFilter==='department'} setOpen={o=>setActiveFilter(o?'department':null)}/>
          {(budgetHead||department)&&(
            <button onClick={()=>{setBudgetHead('');setDepartment('');}}
              style={{background:'linear-gradient(135deg,#c62828,#ef5350)',border:'none',borderRadius:7,color:'#fff',padding:'6px 14px',fontSize:10,cursor:'pointer',fontWeight:700,boxShadow:'0 2px 8px rgba(200,40,40,0.3)',alignSelf:'flex-end'}}>
              ✕ Reset
            </button>
          )}
        </div>
      </header>

      {/* MAIN */}
      <div style={{position:'relative',zIndex:1,maxWidth:1440,margin:'0 auto',padding:'16px 24px 24px',animation:'fadeIn 0.35s ease',display:'flex',flexDirection:'column',gap:14}}>

        {/* ── ROW 1: KPI CARDS (5 metrics) ── */}
        <div style={{display:'grid',gridTemplateColumns:'repeat(5,1fr)',gap:12}}>
          {[
            {label:'Budget — Overall', val:fmtL(kpi.totalBudgetL), color:T.navy, icon:'🏦', sub:`${kpi.wbsCount} WBS elements`},
            {label:'Assigned — Overall', val:fmtL(kpi.totalAssignedL), color:T.blue, icon:'📋', sub:`${pct(kpi.totalAssigned,kpi.totalBudget)}% of budget`},
            {label:'Actual — Overall', val:fmtL(kpi.totalActualL), color:T.teal, icon:'✅', sub:`${pct(kpi.totalActual,kpi.totalBudget)}% utilized`},
            {label:'Commitment — Overall', val:fmtL(kpi.totalCommitmentL), color:T.amber, icon:'🔗', sub:`${pct(kpi.totalCommitment,kpi.totalBudget)}% of budget`},
            {label:'Available — Overall', val:fmtL(kpi.totalAvailableL), color:T.greenL, icon:'💚', sub:`${pct(kpi.totalAvailable,kpi.totalBudget)}% remaining`},
          ].map((d,i)=>(
            <GC key={i} style={{padding:14}} cls="kc">
              <SH title={d.label} compact/>
              <div style={{display:'flex',alignItems:'baseline',gap:6,marginTop:2}}>
                <span style={{fontSize:12}}>{d.icon}</span>
                <p style={{fontSize:19,fontWeight:900,color:d.color,margin:0,letterSpacing:-0.5}}>{d.val}</p>
              </div>
              <p style={{color:T.textM,fontSize:10,margin:'4px 0 0',fontWeight:600}}>{d.sub}</p>
              <div style={{position:'absolute',bottom:0,left:0,right:0,height:3,background:`linear-gradient(90deg,${d.color},transparent)`,borderRadius:'0 0 14px 14px'}}/>
            </GC>
          ))}
        </div>

        {/* Section header */}
        <div style={{display:'flex',alignItems:'center',gap:12}}>
          <div style={{background:'linear-gradient(135deg,#006978,#00bcd4)',borderRadius:10,padding:'5px 18px',display:'flex',alignItems:'center',gap:8,boxShadow:'0 2px 10px rgba(0,151,167,0.25)'}}>
            <span style={{fontSize:13}}>📊</span>
            <span style={{fontSize:11,fontWeight:900,color:'#fff',textTransform:'uppercase',letterSpacing:1}}>Cost Bifurcation by Budget Head</span>
          </div>
          <div style={{flex:1,height:1,background:'rgba(0,151,167,0.15)',borderRadius:1}}/>
        </div>

        {/* ── ROW 2a: BAR CHART (all 5 metrics) — full width so 22 Budget Heads fit legibly ── */}
        <GC style={{padding:16}}>
          <SH title="Cost Bifurcation" sub="Budget · Assigned · Actual · Commitment · Available (₹ Lakh)"/>
          <ResponsiveContainer width="100%" height={420}>
            <BarChart data={fBudgetHead} margin={{top:20,right:12,bottom:70,left:0}}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,60,100,0.15)" vertical={false}/>
              <XAxis dataKey="budgetHead" tick={{fill:T.textM,fontSize:9,fontWeight:600}} axisLine={false} tickLine={false} angle={-35} textAnchor="end" interval={0} height={90}/>
              <YAxis tick={{fill:T.textM,fontSize:9,fontWeight:600}} axisLine={false} tickLine={false} tickFormatter={v=>v+'L'} width={48}/>
              <Tooltip content={<CTip fmt={v=>fmtL(v)}/>}/>
              <Legend wrapperStyle={{fontSize:9,fontWeight:700}} iconSize={8}/>
              <Bar dataKey="budgetL" name="Budget" fill={T.gray} radius={[3,3,0,0]}>
                <LabelList dataKey="budgetL" position="top" style={{fill:T.gray,fontSize:8,fontWeight:700}}/>
              </Bar>
              <Bar dataKey="assignedL" name="Assigned" fill={T.blue} radius={[3,3,0,0]}>
                <LabelList dataKey="assignedL" position="top" style={{fill:T.blue,fontSize:8,fontWeight:700}}/>
              </Bar>
              <Bar dataKey="actualL" name="Actual" fill={T.teal} radius={[3,3,0,0]}>
                <LabelList dataKey="actualL" position="top" style={{fill:T.tealD,fontSize:8,fontWeight:700}}/>
              </Bar>
              <Bar dataKey="commitmentL" name="Commitment" fill={T.amber} radius={[3,3,0,0]}>
                <LabelList dataKey="commitmentL" position="top" style={{fill:T.amber,fontSize:8,fontWeight:700}}/>
              </Bar>
              <Bar dataKey="availableL" name="Available" fill={T.greenL} radius={[3,3,0,0]}>
                <LabelList dataKey="availableL" position="top" style={{fill:T.greenL,fontSize:8,fontWeight:700}}/>
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </GC>

        {/* ── ROW 2b: PIE (budget distribution) + PIE (util split) — moved below the bar chart ── */}
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
          <GC style={{padding:16}}>
            <SH title="Budget Distribution" sub="By Budget Head (₹ Lakh)"/>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <defs>
                  {CC.map((c,i)=>(
                    <radialGradient key={i} id={`pieGrad${i}`} cx="35%" cy="35%" r="75%">
                      <stop offset="0%" stopColor={c} stopOpacity={1}/>
                      <stop offset="100%" stopColor={c} stopOpacity={0.72}/>
                    </radialGradient>
                  ))}
                </defs>
                <Pie data={pieBudget} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={82} innerRadius={0}
                  stroke="rgba(255,255,255,0.9)" strokeWidth={2}
                  label={({percent})=>percent>0.04?`${(percent*100).toFixed(0)}%`:''}
                  labelLine={false}
                  style={{fontSize:9,fontWeight:800,fill:'#fff'}}>
                  {pieBudget.map((e,i)=>(<Cell key={i} fill={`url(#pieGrad${i%CC.length})`} style={{filter:'drop-shadow(0 3px 4px rgba(0,0,0,0.18))'}}/>))}
                </Pie>
                <Tooltip content={<CTip fmt={v=>fmtL(v)}/>}/>
              </PieChart>
            </ResponsiveContainer>
            <div style={{display:'flex',flexDirection:'column',gap:4,marginTop:8,maxHeight:120,overflowY:'auto'}}>
              {pieBudget.map((e,i)=>(
                <div key={i} style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:6}}>
                  <div style={{display:'flex',alignItems:'center',gap:6,minWidth:0}}>
                    <div style={{width:8,height:8,borderRadius:2,background:CC[i%CC.length],flexShrink:0}}/>
                    <span style={{fontSize:9,color:T.textM,fontWeight:600,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{e.name}</span>
                  </div>
                  <span style={{fontSize:9,color:T.text,fontWeight:800,flexShrink:0}}>{fmtL(e.value)}</span>
                </div>
              ))}
            </div>
          </GC>

          <GC style={{padding:16}}>
            <SH title="Utilization Split" sub="Actual Spent vs Available (₹ Lakh)"/>
            <div style={{position:'relative',width:'100%',height:200}}>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <defs>
                    <radialGradient id="utilGradActual" cx="35%" cy="35%" r="75%">
                      <stop offset="0%" stopColor={T.tealL} stopOpacity={1}/>
                      <stop offset="100%" stopColor={T.tealD} stopOpacity={1}/>
                    </radialGradient>
                    <radialGradient id="utilGradAvail" cx="35%" cy="35%" r="75%">
                      <stop offset="0%" stopColor="#cfd8dc" stopOpacity={1}/>
                      <stop offset="100%" stopColor="#90a4ae" stopOpacity={1}/>
                    </radialGradient>
                  </defs>
                  <Pie data={pieUtil} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={55} outerRadius={78} paddingAngle={3}
                    stroke="rgba(255,255,255,0.9)" strokeWidth={2}
                    label={({cx,cy,midAngle,innerRadius,outerRadius,value,percent})=>{
                      const RAD=Math.PI/180;
                      const r=innerRadius+(outerRadius-innerRadius)/2;
                      const x=cx+r*Math.cos(-midAngle*RAD);
                      const y=cy+r*Math.sin(-midAngle*RAD);
                      return (
                        <text x={x} y={y} textAnchor="middle" dominantBaseline="central" style={{fontSize:8.5,fontWeight:800,fill:'#fff',pointerEvents:'none'}}>
                          <tspan x={x} dy="-0.4em">{fmtL(value)}</tspan>
                          <tspan x={x} dy="1.1em">{(percent*100).toFixed(0)}%</tspan>
                        </text>
                      );
                    }}
                    labelLine={false}>
                    <Cell fill="url(#utilGradActual)" style={{filter:'drop-shadow(0 3px 5px rgba(0,151,167,0.35))'}}/>
                    <Cell fill="url(#utilGradAvail)" style={{filter:'drop-shadow(0 3px 5px rgba(0,0,0,0.12))'}}/>
                  </Pie>
                  <Tooltip content={<CTip fmt={v=>fmtL(v)}/>}/>
                </PieChart>
              </ResponsiveContainer>
              <div style={{position:'absolute',top:'50%',left:'50%',transform:'translate(-50%,-50%)',display:'flex',flexDirection:'column',alignItems:'center',pointerEvents:'none'}}>
                <span style={{fontSize:8,color:T.textM,fontWeight:700,textTransform:'uppercase',letterSpacing:0.5}}>Total Budget</span>
                <span style={{fontSize:15,color:T.navy,fontWeight:900,letterSpacing:-0.3}}>{fmtL(kpi.totalBudgetL)}</span>
              </div>
            </div>
            <div style={{display:'flex',flexDirection:'column',gap:6,marginTop:8}}>
              <div style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
                <div style={{display:'flex',alignItems:'center',gap:6}}><div style={{width:8,height:8,borderRadius:2,background:T.teal}}/><span style={{fontSize:10,color:T.textM,fontWeight:700}}>Actual Spent</span></div>
                <span style={{fontSize:11,color:T.tealD,fontWeight:800}}>{fmtL(kpi.totalActualL)} <span style={{color:T.textL,fontWeight:600}}>({pct(kpi.totalActualL,kpi.totalBudgetL)}%)</span></span>
              </div>
              <div style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
                <div style={{display:'flex',alignItems:'center',gap:6}}><div style={{width:8,height:8,borderRadius:2,background:'#90a4ae'}}/><span style={{fontSize:10,color:T.textM,fontWeight:700}}>Available</span></div>
                <span style={{fontSize:11,color:T.text,fontWeight:800}}>{fmtL(kpi.totalAvailableL)} <span style={{color:T.textL,fontWeight:600}}>({pct(kpi.totalAvailableL,kpi.totalBudgetL)}%)</span></span>
              </div>
            </div>
          </GC>
        </div>

        {/* Section header */}
        <div style={{display:'flex',alignItems:'center',gap:12}}>
          <div style={{background:'linear-gradient(135deg,#b45309,#f59e0b)',borderRadius:10,padding:'5px 18px',display:'flex',alignItems:'center',gap:8,boxShadow:'0 2px 10px rgba(245,158,11,0.3)'}}>
            <span style={{fontSize:13}}>📈</span>
            <span style={{fontSize:11,fontWeight:900,color:'#fff',textTransform:'uppercase',letterSpacing:1}}>Utilization % by Budget Head</span>
          </div>
          <div style={{flex:1,height:1,background:'rgba(245,158,11,0.15)',borderRadius:1}}/>
        </div>

        {/* ── ROW 3: HORIZONTAL % BAR + BUDGET HEAD SUMMARY TABLE ── */}
        <div style={{display:'grid',gridTemplateColumns:'1fr 1.4fr',gap:12}}>
          <GC style={{padding:16}}>
            <SH title="% Actual Utilized" sub="Actual spend as % of Budget, by Budget Head"/>
            <div style={{display:'flex',flexDirection:'column',gap:10,marginTop:8}}>
              {[...fBudgetHead].sort((a,b)=>b.utilPct-a.utilPct).map((b,i)=>(
                <div key={i}>
                  <div style={{display:'flex',justifyContent:'space-between',marginBottom:3}}>
                    <span style={{fontSize:10,color:T.textM,fontWeight:700}}>{b.budgetHead}</span>
                    <span style={{fontSize:10,color:T.tealD,fontWeight:800}}>{b.utilPct}%</span>
                  </div>
                  <div style={{height:14,background:'rgba(0,100,140,0.08)',borderRadius:7,overflow:'hidden'}}>
                    <div style={{height:'100%',width:`${Math.min(b.utilPct,100)}%`,background:`linear-gradient(90deg,${CC[i%CC.length]},${CC[i%CC.length]}cc)`,borderRadius:7,transition:'width 0.4s ease'}}/>
                  </div>
                </div>
              ))}
            </div>
          </GC>

          <GC style={{padding:16}}>
            <SH title="Budget Head Summary" sub="All 5 metrics · WBS element count"/>
            <div style={{overflowX:'auto'}}>
              <table style={{width:'100%',borderCollapse:'collapse',fontSize:10.5}}>
                <thead>
                  <tr style={{background:T.navy}}>
                    {['Budget Head','Budget (L)','Assigned (L)','Actual (L)','Commitment (L)','Available (L)','Util %','WBS #'].map((h,i)=>(
                      <th key={i} style={{padding:'8px 10px',textAlign:i===0?'left':'right',color:'#fff',fontWeight:800,fontSize:9.5,textTransform:'uppercase',letterSpacing:0.3,whiteSpace:'nowrap'}}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {fBudgetHead.map((b,i)=>(
                    <tr key={i} className="tr" style={{borderBottom:'1px solid rgba(0,60,100,0.08)'}}>
                      <td style={{padding:'7px 10px',fontWeight:700,color:T.text}}>{b.budgetHead}</td>
                      <td style={{padding:'7px 10px',textAlign:'right',color:T.textM,fontWeight:600}}>{b.budgetL.toLocaleString('en-IN')}</td>
                      <td style={{padding:'7px 10px',textAlign:'right',color:T.blue,fontWeight:600}}>{b.assignedL.toLocaleString('en-IN')}</td>
                      <td style={{padding:'7px 10px',textAlign:'right',color:T.tealD,fontWeight:700}}>{b.actualL.toLocaleString('en-IN')}</td>
                      <td style={{padding:'7px 10px',textAlign:'right',color:T.amber,fontWeight:600}}>{b.commitmentL.toLocaleString('en-IN')}</td>
                      <td style={{padding:'7px 10px',textAlign:'right',color:T.green,fontWeight:600}}>{b.availableL.toLocaleString('en-IN')}</td>
                      <td style={{padding:'7px 10px',textAlign:'right',color:T.text,fontWeight:700}}>{b.utilPct}%</td>
                      <td style={{padding:'7px 10px',textAlign:'right',color:T.textM,fontWeight:600}}>{b.wbsCount}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr style={{background:T.navy}}>
                    <td style={{padding:'8px 10px',fontWeight:900,color:'#fff'}}>Total</td>
                    <td style={{padding:'8px 10px',textAlign:'right',fontWeight:900,color:'#fff'}}>{kpi.totalBudgetL.toLocaleString('en-IN')}</td>
                    <td style={{padding:'8px 10px',textAlign:'right',fontWeight:900,color:'#fff'}}>{kpi.totalAssignedL.toLocaleString('en-IN')}</td>
                    <td style={{padding:'8px 10px',textAlign:'right',fontWeight:900,color:'#fff'}}>{kpi.totalActualL.toLocaleString('en-IN')}</td>
                    <td style={{padding:'8px 10px',textAlign:'right',fontWeight:900,color:'#fff'}}>{kpi.totalCommitmentL.toLocaleString('en-IN')}</td>
                    <td style={{padding:'8px 10px',textAlign:'right',fontWeight:900,color:'#fff'}}>{kpi.totalAvailableL.toLocaleString('en-IN')}</td>
                    <td style={{padding:'8px 10px',textAlign:'right',fontWeight:900,color:'#fff'}}>{kpi.utilizationPct}%</td>
                    <td style={{padding:'8px 10px',textAlign:'right',fontWeight:900,color:'#fff'}}>{kpi.wbsCount}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </GC>
        </div>

        {/* Section header — Department */}
        <div style={{display:'flex',alignItems:'center',gap:12}}>
          <div style={{background:'linear-gradient(135deg,#00695c,#26a69a)',borderRadius:10,padding:'5px 18px',display:'flex',alignItems:'center',gap:8,boxShadow:'0 2px 10px rgba(0,105,92,0.3)'}}>
            <span style={{fontSize:13}}>🏢</span>
            <span style={{fontSize:11,fontWeight:900,color:'#fff',textTransform:'uppercase',letterSpacing:1}}>Cost Bifurcation by Department</span>
          </div>
          <div style={{flex:1,height:1,background:'rgba(0,105,92,0.15)',borderRadius:1}}/>
        </div>

        {/* ── ROW 3b: DEPARTMENT CARDS ── */}
        <div style={{display:'grid',gridTemplateColumns:`repeat(${Math.max(fDepartment.length,1)},1fr)`,gap:12}}>
          {fDepartment.map((dpt,i)=>(
            <GC key={i} style={{padding:16}} cls="kc">
              <SH title={dpt.department} sub={`${dpt.wbsCount} WBS elements · ${dpt.utilPct}% utilized`}/>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginTop:8}}>
                {[
                  {l:'Budget',v:dpt.budgetL,c:T.navy},
                  {l:'Assigned',v:dpt.assignedL,c:T.blue},
                  {l:'Actual',v:dpt.actualL,c:T.teal},
                  {l:'Commitment',v:dpt.commitmentL,c:T.amber},
                  {l:'Available',v:dpt.availableL,c:T.greenL},
                ].map((m,j)=>(
                  <div key={j}>
                    <p style={{fontSize:8,color:T.textM,fontWeight:800,textTransform:'uppercase',margin:0,letterSpacing:0.4}}>{m.l}</p>
                    <p style={{fontSize:13,fontWeight:900,color:m.c,margin:'2px 0 0'}}>{fmtL(m.v)}</p>
                  </div>
                ))}
              </div>
              <div style={{height:10,background:'rgba(0,100,140,0.08)',borderRadius:5,overflow:'hidden',marginTop:10}}>
                <div style={{height:'100%',width:`${Math.min(dpt.utilPct,100)}%`,background:`linear-gradient(90deg,${T.teal},${T.tealD})`,borderRadius:5}}/>
              </div>
            </GC>
          ))}
        </div>

        {/* Section header */}
        <div style={{display:'flex',alignItems:'center',gap:12}}>
          <div style={{background:'linear-gradient(135deg,#4527a0,#7e57c2)',borderRadius:10,padding:'5px 18px',display:'flex',alignItems:'center',gap:8,boxShadow:'0 2px 10px rgba(126,87,194,0.3)'}}>
            <span style={{fontSize:13}}>🔍</span>
            <span style={{fontSize:11,fontWeight:900,color:'#fff',textTransform:'uppercase',letterSpacing:1}}>WBS Line-Item Detail ({fWbs.length})</span>
          </div>
          <div style={{flex:1,height:1,background:'rgba(126,87,194,0.15)',borderRadius:1}}/>
        </div>

        {/* ── ROW 4: FULL WBS DRILL-DOWN TABLE ── */}
        <GC style={{padding:16}}>
          <SH title="WBS Elements" sub="Full line-item detail for auditor review — sorted by Budget"/>
          <div style={{overflowX:'auto',maxHeight:480,overflowY:'auto'}}>
            <table style={{width:'100%',borderCollapse:'collapse',fontSize:10.5}}>
              <thead>
                <tr style={{background:T.navy,position:'sticky',top:0,zIndex:1}}>
                  {['Site','WBS','Budget Head','Department','Description','Budget (L)','Assigned (L)','Actual (L)','Commitment (L)','Available (L)','Util %'].map((h,i)=>(
                    <th key={i} style={{padding:'8px 10px',textAlign:i>4?'right':'left',color:'#fff',fontWeight:800,fontSize:9.5,textTransform:'uppercase',letterSpacing:0.3,whiteSpace:'nowrap'}}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {fWbs.map((w,i)=>(
                  <tr key={i} className="tr" style={{borderBottom:'1px solid rgba(0,60,100,0.08)'}}>
                    <td style={{padding:'6px 10px',color:T.textM,fontWeight:600,whiteSpace:'nowrap'}}>{w.site}</td>
                    <td style={{padding:'6px 10px',color:T.textL,fontWeight:600,whiteSpace:'nowrap',fontFamily:'monospace',fontSize:9.5}}>{w.wbs}</td>
                    <td style={{padding:'6px 10px',color:T.text,fontWeight:700,whiteSpace:'nowrap'}}>{w.budgetHead}</td>
                    <td style={{padding:'6px 10px',color:T.tealD,fontWeight:700,whiteSpace:'nowrap'}}>{w.department}</td>
                    <td style={{padding:'6px 10px',color:T.textM,fontWeight:500,maxWidth:180,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}} title={w.description}>{w.description}</td>
                    <td style={{padding:'6px 10px',textAlign:'right',color:T.textM,fontWeight:600}}>{w.budgetL.toLocaleString('en-IN')}</td>
                    <td style={{padding:'6px 10px',textAlign:'right',color:T.blue,fontWeight:600}}>{w.assignedL.toLocaleString('en-IN')}</td>
                    <td style={{padding:'6px 10px',textAlign:'right',color:T.tealD,fontWeight:700}}>{w.actualL.toLocaleString('en-IN')}</td>
                    <td style={{padding:'6px 10px',textAlign:'right',color:T.amber,fontWeight:600}}>{w.commitmentL.toLocaleString('en-IN')}</td>
                    <td style={{padding:'6px 10px',textAlign:'right',color:T.green,fontWeight:600}}>{w.availableL.toLocaleString('en-IN')}</td>
                    <td style={{padding:'6px 10px',textAlign:'right',color:T.text,fontWeight:700}}>{w.utilPct}%</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr style={{background:T.navy,position:'sticky',bottom:0}}>
                  <td colSpan={5} style={{padding:'8px 10px',fontWeight:900,color:'#fff'}}>Total ({fWbs.length} WBS)</td>
                  <td style={{padding:'8px 10px',textAlign:'right',fontWeight:900,color:'#fff'}}>{kpi.totalBudgetL.toLocaleString('en-IN')}</td>
                  <td style={{padding:'8px 10px',textAlign:'right',fontWeight:900,color:'#fff'}}>{kpi.totalAssignedL.toLocaleString('en-IN')}</td>
                  <td style={{padding:'8px 10px',textAlign:'right',fontWeight:900,color:'#fff'}}>{kpi.totalActualL.toLocaleString('en-IN')}</td>
                  <td style={{padding:'8px 10px',textAlign:'right',fontWeight:900,color:'#fff'}}>{kpi.totalCommitmentL.toLocaleString('en-IN')}</td>
                  <td style={{padding:'8px 10px',textAlign:'right',fontWeight:900,color:'#fff'}}>{kpi.totalAvailableL.toLocaleString('en-IN')}</td>
                  <td style={{padding:'8px 10px',textAlign:'right',fontWeight:900,color:'#fff'}}>{kpi.utilizationPct}%</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </GC>

      </div>
    </div>
  );
}
