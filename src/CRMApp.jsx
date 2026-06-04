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
          <div style={{display:'flex',gap:4}}>
            {TABS.map(t=>(
              <button key={t.k} onClick={()=>setTab(t.k)} style={{background:tab===t.k?'rgba(255,255,255,0.18)':'transparent',
                color:'#fff',border:tab===t.k?'1px solid rgba(255,255,255,0.35)':'1px solid transparent',
                borderRadius:8,padding:'5px 14px',fontSize:11,fontWeight:700,cursor:'pointer',transition:'all 0.15s'}}>
                {t.l}
              </button>
            ))}
          </div>
          <button onClick={logout} style={{background:'rgba(211,47,47,0.8)',color:'#fff',border:'none',borderRadius:8,padding:'5px 14px',fontSize:11,fontWeight:700,cursor:'pointer'}}>
            🚪 Logout
          </button>
        </div>

        {/* ── GLOBAL FILTER BAR ── */}
        <div style={{background:'linear-gradient(90deg,#0d2137,#1a3a5c,#006978)',padding:'10px 24px'}}>
          <div style={{display:'grid',gridTemplateColumns:'repeat(8,1fr) auto',gap:10,alignItems:'end'}}>
            <FSelect label="Status"      value={fStatus}  onChange={setFStatus}  options={opts.status||[]}/>
            <FSelect label="TAT Status"  value={fTAT}     onChange={setFTAT}     options={opts.tat||[]}/>
            <FSelect label="Area"        value={fArea}    onChange={setFArea}     options={opts.area||[]}/>
            <FSelect label="Case Origin" value={fOrigin}  onChange={setFOrigin}  options={opts.origin||[]}/>
            <FSelect label="Team Leader" value={fTL}      onChange={setFTL}      options={opts.tl||[]}/>
            <FSelect label="Case Owner"  value={fOwner}   onChange={setFOwner}   options={opts.owner||[]}/>
            <FSelect label="Customer"    value={fHNI}     onChange={setFHNI}     options={['HNI','Non-HNI']}/>
            <div>
              <div style={{fontSize:9,fontWeight:800,color:'rgba(255,255,255,0.7)',textTransform:'uppercase',marginBottom:3}}>Records</div>
              <div style={{fontSize:13,fontWeight:900,color:'#fff'}}>{filtered.length.toLocaleString()} <span style={{fontSize:9,opacity:0.7}}>/ {(data||[]).length.toLocaleString()}</span></div>
            </div>
            {hasFilters&&<button onClick={resetFilters} style={{background:'rgba(211,47,47,0.7)',color:'#fff',border:'none',borderRadius:8,padding:'5px 12px',fontSize:10,fontWeight:700,cursor:'pointer',whiteSpace:'nowrap'}}>✕ Reset</button>}
          </div>
        </div>

        <main style={{maxWidth:1600,margin:'0 auto',padding:'16px 20px 40px'}}>

          {/* ══════════════════════════════════════════
              TAB: OVERVIEW
          ══════════════════════════════════════════ */}
          {tab==='overview' && (
            <div style={{display:'flex',flexDirection:'column',gap:14}}>

              {/* KPI Grid */}
              <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:12}}>
                <KpiCard icon="🎫" label="Total Tickets"      value={kpi.total}          color={T.navy}   sub={`${kpi.open} open · ${kpi.closed?.toLocaleString()} closed`}           pct={null}/>
                <KpiCard icon="✅" label="Resolution Rate"    value={`${kpi.resolutionRate}%`} color={T.green} sub={`${kpi.closed?.toLocaleString()} resolved of ${kpi.total?.toLocaleString()}`} pct={+kpi.resolutionRate}/>
                <KpiCard icon="🔓" label="Open Tickets"       value={kpi.open}           color={T.amber}  sub={`${kpi.pendClar} pending clarification`}                                pct={kpi.total>0?+(kpi.open/kpi.total*100).toFixed(1):0}/>
                <KpiCard icon="⚠️" label="Beyond TAT"         value={kpi.beyondTAT}      color={T.red}    sub={`${kpi.escalated} in escalation`}                                       pct={kpi.total>0?+(kpi.beyondTAT/kpi.total*100).toFixed(1):0}/>
                <KpiCard icon="🔁" label="Re-Opened"          value={kpi.reopened}       color={T.orange} sub="Reopened after closure — quality signal"                                 pct={kpi.closed>0?+(kpi.reopened/kpi.closed*100).toFixed(1):0}/>
                <KpiCard icon="👑" label="HNI Tickets"        value={kpi.hniCount}       color="#b45309"  sub="High-value customer cases"                                               pct={kpi.total>0?+(kpi.hniCount/kpi.total*100).toFixed(1):0}/>
                <KpiCard icon="⚖️" label="Active Legal Cases" value={kpi.legal}          color={T.red}    sub="Open with legal flag — high risk"                                        pct={null}/>
                <KpiCard icon="🔄" label="High Reassigns"     value={kpi.highReas}       color={T.purple} sub="Tickets reassigned 3+ times"                                             pct={kpi.total>0?+(kpi.highReas/kpi.total*100).toFixed(1):0}/>
              </div>

              {/* Monthly Trend + Status Distribution */}
              <div style={{display:'grid',gridTemplateColumns:'2fr 1fr',gap:12}}>
                <GC style={{padding:18}}>
                  <SH title="Monthly Ticket Volume — Opened vs Closed" sub="All time trend from analytics"/>
                  <div style={{overflowX:'auto'}}>
                    <div style={{minWidth:Math.max(monthlyTrend.length*52,600)+'px'}}>
                      <ResponsiveContainer width="100%" height={220}>
                        <ComposedChart data={monthlyTrend} margin={{top:14,right:16,bottom:28,left:0}}>
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,60,100,0.07)" vertical={false}/>
                          <XAxis dataKey="label" tick={{fill:T.textM,fontSize:8,fontWeight:600}} axisLine={false} tickLine={false} angle={-30} textAnchor="end" height={36}/>
                          <YAxis tick={{fill:T.textM,fontSize:9}} axisLine={false} tickLine={false} width={40}/>
                          <Tooltip content={<CTip/>}/>
                          <Legend wrapperStyle={{fontSize:9,fontWeight:700}} iconSize={8}/>
                          <Bar dataKey="opened" name="Opened" fill={T.amber} radius={[3,3,0,0]} opacity={0.85} barSize={16}/>
                          <Bar dataKey="closed" name="Closed" fill={T.green} radius={[3,3,0,0]} opacity={0.85} barSize={16}/>
                          <Line dataKey="opened" hide/>
                        </ComposedChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </GC>
                <GC style={{padding:18}}>
                  <SH title="Ticket Status Distribution"/>
                  <ResponsiveContainer width="100%" height={160}>
                    <PieChart>
                      <Pie data={charts.statusDist||[]} cx="40%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={2} dataKey="value" strokeWidth={1.5} stroke="#fff">
                        {(charts.statusDist||[]).map((_,i)=><Cell key={i} fill={CC[i%CC.length]}/>)}
                      </Pie>
                      <Tooltip content={<CTip/>}/>
                    </PieChart>
                  </ResponsiveContainer>
                  <div style={{display:'flex',flexDirection:'column',gap:5,marginTop:4}}>
                    {(charts.statusDist||[]).slice(0,6).map((d,i)=>(
                      <div key={i} style={{display:'flex',alignItems:'center',gap:6}}>
                        <div style={{width:9,height:9,borderRadius:2,background:CC[i%CC.length],flexShrink:0}}/>
                        <span style={{fontSize:9,color:T.textM,flex:1,fontWeight:600}}>{d.name}</span>
                        <span style={{fontSize:10,fontWeight:800,color:CC[i%CC.length]}}>{d.value.toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                </GC>
              </div>

              {/* Origin + Case Type + Response Time */}
              <div style={{display:'grid',gridTemplateColumns:'2fr 1fr 1fr',gap:12}}>
                <GC style={{padding:18}}>
                  <SH title="Case Origin Breakdown"/>
                  <div style={{display:'flex',flexDirection:'column',gap:7}}>
                    {(charts.originData||[]).map((d,i)=>{
                      const pct = kpi.total>0?(d.count/kpi.total*100).toFixed(1):0;
                      return (
                        <div key={i}>
                          <div style={{display:'flex',justifyContent:'space-between',marginBottom:3}}>
                            <div style={{display:'flex',alignItems:'center',gap:6}}>
                              <div style={{width:8,height:8,borderRadius:2,background:CC[i%CC.length],flexShrink:0}}/>
                              <span style={{fontSize:10,fontWeight:700,color:T.text}}>{d.name}</span>
                            </div>
                            <div style={{display:'flex',gap:8}}>
                              <span style={{fontSize:9,color:T.textL}}>{pct}%</span>
                              <span style={{fontSize:10,fontWeight:800,color:CC[i%CC.length]}}>{d.count.toLocaleString()}</span>
                            </div>
                          </div>
                          <div style={{height:5,background:'rgba(0,60,100,0.07)',borderRadius:3}}>
                            <div style={{width:`${Math.min(+pct*2,100)}%`,height:'100%',background:CC[i%CC.length],borderRadius:3,opacity:0.8}}/>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </GC>
                <GC style={{padding:18}}>
                  <SH title="Case Type"/>
                  <ResponsiveContainer width="100%" height={150}>
                    <PieChart>
                      <Pie data={charts.typeData||[]} cx="50%" cy="50%" innerRadius={35} outerRadius={60} paddingAngle={3} dataKey="value" strokeWidth={1.5} stroke="#fff">
                        {(charts.typeData||[]).map((_,i)=><Cell key={i} fill={CC[i]}/>)}
                      </Pie>
                      <Tooltip content={<CTip/>}/>
                    </PieChart>
                  </ResponsiveContainer>
                  <div style={{display:'flex',flexDirection:'column',gap:5}}>
                    {(charts.typeData||[]).map((d,i)=>(
                      <div key={i} style={{display:'flex',alignItems:'center',gap:6}}>
                        <div style={{width:8,height:8,borderRadius:2,background:CC[i],flexShrink:0}}/>
                        <span style={{fontSize:9,flex:1,color:T.textM,fontWeight:600}}>{d.name}</span>
                        <span style={{fontSize:10,fontWeight:800,color:CC[i]}}>{d.value.toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                </GC>
                <GC style={{padding:18}}>
                  <SH title="Response Time"/>
                  <div style={{display:'flex',flexDirection:'column',gap:8}}>
                    {[{label:'First Response',data:charts.respData||[],colors:[T.green,T.red]},
                      {label:'Resolution Time',data:charts.resData||[],colors:[T.teal,T.amber]}].map((s,si)=>(
                      <div key={si}>
                        <p style={{fontSize:9,fontWeight:700,color:T.textM,textTransform:'uppercase',margin:'0 0 6px'}}>{s.label}</p>
                        {s.data.map((d,i)=>(
                          <div key={i} style={{display:'flex',alignItems:'center',gap:6,marginBottom:4}}>
                            <div style={{width:8,height:8,borderRadius:2,background:s.colors[i],flexShrink:0}}/>
                            <span style={{fontSize:9,flex:1,color:T.textM,fontWeight:600}}>{d.name}</span>
                            <span style={{fontSize:10,fontWeight:800,color:s.colors[i]}}>{d.value.toLocaleString()}</span>
                          </div>
                        ))}
                      </div>
                    ))}
                    <div style={{marginTop:8,padding:'8px 12px',background:'rgba(0,151,167,0.07)',borderRadius:8}}>
                      <p style={{fontSize:9,color:T.textM,margin:0,fontWeight:700}}>AVG RESOLUTION</p>
                      <p style={{fontSize:20,fontWeight:900,color:T.tealD,margin:0}}>2.9 <span style={{fontSize:11}}>days</span></p>
                    </div>
                  </div>
                </GC>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════
              TAB: OPERATIONS
          ══════════════════════════════════════════ */}
          {tab==='operations' && (
            <div style={{display:'flex',flexDirection:'column',gap:14}}>
              {/* Area + Sub Area */}
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
                <GC style={{padding:18}}>
                  <SH title="Tickets by Area" sub={`Top ${(charts.areaData||[]).length} areas`}/>
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={charts.areaData||[]} layout="vertical" margin={{top:0,right:60,bottom:0,left:4}}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,60,100,0.07)" horizontal={false}/>
                      <XAxis type="number" tick={{fill:T.textM,fontSize:8}} axisLine={false} tickLine={false}/>
                      <YAxis type="category" dataKey="name" tick={{fill:T.navy,fontSize:9,fontWeight:700}} axisLine={false} tickLine={false} width={130}/>
                      <Tooltip content={<CTip/>}/>
                      <Bar dataKey="count" name="Tickets" radius={[0,4,4,0]}>
                        {(charts.areaData||[]).map((_,i)=><Cell key={i} fill={CC[i%CC.length]}/>)}
                        <LabelList dataKey="count" position="right" style={{fill:T.navy,fontSize:8,fontWeight:800}}/>
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </GC>
                <GC style={{padding:18}}>
                  <SH title="Sub-Area Breakdown" sub="Top 8 sub-categories"/>
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={charts.subAreaData||[]} layout="vertical" margin={{top:0,right:60,bottom:0,left:4}}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,60,100,0.07)" horizontal={false}/>
                      <XAxis type="number" tick={{fill:T.textM,fontSize:8}} axisLine={false} tickLine={false}/>
                      <YAxis type="category" dataKey="name" tick={{fill:T.navy,fontSize:9,fontWeight:700}} axisLine={false} tickLine={false} width={180}/>
                      <Tooltip content={<CTip/>}/>
                      <Bar dataKey="count" name="Tickets" radius={[0,4,4,0]}>
                        {(charts.subAreaData||[]).map((_,i)=><Cell key={i} fill={CC[(i+3)%CC.length]}/>)}
                        <LabelList dataKey="count" position="right" style={{fill:T.navy,fontSize:8,fontWeight:800}}/>
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </GC>
              </div>

              {/* Open ticket age distribution */}
              <div style={{display:'grid',gridTemplateColumns:'1fr 2fr',gap:12}}>
                <GC style={{padding:18}}>
                  <SH title="Open Ticket Age Buckets" sub="How long open tickets have been waiting"/>
                  <div style={{display:'flex',flexDirection:'column',gap:8,marginTop:8}}>
                    {(charts.ageData||[]).map((d,i)=>{
                      const max = Math.max(...(charts.ageData||[]).map(x=>x.count),1);
                      const pct = Math.round(d.count/max*100);
                      const col = i===0?T.green:i===1?T.teal:i===2?T.amber:i===3?T.orange:T.red;
                      return (
                        <div key={i}>
                          <div style={{display:'flex',justifyContent:'space-between',marginBottom:3}}>
                            <span style={{fontSize:11,fontWeight:700,color:T.text}}>{d.name}</span>
                            <span style={{fontSize:11,fontWeight:900,color:col}}>{d.count}</span>
                          </div>
                          <div style={{height:8,background:'rgba(0,60,100,0.07)',borderRadius:4}}>
                            <div style={{width:pct+'%',height:'100%',background:col,borderRadius:4,opacity:0.8}}/>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </GC>
                <GC style={{padding:18}}>
                  <SH title="TAT & Escalation Breakdown"/>
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={charts.tatData||[]} margin={{top:14,right:20,bottom:8,left:0}}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,60,100,0.07)" vertical={false}/>
                      <XAxis dataKey="name" tick={{fill:T.textM,fontSize:10,fontWeight:700}} axisLine={false} tickLine={false}/>
                      <YAxis tick={{fill:T.textM,fontSize:9}} axisLine={false} tickLine={false} width={36}/>
                      <Tooltip content={<CTip/>}/>
                      <Bar dataKey="count" name="Tickets" radius={[4,4,0,0]} barSize={36}>
                        {(charts.tatData||[]).map((_,i)=><Cell key={i} fill={i===0?T.red:i===1?T.orange:i===2?T.amber:CC[i]}/>)}
                        <LabelList dataKey="count" position="top" style={{fill:T.navy,fontSize:9,fontWeight:800}}/>
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </GC>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════
              TAB: TEAM PERFORMANCE
          ══════════════════════════════════════════ */}
          {tab==='team' && (
            <div style={{display:'flex',flexDirection:'column',gap:14}}>
              {/* TL Performance Table */}
              <GC style={{padding:18}}>
                <SH title="Team Leader Performance" sub="Total · Closed · Open · Beyond TAT · Resolution Rate"/>
                <div style={{overflowX:'auto'}}>
                  <table style={{width:'100%',borderCollapse:'collapse',fontSize:11}}>
                    <thead>
                      <tr style={{background:'rgba(0,105,120,0.08)'}}>
                        {['Team Leader','Total','Closed','Open','Beyond TAT','Resolution Rate'].map(h=>(
                          <th key={h} style={{padding:'8px 12px',textAlign:'left',fontSize:9,fontWeight:800,color:T.tealD,textTransform:'uppercase',letterSpacing:0.4,borderBottom:`2px solid ${T.tealD}22`}}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {(charts.tlData||[]).map((tl,i)=>(
                        <tr key={i} style={{borderBottom:'1px solid rgba(0,60,100,0.06)',background:i%2===0?'transparent':'rgba(0,151,167,0.03)'}}>
                          <td style={{padding:'8px 12px',fontWeight:700,color:T.navy}}>{tl.name}</td>
                          <td style={{padding:'8px 12px',fontWeight:800,color:T.navy}}>{tl.total.toLocaleString()}</td>
                          <td style={{padding:'8px 12px',fontWeight:800,color:T.green}}>{tl.closed.toLocaleString()}</td>
                          <td style={{padding:'8px 12px',fontWeight:800,color:T.amber}}>{tl.open.toLocaleString()}</td>
                          <td style={{padding:'8px 12px',fontWeight:800,color:T.red}}>{tl.beyondTAT||0}</td>
                          <td style={{padding:'8px 12px'}}>
                            <div style={{display:'flex',alignItems:'center',gap:8}}>
                              <div style={{flex:1,height:6,background:'rgba(0,60,100,0.08)',borderRadius:3}}>
                                <div style={{width:`${tl.resRate}%`,height:'100%',background:tl.resRate>90?T.green:tl.resRate>70?T.amber:T.red,borderRadius:3}}/>
                              </div>
                              <span style={{fontSize:10,fontWeight:900,color:tl.resRate>90?T.green:tl.resRate>70?T.amber:T.red,minWidth:36}}>{tl.resRate}%</span>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </GC>

              {/* Top owners + Owner chart */}
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
                <GC style={{padding:18}}>
                  <SH title="Top Case Owners by Closed Tickets"/>
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart data={charts.ownerData||[]} layout="vertical" margin={{top:0,right:55,bottom:0,left:4}}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,60,100,0.07)" horizontal={false}/>
                      <XAxis type="number" tick={{fill:T.textM,fontSize:8}} axisLine={false} tickLine={false}/>
                      <YAxis type="category" dataKey="name" tick={{fill:T.navy,fontSize:9,fontWeight:600}} axisLine={false} tickLine={false} width={120}/>
                      <Tooltip content={<CTip/>}/>
                      <Bar dataKey="closed" name="Closed" radius={[0,4,4,0]}>
                        {(charts.ownerData||[]).map((_,i)=><Cell key={i} fill={CC[i%CC.length]}/>)}
                        <LabelList dataKey="closed" position="right" style={{fill:T.navy,fontSize:8,fontWeight:800}}/>
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </GC>
                <GC style={{padding:18}}>
                  <SH title="Resolution & Response Time Summary"/>
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:16}}>
                    {[
                      {l:'First Response < 24h', v:kpi.respW24, color:T.green, icon:'⚡'},
                      {l:'First Response > 24h', v:kpi.respAbove24||filtered.filter(r=>r.respCat==='Above 24 Hrs').length, color:T.red, icon:'🕐'},
                      {l:'Resolution < 24h',     v:kpi.resW24,  color:T.teal,  icon:'✅'},
                      {l:'Resolution > 24h',     v:kpi.resA24||filtered.filter(r=>r.resCat==='Above 24 Hrs').length, color:T.amber, icon:'⏳'},
                    ].map((d,i)=>(
                      <div key={i} style={{background:`${d.color}0d`,border:`1px solid ${d.color}22`,borderRadius:10,padding:'12px 14px'}}>
                        <div style={{fontSize:18}}>{d.icon}</div>
                        <div style={{fontSize:20,fontWeight:900,color:d.color}}>{d.v?.toLocaleString()}</div>
                        <div style={{fontSize:9,color:T.textM,fontWeight:700,textTransform:'uppercase'}}>{d.l}</div>
                      </div>
                    ))}
                  </div>
                  <div style={{background:'rgba(0,151,167,0.07)',borderRadius:10,padding:'14px 16px',textAlign:'center'}}>
                    <p style={{fontSize:10,color:T.textM,fontWeight:700,margin:'0 0 4px',textTransform:'uppercase'}}>Average Resolution Time</p>
                    <p style={{fontSize:32,fontWeight:900,color:T.tealD,margin:0}}>2.9 <span style={{fontSize:14,color:T.gray}}>days</span></p>
                  </div>
                </GC>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════
              TAB: RISK & ESCALATION
          ══════════════════════════════════════════ */}
          {tab==='risk' && (
            <div style={{display:'flex',flexDirection:'column',gap:14}}>
              {/* Risk KPIs */}
              <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:12}}>
                <KpiCard icon="⚠️" label="Beyond TAT"         value={kpi.beyondTAT}  color={T.red}    sub="Past SLA deadline"                    pct={kpi.total>0?+(kpi.beyondTAT/kpi.total*100).toFixed(1):0}/>
                <KpiCard icon="📈" label="In Escalation"      value={kpi.escalated}  color={T.orange} sub="Active escalation levels"              pct={kpi.total>0?+(kpi.escalated/kpi.total*100).toFixed(1):0}/>
                <KpiCard icon="⚖️" label="Active Legal"       value={kpi.legal}      color={T.red}    sub="Legal flag + open status"              pct={null}/>
                <KpiCard icon="👑" label="HNI Escalations"    value={filtered.filter(r=>r.hni&&(r.tatStatus==='Beyond TAT'||r.tatStatus?.includes('Escalation'))).length} color="#b45309" sub="HNI tickets past SLA" pct={null}/>
              </div>

              {/* TAT chart + escalation breakdown */}
              <div style={{display:'grid',gridTemplateColumns:'2fr 1fr',gap:12}}>
                <GC style={{padding:18}}>
                  <SH title="TAT & Escalation Level Distribution"/>
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart data={charts.tatData||[]} margin={{top:14,right:20,bottom:8,left:0}}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,60,100,0.07)" vertical={false}/>
                      <XAxis dataKey="name" tick={{fill:T.textM,fontSize:10,fontWeight:700}} axisLine={false} tickLine={false}/>
                      <YAxis tick={{fill:T.textM,fontSize:9}} axisLine={false} tickLine={false} width={36}/>
                      <Tooltip content={<CTip/>}/>
                      <Bar dataKey="count" name="Tickets" radius={[4,4,0,0]}>
                        {(charts.tatData||[]).map((_,i)=><Cell key={i} fill={i===0?T.red:i===1?T.orange:i===2?T.amber:CC[i+2]}/>)}
                        <LabelList dataKey="count" position="top" style={{fill:T.navy,fontSize:9,fontWeight:800}}/>
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </GC>
                <GC style={{padding:18}}>
                  <SH title="Risk Flags"/>
                  <div style={{display:'flex',flexDirection:'column',gap:10,marginTop:8}}>
                    {[
                      {l:'Beyond TAT',              v:kpi.beyondTAT,  c:T.red},
                      {l:'In Escalation',           v:kpi.escalated,  c:T.orange},
                      {l:'Re-Opened',               v:kpi.reopened,   c:T.amber},
                      {l:'Pending Clarification',   v:kpi.pendClar,   c:'#7c3aed'},
                      {l:'HNI Open',                v:filtered.filter(r=>r.hni&&['New','In Progress','Pending for Clarification','Re-Open'].includes(r.status)).length, c:'#b45309'},
                      {l:'Active Legal Cases',      v:kpi.legal,      c:T.red},
                      {l:'High Reassigns (3+)',     v:kpi.highReas,   c:T.navy},
                    ].map((d,i)=>(
                      <div key={i} style={{display:'flex',alignItems:'center',gap:8,padding:'6px 10px',background:`${d.c}09`,border:`1px solid ${d.c}22`,borderRadius:8}}>
                        <div style={{width:10,height:10,borderRadius:2,background:d.c,flexShrink:0}}/>
                        <span style={{flex:1,fontSize:11,fontWeight:600,color:T.textM}}>{d.l}</span>
                        <span style={{fontSize:14,fontWeight:900,color:d.c}}>{d.v?.toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                </GC>
              </div>

              {/* HNI tickets list */}
              <GC style={{padding:18}}>
                <SH title="HNI Open Tickets — Priority View" sub="High-value customers with open cases"/>
                <div style={{overflowY:'auto',maxHeight:300}}>
                  <table style={{width:'100%',borderCollapse:'collapse',fontSize:11}}>
                    <thead><tr style={{background:'rgba(180,83,9,0.07)'}}>
                      {['Case #','Account','Area','Sub Area','Status','TAT Status','Age (days)','Owner'].map(h=>(
                        <th key={h} style={{padding:'6px 10px',textAlign:'left',fontSize:9,fontWeight:800,color:'#b45309',textTransform:'uppercase',borderBottom:'1px solid rgba(180,83,9,0.2)'}}>{h}</th>
                      ))}
                    </tr></thead>
                    <tbody>
                      {filtered.filter(r=>r.hni&&['New','In Progress','Pending for Clarification','Re-Open'].includes(r.status)).slice(0,50).map((r,i)=>(
                        <tr key={i} style={{borderBottom:'1px solid rgba(0,60,100,0.05)',background:i%2===0?'transparent':'rgba(0,151,167,0.02)'}}>
                          <td style={{padding:'5px 10px',color:T.tealD,fontWeight:700}}>{r.caseNum}</td>
                          <td style={{padding:'5px 10px',color:T.navy,fontWeight:600,maxWidth:150,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{r.account}</td>
                          <td style={{padding:'5px 10px',color:T.textM}}>{r.area}</td>
                          <td style={{padding:'5px 10px',color:T.textM}}>{r.subArea}</td>
                          <td style={{padding:'5px 10px'}}><span style={{fontSize:9,fontWeight:800,color:T.amber,background:'rgba(245,124,0,0.1)',borderRadius:4,padding:'2px 6px'}}>{r.status}</span></td>
                          <td style={{padding:'5px 10px'}}><span style={{fontSize:9,fontWeight:700,color:r.tatStatus?.includes('Beyond')||r.tatStatus?.includes('Esc')?T.red:T.green}}>{r.tatStatus||'—'}</span></td>
                          <td style={{padding:'5px 10px',fontWeight:800,color:r.age>30?T.red:r.age>7?T.amber:T.green}}>{r.age}</td>
                          <td style={{padding:'5px 10px',color:T.textM,fontSize:10}}>{r.owner}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </GC>
            </div>
          )}

          {/* ══════════════════════════════════════════
              TAB: TICKET EXPLORER
          ══════════════════════════════════════════ */}
          {tab==='tickets' && (
            <GC style={{padding:18}}>
              <SH title="Ticket Explorer" sub={`Showing ${Math.min(filtered.length,500).toLocaleString()} of ${filtered.length.toLocaleString()} filtered records`}/>
              <div style={{overflowY:'auto',maxHeight:'70vh'}}>
                <table style={{width:'100%',borderCollapse:'collapse',fontSize:11}}>
                  <thead><tr style={{background:'rgba(0,105,120,0.07)',position:'sticky',top:0,zIndex:1}}>
                    {['Case #','Account','Area','Sub Area','Status','TAT Status','Origin','Owner','TL','Age','HNI'].map(h=>(
                      <th key={h} style={{padding:'7px 10px',textAlign:'left',fontSize:9,fontWeight:800,color:T.tealD,textTransform:'uppercase',borderBottom:`2px solid ${T.tealD}22`,background:'rgba(255,255,255,0.95)'}}>{h}</th>
                    ))}
                  </tr></thead>
                  <tbody>
                    {filtered.slice(0,500).map((r,i)=>(
                      <tr key={i} style={{borderBottom:'1px solid rgba(0,60,100,0.05)',background:i%2===0?'transparent':'rgba(0,151,167,0.02)'}}>
                        <td style={{padding:'5px 10px',color:T.tealD,fontWeight:700}}>{r.caseNum}</td>
                        <td style={{padding:'5px 10px',color:T.navy,maxWidth:130,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{r.account}</td>
                        <td style={{padding:'5px 10px',color:T.textM,fontSize:10}}>{r.area}</td>
                        <td style={{padding:'5px 10px',color:T.textM,fontSize:10,maxWidth:120,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{r.subArea}</td>
                        <td style={{padding:'5px 10px'}}>
                          <span style={{fontSize:9,fontWeight:800,borderRadius:4,padding:'2px 6px',
                            color:['Closed','Resolved','Close'].includes(r.status)?T.green:r.status==='Re-Open'?T.red:T.amber,
                            background:['Closed','Resolved','Close'].includes(r.status)?'rgba(46,125,50,0.1)':r.status==='Re-Open'?'rgba(211,47,47,0.1)':'rgba(245,124,0,0.1)'}}>
                            {r.status}
                          </span>
                        </td>
                        <td style={{padding:'5px 10px',fontSize:9,color:r.tatStatus?.includes('Beyond')||r.tatStatus?.includes('Esc')?T.red:T.textM,fontWeight:r.tatStatus?.includes('Beyond')?800:400}}>{r.tatStatus||'—'}</td>
                        <td style={{padding:'5px 10px',color:T.textM,fontSize:10}}>{r.origin}</td>
                        <td style={{padding:'5px 10px',color:T.textM,fontSize:10}}>{r.owner}</td>
                        <td style={{padding:'5px 10px',color:T.textM,fontSize:10}}>{r.tl}</td>
                        <td style={{padding:'5px 10px',fontWeight:800,color:r.age>30?T.red:r.age>7?T.amber:T.green}}>{r.age}d</td>
                        <td style={{padding:'5px 10px',textAlign:'center'}}>{r.hni?<span style={{color:'#b45309',fontSize:12}}>👑</span>:'—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {filtered.length>500&&<p style={{fontSize:10,color:T.textM,textAlign:'center',marginTop:8}}>Showing first 500 of {filtered.length.toLocaleString()} — use filters above to narrow down</p>}
            </GC>
          )}

        </main>
      </div>
    </div>
  );
}
