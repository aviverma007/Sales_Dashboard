import React, { useState, useEffect, useMemo, useRef } from 'react';
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

const GC = ({ children, style={}, className='' }) => {
  const [h,sH] = useState(false);
  return (
    <div className={className} onMouseEnter={()=>sH(true)} onMouseLeave={()=>sH(false)}
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

// Sidebar filter — searchable dropdown (blue pill label + own search box)
const SFilter = ({label,value,onChange,options}) => {
  const [open,setOpen] = useState(false);
  const [q,setQ] = useState('');
  const ref = useRef(null);
  useEffect(()=>{
    if(!open) return;
    const h=(e)=>{ if(ref.current && !ref.current.contains(e.target)){ setOpen(false); setQ(''); } };
    document.addEventListener('mousedown',h);
    return ()=>document.removeEventListener('mousedown',h);
  },[open]);
  const list = ['All',...options];
  const shown = q ? list.filter(o=>String(o).toLowerCase().includes(q.toLowerCase())) : list;
  const pick = (o)=>{ onChange(o); setOpen(false); setQ(''); };
  return (
    <div ref={ref} style={{marginBottom:14}}>
      <div className="crm-pill" style={{background:'linear-gradient(135deg,#1e88e5,#0d47a1)',color:'#fff',fontSize:11,fontWeight:800,
        textAlign:'center',borderRadius:8,padding:'6px 0',marginBottom:6,letterSpacing:0.3}}>{label}</div>
      <div className="crm-sel" onClick={()=>setOpen(o=>!o)} style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:6,
        fontSize:12,fontWeight:600,color:value==='All'?T.gray:T.text,background:'#fff',border:`1px solid ${open?'#1565c0':'#cfd8dc'}`,borderRadius:8,padding:'7px 9px',cursor:'pointer'}}>
        <span style={{overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{value}</span>
        <span style={{fontSize:9,color:T.gray,transform:open?'rotate(180deg)':'none',transition:'transform .2s'}}>▼</span>
      </div>
      {open && (
        <div style={{marginTop:5,background:'#fff',border:'1px solid #cfd8dc',borderRadius:8,boxShadow:'0 8px 22px rgba(0,40,80,.18)',overflow:'hidden'}}>
          <div style={{position:'relative',padding:6,borderBottom:'1px solid #eef1f4'}}>
            <span style={{position:'absolute',left:13,top:'50%',transform:'translateY(-50%)',fontSize:11,opacity:0.5,pointerEvents:'none'}}>🔍</span>
            <input autoFocus value={q} onChange={e=>setQ(e.target.value)} onClick={e=>e.stopPropagation()} placeholder="Search…"
              style={{width:'100%',boxSizing:'border-box',fontSize:11,fontWeight:600,color:T.text,background:'#f7f9fb',border:'1px solid #e0e6ec',borderRadius:6,padding:'5px 8px 5px 26px',outline:'none'}}/>
          </div>
          <div style={{maxHeight:170,overflowY:'auto'}}>
            {shown.length ? shown.map(o=>(
              <div key={o} onClick={()=>pick(o)} style={{padding:'6px 10px',fontSize:11.5,fontWeight:o===value?800:600,cursor:'pointer',
                color:o===value?'#0d47a1':T.textM,background:o===value?'rgba(21,101,192,0.08)':'transparent'}}
                onMouseEnter={e=>e.currentTarget.style.background='rgba(0,151,167,0.06)'}
                onMouseLeave={e=>e.currentTarget.style.background=o===value?'rgba(21,101,192,0.08)':'transparent'}>
                {o}
              </div>
            )) : <div style={{padding:'8px 10px',fontSize:11,color:T.gray}}>No matches</div>}
          </div>
        </div>
      )}
    </div>
  );
};

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

// Panel with blue header bar (matches requested KPI design)
const Panel = ({title,children,style={}}) => (
  <div className="crm-lift crm-rise" style={{background:T.glass,border:`1px solid ${T.border}`,borderRadius:14,overflow:'hidden',boxShadow:'0 4px 20px rgba(0,80,120,0.10)',...style}}>
    <div style={{background:'linear-gradient(135deg,#1e88e5,#1565c0 55%,#0d47a1)',color:'#fff',fontWeight:800,fontSize:13,textAlign:'center',padding:'9px 0',letterSpacing:0.5,boxShadow:'inset 0 -2px 6px rgba(0,0,0,0.12)'}}>{title}</div>
    <div style={{padding:14}}>{children}</div>
  </div>
);

const typeColor = (n) => n==='Query'?'#c9a227':n==='Complaint'?'#d32f2f':n==='SPAM'?'#607d8b':'#0097a7';

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
  const [fOrigin,   setFOrigin]   = useState('All');

  // "Number of cases by" dimension toggle
  const [byDim, setByDim] = useState('owner'); // owner | hod | tl

  // Case Applicability filter — '' (all) | 'Inclusion' | 'Exclusion'
  const [applic, setApplic] = useState('');

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
        applicability: g(row,'Case Applicability')||'',
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
      if(fOrigin!=='All'   && r.origin!==fOrigin)          return false;
      if(applic && r.applicability!==applic)               return false;
      return true;
    });
  }, [data,fCategory,fSubCat,fCaseType,fStatus,fOwner,fOrigin,applic]);

  // Narrow by page scope (status)
  const pageRows = useMemo(() => {
    if(tab==='open')   return filtered.filter(r=>!isClosed(r));
    if(tab==='closed') return filtered.filter(r=>isClosed(r));
    return filtered;
  }, [filtered,tab]);

  // Overall-page chart data (Case Type / Status / Origin) — live from pageRows
  const ovCharts = useMemo(() => {
    if(!pageRows.length) return {caseType:[],statusList:[],origin:[]};
    const cnt = (key) => pageRows.reduce((o,r)=>{const v=r[key]||'Unknown';o[v]=(o[v]||0)+1;return o;},{});

    // Case Type — exclude blanks
    const caseType = Object.entries(cnt('caseType'))
      .filter(([k])=>k && k!=='Unknown')
      .map(([k,v])=>({name:k,value:v})).sort((a,b)=>b.value-a.value);

    // Status — group closed-type statuses into 'Closed'
    const sMap = {};
    pageRows.forEach(r=>{
      const k = isClosed(r) ? 'Closed' : (r.status||'Unknown');
      if(k==='Unknown') return;
      sMap[k]=(sMap[k]||0)+1;
    });
    const statusList = Object.entries(sMap).map(([k,v])=>({name:k,value:v})).sort((a,b)=>b.value-a.value);

    // Case Origin — share %
    const oEntries = Object.entries(cnt('origin')).filter(([k])=>k && k!=='Unknown').map(([k,v])=>({name:k,value:v})).sort((a,b)=>b.value-a.value);
    const oTotal = oEntries.reduce((s,o)=>s+o.value,0) || 1;
    const origin = oEntries.map(o=>({...o,pct:+(o.value/oTotal*100).toFixed(2)}));

    return {caseType,statusList,origin};
  }, [pageRows]);

  // Number of cases by Owner / HOD / Team Leader
  const byData = useMemo(() => {
    const key = byDim==='tl' ? 'tl' : 'owner';
    const m = {};
    pageRows.forEach(r=>{
      const v=(r[key]||'').trim(); if(!v) return;
      if(!m[v]) m[v]={name:v,total:0,open:0,closed:0};
      m[v].total++;
      if(isClosed(r)) m[v].closed++; else m[v].open++;
    });
    return Object.values(m).sort((a,b)=>b.total-a.total).slice(0,12);
  }, [pageRows,byDim]);

  // Cases by Area / Sub Area with open & closed split
  const areaTable = useMemo(() => {
    const m = {};
    pageRows.forEach(r=>{
      const a=(r.area||'').trim(), s=(r.subArea||'').trim();
      if(!a && !s) return;
      const key=a+'||'+s;
      if(!m[key]) m[key]={area:a||'—',subArea:s||'—',total:0,open:0,closed:0};
      m[key].total++;
      if(isClosed(r)) m[key].closed++; else m[key].open++;
    });
    return Object.values(m).sort((x,y)=>y.total-x.total);
  }, [pageRows]);

  // Filter dropdown options (from full dataset)
  const opts = useMemo(() => {
    if(!data) return {};
    const u = k => [...new Set(data.map(r=>r[k]).filter(v=>v&&v.toString().trim()))].sort();
    return { category:u('area'), subCategory:u('subArea'), caseType:u('caseType'), status:u('status'), owner:u('owner'), origin:u('origin') };
  }, [data]);

  const resetFilters = () => { setFCategory('All');setFSubCat('All');setFCaseType('All');setFStatus('All');setFOwner('All');setFOrigin('All'); };
  const hasFilters = [fCategory,fSubCat,fCaseType,fStatus,fOwner,fOrigin].some(v=>v!=='All');

  if(loading) return <Loading/>;

  const TABS = [
    {k:'overall', l:'📋 Overall Tickets'},
    {k:'open',    l:'🔓 Open Tickets'},
    {k:'closed',  l:'✅ Closed Tickets'},
  ];
  const navBg = 'linear-gradient(135deg,#0d2137 0%,#1a3a5c 60%,#006978 100%)';
  const pageLabel = tab==='open'?'Open Tickets':tab==='closed'?'Closed Tickets':'Overall Tickets';
  const totalT  = filtered.length;
  const closedT = filtered.filter(isClosed).length;
  const openT   = totalT - closedT;

  // Area table totals (all rows)
  const areaTot = areaTable.reduce((a,r)=>({total:a.total+r.total,open:a.open+r.open,closed:a.closed+r.closed}),{total:0,open:0,closed:0});
  const maxTot = byData[0]?.total || 1;
  // End-of-bar label: total (with open count beside it)
  const barEndLabel = (props) => {
    const {x,y,width,height,index} = props;
    const d = byData[index]; if(!d) return null;
    return (
      <text x={x+width+6} y={y+height/2} dominantBaseline="middle" fontSize={10} fontWeight={800}>
        <tspan fill={T.text}>{d.total.toLocaleString()}</tspan>
        <tspan fill={T.amber} dx={6} fontSize={9} fontWeight={800}>({d.open.toLocaleString()} open)</tspan>
      </text>
    );
  };

  return (
    <div style={{minHeight:'100vh',backgroundImage:'url(/bg.jpg)',backgroundSize:'cover',backgroundPosition:'center',backgroundAttachment:'fixed',fontFamily:'Inter,sans-serif'}}>
      <style>{`
        @keyframes crmUp   { from{opacity:0;transform:translateY(18px) scale(.97);} to{opacity:1;transform:translateY(0) scale(1);} }
        @keyframes crmFloat{ 0%,100%{transform:translateY(0);} 50%{transform:translateY(-3px);} }
        .crm-stat{
          position:relative;border-radius:14px;padding:10px 14px;color:#fff;overflow:hidden;
          display:flex;align-items:center;gap:11px;transform-style:preserve-3d;
          box-shadow:0 2px 4px rgba(13,40,70,.12),0 8px 18px rgba(13,40,70,.16),inset 0 1px 0 rgba(255,255,255,.25);
          transition:transform .4s cubic-bezier(.2,.8,.2,1),box-shadow .4s ease;
          animation:crmUp .6s cubic-bezier(.2,.8,.2,1) both;
        }
        .crm-stat:hover{
          transform:translateY(-5px) perspective(700px) rotateX(6deg) rotateY(-3deg) scale(1.025);
          box-shadow:0 6px 12px rgba(13,40,70,.16),0 20px 40px rgba(13,40,70,.28),inset 0 1px 0 rgba(255,255,255,.35);
        }
        .crm-stat::after{content:'';position:absolute;top:0;left:0;right:0;height:46%;
          background:linear-gradient(180deg,rgba(255,255,255,.22),rgba(255,255,255,0));pointer-events:none;}
        .crm-stat .ic{font-size:24px;filter:drop-shadow(0 3px 5px rgba(0,0,0,.25));animation:crmFloat 3.5s ease-in-out infinite;}
        .crm-stat .num{font-size:22px;font-weight:900;letter-spacing:-1px;line-height:1;text-shadow:0 2px 6px rgba(0,0,0,.22);}
        .crm-stat .lbl{font-size:10px;font-weight:800;letter-spacing:.5px;opacity:.92;margin-top:3px;text-transform:uppercase;}
        .crm-rise{animation:crmUp .55s cubic-bezier(.2,.8,.2,1) both;}
        .crm-lift{transition:transform .35s cubic-bezier(.2,.8,.2,1),box-shadow .35s ease;}
        .crm-lift:hover{transform:translateY(-4px);box-shadow:0 16px 36px rgba(0,80,120,.20);}
        @keyframes crmPage{from{opacity:0;transform:translateX(28px) scale(.99);} to{opacity:1;transform:translateX(0) scale(1);}}
        .crm-page{animation:crmPage .45s cubic-bezier(.2,.8,.2,1) both;}
        .crm-bar{box-shadow:0 2px 5px rgba(0,0,0,.18),inset 0 1px 0 rgba(255,255,255,.35);transition:width .55s cubic-bezier(.2,.8,.2,1),filter .2s ease,transform .2s ease;}
        .crm-bar:hover{filter:brightness(1.1) saturate(1.1);transform:scaleY(1.12);}
        .crm-btn{transition:transform .18s cubic-bezier(.2,.8,.2,1),box-shadow .2s ease,background .2s ease,color .2s ease;box-shadow:0 2px 6px rgba(13,40,70,.12);}
        .crm-btn:hover{transform:translateY(-2px);box-shadow:0 8px 18px rgba(13,71,161,.28);}
        .crm-btn:active{transform:translateY(0) scale(.97);}
        .crm-sel{transition:box-shadow .2s ease,border-color .2s ease,transform .15s ease;box-shadow:0 1px 3px rgba(0,40,80,.08);}
        .crm-sel:hover{box-shadow:0 4px 12px rgba(13,71,161,.16);transform:translateY(-1px);}
        .crm-sel:focus{outline:none;border-color:#1565c0;box-shadow:0 0 0 3px rgba(21,101,192,.20);}
        .crm-pill{box-shadow:0 3px 8px rgba(13,71,161,.30),inset 0 1px 0 rgba(255,255,255,.4);}
      `}</style>
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
              <button key={t.k} className="crm-btn" onClick={()=>setTab(t.k)} style={{background:tab===t.k?'rgba(255,255,255,0.18)':'transparent',
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
              <SFilter label="Case Origin"  value={fOrigin}   onChange={setFOrigin}   options={opts.origin||[]}/>
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

            <div key={tab} className="crm-page" style={{display:'flex',flexDirection:'column',gap:10}}>
            {tab==='overall' ? (
              <>
                {/* Case Applicability buttons */}
                <div style={{display:'flex',gap:10,alignItems:'center'}}>
                  <span style={{fontSize:11,fontWeight:800,color:T.textM,textTransform:'uppercase',letterSpacing:0.4}}>Case Applicability:</span>
                  {[{k:'Inclusion',c:T.green},{k:'Exclusion',c:T.red}].map(b=>(
                    <button key={b.k} className="crm-btn" onClick={()=>setApplic(applic===b.k?'':b.k)} style={{
                      background:applic===b.k?`linear-gradient(135deg,${b.c},${b.c}cc)`:'#fff',
                      color:applic===b.k?'#fff':b.c,
                      border:`1.5px solid ${b.c}`,
                      borderRadius:8,padding:'7px 20px',fontSize:12,fontWeight:800,cursor:'pointer',transition:'all 0.15s'}}>
                      {b.k}
                    </button>
                  ))}
                  {applic && <span style={{fontSize:11,color:T.gray,fontWeight:600}}>showing {applic} only · click again to clear</span>}
                </div>

                {/* Summary cards */}
                <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:10}}>
                  {[
                    {v:totalT,  l:'Total Tickets',  g:'linear-gradient(135deg,#00bcd4 0%,#0097a7 55%,#006978 100%)', ic:'🎫'},
                    {v:openT,   l:'Open Tickets',   g:'linear-gradient(135deg,#ffb74d 0%,#fb8c00 55%,#e65100 100%)', ic:'🔓'},
                    {v:closedT, l:'Closed Tickets', g:'linear-gradient(135deg,#66bb6a 0%,#43a047 55%,#2e7d32 100%)', ic:'✅'},
                  ].map((c,i)=>(
                    <div key={i} className="crm-stat" style={{background:c.g,animationDelay:`${i*0.09}s`}}>
                      <div className="ic">{c.ic}</div>
                      <div>
                        <div className="num">{c.v.toLocaleString()}</div>
                        <div className="lbl">{c.l}</div>
                      </div>
                    </div>
                  ))}
                </div>

                <div style={{display:'grid',gridTemplateColumns:'1fr 1.1fr 1.2fr',gap:10,alignItems:'start'}}>

                  {/* Case Type */}
                  <Panel title="Case Type">
                    <ResponsiveContainer width="100%" height={170}>
                      <PieChart>
                        <defs>
                          <radialGradient id="pieQuery" cx="35%" cy="35%" r="75%"><stop offset="0%" stopColor="#e8cf5c"/><stop offset="100%" stopColor="#a8851a"/></radialGradient>
                          <radialGradient id="pieComplaint" cx="35%" cy="35%" r="75%"><stop offset="0%" stopColor="#ef5350"/><stop offset="100%" stopColor="#b71c1c"/></radialGradient>
                          <radialGradient id="pieSPAM" cx="35%" cy="35%" r="75%"><stop offset="0%" stopColor="#78909c"/><stop offset="100%" stopColor="#455a64"/></radialGradient>
                          <radialGradient id="pieOther" cx="35%" cy="35%" r="75%"><stop offset="0%" stopColor="#26c6da"/><stop offset="100%" stopColor="#00838f"/></radialGradient>
                          <filter id="pieShadow" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="0" dy="4" stdDeviation="5" floodColor="#003c5a" floodOpacity="0.35"/></filter>
                        </defs>
                        <Pie data={ovCharts.caseType} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={62} innerRadius={16}
                          paddingAngle={3} stroke="#fff" strokeWidth={2} style={{filter:'url(#pieShadow)'}}
                          isAnimationActive animationDuration={900} animationBegin={150}
                          labelLine={true} label={({cx,cy,midAngle,outerRadius,value})=>{
                            const RAD=Math.PI/180, r=outerRadius+16;
                            const x=cx+r*Math.cos(-midAngle*RAD), y=cy+r*Math.sin(-midAngle*RAD);
                            return <text x={x} y={y} fill="#000" fontSize={11} fontWeight={800} textAnchor={x>cx?'start':'end'} dominantBaseline="central">{value.toLocaleString()}</text>;
                          }}>
                          {ovCharts.caseType.map((e,i)=>{
                            const gid = e.name==='Query'?'pieQuery':e.name==='Complaint'?'pieComplaint':e.name==='SPAM'?'pieSPAM':'pieOther';
                            return <Cell key={i} fill={`url(#${gid})`}/>;
                          })}
                        </Pie>
                        <Tooltip content={<CTip/>}/>
                        <Legend iconType="circle" wrapperStyle={{fontSize:11,fontWeight:700}} formatter={(v)=><span style={{color:"#000"}}>{v}</span>}/>
                      </PieChart>
                    </ResponsiveContainer>
                  </Panel>

                  {/* Status */}
                  <Panel title="Status">
                    <div style={{padding:'4px 2px'}}>
                      {ovCharts.statusList.map((s,i)=>{
                        const max = ovCharts.statusList[0]?.value || 1;
                        const w = Math.max(2, s.value/max*100);
                        const big = s.name==='Closed';
                        return (
                          <div key={i} style={{display:'flex',alignItems:'center',gap:8,marginBottom:6}}>
                            <div style={{width:140,fontSize:10.5,fontWeight:800,color:T.textM}}>{s.name}</div>
                            <div style={{flex:1,position:'relative',height:21,background:'#eef1f4',borderRadius:5,overflow:'hidden',boxShadow:'inset 0 1px 3px rgba(0,40,80,.12)'}}>
                              <div className="crm-bar" style={{position:'absolute',top:0,left:0,bottom:0,width:`${w}%`,
                                background:big?'linear-gradient(90deg,#f6b08a,#ef7f4f)':'linear-gradient(90deg,#fce3d6,#f7c4ab)',borderRadius:5}}/>
                              <div style={{position:'absolute',inset:0,display:'flex',alignItems:'center',justifyContent:'flex-end',paddingRight:9,fontSize:11,fontWeight:800,color:T.text}}>{s.value.toLocaleString()}</div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </Panel>

                  {/* Case Origin */}
                  <Panel title="Case Origin">
                    <div style={{padding:'4px 2px'}}>
                      {ovCharts.origin.slice(0,8).map((o,i)=>{
                        const c1=CC[i%CC.length];
                        return (
                        <div key={i} style={{display:'flex',alignItems:'center',gap:8,marginBottom:6}}>
                          <div style={{width:115,fontSize:10,fontWeight:700,color:T.textM,textAlign:'right',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{o.name}</div>
                          <div style={{flex:1,display:'flex',alignItems:'center',gap:7}}>
                            <div className="crm-bar" style={{height:16,width:`${o.pct}%`,minWidth:4,background:`linear-gradient(90deg,${c1},${c1}cc)`,borderRadius:4}}/>
                            <span style={{fontSize:10.5,fontWeight:800,color:T.text,whiteSpace:'nowrap'}}>{o.pct}%</span>
                          </div>
                        </div>
                        );
                      })}
                    </div>
                  </Panel>

                </div>

                {/* Number of cases by Owner / HOD / Team Leader */}
                <Panel title={`Number of Cases by ${byDim==='owner'?'Case Owner':'Team Leader'}`}>
                  <div style={{display:'flex',gap:8,marginBottom:14,justifyContent:'center'}}>
                    {[{k:'owner',l:'By Case Owner'},{k:'tl',l:'By Team Leader'}].map(b=>(
                      <button key={b.k} className="crm-btn" onClick={()=>setByDim(b.k)} style={{
                        background:byDim===b.k?'linear-gradient(135deg,#1565c0,#0d47a1)':'#fff',
                        color:byDim===b.k?'#fff':T.textM,
                        border:`1.5px solid ${byDim===b.k?'#0d47a1':'#cfd8dc'}`,
                        borderRadius:8,padding:'7px 16px',fontSize:12,fontWeight:800,cursor:'pointer',transition:'all 0.15s'}}>
                        {b.l}
                      </button>
                    ))}
                  </div>
                  {byData.length>0 ? (
                    <ResponsiveContainer width="100%" height={Math.max(200, byData.length*24)}>
                      <BarChart data={byData} layout="vertical" margin={{top:5,right:55,left:10,bottom:5}}>
                        <defs>
                          <linearGradient id="barClosed" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stopColor="#66bb6a"/><stop offset="100%" stopColor="#2e7d32"/></linearGradient>
                          <linearGradient id="barOpen" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stopColor="#ffb74d"/><stop offset="100%" stopColor="#ef6c00"/></linearGradient>
                          <filter id="barSh" x="-10%" y="-30%" width="120%" height="160%"><feDropShadow dx="0" dy="2" stdDeviation="2.5" floodColor="#003c5a" floodOpacity="0.30"/></filter>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="rgba(0,60,100,0.08)"/>
                        <XAxis type="number" tick={{fontSize:10,fill:T.textL}}/>
                        <YAxis type="category" dataKey="name" width={150} tick={{fontSize:10,fill:T.textM,fontWeight:600}}/>
                        <Tooltip content={<CTip/>} cursor={{fill:'rgba(21,101,192,0.06)'}}/>
                        <Legend iconType="circle" wrapperStyle={{fontSize:11,fontWeight:700}} formatter={(v)=><span style={{color:"#000"}}>{v}</span>}/>
                        <Bar dataKey="closed" name="Closed" stackId="a" fill="url(#barClosed)" style={{filter:'url(#barSh)'}} isAnimationActive animationDuration={800}>
                          <LabelList dataKey="closed" position="center" style={{fontSize:9,fontWeight:800,fill:'#fff'}} formatter={v=>v>maxTot*0.06?v.toLocaleString():''}/>
                        </Bar>
                        <Bar dataKey="open" name="Open" stackId="a" fill="url(#barOpen)" radius={[0,5,5,0]} style={{filter:'url(#barSh)'}} isAnimationActive animationDuration={800}>
                          <LabelList dataKey="open" position="center" style={{fontSize:9,fontWeight:800,fill:'#fff'}} formatter={v=>v>maxTot*0.06?v.toLocaleString():''}/>
                          <LabelList content={barEndLabel}/>
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div style={{minHeight:200,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:8,textAlign:'center'}}>
                      <div style={{fontSize:32,opacity:0.3}}>📭</div>
                      <div style={{fontSize:12,fontWeight:700,color:T.textM}}>No cases match the current filters</div>
                    </div>
                  )}
                </Panel>

                {/* Cases by Area / Sub Area */}
                <GC className="crm-rise" style={{padding:0,overflow:'hidden'}}>
                  <div style={{maxHeight:320,overflowY:'auto'}}>
                    <table style={{width:'100%',borderCollapse:'collapse',fontSize:12}}>
                      <thead>
                        <tr style={{background:'linear-gradient(135deg,#1565c0,#0d47a1)',position:'sticky',top:0,zIndex:1}}>
                          <th style={{padding:'9px 14px',color:'#fff',fontWeight:800,textAlign:'left',letterSpacing:0.3}}>Area</th>
                          <th style={{padding:'9px 14px',color:'#fff',fontWeight:800,textAlign:'left',letterSpacing:0.3}}>Sub Area</th>
                          <th style={{padding:'9px 14px',color:'#fff',fontWeight:800,textAlign:'right',letterSpacing:0.3}}>No of Cases</th>
                          <th style={{padding:'9px 14px',color:'#fff',fontWeight:800,textAlign:'right',letterSpacing:0.3}}>Open</th>
                          <th style={{padding:'9px 14px',color:'#fff',fontWeight:800,textAlign:'right',letterSpacing:0.3}}>Closed</th>
                        </tr>
                        <tr style={{background:'#e8eef5',position:'sticky',top:42,zIndex:1,borderBottom:'2px solid #1565c0'}}>
                          <td style={{padding:'8px 14px',fontWeight:900,color:T.navy}} colSpan={2}>TOTAL ({areaTable.length} rows)</td>
                          <td style={{padding:'8px 14px',textAlign:'right',fontWeight:900,color:T.tealD}}>{areaTot.total.toLocaleString()}</td>
                          <td style={{padding:'8px 14px',textAlign:'right',fontWeight:900,color:T.amber}}>{areaTot.open.toLocaleString()}</td>
                          <td style={{padding:'8px 14px',textAlign:'right',fontWeight:900,color:T.green}}>{areaTot.closed.toLocaleString()}</td>
                        </tr>
                      </thead>
                      <tbody>
                        {areaTable.map((r,i)=>(
                          <tr key={i} style={{borderBottom:'1px solid rgba(0,60,100,0.06)',background:i%2?'rgba(0,151,167,0.03)':'#fff'}}>
                            <td style={{padding:'5px 14px',fontWeight:700,color:T.navy}}>{r.area}</td>
                            <td style={{padding:'5px 14px',color:T.textM}}>{r.subArea}</td>
                            <td style={{padding:'5px 14px',textAlign:'right',fontWeight:800,color:T.text}}>{r.total.toLocaleString()}</td>
                            <td style={{padding:'5px 14px',textAlign:'right',fontWeight:700,color:T.amber}}>{r.open.toLocaleString()}</td>
                            <td style={{padding:'5px 14px',textAlign:'right',fontWeight:700,color:T.green}}>{r.closed.toLocaleString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </GC>
              </>
            ) : (
              <GC style={{padding:18}}>
                <SH title={pageLabel} sub={`${pageRows.length.toLocaleString()} tickets in view · ${(data||[]).length.toLocaleString()} total`}/>
                <div style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',minHeight:280,gap:8}}>
                  <div style={{fontSize:48,fontWeight:900,color:T.tealD,letterSpacing:-1,lineHeight:1}}>{pageRows.length.toLocaleString()}</div>
                  <div style={{fontSize:12,fontWeight:700,color:T.textM,textTransform:'uppercase',letterSpacing:0.5}}>{pageLabel}</div>
                  <div style={{fontSize:11,color:T.gray,marginTop:12,opacity:0.7}}>KPIs coming soon — page & filters ready</div>
                </div>
              </GC>
            )}
            </div>

          </main>

        </div>
      </div>
    </div>
  );
}
