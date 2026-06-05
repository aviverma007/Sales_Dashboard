import React, { useState } from 'react';

// ─── CONFIG — fill in once credentials are shared ───────────────────────────
const API_CONFIG = {
  SAP: {
    baseUrl:  '',   // e.g. https://your-sap-host:port/sap/opu/odata/sap/...
    user:     '',   // SAP RFC / Basic Auth user
    password: '',   // SAP password
    // SQL query endpoint (if exposing via SAP Gateway / REST)
    sqlEndpoint: '',
  },
  VENDOR_GLOBE: {
    baseUrl:  '',   // e.g. https://api.vendorglobe.com/v1
    apiKey:   '',   // Bearer token or API key
    user:     '',
    password: '',
  },
};

const T = {
  navy:'#0d2137', tealD:'#006978', teal:'#0097a7', tealL:'#00bcd4',
  amber:'#f57c00', red:'#d32f2f', green:'#2e7d32',
  gray:'#546e7a', textM:'#1a2f45', textL:'#2d4a66',
};

const logout = () => {
  sessionStorage.removeItem('prpo_auth');
  window.location.reload();
};

export default function PRPOApp() {
  const [tab, setTab] = useState('overview');

  const TABS = [
    { k:'overview',  l:'📊 Overview'        },
    { k:'pr',        l:'📝 Purchase Requests' },
    { k:'po',        l:'📦 Purchase Orders'  },
    { k:'vendors',   l:'🏢 Vendors'          },
    { k:'analytics', l:'📈 Analytics'        },
  ];

  const navBg = 'linear-gradient(135deg,#0d2137 0%,#1a3a5c 60%,#006978 100%)';

  return (
    <div style={{minHeight:'100vh',backgroundImage:'url(/bg.jpg)',backgroundSize:'cover',
      backgroundPosition:'center',backgroundAttachment:'fixed',fontFamily:'Inter,sans-serif'}}>
      <div style={{minHeight:'100vh',background:'rgba(255,255,255,0.04)',backdropFilter:'blur(1px)'}}>

        {/* ── NAV ── */}
        <div style={{background:navBg,padding:'0 24px',display:'flex',alignItems:'center',
          justifyContent:'space-between',height:54,position:'sticky',top:0,zIndex:100,
          boxShadow:'0 2px 20px rgba(0,0,0,0.3)'}}>
          <div style={{display:'flex',alignItems:'center',gap:12}}>
            <img src="/swd-logo.png" alt="" style={{width:28,height:28,objectFit:'contain'}}/>
            <div>
              <p style={{color:'#fff',fontWeight:900,fontSize:13,margin:0,letterSpacing:0.3}}>PR / PO Intelligence</p>
              <p style={{color:'rgba(255,255,255,0.6)',fontSize:9,margin:0,fontWeight:600}}>SMARTWORLD GROUP · PROCUREMENT DASHBOARD</p>
            </div>
          </div>
          <div style={{display:'flex',gap:4}}>
            {TABS.map(t=>(
              <button key={t.k} onClick={()=>setTab(t.k)}
                style={{background:tab===t.k?'rgba(255,255,255,0.18)':'transparent',
                  color:'#fff',border:tab===t.k?'1px solid rgba(255,255,255,0.35)':'1px solid transparent',
                  borderRadius:8,padding:'5px 14px',fontSize:11,fontWeight:700,cursor:'pointer',transition:'all 0.15s'}}>
                {t.l}
              </button>
            ))}
          </div>
          <button onClick={logout}
            style={{background:'rgba(211,47,47,0.8)',color:'#fff',border:'none',
              borderRadius:8,padding:'5px 14px',fontSize:11,fontWeight:700,cursor:'pointer'}}>
            🚪 Logout
          </button>
        </div>

        {/* ── MAIN ── */}
        <main style={{maxWidth:1400,margin:'0 auto',padding:'40px 24px'}}>

          {/* Pending API Setup Banner */}
          <div style={{background:'rgba(255,255,255,0.97)',backdropFilter:'blur(20px)',
            border:'2px dashed rgba(0,151,167,0.4)',borderRadius:20,padding:'48px 40px',
            textAlign:'center',marginBottom:32,boxShadow:'0 8px 40px rgba(0,80,120,0.12)'}}>

            <div style={{fontSize:56,marginBottom:16}}>🔌</div>
            <h2 style={{fontSize:24,fontWeight:900,color:T.navy,margin:'0 0 8px'}}>
              PRPO Dashboard — Awaiting API Connection
            </h2>
            <p style={{fontSize:13,color:T.gray,margin:'0 0 32px',maxWidth:560,marginLeft:'auto',marginRight:'auto'}}>
              The dashboard is ready. Share your SAP and VendorGlobe credentials to connect live data.
            </p>

            {/* Data Source Cards */}
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:20,maxWidth:700,margin:'0 auto 32px'}}>
              {[
                {
                  icon:'🏭', name:'SAP System',
                  desc:'Purchase Requests, Purchase Orders, GRN, Invoice data via SAP OData / SQL',
                  status:'pending', fields:['Base URL / Host','RFC User & Password','SQL Endpoint / OData Service','Company Code / Plant']
                },
                {
                  icon:'🌐', name:'VendorGlobe',
                  desc:'Vendor master data, ratings, compliance status, payment terms',
                  status:'pending', fields:['API Base URL','API Key / Bearer Token','Username & Password','Vendor filters / scope']
                },
              ].map((src,i)=>(
                <div key={i} style={{background:src.status==='connected'?'rgba(46,125,50,0.06)':'rgba(245,124,0,0.05)',
                  border:`1.5px solid ${src.status==='connected'?T.green:T.amber}33`,
                  borderRadius:14,padding:'20px 24px',textAlign:'left'}}>
                  <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:10}}>
                    <span style={{fontSize:28}}>{src.icon}</span>
                    <div>
                      <p style={{fontSize:13,fontWeight:900,color:T.navy,margin:0}}>{src.name}</p>
                      <span style={{fontSize:9,fontWeight:800,color:src.status==='connected'?T.green:T.amber,
                        background:src.status==='connected'?'rgba(46,125,50,0.1)':'rgba(245,124,0,0.1)',
                        borderRadius:20,padding:'2px 8px',textTransform:'uppercase'}}>
                        {src.status==='connected'?'✅ Connected':'⏳ Pending Credentials'}
                      </span>
                    </div>
                  </div>
                  <p style={{fontSize:11,color:T.gray,margin:'0 0 10px'}}>{src.desc}</p>
                  <div style={{display:'flex',flexDirection:'column',gap:4}}>
                    {src.fields.map((f,fi)=>(
                      <div key={fi} style={{display:'flex',alignItems:'center',gap:6}}>
                        <div style={{width:6,height:6,borderRadius:'50%',background:T.amber,flexShrink:0}}/>
                        <span style={{fontSize:10,color:T.textL,fontWeight:600}}>{f}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* What will be built */}
            <div style={{background:'rgba(0,151,167,0.05)',border:'1px solid rgba(0,151,167,0.2)',
              borderRadius:14,padding:'20px 28px',maxWidth:800,margin:'0 auto',textAlign:'left'}}>
              <p style={{fontSize:11,fontWeight:800,color:T.tealD,textTransform:'uppercase',letterSpacing:0.5,margin:'0 0 14px'}}>
                📋 What will be built once connected
              </p>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
                {[
                  '📊 PR vs PO value & count KPIs',
                  '📦 Open PO tracking with aging',
                  '✅ GRN vs Invoice matching status',
                  '🏢 Vendor-wise spend analysis',
                  '⏱️ PR-to-PO lead time tracking',
                  '📈 Monthly procurement trend charts',
                  '🚨 Pending approvals & overdue alerts',
                  '💰 Budget vs Actual by category/WBS',
                  '🌐 VendorGlobe compliance scores',
                  '🔍 Drill-down by vendor / category / project',
                ].map((item,i)=>(
                  <div key={i} style={{display:'flex',alignItems:'center',gap:8,padding:'6px 0'}}>
                    <span style={{fontSize:12}}>{item.split(' ')[0]}</span>
                    <span style={{fontSize:11,color:T.textM,fontWeight:600}}>{item.slice(item.indexOf(' ')+1)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* API Config Preview (for dev reference) */}
          <div style={{background:'rgba(13,33,55,0.92)',backdropFilter:'blur(20px)',
            borderRadius:16,padding:'24px 28px',color:'#e2e8f0',fontFamily:'monospace',fontSize:11}}>
            <p style={{color:'#00bcd4',fontWeight:700,margin:'0 0 12px',fontSize:12}}>// API Configuration — Fill in once credentials are received</p>
            <pre style={{margin:0,color:'#a5b4fc',lineHeight:1.7}}>{`const API_CONFIG = {
  SAP: {
    baseUrl:     '← SAP host URL',
    user:        '← SAP username',
    password:    '← SAP password',
    sqlEndpoint: '← SQL / OData endpoint',
  },
  VENDOR_GLOBE: {
    baseUrl:  '← VendorGlobe API URL',
    apiKey:   '← API Key or Bearer token',
    user:     '← VendorGlobe username',
    password: '← VendorGlobe password',
  },
};`}</pre>
          </div>

        </main>
      </div>
    </div>
  );
}
