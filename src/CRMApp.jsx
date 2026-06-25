import React, { useState, useEffect, useMemo } from 'react';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, LabelList, ComposedChart, Area
} from 'recharts';

const T = {
  glass:'rgba(255,255,255,0.96)', glassH:'rgba(255,255,255,1.0)',
  border:'rgba(255,255,255,0.85)',
  teal:'#0097a7', tealL:'#00bcd4', tealD:'#006978',
  red:'#d32f2f', navy:'#0d2137', navyM:'#1a3a5c',
  amber:'#f57c00', green:'#2e7d32', greenL:'#43a047',
  gray:'#546e7a', text:'#0a1628', textM:'#1a2f45', textL:'#2d4a66',
  orange:'#e65100', purple:'#6a1b9a',
};
const CC = ['#0097a7','#1565c0','#2e7d32','#f57c00','#d32f2f','#6a1b9a','#00838f','#37474f','#e65100','#00695c','#558b2f','#ad1457'];

const GC = ({ children, style={} }) => {
  const [h,sH] = useState(false);
  return (
    <div onMouseEnter={()=>sH(true)} onMouseLeave={()=>sH(false)}
      style={{background:h?T.glassH:T.glass,border:`1px solid ${T.border}`,borderRadius:14,
        boxShadow:'0 4px 24px rgba(0,80,120,0.10)',transition:'all 0.2s',position:'relative',overflow:'hidden',...style}}>
      <div style={{position:'absolute',top:0,left:0,right:0,height:1,background:'rgba(255,255,255,0.95)'}}/>
      {children}
    </div>
  );
};

const SH = ({title,sub}) => (
  <div style={{marginBottom:10}}>
    <p style={{fontSize:11,fontWeight:800,color:T.tealD,letterSpacing:0.4,margin:0,textTransform:'uppercase'}}>{title}</p>
    {sub&&<p style={{fontSize:10,color:T.textM,margin:'2px 0 0',fontWeight:600}}>{sub}</p>}
  </div>
);

const CTip = ({active,payload,label}) => {
  if(!active||!payload?.length) return null;
  return (
    <div style={{background:'rgba(255,255,255,0.97)',border:'1px solid rgba(0,151,167,0.3)',borderRadius:10,padding:'8px 12px',
      boxShadow:'0 8px 32px rgba(0,80,120,0.18)',fontSize:11}}>
      <p style={{color:T.tealD,fontWeight:700,marginBottom:4}}>{label}</p>
      {payload.map((p,i)=><p key={i} style={{color:p.color||T.text,margin:'2px 0'}}><span style={{color:T.textL}}>{p.name}: </span>{p.value?.toLocaleString()}</p>)}
    </div>
  );
};

const FSelect = ({label,value,onChange,options}) => (
  <div>
    <div style={{fontSize:9,fontWeight:800,color:'#fff',textTransform:'uppercase',letterSpacing:0.5,marginBottom:3,opacity:0.85}}>{label}</div>
    <select value={value} onChange={e=>onChange(e.target.value)}
      style={{width:'100%',fontSize:11,fontWeight:600,color:T.text,background:'rgba(255,255,255,0.95)',
        border:'1px solid rgba(255,255,255,0.4)',borderRadius:8,padding:'5px 8px',cursor:'pointer'}}>
      <option value="All">All</option>
      {options.map(o=><option key={o} value={o}>{o}</option>)}
    </select>
  </div>
);

// Sidebar filter — blue pill label + white dropdown (matches CRM sidebar design)
const SFilter = ({label,value,onChange,options}) => (
  <div style={{marginBottom:14}}>
    <div style={{background:'linear-gradient(135deg,#1565c0,#0d47a1)',color:'#fff',fontSize:11,fontWeight:800,
      textAlign:'center',borderRadius:8,padding:'5px 0',marginBottom:6,letterSpacing:0.3,
      boxShadow:'0 2px 8px rgba(13,71,161,0.25)'}}>{label}</div>
    <select value={value} onChange={e=>onChange(e.target.value)}
      style={{width:'100%',fontSize:12,fontWeight:600,color:T.text,background:'#fff',
        border:'1px solid #cfd8dc',borderRadius:8,padding:'7px 9px',cursor:'pointer'}}>
      <option value="All">All</option>
      {options.map(o=><option key={o} value={o}>{o}</option>)}
    </select>
  </div>
);

