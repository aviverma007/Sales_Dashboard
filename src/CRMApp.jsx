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

// Panel with blue header bar (matches requested KPI design)
const Panel = ({title,children,style={}}) => (
  <div style={{background:T.glass,border:`1px solid ${T.border}`,borderRadius:12,overflow:'hidden',boxShadow:'0 4px 20px rgba(0,80,120,0.10)',...style}}>
    <div style={{background:'linear-gradient(135deg,#1565c0,#0d47a1)',color:'#fff',fontWeight:800,fontSize:13,textAlign:'center',padding:'8px 0',letterSpacing:0.5}}>{title}</div>
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

  // "Number of cases by" dimension toggle
  const [byDim, setByDim] = useState('owner'); // owner | hod | tl

  // Area/Sub Area table — excluded rows (excluded from totals only)
  const [excluded, setExcluded] = useState(()=>new Set());
  const toggleRow = (k) => setExcluded(prev=>{ const n=new Set(prev); n.has(k)?n.delete(k):n.add(k); return n; });

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
  const totalT  = filtered.length;
  const closedT = filtered.filter(isClosed).length;
  const openT   = totalT - closedT;

  // Area table totals over INCLUDED (checked) rows only
  const includedRows = areaTable.filter(r=>!excluded.has(r.area+'||'+r.subArea));
  const areaTot = includedRows.reduce((a,r)=>({total:a.total+r.total,open:a.open+r.open,closed:a.closed+r.closed}),{total:0,open:0,closed:0});
  const allKeys = areaTable.map(r=>r.area+'||'+r.subArea);
  const allIncluded = excluded.size===0;
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

            {tab==='overall' ? (
              <>
                {/* Summary cards */}
                <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:14}}>
                  {[
                    {v:totalT,  l:'TOTAL TICKETS',  c:T.tealD},
                    {v:openT,   l:'Open TICKETS',   c:T.amber},
                    {v:closedT, l:'Closed TICKETS', c:T.green},
                  ].map((c,i)=>(
                    <div key={i} style={{background:'#fff',border:`1.5px solid #cfd8dc`,borderTop:`4px solid ${c.c}`,borderRadius:10,padding:'16px 12px',textAlign:'center',boxShadow:'0 4px 16px rgba(0,80,120,0.08)'}}>
                      <div style={{fontSize:26,fontWeight:900,color:c.c,letterSpacing:-0.5,lineHeight:1}}>{c.v.toLocaleString()}</div>
                      <div style={{fontSize:12,fontWeight:800,color:T.text,marginTop:6}}>{c.l}</div>
                    </div>
                  ))}
                </div>

                <div style={{display:'grid',gridTemplateColumns:'1fr 1.1fr 1.2fr',gap:14,alignItems:'start'}}>

                  {/* Case Type */}
                  <Panel title="Case Type">
                    <ResponsiveContainer width="100%" height={210}>
                      <PieChart>
                        <Pie data={ovCharts.caseType} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={78}
                          label={({value})=>value.toLocaleString()} labelLine={true}>
                          {ovCharts.caseType.map((e,i)=><Cell key={i} fill={typeColor(e.name)}/>)}
                        </Pie>
                        <Tooltip content={<CTip/>}/>
                        <Legend iconType="circle" wrapperStyle={{fontSize:11,fontWeight:700}}/>
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
                          <div key={i} style={{display:'flex',alignItems:'center',gap:8,marginBottom:10}}>
                            <div style={{width:150,fontSize:11,fontWeight:800,color:T.textM}}>{s.name}</div>
                            <div style={{flex:1,position:'relative',height:26,background:'#f3f4f6',borderRadius:5,overflow:'hidden'}}>
                              <div style={{position:'absolute',top:0,left:0,bottom:0,width:`${w}%`,background:big?'#f4a582':'#fbe0d2',borderRadius:5,transition:'width 0.3s'}}/>
                              <div style={{position:'absolute',inset:0,display:'flex',alignItems:'center',justifyContent:'flex-end',paddingRight:10,fontSize:12,fontWeight:800,color:T.text}}>{s.value.toLocaleString()}</div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </Panel>

                  {/* Case Origin */}
                  <Panel title="Case Origin">
                    <div style={{padding:'4px 2px'}}>
                      {ovCharts.origin.slice(0,8).map((o,i)=>(
                        <div key={i} style={{display:'flex',alignItems:'center',gap:8,marginBottom:9}}>
                          <div style={{width:120,fontSize:10,fontWeight:700,color:T.textM,textAlign:'right',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{o.name}</div>
                          <div style={{flex:1,display:'flex',alignItems:'center',gap:7}}>
                            <div style={{height:18,width:`${o.pct}%`,minWidth:4,background:CC[i%CC.length],borderRadius:3,transition:'width 0.3s'}}/>
                            <span style={{fontSize:11,fontWeight:800,color:T.text,whiteSpace:'nowrap'}}>{o.pct}%</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </Panel>

                </div>

                {/* Number of cases by Owner / HOD / Team Leader */}
                <Panel title={`Number of Cases by ${byDim==='owner'?'Case Owner':'Team Leader'}`}>
                  <div style={{display:'flex',gap:8,marginBottom:14,justifyContent:'center'}}>
                    {[{k:'owner',l:'By Case Owner'},{k:'tl',l:'By Team Leader'}].map(b=>(
                      <button key={b.k} onClick={()=>setByDim(b.k)} style={{
                        background:byDim===b.k?'linear-gradient(135deg,#1565c0,#0d47a1)':'#fff',
                        color:byDim===b.k?'#fff':T.textM,
                        border:`1.5px solid ${byDim===b.k?'#0d47a1':'#cfd8dc'}`,
                        borderRadius:8,padding:'7px 16px',fontSize:12,fontWeight:800,cursor:'pointer',transition:'all 0.15s'}}>
                        {b.l}
                      </button>
                    ))}
                  </div>
                  {byData.length>0 ? (
                    <ResponsiveContainer width="100%" height={Math.max(260, byData.length*30)}>
                      <BarChart data={byData} layout="vertical" margin={{top:5,right:55,left:10,bottom:5}}>
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="rgba(0,60,100,0.08)"/>
                        <XAxis type="number" tick={{fontSize:10,fill:T.textL}}/>
                        <YAxis type="category" dataKey="name" width={150} tick={{fontSize:10,fill:T.textM,fontWeight:600}}/>
                        <Tooltip content={<CTip/>}/>
                        <Legend iconType="circle" wrapperStyle={{fontSize:11,fontWeight:700}}/>
                        <Bar dataKey="closed" name="Closed" stackId="a" fill={T.green}>
                          <LabelList dataKey="closed" position="center" style={{fontSize:9,fontWeight:800,fill:'#fff'}} formatter={v=>v>maxTot*0.06?v.toLocaleString():''}/>
                        </Bar>
                        <Bar dataKey="open" name="Open" stackId="a" fill={T.amber} radius={[0,4,4,0]}>
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
                <GC style={{padding:0,overflow:'hidden'}}>
                  <div style={{maxHeight:460,overflowY:'auto'}}>
                    <table style={{width:'100%',borderCollapse:'collapse',fontSize:12}}>
                      <thead>
                        <tr style={{background:'linear-gradient(135deg,#1565c0,#0d47a1)',position:'sticky',top:0,zIndex:1}}>
                          <th style={{padding:'11px 10px',color:'#fff',fontWeight:800,textAlign:'center',width:34}}>
                            <input type="checkbox" checked={allIncluded} title="Include / exclude all"
                              onChange={()=>setExcluded(allIncluded ? new Set(allKeys) : new Set())}
                              style={{cursor:'pointer',width:14,height:14}}/>
                          </th>
                          <th style={{padding:'11px 14px',color:'#fff',fontWeight:800,textAlign:'left',letterSpacing:0.3}}>Area</th>
                          <th style={{padding:'11px 14px',color:'#fff',fontWeight:800,textAlign:'left',letterSpacing:0.3}}>Sub Area</th>
                          <th style={{padding:'11px 14px',color:'#fff',fontWeight:800,textAlign:'right',letterSpacing:0.3}}>No of Cases</th>
                          <th style={{padding:'11px 14px',color:'#fff',fontWeight:800,textAlign:'right',letterSpacing:0.3}}>Open</th>
                          <th style={{padding:'11px 14px',color:'#fff',fontWeight:800,textAlign:'right',letterSpacing:0.3}}>Closed</th>
                        </tr>
                        <tr style={{background:'#e8eef5',position:'sticky',top:42,zIndex:1,borderBottom:'2px solid #1565c0'}}>
                          <td style={{padding:'8px 10px'}}></td>
                          <td style={{padding:'8px 14px',fontWeight:900,color:T.navy}} colSpan={2}>TOTAL ({includedRows.length} of {areaTable.length} rows)</td>
                          <td style={{padding:'8px 14px',textAlign:'right',fontWeight:900,color:T.tealD}}>{areaTot.total.toLocaleString()}</td>
                          <td style={{padding:'8px 14px',textAlign:'right',fontWeight:900,color:T.amber}}>{areaTot.open.toLocaleString()}</td>
                          <td style={{padding:'8px 14px',textAlign:'right',fontWeight:900,color:T.green}}>{areaTot.closed.toLocaleString()}</td>
                        </tr>
                      </thead>
                      <tbody>
                        {areaTable.map((r,i)=>{
                          const k=r.area+'||'+r.subArea;
                          const inc=!excluded.has(k);
                          return (
                          <tr key={i} onClick={()=>toggleRow(k)} style={{borderBottom:'1px solid rgba(0,60,100,0.06)',background:i%2?'rgba(0,151,167,0.03)':'#fff',opacity:inc?1:0.4,cursor:'pointer'}}>
                            <td style={{padding:'7px 10px',textAlign:'center'}}>
                              <input type="checkbox" checked={inc} onChange={()=>toggleRow(k)} onClick={e=>e.stopPropagation()} style={{cursor:'pointer',width:13,height:13}}/>
                            </td>
                            <td style={{padding:'7px 14px',fontWeight:700,color:T.navy,textDecoration:inc?'none':'line-through'}}>{r.area}</td>
                            <td style={{padding:'7px 14px',color:T.textM,textDecoration:inc?'none':'line-through'}}>{r.subArea}</td>
                            <td style={{padding:'7px 14px',textAlign:'right',fontWeight:800,color:T.text}}>{r.total.toLocaleString()}</td>
                            <td style={{padding:'7px 14px',textAlign:'right',fontWeight:700,color:T.amber}}>{r.open.toLocaleString()}</td>
                            <td style={{padding:'7px 14px',textAlign:'right',fontWeight:700,color:T.green}}>{r.closed.toLocaleString()}</td>
                          </tr>
                          );
                        })}
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

          </main>

        </div>
      </div>
    </div>
  );
}
