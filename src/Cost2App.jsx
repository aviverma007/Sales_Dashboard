import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, LabelList
} from 'recharts';

const T = {
  teal:'#0097a7', tealD:'#006978', tealL:'#00bcd4',
  navy:'#0d2137', navyM:'#1a3a5c',
  amber:'#f57c00', green:'#2e7d32', red:'#d32f2f',
  purple:'#6a1b9a', gray:'#546e7a',
  text:'#0a1628', textM:'#1a2f45',
  glass:'rgba(255,255,255,0.97)', border:'rgba(255,255,255,0.85)',
};

const CATS = ['Civil','Ext. Dev.','Façade','Finishing','MEP','OH & Consultancy'];
const CAT_COLORS = {'Civil':'#1565c0','Ext. Dev.':'#2e7d32','Façade':'#6a1b9a','Finishing':'#d81b60','MEP':'#e65100','OH & Consultancy':'#37474f'};
const PIE_COLORS = ['#1565c0','#29b6f6','#b0bec5'];

const GC = ({children, style={}}) => (
  <div style={{background:T.glass, border:`1px solid ${T.border}`, borderRadius:10,
    boxShadow:'0 2px 12px rgba(0,80,120,0.09)', position:'relative', overflow:'hidden', ...style}}>
    <div style={{position:'absolute',top:0,left:0,right:0,height:1,background:'rgba(255,255,255,0.95)'}}/>
    {children}
  </div>
);

const CTip = ({active,payload,label}) => {
  if(!active||!payload?.length) return null;
  return (
    <div style={{background:'rgba(255,255,255,0.97)',border:'1px solid rgba(0,151,167,0.3)',borderRadius:8,padding:'8px 12px',fontSize:10}}>
      <p style={{color:T.tealD,fontWeight:800,margin:'0 0 4px'}}>{label}</p>
      {payload.map((p,i)=><p key={i} style={{color:p.color||T.text,margin:'2px 0'}}>{p.name}: ₹{typeof p.value==='number'?Number(p.value).toLocaleString('en-IN',{maximumFractionDigits:1}):p.value} Cr</p>)}
    </div>
  );
};

