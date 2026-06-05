import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, LabelList, ComposedChart, Line, Funnel, FunnelChart, LabelList as LL
} from 'recharts';

// ─── LOCAL SERVER (run: node prpo_server.js on your PC) ─────────────────────
const LOCAL_SERVER = 'http://localhost:3001';
const VG_URLS = {
  pr:     `${LOCAL_SERVER}/api/pr`,
  nfa:    `${LOCAL_SERVER}/api/nfa`,
  market: `${LOCAL_SERVER}/api/market`,
  eot:    `${LOCAL_SERVER}/api/eot`,
};

// SAP proxy still needs PHP file on server — skip until deployed
const SAP_PROXY = `${VG_BASE}/sap_proxy.php`;

const T = {
  navy:'#0d2137', tealD:'#006978', teal:'#0097a7', tealL:'#00bcd4',
  amber:'#f57c00', red:'#d32f2f', green:'#2e7d32', purple:'#6a1b9a',
  gray:'#546e7a', textM:'#1a2f45', textL:'#2d4a66',
  orange:'#e65100', blue:'#1565c0',
};
const CC = ['#0097a7','#1565c0','#2e7d32','#f57c00','#d32f2f','#6a1b9a','#00838f','#e65100','#00695c','#ad1457'];

// Journey stages — in order
const JOURNEY_STAGES = [
  { id:'pr_created',    label:'PR Created',        icon:'📝', color:T.teal   },
  { id:'pr_approved',   label:'PR Approved (SAP)',  icon:'✅', color:T.green  },
  { id:'vg_created',    label:'Sent to VendorGlobe',icon:'🌐', color:T.blue  },
  { id:'nfa_created',   label:'NFA Created',        icon:'📋', color:T.purple },
  { id:'nfa_approved',  label:'NFA Approved',       icon:'✅', color:T.green  },
  { id:'vendor_selected',label:'Vendor Selected',   icon:'🏢', color:T.amber  },
  { id:'po_created',    label:'PO Created (SAP)',   icon:'📦', color:T.tealD  },
  { id:'po_approved',   label:'PO Approved',        icon:'✅', color:T.green  },
  { id:'grn_done',      label:'GRN / Delivery',     icon:'🚚', color:T.orange },
  { id:'invoice_paid',  label:'Invoice & Payment',  icon:'💰', color:T.navy   },
];

// ─── UI COMPONENTS ────────────────────────────────────────────────────────────
const GC = ({children,style={}}) => (
  <div style={{background:'rgba(255,255,255,0.97)',backdropFilter:'blur(20px)',WebkitBackdropFilter:'blur(20px)',
    border:'1px solid rgba(255,255,255,0.9)',borderRadius:14,
    boxShadow:'0 4px 24px rgba(0,80,120,0.10)',position:'relative',overflow:'hidden',...style}}>
    {children}
  </div>
);

const KpiCard = ({icon,label,value,sub,color,pct,loading:l}) => (
  <div style={{background:'rgba(255,255,255,0.97)',backdropFilter:'blur(20px)',WebkitBackdropFilter:'blur(20px)',
    border:'1px solid rgba(255,255,255,0.9)',borderLeft:`4px solid ${color}`,borderRadius:14,
    boxShadow:'0 4px 24px rgba(0,40,80,0.15)',padding:'16px 18px',position:'relative'}}>
    <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',marginBottom:8}}>
      <span style={{fontSize:22}}>{icon}</span>
      {pct!=null&&<span style={{fontSize:9,fontWeight:800,color:'#fff',background:color,borderRadius:20,padding:'2px 8px'}}>{pct}%</span>}
    </div>
    {l ? <div style={{height:32,background:'rgba(0,60,100,0.07)',borderRadius:6,marginBottom:8,animation:'pulse 1.5s infinite'}}/> :
      <div style={{fontSize:26,fontWeight:900,color,letterSpacing:-1,lineHeight:1,marginBottom:4}}>{value}</div>}
    <div style={{fontSize:10,fontWeight:800,color:T.textM,textTransform:'uppercase',letterSpacing:0.5,marginBottom:2}}>{label}</div>
    <div style={{fontSize:9,color:T.gray}}>{sub}</div>
    {pct!=null&&!l&&<div style={{marginTop:8,height:4,background:'rgba(0,60,100,0.08)',borderRadius:2}}>
      <div style={{width:`${Math.min(pct,100)}%`,height:'100%',background:color,borderRadius:2}}/>
    </div>}
  </div>
);

const CTip = ({active,payload,label}) => {
  if(!active||!payload?.length) return null;
  return <div style={{background:'rgba(255,255,255,0.98)',border:'1px solid rgba(0,151,167,0.3)',borderRadius:10,padding:'8px 12px',boxShadow:'0 8px 32px rgba(0,80,120,0.18)',fontSize:11}}>
    <p style={{color:T.tealD,fontWeight:700,marginBottom:4}}>{label}</p>
    {payload.map((p,i)=><p key={i} style={{color:p.color||T.text,margin:'2px 0'}}><span style={{color:T.textL}}>{p.name}: </span>{typeof p.value==='number'?p.value.toLocaleString():p.value}</p>)}
  </div>;
};

const SH = ({title,sub}) => <div style={{marginBottom:12}}>
  <p style={{fontSize:11,fontWeight:800,color:T.tealD,letterSpacing:0.4,margin:0,textTransform:'uppercase'}}>{title}</p>
  {sub&&<p style={{fontSize:10,color:T.textM,margin:'2px 0 0'}}>{sub}</p>}
</div>;

const FSelect = ({label,value,onChange,options}) => <div>
  <div style={{fontSize:9,fontWeight:800,color:'rgba(255,255,255,0.8)',textTransform:'uppercase',letterSpacing:0.5,marginBottom:3}}>{label}</div>
  <select value={value} onChange={e=>onChange(e.target.value)}
    style={{width:'100%',fontSize:11,fontWeight:600,color:T.navy,background:'rgba(255,255,255,0.95)',border:'1px solid rgba(255,255,255,0.4)',borderRadius:8,padding:'5px 8px',cursor:'pointer'}}>
    <option value="">All</option>
    {options.map(o=><option key={o} value={o}>{o}</option>)}
  </select>
</div>;

const Spinner = ({msg='Loading…'}) => <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:200,gap:12,flexDirection:'column'}}>
  <div style={{width:36,height:36,border:`3px solid rgba(0,151,167,0.2)`,borderTop:`3px solid ${T.teal}`,borderRadius:'50%',animation:'spin 0.8s linear infinite'}}/>
  <span style={{color:T.gray,fontSize:12,fontWeight:600}}>{msg}</span>
</div>;

const ErrBox = ({msg,onRetry}) => {
  const isSession = msg?.includes('Session')||msg?.includes('unauthorized')||msg?.includes('QMS');
  const isCORS    = msg?.includes('CORS')||msg?.includes('blocked');
  return (
    <div style={{padding:28,textAlign:'center'}}>
      <div style={{fontSize:32,marginBottom:8}}>{isSession?'🔑':isCORS?'🔒':'⚠️'}</div>
      <p style={{fontWeight:800,color:isSession?T.amber:T.red,margin:'0 0 6px',fontSize:13}}>
        {isSession?'QMS Session Required':isCORS?'CORS Blocked':'Connection Error'}
      </p>
      <p style={{fontSize:11,color:T.gray,margin:'0 0 12px'}}>{msg}</p>
      {isSession&&<div style={{background:'rgba(0,151,167,0.06)',border:'1px solid rgba(0,151,167,0.2)',borderRadius:10,padding:'12px 16px',maxWidth:380,margin:'0 auto 12px',textAlign:'left'}}>
        <p style={{fontSize:10,fontWeight:800,color:T.tealD,margin:'0 0 6px',textTransform:'uppercase'}}>Fix: Login to QMS first</p>
        <p style={{fontSize:10,color:T.textM,margin:'0 0 4px'}}>1. Open a new tab → go to:</p>
        <code style={{fontSize:10,color:T.tealD}}>smartworlddevelopersonline.com/qms</code>
        <p style={{fontSize:10,color:T.textM,margin:'8px 0 4px'}}>2. Login with your credentials</p>
        <p style={{fontSize:10,color:T.textM,margin:0}}>3. Come back here and click Retry</p>
      </div>}
      {onRetry&&<button onClick={onRetry} style={{background:T.teal,color:'#fff',border:'none',borderRadius:8,padding:'7px 16px',fontSize:11,fontWeight:700,cursor:'pointer'}}>🔄 Retry</button>}
    </div>
  );
};

const StatusBadge = ({s}) => {
  const sl = String(s||'').toLowerCase();
  const col = sl.includes('approv')||sl.includes('complet')||sl.includes('done')?T.green
    : sl.includes('pending')||sl.includes('open')||sl.includes('progress')?T.amber
    : sl.includes('reject')||sl.includes('cancel')?T.red
    : sl.includes('sent')||sl.includes('forward')?T.blue : T.gray;
  return <span style={{fontSize:9,fontWeight:800,color:'#fff',background:col,borderRadius:4,padding:'2px 7px',whiteSpace:'nowrap'}}>{s||'—'}</span>;
};

