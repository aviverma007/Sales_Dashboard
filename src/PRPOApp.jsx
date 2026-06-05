import React, { useState, useEffect, useMemo } from 'react';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, LabelList, ComposedChart, AreaChart, Area
} from 'recharts';

// ─── API ENDPOINTS (VendorGlobe) ────────────────────────────────────────────
const VG = {
  PR:     'https://smartworlddevelopersonline.com/bi-power/bi_prs.php',
  NFA:    'https://smartworlddevelopersonline.com/bi-power/bi_nfas.php',
  MARKET: 'https://smartworlddevelopersonline.com/bi-power/bi_market_place.php',
  EOT:    'https://smartworlddevelopersonline.com/bi-power/bi_eot.php',
};

// ─── SAP SQL CONFIG (via backend proxy — see note below) ────────────────────
// Direct SQL from browser is not possible. Use a lightweight PHP/Node proxy
// at /api/sap.php that connects to 192.168.66.33 with sa / Admin#123 / SWDBIDB
// For now all data comes from VendorGlobe APIs
const SAP_PROXY = '/api/sap_query.php'; // deploy this proxy on your server

const T = {
  navy:'#0d2137', tealD:'#006978', teal:'#0097a7', tealL:'#00bcd4',
  amber:'#f57c00', red:'#d32f2f', green:'#2e7d32', purple:'#6a1b9a',
  gray:'#546e7a', textM:'#1a2f45', textL:'#2d4a66', white:'#fff',
};
const CC = ['#0097a7','#1565c0','#2e7d32','#f57c00','#d32f2f','#6a1b9a','#00838f','#37474f','#e65100','#00695c'];

// ─── UI COMPONENTS ────────────────────────────────────────────────────────────
const GC = ({children,style={}}) => (
  <div style={{background:'rgba(255,255,255,0.97)',backdropFilter:'blur(20px)',WebkitBackdropFilter:'blur(20px)',
    border:'1px solid rgba(255,255,255,0.9)',borderRadius:14,
    boxShadow:'0 4px 24px rgba(0,80,120,0.10)',position:'relative',overflow:'hidden',...style}}>
    {children}
  </div>
);

const KpiCard = ({icon,label,value,sub,color,pct,loading}) => (
  <div style={{background:'rgba(255,255,255,0.97)',backdropFilter:'blur(20px)',WebkitBackdropFilter:'blur(20px)',
    border:'1px solid rgba(255,255,255,0.9)',borderLeft:`4px solid ${color}`,borderRadius:14,
    boxShadow:'0 4px 24px rgba(0,40,80,0.15)',padding:'16px 18px',position:'relative',overflow:'hidden'}}>
    <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',marginBottom:8}}>
      <span style={{fontSize:22,lineHeight:1}}>{icon}</span>
      {pct!=null&&<span style={{fontSize:9,fontWeight:800,color:'#fff',background:color,borderRadius:20,padding:'2px 8px'}}>{pct}%</span>}
    </div>
    {loading
      ? <div style={{height:32,background:'rgba(0,60,100,0.07)',borderRadius:6,marginBottom:8,animation:'pulse 1.5s infinite'}}/>
      : <div style={{fontSize:26,fontWeight:900,color,letterSpacing:-1,lineHeight:1,marginBottom:4}}>{value}</div>
    }
    <div style={{fontSize:10,fontWeight:800,color:T.textM,textTransform:'uppercase',letterSpacing:0.5,marginBottom:3}}>{label}</div>
    <div style={{fontSize:9,color:T.gray}}>{sub}</div>
    {pct!=null&&!loading&&<div style={{marginTop:10,height:4,background:'rgba(0,60,100,0.08)',borderRadius:2,overflow:'hidden'}}>
      <div style={{width:`${Math.min(pct,100)}%`,height:'100%',background:color,borderRadius:2}}/>
    </div>}
  </div>
);

