import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, LabelList, ComposedChart, Line
} from 'recharts';

const T = {
  teal:'#0097a7', tealD:'#006978', tealL:'#00bcd4',
  navy:'#0d2137', navyM:'#1a3a5c',
  amber:'#f57c00', green:'#2e7d32', red:'#d32f2f',
  purple:'#6a1b9a', gray:'#546e7a',
  text:'#0a1628', textM:'#1a2f45', textL:'#2d4a66',
  glass:'rgba(255,255,255,0.97)', border:'rgba(255,255,255,0.85)',
};

const CC = ['#0097a7','#1565c0','#2e7d32','#f57c00','#d32f2f','#6a1b9a','#00838f','#37474f','#e65100','#00695c','#ad1457','#1b5e20'];

const cr = v => v == null ? '—' : `₹${Number(v).toLocaleString('en-IN', {maximumFractionDigits:1})} Cr`;
const pct = (a,b) => b>0 ? Math.round(a/b*100) : 0;

const GC = ({children, style={}}) => (
  <div style={{background:T.glass, border:`1px solid ${T.border}`, borderRadius:14,
    boxShadow:'0 4px 24px rgba(0,80,120,0.10)', position:'relative', overflow:'hidden', ...style}}>
    <div style={{position:'absolute',top:0,left:0,right:0,height:1,background:'rgba(255,255,255,0.95)'}}/>
    {children}
  </div>
);

const SH = ({title, sub, compact=false}) => (
  <div style={{marginBottom:compact?8:12}}>
    <p style={{fontSize:compact?10:11,fontWeight:800,color:T.tealD,letterSpacing:0.4,margin:0,textTransform:'uppercase'}}>{title}</p>
    {sub && <p style={{fontSize:9,color:T.textM,margin:'2px 0 0',fontWeight:600}}>{sub}</p>}
  </div>
);

const KpiCard = ({label, value, sub, pctVal, color='#0097a7', icon}) => (
  <GC style={{padding:'14px 16px'}}>
    <div style={{position:'absolute',top:0,left:0,right:0,height:3,background:color,borderRadius:'14px 14px 0 0'}}/>
    <p style={{fontSize:9,fontWeight:800,color:T.gray,textTransform:'uppercase',letterSpacing:.7,margin:'4px 0 6px'}}>{label}</p>
    <p style={{fontSize:22,fontWeight:900,color:T.navy,margin:'0 0 4px',lineHeight:1}}>{value}</p>
    {pctVal!=null && (
      <span style={{fontSize:10,fontWeight:700,padding:'2px 7px',borderRadius:10,background:`${color}18`,color}}>{pctVal}%</span>
    )}
    {sub && <p style={{fontSize:10,color:T.gray,margin:'4px 0 0'}}>{sub}</p>}
  </GC>
);

const PctBar = ({val, max, color='#0097a7'}) => (
  <div style={{display:'flex',alignItems:'center',gap:6}}>
    <div style={{flex:1,height:5,background:'#f1f5f9',borderRadius:3,maxWidth:80}}>
      <div style={{width:`${Math.min(val/max*100,100)}%`,height:'100%',background:color,borderRadius:3}}/>
    </div>
    <span style={{fontSize:10,fontWeight:700,color,minWidth:30}}>{Math.round(val/max*100)}%</span>
  </div>
);

const CTip = ({active,payload,label}) => {
  if(!active||!payload?.length) return null;
  return (
    <div style={{background:'rgba(255,255,255,0.97)',border:'1px solid rgba(0,151,167,0.3)',borderRadius:10,padding:'8px 12px',fontSize:10}}>
      <p style={{color:T.tealD,fontWeight:800,margin:'0 0 4px'}}>{label}</p>
      {payload.map((p,i)=><p key={i} style={{color:p.color||T.text,margin:'2px 0'}}>{p.name}: {typeof p.value==='number'?`₹${Number(p.value).toLocaleString('en-IN',{maximumFractionDigits:1})} Cr`:p.value}</p>)}
    </div>
  );
};

