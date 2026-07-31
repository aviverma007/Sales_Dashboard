import React, { useState } from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import CostApp from './CostApp';
import Cost2App from './Cost2App';
import CRMApp from './CRMApp';
import PRPOApp from './PRPOApp';
import CostBifurcationApp from './CostBifurcationApp';
import './index.css';

const USERS = {
  'Sales':   { password: 'Smart@2026', profile: 'sales',    sessionKey: 'sd_auth' },
  'Swsales': { password: 'Smart@2026', profile: 'swsales',  sessionKey: 'swsales_auth' },
  'CostOld': { password: 'Smart@2026', profile: 'cost',     sessionKey: 'cost_auth' },
  'Cost2':   { password: 'Smart@2026', profile: 'cost2',    sessionKey: 'cost2_auth' },
  'CRM':     { password: 'Smart@2026', profile: 'crm',      sessionKey: 'crm_auth' },
  'PRPO':    { password: 'Smart@2026', profile: 'prpo',     sessionKey: 'prpo_auth' },
  'Admin':   { password: 'Smart@2026', profile: 'admin',    sessionKey: 'admin_auth' },
  'Cost':    { password: 'cost',       profile: 'costbif',  sessionKey: 'costbif_auth' },
};

const DASHBOARDS = [
  {key:'sales',    name:'Sales Dashboard',   desc:'Overview · Collections · P&L', icon:'📊', g:'linear-gradient(135deg,#0097a7,#006978)', sessionKey:'sd_auth'},
  {key:'swsales',  name:'Sales (Overview)',  desc:'Overview + Collections only',  icon:'📈', g:'linear-gradient(135deg,#26a69a,#00796b)', sessionKey:'swsales_auth'},
  {key:'cost',     name:'Cost Intelligence', desc:'Cost analytics',               icon:'💰', g:'linear-gradient(135deg,#5c6bc0,#3949ab)', sessionKey:'cost_auth'},
  {key:'cost2',    name:'Cost 2',            desc:'Cost analytics II',            icon:'🧮', g:'linear-gradient(135deg,#7e57c2,#512da8)', sessionKey:'cost2_auth'},
  {key:'crm',      name:'CRM Intelligence',  desc:'Case management',              icon:'🎫', g:'linear-gradient(135deg,#1e88e5,#0d47a1)', sessionKey:'crm_auth'},
  {key:'prpo',     name:'PR / PO Journey',   desc:'Procurement tracking',         icon:'📦', g:'linear-gradient(135deg,#ef6c00,#e65100)', sessionKey:'prpo_auth'},
  {key:'costbif',  name:'Cost Bifurcation',  desc:'Cost breakdown by Budget Head & Department', icon:'🧾', g:'linear-gradient(135deg,#00897b,#00695c)', sessionKey:'costbif_auth'},
];