const CTip = ({active,payload,label}) => {
  if(!active||!payload?.length) return null;
  return (
    <div style={{background:'rgba(255,255,255,0.98)',border:'1px solid rgba(0,151,167,0.3)',borderRadius:10,
      padding:'8px 12px',boxShadow:'0 8px 32px rgba(0,80,120,0.18)',fontSize:11}}>
      <p style={{color:T.tealD,fontWeight:700,marginBottom:4}}>{label}</p>
      {payload.map((p,i)=><p key={i} style={{color:p.color||T.text,margin:'2px 0'}}>
        <span style={{color:T.textL}}>{p.name}: </span>{typeof p.value==='number'?p.value.toLocaleString():p.value}
      </p>)}
    </div>
  );
};

const FSelect = ({label,value,onChange,options}) => (
  <div>
    <div style={{fontSize:9,fontWeight:800,color:'rgba(255,255,255,0.8)',textTransform:'uppercase',letterSpacing:0.5,marginBottom:3}}>{label}</div>
    <select value={value} onChange={e=>onChange(e.target.value)}
      style={{width:'100%',fontSize:11,fontWeight:600,color:T.navy,background:'rgba(255,255,255,0.95)',
        border:'1px solid rgba(255,255,255,0.4)',borderRadius:8,padding:'5px 8px',cursor:'pointer'}}>
      <option value="">All</option>
      {options.map(o=><option key={o} value={o}>{o}</option>)}
    </select>
  </div>
);

const SH = ({title,sub}) => (
  <div style={{marginBottom:12}}>
    <p style={{fontSize:11,fontWeight:800,color:T.tealD,letterSpacing:0.4,margin:0,textTransform:'uppercase'}}>{title}</p>
    {sub&&<p style={{fontSize:10,color:T.textM,margin:'2px 0 0'}}>{sub}</p>}
  </div>
);

const Badge = ({v,color}) => (
  <span style={{fontSize:9,fontWeight:800,color:'#fff',background:color,borderRadius:4,padding:'2px 7px',whiteSpace:'nowrap'}}>{v}</span>
);

const Spinner = () => (
  <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:200,gap:12}}>
    <div style={{width:32,height:32,border:`3px solid rgba(0,151,167,0.2)`,borderTop:`3px solid ${T.teal}`,
      borderRadius:'50%',animation:'spin 0.8s linear infinite'}}/>
    <span style={{color:T.gray,fontSize:13,fontWeight:600}}>Loading data…</span>
  </div>
);