const JourneyTimeline = ({pr, nfa, PR, NFA}) => {
  const prId  = PR.id(pr);
  const stages = [
    { label:'PR Created',        done:true,                         date:PR.date(pr),     detail:`EPR# ${PR.epr(pr)} · ${PR.project(pr)}` },
    { label:'Level 1 Approval',  done:!!PR.l1Sign(pr),             date:PR.l1Date(pr),   detail: PR.l1Sign(pr) ? `✓ ${PR.l1Who(pr)}` : `Pending — ${PR.l1Who(pr)||'Awaiting'}` },
    { label:'Level 2 Approval',  done:!!PR.l2Sign(pr),             date:PR.l2Date(pr),   detail: PR.l2Sign(pr) ? `✓ ${PR.l2Who(pr)}` : `Pending — ${PR.l2Who(pr)||'Awaiting'}` },
    { label:'CP Team Approval',  done:!!PR.cpSign(pr),             date:PR.cpDate(pr),   detail: PR.cpSign(pr) ? `✓ ${PR.cpWho(pr)}` : `Pending — ${PR.cpWho(pr)||'Awaiting'}` },
    { label:'Assignee Approval', done:!!PR.asgSign(pr),            date:PR.asgDate(pr),  detail: PR.asgSign(pr) ? '✓ Approved' : 'Pending' },
    { label:'NFA Created',       done:PR.nfaConverted(pr)===1,     date:PR.nfaDate(pr),  detail: PR.nfaConverted(pr)===1 ? `NFA# ${nfa?NFA.nfaNo(nfa):'—'}` : 'Not yet converted to NFA' },
    { label:'NFA L1 Approval',   done:!!(nfa&&NFA.l1Sign(nfa)),    date:nfa?NFA.l1Date(nfa):'', detail: nfa ? (NFA.l1Sign(nfa)?`✓ ${NFA.l1Team(nfa)}`:`Pending — ${NFA.l1Team(nfa)}`) : '—' },
    { label:'NFA L2 Approval',   done:!!(nfa&&NFA.l2Sign(nfa)),    date:nfa?NFA.l2Date(nfa):'', detail: nfa ? (NFA.l2Sign(nfa)?`✓ ${NFA.l2Team(nfa)}`:`Pending — ${NFA.l2Team(nfa)}`) : '—' },
    { label:'NFA L3 Approval',   done:!!(nfa&&NFA.l3Sign(nfa)),    date:'',              detail: nfa ? (NFA.l3Sign(nfa)?`✓ ${NFA.l3Team(nfa)}`:`Pending — ${NFA.l3Team(nfa)}`) : '—' },
    { label:'Vendor Selected',   done:!!(nfa&&NFA.vendor(nfa)),    date:'',              detail: nfa ? (NFA.vendor(nfa)||'Not yet selected') : '—' },
    { label:'WO / PO Issued',    done:!!(nfa&&NFA.woPoNum(nfa)),   date:'',              detail: nfa ? (NFA.woPoNum(nfa)||'Not yet issued') : '—' },
    { label:'SAP PR Created',    done:PR.isSapPR(pr)===1,          date:'',              detail: PR.isSapPR(pr)===1 ? '✓ Synced to SAP' : 'Not in SAP yet' },
  ];

  const done  = stages.filter(s=>s.done).length;
  const pct   = Math.round(done/stages.length*100);
  const stuck = stages.find(s=>!s.done);

  return (
    <GC style={{padding:0,overflow:'hidden'}}>
      <div style={{background:`linear-gradient(135deg,${T.navy},${T.tealD})`,padding:'14px 20px',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
        <div>
          <p style={{color:'#fff',fontWeight:900,fontSize:14,margin:0}}>PR #{PR.epr(pr)} — {PR.no(pr)}</p>
          <p style={{color:'rgba(255,255,255,0.65)',fontSize:10,margin:'2px 0 0'}}>{PR.project(pr)} · {PR.location(pr)} · Budget: ₹{Number(PR.budget(pr)).toLocaleString()}</p>
        </div>
        <div style={{textAlign:'right'}}>
          <div style={{fontSize:22,fontWeight:900,color:pct===100?'#69f0ae':pct>=60?'#ffd740':'#ff6e40'}}>{pct}%</div>
          <div style={{fontSize:9,color:'rgba(255,255,255,0.6)',fontWeight:700}}>COMPLETE</div>
        </div>
      </div>
      <div style={{height:4,background:'rgba(0,60,100,0.1)'}}>
        <div style={{width:pct+'%',height:'100%',background:pct===100?T.green:T.teal,transition:'width 0.6s'}}/>
      </div>
      {stuck&&<div style={{background:'rgba(245,124,0,0.06)',borderBottom:'1px solid rgba(245,124,0,0.15)',padding:'6px 20px',display:'flex',alignItems:'center',gap:8}}>
        <span style={{fontSize:13}}>⏳</span>
        <span style={{fontSize:11,fontWeight:700,color:T.amber}}>Pending: {stuck.label}</span>
        {PR.isUrgent(pr)===1&&<span style={{fontSize:9,fontWeight:800,color:'#fff',background:T.red,borderRadius:20,padding:'1px 8px',marginLeft:8}}>URGENT</span>}
      </div>}
      <div style={{padding:'16px 20px',display:'flex',flexDirection:'column',gap:0}}>
        {stages.map((s,i)=>(
          <div key={i} style={{display:'flex',gap:12,alignItems:'flex-start'}}>
            <div style={{display:'flex',flexDirection:'column',alignItems:'center',width:24,flexShrink:0}}>
              <div style={{width:22,height:22,borderRadius:'50%',
                background:s.done?T.green:'rgba(0,60,100,0.06)',
                border:`2px solid ${s.done?T.green:'rgba(0,60,100,0.12)'}`,
                display:'flex',alignItems:'center',justifyContent:'center',
                boxShadow:s.done?`0 0 0 3px rgba(46,125,50,0.12)`:undefined}}>
                <span style={{fontSize:9,color:s.done?'#fff':'rgba(0,60,100,0.3)'}}>{s.done?'✓':'○'}</span>
              </div>
              {i<stages.length-1&&<div style={{width:2,height:24,background:s.done?'rgba(46,125,50,0.25)':'rgba(0,60,100,0.06)',margin:'2px 0'}}/>}
            </div>
            <div style={{paddingBottom:i<stages.length-1?4:0,flex:1}}>
              <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:1}}>
                <span style={{fontSize:11,fontWeight:800,color:s.done?T.textM:'rgba(0,60,100,0.3)'}}>{s.label}</span>
                {s.date&&<span style={{fontSize:9,color:T.gray}}>{String(s.date).slice(0,10)}</span>}
              </div>
              <p style={{fontSize:10,color:s.done?T.textL:'rgba(0,60,100,0.25)',margin:0}}>{s.detail}</p>
            </div>
          </div>
        ))}
      </div>
    </GC>
  );
};

