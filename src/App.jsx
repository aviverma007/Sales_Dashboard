import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  AreaChart, Area, BarChart, Bar, ComposedChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  RadialBarChart, RadialBar, LabelList
} from 'recharts';

// ─── THEME ────────────────────────────────────────────────────────────────────
const T = {
  glass:      'rgba(255,255,255,0.96)',
  glassH:     'rgba(255,255,255,1.0)',
  glassDark:  'rgba(15,35,60,0.88)',
  glassDarkH: 'rgba(15,35,60,0.95)',
  border:     'rgba(255,255,255,0.85)',
  borderB:    'rgba(255,255,255,0.2)',
  teal:   '#0097a7', tealL:'#00bcd4', tealD:'#006978',
  red:    '#d32f2f', redL:'#ef5350',
  navy:   '#0d2137', navyM:'#1a3a5c',
  amber:  '#f57c00', amberL:'#ffb300',
  green:  '#2e7d32', greenL:'#43a047',
  gray:   '#546e7a',
  text:   '#0a1628', textM:'#1a2f45', textL:'#2d4a66', textW:'rgba(255,255,255,0.97)',
};
const CC = ['#0097a7','#1565c0','#2e7d32','#f57c00','#d32f2f','#6a1b9a','#00838f','#37474f'];

// ─── UTILS ────────────────────────────────────────────────────────────────────
const fmtCr  = v => { if(!v||isNaN(v)) return '₹0 Cr'; const c=v/1e7; if(c>=1000) return `₹${(c/1000).toFixed(1)}K Cr`; if(c>=100) return `₹${c.toFixed(0)} Cr`; return `₹${c.toFixed(1)} Cr`; };
const fmtML  = m => { if(!m) return ''; const [yr,mo]=m.split('-'); return `${['','Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][+mo]}'${yr.slice(2)}`; };
const pct    = (a,b) => b>0?Math.round((a/b)*100):0;

// ─── WIDGET GRID ─────────────────────────────────────────────────────────────
const DEFAULT_LAYOUT = [
  {i:'units',    x:0,  y:0,  w:3, h:5},
  {i:'sales',    x:3,  y:0,  w:3, h:5},
  {i:'soldArea', x:6,  y:0,  w:3, h:5},
  {i:'avgPrice', x:9,  y:0,  w:3, h:5},
  {i:'target',   x:0,  y:5,  w:5, h:6},
  {i:'upcoming', x:5,  y:5,  w:3, h:6},
  {i:'trend',    x:0,  y:11, w:8, h:8},
  {i:'channel',  x:8,  y:11, w:4, h:8},
  {i:'bhk',      x:0,  y:19, w:4, h:7},
  {i:'topcp',    x:4,  y:19, w:4, h:7},
  {i:'bvc',      x:8,  y:19, w:4, h:7},
  {i:'svr',      x:0,  y:26, w:12,h:9},
  {i:'cancelled',x:0,  y:35, w:12,h:10},
  {i:'tower',    x:0,  y:45, w:12,h:8},
  {i:'areakpi',  x:0,  y:53, w:12,h:5},
  {i:'areaproj', x:0,  y:58, w:12,h:8},
];

const STORAGE_KEY = 'swd_widget_layout_v1';

function useWindowWidth() {
  const [w, setW] = useState(window.innerWidth);
  useEffect(() => {
    const h = () => setW(window.innerWidth);
    window.addEventListener('resize', h);
    return () => window.removeEventListener('resize', h);
  }, []);
  return w;
}

// Widget wrapper with drag handle
const Widget = ({children, style={}}) => (
  <div style={{height:'100%',background:'rgba(255,255,255,0.88)',backdropFilter:'blur(20px)',borderRadius:14,boxShadow:'0 2px 16px rgba(0,60,100,0.08)',border:'1px solid rgba(0,151,167,0.1)',overflow:'hidden',position:'relative',...style}}>
    <div className="drag-handle" style={{position:'absolute',top:4,right:6,cursor:'grab',opacity:0.25,fontSize:12,lineHeight:1,userSelect:'none',zIndex:10,color:'#0d2137'}}>⠿⠿</div>
    <div style={{height:'100%',overflow:'auto'}}>{children}</div>
  </div>
);

