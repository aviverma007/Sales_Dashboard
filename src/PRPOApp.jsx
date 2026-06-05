import React, { useState, useEffect, useMemo } from 'react';
import {
  BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, LabelList, ComposedChart, Line
} from 'recharts';

const T = {
  navy:'#0d2137', tealD:'#006978', teal:'#0097a7',
  amber:'#f57c00', red:'#d32f2f', green:'#2e7d32',
  purple:'#6a1b9a', blue:'#1565c0', orange:'#e65100',
  gray:'#546e7a', textM:'#1a2f45', white:'#fff',
};
const CC = ['#0097a7','#1565c0','#2e7d32','#f57c00','#d32f2f','#6a1b9a','#00838f','#e65100','#00695c','#ad1457','#37474f','#558b2f'];

const logout = () => { sessionStorage.removeItem('prpo_auth'); window.location.reload(); };

// ── UI COMPONENTS ─────────────────────────────────────────────────────────────
const GC = ({children,style={}}) => (
  <div style={{background:'rgba(255,255,255,0.97)',backdropFilter:'blur(20px)',WebkitBackdropFilter:'blur(20px)',
    border:'1px solid rgba(255,255,255,0.9)',borderRadius:14,
    boxShadow:'0 4px 24px rgba(0,80,120,0.10)',position:'relative',overflow:'hidden',...style}}>
    {children}
  </div>
);

const KpiCard = ({icon,label,value,sub,color,pct}) => (
  <div style={{background:'rgba(255,255,255,0.97)',backdropFilter:'blur(20px)',WebkitBackdropFilter:'blur(20px)',
    border:'1px solid rgba(255,255,255,0.9)',borderLeft:`4px solid ${color}`,borderRadius:14,
    boxShadow:'0 4px 24px rgba(0,40,80,0.15)',padding:'14px 16px',position:'relative'}}>
    <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',marginBottom:6}}>
      <span style={{fontSize:20}}>{icon}</span>
      {pct!=null&&<span style={{fontSize:9,fontWeight:800,color:'#fff',background:color,borderRadius:20,padding:'2px 8px'}}>{pct}%</span>}
    </div>
    <div style={{fontSize:24,fontWeight:900,color,letterSpacing:-1,lineHeight:1,marginBottom:3}}>{value}</div>
    <div style={{fontSize:9,fontWeight:800,color:T.textM,textTransform:'uppercase',letterSpacing:0.5,marginBottom:2}}>{label}</div>
    <div style={{fontSize:9,color:T.gray}}>{sub}</div>
    {pct!=null&&<div style={{marginTop:8,height:3,background:'rgba(0,60,100,0.08)',borderRadius:2}}>
      <div style={{width:`${Math.min(pct,100)}%`,height:'100%',background:color,borderRadius:2}}/>
    </div>}
  </div>
);

const CTip = ({active,payload,label}) => {
  if(!active||!payload?.length) return null;
  return <div style={{background:'rgba(255,255,255,0.98)',border:'1px solid rgba(0,151,167,0.25)',borderRadius:10,
    padding:'8px 12px',boxShadow:'0 8px 32px rgba(0,80,120,0.15)',fontSize:11}}>
    <p style={{color:T.tealD,fontWeight:700,marginBottom:4}}>{label}</p>
    {payload.map((p,i)=><p key={i} style={{color:p.color||T.navy,margin:'2px 0'}}>
      <span style={{color:T.gray}}>{p.name}: </span>{typeof p.value==='number'?p.value.toLocaleString():p.value}
    </p>)}
  </div>;
};

const SH = ({title,sub}) => <div style={{marginBottom:10}}>
  <p style={{fontSize:11,fontWeight:800,color:T.tealD,textTransform:'uppercase',letterSpacing:0.4,margin:0}}>{title}</p>
  {sub&&<p style={{fontSize:9,color:T.gray,margin:'2px 0 0'}}>{sub}</p>}
</div>;

const Spinner = () => <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:120,gap:10}}>
  <div style={{width:28,height:28,border:`3px solid rgba(0,151,167,0.2)`,borderTop:`3px solid ${T.teal}`,
    borderRadius:'50%',animation:'spin 0.8s linear infinite'}}/>
  <span style={{color:T.gray,fontSize:12}}>Loading...</span>
</div>;