export default function Cost2App() {
  const [raw, setRaw] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('overview');
  const [selProject, setSelProject] = useState('All');
  const [selCat, setSelCat] = useState('');

  useEffect(()=>{
    fetch('/data/cost2_dashboard_data.json').then(r=>r.json()).then(d=>{setRaw(d);setLoading(false);}).catch(()=>setLoading(false));
  },[]);

  const kpi = useMemo(()=>raw?.kpi||{},[raw]);
  const projects = useMemo(()=>raw?.projects||['All'],[raw]);
  const bifAll = useMemo(()=>raw?.bifurcationData||[],[raw]);
  const bifByProj = useMemo(()=>raw?.bifurcationByProject||{},[raw]);
  const vendorData = useMemo(()=>raw?.topVendors||[],[raw]);
  const deptData = useMemo(()=>raw?.deptSummary||[],[raw]);
  const poData = useMemo(()=>raw?.poTable||[],[raw]);

  // Active bifurcation data (filtered by project and category)
  const bifData = useMemo(()=>{
    let d = (bifByProj[selProject]||bifAll);
    if(selCat) d = d.filter(r=>r.Category===selCat);
    return d;
  },[bifByProj,bifAll,selProject,selCat]);

  // KPIs from active bifurcation
  const totalBudget = useMemo(()=>bifData.reduce((s,r)=>s+(r.Budget||0),0),[bifData]);
  const totalAssigned = useMemo(()=>bifData.reduce((s,r)=>s+(r.Assigned||0),0),[bifData]);
  const totalActual = useMemo(()=>bifData.reduce((s,r)=>s+(r.Actual||0),0),[bifData]);

  // Pie data: Budget, Awarded, Paid
  const pieData = useMemo(()=>[
    {name:'Total Budget', value:parseFloat(totalBudget.toFixed(1))},
    {name:'Total Awarded', value:parseFloat(totalAssigned.toFixed(1))},
    {name:'Total Paid', value:parseFloat(totalActual.toFixed(1))},
  ],[totalBudget,totalAssigned,totalActual]);

  // Awarded cost distribution donut: Awarded vs Remaining
  const donutData = useMemo(()=>[
    {name:'Total Paid', value:parseFloat(totalActual.toFixed(1))},
    {name:'Remaining', value:parseFloat(Math.max(0,totalAssigned-totalActual).toFixed(1))},
  ],[totalActual,totalAssigned]);

  // Package-wise % paid (horizontal bar)
  const pkgData = useMemo(()=>bifData
    .filter(r=>r.Assigned>0)
    .map(r=>({cat:r.Category, pct:parseFloat((r.Actual/r.Assigned*100).toFixed(2)}))
    .sort((a,b)=>b.pct-a.pct)
  ,[bifData]);

  const TABS = [{k:'overview',l:'Overview'},{k:'department',l:'Departments'},{k:'vendors',l:'Vendors'},{k:'po',l:'PO Table'}];

  const logout = () => { sessionStorage.removeItem('cost2_auth'); window.location.reload(); };

  if(loading) return (
    <div style={{minHeight:'100vh',backgroundImage:'url(/bg.jpg)',backgroundSize:'cover',display:'flex',alignItems:'center',justifyContent:'center',fontFamily:'Inter,sans-serif'}}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}} @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800;900&display=swap');`}</style>
      <div style={{background:'rgba(255,255,255,0.9)',borderRadius:20,padding:'32px 48px',textAlign:'center'}}>
        <div style={{width:40,height:40,border:'3px solid rgba(0,151,167,0.2)',borderTop:'3px solid #0097a7',borderRadius:'50%',animation:'spin 0.9s linear infinite',margin:'0 auto 16px'}}/>
        <p style={{color:T.navy,fontSize:13,fontWeight:700,fontFamily:'Inter,sans-serif'}}>Loading Cost Intelligence…</p>
      </div>
    </div>
  );

  return (
    <div style={{minHeight:'100vh',backgroundImage:'url(/bg.jpg)',backgroundSize:'cover',backgroundAttachment:'fixed',fontFamily:'Inter,sans-serif',color:T.text}}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');`}</style>

      {/* ── TOP BAR ── */}
      <div style={{background:'rgba(13,31,60,0.97)',padding:'0 20px',height:48,display:'flex',alignItems:'center',justifyContent:'space-between',position:'sticky',top:0,zIndex:100,borderBottom:'1px solid rgba(255,255,255,0.08)'}}>
        <div style={{display:'flex',alignItems:'center',gap:14}}>
          <img src="/swd-logo.png" alt="SWD" style={{width:26,height:26,objectFit:'contain'}}/>
          <span style={{fontSize:12,fontWeight:900,color:'#fff',letterSpacing:.5}}>SMARTWORLD GROUP</span>
          <span style={{fontSize:10,color:'rgba(255,255,255,0.45)',borderLeft:'1px solid rgba(255,255,255,0.12)',paddingLeft:14,fontWeight:600,letterSpacing:.4}}>COST INTELLIGENCE · ZALR REPORT</span>
        </div>
        <div style={{display:'flex',alignItems:'center',gap:10}}>
          <span style={{background:'rgba(0,151,167,0.2)',color:'#4dd0e1',fontSize:10,fontWeight:700,padding:'2px 10px',borderRadius:20,border:'1px solid rgba(0,151,167,0.3)'}}>● LIVE</span>
          <span style={{background:'rgba(255,255,255,0.1)',color:'#fff',fontSize:10,fontWeight:700,padding:'2px 10px',borderRadius:20}}>Cost2</span>
          <button onClick={logout} style={{background:'rgba(211,47,47,0.15)',border:'1px solid rgba(211,47,47,0.3)',color:'#ef9a9a',fontSize:10,fontWeight:700,padding:'3px 10px',borderRadius:7,cursor:'pointer'}}>⏻ Logout</button>
        </div>
      </div>

      {/* ── CATEGORY NAV (top tabs like reference) ── */}
      <div style={{background:'rgba(13,31,60,0.9)',borderBottom:'1px solid rgba(255,255,255,0.08)',padding:'0 20px',display:'flex',gap:0}}>
        <button onClick={()=>setSelCat('')}
          style={{padding:'8px 20px',border:'none',background:selCat===''?'rgba(0,151,167,0.3)':'transparent',color:selCat===''?'#fff':'rgba(255,255,255,0.55)',fontSize:11,fontWeight:700,cursor:'pointer',letterSpacing:.3,borderBottom:selCat===''?'2.5px solid #0097a7':'2.5px solid transparent'}}>
          All Categories
        </button>
        {CATS.map(cat=>(
          <button key={cat} onClick={()=>setSelCat(cat===selCat?'':cat)}
            style={{padding:'8px 18px',border:'none',background:selCat===cat?`${CAT_COLORS[cat]}33`:'transparent',color:selCat===cat?'#fff':'rgba(255,255,255,0.55)',fontSize:11,fontWeight:700,cursor:'pointer',letterSpacing:.2,borderBottom:selCat===cat?`2.5px solid ${CAT_COLORS[cat]}`:'2.5px solid transparent',whiteSpace:'nowrap'}}>
            {cat}
          </button>
        ))}
      </div>

      {/* ── TABS ── */}
      <div style={{background:'rgba(255,255,255,0.9)',borderBottom:'1px solid rgba(0,100,140,0.1)',padding:'0 20px',display:'flex',gap:0,position:'sticky',top:48,zIndex:99}}>
        {TABS.map(t=>(
          <button key={t.k} onClick={()=>setTab(t.k)} style={{padding:'10px 18px',border:'none',background:'transparent',cursor:'pointer',fontSize:11,fontWeight:tab===t.k?800:600,color:tab===t.k?T.tealD:T.gray,borderBottom:tab===t.k?`2.5px solid ${T.tealD}`:'2.5px solid transparent',transition:'all .15s'}}>
            {t.l}
          </button>
        ))}
      </div>

      <div style={{padding:'16px 20px'}}>

      {tab==='overview'&&(<>

        {/* ── HEADER KPIs + PROJECT SELECTOR ── */}
        <GC style={{padding:'14px 20px',marginBottom:14}}>
          <div style={{display:'flex',alignItems:'center',gap:0}}>
            {/* Logo + title */}
            <div style={{display:'flex',alignItems:'center',gap:10,minWidth:180}}>
              <img src="/swd-logo.png" style={{width:32,height:32,objectFit:'contain'}}/>
              <div>
                <div style={{fontSize:9,fontWeight:900,color:T.tealD,letterSpacing:.5,textTransform:'uppercase'}}>Financial Summary</div>
                <div style={{fontSize:11,fontWeight:800,color:T.navy,letterSpacing:.3}}>Report</div>
              </div>
            </div>
            {/* KPIs */}
            <div style={{display:'flex',gap:0,flex:1}}>
              {[
                {label:'Total Budget', value:totalBudget, color:T.navy},
                {label:'Awarded Amount', value:totalAssigned, color:T.tealD},
                {label:'Paid Amount', value:totalActual, color:T.navy},
              ].map(({label,value,color})=>(
                <div key={label} style={{padding:'0 24px',borderLeft:'1px solid #e2e8f0'}}>
                  <div style={{fontSize:24,fontWeight:900,color,lineHeight:1}}>{Math.round(value)} <span style={{fontSize:13,fontWeight:700}}>Cr</span></div>
                  <div style={{fontSize:9,fontWeight:700,color:T.gray,textTransform:'uppercase',letterSpacing:.5,marginTop:3}}>{label}</div>
                </div>
              ))}
            </div>
            {/* Project selector */}
            <div style={{display:'flex',alignItems:'center',gap:12,marginLeft:'auto'}}>
              <div>
                <div style={{fontSize:9,fontWeight:700,color:T.gray,textTransform:'uppercase',letterSpacing:.5,marginBottom:4}}>Project</div>
                <select value={selProject} onChange={e=>setSelProject(e.target.value)}
                  style={{padding:'6px 12px',border:`1.5px solid rgba(0,100,140,0.25)`,borderRadius:7,fontSize:12,color:T.navy,fontFamily:'Inter,sans-serif',outline:'none',fontWeight:600,minWidth:130}}>
                  {projects.map(p=><option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              {/* Project name card */}
              <div style={{background:T.navy,borderRadius:10,padding:'8px 20px',textAlign:'center',minWidth:140}}>
                <div style={{fontSize:20,fontWeight:900,color:'#fff',letterSpacing:.5}}>{selProject}</div>
                <div style={{fontSize:9,fontWeight:600,color:'rgba(255,255,255,0.5)',letterSpacing:.5,marginTop:2}}>Project Name</div>
              </div>
            </div>
          </div>
        </GC>

        {/* ── MAIN CHARTS ROW ── */}
        <div style={{display:'grid',gridTemplateColumns:'1.1fr 1fr 0.65fr',gap:14,marginBottom:14}}>

          {/* Cost Bifurcation */}
          <GC style={{padding:14}}>
            <p style={{textAlign:'center',fontSize:11,fontWeight:800,color:T.navy,marginBottom:4,textTransform:'uppercase',letterSpacing:.5}}>Cost Bifurcation</p>
            <div style={{display:'flex',gap:12,marginBottom:8,flexWrap:'wrap',justifyContent:'center'}}>
              {[['Budget Cost(in Cr)','#b0bec5'],['Awarded Amount(in Cr)',T.teal],['Paid Amount(in Cr)',T.navy]].map(([l,c])=>(
                <div key={l} style={{display:'flex',alignItems:'center',gap:4}}>
                  <div style={{width:10,height:10,borderRadius:2,background:c}}/>
                  <span style={{fontSize:9,color:T.textM,fontWeight:600}}>{l}</span>
                </div>
              ))}
            </div>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={bifData} margin={{top:18,right:4,bottom:28,left:0}} barCategoryGap="28%" barGap={2}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,60,100,0.07)" vertical={false}/>
                <XAxis dataKey="Category" tick={{fontSize:8,fill:T.textM,fontWeight:600}} tickLine={false} axisLine={false}
                  label={{value:'Description',position:'insideBottom',offset:-18,style:{fontSize:9,fill:T.gray}}}/>
                <YAxis tick={{fontSize:8,fill:T.textM}} tickLine={false} axisLine={false}
                  label={{value:'COST',angle:-90,position:'insideLeft',offset:8,style:{fontSize:9,fill:T.gray}}}/>
                <Tooltip content={<CTip/>}/>
                <Bar dataKey="Budget" name="Budget Cost" fill="#b0bec5" radius={[2,2,0,0]} barSize={16}>
                  <LabelList dataKey="Budget" position="top" style={{fontSize:7.5,fill:T.gray,fontWeight:700}} formatter={v=>v>0?Math.round(v):''}/>
                </Bar>
                <Bar dataKey="Assigned" name="Awarded Amount" fill={T.teal} radius={[2,2,0,0]} barSize={16}>
                  <LabelList dataKey="Assigned" position="top" style={{fontSize:7.5,fill:T.tealD,fontWeight:700}} formatter={v=>v>0?Math.round(v):''}/>
                </Bar>
                <Bar dataKey="Actual" name="Paid Amount" fill={T.navy} radius={[2,2,0,0]} barSize={16}>
                  <LabelList dataKey="Actual" position="top" style={{fontSize:7.5,fill:T.navy,fontWeight:700}} formatter={v=>v>0?Math.round(v):''}/>
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </GC>

          {/* Budget Cost Distribution Pie */}
          <GC style={{padding:14}}>
            <p style={{textAlign:'center',fontSize:11,fontWeight:800,color:T.navy,marginBottom:4,textTransform:'uppercase',letterSpacing:.5}}>Budget Cost Distribution</p>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" outerRadius={80} dataKey="value" startAngle={90} endAngle={-270}>
                  {pieData.map((_,i)=><Cell key={i} fill={PIE_COLORS[i]}/>)}
                </Pie>
                <Tooltip formatter={v=>`₹${Number(v).toLocaleString('en-IN',{maximumFractionDigits:1})} Cr`}/>
              </PieChart>
            </ResponsiveContainer>
            <div style={{display:'flex',flexDirection:'column',gap:5,marginTop:4}}>
              {pieData.map((d,i)=>(
                <div key={i} style={{display:'flex',alignItems:'center',gap:7,fontSize:10}}>
                  <div style={{width:10,height:10,borderRadius:2,background:PIE_COLORS[i],flexShrink:0}}/>
                  <span style={{flex:1,color:T.textM,fontWeight:600}}>{d.name}</span>
                  <span style={{fontWeight:800,color:T.navy}}>₹{Number(d.value).toLocaleString('en-IN',{maximumFractionDigits:1})} Cr</span>
                </div>
              ))}
            </div>
          </GC>

          {/* Awarded Cost Distribution Donut */}
          <GC style={{padding:14}}>
            <p style={{textAlign:'center',fontSize:10,fontWeight:800,color:T.navy,marginBottom:4,letterSpacing:.3}}>Awarded Cost Distribution</p>
            <ResponsiveContainer width="100%" height={160}>
              <PieChart>
                <Pie data={donutData} cx="50%" cy="50%" outerRadius={62} innerRadius={30} dataKey="value" startAngle={90} endAngle={-270}>
                  <Cell fill={T.tealD}/>
                  <Cell fill="#b0bec5"/>
                </Pie>
                <Tooltip formatter={v=>`₹${Number(v).toLocaleString('en-IN',{maximumFractionDigits:1})} Cr`}/>
              </PieChart>
            </ResponsiveContainer>
            <div style={{display:'flex',flexDirection:'column',gap:5}}>
              {donutData.map((d,i)=>(
                <div key={i} style={{display:'flex',alignItems:'center',gap:6,fontSize:9}}>
                  <div style={{width:8,height:8,borderRadius:2,background:i===0?T.tealD:'#b0bec5',flexShrink:0}}/>
                  <span style={{flex:1,color:T.textM,fontWeight:600}}>{d.name}</span>
                  <span style={{fontWeight:800,color:T.navy}}>₹{Number(d.value).toLocaleString('en-IN',{maximumFractionDigits:1})} Cr</span>
                </div>
              ))}
            </div>
          </GC>
        </div>

        {/* ── BOTTOM ROW: Pkg % Paid + Budget Cost Distribution Table ── */}
        <div style={{display:'grid',gridTemplateColumns:'0.65fr 1fr',gap:14}}>

          {/* Package wise % Paid */}
          <GC style={{padding:14}}>
            <p style={{fontSize:10,fontWeight:800,color:T.navy,marginBottom:10,letterSpacing:.3}}>Package wise percentage Paid up Cost</p>
            <ResponsiveContainer width="100%" height={Math.max(160, pkgData.length*42)}>
              <BarChart data={pkgData} layout="vertical" margin={{top:0,right:50,bottom:0,left:80}} barCategoryGap="30%">
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,60,100,0.07)" horizontal={false}/>
                <XAxis type="number" tick={{fontSize:8,fill:T.textM}} tickLine={false} axisLine={false} tickFormatter={v=>`${v}%`} domain={[0,120]}
                  label={{value:'% Paid Cost',position:'insideBottom',offset:-4,style:{fontSize:9,fill:T.gray}}}/>
                <YAxis type="category" dataKey="cat" tick={{fontSize:9,fill:T.textM,fontWeight:600}} width={80} tickLine={false} axisLine={false}
                  label={{value:'Description',angle:-90,position:'insideLeft',offset:8,style:{fontSize:9,fill:T.gray}}}/>
                <Tooltip formatter={v=>`${Number(v).toFixed(2)}%`}/>
                <Bar dataKey="pct" name="% Paid" radius={[0,3,3,0]} barSize={20}>
                  {pkgData.map((d,i)=><Cell key={i} fill={CAT_COLORS[d.cat]||T.amber}/>)}
                  <LabelList dataKey="pct" position="right" style={{fontSize:9,fontWeight:800,fill:T.navy}} formatter={v=>`${Number(v).toFixed(2)}%`}/>
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </GC>

          {/* Budget Cost Distribution Table */}
          <GC style={{padding:14}}>
            <p style={{fontSize:10,fontWeight:800,color:T.navy,marginBottom:10,textTransform:'uppercase',letterSpacing:.5}}>Budget Cost Distribution</p>
            <table style={{width:'100%',borderCollapse:'collapse',fontSize:11}}>
              <thead>
                <tr style={{background:T.navy}}>
                  {['Type of work','Budgeted Cost(Cr)','Awarded Cost(Cr)','Paid Cost(Cr)','% Awarded Cost','% Paid Cost'].map(h=>(
                    <th key={h} style={{padding:'7px 8px',textAlign:h==='Type of work'?'left':'right',fontSize:9,fontWeight:700,color:'#fff',letterSpacing:.2,whiteSpace:'nowrap'}}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {bifData.map((r,i)=>{
                  const pctAw = r.Budget>0?(r.Assigned/r.Budget*100):0;
                  const pctPd = r.Assigned>0?(r.Actual/r.Assigned*100):0;
                  const isHigh = pctAw>100;
                  return(
                    <tr key={i} style={{borderBottom:'1px solid #f1f5f9',background:i%2===0?'#f8fafc':'#fff'}}>
                      <td style={{padding:'7px 8px',color:T.navy,fontWeight:700}}>{r.Category}</td>
                      <td style={{padding:'7px 8px',textAlign:'right',color:T.textM}}>{Number(r.Budget).toLocaleString('en-IN',{maximumFractionDigits:2})}</td>
                      <td style={{padding:'7px 8px',textAlign:'right',color:T.textM}}>{Number(r.Assigned).toLocaleString('en-IN',{maximumFractionDigits:2})}</td>
                      <td style={{padding:'7px 8px',textAlign:'right',color:T.textM}}>{Number(r.Actual).toLocaleString('en-IN',{maximumFractionDigits:2})}</td>
                      <td style={{padding:'7px 8px',textAlign:'right'}}>
                        <span style={{background:isHigh?'#fff9c4':'transparent',color:isHigh?'#f57f17':T.textM,fontWeight:isHigh?800:400,padding:isHigh?'1px 6px':'0',borderRadius:4}}>
                          {pctAw.toFixed(2)} %
                        </span>
                      </td>
                      <td style={{padding:'7px 8px',textAlign:'right',color:T.textM}}>{pctPd.toFixed(2)} %</td>
                    </tr>
                  );
                })}
                <tr style={{background:T.navy,fontWeight:900}}>
                  <td style={{padding:'7px 8px',color:'#fff'}}>Total</td>
                  <td style={{padding:'7px 8px',textAlign:'right',color:'#fff'}}>{Number(totalBudget).toLocaleString('en-IN',{maximumFractionDigits:2})}</td>
                  <td style={{padding:'7px 8px',textAlign:'right',color:'#fff'}}>{Number(totalAssigned).toLocaleString('en-IN',{maximumFractionDigits:2})}</td>
                  <td style={{padding:'7px 8px',textAlign:'right',color:'#fff'}}>{Number(totalActual).toLocaleString('en-IN',{maximumFractionDigits:2})}</td>
                  <td style={{padding:'7px 8px',textAlign:'right',color:'#fff'}}>{totalBudget>0?(totalAssigned/totalBudget*100).toFixed(2):0} %</td>
                  <td style={{padding:'7px 8px',textAlign:'right',color:'#fff'}}>{totalAssigned>0?(totalActual/totalAssigned*100).toFixed(2):0} %</td>
                </tr>
              </tbody>
            </table>
          </GC>
        </div>
      </>)}

      {/* ── DEPARTMENTS TAB ── */}
      {tab==='department'&&(
        <GC style={{padding:16}}>
          <p style={{fontSize:11,fontWeight:800,color:T.tealD,textTransform:'uppercase',letterSpacing:.4,marginBottom:12}}>Department-wise Cost Summary (₹ Cr)</p>
          <div style={{overflowX:'auto'}}>
            <table style={{width:'100%',borderCollapse:'collapse',fontSize:11}}>
              <thead>
                <tr style={{background:T.navy}}>
                  {['Department','Budget (Cr)','Assigned (Cr)','Actual (Cr)','Commitment (Cr)','Available (Cr)','% Assigned','% Spent'].map(h=>(
                    <th key={h} style={{padding:'8px 10px',textAlign:h==='Department'?'left':'right',fontSize:9,fontWeight:800,color:'#fff',textTransform:'uppercase',letterSpacing:.3,whiteSpace:'nowrap'}}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {deptData.map((r,i)=>{
                  const maxB=deptData[0]?.Budget||1;
                  const pA=r.Budget>0?Math.round(r.Assigned/r.Budget*100):0;
                  const pS=r.Budget>0?Math.round(r.Actual/r.Budget*100):0;
                  return(
                    <tr key={i} style={{borderBottom:'1px solid #f1f5f9',background:i%2===0?'#f8fafc':'#fff'}} onMouseEnter={e=>e.currentTarget.style.background='#e0f7fa'} onMouseLeave={e=>e.currentTarget.style.background=i%2===0?'#f8fafc':'#fff'}>
                      <td style={{padding:'8px 10px',fontWeight:700,color:T.navy}}>{r.dept}</td>
                      <td style={{padding:'8px 10px',textAlign:'right',color:T.textM}}>{Number(r.Budget).toLocaleString('en-IN',{maximumFractionDigits:1})}</td>
                      <td style={{padding:'8px 10px',textAlign:'right',color:T.purple,fontWeight:600}}>{Number(r.Assigned).toLocaleString('en-IN',{maximumFractionDigits:1})}</td>
                      <td style={{padding:'8px 10px',textAlign:'right',color:T.green,fontWeight:600}}>{Number(r.Actual).toLocaleString('en-IN',{maximumFractionDigits:1})}</td>
                      <td style={{padding:'8px 10px',textAlign:'right',color:T.amber}}>{Number(r.Commitment).toLocaleString('en-IN',{maximumFractionDigits:1})}</td>
                      <td style={{padding:'8px 10px',textAlign:'right',color:T.gray}}>{Number(r.Available).toLocaleString('en-IN',{maximumFractionDigits:1})}</td>
                      <td style={{padding:'8px 10px'}}>
                        <div style={{display:'flex',alignItems:'center',gap:5}}>
                          <div style={{flex:1,height:5,background:'#f1f5f9',borderRadius:3,maxWidth:70}}>
                            <div style={{width:`${Math.min(pA,100)}%`,height:'100%',background:T.purple,borderRadius:3}}/>
                          </div>
                          <span style={{fontSize:10,fontWeight:700,color:T.purple,minWidth:28}}>{pA}%</span>
                        </div>
                      </td>
                      <td style={{padding:'8px 10px'}}>
                        <div style={{display:'flex',alignItems:'center',gap:5}}>
                          <div style={{flex:1,height:5,background:'#f1f5f9',borderRadius:3,maxWidth:70}}>
                            <div style={{width:`${Math.min(pS,100)}%`,height:'100%',background:T.teal,borderRadius:3}}/>
                          </div>
                          <span style={{fontSize:10,fontWeight:700,color:T.teal,minWidth:28}}>{pS}%</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                <tr style={{background:T.navy,fontWeight:800}}>
                  <td style={{padding:'8px 10px',color:'#fff'}}>Total</td>
                  {['Budget','Assigned','Actual','Commitment','Available'].map(k=>(
                    <td key={k} style={{padding:'8px 10px',textAlign:'right',color:'#fff'}}>{Number(deptData.reduce((s,r)=>s+(r[k]||0),0)).toLocaleString('en-IN',{maximumFractionDigits:1})}</td>
                  ))}
                  <td/><td/>
                </tr>
              </tbody>
            </table>
          </div>
        </GC>
      )}

      {/* ── VENDORS TAB ── */}
      {tab==='vendors'&&(
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16}}>
          <GC style={{padding:16}}>
            <p style={{fontSize:11,fontWeight:800,color:T.tealD,textTransform:'uppercase',letterSpacing:.4,marginBottom:12}}>Top 12 Vendors — Ordered Value (₹ Cr)</p>
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={vendorData} layout="vertical" margin={{top:0,right:70,bottom:0,left:0}} barCategoryGap="20%">
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,60,100,0.07)" horizontal={false}/>
                <XAxis type="number" tick={{fontSize:8,fill:T.textM}} tickLine={false} axisLine={false} tickFormatter={v=>`₹${v}Cr`}/>
                <YAxis type="category" dataKey="Vendor Name" tick={{fontSize:8,fill:T.textM}} width={160} tickLine={false} axisLine={false} tickFormatter={v=>v?.length>22?v.slice(0,22)+'…':v}/>
                <Tooltip content={<CTip/>}/>
                <Bar dataKey="ordered" name="Ordered" fill={T.purple} radius={[0,3,3,0]} barSize={12}>
                  <LabelList dataKey="ordered" position="right" style={{fontSize:8,fill:T.purple,fontWeight:700}} formatter={v=>`₹${Number(v).toFixed(1)}Cr`}/>
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </GC>
          <GC style={{padding:16}}>
            <p style={{fontSize:11,fontWeight:800,color:T.tealD,textTransform:'uppercase',letterSpacing:.4,marginBottom:12}}>Vendor Delivery Performance</p>
            <div style={{maxHeight:420,overflowY:'auto'}}>
              <table style={{width:'100%',borderCollapse:'collapse',fontSize:11}}>
                <thead>
                  <tr style={{background:T.navy,position:'sticky',top:0}}>
                    {['Vendor','Ordered','Delivered','Invoiced','Del%'].map(h=>(
                      <th key={h} style={{padding:'7px 8px',textAlign:h==='Vendor'?'left':'right',fontSize:9,fontWeight:700,color:'#fff',textTransform:'uppercase'}}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {vendorData.map((r,i)=>(
                    <tr key={i} style={{borderBottom:'1px solid #f1f5f9',background:i%2===0?'#f8fafc':'#fff'}}>
                      <td style={{padding:'6px 8px',color:T.navy,fontWeight:600,fontSize:10,maxWidth:160,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{r['Vendor Name']}</td>
                      <td style={{padding:'6px 8px',textAlign:'right',color:T.purple,fontWeight:700}}>₹{Number(r.ordered).toFixed(1)}</td>
                      <td style={{padding:'6px 8px',textAlign:'right',color:T.green}}>₹{Number(r.delivered).toFixed(1)}</td>
                      <td style={{padding:'6px 8px',textAlign:'right',color:T.amber}}>₹{Number(r.invoiced).toFixed(1)}</td>
                      <td style={{padding:'6px 8px',textAlign:'right'}}>
                        <span style={{fontSize:10,fontWeight:700,padding:'2px 6px',borderRadius:8,background:r.ordered>0&&r.delivered/r.ordered>0.7?'#d1fae5':'#fef3c7',color:r.ordered>0&&r.delivered/r.ordered>0.7?'#065f46':'#92400e'}}>
                          {r.ordered>0?Math.round(r.delivered/r.ordered*100):0}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </GC>
        </div>
      )}

      {/* ── PO TABLE TAB ── */}
      {tab==='po'&&(
        <GC style={{padding:16}}>
          <p style={{fontSize:11,fontWeight:800,color:T.tealD,textTransform:'uppercase',letterSpacing:.4,marginBottom:12}}>Purchase Order Details — Top 50 by Ordered Value</p>
          <div style={{overflowX:'auto',maxHeight:520,overflowY:'auto'}}>
            <table style={{width:'100%',borderCollapse:'collapse',fontSize:10,minWidth:900}}>
              <thead>
                <tr style={{background:T.navy,position:'sticky',top:0,zIndex:1}}>
                  {['PO Number','WBS Description','Dept','Vendor','Material/Item','Ordered (Cr)','Delivered (Cr)','Invoiced (Cr)','Pending (Cr)','Type'].map(h=>(
                    <th key={h} style={{padding:'7px 8px',textAlign:['Ordered (Cr)','Delivered (Cr)','Invoiced (Cr)','Pending (Cr)'].includes(h)?'right':'left',fontSize:8,fontWeight:700,color:'#fff',textTransform:'uppercase',whiteSpace:'nowrap'}}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {poData.map((r,i)=>(
                  <tr key={i} style={{borderBottom:'1px solid #f1f5f9',background:i%2===0?'#f8fafc':'#fff'}}>
                    <td style={{padding:'6px 8px',color:T.tealD,fontWeight:700}}>{r['Purchasing Document']}</td>
                    <td style={{padding:'6px 8px',color:T.navy,maxWidth:140,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{r['WBS Description']}</td>
                    <td style={{padding:'6px 8px',color:T.textM,whiteSpace:'nowrap'}}>{r['Plant_1']}</td>
                    <td style={{padding:'6px 8px',color:T.textM,maxWidth:140,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{r['Vendor Name']}</td>
                    <td style={{padding:'6px 8px',color:T.textM,maxWidth:120,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{r['Short Text']||r['Material Name']}</td>
                    <td style={{padding:'6px 8px',textAlign:'right',color:T.purple,fontWeight:700}}>₹{Number(r['Ordered Value']).toFixed(3)}</td>
                    <td style={{padding:'6px 8px',textAlign:'right',color:T.green}}>₹{Number(r['Delivered Value']).toFixed(3)}</td>
                    <td style={{padding:'6px 8px',textAlign:'right',color:T.amber}}>₹{Number(r['Invoiced Value']).toFixed(3)}</td>
                    <td style={{padding:'6px 8px',textAlign:'right',color:T.red}}>₹{Number(r['Still to be Invoiced Value']).toFixed(3)}</td>
                    <td style={{padding:'6px 8px'}}>
                      <span style={{fontSize:9,fontWeight:700,padding:'2px 6px',borderRadius:8,background:r['PROJECT/NON-PROJECT']==='Project'?'#e0f2fe':'#f1f5f9',color:r['PROJECT/NON-PROJECT']==='Project'?'#0369a1':'#475569'}}>
                        {r['PROJECT/NON-PROJECT']==='Project'?'Project':'Non-Proj'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </GC>
      )}

      </div>
    </div>
  );
}