// ─── MOCK DATA (used when APIs are blocked) ──────────────────────────────────
const MOCK = {
  pr: [
    {id:'PR-2401',pr_number:'10000245',description:'Civil Works - Tower 3 Foundation',material_group:'Civil',requester:'Rahul Sharma',pr_date:'2024-01-15',release_status:'X',FRGZU:'X',wbs_element:'WBS-T3-CIVIL',price:1250000,AFNAM:'Rahul Sharma',BADAT:'2024-01-15',sap_pr_number:'10000245'},
    {id:'PR-2402',pr_number:'10000246',description:'Electrical Wiring - Tower 1',material_group:'Electrical',requester:'Priya Mehta',pr_date:'2024-01-18',release_status:'',FRGZU:'',wbs_element:'WBS-T1-ELEC',price:890000,AFNAM:'Priya Mehta',BADAT:'2024-01-18',sap_pr_number:'10000246'},
    {id:'PR-2403',pr_number:'10000247',description:'Plumbing - Common Areas',material_group:'Plumbing',requester:'Anil Kumar',pr_date:'2024-01-20',release_status:'X',FRGZU:'X',wbs_element:'WBS-COMM-PLMB',price:560000,AFNAM:'Anil Kumar',BADAT:'2024-01-20',sap_pr_number:'10000247'},
    {id:'PR-2404',pr_number:'10000248',description:'Steel Rebar - Tower 4',material_group:'Steel',requester:'Sunita Verma',pr_date:'2024-01-22',release_status:'X',FRGZU:'X',wbs_element:'WBS-T4-STEEL',price:3200000,AFNAM:'Sunita Verma',BADAT:'2024-01-22',sap_pr_number:'10000248'},
    {id:'PR-2405',pr_number:'10000249',description:'HVAC Equipment - Basement',material_group:'HVAC',requester:'Deepak Joshi',pr_date:'2024-01-25',release_status:'X',FRGZU:'X',wbs_element:'WBS-BSMT-HVAC',price:4100000,AFNAM:'Deepak Joshi',BADAT:'2024-01-25',sap_pr_number:'10000249'},
    {id:'PR-2406',pr_number:'10000250',description:'Tiles - Floor Finishing T2',material_group:'Finishing',requester:'Kavya Reddy',pr_date:'2024-02-01',release_status:'',FRGZU:'',wbs_element:'WBS-T2-FINISH',price:720000,AFNAM:'Kavya Reddy',BADAT:'2024-02-01',sap_pr_number:'10000250'},
    {id:'PR-2407',pr_number:'10000251',description:'Fire Safety System',material_group:'Safety',requester:'Vikram Singh',pr_date:'2024-02-05',release_status:'X',FRGZU:'X',wbs_element:'WBS-FIRE-SAFE',price:1800000,AFNAM:'Vikram Singh',BADAT:'2024-02-05',sap_pr_number:'10000251'},
    {id:'PR-2408',pr_number:'10000252',description:'Lift Installation - Tower 5',material_group:'Elevators',requester:'Meena Pillai',pr_date:'2024-02-08',release_status:'X',FRGZU:'X',wbs_element:'WBS-T5-LIFT',price:6500000,AFNAM:'Meena Pillai',BADAT:'2024-02-08',sap_pr_number:'10000252'},
  ],
  nfa: [
    {id:'NFA-001',sap_pr_number:'10000245',pr_number:'10000245',nfa_number:'NFA-2401',status:'Approved',approval_status:'Approved',vendor:'M/s ABC Constructions',vendor_name:'ABC Constructions',created_at:'2024-01-20',amount:1225000},
    {id:'NFA-002',sap_pr_number:'10000247',pr_number:'10000247',nfa_number:'NFA-2402',status:'Pending',approval_status:'Pending',vendor:'M/s XYZ Plumbers',vendor_name:'XYZ Plumbers',created_at:'2024-01-25',amount:550000},
    {id:'NFA-003',sap_pr_number:'10000248',pr_number:'10000248',nfa_number:'NFA-2403',status:'Approved',approval_status:'Approved',vendor:'M/s Steel Corp Ltd',vendor_name:'Steel Corp Ltd',created_at:'2024-01-28',amount:3150000},
    {id:'NFA-004',sap_pr_number:'10000249',pr_number:'10000249',nfa_number:'NFA-2404',status:'Approved',approval_status:'Approved',vendor:'M/s CoolTech HVAC',vendor_name:'CoolTech HVAC',created_at:'2024-02-01',amount:4050000},
    {id:'NFA-005',sap_pr_number:'10000251',pr_number:'10000251',nfa_number:'NFA-2405',status:'Pending',approval_status:'Pending',vendor:'',vendor_name:'',created_at:'2024-02-10',amount:1780000},
    {id:'NFA-006',sap_pr_number:'10000252',pr_number:'10000252',nfa_number:'NFA-2406',status:'Approved',approval_status:'Approved',vendor:'M/s Otis Elevators',vendor_name:'Otis Elevators',created_at:'2024-02-15',amount:6400000},
  ],
  sapPO: [
    {po_number:'4500012301',EBELN:'4500012301',po_date:'2024-02-01',BEDAT:'2024-02-01',vendor:'ABC Constructions',LIFNR:'V001',net_value:1225000,NETWR:1225000,po_type:'NB',BSART:'NB',purchasing_group:'PG01',EKGRP:'PG01',company_code:'SWD1',BUKRS:'SWD1',plant:'P001',WERKS:'P001',release_status:'X',FRGKE:'X',currency:'INR',WAERS:'INR',pr_number:'10000245'},
    {po_number:'4500012302',EBELN:'4500012302',po_date:'2024-02-05',BEDAT:'2024-02-05',vendor:'Steel Corp Ltd',LIFNR:'V003',net_value:3150000,NETWR:3150000,po_type:'NB',BSART:'NB',purchasing_group:'PG02',EKGRP:'PG02',company_code:'SWD1',BUKRS:'SWD1',plant:'P001',WERKS:'P001',release_status:'X',FRGKE:'X',currency:'INR',WAERS:'INR',pr_number:'10000248'},
    {po_number:'4500012303',EBELN:'4500012303',po_date:'2024-02-10',BEDAT:'2024-02-10',vendor:'CoolTech HVAC',LIFNR:'V004',net_value:4050000,NETWR:4050000,po_type:'NB',BSART:'NB',purchasing_group:'PG01',EKGRP:'PG01',company_code:'SWD1',BUKRS:'SWD1',plant:'P002',WERKS:'P002',release_status:'',FRGKE:'',currency:'INR',WAERS:'INR',pr_number:'10000249'},
    {po_number:'4500012304',EBELN:'4500012304',po_date:'2024-02-20',BEDAT:'2024-02-20',vendor:'Otis Elevators',LIFNR:'V005',net_value:6400000,NETWR:6400000,po_type:'NB',BSART:'NB',purchasing_group:'PG03',EKGRP:'PG03',company_code:'SWD1',BUKRS:'SWD1',plant:'P001',WERKS:'P001',release_status:'X',FRGKE:'X',currency:'INR',WAERS:'INR',pr_number:'10000252'},
  ],
  sapPR2PO: [
    {pr_number:'10000245',BANFN:'10000245',po_number:'4500012301',EBELN:'4500012301',vendor:'ABC Constructions',LIFNR:'V001',net_value:1225000,NETWR:1225000},
    {pr_number:'10000248',BANFN:'10000248',po_number:'4500012302',EBELN:'4500012302',vendor:'Steel Corp Ltd',LIFNR:'V003',net_value:3150000,NETWR:3150000},
    {pr_number:'10000249',BANFN:'10000249',po_number:'4500012303',EBELN:'4500012303',vendor:'CoolTech HVAC',LIFNR:'V004',net_value:4050000,NETWR:4050000},
    {pr_number:'10000252',BANFN:'10000252',po_number:'4500012304',EBELN:'4500012304',vendor:'Otis Elevators',LIFNR:'V005',net_value:6400000,NETWR:6400000},
  ],
  market: [
    {id:'MKT-001',item:'Cement OPC 53 Grade',category:'Building Materials',vendor:'UltraTech',quantity:5000,unit:'Bags',rate:380,amount:1900000,status:'Open'},
    {id:'MKT-002',item:'TMT Steel 500D',category:'Steel',vendor:'TATA Steel',quantity:200,unit:'MT',rate:58000,amount:11600000,status:'Closed'},
    {id:'MKT-003',item:'Electrical Cables 4 Core',category:'Electrical',vendor:'Havells',quantity:1000,unit:'Meters',rate:450,amount:450000,status:'Open'},
  ],
  eot: [
    {id:'EOT-001',pr_number:'10000245',vendor:'ABC Constructions',original_date:'2024-03-01',extended_date:'2024-04-15',reason:'Material shortage',status:'Approved',days_extended:45},
    {id:'EOT-002',pr_number:'10000248',vendor:'Steel Corp Ltd',original_date:'2024-02-28',extended_date:'2024-03-31',reason:'Delivery delay',status:'Pending',days_extended:31},
  ],
};