const toQuarterly=(data,labelKey='label')=>{
  const qMap={};
  data.forEach(d=>{
    const lbl=String(d[labelKey]||d.month||d.label||'');
    const m=lbl.match(/([A-Za-z]{3})'(\d{2})/);
    if(!m)return;
    const monNum={'Jan':1,'Feb':2,'Mar':3,'Apr':4,'May':5,'Jun':6,'Jul':7,'Aug':8,'Sep':9,'Oct':10,'Nov':11,'Dec':12}[m[1]]||0;
    const yr=m[2];
    const q=`Q${Math.ceil(monNum/3)}'${yr}`;
    if(!qMap[q]){qMap[q]={...d,[labelKey]:q,month:q};Object.keys(d).forEach(k=>{if(typeof d[k]==='number')qMap[q][k]=0;});}
    Object.keys(d).forEach(k=>{if(typeof d[k]==='number')qMap[q][k]=+(qMap[q][k]+d[k]).toFixed(1);});
  });
  return Object.values(qMap);
};

const ChartControls=({mode,setMode,offset,setOffset,total,window:win=6})=>{
  const maxOffset=Math.max(0,total-win);
  const displayOffset=Math.min(offset,maxOffset);
  return(
    <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:8}}>
      <div style={{display:'flex',gap:3,background:'rgba(0,100,140,0.07)',borderRadius:20,padding:2,flexShrink:0}}>
        {[['monthly','Monthly'],['quarterly','Quarterly']].map(([k,l])=>(
          <button key={k} onClick={()=>{setMode(k);setOffset(0);}} style={{padding:'3px 12px',borderRadius:18,border:'none',cursor:'pointer',fontSize:10,fontWeight:700,background:mode===k?'#0097a7':'transparent',color:mode===k?'#fff':'#546e7a',transition:'all 0.15s'}}>{l}</button>
        ))}
      </div>
      <button onClick={()=>setOffset(o=>Math.max(0,Math.min(o,maxOffset)-1))} disabled={displayOffset===0} style={{width:24,height:24,borderRadius:'50%',border:'1px solid rgba(0,100,140,0.2)',background:'rgba(255,255,255,0.8)',cursor:displayOffset===0?'default':'pointer',fontSize:14,color:displayOffset===0?'#ccc':'#0097a7',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>‹</button>
      <div style={{flex:1,height:5,background:'rgba(0,100,140,0.1)',borderRadius:3,position:'relative',cursor:'pointer',minWidth:60}} onClick={e=>{const r=e.currentTarget.getBoundingClientRect();const p=(e.clientX-r.left)/r.width;setOffset(Math.round(p*maxOffset));}}>
        <div style={{position:'absolute',left:`${maxOffset>0?(displayOffset/maxOffset)*(100-win/total*100):0}%`,width:`${total>0?(win/total)*100:100}%`,height:'100%',background:'linear-gradient(90deg,#0097a7,#4dd0e1)',borderRadius:3,transition:'left 0.2s'}}/>
      </div>
      <button onClick={()=>setOffset(o=>Math.min(maxOffset,Math.min(o,maxOffset)+1))} disabled={displayOffset>=maxOffset} style={{width:24,height:24,borderRadius:'50%',border:'1px solid rgba(0,100,140,0.2)',background:'rgba(255,255,255,0.8)',cursor:displayOffset>=maxOffset?'default':'pointer',fontSize:14,color:displayOffset>=maxOffset?'#ccc':'#0097a7',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>›</button>
      <span style={{fontSize:9,color:'#90a4ae',whiteSpace:'nowrap',fontWeight:600}}>{displayOffset+1}–{Math.min(displayOffset+win,total)} / {total}</span>
    </div>
  );
};

// ─── SECTION GRID (drag & resize within section, persisted) ─────────────────
const SectionGrid = ({sectionKey, items, cols=12, rowH=36, margin=[10,10]}) => {
  const storageKey = `swd_layout_${sectionKey}`;
  const [layout, setLayout] = useState(() => {
    try { const s = localStorage.getItem(storageKey); if(s) return JSON.parse(s); } catch{}
    return items.map(it => it.defaultLayout);
  });
  const [containerW, setContainerW] = useState(0);
  const ref = useRef(null);
  useEffect(() => {
    if(!ref.current) return;
    const ro = new ResizeObserver(([e]) => setContainerW(e.contentRect.width));
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, []);
  const saveLayout = (l) => {
    setLayout(l);
    try { localStorage.setItem(storageKey, JSON.stringify(l)); } catch{}
  };
  if(!containerW) return <div ref={ref} style={{minHeight:40}}/>;
  return (
    <div ref={ref} style={{position:'relative'}}>
      <GridLayout
        layout={layout} cols={cols} rowHeight={rowH} width={containerW}
        margin={margin} containerPadding={[0,0]}
        draggableHandle=".wdg-drag"
        onLayoutChange={saveLayout}
        resizeHandles={['e','w','se','sw']}
        compactType="vertical"
        preventCollision={false}
      >
        {items.map(it => (
          <div key={it.key} style={{background:'rgba(255,255,255,0.88)',backdropFilter:'blur(20px)',borderRadius:14,boxShadow:'0 2px 16px rgba(0,60,100,0.08)',border:'1px solid rgba(0,151,167,0.1)',overflow:'hidden',position:'relative'}}>
            <div className="wdg-drag" title="Drag to move" style={{position:'absolute',top:0,left:0,right:0,height:20,cursor:'grab',zIndex:10,display:'flex',alignItems:'center',justifyContent:'center'}}>
              <div style={{width:28,height:3,borderRadius:2,background:'rgba(0,100,140,0.15)',marginTop:5}}/>
            </div>
            <div style={{height:'100%',paddingTop:2,overflow:'auto',boxSizing:'border-box'}}>
              {it.content}
            </div>
          </div>
        ))}
      </GridLayout>
    </div>
  );
};


// ─── CHART FLIP (table view) ────────────────────────────────────────────────
// Store flip states globally to avoid hook-in-callback issues
const flipStates = {};
const useChartFlip = (id) => {
  const [f, setF] = React.useState(false);
  flipStates[id] = f;
  return [f, () => setF(v => !v)];
};

const TableView = ({title, headers, rows, onFlipBack}) => (
  <div style={{height:'100%',display:'flex',flexDirection:'column',padding:14}}>
    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8,flexShrink:0}}>
      <span style={{fontSize:11,fontWeight:900,color:T.tealD,textTransform:'uppercase',letterSpacing:0.5}}>{title}</span>
      <button onClick={onFlipBack} style={{padding:'3px 10px',borderRadius:16,border:'1px solid rgba(0,151,167,0.3)',background:T.teal,color:'#fff',fontSize:9,fontWeight:800,cursor:'pointer'}}>📊 Chart</button>
    </div>
    <div style={{flex:1,overflowY:'auto'}}>
      <table style={{width:'100%',borderCollapse:'collapse',fontSize:10}}>
        <thead><tr style={{borderBottom:'2px solid rgba(0,151,167,0.15)'}}>{headers.map((h,i)=><th key={i} style={{padding:'5px 8px',textAlign:'left',fontSize:9,fontWeight:800,color:'#546e7a',textTransform:'uppercase',whiteSpace:'nowrap'}}>{h}</th>)}</tr></thead>
        <tbody>{rows.map((row,i)=><tr key={i} style={{borderBottom:'1px solid rgba(0,100,140,0.06)'}}>{row.map((cell,j)=><td key={j} style={{padding:'5px 8px',color:'#0d2137',fontWeight:600}}>{cell}</td>)}</tr>)}</tbody>
      </table>
    </div>
  </div>
);

const CTip = ({active,payload,label,fmt}) => {
  if(!active||!payload?.length) return null;
  return (
    <div style={{background:'rgba(255,255,255,0.97)',border:'1px solid rgba(0,151,167,0.3)',borderRadius:10,padding:'8px 12px',boxShadow:'0 8px 32px rgba(0,80,120,0.18)',fontFamily:'Inter,sans-serif',fontSize:11}}>
      <p style={{color:T.tealD,fontWeight:700,marginBottom:4}}>{label}</p>
      {payload.map((p,i)=>(<p key={i} style={{color:p.color||T.text,margin:'2px 0'}}><span style={{color:T.textL}}>{p.name}: </span>{fmt?fmt(p.value,p.name):(typeof p.value==='number'?p.value.toLocaleString('en-IN'):p.value)}</p>))}
    </div>
  );
};

// ─── GLASS CARD ───────────────────────────────────────────────────────────────
const GC = ({children,style={},cls='',dark=false}) => {
  const [h,sH]=useState(false);
  return (
    <div className={cls} onMouseEnter={()=>sH(true)} onMouseLeave={()=>sH(false)} style={{
      background: dark?(h?T.glassDarkH:T.glassDark):(h?T.glassH:T.glass),
      border:`1px solid ${dark?T.borderB:T.border}`,
      borderRadius:14, boxShadow: dark?'0 8px 32px rgba(0,0,0,0.35)':'0 4px 24px rgba(0,80,120,0.12)',
      transition:'all 0.25s ease', position:'relative', overflow:'hidden', ...style
    }}>
      {!dark&&<div style={{position:'absolute',top:0,left:0,right:0,height:1,background:'rgba(255,255,255,0.95)'}}/>}
      {children}
    </div>
  );
};

// ─── SECTION HEADER ──────────────────────────────────────────────────────────
const SH = ({title,sub,light=false,compact=false}) => (
  <div style={{marginBottom:compact?8:12}}>
    <p style={{fontSize:compact?10:12,fontWeight:800,color:light?T.textW:T.tealD,letterSpacing:0.4,margin:0,textTransform:'uppercase',textShadow:'0 1px 2px rgba(255,255,255,0.6)'}}>{title}</p>
    {sub&&<p style={{fontSize:10,color:light?'rgba(255,255,255,0.8)':T.textM,margin:'2px 0 0',fontWeight:600}}>{sub}</p>}
  </div>
);

// ─── FILTER SELECT ────────────────────────────────────────────────────────────
const FSel = ({label,options,value,onChange,multi=false,openId='',activeOpen=null,setActiveOpen=()=>{}}) => {
  if(multi){
    const vals=value?value.split('||').filter(Boolean):[];
    const toggle=v=>{const n=vals.includes(v)?vals.filter(x=>x!==v):[...vals,v];onChange(n.join('||'));};
    const open=activeOpen===openId;
    const setOpen=()=>setActiveOpen(open?null:openId);
    return(
      <div style={{display:'flex',flexDirection:'column',gap:2,position:'relative'}}>
        <label style={{color:T.textM,fontSize:9,fontWeight:800,letterSpacing:1,textTransform:'uppercase'}}>{label}</label>
        <div onClick={setOpen} style={{background:'rgba(255,255,255,0.88)',border:`1px solid ${vals.length?T.teal:'rgba(0,100,140,0.25)'}`,borderRadius:7,color:vals.length?T.tealD:T.textM,padding:'5px 10px',fontSize:11,fontFamily:'Inter,sans-serif',minWidth:120,cursor:'pointer',fontWeight:vals.length?600:400,userSelect:'none',display:'flex',justifyContent:'space-between',alignItems:'center',gap:6}}>
          <span style={{overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',maxWidth:130}}>{vals.length?vals.join(', '):'All'}</span>
          <span style={{fontSize:8,opacity:0.6}}>{open?'▲':'▼'}</span>
        </div>
        {open&&(
          <div onClick={e=>e.stopPropagation()} style={{position:'absolute',top:'100%',left:0,zIndex:999,background:'#fff',border:`1px solid ${T.teal}30`,borderRadius:8,boxShadow:'0 8px 24px rgba(0,80,120,0.15)',minWidth:200,maxHeight:260,overflowY:'auto',padding:4,marginTop:2}}>
            {/* Select All / Clear All row */}
            <div style={{display:'flex',gap:4,padding:'5px 8px 6px',borderBottom:'1px solid rgba(0,151,167,0.1)',marginBottom:3}}>
              <button onClick={()=>onChange(options.join('||'))} style={{flex:1,padding:'3px 8px',borderRadius:6,border:`1px solid ${T.teal}40`,background:`${T.teal}0d`,color:T.tealD,fontSize:9,fontWeight:800,cursor:'pointer'}}>✓ All</button>
              <button onClick={()=>onChange('')} style={{flex:1,padding:'3px 8px',borderRadius:6,border:'1px solid rgba(200,40,40,0.3)',background:'rgba(200,40,40,0.06)',color:'#c62828',fontSize:9,fontWeight:800,cursor:'pointer'}}>✕ Clear</button>
            </div>
            {options.map(o=>(
              <div key={o}
                onClick={e=>{
                  const cbClicked=e.target.closest('[data-cb]');
                  if(cbClicked){e.stopPropagation();toggle(o);}
                  else{onChange(o===vals[0]&&vals.length===1?'':o);setActiveOpen(null);}
                }}
                style={{display:'flex',alignItems:'center',gap:10,padding:'7px 10px',borderRadius:5,cursor:'pointer',background:vals.includes(o)?`${T.teal}10`:'transparent',fontSize:10,fontWeight:vals.includes(o)?700:400,color:vals.includes(o)?T.tealD:T.text,transition:'background 0.1s'}}
              >
                <span data-cb="1" onClick={e=>{e.stopPropagation();toggle(o);}} style={{width:18,height:18,borderRadius:4,border:`2px solid ${vals.includes(o)?T.teal:'rgba(0,100,140,0.3)'}`,background:vals.includes(o)?T.teal:'transparent',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,cursor:'pointer',transition:'all 0.1s'}}>
                  {vals.includes(o)&&<span style={{color:'#fff',fontSize:11,lineHeight:1,fontWeight:900}}>✓</span>}
                </span>
                <span style={{flex:1,userSelect:'none'}}>{o}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }
  return(
    <div style={{display:'flex',flexDirection:'column',gap:2}}>
      <label style={{color:T.textM,fontSize:9,fontWeight:800,letterSpacing:1,textTransform:'uppercase'}}>{label}</label>
      <select value={value} onChange={e=>onChange(e.target.value)} style={{
        background:'rgba(255,255,255,0.88)',border:`1px solid ${value?T.teal:'rgba(0,100,140,0.25)'}`,borderRadius:7,
        color:value?T.tealD:T.textM,padding:'5px 10px',fontSize:11,fontFamily:'Inter,sans-serif',
        minWidth:120,cursor:'pointer',outline:'none',appearance:'none',fontWeight:value?600:400,
      }}>
        <option value="">All</option>
        {options.map(o=><option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );
};

// ─── CHIP ────────────────────────────────────────────────────────────────────
const Chip = ({label,value,color=T.teal,small=false}) => (
  <div style={{display:'inline-flex',alignItems:'center',gap:4,background:`${color}18`,border:`1px solid ${color}33`,borderRadius:20,padding:small?'2px 8px':'3px 10px'}}>
    <div style={{width:5,height:5,borderRadius:'50%',background:color,flexShrink:0}}/>
    <span style={{color:T.text,fontSize:small?9:10,fontWeight:700}}>{label}:</span>
    <span style={{color,fontSize:small?9:10,fontWeight:700}}>{value}</span>
  </div>
);

// ─── BADGE ───────────────────────────────────────────────────────────────────
const Badge = ({label,color=T.teal}) => (
  <span style={{display:'inline-flex',padding:'1px 7px',borderRadius:10,fontSize:9,fontWeight:700,background:`${color}18`,border:`1px solid ${color}33`,color}}>{label}</span>
);

// ═══════════════════════════════════════════════════════════════════════════════
// ─── LOGIN ────────────────────────────────────────────────────────────────────

// Per-chart flip wrapper components
const ChartCardCP = ({topCP,cpExpanded,setCpExpanded,CC,T,CTip,SH}) => {
  const [flipped,setFlipped] = React.useState(false);
  const visible = cpExpanded?topCP:topCP.slice(0,10);
  const rows = visible.map((d,i)=>[i+1, d.name?.length>30?d.name.slice(0,30)+'...':d.name, d.units, '₹'+d.bspCr+'Cr']);
  if(flipped) return <TableView title="Top Channel Partners" headers={['#','Partner','Units','Sales']} rows={rows} onFlipBack={()=>setFlipped(false)}/>;
  const barH=22, chartH=Math.max(160, visible.length*barH+40);
  return (<div style={{padding:16,position:'relative',height:'100%'}}>
    <button onClick={()=>setFlipped(true)} style={{position:'absolute',top:8,right:8,zIndex:20,padding:'3px 10px',borderRadius:16,border:'1px solid rgba(0,151,167,0.25)',background:'rgba(255,255,255,0.9)',color:'#006978',fontSize:9,fontWeight:800,cursor:'pointer'}}>⊞ Table</button>
    <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:4,paddingRight:54}}>
      <SH title={`Top CP-${cpExpanded?topCP.length:Math.min(10,topCP.length)}`} sub="Channel Partners by Units Booked · Sales Value"/>
      {topCP.length>10&&(<button onClick={()=>setCpExpanded(e=>!e)} style={{flexShrink:0,padding:'3px 12px',background:'rgba(0,151,167,0.07)',border:'1px solid rgba(0,151,167,0.2)',borderRadius:16,cursor:'pointer',fontSize:10,fontWeight:700,color:T.tealD,whiteSpace:'nowrap'}}>{cpExpanded?'▲ Show less':'▼ +'+String(topCP.length-10)+' more'}</button>)}
    </div>
    <ResponsiveContainer width="100%" height={chartH}>
      <BarChart data={visible} layout="vertical" margin={{top:0,right:80,bottom:0,left:0}}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,60,100,0.2)" horizontal={false}/>
        <XAxis type="number" tick={{fill:T.textM,fontSize:9,fontWeight:600}} axisLine={false} tickLine={false}/>
        <YAxis type="category" dataKey="name" tick={{fill:T.text,fontSize:10,fontWeight:700}} axisLine={false} tickLine={false} width={145} tickFormatter={v=>v?.length>20?v.slice(0,20)+'…':v}/>
        <Tooltip content={<CTip fmt={(v,n)=>n==='Sales (₹Cr)'?'₹'+v+' Cr':v?.toLocaleString?.('en-IN')}/>}/>
        <Bar dataKey="units" name="Units" radius={[0,4,4,0]}>
          {visible.map((_,i)=><Cell key={i} fill={CC[i%CC.length]}/>)}
          <LabelList content={({x,y,width,height,value,index})=>{
            const d=visible[index];
            return(<g><text x={x+width+6} y={y+height/2+1} textAnchor="start" dominantBaseline="middle" fill={T.textM} fontSize={9} fontWeight={700}>{value}</text><text x={x+width+6} y={y+height/2+12} textAnchor="start" dominantBaseline="middle" fill={T.amber} fontSize={8} fontWeight={700}>{'₹'}{d?.bspCr}Cr</text></g>);
          }}/>
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  </div>);
};

const ChartCardBvC = ({bvc,bMode,setBMode,bOff,setBOff,toQuarterly,ChartControls,T,CTip,SH}) => {
  const [flipped,setFlipped] = React.useState(false);
  const WIN=6;
  const base=bMode==='quarterly'?toQuarterly(bvc,'label'):bvc;
  const slice=base.slice(Math.min(bOff,Math.max(0,base.length-WIN)),Math.min(bOff,Math.max(0,base.length-WIN))+WIN);
  const rows=base.map(d=>[d.label, d.booked, d.cancelled, d.remaining||'-', d.cumBooked||'-']);
  if(flipped) return <TableView title="Booking vs. Cancelled" headers={['Month','Booked','Cancelled','Target Left','Cum.Booked']} rows={rows} onFlipBack={()=>setFlipped(false)}/>;
  const maxBooked=Math.max(...slice.map(d=>d.booked),1);
  const amberCap=Math.ceil(maxBooked*0.18);
  const sliceWithCap=slice.map(d=>({...d,targetTopper:d.remaining>0?amberCap:0}));
  return (<div style={{padding:16,position:'relative'}}>
    <button onClick={()=>setFlipped(true)} style={{position:'absolute',top:8,right:8,zIndex:20,padding:'3px 10px',borderRadius:16,border:'1px solid rgba(0,151,167,0.25)',background:'rgba(255,255,255,0.9)',color:'#006978',fontSize:9,fontWeight:800,cursor:'pointer'}}>⊞ Table</button>
    <SH title="Booking vs. Cancelled" sub="Monthly Comparison"/>
    <ChartControls mode={bMode} setMode={setBMode} offset={bOff} setOffset={setBOff} total={base.length} window={WIN}/>
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={sliceWithCap} margin={{top:18,right:8,bottom:18,left:0}} barSize={28}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,60,100,0.2)" vertical={false}/>
        <XAxis dataKey="label" tick={{fill:T.textM,fontSize:9,fontWeight:600}} axisLine={false} tickLine={false} angle={-25} dy={6} interval={0}/>
        <YAxis tick={{fill:T.textM,fontSize:9,fontWeight:600}} axisLine={false} tickLine={false} width={28} domain={[0,'dataMax+5']}/>
        <Tooltip content={<CTip fmt={(v,n)=>{if(n==='Target Remaining')return(slice.find(s=>s.targetTopper===v)?.remaining||v)+' units left';return v;}}/>}/>
        <Legend wrapperStyle={{color:T.text,fontSize:10,fontWeight:700}} iconSize={8}/>
        <Bar dataKey="booked" name="Booked" stackId="a" fill={T.teal} fillOpacity={0.9} radius={[0,0,2,2]}>
          <LabelList dataKey="booked" position="insideTop" style={{fill:'#fff',fontSize:8,fontWeight:800}} formatter={v=>v>0?v:''}/>
        </Bar>
        <Bar dataKey="targetTopper" name="Target Remaining" stackId="a" fill={T.amber} fillOpacity={0.85} radius={[3,3,0,0]}>
          <LabelList dataKey="remaining" position="top" style={{fill:T.amber,fontSize:7,fontWeight:800}} formatter={v=>v>0?String(v):''}/>
        </Bar>
        <Bar dataKey="cancelled" name="Cancelled" fill={T.red} radius={[2,2,0,0]} fillOpacity={0.85}>
          <LabelList dataKey="cancelled" position="top" style={{fill:T.red,fontSize:8,fontWeight:700}} formatter={v=>v>0?v:''}/>
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  </div>);
};

const ChartCardTrend = ({monthly,tMode,setTMode,tOff,setTOff,toQuarterly,ChartControls,T,CTip,SH}) => {
  const [flipped,setFlipped] = React.useState(false);
  const WIN=6;
  const base=tMode==='quarterly'?toQuarterly(monthly,'label'):monthly;
  const slice=base.slice(Math.min(tOff,Math.max(0,base.length-WIN)),Math.min(tOff,Math.max(0,base.length-WIN))+WIN);
  const rows=base.map(d=>[d.label, d.bspCr?'₹'+d.bspCr+'Cr':'-', d.demCr?'₹'+d.demCr+'Cr':'-', d.recCr?'₹'+d.recCr+'Cr':'-']);
  if(flipped) return <TableView title="Monthly Sales Trend" headers={['Month','Sales BSP','Demand','Received']} rows={rows} onFlipBack={()=>setFlipped(false)}/>;
  return (<div style={{padding:16,position:'relative'}}>
    <button onClick={()=>setFlipped(true)} style={{position:'absolute',top:8,right:8,zIndex:20,padding:'3px 10px',borderRadius:16,border:'1px solid rgba(0,151,167,0.25)',background:'rgba(255,255,255,0.9)',color:'#006978',fontSize:9,fontWeight:800,cursor:'pointer'}}>⊞ Table</button>
    <SH title="Monthly Sales Trend" sub="BSP · Demand · Collections — ₹ Crores"/>
    <ChartControls mode={tMode} setMode={setTMode} offset={tOff} setOffset={setTOff} total={base.length} window={WIN}/>
    <ResponsiveContainer width="100%" height={200}>
      <AreaChart data={slice} margin={{top:5,right:8,bottom:18,left:0}}>
        <defs>
          {[['a1',T.teal],['a2',T.amber],['a3',T.greenL]].map(([id,c])=>(
            <linearGradient key={id} id={id} x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={c} stopOpacity={0.25}/><stop offset="95%" stopColor={c} stopOpacity={0}/></linearGradient>
          ))}
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,60,100,0.2)" vertical={false}/>
        <XAxis dataKey="label" tick={{fill:T.textM,fontSize:9,fontWeight:600}} axisLine={false} tickLine={false} interval={0} angle={-25} dy={6}/>
        <YAxis tick={{fill:T.textM,fontSize:9,fontWeight:600}} axisLine={false} tickLine={false} tickFormatter={v=>v+'Cr'} width={38}/>
        <Tooltip content={<CTip fmt={v=>'₹'+v+' Cr'}/>}/>
        <Legend wrapperStyle={{color:T.text,fontSize:10,fontWeight:700}} iconSize={8}/>
        <Area type="monotone" dataKey="bspCr" name="Sales(BSP)" stroke={T.teal} fill="url(#a1)" strokeWidth={2} dot={{r:3,fill:T.teal}} activeDot={{r:4}}>
          <LabelList dataKey="bspCr" position="top" style={{fill:T.tealD,fontSize:7,fontWeight:700}} formatter={v=>v>0?v+'Cr':''}/>
        </Area>
        <Area type="monotone" dataKey="demCr" name="Demand" stroke={T.amber} fill="url(#a2)" strokeWidth={2} dot={{r:3,fill:T.amber}} activeDot={{r:4}}>
          <LabelList dataKey="demCr" position="top" style={{fill:T.amber,fontSize:7,fontWeight:700}} formatter={v=>v>0?v+'Cr':''}/>
        </Area>
        <Area type="monotone" dataKey="recCr" name="Received" stroke={T.greenL} fill="url(#a3)" strokeWidth={2} dot={{r:3,fill:T.greenL}} activeDot={{r:4}}>
          <LabelList dataKey="recCr" position="top" style={{fill:T.greenL,fontSize:7,fontWeight:700}} formatter={v=>v>0?v+'Cr':''}/>
        </Area>
      </AreaChart>
    </ResponsiveContainer>
  </div>);
};

const ChartCardBHK = ({bhkS,CC,T,SH}) => {
  const [flipped,setFlipped] = React.useState(false);
  const rows=bhkS.map(d=>[d.bhk, d.booked, d.total, d.available, d.total>0?Math.round((d.booked/d.total)*100)+'%':'0%']);
  if(flipped) return <TableView title="Product-wise (BHK)" headers={['Type','Booked','Total','Available','% Sold']} rows={rows} onFlipBack={()=>setFlipped(false)}/>;
  return (<div style={{padding:16,position:'relative'}}>
    <button onClick={()=>setFlipped(true)} style={{position:'absolute',top:8,right:8,zIndex:20,padding:'3px 10px',borderRadius:16,border:'1px solid rgba(0,151,167,0.25)',background:'rgba(255,255,255,0.9)',color:'#006978',fontSize:9,fontWeight:800,cursor:'pointer'}}>⊞ Table</button>
    <SH title="Product-wise" sub="BHK — Booked vs Total Inventory"/>
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={bhkS} layout="vertical" margin={{top:4,right:70,bottom:4,left:0}} barCategoryGap="30%">
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,60,100,0.1)" horizontal={false}/>
        <XAxis type="number" tick={{fill:T.textM,fontSize:9,fontWeight:600}} axisLine={false} tickLine={false}/>
        <YAxis type="category" dataKey="bhk" tick={{fill:T.text,fontSize:10,fontWeight:700}} axisLine={false} tickLine={false} width={85}/>
        <Tooltip content={({active,payload,label})=>{if(!active||!payload?.length)return null;return(<div style={{background:'rgba(255,255,255,0.97)',border:'1px solid rgba(0,151,167,0.3)',borderRadius:10,padding:'8px 12px',boxShadow:'0 8px 32px rgba(0,80,120,0.18)',fontFamily:'Inter,sans-serif',fontSize:11}}><p style={{color:T.tealD,fontWeight:700,margin:'0 0 4px'}}>{label}</p>{payload.map((p,i)=>(<div key={i} style={{display:'flex',justifyContent:'space-between',gap:16,marginBottom:2}}><span style={{color:T.textM,fontWeight:600,fontSize:10}}>{p.name}</span><span style={{color:T.navy,fontWeight:800,fontSize:10}}>{p.value}</span></div>))}</div>);}}/>
        <Legend iconSize={10} formatter={(value)=>(<span style={{color:T.navy,fontSize:10,fontWeight:800}}>{value}</span>)}/>
        <Bar dataKey="booked" name="Booked" stackId="s" radius={[0,0,0,0]}>
          {bhkS.map((_,i)=><Cell key={i} fill={CC[i%CC.length]}/>)}
        </Bar>
        <Bar dataKey="available" name="Available" stackId="s" fill="rgba(0,151,167,0.15)" stroke={T.teal} strokeWidth={0} radius={[0,4,4,0]}>
          <LabelList content={({x,y,width,height,index})=>{const d=bhkS[index];if(!d)return null;return(<g><text x={x+width+6} y={y+height/2-5} textAnchor="start" dominantBaseline="middle" fill={CC[index%CC.length]} fontSize={9} fontWeight={800}>{d.booked}</text><text x={x+width+6} y={y+height/2+6} textAnchor="start" dominantBaseline="middle" fill={T.textM} fontSize={8} fontWeight={600}>{'/'}{d.total}</text></g>);}}/>
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  </div>);
};

class AppErrorBoundary extends React.Component {
  constructor(props){super(props);this.state={error:null};}
  static getDerivedStateFromError(e){return{error:e};}
  componentDidCatch(e,info){console.error('App crashed:',e,info);}
  render(){
    if(this.state.error)return(
      <div style={{padding:40,fontFamily:'monospace',background:'#fff',minHeight:'100vh'}}>
        <h2 style={{color:'red'}}>Runtime Error — check browser console</h2>
        <pre style={{background:'#f5f5f5',padding:16,borderRadius:8,overflow:'auto',fontSize:11,whiteSpace:'pre-wrap'}}>{String(this.state.error)}{String(this.state.error?.stack||'')}</pre>
        <button onClick={()=>{this.setState({error:null});window.location.reload();}} style={{marginTop:16,padding:'8px 16px',background:'#0097a7',color:'#fff',border:'none',borderRadius:8,cursor:'pointer'}}>Reload</button>
      </div>
    );
    return this.props.children;
  }
}

export default function App() {
  return <AppErrorBoundary><AppInner/></AppErrorBoundary>;
}

function AppInner() {
  const [authed, setAuthed] = useState(()=>sessionStorage.getItem('sd_auth')==='1');
  const [raw,setRaw]=useState(null);
  const [loading,setLoading]=useState(true);
  const [tab,setTab]=useState('overview'); // overview | collections | pipeline

  const [filters,setFilters]=useState({company:'',project:'',month:'',quarter:'',broker:'',typology:'',fy:''});
  const sf=useCallback((k,v)=>setFilters(p=>({...p,[k]:v})),[]);
  // Chart controls (lifted to comply with React hooks rules)
  const [tMode,setTMode]=useState('monthly');
  const [tOff,setTOff]=useState(9999);
  const [bMode,setBMode]=useState('monthly');
  const [bOff,setBOff]=useState(9999);
  const [sMode,setSMode]=useState('monthly');
  const [sOff,setSOff]=useState(9999);
  const [cancelTab,setCancelTab]=useState('overview');
  // Sales & Pricing Trend chart offsets (must be at component level — hooks rules)
  const TODAY_LABEL=(()=>{const d=new Date();return d.toLocaleString('en-US',{month:'short'}).slice(0,3)+"'"+String(d.getFullYear()).slice(2);})();
  // Reset chart offsets to -1 (auto-center) whenever filters change
  useEffect(()=>{setUOff(-1);setTsvOff(-1);setROff(-1);setSuOff(-1);},[filters.project,filters.fy,filters.quarter,filters.month]);
  // Initialize offset so current month is bar #2 (index 1 in view), show 1 past + current + 11 future
  const _initOff=(data,WIN=13)=>{const idx=data.findIndex(d=>d.label===TODAY_LABEL);return idx>=1?idx-1:Math.max(0,idx);};
  const [uOff,setUOff]=useState(-1);
  const [tsvOff,setTsvOff]=useState(-1);
  const [rOff,setROff]=useState(-1);
  const [suOff,setSuOff]=useState(-1);
  const [towerExpanded,setTowerExpanded]=useState(false);
  const [activeFilter,setActiveFilter]=useState(null);
  // Close filter dropdown on outside click
  React.useEffect(()=>{
    const h=()=>setActiveFilter(null);
    document.addEventListener('click',h);
    return()=>document.removeEventListener('click',h);
  },[]);
  const [cpExpanded,setCpExpanded]=useState(false);

  useEffect(()=>{fetch('/data/dashboard_data.json').then(r=>r.json()).then(d=>{setRaw(d);setLoading(false);}).catch(()=>setLoading(false));}, []);

  const fo=raw?.filterOptions||{};
  const availProj=useMemo(()=>(!raw||!filters.company)?fo.projects||[]:(fo.projects||[]).filter(p=>(fo.projCompany||{})[p]===filters.company),[raw,filters.company,fo]);
  const availComp=useMemo(()=>(!raw||!filters.project)?fo.companies||[]:[(fo.projCompany||{})[filters.project]].filter(Boolean),[raw,filters.project,fo]);
  const matchMo=useCallback(m=>{
    const MIdx={'Jan':'01','Feb':'02','Mar':'03','Apr':'04','May':'05','Jun':'06','Jul':'07','Aug':'08','Sep':'09','Oct':'10','Nov':'11','Dec':'12'};
    // FY Quarter map: Q1=Apr-Jun, Q2=Jul-Sep, Q3=Oct-Dec, Q4=Jan-Mar
    const FYQ={'Q1':['04','05','06'],'Q2':['07','08','09'],'Q3':['10','11','12'],'Q4':['01','02','03']};
    // Month filter
    if(filters.month){
      const months=filters.month.split('||').filter(Boolean);
      if(months.length&&!months.some(sel=>{const mo=MIdx[sel];return mo&&m?.endsWith(`-${mo}`);}))return false;
    }
    // Quarter filter: "FY2024-25 Q1" format
    if(filters.quarter){
      const quarters=filters.quarter.split('||').filter(Boolean);
      if(quarters.length&&!quarters.some(sel=>{
        const parts=sel.match(/FY(\d{4}-\d{2})\s+(Q\d)/);
        if(!parts)return false;
        const [,fy,q]=parts;
        const fyStart=parseInt(fy.split('-')[0]);
        const mos=FYQ[q]||[];
        // Q4 belongs to next year (Jan-Mar)
        const year=q==='Q4'?fyStart+1:fyStart;
        return mos.some(mo=>m===`${year}-${mo}`);
      }))return false;
    }
    return true;
  },[filters.month,filters.quarter]);

  const pF=useMemo(()=>{if(!raw?.pdrn)return[];return raw.pdrn.filter(r=>{
    if(filters.company&&r.companyNorm!==filters.company)return false;
    if(filters.project){const projs=filters.project.split('||').filter(Boolean);if(projs.length&&!projs.includes(r.project))return false;}

    if((filters.month||filters.quarter)&&!matchMo(r.bookingMonth))return false;
    if(filters.broker){const brks=filters.broker.split('||').filter(Boolean);if(brks.length&&!brks.includes(r.brokerName))return false;}
    if(filters.typology){const typos=filters.typology.split('||').filter(Boolean);if(typos.length){const b=r.bhkFull||r.bhk||'';if(!typos.includes(b)&&!typos.includes(r.bhk||'')&&!typos.includes(r.bhkFull||''))return false;}}
    if(filters.fy){const fys=filters.fy.split('||').filter(Boolean);if(fys.length){const fy=r.bookingYear?(r.bookingMonth&&parseInt(r.bookingMonth.split('-')[1])>=4?`FY${r.bookingYear}-${String(r.bookingYear+1).slice(2)}`:`FY${r.bookingYear-1}-${String(r.bookingYear).slice(2)}`):null;if(!fys.includes(fy))return false;}}
    return true;
  });},[raw,filters,matchMo]);
  const pA=useMemo(()=>pF.filter(r=>r.status==='ACTIVE'),[pF]);
  const pC=useMemo(()=>pF.filter(r=>r.status==='CANCELLED'),[pF]);
  const dF=useMemo(()=>{if(!raw?.dapp)return[];return raw.dapp.filter(r=>{if(filters.company&&r.companyNorm!==filters.company)return false;if(filters.project){const projs=filters.project.split('||').filter(Boolean);if(projs.length&&!projs.includes(r.project))return false;}if((filters.month||filters.quarter)&&!matchMo(r.billMonth))return false;return true;});},[raw,filters,matchMo]);
  const iF=useMemo(()=>{if(!raw?.invr)return[];return raw.invr.filter(r=>{
    if(filters.company&&r.companyNorm!==filters.company)return false;
    if(filters.project){const projs=filters.project.split('||').filter(Boolean);if(projs.length&&!projs.includes(r.project))return false;}
    if(filters.typology){const typos=filters.typology.split('||').filter(Boolean);if(typos.length){const b=r.bhk||'';if(!typos.includes(b))return false;}}
    return true;
  });},[raw,filters]);
  const wF=useMemo(()=>{if(!raw?.workflow)return[];return raw.workflow.filter(r=>{if(filters.company&&r.companyNorm!==filters.company)return false;if(filters.project){const projs=filters.project.split('||').filter(Boolean);if(projs.length&&!projs.includes(r.project))return false;}return true;});},[raw,filters]);

  const availBrokers=useMemo(()=>{const pb=raw?.projBrokers||{};const selProjs=filters.project?filters.project.split('||').filter(Boolean):[];if(selProjs.length>0){const merged=[];const seen=new Set();selProjs.forEach(p=>{(pb[p]||[]).forEach(b=>{if(!seen.has(b)){seen.add(b);merged.push(b);}});});return merged;}const src=raw?.pdrn||[];const cnt={};src.forEach(r=>{if(filters.company&&r.companyNorm!==filters.company)return;if(r.brokerName)cnt[r.brokerName]=(cnt[r.brokerName]||0)+1;});return Object.entries(cnt).sort((a,b)=>b[1]-a[1]).slice(0,50).map(e=>e[0]);},[raw,filters.project,filters.company]);
  const availTypologies=useMemo(()=>{
    const projTypo=raw?.projTypologies||{};
    const selectedProjs=filters.project?filters.project.split('||').filter(Boolean):[];
    if(selectedProjs.length>0){
      // Get from projTypologies for selected projects
      const fromTypo=selectedProjs.flatMap(p=>projTypo[p]||[]).filter((v,i,a)=>a.indexOf(v)===i).sort();
      if(fromTypo.length>0) return fromTypo;
    }
    // No project or no match — build live from pdrn + invr
    const live=new Set();
    (raw?.pdrn||[]).forEach(r=>{if(r.bhkFull)live.add(r.bhkFull);else if(r.bhk)live.add(r.bhk);});
    (raw?.invr||[]).forEach(r=>{if(r.bhk)live.add(r.bhk);});
    if(live.size>0) return [...live].filter(Boolean).sort();
    // Final fallback: all from projTypo
    return Object.values(projTypo).flat().filter((v,i,a)=>a.indexOf(v)===i).sort();
  },[raw,filters.project]);
  const MONTHS_LIST=useMemo(()=>{
    // If quarter selected, show only months in that quarter; else all months
    const qMonths={'Q1':['Apr','May','Jun'],'Q2':['Jul','Aug','Sep'],'Q3':['Oct','Nov','Dec'],'Q4':['Jan','Feb','Mar']};
    if(filters.quarter){
      const qs=filters.quarter.split('||').filter(Boolean);
      const ms=new Set();
      qs.forEach(q=>{const m=q.match(/Q(\d)$/);if(m)(qMonths['Q'+m[1]]||[]).forEach(x=>ms.add(x));});
      return ms.size>0?[...ms]:['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    }
    return ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  },[filters.quarter]);

  const FY_QUARTERS=useMemo(()=>{
    const fys=filters.fy?filters.fy.split('||').filter(Boolean):(fo.financialYears||[]);
    const qs=[];
    fys.forEach(fy=>{ ['Q1 (Apr-Jun)','Q2 (Jul-Sep)','Q3 (Oct-Dec)','Q4 (Jan-Mar)'].forEach(q=>qs.push(fy+' '+q.split(' ')[0])); });
    return qs;
  },[fo,filters.fy]);

  const kpi=useMemo(()=>{const tS=pA.reduce((s,r)=>s+(r.bsp||0),0),tD=dF.reduce((s,r)=>s+(r.demand||0),0),tR=dF.reduce((s,r)=>s+(r.received||0),0),tO=dF.reduce((s,r)=>s+(r.outstanding||0),0);const ws={APPROVED:0,PENDING:0,REJECTED:0};wF.forEach(r=>{if(ws[r.status]!==undefined)ws[r.status]++;});return{totalUnits:iF.length,bookedUnits:iF.filter(r=>r.status==='Booked').length,availableUnits:iF.filter(r=>r.status==='Available').length,inProgressUnits:iF.filter(r=>r.status==='In Progress').length,totalSales:tS,dappDemand:tD,dappReceived:tR,dappOutstanding:tO,activeBookings:pA.length,cancelledBookings:pC.length,pipelineBookings:wF.filter(r=>r.status==='PENDING').length,wfApproved:ws.APPROVED,wfPending:ws.PENDING,wfRejected:ws.REJECTED};},[pA,pC,dF,iF,wF]);

  const monthly=useMemo(()=>{const map={};pA.forEach(r=>{const m=r.bookingMonth;if(!m)return;if(!map[m])map[m]={month:m,label:fmtML(m),units:0,bspCr:0,demCr:0,recCr:0};map[m].units++;map[m].bspCr+=(r.bsp||0)/1e7;map[m].demCr+=(r.demand||0)/1e7;map[m].recCr+=(r.received||0)/1e7;});return Object.values(map).sort((a,b)=>a.month.localeCompare(b.month)).map(r=>({...r,bspCr:+r.bspCr.toFixed(1),demCr:+r.demCr.toFixed(1),recCr:+r.recCr.toFixed(1)}));},[pA]);
  const dappM=useMemo(()=>{const map={};dF.forEach(r=>{const m=r.billMonth;if(!m)return;if(!map[m])map[m]={month:m,label:fmtML(m),demCr:0,recCr:0,outCr:0};map[m].demCr+=(r.demand||0)/1e7;map[m].recCr+=(r.received||0)/1e7;map[m].outCr+=(r.outstanding||0)/1e7;});return Object.values(map).sort((a,b)=>a.month.localeCompare(b.month)).map(r=>({...r,demCr:+r.demCr.toFixed(1),recCr:+r.recCr.toFixed(1),outCr:+r.outCr.toFixed(1)}));},[dF]);
  const bvc=useMemo(()=>{
    const aM={},cM={};
    pA.forEach(r=>{if(r.bookingMonth)aM[r.bookingMonth]=(aM[r.bookingMonth]||0)+1;});
    pC.forEach(r=>{if(r.bookingMonth)cM[r.bookingMonth]=(cM[r.bookingMonth]||0)+1;});
    const all=Array.from(new Set([...Object.keys(aM),...Object.keys(cM)])).sort();
    // Total inventory target from invr
    const totalInv=iF.length||3184;
    let cumBooked=0;
    return all.map(m=>{
      const booked=aM[m]||0;
      const cancelled=cM[m]||0;
      cumBooked+=booked-cancelled;
      const remaining=Math.max(0,totalInv-cumBooked);
      return{month:m,label:fmtML(m),booked,cancelled,cumBooked,remaining,totalInv};
    });
  },[pA,pC,raw,iF]);
  const kpiEx=useMemo(()=>{
    // Compute from filtered data so it responds to all filters
    const bookedAreaSqft = pA.reduce((s,r)=>s+(r.superArea||0),0);
    const carpetAreaSqft = pA.reduce((s,r)=>s+(r.carpet||0),0);
    const availAreaSqft  = iF.filter(r=>r.status==='Available').reduce((s,r)=>s+(r.superArea||r.superBuiltupArea||0),0);
    const totalBSPCr     = +(pA.reduce((s,r)=>s+(r.bsp||0),0)/1e7).toFixed(1);
    const totalTCVCr     = +(pA.reduce((s,r)=>s+(r.tcv||0),0)/1e7).toFixed(1);
    const cancelledBSPCr = +(pC.reduce((s,r)=>s+(r.bsp||0),0)/1e7).toFixed(1);
    const cancelledAreaSqft = pC.reduce((s,r)=>s+(r.superArea||0),0);
    const avgRatePerSqft = bookedAreaSqft>0?Math.round(pA.reduce((s,r)=>s+(r.bsp||0),0)/bookedAreaSqft):0;
    // Fall back to static JSON values for area if pdrn has no superArea
    const base = raw?.kpiExtra||{};
    return {
      bookedAreaSqft:  bookedAreaSqft>0?bookedAreaSqft:base.bookedAreaSqft||0,
      carpetAreaSqft:  carpetAreaSqft>0?carpetAreaSqft:base.carpetAreaSqft||0,
      availAreaSqft:   availAreaSqft>0?availAreaSqft:base.availAreaSqft||0,
      totalBSPCr:      totalBSPCr>0?totalBSPCr:base.totalBSPCr||0,
      totalTCVCr:      totalTCVCr>0?totalTCVCr:base.totalTCVCr||0,
      cancelledBSPCr:  cancelledBSPCr>0?cancelledBSPCr:base.cancelledBSPCr||0,
      cancelledAreaSqft: cancelledAreaSqft>0?cancelledAreaSqft:base.cancelledAreaSqft||0,
      avgRatePerSqft:  avgRatePerSqft>0?avgRatePerSqft:base.avgRatePerSqft||0,
    };
  },[pA,pC,iF,raw]);
  const salesVsRefund=useMemo(()=>{
    if(!raw?.salesVsRefund) return [];
    if(!filters.project) return raw.salesVsRefund;
    // Always recompute from filtered pdrn (works for single or multiple projects)
    const aM={},cM={},rM={};
    pA.forEach(r=>{if(r.bookingMonth){aM[r.bookingMonth]=(aM[r.bookingMonth]||0)+(r.bsp||0);}});
    pC.forEach(r=>{if(r.bookingMonth){cM[r.bookingMonth]=(cM[r.bookingMonth]||0)+(r.bsp||0);rM[r.bookingMonth]=(rM[r.bookingMonth]||0)+(r.refund||0);}});
    const all=Array.from(new Set([...Object.keys(aM),...Object.keys(cM)])).sort();
    return all.map(m=>({month:fmtML(m),bspCr:Math.round((aM[m]||0)/1e7*10)/10,cancelledBSPCr:Math.round((cM[m]||0)/1e7*10)/10,refundCr:Math.round((rM[m]||0)/1e7*10)/10}));
  },[raw,filters.project,pA,pC]);
  const cancelledUnitStatus=useMemo(()=>{
    const base=raw?.cancelledUnitStatus||{summary:{},buckets:[],byProject:[],vacantUnits:[],rebookedUnits:[]};
    if(!filters.project) return base;
    const label={'Smartworld Sky Arc':'Sky Arc','SMARTWORLD THE EDITION':'Edition','Trump Residences Gurgaon':'Trump','Smartworld Le Courtyard':'Le Courtyard','Smartworld Suites':'Suites','Smartworld Residencies':'Residencies'};
    const projs=filters.project.split('||').filter(Boolean);
    const projLabels=projs.map(p=>label[p]||p);
    const vacant=(base.vacantUnits||[]).filter(u=>projs.includes(u.project)||projLabels.includes(u.projectLabel));
    const rebooked=(base.rebookedUnits||[]).filter(u=>projs.includes(u.project)||projLabels.includes(u.projectLabel));
    const byProject=(base.byProject||[]).filter(u=>projLabels.includes(u.project));
    const bucketMap={'0–30 days':0,'31–90 days':0,'91–180 days':0,'180+ days':0};
    vacant.forEach(u=>{const d=u.daysVacant||0;if(d<=30)bucketMap['0–30 days']++;else if(d<=90)bucketMap['31–90 days']++;else if(d<=180)bucketMap['91–180 days']++;else bucketMap['180+ days']++;});
    const total=vacant.length+rebooked.length;
    return{summary:{totalCancelled:total,rebooked:rebooked.length,stillVacant:vacant.length,rebookedPct:total>0?Math.round(rebooked.length/total*100):0},buckets:(base.buckets||[]).map(b=>({...b,count:bucketMap[b.label]||0})),byProject,vacantUnits:vacant,rebookedUnits:rebooked};
  },[raw,filters.project]);
  const byProj=useMemo(()=>{const map={};pA.forEach(r=>{const p=r.project;if(!p)return;if(!map[p])map[p]={name:p,units:0,bspCr:0};map[p].units++;map[p].bspCr+=(r.bsp||0)/1e7;});return Object.values(map).sort((a,b)=>b.units-a.units).map(r=>({...r,bspCr:+r.bspCr.toFixed(1)}));},[pA]);
  const topCP=useMemo(()=>{const map={};pA.forEach(r=>{const b=r.brokerName;if(!b)return;if(!map[b])map[b]={name:b,units:0,bspCr:0};map[b].units++;map[b].bspCr+=(r.bsp||0)/1e7;});return Object.values(map).sort((a,b)=>b.units-a.units).map(r=>({...r,bspCr:+r.bspCr.toFixed(1)}));},[pA]);
  const bhkS=useMemo(()=>{
    const map={};
    // Booked from pdrn (filtered)
    pA.forEach(r=>{const b=r.bhk||'Other';if(!map[b])map[b]={bhk:b,booked:0,total:0};map[b].booked++;});
    // Total from inventory (filtered)
    iF.forEach(r=>{const b=r.bhk||'Other';if(!map[b])map[b]={bhk:b,booked:0,total:0};map[b].total++;});
    return Object.values(map).sort((a,b)=>b.booked-a.booked).map(r=>({...r,available:Math.max(0,r.total-r.booked)}));
  },[pA,iF]);
  const cpVsDirect=useMemo(()=>{
    if(!raw?.cpVsDirect) return [];
    if(!filters.project) return raw.cpVsDirect;
    const projs=filters.project.split('||').filter(Boolean);
    if(!projs.length) return raw.cpVsDirect;
    return raw.cpVsDirect.filter(r=>projs.includes(r.name));
  },[raw,filters.project]);
  const dappByP=useMemo(()=>{const map={};dF.forEach(r=>{const p=r.project;if(!p)return;if(!map[p])map[p]={name:p,demCr:0,recCr:0,outCr:0};map[p].demCr+=(r.demand||0)/1e7;map[p].recCr+=(r.received||0)/1e7;map[p].outCr+=(r.outstanding||0)/1e7;});return Object.values(map).map(r=>({...r,demCr:+r.demCr.toFixed(1),recCr:+r.recCr.toFixed(1),outCr:+r.outCr.toFixed(1)}));},[dF]);
  const top10=useMemo(()=>[...pA].sort((a,b)=>(b.tcv||0)-(a.tcv||0)).slice(0,10),[pA]);
  const openBkg=useMemo(()=>[...pA].sort((a,b)=>(b.bsp||0)-(a.bsp||0)).slice(0,15),[pA]);
  const pendingWF=useMemo(()=>wF.filter(r=>r.status==='PENDING'),[wF]);
  const tgtAch=pct(kpi.dappReceived,kpi.dappDemand);
  const last12=monthly.slice(-12);
  const dappLast12=dappM.slice(-12);

  // Tower & area data from enriched JSON
  // Merge actual monthly data with future targets (up to Mar 2027)
  const monthlyWithTargets=useMemo(()=>{
    const allTargets=raw?.monthlyTargets||[];
    const selectedProjects=filters.project?filters.project.split('||').filter(Boolean):[];
    const selectedFYs=filters.fy?filters.fy.split('||').filter(Boolean):[];

    // FY month range: FY2025-26 = 2025-04 to 2026-03
    const fyRange=(fy)=>{const m=fy.match(/FY(\d{4})-(\d{2})/);if(!m)return null;return{start:`${m[1]}-04`,end:`${2000+parseInt(m[2])}-03`};};
    const inFY=(mo)=>{if(!selectedFYs.length)return true;return selectedFYs.some(fy=>{const r=fyRange(fy);return r&&mo>=r.start&&mo<=r.end;});};

    // Filter targets by project + FY + quarter/month
    const targets=allTargets.filter(t=>{
      if(t.projectFilter){
        if(selectedProjects.length===0)return false;
        if(!selectedProjects.some(p=>p.toUpperCase()===t.projectFilter.toUpperCase()))return false;
      }
      if(selectedFYs.length&&!inFY(t.month))return false;
      if(filters.quarter||filters.month){if(!matchMo(t.month))return false;}
      return true;
    });

    // Build actual data maps from filtered pA
    const unitMap={},areaMap={},bspMap={};
    pA.filter(r=>r.bookingMonth&&(!selectedFYs.length||inFY(r.bookingMonth))&&(!filters.quarter&&!filters.month||matchMo(r.bookingMonth))).forEach(r=>{
      const lbl=fmtML(r.bookingMonth);
      unitMap[lbl]=(unitMap[lbl]||0)+1;
      areaMap[lbl]=(areaMap[lbl]||0)+(r.superArea||0);
      bspMap[lbl]=(bspMap[lbl]||0)+(r.bsp||0);
    });

    const targetMap={};
    targets.forEach(t=>{targetMap[t.label]=t;});

    const parseLabel=l=>{const m=l.match(/([A-Za-z]{3})'(\d{2})/);if(!m)return 0;const mon={Jan:1,Feb:2,Mar:3,Apr:4,May:5,Jun:6,Jul:7,Aug:8,Sep:9,Oct:10,Nov:11,Dec:12};const yr=parseInt(m[2]);return(yr>=90?1900+yr:2000+yr)*100+(mon[m[1]]||0);};

    const allLabels=[...new Set([...Object.keys(unitMap),...targets.map(t=>t.label)])];
    allLabels.sort((a,b)=>parseLabel(a)-parseLabel(b));

    const today=parseLabel(TODAY_LABEL);

    return allLabels.map(label=>{
      const target=targetMap[label]||{};
      const isActual=!!unitMap[label];
      const labelNum=parseLabel(label);
      return{
        label,
        bspCr:isActual?(+(( bspMap[label]||0)/1e7).toFixed(1)):null,
        bookedUnits:unitMap[label]||null,
        bookedAreaSqft:areaMap[label]||null,
        targetUnits:target.units||null,
        targetTsvCr:target.tsvCr||null,
        targetRate:target.targetRate||null,
        targetAreaSqft:target.areaSqft||null,
        isFuture:labelNum>today,
        isCurrent:label===TODAY_LABEL,
        actualRate:(raw?.monthlyActualRates||{})[label]||null,
        // Continuous lines — show on ALL months that have target data
        targetUnitsLine:target.units||null,
        targetTsvLine:target.tsvCr||null,
        targetRateLine:target.targetRate||null,
      };
    });
  },[monthly,raw,pA,filters,matchMo,TODAY_LABEL]);

  const towerData=useMemo(()=>{
    if(!raw?.towerData) return [];
    return raw.towerData.filter(r=>{
      if(filters.project){const _p=filters.project.split('||').filter(Boolean);if(_p.length&&!_p.includes(r.project))return false;}
      return true;
    });
  },[raw,filters.project]);
  const areaSummary=useMemo(()=>{
    const base=raw?.areaSummary||{};
    if(!filters.project) return base;
    const projs=filters.project.split('||').filter(Boolean);
    // Filter byProject to selected projects
    const filtered=(base.byProject||[]).filter(d=>!projs.length||projs.includes(d.project));
    const bookedArea=filtered.reduce((s,d)=>s+d.bookedArea,0);
    const availableArea=filtered.reduce((s,d)=>s+d.availableArea,0);
    const pricedPjs=filtered.filter(d=>d.avgPricePerSqft>0);
    const avgPricePerSqft=pricedPjs.length>0?Math.round(pricedPjs.reduce((s,d)=>s+d.avgPricePerSqft,0)/pricedPjs.length):0;
    return{...base,bookedArea,availableArea,avgPricePerSqft,minPricePerSqft:avgPricePerSqft,maxPricePerSqft:avgPricePerSqft,byProject:filtered};
  },[raw,filters.project]);

  

  if(loading) return (
    <div style={{minHeight:'100vh',backgroundImage:'url(/bg.jpg)',backgroundSize:'cover',backgroundPosition:'center',display:'flex',alignItems:'center',justifyContent:'center',flexDirection:'column',gap:16}}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      <div style={{background:'rgba(255,255,255,0.9)',backdropFilter:'blur(20px)',borderRadius:20,padding:'32px 48px',textAlign:'center',boxShadow:'0 8px 40px rgba(0,0,0,0.2)'}}>
        <div style={{position:'relative',width:64,height:64,margin:'0 auto 16px'}}>
          <div style={{position:'absolute',inset:0,border:'3px solid rgba(13,31,60,0.12)',borderTop:'3px solid #0d1f3c',borderRadius:'50%',animation:'spin 0.9s linear infinite'}}/>
          <div style={{position:'absolute',inset:8,background:'#0d1f3c',borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center'}}>
            <img src="/swd-logo.png" alt="SWD" style={{width:28,height:28,objectFit:'contain'}}/>
          </div>
        </div>
        <p style={{fontFamily:'Inter,sans-serif',color:'#0d1f3c',fontSize:14,fontWeight:900,margin:'0 0 4px',letterSpacing:0.5}}>Project Snapshot</p>
        <p style={{fontFamily:'Inter,sans-serif',color:T.textM,fontSize:11,fontWeight:500,margin:0}}>Loading Project Snapshot...</p>
      </div>
    </div>
  );

  // Tab labels
  const tabs=[{k:'overview',l:'Overview'},{k:'collections',l:'Collections & DAPP'},{k:'pipeline',l:'Pipeline & Deals'}];

  return (
    <div style={{minHeight:'100vh',backgroundImage:'url(/bg.jpg)',backgroundSize:'cover',backgroundPosition:'center',backgroundAttachment:'fixed',fontFamily:'Inter,sans-serif',color:T.text}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap');
        *{box-sizing:border-box;scrollbar-width:thin;scrollbar-color:rgba(0,151,167,0.3) transparent}
        ::-webkit-scrollbar{width:4px;height:4px}::-webkit-scrollbar-thumb{background:rgba(0,151,167,0.4);border-radius:2px}
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes fadeIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}
        .kc{transition:transform 0.2s ease,box-shadow 0.2s ease}.kc:hover{transform:translateY(-2px);box-shadow:0 8px 32px rgba(0,80,120,0.18)!important}
        .tr:hover td{background:rgba(0,151,167,0.06)!important}
        select option{background:#fff;color:#0d2137}
        .tab{transition:all 0.2s;cursor:pointer}
        .tab:hover{background:rgba(255,255,255,0.5)!important}
        .card-text{text-shadow:0 1px 3px rgba(255,255,255,0.8)}
        .kc p,.kc span,.kc div{font-weight:inherit}
      `}</style>

      {/* BG overlay — very subtle darkening for readability */}
      <div style={{position:'fixed',inset:0,background:'rgba(0,20,40,0.25)',pointerEvents:'none',zIndex:0}}/>

      {/* ── HEADER ── */}
      <header style={{position:'sticky',top:0,zIndex:200,background:'rgba(255,255,255,0.95)',WebkitBackdropFilter:'blur(24px)',borderBottom:'1px solid rgba(255,255,255,0.9)',boxShadow:'0 2px 20px rgba(0,60,100,0.12)'}}>
        <div style={{maxWidth:1440,margin:'0 auto',padding:'0 24px',display:'flex',alignItems:'center',justifyContent:'space-between',height:54}}>
          {/* Logo */}
          <div style={{display:'flex',alignItems:'center',gap:12}}>
            <div style={{width:38,height:38,borderRadius:9,background:'#0d1f3c',display:'flex',alignItems:'center',justifyContent:'center',boxShadow:'0 4px 14px rgba(0,30,80,0.3)',flexShrink:0,overflow:'hidden'}}>
              <img src="/swd-logo.png" alt="SWD" style={{width:26,height:26,objectFit:'contain'}}/>
            </div>
            <div>
              <div style={{fontWeight:900,fontSize:15,letterSpacing:0.5,color:T.navy}}>Project Snapshot</div>
              <div style={{color:T.textM,fontSize:9,letterSpacing:1.5,fontWeight:700}}>SMARTWORLD GROUP · SALES INTELLIGENCE</div>
            </div>
          </div>

          {/* Tabs */}
          <div style={{display:'flex',gap:4,background:'rgba(0,100,140,0.08)',borderRadius:10,padding:4}}>
            {tabs.map(t=>(
              <button key={t.k} className="tab" onClick={()=>setTab(t.k)} style={{
                background:tab===t.k?'rgba(255,255,255,0.95)':'transparent',
                border:'none',borderRadius:7,padding:'6px 16px',fontSize:11,fontWeight:tab===t.k?700:500,
                color:tab===t.k?T.tealD:T.text,cursor:'pointer',fontFamily:'Inter,sans-serif',fontWeight:tab===t.k?800:600,
                boxShadow:tab===t.k?'0 2px 8px rgba(0,80,120,0.12)':'none',
              }}>{t.l}</button>
            ))}
          </div>

          {/* Right */}
          <div style={{display:'flex',alignItems:'center',gap:14}}>

            <div style={{display:'flex',alignItems:'center',gap:5,background:'rgba(46,125,50,0.1)',border:'1px solid rgba(46,125,50,0.3)',borderRadius:16,padding:'3px 10px'}}>
              <div style={{width:6,height:6,borderRadius:'50%',background:T.greenL,animation:'pulse 2s ease infinite'}}/>
              <span style={{color:T.green,fontSize:9,fontWeight:700}}>LIVE</span>
            </div>
            <span style={{color:T.textM,fontSize:10,fontWeight:700}}>{new Date().toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'})}</span>
            <button onClick={()=>{sessionStorage.removeItem('sd_auth');window.location.reload();}} style={{display:'flex',alignItems:'center',gap:6,padding:'6px 14px',borderRadius:10,border:'1px solid rgba(200,40,40,0.25)',background:'rgba(211,47,47,0.07)',cursor:'pointer',fontSize:11,fontWeight:700,color:T.red,fontFamily:'Inter,sans-serif',transition:'all 0.15s'}} onMouseOver={e=>{e.currentTarget.style.background='rgba(211,47,47,0.14)';}} onMouseOut={e=>{e.currentTarget.style.background='rgba(211,47,47,0.07)';}}>
              🔒 Logout
            </button>
          </div>
        </div>

        {/* Filter strip */}
        <div onClick={e=>e.stopPropagation()} style={{maxWidth:1440,margin:'0 auto',padding:'4px 24px 8px',display:'flex',alignItems:'flex-end',gap:10,flexWrap:'wrap'}}>
          <FSel label="Project"    options={availProj}                           value={filters.project}  onChange={v=>sf('project',v)}   multi={true} openId="project"    activeOpen={activeFilter} setActiveOpen={setActiveFilter}/>
          <FSel label="Fin. Year"  options={fo.financialYears||[]}               value={filters.fy}       onChange={v=>sf('fy',v)}         multi={true} openId="fy"         activeOpen={activeFilter} setActiveOpen={setActiveFilter}/>
          <FSel label="Month"        options={MONTHS_LIST}                              value={filters.month}    onChange={v=>sf('month',v)}      multi={true} openId="month"      activeOpen={activeFilter} setActiveOpen={setActiveFilter}/>
          <FSel label="Quarter"       options={FY_QUARTERS}                              value={filters.quarter}  onChange={v=>sf('quarter',v)}    multi={true} openId="quarter"    activeOpen={activeFilter} setActiveOpen={setActiveFilter}/>
          <FSel label="CP"         options={availBrokers}                         value={filters.broker}   onChange={v=>sf('broker',v)}     multi={true} openId="cp"         activeOpen={activeFilter} setActiveOpen={setActiveFilter}/>
          <FSel label="Typology"   options={availTypologies}                      value={filters.typology} onChange={v=>sf('typology',v)}   multi={true} openId="typology"   activeOpen={activeFilter} setActiveOpen={setActiveFilter}/>
          {Object.values(filters).some(Boolean)&&(
            <button onClick={()=>setFilters({company:'',project:'',year:'',month:'',quarter:'',broker:'',typology:'',fy:''})}
              style={{background:'linear-gradient(135deg,#c62828,#ef5350)',border:'none',borderRadius:7,color:'#fff',padding:'5px 14px',fontSize:10,cursor:'pointer',fontWeight:700,boxShadow:'0 2px 8px rgba(200,40,40,0.3)',alignSelf:'flex-end'}}>
              ✕ Reset
            </button>
          )}
        </div>

        {/* ── PROJECT SNAPSHOT BAR ── */}
        {(()=>{
          const meta=raw?.projectMeta||{};
          const projs=filters.project?filters.project.split('||').filter(Boolean):[];
          const isSingle=projs.length===1;
          const allMeta=isSingle?[meta[projs[0]]].filter(Boolean):(projs.length>1?projs.map(p=>meta[p]).filter(Boolean):Object.values(meta));
          if(!allMeta.length) return null;
          // Aggregate builtup & saleable as sum (numeric acres and lakh sqft)
          const sumBuiltup=allMeta.reduce((s,m)=>s+parseFloat(m.builtup),0).toFixed(1);
          const sumSaleable=allMeta.reduce((s,m)=>s+parseFloat(m.saleableArea),0).toFixed(1);
          const m=isSingle?allMeta[0]:null;
          const label=isSingle?m.label:`${allMeta.length} Projects`;
          const fields=[
            {icon:'🌍',label:'Land Area',val:`${sumBuiltup} Acres`,color:T.teal},
            {icon:'🏗️',label:'Builtup Area',val:isSingle&&m?m.builtupSqft:`${(parseFloat(sumBuiltup)*100000).toLocaleString('en-IN')} sq ft`,color:'#7c3aed'},
            {icon:'📐',label:'Saleable Area',val:`${sumSaleable} Lakh sq ft`,color:T.amber},
            ...(isSingle&&m?[
              {icon:'🚀',label:'Launch Date',val:m.launchDate,color:'#0097a7'},
              {icon:'🏁',label:'Project HO Date',val:m.handoverDate,color:T.greenL},
            ]:[]),
          ];
          return(
            <div style={{maxWidth:1440,margin:'0 auto',padding:'0 24px 8px'}}>
              <div style={{display:'flex',alignItems:'center',background:'linear-gradient(135deg,rgba(0,105,120,0.07),rgba(0,188,212,0.05))',border:'1px solid rgba(0,151,167,0.15)',borderRadius:10,padding:'7px 20px',gap:0,flexWrap:'wrap'}}>
                <div style={{display:'flex',alignItems:'center',gap:8,paddingRight:16,borderRight:'1px solid rgba(0,151,167,0.12)',marginRight:16,flexShrink:0}}>
                  <div style={{width:28,height:28,borderRadius:7,background:'linear-gradient(135deg,#006978,#00bcd4)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:14}}>🏢</div>
                  <div>
                    <p style={{fontSize:8,color:T.textM,fontWeight:700,margin:0,textTransform:'uppercase',letterSpacing:0.4}}>Project Snapshot</p>
                    <p style={{fontSize:12,fontWeight:900,color:T.navy,margin:0}}>{label}</p>
                  </div>
                </div>
                {fields.map((d,j)=>(
                  <div key={j} style={{display:'flex',alignItems:'center',gap:8,padding:'0 16px',borderRight:j<fields.length-1?'1px solid rgba(0,151,167,0.1)':'none',flexShrink:0}}>
                    <div style={{width:24,height:24,borderRadius:6,background:`${d.color}15`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:12}}>{d.icon}</div>
                    <div>
                      <p style={{fontSize:8,color:T.textM,fontWeight:700,margin:0,textTransform:'uppercase',letterSpacing:0.3}}>{d.label}</p>
                      <p style={{fontSize:12,fontWeight:800,color:d.color,margin:0}}>{d.val}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })()}
      </header>

      {/* ── MAIN CONTENT — floats on BG ── */}
      <div style={{position:'relative',zIndex:1,maxWidth:1440,margin:'0 auto',padding:'16px 24px 24px',animation:'fadeIn 0.35s ease'}}>

        {/* ══════════════════════════════════════════════════════
            TAB: OVERVIEW
        ══════════════════════════════════════════════════════ */}
        {tab==='overview'&&(
          <div style={{display:'flex',flexDirection:'column',gap:14}}>

            {/* ── SECTION: Sales Overview ── */}
            <div style={{display:'flex',alignItems:'center',gap:12}}>
              <div style={{background:'linear-gradient(135deg,#006978,#00bcd4)',borderRadius:10,padding:'5px 18px',display:'flex',alignItems:'center',gap:8,boxShadow:'0 2px 10px rgba(0,151,167,0.25)'}}>
                <span style={{fontSize:13}}>📊</span>
                <span style={{fontSize:11,fontWeight:900,color:'#fff',textTransform:'uppercase',letterSpacing:1}}>Sales Overview</span>
              </div>
              <div style={{flex:1,height:1,background:'rgba(0,151,167,0.15)',borderRadius:1}}/>
            </div>
            {/* ROW 1: KPI CARDS — Merged pairs with pie charts */}
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:10}}>

              {/* CARD A: Units — pie chart with booked+available */}
              <GC style={{padding:12}} cls="kc">
                <SH title="Total Units" compact/>
                <div style={{display:'flex',alignItems:'center',gap:8}}>
                  <div style={{width:80,height:80,flexShrink:0,position:'relative'}}>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={[{name:'Booked',value:kpi.bookedUnits||0},{name:'Available',value:kpi.availableUnits||0}]}
                          cx="50%" cy="50%" innerRadius={24} outerRadius={38} paddingAngle={3} dataKey="value" strokeWidth={1.5} stroke="rgba(255,255,255,0.9)" labelLine={false}>
                          <Cell fill={T.teal}/><Cell fill={T.amber}/>
                        </Pie>
                        <Tooltip content={<CTip/>}/>
                      </PieChart>
                    </ResponsiveContainer>
                    <div style={{position:'absolute',inset:0,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',pointerEvents:'none'}}>
                      <span style={{fontSize:10,fontWeight:900,color:T.tealD,lineHeight:1}}>{kpi.totalUnits>0?Math.round((kpi.bookedUnits/kpi.totalUnits)*100):0}%</span>
                      <span style={{fontSize:6,fontWeight:700,color:T.textM}}>SOLD</span>
                    </div>
                  </div>
                  <div style={{flex:1,display:'flex',flexDirection:'column',gap:4}}>
                    <div>
                      <p style={{fontSize:7,color:T.textM,fontWeight:700,margin:'0 0 1px',textTransform:'uppercase'}}>Total</p>
                      <p style={{fontSize:16,fontWeight:900,color:T.navy,margin:0,letterSpacing:-0.5}}>{kpi.totalUnits?.toLocaleString('en-IN')}</p>
                    </div>
                    <div style={{display:'flex',gap:6}}>
                      <div style={{flex:1,background:`${T.teal}0d`,borderRadius:5,padding:'3px 5px'}}>
                        <p style={{fontSize:7,color:T.textM,fontWeight:700,margin:'0 0 1px'}}>Booked</p>
                        <p style={{fontSize:12,fontWeight:900,color:T.tealD,margin:0}}>{kpi.bookedUnits?.toLocaleString('en-IN')}</p>
                      </div>
                      <div style={{flex:1,background:`${T.amber}0d`,borderRadius:5,padding:'3px 5px'}}>
                        <p style={{fontSize:7,color:T.textM,fontWeight:700,margin:'0 0 1px'}}>Avail</p>
                        <p style={{fontSize:12,fontWeight:900,color:T.amber,margin:0}}>{kpi.availableUnits?.toLocaleString('en-IN')}</p>
                      </div>
                    </div>
                  </div>
                </div>
                <div style={{position:'absolute',bottom:0,left:0,right:0,height:3,background:`linear-gradient(90deg,${T.teal},${T.amber})`,borderRadius:'0 0 14px 14px'}}/>
              </GC>

              {/* CARD B: Area — pie chart with sold+available */}
              <GC style={{padding:12}} cls="kc">
                <SH title="Area (sq ft)" compact/>
                {(()=>{
                  const sold=kpiEx.bookedAreaSqft||0;
                  const avail=kpiEx.availAreaSqft||0;
                  const tot=sold+avail;
                  const pct=tot>0?Math.round((sold/tot)*100):0;
                  return(
                    <div style={{display:'flex',alignItems:'center',gap:8}}>
                      <div style={{width:80,height:80,flexShrink:0,position:'relative'}}>
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie data={[{name:'Sold',value:sold||0.01},{name:'Available',value:avail||0.01}]}
                              cx="50%" cy="50%" innerRadius={24} outerRadius={38} paddingAngle={3} dataKey="value" strokeWidth={1.5} stroke="rgba(255,255,255,0.9)" labelLine={false}>
                              <Cell fill={T.teal}/><Cell fill={T.amber}/>
                            </Pie>
                            <Tooltip content={<CTip fmt={v=>(v/1000).toFixed(0)+'K sqft'}/>}/>
                          </PieChart>
                        </ResponsiveContainer>
                        <div style={{position:'absolute',inset:0,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',pointerEvents:'none'}}>
                          <span style={{fontSize:10,fontWeight:900,color:T.tealD,lineHeight:1}}>{pct}%</span>
                          <span style={{fontSize:6,fontWeight:700,color:T.textM}}>SOLD</span>
                        </div>
                      </div>
                      <div style={{flex:1,display:'flex',flexDirection:'column',gap:4}}>
                        <div>
                          <p style={{fontSize:7,color:T.textM,fontWeight:700,margin:'0 0 1px',textTransform:'uppercase'}}>Total</p>
                          <p style={{fontSize:14,fontWeight:900,color:T.navy,margin:0}}>{(tot/1000).toFixed(0)}K</p>
                          <p style={{fontSize:7,color:T.textM,margin:0}}>Carpet: {(kpiEx.carpetAreaSqft/1000).toFixed(0)}K</p>
                        </div>
                        <div style={{display:'flex',gap:6}}>
                          <div style={{flex:1,background:`${T.teal}0d`,borderRadius:5,padding:'3px 5px'}}>
                            <p style={{fontSize:7,color:T.textM,fontWeight:700,margin:'0 0 1px'}}>Sold</p>
                            <p style={{fontSize:11,fontWeight:900,color:T.tealD,margin:0}}>{(sold/1000).toFixed(0)}K</p>
                          </div>
                          <div style={{flex:1,background:`${T.amber}0d`,borderRadius:5,padding:'3px 5px'}}>
                            <p style={{fontSize:7,color:T.textM,fontWeight:700,margin:'0 0 1px'}}>Avl</p>
                            <p style={{fontSize:11,fontWeight:900,color:T.amber,margin:0}}>{(avail/1000).toFixed(0)}K</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })()}
                <div style={{position:'absolute',bottom:0,left:0,right:0,height:3,background:`linear-gradient(90deg,${T.teal},${T.amber})`,borderRadius:'0 0 14px 14px'}}/>
              </GC>

              {/* CARD C: TSV — BSP + TCV pie */}
              <GC style={{padding:12}} cls="kc">
                <SH title="Total Sales Value" compact/>
                {(()=>{
                  const bsp=kpiEx.totalBSPCr||0;
                  const tax=(kpiEx.totalTCVCr||0)-bsp;
                  return(
                    <div style={{display:'flex',alignItems:'center',gap:8}}>
                      <div style={{width:80,height:80,flexShrink:0,position:'relative'}}>
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie data={[{name:'BSP',value:bsp||0.01},{name:'Tax/Charges',value:tax||0.01}]}
                              cx="50%" cy="50%" innerRadius={24} outerRadius={38} paddingAngle={3} dataKey="value" strokeWidth={1.5} stroke="rgba(255,255,255,0.9)" labelLine={false}>
                              <Cell fill={T.teal}/><Cell fill={'#7c3aed'}/>
                            </Pie>
                            <Tooltip content={<CTip fmt={v=>'₹'+v.toFixed(1)+' Cr'}/>}/>
                          </PieChart>
                        </ResponsiveContainer>
                        <div style={{position:'absolute',inset:0,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',pointerEvents:'none'}}>
                          <span style={{fontSize:9,fontWeight:900,color:T.tealD,lineHeight:1}}>₹{((kpiEx.totalTCVCr||0)/1000).toFixed(1)}K</span>
                          <span style={{fontSize:6,fontWeight:700,color:T.textM}}>TCV Cr</span>
                        </div>
                      </div>
                      <div style={{flex:1,display:'flex',flexDirection:'column',gap:4}}>
                        <div style={{background:`${T.teal}0d`,borderRadius:5,padding:'4px 6px'}}>
                          <p style={{fontSize:7,color:T.textM,fontWeight:700,margin:'0 0 1px'}}>BSP (Net)</p>
                          <p style={{fontSize:13,fontWeight:900,color:T.tealD,margin:0}}>₹{((kpiEx.totalBSPCr||0)/1000).toFixed(1)}K Cr</p>
                          <p style={{fontSize:7,color:T.red,margin:0}}>-₹{(kpiEx.cancelledBSPCr||0).toFixed(0)}Cr cancelled</p>
                        </div>
                        <div style={{background:'rgba(124,58,237,0.06)',borderRadius:5,padding:'3px 6px'}}>
                          <p style={{fontSize:7,color:T.textM,fontWeight:700,margin:'0 0 1px'}}>TCV incl. tax</p>
                          <p style={{fontSize:11,fontWeight:900,color:'#7c3aed',margin:0}}>₹{((kpiEx.totalTCVCr||0)/1000).toFixed(1)}K Cr</p>
                        </div>
                      </div>
                    </div>
                  );
                })()}
                <div style={{position:'absolute',bottom:0,left:0,right:0,height:3,background:`linear-gradient(90deg,${T.teal},#7c3aed)`,borderRadius:'0 0 14px 14px'}}/>
              </GC>

            </div>

            {/* ROW 2: SALES & PRICING TREND — Target vs Achieved */}
            <div style={{display:'flex',flexDirection:'column',gap:12}}>

              {/* ── SECTION: Sales & Pricing Trend ── */}
              <div style={{display:'flex',alignItems:'center',gap:12}}>
                <div style={{background:'linear-gradient(135deg,#b45309,#f59e0b)',borderRadius:10,padding:'5px 18px',display:'flex',alignItems:'center',gap:8,boxShadow:'0 2px 10px rgba(245,158,11,0.3)'}}>
                  <span style={{fontSize:13}}>📈</span>
                  <span style={{fontSize:11,fontWeight:900,color:'#fff',textTransform:'uppercase',letterSpacing:1}}>Sales & Pricing Trend</span>
                </div>
                <div style={{flex:1,height:1,background:'rgba(245,158,11,0.15)',borderRadius:1}}/>
              </div>

              {/* 2x2 chart grid */}
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>

                {/* ── CHART 1: UNITS ─────────────────────────────────── */}
                <GC style={{padding:16}}>
                  <SH title="Units — Booked vs Target" sub="Achieved (teal) · Target (grey) · Lines connect both"/>
                  {(()=>{
                    const WIN=10;
                    const data=monthlyWithTargets.map(d=>({
                      label:d.label,isFuture:d.isFuture,isCurrent:d.label===TODAY_LABEL,
                      achieved:d.isFuture?null:(d.bookedUnits||null),
                      target:d.targetUnitsLine||null,
                    }));
                    const cur=data.findIndex(d=>d.isCurrent);
                    const def=cur>=2?cur-2:Math.max(0,data.length-WIN);
                    const off=Math.min(Math.max(uOff<0?def:uOff,0),Math.max(0,data.length-WIN));
                    const sl=data.slice(off,off+WIN);
                    return(<>
                      <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:6}}>
                        <button onClick={()=>setUOff(Math.max(0,off-1))} disabled={off===0} style={{width:22,height:22,borderRadius:'50%',border:'1px solid rgba(0,151,167,0.2)',background:'rgba(255,255,255,0.8)',cursor:off===0?'default':'pointer',fontSize:13,color:off===0?'#ccc':'#0097a7',display:'flex',alignItems:'center',justifyContent:'center'}}>‹</button>
                        <div style={{flex:1,height:4,background:'rgba(0,151,167,0.1)',borderRadius:2,overflow:'hidden'}}><div style={{width:(WIN/Math.max(data.length,1)*100)+'%',marginLeft:(off/Math.max(data.length,1)*100)+'%',height:'100%',background:'#0097a7',borderRadius:2}}/></div>
                        <button onClick={()=>setUOff(Math.min(data.length-WIN,off+1))} disabled={off>=data.length-WIN} style={{width:22,height:22,borderRadius:'50%',border:'1px solid rgba(0,151,167,0.2)',background:'rgba(255,255,255,0.8)',cursor:off>=data.length-WIN?'default':'pointer',fontSize:13,color:off>=data.length-WIN?'#ccc':'#0097a7',display:'flex',alignItems:'center',justifyContent:'center'}}>›</button>
                      </div>
                      <ResponsiveContainer width="100%" height={210}>
                        <ComposedChart data={sl} margin={{top:26,right:8,bottom:18,left:0}} barGap={4} barCategoryGap="30%">
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,60,100,0.1)" vertical={false}/>
                          <XAxis dataKey="label" tick={({x,y,payload})=>{const d=sl.find(s=>s.label===payload.value);return <text x={x} y={y+10} textAnchor="middle" fontSize={9} fill={d?.isCurrent?T.tealD:d?.isFuture?'#90a4ae':T.textM} fontWeight={d?.isCurrent?900:600}>{payload.value}</text>;}} axisLine={false} tickLine={false}/>
                          <YAxis tick={{fill:T.textM,fontSize:9}} axisLine={false} tickLine={false} width={32}/>
                          <Tooltip content={({active,payload,label})=>{if(!active||!payload?.length)return null;const d=sl.find(s=>s.label===label);return(<div style={{background:'rgba(255,255,255,0.97)',border:'1px solid rgba(0,151,167,0.3)',borderRadius:10,padding:'8px 12px',fontSize:10}}><p style={{color:T.tealD,fontWeight:800,margin:'0 0 4px'}}>{label}</p>{d?.achieved!=null&&<p style={{color:T.tealD,margin:0}}>Achieved: {d.achieved} units</p>}{d?.target!=null&&<p style={{color:'#607d8b',margin:0}}>Target: {d.target} units</p>}</div>);}}/>
                          <Legend wrapperStyle={{fontSize:9,fontWeight:700}} iconSize={8}/>
                          <Bar dataKey="achieved" name="Achieved" fill={T.teal} radius={[3,3,0,0]} barSize={18} isAnimationActive={true} animationDuration={800} animationEasing="ease-out">
                            {sl.map((d,i)=><Cell key={i} fill={d.isCurrent?T.tealD:T.teal} fillOpacity={d.isCurrent?1:0.85}/>)}
                            <LabelList dataKey="achieved" position="top" style={{fill:T.tealD,fontSize:8,fontWeight:800}} formatter={v=>v>0?v:''}/>
                          </Bar>
                          <Bar dataKey="target" name="Target" fill="#b0bec5" fillOpacity={0.75} radius={[3,3,0,0]} barSize={18} isAnimationActive={true} animationDuration={1000} animationEasing="ease-out">
                            <LabelList dataKey="target" position="top" style={{fill:'#607d8b',fontSize:8,fontWeight:800}} formatter={v=>v>0?v:''}/>
                          </Bar>
                          <Line type="monotone" dataKey="achieved" stroke={T.tealD} strokeWidth={2.5} dot={{r:4,fill:T.tealD,stroke:'#fff',strokeWidth:2}} activeDot={{r:5}} legendType="none" connectNulls={true}/>
                          <Line type="monotone" dataKey="target" stroke="#607d8b" strokeWidth={2} strokeDasharray="5 3" dot={{r:3,fill:'#607d8b',stroke:'#fff',strokeWidth:1.5}} activeDot={{r:4}} legendType="none" connectNulls={true}/>
                        </ComposedChart>
                      </ResponsiveContainer>
                    </>);
                  })()}
                </GC>

                {/* ── CHART 2: TSV ─────────────────────────────────────── */}
                <GC style={{padding:16}}>
                  <SH title="TSV — Achieved vs Target" sub="Actual BSP (teal) · Target TSV (grey)"/>
                  {(()=>{
                    const WIN=10;
                    const data=monthlyWithTargets.map(d=>({
                      label:d.label,isFuture:d.isFuture,isCurrent:d.label===TODAY_LABEL,
                      achieved:d.isFuture?null:(d.bspCr||null),
                      target:d.targetTsvLine||null,
                    }));
                    const cur=data.findIndex(d=>d.isCurrent);
                    const def=cur>=2?cur-2:Math.max(0,data.length-WIN);
                    const off=Math.min(Math.max(tsvOff<0?def:tsvOff,0),Math.max(0,data.length-WIN));
                    const sl=data.slice(off,off+WIN);
                    return(<>
                      <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:6}}>
                        <button onClick={()=>setTsvOff(Math.max(0,off-1))} disabled={off===0} style={{width:22,height:22,borderRadius:'50%',border:'1px solid rgba(0,151,167,0.2)',background:'rgba(255,255,255,0.8)',cursor:off===0?'default':'pointer',fontSize:13,color:off===0?'#ccc':'#0097a7',display:'flex',alignItems:'center',justifyContent:'center'}}>‹</button>
                        <div style={{flex:1,height:4,background:'rgba(0,151,167,0.1)',borderRadius:2,overflow:'hidden'}}><div style={{width:(WIN/Math.max(data.length,1)*100)+'%',marginLeft:(off/Math.max(data.length,1)*100)+'%',height:'100%',background:'#0097a7',borderRadius:2}}/></div>
                        <button onClick={()=>setTsvOff(Math.min(data.length-WIN,off+1))} disabled={off>=data.length-WIN} style={{width:22,height:22,borderRadius:'50%',border:'1px solid rgba(0,151,167,0.2)',background:'rgba(255,255,255,0.8)',cursor:off>=data.length-WIN?'default':'pointer',fontSize:13,color:off>=data.length-WIN?'#ccc':'#0097a7',display:'flex',alignItems:'center',justifyContent:'center'}}>›</button>
                      </div>
                      <ResponsiveContainer width="100%" height={210}>
                        <ComposedChart data={sl} margin={{top:26,right:8,bottom:18,left:0}} barGap={4} barCategoryGap="30%">
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,60,100,0.1)" vertical={false}/>
                          <XAxis dataKey="label" tick={({x,y,payload})=>{const d=sl.find(s=>s.label===payload.value);return <text x={x} y={y+10} textAnchor="middle" fontSize={9} fill={d?.isCurrent?T.tealD:d?.isFuture?'#90a4ae':T.textM} fontWeight={d?.isCurrent?900:600}>{payload.value}</text>;}} axisLine={false} tickLine={false}/>
                          <YAxis tick={{fill:T.textM,fontSize:9}} axisLine={false} tickLine={false} width={40} tickFormatter={v=>v+'Cr'}/>
                          <Tooltip content={({active,payload,label})=>{if(!active||!payload?.length)return null;const d=sl.find(s=>s.label===label);return(<div style={{background:'rgba(255,255,255,0.97)',border:'1px solid rgba(0,151,167,0.3)',borderRadius:10,padding:'8px 12px',fontSize:10}}><p style={{color:T.tealD,fontWeight:800,margin:'0 0 4px'}}>{label}</p>{d?.achieved!=null&&<p style={{color:T.tealD,margin:0}}>Achieved: ₹{d.achieved}Cr</p>}{d?.target!=null&&<p style={{color:'#607d8b',margin:0}}>Target: ₹{d.target}Cr</p>}</div>);}}/>
                          <Legend wrapperStyle={{fontSize:9,fontWeight:700}} iconSize={8}/>
                          <Bar dataKey="achieved" name="Actual BSP" fill={T.teal} radius={[3,3,0,0]} barSize={18} isAnimationActive={true} animationDuration={800} animationEasing="ease-out">
                            {sl.map((d,i)=><Cell key={i} fill={d.isCurrent?T.tealD:T.teal} fillOpacity={d.isCurrent?1:0.85}/>)}
                            <LabelList dataKey="achieved" position="top" style={{fill:T.tealD,fontSize:7,fontWeight:700}} formatter={v=>v>0?v+'Cr':''}/>
                          </Bar>
                          <Bar dataKey="target" name="Target TSV" fill="#b0bec5" fillOpacity={0.75} radius={[3,3,0,0]} barSize={18} isAnimationActive={true} animationDuration={1000} animationEasing="ease-out">
                            <LabelList dataKey="target" position="top" style={{fill:'#607d8b',fontSize:7,fontWeight:700}} formatter={v=>v>0?v+'Cr':''}/>
                          </Bar>
                          <Line type="monotone" dataKey="achieved" stroke={T.tealD} strokeWidth={2.5} dot={{r:4,fill:T.tealD,stroke:'#fff',strokeWidth:2}} activeDot={{r:5}} legendType="none" connectNulls={true}/>
                          <Line type="monotone" dataKey="target" stroke="#607d8b" strokeWidth={2} strokeDasharray="5 3" dot={{r:3,fill:'#607d8b',stroke:'#fff',strokeWidth:1.5}} activeDot={{r:4}} legendType="none" connectNulls={true}/>
                        </ComposedChart>
                      </ResponsiveContainer>
                    </>);
                  })()}
                </GC>

                {/* ── CHART 3: AVG RATE ────────────────────────────────── */}
                <GC style={{padding:16}}>
                  <SH title="Avg Rate — Achieved vs Target" sub="Actual ₹/sqft (teal) · Target rate (grey)"/>
                  {(()=>{
                    const WIN=10;
                    const data=monthlyWithTargets.map(d=>({
                      label:d.label,isFuture:d.isFuture,isCurrent:d.label===TODAY_LABEL,
                      achieved:d.isFuture?null:(d.actualRate||null),
                      target:d.targetRateLine||null,
                    }));
                    const cur=data.findIndex(d=>d.isCurrent);
                    const def=cur>=2?cur-2:Math.max(0,data.length-WIN);
                    const off=Math.min(Math.max(rOff<0?def:rOff,0),Math.max(0,data.length-WIN));
                    const sl=data.slice(off,off+WIN);
                    return(<>
                      <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:6}}>
                        <button onClick={()=>setROff(Math.max(0,off-1))} disabled={off===0} style={{width:22,height:22,borderRadius:'50%',border:'1px solid rgba(0,151,167,0.2)',background:'rgba(255,255,255,0.8)',cursor:off===0?'default':'pointer',fontSize:13,color:off===0?'#ccc':'#0097a7',display:'flex',alignItems:'center',justifyContent:'center'}}>‹</button>
                        <div style={{flex:1,height:4,background:'rgba(0,151,167,0.1)',borderRadius:2,overflow:'hidden'}}><div style={{width:(WIN/Math.max(data.length,1)*100)+'%',marginLeft:(off/Math.max(data.length,1)*100)+'%',height:'100%',background:'#0097a7',borderRadius:2}}/></div>
                        <button onClick={()=>setROff(Math.min(data.length-WIN,off+1))} disabled={off>=data.length-WIN} style={{width:22,height:22,borderRadius:'50%',border:'1px solid rgba(0,151,167,0.2)',background:'rgba(255,255,255,0.8)',cursor:off>=data.length-WIN?'default':'pointer',fontSize:13,color:off>=data.length-WIN?'#ccc':'#0097a7',display:'flex',alignItems:'center',justifyContent:'center'}}>›</button>
                      </div>
                      <ResponsiveContainer width="100%" height={210}>
                        <ComposedChart data={sl} margin={{top:26,right:8,bottom:18,left:0}} barGap={4} barCategoryGap="30%">
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,60,100,0.1)" vertical={false}/>
                          <XAxis dataKey="label" tick={({x,y,payload})=>{const d=sl.find(s=>s.label===payload.value);return <text x={x} y={y+10} textAnchor="middle" fontSize={9} fill={d?.isCurrent?T.tealD:d?.isFuture?'#90a4ae':T.textM} fontWeight={d?.isCurrent?900:600}>{payload.value}</text>;}} axisLine={false} tickLine={false}/>
                          <YAxis tick={{fill:T.textM,fontSize:9}} axisLine={false} tickLine={false} width={44} tickFormatter={v=>'₹'+Math.round(v/1000)+'K'}/>
                          <Tooltip content={({active,payload,label})=>{if(!active||!payload?.length)return null;const d=sl.find(s=>s.label===label);return(<div style={{background:'rgba(255,255,255,0.97)',border:'1px solid rgba(0,151,167,0.3)',borderRadius:10,padding:'8px 12px',fontSize:10}}><p style={{color:T.tealD,fontWeight:800,margin:'0 0 4px'}}>{label}</p>{d?.achieved!=null&&<p style={{color:T.tealD,margin:0}}>Achieved: ₹{d.achieved?.toLocaleString('en-IN')}/sqft</p>}{d?.target!=null&&<p style={{color:'#607d8b',margin:0}}>Target: ₹{d.target?.toLocaleString('en-IN')}/sqft</p>}</div>);}}/>
                          <Legend wrapperStyle={{fontSize:9,fontWeight:700}} iconSize={8}/>
                          <Bar dataKey="achieved" name="Actual Rate" fill={T.teal} radius={[3,3,0,0]} barSize={18} isAnimationActive={true} animationDuration={800} animationEasing="ease-out">
                            {sl.map((d,i)=><Cell key={i} fill={d.isCurrent?T.tealD:T.teal} fillOpacity={d.isCurrent?1:0.85}/>)}
                            <LabelList dataKey="achieved" position="top" style={{fill:T.tealD,fontSize:7,fontWeight:700}} formatter={v=>v?'₹'+Math.round(v/1000)+'K':''}/>
                          </Bar>
                          <Bar dataKey="target" name="Target Rate" fill="#b0bec5" fillOpacity={0.75} radius={[3,3,0,0]} barSize={18} isAnimationActive={true} animationDuration={1000} animationEasing="ease-out">
                            <LabelList dataKey="target" position="top" style={{fill:'#607d8b',fontSize:7,fontWeight:700}} formatter={v=>v?'₹'+Math.round(v/1000)+'K':''}/>
                          </Bar>
                          <Line type="monotone" dataKey="achieved" stroke={T.tealD} strokeWidth={2.5} dot={{r:4,fill:T.tealD,stroke:'#fff',strokeWidth:2}} activeDot={{r:5}} legendType="none" connectNulls={true}/>
                          <Line type="monotone" dataKey="target" stroke="#607d8b" strokeWidth={2} strokeDasharray="5 3" dot={{r:3,fill:'#607d8b',stroke:'#fff',strokeWidth:1.5}} activeDot={{r:4}} legendType="none" connectNulls={true}/>
                        </ComposedChart>
                      </ResponsiveContainer>
                    </>);
                  })()}
                </GC>

                {/* ── CHART 4: UNITS STACKED BAR (Booked bottom + Available top) ── */}
                <GC style={{padding:16}}>
                  <SH title="Units — Booked + Available Stack" sub="Stacked: Booked (teal, bottom) · Available (amber, top) · Total per month"/>
                  {(()=>{
                    const WIN=10;
                    const totalInv=iF.length||3184;
                    let cum=0;const cumMap={};
                    monthlyWithTargets.forEach(d=>{cum+=(d.bookedUnits||0);cumMap[d.label]=cum;});
                    const data=monthlyWithTargets.map(d=>{
                      const booked=d.isFuture?null:(d.bookedUnits||0);
                      const cumBooked=d.isFuture?null:(cumMap[d.label]||0);
                      const avail=d.isFuture?null:Math.max(0,totalInv-(cumBooked||0));
                      return{
                        label:d.label,
                        isFuture:d.isFuture,
                        isCurrent:d.label===TODAY_LABEL,
                        booked,
                        avail,
                        total:d.isFuture?null:totalInv,
                        cumBooked,
                      };
                    });
                    const cur=data.findIndex(d=>d.isCurrent);
                    const def=cur>=2?cur-2:Math.max(0,data.length-WIN);
                    const off=Math.min(Math.max(suOff<0?def:suOff,0),Math.max(0,data.length-WIN));
                    const sl=data.slice(off,off+WIN);
                    return(<>
                      <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:6}}>
                        <button onClick={()=>setSuOff(Math.max(0,off-1))} disabled={off===0} style={{width:22,height:22,borderRadius:'50%',border:'1px solid rgba(0,151,167,0.2)',background:'rgba(255,255,255,0.8)',cursor:off===0?'default':'pointer',fontSize:13,color:off===0?'#ccc':'#0097a7',display:'flex',alignItems:'center',justifyContent:'center'}}>‹</button>
                        <div style={{flex:1,height:4,background:'rgba(0,151,167,0.1)',borderRadius:2,overflow:'hidden'}}><div style={{width:(WIN/Math.max(data.length,1)*100)+'%',marginLeft:(off/Math.max(data.length,1)*100)+'%',height:'100%',background:'#0097a7',borderRadius:2}}/></div>
                        <button onClick={()=>setSuOff(Math.min(data.length-WIN,off+1))} disabled={off>=data.length-WIN} style={{width:22,height:22,borderRadius:'50%',border:'1px solid rgba(0,151,167,0.2)',background:'rgba(255,255,255,0.8)',cursor:off>=data.length-WIN?'default':'pointer',fontSize:13,color:off>=data.length-WIN?'#ccc':'#0097a7',display:'flex',alignItems:'center',justifyContent:'center'}}>›</button>
                      </div>
                      <ResponsiveContainer width="100%" height={210}>
                        <BarChart data={sl} margin={{top:26,right:16,bottom:18,left:0}} barCategoryGap="30%">
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,60,100,0.1)" vertical={false}/>
                          <XAxis dataKey="label" tick={({x,y,payload})=>{const d=sl.find(s=>s.label===payload.value);return <text x={x} y={y+10} textAnchor="middle" fontSize={9} fill={d?.isCurrent?T.tealD:d?.isFuture?'#90a4ae':T.textM} fontWeight={d?.isCurrent?900:600}>{payload.value}</text>;}} axisLine={false} tickLine={false}/>
                          <YAxis tick={{fill:T.textM,fontSize:9}} axisLine={false} tickLine={false} width={34} tickFormatter={v=>v>=1000?(v/1000).toFixed(1)+'k':v}/>
                          <Tooltip content={({active,payload,label})=>{
                            if(!active||!payload?.length)return null;
                            const d=sl.find(s=>s.label===label);
                            const bookedVal=d?.booked??0;
                            const availVal=d?.avail??0;
                            const totalVal=bookedVal+availVal;
                            const pct=totalVal>0?Math.round(bookedVal/totalVal*100):0;
                            return(
                              <div style={{background:'rgba(255,255,255,0.97)',border:'1px solid rgba(0,151,167,0.3)',borderRadius:10,padding:'8px 12px',fontSize:10}}>
                                <p style={{color:T.tealD,fontWeight:800,margin:'0 0 6px'}}>{label}</p>
                                <p style={{color:T.teal,margin:'0 0 2px',fontWeight:700}}>● Booked: {bookedVal} units ({pct}%)</p>
                                <p style={{color:T.amber,margin:'0 0 2px',fontWeight:700}}>● Available: {availVal} units</p>
                                <p style={{color:'#607d8b',margin:0,borderTop:'1px solid #eee',paddingTop:4}}>Total: {totalVal} units</p>
                              </div>
                            );
                          }}/>
                          <Legend wrapperStyle={{fontSize:9,fontWeight:700}} iconSize={8}/>
                          <Bar dataKey="booked" name="Booked" stackId="stack" fill={T.teal} fillOpacity={0.9} radius={[0,0,3,3]} barSize={22} isAnimationActive={true} animationDuration={800} animationEasing="ease-out">
                            {sl.map((d,i)=><Cell key={i} fill={d.isCurrent?T.tealD:T.teal} fillOpacity={d.isCurrent?1:0.88}/>)}
                            <LabelList dataKey="booked" position="insideBottom" offset={8} style={{fill:'#fff',fontSize:8,fontWeight:800}} formatter={v=>v>0?v:''}/>
                          </Bar>
                          <Bar dataKey="avail" name="Available" stackId="stack" fill={T.amber} fillOpacity={0.55} radius={[3,3,0,0]} barSize={22} isAnimationActive={true} animationDuration={1000} animationEasing="ease-out">
                            <LabelList dataKey="avail" position="top" style={{fill:T.amber,fontSize:8,fontWeight:800}} formatter={v=>v>0?v:''}/>
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </>);
                  })()}
                </GC>

              </div>{/* end 2x2 chart grid */}

              {/* Area: Total Sold vs Available */}
              <GC style={{padding:16}}>
                <SH title="Area — Sold vs Available" sub="sq ft: booked area vs available area by project"/>
                {(()=>{
                  const projData=(areaSummary.byProject||[]).map(d=>({
                    name:d.project?.split(' ').pop()||d.project,
                    sold:Math.round((d.bookedArea||0)/1000),
                    avail:Math.round((d.availableArea||0)/1000),
                  }));
                  return(
                    <ResponsiveContainer width="100%" height={160}>
                      <BarChart data={projData} margin={{top:8,right:8,bottom:4,left:0}}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,60,100,0.1)" vertical={false}/>
                        <XAxis dataKey="name" tick={{fill:T.textM,fontSize:10,fontWeight:600}} axisLine={false} tickLine={false}/>
                        <YAxis tick={{fill:T.textM,fontSize:9}} axisLine={false} tickLine={false} width={36} tickFormatter={v=>v+'K'}/>
                        <Tooltip content={<CTip fmt={v=>v+'K sq ft'}/>}/>
                        <Legend wrapperStyle={{fontSize:9,fontWeight:700,color:T.text}} iconSize={8}/>
                        <Bar dataKey="sold" name="Sold (K sqft)" fill={T.teal} radius={[3,3,0,0]} fillOpacity={0.9}>
                          <LabelList dataKey="sold" position="top" style={{fill:T.tealD,fontSize:8,fontWeight:700}} formatter={v=>v>0?v+'K':''}/>
                        </Bar>
                        <Bar dataKey="avail" name="Available (K sqft)" fill={T.amber} radius={[3,3,0,0]} fillOpacity={0.7}>
                          <LabelList dataKey="avail" position="top" style={{fill:T.amber,fontSize:8,fontWeight:700}} formatter={v=>v>0?v+'K':''}/>
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  );
                })()}
              </GC>

            </div>

            {/* ══ CANCELLED UNIT STATUS — REBOOKED vs VACANT ══ */}
            <GC style={{padding:16}}>
              <SH title="Cancelled Unit Status" sub="Rebooked · Still Vacant · Vacancy Duration"/>
              {(()=>{
                const {summary,buckets,byProject,vacantUnits}=cancelledUnitStatus;
                const activeTab=cancelTab; const setActiveTab=setCancelTab;
                const bucketColors=['#00bcd4','#f59e0b','#ef4444','#7c3aed'];
                return(
                  <div>
                    {/* KPI row */}
                    <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:10,marginBottom:14}}>
                      {[
                        {label:'Total Cancelled',val:summary.totalCancelled,color:T.textM,icon:'🚫'},
                        {label:'Rebooked ✅',val:summary.rebooked,color:T.teal,icon:'🔄'},
                        {label:'Still Vacant',val:summary.stillVacant,color:T.red,icon:'🏚️'},
                        {label:'Rebooking Rate',val:`${summary.rebookedPct}%`,color:T.navy,icon:'📈'},
                      ].map((d,i)=>(
                        <div key={i} style={{background:`${d.color}0d`,border:`1px solid ${d.color}25`,borderRadius:10,padding:'10px 14px'}}>
                          <p style={{fontSize:8,color:T.textM,fontWeight:800,margin:'0 0 4px',textTransform:'uppercase'}}>{d.icon} {d.label}</p>
                          <p style={{fontSize:20,fontWeight:900,color:d.color,margin:0}}>{d.val}</p>
                        </div>
                      ))}
                    </div>

                    {/* Tab switcher */}
                    <div style={{display:'flex',gap:6,marginBottom:12}}>
                      {[['overview','📊 Overview'],['vacant','🏚️ Vacant Units'],['rebooked','✅ Rebooked']].map(([k,l])=>(
                        <button key={k} onClick={()=>setActiveTab(k)} style={{padding:'4px 12px',borderRadius:20,border:'none',cursor:'pointer',fontSize:10,fontWeight:700,background:activeTab===k?T.teal:'rgba(0,100,140,0.08)',color:activeTab===k?'#fff':T.textM,transition:'all 0.15s'}}>
                          {l}
                        </button>
                      ))}
                    </div>

                    {activeTab==='overview'&&(
                      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
                        {/* Vacancy duration buckets */}
                        <div>
                          <p style={{fontSize:9,fontWeight:800,color:T.textM,textTransform:'uppercase',margin:'0 0 8px',letterSpacing:0.4}}>Vacancy Duration (Still Vacant Units)</p>
                          {buckets.map((b,i)=>{
                            const max=Math.max(...buckets.map(x=>x.count),1);
                            return(
                              <div key={i} style={{marginBottom:8}}>
                                <div style={{display:'flex',justifyContent:'space-between',marginBottom:3}}>
                                  <span style={{fontSize:10,fontWeight:700,color:T.text}}>{b.label}</span>
                                  <span style={{fontSize:11,fontWeight:800,color:bucketColors[i]}}>{b.count} units</span>
                                </div>
                                <div style={{width:'100%',height:7,background:'rgba(0,100,140,0.08)',borderRadius:4,overflow:'hidden'}}>
                                  <div style={{width:`${Math.round((b.count/max)*100)}%`,height:'100%',background:bucketColors[i],borderRadius:4,transition:'width 0.4s'}}/>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                        {/* Per-project breakdown */}
                        <div>
                          <p style={{fontSize:9,fontWeight:800,color:T.textM,textTransform:'uppercase',margin:'0 0 8px',letterSpacing:0.4}}>Project-wise Rebooking</p>
                          {byProject.map((d,i)=>{
                            const total=d.rebooked+d.vacant;
                            const pct=total>0?Math.round((d.rebooked/total)*100):0;
                            const col=pct>=70?T.teal:pct>=50?T.amber:T.red;
                            return(
                              <div key={i} style={{marginBottom:9}}>
                                <div style={{display:'flex',justifyContent:'space-between',marginBottom:3}}>
                                  <span style={{fontSize:10,fontWeight:800,color:T.navy}}>{d.project}</span>
                                  <span style={{fontSize:9,color:T.textM}}>
                                    <span style={{color:T.tealD,fontWeight:700}}>✅ {d.rebooked}</span>
                                    <span style={{color:T.textL}}> · </span>
                                    <span style={{color:T.red,fontWeight:700}}>🏚️ {d.vacant}</span>
                                    {d.avgVacantDays>0&&<span style={{color:T.textL}}> · avg {d.avgVacantDays}d</span>}
                                  </span>
                                </div>
                                <div style={{width:'100%',height:6,background:'rgba(0,100,140,0.08)',borderRadius:3,overflow:'hidden',display:'flex'}}>
                                  <div style={{width:`${pct}%`,height:'100%',background:`linear-gradient(90deg,${col},${T.tealL})`}}/>
                                  <div style={{width:`${100-pct}%`,height:'100%',background:`${T.red}40`}}/>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {activeTab==='vacant'&&(
                      <div>
                        {/* Urgency legend */}
                        <div style={{display:'flex',gap:10,marginBottom:10,flexWrap:'wrap'}}>
                          {[['🟢','0–90 days',T.greenL],['🟡','91–180 days',T.amber],['🔴','180+ days',T.red]].map(([ic,lbl,col])=>(
                            <span key={lbl} style={{fontSize:9,fontWeight:700,color:col,background:`${col}12`,border:`1px solid ${col}30`,borderRadius:20,padding:'2px 10px'}}>{ic} {lbl}</span>
                          ))}
                          <span style={{fontSize:9,color:T.textM,marginLeft:'auto',fontWeight:600}}>{vacantUnits.length} units still vacant</span>
                        </div>
                        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(175px,1fr))',gap:8,maxHeight:360,overflowY:'auto'}}>
                          {vacantUnits.map((u,i)=>{
                            const d=u.daysVacant||0;
                            const urgency=d>180?T.red:d>90?T.amber:T.greenL;
                            const urgencyBg=d>180?'#ef444410':d>90?'#f59e0b10':'#22c55e10';
                            const label=d>180?'Critical':d>90?'Ageing':'Recent';
                            return(
                              <div key={i} style={{background:'rgba(255,255,255,0.85)',border:`1.5px solid ${urgency}40`,borderRadius:10,padding:'10px 12px',position:'relative',overflow:'hidden'}}>
                                {/* Top urgency stripe */}
                                <div style={{position:'absolute',top:0,left:0,right:0,height:3,background:urgency}}/>
                                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:4,marginTop:2}}>
                                  <span style={{fontSize:12,fontWeight:900,color:T.navy}}>{u.unit}</span>
                                  <span style={{fontSize:8,background:urgencyBg,color:urgency,border:`1px solid ${urgency}50`,borderRadius:10,padding:'1px 7px',fontWeight:800}}>{label}</span>
                                </div>
                                <p style={{fontSize:9,color:T.textM,margin:'0 0 2px',fontWeight:600}}>{u.projectLabel} · {u.tower}</p>
                                <p style={{fontSize:9,color:T.textL,margin:'0 0 6px'}}>{u.bhk?.split('+')[0]}</p>
                                {/* Vacant duration — prominent */}
                                <div style={{background:urgencyBg,borderRadius:7,padding:'5px 8px',marginBottom:6,display:'flex',alignItems:'center',justifyContent:'space-between'}}>
                                  <span style={{fontSize:9,color:urgency,fontWeight:700}}>🏚️ Vacant for</span>
                                  <span style={{fontSize:16,fontWeight:900,color:urgency,lineHeight:1}}>{d}<span style={{fontSize:9,fontWeight:600}}> days</span></span>
                                </div>
                                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',paddingTop:5,borderTop:'1px solid rgba(0,100,140,0.07)'}}>
                                  <div>
                                    <p style={{fontSize:8,color:T.textL,margin:0}}>Cancelled</p>
                                    <p style={{fontSize:9,fontWeight:700,color:T.textM,margin:0}}>{u.cancelDate}</p>
                                  </div>
                                  <div style={{textAlign:'right'}}>
                                    <p style={{fontSize:8,color:T.textL,margin:0}}>BSP Value</p>
                                    <p style={{fontSize:10,fontWeight:800,color:T.amber,margin:0}}>₹{u.bspCr}Cr</p>
                                  </div>
                                </div>
                                {u.cancelReason&&u.cancelReason!=='Not specified'&&(
                                  <p style={{fontSize:8,color:T.textL,margin:'4px 0 0',borderTop:'1px solid rgba(0,100,140,0.06)',paddingTop:4,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}} title={u.cancelReason}>📋 {u.cancelReason}</p>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {activeTab==='rebooked'&&(
                      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(160px,1fr))',gap:8,maxHeight:280,overflowY:'auto'}}>
                        {cancelledUnitStatus.rebookedUnits.map((u,i)=>(
                          <div key={i} style={{background:`${T.teal}08`,border:`1px solid ${T.teal}25`,borderRadius:8,padding:'8px 10px'}}>
                            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:3}}>
                              <span style={{fontSize:11,fontWeight:800,color:T.navy}}>{u.unit}</span>
                              <span style={{fontSize:8,background:`${T.teal}20`,color:T.tealD,borderRadius:10,padding:'1px 6px',fontWeight:700}}>✅ Rebooked</span>
                            </div>
                            <p style={{fontSize:9,color:T.textM,margin:'0 0 2px',fontWeight:600}}>{u.projectLabel} · {u.tower}</p>
                            <p style={{fontSize:9,color:T.textL,margin:'0 0 4px'}}>{u.bhk?.split(' ')[0]}</p>
                            <p style={{fontSize:8,color:T.textL,margin:0}}>Cancelled: {u.cancelDate}</p>
                            <p style={{fontSize:10,color:T.amber,fontWeight:700,margin:'2px 0 0'}}>₹{u.bspCr}Cr</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })()}
            </GC>

            {/* ── SECTION: Area-wise Segregation ── */}
            <div style={{display:'flex',alignItems:'center',gap:12}}>
              <div style={{background:'linear-gradient(135deg,#166534,#22c55e)',borderRadius:10,padding:'5px 18px',display:'flex',alignItems:'center',gap:8,boxShadow:'0 2px 10px rgba(34,197,94,0.3)'}}>
                <span style={{fontSize:13}}>🗺️</span>
                <span style={{fontSize:11,fontWeight:900,color:'#fff',textTransform:'uppercase',letterSpacing:1}}>Area-wise Segregation</span>
              </div>
              <div style={{flex:1,height:1,background:'rgba(34,197,94,0.15)',borderRadius:1}}/>
            </div>

            {/* ══ TOWER-WISE BOOKED & CANCELLED ══ */}
            <GC style={{padding:16}}>
              <SH title="Tower-wise Booking Status" sub="Booked · Cancelled · Booked Area (sq ft) · Avg Price/sq ft"/>
              <div style={{overflowX:'auto'}}>
                <table style={{width:'100%',borderCollapse:'collapse',fontSize:11}}>
                  <thead>
                    <tr style={{borderBottom:`2px solid rgba(0,151,167,0.18)`}}>
                      {['Project','Tower','Booked','Cancelled','Success %','Booked Area (sq ft)','Cancelled Area (sq ft)','Total Sales','Avg ₹/sq ft'].map(h=>(
                        <th key={h} style={{padding:'6px 10px',textAlign:'left',color:T.textM,fontSize:9,fontWeight:800,letterSpacing:0.5,textTransform:'uppercase',whiteSpace:'nowrap'}}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {(towerExpanded?towerData:towerData.slice(0,10)).map((d,i)=>{
                      const total=d.booked+d.cancelled;
                      const successPct=total>0?Math.round((d.booked/total)*100):0;
                      const col=successPct>=90?T.teal:successPct>=75?T.greenL:successPct>=60?T.amber:T.red;
                      return(
                        <tr key={i} className="tr" style={{borderBottom:`1px solid rgba(0,100,140,0.08)`}}>
                          <td style={{padding:'7px 10px',color:T.textM,fontSize:10,fontWeight:600,whiteSpace:'nowrap'}}>{d.project?.split(' ').slice(-2).join(' ')}</td>
                          <td style={{padding:'7px 10px',fontWeight:700,color:T.navy,whiteSpace:'nowrap'}}>{d.tower}</td>
                          <td style={{padding:'7px 10px'}}>
                            <span style={{display:'inline-flex',alignItems:'center',gap:5}}>
                              <span style={{width:8,height:8,borderRadius:2,background:T.teal,display:'inline-block'}}/>
                              <span style={{fontWeight:700,color:T.tealD}}>{d.booked}</span>
                            </span>
                          </td>
                          <td style={{padding:'7px 10px'}}>
                            <span style={{display:'inline-flex',alignItems:'center',gap:5}}>
                              <span style={{width:8,height:8,borderRadius:2,background:T.red,display:'inline-block'}}/>
                              <span style={{fontWeight:700,color:T.red}}>{d.cancelled}</span>
                            </span>
                          </td>
                          <td style={{padding:'7px 10px'}}>
                            <div style={{display:'flex',alignItems:'center',gap:6}}>
                              <div style={{width:44,height:5,background:'rgba(0,100,140,0.1)',borderRadius:3}}>
                                <div style={{width:`${successPct}%`,height:'100%',background:col,borderRadius:3}}/>
                              </div>
                              <span style={{color:col,fontWeight:800,fontSize:10}}>{successPct}%</span>
                            </div>
                          </td>
                          <td style={{padding:'7px 10px',color:T.textM,fontWeight:600,whiteSpace:'nowrap'}}>{d.bookedArea?.toLocaleString('en-IN')} sq ft</td>
                          <td style={{padding:'7px 10px',color:T.textL,fontWeight:600,whiteSpace:'nowrap'}}>{d.cancelledArea?.toLocaleString('en-IN')} sq ft</td>
                          <td style={{padding:'7px 10px',color:T.amber,fontWeight:700,whiteSpace:'nowrap'}}>₹{d.totalBSPCr} Cr</td>
                          <td style={{padding:'7px 10px'}}>
                            <span style={{background:`${T.teal}12`,border:`1px solid ${T.teal}30`,borderRadius:6,padding:'2px 8px',color:T.tealD,fontWeight:700,fontSize:10,whiteSpace:'nowrap'}}>
                              ₹{d.pricePerSqft?.toLocaleString('en-IN')}/sq ft
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {towerData.length>10&&(
                <button onClick={()=>setTowerExpanded(e=>!e)} style={{display:'flex',alignItems:'center',gap:6,margin:'10px auto 0',padding:'6px 20px',background:'rgba(0,151,167,0.06)',border:'1px solid rgba(0,151,167,0.2)',borderRadius:20,cursor:'pointer',fontSize:10,fontWeight:700,color:T.tealD,transition:'all 0.15s'}}>
                  {towerExpanded?`▲ Show less`:`▼ Show ${towerData.length-10} more towers`}
                </button>
              )}
            </GC>

            {/* ══ AREA SUMMARY CARDS ══ */}
            <div>
              <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:10}}>
                <div style={{background:'linear-gradient(135deg,#006978,#00bcd4)',borderRadius:10,padding:'5px 18px',display:'flex',alignItems:'center',gap:8,boxShadow:'0 2px 10px rgba(0,151,167,0.25)'}}>
                  <span style={{fontSize:13}}>📐</span>
                  <span style={{fontSize:11,fontWeight:900,color:'#fff',textTransform:'uppercase',letterSpacing:1}}>Area & Pricing Overview</span>
                </div>
                <div style={{flex:1,height:1,background:'rgba(0,151,167,0.15)',borderRadius:1}}/>
              </div>
              {/* Top 3 KPI cards */}
              <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:12,marginBottom:12}}>
                {[
                  {label:'Total Booked Area',value:`${(areaSummary.bookedArea/1e6)?.toFixed(2)}M`,sub:'sq ft',icon:'🏢',color:T.teal},
                  {label:'Available Area',value:`${(areaSummary.availableArea/1e6)?.toFixed(2)}M`,sub:'sq ft',icon:'🔓',color:T.amber},
                  {label:'Avg Price / sq ft',value:`₹${areaSummary.avgPricePerSqft?.toLocaleString('en-IN')}`,sub:`Range ₹${areaSummary.minPricePerSqft?.toLocaleString('en-IN')} – ₹${areaSummary.maxPricePerSqft?.toLocaleString('en-IN')}`,icon:'💰',color:T.navy},
                ].map((d,i)=>(
                  <GC key={i} cls="kc" style={{padding:16,display:'flex',alignItems:'center',gap:14}}>
                    <div style={{width:44,height:44,borderRadius:12,background:`${d.color}14`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:22,flexShrink:0}}>{d.icon}</div>
                    <div>
                      <p style={{fontSize:9,fontWeight:800,color:T.textM,textTransform:'uppercase',letterSpacing:0.5,margin:'0 0 3px'}}>{d.label}</p>
                      <p style={{fontSize:22,fontWeight:900,color:d.color,margin:'0 0 2px',letterSpacing:-0.5}}>{d.value} <span style={{fontSize:11,fontWeight:600,color:T.textL}}>{d.sub.split(' ')[0]}</span></p>
                      {d.sub.includes('Range')&&<p style={{fontSize:9,color:T.textM,margin:0,fontWeight:600}}>{d.sub}</p>}
                    </div>
                    <div style={{position:'absolute',bottom:0,left:0,right:0,height:3,background:`linear-gradient(90deg,${d.color},transparent)`,borderRadius:'0 0 14px 14px'}}/>
                  </GC>
                ))}
              </div>
              {/* Per-project area breakdown cards */}
              <div style={{display:'grid',gridTemplateColumns:areaSummary.byProject?.length===1?'1fr':'repeat(auto-fit,minmax(220px,1fr))',gap:10}}>
                {(areaSummary.byProject||[]).map((d,i)=>{
                  const total=d.bookedArea+d.availableArea;
                  const pct=total>0?Math.round((d.bookedArea/total)*100):0;
                  const col=pct>=80?T.teal:pct>=60?T.greenL:pct>=40?T.amber:T.red;
                  const SHORT={'SMARTWORLD THE EDITION':'The Edition','Smartworld Sky Arc':'Sky Arc','Trump Residences Gurgaon':'Trump','Smartworld Le Courtyard':'Le Courtyard','Smartworld Suites':'Suites','Smartworld Residencies':'Residencies'};
                  return(
                    <GC key={i} style={{padding:areaSummary.byProject?.length===1?20:14}}>
                      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:10}}>
                        <span style={{fontSize:areaSummary.byProject?.length===1?15:11,fontWeight:800,color:T.navy}}>{SHORT[d.project]||d.project}</span>
                        <span style={{fontSize:areaSummary.byProject?.length===1?20:13,fontWeight:900,color:col}}>{pct}% sold</span>
                      </div>
                      <div style={{width:'100%',height:areaSummary.byProject?.length===1?10:6,background:'rgba(0,100,140,0.1)',borderRadius:4,marginBottom:12,overflow:'hidden'}}>
                        <div style={{width:`${pct}%`,height:'100%',background:`linear-gradient(90deg,${col},${T.tealL})`,borderRadius:4}}/>
                      </div>
                      <div style={{display:'grid',gridTemplateColumns:areaSummary.byProject?.length===1?'1fr 1fr 1fr':'1fr 1fr',gap:areaSummary.byProject?.length===1?12:6,marginBottom:areaSummary.byProject?.length===1?14:8}}>
                        <div style={{background:`${T.teal}0d`,borderRadius:8,padding:areaSummary.byProject?.length===1?'12px 16px':'6px 8px'}}>
                          <p style={{fontSize:8,color:T.textM,fontWeight:800,margin:'0 0 4px',textTransform:'uppercase'}}>🟢 Booked</p>
                          <p style={{fontSize:areaSummary.byProject?.length===1?18:11,fontWeight:800,color:T.tealD,margin:'0 0 2px'}}>{(d.bookedArea/1000).toFixed(0)}K <span style={{fontSize:9,fontWeight:600}}>sq ft</span></p>
                          <p style={{fontSize:10,color:T.textM,margin:0,fontWeight:600}}>{d.bookedUnits} units</p>
                        </div>
                        <div style={{background:`${T.amber}0d`,borderRadius:8,padding:areaSummary.byProject?.length===1?'12px 16px':'6px 8px'}}>
                          <p style={{fontSize:8,color:T.textM,fontWeight:800,margin:'0 0 4px',textTransform:'uppercase'}}>🔓 Available</p>
                          <p style={{fontSize:areaSummary.byProject?.length===1?18:11,fontWeight:800,color:T.amber,margin:'0 0 2px'}}>{(d.availableArea/1000).toFixed(0)}K <span style={{fontSize:9,fontWeight:600}}>sq ft</span></p>
                          <p style={{fontSize:10,color:T.textM,margin:0,fontWeight:600}}>{d.availUnits} units</p>
                        </div>
                        {areaSummary.byProject?.length===1&&d.avgPricePerSqft>0&&(
                          <div style={{background:`${T.navy}08`,borderRadius:8,padding:'12px 16px'}}>
                            <p style={{fontSize:8,color:T.textM,fontWeight:800,margin:'0 0 4px',textTransform:'uppercase'}}>💰 Avg Rate</p>
                            <p style={{fontSize:18,fontWeight:800,color:T.navy,margin:'0 0 2px'}}>₹{d.avgPricePerSqft?.toLocaleString('en-IN')}</p>
                            <p style={{fontSize:10,color:T.textM,margin:0,fontWeight:600}}>per sq ft</p>
                          </div>
                        )}
                      </div>
                      {areaSummary.byProject?.length!==1&&d.avgPricePerSqft>0&&(
                        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',paddingTop:6,borderTop:'1px solid rgba(0,100,140,0.08)'}}>
                          <span style={{fontSize:9,color:T.textM,fontWeight:700}}>Avg Rate</span>
                          <span style={{fontSize:11,fontWeight:800,color:T.navy}}>₹{d.avgPricePerSqft?.toLocaleString('en-IN')}<span style={{fontSize:8,fontWeight:600,color:T.textL}}>/sq ft</span></span>
                        </div>
                      )}
                    </GC>
                  );
                })}
              </div>
            </div>

          </div>
        )}

        {/* ══════════════════════════════════════════════════════
            TAB: COLLECTIONS & DAPP
        ══════════════════════════════════════════════════════ */}
        {tab==='collections'&&(
          <div style={{display:'flex',flexDirection:'column',gap:14}}>

            {/* KPI strip */}
            <div style={{display:'grid',gridTemplateColumns:'repeat(5,1fr)',gap:12}}>
              {[
                {l:'DAPP Demand',v:fmtCr(kpi.dappDemand),c:T.amber},
                {l:'DAPP Received',v:fmtCr(kpi.dappReceived),c:T.teal},
                {l:'Outstanding',v:fmtCr(kpi.dappOutstanding),c:T.red},
                {l:'Collection Rate',v:`${tgtAch}%`,c:tgtAch>80?T.teal:tgtAch>50?T.amber:T.red},
                {l:'Total Sales (PDRN)',v:fmtCr(kpi.totalSales),c:T.navy},
              ].map((d,i)=>(
                <GC key={i} style={{padding:14}} cls="kc">
                  <p style={{color:T.textM,fontSize:9,fontWeight:800,textTransform:'uppercase',letterSpacing:0.5,margin:'0 0 4px'}}>{d.l}</p>
                  <p style={{fontSize:20,fontWeight:900,color:d.c,margin:0,letterSpacing:-0.5}}>{d.v}</p>
                  <div style={{position:'absolute',bottom:0,left:0,right:0,height:3,background:`linear-gradient(90deg,${d.c},transparent)`,borderRadius:'0 0 14px 14px'}}/>
                </GC>
              ))}
            </div>

            {/* Charts row */}
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
              <GC style={{padding:16}}>
                <SH title="DAPP Monthly — Demand vs. Collection" sub="₹ Crores"/>
                <ResponsiveContainer width="100%" height={230}>
                  <BarChart data={dappLast12} margin={{top:5,right:8,bottom:18,left:0}}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,60,100,0.2)" vertical={false}/>
                    <XAxis dataKey="label" tick={{fill:T.textM,fontSize:9,fontWeight:600}} axisLine={false} tickLine={false} angle={-25} dy={6} interval="preserveStartEnd"/>
                    <YAxis tick={{fill:T.textM,fontSize:9,fontWeight:600}} axisLine={false} tickLine={false} tickFormatter={v=>`${v}Cr`} width={30}/>
                    <Tooltip content={<CTip fmt={v=>`₹${v} Cr`}/>}/>
                    <Legend wrapperStyle={{color:T.text,fontSize:10,fontWeight:700}} iconSize={8}/>
                    <Bar dataKey="demCr"  name="Demand"      fill={T.amber}  radius={[3,3,0,0]} fillOpacity={0.85}>
                      <LabelList dataKey="demCr"  position="top" style={{fill:T.amber,fontSize:7,fontWeight:700}} formatter={v=>v>0?`${v}`:''} />
                    </Bar>
                    <Bar dataKey="recCr"  name="Received"    fill={T.teal}   radius={[3,3,0,0]} fillOpacity={0.85}>
                      <LabelList dataKey="recCr"  position="top" style={{fill:T.tealD,fontSize:7,fontWeight:700}} formatter={v=>v>0?`${v}`:''} />
                    </Bar>
                    <Bar dataKey="outCr"  name="Outstanding" fill={T.red}    radius={[3,3,0,0]} fillOpacity={0.75}>
                      <LabelList dataKey="outCr"  position="top" style={{fill:T.red,fontSize:7,fontWeight:700}} formatter={v=>v>0?`${v}`:''} />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </GC>

              <GC style={{padding:16}}>
                <SH title="DAPP Collection by Project" sub="₹ Crores"/>
                <ResponsiveContainer width="100%" height={230}>
                  <BarChart data={dappByP} margin={{top:5,right:8,bottom:0,left:0}}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,60,100,0.2)" vertical={false}/>
                    <XAxis dataKey="name" tick={{fill:T.textM,fontSize:10,fontWeight:600}} axisLine={false} tickLine={false} tickFormatter={v=>v?.split(' ').pop()}/>
                    <YAxis tick={{fill:T.textM,fontSize:9,fontWeight:600}} axisLine={false} tickLine={false} tickFormatter={v=>`${v}Cr`} width={30}/>
                    <Tooltip content={<CTip fmt={v=>`₹${v} Cr`}/>}/>
                    <Legend wrapperStyle={{color:T.text,fontSize:10,fontWeight:700}} iconSize={8}/>
                    <Bar dataKey="demCr"  name="Demand"      fill={T.amber} radius={[3,3,0,0]} fillOpacity={0.85}>
                      <LabelList dataKey="demCr"  position="top" style={{fill:T.amber,fontSize:7,fontWeight:700}} formatter={v=>v>0?`${v}`:''} />
                    </Bar>
                    <Bar dataKey="recCr"  name="Received"    fill={T.teal}  radius={[3,3,0,0]} fillOpacity={0.85}>
                      <LabelList dataKey="recCr"  position="top" style={{fill:T.tealD,fontSize:7,fontWeight:700}} formatter={v=>v>0?`${v}`:''} />
                    </Bar>
                    <Bar dataKey="outCr"  name="Outstanding" fill={T.red}   radius={[3,3,0,0]} fillOpacity={0.75}>
                      <LabelList dataKey="outCr"  position="top" style={{fill:T.red,fontSize:7,fontWeight:700}} formatter={v=>v>0?`${v}`:''} />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </GC>
            </div>

            {/* Outstanding collection progress per project */}
            <GC style={{padding:16}}>
              <SH title="Collection Progress by Project" sub="Total Demand · Received · Outstanding"/>
              <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(240px,1fr))',gap:12}}>
                {dappByP.map((d,i)=>{
                  const p=d.demCr>0?Math.min(Math.round((d.recCr/d.demCr)*100),100):0;
                  const col=p>=100?T.teal:p>80?T.tealD:p>50?T.amber:T.red;
                  return(
                    <div key={i} style={{padding:'14px 16px',background:'rgba(255,255,255,0.93)',borderRadius:12,border:'1px solid rgba(255,255,255,0.85)',boxShadow:'0 2px 12px rgba(0,80,120,0.08)'}}>
                      <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:6}}>
                        <span style={{fontSize:12,fontWeight:800,color:T.navy,maxWidth:'70%',lineHeight:1.3}}>{d.name}</span>
                        <span style={{fontSize:13,fontWeight:900,color:col,letterSpacing:-0.5}}>{p}%</span>
                      </div>
                      <div style={{marginBottom:8}}>
                        <div style={{display:'flex',justifyContent:'space-between',marginBottom:3}}>
                          <span style={{fontSize:9,color:T.textL,fontWeight:600}}>TOTAL DEMAND</span>
                          <span style={{fontSize:11,fontWeight:800,color:T.navy}}>₹{d.demCr}Cr</span>
                        </div>
                        <div style={{width:'100%',height:7,background:'rgba(0,100,140,0.1)',borderRadius:4}}>
                          <div style={{width:`${Math.min(p,100)}%`,height:'100%',background:`linear-gradient(90deg,${col},${p>=100?T.greenL:p>80?T.tealL:p>50?T.amberL:T.redL})`,borderRadius:4,transition:'width 0.5s ease'}}/>
                        </div>
                      </div>
                      <div style={{display:'flex',justifyContent:'space-between',paddingTop:6,borderTop:'1px solid rgba(0,100,140,0.08)'}}>
                        <div>
                          <p style={{fontSize:9,color:T.textM,margin:'0 0 1px',fontWeight:800}}>RECEIVED</p>
                          <p style={{fontSize:11,color:T.tealD,fontWeight:700,margin:0}}>₹{d.recCr}Cr</p>
                        </div>
                        <div style={{textAlign:'right'}}>
                          <p style={{fontSize:9,color:T.textM,margin:'0 0 1px',fontWeight:800}}>OUTSTANDING</p>
                          <p style={{fontSize:11,color:d.outCr>0?T.red:T.greenL,fontWeight:700,margin:0}}>₹{d.outCr}Cr</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </GC>

            {/* ── UPCOMING DEMANDS ── */}
            <GC style={{padding:18}}>
              <SH title="Upcoming Demands" sub="Future due dates from DAPP · by Milestone"/>
              {(()=>{
                const ud = raw?.upcomingDemands || {};
                const detail = ud.detail || [];
                const buckets = ud.bucketSummary || [];
                const BUCKET_COLORS = {'0–30 Days':T.red,'31–60 Days':T.orange,'61–90 Days':T.amber,'91–180 Days':T.teal,'181–365 Days':T.navy,'1+ Year':T.gray};
                // filter by current project/company filters
                const filtered = detail.filter(r=>{
                  if(filters.company && r.company!==filters.company) return false;
                  if(filters.project){const _p=filters.project.split('||').filter(Boolean);if(_p.length&&!_p.includes(r.project))return false;}
                  return true;
                });
                if(filtered.length===0) return (
                  <div style={{textAlign:'center',padding:'24px 0',color:T.textM}}>
                    <p style={{fontSize:32,margin:'0 0 8px'}}>✅</p>
                    <p style={{fontWeight:700,fontSize:14}}>No upcoming demands in selected period</p>
                    <p style={{fontSize:11,color:T.textL}}>All future demands are beyond current horizon</p>
                  </div>
                );
                return (
                  <div>
                    {/* Bucket KPI chips */}
                    <div style={{display:'flex',gap:10,flexWrap:'wrap',marginBottom:16}}>
                      {buckets.map((b,i)=>(
                        <div key={i} style={{padding:'8px 14px',borderRadius:10,background:`${BUCKET_COLORS[b.bucket]||T.teal}15`,border:`1.5px solid ${BUCKET_COLORS[b.bucket]||T.teal}44`}}>
                          <p style={{fontSize:9,fontWeight:800,color:BUCKET_COLORS[b.bucket]||T.teal,margin:'0 0 2px',textTransform:'uppercase',letterSpacing:0.5}}>{b.bucket}</p>
                          <p style={{fontSize:15,fontWeight:900,color:T.navy,margin:'0 0 1px',letterSpacing:-0.5}}>{b.rows} <span style={{fontSize:10,fontWeight:600,color:T.textM}}>demands</span></p>
                          <p style={{fontSize:11,fontWeight:700,color:BUCKET_COLORS[b.bucket]||T.teal,margin:0}}>₹{b.demandCr}Cr</p>
                        </div>
                      ))}
                    </div>
                    {/* Detail table */}
                    <div style={{overflowX:'auto'}}>
                      <table style={{width:'100%',borderCollapse:'collapse',fontSize:11}}>
                        <thead><tr style={{borderBottom:`2px solid rgba(0,151,167,0.2)`}}>
                          {['Due Date','Days Away','Project','Unit','Customer','Milestone','Demand','Outstanding','Status'].map(h=>(
                            <th key={h} style={{padding:'7px 10px',textAlign:'left',color:T.textM,fontSize:9,fontWeight:800,letterSpacing:0.5,whiteSpace:'nowrap',textTransform:'uppercase'}}>{h}</th>
                          ))}
                        </tr></thead>
                        <tbody>{filtered.map((r,i)=>{
                          const col = BUCKET_COLORS[r.Bucket]||T.teal;
                          return(
                            <tr key={i} className="tr" style={{borderBottom:`1px solid rgba(0,100,140,0.1)`}}>
                              <td style={{padding:'8px 10px',color:T.navy,fontWeight:700,whiteSpace:'nowrap'}}>{r.dueDate}</td>
                              <td style={{padding:'8px 10px'}}>
                                <span style={{background:`${col}18`,border:`1px solid ${col}33`,borderRadius:8,padding:'2px 8px',fontSize:10,fontWeight:800,color:col,whiteSpace:'nowrap'}}>{r.daysAway}d</span>
                              </td>
                              <td style={{padding:'8px 10px',color:T.textM,fontSize:10,whiteSpace:'nowrap'}}>{r.project?.split(' ').pop()}</td>
                              <td style={{padding:'8px 10px',color:T.tealD,fontFamily:'monospace',fontSize:10,fontWeight:700}}>{r.unit}</td>
                              <td style={{padding:'8px 10px',color:T.text,fontWeight:600,maxWidth:160}}>{r.customer}</td>
                              <td style={{padding:'8px 10px',color:T.textM,fontSize:10,maxWidth:200}}>{r.milestone}</td>
                              <td style={{padding:'8px 10px',color:T.navy,fontWeight:700,whiteSpace:'nowrap'}}>₹{((r.demand||0)/1e7).toFixed(2)}Cr</td>
                              <td style={{padding:'8px 10px',color:(r.outstanding||0)>0?T.red:T.teal,fontWeight:700,whiteSpace:'nowrap'}}>₹{((r.outstanding||0)/1e7).toFixed(2)}Cr</td>
                              <td style={{padding:'8px 10px'}}>
                                <span style={{background:`${(r.outstanding||0)>0?T.red:T.teal}18`,border:`1px solid ${(r.outstanding||0)>0?T.red:T.teal}33`,borderRadius:8,padding:'2px 8px',fontSize:9,fontWeight:700,color:(r.outstanding||0)>0?T.red:T.teal}}>
                                  {(r.outstanding||0)>0?'Pending':'Cleared'}
                                </span>
                              </td>
                            </tr>
                          );
                        })}</tbody>
                      </table>
                    </div>
                  </div>
                );
              })()}
            </GC>

            {/* ── ADVANCE PAYMENTS ── */}
            <GC style={{padding:18}}>
              <SH title="Advance Money Received" sub="Units where collections exceed demand raised"/>
              {(()=>{
                const ap = raw?.advancePayments || {};
                const byProj = ap.byProject || [];
                const top = ap.topAdvance || [];
                const filtered = top.filter(r=>{
                  if(filters.company && r.company!==filters.company) return false;
                  if(filters.project){const _p=filters.project.split('||').filter(Boolean);if(_p.length&&!_p.includes(r.project))return false;}
                  return true;
                });
                return(
                  <div>
                    {/* Summary strip */}
                    <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:12,marginBottom:16}}>
                      <div style={{padding:'10px 14px',borderRadius:10,background:`${T.teal}12`,border:`1.5px solid ${T.teal}33`}}>
                        <p style={{fontSize:9,fontWeight:800,color:T.teal,margin:'0 0 2px',textTransform:'uppercase'}}>Total Demand</p>
                        <p style={{fontSize:18,fontWeight:900,color:T.navy,margin:0,letterSpacing:-0.5}}>₹{ap.totalDemandCr}Cr</p>
                      </div>
                      <div style={{padding:'10px 14px',borderRadius:10,background:`${T.teal}12`,border:`1.5px solid ${T.teal}33`}}>
                        <p style={{fontSize:9,fontWeight:800,color:T.teal,margin:'0 0 2px',textTransform:'uppercase'}}>Total Received</p>
                        <p style={{fontSize:18,fontWeight:900,color:T.teal,margin:0,letterSpacing:-0.5}}>₹{ap.totalReceivedCr}Cr</p>
                      </div>
                      <div style={{padding:'10px 14px',borderRadius:10,background:`${T.greenL}12`,border:`1.5px solid ${T.greenL}33`}}>
                        <p style={{fontSize:9,fontWeight:800,color:T.greenL,margin:'0 0 2px',textTransform:'uppercase'}}>Net Advance (Excess)</p>
                        <p style={{fontSize:18,fontWeight:900,color:T.greenL,margin:0,letterSpacing:-0.5}}>+₹{ap.netExcessCr}Cr</p>
                      </div>
                      <div style={{padding:'10px 14px',borderRadius:10,background:`${T.navy}12`,border:`1.5px solid ${T.navy}33`}}>
                        <p style={{fontSize:9,fontWeight:800,color:T.navy,margin:'0 0 2px',textTransform:'uppercase'}}>Units with Advance</p>
                        <p style={{fontSize:18,fontWeight:900,color:T.navy,margin:0,letterSpacing:-0.5}}>{ap.unitsWithAdvance}</p>
                      </div>
                    </div>
                    {/* By project bars */}
                    <div style={{display:'flex',gap:10,marginBottom:14,flexWrap:'wrap'}}>
                      {byProj.filter(p=>p.excessCr>0).map((p,i)=>{
                        const pct = p.totalDemandCr>0?Math.round((p.totalReceivedCr/p.totalDemandCr)*100):0;
                        return(
                          <div key={i} style={{flex:1,minWidth:160,padding:'10px 14px',borderRadius:10,background:'rgba(255,255,255,0.5)',border:'1px solid rgba(0,100,140,0.15)'}}>
                            <div style={{display:'flex',justifyContent:'space-between',marginBottom:4}}>
                              <span style={{fontSize:10,fontWeight:700,color:T.navy}}>{p.project?.split(' ').pop()}</span>
                              <span style={{fontSize:11,fontWeight:900,color:T.greenL}}>+₹{p.excessCr}Cr</span>
                            </div>
                            <div style={{width:'100%',height:5,background:'rgba(0,100,140,0.1)',borderRadius:3,marginBottom:4}}>
                              <div style={{width:`${Math.min(pct,100)}%`,height:'100%',background:`linear-gradient(90deg,${T.teal},${T.greenL})`,borderRadius:3}}/>
                            </div>
                            <div style={{display:'flex',justifyContent:'space-between'}}>
                              <span style={{fontSize:9,color:T.textM,fontWeight:600}}>Rcvd: ₹{p.totalReceivedCr}Cr</span>
                              <span style={{fontSize:9,color:T.tealD,fontWeight:700}}>{pct}% collected</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    {/* Top advance units table */}
                    <div style={{overflowX:'auto'}}>
                      <table style={{width:'100%',borderCollapse:'collapse',fontSize:11}}>
                        <thead><tr style={{borderBottom:`2px solid rgba(0,151,167,0.2)`}}>
                          {['#','Project','Unit','Customer','Total Demand','Total Received','Excess Advance'].map(h=>(
                            <th key={h} style={{padding:'7px 10px',textAlign:'left',color:T.textM,fontSize:9,fontWeight:800,letterSpacing:0.5,whiteSpace:'nowrap',textTransform:'uppercase'}}>{h}</th>
                          ))}
                        </tr></thead>
                        <tbody>{filtered.slice(0,20).map((r,i)=>(
                          <tr key={i} className="tr" style={{borderBottom:`1px solid rgba(0,100,140,0.1)`}}>
                            <td style={{padding:'7px 10px',color:T.textM,fontWeight:700,fontSize:11}}>#{i+1}</td>
                            <td style={{padding:'7px 10px',color:T.textM,fontSize:10,whiteSpace:'nowrap'}}>{r.project?.split(' ').pop()}</td>
                            <td style={{padding:'7px 10px',color:T.tealD,fontFamily:'monospace',fontSize:10,fontWeight:700}}>{r.unit}</td>
                            <td style={{padding:'7px 10px',color:T.text,fontWeight:600,maxWidth:180}}>{r.customer}</td>
                            <td style={{padding:'7px 10px',color:T.navy,fontWeight:700,whiteSpace:'nowrap'}}>₹{((r.totalDemand||0)/1e7).toFixed(2)}Cr</td>
                            <td style={{padding:'7px 10px',color:T.teal,fontWeight:700,whiteSpace:'nowrap'}}>₹{((r.totalReceived||0)/1e7).toFixed(2)}Cr</td>
                            <td style={{padding:'7px 10px'}}>
                              <span style={{background:`${T.greenL}18`,border:`1px solid ${T.greenL}44`,borderRadius:8,padding:'3px 10px',fontSize:11,fontWeight:800,color:T.greenL,whiteSpace:'nowrap'}}>
                                +₹{((r.Excess||0)/1e7).toFixed(2)}Cr
                              </span>
                            </td>
                          </tr>
                        ))}</tbody>
                      </table>
                    </div>
                  </div>
                );
              })()}
            </GC>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════
            TAB: PIPELINE & DEALS
        ══════════════════════════════════════════════════════ */}
        {tab==='pipeline'&&(
          <div style={{display:'flex',flexDirection:'column',gap:14}}>

            {/* Top 10 Deals — dark card */}
            <GC dark style={{padding:18}}>
              <SH title="Top 10 Deals" sub="Ranked by Total Contract Value" light/>
              <div style={{overflowX:'auto'}}>
                <table style={{width:'100%',borderCollapse:'collapse',fontSize:11}}>
                  <thead><tr style={{borderBottom:'1px solid rgba(255,255,255,0.12)'}}>
                    {['#','Customer','Project','Unit','BHK','TCV','Received','CP / Broker','Date'].map(h=>(
                      <th key={h} style={{padding:'6px 10px',textAlign:'left',color:'rgba(255,255,255,0.45)',fontSize:9,fontWeight:700,letterSpacing:0.8,whiteSpace:'nowrap',textTransform:'uppercase'}}>{h}</th>
                    ))}
                  </tr></thead>
                  <tbody>{top10.map((d,i)=>(
                    <tr key={i} className="tr" style={{borderBottom:'1px solid rgba(255,255,255,0.06)'}}>
                      <td style={{padding:'8px 10px',color:'#00bcd4',fontWeight:700,fontSize:11}}>{i===0?'🥇':i===1?'🥈':i===2?'🥉':`#${i+1}`}</td>
                      <td style={{padding:'8px 10px',color:'rgba(255,255,255,0.9)',fontWeight:600,maxWidth:160}}>{d.customer}</td>
                      <td style={{padding:'8px 10px',color:'rgba(255,255,255,0.5)',fontSize:10,whiteSpace:'nowrap'}}>{d.project}</td>
                      <td style={{padding:'8px 10px',color:'#00bcd4',fontFamily:'monospace',fontSize:10}}>{d.unit}</td>
                      <td style={{padding:'8px 10px'}}><span style={{background:'rgba(255,255,255,0.08)',borderRadius:4,padding:'1px 6px',color:'rgba(255,255,255,0.5)',fontSize:9}}>{d.bhk}</span></td>
                      <td style={{padding:'8px 10px',color:T.amberL,fontWeight:700,whiteSpace:'nowrap'}}>{fmtCr(d.tcv)}</td>
                      <td style={{padding:'8px 10px',color:'#00e5ff',whiteSpace:'nowrap'}}>{fmtCr(d.received)}</td>
                      <td style={{padding:'8px 10px',color:'rgba(255,255,255,0.4)',fontSize:10,maxWidth:150}}>{d.brokerName||'—'}</td>
                      <td style={{padding:'8px 10px',color:'rgba(255,255,255,0.3)',fontSize:10,whiteSpace:'nowrap'}}>{d.bookingDate}</td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>
            </GC>

            {/* Open Bookings */}
            <GC style={{padding:18}}>
              <SH title="Open Bookings / Opportunities" sub="Active · Highest Deal Value"/>
              <div style={{overflowX:'auto'}}>
                <table style={{width:'100%',borderCollapse:'collapse',fontSize:11}}>
                  <thead><tr style={{borderBottom:`2px solid rgba(0,151,167,0.2)`}}>
                    {['Customer','Project','Unit','BHK','BSP','Demand','Received','Balance','Funding','Broker','Date'].map(h=>(
                      <th key={h} style={{padding:'6px 10px',textAlign:'left',color:T.textM,fontSize:10,fontWeight:800,letterSpacing:0.5,whiteSpace:'nowrap',textTransform:'uppercase'}}>{h}</th>
                    ))}
                  </tr></thead>
                  <tbody>{openBkg.map((b,i)=>{
                    const bal=(b.demand||0)-(b.received||0);
                    const p=b.demand>0?Math.round((b.received/b.demand)*100):0;
                    return(
                      <tr key={i} className="tr" style={{borderBottom:`1px solid rgba(0,100,140,0.1)`}}>
                        <td style={{padding:'7px 10px',color:T.text,fontWeight:600,maxWidth:140}}>{b.customer}</td>
                        <td style={{padding:'7px 10px',color:T.textM,fontSize:10,whiteSpace:'nowrap'}}>{b.project}</td>
                        <td style={{padding:'7px 10px',color:T.tealD,fontFamily:'monospace',fontSize:10,fontWeight:600}}>{b.unit}</td>
                        <td style={{padding:'7px 10px'}}><span style={{background:`${T.teal}12`,borderRadius:4,padding:'1px 6px',color:T.tealD,fontSize:9,fontWeight:600}}>{b.bhk}</span></td>
                        <td style={{padding:'7px 10px',color:T.navyM,fontWeight:700,whiteSpace:'nowrap'}}>{fmtCr(b.bsp)}</td>
                        <td style={{padding:'7px 10px',color:T.amber,whiteSpace:'nowrap'}}>{fmtCr(b.demand)}</td>
                        <td style={{padding:'7px 10px',color:T.tealD,fontWeight:600,whiteSpace:'nowrap'}}>{fmtCr(b.received)}</td>
                        <td style={{padding:'7px 10px',whiteSpace:'nowrap'}}>
                          <div style={{display:'flex',alignItems:'center',gap:5}}>
                            <div style={{width:40,height:4,background:'rgba(0,100,140,0.1)',borderRadius:2}}>
                              <div style={{width:`${p}%`,height:'100%',background:p>80?T.teal:p>50?T.amber:T.red,borderRadius:2}}/>
                            </div>
                            <span style={{color:bal>0?T.red:T.tealD,fontSize:10,fontWeight:600}}>{fmtCr(Math.abs(bal))}</span>
                          </div>
                        </td>
                        <td style={{padding:'7px 10px'}}><Badge label={b.loanStatus==='BANK FUNDED'?'🏦 Bank':'💼 Self'} color={b.loanStatus==='BANK FUNDED'?T.teal:T.navyM}/></td>
                        <td style={{padding:'7px 10px',color:T.textM,fontSize:10,fontWeight:600,maxWidth:120}}>{b.brokerName||'—'}</td>
                        <td style={{padding:'7px 10px',color:T.textM,fontSize:10,fontWeight:600,whiteSpace:'nowrap'}}>{b.bookingDate}</td>
                      </tr>
                    );
                  })}</tbody>
                </table>
              </div>
            </GC>

            {/* Pending Pipeline */}
            {pendingWF.length>0&&(
              <GC style={{padding:16}}>
                <SH title="Pipeline — Pending Workflow" sub={`${pendingWF.length} bookings awaiting approval`}/>
                <div style={{overflowX:'auto'}}>
                  <table style={{width:'100%',borderCollapse:'collapse',fontSize:11}}>
                    <thead><tr style={{borderBottom:`2px solid rgba(0,151,167,0.2)`}}>
                      {['Unit','Customer','Project','Company','L1 Status','L2 Status'].map(h=>(
                        <th key={h} style={{padding:'6px 10px',textAlign:'left',color:T.textM,fontSize:10,fontWeight:800,letterSpacing:0.5,whiteSpace:'nowrap',textTransform:'uppercase'}}>{h}</th>
                      ))}
                    </tr></thead>
                    <tbody>{pendingWF.map((r,i)=>(
                      <tr key={i} className="tr" style={{borderBottom:`1px solid rgba(0,100,140,0.1)`}}>
                        <td style={{padding:'7px 10px',color:T.tealD,fontFamily:'monospace',fontSize:10,fontWeight:600}}>{r.unit}</td>
                        <td style={{padding:'7px 10px',color:T.text,fontWeight:600}}>{r.customer}</td>
                        <td style={{padding:'7px 10px',color:T.textM,fontSize:10}}>{r.project}</td>
                        <td style={{padding:'7px 10px',color:T.textL,fontSize:10}}>{r.companyNorm}</td>
                        <td style={{padding:'7px 10px'}}><Badge label={r.l1} color={r.l1==='APPROVED'?T.teal:T.amber}/></td>
                        <td style={{padding:'7px 10px'}}><Badge label={r.l2} color={T.red}/></td>
                      </tr>
                    ))}</tbody>
                  </table>
                </div>
              </GC>
            )}
          </div>
        )}

        {/* FOOTER */}
        <div style={{marginTop:16,display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:8,background:'rgba(255,255,255,0.95)',borderRadius:12,padding:'8px 16px',border:'1px solid rgba(255,255,255,0.9)'}}>
          <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
            <Chip label="Units"    value={kpi.totalUnits?.toLocaleString('en-IN')} color={T.teal} small/>
            <Chip label="Active"   value={kpi.activeBookings?.toLocaleString('en-IN')} color={T.navy} small/>
            <Chip label="Demand"   value={fmtCr(kpi.dappDemand)} color={T.amber} small/>
            <Chip label="Workflow" value={`${kpi.wfApproved} approved`} color={T.greenL} small/>
          </div>
          <div style={{display:'flex',flexDirection:'column',alignItems:'flex-end',gap:1}}>
            <div style={{display:'flex',alignItems:'center',gap:10}}>
              <span style={{color:T.text,fontSize:9,fontWeight:700,letterSpacing:1}}>SMARTWORLD DASHBOARD v2.0</span>

            </div>
            <span style={{color:T.tealD,fontSize:9,fontWeight:700,letterSpacing:0.5}}>✦ Created &amp; Developed by ANIRUDH VERMA</span>
          </div>
        </div>
      </div>
    </div>
  );
}