const KpiCard = ({icon,label,value,sub,color,pct}) => (
  <div style={{background:'rgba(255,255,255,0.97)',backdropFilter:'blur(20px)',WebkitBackdropFilter:'blur(20px)',
    border:`1px solid rgba(255,255,255,0.9)`,borderLeft:`4px solid ${color}`,borderRadius:14,
    boxShadow:'0 4px 24px rgba(0,40,80,0.15)',padding:'16px 18px',position:'relative',overflow:'hidden'}}>
    <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',marginBottom:8}}>
      <span style={{fontSize:24,lineHeight:1}}>{icon}</span>
      {pct!=null&&<span style={{fontSize:9,fontWeight:800,color:'#fff',background:color,borderRadius:20,padding:'2px 8px'}}>{pct}%</span>}
    </div>
    <div style={{fontSize:28,fontWeight:900,color,letterSpacing:-1,lineHeight:1,marginBottom:4}}>{typeof value==='number'?value.toLocaleString():value}</div>
    <div style={{fontSize:10,fontWeight:800,color:'#1a2f45',textTransform:'uppercase',letterSpacing:0.5,marginBottom:3}}>{label}</div>
    <div style={{fontSize:9,color:'#546e7a'}}>{sub}</div>
    {pct!=null&&<div style={{marginTop:10,height:4,background:'rgba(0,60,100,0.08)',borderRadius:2,overflow:'hidden'}}>
      <div style={{width:`${Math.min(pct,100)}%`,height:'100%',background:color,borderRadius:2}}/>
    </div>}
  </div>
);

const Loading = () => (
  <div style={{minHeight:'100vh',backgroundImage:'url(/bg.jpg)',backgroundSize:'cover',backgroundPosition:'center',
    backgroundAttachment:'fixed',display:'flex',alignItems:'center',justifyContent:'center'}}>
    <div style={{background:'rgba(255,255,255,0.9)',backdropFilter:'blur(20px)',borderRadius:20,padding:'32px 48px',textAlign:'center'}}>
      <img src="/swd-logo.png" alt="" style={{width:40,height:40,objectFit:'contain',marginBottom:12}}/>
      <div style={{color:T.navy,fontWeight:800,fontSize:16}}>Loading CRM Dashboard…</div>
      <div style={{color:T.gray,fontSize:12,marginTop:6}}>Processing 47,000+ cases</div>
    </div>
  </div>
);