// ─── MAIN APP ─────────────────────────────────────────────────────────────────
export default function PRPOApp() {
  const [tab, setTab]       = useState('overview');
  const [prData, setPR]     = useState([]);
  const [nfaData, setNFA]   = useState([]);
  const [mktData, setMkt]   = useState([]);
  const [eotData, setEOT]   = useState([]);
  const [sapData, setSAP]   = useState([]);
  const [loading, setLoading] = useState({pr:true,nfa:true,mkt:true,eot:true,sap:true});
  const [error, setError]   = useState({});
  const [lastRefresh, setLastRefresh] = useState(null);

  // Filters
  const [fVendor, setFVendor]   = useState('');
  const [fStatus, setFStatus]   = useState('');
  const [fProject, setFProject] = useState('');
  const [fCategory, setFCat]    = useState('');

  const logout = () => { sessionStorage.removeItem('prpo_auth'); window.location.reload(); };

  // ── Fetch all VendorGlobe APIs ──────────────────────────────────────────────
  const fetchAPI = async (url, setter, key) => {
    try {
      const res = await fetch(url, {
        headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
        mode: 'cors',
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const text = await res.text();
      let data;
      try { data = JSON.parse(text); }
      catch { data = []; }
      setter(Array.isArray(data) ? data : data?.data || data?.records || Object.values(data)||[]);
    } catch(e) {
      setError(prev=>({...prev,[key]:e.message}));
    } finally {
      setLoading(prev=>({...prev,[key]:false}));
    }
  };

  // ── Fetch SAP via proxy ─────────────────────────────────────────────────────
  const fetchSAP = async () => {
    try {
      const res = await fetch(SAP_PROXY, {
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body: JSON.stringify({
          host:'192.168.66.33', user:'sa', password:'Admin#123', database:'SWDBIDB',
          query:`SELECT TOP 500 * FROM EKKO WHERE BEDAT >= DATEADD(year,-1,GETDATE()) ORDER BY BEDAT DESC`
        })
      });
      if(!res.ok) throw new Error(`SAP proxy HTTP ${res.status}`);
      const data = await res.json();
      setSAP(Array.isArray(data)?data:data?.records||[]);
    } catch(e) {
      setError(prev=>({...prev,sap:e.message}));
    } finally {
      setLoading(prev=>({...prev,sap:false}));
    }
  };

  const refreshAll = () => {
    setLoading({pr:true,nfa:true,mkt:true,eot:true,sap:true});
    setError({});
    fetchAPI(VG.PR,     setPR,  'pr');
    fetchAPI(VG.NFA,    setNFA, 'nfa');
    fetchAPI(VG.MARKET, setMkt, 'mkt');
    fetchAPI(VG.EOT,    setEOT, 'eot');
    fetchSAP();
    setLastRefresh(new Date());
  };

  useEffect(()=>{ refreshAll(); },[]);

  // ── Derived KPIs ────────────────────────────────────────────────────────────
  const isLoading = Object.values(loading).some(Boolean);

  const fmt = n => {
    if(n==null||isNaN(n)) return '—';
    if(n>=1e7) return '₹'+(n/1e7).toFixed(1)+'Cr';
    if(n>=1e5) return '₹'+(n/1e5).toFixed(1)+'L';
    return '₹'+n.toLocaleString('en-IN');
  };
  const fmtN = n => n==null?'—':n.toLocaleString('en-IN');

  // PR KPIs — adapt field names once we see actual API response
  const prKpi = useMemo(()=>{
    const total   = prData.length;
    const open    = prData.filter(r=>r.status?.toLowerCase().includes('open')||r.Status?.toLowerCase().includes('open')).length;
    const pending = prData.filter(r=>r.status?.toLowerCase().includes('pending')||r.Status?.toLowerCase().includes('pending')).length;
    const approved= prData.filter(r=>r.status?.toLowerCase().includes('approved')||r.Status?.toLowerCase().includes('approved')).length;
    const totalVal= prData.reduce((s,r)=>s+(parseFloat(r.value||r.Value||r.amount||r.Amount||0)),0);
    return {total,open,pending,approved,totalVal};
  },[prData]);

  const nfaKpi = useMemo(()=>{
    const total   = nfaData.length;
    const pending = nfaData.filter(r=>String(r.status||r.Status||'').toLowerCase().includes('pending')).length;
    const approved= nfaData.filter(r=>String(r.status||r.Status||'').toLowerCase().includes('approved')).length;
    const totalVal= nfaData.reduce((s,r)=>s+(parseFloat(r.value||r.Value||r.amount||r.Amount||0)),0);
    return {total,pending,approved,totalVal};
  },[nfaData]);

  const eotKpi = useMemo(()=>{
    const total   = eotData.length;
    const active  = eotData.filter(r=>String(r.status||r.Status||'').toLowerCase().includes('active')).length;
    const expired = eotData.filter(r=>String(r.status||r.Status||'').toLowerCase().includes('expir')).length;
    return {total,active,expired};
  },[eotData]);

  const sapKpi = useMemo(()=>{
    const total   = sapData.length;
    const totalVal= sapData.reduce((s,r)=>s+(parseFloat(r.NETWR||r.netwr||r.value||0)),0);
    const vendors = new Set(sapData.map(r=>r.LIFNR||r.vendor||'')).size;
    return {total,totalVal,vendors};
  },[sapData]);

  // Filter options from PR data (largest dataset)
  const filterOpts = useMemo(()=>{
    const u = (arr,key) => [...new Set(arr.map(r=>r[key]).filter(Boolean))].sort();
    return {
      vendor:  u(prData, Object.keys(prData[0]||{}).find(k=>k.toLowerCase().includes('vendor'))||'vendor'),
      status:  u(prData, Object.keys(prData[0]||{}).find(k=>k.toLowerCase()==='status')||'status'),
      project: u(prData, Object.keys(prData[0]||{}).find(k=>k.toLowerCase().includes('project')||k.toLowerCase().includes('wbs'))||'project'),
      category:u(prData, Object.keys(prData[0]||{}).find(k=>k.toLowerCase().includes('categ')||k.toLowerCase().includes('material'))||'category'),
    };
  },[prData]);

  // ── Chart data helpers ──────────────────────────────────────────────────────
  const statusChart = useMemo(()=>{
    const cnt = {};
    prData.forEach(r=>{ const s=r.status||r.Status||'Unknown'; cnt[s]=(cnt[s]||0)+1; });
    return Object.entries(cnt).map(([name,value])=>({name,value})).sort((a,b)=>b.value-a.value);
  },[prData]);

  const nfaStatusChart = useMemo(()=>{
    const cnt = {};
    nfaData.forEach(r=>{ const s=r.status||r.Status||'Unknown'; cnt[s]=(cnt[s]||0)+1; });
    return Object.entries(cnt).map(([name,value])=>({name,value})).sort((a,b)=>b.value-a.value);
  },[nfaData]);

  const mktCategoryChart = useMemo(()=>{
    const cnt = {};
    const valKey = Object.keys(mktData[0]||{}).find(k=>k.toLowerCase().includes('value')||k.toLowerCase().includes('amount'))||'value';
    const catKey = Object.keys(mktData[0]||{}).find(k=>k.toLowerCase().includes('categ')||k.toLowerCase().includes('material')||k.toLowerCase().includes('item'))||'category';
    mktData.forEach(r=>{ const c=r[catKey]||'Other'; cnt[c]=(cnt[c]||0)+(parseFloat(r[valKey])||1); });
    return Object.entries(cnt).map(([name,value])=>({name,value:+value.toFixed(0)})).sort((a,b)=>b.value-a.value).slice(0,10);
  },[mktData]);

  const TABS = [
    {k:'overview', l:'📊 Overview'},
    {k:'pr',       l:'📝 PR Details'},
    {k:'nfa',      l:'📋 NFA Details'},
    {k:'market',   l:'🛒 Marketplace'},
    {k:'eot',      l:'⏰ EOT Status'},
    {k:'sap',      l:'🏭 SAP Data'},
  ];

  // Status color helper
  const statusColor = s => {
    s = String(s||'').toLowerCase();
    if(s.includes('approved')||s.includes('complete')) return T.green;
    if(s.includes('pending')||s.includes('open'))      return T.amber;
    if(s.includes('reject')||s.includes('cancel'))     return T.red;
    if(s.includes('active'))                           return T.teal;
    return T.gray;
  };

  const navBg = 'linear-gradient(135deg,#0d2137 0%,#1a3a5c 60%,#006978 100%)';

  // ── RAW TABLE RENDERER ─────────────────────────────────────────────────────
  const RawTable = ({data,title,loading:l,err}) => {
    if(l) return <Spinner/>;
    if(err) return (
      <div style={{padding:32,textAlign:'center',color:T.red}}>
        <div style={{fontSize:32,marginBottom:8}}>⚠️</div>
        <p style={{fontWeight:700}}>Failed to load {title}</p>
        <p style={{fontSize:11,color:T.gray}}>{err}</p>
        <p style={{fontSize:10,color:T.textL,marginTop:8}}>Check CORS settings on the API server or use a proxy</p>
      </div>
    );
    if(!data.length) return <div style={{padding:32,textAlign:'center',color:T.gray,fontSize:13}}>No data returned from API</div>;
    const keys = Object.keys(data[0]).slice(0,12);
    return (
      <div style={{overflowX:'auto'}}>
        <table style={{width:'100%',borderCollapse:'collapse',fontSize:11}}>
          <thead>
            <tr style={{background:'rgba(0,105,120,0.07)'}}>
              {keys.map(k=>(
                <th key={k} style={{padding:'7px 10px',textAlign:'left',fontSize:9,fontWeight:800,
                  color:T.tealD,textTransform:'uppercase',letterSpacing:0.4,
                  borderBottom:`2px solid rgba(0,105,120,0.15)`,whiteSpace:'nowrap'}}>{k}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.slice(0,200).map((r,i)=>(
              <tr key={i} style={{borderBottom:'1px solid rgba(0,60,100,0.05)',
                background:i%2===0?'transparent':'rgba(0,151,167,0.02)'}}>
                {keys.map(k=>(
                  <td key={k} style={{padding:'5px 10px',color:
                    k.toLowerCase().includes('status')?statusColor(r[k]):T.textM,
                    fontWeight:k.toLowerCase().includes('status')?700:400,
                    maxWidth:160,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
                    {r[k]!=null?String(r[k]):'—'}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        {data.length>200&&<p style={{fontSize:10,color:T.gray,textAlign:'center',padding:'8px',margin:0}}>Showing 200 of {data.length} records</p>}
      </div>
    );
  };

  return (
    <div style={{minHeight:'100vh',backgroundImage:'url(/bg.jpg)',backgroundSize:'cover',
      backgroundPosition:'center',backgroundAttachment:'fixed',fontFamily:'Inter,sans-serif'}}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}} @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}`}</style>
      <div style={{minHeight:'100vh',background:'rgba(255,255,255,0.03)'}}>

        {/* ── NAV ── */}
        <div style={{background:navBg,padding:'0 24px',display:'flex',alignItems:'center',
          justifyContent:'space-between',height:54,position:'sticky',top:0,zIndex:100,
          boxShadow:'0 2px 20px rgba(0,0,0,0.3)'}}>
          <div style={{display:'flex',alignItems:'center',gap:12}}>
            <img src="/swd-logo.png" alt="" style={{width:28,height:28,objectFit:'contain'}}/>
            <div>
              <p style={{color:'#fff',fontWeight:900,fontSize:13,margin:0}}>PR / PO Intelligence</p>
              <p style={{color:'rgba(255,255,255,0.55)',fontSize:9,margin:0,fontWeight:600}}>SMARTWORLD · PROCUREMENT · VendorGlobe + SAP</p>
            </div>
          </div>
          <div style={{display:'flex',gap:4}}>
            {TABS.map(t=>(
              <button key={t.k} onClick={()=>setTab(t.k)}
                style={{background:tab===t.k?'rgba(255,255,255,0.18)':'transparent',color:'#fff',
                  border:tab===t.k?'1px solid rgba(255,255,255,0.35)':'1px solid transparent',
                  borderRadius:8,padding:'5px 12px',fontSize:11,fontWeight:700,cursor:'pointer'}}>
                {t.l}
              </button>
            ))}
          </div>
          <div style={{display:'flex',alignItems:'center',gap:10}}>
            <button onClick={refreshAll}
              style={{background:'rgba(0,151,167,0.7)',color:'#fff',border:'none',borderRadius:8,
                padding:'5px 12px',fontSize:11,fontWeight:700,cursor:'pointer'}}>
              🔄 Refresh
            </button>
            {lastRefresh&&<span style={{fontSize:9,color:'rgba(255,255,255,0.5)'}}>
              {lastRefresh.toLocaleTimeString()}
            </span>}
            <button onClick={logout}
              style={{background:'rgba(211,47,47,0.7)',color:'#fff',border:'none',
                borderRadius:8,padding:'5px 12px',fontSize:11,fontWeight:700,cursor:'pointer'}}>
              🚪 Logout
            </button>
          </div>
        </div>

        {/* ── FILTER BAR ── */}
        <div style={{background:'linear-gradient(90deg,#0d2137,#1a3a5c,#006978)',padding:'10px 24px'}}>
          <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr) auto',gap:10,alignItems:'end'}}>
            <FSelect label="Vendor"   value={fVendor}  onChange={setFVendor}  options={filterOpts.vendor||[]}/>
            <FSelect label="Status"   value={fStatus}  onChange={setFStatus}  options={filterOpts.status||[]}/>
            <FSelect label="Project"  value={fProject} onChange={setFProject} options={filterOpts.project||[]}/>
            <FSelect label="Category" value={fCategory} onChange={setFCat}   options={filterOpts.category||[]}/>
            {(fVendor||fStatus||fProject||fCategory)&&(
              <button onClick={()=>{setFVendor('');setFStatus('');setFProject('');setFCat('');}}
                style={{background:'rgba(211,47,47,0.7)',color:'#fff',border:'none',borderRadius:8,
                  padding:'5px 12px',fontSize:10,fontWeight:700,cursor:'pointer',whiteSpace:'nowrap'}}>
                ✕ Reset
              </button>
            )}
          </div>
        </div>

        <main style={{maxWidth:1600,margin:'0 auto',padding:'16px 20px 40px',display:'flex',flexDirection:'column',gap:14}}>

          {/* ══ OVERVIEW TAB ══ */}
          {tab==='overview'&&(
            <>
              {/* KPI Row 1 — VendorGlobe */}
              <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:12}}>
                <KpiCard icon="📝" label="Total PRs"       value={fmtN(prKpi.total)}   color={T.teal}   sub={`${prKpi.open} open · ${prKpi.approved} approved`}  loading={loading.pr}  pct={null}/>
                <KpiCard icon="💰" label="PR Value"        value={fmt(prKpi.totalVal)} color={T.amber}  sub="Total value of all PRs"                              loading={loading.pr}  pct={null}/>
                <KpiCard icon="📋" label="Total NFAs"      value={fmtN(nfaKpi.total)}  color={T.purple} sub={`${nfaKpi.pending} pending · ${nfaKpi.approved} approved`} loading={loading.nfa} pct={null}/>
                <KpiCard icon="💼" label="NFA Value"       value={fmt(nfaKpi.totalVal)} color={T.green} sub="Total NFA amount"                                    loading={loading.nfa} pct={null}/>
              </div>
              {/* KPI Row 2 */}
              <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:12}}>
                <KpiCard icon="🛒" label="Marketplace Items" value={fmtN(mktData.length)} color={T.tealD} sub="Items listed on marketplace"                       loading={loading.mkt} pct={null}/>
                <KpiCard icon="⏰" label="EOT Records"     value={fmtN(eotKpi.total)}  color={T.orange} sub={`${eotKpi.active} active · ${eotKpi.expired} expired`} loading={loading.eot} pct={null}/>
                <KpiCard icon="🏭" label="SAP POs"         value={fmtN(sapKpi.total)}  color={T.navy}   sub={`${sapKpi.vendors} vendors · via SQL`}               loading={loading.sap} pct={null}/>
                <KpiCard icon="💳" label="SAP PO Value"    value={fmt(sapKpi.totalVal)} color={T.red}   sub="Total PO value from SAP EKKO"                        loading={loading.sap} pct={null}/>
              </div>

              {/* Charts Row */}
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:12}}>
                <GC style={{padding:18}}>
                  <SH title="PR Status Distribution"/>
                  {loading.pr?<Spinner/>:error.pr?(
                    <div style={{textAlign:'center',padding:32,color:T.red}}>
                      <div style={{fontSize:28}}>⚠️</div>
                      <p style={{fontWeight:700,margin:'8px 0 4px'}}>API Error</p>
                      <p style={{fontSize:10,color:T.gray}}>{error.pr}</p>
                    </div>
                  ):(
                    <>
                      <ResponsiveContainer width="100%" height={160}>
                        <PieChart>
                          <Pie data={statusChart} cx="50%" cy="50%" innerRadius={40} outerRadius={68}
                            paddingAngle={2} dataKey="value" strokeWidth={1.5} stroke="#fff">
                            {statusChart.map((_,i)=><Cell key={i} fill={CC[i%CC.length]}/>)}
                          </Pie>
                          <Tooltip content={<CTip/>}/>
                        </PieChart>
                      </ResponsiveContainer>
                      <div style={{display:'flex',flexDirection:'column',gap:5}}>
                        {statusChart.slice(0,5).map((d,i)=>(
                          <div key={i} style={{display:'flex',alignItems:'center',gap:6}}>
                            <div style={{width:8,height:8,borderRadius:2,background:CC[i],flexShrink:0}}/>
                            <span style={{fontSize:9,color:T.textM,flex:1,fontWeight:600}}>{d.name}</span>
                            <span style={{fontSize:10,fontWeight:800,color:CC[i]}}>{d.value.toLocaleString()}</span>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </GC>
                <GC style={{padding:18}}>
                  <SH title="NFA Status Distribution"/>
                  {loading.nfa?<Spinner/>:error.nfa?(
                    <div style={{textAlign:'center',padding:32,color:T.red}}>
                      <div style={{fontSize:28}}>⚠️</div>
                      <p style={{fontWeight:700,margin:'8px 0 4px'}}>API Error</p>
                      <p style={{fontSize:10,color:T.gray}}>{error.nfa}</p>
                    </div>
                  ):(
                    <>
                      <ResponsiveContainer width="100%" height={160}>
                        <PieChart>
                          <Pie data={nfaStatusChart} cx="50%" cy="50%" innerRadius={40} outerRadius={68}
                            paddingAngle={2} dataKey="value" strokeWidth={1.5} stroke="#fff">
                            {nfaStatusChart.map((_,i)=><Cell key={i} fill={CC[(i+2)%CC.length]}/>)}
                          </Pie>
                          <Tooltip content={<CTip/>}/>
                        </PieChart>
                      </ResponsiveContainer>
                      <div style={{display:'flex',flexDirection:'column',gap:5}}>
                        {nfaStatusChart.slice(0,5).map((d,i)=>(
                          <div key={i} style={{display:'flex',alignItems:'center',gap:6}}>
                            <div style={{width:8,height:8,borderRadius:2,background:CC[(i+2)%CC.length],flexShrink:0}}/>
                            <span style={{fontSize:9,color:T.textM,flex:1,fontWeight:600}}>{d.name}</span>
                            <span style={{fontSize:10,fontWeight:800,color:CC[(i+2)%CC.length]}}>{d.value.toLocaleString()}</span>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </GC>
                <GC style={{padding:18}}>
                  <SH title="Marketplace — Top Categories"/>
                  {loading.mkt?<Spinner/>:error.mkt?(
                    <div style={{textAlign:'center',padding:32,color:T.red}}>
                      <div style={{fontSize:28}}>⚠️</div>
                      <p style={{fontWeight:700,margin:'8px 0 4px'}}>API Error</p>
                      <p style={{fontSize:10,color:T.gray}}>{error.mkt}</p>
                    </div>
                  ):(
                    <div style={{display:'flex',flexDirection:'column',gap:7}}>
                      {mktCategoryChart.slice(0,8).map((d,i)=>{
                        const max = mktCategoryChart[0]?.value||1;
                        return (
                          <div key={i}>
                            <div style={{display:'flex',justifyContent:'space-between',marginBottom:2}}>
                              <span style={{fontSize:10,fontWeight:700,color:T.text,maxWidth:160,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{d.name}</span>
                              <span style={{fontSize:10,fontWeight:800,color:CC[i%CC.length]}}>{d.value.toLocaleString()}</span>
                            </div>
                            <div style={{height:5,background:'rgba(0,60,100,0.07)',borderRadius:3}}>
                              <div style={{width:`${Math.round(d.value/max*100)}%`,height:'100%',background:CC[i%CC.length],borderRadius:3,opacity:0.85}}/>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </GC>
              </div>

              {/* API Status panel */}
              <GC style={{padding:16}}>
                <div style={{display:'flex',alignItems:'center',gap:16,flexWrap:'wrap'}}>
                  <span style={{fontSize:11,fontWeight:800,color:T.tealD,textTransform:'uppercase',letterSpacing:0.4}}>Data Sources</span>
                  {[
                    {name:'PR API (VendorGlobe)',  l:loading.pr,  e:error.pr,  n:prData.length},
                    {name:'NFA API (VendorGlobe)', l:loading.nfa, e:error.nfa, n:nfaData.length},
                    {name:'Market API',            l:loading.mkt, e:error.mkt, n:mktData.length},
                    {name:'EOT API',               l:loading.eot, e:error.eot, n:eotData.length},
                    {name:'SAP SQL (EKKO)',        l:loading.sap, e:error.sap, n:sapData.length},
                  ].map((s,i)=>(
                    <div key={i} style={{display:'flex',alignItems:'center',gap:6,background:'rgba(0,60,100,0.04)',
                      border:'1px solid rgba(0,60,100,0.1)',borderRadius:8,padding:'5px 10px'}}>
                      <div style={{width:8,height:8,borderRadius:'50%',flexShrink:0,
                        background:s.l?T.amber:s.e?T.red:T.green}}/>
                      <span style={{fontSize:10,fontWeight:700,color:T.textM}}>{s.name}</span>
                      <span style={{fontSize:9,color:T.gray}}>{s.l?'Loading…':s.e?'Error':s.n+' records'}</span>
                    </div>
                  ))}
                </div>
              </GC>
            </>
          )}

          {/* ══ PR TAB ══ */}
          {tab==='pr'&&(
            <GC style={{padding:18}}>
              <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:14}}>
                <SH title="Purchase Request Details" sub={`${prData.length} records from VendorGlobe`}/>
                {prData.length>0&&<span style={{fontSize:10,color:T.gray}}>{Object.keys(prData[0]).length} columns available</span>}
              </div>
              <RawTable data={prData} title="PR" loading={loading.pr} err={error.pr}/>
            </GC>
          )}

          {/* ══ NFA TAB ══ */}
          {tab==='nfa'&&(
            <GC style={{padding:18}}>
              <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:14}}>
                <SH title="NFA Details" sub={`${nfaData.length} records from VendorGlobe`}/>
                {nfaData.length>0&&<span style={{fontSize:10,color:T.gray}}>{Object.keys(nfaData[0]).length} columns available</span>}
              </div>
              <RawTable data={nfaData} title="NFA" loading={loading.nfa} err={error.nfa}/>
            </GC>
          )}

          {/* ══ MARKET TAB ══ */}
          {tab==='market'&&(
            <GC style={{padding:18}}>
              <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:14}}>
                <SH title="Marketplace Details" sub={`${mktData.length} records from VendorGlobe`}/>
                {mktData.length>0&&<span style={{fontSize:10,color:T.gray}}>{Object.keys(mktData[0]).length} columns available</span>}
              </div>
              <RawTable data={mktData} title="Marketplace" loading={loading.mkt} err={error.mkt}/>
            </GC>
          )}

          {/* ══ EOT TAB ══ */}
          {tab==='eot'&&(
            <GC style={{padding:18}}>
              <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:14}}>
                <SH title="EOT Details" sub={`${eotData.length} records from VendorGlobe`}/>
                {eotData.length>0&&<span style={{fontSize:10,color:T.gray}}>{Object.keys(eotData[0]).length} columns available</span>}
              </div>
              <RawTable data={eotData} title="EOT" loading={loading.eot} err={error.eot}/>
            </GC>
          )}

          {/* ══ SAP TAB ══ */}
          {tab==='sap'&&(
            <GC style={{padding:18}}>
              <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:14}}>
                <SH title="SAP Data — EKKO (Purchase Orders)" sub={`DB: SWDBIDB @ 192.168.66.33 · ${sapData.length} records`}/>
                {sapData.length>0&&<span style={{fontSize:10,color:T.gray}}>{Object.keys(sapData[0]).length} columns</span>}
              </div>
              {error.sap&&(
                <div style={{background:'rgba(211,47,47,0.05)',border:'1px solid rgba(211,47,47,0.2)',
                  borderRadius:10,padding:'14px 18px',marginBottom:14}}>
                  <p style={{fontWeight:700,color:T.red,margin:'0 0 4px',fontSize:12}}>⚠️ SAP Connection Error</p>
                  <p style={{fontSize:11,color:T.gray,margin:'0 0 8px'}}>{error.sap}</p>
                  <p style={{fontSize:10,color:T.textL,margin:0}}>
                    Deploy <code style={{background:'rgba(0,60,100,0.07)',padding:'1px 6px',borderRadius:4}}>/api/sap_query.php</code> on your server to enable SQL queries.
                    It should accept POST with host/user/password/database/query and return JSON array.
                  </p>
                </div>
              )}
              <RawTable data={sapData} title="SAP EKKO" loading={loading.sap} err={null}/>
            </GC>
          )}

        </main>
      </div>
    </div>
  );
}