export default function PRPOApp() {
  const [tab, setTab] = useState('overview');
  const [selectedPR, setSelectedPR] = useState(null);
  const [demoMode, setDemoMode] = useState(false);

  // Raw data from APIs
  const [prData,  setPR]  = useState([]);
  const [nfaData, setNFA] = useState([]);
  const [mktData, setMkt] = useState([]);
  const [eotData, setEOT] = useState([]);
  const [sapPR,   setSapPR]  = useState([]);
  const [sapPO,   setSapPO]  = useState([]);
  const [sapPR2PO,setSapLink]= useState([]);
  const [vendors, setVendors]= useState([]);

  const [loading, setLoading] = useState({pr:true,nfa:true,mkt:true,eot:true,sapPR:true,sapPO:true});
  const [errors,  setErrors]  = useState({});
  const [lastRefresh, setLR]  = useState(null);

  // Filters
  const [fSearch,   setSearch]   = useState('');
  const [fStatus,   setFStatus]  = useState('');
  const [fVendor,   setFVendor]  = useState('');
  const [fStage,    setFStage]   = useState('');
  const [fGroup,    setFGroup]   = useState('');

  const logout = () => { sessionStorage.removeItem('prpo_auth'); window.location.reload(); };

  // ── Fetch helpers ────────────────────────────────────────────────────────────
  const fetchVG = useCallback(async (type, setter, key) => {
    const url = VG_URLS[type];
    try {
      const r = await fetch(url, { mode: 'cors' });
      const json = await r.json();
      const arr = Array.isArray(json) ? json : json?.data || [];
      setter(arr);
    } catch(e) {
      setErrors(p=>({...p,[key]:'Local server not running. Run: node prpo_server.js'}));
    } finally {
      setLoading(p=>({...p,[key]:false}));
    }
  },[]);

  // ── Field accessor helpers (real column names from QMS) ───────────────────
  const PR = {
    id:           r => r['PR_Id']      || r['data.PR_Id']      || r.pr_id,
    no:           r => r['PR_No']      || r['data.PR_No']      || r.pr_no,
    epr:          r => r['EPR_No']     || r['data.EPR_No']     || r.epr_no,
    enfa:         r => r['ENFA_No']    || r['data.ENFA_No']    || r.enfa_no,
    title:        r => r['Scope']      || r['data.Scope']      || r.scope || r.description || '',
    project:      r => r['Project_Name']   || r['data.Project_Name']   || r.project_name || '',
    group:        r => r['Project_Group']  || r['data.Project_Group']  || r.project_group || '',
    budget:       r => r['Budget']     || r['data.Budget']     || 0,
    date:         r => r['PRN_Date']   || r['data.PRN_Date']   || r['Created_Date'] || r['data.Created_Date'] || '',
    created:      r => r['Created_Date']   || r['data.Created_Date']   || '',
    status:       r => r['Status']     || r['data.Status']     || 0,
    l1Sign:       r => r['Validator_One_E_Sign']  || r['data.Validator_One_E_Sign']  || '',
    l1Date:       r => r['Validator_One_Date']    || r['data.Validator_One_Date']    || '',
    l1Who:        r => r['Validator_One']         || r['data.Validator_One']         || '',
    l1Msg:        r => r['Level_One_Status_Msg']  || r['data.Level_One_Status_Msg']  || '',
    l2Sign:       r => r['Validator_Two_E_Sign']  || r['data.Validator_Two_E_Sign']  || '',
    l2Date:       r => r['Validator_Two_Date']    || r['data.Validator_Two_Date']    || '',
    l2Who:        r => r['Validator_Two']         || r['data.Validator_Two']         || '',
    cpSign:       r => r['CP_Team_E_Sign']        || r['data.CP_Team_E_Sign']        || '',
    cpDate:       r => r['CP_Team_Date']          || r['data.CP_Team_Date']          || '',
    cpWho:        r => r['CP_Team']               || r['data.CP_Team']               || '',
    asgSign:      r => r['Assignee_Team_E_Sign']  || r['data.Assignee_Team_E_Sign']  || '',
    asgDate:      r => r['Assignee_Team_Date']    || r['data.Assignee_Team_Date']    || '',
    nfaConverted: r => +( r['NFA_Converted']  || r['data.NFA_Converted']  || 0),
    rfqConverted: r => +( r['RFQ_Converted']  || r['data.RFQ_Converted']  || 0),
    isSapPR:      r => +( r['Is_Sap_Pr']      || r['data.Is_Sap_Pr']      || 0),
    isUrgent:     r => +( r['Exigent']         || r['data.Exigent']         || 0),
    nfaDate:      r => r['NFA_Date']          || r['data.NFA_Date']          || '',
    location:     r => r['Location']          || r['data.Location']          || '',
    city:         r => r['City']              || r['data.City']              || '',
  };

  const NFA = {
    id:       r => r['NF_Id']      || r['data.NF_Id']      || r.nf_id,
    prId:     r => r['PR_Id']      || r['data.PR_Id']      || r.pr_id,
    nfaNo:    r => r['NFA_No']     || r['data.NFA_No']     || '',
    enfaNo:   r => r['ENFA_No']    || r['data.ENFA_No']    || '',
    title:    r => r['NFA_Title']  || r['data.NFA_Title']  || '',
    project:  r => r['Project_Name']  || r['data.Project_Name']  || '',
    vendor:   r => r['Vendor_Name']   || r['data.Vendor_Name']   || '',
    amount:   r => r['ENFA_Amount']   || r['data.ENFA_Amount']   || 0,
    budget:   r => r['Budget']        || r['data.Budget']        || '',
    status:   r => r['Approval_Status']|| r['data.Approval_Status']|| 0,
    woPoNum:  r => r['WoOrPo_Num']    || r['data.WoOrPo_Num']    || '',
    woPoStatus: r => r['WoOrPo_Status']|| r['data.WoOrPo_Status']|| 0,
    l1Sign:   r => r['Level_One_E_Sign']   || r['data.Level_One_E_Sign']   || '',
    l1Team:   r => r['Level_One_Team']     || r['data.Level_One_Team']     || '',
    l1Date:   r => r['Level_One_Date']     || r['data.Level_One_Date']     || '',
    l2Sign:   r => r['Level_Two_E_Sign']   || r['data.Level_Two_E_Sign']   || '',
    l2Team:   r => r['Level_Two_Team']     || r['data.Level_Two_Team']     || '',
    l3Sign:   r => r['Level_Three_E_Sign'] || r['data.Level_Three_E_Sign'] || '',
    l3Team:   r => r['Level_Three_Team']   || r['data.Level_Three_Team']   || '',
    l4Sign:   r => r['Level_Four_E_Sign']  || r['data.Level_Four_E_Sign']  || '',
    l5Sign:   r => r['Level_Five_E_Sign']  || r['data.Level_Five_E_Sign']  || '',
    l6Sign:   r => r['Level_Six_E_Sign']   || r['data.Level_Six_E_Sign']   || '',
    l7Sign:   r => r['Level_Seven_E_Sign'] || r['data.Level_Seven_E_Sign'] || '',
    created:  r => r['Created_Date']  || r['data.Created_Date']  || '',
    vendorOne:r => r['Vendor_One']    || r['data.Vendor_One']    || '',
    vendorTwo:r => r['Vendor_Two']    || r['data.Vendor_Two']    || '',
    vendorThree:r=>r['Vendor_Three']  || r['data.Vendor_Three']  || '',
  };

  const fetchSAP = useCallback(async (queryType, setter, key) => {
    try {
      const r = await fetch(SAP_PROXY, {
        method:'POST', mode:'cors',
        headers:{'Content-Type':'application/json'},
        body: JSON.stringify({query_type: queryType}),
      });
      const data = await r.json();
      setter(data?.data||data||[]);
    } catch(e) {
      setErrors(p=>({...p,[key]:e.message}));
    } finally {
      setLoading(p=>({...p,[key]:false}));
    }
  },[]);

  const refreshAll = useCallback(() => {
    setLoading({pr:true,nfa:true,mkt:true,eot:true,sapPR:true,sapPO:true});
    setErrors({});
    fetchVG('pr',     setPR,     'pr');
    fetchVG('nfa',    setNFA,    'nfa');
    fetchVG('market', setMkt,    'mkt');
    fetchVG('eot',    setEOT,    'eot');
    fetchSAP('pr_list', setSapPR,  'sapPR');
    fetchSAP('po_list', setSapPO,  'sapPO');
    fetchSAP('pr_to_po',setSapLink,'sapLink');
    fetchSAP('vendors', setVendors,'vendors');
    setLR(new Date());
  },[fetchVG,fetchSAP]);

  const loadDemo = () => {
    setPR(MOCK.pr); setNFA(MOCK.nfa); setMkt(MOCK.market); setEOT(MOCK.eot);
    setSapPR(MOCK.pr); setSapPO(MOCK.sapPO); setSapLink(MOCK.sapPR2PO);
    setLoading({pr:false,nfa:false,mkt:false,eot:false,sapPR:false,sapPO:false});
    setErrors({});
    setDemoMode(true);
    setLR(new Date());
  };

  useEffect(()=>{ refreshAll(); },[]);

  // Auto-switch to demo mode if all VG APIs fail after 6 seconds
  useEffect(()=>{
    const t = setTimeout(()=>{
      const allFailed = ['pr','nfa','mkt','eot'].every(k=>errors[k]||(!loading[k]&&!{pr:prData,nfa:nfaData,mkt:mktData,eot:eotData}[k]?.length));
      if(allFailed && !demoMode) loadDemo();
    }, 6000);
    return ()=>clearTimeout(t);
  },[errors,loading,prData,nfaData,mktData,eotData,demoMode]);

  // ── Merge data using real field names ───────────────────────────────────────
  const nfaMap = useMemo(()=>{
    const m = {};
    nfaData.forEach(n=>{
      const prId = String(NFA.prId(n)||'');
      if(prId) m[prId] = n;
    });
    return m;
  },[nfaData]);

  const poMap = useMemo(()=>{
    const m = {};
    sapPR2PO.forEach(r=>{
      const prNum = r.pr_number||r.BANFN||'';
      if(prNum&&r.po_number) m[String(prNum)] = r;
    });
    return m;
  },[sapPR2PO]);

  const allPRs = useMemo(()=>{
    if(prData.length) return prData;
    return sapPR;
  },[prData,sapPR]);

  // Filter
  const filtered = useMemo(()=>{
    return allPRs.filter(pr=>{
      const prNum = String(pr.pr_number||pr.BANFN||pr.id||'');
      const desc  = String(pr.description||pr.TXZ01||pr.subject||'').toLowerCase();
      const vendor= String(pr.vendor||pr.LIFNR||pr.vendor_name||'').toLowerCase();
      const group = String(pr.material_group||pr.MATKL||pr.category||'').toLowerCase();
      const nfa   = nfaMap[prNum];
      const po    = poMap[prNum];

      if(fSearch && !prNum.includes(fSearch) && !desc.includes(fSearch.toLowerCase())) return false;
      if(fVendor && !vendor.includes(fVendor.toLowerCase())) return false;
      if(fGroup  && !group.includes(fGroup.toLowerCase())) return false;
      if(fStage) {
        if(fStage==='pending_pr_approval'  && (pr.release_status==='X'||pr.FRGZU==='X')) return false;
        if(fStage==='pending_vg'           && !!nfa) return false;
        if(fStage==='pending_nfa_approval' && (nfa?.status==='Approved')) return false;
        if(fStage==='pending_po'           && !!po) return false;
        if(fStage==='completed'            && !po) return false;
      }
      return true;
    });
  },[allPRs,nfaMap,poMap,fSearch,fVendor,fGroup,fStage]);

  const kpi = useMemo(()=>{
    const total      = allPRs.length;
    const l1Approved = allPRs.filter(r=>!!PR.l1Sign(r)).length;
    const l2Approved = allPRs.filter(r=>!!PR.l2Sign(r)).length;
    const cpApproved = allPRs.filter(r=>!!PR.cpSign(r)).length;
    const asgApproved= allPRs.filter(r=>!!PR.asgSign(r)).length;
    const nfaCreated = allPRs.filter(r=>PR.nfaConverted(r)===1).length;
    const rfqCreated = allPRs.filter(r=>PR.rfqConverted(r)===1).length;
    const sapPRCount = allPRs.filter(r=>PR.isSapPR(r)===1).length;
    const urgent     = allPRs.filter(r=>PR.isUrgent(r)===1).length;
    const nfaApproved= nfaData.filter(r=>NFA.l1Sign(r)&&NFA.l2Sign(r)).length;
    const vendorDone = nfaData.filter(r=>!!NFA.vendor(r)).length;
    const woPoDone   = nfaData.filter(r=>!!NFA.woPoNum(r)).length;
    const totalBudget= allPRs.reduce((s,r)=>s+(Number(PR.budget(r))||0),0);
    const totalNFAVal= nfaData.reduce((s,r)=>s+(Number(NFA.amount(r))||0),0);
    return {total,l1Approved,l2Approved,cpApproved,asgApproved,nfaCreated,rfqCreated,
            sapPRCount,urgent,nfaApproved,vendorDone,woPoDone,totalBudget,totalNFAVal,
            pendingL1: total-l1Approved,
            pendingL2: l1Approved-l2Approved,
            pendingCP: l2Approved-cpApproved,
            pendingNFA: cpApproved-nfaCreated,
            pendingWOPO: nfaCreated-woPoDone,
    };
  },[allPRs,nfaData]);

  const fmt = n => n>=1e7?'₹'+(n/1e7).toFixed(1)+'Cr':n>=1e5?'₹'+(n/1e5).toFixed(1)+'L':'₹'+Math.round(n).toLocaleString();
  const isLoading = Object.values(loading).some(Boolean);

  // Funnel data for journey
  const funnelData = [
    {name:'PR Created',    value:kpi.total,      fill:T.teal},
    {name:'PR Approved',   value:kpi.prApproved, fill:T.green},
    {name:'Sent to VG',    value:kpi.sentToVG,   fill:T.blue},
    {name:'NFA Approved',  value:kpi.nfaApproved,fill:T.purple},
    {name:'Vendor Selected',value:kpi.hasVendor, fill:T.amber},
    {name:'PO Created',    value:kpi.hasPO,      fill:T.tealD},
    {name:'PO Approved',   value:kpi.poApproved, fill:T.green},
  ];

  // Status breakdown charts
  const prStatusChart = useMemo(()=>{
    const c={};prData.forEach(r=>{const s=r.status||r.Status||'Unknown';c[s]=(c[s]||0)+1;});
    return Object.entries(c).map(([n,v])=>({name:n,value:v})).sort((a,b)=>b.value-a.value);
  },[prData]);

  const nfaStatusChart = useMemo(()=>{
    const c={};nfaData.forEach(r=>{const s=r.status||r.Status||'Unknown';c[s]=(c[s]||0)+1;});
    return Object.entries(c).map(([n,v])=>({name:n,value:v})).sort((a,b)=>b.value-a.value);
  },[nfaData]);

  const groupChart = useMemo(()=>{
    const c={};allPRs.forEach(r=>{const g=r.material_group||r.MATKL||r.category||'Other';c[g]=(c[g]||0)+1;});
    return Object.entries(c).filter(([k])=>k&&k!=='Other').map(([n,v])=>({name:n,count:v})).sort((a,b)=>b.count-a.count).slice(0,10);
  },[allPRs]);

  const TABS = [
    {k:'overview',  l:'📊 Overview'},
    {k:'journey',   l:'🗺️ PR Journey'},
    {k:'pending',   l:'⏳ Pending'},
    {k:'nfa',       l:'📋 NFA Tracker'},
    {k:'po',        l:'📦 PO Tracker'},
    {k:'analytics', l:'📈 Analytics'},
  ];

  const navBg = 'linear-gradient(135deg,#0d2137 0%,#1a3a5c 60%,#006978 100%)';

  const dataStatus = [
    {name:'VG — PR',    l:loading.pr,  e:errors.pr,  n:prData.length},
    {name:'VG — NFA',   l:loading.nfa, e:errors.nfa, n:nfaData.length},
    {name:'VG — Market',l:loading.mkt, e:errors.mkt, n:mktData.length},
    {name:'VG — EOT',   l:loading.eot, e:errors.eot, n:eotData.length},
    {name:'SAP — PR',   l:loading.sapPR,e:errors.sapPR,n:sapPR.length},
    {name:'SAP — PO',   l:loading.sapPO,e:errors.sapPO,n:sapPO.length},
  ];

  return (
    <div style={{minHeight:'100vh',backgroundImage:'url(/bg.jpg)',backgroundSize:'cover',backgroundPosition:'center',backgroundAttachment:'fixed',fontFamily:'Inter,sans-serif'}}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}} @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}`}</style>
      <div style={{minHeight:'100vh',background:'rgba(255,255,255,0.03)'}}>

        {/* ── NAV ── */}
        <div style={{background:navBg,padding:'0 24px',display:'flex',alignItems:'center',justifyContent:'space-between',height:54,position:'sticky',top:0,zIndex:100,boxShadow:'0 2px 20px rgba(0,0,0,0.3)'}}>
          <div style={{display:'flex',alignItems:'center',gap:12}}>
            <img src="/swd-logo.png" alt="" style={{width:28,height:28,objectFit:'contain'}}/>
            <div>
              <p style={{color:'#fff',fontWeight:900,fontSize:13,margin:0}}>PR Journey Intelligence</p>
              <p style={{color:'rgba(255,255,255,0.55)',fontSize:9,margin:0,fontWeight:600}}>SMARTWORLD · SAP ↔ VENDORGLOBE ↔ NFA ↔ PO</p>
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
            {isLoading&&<div style={{width:16,height:16,border:'2px solid rgba(255,255,255,0.3)',borderTop:'2px solid #fff',borderRadius:'50%',animation:'spin 0.8s linear infinite'}}/>}
            {lastRefresh&&<span style={{fontSize:9,color:'rgba(255,255,255,0.5)'}}>{lastRefresh.toLocaleTimeString()}</span>}
            {demoMode&&<span style={{fontSize:9,fontWeight:800,color:'#ffd740',background:'rgba(255,215,64,0.15)',borderRadius:20,padding:'2px 8px'}}>DEMO DATA</span>}
            <button onClick={demoMode?refreshAll:loadDemo}
              style={{background:demoMode?'rgba(46,125,50,0.7)':'rgba(245,124,0,0.8)',color:'#fff',border:'none',borderRadius:8,padding:'5px 12px',fontSize:11,fontWeight:700,cursor:'pointer'}}>
              {demoMode?'🔴 Load Live':'🎭 Demo Mode'}
            </button>
            <button onClick={refreshAll} style={{background:'rgba(0,151,167,0.7)',color:'#fff',border:'none',borderRadius:8,padding:'5px 12px',fontSize:11,fontWeight:700,cursor:'pointer'}}>🔄</button>
            <button onClick={logout}     style={{background:'rgba(211,47,47,0.7)', color:'#fff',border:'none',borderRadius:8,padding:'5px 12px',fontSize:11,fontWeight:700,cursor:'pointer'}}>🚪</button>
          </div>
        </div>

        {/* ── FILTER BAR ── */}
        <div style={{background:'linear-gradient(90deg,#0d2137,#1a3a5c,#006978)',padding:'10px 24px'}}>
          <div style={{display:'grid',gridTemplateColumns:'2fr 1fr 1fr 1fr 1fr auto',gap:10,alignItems:'end'}}>
            <div>
              <div style={{fontSize:9,fontWeight:800,color:'rgba(255,255,255,0.8)',textTransform:'uppercase',letterSpacing:0.5,marginBottom:3}}>Search PR / Description</div>
              <input value={fSearch} onChange={e=>setSearch(e.target.value)} placeholder="PR number or keyword…"
                style={{width:'100%',fontSize:11,color:T.navy,background:'rgba(255,255,255,0.95)',border:'1px solid rgba(255,255,255,0.4)',borderRadius:8,padding:'5px 10px',boxSizing:'border-box'}}/>
            </div>
            <FSelect label="Pending Stage" value={fStage} onChange={setFStage}
              options={['pending_pr_approval','pending_vg','pending_nfa_approval','pending_po','completed']}/>
            <FSelect label="Material Group" value={fGroup}  onChange={setFGroup}
              options={[...new Set(allPRs.map(r=>r.material_group||r.MATKL).filter(Boolean))].sort()}/>
            <FSelect label="Vendor"         value={fVendor} onChange={setFVendor}
              options={[...new Set([...sapPO.map(r=>r.vendor||r.LIFNR),...nfaData.map(r=>r.vendor||r.vendor_name)].filter(Boolean))].sort()}/>
            <div>
              <div style={{fontSize:9,fontWeight:800,color:'rgba(255,255,255,0.7)',textTransform:'uppercase',marginBottom:3}}>Showing</div>
              <div style={{fontSize:13,fontWeight:900,color:'#fff'}}>{filtered.length.toLocaleString()} <span style={{fontSize:9,opacity:0.7}}>/ {allPRs.length}</span></div>
            </div>
            {(fSearch||fStage||fGroup||fVendor)&&(
              <button onClick={()=>{setSearch('');setFStage('');setFGroup('');setFVendor('');}}
                style={{background:'rgba(211,47,47,0.7)',color:'#fff',border:'none',borderRadius:8,padding:'5px 12px',fontSize:10,fontWeight:700,cursor:'pointer'}}>✕ Reset</button>
            )}
          </div>
        </div>

        <main style={{maxWidth:1600,margin:'0 auto',padding:'16px 20px 40px',display:'flex',flexDirection:'column',gap:14}}>

          {/* Demo mode banner */}
          {demoMode&&(
            <div style={{background:'rgba(0,151,167,0.07)',border:'1px solid rgba(0,151,167,0.25)',borderRadius:12,padding:'10px 18px',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
              <div style={{display:'flex',alignItems:'center',gap:10}}>
                <span style={{fontSize:18}}>🔑</span>
                <div>
                  <span style={{fontSize:12,fontWeight:800,color:T.tealD}}>Demo Mode — Login to QMS to see live data</span>
                  <span style={{fontSize:11,color:T.gray,marginLeft:12}}>
                    Open <strong>smartworlddevelopersonline.com/qms</strong> in this browser → login → come back and click "Try Live Data"
                  </span>
                </div>
              </div>
              <button onClick={refreshAll} style={{background:T.teal,color:'#fff',border:'none',borderRadius:8,padding:'5px 14px',fontSize:11,fontWeight:700,cursor:'pointer'}}>🔄 Try Live Data</button>
            </div>
          )}

          {/* ══ OVERVIEW ══ */}
          {tab==='overview'&&(<>
            {/* KPI row 1 — Journey funnel KPIs */}
            <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:12}}>
              <KpiCard icon="📝" label="Total PRs"           value={(kpi.total||0).toLocaleString()}         color={T.teal}   sub={`SAP + VendorGlobe combined`}             loading={isLoading} pct={null}/>
              <KpiCard icon="✅" label="PR Approved (SAP)"   value={(kpi.prApproved||0).toLocaleString()}    color={T.green}  sub={`${kpi.pendingPR} pending approval`}      loading={isLoading} pct={kpi.total?Math.round(kpi.prApproved/kpi.total*100):0}/>
              <KpiCard icon="🌐" label="Sent to VendorGlobe" value={(kpi.sentToVG||0).toLocaleString()}      color={T.blue}   sub={`${kpi.pendingVG||0} approved but not sent`} loading={isLoading} pct={kpi.prApproved?Math.round(kpi.sentToVG/kpi.prApproved*100):0}/>
              <KpiCard icon="📋" label="NFA Approved"        value={(kpi.nfaApproved||0).toLocaleString()}   color={T.purple} sub={`${kpi.pendingNFA||0} pending NFA approval`} loading={isLoading} pct={kpi.sentToVG?Math.round(kpi.nfaApproved/kpi.sentToVG*100):0}/>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:12}}>
              <KpiCard icon="🏢" label="Vendor Selected"     value={(kpi.hasVendor||0).toLocaleString()}     color={T.amber}  sub="Vendors finalized via NFA"                loading={isLoading} pct={null}/>
              <KpiCard icon="📦" label="PO Created (SAP)"    value={(kpi.hasPO||0).toLocaleString()}         color={T.tealD}  sub={`${kpi.pendingPO||0} awaiting PO creation`} loading={isLoading} pct={kpi.nfaApproved?Math.round(kpi.hasPO/kpi.nfaApproved*100):0}/>
              <KpiCard icon="✅" label="PO Approved"          value={(kpi.poApproved||0).toLocaleString()}    color={T.green}  sub="POs released in SAP"                      loading={isLoading} pct={kpi.hasPO?Math.round(kpi.poApproved/kpi.hasPO*100):0}/>
              <KpiCard icon="💰" label="Total PO Value"       value={fmt(kpi.totalPOVal||0)}                  color={T.navy}   sub="Net value of all POs from SAP"            loading={isLoading} pct={null}/>
            </div>

            {/* Funnel + status charts */}
            <div style={{display:'grid',gridTemplateColumns:'2fr 1fr 1fr',gap:12}}>
              <GC style={{padding:18}}>
                <SH title="PR Journey Funnel" sub="Drop-off at each stage"/>
                {isLoading?<Spinner/>:(
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={funnelData} layout="vertical" margin={{top:0,right:60,bottom:0,left:0}}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,60,100,0.07)" horizontal={false}/>
                      <XAxis type="number" tick={{fill:T.textM,fontSize:8}} axisLine={false} tickLine={false}/>
                      <YAxis type="category" dataKey="name" tick={{fill:T.navy,fontSize:10,fontWeight:700}} axisLine={false} tickLine={false} width={130}/>
                      <Tooltip content={<CTip/>}/>
                      <Bar dataKey="value" name="Count" radius={[0,4,4,0]}>
                        {funnelData.map((d,i)=><Cell key={i} fill={d.fill}/>)}
                        <LabelList dataKey="value" position="right" style={{fill:T.navy,fontSize:9,fontWeight:800}} formatter={v=>v.toLocaleString()}/>
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </GC>
              <GC style={{padding:18}}>
                <SH title="PR Status (VendorGlobe)"/>
                {loading.pr?<Spinner/>:errors.pr?<ErrBox msg={errors.pr}/>:(
                  <>
                    <ResponsiveContainer width="100%" height={140}>
                      <PieChart>
                        <Pie data={prStatusChart} cx="50%" cy="50%" innerRadius={35} outerRadius={60} paddingAngle={2} dataKey="value" strokeWidth={1.5} stroke="#fff">
                          {prStatusChart.map((_,i)=><Cell key={i} fill={CC[i%CC.length]}/>)}
                        </Pie>
                        <Tooltip content={<CTip/>}/>
                      </PieChart>
                    </ResponsiveContainer>
                    <div style={{display:'flex',flexDirection:'column',gap:5}}>
                      {prStatusChart.slice(0,5).map((d,i)=>(
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
                <SH title="NFA Status"/>
                {loading.nfa?<Spinner/>:errors.nfa?<ErrBox msg={errors.nfa}/>:(
                  <>
                    <ResponsiveContainer width="100%" height={140}>
                      <PieChart>
                        <Pie data={nfaStatusChart} cx="50%" cy="50%" innerRadius={35} outerRadius={60} paddingAngle={2} dataKey="value" strokeWidth={1.5} stroke="#fff">
                          {nfaStatusChart.map((_,i)=><Cell key={i} fill={CC[(i+3)%CC.length]}/>)}
                        </Pie>
                        <Tooltip content={<CTip/>}/>
                      </PieChart>
                    </ResponsiveContainer>
                    <div style={{display:'flex',flexDirection:'column',gap:5}}>
                      {nfaStatusChart.slice(0,5).map((d,i)=>(
                        <div key={i} style={{display:'flex',alignItems:'center',gap:6}}>
                          <div style={{width:8,height:8,borderRadius:2,background:CC[(i+3)%CC.length],flexShrink:0}}/>
                          <span style={{fontSize:9,color:T.textM,flex:1,fontWeight:600}}>{d.name}</span>
                          <span style={{fontSize:10,fontWeight:800,color:CC[(i+3)%CC.length]}}>{d.value.toLocaleString()}</span>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </GC>
            </div>

            {/* Material group breakdown */}
            <GC style={{padding:18}}>
              <SH title="PR Volume by Material Group / Category" sub="Top 10 procurement categories"/>
              {isLoading?<Spinner/>:(
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={groupChart} margin={{top:8,right:20,bottom:8,left:0}}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,60,100,0.07)" vertical={false}/>
                    <XAxis dataKey="name" tick={{fill:T.textM,fontSize:9,fontWeight:600}} axisLine={false} tickLine={false} angle={-15} textAnchor="end" height={40}/>
                    <YAxis tick={{fill:T.textM,fontSize:9}} axisLine={false} tickLine={false} width={30}/>
                    <Tooltip content={<CTip/>}/>
                    <Bar dataKey="count" name="PRs" radius={[4,4,0,0]}>
                      {groupChart.map((_,i)=><Cell key={i} fill={CC[i%CC.length]}/>)}
                      <LabelList dataKey="count" position="top" style={{fill:T.navy,fontSize:9,fontWeight:800}}/>
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </GC>

            {/* Data source status */}
            <GC style={{padding:14}}>
              <div style={{display:'flex',alignItems:'center',gap:12,flexWrap:'wrap'}}>
                <span style={{fontSize:10,fontWeight:800,color:T.tealD,textTransform:'uppercase',letterSpacing:0.4}}>Live Data Sources</span>
                {dataStatus.map((s,i)=>(
                  <div key={i} style={{display:'flex',alignItems:'center',gap:6,background:'rgba(0,60,100,0.04)',border:'1px solid rgba(0,60,100,0.1)',borderRadius:8,padding:'4px 10px'}}>
                    <div style={{width:7,height:7,borderRadius:'50%',background:s.l?T.amber:s.e?T.red:T.green}}/>
                    <span style={{fontSize:10,fontWeight:700,color:T.textM}}>{s.name}</span>
                    <span style={{fontSize:9,color:T.gray}}>{s.l?'…':s.e?'Error':s.n+' rows'}</span>
                  </div>
                ))}
              </div>
            </GC>
          </>)}

          {/* ══ PR JOURNEY TAB ══ */}
          {tab==='journey'&&(<>
            {selectedPR ? (
              <>
                <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:4}}>
                  <button onClick={()=>setSelectedPR(null)}
                    style={{background:'rgba(0,151,167,0.1)',border:'1px solid rgba(0,151,167,0.3)',borderRadius:8,padding:'6px 14px',fontSize:11,fontWeight:700,color:T.tealD,cursor:'pointer'}}>
                    ← Back to all PRs
                  </button>
                  <span style={{fontSize:12,fontWeight:700,color:T.textM}}>PR Journey — #{selectedPR.pr_number||selectedPR.BANFN}</span>
                </div>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14}}>
                  <JourneyTimeline pr={selectedPR} nfaMap={nfaMap} poMap={poMap}/>
                  {/* PR Details */}
                  <div style={{display:'flex',flexDirection:'column',gap:12}}>
                    <GC style={{padding:18}}>
                      <SH title="PR Details"/>
                      <table style={{width:'100%',borderCollapse:'collapse',fontSize:11}}>
                        <tbody>
                          {Object.entries(selectedPR).filter(([k])=>!k.startsWith('_')).slice(0,20).map(([k,v],i)=>(
                            <tr key={i} style={{borderBottom:'1px solid rgba(0,60,100,0.05)'}}>
                              <td style={{padding:'5px 8px',fontWeight:700,color:T.textL,fontSize:10,textTransform:'uppercase',width:'40%'}}>{k}</td>
                              <td style={{padding:'5px 8px',color:T.navy,fontWeight:600}}>{String(v??'—')}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </GC>
                    {nfaMap[String(selectedPR.pr_number||selectedPR.BANFN||'')] && (
                      <GC style={{padding:18}}>
                        <SH title="Linked NFA"/>
                        <table style={{width:'100%',borderCollapse:'collapse',fontSize:11}}>
                          <tbody>
                            {Object.entries(nfaMap[String(selectedPR.pr_number||selectedPR.BANFN||'')]).slice(0,15).map(([k,v],i)=>(
                              <tr key={i} style={{borderBottom:'1px solid rgba(0,60,100,0.05)'}}>
                                <td style={{padding:'5px 8px',fontWeight:700,color:T.textL,fontSize:10,textTransform:'uppercase',width:'40%'}}>{k}</td>
                                <td style={{padding:'5px 8px',color:T.navy}}>{String(v??'—')}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </GC>
                    )}
                    {poMap[String(selectedPR.pr_number||selectedPR.BANFN||'')] && (
                      <GC style={{padding:18}}>
                        <SH title="Linked PO (SAP)"/>
                        <table style={{width:'100%',borderCollapse:'collapse',fontSize:11}}>
                          <tbody>
                            {Object.entries(poMap[String(selectedPR.pr_number||selectedPR.BANFN||'')]).slice(0,15).map(([k,v],i)=>(
                              <tr key={i} style={{borderBottom:'1px solid rgba(0,60,100,0.05)'}}>
                                <td style={{padding:'5px 8px',fontWeight:700,color:T.textL,fontSize:10,textTransform:'uppercase',width:'40%'}}>{k}</td>
                                <td style={{padding:'5px 8px',color:T.navy}}>{String(v??'—')}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </GC>
                    )}
                  </div>
                </div>
              </>
            ) : (
              <GC style={{padding:18}}>
                <SH title="All PRs — Click to see full journey" sub={`${filtered.length} PRs shown · Click any row to drill into its journey`}/>
                <div style={{overflowY:'auto',maxHeight:'70vh'}}>
                  <table style={{width:'100%',borderCollapse:'collapse',fontSize:11}}>
                    <thead>
                      <tr style={{background:'rgba(0,105,120,0.07)',position:'sticky',top:0,zIndex:1}}>
                        {['PR Number','Description','WBS / Project','Date','Release','VG PR','NFA','Vendor','PO Number','PO Value','Stage'].map(h=>(
                          <th key={h} style={{padding:'7px 10px',textAlign:'left',fontSize:9,fontWeight:800,color:T.tealD,
                            textTransform:'uppercase',borderBottom:`2px solid rgba(0,105,120,0.15)`,whiteSpace:'nowrap',
                            background:'rgba(255,255,255,0.97)'}}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.slice(0,300).map((pr,i)=>{
                        const prNum  = String(pr.pr_number||pr.BANFN||'');
                        const nfa    = nfaMap[prNum];
                        const po     = poMap[prNum];
                        const appr   = pr.release_status==='X'||pr.FRGZU==='X';
                        // Compute current stage
                        const stage  = !appr?'⏳ PR Approval':!nfa?'⏳ VendorGlobe':
                          !(nfa?.status==='Approved'||nfa?.approval_status==='Approved')?'⏳ NFA Approval':
                          !po?'⏳ PO Creation':
                          !(po.release_status==='X'||po.FRGKE==='X')?'⏳ PO Approval':'✅ Complete';
                        const stageColor = stage.includes('✅')?T.green:T.amber;
                        return (
                          <tr key={i} onClick={()=>setSelectedPR(pr)}
                            style={{borderBottom:'1px solid rgba(0,60,100,0.05)',cursor:'pointer',
                              background:i%2===0?'transparent':'rgba(0,151,167,0.02)'}}
                            onMouseEnter={e=>e.currentTarget.style.background='rgba(0,151,167,0.07)'}
                            onMouseLeave={e=>e.currentTarget.style.background=i%2===0?'transparent':'rgba(0,151,167,0.02)'}>
                            <td style={{padding:'6px 10px',color:T.tealD,fontWeight:800}}>{prNum||'—'}</td>
                            <td style={{padding:'6px 10px',color:T.navy,maxWidth:180,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{pr.description||pr.TXZ01||pr.subject||'—'}</td>
                            <td style={{padding:'6px 10px',color:T.textM,fontSize:10}}>{pr.wbs_element||pr.PS_PSP_PNR||pr.project||'—'}</td>
                            <td style={{padding:'6px 10px',color:T.textM,fontSize:10,whiteSpace:'nowrap'}}>{pr.pr_date||pr.BADAT||pr.created_at||'—'}</td>
                            <td style={{padding:'6px 10px',textAlign:'center'}}>{appr?'✅':'⏳'}</td>
                            <td style={{padding:'6px 10px',textAlign:'center'}}>{nfa?'✅':'—'}</td>
                            <td style={{padding:'6px 10px',textAlign:'center'}}>{nfa?<StatusBadge s={nfa.status||nfa.approval_status}/>:'—'}</td>
                            <td style={{padding:'6px 10px',color:T.textM,fontSize:10,whiteSpace:'nowrap',maxWidth:120,overflow:'hidden',textOverflow:'ellipsis'}}>{nfa?.vendor||nfa?.vendor_name||po?.vendor||po?.LIFNR||'—'}</td>
                            <td style={{padding:'6px 10px',color:T.tealD,fontWeight:700}}>{po?.po_number||po?.EBELN||'—'}</td>
                            <td style={{padding:'6px 10px',fontWeight:700,color:T.green}}>{po?.net_value||po?.NETWR?'₹'+parseFloat(po.net_value||po.NETWR).toLocaleString():'—'}</td>
                            <td style={{padding:'6px 10px'}}><span style={{fontSize:9,fontWeight:800,color:'#fff',background:stageColor,borderRadius:4,padding:'2px 7px',whiteSpace:'nowrap'}}>{stage}</span></td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  {filtered.length>300&&<p style={{fontSize:10,color:T.gray,textAlign:'center',padding:8}}>Showing 300 of {filtered.length} — use filters to narrow down</p>}
                </div>
              </GC>
            )}
          </>)}

          {/* ══ PENDING TAB ══ */}
          {tab==='pending'&&(
            <div style={{display:'flex',flexDirection:'column',gap:12}}>
              <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:12}}>
                <KpiCard icon="⏳" label="Pending PR Approval"   value={(kpi.pendingPR||0).toLocaleString()}  color={T.red}    sub="SAP PRs not yet released"            loading={isLoading} pct={null}/>
                <KpiCard icon="🌐" label="Not Sent to VG"        value={(kpi.pendingVG||0).toLocaleString()}  color={T.orange} sub="Approved PRs not on VendorGlobe"    loading={isLoading} pct={null}/>
                <KpiCard icon="📋" label="NFA Pending Approval"  value={(kpi.pendingNFA||0).toLocaleString()} color={T.amber}  sub="NFAs created but not yet approved"   loading={isLoading} pct={null}/>
                <KpiCard icon="📦" label="Pending PO Creation"   value={(kpi.pendingPO||0).toLocaleString()}  color={T.purple} sub="Approved NFAs without a PO"          loading={isLoading} pct={null}/>
              </div>
              {/* Pending tables by stage */}
              {[
                {title:'PRs Pending Approval (SAP)',        color:T.red,
                  rows: filtered.filter(pr=>!(pr.release_status==='X'||pr.FRGZU==='X')), stage:'PR Approval'},
                {title:'Approved PRs — Not yet on VendorGlobe', color:T.orange,
                  rows: filtered.filter(pr=>(pr.release_status==='X'||pr.FRGZU==='X')&&!nfaMap[String(pr.pr_number||pr.BANFN||'')]), stage:'VG Submission'},
                {title:'NFAs Pending Approval',             color:T.amber,
                  rows: filtered.filter(pr=>nfaMap[String(pr.pr_number||pr.BANFN||'')]&&!(nfaMap[String(pr.pr_number||pr.BANFN||'')]?.status==='Approved')), stage:'NFA Approval'},
                {title:'NFAs Approved — PO Not Yet Created',color:T.purple,
                  rows: filtered.filter(pr=>nfaMap[String(pr.pr_number||pr.BANFN||'')]?.status==='Approved'&&!poMap[String(pr.pr_number||pr.BANFN||'')]), stage:'PO Creation'},
              ].map((section,si)=>section.rows.length>0&&(
                <GC key={si} style={{padding:18}}>
                  <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:12}}>
                    <div style={{display:'flex',alignItems:'center',gap:10}}>
                      <div style={{width:4,height:24,background:section.color,borderRadius:2}}/>
                      <SH title={section.title} sub={`${section.rows.length} PRs pending at this stage`}/>
                    </div>
                  </div>
                  <div style={{overflowX:'auto',maxHeight:300,overflowY:'auto'}}>
                    <table style={{width:'100%',borderCollapse:'collapse',fontSize:11}}>
                      <thead><tr style={{background:`${section.color}10`}}>
                        {['PR #','Description','WBS','Date','Requester','Amount','Age (days)'].map(h=>(
                          <th key={h} style={{padding:'6px 10px',textAlign:'left',fontSize:9,fontWeight:800,color:section.color,textTransform:'uppercase',borderBottom:`1px solid ${section.color}25`,whiteSpace:'nowrap'}}>{h}</th>
                        ))}
                      </tr></thead>
                      <tbody>
                        {section.rows.slice(0,50).map((pr,i)=>(
                          <tr key={i} onClick={()=>{setSelectedPR(pr);setTab('journey');}}
                            style={{borderBottom:'1px solid rgba(0,60,100,0.05)',cursor:'pointer'}}
                            onMouseEnter={e=>e.currentTarget.style.background=`${section.color}08`}
                            onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                            <td style={{padding:'5px 10px',color:T.tealD,fontWeight:800}}>{pr.pr_number||pr.BANFN||'—'}</td>
                            <td style={{padding:'5px 10px',color:T.navy,maxWidth:200,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{pr.description||pr.TXZ01||'—'}</td>
                            <td style={{padding:'5px 10px',color:T.textM,fontSize:10}}>{pr.wbs_element||pr.PS_PSP_PNR||'—'}</td>
                            <td style={{padding:'5px 10px',color:T.textM,fontSize:10,whiteSpace:'nowrap'}}>{pr.pr_date||pr.BADAT||'—'}</td>
                            <td style={{padding:'5px 10px',color:T.textM,fontSize:10}}>{pr.requester||pr.AFNAM||'—'}</td>
                            <td style={{padding:'5px 10px',fontWeight:700,color:T.green}}>{pr.price||pr.PREIS?'₹'+parseFloat(pr.price||pr.PREIS).toLocaleString():'—'}</td>
                            <td style={{padding:'5px 10px',fontWeight:700,color:section.color}}>{pr.age_days||'—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </GC>
              ))}
            </div>
          )}

          {/* ══ NFA TRACKER ══ */}
          {tab==='nfa'&&(
            <GC style={{padding:18}}>
              <SH title="NFA Tracker — All NFAs from VendorGlobe" sub={`${nfaData.length} NFAs`}/>
              {loading.nfa?<Spinner/>:errors.nfa?<ErrBox msg={errors.nfa} onRetry={refreshAll}/>:(
                <div style={{overflowY:'auto',maxHeight:'70vh'}}>
                  <table style={{width:'100%',borderCollapse:'collapse',fontSize:11}}>
                    <thead><tr style={{background:'rgba(106,27,154,0.06)',position:'sticky',top:0,background:'rgba(255,255,255,0.97)'}}>
                      {(nfaData[0]?Object.keys(nfaData[0]).slice(0,12):[]).map(h=>(
                        <th key={h} style={{padding:'7px 10px',textAlign:'left',fontSize:9,fontWeight:800,color:T.purple,textTransform:'uppercase',borderBottom:'2px solid rgba(106,27,154,0.15)',whiteSpace:'nowrap'}}>{h}</th>
                      ))}
                    </tr></thead>
                    <tbody>
                      {nfaData.slice(0,300).map((r,i)=>(
                        <tr key={i} style={{borderBottom:'1px solid rgba(0,60,100,0.05)',background:i%2===0?'transparent':'rgba(106,27,154,0.02)'}}>
                          {(nfaData[0]?Object.keys(nfaData[0]).slice(0,12):[]).map(k=>(
                            <td key={k} style={{padding:'5px 10px',color:k.toLowerCase().includes('status')?undefined:T.textM,fontWeight:k.toLowerCase().includes('status')?700:400,maxWidth:160,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
                              {k.toLowerCase().includes('status')?<StatusBadge s={r[k]}/>:String(r[k]??'—')}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </GC>
          )}

          {/* ══ PO TRACKER ══ */}
          {tab==='po'&&(
            <GC style={{padding:18}}>
              <SH title="PO Tracker — SAP Purchase Orders" sub={`${sapPO.length} POs from SAP EKKO`}/>
              {loading.sapPO?<Spinner/>:errors.sapPO?<ErrBox msg={errors.sapPO} onRetry={refreshAll}/>:(
                <div style={{overflowY:'auto',maxHeight:'70vh'}}>
                  <table style={{width:'100%',borderCollapse:'collapse',fontSize:11}}>
                    <thead><tr style={{position:'sticky',top:0,background:'rgba(255,255,255,0.97)'}}>
                      {['PO Number','PO Date','Vendor','Type','Net Value','Currency','Purch. Group','Company','Plant','Release'].map(h=>(
                        <th key={h} style={{padding:'7px 10px',textAlign:'left',fontSize:9,fontWeight:800,color:T.tealD,textTransform:'uppercase',borderBottom:'2px solid rgba(0,105,120,0.15)',whiteSpace:'nowrap'}}>{h}</th>
                      ))}
                    </tr></thead>
                    <tbody>
                      {sapPO.slice(0,300).map((r,i)=>(
                        <tr key={i} style={{borderBottom:'1px solid rgba(0,60,100,0.05)',background:i%2===0?'transparent':'rgba(0,151,167,0.02)'}}>
                          <td style={{padding:'5px 10px',color:T.tealD,fontWeight:800}}>{r.po_number||r.EBELN}</td>
                          <td style={{padding:'5px 10px',color:T.textM,fontSize:10}}>{r.po_date||r.BEDAT}</td>
                          <td style={{padding:'5px 10px',color:T.navy,fontWeight:600}}>{r.vendor||r.LIFNR}</td>
                          <td style={{padding:'5px 10px',color:T.textM,fontSize:10}}>{r.po_type||r.BSART}</td>
                          <td style={{padding:'5px 10px',fontWeight:800,color:T.green}}>₹{parseFloat(r.net_value||r.NETWR||0).toLocaleString()}</td>
                          <td style={{padding:'5px 10px',color:T.textM,fontSize:10}}>{r.currency||r.WAERS}</td>
                          <td style={{padding:'5px 10px',color:T.textM,fontSize:10}}>{r.purchasing_group||r.EKGRP}</td>
                          <td style={{padding:'5px 10px',color:T.textM,fontSize:10}}>{r.company_code||r.BUKRS}</td>
                          <td style={{padding:'5px 10px',color:T.textM,fontSize:10}}>{r.plant||r.WERKS}</td>
                          <td style={{padding:'5px 10px'}}><StatusBadge s={r.release_status||r.FRGKE||'Pending'}/></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </GC>
          )}

          {/* ══ ANALYTICS ══ */}
          {tab==='analytics'&&(
            <div style={{display:'flex',flexDirection:'column',gap:12}}>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
                <GC style={{padding:18}}>
                  <SH title="PO Value by Vendor (Top 10)" sub="From SAP"/>
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart data={sapPO.reduce((acc,r)=>{const v=r.vendor||r.LIFNR||'Unknown';const e=acc.find(x=>x.name===v);if(e)e.value+=parseFloat(r.net_value||r.NETWR||0);else acc.push({name:v,value:parseFloat(r.net_value||r.NETWR||0)});return acc;},[]).sort((a,b)=>b.value-a.value).slice(0,10)} layout="vertical" margin={{top:0,right:70,bottom:0,left:4}}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,60,100,0.07)" horizontal={false}/>
                      <XAxis type="number" tick={{fill:T.textM,fontSize:8}} axisLine={false} tickLine={false} tickFormatter={v=>v>=1e7?'₹'+(v/1e7).toFixed(0)+'Cr':v>=1e5?'₹'+(v/1e5).toFixed(0)+'L':'₹'+v}/>
                      <YAxis type="category" dataKey="name" tick={{fill:T.navy,fontSize:9,fontWeight:600}} axisLine={false} tickLine={false} width={80}/>
                      <Tooltip content={<CTip/>}/>
                      <Bar dataKey="value" name="PO Value" radius={[0,4,4,0]}>
                        {CC.map((c,i)=><Cell key={i} fill={c}/>)}
                        <LabelList dataKey="value" position="right" style={{fill:T.navy,fontSize:8,fontWeight:800}} formatter={v=>v>=1e7?'₹'+(v/1e7).toFixed(1)+'Cr':'₹'+(v/1e5).toFixed(0)+'L'}/>
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </GC>
                <GC style={{padding:18}}>
                  <SH title="PO Value by Purchasing Group"/>
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart data={sapPO.reduce((acc,r)=>{const g=r.purchasing_group||r.EKGRP||'Unknown';const e=acc.find(x=>x.name===g);if(e)e.value+=parseFloat(r.net_value||r.NETWR||0);else acc.push({name:g,value:parseFloat(r.net_value||r.NETWR||0)});return acc;},[]).sort((a,b)=>b.value-a.value)} margin={{top:8,right:20,bottom:8,left:0}}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,60,100,0.07)" vertical={false}/>
                      <XAxis dataKey="name" tick={{fill:T.textM,fontSize:10,fontWeight:600}} axisLine={false} tickLine={false}/>
                      <YAxis tick={{fill:T.textM,fontSize:9}} axisLine={false} tickLine={false} tickFormatter={v=>v>=1e7?'₹'+(v/1e7).toFixed(0)+'Cr':'₹'+(v/1e5).toFixed(0)+'L'} width={50}/>
                      <Tooltip content={<CTip/>}/>
                      <Bar dataKey="value" name="Value" radius={[4,4,0,0]}>
                        {CC.map((c,i)=><Cell key={i} fill={c}/>)}
                        <LabelList dataKey="value" position="top" style={{fill:T.navy,fontSize:9,fontWeight:800}} formatter={v=>v>=1e7?'₹'+(v/1e7).toFixed(1)+'Cr':''}/>
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </GC>
              </div>
              {/* EOT data */}
              <GC style={{padding:18}}>
                <SH title="EOT (Extension of Time) Records"/>
                {loading.eot?<Spinner/>:errors.eot?<ErrBox msg={errors.eot}/>:(
                  <div style={{overflowX:'auto'}}>
                    <table style={{width:'100%',borderCollapse:'collapse',fontSize:11}}>
                      <thead><tr style={{background:'rgba(0,105,120,0.06)'}}>
                        {(eotData[0]?Object.keys(eotData[0]).slice(0,10):[]).map(h=>(
                          <th key={h} style={{padding:'6px 10px',textAlign:'left',fontSize:9,fontWeight:800,color:T.tealD,textTransform:'uppercase',borderBottom:'2px solid rgba(0,105,120,0.15)',whiteSpace:'nowrap'}}>{h}</th>
                        ))}
                      </tr></thead>
                      <tbody>
                        {eotData.slice(0,100).map((r,i)=>(
                          <tr key={i} style={{borderBottom:'1px solid rgba(0,60,100,0.05)',background:i%2===0?'transparent':'rgba(0,151,167,0.02)'}}>
                            {(eotData[0]?Object.keys(eotData[0]).slice(0,10):[]).map(k=>(
                              <td key={k} style={{padding:'5px 10px',color:T.textM,maxWidth:160,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{String(r[k]??'—')}</td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </GC>
            </div>
          )}

        </main>
      </div>
    </div>
  );
}