const FSel = ({label,options,value,onChange,multi=true}) => {
  const [open,setOpen] = useState(false);
  const vals = value?value.split('||').filter(Boolean):[];
  const toggle = v => { const n=vals.includes(v)?vals.filter(x=>x!==v):[...vals,v]; onChange(n.join('||')); };
  const clearAll = () => onChange('');
  return (
    <div style={{position:'relative'}}>
      <label style={{fontSize:9,fontWeight:800,color:T.textM,textTransform:'uppercase',letterSpacing:.5,display:'block',marginBottom:3}}>{label}</label>
      <div onClick={e=>{e.stopPropagation();setOpen(o=>!o)}}
        style={{background:'rgba(255,255,255,0.88)',border:`1px solid ${vals.length?T.teal:'rgba(0,100,140,0.25)'}`,borderRadius:7,padding:'5px 10px',fontSize:11,cursor:'pointer',fontWeight:vals.length?600:400,color:vals.length?T.tealD:T.textM,minWidth:110,display:'flex',justifyContent:'space-between',alignItems:'center',gap:6,userSelect:'none'}}>
        <span style={{overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',maxWidth:100}}>{vals.length?vals.join(', '):'All'}</span>
        <span style={{fontSize:8,opacity:.6}}>{open?'▲':'▼'}</span>
      </div>
      {open&&(
        <div onClick={e=>e.stopPropagation()}
          style={{position:'absolute',top:'100%',left:0,zIndex:999,background:'#fff',border:`1px solid ${T.teal}30`,borderRadius:8,boxShadow:'0 8px 24px rgba(0,80,120,0.15)',minWidth:180,maxHeight:220,overflowY:'auto',padding:4,marginTop:2}}>
          {vals.length>0&&<div onClick={clearAll} style={{padding:'5px 10px',fontSize:10,color:T.red,fontWeight:700,cursor:'pointer',borderBottom:'1px solid #f1f5f9'}}>✕ Clear</div>}
          {options.map(o=>(
            <div key={o} onClick={()=>{if(!multi){onChange(vals.includes(o)?'':o);setOpen(false);}else toggle(o);}}
              style={{display:'flex',alignItems:'center',gap:8,padding:'6px 10px',borderRadius:5,cursor:'pointer',background:vals.includes(o)?`${T.teal}10`:'transparent',fontSize:10,fontWeight:vals.includes(o)?700:400,color:vals.includes(o)?T.tealD:T.text}}>
              <span style={{width:12,height:12,borderRadius:3,border:`1.5px solid ${vals.includes(o)?T.teal:'rgba(0,100,140,0.3)'}`,background:vals.includes(o)?T.teal:'transparent',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                {vals.includes(o)&&<span style={{color:'#fff',fontSize:8,fontWeight:900}}>✓</span>}
              </span>
              <span>{o}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default function Cost2App() {
  const [raw, setRaw] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('overview');
  const [filters, setFilters] = useState({dept:'', projType:'', ba:'', project:''});
  const sf = useCallback((k,v)=>setFilters(p=>({...p,[k]:v})),[]);

  useEffect(()=>{
    document.addEventListener('click',()=>{});
    fetch('/data/cost2_dashboard_data.json').then(r=>r.json()).then(d=>{setRaw(d);setLoading(false);}).catch(()=>setLoading(false));
  },[]);

  const kpi = useMemo(()=>raw?.kpi||{},[raw]);
  const fo = useMemo(()=>raw?.filterOptions||{},[raw]);

  // Filter dept summary
  const deptData = useMemo(()=>{
    if(!raw?.deptSummary) return [];
    let d = raw.deptSummary;
    if(filters.dept) { const ds=filters.dept.split('||').filter(Boolean); d=d.filter(r=>ds.includes(r.dept)); }
    return d;
  },[raw, filters.dept]);

  const catData = useMemo(()=>{
    if(!raw?.categoryData) return [];
    return raw.categoryData;
  },[raw]);

  const vendorData = useMemo(()=>raw?.topVendors||[],[raw]);
  const matData = useMemo(()=>raw?.materialData||[],[raw]);
  const ptype = useMemo(()=>raw?.projectTypeData||[],[raw]);
  const poData = useMemo(()=>{
    if(!raw?.poTable) return [];
    let d = raw.poTable;
    if(filters.dept){const ds=filters.dept.split('||').filter(Boolean);d=d.filter(r=>ds.includes(r.Plant_1));}
    if(filters.projType){const pt=filters.projType.split('||').filter(Boolean);d=d.filter(r=>pt.includes(r['PROJECT/NON-PROJECT']));}
    return d;
  },[raw,filters]);

  const deptKpi = useMemo(()=>{
    const b=deptData.reduce((s,r)=>s+(r.Budget||0),0);
    const a=deptData.reduce((s,r)=>s+(r.Assigned||0),0);
    const ac=deptData.reduce((s,r)=>s+(r.Actual||0),0);
    const c=deptData.reduce((s,r)=>s+(r.Commitment||0),0);
    const av=deptData.reduce((s,r)=>s+(r.Available||0),0);
    return {b,a,ac,c,av};
  },[deptData]);

  const isFiltered = filters.dept||filters.projType||filters.ba||filters.project;
  const dispKpi = isFiltered ? deptKpi : {b:kpi.totalBudget,a:kpi.totalAssigned,ac:kpi.totalActual,c:kpi.totalCommitment,av:kpi.totalAvailable};

  const TABS = [{k:'overview',l:'Overview'},{k:'department',l:'Departments'},{k:'categories',l:'Categories'},{k:'vendors',l:'Vendors'},{k:'po',l:'PO Table'}];

  if(loading) return (
    <div style={{minHeight:'100vh',backgroundImage:'url(/bg.jpg)',backgroundSize:'cover',display:'flex',alignItems:'center',justifyContent:'center',fontFamily:'Inter,sans-serif'}}>
      <div style={{background:'rgba(255,255,255,0.9)',borderRadius:20,padding:'32px 48px',textAlign:'center'}}>
        <div style={{width:44,height:44,border:'3px solid rgba(13,31,60,0.12)',borderTop:'3px solid #0d1f3c',borderRadius:'50%',animation:'spin 0.9s linear infinite',margin:'0 auto 16px'}}/>
        <p style={{color:T.navy,fontSize:13,fontWeight:700}}>Loading Cost Dashboard…</p>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    </div>
  );

  const logout = () => { sessionStorage.removeItem('cost_auth'); window.location.reload(); };

  return (
    <div style={{minHeight:'100vh',backgroundImage:'url(/bg.jpg)',backgroundSize:'cover',backgroundAttachment:'fixed',fontFamily:'Inter,sans-serif',color:T.text}}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');`}</style>

      {/* TOP BAR */}
      <div style={{background:'rgba(13,31,60,0.97)',backdropFilter:'blur(20px)',padding:'0 24px',height:52,display:'flex',alignItems:'center',justifyContent:'space-between',position:'sticky',top:0,zIndex:100,borderBottom:'1px solid rgba(255,255,255,0.08)'}}>
        <div style={{display:'flex',alignItems:'center',gap:16}}>
          <img src="/swd-logo.png" alt="SWD" style={{width:28,height:28,objectFit:'contain'}}/>
          <span style={{fontSize:13,fontWeight:900,color:'#fff',letterSpacing:0.5}}>SMARTWORLD GROUP</span>
          <span style={{fontSize:11,color:'rgba(255,255,255,0.5)',borderLeft:'1px solid rgba(255,255,255,0.15)',paddingLeft:16,fontWeight:600,letterSpacing:.5}}>COST INTELLIGENCE · ZALR REPORT</span>
        </div>
        <div style={{display:'flex',alignItems:'center',gap:12}}>
          <span style={{background:'rgba(0,151,167,0.25)',color:'#4dd0e1',fontSize:11,fontWeight:700,padding:'3px 12px',borderRadius:20,border:'1px solid rgba(0,151,167,0.3)'}}>● LIVE</span>
          <span style={{color:'rgba(255,255,255,0.6)',fontSize:11,fontWeight:600}}>{new Date().toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'})}</span>
          <span style={{background:'rgba(255,255,255,0.1)',color:'#fff',fontSize:11,fontWeight:700,padding:'3px 12px',borderRadius:20}}>Cost2</span>
          <button onClick={logout} style={{background:'rgba(211,47,47,0.15)',border:'1px solid rgba(211,47,47,0.3)',color:'#ef9a9a',fontSize:11,fontWeight:700,padding:'4px 12px',borderRadius:8,cursor:'pointer'}}>⏻ Logout</button>
        </div>
      </div>

      {/* STAT BANNER */}
      <div style={{background:'rgba(13,31,60,0.85)',backdropFilter:'blur(12px)',borderBottom:'1px solid rgba(255,255,255,0.08)',padding:'8px 24px',display:'flex',gap:32,alignItems:'center',flexWrap:'wrap'}}>
        {[
          ['Total Budget',`₹${Number(dispKpi.b).toLocaleString('en-IN',{maximumFractionDigits:0})} Cr`],
          ['WBS Codes',kpi.uniqueWBS?.toLocaleString('en-IN')||'—'],
          ['Vendors',kpi.uniqueVendors?.toLocaleString('en-IN')||'—'],
          ['Records',kpi.totalRows?.toLocaleString('en-IN')||'—'],
        ].map(([l,v])=>(
          <div key={l} style={{display:'flex',alignItems:'center',gap:10}}>
            <span style={{fontSize:10,fontWeight:700,color:'rgba(255,255,255,0.5)',textTransform:'uppercase',letterSpacing:.5}}>{l}</span>
            <span style={{fontSize:13,fontWeight:800,color:'#fff'}}>{v}</span>
          </div>
        ))}
      </div>

      {/* FILTERS */}
      <div style={{background:'rgba(255,255,255,0.92)',backdropFilter:'blur(12px)',borderBottom:'1px solid rgba(0,100,140,0.1)',padding:'10px 24px',display:'flex',alignItems:'flex-end',gap:14,flexWrap:'wrap',position:'sticky',top:52,zIndex:99}}>
        <span style={{fontSize:9,fontWeight:800,color:T.gray,textTransform:'uppercase',letterSpacing:.5,alignSelf:'center'}}>Filters</span>
        <FSel label="Department" options={fo.depts||[]} value={filters.dept} onChange={v=>sf('dept',v)}/>
        <FSel label="Project Type" options={fo.projectTypes||[]} value={filters.projType} onChange={v=>sf('projType',v)}/>
        <FSel label="Business Area" options={fo.businessAreas||[]} value={filters.ba} onChange={v=>sf('ba',v)}/>
        <FSel label="Project Code" options={fo.projects||[]} value={filters.project} onChange={v=>sf('project',v)} multi={false}/>
        {isFiltered&&<button onClick={()=>setFilters({dept:'',projType:'',ba:'',project:''})} style={{padding:'5px 14px',background:T.teal,color:'#fff',border:'none',borderRadius:7,fontSize:11,fontWeight:700,cursor:'pointer',alignSelf:'flex-end'}}>✕ Reset</button>}
      </div>

      {/* TABS */}
      <div style={{background:'rgba(255,255,255,0.88)',backdropFilter:'blur(8px)',padding:'0 24px',display:'flex',gap:0,borderBottom:'1px solid rgba(0,100,140,0.1)',position:'sticky',top:100,zIndex:98}}>
        {TABS.map(t=>(
          <button key={t.k} onClick={()=>setTab(t.k)} style={{padding:'11px 20px',border:'none',background:'transparent',cursor:'pointer',fontSize:11,fontWeight:tab===t.k?800:600,color:tab===t.k?T.tealD:T.gray,borderBottom:tab===t.k?`2.5px solid ${T.tealD}`:'2.5px solid transparent',transition:'all .15s',letterSpacing:.2}}>{t.l}</button>
        ))}
      </div>

      <div style={{padding:'20px 24px'}}>

        {/* ── OVERVIEW ── */}
        {tab==='overview'&&(<>
          {/* KPI Cards */}
          <div style={{display:'grid',gridTemplateColumns:'repeat(5,1fr)',gap:12,marginBottom:20}}>
            <KpiCard label="Total Budget" value={`₹${Number(dispKpi.b).toLocaleString('en-IN',{maximumFractionDigits:0})} Cr`} sub="Sanctioned amount" color={T.teal}/>
            <KpiCard label="Assigned / Awarded" value={`₹${Number(dispKpi.a).toLocaleString('en-IN',{maximumFractionDigits:0})} Cr`} pctVal={pct(dispKpi.a,dispKpi.b)} color={T.purple}/>
            <KpiCard label="Actual Spent" value={`₹${Number(dispKpi.ac).toLocaleString('en-IN',{maximumFractionDigits:0})} Cr`} pctVal={pct(dispKpi.ac,dispKpi.b)} color={T.green}/>
            <KpiCard label="Commitment" value={`₹${Number(dispKpi.c).toLocaleString('en-IN',{maximumFractionDigits:0})} Cr`} sub="Open PO value" color={T.amber}/>
            <KpiCard label="Available Balance" value={`₹${Number(dispKpi.av).toLocaleString('en-IN',{maximumFractionDigits:0})} Cr`} pctVal={pct(dispKpi.av,dispKpi.b)} color={T.gray}/>
          </div>

          {/* Charts Row 1 */}
          <div style={{display:'grid',gridTemplateColumns:'1.4fr 1fr',gap:16,marginBottom:16}}>
            <GC style={{padding:16}}>
              <SH title="Cost Bifurcation — Top 8 WBS" sub="Budget vs Assigned vs Actual (₹ Cr)"/>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={catData.slice(0,8)} margin={{top:16,right:8,bottom:40,left:0}} barCategoryGap="25%">
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,60,100,0.08)" vertical={false}/>
                  <XAxis dataKey="WBS Description" tick={{fontSize:8,fill:T.textM}} angle={-35} textAnchor="end" height={50} tickLine={false} axisLine={false} interval={0}/>
                  <YAxis tick={{fontSize:9,fill:T.textM}} tickLine={false} axisLine={false} tickFormatter={v=>`₹${v}Cr`}/>
                  <Tooltip content={<CTip/>}/>
                  <Legend iconSize={8} wrapperStyle={{fontSize:9,paddingTop:4}}/>
                  <Bar dataKey="Budget" name="Budget" fill={`${T.teal}40`} radius={[3,3,0,0]} barSize={14}/>
                  <Bar dataKey="Assigned" name="Assigned" fill={T.teal} radius={[3,3,0,0]} barSize={14}/>
                  <Bar dataKey="Actual" name="Actual" fill={T.green} radius={[3,3,0,0]} barSize={14}/>
                </BarChart>
              </ResponsiveContainer>
            </GC>

            <GC style={{padding:16}}>
              <SH title="Budget Distribution" sub="Project vs Non-Project split"/>
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie data={ptype} dataKey="Budget" nameKey="PROJECT/NON-PROJECT" cx="50%" cy="50%" outerRadius={65} innerRadius={35} label={({name,value})=>`${name?.split('-')[0]}: ₹${value}Cr`} labelLine={false} fontSize={8}>
                    {ptype.map((_,i)=><Cell key={i} fill={CC[i]}/>)}
                  </Pie>
                  <Tooltip formatter={v=>`₹${Number(v).toLocaleString('en-IN',{maximumFractionDigits:1})} Cr`}/>
                </PieChart>
              </ResponsiveContainer>
              <div style={{marginTop:8}}>
                {ptype.map((r,i)=>(
                  <div key={i} style={{display:'flex',alignItems:'center',gap:8,marginBottom:6}}>
                    <div style={{width:8,height:8,borderRadius:2,background:CC[i],flexShrink:0}}/>
                    <span style={{fontSize:10,flex:1,color:T.textM,fontWeight:600}}>{r['PROJECT/NON-PROJECT']}</span>
                    <span style={{fontSize:10,fontWeight:800,color:T.navy}}>₹{Number(r.Budget).toLocaleString('en-IN',{maximumFractionDigits:0})} Cr</span>
                    <span style={{fontSize:9,color:T.gray}}>({pct(r.Budget,dispKpi.b)}%)</span>
                  </div>
                ))}
              </div>
            </GC>
          </div>

          {/* Ordered vs Delivered vs Invoiced KPIs */}
          <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:12,marginBottom:16}}>
            <KpiCard label="Total Ordered Value" value={`₹${Number(kpi.totalOrdered||0).toLocaleString('en-IN',{maximumFractionDigits:0})} Cr`} sub="Gross PO value" color={T.teal}/>
            <KpiCard label="Total Delivered" value={`₹${Number(kpi.totalDelivered||0).toLocaleString('en-IN',{maximumFractionDigits:0})} Cr`} pctVal={pct(kpi.totalDelivered,kpi.totalOrdered)} color={T.green}/>
            <KpiCard label="Total Invoiced" value={`₹${Number(kpi.totalInvoiced||0).toLocaleString('en-IN',{maximumFractionDigits:0})} Cr`} pctVal={pct(kpi.totalInvoiced,kpi.totalOrdered)} color={T.amber}/>
            <KpiCard label="Still To Invoice" value={`₹${Math.max(0,kpi.totalStillToInvoice||0).toLocaleString('en-IN',{maximumFractionDigits:0})} Cr`} sub="Pending invoices" color={T.red}/>
          </div>
        </>)}

        {/* ── DEPARTMENTS ── */}
        {tab==='department'&&(
          <GC style={{padding:16}}>
            <SH title="Department-wise Cost Summary" sub="Budget · Assigned · Actual · Commitment · Available (₹ Cr)"/>
            <div style={{overflowX:'auto'}}>
              <table style={{width:'100%',borderCollapse:'collapse',fontSize:11}}>
                <thead>
                  <tr style={{borderBottom:'1.5px solid #e2e8f0'}}>
                    {['Department','Budget (Cr)','Assigned (Cr)','Actual (Cr)','Commitment (Cr)','Available (Cr)','% Assigned','% Spent'].map(h=>(
                      <th key={h} style={{padding:'8px 10px',textAlign:h==='Department'?'left':'right',fontSize:9,fontWeight:800,color:'#94a3b8',textTransform:'uppercase',letterSpacing:.5,whiteSpace:'nowrap'}}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {deptData.map((r,i)=>{
                    const maxB=deptData[0]?.Budget||1;
                    return(
                      <tr key={i} style={{borderBottom:'1px solid #f1f5f9'}} onMouseEnter={e=>e.currentTarget.style.background='#f8fafc'} onMouseLeave={e=>e.currentTarget.style.background=''}>
                        <td style={{padding:'9px 10px',fontWeight:600,color:T.navy}}>{r.dept}</td>
                        <td style={{padding:'9px 10px',textAlign:'right',color:T.textM}}>{Number(r.Budget).toLocaleString('en-IN',{maximumFractionDigits:1})}</td>
                        <td style={{padding:'9px 10px',textAlign:'right',color:T.purple,fontWeight:600}}>{Number(r.Assigned).toLocaleString('en-IN',{maximumFractionDigits:1})}</td>
                        <td style={{padding:'9px 10px',textAlign:'right',color:T.green,fontWeight:600}}>{Number(r.Actual).toLocaleString('en-IN',{maximumFractionDigits:1})}</td>
                        <td style={{padding:'9px 10px',textAlign:'right',color:T.amber}}>{Number(r.Commitment).toLocaleString('en-IN',{maximumFractionDigits:1})}</td>
                        <td style={{padding:'9px 10px',textAlign:'right',color:T.gray}}>{Number(r.Available).toLocaleString('en-IN',{maximumFractionDigits:1})}</td>
                        <td style={{padding:'9px 10px'}}><PctBar val={r.Assigned} max={maxB} color={T.purple}/></td>
                        <td style={{padding:'9px 10px'}}><PctBar val={r.Actual} max={maxB} color={T.green}/></td>
                      </tr>
                    );
                  })}
                  <tr style={{background:'#f8fafc',borderTop:'2px solid #e2e8f0',fontWeight:800}}>
                    <td style={{padding:'9px 10px',color:T.navy}}>Total</td>
                    <td style={{padding:'9px 10px',textAlign:'right',color:T.navy}}>{Number(deptData.reduce((s,r)=>s+(r.Budget||0),0)).toLocaleString('en-IN',{maximumFractionDigits:1})}</td>
                    <td style={{padding:'9px 10px',textAlign:'right',color:T.purple}}>{Number(deptData.reduce((s,r)=>s+(r.Assigned||0),0)).toLocaleString('en-IN',{maximumFractionDigits:1})}</td>
                    <td style={{padding:'9px 10px',textAlign:'right',color:T.green}}>{Number(deptData.reduce((s,r)=>s+(r.Actual||0),0)).toLocaleString('en-IN',{maximumFractionDigits:1})}</td>
                    <td style={{padding:'9px 10px',textAlign:'right',color:T.amber}}>{Number(deptData.reduce((s,r)=>s+(r.Commitment||0),0)).toLocaleString('en-IN',{maximumFractionDigits:1})}</td>
                    <td style={{padding:'9px 10px',textAlign:'right',color:T.gray}}>{Number(deptData.reduce((s,r)=>s+(r.Available||0),0)).toLocaleString('en-IN',{maximumFractionDigits:1})}</td>
                    <td/><td/>
                  </tr>
                </tbody>
              </table>
            </div>
          </GC>
        )}

        {/* ── CATEGORIES ── */}
        {tab==='categories'&&(
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16}}>
            <GC style={{padding:16}}>
              <SH title="Top 12 WBS Categories" sub="Budget vs Actual (₹ Cr)"/>
              <ResponsiveContainer width="100%" height={380}>
                <BarChart data={catData} layout="vertical" margin={{top:0,right:60,bottom:0,left:0}} barCategoryGap="20%">
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,60,100,0.08)" horizontal={false}/>
                  <XAxis type="number" tick={{fontSize:8,fill:T.textM}} tickLine={false} axisLine={false} tickFormatter={v=>`₹${v}Cr`}/>
                  <YAxis type="category" dataKey="WBS Description" tick={{fontSize:8,fill:T.textM}} width={130} tickLine={false} axisLine={false}/>
                  <Tooltip content={<CTip/>}/>
                  <Legend iconSize={8} wrapperStyle={{fontSize:9}}/>
                  <Bar dataKey="Budget" name="Budget" fill={`${T.teal}35`} radius={[0,3,3,0]} barSize={10}/>
                  <Bar dataKey="Actual" name="Actual" fill={T.teal} radius={[0,3,3,0]} barSize={10}>
                    <LabelList dataKey="Actual" position="right" style={{fontSize:7,fill:T.tealD,fontWeight:700}} formatter={v=>`₹${Number(v).toFixed(0)}Cr`}/>
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </GC>
            <GC style={{padding:16}}>
              <SH title="Material Categories — Ordered vs Delivered" sub="₹ Cr"/>
              <ResponsiveContainer width="100%" height={380}>
                <BarChart data={matData.slice(0,12)} layout="vertical" margin={{top:0,right:60,bottom:0,left:0}} barCategoryGap="20%">
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,60,100,0.08)" horizontal={false}/>
                  <XAxis type="number" tick={{fontSize:8,fill:T.textM}} tickLine={false} axisLine={false} tickFormatter={v=>`₹${v}Cr`}/>
                  <YAxis type="category" dataKey="Material Name" tick={{fontSize:8,fill:T.textM}} width={130} tickLine={false} axisLine={false}/>
                  <Tooltip content={<CTip/>}/>
                  <Legend iconSize={8} wrapperStyle={{fontSize:9}}/>
                  <Bar dataKey="ordered" name="Ordered" fill={`${T.amber}50`} radius={[0,3,3,0]} barSize={10}/>
                  <Bar dataKey="delivered" name="Delivered" fill={T.amber} radius={[0,3,3,0]} barSize={10}>
                    <LabelList dataKey="delivered" position="right" style={{fontSize:7,fill:T.amber,fontWeight:700}} formatter={v=>`₹${Number(v).toFixed(0)}Cr`}/>
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </GC>
          </div>
        )}

        {/* ── VENDORS ── */}
        {tab==='vendors'&&(
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16}}>
            <GC style={{padding:16}}>
              <SH title="Top 12 Vendors" sub="By Ordered Value (₹ Cr)"/>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={vendorData} layout="vertical" margin={{top:0,right:70,bottom:0,left:0}} barCategoryGap="20%">
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,60,100,0.08)" horizontal={false}/>
                  <XAxis type="number" tick={{fontSize:8,fill:T.textM}} tickLine={false} axisLine={false} tickFormatter={v=>`₹${v}Cr`}/>
                  <YAxis type="category" dataKey="Vendor Name" tick={{fontSize:8,fill:T.textM}} width={160} tickLine={false} axisLine={false} tickFormatter={v=>v?.length>22?v.slice(0,22)+'…':v}/>
                  <Tooltip content={<CTip/>}/>
                  <Legend iconSize={8} wrapperStyle={{fontSize:9}}/>
                  <Bar dataKey="ordered" name="Ordered" fill={T.purple} radius={[0,3,3,0]} barSize={12}>
                    <LabelList dataKey="ordered" position="right" style={{fontSize:8,fill:T.purple,fontWeight:700}} formatter={v=>`₹${Number(v).toFixed(1)}Cr`}/>
                  </Bar>
                  <Bar dataKey="invoiced" name="Invoiced" fill={`${T.purple}40`} radius={[0,3,3,0]} barSize={12}/>
                </BarChart>
              </ResponsiveContainer>
            </GC>
            <GC style={{padding:16}}>
              <SH title="Vendor Delivery Performance" sub="Ordered vs Delivered vs Invoiced"/>
              <div style={{maxHeight:400,overflowY:'auto'}}>
                <table style={{width:'100%',borderCollapse:'collapse',fontSize:11}}>
                  <thead>
                    <tr style={{borderBottom:'1.5px solid #e2e8f0',position:'sticky',top:0,background:'#fff'}}>
                      <th style={{padding:'6px 8px',textAlign:'left',fontSize:9,fontWeight:800,color:'#94a3b8',textTransform:'uppercase'}}>Vendor</th>
                      <th style={{padding:'6px 8px',textAlign:'right',fontSize:9,fontWeight:800,color:'#94a3b8',textTransform:'uppercase'}}>Ordered</th>
                      <th style={{padding:'6px 8px',textAlign:'right',fontSize:9,fontWeight:800,color:'#94a3b8',textTransform:'uppercase'}}>Delivered</th>
                      <th style={{padding:'6px 8px',textAlign:'right',fontSize:9,fontWeight:800,color:'#94a3b8',textTransform:'uppercase'}}>Invoiced</th>
                      <th style={{padding:'6px 8px',textAlign:'center',fontSize:9,fontWeight:800,color:'#94a3b8',textTransform:'uppercase'}}>Del%</th>
                    </tr>
                  </thead>
                  <tbody>
                    {vendorData.map((r,i)=>(
                      <tr key={i} style={{borderBottom:'1px solid #f1f5f9'}} onMouseEnter={e=>e.currentTarget.style.background='#f8fafc'} onMouseLeave={e=>e.currentTarget.style.background=''}>
                        <td style={{padding:'7px 8px',color:T.navy,fontWeight:600,fontSize:10,maxWidth:180,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{r['Vendor Name']}</td>
                        <td style={{padding:'7px 8px',textAlign:'right',color:T.purple,fontWeight:700}}>₹{Number(r.ordered).toLocaleString('en-IN',{maximumFractionDigits:1})}</td>
                        <td style={{padding:'7px 8px',textAlign:'right',color:T.green,fontWeight:600}}>₹{Number(r.delivered).toLocaleString('en-IN',{maximumFractionDigits:1})}</td>
                        <td style={{padding:'7px 8px',textAlign:'right',color:T.amber,fontWeight:600}}>₹{Number(r.invoiced).toLocaleString('en-IN',{maximumFractionDigits:1})}</td>
                        <td style={{padding:'7px 8px',textAlign:'center'}}>
                          <span style={{fontSize:10,fontWeight:700,padding:'2px 6px',borderRadius:8,background:r.ordered>0&&r.delivered/r.ordered>0.7?'#d1fae5':'#fef3c7',color:r.ordered>0&&r.delivered/r.ordered>0.7?'#065f46':'#92400e'}}>
                            {r.ordered>0?Math.round(r.delivered/r.ordered*100):0}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </GC>
          </div>
        )}

        {/* ── PO TABLE ── */}
        {tab==='po'&&(
          <GC style={{padding:16}}>
            <SH title="Purchase Order Details" sub={`Top 50 POs by ordered value · ${poData.length} shown`}/>
            <div style={{overflowX:'auto',maxHeight:500,overflowY:'auto'}}>
              <table style={{width:'100%',borderCollapse:'collapse',fontSize:10,minWidth:900}}>
                <thead>
                  <tr style={{borderBottom:'1.5px solid #e2e8f0',position:'sticky',top:0,background:'#fff',zIndex:1}}>
                    {['PO Number','WBS Description','Dept','Vendor','Material','Ordered (Cr)','Delivered (Cr)','Invoiced (Cr)','Pending (Cr)','Type'].map(h=>(
                      <th key={h} style={{padding:'7px 8px',textAlign:['Ordered (Cr)','Delivered (Cr)','Invoiced (Cr)','Pending (Cr)'].includes(h)?'right':'left',fontSize:8,fontWeight:800,color:'#94a3b8',textTransform:'uppercase',letterSpacing:.3,whiteSpace:'nowrap'}}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {poData.map((r,i)=>(
                    <tr key={i} style={{borderBottom:'1px solid #f1f5f9'}} onMouseEnter={e=>e.currentTarget.style.background='#f8fafc'} onMouseLeave={e=>e.currentTarget.style.background=''}>
                      <td style={{padding:'6px 8px',color:T.tealD,fontWeight:700}}>{r['Purchasing Document']}</td>
                      <td style={{padding:'6px 8px',color:T.navy,maxWidth:160,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{r['WBS Description']}</td>
                      <td style={{padding:'6px 8px',color:T.textM,whiteSpace:'nowrap'}}>{r['Plant_1']}</td>
                      <td style={{padding:'6px 8px',color:T.textM,maxWidth:160,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{r['Vendor Name']}</td>
                      <td style={{padding:'6px 8px',color:T.textM,maxWidth:120,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{r['Short Text']||r['Material Name']}</td>
                      <td style={{padding:'6px 8px',textAlign:'right',color:T.purple,fontWeight:700}}>₹{Number(r['Ordered Value']).toLocaleString('en-IN',{maximumFractionDigits:2})}</td>
                      <td style={{padding:'6px 8px',textAlign:'right',color:T.green}}>₹{Number(r['Delivered Value']).toLocaleString('en-IN',{maximumFractionDigits:2})}</td>
                      <td style={{padding:'6px 8px',textAlign:'right',color:T.amber}}>₹{Number(r['Invoiced Value']).toLocaleString('en-IN',{maximumFractionDigits:2})}</td>
                      <td style={{padding:'6px 8px',textAlign:'right',color:T.red}}>₹{Number(r['Still to be Invoiced Value']).toLocaleString('en-IN',{maximumFractionDigits:2})}</td>
                      <td style={{padding:'6px 8px'}}>
                        <span style={{fontSize:9,fontWeight:700,padding:'2px 6px',borderRadius:8,background:r['PROJECT/NON-PROJECT']==='Project'?'#e0f2fe':'#f1f5f9',color:r['PROJECT/NON-PROJECT']==='Project'?'#0369a1':'#475569'}}>
                          {r['PROJECT/NON-PROJECT']==='Project'?'Project':'Non-Proj'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </GC>
        )}

      </div>
    </div>
  );
}