export default function CRMApp() {
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab]         = useState('overall'); // overall | open | closed

  // Sidebar filters
  const [fCategory, setFCategory] = useState('All');
  const [fSubCat,   setFSubCat]   = useState('All');
  const [fCaseType, setFCaseType] = useState('All');
  const [fStatus,   setFStatus]   = useState('All');
  const [fOwner,    setFOwner]    = useState('All');

  const logout = () => { sessionStorage.removeItem('crm_auth'); window.location.reload(); };

  // Fast lean-JSON loader (columnar {cols,rows} -> row objects). ~0.7MB gzipped, sub-second parse.
  useEffect(() => {
    fetch('/data/crm_cases.json').then(r=>r.json()).then(({cols,rows})=>{
      const I = Object.fromEntries(cols.map((c,i)=>[c,i]));
      const g = (row,c)=>row[I[c]];
      const parsed = rows.map(row=>({
        account:     g(row,'Account Name')||'',
        caseNum:     g(row,'Case Number')||'',
        category:    g(row,'Category')||'',
        subCategory: g(row,'Sub Category')||'',
        caseType:    g(row,'Case Type')||'',
        status:      g(row,'Status')||'',
        tatStatus:   g(row,'TAT Status')||'',
        area:        g(row,'Area')||'',
        subArea:     g(row,'Sub Area')||'',
        owner:       g(row,'Case Owner')||'',
        tl:          g(row,'Team Leader name')||'',
        origin:      g(row,'Case Origin')||'',
        hni:         g(row,'HNI Customer')==1||String(g(row,'HNI Customer')).toUpperCase()==='YES',
        legal:       g(row,'Active Legal Case')==1||String(g(row,'Active Legal Case')).toUpperCase()==='YES',
        reassigns:   g(row,'Number of Reassigns')||0,
        age:         g(row,'Age')||0,
        respCat:     g(row,'Response Time Category')||'',
        resCat:      g(row,'Resolution Time Category')||'',
        openedStr:   g(row,'Date/Time Opened')||'',
        closedStr:   g(row,'Closed Date')||'',
      }));
      setData(parsed);
      setLoading(false);
    }).catch(()=>setLoading(false));
  }, []);

  const isClosed = r => ['Closed','Resolved','Close'].includes(r.status);

  // Apply sidebar filters
  // NOTE: 'Category'/'Sub Category' columns are empty in the export, so these two
  // filters are wired to the populated Area / Sub Area columns (which hold the categorisation).
  const filtered = useMemo(() => {
    if(!data) return [];
    return data.filter(r => {
      if(fCategory!=='All' && r.area!==fCategory)         return false;
      if(fSubCat!=='All'   && r.subArea!==fSubCat)        return false;
      if(fCaseType!=='All' && r.caseType!==fCaseType)      return false;
      if(fStatus!=='All'   && r.status!==fStatus)          return false;
      if(fOwner!=='All'    && r.owner!==fOwner)            return false;
      return true;
    });
  }, [data,fCategory,fSubCat,fCaseType,fStatus,fOwner]);

  // Narrow by page scope (status)
  const pageRows = useMemo(() => {
    if(tab==='open')   return filtered.filter(r=>!isClosed(r));
    if(tab==='closed') return filtered.filter(r=>isClosed(r));
    return filtered;
  }, [filtered,tab]);

  // Filter dropdown options (from full dataset)
  const opts = useMemo(() => {
    if(!data) return {};
    const u = k => [...new Set(data.map(r=>r[k]).filter(v=>v&&v.toString().trim()))].sort();
    return { category:u('area'), subCategory:u('subArea'), caseType:u('caseType'), status:u('status'), owner:u('owner') };
  }, [data]);

  const resetFilters = () => { setFCategory('All');setFSubCat('All');setFCaseType('All');setFStatus('All');setFOwner('All'); };
  const hasFilters = [fCategory,fSubCat,fCaseType,fStatus,fOwner].some(v=>v!=='All');

  if(loading) return <Loading/>;

  const TABS = [
    {k:'overall', l:'📋 Overall Tickets'},
    {k:'open',    l:'🔓 Open Tickets'},
    {k:'closed',  l:'✅ Closed Tickets'},
  ];
  const navBg = 'linear-gradient(135deg,#0d2137 0%,#1a3a5c 60%,#006978 100%)';
  const pageLabel = tab==='open'?'Open Tickets':tab==='closed'?'Closed Tickets':'Overall Tickets';

  return (
    <div style={{minHeight:'100vh',backgroundImage:'url(/bg.jpg)',backgroundSize:'cover',backgroundPosition:'center',backgroundAttachment:'fixed',fontFamily:'Inter,sans-serif'}}>
      <div style={{minHeight:'100vh',background:'rgba(255,255,255,0.04)',backdropFilter:'blur(1px)'}}>

        {/* ── TOP NAV (3 pages) ── */}
        <div style={{background:navBg,padding:'0 24px',display:'flex',alignItems:'center',justifyContent:'space-between',height:54,position:'sticky',top:0,zIndex:100,boxShadow:'0 2px 20px rgba(0,0,0,0.3)'}}>
          <div style={{display:'flex',alignItems:'center',gap:12}}>
            <img src="/swd-logo.png" alt="" style={{width:28,height:28,objectFit:'contain'}}/>
            <div>
              <p style={{color:'#fff',fontWeight:900,fontSize:13,margin:0,letterSpacing:0.3}}>CRM Intelligence</p>
              <p style={{color:'rgba(255,255,255,0.6)',fontSize:9,margin:0,fontWeight:600}}>SMARTWORLD GROUP · CASE MANAGEMENT</p>
            </div>
          </div>
          <div style={{display:'flex',gap:4}}>
            {TABS.map(t=>(
              <button key={t.k} onClick={()=>setTab(t.k)} style={{background:tab===t.k?'rgba(255,255,255,0.18)':'transparent',
                color:'#fff',border:tab===t.k?'1px solid rgba(255,255,255,0.35)':'1px solid transparent',
                borderRadius:8,padding:'5px 16px',fontSize:11,fontWeight:700,cursor:'pointer',transition:'all 0.15s'}}>
                {t.l}
              </button>
            ))}
          </div>
          <button onClick={logout} style={{background:'rgba(211,47,47,0.8)',color:'#fff',border:'none',borderRadius:8,padding:'5px 14px',fontSize:11,fontWeight:700,cursor:'pointer'}}>
            🚪 Logout
          </button>
        </div>

        {/* ── BODY: sidebar + content ── */}
        <div style={{display:'flex',alignItems:'flex-start',gap:16,maxWidth:1600,margin:'0 auto',padding:'16px 20px 40px'}}>

          {/* ── LEFT FILTER SIDEBAR ── */}
          <aside style={{width:210,flexShrink:0,position:'sticky',top:70}}>
            <GC style={{padding:16}}>
              {/* logo header */}
              <div style={{background:'linear-gradient(135deg,#0d47a1,#1565c0)',borderRadius:10,padding:'14px 8px',textAlign:'center',marginBottom:16}}>
                <img src="/swd-logo.png" alt="" style={{width:30,height:30,objectFit:'contain',marginBottom:4}}/>
                <div style={{color:'#fff',fontWeight:900,fontSize:13,letterSpacing:1}}>SMARTWORLD</div>
                <div style={{color:'rgba(255,255,255,0.7)',fontSize:7,letterSpacing:1,fontWeight:600}}>CASE MANAGEMENT</div>
              </div>

              <SFilter label="Category"     value={fCategory} onChange={setFCategory} options={opts.category||[]}/>
              <SFilter label="Sub Category" value={fSubCat}   onChange={setFSubCat}   options={opts.subCategory||[]}/>
              <SFilter label="Case Type"    value={fCaseType} onChange={setFCaseType} options={opts.caseType||[]}/>
              <SFilter label="Case Status"  value={fStatus}   onChange={setFStatus}   options={opts.status||[]}/>
              <SFilter label="Case Owner"   value={fOwner}    onChange={setFOwner}    options={opts.owner||[]}/>

              {hasFilters && (
                <button onClick={resetFilters} style={{width:'100%',marginTop:4,background:'rgba(211,47,47,0.85)',color:'#fff',border:'none',borderRadius:8,padding:'7px 0',fontSize:11,fontWeight:700,cursor:'pointer'}}>
                  ✕ Reset Filters
                </button>
              )}
            </GC>
          </aside>

          {/* ── MAIN CONTENT ── */}
          <main style={{flex:1,minWidth:0,display:'flex',flexDirection:'column',gap:14}}>
            <GC style={{padding:18}}>
              <SH title={pageLabel} sub={`${pageRows.length.toLocaleString()} tickets in view · ${(data||[]).length.toLocaleString()} total`}/>
              <div style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',minHeight:280,gap:8}}>
                <div style={{fontSize:48,fontWeight:900,color:T.tealD,letterSpacing:-1,lineHeight:1}}>{pageRows.length.toLocaleString()}</div>
                <div style={{fontSize:12,fontWeight:700,color:T.textM,textTransform:'uppercase',letterSpacing:0.5}}>{pageLabel}</div>
                <div style={{fontSize:11,color:T.gray,marginTop:12,opacity:0.7}}>KPIs coming soon — page & filters ready</div>
              </div>
            </GC>
          </main>

        </div>
      </div>
    </div>
  );
}
