import React, { useState, useEffect, useMemo } from 'react';
import * as XLSX from 'xlsx';
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
  const [analytics, setAna]   = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab]         = useState('overview');

  // Global filters
  const [fStatus,  setFStatus]  = useState('All');
  const [fOwner,   setFOwner]   = useState('All');
  const [fArea,    setFArea]    = useState('All');
  const [fOrigin,  setFOrigin]  = useState('All');
  const [fTAT,     setFTAT]     = useState('All');
  const [fTL,      setFTL]      = useState('All');
  const [fHNI,     setFHNI]     = useState('All');
  const [fMonth,   setFMonth]   = useState('All');

  const logout = () => { sessionStorage.removeItem('crm_auth'); window.location.reload(); };

  useEffect(() => {
    Promise.all([
      fetch('/data/crm_analytics.json').then(r=>r.json()).catch(()=>null),
      fetch('/data/crm_case_management.xlsx').then(r=>r.arrayBuffer()),
    ]).then(([ana, buf]) => {
      if(ana) setAna(ana);
      const wb = XLSX.read(buf, {type:'array'});
      const ws = wb.Sheets[wb.SheetNames[0]];
      const raw = XLSX.utils.sheet_to_json(ws, {defval:null, range:14});
      const parsed = raw.map(r=>({
        account:    r['Account Name']||'',
        caseNum:    r['Case Number']||'',
        subject:    r['Subject']||'',
        priority:   r['Priority']||'',
        origin:     r['Case Origin']||'',
        caseType:   r['Case Type']||'',
        status:     r['Status']||'',
        tatStatus:  r['TAT Status']||'',
        area:       r['Area']||'',
        subArea:    r['Sub Area']||'',
        owner:      r['Case Owner']||'',
        tl:         r['Team Leader name']||'',
        hni:        r['HNI Customer']==1||String(r['HNI Customer']).toUpperCase()==='YES',
        legal:      r['Active Legal Case']==1||String(r['Active Legal Case']).toUpperCase()==='YES',
        reopened:   r['Status']==='Re-Open',
        reassigns:  r['Number of Reassigns']||0,
        age:        r['Age']||0,
        respCat:    r['Response Time Category']||'',
        resCat:     r['Resolution Time Category']||'',
        openedStr:  r['Date/Time Opened']||'',
        closedStr:  r['Closed Date']||'',
        project:    r['Project']||'',
        property:   r['Property']||'',
      }));
      setData(parsed);
      setLoading(false);
    }).catch(()=>setLoading(false));
  }, []);

  // Filtered data
  const filtered = useMemo(() => {
    if(!data) return [];
    return data.filter(r => {
      if(fStatus!=='All' && r.status!==fStatus) return false;
      if(fOwner!=='All'  && r.owner!==fOwner)   return false;
      if(fArea!=='All'   && r.area!==fArea)      return false;
      if(fOrigin!=='All' && r.origin!==fOrigin)  return false;
      if(fTAT!=='All'    && r.tatStatus!==fTAT)  return false;
      if(fTL!=='All'     && r.tl!==fTL)          return false;
      if(fHNI==='HNI'    && !r.hni)              return false;
      if(fHNI==='Non-HNI'&& r.hni)               return false;
      return true;
    });
  }, [data,fStatus,fOwner,fArea,fOrigin,fTAT,fTL,fHNI]);

  // Derived KPIs from filtered data
  const kpi = useMemo(() => {
    if(!filtered.length) return {};
    const total    = filtered.length;
    const isClosed = r => ['Closed','Resolved','Close'].includes(r.status);
    const isOpen   = r => ['New','In Progress','Pending for Clarification','Re-Open'].includes(r.status);
    const closed   = filtered.filter(isClosed).length;
    const open     = filtered.filter(isOpen).length;
    const beyondTAT= filtered.filter(r=>r.tatStatus==='Beyond TAT').length;
    const escalated= filtered.filter(r=>r.tatStatus&&r.tatStatus.includes('Escalation')).length;
    const reopened = filtered.filter(r=>r.reopened).length;
    const pendClar = filtered.filter(r=>r.status==='Pending for Clarification').length;
    const hniCount = filtered.filter(r=>r.hni).length;
    const legal    = filtered.filter(r=>r.legal).length;
    const highReas = filtered.filter(r=>r.reassigns>=3).length;
    const respW24  = filtered.filter(r=>r.respCat==='Within 24 Hrs').length;
    const resW24   = filtered.filter(r=>r.resCat==='Within 24 Hrs').length;
    const resA24   = filtered.filter(r=>r.resCat==='Above 24 Hrs').length;
    return { total,closed,open,beyondTAT,escalated,reopened,pendClar,hniCount,legal,highReas,respW24,resW24,resA24,
      resolutionRate: total>0?(closed/total*100).toFixed(1):0 };
  }, [filtered]);

  // Chart data from filtered
  const charts = useMemo(() => {
    if(!filtered.length) return {};
    const cnt = (arr,key) => arr.reduce((o,r)=>{const v=r[key]||'Unknown';o[v]=(o[v]||0)+1;return o;},{});

    // Status dist
    const statusDist = Object.entries(cnt(filtered,'status')).map(([k,v])=>({name:k,value:v})).sort((a,b)=>b.value-a.value);

    // TAT breakdown
    const tatGrouped = {};
    filtered.forEach(r=>{
      const t=r.tatStatus;
      if(!t) return;
      let g = t.includes('Level 1')?'L1 Esc':t.includes('Level 2')?'L2 Esc':t.includes('Level 3')?'L3 Esc':
              t.includes('Level 4')?'L4 Esc':t.includes('Level 5')?'L5 Esc':t==='Beyond TAT'?'Beyond TAT':null;
      if(g) tatGrouped[g]=(tatGrouped[g]||0)+1;
    });
    const tatData = Object.entries(tatGrouped).map(([k,v])=>({name:k,count:v})).sort((a,b)=>b.count-a.count);

    // Area
    const areaData = Object.entries(cnt(filtered,'area')).map(([k,v])=>({name:k,count:v})).filter(d=>d.name!=='Unknown').sort((a,b)=>b.count-a.count).slice(0,10);

    // Origin
    const originData = Object.entries(cnt(filtered,'origin')).map(([k,v])=>({name:k,count:v})).filter(d=>d.name!=='Unknown').sort((a,b)=>b.count-a.count);

    // Case type
    const typeData = Object.entries(cnt(filtered,'caseType')).map(([k,v])=>({name:k,value:v})).filter(d=>d.name!=='Unknown');

    // Response time
    const respData = [{name:'Within 24h',value:filtered.filter(r=>r.respCat==='Within 24 Hrs').length},
                      {name:'Above 24h', value:filtered.filter(r=>r.respCat==='Above 24 Hrs').length}];

    // Resolution time
    const resData = [{name:'Within 24h',value:filtered.filter(r=>r.resCat==='Within 24 Hrs').length},
                     {name:'Above 24h', value:filtered.filter(r=>r.resCat==='Above 24 Hrs').length}];

    // Team leader performance
    const tlMap = {};
    filtered.forEach(r=>{
      const tl=(r.tl||'').trim();
      if(!tl) return;
      if(!tlMap[tl]) tlMap[tl]={name:tl,total:0,closed:0,open:0,beyondTAT:0};
      tlMap[tl].total++;
      if(['Closed','Resolved','Close'].includes(r.status)) tlMap[tl].closed++;
      if(['New','In Progress','Pending for Clarification','Re-Open'].includes(r.status)) tlMap[tl].open++;
      if(r.tatStatus==='Beyond TAT') tlMap[tl].beyondTAT++;
    });
    const tlData = Object.values(tlMap).map(t=>({...t,resRate:+(t.closed/t.total*100).toFixed(1)})).sort((a,b)=>b.total-a.total).slice(0,10);

    // Top owners (closed)
    const ownerMap = {};
    filtered.forEach(r=>{
      if(!['Closed','Resolved','Close'].includes(r.status)) return;
      ownerMap[r.owner]=(ownerMap[r.owner]||0)+1;
    });
    const ownerData = Object.entries(ownerMap).map(([k,v])=>({name:k,closed:v})).sort((a,b)=>b.closed-a.closed).slice(0,10);

    // Age buckets for open
    const ageDist = {};
    filtered.filter(r=>['New','In Progress','Pending for Clarification','Re-Open'].includes(r.status)).forEach(r=>{
      const a=r.age||0;
      const b=a<=1?'0-1d':a<=7?'2-7d':a<=30?'8-30d':a<=90?'31-90d':'90+d';
      ageDist[b]=(ageDist[b]||0)+1;
    });
    const ageData = ['0-1d','2-7d','8-30d','31-90d','90+d'].filter(k=>ageDist[k]).map(k=>({name:k,count:ageDist[k]}));

    // Sub area top
    const subAreaData = Object.entries(cnt(filtered,'subArea')).filter(([k])=>k&&k!=='Unknown').map(([k,v])=>({name:k,count:v})).sort((a,b)=>b.count-a.count).slice(0,8);

    return {statusDist,tatData,areaData,originData,typeData,respData,resData,tlData,ownerData,ageData,subAreaData};
  }, [filtered]);

  // Filter options
  const opts = useMemo(() => {
    if(!data) return {};
    const u = k => [...new Set(data.map(r=>r[k]).filter(v=>v&&v.toString().trim()))].sort();
    return {
      status: [...new Set(data.map(r=>r.status).filter(Boolean))].sort(),
      owner:  [...new Set(data.map(r=>r.owner).filter(Boolean))].sort(),
      area:   [...new Set(data.map(r=>r.area).filter(Boolean))].sort(),
      origin: [...new Set(data.map(r=>r.origin).filter(Boolean))].sort(),
      tat:    [...new Set(data.map(r=>r.tatStatus).filter(Boolean))].sort(),
      tl:     [...new Set(data.map(r=>r.tl).filter(v=>v&&v.trim()))].sort(),
    };
  }, [data]);

  // Monthly trend from analytics JSON (pre-computed)
  const monthlyTrend = analytics?.monthlyTrend || [];

  const resetFilters = () => { setFStatus('All');setFOwner('All');setFArea('All');setFOrigin('All');setFTAT('All');setFTL('All');setFHNI('All');setFMonth('All'); };
  const hasFilters = [fStatus,fOwner,fArea,fOrigin,fTAT,fTL,fHNI].some(v=>v!=='All');

  if(loading) return <Loading/>;

  const TABS = [{k:'overview',l:'📊 Overview'},{k:'operations',l:'⚙️ Operations'},{k:'team',l:'👥 Team Performance'},{k:'risk',l:'🚨 Risk & Escalation'},{k:'tickets',l:'📋 Ticket Explorer'}];

  const navBg = 'linear-gradient(135deg,#0d2137 0%,#1a3a5c 60%,#006978 100%)';

  return (
    <div style={{minHeight:'100vh',backgroundImage:'url(/bg.jpg)',backgroundSize:'cover',backgroundPosition:'center',backgroundAttachment:'fixed',fontFamily:'Inter,sans-serif'}}>
      <div style={{minHeight:'100vh',background:'rgba(255,255,255,0.04)',backdropFilter:'blur(1px)'}}>

        {/* ── NAV ── */}
        <div style={{background:navBg,padding:'0 24px',display:'flex',alignItems:'center',justifyContent:'space-between',height:54,position:'sticky',top:0,zIndex:100,boxShadow:'0 2px 20px rgba(0,0,0,0.3)'}}>
          <div style={{display:'flex',alignItems:'center',gap:12}}>
            <img src="/swd-logo.png" alt="" style={{width:28,height:28,objectFit:'contain'}}/>
            <div>
              <p style={{color:'#fff',fontWeight:900,fontSize:13,margin:0,letterSpacing:0.3}}>CRM Intelligence</p>
              <p style={{color:'rgba(255,255,255,0.6)',fontSize:9,margin:0,fontWeight:600}}>SMARTWORLD GROUP · CASE MANAGEMENT</p>
            </div>
          </div>
          <button onClick={logout} style={{background:'rgba(211,47,47,0.8)',color:'#fff',border:'none',borderRadius:8,padding:'5px 14px',fontSize:11,fontWeight:700,cursor:'pointer'}}>
            🚪 Logout
          </button>
        </div>

        {/* ── GLOBAL FILTER BAR — removed ── */}

        <main style={{maxWidth:1600,margin:'0 auto',padding:'16px 20px 40px'}}>

          {/* ══════════════════════════════════════════
              TAB: OVERVIEW
          ══════════════════════════════════════════ */}
          {tab==='overview' && (
            <div style={{display:'flex',flexDirection:'column',gap:14,minHeight:340,alignItems:'center',justifyContent:'center'}}>
              {/* Overview cleared — blank canvas. KPIs & charts to be redesigned. */}
              <div style={{color:T.textM,fontSize:13,fontWeight:700,opacity:0.45,letterSpacing:0.5,padding:'100px 0'}}>
                CRM OVERVIEW — REDESIGN IN PROGRESS
              </div>
            </div>
          )}

        </main>
      </div>
    </div>
  );
}