function AdminMenu({ onOpen, onLogout }) {
  return (
    <div style={{minHeight:'100vh',backgroundImage:'url(/bg.jpg)',backgroundSize:'cover',backgroundPosition:'center',display:'flex',alignItems:'center',justifyContent:'center',fontFamily:'Inter,sans-serif',padding:24}}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');`}</style>
      <div style={{background:'rgba(255,255,255,0.97)',borderRadius:22,padding:'34px 38px',width:760,maxWidth:'100%',boxShadow:'0 24px 80px rgba(0,40,80,0.28)'}}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:22}}>
          <div style={{display:'flex',alignItems:'center',gap:14}}>
            <div style={{width:56,height:56,borderRadius:16,background:'#0d1f3c',display:'flex',alignItems:'center',justifyContent:'center',overflow:'hidden'}}>
              <img src="/swd-logo.png" alt="SWD" style={{width:40,height:40,objectFit:'contain'}}/>
            </div>
            <div>
              <h2 style={{fontSize:21,fontWeight:900,color:'#0d2137',margin:'0 0 2px'}}>Admin Console</h2>
              <p style={{fontSize:12,color:'#546e7a',margin:0,fontWeight:500}}>Smartworld Group · Open any dashboard</p>
            </div>
          </div>
          <button onClick={onLogout} style={{background:'rgba(211,47,47,0.9)',color:'#fff',border:'none',borderRadius:10,padding:'9px 18px',fontSize:12,fontWeight:800,cursor:'pointer'}}>🚪 Logout</button>
        </div>
        <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:14}}>
          {DASHBOARDS.map(d=>(
            <button key={d.key} onClick={()=>{sessionStorage.setItem(d.sessionKey,'1');onOpen(d.key);}} style={{background:d.g,color:'#fff',border:'none',borderRadius:16,padding:'20px 16px',textAlign:'left',cursor:'pointer',boxShadow:'0 8px 22px rgba(0,40,70,0.18)',transition:'transform .18s ease, box-shadow .18s ease'}}
              onMouseOver={e=>{e.currentTarget.style.transform='translateY(-4px)';e.currentTarget.style.boxShadow='0 16px 34px rgba(0,40,70,0.30)';}}
              onMouseOut={e=>{e.currentTarget.style.transform='none';e.currentTarget.style.boxShadow='0 8px 22px rgba(0,40,70,0.18)';}}>
              <div style={{fontSize:30,marginBottom:8,filter:'drop-shadow(0 2px 4px rgba(0,0,0,0.25))'}}>{d.icon}</div>
              <div style={{fontSize:15,fontWeight:900,marginBottom:2}}>{d.name}</div>
              <div style={{fontSize:10.5,fontWeight:600,opacity:0.9}}>{d.desc}</div>
            </button>
          ))}
        </div>
        <p style={{textAlign:'center',fontSize:11,color:'#90a4ae',marginTop:22,marginBottom:0}}>Smartworld Group · Confidential</p>
      </div>
    </div>
  );
}

