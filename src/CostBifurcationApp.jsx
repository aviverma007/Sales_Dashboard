import React from 'react';

// ─── THEME (same as main dashboard) ──────────────────────────────────────────
const T = {
  glass:      'rgba(255,255,255,0.96)',
  glassH:     'rgba(255,255,255,1.0)',
  border:     'rgba(255,255,255,0.85)',
  teal:   '#0097a7', tealL:'#00bcd4', tealD:'#006978',
  red:    '#d32f2f',
  navy:   '#0d2137',
  text:   '#0a1628', textM:'#1a2f45',
};

// ─── GLASS CARD ───────────────────────────────────────────────────────────────
const GC = ({children,style={}}) => {
  const [h,sH]=React.useState(false);
  return (
    <div onMouseEnter={()=>sH(true)} onMouseLeave={()=>sH(false)} style={{
      background: h?T.glassH:T.glass,
      border:`1px solid ${T.border}`,
      borderRadius:14, boxShadow:'0 4px 24px rgba(0,80,120,0.12)',
      transition:'all 0.25s ease', position:'relative', overflow:'hidden', ...style
    }}>
      <div style={{position:'absolute',top:0,left:0,right:0,height:1,background:'rgba(255,255,255,0.95)'}}/>
      {children}
    </div>
  );
};

export default function CostBifurcationApp() {
  const [authed, setAuthed] = React.useState(()=>sessionStorage.getItem('costbif_auth')==='1');

  if (!authed) {
    // This component is only reached after main.jsx's Portal already checked
    // credentials and set the session flag, so this is just a safety fallback.
    return null;
  }

  return (
    <div style={{minHeight:'100vh',backgroundImage:'url(/bg.jpg)',backgroundSize:'cover',backgroundPosition:'center',backgroundAttachment:'fixed',fontFamily:'Inter,sans-serif',color:T.text}}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');`}</style>

      {/* BG overlay for readability, consistent with the main dashboard */}
      <div style={{position:'fixed',inset:0,background:'rgba(0,20,40,0.25)',pointerEvents:'none',zIndex:0}}/>

      {/* HEADER */}
      <header style={{position:'sticky',top:0,zIndex:200,background:'rgba(255,255,255,0.95)',WebkitBackdropFilter:'blur(24px)',borderBottom:'1px solid rgba(255,255,255,0.9)',boxShadow:'0 2px 20px rgba(0,60,100,0.12)'}}>
        <div style={{maxWidth:1440,margin:'0 auto',padding:'0 24px',display:'flex',alignItems:'center',justifyContent:'space-between',height:54}}>
          <div style={{display:'flex',alignItems:'center',gap:12}}>
            <div style={{width:38,height:38,borderRadius:9,background:'#0d1f3c',display:'flex',alignItems:'center',justifyContent:'center',boxShadow:'0 4px 14px rgba(0,30,80,0.3)',flexShrink:0,overflow:'hidden'}}>
              <img src="/swd-logo.png" alt="SWD" style={{width:26,height:26,objectFit:'contain'}}/>
            </div>
            <div>
              <div style={{fontWeight:900,fontSize:15,letterSpacing:0.5,color:T.navy}}>Cost Bifurcation</div>
              <div style={{color:T.textM,fontSize:9,letterSpacing:1.5,fontWeight:700}}>SMARTWORLD GROUP · COST INTELLIGENCE</div>
            </div>
          </div>
          <button onClick={()=>{sessionStorage.removeItem('costbif_auth');window.location.reload();}} style={{display:'flex',alignItems:'center',gap:6,padding:'6px 14px',borderRadius:10,border:'1px solid rgba(200,40,40,0.25)',background:'rgba(211,47,47,0.07)',cursor:'pointer',fontSize:11,fontWeight:700,color:T.red,fontFamily:'Inter,sans-serif',transition:'all 0.15s'}} onMouseOver={e=>{e.currentTarget.style.background='rgba(211,47,47,0.14)';}} onMouseOut={e=>{e.currentTarget.style.background='rgba(211,47,47,0.07)';}}>
            🔒 Logout
          </button>
        </div>
      </header>

      {/* BODY */}
      <div style={{maxWidth:1440,margin:'0 auto',padding:'24px',position:'relative',zIndex:1}}>
        <GC style={{padding:'48px 32px',textAlign:'center'}}>
          <div style={{fontSize:40,marginBottom:12}}>🧾</div>
          <h2 style={{fontSize:19,fontWeight:900,color:T.navy,margin:'0 0 8px'}}>Cost Bifurcation Dashboard</h2>
          <p style={{fontSize:13,color:T.textM,margin:'0 auto',maxWidth:480,lineHeight:1.6}}>
            This dashboard is ready and waiting for its data and layout.
            Let Claude know what breakdowns, KPIs, and charts you'd like to see here,
            and this space will be built out to match.
          </p>
        </GC>
      </div>
    </div>
  );
}
