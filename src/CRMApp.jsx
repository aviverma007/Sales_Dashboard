import React, { useState, useEffect, useMemo } from 'react';
import * as XLSX from 'xlsx';
import {
  BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, LabelList
} from 'recharts';

const T = {
  glass:'rgba(255,255,255,0.96)', glassH:'rgba(255,255,255,1.0)',
  border:'rgba(255,255,255,0.85)', borderB:'rgba(255,255,255,0.2)',
  teal:'#0097a7', tealL:'#00bcd4', tealD:'#006978',
  red:'#d32f2f', navy:'#0d2137', navyM:'#1a3a5c',
  amber:'#f57c00', green:'#2e7d32', greenL:'#43a047',
  gray:'#546e7a', text:'#0a1628', textM:'#1a2f45', textL:'#2d4a66',
  orange:'#e65100', purple:'#6a1b9a',
};
const CC = ['#0097a7','#1565c0','#2e7d32','#f57c00','#d32f2f','#6a1b9a','#00838f','#37474f','#e65100','#00695c'];

const GC = ({ children, style={} }) => {
  const [h,sH] = useState(false);
  return (
    <div onMouseEnter={()=>sH(true)} onMouseLeave={()=>sH(false)}
      style={{ background:h?T.glassH:T.glass, border:`1px solid ${T.border}`, borderRadius:14,
        boxShadow:'0 4px 24px rgba(0,80,120,0.12)', transition:'all 0.2s', position:'relative', overflow:'hidden', ...style }}>
      <div style={{position:'absolute',top:0,left:0,right:0,height:1,background:'rgba(255,255,255,0.95)'}}/>
      {children}
    </div>
  );
};

const SH = ({ title, sub }) => (
  <div style={{marginBottom:10}}>
    <p style={{fontSize:11,fontWeight:800,color:T.tealD,letterSpacing:0.4,margin:0,textTransform:'uppercase'}}>{title}</p>
    {sub && <p style={{fontSize:10,color:T.textM,margin:'2px 0 0',fontWeight:600}}>{sub}</p>}
  </div>
);

const CTip = ({ active, payload, label }) => {
  if (!active||!payload?.length) return null;
  return (
    <div style={{background:'rgba(255,255,255,0.97)',border:'1px solid rgba(0,151,167,0.3)',borderRadius:10,padding:'8px 12px',
      boxShadow:'0 8px 32px rgba(0,80,120,0.18)',fontFamily:'Inter,sans-serif',fontSize:11}}>
      <p style={{color:T.tealD,fontWeight:700,marginBottom:4}}>{label}</p>
      {payload.map((p,i)=><p key={i} style={{color:p.color||T.text,margin:'2px 0'}}><span style={{color:T.textL}}>{p.name}: </span>{p.value?.toLocaleString()}</p>)}
    </div>
  );
};

const StatCard = ({ label, value, color=T.teal, icon, sub }) => (
  <GC style={{padding:'12px 16px',flex:'1 1 120px',minWidth:110}}>
    <div style={{fontSize:20,marginBottom:2}}>{icon}</div>
    <div style={{fontSize:22,fontWeight:900,color,letterSpacing:-0.5}}>{typeof value==='number'?value.toLocaleString():value}</div>
    <div style={{fontSize:10,fontWeight:700,color:T.gray,textTransform:'uppercase',letterSpacing:0.4}}>{label}</div>
    {sub && <div style={{fontSize:9,color:T.textL,marginTop:2}}>{sub}</div>}
  </GC>
);

const FSelect = ({ label, value, onChange, options }) => (
  <div style={{marginBottom:10}}>
    <div style={{fontSize:9,fontWeight:800,color:'#fff',textTransform:'uppercase',letterSpacing:0.5,marginBottom:4,opacity:0.9}}>{label}</div>
    <select value={value} onChange={e=>onChange(e.target.value)}
      style={{width:'100%',fontSize:11,fontWeight:600,color:T.text,background:'rgba(255,255,255,0.95)',
        border:'1px solid rgba(255,255,255,0.5)',borderRadius:8,padding:'5px 8px',cursor:'pointer',fontFamily:'Inter,sans-serif'}}>
      <option value="All">All</option>
      {options.map(o=><option key={o} value={o}>{o}</option>)}
    </select>
  </div>
);

const Loading = () => (
  <div style={{minHeight:'100vh',backgroundImage:'url(/bg.jpg)',backgroundSize:'cover',backgroundPosition:'center',
    backgroundAttachment:'fixed',display:'flex',alignItems:'center',justifyContent:'center'}}>
    <div style={{background:'rgba(255,255,255,0.9)',backdropFilter:'blur(20px)',borderRadius:20,padding:'32px 48px',textAlign:'center'}}>
      <img src="/swd-logo.png" alt="" style={{width:40,height:40,objectFit:'contain',marginBottom:12}}/>
      <div style={{color:T.navy,fontWeight:800,fontSize:16}}>Loading CRM Dashboard…</div>
      <div style={{color:T.gray,fontSize:12,marginTop:6}}>Processing case data</div>
    </div>
  </div>
);