function Portal() {
  const [profile, setProfile] = useState(() => {
    if (sessionStorage.getItem('sd_auth')      === '1') return 'sales';
    if (sessionStorage.getItem('swsales_auth') === '1') return 'swsales';
    if (sessionStorage.getItem('cost_auth')    === '1') return 'cost';
    if (sessionStorage.getItem('cost2_auth')   === '1') return 'cost2';
    if (sessionStorage.getItem('crm_auth')     === '1') return 'crm';
    if (sessionStorage.getItem('prpo_auth')    === '1') return 'prpo';
    if (sessionStorage.getItem('admin_auth')   === '1') return 'admin';
    if (sessionStorage.getItem('costbif_auth') === '1') return 'costbif';
    return null;
  });

  const [u, setU]       = useState('');
  const [p, setP]       = useState('');
  const [show, setShow] = useState(false);
  const [err, setErr]   = useState('');

  const submit = () => {
    const key  = Object.keys(USERS).find(k => k.toLowerCase() === u.trim().toLowerCase());
    const user = key ? USERS[key] : null;
    if (user && p === user.password) {
      sessionStorage.setItem(user.sessionKey, '1');
      setProfile(user.profile);
    } else {
      setErr('Invalid username or password');
      setTimeout(() => setErr(''), 2500);
    }
  };

  if (profile === 'sales')   return <App />;
  if (profile === 'swsales') return <App overviewOnly={true} />;
  if (profile === 'cost')    return <CostApp />;
  if (profile === 'cost2') return <Cost2App />;
  if (profile === 'crm')   return <CRMApp />;
  if (profile === 'prpo')  return <PRPOApp />;
  if (profile === 'costbif') return <CostBifurcationApp />;
  if (profile === 'admin') return <AdminMenu onOpen={setProfile} onLogout={()=>{sessionStorage.removeItem('admin_auth');window.location.reload();}} />;

  return (
    <div style={{minHeight:'100vh',backgroundImage:'url(/bg.jpg)',backgroundSize:'cover',backgroundPosition:'center',display:'flex',alignItems:'center',justifyContent:'center',fontFamily:'Inter,sans-serif'}}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');`}</style>
      <form onSubmit={e=>{e.preventDefault();submit();}} onKeyDown={e=>{if(e.key==='Enter'){e.preventDefault();submit();}}} style={{background:'rgba(255,255,255,0.97)',borderRadius:20,padding:'40px 44px',width:360,boxShadow:'0 24px 80px rgba(0,40,80,0.25)',backdropFilter:'blur(12px)'}}>
        <div style={{textAlign:'center',marginBottom:28}}>
          <div style={{margin:'0 auto 14px',width:80,height:80,borderRadius:20,background:'#0d1f3c',display:'flex',alignItems:'center',justifyContent:'center',boxShadow:'0 8px 28px rgba(0,30,80,0.35)',overflow:'hidden'}}>
            <img src="/swd-logo.png" alt="SWD" style={{width:56,height:56,objectFit:'contain'}}/>
          </div>
          <h2 style={{fontSize:20,fontWeight:900,color:'#0d2137',margin:'0 0 4px'}}>Intelligence Suite</h2>
          <p style={{fontSize:12,color:'#546e7a',margin:0,fontWeight:500}}>Smartworld Group · Sign in to continue</p>
        </div>

        <div style={{marginBottom:14}}>
          <label style={{fontSize:11,fontWeight:700,color:'#1a2f45',display:'block',marginBottom:5,textTransform:'uppercase',letterSpacing:0.4}}>Username</label>
          <input value={u} onChange={e=>setU(e.target.value)} placeholder="Enter username"
            style={{width:'100%',padding:'10px 14px',borderRadius:10,border:'1.5px solid rgba(0,100,140,0.2)',fontSize:13,outline:'none',fontFamily:'Inter,sans-serif',boxSizing:'border-box',color:'#0d2137',background:'rgba(0,151,167,0.03)'}}
            onFocus={e=>e.target.style.border='1.5px solid #0097a7'} onBlur={e=>e.target.style.border='1.5px solid rgba(0,100,140,0.2)'}/>
        </div>

        <div style={{marginBottom:22}}>
          <label style={{fontSize:11,fontWeight:700,color:'#1a2f45',display:'block',marginBottom:5,textTransform:'uppercase',letterSpacing:0.4}}>Password</label>
          <div style={{position:'relative'}}>
            <input type={show?'text':'password'} value={p} onChange={e=>setP(e.target.value)} placeholder="Enter password"
              style={{width:'100%',padding:'10px 40px 10px 14px',borderRadius:10,border:'1.5px solid rgba(0,100,140,0.2)',fontSize:13,outline:'none',fontFamily:'Inter,sans-serif',boxSizing:'border-box',color:'#0d2137',background:'rgba(0,151,167,0.03)'}}
              onFocus={e=>e.target.style.border='1.5px solid #0097a7'} onBlur={e=>e.target.style.border='1.5px solid rgba(0,100,140,0.2)'}/>
            <button type="button" onClick={()=>setShow(s=>!s)} style={{position:'absolute',right:12,top:'50%',transform:'translateY(-50%)',background:'none',border:'none',cursor:'pointer',fontSize:14,color:'#546e7a',padding:0}}>{show?'🙈':'👁️'}</button>
          </div>
        </div>

        {err && <div style={{background:'#ffeaea',border:'1px solid #f5c6cb',borderRadius:8,padding:'8px 12px',marginBottom:14,fontSize:12,color:'#d32f2f',fontWeight:600,textAlign:'center'}}>{err}</div>}

        <button type="submit" style={{width:'100%',padding:'12px',borderRadius:12,border:'none',background:'linear-gradient(135deg,#0097a7,#006978)',color:'#fff',fontSize:14,fontWeight:800,cursor:'pointer',letterSpacing:0.3,boxShadow:'0 6px 20px rgba(0,151,167,0.35)'}}
          onMouseOver={e=>e.target.style.opacity=0.9} onMouseOut={e=>e.target.style.opacity=1}>
          Sign In →
        </button>

        <p style={{textAlign:'center',fontSize:11,color:'#90a4ae',marginTop:20,marginBottom:0}}>Smartworld Group · Confidential</p>
      </form>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<Portal />);