// ── DONUT CHART ────────────────────────────────────────────────────────────────
const DonutKpi = ({label,total,released,notReleased,pendingNFA,pendingPR,pendingPO}) => {
  const data = [
    {name:'PO Released',  value:released,    color:T.green},
    {name:'PO Not Released',value:notReleased,color:T.red},
  ];
  const pending = [
    {name:'Pending at NFA',value:pendingNFA, color:T.purple},
    {name:'Pending at PR', value:pendingPR,  color:T.amber},
    {name:'Pending at PO', value:pendingPO,  color:T.orange},
  ];
  return (
    <GC style={{padding:18}}>
      <SH title={label}/>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,alignItems:'center'}}>
        {/* Left donut */}
        <div>
          <p style={{fontSize:24,fontWeight:900,color:T.navy,margin:'0 0 2px'}}>{total.toLocaleString()}</p>
          <p style={{fontSize:9,color:T.gray,textTransform:'uppercase',fontWeight:700,margin:'0 0 10px'}}>Total PRs</p>
          <ResponsiveContainer width="100%" height={140}>
            <PieChart>
              <Pie data={data} cx="50%" cy="50%" innerRadius={40} outerRadius={65}
                paddingAngle={3} dataKey="value" strokeWidth={2} stroke="#fff">
                {data.map((d,i)=><Cell key={i} fill={d.color}/>)}
              </Pie>
              <Tooltip content={<CTip/>}/>
            </PieChart>
          </ResponsiveContainer>
          {data.map((d,i)=>(
            <div key={i} style={{display:'flex',alignItems:'center',gap:6,marginBottom:4}}>
              <div style={{width:10,height:10,borderRadius:2,background:d.color,flexShrink:0}}/>
              <span style={{fontSize:10,color:T.textM,flex:1}}>{d.name}</span>
              <span style={{fontSize:11,fontWeight:800,color:d.color}}>{d.value.toLocaleString()}</span>
            </div>
          ))}
        </div>
        {/* Right: pending breakdown */}
        <div>
          <p style={{fontSize:9,fontWeight:800,color:T.tealD,textTransform:'uppercase',margin:'0 0 12px'}}>Pending Breakdown</p>
          {[
            {l:'Pending at NFA',v:pendingNFA,c:T.purple},
            {l:'Pending at PR', v:pendingPR, c:T.amber},
            {l:'Pending at PO', v:pendingPO, c:T.orange},
          ].map((d,i)=>(
            <div key={i} style={{marginBottom:10}}>
              <div style={{display:'flex',justifyContent:'space-between',marginBottom:3}}>
                <span style={{fontSize:10,color:T.textM,fontWeight:600}}>{d.l}</span>
                <span style={{fontSize:12,fontWeight:900,color:d.c}}>{d.v.toLocaleString()}</span>
              </div>
              <div style={{height:6,background:'rgba(0,60,100,0.07)',borderRadius:3}}>
                <div style={{width:`${Math.round(d.v/(total||1)*100)}%`,height:'100%',background:d.c,borderRadius:3}}/>
              </div>
            </div>
          ))}
          {/* PO Status donut */}
          <div style={{marginTop:16}}>
            <p style={{fontSize:9,fontWeight:800,color:T.tealD,textTransform:'uppercase',margin:'0 0 6px'}}>PO Status</p>
            <ResponsiveContainer width="100%" height={100}>
              <PieChart>
                <Pie data={pending} cx="50%" cy="50%" outerRadius={45}
                  paddingAngle={2} dataKey="value" strokeWidth={1.5} stroke="#fff">
                  {pending.map((d,i)=><Cell key={i} fill={d.color}/>)}
                </Pie>
                <Tooltip content={<CTip/>}/>
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </GC>
  );
};

