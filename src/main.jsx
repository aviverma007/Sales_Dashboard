import React, { useState } from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import CostApp from './CostApp';
import './index.css';

// ─── CREDENTIALS MAP ────────────────────────────────────────────────────────
const USERS = {
  'Sales': { password: 'Smart@2026', profile: 'sales', sessionKey: 'sd_auth' },
  'Cost':  { password: 'Smart@2026', profile: 'cost',  sessionKey: 'cost_auth' },
};

function Portal() {
  const [profile, setProfile] = useState(() => {
    if (sessionStorage.getItem('sd_auth')   === '1') return 'sales';
    if (sessionStorage.getItem('cost_auth') === '1') return 'cost';
    return null;
  });

  const [u, setU] = useState('');
  const [p, setP] = useState('');
  const [show, setShow] = useState(false);
  const [err, setErr] = useState('');

  const submit = () => {
    const user = USERS[u];
    if (user && p === user.password) {
      sessionStorage.setItem(user.sessionKey, '1');
      setProfile(user.profile);
    } else {
      setErr('Invalid username or password');
      setTimeout(() => setErr(''), 2500);
    }
  };

  if (profile === 'sales') return <App />;
  if (profile === 'cost')  return <CostApp />;

  return (
    <div style={{minHeight:'100vh',backgroundImage:'url(/bg.jpg)',backgroundSize:'cover',backgroundPosition:'center',display:'flex',alignItems:'center',justifyContent:'center',fontFamily:'Inter,sans-serif'}}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');`}</style>
      <div style={{background:'rgba(255,255,255,0.97)',borderRadius:20,padding:'40px 44px',width:360,boxShadow:'0 24px 80px rgba(0,40,80,0.25)',backdropFilter:'blur(12px)'}}>
        {/* Logo */}
        <div style={{textAlign:'center',marginBottom:28}}>
          <div style={{margin:'0 auto 14px',width:80,height:80,borderRadius:20,background:'#0d1f3c',display:'flex',alignItems:'center',justifyContent:'center',boxShadow:'0 8px 28px rgba(0,30,80,0.35)',overflow:'hidden'}}>
            <img src="/swd-logo.png" alt="SWD" style={{width:56,height:56,objectFit:'contain'}}/>
          </div>
          <h2 style={{fontSize:20,fontWeight:900,color:'#0d2137',margin:'0 0 4px'}}>Intelligence Suite</h2>
          <p style={{fontSize:12,color:'#546e7a',margin:0,fontWeight:500}}>Smartworld Group · Sign in to continue</p>
        </div>

        {/* Username */}
        <div style={{marginBottom:14}}>
          <label style={{fontSize:11,fontWeight:700,color:'#1a2f45',display:'block',marginBottom:5,textTransform:'uppercase',letterSpacing:0.4}}>Username</label>
          <input value={u} onChange={e=>setU(e.target.value)} onKeyDown={e=>e.key==='Enter'&&submit()} placeholder="Enter username"
            style={{width:'100%',padding:'10px 14px',borderRadius:10,border:'1.5px solid rgba(0,100,140,0.2)',fontSize:13,outline:'none',fontFamily:'Inter,sans-serif',boxSizing:'border-box',color:'#0d2137',background:'rgba(0,151,167,0.03)',transition:'border 0.15s'}}
            onFocus={e=>e.target.style.border='1.5px solid #0097a7'} onBlur={e=>e.target.style.border='1.5px solid rgba(0,100,140,0.2)'}/>
        </div>

        {/* Password */}
        <div style={{marginBottom:22}}>
          <label style={{fontSize:11,fontWeight:700,color:'#1a2f45',display:'block',marginBottom:5,textTransform:'uppercase',letterSpacing:0.4}}>Password</label>
          <div style={{position:'relative'}}>
            <input type={show?'text':'password'} value={p} onChange={e=>setP(e.target.value)} onKeyDown={e=>e.key==='Enter'&&submit()} placeholder="Enter password"
              style={{width:'100%',padding:'10px 40px 10px 14px',borderRadius:10,border:'1.5px solid rgba(0,100,140,0.2)',fontSize:13,outline:'none',fontFamily:'Inter,sans-serif',boxSizing:'border-box',color:'#0d2137',background:'rgba(0,151,167,0.03)',transition:'border 0.15s'}}
              onFocus={e=>e.target.style.border='1.5px solid #0097a7'} onBlur={e=>e.target.style.border='1.5px solid rgba(0,100,140,0.2)'}/>
            <button onClick={()=>setShow(s=>!s)} style={{position:'absolute',right:12,top:'50%',transform:'translateY(-50%)',background:'none',border:'none',cursor:'pointer',fontSize:14,color:'#546e7a',padding:0,lineHeight:1}}>{show?'🙈':'👁️'}</button>
          </div>
        </div>

        {err && <div style={{background:'#ffeaea',border:'1px solid #f5c6cb',borderRadius:8,padding:'8px 12px',marginBottom:14,fontSize:12,color:'#d32f2f',fontWeight:600,textAlign:'center'}}>{err}</div>}

        <button onClick={submit} style={{width:'100%',padding:'12px',borderRadius:12,border:'none',background:'linear-gradient(135deg,#0097a7,#006978)',color:'#fff',fontSize:14,fontWeight:800,cursor:'pointer',letterSpacing:0.3,boxShadow:'0 6px 20px rgba(0,151,167,0.35)',transition:'opacity 0.15s'}}
          onMouseOver={e=>e.target.style.opacity=0.9} onMouseOut={e=>e.target.style.opacity=1}>
          Sign In →
        </button>

        <p style={{textAlign:'center',fontSize:11,color:'#90a4ae',marginTop:20,marginBottom:0}}>Smartworld Group · Confidential</p>
      </div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<Portal />);
