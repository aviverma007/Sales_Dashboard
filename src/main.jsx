import React, { useState } from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import CostApp from './CostApp';
import './index.css';

// ─── PORTAL SELECTOR ────────────────────────────────────────────────────────
const T = {
  teal:'#0097a7', tealD:'#006978', navy:'#0d2137', textM:'#1a2f45',
};

function Portal() {
  const [choice, setChoice] = useState(() => {
    if (sessionStorage.getItem('sd_auth') === '1') return 'sales';
    if (sessionStorage.getItem('cost_auth') === '1') return 'cost';
    const p = new URLSearchParams(window.location.search).get('profile');
    if (p === 'cost') return 'cost';
    if (p === 'sales') return 'sales';
    return null;
  });

  if (choice === 'sales') return <App />;
  if (choice === 'cost') return <CostApp />;

  return (
    <div style={{minHeight:'100vh',backgroundImage:'url(/bg.jpg)',backgroundSize:'cover',backgroundPosition:'center',display:'flex',alignItems:'center',justifyContent:'center',fontFamily:'Inter,sans-serif'}}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800;900&display=swap');`}</style>
      <div style={{textAlign:'center'}}>
        <div style={{margin:'0 auto 28px',width:90,height:90,borderRadius:22,background:'#0d1f3c',display:'flex',alignItems:'center',justifyContent:'center',boxShadow:'0 12px 40px rgba(0,30,80,0.45)',overflow:'hidden'}}>
          <img src="/swd-logo.png" alt="SWD" style={{width:64,height:64,objectFit:'contain'}}/>
        </div>
        <h1 style={{fontSize:28,fontWeight:900,color:'#fff',margin:'0 0 6px',textShadow:'0 2px 8px rgba(0,0,0,0.4)'}}>Smartworld Intelligence Suite</h1>
        <p style={{color:'rgba(255,255,255,0.7)',fontSize:14,fontWeight:500,margin:'0 0 36px'}}>Select your dashboard portal to continue</p>
        <div style={{display:'flex',gap:20,justifyContent:'center',flexWrap:'wrap'}}>
          <div onClick={()=>setChoice('sales')}
            style={{background:'rgba(255,255,255,0.97)',borderRadius:20,padding:'28px 32px',width:240,cursor:'pointer',boxShadow:'0 16px 48px rgba(0,40,80,0.25)',transition:'transform 0.2s ease,box-shadow 0.2s ease'}}
            onMouseOver={e=>{e.currentTarget.style.transform='translateY(-4px)';e.currentTarget.style.boxShadow='0 24px 64px rgba(0,40,80,0.3)';}}
            onMouseOut={e=>{e.currentTarget.style.transform='translateY(0)';e.currentTarget.style.boxShadow='0 16px 48px rgba(0,40,80,0.25)';}}>
            <div style={{width:56,height:56,borderRadius:14,background:'linear-gradient(135deg,#006978,#00bcd4)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:26,margin:'0 auto 14px',boxShadow:'0 6px 20px rgba(0,151,167,0.35)'}}>📊</div>
            <h3 style={{fontSize:17,fontWeight:900,color:T.navy,margin:'0 0 6px'}}>Sales Dashboard</h3>
            <p style={{fontSize:12,color:T.textM,margin:'0 0 18px',fontWeight:500}}>Bookings · Collections · Pipeline · Channel Partners</p>
            <div style={{background:'linear-gradient(135deg,#0097a7,#006978)',borderRadius:10,padding:'9px 0',color:'#fff',fontSize:12,fontWeight:800,letterSpacing:0.3}}>Enter →</div>
          </div>
          <div onClick={()=>setChoice('cost')}
            style={{background:'rgba(255,255,255,0.97)',borderRadius:20,padding:'28px 32px',width:240,cursor:'pointer',boxShadow:'0 16px 48px rgba(0,40,80,0.25)',transition:'transform 0.2s ease,box-shadow 0.2s ease'}}
            onMouseOver={e=>{e.currentTarget.style.transform='translateY(-4px)';e.currentTarget.style.boxShadow='0 24px 64px rgba(0,40,80,0.3)';}}
            onMouseOut={e=>{e.currentTarget.style.transform='translateY(0)';e.currentTarget.style.boxShadow='0 16px 48px rgba(0,40,80,0.25)';}}>
            <div style={{width:56,height:56,borderRadius:14,background:'linear-gradient(135deg,#b45309,#f59e0b)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:26,margin:'0 auto 14px',boxShadow:'0 6px 20px rgba(245,158,11,0.35)'}}>💰</div>
            <h3 style={{fontSize:17,fontWeight:900,color:T.navy,margin:'0 0 6px'}}>Cost Intelligence</h3>
            <p style={{fontSize:12,color:T.textM,margin:'0 0 18px',fontWeight:500}}>Procurement · Budget · Vendors · WBS Tracking</p>
            <div style={{background:'linear-gradient(135deg,#b45309,#f59e0b)',borderRadius:10,padding:'9px 0',color:'#fff',fontSize:12,fontWeight:800,letterSpacing:0.3}}>Enter →</div>
          </div>
        </div>
        <p style={{color:'rgba(255,255,255,0.4)',fontSize:11,marginTop:32,fontWeight:600}}>Smartworld Group · Confidential</p>
      </div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<Portal />);