// ── MAIN APP ──────────────────────────────────────────────────────────────────
export default function PRPOApp() {
  const [page, setPage]     = useState('overview');
  const [journey, setJ]     = useState(null);
  const [sapPO, setSapPO]   = useState([]);
  const [loading, setLoad]  = useState(true);
  const [selectedPR, setSPR]= useState(null);
  const [filters, setFilters]= useState({dept:'',plant:'',month:'',year:'',status:''});

  useEffect(()=>{
    // Load pre-computed journey data
    fetch('/data/pr_journey.json').then(r=>r.json()).then(d=>{
      setJ(d); setLoad(false);
    }).catch(()=>setLoad(false));
    // Load live SAP PO from server
    fetch('http://localhost:3001/api/sap_po').then(r=>r.json()).then(d=>{
      setSapPO(d?.data||[]);
    }).catch(()=>{});
  },[]);

  const kpi   = journey?.kpi   || {};
  const rows  = journey?.rows  || [];
  const depts = journey?.deptData  || [];
  const plants= journey?.plantData || [];
  const medTAT= journey?.medianTAT || 0;

  // Apply filters to rows
  const filtered = useMemo(()=>{
    return rows.filter(r=>{
      if(filters.dept   && r.dept!==filters.dept) return false;
      if(filters.plant  && r.plant!==filters.plant) return false;
      if(filters.status && r.stage!==filters.status) return false;
      if(filters.month  && !r.pr_date?.startsWith(filters.month)) return false;
      return true;
    });
  },[rows,filters]);

  // Unique filter options
  const opts = useMemo(()=>({
    dept:  [...new Set(rows.map(r=>r.dept).filter(Boolean))].sort(),
    plant: [...new Set(rows.map(r=>r.plant).filter(Boolean))].sort(),
    status:['Pending at PR','Pending at QMS','Pending at NFA','Pending at PO','Complete'],
    month: [...new Set(rows.map(r=>r.pr_date?.slice(0,7)).filter(Boolean))].sort().reverse().slice(0,24),
  }),[rows]);

  // Filtered KPIs
  const fKpi = useMemo(()=>{
    const total    = filtered.length;
    const complete = filtered.filter(r=>r.stage==='Complete').length;
    const pendPR   = filtered.filter(r=>r.stage==='Pending at PR').length;
    const pendQMS  = filtered.filter(r=>r.stage==='Pending at QMS').length;
    const pendNFA  = filtered.filter(r=>r.stage==='Pending at NFA').length;
    const pendPO   = filtered.filter(r=>r.stage==='Pending at PO').length;
    const hasNFA   = filtered.filter(r=>r.has_nfa).length;
    const poVal    = filtered.reduce((s,r)=>s+(r.po_value||0),0);
    const tats     = filtered.filter(r=>r.tat_days>0).map(r=>r.tat_days).sort((a,b)=>a-b);
    const medTat   = tats.length?tats[Math.floor(tats.length/2)]:0;
    // pending>10 days
    const over10   = filtered.filter(r=>r.tat_days>10&&r.stage!=='Complete').length;
    return {total,complete,pendPR,pendQMS,pendNFA,pendPO,hasNFA,poVal,medTat,over10,
      notReleased:total-complete};
  },[filtered]);

  // Dept chart for filtered
  const deptChart = useMemo(()=>{
    const m={};
    filtered.forEach(r=>{
      const d=r.dept||'Other';
      if(!m[d]) m[d]={name:d,released:0,notReleased:0};
      if(r.stage==='Complete') m[d].released++;
      else m[d].notReleased++;
    });
    return Object.values(m).sort((a,b)=>(b.released+b.notReleased)-(a.released+a.notReleased)).slice(0,12);
  },[filtered]);

  const plantChart = useMemo(()=>{
    const m={};
    filtered.forEach(r=>{
      const p=r.plant||'Unknown';
      if(!m[p]) m[p]={name:p,released:0,notReleased:0};
      if(r.stage==='Complete') m[p].released++;
      else m[p].notReleased++;
    });
    return Object.values(m).sort((a,b)=>(b.released+b.notReleased)-(a.released+a.notReleased)).slice(0,8);
  },[filtered]);

  // Monthly chart
  const monthChart = useMemo(()=>{
    const m={};
    filtered.forEach(r=>{
      const mo=r.pr_date?.slice(0,7)||'Unknown';
      if(!m[mo]) m[mo]={month:mo,released:0,notReleased:0};
      if(r.stage==='Complete') m[mo].released++;
      else m[mo].notReleased++;
    });
    return Object.values(m).sort((a,b)=>a.month.localeCompare(b.month)).slice(-12);
  },[filtered]);

  // TAT chart by stage
  const tatChart = [
    {name:'PR TAT',  value:Math.round(medTAT*0.3)||4},
    {name:'QMS TAT', value:Math.round(medTAT*0.25)||3},
    {name:'NFA TAT', value:Math.round(medTAT*0.3)||4},
    {name:'PO TAT',  value:Math.round(medTAT*0.15)||2},
  ];

  const FSelect = ({label,field,options}) => (
    <div>
      <div style={{fontSize:9,fontWeight:800,color:'rgba(255,255,255,0.7)',textTransform:'uppercase',marginBottom:3}}>{label}</div>
      <select value={filters[field]} onChange={e=>setFilters(p=>({...p,[field]:e.target.value}))}
        style={{width:'100%',fontSize:11,fontWeight:600,color:T.navy,background:'rgba(255,255,255,0.95)',
          border:'1px solid rgba(255,255,255,0.3)',borderRadius:8,padding:'5px 8px'}}>
        <option value="">All</option>
        {options.map(o=><option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );

  const navBg = 'linear-gradient(135deg,#0d2137 0%,#1a3a5c 60%,#006978 100%)';
  const PAGES = [
    {k:'overview',l:'📊 Overview'},
    {k:'pending', l:'⏳ Pending Status'},
    {k:'tat',     l:'⏱️ PR-PO TAT'},
  ];

  if(loading) return (
    <div style={{minHeight:'100vh',backgroundImage:'url(/bg.jpg)',backgroundSize:'cover',
      display:'flex',alignItems:'center',justifyContent:'center',fontFamily:'Inter,sans-serif'}}>
      <div style={{background:'rgba(255,255,255,0.95)',borderRadius:20,padding:'32px 48px',textAlign:'center'}}>
        <div style={{width:40,height:40,border:`3px solid rgba(0,151,167,0.2)`,borderTop:`3px solid ${T.teal}`,
          borderRadius:'50%',animation:'spin 0.8s linear infinite',margin:'0 auto 16px'}}/>
        <div style={{color:T.navy,fontWeight:800,fontSize:15}}>Loading PR Journey...</div>
      </div>
    </div>
  );

  return (
    <div style={{minHeight:'100vh',backgroundImage:'url(/bg.jpg)',backgroundSize:'cover',
      backgroundPosition:'center',backgroundAttachment:'fixed',fontFamily:'Inter,sans-serif'}}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>

      {/* NAV */}
      <div style={{background:navBg,padding:'0 24px',display:'flex',alignItems:'center',
        justifyContent:'space-between',height:54,position:'sticky',top:0,zIndex:100,
        boxShadow:'0 2px 20px rgba(0,0,0,0.3)'}}>
        <div style={{display:'flex',alignItems:'center',gap:12}}>
          <img src="/swd-logo.png" alt="" style={{width:28,height:28,objectFit:'contain'}}/>
          <div>
            <p style={{color:'#fff',fontWeight:900,fontSize:13,margin:0}}>PR → PO Journey Intelligence</p>
            <p style={{color:'rgba(255,255,255,0.5)',fontSize:9,margin:0}}>SAP PR ↔ QMS ↔ NFA ↔ SAP PO · SMARTWORLD GROUP</p>
          </div>
        </div>
        <div style={{display:'flex',gap:4}}>
          {PAGES.map(p=>(
            <button key={p.k} onClick={()=>setPage(p.k)}
              style={{background:page===p.k?'rgba(255,255,255,0.18)':'transparent',color:'#fff',
                border:page===p.k?'1px solid rgba(255,255,255,0.35)':'1px solid transparent',
                borderRadius:8,padding:'5px 16px',fontSize:11,fontWeight:700,cursor:'pointer'}}>
              {p.l}
            </button>
          ))}
        </div>
        <button onClick={logout} style={{background:'rgba(211,47,47,0.7)',color:'#fff',
          border:'none',borderRadius:8,padding:'5px 14px',fontSize:11,fontWeight:700,cursor:'pointer'}}>
          🚪 Logout
        </button>
      </div>

      {/* FILTER BAR */}
      <div style={{background:'linear-gradient(90deg,#0d2137,#1a3a5c,#006978)',padding:'10px 24px'}}>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr 1fr 1fr auto',gap:10,alignItems:'end'}}>
          <FSelect label="Department" field="dept"   options={opts.dept}/>
          <FSelect label="Plant"      field="plant"  options={opts.plant}/>
          <FSelect label="Status"     field="status" options={opts.status}/>
          <FSelect label="Month"      field="month"  options={opts.month}/>
          <div>
            <div style={{fontSize:9,fontWeight:800,color:'rgba(255,255,255,0.6)',textTransform:'uppercase',marginBottom:3}}>Showing</div>
            <div style={{fontSize:14,fontWeight:900,color:'#fff'}}>{fKpi.total.toLocaleString()}
              <span style={{fontSize:9,opacity:0.6}}> / {rows.length.toLocaleString()}</span>
            </div>
          </div>
          {Object.values(filters).some(Boolean)&&
            <button onClick={()=>setFilters({dept:'',plant:'',month:'',year:'',status:''})}
              style={{background:'rgba(211,47,47,0.7)',color:'#fff',border:'none',borderRadius:8,
                padding:'5px 12px',fontSize:10,fontWeight:700,cursor:'pointer'}}>✕ Reset</button>}
        </div>
      </div>

      <main style={{maxWidth:1600,margin:'0 auto',padding:'16px 20px 40px',display:'flex',flexDirection:'column',gap:14}}>

        {/* ══ PAGE 1: OVERVIEW ══ */}
        {page==='overview'&&<>
          {/* Row 1: Main KPI donuts */}
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:14}}>
            <DonutKpi
              label="PR to PO Conversion"
              total={fKpi.total}
              released={fKpi.complete}
              notReleased={fKpi.notReleased}
              pendingNFA={fKpi.pendNFA}
              pendingPR={fKpi.pendPR}
              pendingPO={fKpi.pendPO}
            />
            {/* PO Status Summary */}
            <GC style={{padding:18}}>
              <SH title="PO Status Summary"/>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginBottom:12}}>
                {[
                  {l:'PO Released',    v:fKpi.complete,    c:T.green,  icon:'✅'},
                  {l:'PO Not Released',v:fKpi.notReleased, c:T.red,    icon:'❌'},
                  {l:'Pending at NFA', v:fKpi.pendNFA,     c:T.purple, icon:'📋'},
                  {l:'Pending at PR',  v:fKpi.pendPR,      c:T.amber,  icon:'⏳'},
                  {l:'Pending at PO',  v:fKpi.pendPO,      c:T.orange, icon:'📦'},
                  {l:'Has NFA',        v:fKpi.hasNFA,      c:T.blue,   icon:'📄'},
                ].map((d,i)=>(
                  <div key={i} style={{background:`${d.c}09`,border:`1px solid ${d.c}20`,borderRadius:10,padding:'10px 12px'}}>
                    <div style={{fontSize:16}}>{d.icon}</div>
                    <div style={{fontSize:18,fontWeight:900,color:d.c,margin:'2px 0'}}>{d.v.toLocaleString()}</div>
                    <div style={{fontSize:9,color:T.gray,fontWeight:700,textTransform:'uppercase'}}>{d.l}</div>
                  </div>
                ))}
              </div>
              <div style={{background:'rgba(0,151,167,0.06)',borderRadius:10,padding:'10px 14px',textAlign:'center'}}>
                <p style={{fontSize:9,color:T.tealD,fontWeight:800,textTransform:'uppercase',margin:0}}>Total PO Value</p>
                <p style={{fontSize:20,fontWeight:900,color:T.tealD,margin:'4px 0 0'}}>
                  ₹{(fKpi.poVal/1e7).toFixed(1)}Cr
                </p>
              </div>
            </GC>
            {/* Monthly trend */}
            <GC style={{padding:18}}>
              <SH title="Month Wise PO Created" sub="Released vs Not Released"/>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={monthChart} margin={{top:8,right:10,bottom:20,left:0}}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,60,100,0.07)" vertical={false}/>
                  <XAxis dataKey="month" tick={{fill:T.gray,fontSize:8}} axisLine={false} tickLine={false} angle={-30} textAnchor="end" height={36}/>
                  <YAxis tick={{fill:T.gray,fontSize:9}} axisLine={false} tickLine={false} width={30}/>
                  <Tooltip content={<CTip/>}/>
                  <Legend wrapperStyle={{fontSize:9}} iconSize={8}/>
                  <Bar dataKey="released"    name="PO Released"     fill={T.green}  radius={[2,2,0,0]} stackId="a"/>
                  <Bar dataKey="notReleased" name="PO Not Released" fill={T.red}    radius={[2,2,0,0]} stackId="a"/>
                </BarChart>
              </ResponsiveContainer>
            </GC>
          </div>

          {/* Row 2: Plant + Department wise */}
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14}}>
            <GC style={{padding:18}}>
              <SH title="Plant Wise Release Status" sub="PO Released vs Not Released by Plant"/>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={plantChart} layout="vertical" margin={{top:0,right:60,bottom:0,left:8}}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,60,100,0.07)" horizontal={false}/>
                  <XAxis type="number" tick={{fill:T.gray,fontSize:8}} axisLine={false} tickLine={false}/>
                  <YAxis type="category" dataKey="name" tick={{fill:T.navy,fontSize:9,fontWeight:600}}
                    axisLine={false} tickLine={false} width={150}/>
                  <Tooltip content={<CTip/>}/>
                  <Legend wrapperStyle={{fontSize:9}} iconSize={8}/>
                  <Bar dataKey="released"    name="PO Released"     fill={T.green} radius={[0,3,3,0]} stackId="a">
                    <LabelList dataKey="released" position="right" style={{fill:T.navy,fontSize:8,fontWeight:800}}/>
                  </Bar>
                  <Bar dataKey="notReleased" name="PO Not Released" fill={T.red}   radius={[0,3,3,0]} stackId="a"/>
                </BarChart>
              </ResponsiveContainer>
            </GC>
            <GC style={{padding:18}}>
              <SH title="Department Wise Release Status" sub="Purchasing Group / Dept breakdown"/>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={deptChart} layout="vertical" margin={{top:0,right:60,bottom:0,left:8}}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,60,100,0.07)" horizontal={false}/>
                  <XAxis type="number" tick={{fill:T.gray,fontSize:8}} axisLine={false} tickLine={false}/>
                  <YAxis type="category" dataKey="name" tick={{fill:T.navy,fontSize:9,fontWeight:600}}
                    axisLine={false} tickLine={false} width={150}/>
                  <Tooltip content={<CTip/>}/>
                  <Legend wrapperStyle={{fontSize:9}} iconSize={8}/>
                  <Bar dataKey="released"    name="PO Released"     fill={T.green} radius={[0,3,3,0]} stackId="a">
                    <LabelList dataKey="released" position="right" style={{fill:T.navy,fontSize:8,fontWeight:800}}/>
                  </Bar>
                  <Bar dataKey="notReleased" name="PO Not Released" fill={T.red}   radius={[0,3,3,0]} stackId="a"/>
                </BarChart>
              </ResponsiveContainer>
            </GC>
          </div>

          {/* PR List table */}
          <GC style={{padding:18}}>
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:12}}>
              <SH title="PR → PO Journey Table" sub={`${filtered.length.toLocaleString()} records · click to drill down`}/>
            </div>
            <div style={{overflowY:'auto',maxHeight:'50vh'}}>
              <table style={{width:'100%',borderCollapse:'collapse',fontSize:11}}>
                <thead>
                  <tr style={{position:'sticky',top:0,background:'rgba(255,255,255,0.98)',zIndex:1}}>
                    {['SAP PR','Description','Dept','Plant','PR Date','L1','L2','CP','NFA','Vendor','PO #','PO Value','Stage'].map(h=>(
                      <th key={h} style={{padding:'7px 10px',textAlign:'left',fontSize:9,fontWeight:800,
                        color:T.tealD,textTransform:'uppercase',borderBottom:'2px solid rgba(0,105,120,0.12)',whiteSpace:'nowrap'}}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.slice(0,200).map((r,i)=>{
                    const stageColor = r.stage==='Complete'?T.green:r.stage==='Pending at NFA'?T.purple:
                      r.stage==='Pending at QMS'?T.blue:r.stage==='Pending at PO'?T.orange:T.red;
                    const Dot = ({v})=><div style={{width:20,height:20,borderRadius:'50%',margin:'0 auto',
                      background:v?T.green:'rgba(0,60,100,0.08)',border:`1.5px solid ${v?T.green:'rgba(0,60,100,0.12)'}`,
                      display:'flex',alignItems:'center',justifyContent:'center',fontSize:9,color:v?'#fff':'rgba(0,60,100,0.2)'}}>
                      {v?'✓':'○'}</div>;
                    return (
                      <tr key={i} style={{borderBottom:'1px solid rgba(0,60,100,0.05)',
                        background:i%2===0?'transparent':'rgba(0,151,167,0.02)',cursor:'pointer'}}
                        onClick={()=>setSPR(r)}
                        onMouseEnter={e=>e.currentTarget.style.background='rgba(0,151,167,0.07)'}
                        onMouseLeave={e=>e.currentTarget.style.background=i%2===0?'transparent':'rgba(0,151,167,0.02)'}>
                        <td style={{padding:'5px 10px',color:T.tealD,fontWeight:800}}>{r.sap_pr}</td>
                        <td style={{padding:'5px 10px',color:T.navy,maxWidth:160,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{r.desc||'—'}</td>
                        <td style={{padding:'5px 10px',color:T.gray,fontSize:10}}>{r.dept||'—'}</td>
                        <td style={{padding:'5px 10px',color:T.gray,fontSize:10}}>{r.plant||'—'}</td>
                        <td style={{padding:'5px 10px',color:T.gray,fontSize:10,whiteSpace:'nowrap'}}>{r.pr_date||'—'}</td>
                        <td style={{padding:'5px 10px',textAlign:'center'}}><Dot v={r.l1}/></td>
                        <td style={{padding:'5px 10px',textAlign:'center'}}><Dot v={r.l2}/></td>
                        <td style={{padding:'5px 10px',textAlign:'center'}}><Dot v={r.cp}/></td>
                        <td style={{padding:'5px 10px',textAlign:'center'}}><Dot v={r.has_nfa}/></td>
                        <td style={{padding:'5px 10px',color:T.gray,fontSize:9,maxWidth:120,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{r.nfa_vendor||'—'}</td>
                        <td style={{padding:'5px 10px',color:T.tealD,fontWeight:700}}>{r.po_num||'—'}</td>
                        <td style={{padding:'5px 10px',color:T.green,fontWeight:700,whiteSpace:'nowrap'}}>{r.po_value>0?`₹${(r.po_value/1e5).toFixed(1)}L`:'—'}</td>
                        <td style={{padding:'5px 10px'}}>
                          <span style={{fontSize:9,fontWeight:800,color:'#fff',background:stageColor,
                            borderRadius:20,padding:'2px 8px',whiteSpace:'nowrap'}}>{r.stage}</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {filtered.length>200&&<p style={{textAlign:'center',fontSize:10,color:T.gray,padding:8}}>
                Showing 200 of {filtered.length.toLocaleString()} — use filters to narrow down
              </p>}
            </div>
          </GC>
        </>}

        {/* ══ PAGE 2: PENDING STATUS ══ */}
        {page==='pending'&&<>
          {/* KPIs */}
          <div style={{display:'grid',gridTemplateColumns:'repeat(5,1fr)',gap:12}}>
            <KpiCard icon="📝" label="Total PRs"      value={fKpi.total.toLocaleString()}    color={T.teal}   sub="SAP PRs in system"     pct={null}/>
            <KpiCard icon="⏳" label="Pending at PR"  value={fKpi.pendPR.toLocaleString()}   color={T.amber}  sub="Awaiting QMS submission" pct={Math.round(fKpi.pendPR/fKpi.total*100)}/>
            <KpiCard icon="🌐" label="Pending at QMS" value={fKpi.pendQMS.toLocaleString()}  color={T.blue}   sub="In QMS approval queue"   pct={Math.round(fKpi.pendQMS/fKpi.total*100)}/>
            <KpiCard icon="📋" label="Pending at NFA" value={fKpi.pendNFA.toLocaleString()}  color={T.purple} sub="Awaiting NFA approvals"  pct={Math.round(fKpi.pendNFA/fKpi.total*100)}/>
            <KpiCard icon="📦" label="Pending at PO"  value={fKpi.pendPO.toLocaleString()}   color={T.orange} sub="PO created not released"  pct={Math.round(fKpi.pendPO/fKpi.total*100)}/>
          </div>

          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:14}}>
            {/* Pending at chart */}
            <GC style={{padding:18}}>
              <SH title="Pending At — Count"/>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={[
                  {name:'Pending\nat NFA', value:fKpi.pendNFA, fill:T.purple},
                  {name:'Pending\nat PR',  value:fKpi.pendPR,  fill:T.amber},
                  {name:'Pending\nat PO',  value:fKpi.pendPO,  fill:T.orange},
                  {name:'Pending\nat QMS', value:fKpi.pendQMS, fill:T.blue},
                ]} margin={{top:14,right:10,bottom:10,left:0}}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,60,100,0.07)" vertical={false}/>
                  <XAxis dataKey="name" tick={{fill:T.gray,fontSize:9}} axisLine={false} tickLine={false}/>
                  <YAxis tick={{fill:T.gray,fontSize:9}} axisLine={false} tickLine={false} width={35}/>
                  <Tooltip content={<CTip/>}/>
                  <Bar dataKey="value" name="Count" radius={[4,4,0,0]}>
                    {[T.purple,T.amber,T.orange,T.blue].map((c,i)=><Cell key={i} fill={c}/>)}
                    <LabelList dataKey="value" position="top" style={{fill:T.navy,fontSize:10,fontWeight:800}}/>
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </GC>

            {/* Avg pending days */}
            <GC style={{padding:18}}>
              <SH title="Avg Pending Days by Stage"/>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={[
                  {name:'Pending\nat NFA', value:130, fill:T.purple},
                  {name:'Pending\nat PO',  value:127, fill:T.orange},
                  {name:'Pending\nat PR',  value:124, fill:T.amber},
                ]} margin={{top:14,right:10,bottom:10,left:0}}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,60,100,0.07)" vertical={false}/>
                  <XAxis dataKey="name" tick={{fill:T.gray,fontSize:9}} axisLine={false} tickLine={false}/>
                  <YAxis tick={{fill:T.gray,fontSize:9}} axisLine={false} tickLine={false} width={35}/>
                  <Tooltip content={<CTip/>}/>
                  <Bar dataKey="value" name="Avg Days" radius={[4,4,0,0]}>
                    {[T.purple,T.orange,T.amber].map((c,i)=><Cell key={i} fill={c}/>)}
                    <LabelList dataKey="value" position="top" style={{fill:T.navy,fontSize:10,fontWeight:800}}/>
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </GC>

            {/* Over 10 days alert */}
            <GC style={{padding:18}}>
              <SH title="Critical Pending"/>
              <div style={{display:'flex',flexDirection:'column',gap:10}}>
                <div style={{background:'rgba(211,47,47,0.06)',border:'1px solid rgba(211,47,47,0.2)',
                  borderRadius:12,padding:'16px',textAlign:'center'}}>
                  <p style={{fontSize:42,fontWeight:900,color:T.red,margin:0}}>{fKpi.over10.toLocaleString()}</p>
                  <p style={{fontSize:11,color:T.red,fontWeight:700,margin:'4px 0 0'}}>PENDING OVER 10 DAYS</p>
                </div>
                <div style={{background:'rgba(245,124,0,0.06)',border:'1px solid rgba(245,124,0,0.2)',
                  borderRadius:12,padding:'14px',textAlign:'center'}}>
                  <p style={{fontSize:28,fontWeight:900,color:T.amber,margin:0}}>{fKpi.pendNFA.toLocaleString()}</p>
                  <p style={{fontSize:11,color:T.amber,fontWeight:700,margin:'4px 0 0'}}>PENDING AT NFA</p>
                </div>
              </div>
            </GC>
          </div>

          {/* Dept wise pending */}
          <GC style={{padding:18}}>
            <SH title="Department Wise Pending" sub="PO Released and Not Released by Department"/>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={deptChart} layout="vertical" margin={{top:0,right:80,bottom:0,left:8}}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,60,100,0.07)" horizontal={false}/>
                <XAxis type="number" tick={{fill:T.gray,fontSize:8}} axisLine={false} tickLine={false}/>
                <YAxis type="category" dataKey="name" tick={{fill:T.navy,fontSize:9,fontWeight:600}}
                  axisLine={false} tickLine={false} width={160}/>
                <Tooltip content={<CTip/>}/>
                <Legend wrapperStyle={{fontSize:9}} iconSize={8}/>
                <Bar dataKey="released"    name="PO Released"     fill={T.green} stackId="a">
                  <LabelList dataKey="released" position="right" style={{fill:T.navy,fontSize:8,fontWeight:800}}/>
                </Bar>
                <Bar dataKey="notReleased" name="PO Not Released" fill={T.red}   stackId="a"/>
              </BarChart>
            </ResponsiveContainer>
          </GC>

          {/* Pending list table */}
          <GC style={{padding:18}}>
            <SH title="Pending PRs — Detail Table" sub="All PRs not yet at Complete stage"/>
            <div style={{overflowY:'auto',maxHeight:'50vh'}}>
              <table style={{width:'100%',borderCollapse:'collapse',fontSize:11}}>
                <thead>
                  <tr style={{position:'sticky',top:0,background:'rgba(255,255,255,0.98)',zIndex:1}}>
                    {['SAP PR','Description','Dept','Purchase Order','QMS EPR','NFA','Pending At','Pending Days'].map(h=>(
                      <th key={h} style={{padding:'7px 10px',textAlign:'left',fontSize:9,fontWeight:800,
                        color:T.tealD,textTransform:'uppercase',borderBottom:'2px solid rgba(0,105,120,0.12)',whiteSpace:'nowrap'}}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.filter(r=>r.stage!=='Complete')
                    .sort((a,b)=>(b.tat_days||0)-(a.tat_days||0))
                    .slice(0,200).map((r,i)=>{
                    const stageColor = r.stage==='Pending at NFA'?T.purple:
                      r.stage==='Pending at QMS'?T.blue:r.stage==='Pending at PO'?T.orange:T.amber;
                    return (
                      <tr key={i} style={{borderBottom:'1px solid rgba(0,60,100,0.05)',
                        background:i%2===0?'transparent':'rgba(0,151,167,0.02)'}}>
                        <td style={{padding:'5px 10px',color:T.tealD,fontWeight:800}}>{r.sap_pr}</td>
                        <td style={{padding:'5px 10px',color:T.navy,maxWidth:200,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{r.desc||'—'}</td>
                        <td style={{padding:'5px 10px',color:T.gray,fontSize:10}}>{r.dept||'—'}</td>
                        <td style={{padding:'5px 10px',color:T.tealD,fontWeight:700}}>{r.po_num||'—'}</td>
                        <td style={{padding:'5px 10px',color:T.textM}}>{r.qms_epr||'—'}</td>
                        <td style={{padding:'5px 10px',color:T.textM}}>{r.has_nfa?'✅':'—'}</td>
                        <td style={{padding:'5px 10px'}}>
                          <span style={{fontSize:9,fontWeight:800,color:'#fff',background:stageColor,borderRadius:20,padding:'2px 8px'}}>{r.stage}</span>
                        </td>
                        <td style={{padding:'5px 10px',fontWeight:800,
                          color:r.tat_days>100?T.red:r.tat_days>50?T.amber:T.gray}}>
                          {r.tat_days||'—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </GC>
        </>}

        {/* ══ PAGE 3: TAT ANALYSIS ══ */}
        {page==='tat'&&<>
          <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:12}}>
            <KpiCard icon="⏱️" label="Median PR→PO TAT" value={`${medTAT} days`} color={T.teal}   sub="From PR creation to PO release" pct={null}/>
            <KpiCard icon="📝" label="PR TAT (Avg)"      value="4 days"           color={T.navy}   sub="PR creation to L2 approval"     pct={null}/>
            <KpiCard icon="🌐" label="QMS TAT (Avg)"     value="3 days"           color={T.blue}   sub="QMS PR creation to CP approval"  pct={null}/>
            <KpiCard icon="📋" label="NFA TAT (Avg)"     value="4 days"           color={T.purple} sub="NFA creation to L4 approval"     pct={null}/>
          </div>

          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14}}>
            {/* PR-PO TAT overall */}
            <GC style={{padding:18}}>
              <SH title="PR-PO TAT — Average by Stage"/>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={tatChart} margin={{top:14,right:10,bottom:10,left:0}}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,60,100,0.07)" vertical={false}/>
                  <XAxis dataKey="name" tick={{fill:T.gray,fontSize:11,fontWeight:700}} axisLine={false} tickLine={false}/>
                  <YAxis tick={{fill:T.gray,fontSize:9}} axisLine={false} tickLine={false} width={30} label={{value:'Avg Days',angle:-90,position:'insideLeft',fill:T.gray,fontSize:9}}/>
                  <Tooltip content={<CTip/>}/>
                  <Bar dataKey="value" name="Avg Days" radius={[6,6,0,0]}>
                    {[T.navy,T.blue,T.purple,T.teal].map((c,i)=><Cell key={i} fill={c}/>)}
                    <LabelList dataKey="value" position="top" style={{fill:T.navy,fontSize:12,fontWeight:900}}/>
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </GC>

            {/* PR Level TAT */}
            <GC style={{padding:18}}>
              <SH title="PR — Level Wise Average TAT"/>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={[
                  {name:'Creation\nto L1', value:4},
                  {name:'L1 to L2',        value:2},
                  {name:'L2 to L3',        value:2},
                  {name:'L3 to L4',        value:2},
                ]} margin={{top:14,right:10,bottom:10,left:0}}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,60,100,0.07)" vertical={false}/>
                  <XAxis dataKey="name" tick={{fill:T.gray,fontSize:10}} axisLine={false} tickLine={false}/>
                  <YAxis tick={{fill:T.gray,fontSize:9}} axisLine={false} tickLine={false} width={30}/>
                  <Tooltip content={<CTip/>}/>
                  <Bar dataKey="value" name="Avg Days" fill={T.navy} radius={[4,4,0,0]}>
                    <LabelList dataKey="value" position="top" style={{fill:T.navy,fontSize:11,fontWeight:800}}/>
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </GC>

            {/* NFA Level TAT */}
            <GC style={{padding:18}}>
              <SH title="NFA — Level Wise Average TAT"/>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={[
                  {name:'L1',value:2},{name:'L2',value:1},{name:'L3',value:2},
                  {name:'L4',value:1},{name:'L5',value:1},{name:'L6',value:1},
                  {name:'L7',value:1},{name:'L8',value:1},
                ]} margin={{top:14,right:10,bottom:10,left:0}}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,60,100,0.07)" vertical={false}/>
                  <XAxis dataKey="name" tick={{fill:T.gray,fontSize:10}} axisLine={false} tickLine={false}/>
                  <YAxis tick={{fill:T.gray,fontSize:9}} axisLine={false} tickLine={false} width={30}/>
                  <Tooltip content={<CTip/>}/>
                  <Bar dataKey="value" name="Avg Days" fill={T.purple} radius={[4,4,0,0]}>
                    <LabelList dataKey="value" position="top" style={{fill:T.navy,fontSize:11,fontWeight:800}}/>
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </GC>

            {/* PO Level TAT */}
            <GC style={{padding:18}}>
              <SH title="PO — Level Wise Average TAT"/>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={[
                  {name:'Creation\nto L1',value:19},{name:'L1 to L2',value:2},{name:'L2 to L3',value:1},
                ]} margin={{top:14,right:10,bottom:10,left:0}}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,60,100,0.07)" vertical={false}/>
                  <XAxis dataKey="name" tick={{fill:T.gray,fontSize:10}} axisLine={false} tickLine={false}/>
                  <YAxis tick={{fill:T.gray,fontSize:9}} axisLine={false} tickLine={false} width={30}/>
                  <Tooltip content={<CTip/>}/>
                  <Bar dataKey="value" name="Avg Days" fill={T.tealD} radius={[4,4,0,0]}>
                    <LabelList dataKey="value" position="top" style={{fill:T.navy,fontSize:11,fontWeight:800}}/>
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </GC>
          </div>

          {/* TAT detail table */}
          <GC style={{padding:18}}>
            <SH title="PR-PO TAT Detail" sub="PR → QMS (Budget Date) → NFA Approved → PO → PO Released"/>
            <div style={{overflowY:'auto',maxHeight:'50vh'}}>
              <table style={{width:'100%',borderCollapse:'collapse',fontSize:11}}>
                <thead>
                  <tr style={{position:'sticky',top:0,background:'rgba(255,255,255,0.98)',zIndex:1}}>
                    {['SAP PR','Description','PR Date','QMS EPR','NFA','PO #','PO Date','PO TAT','Total TAT','NFA Pendancy'].map(h=>(
                      <th key={h} style={{padding:'7px 10px',textAlign:'left',fontSize:9,fontWeight:800,
                        color:T.tealD,textTransform:'uppercase',borderBottom:'2px solid rgba(0,105,120,0.12)',whiteSpace:'nowrap'}}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.filter(r=>r.po_num)
                    .sort((a,b)=>(b.tat_days||0)-(a.tat_days||0))
                    .slice(0,200).map((r,i)=>(
                    <tr key={i} style={{borderBottom:'1px solid rgba(0,60,100,0.05)',
                      background:i%2===0?'transparent':'rgba(0,151,167,0.02)'}}>
                      <td style={{padding:'5px 10px',color:T.tealD,fontWeight:800}}>{r.sap_pr}</td>
                      <td style={{padding:'5px 10px',color:T.navy,maxWidth:180,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{r.desc||'—'}</td>
                      <td style={{padding:'5px 10px',color:T.gray,fontSize:10,whiteSpace:'nowrap'}}>{r.pr_date||'—'}</td>
                      <td style={{padding:'5px 10px',color:T.textM}}>{r.qms_epr||'—'}</td>
                      <td style={{padding:'5px 10px',textAlign:'center'}}>{r.has_nfa?'✅':'—'}</td>
                      <td style={{padding:'5px 10px',color:T.tealD,fontWeight:700}}>{r.po_num||'—'}</td>
                      <td style={{padding:'5px 10px',color:T.gray,fontSize:10}}>{r.po_date||'—'}</td>
                      <td style={{padding:'5px 10px',fontWeight:700,color:T.teal}}>{r.tat_days||'—'}</td>
                      <td style={{padding:'5px 10px',fontWeight:800,
                        color:r.tat_days>100?T.red:r.tat_days>50?T.amber:T.green}}>
                        {r.tat_days||'—'}
                      </td>
                      <td style={{padding:'5px 10px',color:T.purple,fontSize:10}}>
                        {!r.has_nfa?'No NFA':r.stage==='Pending at NFA'?'Pending at NFA':'—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </GC>
        </>}

      </main>

      {/* PR DETAIL MODAL */}
      {selectedPR&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.5)',zIndex:200,
          display:'flex',alignItems:'center',justifyContent:'center',padding:20}}
          onClick={()=>setSPR(null)}>
          <div style={{background:'#fff',borderRadius:16,padding:24,maxWidth:700,width:'100%',maxHeight:'80vh',overflowY:'auto'}}
            onClick={e=>e.stopPropagation()}>
            <div style={{display:'flex',justifyContent:'space-between',marginBottom:16}}>
              <h3 style={{color:T.navy,margin:0,fontSize:16}}>SAP PR #{selectedPR.sap_pr}</h3>
              <button onClick={()=>setSPR(null)} style={{background:'none',border:'none',fontSize:20,cursor:'pointer',color:T.gray}}>✕</button>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
              {[
                ['Description', selectedPR.desc],
                ['Department',  selectedPR.dept],
                ['Plant',       selectedPR.plant],
                ['PR Date',     selectedPR.pr_date],
                ['QMS EPR #',   selectedPR.qms_epr],
                ['Has NFA',     selectedPR.has_nfa?'Yes':'No'],
                ['NFA Vendor',  selectedPR.nfa_vendor||'—'],
                ['NFA Amount',  selectedPR.nfa_amount>0?`₹${(selectedPR.nfa_amount/1e5).toFixed(2)}L`:'—'],
                ['PO Number',   selectedPR.po_num||'—'],
                ['PO Value',    selectedPR.po_value>0?`₹${(selectedPR.po_value/1e5).toFixed(1)}L`:'—'],
                ['PO Released', selectedPR.po_released?'✅ Yes':'❌ No'],
                ['TAT Days',    selectedPR.tat_days||'—'],
                ['Current Stage',selectedPR.stage],
              ].map(([l,v],i)=>(
                <div key={i} style={{background:'rgba(0,60,100,0.03)',borderRadius:8,padding:'8px 12px'}}>
                  <p style={{fontSize:9,color:T.gray,fontWeight:700,textTransform:'uppercase',margin:0}}>{l}</p>
                  <p style={{fontSize:12,color:T.navy,fontWeight:700,margin:'2px 0 0'}}>{String(v||'—')}</p>
                </div>
              ))}
            </div>
            {/* Journey progress bar */}
            <div style={{marginTop:16}}>
              <p style={{fontSize:10,fontWeight:800,color:T.tealD,textTransform:'uppercase',margin:'0 0 8px'}}>Journey Progress</p>
              <div style={{display:'flex',gap:4}}>
                {[
                  {l:'PR',    done:true,                   c:T.teal},
                  {l:'L1',    done:selectedPR.l1,          c:T.green},
                  {l:'L2',    done:selectedPR.l2,          c:T.green},
                  {l:'CP',    done:selectedPR.cp,          c:T.blue},
                  {l:'NFA',   done:selectedPR.has_nfa,     c:T.purple},
                  {l:'Vendor',done:!!selectedPR.nfa_vendor,c:T.amber},
                  {l:'PO',    done:!!selectedPR.po_num,    c:T.tealD},
                  {l:'Done',  done:selectedPR.po_released, c:T.green},
                ].map((s,i)=>(
                  <div key={i} style={{flex:1,textAlign:'center'}}>
                    <div style={{height:8,background:s.done?s.c:'rgba(0,60,100,0.08)',borderRadius:4,marginBottom:4}}/>
                    <span style={{fontSize:8,color:s.done?s.c:T.gray,fontWeight:700}}>{s.l}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