export default function CRMApp() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('overall');

  // Open tab filters
  const [fOwner, setFOwner] = useState('All');
  const [fArea, setFArea] = useState('All');
  const [fSubArea, setFSubArea] = useState('All');
  const [fRisk, setFRisk] = useState('All');
  const [fTAT, setFTAT] = useState('All');
  const [fResp, setFResp] = useState('All');
  const [fApply, setFApply] = useState('All');
  const [fOrigin, setFOrigin] = useState('All');

  const logout = () => { sessionStorage.removeItem('crm_auth'); window.location.reload(); };

  useEffect(() => {
    fetch('/data/crm_case_management.xlsx')
      .then(r=>r.arrayBuffer())
      .then(buf=>{
        const wb = XLSX.read(buf,{type:'array'});
        const ws = wb.Sheets[wb.SheetNames[0]];
        const raw = XLSX.utils.sheet_to_json(ws,{header:1});
        const hIdx = raw.findIndex(r=>r.includes('Case Number'));
        const headers = raw[hIdx];
        const rows = raw.slice(hIdx+1).filter(r=>r.some(v=>v!=null&&v!==''));
        const records = rows.map(r=>{
          const obj={};
          headers.forEach((h,i)=>{ if(h) obj[String(h).trim()]=r[i]; });
          return obj;
        });
        setData(processData(records));
        setLoading(false);
      })
      .catch(()=>setLoading(false));
  }, []);

  // ALL hooks before early returns
  const openCases = useMemo(()=>{
    if (!data) return [];
    return data.allCases.filter(c=>c.isOpen);
  }, [data]);

  const filteredOpen = useMemo(()=>{
    return openCases.filter(c=>
      (fOwner==='All'||c.caseOwner===fOwner) &&
      (fArea==='All'||c.area===fArea) &&
      (fSubArea==='All'||c.subArea===fSubArea) &&
      (fRisk==='All'||c.riskLevel===fRisk) &&
      (fTAT==='All'||(fTAT==='Beyond TAT'?c.tatStatus==='Beyond TAT':c.tatStatus!=='Beyond TAT'&&c.tatStatus!=='')) &&
      (fResp==='All'||c.respTime===fResp) &&
      (fApply==='All'||c.applicability===fApply) &&
      (fOrigin==='All'||c.origin===fOrigin)
    );
  }, [openCases, fOwner,fArea,fSubArea,fRisk,fTAT,fResp,fApply,fOrigin]);

  const filteredAll = useMemo(()=>{
    if (!data) return [];
    return data.allCases.filter(c=>
      (fOwner==='All'||c.caseOwner===fOwner) &&
      (fArea==='All'||c.area===fArea)
    );
  }, [data, fOwner, fArea]);

  if (loading) return <Loading />;
  if (!data) return <div style={{color:'#fff',padding:40}}>Failed to load data.</div>;

  const { total, openCount, closedCount, statusCounts, originCounts, caseTypeCounts,
    byOwner, areaSub, ageing, respTime, recentCases, tatStats, owners, areas,
    subAreas, riskCounts, tatCounts, respCounts, applyCounts, originList,
    openByOwner, openByArea, openAreaSub, openAgeing, openOrigin } = data;

  const closedTotal = (statusCounts['Closed']||0)+(statusCounts['Resolved']||0)+(statusCounts['Close']||0);
  const originData = Object.entries(originCounts).map(([k,v],i)=>({name:k,value:v,color:CC[i%CC.length]}));
  const ownerData = Object.entries(byOwner).slice(0,10).map(([k,v])=>({
    name:k.split(' ')[0]+(k.split(' ')[1]?' '+k.split(' ')[1][0]+'.':''), fullName:k, value:v }));
  const agingData = [
    {name:'Under 24H',value:ageing.under24h,color:'#2e7d32'},
    {name:'1–5 Days',value:ageing['1to5'],color:'#0097a7'},
    {name:'5–15 Days',value:ageing['5to15'],color:'#f57c00'},
    {name:'15–30 Days',value:ageing['15to30'],color:'#e65100'},
    {name:'> 30 Days',value:ageing.over30,color:'#d32f2f'},
  ];
  const statusPie = [
    {name:'In Progress',value:statusCounts['In Progress']||0,color:'#0097a7'},
    {name:'New',value:statusCounts['New']||0,color:'#1565c0'},
    {name:'Pending for Clarification',value:statusCounts['Pending for Clarification']||0,color:'#f57c00'},
    {name:'Re-Open',value:statusCounts['Re-Open']||0,color:'#d32f2f'},
  ];

  // Open tab computed from filteredOpen
  const fo = filteredOpen;
  const foAtRisk = fo.filter(c=>c.riskLevel==='At Risk').length;
  const foOverdue = fo.filter(c=>c.riskLevel==='Overdue').length;
  const foWithinTime = fo.filter(c=>c.riskLevel==='Within Time').length;
  const foBeyondTAT = fo.filter(c=>c.tatStatus==='Beyond TAT').length;
  const foWithinTAT = fo.filter(c=>c.tatStatus&&c.tatStatus!=='Beyond TAT').length;
  const foAbove24 = fo.filter(c=>c.respTime==='Above 24 Hrs').length;
  const foWithin24 = fo.filter(c=>c.respTime==='Within 24 Hrs').length;
  const foInclusion = fo.filter(c=>c.applicability==='Inclusion').length;
  const foExclusion = fo.filter(c=>c.applicability==='Exclusion').length;

  const foOwnerData = (() => {
    const m={};
    fo.filter(c=>c.caseOwner!=='CRM FrontEnd Executives').forEach(c=>{ m[c.caseOwner]=(m[c.caseOwner]||0)+1; });
    return Object.entries(m).sort((a,b)=>b[1]-a[1]).slice(0,10)
      .map(([k,v])=>({ name:k.split(' ')[0]+(k.split(' ')[1]?' '+k.split(' ')[1][0]+'.':''), fullName:k, value:v }));
  })();

  const foOriginData = (() => {
    const m={};
    fo.forEach(c=>{ if(c.origin) m[c.origin]=(m[c.origin]||0)+1; });
    return Object.entries(m).sort((a,b)=>b[1]-a[1]).map(([k,v],i)=>({name:k,value:v,color:CC[i%CC.length]}));
  })();

  const foAreaSub = (() => {
    const m={};
    fo.forEach(c=>{ const key=`${c.area}|||${c.subArea}`; m[key]=(m[key]||0)+1; });
    return Object.entries(m).sort((a,b)=>b[1]-a[1]).slice(0,12)
      .map(([k,v])=>{ const [area,subArea]=k.split('|||'); return {area,subArea,count:v}; });
  })();

  const foAgeing = (() => {
    const ages = fo.map(c=>c.age).filter(v=>!isNaN(v));
    return [
      {name:'Under 24H',value:ages.filter(v=>v<1).length,color:'#2e7d32'},
      {name:'1–5 Days',value:ages.filter(v=>v>=1&&v<=5).length,color:'#0097a7'},
      {name:'5–15 Days',value:ages.filter(v=>v>5&&v<=15).length,color:'#f57c00'},
      {name:'15–30 Days',value:ages.filter(v=>v>15&&v<=30).length,color:'#e65100'},
      {name:'> 30 Days',value:ages.filter(v=>v>30).length,color:'#d32f2f'},
    ];
  })();

  const TABS = [{k:'overall',l:'📊 Overall'},{k:'open',l:'🔓 Open Tickets'},{k:'closed',l:'✅ Closed Tickets'}];

  const selStyle = { fontSize:10,fontWeight:600,color:T.textM,background:'rgba(255,255,255,0.9)',
    border:'1px solid rgba(0,100,140,0.2)',borderRadius:7,padding:'4px 8px',cursor:'pointer',fontFamily:'Inter,sans-serif' };

  return (
    <div style={{minHeight:'100vh',backgroundImage:'url(/bg.jpg)',backgroundSize:'cover',backgroundPosition:'center',
      backgroundAttachment:'fixed',fontFamily:'Inter,sans-serif',color:T.text}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
        ::-webkit-scrollbar{width:4px;height:4px}
        ::-webkit-scrollbar-thumb{background:rgba(0,151,167,0.4);border-radius:2px}
        .crm-tab:hover{background:rgba(255,255,255,0.5)!important}
        .tr:hover td{background:rgba(0,151,167,0.06)!important}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.5}}
      `}</style>
      <div style={{position:'fixed',inset:0,background:'rgba(0,20,40,0.25)',pointerEvents:'none',zIndex:0}}/>

      {/* HEADER */}
      <header style={{position:'sticky',top:0,zIndex:200,background:'rgba(255,255,255,0.95)',
        WebkitBackdropFilter:'blur(24px)',backdropFilter:'blur(24px)',
        borderBottom:'1px solid rgba(255,255,255,0.9)',boxShadow:'0 2px 20px rgba(0,60,100,0.12)'}}>
        <div style={{maxWidth:1600,margin:'0 auto',padding:'0 20px',height:56,display:'flex',alignItems:'center',gap:16,justifyContent:'space-between'}}>
          <div style={{display:'flex',alignItems:'center',gap:10}}>
            <div style={{width:38,height:38,borderRadius:9,background:'#0d1f3c',display:'flex',alignItems:'center',justifyContent:'center',overflow:'hidden'}}>
              <img src="/swd-logo.png" alt="SWD" style={{width:26,height:26,objectFit:'contain'}}/>
            </div>
            <div>
              <div style={{fontWeight:800,fontSize:14,color:T.navy}}>CRM Dashboard</div>
              <div style={{fontSize:10,color:T.gray,fontWeight:500}}>Smartworld Group · Case Management</div>
            </div>
          </div>
          <div style={{display:'flex',gap:4,background:'rgba(0,100,140,0.08)',borderRadius:10,padding:4}}>
            {TABS.map(t=>(
              <button key={t.k} className="crm-tab" onClick={()=>setTab(t.k)}
                style={{background:tab===t.k?'rgba(255,255,255,0.95)':'transparent',border:'none',borderRadius:7,
                  padding:'6px 16px',fontSize:11,fontWeight:tab===t.k?800:600,
                  color:tab===t.k?T.tealD:T.text,cursor:'pointer',fontFamily:'Inter,sans-serif',
                  boxShadow:tab===t.k?'0 2px 8px rgba(0,80,120,0.12)':'none'}}>
                {t.l}
              </button>
            ))}
          </div>
          <div style={{display:'flex',alignItems:'center',gap:10}}>
            <div style={{display:'flex',alignItems:'center',gap:5,background:'rgba(46,125,50,0.1)',
              border:'1px solid rgba(46,125,50,0.3)',borderRadius:16,padding:'3px 10px'}}>
              <div style={{width:6,height:6,borderRadius:'50%',background:T.greenL,animation:'pulse 2s ease infinite'}}/>
              <span style={{fontSize:10,fontWeight:700,color:T.green}}>Live</span>
            </div>
            <button onClick={logout}
              style={{padding:'6px 14px',borderRadius:10,border:'1px solid rgba(200,40,40,0.25)',
                background:'rgba(211,47,47,0.07)',cursor:'pointer',fontSize:11,fontWeight:700,color:'#d32f2f',fontFamily:'Inter,sans-serif'}}
              onMouseOver={e=>e.currentTarget.style.background='rgba(211,47,47,0.14)'}
              onMouseOut={e=>e.currentTarget.style.background='rgba(211,47,47,0.07)'}>
              Sign Out
            </button>
          </div>
        </div>
      </header>

      <main style={{position:'relative',zIndex:1,maxWidth:1600,margin:'0 auto',padding:'16px 20px 32px'}}>

        {/* ── OVERALL TAB ── */}
        {tab==='overall' && (
          <div style={{display:'flex',flexDirection:'column',gap:14}}>
            <div style={{display:'flex',gap:12,flexWrap:'wrap'}}>
              <StatCard label="Total Tickets" value={total} icon="🎫" color={T.navy}/>
              <StatCard label="Open Tickets" value={openCount} icon="🔓" color={T.amber}/>
              <StatCard label="Closed Tickets" value={closedCount} icon="✅" color={T.green}/>
              <StatCard label="Beyond TAT" value={tatStats.beyond} icon="⚠️" color={T.red}/>
              <StatCard label="Within TAT" value={tatStats.within} icon="⏱️" color={T.teal}/>
              <StatCard label="Within 24 Hrs" value={respTime['Within 24 Hrs']||0} icon="⚡" color={T.teal}/>
              <StatCard label="Above 24 Hrs" value={respTime['Above 24 Hrs']||0} icon="🕐" color={T.orange}/>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'240px 1fr 1fr',gap:12}}>
              <GC style={{padding:'14px 16px'}}>
                <SH title="Case Type"/>
                <div style={{display:'flex',gap:8,marginBottom:6}}>
                  {Object.entries(caseTypeCounts).map(([k],i)=>(
                    <span key={k} style={{fontSize:9,fontWeight:700,color:CC[i],display:'flex',alignItems:'center',gap:3}}>
                      <span style={{width:7,height:7,borderRadius:'50%',background:CC[i],display:'inline-block'}}/>{k}
                    </span>
                  ))}
                </div>
                <ResponsiveContainer width="100%" height={130}>
                  <PieChart>
                    <Pie data={Object.entries(caseTypeCounts).map(([k,v],i)=>({name:k,value:v}))}
                      cx="50%" cy="50%" outerRadius={54} dataKey="value">
                      {Object.entries(caseTypeCounts).map(([k],i)=><Cell key={k} fill={CC[i]}/>)}
                    </Pie>
                    <Tooltip content={<CTip/>}/>
                  </PieChart>
                </ResponsiveContainer>
              </GC>
              <GC style={{padding:'14px 16px'}}>
                <SH title="Ticket Status"/>
                <div style={{display:'flex',flexDirection:'column',gap:6}}>
                  {[
                    {label:'Closed + Resolved',value:closedTotal,color:T.green,bg:'rgba(46,125,50,0.12)'},
                    {label:'In Progress',value:statusCounts['In Progress']||0,color:T.teal,bg:'rgba(0,151,167,0.1)'},
                    {label:'New',value:statusCounts['New']||0,color:T.tealD,bg:'rgba(0,105,120,0.1)'},
                    {label:'Pending for Clarification',value:statusCounts['Pending for Clarification']||0,color:T.amber,bg:'rgba(245,124,0,0.1)'},
                    {label:'Re-Open',value:statusCounts['Re-Open']||0,color:T.red,bg:'rgba(211,47,47,0.1)'},
                  ].map(({label,value,color,bg})=>(
                    <div key={label} style={{display:'flex',alignItems:'center',gap:8}}>
                      <div style={{flex:1,fontSize:11,fontWeight:600,color:T.textM}}>{label}</div>
                      <div style={{background:bg,border:`1px solid ${color}33`,borderRadius:6,padding:'2px 10px',minWidth:70,textAlign:'right'}}>
                        <span style={{fontSize:13,fontWeight:800,color}}>{value.toLocaleString()}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </GC>
              <GC style={{padding:'14px 16px'}}>
                <SH title="Case Origin"/>
                <div style={{display:'flex',flexDirection:'column',gap:5}}>
                  {originData.slice(0,6).map(({name,value,color})=>{
                    const pct = (value/total*100).toFixed(2);
                    return (
                      <div key={name} style={{display:'flex',alignItems:'center',gap:6}}>
                        <div style={{width:8,height:8,borderRadius:2,background:color,flexShrink:0}}/>
                        <div style={{flex:1,fontSize:10,fontWeight:600,color:T.textM,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{name}</div>
                        <div style={{width:80,height:6,background:'rgba(0,100,140,0.08)',borderRadius:3}}>
                          <div style={{width:`${Math.min(Number(pct)*1.5,100)}%`,height:'100%',background:color,borderRadius:3}}/>
                        </div>
                        <div style={{fontSize:10,fontWeight:700,color,width:40,textAlign:'right'}}>{pct}%</div>
                      </div>
                    );
                  })}
                </div>
              </GC>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
              <GC style={{padding:'14px 16px'}}>
                <SH title="No. of Cases by Case Owner" sub="Excluding CRM FrontEnd Executives"/>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={ownerData} layout="vertical" margin={{left:0,right:40}}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,100,140,0.08)" horizontal={false}/>
                    <XAxis type="number" tick={{fontSize:9,fill:T.gray}}/>
                    <YAxis type="category" dataKey="name" width={90} tick={{fontSize:9,fill:T.textM,fontWeight:600}}/>
                    <Tooltip content={<CTip/>}/>
                    <Bar dataKey="value" name="Cases" radius={[0,4,4,0]}>
                      {ownerData.map((_,i)=><Cell key={i} fill={CC[i%CC.length]}/>)}
                      <LabelList dataKey="value" position="right" style={{fontSize:9,fill:T.textM,fontWeight:700}}/>
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </GC>
              <GC style={{padding:'14px 16px'}}>
                <SH title="Cases by Area & Sub Area"/>
                <div style={{overflowY:'auto',maxHeight:230}}>
                  <table style={{width:'100%',borderCollapse:'collapse',fontSize:10}}>
                    <thead>
                      <tr style={{background:'rgba(0,151,167,0.08)'}}>
                        {['Area','Sub Area','Cases'].map(h=>(
                          <th key={h} style={{padding:'5px 8px',textAlign:h==='Cases'?'right':'left',color:T.tealD,fontWeight:700,borderBottom:'1px solid rgba(0,151,167,0.15)'}}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {areaSub.map((r,i)=>(
                        <tr key={i} className="tr" style={{background:i%2===0?'transparent':'rgba(0,100,140,0.02)'}}>
                          <td style={{padding:'4px 8px',color:T.textM,borderBottom:'1px solid rgba(0,100,140,0.05)'}}>{r.area}</td>
                          <td style={{padding:'4px 8px',color:T.textL,borderBottom:'1px solid rgba(0,100,140,0.05)'}}>{r.subArea}</td>
                          <td style={{padding:'4px 8px',textAlign:'right',fontWeight:700,color:T.teal,borderBottom:'1px solid rgba(0,100,140,0.05)'}}>{r.count.toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </GC>
            </div>
            <CasesTable cases={filteredAll.slice(0,200)} title="All Cases" showFilters
              owners={owners} areas={areas} fOwner={fOwner} setFOwner={setFOwner} fArea={fArea} setFArea={setFArea}/>
          </div>
        )}

        {/* ── OPEN TICKETS TAB ── */}
        {tab==='open' && (
          <div style={{display:'flex',gap:14}}>
            {/* LEFT SIDEBAR FILTERS */}
            <div style={{width:160,flexShrink:0,display:'flex',flexDirection:'column',gap:0}}>
              <div style={{background:'rgba(13,33,55,0.88)',borderRadius:14,padding:'14px 12px',
                border:'1px solid rgba(255,255,255,0.15)',boxShadow:'0 4px 24px rgba(0,0,0,0.2)'}}>
                <div style={{fontSize:10,fontWeight:900,color:'rgba(255,255,255,0.6)',letterSpacing:1,textTransform:'uppercase',marginBottom:12}}>Filters</div>
                <FSelect label="Category / Area" value={fArea} onChange={v=>{setFArea(v);setFSubArea('All');}}
                  options={areas}/>
                <FSelect label="Sub Area" value={fSubArea} onChange={setFSubArea}
                  options={[...new Set(openCases.filter(c=>fArea==='All'||c.area===fArea).map(c=>c.subArea).filter(Boolean))].sort()}/>
                <FSelect label="Case Type" value={fRisk} onChange={setFRisk} options={['At Risk','Overdue','Within Time']}/>
                <FSelect label="Risk Level" value={fRisk} onChange={setFRisk} options={['At Risk','Overdue','Within Time']}/>
                <FSelect label="Case Owner" value={fOwner} onChange={setFOwner} options={owners}/>
                <FSelect label="Case Origin" value={fOrigin} onChange={setFOrigin} options={originList}/>
                <FSelect label="TAT Status" value={fTAT} onChange={setFTAT} options={['Beyond TAT','Within TAT']}/>
                <FSelect label="Response Time" value={fResp} onChange={setFResp} options={['Above 24 Hrs','Within 24 Hrs']}/>
                <FSelect label="Inclusion/Exclusion" value={fApply} onChange={setFApply} options={['Inclusion','Exclusion']}/>
                <button onClick={()=>{setFOwner('All');setFArea('All');setFSubArea('All');setFRisk('All');setFTAT('All');setFResp('All');setFApply('All');setFOrigin('All');}}
                  style={{width:'100%',marginTop:6,padding:'6px',borderRadius:8,border:'1px solid rgba(255,255,255,0.3)',
                    background:'rgba(255,255,255,0.1)',color:'rgba(255,255,255,0.85)',fontSize:10,fontWeight:700,
                    cursor:'pointer',fontFamily:'Inter,sans-serif'}}>
                  Reset Filters
                </button>
              </div>
            </div>

            {/* MAIN CONTENT */}
            <div style={{flex:1,display:'flex',flexDirection:'column',gap:12}}>

              {/* KPI CARDS ROW 1: Risk + TAT */}
              <div style={{display:'flex',gap:10,flexWrap:'wrap'}}>
                <GC style={{padding:'12px 16px',flex:'1 1 100px',textAlign:'center',background:'rgba(255,255,255,0.96)'}}>
                  <div style={{fontSize:11,fontWeight:900,color:T.navy,marginBottom:2}}>{fo.length.toLocaleString()}</div>
                  <div style={{fontSize:9,fontWeight:700,color:T.gray,textTransform:'uppercase',letterSpacing:0.4}}>Open Tickets</div>
                </GC>
                <GC style={{padding:'12px 16px',flex:'1 1 100px',textAlign:'center',background:'rgba(255,92,0,0.08)',border:'1px solid rgba(255,92,0,0.25)'}}>
                  <div style={{fontSize:11,fontWeight:900,color:'#bf360c',marginBottom:2}}>{foOverdue.toLocaleString()}</div>
                  <div style={{fontSize:9,fontWeight:700,color:'#bf360c',textTransform:'uppercase',letterSpacing:0.4}}>Overdue</div>
                </GC>
                <GC style={{padding:'12px 16px',flex:'1 1 100px',textAlign:'center',background:'rgba(245,124,0,0.08)',border:'1px solid rgba(245,124,0,0.25)'}}>
                  <div style={{fontSize:11,fontWeight:900,color:T.amber,marginBottom:2}}>{foAtRisk.toLocaleString()}</div>
                  <div style={{fontSize:9,fontWeight:700,color:T.amber,textTransform:'uppercase',letterSpacing:0.4}}>At Risk</div>
                </GC>
                <GC style={{padding:'12px 16px',flex:'1 1 100px',textAlign:'center',background:'rgba(46,125,50,0.08)',border:'1px solid rgba(46,125,50,0.25)'}}>
                  <div style={{fontSize:11,fontWeight:900,color:T.green,marginBottom:2}}>{foWithinTime.toLocaleString()}</div>
                  <div style={{fontSize:9,fontWeight:700,color:T.green,textTransform:'uppercase',letterSpacing:0.4}}>Within Time</div>
                </GC>
                <GC style={{padding:'12px 16px',flex:'1 1 100px',textAlign:'center',background:'rgba(211,47,47,0.08)',border:'1px solid rgba(211,47,47,0.25)'}}>
                  <div style={{fontSize:11,fontWeight:900,color:T.red,marginBottom:2}}>{foBeyondTAT.toLocaleString()}</div>
                  <div style={{fontSize:9,fontWeight:700,color:T.red,textTransform:'uppercase',letterSpacing:0.4}}>Beyond TAT</div>
                </GC>
                <GC style={{padding:'12px 16px',flex:'1 1 100px',textAlign:'center',background:'rgba(0,151,167,0.08)',border:'1px solid rgba(0,151,167,0.25)'}}>
                  <div style={{fontSize:11,fontWeight:900,color:T.teal,marginBottom:2}}>{foWithinTAT.toLocaleString()}</div>
                  <div style={{fontSize:9,fontWeight:700,color:T.teal,textTransform:'uppercase',letterSpacing:0.4}}>Within TAT</div>
                </GC>
                <GC style={{padding:'12px 16px',flex:'1 1 100px',textAlign:'center',background:'rgba(230,81,0,0.08)',border:'1px solid rgba(230,81,0,0.25)'}}>
                  <div style={{fontSize:11,fontWeight:900,color:T.orange,marginBottom:2}}>{foAbove24.toLocaleString()}</div>
                  <div style={{fontSize:9,fontWeight:700,color:T.orange,textTransform:'uppercase',letterSpacing:0.4}}>Above 24 Hrs</div>
                </GC>
                <GC style={{padding:'12px 16px',flex:'1 1 100px',textAlign:'center',background:'rgba(0,105,120,0.08)',border:'1px solid rgba(0,105,120,0.25)'}}>
                  <div style={{fontSize:11,fontWeight:900,color:T.tealD,marginBottom:2}}>{foWithin24.toLocaleString()}</div>
                  <div style={{fontSize:9,fontWeight:700,color:T.tealD,textTransform:'uppercase',letterSpacing:0.4}}>Within 24 Hrs</div>
                </GC>
                <GC style={{padding:'12px 16px',flex:'1 1 100px',textAlign:'center',background:'rgba(21,101,192,0.08)',border:'1px solid rgba(21,101,192,0.25)'}}>
                  <div style={{fontSize:11,fontWeight:900,color:'#1565c0',marginBottom:2}}>{foInclusion.toLocaleString()}</div>
                  <div style={{fontSize:9,fontWeight:700,color:'#1565c0',textTransform:'uppercase',letterSpacing:0.4}}>Inclusion</div>
                </GC>
                <GC style={{padding:'12px 16px',flex:'1 1 100px',textAlign:'center',background:'rgba(106,27,154,0.08)',border:'1px solid rgba(106,27,154,0.25)'}}>
                  <div style={{fontSize:11,fontWeight:900,color:T.purple,marginBottom:2}}>{foExclusion.toLocaleString()}</div>
                  <div style={{fontSize:9,fontWeight:700,color:T.purple,textTransform:'uppercase',letterSpacing:0.4}}>Exclusion</div>
                </GC>
              </div>

              {/* CHARTS ROW 1: Owner + Status + Ageing */}
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 220px',gap:12}}>
                <GC style={{padding:'14px 16px'}}>
                  <SH title="No. of Cases by Case Owner"/>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={foOwnerData} layout="vertical" margin={{left:0,right:36}}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,100,140,0.08)" horizontal={false}/>
                      <XAxis type="number" tick={{fontSize:9,fill:T.gray}}/>
                      <YAxis type="category" dataKey="name" width={88} tick={{fontSize:9,fill:T.textM,fontWeight:600}}/>
                      <Tooltip content={<CTip/>}/>
                      <Bar dataKey="value" name="Cases" radius={[0,4,4,0]}>
                        {foOwnerData.map((_,i)=><Cell key={i} fill={CC[i%CC.length]}/>)}
                        <LabelList dataKey="value" position="right" style={{fontSize:9,fill:T.textM,fontWeight:700}}/>
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </GC>

                <GC style={{padding:'14px 16px'}}>
                  <SH title="Cases by Ageing"/>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={foAgeing} layout="vertical" margin={{left:0,right:50}}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,100,140,0.08)" horizontal={false}/>
                      <XAxis type="number" tick={{fontSize:9,fill:T.gray}}/>
                      <YAxis type="category" dataKey="name" width={72} tick={{fontSize:9,fill:T.textM,fontWeight:600}}/>
                      <Tooltip content={<CTip/>}/>
                      <Bar dataKey="value" name="Cases" radius={[0,4,4,0]}>
                        {foAgeing.map((d,i)=><Cell key={i} fill={d.color}/>)}
                        <LabelList dataKey="value" position="right" style={{fontSize:9,fill:T.textM,fontWeight:700}} formatter={v=>v.toLocaleString()}/>
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </GC>

                <GC style={{padding:'14px 16px'}}>
                  <SH title="Status"/>
                  <ResponsiveContainer width="100%" height={120}>
                    <PieChart>
                      <Pie data={statusPie.filter(d=>d.value>0)} cx="50%" cy="50%" innerRadius={30} outerRadius={52} dataKey="value">
                        {statusPie.map((d,i)=><Cell key={i} fill={d.color}/>)}
                      </Pie>
                      <Tooltip content={<CTip/>}/>
                    </PieChart>
                  </ResponsiveContainer>
                  <div style={{display:'flex',flexDirection:'column',gap:3}}>
                    {statusPie.filter(d=>d.value>0).map(d=>(
                      <div key={d.name} style={{display:'flex',alignItems:'center',gap:4}}>
                        <div style={{width:6,height:6,borderRadius:'50%',background:d.color,flexShrink:0}}/>
                        <span style={{fontSize:8,color:T.textM,flex:1,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{d.name}</span>
                        <span style={{fontSize:9,fontWeight:700,color:d.color}}>{d.value.toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                </GC>
              </div>

              {/* CHARTS ROW 2: Case Origin + Area Sub Area */}
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
                <GC style={{padding:'14px 16px'}}>
                  <SH title="Case Origin"/>
                  <ResponsiveContainer width="100%" height={160}>
                    <BarChart data={foOriginData} margin={{left:0,right:0,top:0,bottom:40}}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,100,140,0.08)" vertical={false}/>
                      <XAxis dataKey="name" tick={{fontSize:8,fill:T.textM}} angle={-30} textAnchor="end" interval={0}/>
                      <YAxis tick={{fontSize:9,fill:T.gray}}/>
                      <Tooltip content={<CTip/>}/>
                      <Bar dataKey="value" name="Cases" radius={[4,4,0,0]}>
                        {foOriginData.map((d,i)=><Cell key={i} fill={d.color}/>)}
                        <LabelList dataKey="value" position="top" style={{fontSize:8,fill:T.textM,fontWeight:700}} formatter={v=>v.toLocaleString()}/>
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </GC>

                <GC style={{padding:'14px 16px'}}>
                  <SH title="Cases by Area & Sub Area" sub={`${foAreaSub.length} combinations`}/>
                  <div style={{overflowY:'auto',maxHeight:200}}>
                    <table style={{width:'100%',borderCollapse:'collapse',fontSize:10}}>
                      <thead>
                        <tr style={{background:'rgba(0,151,167,0.08)'}}>
                          {['Area','Sub Area','Cases'].map(h=>(
                            <th key={h} style={{padding:'4px 8px',textAlign:h==='Cases'?'right':'left',color:T.tealD,fontWeight:700,borderBottom:'1px solid rgba(0,151,167,0.15)',position:'sticky',top:0,background:'rgba(255,255,255,0.95)'}}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {foAreaSub.map((r,i)=>(
                          <tr key={i} className="tr" style={{background:i%2===0?'transparent':'rgba(0,100,140,0.02)'}}>
                            <td style={{padding:'3px 8px',color:T.textM,borderBottom:'1px solid rgba(0,100,140,0.05)'}}>{r.area}</td>
                            <td style={{padding:'3px 8px',color:T.textL,borderBottom:'1px solid rgba(0,100,140,0.05)'}}>{r.subArea}</td>
                            <td style={{padding:'3px 8px',textAlign:'right',fontWeight:700,color:T.teal,borderBottom:'1px solid rgba(0,100,140,0.05)'}}>{r.count.toLocaleString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </GC>
              </div>

              {/* CASES TABLE */}
              <OpenCasesTable cases={fo.slice(0,200)} total={fo.length}/>
            </div>
          </div>
        )}

        {/* ── CLOSED TICKETS TAB ── */}
        {tab==='closed' && (
          <div style={{display:'flex',flexDirection:'column',gap:14}}>
            <div style={{display:'flex',gap:12,flexWrap:'wrap'}}>
              <StatCard label="Closed Tickets" value={closedCount} icon="✅" color={T.green}/>
              <StatCard label="Closed" value={statusCounts['Closed']||0} icon="🔒" color={T.green}/>
              <StatCard label="Resolved" value={statusCounts['Resolved']||0} icon="✔️" color={T.teal}/>
              <StatCard label="Within 24 Hrs" value={respTime['Within 24 Hrs']||0} icon="⚡" color={T.teal}/>
              <StatCard label="Above 24 Hrs" value={respTime['Above 24 Hrs']||0} icon="🕐" color={T.orange}/>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
              <GC style={{padding:'14px 16px'}}>
                <SH title="Closed Cases by Case Owner"/>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={ownerData} layout="vertical" margin={{left:0,right:40}}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,100,140,0.08)" horizontal={false}/>
                    <XAxis type="number" tick={{fontSize:9,fill:T.gray}}/>
                    <YAxis type="category" dataKey="name" width={90} tick={{fontSize:9,fill:T.textM,fontWeight:600}}/>
                    <Tooltip content={<CTip/>}/>
                    <Bar dataKey="value" name="Cases" radius={[0,4,4,0]}>
                      {ownerData.map((_,i)=><Cell key={i} fill={CC[i%CC.length]}/>)}
                      <LabelList dataKey="value" position="right" style={{fontSize:9,fill:T.textM,fontWeight:700}}/>
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </GC>
              <GC style={{padding:'14px 16px'}}>
                <SH title="Cases by Ageing"/>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={agingData} layout="vertical" margin={{left:0,right:60}}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,100,140,0.08)" horizontal={false}/>
                    <XAxis type="number" tick={{fontSize:9,fill:T.gray}}/>
                    <YAxis type="category" dataKey="name" width={72} tick={{fontSize:9,fill:T.textM,fontWeight:600}}/>
                    <Tooltip content={<CTip/>}/>
                    <Bar dataKey="value" name="Cases" radius={[0,4,4,0]}>
                      {agingData.map((d,i)=><Cell key={i} fill={d.color}/>)}
                      <LabelList dataKey="value" position="right" style={{fontSize:9,fill:T.textM,fontWeight:700}} formatter={v=>v.toLocaleString()}/>
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </GC>
            </div>
            <GC style={{padding:'14px 16px'}}>
              <SH title="Case Origin"/>
              <div style={{display:'flex',flexDirection:'column',gap:6}}>
                {originData.map(({name,value,color})=>{
                  const pct=(value/total*100).toFixed(2);
                  return (
                    <div key={name} style={{display:'flex',alignItems:'center',gap:8}}>
                      <div style={{width:8,height:8,borderRadius:2,background:color,flexShrink:0}}/>
                      <div style={{width:160,fontSize:11,fontWeight:600,color:T.textM}}>{name}</div>
                      <div style={{flex:1,height:6,background:'rgba(0,100,140,0.08)',borderRadius:3}}>
                        <div style={{width:`${Math.min(Number(pct)*1.5,100)}%`,height:'100%',background:color,borderRadius:3}}/>
                      </div>
                      <div style={{fontSize:11,fontWeight:700,color,width:50,textAlign:'right'}}>{pct}%</div>
                    </div>
                  );
                })}
              </div>
            </GC>
            <CasesTable cases={recentCases.filter(c=>c.status==='Closed'||c.status==='Resolved'||c.status==='Close').slice(0,200)}
              title="Closed Cases" showFilters={false}
              owners={owners} areas={areas} fOwner={fOwner} setFOwner={setFOwner} fArea={fArea} setFArea={setFArea}/>
          </div>
        )}
      </main>
    </div>
  );
}

// ── OPEN CASES TABLE ──────────────────────────────────────────────────────────
function OpenCasesTable({ cases, total }) {
  const riskColor = r => r==='Overdue'?T.red:r==='At Risk'?T.amber:T.green;
  const statusColor = s => {
    if (!s) return T.gray;
    if (s==='Closed'||s==='Resolved'||s==='Close') return T.green;
    if (s==='In Progress') return T.teal;
    if (s==='Re-Open') return T.red;
    if (s==='New') return T.tealD;
    return T.amber;
  };
  return (
    <GC style={{padding:'14px 16px'}}>
      <SH title="Open Cases" sub={`Showing ${Math.min(cases.length,200).toLocaleString()} of ${total.toLocaleString()} filtered records`}/>
      <div style={{overflowX:'auto',maxHeight:300,overflowY:'auto'}}>
        <table style={{width:'100%',borderCollapse:'collapse',fontSize:10}}>
          <thead style={{position:'sticky',top:0,background:'rgba(255,255,255,0.97)',zIndex:1}}>
            <tr style={{background:'rgba(0,151,167,0.1)'}}>
              {['Case #','Case Owner','Team Leader','Area','Sub Area','Status','Risk','TAT Status','Response','Applicability','Age'].map(h=>(
                <th key={h} style={{padding:'6px 8px',textAlign:'left',color:T.tealD,fontWeight:700,
                  borderBottom:'2px solid rgba(0,151,167,0.2)',whiteSpace:'nowrap',fontSize:9}}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {cases.map((c,i)=>(
              <tr key={i} className="tr" style={{background:i%2===0?'transparent':'rgba(0,100,140,0.025)'}}>
                <td style={{padding:'4px 8px',borderBottom:'1px solid rgba(0,100,140,0.05)',fontWeight:700,color:T.teal,whiteSpace:'nowrap'}}>{c.caseNumber}</td>
                <td style={{padding:'4px 8px',borderBottom:'1px solid rgba(0,100,140,0.05)',color:T.textM,whiteSpace:'nowrap'}}>{c.caseOwner}</td>
                <td style={{padding:'4px 8px',borderBottom:'1px solid rgba(0,100,140,0.05)',color:T.textL,whiteSpace:'nowrap'}}>{c.teamLeader||'–'}</td>
                <td style={{padding:'4px 8px',borderBottom:'1px solid rgba(0,100,140,0.05)',color:T.textM}}>{c.area}</td>
                <td style={{padding:'4px 8px',borderBottom:'1px solid rgba(0,100,140,0.05)',color:T.textL}}>{c.subArea}</td>
                <td style={{padding:'4px 8px',borderBottom:'1px solid rgba(0,100,140,0.05)'}}>
                  <span style={{background:`${statusColor(c.status)}18`,color:statusColor(c.status),border:`1px solid ${statusColor(c.status)}33`,
                    borderRadius:10,padding:'1px 7px',fontWeight:700,fontSize:9,whiteSpace:'nowrap'}}>{c.status}</span>
                </td>
                <td style={{padding:'4px 8px',borderBottom:'1px solid rgba(0,100,140,0.05)'}}>
                  <span style={{background:`${riskColor(c.riskLevel)}18`,color:riskColor(c.riskLevel),border:`1px solid ${riskColor(c.riskLevel)}33`,
                    borderRadius:10,padding:'1px 7px',fontWeight:700,fontSize:9,whiteSpace:'nowrap'}}>{c.riskLevel}</span>
                </td>
                <td style={{padding:'4px 8px',borderBottom:'1px solid rgba(0,100,140,0.05)',color:c.tatStatus==='Beyond TAT'?T.red:T.textL,
                  fontWeight:c.tatStatus==='Beyond TAT'?700:400,fontSize:9,whiteSpace:'nowrap'}}>{c.tatStatus||'–'}</td>
                <td style={{padding:'4px 8px',borderBottom:'1px solid rgba(0,100,140,0.05)',color:c.respTime==='Above 24 Hrs'?T.orange:T.teal,fontWeight:600,fontSize:9,whiteSpace:'nowrap'}}>{c.respTime||'–'}</td>
                <td style={{padding:'4px 8px',borderBottom:'1px solid rgba(0,100,140,0.05)',color:c.applicability==='Exclusion'?T.purple:'#1565c0',fontWeight:600,fontSize:9}}>{c.applicability||'–'}</td>
                <td style={{padding:'4px 8px',borderBottom:'1px solid rgba(0,100,140,0.05)',textAlign:'center',
                  color:c.age>15?T.red:c.age>5?T.amber:T.textM,fontWeight:700}}>{c.age}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </GC>
  );
}

// ── GENERAL CASES TABLE ───────────────────────────────────────────────────────
function CasesTable({ cases, title, showFilters, owners, areas, fOwner, setFOwner, fArea, setFArea }) {
  const statusColor = s => {
    if (!s) return T.gray;
    if (s==='Closed'||s==='Resolved'||s==='Close') return T.green;
    if (s==='In Progress') return T.teal;
    if (s==='Re-Open') return T.red;
    if (s==='New') return T.tealD;
    return T.amber;
  };
  return (
    <GC style={{padding:'14px 16px'}}>
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:10}}>
        <SH title={title} sub={`${cases.length.toLocaleString()} records`}/>
        {showFilters && (
          <div style={{display:'flex',gap:8}}>
            <select value={fOwner} onChange={e=>setFOwner(e.target.value)}
              style={{fontSize:10,fontWeight:600,color:T.textM,background:'rgba(255,255,255,0.9)',
                border:'1px solid rgba(0,100,140,0.2)',borderRadius:7,padding:'4px 8px',cursor:'pointer',fontFamily:'Inter,sans-serif'}}>
              <option value="All">All Owners</option>
              {owners.map(o=><option key={o} value={o}>{o}</option>)}
            </select>
            <select value={fArea} onChange={e=>setFArea(e.target.value)}
              style={{fontSize:10,fontWeight:600,color:T.textM,background:'rgba(255,255,255,0.9)',
                border:'1px solid rgba(0,100,140,0.2)',borderRadius:7,padding:'4px 8px',cursor:'pointer',fontFamily:'Inter,sans-serif'}}>
              <option value="All">All Areas</option>
              {areas.map(a=><option key={a} value={a}>{a}</option>)}
            </select>
          </div>
        )}
      </div>
      <div style={{overflowX:'auto',maxHeight:280,overflowY:'auto'}}>
        <table style={{width:'100%',borderCollapse:'collapse',fontSize:10}}>
          <thead style={{position:'sticky',top:0,background:'rgba(255,255,255,0.97)'}}>
            <tr style={{background:'rgba(0,151,167,0.1)'}}>
              {['Case Number','Case Owner','Team Leader','Area','Sub Area','Status','TAT Status','Age (Days)'].map(h=>(
                <th key={h} style={{padding:'6px 8px',textAlign:'left',color:T.tealD,fontWeight:700,
                  borderBottom:'2px solid rgba(0,151,167,0.2)',whiteSpace:'nowrap'}}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {cases.map((c,i)=>(
              <tr key={i} className="tr" style={{background:i%2===0?'transparent':'rgba(0,100,140,0.025)'}}>
                <td style={{padding:'4px 8px',borderBottom:'1px solid rgba(0,100,140,0.05)',fontWeight:700,color:T.teal}}>{c.caseNumber}</td>
                <td style={{padding:'4px 8px',borderBottom:'1px solid rgba(0,100,140,0.05)',color:T.textM}}>{c.caseOwner}</td>
                <td style={{padding:'4px 8px',borderBottom:'1px solid rgba(0,100,140,0.05)',color:T.textL}}>{c.teamLeader||'–'}</td>
                <td style={{padding:'4px 8px',borderBottom:'1px solid rgba(0,100,140,0.05)',color:T.textM}}>{c.area}</td>
                <td style={{padding:'4px 8px',borderBottom:'1px solid rgba(0,100,140,0.05)',color:T.textL}}>{c.subArea}</td>
                <td style={{padding:'4px 8px',borderBottom:'1px solid rgba(0,100,140,0.05)'}}>
                  <span style={{background:`${statusColor(c.status)}18`,color:statusColor(c.status),
                    border:`1px solid ${statusColor(c.status)}33`,borderRadius:10,padding:'1px 7px',fontWeight:700,fontSize:9}}>{c.status}</span>
                </td>
                <td style={{padding:'4px 8px',borderBottom:'1px solid rgba(0,100,140,0.05)',
                  color:c.tatStatus==='Beyond TAT'?T.red:T.textL,fontWeight:c.tatStatus==='Beyond TAT'?700:400}}>{c.tatStatus&&c.tatStatus!=='nan'?c.tatStatus:'–'}</td>
                <td style={{padding:'4px 8px',borderBottom:'1px solid rgba(0,100,140,0.05)',textAlign:'center',
                  color:c.age>15?T.red:c.age>5?T.amber:T.textM,fontWeight:700}}>{c.age}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </GC>
  );
}

// ── DATA PROCESSOR ────────────────────────────────────────────────────────────
function processData(records) {
  const count = (key, filter=null) => {
    const obj={};
    records.forEach(r=>{
      if (filter&&!filter(r)) return;
      const v=String(r[key]||'').trim();
      if (v) obj[v]=(obj[v]||0)+1;
    });
    return obj;
  };

  const getRisk = tat => {
    if (!tat||String(tat).trim()==='') return 'Within Time';
    const s=String(tat);
    if (s==='Beyond TAT') return 'Overdue';
    if (s.includes('Escalation')) return 'At Risk';
    return 'Within Time';
  };

  const total = records.length;
  const isOpen = r => r['Open']===1||r['Open']===true||String(r['Open']).toUpperCase()==='TRUE';
  const isClosed = r => r['Closed']===1||r['Closed']===true||String(r['Closed']).toUpperCase()==='TRUE';
  const openCount = records.filter(isOpen).length;
  const closedCount = records.filter(isClosed).length;

  const statusCounts = count('Status');
  const originCounts = count('Case Origin');
  const caseTypeCounts = count('Case Type');

  const ownerCounts = count('Case Owner', r=>r['Case Owner']!=='CRM FrontEnd Executives');
  const byOwner = Object.fromEntries(Object.entries(ownerCounts).sort((a,b)=>b[1]-a[1]).slice(0,10));

  const areaSubMap={};
  records.forEach(r=>{
    const key=`${r['Area']}|||${r['Sub Area']}`;
    areaSubMap[key]=(areaSubMap[key]||0)+1;
  });
  const areaSub = Object.entries(areaSubMap)
    .map(([k,v])=>{ const [area,subArea]=k.split('|||'); return {area,subArea,count:v}; })
    .sort((a,b)=>b.count-a.count).slice(0,15);

  const ages = records.map(r=>Number(r['Age'])).filter(v=>!isNaN(v));
  const ageing = {
    under24h: ages.filter(v=>v<1).length,
    '1to5': ages.filter(v=>v>=1&&v<=5).length,
    '5to15': ages.filter(v=>v>5&&v<=15).length,
    '15to30': ages.filter(v=>v>15&&v<=30).length,
    over30: ages.filter(v=>v>30).length,
  };

  const respTime = count('Response Time Category');
  const tatBeyond = records.filter(r=>r['TAT Status']==='Beyond TAT').length;
  const tatWithin = records.filter(r=>r['TAT Status']&&r['TAT Status']!=='Beyond TAT').length;

  const allCases = records.map(r=>({
    caseNumber: String(r['Case Number']||'').replace('.0',''),
    caseOwner: String(r['Case Owner']||''),
    teamLeader: String(r['Team Leader name']||'').trim(),
    area: String(r['Area']||''),
    subArea: String(r['Sub Area']||''),
    status: String(r['Status']||''),
    tatStatus: String(r['TAT Status']||''),
    respTime: String(r['Response Time Category']||''),
    applicability: String(r['Case Applicability']||''),
    origin: String(r['Case Origin']||''),
    age: Number(r['Age'])||0,
    isOpen: isOpen(r),
    riskLevel: getRisk(r['TAT Status']),
  }));

  const recentCases = allCases.slice(0,500);
  const owners = [...new Set(records.map(r=>String(r['Case Owner']||'')).filter(Boolean))].sort();
  const areas = [...new Set(records.map(r=>String(r['Area']||'')).filter(Boolean))].sort();
  const subAreas = [...new Set(records.map(r=>String(r['Sub Area']||'')).filter(Boolean))].sort();
  const originList = [...new Set(records.map(r=>String(r['Case Origin']||'')).filter(Boolean))].sort();

  const riskCounts = count('TAT Status');
  const tatCounts = { beyond: tatBeyond, within: tatWithin };
  const respCounts = respTime;
  const applyCounts = count('Case Applicability');

  return { total, openCount, closedCount, statusCounts, originCounts, caseTypeCounts,
    byOwner, areaSub, ageing, respTime, recentCases, allCases,
    tatStats:{beyond:tatBeyond,within:tatWithin}, owners, areas, subAreas, originList,
    riskCounts, tatCounts, respCounts, applyCounts };
}
