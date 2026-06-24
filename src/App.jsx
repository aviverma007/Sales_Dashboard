import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  AreaChart, Area, BarChart, Bar, ComposedChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  RadialBarChart, RadialBar, LabelList, ScatterChart, Scatter
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

const MonthRangeSlider = ({months, rangeIdx, setRangeIdx, onReset}) => {
  const trackRef = React.useRef(null);
  const dragging = React.useRef(null);
  const N = months.length;

  const getIdx = (clientX) => {
    if (!trackRef.current) return 0;
    const rect = trackRef.current.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    return Math.round(pct * (N - 1));
  };

  const startDrag = (handle, e) => {
    e.preventDefault();
    dragging.current = handle;
    const move = (ev) => {
      const x = ev.touches ? ev.touches[0].clientX : ev.clientX;
      const idx = getIdx(x);
      if (dragging.current === 'left') {
        setRangeIdx(prev => [Math.min(idx, prev[1] - 1), prev[1]]);
      } else {
        setRangeIdx(prev => [prev[0], Math.max(idx, prev[0] + 1)]);
      }
    };
    const up = () => {
      dragging.current = null;
      window.removeEventListener('mousemove', move);
      window.removeEventListener('mouseup', up);
      window.removeEventListener('touchmove', move);
      window.removeEventListener('touchend', up);
    };
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up);
    window.addEventListener('touchmove', move, { passive: false });
    window.addEventListener('touchend', up);
  };

  const safeL = Math.min(rangeIdx[0], N-1);
  const safeR = Math.min(rangeIdx[1], N-1);
  const leftPct = safeL / (N - 1) * 100;
  const rightPct = safeR / (N - 1) * 100;
  const fromLabel = fmtML(months[safeL]);
  const toLabel = fmtML(months[safeR]);

  if (N < 2) return null;
  return (
    <div style={{background:'rgba(255,255,255,0.96)',borderRadius:10,padding:'7px 16px 10px',marginBottom:6,boxShadow:'0 1px 6px rgba(0,0,0,0.07)',backdropFilter:'blur(8px)'}}>
      {/* Header row */}
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:6}}>
        <div style={{display:'flex',alignItems:'center',gap:6}}>
          <span style={{fontSize:8,fontWeight:700,color:T.textM,textTransform:'uppercase',letterSpacing:0.8}}>Chart Range</span>
          <div style={{display:'flex',alignItems:'center',gap:4,background:`linear-gradient(135deg,${T.tealD},${T.teal})`,borderRadius:20,padding:'2px 10px 2px 7px'}}>
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{opacity:0.9}}>
              <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
            </svg>
            <span style={{color:'#fff',fontSize:10,fontWeight:800,letterSpacing:0.2}}>{fromLabel} → {toLabel}</span>
          </div>
        </div>
        <button onClick={onReset} style={{fontSize:8,color:T.tealD,fontWeight:700,background:'rgba(0,151,167,0.06)',border:'1px solid rgba(0,151,167,0.18)',borderRadius:6,cursor:'pointer',padding:'2px 8px',display:'flex',alignItems:'center',gap:3,transition:'all 0.15s'}}>
          <span style={{fontSize:10}}>↺</span> Reset
        </button>
      </div>
      {/* Track area — compact */}
      <div ref={trackRef} style={{position:'relative',height:32,userSelect:'none',touchAction:'none'}}>
        {/* Base track */}
        <div style={{position:'absolute',top:'50%',transform:'translateY(-50%)',left:0,right:0,height:3,background:'rgba(0,100,140,0.08)',borderRadius:2}}/>
        {/* Filled range */}
        <div style={{position:'absolute',top:'50%',transform:'translateY(-50%)',left:leftPct+'%',right:(100-rightPct)+'%',height:3,background:`linear-gradient(90deg,${T.teal},${T.tealD})`,borderRadius:2,pointerEvents:'none',transition:'left 0.1s,right 0.1s'}}/>
        {/* Tick marks + labels */}
        {months.map((m, i) => {
          const pct = i / (N - 1) * 100;
          const inRange = i >= safeL && i <= safeR;
          const showLbl = i === 0 || i === N-1 || (N <= 12 ? true : N <= 24 ? i%2===0 : i%4===0);
          return (
            <div key={m} style={{position:'absolute',left:pct+'%',top:'50%',transform:'translate(-50%,-50%)',pointerEvents:'none',display:'flex',flexDirection:'column',alignItems:'center'}}>
              <div style={{width:3,height:3,borderRadius:'50%',background:inRange?'rgba(255,255,255,0.7)':'rgba(0,100,140,0.15)',transition:'background 0.2s'}}/>
              {showLbl && <span style={{fontSize:6.5,color:'rgba(80,100,120,0.7)',fontWeight:500,whiteSpace:'nowrap',position:'absolute',top:9,letterSpacing:0.1}}>{fmtML(m)}</span>}
            </div>
          );
        })}
        {/* Left handle */}
        <div onMouseDown={(e)=>startDrag('left',e)} onTouchStart={(e)=>startDrag('left',e)}
          style={{position:'absolute',left:leftPct+'%',top:'50%',transform:'translate(-50%,-50%)',width:22,height:22,borderRadius:6,background:'#fff',color:T.tealD,display:'flex',alignItems:'center',justifyContent:'center',cursor:'grab',zIndex:10,boxShadow:`0 2px 8px rgba(0,151,167,0.35),0 0 0 1.5px ${T.tealD}`,userSelect:'none',touchAction:'none',transition:'transform 0.15s,box-shadow 0.15s'}}>
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
          </svg>
        </div>
        {/* Left label tooltip */}
        <div style={{position:'absolute',left:leftPct+'%',top:'calc(50% - 26px)',transform:'translateX(-50%)',background:T.tealD,color:'#fff',fontSize:7.5,fontWeight:800,borderRadius:4,padding:'1px 5px',whiteSpace:'nowrap',pointerEvents:'none',boxShadow:'0 1px 4px rgba(0,151,167,0.3)',letterSpacing:0.2}}>
          {fromLabel}
        </div>
        {/* Right handle */}
        <div onMouseDown={(e)=>startDrag('right',e)} onTouchStart={(e)=>startDrag('right',e)}
          style={{position:'absolute',left:rightPct+'%',top:'50%',transform:'translate(-50%,-50%)',width:22,height:22,borderRadius:6,background:'#fff',color:T.tealD,display:'flex',alignItems:'center',justifyContent:'center',cursor:'grab',zIndex:10,boxShadow:`0 2px 8px rgba(0,151,167,0.35),0 0 0 1.5px ${T.tealD}`,userSelect:'none',touchAction:'none',transition:'transform 0.15s,box-shadow 0.15s'}}>
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
          </svg>
        </div>
        {/* Right label tooltip */}
        <div style={{position:'absolute',left:rightPct+'%',top:'calc(50% - 26px)',transform:'translateX(-50%)',background:T.tealD,color:'#fff',fontSize:7.5,fontWeight:800,borderRadius:4,padding:'1px 5px',whiteSpace:'nowrap',pointerEvents:'none',boxShadow:'0 1px 4px rgba(0,151,167,0.3)',letterSpacing:0.2}}>
          {toLabel}
        </div>
      </div>
    </div>
  );
};

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
  <div style={{marginBottom:compact?6:10}}>
    <p style={{fontSize:compact?10:12,fontWeight:800,color:light?T.textW:T.tealD,letterSpacing:0.4,margin:0,textTransform:'uppercase',textShadow:'0 1px 2px rgba(255,255,255,0.6)'}}>{title}</p>
  </div>
);

// ─── FILTER SELECT ────────────────────────────────────────────────────────────
const FSel = ({label,options,value,onChange,multi=false,openId='',activeOpen=null,setActiveOpen=()=>{},mandatory=false}) => {
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
              {!mandatory&&<button onClick={()=>onChange('')} style={{flex:1,padding:'3px 8px',borderRadius:6,border:'1px solid rgba(200,40,40,0.3)',background:'rgba(200,40,40,0.06)',color:'#c62828',fontSize:9,fontWeight:800,cursor:'pointer'}}>✕ Clear</button>}
            </div>
            {options.map(o=>(
              <div key={o}
                onClick={e=>{
                  const cbClicked=e.target.closest('[data-cb]');
                  if(cbClicked){e.stopPropagation();toggle(o);}
                  else{if(mandatory&&vals.length===1&&vals[0]===o)return;onChange(o===vals[0]&&vals.length===1?'':o);setActiveOpen(null);}
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
        <Bar dataKey="units" name="Units" radius={[0,4,4,0]}><LabelList dataKey="units" position="right" style={{fill:T.navy,fontSize:8,fontWeight:800}}/>
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
      <BarChart data={sliceWithCap} margin={{top:18,right:8,bottom:18,left:0}} barSize={18}>
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
        <Bar dataKey="cancelled" name="Cancelled" fill={T.red} radius={[2,2,0,0]} fillOpacity={0.85}><LabelList dataKey="cancelled" position="top" style={{fill:T.red,fontSize:7,fontWeight:800}} formatter={v=>v>0?v:''}/>
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


// ── Dashboard Summary Bar Component ──────────────────────────────────────────
const SummaryBar = ({raw, filters, T, GC}) => {
  const [pnlKpi, setPnlKpi] = React.useState(null);

  React.useEffect(()=>{
    const pf3=getProjectFiles(filters?.project?.split('||')[0]||'');
    fetch(pf3.pnl).then(r=>r.json()).then(d=>setPnlKpi(d?.kpi||{})).catch(()=>{});
  },[]);

  const selProjs = filters.project ? filters.project.split('||').filter(Boolean) : [];
  const invr = (raw?.invr||[]).filter(u=>!selProjs.length||selProjs.includes(u.project));
  const booked = invr.filter(u=>u.status==='Booked');
  const areaSold = booked.reduce((s,u)=>s+(u.carpetArea||u.superArea||0),0);
  const dkAll = raw?.dappKpi?.kpi?.all || {};

  const totalUnits = booked.length;
  const areaSoldK  = (areaSold/1000).toFixed(1);
  const totalColl  = (dkAll.totalReceivedWoT || 0).toFixed(1);
  const totalExp   = (pnlKpi?.totalExpenditure || 0).toFixed(1);

  const cards = [
    { label:'Total Units Sold',             value: totalUnits.toLocaleString('en-IN'), sub:`of ${invr.length} total · ${invr.filter(u=>u.status==='Available').length} available`, color:'#0097a7' },
    { label:'Total Area Sold',              value:`${(areaSold/100000).toFixed(2)} L sqft`,                sub:'Carpet area of booked units', color:'#7c3aed' },
    { label:'Total Collection (W/O GST)',   value:`₹${totalColl} Cr`,                 sub:'Received from customers (bank)', color:'#10b981' },
    { label:'Total Expenditure (incl. GST)',value:`₹${totalExp} Cr`,                  sub:'CJI3 + ME2L actual spend', color:'#ef4444' },
  ];

  return (
    <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:10,marginBottom:4}}>
      {cards.map(({label,value,sub,color})=>(
        <GC key={label} style={{padding:'13px 16px'}} cls="kc">
          <div style={{position:'absolute',top:0,left:0,right:0,height:3,background:color,borderRadius:'14px 14px 0 0'}}/>
          <p style={{fontSize:8,fontWeight:800,color:'#94a3b8',textTransform:'uppercase',letterSpacing:.7,margin:'2px 0 5px'}}>{label}</p>
          <p style={{fontSize:21,fontWeight:900,color:T.navy,margin:'0 0 3px',lineHeight:1,letterSpacing:-0.5}}>{value}</p>
          <p style={{fontSize:9,color:T.textL,margin:0}}>{sub}</p>
        </GC>
      ))}
    </div>
  );
};

// ── Collections Tab Component ─────────────────────────────────────────────────
const CollectionsTab = ({T, GC, SH, filters={}, raw}) => {
  const [dk, setDk] = React.useState(null);
  const [planType, setPlanType] = React.useState('all');
  const [showNote, setShowNote] = React.useState(false);
  const [rangeIdx, setRangeIdx] = React.useState([0, 999]);
  const [sortBy, setSortBy] = React.useState('amount'); // 'amount' | 'date'

  React.useEffect(()=>{
    const pf=getProjectFiles(filters?.project?.split('||')[0]||'');
    fetch(pf.dapp).then(r=>r.json()).then(setDk).catch(()=>{});
  },[]);

  if(!dk) return <div style={{textAlign:'center',padding:40,color:T.textL,fontSize:12}}>Loading Demand & Collection data…</div>;

  // ── Filter helpers ────────────────────────────────────────────────────────
  const fyFilter  = filters.fy     || '';
  const moFilter  = filters.month  || '';
  const qFilter   = filters.quarter|| '';
  const MN = {Jan:'01',Feb:'02',Mar:'03',Apr:'04',May:'05',Jun:'06',Jul:'07',Aug:'08',Sep:'09',Oct:'10',Nov:'11',Dec:'12'};
  const FYQ = {Q1:['04','05','06'],Q2:['07','08','09'],Q3:['10','11','12'],Q4:['01','02','03']};

  const monthInFilter = (ym) => {
    if(!ym) return true;
    const [yr,mo] = ym.split('-');
    if(fyFilter) {
      const fys = fyFilter.split('||').filter(Boolean);
      const moN = parseInt(mo);
      const fyStr = moN>=4 ? `FY${yr}-${String(+yr+1).slice(2)}` : `FY${+yr-1}-${yr.slice(2)}`;
      if(fys.length && !fys.includes(fyStr)) return false;
    }
    if(moFilter) {
      const mos = moFilter.split('||').filter(Boolean);
      if(mos.length && !mos.some(m=>MN[m]===mo)) return false;
    }
    if(qFilter) {
      const qs = qFilter.split('||').filter(Boolean).map(q=>q.split(' ')[0]);
      if(qs.length && !qs.some(q=>(FYQ[q]||[]).includes(mo))) return false;
    }
    return true;
  };

  const hasFilter = !!(fyFilter||moFilter||qFilter);

  // Filter monthlyTrend for trend chart
  const allMonthlyRaw = dk.monthlyTrend || [];
  const allMonthly    = hasFilter ? allMonthlyRaw.filter(r=>monthInFilter(r.month)) : allMonthlyRaw;

  // Filter KPIs from raw dapp data when filter active
  const dappRows = hasFilter ? (raw?.dapp||[]).filter(r=>monthInFilter(r.billMonth)) : null;
  const filtKpi  = dappRows ? {
    totalInstallment: dappRows.reduce((s,r)=>s+(r.demand||0),0)/1e7,
    totalReceivedWoT: dappRows.reduce((s,r)=>s+(r.received||0),0)/1e7,
    totalOutstanding: dappRows.reduce((s,r)=>s+(r.outstanding||0),0)/1e7,
  } : null;

  const kpi    = filtKpi || dk.kpi?.[planType] || {};
  const adv    = planType==='all' ? (dk.advance_all||{}) : (dk.advance?.[planType] || {});
  const instCr = filtKpi ? filtKpi.totalInstallment : (kpi.totalInstallment || 0);
  const recCr  = filtKpi ? filtKpi.totalReceivedWoT : (kpi.totalReceivedWoT  || 0);
  const outCr  = filtKpi ? filtKpi.totalOutstanding  : (kpi.totalOutstanding  || 0);
  const advRaw = adv.rawCr || 0;
  const advNet = adv.netCr || 0;
  const advGst = adv.gstCr || 0;

  const allMilestones = dk.milestonesUpcoming || [];

  // Filter milestones by expected date matching selected FY/Quarter/Month
  const milestoneInFilter = (expectedDate) => {
    if(!hasFilter) return true;
    if(!expectedDate) return false; // exclude milestones with no date when filter active
    return monthInFilter(expectedDate);
  };

  const milestones = (planType==='all' ? allMilestones
    : allMilestones.filter(m=>m.type===planType)
  ).filter(m=>milestoneInFilter(m.expectedDate))
   .slice().sort((a,b)=>sortBy==='date'
    ? (a.expectedDate||'9999-99').localeCompare(b.expectedDate||'9999-99')
    : b.totalCr - a.totalCr
  );
  const towers        = dk.towerKpi || [];

  // Range slider filtering for monthly trend chart
  const collMonths = allMonthly.map(r=>r.month);
  const safeL = Math.min(rangeIdx[0], Math.max(0, collMonths.length-1));
  const safeR = Math.min(rangeIdx[1], Math.max(0, collMonths.length-1));
  const filteredMonthly = allMonthly.slice(safeL, safeR+1);

  // Keys for monthly/tower data
  const demKey = planType==='all'?null:planType+'_dem';
  const recKey = planType==='all'?null:planType+'_rec';
  const outKey = planType==='all'?null:planType+'_out';

  const upcomingByMonth = {};
  milestones.forEach(m=>{
    if(!m.expectedDate) return;
    const ym=m.expectedDate;
    if(!upcomingByMonth[ym]) upcomingByMonth[ym]={month:ym,label:'',tlp:0,clp:0};
    const [yr,mo]=ym.split('-');
    const MN={'01':'Jan','02':'Feb','03':'Mar','04':'Apr','05':'May','06':'Jun','07':'Jul','08':'Aug','09':'Sep','10':'Oct','11':'Nov','12':'Dec'};
    upcomingByMonth[ym].label=`${MN[mo]}'${yr.slice(2)}`;
    const key = m.type;
    upcomingByMonth[ym][key] = (upcomingByMonth[ym][key]||0) + m.totalCr;
  });
  const upcomingMonthArr=Object.values(upcomingByMonth).sort((a,b)=>a.month.localeCompare(b.month));

  const fmtC=v=>v>=100?`₹${v.toFixed(0)} Cr`:`₹${v.toFixed(2)} Cr`;
  const SH2=({title,sub})=>(<div style={{marginBottom:12}}><p style={{fontSize:12,fontWeight:900,color:T.tealD,margin:0,textTransform:'uppercase',letterSpacing:0.5}}>{title}</p>{sub&&<p style={{fontSize:10,color:T.textL,margin:'2px 0 0'}}>{sub}</p>}</div>);
  const SectionHead=({title,icon})=>(<div style={{display:'flex',alignItems:'center',gap:10,margin:'4px 0 12px',background:'linear-gradient(135deg,#0d2136,#0f3a5a)',borderRadius:10,padding:'8px 16px',boxShadow:'0 2px 10px rgba(0,0,0,0.2)'}}><span style={{fontSize:14}}>{icon}</span><span style={{fontSize:11,fontWeight:900,color:'#fff',letterSpacing:1,textTransform:'uppercase'}}>{title}</span><div style={{flex:1,height:1,background:'rgba(255,255,255,0.15)',marginLeft:8}}/></div>);
  const TEAL_BTN={background:T.tealD,color:'#fff',border:'none',borderRadius:8,padding:'7px 20px',fontWeight:800,fontSize:11,cursor:'pointer',letterSpacing:0.5};
  const GREY_BTN={background:'rgba(0,100,140,0.08)',color:T.textM,border:'1px solid rgba(0,100,140,0.15)',borderRadius:8,padding:'7px 20px',fontWeight:700,fontSize:11,cursor:'pointer',letterSpacing:0.5};

  return (<>
    {/* TLP / CLP TOGGLE */}
    <div style={{display:'flex',alignItems:'center',gap:8,flexWrap:'wrap',background:'rgba(255,255,255,0.95)',borderRadius:12,padding:'10px 16px',border:'1px solid rgba(0,100,140,0.1)',boxShadow:'0 2px 8px rgba(0,60,100,0.06)'}}>
      <span style={{fontSize:11,fontWeight:800,color:T.textM,textTransform:'uppercase',letterSpacing:0.8,marginRight:4}}>Payment Plan:</span>
      {[
        ['all',          'All Plans',                  T.tealD],
        ['tlp',          'TLP — Time Linked',          T.amber],
        ['clp',          'CLP — Construction Linked',  '#2e7d32'],
      ].map(([k,l,col])=>(
        <button key={k} onClick={()=>setPlanType(k)}
          style={planType===k
            ? {background:col,color:'#fff',border:'none',borderRadius:8,padding:'7px 16px',fontWeight:800,fontSize:10,cursor:'pointer',letterSpacing:0.4,boxShadow:`0 2px 8px ${col}66`}
            : {background:'rgba(0,100,140,0.06)',color:T.textM,border:`1px solid rgba(0,100,140,0.15)`,borderRadius:8,padding:'7px 16px',fontWeight:700,fontSize:10,cursor:'pointer',letterSpacing:0.4}}>
          {l}
        </button>
      ))}
      <span style={{marginLeft:'auto',fontSize:9,color:T.textL,fontStyle:'italic'}}>All amounts W/O GST</span>
    </div>

    {/* ADVANCE NOTE — compact pill with hover tooltip */}
    {advRaw>0&&(
      <div style={{display:'flex',alignItems:'center',gap:8}}>
        <div style={{position:'relative',display:'inline-flex',alignItems:'center',gap:6,background:'rgba(245,158,11,0.1)',border:'1px solid rgba(245,158,11,0.3)',borderRadius:20,padding:'4px 12px',cursor:'pointer'}}
          onMouseEnter={()=>setShowNote(true)} onMouseLeave={()=>setShowNote(false)}>
          <span style={{fontSize:12}}>⚠️</span>
          <span style={{fontSize:9,fontWeight:800,color:'#92400e',letterSpacing:0.4}}>
            Advance: ₹{advRaw.toFixed(1)} Cr received · GST −₹{advGst.toFixed(2)} Cr · Net ₹{advNet.toFixed(1)} Cr
          </span>
          <span style={{fontSize:8,color:'#b45309',borderLeft:'1px solid rgba(180,87,9,0.3)',paddingLeft:8,opacity:0.7}}>hover for details</span>
          {showNote&&(
            <div style={{position:'absolute',top:'calc(100% + 8px)',left:0,zIndex:99,background:'#fff',border:'1px solid rgba(245,158,11,0.3)',borderRadius:10,padding:'10px 14px',boxShadow:'0 8px 24px rgba(0,0,0,0.12)',width:440,pointerEvents:'none'}}>
              <p style={{fontSize:9,color:'#78350f',margin:0,lineHeight:1.6}}>{dk.advanceNote}</p>
            </div>
          )}
        </div>
      </div>
    )}

    {/* SECTION 1: KPI SUMMARY */}
    <SectionHead title="Demand & Collection Summary" icon="📊"/>
    <div style={{display:'grid',gridTemplateColumns:'repeat(5,1fr)',gap:10}}>
      <GC style={{padding:13}} cls="kc">
        <p style={{fontSize:8,color:T.textM,fontWeight:700,textTransform:'uppercase',margin:'0 0 4px',letterSpacing:0.5}}>Total Sales Value (TCV)</p>
        <p style={{fontSize:20,fontWeight:900,color:'#1d4ed8',margin:'0 0 4px',letterSpacing:-0.5}}>₹{((raw?.kpiExtra?.totalTCVCr)||0).toFixed(0)} Cr</p>
        <p style={{fontSize:8,color:T.textL,margin:0}}>Booked TCV incl. tax</p>
        <div style={{position:'absolute',bottom:0,left:0,right:0,height:3,background:'linear-gradient(90deg,#1d4ed8,transparent)',borderRadius:'0 0 14px 14px'}}/>
      </GC>
      <GC style={{padding:13}} cls="kc">
        <p style={{fontSize:8,color:T.textM,fontWeight:700,textTransform:'uppercase',margin:'0 0 4px',letterSpacing:0.5}}>Total Demand (W/O GST)</p>
        <p style={{fontSize:20,fontWeight:900,color:T.amber,margin:'0 0 4px',letterSpacing:-0.5}}>{fmtC(instCr)}</p>
        <p style={{fontSize:8,color:T.textL,margin:0}}>Total demand raised to date</p>
        <div style={{position:'absolute',bottom:0,left:0,right:0,height:3,background:`linear-gradient(90deg,${T.amber},transparent)`,borderRadius:'0 0 14px 14px'}}/>
      </GC>
      <GC style={{padding:13}} cls="kc">
        <p style={{fontSize:8,color:T.textM,fontWeight:700,textTransform:'uppercase',margin:'0 0 4px',letterSpacing:0.5}}>Total Received (W/O GST)</p>
        <p style={{fontSize:20,fontWeight:900,color:T.tealD,margin:'0 0 4px',letterSpacing:-0.5}}>{fmtC(recCr)}</p>
        <p style={{fontSize:8,color:T.textL,margin:0}}>Bank received − CGST − SGST</p>
        <div style={{position:'absolute',bottom:0,left:0,right:0,height:3,background:`linear-gradient(90deg,${T.tealD},${T.teal})`,borderRadius:'0 0 14px 14px'}}/>
      </GC>
      <GC style={{padding:13}} cls="kc">
        <p style={{fontSize:8,color:T.textM,fontWeight:700,textTransform:'uppercase',margin:'0 0 4px',letterSpacing:0.5}}>Outstanding (Outstanding 1)</p>
        <p style={{fontSize:20,fontWeight:900,color:T.red,margin:'0 0 4px',letterSpacing:-0.5}}>{fmtC(outCr)}</p>
        <p style={{fontSize:8,color:T.textL,margin:0}}>Unpaid from raised demands</p>
        <div style={{position:'absolute',bottom:0,left:0,right:0,height:3,background:`linear-gradient(90deg,${T.red},transparent)`,borderRadius:'0 0 14px 14px'}}/>
      </GC>
      <GC style={{padding:13}} cls="kc">
        <p style={{fontSize:8,color:T.textM,fontWeight:700,textTransform:'uppercase',margin:'0 0 2px',letterSpacing:0.5}}>Advance Received</p>
        <p style={{fontSize:18,fontWeight:900,color:'#7c3aed',margin:'0 0 6px',letterSpacing:-0.5}}>{fmtC(advRaw)}</p>
        <div style={{display:'flex',gap:6}}>
          <div style={{flex:1,background:'rgba(124,58,237,0.07)',borderRadius:6,padding:'4px 6px'}}>
            <p style={{fontSize:7,color:'#7c3aed',fontWeight:700,margin:'0 0 1px'}}>Net (−GST 5%)</p>
            <p style={{fontSize:11,fontWeight:900,color:'#7c3aed',margin:0}}>₹{advNet.toFixed(2)} Cr</p>
          </div>
          <div style={{flex:1,background:'rgba(245,158,11,0.07)',borderRadius:6,padding:'4px 6px'}}>
            <p style={{fontSize:7,color:T.amber,fontWeight:700,margin:'0 0 1px'}}>GST Deducted</p>
            <p style={{fontSize:11,fontWeight:900,color:T.amber,margin:0}}>₹{advGst.toFixed(2)} Cr</p>
          </div>
        </div>
        <div style={{position:'absolute',bottom:0,left:0,right:0,height:3,background:'linear-gradient(90deg,#7c3aed,transparent)',borderRadius:'0 0 14px 14px'}}/>
      </GC>
    </div>

    {/* SECTION 2: UPCOMING BY MONTH */}
    <SectionHead title="Month-wise Expected Collections" icon="📅"/>
    <GC style={{padding:16}}>
      <SH2 title="Expected Collection per Month" sub="Based on milestone expected dates from Slab Matrix"/>
      <ResponsiveContainer width="100%" height={220}>
        <ComposedChart data={upcomingMonthArr.map(d=>({
          ...d,
          total: +((d.tlp||0)+(d.clp||0)).toFixed(2)
        }))} margin={{top:28,right:20,bottom:20,left:0}}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,60,100,0.07)" vertical={false}/>
          <XAxis dataKey="label" tick={{fill:T.textM,fontSize:9,fontWeight:600}} axisLine={false} tickLine={false}/>
          <YAxis tick={{fill:T.textM,fontSize:9}} axisLine={false} tickLine={false}
            tickFormatter={v=>v>=1?'₹'+v+'Cr':v>0?'₹'+(v*100).toFixed(0)+'L':''} width={50}/>
          <Tooltip content={({active,payload,label})=>{
            if(!active||!payload?.length) return null;
            const d=payload[0]?.payload||{};
            const total=(d.tlp||0)+(d.clp||0);
            const fmt=v=>v>=1?`₹${v.toFixed(2)} Cr`:`₹${(v*100).toFixed(1)} L`;
            return(
              <div style={{background:'#fff',border:'1px solid #e5e7eb',borderRadius:8,padding:'8px 12px',fontSize:10,boxShadow:'0 2px 8px rgba(0,0,0,0.1)'}}>
                <p style={{margin:'0 0 5px',fontWeight:800,color:T.navy,fontSize:11}}>{label}</p>
                <p style={{margin:'0 0 2px',color:T.tealD,fontWeight:800}}>Total: {fmt(total)}</p>
                {d.clp>0&&<p style={{margin:'0 0 1px',color:'#2e7d32'}}>CLP: {fmt(d.clp)}</p>}
                {d.tlp>0&&<p style={{margin:'0 0 1px',color:T.amber}}>TLP: {fmt(d.tlp)}</p>}

              </div>
            );
          }}/>
          <Bar dataKey="total" name="Collection" fill={T.tealD} radius={[4,4,0,0]} minPointSize={4}>
            <LabelList dataKey="total" position="top" style={{fontSize:9,fontWeight:800,fill:T.tealD}}
              formatter={v=>v>0?(v>=1?'₹'+v.toFixed(1)+'Cr':'₹'+(v*100).toFixed(0)+'L'):''}/>
          </Bar>
        </ComposedChart>
      </ResponsiveContainer>
    </GC>

    {/* SECTION 4: TOWER-WISE */}
    <SectionHead title="Tower-wise Collection" icon="🏢"/>
    <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:10}}>
      {towers.map((tw,i)=>{
        const dem=demKey?tw[demKey]||0:(tw.tlp_dem+tw.clp_dem+(tw.he_dem||0)+(tw.hl_dem||0));
        const rec=recKey?tw[recKey]||0:(tw.tlp_rec+tw.clp_rec+(tw.he_rec||0)+(tw.hl_rec||0));
        const out=outKey?tw[outKey]||0:(tw.tlp_out+tw.clp_out+(tw.he_out||0)+(tw.hl_out||0));
        const eff=dem>0?Math.round(rec/dem*100):0;
        // Get TSV from towerData in raw
        const tRaw=(raw?.towerData||[]).find(r=>r.tower===tw.tower&&(!raw?.filterOptions?.projects||r.project==='SMARTWORLD THE EDITION'));
        const bspCr = tRaw?.totalBSPCr || 0;
        const units  = tRaw?.booked || 0;
        const avail  = tRaw?.available || 0;
        const rate   = tRaw?.pricePerSqft || 0;
        return (
          <GC key={i} style={{padding:14}} cls="kc">
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:6}}>
              <div>
                <p style={{fontSize:13,fontWeight:900,color:T.tealD,margin:0}}>{tw.tower}</p>
                <p style={{fontSize:9,color:T.textL,margin:'1px 0 0'}}>{units} booked · {avail} avail · ₹{rate.toLocaleString('en-IN')}/sqft</p>
              </div>
              <span style={{fontSize:10,fontWeight:800,color:eff>=100?'#059669':eff>=80?T.tealD:T.amber,background:eff>=100?'rgba(5,150,105,0.1)':'rgba(0,151,167,0.1)',borderRadius:6,padding:'2px 8px'}}>{eff}% eff</span>
            </div>
            {/* TSV bar */}
            {bspCr>0&&<div style={{background:'rgba(37,99,235,0.06)',borderRadius:6,padding:'5px 8px',marginBottom:6,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
              <p style={{fontSize:7,color:'#1d4ed8',fontWeight:700,textTransform:'uppercase',margin:0}}>Total Sales Value (BSP)</p>
              <p style={{fontSize:12,fontWeight:900,color:'#1d4ed8',margin:0}}>₹{bspCr.toFixed(1)} Cr</p>
            </div>}
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:6}}>
              {[['Demand',dem,T.amber],['Received',rec,T.tealD],['Outstanding',out,T.red]].map(([l,v,c])=>(
                <div key={l} style={{background:'rgba(0,100,140,0.04)',borderRadius:6,padding:'5px 7px'}}>
                  <p style={{fontSize:7,color:T.textM,fontWeight:700,textTransform:'uppercase',margin:'0 0 2px'}}>{l}</p>
                  <p style={{fontSize:11,fontWeight:900,color:c,margin:0}}>₹{v.toFixed(1)}Cr</p>
                </div>
              ))}
            </div>
            <div style={{marginTop:8,height:4,background:'rgba(0,100,140,0.08)',borderRadius:2}}>
              <div style={{width:Math.min(eff,100)+'%',height:'100%',background:`linear-gradient(90deg,${T.teal},${T.tealD})`,borderRadius:2,transition:'width 0.5s'}}/>
            </div>
            <div style={{position:'absolute',bottom:0,left:0,right:0,height:3,background:`linear-gradient(90deg,${T.tealD},transparent)`,borderRadius:'0 0 14px 14px'}}/>
          </GC>
        );
      })}
    </div>

    {/* SECTION 3: MILESTONE CHART */}
    <SectionHead title="Upcoming Milestone Collections" icon="🏗️"/>
    <GC style={{padding:16}}>
      <SH2 title="Milestone-wise Expected Collection" sub={`Total upcoming: ₹${milestones.reduce((s,m)=>s+m.totalCr,0).toFixed(0)} Cr${hasFilter?' (filtered)':''} — sorted by ${sortBy==='date'?'date':'amount'}`}/>
      <div style={{overflowX:'auto'}}>
        <div style={{minWidth:Math.max(milestones.length*70,600)+'px'}}>
          <ResponsiveContainer width="100%" height={260}>
            <ComposedChart data={milestones} margin={{top:32,right:20,bottom:60,left:0}}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,60,100,0.07)" vertical={false}/>
              <XAxis dataKey="name" tick={{fill:T.textM,fontSize:7,fontWeight:600}} angle={-35} textAnchor="end" height={70} axisLine={false} tickLine={false} tickFormatter={v=>{const m=milestones.find(x=>x.name===v);const n=m?.shortName||v;return n.length>20?n.slice(0,20)+'…':n;}}/>
              <YAxis tick={{fill:T.textM,fontSize:9}} axisLine={false} tickLine={false} tickFormatter={v=>'₹'+v+'Cr'} width={48}/>
              <Tooltip formatter={(v,n)=>[`₹${v} Cr`,n]} labelFormatter={l=>{const m=milestones.find(x=>x.name===l);const n=m?.shortName||l;return `${n}${m?.expectedDate?' ('+m.expectedDate+')':''}`;}}/>
              <Legend wrapperStyle={{fontSize:9,fontWeight:700}} iconSize={8}/>
              <Bar dataKey="totalCr" name={planType==='clp'?'CLP Amount':'TLP Amount'}
                fill={planType==='clp'?'#2e7d32':T.amber}
                radius={[3,3,0,0]} maxBarSize={40}>
                <LabelList content={({x,y,width,value,index})=>{
                  const m=milestones[index];
                  if(!m||!value||value<=0) return null;
                  const amt=`₹${value>=100?value.toFixed(0):value.toFixed(1)}Cr`;
                  const date=m.expectedDate||'';
                  return(
                    <g>
                      <text x={x+width/2} y={y-14} textAnchor="middle" fill={T.textD} fontSize={8} fontWeight={800}>{amt}</text>
                      {date&&<text x={x+width/2} y={y-3} textAnchor="middle" fill="#94a3b8" fontSize={7}>{date}</text>}
                    </g>
                  );
                }}/>
              </Bar>
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>
      <div style={{overflowX:'auto',marginTop:12}}>
        <table style={{width:'100%',borderCollapse:'collapse',fontSize:9}}>
          <thead>
            <tr style={{background:'rgba(0,100,140,0.06)'}}>
              {['Milestone','Type','Expected Date','T-1','T-2','T-3','T-4','T-5','T-6','Total (Cr)'].map(h=>(
                <th key={h} style={{padding:'8px 10px',textAlign:h==='Milestone'?'left':'right',color:T.textM,fontWeight:800,textTransform:'uppercase',fontSize:10,letterSpacing:0.4,borderBottom:'2px solid rgba(0,100,140,0.12)'}}>
                  {h==='Expected Date'
                    ? <div style={{display:'flex',alignItems:'center',justifyContent:'flex-end',gap:6}}>
                        <span>{h}</span>
                        <button onClick={()=>setSortBy(s=>s==='date'?'amount':'date')}
                          style={{fontSize:9,fontWeight:800,cursor:'pointer',border:'none',borderRadius:5,padding:'2px 7px',
                            background:sortBy==='date'?T.tealD:'rgba(0,100,140,0.1)',
                            color:sortBy==='date'?'#fff':T.tealD}}>
                          {sortBy==='date'?'↕ Date':'↕ Amount'}
                        </button>
                      </div>
                    : h==='Total (Cr)'
                    ? <div style={{display:'flex',alignItems:'center',justifyContent:'flex-end',gap:6}}>
                        <span>{h}</span>
                      </div>
                    : h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {milestones.map((m,i)=>(
              <tr key={i} style={{borderBottom:'1px solid rgba(0,100,140,0.07)',background:i%2===0?'transparent':'rgba(0,100,140,0.02)'}}>
                <td style={{padding:'8px 10px',color:T.textD,fontWeight:600,fontSize:12,maxWidth:260}}>{m.shortName||m.name}</td>
                <td style={{padding:'8px 10px',textAlign:'right'}}>
                  <span style={{background:m.type==='tlp'?'rgba(245,158,11,0.12)':'rgba(0,151,167,0.12)',color:m.type==='tlp'?T.amber:T.tealD,borderRadius:4,padding:'3px 8px',fontSize:10,fontWeight:800}}>{m.type.toUpperCase()}</span>
                </td>
                <td style={{padding:'8px 10px',textAlign:'right',color:T.textM,fontWeight:600,fontSize:12}}>{m.expectedDate||'—'}</td>
                {['T1','T2','T3','T4','T5','T6'].map(t=>(
                  <td key={t} style={{padding:'8px 10px',textAlign:'right',color:m[t]>0?T.tealD:T.textL,fontWeight:m[t]>0?700:400,fontSize:12}}>{m[t]>0?`₹${m[t]}`:'-'}</td>
                ))}
                <td style={{padding:'8px 10px',textAlign:'right',color:T.tealD,fontWeight:900,fontSize:13}}>₹{m.totalCr.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </GC>

    {/* SECTION 5: MONTHLY TREND */}
    <SectionHead title="Monthly Demand vs Collection Trend" icon="📈"/>
    <MonthRangeSlider
      months={collMonths}
      rangeIdx={rangeIdx}
      setRangeIdx={setRangeIdx}
      onReset={()=>setRangeIdx([0,999])}
    />
    <GC style={{padding:16}}>
      <SH2 title="Month-wise Demand Raised vs Received" sub="From bill creation date in DAPP (W/O GST)"/>
      <div style={{overflowX:'auto'}}>
        <div style={{minWidth:Math.max(allMonthly.length*55,500)+'px'}}>
          <ResponsiveContainer width="100%" height={240}>
            <ComposedChart data={filteredMonthly} margin={{top:14,right:20,bottom:28,left:0}}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,60,100,0.07)" vertical={false}/>
              <XAxis dataKey="label" tick={{fill:T.textM,fontSize:8,fontWeight:600}} angle={-30} textAnchor="end" height={36} axisLine={false} tickLine={false}/>
              <YAxis tick={{fill:T.textM,fontSize:9}} axisLine={false} tickLine={false} tickFormatter={v=>'₹'+v+'Cr'} width={46}/>
              <Tooltip formatter={(v,n)=>[`₹${v} Cr`,n]}/>
              <Legend wrapperStyle={{fontSize:9,fontWeight:700}} iconSize={8}/>
              {(planType==='all'||planType==='tlp')&&<Bar dataKey="tlp_dem" name="TLP Demand" fill={T.amber} fillOpacity={0.7} radius={[3,3,0,0]} stackId="dem"/>}
              {(planType==='all'||planType==='clp')&&<Bar dataKey="clp_dem" name="CLP Demand" fill="#2e7d32" fillOpacity={0.6} radius={[3,3,0,0]} stackId="dem"/>}
              {(planType==='all'||planType==='hybrid_later')&&<Bar dataKey="hl_dem" name="Hybrid(Later) Demand" fill="#7c3aed" fillOpacity={0.6} radius={[3,3,0,0]} stackId="dem"/>}
              {(planType==='all'||planType==='hybrid_earlier')&&<Bar dataKey="he_dem" name="Hybrid(Earlier) Demand" fill="#b45309" fillOpacity={0.6} radius={[3,3,0,0]} stackId="dem"/>}
              {(planType==='all'||planType==='tlp')&&<Bar dataKey="tlp_rec" name="TLP Received" fill={T.teal} fillOpacity={0.8} radius={[3,3,0,0]} stackId="rec"/>}
              {(planType==='all'||planType==='clp')&&<Bar dataKey="clp_rec" name="CLP Received" fill={T.tealD} fillOpacity={0.6} radius={[3,3,0,0]} stackId="rec"/>}
              {(planType==='all'||planType==='hybrid_later')&&<Bar dataKey="hl_rec" name="Hybrid(Later) Received" fill="#a855f7" fillOpacity={0.7} radius={[3,3,0,0]} stackId="rec"/>}
              {(planType==='all'||planType==='hybrid_earlier')&&<Bar dataKey="he_rec" name="Hybrid(Earlier) Received" fill="#d97706" fillOpacity={0.7} radius={[3,3,0,0]} stackId="rec"/>}
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>
    </GC>
  </>);
};

// ── P&L Tab Component ────────────────────────────────────────────────────────

const PnLChart = ({md}) => {
  const canvasRef = React.useRef(null);
  React.useEffect(()=>{
    const el = canvasRef.current;
    if(!el) return;
    if(el._chartInst){el._chartInst.destroy();el._chartInst=null;}
    const Chart = window.Chart;
    if(!Chart||!md||!md.length) return;
    const labels=md.map(r=>r.label);
    const revData=md.map(r=>+(r.revenue||0));
    const expData=md.map(r=>+(r.expenditure||0));
    const pnlData=md.map(r=>+(r.surplus||0));
    el._chartInst=new Chart(el,{
      data:{labels,datasets:[
        {type:'bar',label:'Collection',data:revData,backgroundColor:'rgba(37,99,235,0.8)',borderRadius:4,borderSkipped:false,order:2,barPercentage:0.6,categoryPercentage:0.7},
        {type:'bar',label:'Expenditure',data:expData,backgroundColor:'rgba(234,179,8,0.85)',borderRadius:4,borderSkipped:false,order:2,barPercentage:0.6,categoryPercentage:0.7},
        {type:'line',label:'Surplus / Deficit',data:pnlData,
          segment:{borderColor:ctx=>{
            const v0=pnlData[ctx.p0DataIndex], v1=pnlData[ctx.p1DataIndex];
            if(v0===0||v1===0) return '#f59e0b';
            if(v0>0&&v1>0) return '#10b981';
            if(v0<0&&v1<0) return '#ef4444';
            return '#f59e0b'; // crossing zero
          }},
          borderWidth:3,
          pointBackgroundColor:pnlData.map(v=>v>0?'#10b981':v<0?'#ef4444':'#f59e0b'),
          pointRadius:5,pointHoverRadius:7,pointBorderColor:'#fff',pointBorderWidth:2,
          fill:false,tension:0.3,order:1},
      ]},
      options:{
        responsive:true,maintainAspectRatio:false,
        interaction:{mode:'index',intersect:false},
        plugins:{
          legend:{display:false},
          tooltip:{
            backgroundColor:'rgba(255,255,255,0.97)',titleColor:'#0d2137',bodyColor:'#334155',
            borderColor:'rgba(37,99,235,0.2)',borderWidth:1,padding:12,
            titleFont:{size:13,weight:'bold'},bodyFont:{size:12},
            callbacks:{label:ctx=>{const v=ctx.raw;const sign=ctx.dataset.label==='Surplus / Deficit'?(v>=0?'▲ ':'▼ '):'';return ` ${ctx.dataset.label}: ${sign}₹${Math.abs(v).toFixed(2)} Cr`;}}
          }
        },
        scales:{
          x:{grid:{display:false},ticks:{color:'#546e7a',font:{size:11,weight:'600'},maxRotation:30},border:{display:false}},
          y:{grid:{color:'rgba(0,80,120,0.06)'},ticks:{color:'#546e7a',font:{size:11},callback:v=>`₹${v}Cr`},border:{display:false}},
        }
      }
    });
  },[md]);
  return <div style={{position:'relative',height:320}}><canvas ref={canvasRef} role="img" aria-label="Collection vs Expenditure vs Surplus / Deficit chart"/></div>;
};

const PnLTab = ({T, GC, SH, filters, sf, raw}) => {
  const [pnlRaw, setPnlRaw] = React.useState(null);
  const [pnlRangeIdx, setPnlRangeIdx] = React.useState([0, 999]);
  // Use main filters for FY/Quarter/Month
  const fyFilter = filters.fy||'';
  const qFilter = filters.quarter||'';
  const moFilter = filters.month||'';

  React.useEffect(()=>{
    const pf2=getProjectFiles(filters?.project?.split('||')[0]||'');
    fetch(pf2.pnl).then(r=>r.json()).then(d=>setPnlRaw(d)).catch(()=>{});
  },[]);

  const kpi = pnlRaw?.kpi || {};
  const projExp = pnlRaw?.expenditureByCategory || pnlRaw?.projectExpense || [];
  const npExp = [];
  const monthlyColl = pnlRaw?.monthlyCollection || [];

  // FY helper
  const getFY = (mo) => {
    if(!mo) return '';
    const [y,m] = mo.split('-').map(Number);
    return m >= 4 ? `FY${y}-${String(y+1).slice(2)}` : `FY${y-1}-${String(y).slice(2)}`;
  };
  const getQ = (mo) => {
    if(!mo) return '';
    const m = parseInt(mo.split('-')[1]);
    const fy = getFY(mo);
    if([4,5,6].includes(m)) return `Q1 ${fy}`;
    if([7,8,9].includes(m)) return `Q2 ${fy}`;
    if([10,11,12].includes(m)) return `Q3 ${fy}`;
    return `Q4 ${fy}`;
  };
  const fmtMo = (mo) => {
    if(!mo) return '';
    const mn = {1:'Jan',2:'Feb',3:'Mar',4:'Apr',5:'May',6:'Jun',7:'Jul',8:'Aug',9:'Sep',10:'Oct',11:'Nov',12:'Dec'};
    const [y,m] = mo.split('-').map(Number);
    return `${mn[m]}'${String(y).slice(2)}`;
  };

  const allFYs = [...new Set(monthlyColl.map(r=>getFY(r.month)))].sort();
  const allQs = [...new Set(monthlyColl.map(r=>getQ(r.month)))].sort();
  const allMos = monthlyColl.map(r=>r.month).sort();

  const MO_NAME={Jan:'01',Feb:'02',Mar:'03',Apr:'04',May:'05',Jun:'06',Jul:'07',Aug:'08',Sep:'09',Oct:'10',Nov:'11',Dec:'12'};
  const filteredCollBase = (pnlRaw?.monthlyData||[]).filter(r=>{
    if(!r.month||r.month==='NaT')return false;
    if(fyFilter){const fys=fyFilter.split('||').filter(Boolean);if(fys.length&&!fys.some(fy=>getFY(r.month)===fy))return false;}
    if(qFilter){const qs=qFilter.split('||').filter(Boolean).map(q=>q.split(' ')[0]);const moN=parseInt(r.month.split('-')[1]);const Q={Q1:[4,5,6],Q2:[7,8,9],Q3:[10,11,12],Q4:[1,2,3]};if(qs.length&&!qs.some(q=>(Q[q]||[]).includes(moN)))return false;}
    if(moFilter){const mos=moFilter.split('||').filter(Boolean);const moNum=r.month.split('-')[1];if(mos.length&&!mos.some(mn=>MO_NAME[mn]===moNum))return false;}
    return true;
  });
  const pnlMonths = filteredCollBase.map(r=>r.month);
  const pnlSafeL = Math.min(pnlRangeIdx[0], Math.max(0, pnlMonths.length-1));
  const pnlSafeR = Math.min(pnlRangeIdx[1], Math.max(0, pnlMonths.length-1));
  const filteredColl = filteredCollBase.slice(pnlSafeL, pnlSafeR+1);

  const totalRevenue = (fyFilter||qFilter||moFilter)
    ? filteredColl.reduce((s,r)=>s+(r.revenue||0),0)
    : (kpi.totalRevenue||0);
  const totalExpense = (fyFilter||qFilter||moFilter)
    ? filteredColl.reduce((s,r)=>s+(r.expenditure||0),0)
    : (kpi.totalExpenditure||0);
  const pnl = totalRevenue - totalExpense;



  const CC = ['#0097a7','#7c3aed','#10b981','#f59e0b','#ef4444','#1565c0','#e65100','#2e7d32','#d81b60','#37474f','#00838f','#4a148c','#1b5e20','#b71c1c','#e65100','#006064','#33691e'];

  const KpiCard = ({label,value,sub,color='#0097a7',icon}) => (
    <GC style={{padding:'14px 18px'}}>
      <div style={{position:'absolute',top:0,left:0,right:0,height:3,background:color,borderRadius:'14px 14px 0 0'}}/>
      <p style={{fontSize:9,fontWeight:800,color:'#94a3b8',textTransform:'uppercase',letterSpacing:.7,margin:'4px 0 6px'}}>{label}</p>
      <p style={{fontSize:20,fontWeight:900,color:T.navy,margin:'0 0 3px',lineHeight:1}}>{value}</p>
      {sub&&<p style={{fontSize:10,color:T.gray,margin:0}}>{sub}</p>}
    </GC>
  );

  if(!pnlRaw) return (
    <div style={{display:'flex',alignItems:'center',justifyContent:'center',minHeight:300}}>
      <p style={{color:T.gray,fontWeight:600}}>Loading P&L data…</p>
    </div>
  );

  return (
    <div>


      {/* KPI Row */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:10,marginBottom:10}}>
        <KpiCard label="Collection" value={`₹${totalRevenue.toFixed(1)} Cr`} sub="Total received from customers (W/O GST)" color="#0097a7"/>
        <KpiCard label="Total Expenditure (Actual)" value={`₹${totalExpense.toLocaleString('en-IN',{maximumFractionDigits:2})} Cr`} sub="Actual spend to date" color="#ef4444"/>
        <div style={{position:'relative',overflow:'hidden',background:'rgba(255,255,255,0.92)',backdropFilter:'blur(12px)',borderRadius:14,padding:'16px 18px',boxShadow:'0 2px 16px rgba(0,80,120,0.08)',border:`2px solid ${pnl>=0?'#10b981':'#ef4444'}`}}>
          <div style={{position:'absolute',top:0,left:0,right:0,height:4,background:pnl>=0?'linear-gradient(90deg,#10b981,#34d399)':'linear-gradient(90deg,#ef4444,#f87171)',borderRadius:'14px 14px 0 0'}}/>
          <div style={{position:'absolute',right:12,top:12,fontSize:32,opacity:0.12}}>{pnl>=0?'📈':'📉'}</div>
          <p style={{fontSize:9,fontWeight:800,color:'#94a3b8',textTransform:'uppercase',letterSpacing:.7,margin:'4px 0 6px'}}>Surplus / Deficit</p>
          <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:4}}>
            <span style={{fontSize:22,fontWeight:900,color:pnl>=0?'#065f46':'#991b1b',lineHeight:1}}>{pnl>=0?'▲':'▼'} ₹{Math.abs(pnl).toLocaleString('en-IN',{maximumFractionDigits:1})} Cr</span>
          </div>
          <div style={{display:'inline-flex',alignItems:'center',gap:5,background:pnl>=0?'#d1fae5':'#fee2e2',borderRadius:20,padding:'3px 10px'}}>
            <div style={{width:6,height:6,borderRadius:'50%',background:pnl>=0?'#10b981':'#ef4444'}}/>
            <span style={{fontSize:10,fontWeight:800,color:pnl>=0?'#065f46':'#991b1b'}}>{pnl>=0?'SURPLUS':'DEFICIT'}</span>
          </div>
        </div>
      </div>


            {/* Charts Row */}
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16,marginBottom:16}}>


                {/* Project Expense Pie */}
        <GC style={{padding:16}}>
          <SH title="Cost of Construction — Project Expenditure" sub="By category (Actual spend in ₹ Cr)"/>
          {(()=>{const projTotal=projExp.reduce((s,r)=>s+r.Actual,0);return(
          <div style={{display:'flex',gap:16,alignItems:'center'}}>
            <div style={{position:'relative',width:180,height:180,flexShrink:0}}>
              <ResponsiveContainer width={180} height={180}>
                <PieChart>
                  <Pie data={projExp} dataKey="Actual" nameKey="SubCat" cx="50%" cy="50%" outerRadius={80} innerRadius={50}>
                    {projExp.map((_,i)=><Cell key={i} fill={CC[i%CC.length]}/>)}
                  </Pie>
                  <Tooltip formatter={(v)=>`₹${Number(v).toFixed(2)} Cr`}/>
                </PieChart>
              </ResponsiveContainer>
              <div style={{position:'absolute',top:'50%',left:'50%',transform:'translate(-50%,-50%)',textAlign:'center',pointerEvents:'none',whiteSpace:'nowrap'}}>
                <p style={{fontSize:10,fontWeight:700,color:T.gray,margin:0,textTransform:'uppercase',letterSpacing:.4}}>Total</p>
                <p style={{fontSize:16,fontWeight:900,color:T.navy,margin:'2px 0',lineHeight:1}}>₹{projTotal.toFixed(1)}</p>
                <p style={{fontSize:10,fontWeight:700,color:T.gray,margin:0}}>Cr</p>
              </div>
            </div>
            <div style={{flex:1}}>
              {projExp.sort((a,b)=>b.Actual-a.Actual).map((r,i)=>(
                <div key={i} style={{display:'flex',alignItems:'center',gap:7,marginBottom:7}}>
                  <div style={{width:10,height:10,borderRadius:2,background:CC[i%CC.length],flexShrink:0}}/>
                  <span style={{fontSize:13,flex:1,color:T.textM,fontWeight:600}}>{r.SubCat}</span>
                  <span style={{fontSize:13,fontWeight:800,color:T.navy}}>₹{Number(r.Actual).toFixed(2)}Cr</span>
                  <span style={{fontSize:11,color:T.gray,minWidth:36,textAlign:'right'}}>{projTotal>0?(r.Actual/projTotal*100).toFixed(1):0}%</span>
                </div>
              ))}
              <div style={{borderTop:'1px solid #e2e8f0',marginTop:8,paddingTop:8,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                <span style={{fontSize:14,fontWeight:800,color:T.navy}}>Total</span>
                <span style={{fontSize:14,fontWeight:900,color:T.tealD}}>₹{projTotal.toFixed(2)} Cr</span>
              </div>
            </div>
          </div>);})()}
        </GC>

        {/* Non-Project Expense Pie */}
        <GC style={{padding:16}}>
          <SH title="Non-Project Expenditure" sub="By category (Actual spend in ₹ Cr)"/>
          {(()=>{const npFiltered=npExp.filter(r=>r.Actual>0);const npTotal=npFiltered.reduce((s,r)=>s+r.Actual,0);return(
          <div style={{display:'flex',gap:16,alignItems:'center'}}>
            <div style={{position:'relative',width:180,height:180,flexShrink:0}}>
              <ResponsiveContainer width={180} height={180}>
                <PieChart>
                  <Pie data={npFiltered} dataKey="Actual" nameKey="SubCat" cx="50%" cy="50%" outerRadius={80} innerRadius={50}>
                    {npFiltered.map((_,i)=><Cell key={i} fill={CC[(i+6)%CC.length]}/>)}
                  </Pie>
                  <Tooltip formatter={(v)=>`₹${Number(v).toFixed(2)} Cr`}/>
                </PieChart>
              </ResponsiveContainer>
              <div style={{position:'absolute',top:'50%',left:'50%',transform:'translate(-50%,-50%)',textAlign:'center',pointerEvents:'none',whiteSpace:'nowrap'}}>
                <p style={{fontSize:10,fontWeight:700,color:T.gray,margin:0,textTransform:'uppercase',letterSpacing:.4}}>Total</p>
                <p style={{fontSize:16,fontWeight:900,color:T.navy,margin:'2px 0',lineHeight:1}}>₹{npTotal.toFixed(1)}</p>
                <p style={{fontSize:10,fontWeight:700,color:T.gray,margin:0}}>Cr</p>
              </div>
            </div>
            <div style={{flex:1}}>
              {npFiltered.sort((a,b)=>b.Actual-a.Actual).map((r,i)=>(
                <div key={i} style={{display:'flex',alignItems:'center',gap:7,marginBottom:7}}>
                  <div style={{width:10,height:10,borderRadius:2,background:CC[(i+6)%CC.length],flexShrink:0}}/>
                  <span style={{fontSize:13,flex:1,color:T.textM,fontWeight:600}}>{r.SubCat}</span>
                  <span style={{fontSize:13,fontWeight:800,color:T.navy}}>₹{Number(r.Actual).toFixed(2)}Cr</span>
                  <span style={{fontSize:11,color:T.gray,minWidth:36,textAlign:'right'}}>{npTotal>0?(r.Actual/npTotal*100).toFixed(1):0}%</span>
                </div>
              ))}
              <div style={{borderTop:'1px solid #e2e8f0',marginTop:8,paddingTop:8,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                <span style={{fontSize:14,fontWeight:800,color:T.navy}}>Total</span>
                <span style={{fontSize:14,fontWeight:900,color:T.tealD}}>₹{npTotal.toFixed(2)} Cr</span>
              </div>
            </div>
          </div>);})()}
        </GC>
      </div>

      {/* Revenue vs Expense vs P&L Chart — Chart.js */}
      <GC style={{padding:20,marginBottom:16}}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:12,flexWrap:'wrap',gap:8}}>
          <div>
            <p style={{fontSize:12,fontWeight:800,color:T.tealD,letterSpacing:.4,margin:0,textTransform:'uppercase'}}>Revenue vs Expenditure vs Surplus / Deficit</p>
            <p style={{fontSize:10,color:T.gray,margin:'2px 0 0'}}>Monthly comparison · ₹ Cr · Mar 2025 onwards</p>
          </div>
          <div style={{display:'flex',gap:16}}>
            {[['#2563eb','Collection',''],['#eab308','Expenditure',''],['#10b981','Surplus / Deficit (↑green ↓red)','- -']].map(([col,lbl,dash])=>(
              <div key={lbl} style={{display:'flex',alignItems:'center',gap:5,fontSize:11,color:T.textM}}>
                {dash?<svg width="22" height="3"><line x1="0" y1="1.5" x2="22" y2="1.5" stroke={col} strokeWidth="2.5" strokeDasharray="6 3"/></svg>:<div style={{width:12,height:12,borderRadius:2,background:col}}/>}
                <span style={{fontWeight:600}}>{lbl}</span>
              </div>
            ))}
          </div>
        </div>
        <MonthRangeSlider
          months={pnlMonths}
          rangeIdx={pnlRangeIdx}
          setRangeIdx={setPnlRangeIdx}
          onReset={()=>setPnlRangeIdx([0,999])}
        />
<PnLChart md={filteredColl}/>
      </GC>


      {/* ── Project at a Glance Bar Card ── */}
        {(()=>{
          const selProjs = filters.project ? filters.project.split('||').filter(Boolean) : [];
          const invr     = (raw?.invr||[]).filter(u=>!selProjs.length||selProjs.includes(u.project));
          const booked   = invr.filter(u=>u.status==='Booked');
          const areaSqft = booked.reduce((s,u)=>s+(u.carpetArea||u.superArea||0),0);
          const dkAll    = raw?.dappKpi?.kpi?.all || {};

          const bars = [
            { label:'Units Sold',        rawVal: booked.length,                    display:`${booked.length}`,          unit:'units',  color:'#0097a7' },
            { label:'Area Sold',         rawVal: areaSqft/1000,                    display:`${(areaSqft/100000).toFixed(2)}L`,unit:'L sqft',color:'#7c3aed' },
            { label:'Revenue',           rawVal: totalRevenue,                     display:`₹${totalRevenue.toFixed(0)}`,unit:'Cr',    color:'#10b981' },
            { label:'Collection (W/GST)',rawVal: dkAll.totalReceivedBank||0,       display:`₹${(dkAll.totalReceivedBank||0).toFixed(0)}`,unit:'Cr',color:'#0891b2' },
            { label:'Collection (W/O GST)',rawVal:dkAll.totalReceivedWoT||0,      display:`₹${(dkAll.totalReceivedWoT||0).toFixed(0)}`,unit:'Cr',color:'#06b6d4' },
            { label:'Expenditure',       rawVal: totalExpense,                     display:`₹${totalExpense.toFixed(0)}`,unit:'Cr',    color:'#ef4444' },
            { label:'Outstanding',       rawVal: dkAll.totalOutstanding||0,        display:`₹${(dkAll.totalOutstanding||0).toFixed(1)}`,unit:'Cr',color:'#f59e0b' },
            { label:'Surplus',           rawVal: pnl,                              display:`₹${pnl.toFixed(0)}`,         unit:'Cr',    color: pnl>=0?'#059669':'#dc2626' },
          ];
          const maxVal = Math.max(...bars.map(b=>b.rawVal), 1);

          return (
            <GC style={{padding:'16px 18px'}}>
              <p style={{fontSize:11,fontWeight:900,color:T.tealD,margin:'0 0 14px',textTransform:'uppercase',letterSpacing:0.5}}>
                Project at a Glance
              </p>
              <div style={{display:'flex',alignItems:'flex-end',gap:10,height:140,padding:'0 4px'}}>
                {bars.map(({label,rawVal,display,unit,color})=>{
                  const pct = Math.max((rawVal/maxVal)*100, rawVal>0?3:0);
                  return (
                    <div key={label} style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',gap:4,height:'100%',justifyContent:'flex-end'}}>
                      {/* Value label above bar */}
                      <span style={{fontSize:9,fontWeight:900,color,whiteSpace:'nowrap',marginBottom:2}}>{display}</span>
                      {/* Bar */}
                      <div style={{width:'100%',height:`${pct}%`,background:color,borderRadius:'5px 5px 0 0',
                        minHeight: rawVal>0?4:0,
                        boxShadow:`0 -2px 8px ${color}44`,
                        transition:'height 0.6s ease',position:'relative'}}>
                        <div style={{position:'absolute',inset:0,background:'linear-gradient(180deg,rgba(255,255,255,0.15),transparent)',borderRadius:'5px 5px 0 0'}}/>
                      </div>
                      {/* Label below */}
                      <span style={{fontSize:7.5,fontWeight:700,color:T.textM,textAlign:'center',lineHeight:1.2,marginTop:4}}>{label}</span>
                    </div>
                  );
                })}
              </div>
              {/* Bottom baseline */}
              <div style={{height:1,background:'rgba(0,100,140,0.1)',marginTop:4}}/>
            </GC>
          );
        })()}

    </div>
  );
};

export default function App() {
  return <AppErrorBoundary><AppInner/></AppErrorBoundary>;
}


const getProjectFiles = (project) => {
  if(project && project.includes('SKY ARC')) return {dapp:'/data/skyarc_dapp_kpi.json', pnl:'/data/skyarc_pnl.json'};
  return {dapp:'/data/dapp_kpi.json', pnl:'/data/pnl_data.json'};
};

function AppInner() {
  const [authed, setAuthed] = useState(()=>sessionStorage.getItem('sd_auth')==='1');
  const [raw,setRaw]=useState(null);
  const [loading,setLoading]=useState(true);
  const [tab,setTab]=useState('overview'); // overview | collections | pipeline
  useEffect(()=>{ window.scrollTo({top:0,behavior:'instant'}); },[tab]);

  const [filters,setFilters]=useState({company:'',project:'SMARTWORLD THE EDITION',month:'',quarter:'',broker:'',typology:'',fy:''});
  const sf=useCallback((k,v)=>setFilters(p=>({...p,[k]:v})),[]);
  // Chart controls (lifted to comply with React hooks rules)
  const [tMode,setTMode]=useState('monthly');
  const [tOff,setTOff]=useState(9999);
  const [bMode,setBMode]=useState('monthly');
  const [bOff,setBOff]=useState(9999);
  const [sMode,setSMode]=useState('monthly');
  const [sOff,setSOff]=useState(9999);
  const [uMode,setUMode]=useState('monthly');
  const [tsvMode,setTsvMode]=useState('monthly');
  const [rMode,setRMode]=useState('monthly');
  const [suMode,setSuMode]=useState('monthly');
  const [cancelTab,setCancelTab]=useState('overview');
  const [showTowerType,setShowTowerType]=useState(false);
  // Chart month range slider (independent of top filters, only affects the 4 Sales & Pricing Trend charts)
  const ALL_CHART_MONTHS=useMemo(()=>{
    if(!raw) return [];
    const ms=new Set([
      ...(raw.pdrn||[]).map(r=>r.bookingMonth).filter(Boolean),
      ...(raw.monthlyTargets||[]).map(t=>t.month).filter(Boolean),
    ]);
    return Array.from(ms).sort();
  },[raw]);
  // Filtered months for the chart range slider — respects FY/quarter/month filters
  const FILTERED_CHART_MONTHS=useMemo(()=>{
    if(!raw) return ALL_CHART_MONTHS;
    const hasFYFilter=!!(filters.fy||filters.quarter||filters.month);
    if(!hasFYFilter) return ALL_CHART_MONTHS;
    const selectedFYs2=filters.fy?filters.fy.split('||').filter(Boolean):[];
    const fyRange2=(fy)=>{const m=fy.match(/FY(\d{4})-(\d{2})/);if(!m)return null;const sy=parseInt(m[1]);return{start:`${sy}-04`,end:`${sy+1}-03`};};
    const inFY2=(mo)=>{if(!selectedFYs2.length)return true;return selectedFYs2.some(fy=>{const r=fyRange2(fy);return r&&mo>=r.start&&mo<=r.end;});};
    const FYQ2={'Q1':['04','05','06'],'Q2':['07','08','09'],'Q3':['10','11','12'],'Q4':['01','02','03']};
    const matchMo2=(mo)=>{
      if(!mo)return false;
      const moNum=mo.slice(5,7);
      if(filters.month){const mons=filters.month.split('||').filter(Boolean);const moNames={Jan:'01',Feb:'02',Mar:'03',Apr:'04',May:'05',Jun:'06',Jul:'07',Aug:'08',Sep:'09',Oct:'10',Nov:'11',Dec:'12'};if(mons.length&&!mons.some(mn=>moNames[mn]===moNum))return false;}
      if(filters.quarter){const qs=filters.quarter.split('||').filter(Boolean);if(qs.length&&!qs.some(q=>(FYQ2[q]||[]).includes(moNum)))return false;}
      return true;
    };
    return ALL_CHART_MONTHS.filter(mo=>inFY2(mo)&&matchMo2(mo));
  },[ALL_CHART_MONTHS,raw,filters.fy,filters.quarter,filters.month]);
  const [chartRangeIdx,setChartRangeIdx]=useState([0,999]);
  const chartMonthFrom=FILTERED_CHART_MONTHS[Math.min(chartRangeIdx[0],FILTERED_CHART_MONTHS.length-1)]||'';
  const chartMonthTo=FILTERED_CHART_MONTHS[Math.min(chartRangeIdx[1],FILTERED_CHART_MONTHS.length-1)]||'';
  const chartRangeMonths=(()=>{const l=Math.min(chartRangeIdx[0],FILTERED_CHART_MONTHS.length-1);const r=Math.min(chartRangeIdx[1],FILTERED_CHART_MONTHS.length-1);return Math.max(0,r-l+1);})();
  const chartRangeCompact=chartRangeMonths>0&&chartRangeMonths<=12;
  // Sales & Pricing Trend chart offsets (must be at component level — hooks rules)
  const TODAY_LABEL=(()=>{const d=new Date();return d.toLocaleString('en-US',{month:'short'}).slice(0,3)+"'"+String(d.getFullYear()).slice(2);})();
  // Reset chart offsets to -1 (auto-center) whenever filters change
  useEffect(()=>{setAllOff(-1);setChartOff(-1);setCpScroll(0);setCpScroll2(0);setChartRangeIdx([0,999]);},[filters.project,filters.fy,filters.quarter,filters.month,filters.broker]);
  // Initialize offset so current month is bar #2 (index 1 in view), show 1 past + current + 11 future
  const _initOff=(data,WIN=13)=>{const idx=data.findIndex(d=>d.label===TODAY_LABEL);return idx>=1?idx-1:Math.max(0,idx);};
  const [uOff,setUOff]=useState(-1);
  const [tsvOff,setTsvOff]=useState(-1);
  const [rOff,setROff]=useState(-1);
  const [suOff,setSuOff]=useState(-1);
  // Shared scroll offset for all 4 trend charts — scrolling one syncs all
  const [chartOff,setChartOff]=useState(-1);
  const setAllOff=(v)=>{setChartOff(v);};
  const [towerExpanded,setTowerExpanded]=useState(false);
  const [activeFilter,setActiveFilter]=useState(null);
  // Close filter dropdown on outside click
  React.useEffect(()=>{
    const h=()=>setActiveFilter(null);
    document.addEventListener('click',h);
    return()=>document.removeEventListener('click',h);
  },[]);
  const [cpExpanded,setCpExpanded]=useState(false);
  const [cpScroll,setCpScroll]=useState(0);
  const [cpScroll2,setCpScroll2]=useState(0);
  const [showAllT,setShowAllT]=useState(false);

  useEffect(()=>{
    Promise.all([
      fetch('/data/dashboard_data.json').then(r=>r.json()),
      fetch('/data/dapp_kpi.json').then(r=>r.json()).catch(()=>({})),
      fetch('/data/pnl_data.json').then(r=>r.json()).catch(()=>({})),
      // project-specific files loaded dynamically in CollectionsTab/PnLTab
    ]).then(([d, dappKpi, pnlData])=>{
      d.dappKpi = dappKpi;
      window.__dappKpi  = dappKpi;
      window.__dappKpi2 = dappKpi;   // used by cards
      window.__pnlKpi   = pnlData?.kpi || {};
      setRaw(d);
      setLoading(false);
      const firstProj=(d.filterOptions?.projects||[])[0]||'SMARTWORLD THE EDITION';
      setFilters(f=>({...f,project:f.project||firstProj}));
    }).catch(()=>setLoading(false));
  }, []);

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
  // Unfiltered (project-only) versions for KPI cards — ignore FY/quarter/month/broker/typology
  const pAAll=useMemo(()=>{if(!raw?.pdrn)return[];const projs=filters.project?filters.project.split('||').filter(Boolean):[];return raw.pdrn.filter(r=>r.status==='ACTIVE'&&(!filters.company||r.companyNorm===filters.company)&&(!projs.length||projs.includes(r.project)));},[raw,filters.project,filters.company]);
  const pCAll=useMemo(()=>{if(!raw?.pdrn)return[];const projs=filters.project?filters.project.split('||').filter(Boolean):[];return raw.pdrn.filter(r=>r.status==='CANCELLED'&&(!filters.company||r.companyNorm===filters.company)&&(!projs.length||projs.includes(r.project)));},[raw,filters.project,filters.company]);
  const iFAll=useMemo(()=>{if(!raw?.invr)return[];const projs=filters.project?filters.project.split('||').filter(Boolean):[];return raw.invr.filter(r=>(!filters.company||r.companyNorm===filters.company)&&(!projs.length||projs.includes(r.project)));},[raw,filters.project,filters.company]);
  const dF=useMemo(()=>{if(!raw?.dapp)return[];return raw.dapp.filter(r=>{if(filters.company&&r.companyNorm!==filters.company)return false;if(filters.project){const projs=filters.project.split('||').filter(Boolean);if(projs.length&&!projs.includes(r.project))return false;}if((filters.month||filters.quarter)&&!matchMo(r.billMonth))return false;return true;});},[raw,filters,matchMo]);
  // Unfiltered demand data (project-only) for KPI received/outstanding cards
  const dFAll=useMemo(()=>{if(!raw?.dapp)return[];const projs=filters.project?filters.project.split('||').filter(Boolean):[];return raw.dapp.filter(r=>(!filters.company||r.companyNorm===filters.company)&&(!projs.length||projs.includes(r.project)));},[raw,filters.project,filters.company]);
  const iF=useMemo(()=>{if(!raw?.invr)return[];return raw.invr.filter(r=>{
    if(filters.company&&r.companyNorm!==filters.company)return false;
    if(filters.project){const projs=filters.project.split('||').filter(Boolean);if(projs.length&&!projs.includes(r.project))return false;}
    if(filters.typology){const typos=filters.typology.split('||').filter(Boolean);if(typos.length){const b=r.bhk||'';if(!typos.includes(b))return false;}}
    return true;
  });},[raw,filters]);
  const wF=useMemo(()=>{if(!raw?.workflow)return[];return raw.workflow.filter(r=>{if(filters.company&&r.companyNorm!==filters.company)return false;if(filters.project){const projs=filters.project.split('||').filter(Boolean);if(projs.length&&!projs.includes(r.project))return false;}return true;});},[raw,filters]);

  const availBrokers=useMemo(()=>{const selProjs=filters.project?filters.project.split('||').filter(Boolean):[];if(selProjs.length>0){// Only show brokers with ACTIVE bookings in selected project(s)
const cnt={};(raw?.pdrn||[]).forEach(r=>{if(!selProjs.includes(r.project))return;if(r.status!=='ACTIVE')return;if(r.brokerName)cnt[r.brokerName]=(cnt[r.brokerName]||0)+1;});return Object.entries(cnt).sort((a,b)=>b[1]-a[1]).map(e=>e[0]);}const src=raw?.pdrn||[];const cnt={};src.forEach(r=>{if(r.status!=='ACTIVE')return;if(filters.company&&r.companyNorm!==filters.company)return;if(r.brokerName)cnt[r.brokerName]=(cnt[r.brokerName]||0)+1;});return Object.entries(cnt).sort((a,b)=>b[1]-a[1]).slice(0,50).map(e=>e[0]);},[raw,filters.project,filters.company]);
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

  const kpi=useMemo(()=>{
    const dk   = raw?.kpiExtra   || {};
    const dkap = raw?.dappKpi?.kpi?.all || {};
    const tS=pA.reduce((s,r)=>s+(r.bsp||0),0);
    const ws={APPROVED:0,PENDING:0,REJECTED:0};
    wF.forEach(r=>{if(ws[r.status]!==undefined)ws[r.status]++;});
    return{
      totalUnits:       iFAll.length,
      bookedUnits:      iFAll.filter(r=>r.status==='Booked').length,
      availableUnits:   iFAll.filter(r=>r.status==='Available').length,
      inProgressUnits:  iFAll.filter(r=>r.status==='In Progress').length,
      totalSales:       tS,
      // Demand/collection from dapp_kpi.json (most accurate)
      dappDemand:       (dkap.totalInstallment||0)*1e7,
      dappReceived:     (dkap.totalReceivedWoT||0)*1e7,
      dappOutstanding:  (dkap.totalOutstanding||0)*1e7,
      activeBookings:   pAAll.length,
      cancelledBookings:pCAll.length,
      pipelineBookings: wF.filter(r=>r.status==='PENDING').length,
      wfApproved:ws.APPROVED,wfPending:ws.PENDING,wfRejected:ws.REJECTED,
    };
  },[pAAll,pCAll,dFAll,iFAll,wF,raw]);

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
    const dk = raw?.kpiExtra || {};
    // Areas from kpiExtra (pre-computed from actual Excel)
    const bookedAreaSqft = dk.bookedAreaSqft || pAAll.reduce((s,r)=>s+(r.superArea||0),0);
    const carpetAreaSqft = dk.carpetAreaSqft || pAAll.reduce((s,r)=>s+(r.carpet||r.carpetArea||0),0);
    const availAreaSqft  = iFAll.filter(r=>r.status==='Available').reduce((s,r)=>s+(r.superArea||0),0);
    const totalSuperArea = iFAll.reduce((s,r)=>s+(r.superArea||0),0);
    // BSP/TCV from pdrn (active bookings) — most accurate
    const totalBSPCr     = dk.totalBSPCr  || +(pAAll.reduce((s,r)=>s+(r.bsp||0),0)/1e7).toFixed(1);
    const totalTCVCr     = dk.totalTCVCr  || totalBSPCr;
    const cancelledBSPCr = dk.cancelledBSPCr || +(pCAll.reduce((s,r)=>s+(r.bsp||0),0)/1e7).toFixed(1);
    const cancelledAreaSqft = pCAll.reduce((s,r)=>s+(r.superArea||0),0);
    // Avg rate from kpiExtra (most reliable) or computed
    const avgRatePerSqft = dk.avgRatePerSqft || (bookedAreaSqft>0 ? Math.round(totalTCVCr*1e7/bookedAreaSqft) : 0);
    // Unsold value = available units × avg rate (available bsp not in invr)
    const unsoldValueCr  = +(availAreaSqft * avgRatePerSqft / 1e7).toFixed(1);
    // Total project = sold TCV + estimated unsold
    const totalProjCr    = +(totalTCVCr + unsoldValueCr).toFixed(1);
    const soldPctValue   = totalProjCr>0 ? Math.round(totalTCVCr/totalProjCr*100) : 0;
    return {
      bookedAreaSqft, carpetAreaSqft, availAreaSqft, totalSuperArea,
      totalBSPCr, totalTCVCr, cancelledBSPCr, cancelledAreaSqft,
      avgRatePerSqft, unsoldValueCr, totalProjCr, soldPctValue,
    };
  },[pAAll,pCAll,iFAll,raw]);
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
  const topCP=useMemo(()=>{const map={};pA.forEach(r=>{const b=r.brokerName;if(!b)return;if(!map[b])map[b]={name:b,units:0,bspCr:0,area:0};map[b].units++;map[b].bspCr+=(r.bsp||0)/1e7;map[b].area+=(r.superArea||0);});return Object.values(map).sort((a,b)=>b.units-a.units).map(r=>({...r,bspCr:+r.bspCr.toFixed(1),avgRate:r.area>0?Math.round(r.bspCr*1e7/r.area):0}));},[pA]);
  const bhkS=useMemo(()=>{
    const map={};
    // Booked from pdrn (filtered) — track area sum
    const areaMap={};
    pAAll.forEach(r=>{const b=r.bhk||'Other';if(!map[b])map[b]={bhk:b,booked:0,total:0};map[b].booked++;if(!areaMap[b])areaMap[b]={sum:0,count:0};if(r.superArea>0){areaMap[b].sum+=r.superArea;areaMap[b].count++;};});
    // Total from inventory (project-only filtered)
    iFAll.forEach(r=>{const b=r.bhk||'Other';if(!map[b])map[b]={bhk:b,booked:0,total:0};map[b].total++;});
    return Object.values(map).sort((a,b)=>b.booked-a.booked).map(r=>({...r,available:Math.max(0,r.total-r.booked),avgArea:areaMap[r.bhk]?.count>0?Math.round(areaMap[r.bhk].sum/areaMap[r.bhk].count):0}));
  },[pAAll,iFAll]);
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

    // Filter targets by project + FY + quarter/month + chart slider range
    const targets=allTargets.filter(t=>{
      if(t.projectFilter){
        if(selectedProjects.length===0)return false;
        if(!selectedProjects.some(p=>p.toUpperCase()===t.projectFilter.toUpperCase()))return false;
      }
      if(selectedFYs.length&&!inFY(t.month))return false;
      if(filters.quarter||filters.month){if(!matchMo(t.month))return false;}
      // Chart slider range filter
      if(chartMonthFrom&&t.month<chartMonthFrom)return false;
      if(chartMonthTo&&t.month>chartMonthTo)return false;
      return true;
    });

    // Build actual data maps from filtered pA
    const unitMap={},areaMap={},bspMap={};
    pA.filter(r=>r.bookingMonth&&(!selectedFYs.length||inFY(r.bookingMonth))&&(!filters.quarter&&!filters.month||matchMo(r.bookingMonth))&&(!chartMonthFrom||r.bookingMonth>=chartMonthFrom)&&(!chartMonthTo||r.bookingMonth<=chartMonthTo)).forEach(r=>{
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
  },[monthly,raw,pA,filters,matchMo,TODAY_LABEL,chartMonthFrom,chartMonthTo]);

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
  const tabs=[{k:'overview',l:'Overview'},{k:'collections',l:'Demands & Collections'},{k:'pnl',l:'P&L'}];

  return (
    <div style={{minHeight:'100vh',backgroundImage:'url(/bg.jpg)',backgroundSize:'cover',backgroundPosition:'center',backgroundAttachment:'fixed',fontFamily:'Inter,sans-serif',color:T.text}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap');
        *{box-sizing:border-box;scrollbar-width:thin;scrollbar-color:rgba(0,151,167,0.3) transparent}
        ::-webkit-scrollbar{width:4px;height:4px}::-webkit-scrollbar-thumb{background:rgba(0,151,167,0.4);border-radius:2px}
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes fadeIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}
        @keyframes flipOut{0%{opacity:1;transform:rotateY(0deg) scale(1)}40%{opacity:0;transform:rotateY(90deg) scale(0.95)}100%{opacity:0;transform:rotateY(90deg) scale(0.95)}}
        input[type=range]::-webkit-slider-thumb{-webkit-appearance:none;width:14px;height:14px;border-radius:50%;background:#0097a7;border:2px solid #fff;box-shadow:0 1px 4px rgba(0,151,167,0.4);cursor:pointer;margin-top:-5px;}
        input[type=range]::-moz-range-thumb{width:14px;height:14px;border-radius:50%;background:#0097a7;border:2px solid #fff;box-shadow:0 1px 4px rgba(0,151,167,0.4);cursor:pointer;}
        input[type=range]::-webkit-slider-runnable-track{height:4px;background:transparent;}
        @keyframes flipIn{0%{opacity:0;transform:rotateY(-90deg) scale(0.95)}60%{opacity:1;transform:rotateY(0deg) scale(1)}100%{opacity:1;transform:rotateY(0deg) scale(1)}}
        .flip-container{perspective:1200px;transform-style:preserve-3d;}
        .kc{transition:transform 0.2s ease,box-shadow 0.2s ease}.kc:hover{transform:translateY(-2px);box-shadow:0 8px 32px rgba(0,80,120,0.18)!important}
        .chart-slider-track{flex:1;height:12px;background:rgba(0,151,167,0.08);border-radius:6px;cursor:pointer;position:relative;box-shadow:inset 0 1px 3px rgba(0,0,0,0.08);transition:background 0.2s ease}
        .chart-slider-track:hover{background:rgba(0,151,167,0.14)}
        .chart-slider-thumb{position:absolute;height:100%;background:linear-gradient(90deg,#0097a7,#26c6da);border-radius:6px;cursor:grab;box-shadow:0 2px 8px rgba(0,151,167,0.35);transition:left 0.18s cubic-bezier(0.25,0.46,0.45,0.94),width 0.18s ease,box-shadow 0.2s ease}
        .chart-slider-thumb:hover{box-shadow:0 3px 14px rgba(0,151,167,0.55);background:linear-gradient(90deg,#00838f,#0097a7,#26c6da)}
        .chart-slider-thumb:active,.chart-slider-thumb.dragging{cursor:grabbing;box-shadow:0 4px 20px rgba(0,151,167,0.65);background:linear-gradient(90deg,#006064,#0097a7,#4dd0e1);transition:none}
        .chart-slider-btn{width:26px;height:26px;border-radius:50%;border:1.5px solid rgba(0,151,167,0.25);background:rgba(255,255,255,0.9);cursor:pointer;font-size:14px;display:flex;align-items:center;justify-content:center;transition:all 0.18s ease;flex-shrink:0;color:#0097a7;box-shadow:0 1px 4px rgba(0,0,0,0.08)}
        .chart-slider-btn:hover:not(:disabled){background:#0097a7;color:white;border-color:#0097a7;box-shadow:0 3px 10px rgba(0,151,167,0.4);transform:scale(1.08)}
        .chart-slider-btn:active:not(:disabled){transform:scale(0.95)}
        .chart-slider-btn:disabled{color:#ccc;cursor:default;border-color:rgba(0,0,0,0.08);box-shadow:none}
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
          <FSel label="Project"    options={availProj}                           value={filters.project}  onChange={v=>sf('project',v)}   multi={true} openId="project"    activeOpen={activeFilter} setActiveOpen={setActiveFilter} mandatory={true}/>
          <FSel label="Fin. Year"  options={fo.financialYears||[]}               value={filters.fy}       onChange={v=>sf('fy',v)}         multi={true} openId="fy"         activeOpen={activeFilter} setActiveOpen={setActiveFilter}/>
          <FSel label="Quarter"       options={FY_QUARTERS}                              value={filters.quarter}  onChange={v=>sf('quarter',v)}    multi={true} openId="quarter"    activeOpen={activeFilter} setActiveOpen={setActiveFilter}/>
          <FSel label="Month"        options={MONTHS_LIST}                              value={filters.month}    onChange={v=>sf('month',v)}      multi={true} openId="month"      activeOpen={activeFilter} setActiveOpen={setActiveFilter}/>
          {tab!=='pnl'&&<FSel label="CP"         options={availBrokers}                         value={filters.broker}   onChange={v=>sf('broker',v)}     multi={true} openId="cp"         activeOpen={activeFilter} setActiveOpen={setActiveFilter}/>}
          {tab!=='pnl'&&<FSel label="Typology"   options={availTypologies}                      value={filters.typology} onChange={v=>sf('typology',v)}   multi={true} openId="typology"   activeOpen={activeFilter} setActiveOpen={setActiveFilter}/>}
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

        {/* ── Summary Bar — always visible across all tabs ── */}
        

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
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr auto',gap:10,alignItems:'stretch'}}>

              {/* CARD A: Units — pie chart with booked+available */}
              <GC style={{padding:14}} cls="kc">
                <SH title="Total Units" compact/>
                <div style={{display:'flex',alignItems:'center',gap:12}}>
                  <div style={{width:110,height:110,flexShrink:0,position:'relative'}}>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={[{name:'Booked',value:kpi.bookedUnits||0},{name:'Available',value:kpi.availableUnits||0}]}
                          cx="50%" cy="50%" innerRadius={33} outerRadius={52} paddingAngle={3} dataKey="value" strokeWidth={2} stroke="rgba(255,255,255,0.9)" labelLine={false}>
                          <Cell fill={T.teal}/><Cell fill={T.amber}/>
                        </Pie>
                        <Tooltip content={<CTip/>}/>
                      </PieChart>
                    </ResponsiveContainer>
                    <div style={{position:'absolute',inset:0,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',pointerEvents:'none'}}>
                      <span style={{fontSize:14,fontWeight:900,color:T.tealD,lineHeight:1}}>{kpi.totalUnits>0?Math.round((kpi.bookedUnits/kpi.totalUnits)*100):0}%</span>
                      <span style={{fontSize:8,fontWeight:700,color:T.textM}}>SOLD</span>
                    </div>
                  </div>
                  <div style={{flex:1,display:'flex',flexDirection:'column',gap:6}}>
                    <div>
                      <p style={{fontSize:8,color:T.textM,fontWeight:700,margin:'0 0 2px',textTransform:'uppercase'}}>Total</p>
                      <p style={{fontSize:22,fontWeight:900,color:T.navy,margin:0,letterSpacing:-1}}>{kpi.totalUnits?.toLocaleString('en-IN')}</p>
                    </div>
                    <div style={{display:'flex',gap:8}}>
                      <div style={{flex:1,background:`${T.teal}0d`,borderRadius:6,padding:'5px 8px'}}>
                        <p style={{fontSize:8,color:T.textM,fontWeight:700,margin:'0 0 2px'}}>Booked</p>
                        <p style={{fontSize:16,fontWeight:900,color:T.tealD,margin:0}}>{kpi.bookedUnits?.toLocaleString('en-IN')}</p>
                      </div>
                      <div style={{flex:1,background:`${T.amber}0d`,borderRadius:6,padding:'5px 8px'}}>
                        <p style={{fontSize:8,color:T.textM,fontWeight:700,margin:'0 0 2px'}}>Available</p>
                        <p style={{fontSize:16,fontWeight:900,color:T.amber,margin:0}}>{kpi.availableUnits?.toLocaleString('en-IN')}</p>
                      </div>
                    </div>
                  </div>
                </div>
                <div style={{position:'absolute',bottom:0,left:0,right:0,height:3,background:`linear-gradient(90deg,${T.teal},${T.amber})`,borderRadius:'0 0 14px 14px'}}/>
              </GC>

              {/* CARD B: Area — pie chart with sold+available */}
              <GC style={{padding:14}} cls="kc">
                <SH title="Area (Lakh sq ft)" compact/>
                {(()=>{
                  const sold=kpiEx.bookedAreaSqft||0;
                  const avail=kpiEx.availAreaSqft||0;
                  // Use only saleable area (booked + available) — exclude management units
                  const tot=sold+avail;
                  const pct=tot>0?Math.round((sold/tot)*100):0;
                  return(
                    <div style={{display:'flex',alignItems:'center',gap:12}}>
                      <div style={{width:110,height:110,flexShrink:0,position:'relative'}}>
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie data={[{name:'Sold',value:sold||0.01},{name:'Available',value:avail||0.01}]}
                              cx="50%" cy="50%" innerRadius={33} outerRadius={52} paddingAngle={3} dataKey="value" strokeWidth={2} stroke="rgba(255,255,255,0.9)" labelLine={false}>
                              <Cell fill={T.teal}/><Cell fill={T.amber}/>
                            </Pie>
                            <Tooltip content={<CTip fmt={v=>(v/100000).toFixed(2)+' L sqft'}/>}/>
                          </PieChart>
                        </ResponsiveContainer>
                        <div style={{position:'absolute',inset:0,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',pointerEvents:'none'}}>
                          <span style={{fontSize:14,fontWeight:900,color:T.tealD,lineHeight:1}}>{pct}%</span>
                          <span style={{fontSize:8,fontWeight:700,color:T.textM}}>SOLD</span>
                        </div>
                      </div>
                      <div style={{flex:1,display:'flex',flexDirection:'column',gap:6}}>
                        <div>
                          <p style={{fontSize:8,color:T.textM,fontWeight:700,margin:'0 0 2px',textTransform:'uppercase'}}>Saleable Area</p>
                          <p style={{fontSize:20,fontWeight:900,color:T.navy,margin:0,letterSpacing:-0.5}}>{(tot/100000).toFixed(2)} L sqft</p>
                          <p style={{fontSize:8,color:T.textM,margin:'2px 0 0'}}>Booked carpet: {(kpiEx.carpetAreaSqft/100000).toFixed(2)} L sqft</p>
                        </div>
                        <div style={{display:'flex',gap:8}}>
                          <div style={{flex:1,background:`${T.teal}0d`,borderRadius:6,padding:'5px 8px'}}>
                            <p style={{fontSize:8,color:T.textM,fontWeight:700,margin:'0 0 2px'}}>Sold</p>
                            <p style={{fontSize:15,fontWeight:900,color:T.tealD,margin:0}}>{(sold/100000).toFixed(2)}L</p>
                          </div>
                          <div style={{flex:1,background:`${T.amber}0d`,borderRadius:6,padding:'5px 8px'}}>
                            <p style={{fontSize:8,color:T.textM,fontWeight:700,margin:'0 0 2px'}}>Available</p>
                            <p style={{fontSize:15,fontWeight:900,color:T.amber,margin:0}}>{(avail/100000).toFixed(2)}L</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })()}
                <div style={{position:'absolute',bottom:0,left:0,right:0,height:3,background:`linear-gradient(90deg,${T.teal},${T.amber})`,borderRadius:'0 0 14px 14px'}}/>
              </GC>

              {/* CARD C: Total Potential Sales Value — Sold + Unsold */}
              <GC style={{padding:12}} cls="kc">
                <SH title="Total Sales Value (₹Cr)" compact/>
                {(()=>{
                  // All values from kpiEx (sourced from dapp_kpi.json / invr Excel)
                  const dkAll = raw?.dappKpi?.kpi?.all || {};
                  const bookedTCV      = +kpiEx.totalTCVCr;
                  const unsoldBSP      = +kpiEx.unsoldValueCr;
                  const totalPotential = +kpiEx.totalProjCr;
                  const soldPct        = kpiEx.soldPctValue || 0;
                  const availUnits     = iFAll.filter(r=>r.status==='Available').length;
                  const installmentTotal = dkAll.totalInstallment || 0;
                  const totalReceived    = dkAll.totalReceivedWoT || 0;
                  const upcomingAmt      = dkAll.totalOutstanding || 0;
                  const collectedPct     = installmentTotal>0?Math.round(totalReceived/installmentTotal*100):0;
                  const collectedDisplay = collectedPct>100?`${collectedPct}% (incl. advance)`:collectedPct+'%';
                  return(
                    <div style={{display:'flex',flexDirection:'column',gap:6}}>
                      {/* Row 1: donut + sold/unsold */}
                      <div style={{display:'flex',alignItems:'center',gap:8}}>
                        <div style={{width:72,height:72,flexShrink:0,position:'relative'}}>
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie data={[{name:'Sold',value:bookedTCV||0.01},{name:'Unsold',value:unsoldBSP||0.01}]}
                                cx="50%" cy="50%" innerRadius={20} outerRadius={34} paddingAngle={3} dataKey="value" strokeWidth={1.5} stroke="rgba(255,255,255,0.9)" labelLine={false}>
                                <Cell fill={T.teal}/><Cell fill={T.amber}/>
                              </Pie>
                              <Tooltip content={<CTip fmt={v=>'₹'+v.toFixed(2)+' Cr'}/>}/>
                            </PieChart>
                          </ResponsiveContainer>
                          <div style={{position:'absolute',inset:0,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',pointerEvents:'none'}}>
                            <span style={{fontSize:9,fontWeight:900,color:T.tealD,lineHeight:1}}>{soldPct}%</span>
                            <span style={{fontSize:5,fontWeight:700,color:T.textM}}>Sold</span>
                          </div>
                        </div>
                        <div style={{flex:1,display:'flex',flexDirection:'column',gap:3}}>
                          <div style={{display:'flex',justifyContent:'space-between',alignItems:'baseline'}}>
                            <span style={{fontSize:7,color:T.textM,fontWeight:700}}>TOTAL PROJECT SALES VALUE</span>
                            <span style={{fontSize:11,fontWeight:900,color:T.navy}}>₹{totalPotential.toFixed(0)} Cr</span>
                          </div>
                          <div style={{display:'flex',gap:4}}>
                            <div style={{flex:1,background:`${T.teal}0d`,borderRadius:4,padding:'3px 5px'}}>
                              <p style={{fontSize:6,color:T.textM,fontWeight:700,margin:0}}>SOLD</p>
                              <p style={{fontSize:10,fontWeight:900,color:T.tealD,margin:0}}>₹{bookedTCV.toFixed(0)} Cr</p>
                              <p style={{fontSize:6,color:T.textM,margin:0}}>Total Unit Cost</p>
                            </div>
                            <div style={{flex:1,background:'rgba(245,158,11,0.07)',borderRadius:4,padding:'3px 5px'}}>
                              <p style={{fontSize:6,color:T.textM,fontWeight:700,margin:0}}>UNSOLD</p>
                              <p style={{fontSize:10,fontWeight:900,color:T.amber,margin:0}}>₹{unsoldBSP.toFixed(0)} Cr</p>
                              <p style={{fontSize:6,color:T.textM,margin:0}}>{availUnits} units</p>
                            </div>
                          </div>
                        </div>
                      </div>
                      {/* Row 2: Collection Progress */}
                      <div style={{background:'rgba(0,100,140,0.04)',borderRadius:7,padding:'6px 8px'}}>
                        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:4}}>
                          <p style={{fontSize:6,fontWeight:900,color:T.tealD,textTransform:'uppercase',margin:0,letterSpacing:0.5}}>Collection Progress</p>
                          <span style={{fontSize:8,fontWeight:900,color:collectedPct>100?T.amber:T.tealD}}>{collectedDisplay}</span>
                        </div>
                        <div style={{height:5,background:'rgba(0,100,140,0.1)',borderRadius:3,overflow:'hidden',marginBottom:5}}>
                          <div style={{width:Math.min(collectedPct,100)+'%',height:'100%',background:`linear-gradient(90deg,${T.teal},${T.tealD})`,borderRadius:3,transition:'width 0.6s ease'}}/>
                        </div>
                        <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:4}}>
                          {[
                            {l:'Demand Raised', v:installmentTotal.toFixed(0), c:T.navy,    sub:'W/O GST'},
                            {l:'Collected',     v:totalReceived.toFixed(0),    c:'#059669', sub:'W/O GST'},
                            {l:'Outstanding',   v:upcomingAmt.toFixed(0),      c:'#ef4444', sub:'Still due'},
                          ].map(({l,v,c,sub})=>(
                            <div key={l} style={{background:'rgba(255,255,255,0.7)',borderRadius:5,padding:'4px 6px',textAlign:'center'}}>
                              <p style={{fontSize:5.5,color:'#94a3b8',fontWeight:700,margin:'0 0 2px',textTransform:'uppercase'}}>{l}</p>
                              <p style={{fontSize:10,fontWeight:900,color:c,margin:'0 0 1px'}}>₹{v}Cr</p>
                              <p style={{fontSize:5.5,color:T.textL,margin:0}}>{sub}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  );
                })()}
                <div style={{position:'absolute',bottom:0,left:0,right:0,height:3,background:`linear-gradient(90deg,${T.teal},${T.amber})`,borderRadius:'0 0 14px 14px'}}/>
              </GC>

              {/* CARD D: Avg Rate / sq ft — unit-level min/avg/max range bar */}
              <GC style={{padding:12,minWidth:190,maxWidth:240}} cls="kc">
                <SH title="Avg Rate / sq ft" compact/>
                <div style={{display:'flex',flexDirection:'column',gap:5,marginTop:4}}>
                  {(()=>{
                    const SHORT={'SMARTWORLD THE EDITION':'Edition','Smartworld Sky Arc':'Sky Arc','Trump Residences Gurgaon':'Trump','Smartworld Le Courtyard':'Le Courtyard','Smartworld Suites':'Suites'};
                    // Unit-level rates from active bookings (pA)
                    const unitRates=pA.filter(r=>r.bsp>0&&r.superArea>0).map(r=>Math.round(r.bsp/r.superArea));
                    const minR=unitRates.length?Math.min(...unitRates):0;
                    const maxR=unitRates.length?Math.max(...unitRates):0;
                    const avgR=kpiEx.avgRatePerSqft||0; // Rs18,015/sqft from invr
                    // Range bar: avgR position as % between minR and maxR
                    const range=maxR-minR||1;
                    const avgPct=Math.round(((avgR-minR)/range)*100);
                    // Per-project rates for breakdown
                    const projRates=(areaSummary.byProject||[]).filter(d=>d.avgPricePerSqft>0);
                    const maxProjRate=Math.max(...projRates.map(d=>d.avgPricePerSqft),1);
                    return(<>
                      {/* Overall avg — always show */}
                      <div style={{background:`${T.navy}0d`,borderRadius:7,padding:'5px 8px',marginBottom:2}}>
                        <p style={{fontSize:7,color:T.textM,fontWeight:700,margin:'0 0 1px',textTransform:'uppercase'}}>Overall Avg</p>
                        <p style={{fontSize:15,fontWeight:900,color:T.navy,margin:0,letterSpacing:-0.5}}>₹{avgR.toLocaleString('en-IN')}<span style={{fontSize:8,fontWeight:600,color:T.textM}}> /sqft</span></p>
                      </div>
                      {/* Range bar */}
                      {unitRates.length>0&&minR!==maxR&&(
                        <div style={{marginBottom:4}}>
                          {/* Avg label above marker */}
                          <div style={{position:'relative',height:16,marginBottom:2}}>
                            <div style={{position:'absolute',left:`${avgPct}%`,transform:'translateX(-50%)',whiteSpace:'nowrap'}}>
                              <span style={{fontSize:8,fontWeight:800,color:T.navy}}>₹{avgR.toLocaleString('en-IN')}</span>
                            </div>
                          </div>
                          {/* The bar */}
                          <div style={{position:'relative',height:8,background:'rgba(0,100,140,0.1)',borderRadius:4}}>
                            {/* Filled portion from min to avg */}
                            <div style={{position:'absolute',left:0,width:avgPct+'%',height:'100%',background:`linear-gradient(90deg,${T.teal},${T.tealD})`,borderRadius:4,transition:'width 0.6s ease'}}/>
                            {/* Avg marker */}
                            <div style={{position:'absolute',left:avgPct+'%',top:'50%',transform:'translate(-50%,-50%)',width:12,height:12,borderRadius:'50%',background:T.navy,border:'2px solid #fff',boxShadow:'0 1px 4px rgba(0,0,0,0.2)',zIndex:1}}/>
                          </div>
                          {/* Min / Max labels */}
                          <div style={{display:'flex',justifyContent:'space-between',marginTop:4}}>
                            <div style={{textAlign:'left'}}>
                              <p style={{fontSize:7,color:T.textM,margin:0,fontWeight:700}}>MIN</p>
                              <p style={{fontSize:9,fontWeight:900,color:T.teal,margin:0}}>₹{minR.toLocaleString('en-IN')}</p>
                            </div>
                            <div style={{textAlign:'right'}}>
                              <p style={{fontSize:7,color:T.textM,margin:0,fontWeight:700}}>MAX</p>
                              <p style={{fontSize:9,fontWeight:900,color:T.amber,margin:0}}>₹{maxR.toLocaleString('en-IN')}</p>
                            </div>
                          </div>
                        </div>
                      )}
                      {/* Per-project breakdown */}
                      {filters.project&&projRates.map((d,i)=>{
                        const pct=Math.round((d.avgPricePerSqft/maxProjRate)*100);
                        const col=d.avgPricePerSqft>25000?T.amber:d.avgPricePerSqft>20000?T.tealD:T.teal;
                        return(
                          <div key={i}>
                            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:2}}>
                              <span style={{fontSize:8,fontWeight:700,color:T.textM}}>{SHORT[d.project]||d.project}</span>
                              <span style={{fontSize:9,fontWeight:900,color:col}}>₹{d.avgPricePerSqft.toLocaleString('en-IN')}</span>
                            </div>
                            <div style={{height:4,background:'rgba(0,100,140,0.1)',borderRadius:2,overflow:'hidden'}}>
                              <div style={{width:pct+'%',height:'100%',background:col,borderRadius:2,transition:'width 0.6s ease'}}/>
                            </div>
                          </div>
                        );
                      })}
                    </>);
                  })()}
                </div>
                <div style={{position:'absolute',bottom:0,left:0,right:0,height:3,background:`linear-gradient(90deg,${T.teal},${T.amber})`,borderRadius:'0 0 14px 14px'}}/>
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

                <div style={{position:'relative',display:'inline-flex',flexDirection:'column',alignItems:'center'}}>
                  {/* Pulsing "click here" callout — shown only when Sales Trend is active */}
                  {!showTowerType&&(
                    <div style={{
                      position:'absolute',bottom:'calc(100% + 8px)',left:'50%',transform:'translateX(-50%)',
                      background:'linear-gradient(135deg,#0097a7,#00bcd4)',
                      color:'#fff',fontSize:9,fontWeight:800,letterSpacing:0.5,
                      padding:'4px 10px',borderRadius:12,whiteSpace:'nowrap',
                      boxShadow:'0 4px 14px rgba(0,151,167,0.4)',
                      animation:'pulse 1.8s ease-in-out infinite',
                      pointerEvents:'none',
                    }}>
                      ✨ Click to explore Tower Wise
                      {/* Tooltip arrow */}
                      <div style={{position:'absolute',top:'100%',left:'50%',transform:'translateX(-50%)',
                        width:0,height:0,borderLeft:'5px solid transparent',borderRight:'5px solid transparent',
                        borderTop:'5px solid #00bcd4'}}/>
                    </div>
                  )}
                  <button
                    onClick={()=>setShowTowerType(v=>!v)}
                    style={{
                      display:'flex',alignItems:'center',gap:7,
                      padding:'7px 16px',borderRadius:20,cursor:'pointer',
                      background:showTowerType?'linear-gradient(135deg,#0097a7,#00bcd4)':'#fff',
                      color:showTowerType?'#fff':'#0097a7',
                      fontSize:11,fontWeight:800,letterSpacing:0.4,
                      transition:'all 0.25s ease',
                      border:'2px solid #0097a7',
                      boxShadow:showTowerType?'0 3px 12px rgba(0,151,167,0.45)':'0 1px 4px rgba(0,0,0,0.12)',
                      whiteSpace:'nowrap',
                    }}
                  >
                    <span style={{fontSize:13,transition:'transform 0.3s',display:'inline-block',transform:showTowerType?'rotate(180deg)':'rotate(0deg)'}}>⇄</span>
                    {showTowerType?'Sales & Pricing Trend':'Tower Wise Sales'}
                  </button>
                </div>
              </div>

              {/* Full-width Month Range Slider */}
              <MonthRangeSlider
                months={FILTERED_CHART_MONTHS}
                rangeIdx={chartRangeIdx}
                setRangeIdx={(updater)=>{
                  setChartRangeIdx(updater);
                  setAllOff(-1);setChartOff(-1);
                }}
                onReset={()=>{setChartRangeIdx([0,999]);setAllOff(-1);setChartOff(-1);}}
              />

              {/* 2x2 chart grid */}
              <div style={{
                display:showTowerType?'none':'grid',
                gridTemplateColumns:'1fr 1fr',gap:12,
                transformOrigin:'center center',
                animation:!showTowerType?'flipIn 0.8s cubic-bezier(0.4,0,0.2,1) forwards':'none',
              }}>

                {/* ── CHART 1: UNITS ─────────────────────────────────── */}
                <GC style={{padding:16}}>
                  <SH title="Units — Booked vs Target" sub="Achieved (teal) · Target (grey) · Lines connect both"/>
                  {(()=>{
                    const WIN=10;
                    // Projection: redistribute MISSED targets from past months this quarter
                    // into remaining months of SAME quarter as a revised target line
                    const todayD=new Date();
                    const curQsMo=Math.floor((todayD.getMonth())/3)*3+1;
                    const ml=(y,m)=>{const n={1:'Jan',2:'Feb',3:'Mar',4:'Apr',5:'May',6:'Jun',7:'Jul',8:'Aug',9:'Sep',10:'Oct',11:'Nov',12:'Dec'};return n[m]+"'"+String(y).slice(2);};
                    const curQMonthsObj=[0,1,2].map(i=>{let m=curQsMo+i,y=todayD.getFullYear();if(m>12){m-=12;y++;}return{label:ml(y,m),ym:y*100+m};});
                    const curQMonths=curQMonthsObj.map(o=>o.label);
                    const todayYMn=todayD.getFullYear()*100+(todayD.getMonth()+1);
                    const todayLabel=ml(todayD.getFullYear(),todayD.getMonth()+1);
                    // Use numeric ym for correct date comparison (string compare fails: Jun < May alphabetically)
                    const pastQMonths=curQMonthsObj.filter(o=>o.ym<todayYMn).map(o=>o.label);
                    const futureQMonths=curQMonthsObj.filter(o=>o.ym>=todayYMn).map(o=>o.label);
                    // Gap = sum of (target - achieved) for past months in this quarter
                    const missedUnits=pastQMonths.reduce((s,lbl)=>{
                      const d=monthlyWithTargets.find(r=>r.label===lbl);
                      return s+Math.max(0,(d?.targetUnitsLine||0)-(d?.bookedUnits||0));
                    },0);
                    // Redistribute missed units evenly across remaining months (current + future in Q)
                    const nRemaining=futureQMonths.length;
                    const addPerMonth=nRemaining>0?Math.round(missedUnits/nRemaining):0;
                    const projMap={};
                    futureQMonths.forEach(lbl=>{
                      const base=monthlyWithTargets.find(d=>d.label===lbl)?.targetUnitsLine||0;
                      projMap[lbl]=base+addPerMonth; // revised target = original + catch-up
                    });
                    // No green line beyond current quarter — grey line resumes from Jul

                    const rawData=monthlyWithTargets.map(d=>({
                      label:d.label,isFuture:d.isFuture,isCurrent:d.label===TODAY_LABEL,
                      achieved:d.isFuture?null:(d.bookedUnits||0),
                      target:d.targetUnitsLine||null,          // keeps bars intact
                      // targetLine: null for any past month (before today) + projection months
                      // This stops grey connecting line for past months, green handles projection months
                      // Use the same ym comparison as projMap
                      targetLine:(()=>{
                        if(projMap[d.label]!=null) return null; // projection month — green handles it
                        // For past months (before today), null out so grey line doesn't draw backwards
                        const dParts=d.label.match(/([A-Za-z]{3})'(\d{2})/);
                        if(dParts){
                          const moN={Jan:1,Feb:2,Mar:3,Apr:4,May:5,Jun:6,Jul:7,Aug:8,Sep:9,Oct:10,Nov:11,Dec:12};
                          const dYm=(2000+parseInt(dParts[2]))*100+(moN[dParts[1]]||0);
                          if(dYm<todayYMn) return null; // past month — no grey dot/line
                        }
                        return d.targetUnitsLine||null;
                      })(),
                      projection:projMap[d.label]||null,
                      // Bridge: grey connecting line from last projection month to first next-Q target
                      bridge:(()=>{
                        // Sort by ym numerically to get true last month
                        const moN2={Jan:1,Feb:2,Mar:3,Apr:4,May:5,Jun:6,Jul:7,Aug:8,Sep:9,Oct:10,Nov:11,Dec:12};
                        const lblToYm=l=>{const p=l.match(/([A-Za-z]{3})'(\d{2})/);return p?(2000+parseInt(p[2]))*100+(moN2[p[1]]||0):0;};
                        const sortedProjKeys=Object.keys(projMap).sort((a,b)=>lblToYm(a)-lblToYm(b));
                        const lastProjLbl=sortedProjKeys[sortedProjKeys.length-1];
                        // First next-Q month
                        const nqMo2=curQsMo+3>12?curQsMo-9:curQsMo+3;
                        const nqY2=curQsMo+3>12?todayD.getFullYear()+1:todayD.getFullYear();
                        const nqLbl=ml(nqY2,nqMo2);
                        if(d.label===lastProjLbl) return projMap[lastProjLbl]; // Jun: bridge starts here
                        if(d.label===nqLbl) return d.targetUnitsLine||null;    // Jul: bridge ends here
                        return null;
                      })(),
                    }));
                    const data=uMode==='quarterly'?toQuarterly(rawData,'label').map(q=>({...q,isFuture:false,isCurrent:false})):rawData;
                    const parseM=l=>{const p=l.match(/([A-Za-z]{3})'(\d{2})/);if(!p)return'';const mn={Jan:'01',Feb:'02',Mar:'03',Apr:'04',May:'05',Jun:'06',Jul:'07',Aug:'08',Sep:'09',Oct:'10',Nov:'11',Dec:'12'};return(p[2]>='90'?'19':'20')+p[2]+'-'+mn[p[1]];};const dataF=chartMonthFrom?data.filter(d=>parseM(d.label)>=chartMonthFrom):data;
                    const dataFinal=chartMonthFrom?dataF:data;
                    const cur=dataFinal.findIndex(d=>d.isCurrent);
                    const def=cur>=2?cur-2:Math.max(0,dataFinal.length-WIN);
                    const off=chartMonthFrom?Math.min(Math.max(chartOff<0?0:chartOff,0),Math.max(0,dataFinal.length-WIN)):Math.min(Math.max(chartOff<0?def:chartOff,0),Math.max(0,dataFinal.length-WIN));
                    const sl=dataFinal.slice(off,off+WIN);
                    return(<>
                      <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:6}}>
                        {!chartRangeCompact&&dataFinal.length>WIN&&<><button className="chart-slider-btn" onClick={()=>setAllOff(Math.max(0,off-1))} disabled={off===0}>&#8249;</button>
                        <div className="chart-slider-track"
  onClick={e=>{const r=e.currentTarget.getBoundingClientRect();const p=(e.clientX-r.left)/r.width;setAllOff(Math.round(p*Math.max(0,dataFinal.length-WIN)));}}
  onMouseDown={e=>{e.preventDefault();const thumb=e.currentTarget.querySelector('.chart-slider-thumb');if(thumb)thumb.classList.add('dragging');const track=e.currentTarget;const move=ev=>{const r=track.getBoundingClientRect();const p=Math.max(0,Math.min(1,(ev.clientX-r.left)/r.width));setAllOff(Math.round(p*Math.max(0,dataFinal.length-WIN)));};const up=()=>{if(thumb)thumb.classList.remove('dragging');window.removeEventListener('mousemove',move);window.removeEventListener('mouseup',up);};window.addEventListener('mousemove',move);window.addEventListener('mouseup',up);}}
>
  <div className="chart-slider-thumb" style={{left:`${dataFinal.length>WIN?(off/Math.max(1,dataFinal.length-WIN))*(100-WIN/dataFinal.length*100):0}%`,width:`${dataFinal.length>0?(WIN/dataFinal.length)*100:100}%`}}/>
</div>
                        <button className="chart-slider-btn" onClick={()=>setAllOff(Math.min(dataFinal.length-WIN,off+1))} disabled={off>=dataFinal.length-WIN}>&#8250;</button></> }
                      </div>
                      <ResponsiveContainer width="100%" height={210}>
                        <ComposedChart data={sl} margin={{top:26,right:8,bottom:18,left:0}} barGap={4} barCategoryGap="30%">
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,60,100,0.1)" vertical={false}/>
                          <XAxis dataKey="label" tick={({x,y,payload})=>{const d=sl.find(s=>s.label===payload.value);return <text x={x} y={y+10} textAnchor="middle" fontSize={9} fill={d?.isCurrent?T.tealD:d?.isFuture?'#90a4ae':T.textM} fontWeight={d?.isCurrent?900:600}>{payload.value}</text>;}} axisLine={false} tickLine={false}/>
                          <YAxis tick={{fill:T.textM,fontSize:9}} axisLine={false} tickLine={false} width={32}/>
                          <Tooltip content={({active,payload,label})=>{if(!active||!payload?.length)return null;const d=sl.find(s=>s.label===label);return(<div style={{background:'rgba(255,255,255,0.97)',border:'1px solid rgba(0,151,167,0.3)',borderRadius:10,padding:'8px 12px',fontSize:10}}><p style={{color:T.tealD,fontWeight:800,margin:'0 0 4px'}}>{label}</p>{d?.achieved!=null&&<p style={{color:T.tealD,margin:0,fontWeight:700}}>Achieved: {d.achieved} units</p>}{d?.target!=null&&<p style={{color:'#607d8b',margin:0}}>Target: {d.target} units</p>}{d?.projection!=null&&<p style={{color:'#22c55e',margin:0,fontWeight:700}}>▲ Projection: {d.projection} units<br/><span style={{fontSize:9,color:'#86efac'}}>incl. catch-up from missed targets</span></p>}</div>);}}/>
                          <Legend wrapperStyle={{fontSize:9,fontWeight:700}} iconSize={8} payload={[{value:"Target",type:"rect",color:"#b0bec5"},{value:"Achieved",type:"rect",color:T.teal},{value:"Projection (next Q)",type:"line",color:"#22c55e"}]}/>
                          <Bar dataKey="target" name="Target" fill="#b0bec5" fillOpacity={0.75} radius={[3,3,0,0]} barSize={18} isAnimationActive={true} animationDuration={1000} animationEasing="ease-out">
                            <LabelList dataKey="target" position="top" style={{fill:'#607d8b',fontSize:8,fontWeight:800}} formatter={v=>v>0?v:''}/>
                          </Bar>
                          <Bar dataKey="achieved" name="Achieved" fill={T.teal} radius={[3,3,0,0]} barSize={18} isAnimationActive={true} animationDuration={800} animationEasing="ease-out">
                            {sl.map((d,i)=><Cell key={i} fill={d.isCurrent?T.tealD:T.teal} fillOpacity={d.isCurrent?1:0.85}/>)}
                            <LabelList dataKey="achieved" position="top" style={{fill:T.tealD,fontSize:8,fontWeight:800}} formatter={v=>v>0?v:''}/>
                          </Bar>

                          <Line type="monotone" dataKey="targetLine" stroke="#607d8b" strokeWidth={2} strokeDasharray="5 3" dot={{r:3,fill:'#607d8b',stroke:'#fff',strokeWidth:1.5}} activeDot={{r:4}} legendType="none" connectNulls={false}/>
                          <Line type="monotone" dataKey="projection" name="Adjusted" stroke="#22c55e" strokeWidth={2.5} strokeDasharray="6 2" dot={({cx,cy,payload})=>payload.projection!=null?<circle cx={cx} cy={cy} r={5} fill="#22c55e" stroke="#fff" strokeWidth={2}/>:<g/>} activeDot={{r:6,fill:'#22c55e'}} connectNulls={false}>
                            <LabelList dataKey="projection" position="top" offset={18} content={({x,y,value})=>{if(value==null)return null;const txt='▲'+value;const w=txt.length*5.5+8;return(<g><rect x={x-w/2} y={y-28} width={w} height={16} rx={4} fill="white" stroke="#22c55e" strokeWidth={1} opacity={0.95}/><text x={x} y={y-17} textAnchor="middle" fill="#16a34a" fontSize={8} fontWeight={900}>{txt}</text></g>);}}/>
                          </Line>
                          <Line type="monotone" dataKey="bridge" stroke="#90a4ae" strokeWidth={1.5} strokeDasharray="4 3" dot={false} activeDot={false} legendType="none" connectNulls={true}/>
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
                    // TSV projection — same quarter logic
                    const todayT=new Date();
                    const tQS=Math.floor((todayT.getMonth())/3)*3+1;
                    const ml2=(y,m)=>{const n={1:'Jan',2:'Feb',3:'Mar',4:'Apr',5:'May',6:'Jun',7:'Jul',8:'Aug',9:'Sep',10:'Oct',11:'Nov',12:'Dec'};return n[m]+"'"+String(y).slice(2);};
                    const moNT={Jan:1,Feb:2,Mar:3,Apr:4,May:5,Jun:6,Jul:7,Aug:8,Sep:9,Oct:10,Nov:11,Dec:12};
                    const lblYmT=l=>{const p=l.match(/([A-Za-z]{3})'(\d{2})/);return p?(2000+parseInt(p[2]))*100+(moNT[p[1]]||0):0;};
                    const todayYMT=todayT.getFullYear()*100+(todayT.getMonth()+1);
                    const cqmObj=[0,1,2].map(i=>{let m=tQS+i,y=todayT.getFullYear();if(m>12){m-=12;y++;}return{label:ml2(y,m),ym:y*100+m};});
                    const pastCqmT=cqmObj.filter(o=>o.ym<todayYMT).map(o=>o.label);
                    const futureCqmT=cqmObj.filter(o=>o.ym>=todayYMT).map(o=>o.label);
                    const missedTsv=pastCqmT.reduce((s,lbl)=>{const d=monthlyWithTargets.find(r=>r.label===lbl);return s+Math.max(0,(d?.targetTsvLine||0)-(d?.bspCr||0));},0);
                    const addTsvPer=futureCqmT.length>0?+(missedTsv/futureCqmT.length).toFixed(1):0;
                    const tsvProjMap={};
                    futureCqmT.forEach(lbl=>{const base=monthlyWithTargets.find(d=>d.label===lbl)?.targetTsvLine||0;tsvProjMap[lbl]=+(base+addTsvPer).toFixed(1);});
                    // Bridge: last proj month → first next-Q target
                    const sortedTsvProj=Object.keys(tsvProjMap).sort((a,b)=>lblYmT(a)-lblYmT(b));
                    const lastTsvLbl=sortedTsvProj[sortedTsvProj.length-1];
                    const nqBMoT=tQS+3>12?tQS-9:tQS+3;const nqBYT=tQS+3>12?todayT.getFullYear()+1:todayT.getFullYear();
                    const nqBLblT=ml2(nqBYT,nqBMoT);
                    const rawDataTsv=monthlyWithTargets.map(d=>({label:d.label,isFuture:d.isFuture,isCurrent:d.label===TODAY_LABEL,
                      achieved:d.isFuture?null:(d.bspCr||0),
                      target:d.targetTsvLine||null,
                      targetLine:(()=>{if(tsvProjMap[d.label]!=null)return null;const p=d.label.match(/([A-Za-z]{3})'(\d{2})/);if(p&&(2000+parseInt(p[2]))*100+(moNT[p[1]]||0)<todayYMT)return null;return d.targetTsvLine||null;})(),
                      projection:tsvProjMap[d.label]||null,
                      bridge:(d.label===lastTsvLbl?tsvProjMap[lastTsvLbl]:d.label===nqBLblT?(monthlyWithTargets.find(r=>r.label===nqBLblT)?.targetTsvLine||null):null),
                    }));
                    const data=tsvMode==='quarterly'?toQuarterly(rawDataTsv,'label').map(q=>({...q,isFuture:false,isCurrent:false})):rawDataTsv;
                    const parseM=l=>{const p=l.match(/([A-Za-z]{3})'(\d{2})/);if(!p)return'';const mn={Jan:'01',Feb:'02',Mar:'03',Apr:'04',May:'05',Jun:'06',Jul:'07',Aug:'08',Sep:'09',Oct:'10',Nov:'11',Dec:'12'};return(p[2]>='90'?'19':'20')+p[2]+'-'+mn[p[1]];};const dataF=chartMonthFrom?data.filter(d=>parseM(d.label)>=chartMonthFrom):data;
                    const dataFinal=chartMonthFrom?dataF:data;
                    const cur=dataFinal.findIndex(d=>d.isCurrent);
                    const def=cur>=2?cur-2:Math.max(0,dataFinal.length-WIN);
                    const off=chartMonthFrom?Math.min(Math.max(chartOff<0?0:chartOff,0),Math.max(0,dataFinal.length-WIN)):Math.min(Math.max(chartOff<0?def:chartOff,0),Math.max(0,dataFinal.length-WIN));
                    const sl=dataFinal.slice(off,off+WIN);
                    return(<>
                      <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:6}}>
                        
                        {!chartRangeCompact&&dataFinal.length>WIN&&<><button className="chart-slider-btn" onClick={()=>setAllOff(Math.max(0,off-1))} disabled={off===0}>‹</button>
                        <div className="chart-slider-track"
  onClick={e=>{const r=e.currentTarget.getBoundingClientRect();const p=(e.clientX-r.left)/r.width;setAllOff(Math.round(p*Math.max(0,dataFinal.length-WIN)));}}
  onMouseDown={e=>{e.preventDefault();const thumb=e.currentTarget.querySelector('.chart-slider-thumb');if(thumb)thumb.classList.add('dragging');const track=e.currentTarget;const move=ev=>{const r=track.getBoundingClientRect();const p=Math.max(0,Math.min(1,(ev.clientX-r.left)/r.width));setAllOff(Math.round(p*Math.max(0,dataFinal.length-WIN)));};const up=()=>{if(thumb)thumb.classList.remove('dragging');window.removeEventListener('mousemove',move);window.removeEventListener('mouseup',up);};window.addEventListener('mousemove',move);window.addEventListener('mouseup',up);}}
>
  <div className="chart-slider-thumb" style={{left:`${dataFinal.length>WIN?(off/Math.max(1,dataFinal.length-WIN))*(100-WIN/dataFinal.length*100):0}%`,width:`${dataFinal.length>0?(WIN/dataFinal.length)*100:100}%`}}/>
</div>
                        <button className="chart-slider-btn" onClick={()=>setAllOff(Math.min(dataFinal.length-WIN,off+1))} disabled={off>=dataFinal.length-WIN}>›</button></> }
                      </div>
                      <ResponsiveContainer width="100%" height={210}>
                        <ComposedChart data={sl} margin={{top:26,right:8,bottom:18,left:0}} barGap={4} barCategoryGap="30%">
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,60,100,0.1)" vertical={false}/>
                          <XAxis dataKey="label" tick={({x,y,payload})=>{const d=sl.find(s=>s.label===payload.value);return <text x={x} y={y+10} textAnchor="middle" fontSize={9} fill={d?.isCurrent?T.tealD:d?.isFuture?'#90a4ae':T.textM} fontWeight={d?.isCurrent?900:600}>{payload.value}</text>;}} axisLine={false} tickLine={false}/>
                          <YAxis tick={{fill:T.textM,fontSize:9}} axisLine={false} tickLine={false} width={40} tickFormatter={v=>v+'Cr'}/>
                          <Tooltip content={({active,payload,label})=>{if(!active||!payload?.length)return null;const d=sl.find(s=>s.label===label);return(<div style={{background:'rgba(255,255,255,0.97)',border:'1px solid rgba(0,151,167,0.3)',borderRadius:10,padding:'8px 12px',fontSize:10}}><p style={{color:T.tealD,fontWeight:800,margin:'0 0 4px'}}>{label}</p>{d?.achieved!=null&&<p style={{color:T.tealD,margin:0}}>Achieved: ₹{d.achieved}Cr</p>}{d?.target!=null&&<p style={{color:'#607d8b',margin:0}}>Target: ₹{d.target}Cr</p>}</div>);}}/>
                          <Legend wrapperStyle={{fontSize:9,fontWeight:700}} iconSize={8}/>
                          <Bar dataKey="target" name="Target TSV" fill="#b0bec5" fillOpacity={0.75} radius={[3,3,0,0]} barSize={18} isAnimationActive={true} animationDuration={1000} animationEasing="ease-out">
                            <LabelList dataKey="target" position="top" style={{fill:'#607d8b',fontSize:7,fontWeight:700}} formatter={v=>v>0?v+'Cr':''}/>
                          </Bar>
                          <Bar dataKey="achieved" name="Actual BSP" fill={T.teal} radius={[3,3,0,0]} barSize={18} isAnimationActive={true} animationDuration={800} animationEasing="ease-out">
                            {sl.map((d,i)=><Cell key={i} fill={d.isCurrent?T.tealD:T.teal} fillOpacity={d.isCurrent?1:0.85}/>)}
                            <LabelList dataKey="achieved" position="top" style={{fill:T.tealD,fontSize:7,fontWeight:800}} formatter={v=>v>0?'₹'+v+'Cr':''}/>
                          </Bar>

                          <Line type="monotone" dataKey="targetLine" stroke="#607d8b" strokeWidth={2} strokeDasharray="5 3" dot={{r:3,fill:'#607d8b',stroke:'#fff',strokeWidth:1.5}} activeDot={{r:4}} legendType="none" connectNulls={false}/>
                          <Line type="monotone" dataKey="projection" name="Adjusted" stroke="#22c55e" strokeWidth={2.5} strokeDasharray="6 2" dot={({cx,cy,payload})=>payload.projection!=null?<circle cx={cx} cy={cy} r={5} fill="#22c55e" stroke="#fff" strokeWidth={2}/>:<g/>} activeDot={{r:6,fill:'#22c55e'}} connectNulls={false}>
                            <LabelList dataKey="projection" position="top" offset={18} content={({x,y,value})=>{if(value==null)return null;const txt='▲'+value+'Cr';const w=txt.length*5.5+8;return(<g><rect x={x-w/2} y={y-28} width={w} height={16} rx={4} fill="white" stroke="#22c55e" strokeWidth={1} opacity={0.95}/><text x={x} y={y-17} textAnchor="middle" fill="#16a34a" fontSize={8} fontWeight={900}>{txt}</text></g>);}}/>
                          </Line>
                          <Line type="monotone" dataKey="bridge" stroke="#90a4ae" strokeWidth={1.5} strokeDasharray="4 3" dot={false} activeDot={false} legendType="none" connectNulls={true}/>
                        </ComposedChart>
                      </ResponsiveContainer>
                    </>);
                  })()}
                </GC>

                {/* ── CHART 4: AREA Booked vs Target ── */}
                <GC style={{padding:16}}>
                  <SH title="Area (Lakh sq ft) — Booked vs Target"/>
                  {(()=>{
                    const WIN=10;
                    // Build from monthlyWithTargets — same source as other 3 charts
                    const todayA=new Date();
                    const aQS2=Math.floor((todayA.getMonth())/3)*3+1;
                    const ml4=(y,m)=>{const n={1:'Jan',2:'Feb',3:'Mar',4:'Apr',5:'May',6:'Jun',7:'Jul',8:'Aug',9:'Sep',10:'Oct',11:'Nov',12:'Dec'};return n[m]+"'"+String(y).slice(2);};
                    const moNA2={Jan:1,Feb:2,Mar:3,Apr:4,May:5,Jun:6,Jul:7,Aug:8,Sep:9,Oct:10,Nov:11,Dec:12};
                    const lblYmA2=l=>{const p=l.match(/([A-Za-z]{3})'(\d{2})/);return p?(2000+parseInt(p[2]))*100+(moNA2[p[1]]||0):0;};
                    const todayYMA3=todayA.getFullYear()*100+(todayA.getMonth()+1);
                    // Projection: same-quarter catch-up
                    const cqObjA2=[0,1,2].map(i=>{let m=aQS2+i,y=todayA.getFullYear();if(m>12){m-=12;y++;}return{label:ml4(y,m),ym:y*100+m};});
                    const pastCqA2=cqObjA2.filter(o=>o.ym<todayYMA3).map(o=>o.label);
                    const futureCqA2=cqObjA2.filter(o=>o.ym>=todayYMA3).map(o=>o.label);
                    const missedArea2=pastCqA2.reduce((s,lbl)=>{const d=monthlyWithTargets.find(r=>r.label===lbl);return s+Math.max(0,(d?.targetAreaSqft||0)-(d?.bookedAreaSqft||0));},0);
                    const addAreaPer2=futureCqA2.length>0?Math.round(missedArea2/futureCqA2.length):0;
                    const areaProjMap2={};
                    futureCqA2.forEach(lbl=>{const base=monthlyWithTargets.find(d=>d.label===lbl)?.targetAreaSqft||0;areaProjMap2[lbl]=Math.round(base+addAreaPer2);});
                    const sortedAP2=Object.keys(areaProjMap2).sort((a,b)=>lblYmA2(a)-lblYmA2(b));
                    const lastALbl2=sortedAP2[sortedAP2.length-1];
                    const nqBMoA2=aQS2+3>12?aQS2-9:aQS2+3;const nqBYA2=aQS2+3>12?todayA.getFullYear()+1:todayA.getFullYear();
                    const nqBLblA2=ml4(nqBYA2,nqBMoA2);
                    const rawDataA=monthlyWithTargets.map(d=>({
                      label:d.label,isFuture:d.isFuture,isCurrent:d.label===TODAY_LABEL,
                      achieved:d.isFuture?null:(d.bookedAreaSqft!=null&&d.bookedAreaSqft>0?+(d.bookedAreaSqft/100000).toFixed(2):0),
                      target:d.targetAreaSqft?+(d.targetAreaSqft/100000).toFixed(2):null,
                      targetLine:(()=>{if(areaProjMap2[d.label]!=null)return null;const p=d.label.match(/([A-Za-z]{3})'(\d{2})/);if(p&&(2000+parseInt(p[2]))*100+(moNA2[p[1]]||0)<todayYMA3)return null;return d.targetAreaSqft?+(d.targetAreaSqft/100000).toFixed(2):null;})(),
                      projection:areaProjMap2[d.label]!=null?+(areaProjMap2[d.label]/100000).toFixed(2):null,
                      bridge:(d.label===lastALbl2?+(areaProjMap2[lastALbl2]/100000).toFixed(2):d.label===nqBLblA2?(monthlyWithTargets.find(r=>r.label===nqBLblA2)?.targetAreaSqft?+(monthlyWithTargets.find(r=>r.label===nqBLblA2).targetAreaSqft/100000).toFixed(2):null):null),
                    }));
                    const data=suMode==='quarterly'?toQuarterly(rawDataA,'label').map(q=>({...q,isFuture:false,isCurrent:false})):rawDataA;
                    const parseM=l=>{const p=l.match(/([A-Za-z]{3})'(\d{2})/);if(!p)return'';const mn={Jan:'01',Feb:'02',Mar:'03',Apr:'04',May:'05',Jun:'06',Jul:'07',Aug:'08',Sep:'09',Oct:'10',Nov:'11',Dec:'12'};return(p[2]>='90'?'19':'20')+p[2]+'-'+mn[p[1]];};const dataF=chartMonthFrom?data.filter(d=>parseM(d.label)>=chartMonthFrom):data;
                    const dataFinal=chartMonthFrom?dataF:data;
                    const cur=dataFinal.findIndex(d=>d.isCurrent);
                    const def=cur>=2?cur-2:Math.max(0,dataFinal.length-WIN);
                    const off=chartMonthFrom?Math.min(Math.max(chartOff<0?0:chartOff,0),Math.max(0,dataFinal.length-WIN)):Math.min(Math.max(chartOff<0?def:chartOff,0),Math.max(0,dataFinal.length-WIN));
                    const sl=dataFinal.slice(off,off+WIN);
                    // KPI pills
                    const totBooked=monthlyWithTargets.filter(d=>!d.isFuture).reduce((s,d)=>s+(d.bookedAreaSqft||0),0);
                    const totTarget=monthlyWithTargets.reduce((s,d)=>s+(d.targetAreaSqft||0),0);
                    return(<>
                      <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:6}}>
                        {!chartRangeCompact&&dataFinal.length>WIN&&<><button className="chart-slider-btn" onClick={()=>setAllOff(Math.max(0,off-1))} disabled={off===0}>‹</button>
                        <div className="chart-slider-track"
  onClick={e=>{const r=e.currentTarget.getBoundingClientRect();const p=(e.clientX-r.left)/r.width;setAllOff(Math.round(p*Math.max(0,dataFinal.length-WIN)));}}
  onMouseDown={e=>{e.preventDefault();const thumb=e.currentTarget.querySelector('.chart-slider-thumb');if(thumb)thumb.classList.add('dragging');const track=e.currentTarget;const move=ev=>{const r=track.getBoundingClientRect();const p=Math.max(0,Math.min(1,(ev.clientX-r.left)/r.width));setAllOff(Math.round(p*Math.max(0,dataFinal.length-WIN)));};const up=()=>{if(thumb)thumb.classList.remove('dragging');window.removeEventListener('mousemove',move);window.removeEventListener('mouseup',up);};window.addEventListener('mousemove',move);window.addEventListener('mouseup',up);}}
>
  <div className="chart-slider-thumb" style={{left:`${dataFinal.length>WIN?(off/Math.max(1,dataFinal.length-WIN))*(100-WIN/dataFinal.length*100):0}%`,width:`${dataFinal.length>0?(WIN/dataFinal.length)*100:100}%`}}/>
</div>
                        <button className="chart-slider-btn" onClick={()=>setAllOff(Math.min(dataFinal.length-WIN,off+1))} disabled={off>=dataFinal.length-WIN}>›</button></> }
                      </div>

                      <ResponsiveContainer width="100%" height={210}>
                        <ComposedChart data={sl} margin={{top:26,right:8,bottom:18,left:0}} barGap={4} barCategoryGap="30%">
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,60,100,0.1)" vertical={false}/>
                          <XAxis dataKey="label" tick={({x,y,payload})=>{const d=sl.find(s=>s.label===payload.value);return<text x={x} y={y+10} textAnchor="middle" fontSize={9} fill={d?.isCurrent?T.tealD:T.textM} fontWeight={d?.isCurrent?900:600}>{payload.value}</text>;}} axisLine={false} tickLine={false}/>
                          <YAxis tick={{fill:T.textM,fontSize:9}} axisLine={false} tickLine={false} width={34} tickFormatter={v=>v+'L'}/>
                          <Tooltip content={({active,payload,label})=>{
                            if(!active||!payload?.length)return null;
                            const d=sl.find(s=>s.label===label);
                            return(<div style={{background:'rgba(255,255,255,0.97)',border:'1px solid rgba(0,151,167,0.3)',borderRadius:10,padding:'8px 12px',fontSize:10}}>
                              <p style={{color:T.tealD,fontWeight:800,margin:'0 0 4px'}}>{label}</p>
                              {d?.achieved!=null&&<p style={{color:T.teal,margin:'0 0 2px',fontWeight:700}}>Achieved: {d.achieved} L sqft</p>}
                              {d?.target!=null&&<p style={{color:'#607d8b',margin:'0 0 2px'}}>Target: {d.target} L sqft</p>}
                              {d?.projection!=null&&<p style={{color:'#22c55e',margin:0,fontWeight:700}}>▲ Projection: {d.projection} L sqft</p>}
                            </div>);
                          }}/>
                          <Legend wrapperStyle={{fontSize:9,fontWeight:700}} iconSize={8} payload={[{value:'Target',type:'rect',color:'#b0bec5'},{value:'Achieved',type:'rect',color:T.teal},{value:'Projection',type:'line',color:'#22c55e'}]}/>
                          <Bar dataKey="target" name="Target" fill="#b0bec5" fillOpacity={0.75} radius={[3,3,0,0]} barSize={18} isAnimationActive={true} animationDuration={1000}>
                            <LabelList dataKey="target" position="top" style={{fill:'#607d8b',fontSize:8,fontWeight:700}} formatter={v=>v>0?v+'L':''}/>
                          </Bar>
                          <Bar dataKey="achieved" name="Achieved" fill={T.teal} radius={[3,3,0,0]} barSize={18} isAnimationActive={true} animationDuration={800}>
                            {sl.map((d,i)=><Cell key={i} fill={d.isCurrent?T.tealD:T.teal} fillOpacity={d.isCurrent?1:0.85}/>)}
                            <LabelList dataKey="achieved" position="top" style={{fill:T.tealD,fontSize:8,fontWeight:800}} formatter={v=>v!=null&&v>0?v+'L':''}/>
                          </Bar>

                          <Line type="monotone" dataKey="targetLine" stroke="#607d8b" strokeWidth={2} strokeDasharray="5 3" dot={{r:3,fill:'#607d8b',stroke:'#fff',strokeWidth:1.5}} activeDot={{r:4}} legendType="none" connectNulls={false}/>
                          <Line type="monotone" dataKey="projection" name="Adjusted" stroke="#22c55e" strokeWidth={2.5} strokeDasharray="6 2" dot={({cx,cy,payload})=>payload.projection!=null?<circle cx={cx} cy={cy} r={5} fill="#22c55e" stroke="#fff" strokeWidth={2}/>:<g/>} activeDot={{r:6,fill:'#22c55e'}} connectNulls={false}>
                            <LabelList dataKey="projection" position="top" offset={18} content={({x,y,value})=>{if(value==null)return null;const txt='▲'+value+'L';const w=txt.length*5.5+8;return(<g><rect x={x-w/2} y={y-28} width={w} height={16} rx={4} fill="white" stroke="#22c55e" strokeWidth={1} opacity={0.95}/><text x={x} y={y-17} textAnchor="middle" fill="#16a34a" fontSize={8} fontWeight={900}>{txt}</text></g>);}}/>
                          </Line>
                          <Line type="monotone" dataKey="bridge" stroke="#90a4ae" strokeWidth={1.5} strokeDasharray="4 3" dot={false} activeDot={false} legendType="none" connectNulls={true}/>
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
                    // Rate projection — project avg rate for next quarter
                    const todayR=new Date();
                    const rQS=Math.floor((todayR.getMonth())/3)*3+1;
                    const ml3=(y,m)=>{const n={1:'Jan',2:'Feb',3:'Mar',4:'Apr',5:'May',6:'Jun',7:'Jul',8:'Aug',9:'Sep',10:'Oct',11:'Nov',12:'Dec'};return n[m]+"'"+String(y).slice(2);};
                    const moNR={Jan:1,Feb:2,Mar:3,Apr:4,May:5,Jun:6,Jul:7,Aug:8,Sep:9,Oct:10,Nov:11,Dec:12};
                    const lblYmR=l=>{const p=l.match(/([A-Za-z]{3})'(\d{2})/);return p?(2000+parseInt(p[2]))*100+(moNR[p[1]]||0):0;};
                    const todayYMR=todayR.getFullYear()*100+(todayR.getMonth()+1);
                    const cqmObjR=[0,1,2].map(i=>{let m=rQS+i,y=todayR.getFullYear();if(m>12){m-=12;y++;}return{label:ml3(y,m),ym:y*100+m};});
                    const pastCqmR=cqmObjR.filter(o=>o.ym<todayYMR).map(o=>o.label);
                    const futureCqmR=cqmObjR.filter(o=>o.ym>=todayYMR).map(o=>o.label);
                    // Rate projection: use RAW (unfiltered) actual rates so FY filter doesn't break projection
                    const rawActualRatesMap=raw?.monthlyActualRates||{};
                    const allActualRates=Object.entries(rawActualRatesMap).filter(([,v])=>v>0).map(([label,rate])=>({label,actualRate:rate,ym:lblYmR(label)})).filter(d=>d.ym>0&&d.ym<=todayYMR).sort((a,b)=>a.ym-b.ym);
                    const recentRates=allActualRates.slice(-3);
                    const lastKnownRate=recentRates.length>0?recentRates[recentRates.length-1].actualRate:0;
                    // Compute avg monthly trend (slope) from recent 3 months
                    const rateSlope=(()=>{
                      if(recentRates.length<2)return 0;
                      const deltas=[];
                      for(let i=1;i<recentRates.length;i++)deltas.push(recentRates[i].actualRate-recentRates[i-1].actualRate);
                      return deltas.reduce((s,d)=>s+d,0)/deltas.length;
                    })();
                    // Cap slope to avoid wild projections — max ±2% of lastKnownRate per month
                    const cappedSlope=Math.max(Math.min(rateSlope,lastKnownRate*0.02),-lastKnownRate*0.02);
                    const lastKnownLbl=recentRates.length>0?recentRates[recentRates.length-1].label:'';
                    const lastKnownYm=lblYmR(lastKnownLbl);

                    // ── REQUIRED RATE LOGIC ──────────────────────────────────────────────
                    // Required Rate = (Total Project Sales Value - Sold TCV) / Available area
                    // i.e. what rate must be achieved on remaining inventory to hit overall target TSV
                    const soldTCVVal=(kpiEx.totalTCVCr||0)*1e7;
                    const availAreaR=kpiEx.availAreaSqft||0;
                    // AOP target rate = average of ALL monthly target rates (from raw targets)
                    const allRawTargets=(raw?.monthlyTargets||[]).filter(t=>t.targetRate>0);
                    const aopTargetRate=allRawTargets.length>0?Math.round(allRawTargets.reduce((s,t)=>s+t.targetRate,0)/allRawTargets.length):lastKnownRate;
                    // Target TSV = soldTCV + (available area × AOP target rate)
                    const targetTSVVal=soldTCVVal+(availAreaR*aopTargetRate);
                    const remainingTSV=Math.max(0,targetTSVVal-soldTCVVal);
                    // Required rate = remainingTSV / available area = aopTargetRate (by definition)
                    const requiredRate=availAreaR>0?Math.round(remainingTSV/availAreaR):aopTargetRate;
                    // Current achieved avg rate = TCV / booked area (more accurate than kpiEx.avgRatePerSqft)
                    const bookedAreaActual=kpiEx.bookedAreaSqft||1;
                    const currentAvgRate=soldTCVVal>0&&bookedAreaActual>0?Math.round(soldTCVVal/bookedAreaActual):kpiEx.avgRatePerSqft||0;
                    const avgRateR=aopTargetRate;

                    // Current quarter projection (short-term trend)
                    const rateProjMap={};
                    futureCqmR.forEach((lbl)=>{
                      const lym=lblYmR(lbl);
                      const monthsAhead=Math.max(1,Math.round((lym-lastKnownYm)/100)*12+((lym%100)-(lastKnownYm%100)));
                      const projected=Math.round(lastKnownRate+(cappedSlope*monthsAhead));
                      rateProjMap[lbl]=projected>0?projected:lastKnownRate;
                    });
                    const bridgeRateProjMap={...rateProjMap};
                    if(lastKnownLbl&&!futureCqmR.includes(lastKnownLbl)){
                      bridgeRateProjMap[lastKnownLbl]=lastKnownRate;
                    }
                    const sortedRateProj=Object.keys(bridgeRateProjMap).sort((a,b)=>lblYmR(a)-lblYmR(b));
                    const lastRateLbl=sortedRateProj[sortedRateProj.length-1];
                    const nqBMoR=rQS+3>12?rQS-9:rQS+3;const nqBYR=rQS+3>12?todayR.getFullYear()+1:todayR.getFullYear();
                    const nqBLblR=ml3(nqBYR,nqBMoR);
                    const rawDataR=monthlyWithTargets.map(d=>({label:d.label,isFuture:d.isFuture,isCurrent:d.label===TODAY_LABEL,
                      achieved:d.actualRate>0?d.actualRate:null,
                      target:d.targetRateLine||null,
                      targetLine:(()=>{if(futureCqmR.includes(d.label)&&rateProjMap[d.label]!=null)return null;const p=d.label.match(/([A-Za-z]{3})'(\d{2})/);if(p&&(2000+parseInt(p[2]))*100+(moNR[p[1]]||0)<todayYMR)return null;return d.targetRateLine||null;})(),
                      // Current quarter short-term projection
                      projection:(()=>{
                        if(!futureCqmR.includes(d.label))return null;
                        const dym=lblYmR(d.label);
                        const steps=((dym%100)-(lastKnownYm%100))+Math.round((dym-lastKnownYm)/100)*12;
                        return Math.round(lastKnownRate+cappedSlope*Math.abs(steps))||null;
                      })(),
                      // Required rate line — runs from today through all future months
                      requiredRate:(()=>{
                        const dym=lblYmR(d.label);
                        if(dym<todayYMR)return null; // only future months
                        return requiredRate>0?requiredRate:null;
                      })(),
                      bridge:(d.label===lastRateLbl?rateProjMap[lastRateLbl]:d.label===nqBLblR?(monthlyWithTargets.find(r=>r.label===nqBLblR)?.targetRateLine||null):null),
                    }));
                    const data=rMode==='quarterly'?toQuarterly(rawDataR,'label').map(q=>({...q,isFuture:false,isCurrent:false})):rawDataR;
                    const parseM=l=>{const p=l.match(/([A-Za-z]{3})'(\d{2})/);if(!p)return'';const mn={Jan:'01',Feb:'02',Mar:'03',Apr:'04',May:'05',Jun:'06',Jul:'07',Aug:'08',Sep:'09',Oct:'10',Nov:'11',Dec:'12'};return(p[2]>='90'?'19':'20')+p[2]+'-'+mn[p[1]];};const dataF=chartMonthFrom?data.filter(d=>parseM(d.label)>=chartMonthFrom):data;
                    const dataFinal=chartMonthFrom?dataF:data;
                    const cur=dataFinal.findIndex(d=>d.isCurrent);
                    // Start from first month with actual rate data so achieved line is visible
                    const firstActualIdx=dataFinal.findIndex(d=>d.achieved!=null&&d.achieved>0);
                    const def=firstActualIdx>=0?Math.max(0,firstActualIdx):cur>=2?cur-2:Math.max(0,dataFinal.length-WIN);
                    const off=chartMonthFrom?Math.min(Math.max(chartOff<0?0:chartOff,0),Math.max(0,dataFinal.length-WIN)):Math.min(Math.max(chartOff<0?def:chartOff,0),Math.max(0,dataFinal.length-WIN));
                    const sl=dataFinal.slice(off,off+WIN);
                    return(<>
                      <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:6}}>
                        
                        {!chartRangeCompact&&dataFinal.length>WIN&&<><button className="chart-slider-btn" onClick={()=>setAllOff(Math.max(0,off-1))} disabled={off===0}>‹</button>
                        <div className="chart-slider-track"
  onClick={e=>{const r=e.currentTarget.getBoundingClientRect();const p=(e.clientX-r.left)/r.width;setAllOff(Math.round(p*Math.max(0,dataFinal.length-WIN)));}}
  onMouseDown={e=>{e.preventDefault();const thumb=e.currentTarget.querySelector('.chart-slider-thumb');if(thumb)thumb.classList.add('dragging');const track=e.currentTarget;const move=ev=>{const r=track.getBoundingClientRect();const p=Math.max(0,Math.min(1,(ev.clientX-r.left)/r.width));setAllOff(Math.round(p*Math.max(0,dataFinal.length-WIN)));};const up=()=>{if(thumb)thumb.classList.remove('dragging');window.removeEventListener('mousemove',move);window.removeEventListener('mouseup',up);};window.addEventListener('mousemove',move);window.addEventListener('mouseup',up);}}
>
  <div className="chart-slider-thumb" style={{left:`${dataFinal.length>WIN?(off/Math.max(1,dataFinal.length-WIN))*(100-WIN/dataFinal.length*100):0}%`,width:`${dataFinal.length>0?(WIN/dataFinal.length)*100:100}%`}}/>
</div>
                        <button className="chart-slider-btn" onClick={()=>setAllOff(Math.min(dataFinal.length-WIN,off+1))} disabled={off>=dataFinal.length-WIN}>›</button></> }
                      </div>
                      {/* Legend row */}
                      <div style={{display:'flex',gap:16,marginBottom:8,flexWrap:'wrap',alignItems:'center'}}>
                        {[['#8b1a1a','Achieved Rate (psf)','—'],['#1a237e','Target Rate (psf)','—'],['#2e7d32','Adjusted Rate for Balance Year','– –']].map(([col,lbl,dash])=>(
                          <div key={lbl} style={{display:'flex',alignItems:'center',gap:5}}>
                            <svg width="22" height="8"><line x1="0" y1="4" x2="22" y2="4" stroke={col} strokeWidth="2.5" strokeDasharray={dash==='– –'?'6 3':'0'}/></svg>
                            <span style={{fontSize:9,color:col,fontWeight:700}}>{lbl}</span>
                          </div>
                        ))}
                        {/* % achieved badge */}
                        {(()=>{
                          const bookedU=kpiEx.bookedAreaSqft>0?pAAll.length:0;
                          const totalU=kpiEx.totalSuperArea>0?Math.round(kpiEx.totalSuperArea/(kpiEx.bookedAreaSqft/Math.max(bookedU,1))):0;
                          const pctSold=totalU>0?Math.round(bookedU/totalU*100):Math.round((kpiEx.bookedAreaSqft/(kpiEx.totalSuperArea||1))*100);
                          return <div style={{marginLeft:'auto',background:'#fff9c4',border:'2px solid #f9a825',borderRadius:6,padding:'2px 10px',fontSize:14,fontWeight:900,color:'#e65100'}}>{pctSold}%</div>;
                        })()}
                      </div>
                      <div style={{display:'flex',gap:12}}>
                        {/* Main dual-axis chart */}
                        <div style={{flex:1}}>
                          <ResponsiveContainer width="100%" height={240}>
                            <ComposedChart data={sl} margin={{top:16,right:60,bottom:18,left:0}}>
                              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,60,100,0.08)" vertical={false}/>
                              <XAxis dataKey="label" tick={({x,y,payload})=>{const d=sl.find(s=>s.label===payload.value);return <text x={x} y={y+10} textAnchor="middle" fontSize={9} fill={d?.isCurrent?T.tealD:d?.isFuture?'#90a4ae':T.textM} fontWeight={d?.isCurrent?900:600}>{payload.value}</text>;}} axisLine={false} tickLine={false}/>
                              <YAxis tick={{fill:'#37474f',fontSize:9}} tickLine={false} axisLine={false} width={58} tickFormatter={v=>'₹'+v.toLocaleString('en-IN')}
                                domain={[()=>{const vals=sl.flatMap(d=>[d.achieved,d.targetLine,d.requiredRate]).filter(v=>v!=null&&v>15000&&v<100000);if(!vals.length)return 21000;const mn=Math.min(...vals);const mx=Math.max(...vals);const spread=Math.max(mx-mn,300);return Math.floor((mn-spread*0.2)/500)*500;},()=>{const vals=sl.flatMap(d=>[d.achieved,d.targetLine,d.requiredRate]).filter(v=>v!=null&&v>15000&&v<100000);if(!vals.length)return 24000;const mx=Math.max(...vals);const mn=Math.min(...vals);const spread=Math.max(mx-mn,300);return Math.ceil((mx+spread*0.2)/500)*500;}]}
                              />
                              <Tooltip content={({active,payload,label})=>{if(!active||!payload?.length)return null;const d=sl.find(s=>s.label===label);return(<div style={{background:'rgba(255,255,255,0.97)',border:'1px solid rgba(0,100,140,0.2)',borderRadius:8,padding:'7px 10px',fontSize:10}}><p style={{fontWeight:800,margin:'0 0 4px',color:T.navy}}>{label}</p>{d?.achieved!=null&&d.achieved>15000&&<p style={{color:'#8b1a1a',margin:'2px 0'}}>Achieved Rate: ₹{Math.round(d.achieved).toLocaleString('en-IN')}/sqft</p>}{d?.targetLine!=null&&<p style={{color:'#1a237e',margin:'2px 0'}}>Target Rate: ₹{Math.round(d.targetLine).toLocaleString('en-IN')}/sqft</p>}{d?.requiredRate!=null&&<p style={{color:'#2e7d32',margin:'2px 0'}}>Required Rate: ₹{Math.round(d.requiredRate).toLocaleString('en-IN')}/sqft</p>}</div>);}}/>
                              <Line type="monotone" dataKey="achieved" name="Achieved Rate" stroke="#8b1a1a" strokeWidth={2.5} dot={({cx,cy,payload})=>payload.achieved>15000?<circle cx={cx} cy={cy} r={4} fill="#8b1a1a" stroke="#fff" strokeWidth={1.5}/>:<g/>} activeDot={{r:5}} connectNulls={true} legendType="none"/>
                              <Line type="monotone" dataKey="targetLine" name="Target Rate" stroke="#1a237e" strokeWidth={2} dot={{r:3,fill:'#1a237e',stroke:'#fff',strokeWidth:1.5}} activeDot={{r:4}} connectNulls={true} legendType="none"/>
                              <Line type="monotone" dataKey="requiredRate" name="Adjusted Rate" stroke="#2e7d32" strokeWidth={2.5} strokeDasharray="8 3" dot={({cx,cy,payload})=>payload.requiredRate!=null&&payload.label===sl[0]?.label?<circle cx={cx} cy={cy} r={4} fill="#2e7d32" stroke="#fff" strokeWidth={2}/>:<g/>} activeDot={{r:5,fill:'#2e7d32'}} connectNulls={true} legendType="none"/>
                            </ComposedChart>
                          </ResponsiveContainer>
                        </div>
                        {/* Callout box — right side like reference */}
                        {requiredRate>0&&(
                          <div style={{width:160,flexShrink:0,display:'flex',flexDirection:'column',gap:8}}>
                            <div style={{background:'rgba(106,27,154,0.08)',border:'1.5px solid rgba(106,27,154,0.3)',borderRadius:8,padding:'8px 10px'}}>
                              <p style={{fontSize:9,fontWeight:900,color:'#4a148c',margin:'0 0 2px',textTransform:'uppercase',lineHeight:1.3}}>TARGET BUSINESS PLAN TSV AT RISK WITH CURRENT RATE</p>
                            </div>
                            <div style={{background:'rgba(255,255,255,0.9)',border:'1.5px solid rgba(0,100,140,0.15)',borderRadius:8,padding:'8px 10px',flex:1}}>
                              <p style={{fontSize:10,fontWeight:800,color:'#1a237e',margin:'0 0 6px'}}>Rate (Target Vs Actual)</p>
                              <p style={{fontSize:9,fontWeight:700,color:'#e65100',margin:'0 0 2px'}}>New Rate of {requiredRate.toLocaleString('en-IN')}</p>
                              <p style={{fontSize:9,color:'#37474f',margin:0}}>required against ₹{currentAvgRate.toLocaleString('en-IN')} (current avg rate) to maintain AOP TSV of ₹{((soldTCVVal+(availAreaR*requiredRate))/1e7).toFixed(0)} Cr</p>
                            </div>
                          </div>
                        )}
                      </div>
                    </>);
                  })()}
                </GC>

              </div>{/* end 2x2 chart grid */}

              {/* ── SECTION: Tower & Type wise Sales ── */}
              <div style={{
                display:showTowerType?'flex':'none',
                alignItems:'center',gap:10,margin:'16px 0 10px',
                animation:showTowerType?'flipIn 0.7s cubic-bezier(0.4,0,0.2,1) forwards':'none',
              }}>
                <div style={{background:'linear-gradient(135deg,#0097a7,#00bcd4)',borderRadius:10,padding:'5px 18px',display:'flex',alignItems:'center',gap:8,boxShadow:'0 2px 10px rgba(0,151,167,0.3)'}}>
                  <span style={{fontSize:13}}>🏗️</span>
                  <span style={{fontSize:11,fontWeight:900,color:'#fff',textTransform:'uppercase',letterSpacing:1}}>Tower &amp; Type Wise Sales</span>
                </div>
                <div style={{flex:1,height:1,background:'rgba(0,151,167,0.15)',borderRadius:1}}/>
              </div>
              <div style={{display:showTowerType?'grid':'none',gridTemplateColumns:'1fr 1fr',gap:12,transformOrigin:'center center',animation:showTowerType?'flipIn 0.8s cubic-bezier(0.4,0,0.2,1) forwards':'none'}}>

                {/* ── CHART: Tower Wise % Sold ─────────────────────── */}
                <GC style={{padding:16}}>
                  <SH title="Tower Wise Sold % — Units & TSV" sub="Unit % sold vs TSV % sold per tower"/>
                  {(()=>{
                    const selProjs=filters.project?filters.project.split('||').filter(Boolean):[];
                    const editionOnly=selProjs.length===1&&selProjs[0]==='SMARTWORLD THE EDITION';

                    let twData=[];
                    if(editionOnly){
                      // Live from invr + towerData for BSP
                      const inv={};
                      iF.forEach(r=>{const t=r.tower||'';if(!t)return;if(!inv[t])inv[t]={booked:0,total:0};inv[t].total++;if(r.status==='Booked')inv[t].booked++;});
                      twData=Object.entries(inv).filter(([t])=>t).map(([t,v])=>{
                        const td=towerData.find(r=>r.tower===t&&r.project==='SMARTWORLD THE EDITION')||{};
                        const totalBSP=(td.totalBSPCr||0)+(td.available||0)*(td.pricePerSqft||0)*((td.bookedArea||1)/(td.booked||1))/1e7;
                        const tsvPct=totalBSP>0?Math.round((td.totalBSPCr||0)/totalBSP*100):0;
                        return {tower:t, unitPct:v.total>0?Math.round(v.booked/v.total*100):0,
                          tsvPct, booked:v.booked, total:v.total,
                          bspCr:td.totalBSPCr||0, avgRate:td.pricePerSqft||0};
                      });
                    } else {
                      const filtered=towerData.filter(r=>!selProjs.length||selProjs.includes(r.project));
                      twData=filtered.map(r=>{
                        // Total potential BSP = sold BSP + (available units × avg rate × avg area)
                        const avgArea = r.booked>0 ? (r.bookedArea/r.booked) : 0;
                        const availBSP = (r.available||0)*avgArea*(r.pricePerSqft||0)/1e7;
                        const totalBSP = (r.totalBSPCr||0) + availBSP;
                        const tsvPct = totalBSP>0 ? Math.round((r.totalBSPCr||0)/totalBSP*100) : 0;
                        return {tower:r.tower+(selProjs.length!==1?` (${(r.project||'').split(' ').pop()})` :''),
                          unitPct:r.pctSold||0, tsvPct,
                          booked:r.booked, total:r.total||r.booked+r.cancelled,
                          bspCr:r.totalBSPCr||0, avgRate:r.pricePerSqft||0};
                      });
                    }
                    twData=twData.sort((a,b)=>a.tower.localeCompare(b.tower));
                    return(
                      <ResponsiveContainer width="100%" height={240}>
                        <BarChart data={twData} margin={{top:24,right:8,bottom:24,left:0}} barGap={4} barCategoryGap="25%">
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,60,100,0.08)" vertical={false}/>
                          <XAxis dataKey="tower" tick={{fill:T.text,fontSize:9,fontWeight:700}} axisLine={false} tickLine={false}/>
                          <YAxis domain={[0,100]} tickFormatter={v=>v+'%'} tick={{fill:T.textM,fontSize:9}} axisLine={false} tickLine={false} width={32}/>
                          <Tooltip content={({active,payload,label})=>{
                            if(!active||!payload?.length)return null;
                            const d=twData.find(r=>r.tower===label);
                            return(<div style={{background:'#fff',border:'1px solid #e5e7eb',borderRadius:8,padding:'8px 12px',fontSize:10,boxShadow:'0 2px 8px rgba(0,0,0,0.1)'}}>
                              <p style={{margin:'0 0 4px',fontWeight:800,color:T.navy}}>{label}</p>
                              <p style={{margin:'0 0 2px',color:T.tealD,fontWeight:700}}>Units: {d?.booked}/{d?.total} ({d?.unitPct}%)</p>
                              <p style={{margin:'0 0 2px',color:T.amber,fontWeight:700}}>TSV: ₹{d?.bspCr?.toFixed(1)} Cr ({d?.tsvPct}%)</p>
                              <p style={{margin:0,color:'#9ca3af',fontSize:9}}>Avg Rate: ₹{d?.avgRate?.toLocaleString('en-IN')}/sqft</p>
                            </div>);
                          }}/>
                          <Legend wrapperStyle={{fontSize:9,fontWeight:700}} iconSize={8}/>
                          <Bar dataKey="unitPct" name="Unit % Sold" fill={T.tealD} radius={[3,3,0,0]} maxBarSize={32}>
                            <LabelList dataKey="unitPct" position="top" formatter={v=>v+'%'} style={{fill:T.tealD,fontSize:8,fontWeight:800}}/>
                          </Bar>
                          <Bar dataKey="tsvPct" name="TSV % Sold" fill={T.amber} radius={[3,3,0,0]} maxBarSize={32}>
                            <LabelList dataKey="tsvPct" position="top" formatter={v=>v+'%'} style={{fill:T.amber,fontSize:8,fontWeight:800}}/>
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    );
                  })()}
                </GC>


                {/* ── CHART: Tower Wise Rate Movement ─────────────────────── */}
                <GC style={{padding:16}}>
                  <SH title="Tower Wise Rate Movement" sub="Avg ₹/sqft per tower by financial year · overall rate line"/>
                  {(()=>{
                    const FYS=['FY2023-24','FY2024-25','FY2025-26'];
                    const FY_COLORS={[FYS[0]]:'#0077b6',[FYS[1]]:'#0097a7',[FYS[2]]:'#1a3a5c'};
                    const FY_LABELS={[FYS[0]]:'FY 2024',[FYS[1]]:'FY 2025',[FYS[2]]:'FY 2026'};
                    const map={};
                    pAAll.forEach(r=>{
                      const t=r.tower||'';const fy=r.bookingFY||'';
                      if(!t||!fy)return;
                      if(!map[t])map[t]={};
                      if(!map[t][fy])map[t][fy]={bsp:0,area:0};
                      map[t][fy].bsp+=(r.bsp||0);
                      map[t][fy].area+=(r.superArea||0);
                    });
                    const towers=Object.keys(map).sort();
                    const data=towers.map(t=>{
                      const row={tower:t};
                      let totalBsp=0,totalArea=0;
                      FYS.forEach(fy=>{
                        const v=map[t][fy]||{bsp:0,area:0};
                        row[fy]=v.area>0?Math.round(v.bsp/v.area):null;
                        totalBsp+=v.bsp;totalArea+=v.area;
                      });
                      row.avg=totalArea>0?Math.round(totalBsp/totalArea):null;
                      return row;
                    });
                    if(!data.length)return<p style={{color:T.textL,fontSize:11,textAlign:'center',padding:20}}>Select a project to view tower data</p>;
                    return(
                      <ResponsiveContainer width="100%" height={240}>
                        <ComposedChart data={data} margin={{top:24,right:12,bottom:24,left:0}} barGap={2}>
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,60,100,0.08)" vertical={false}/>
                          <XAxis dataKey="tower" tick={{fill:T.textM,fontSize:10,fontWeight:700}} axisLine={false} tickLine={false}/>
                          <YAxis tick={{fill:T.textM,fontSize:9}} axisLine={false} tickLine={false} width={40} tickFormatter={v=>v?v.toLocaleString('en-IN'):''} domain={['auto','auto']}/>
                          <Tooltip content={<CTip fmt={v=>v?'₹'+v.toLocaleString('en-IN')+'/sqft':'N/A'}/>}/>
                          <Legend wrapperStyle={{fontSize:9,fontWeight:700}} iconSize={8} formatter={v=>FY_LABELS[v]||v}/>
                          {FYS.map(fy=>(
                            <Bar key={fy} dataKey={fy} name={fy} fill={FY_COLORS[fy]} radius={[3,3,0,0]} barSize={18}>
                              <LabelList dataKey={fy} position="top" style={{fill:FY_COLORS[fy],fontSize:7,fontWeight:700}} formatter={v=>v?v.toLocaleString('en-IN'):''}/>
                            </Bar>
                          ))}
                          <Line type="monotone" dataKey="avg" name="Average" stroke="#22c55e" strokeWidth={2} dot={{r:4,fill:'#22c55e',stroke:'#fff',strokeWidth:1.5}} activeDot={{r:6}}>
                            <LabelList dataKey="overall" position="top" style={{fill:'#16a34a',fontSize:8,fontWeight:800}} formatter={v=>v?v.toLocaleString('en-IN'):''}/>
                          </Line>
                        </ComposedChart>
                      </ResponsiveContainer>
                    );
                  })()}
                </GC>

                {/* ── CHART: Rate Trend Over Time (scatter) ───────────── */}
                <GC style={{padding:16}}>
                  <SH title="Rate Trend Over Time" sub="₹/sqft per booking · coloured by tower · scroll for full timeline · filtered by project"/>
                  {(()=>{
                    const pts=pAAll.filter(r=>r.bookingDate&&r.bsp&&r.superArea>0).map(r=>({
                      date:r.bookingDate,
                      ts:new Date(r.bookingDate).getTime(),
                      rate:Math.round(r.bsp/r.superArea),
                      area:r.superArea,
                      tower:r.tower||'?',
                      name:r.customer||r.unit||'',
                    })).sort((a,b)=>a.ts-b.ts);
                    if(!pts.length)return<p style={{color:T.textL,fontSize:11,textAlign:'center',padding:20}}>Select a project with booking dates to view rate trend</p>;
                    const n=pts.length;
                    const xMean=(n-1)/2;
                    const yArr=pts.map(p=>p.rate);
                    const yMean=yArr.reduce((s,v)=>s+v,0)/n;
                    const num=pts.reduce((s,_,i)=>s+(i-xMean)*(yArr[i]-yMean),0);
                    const den=pts.reduce((s,_,i)=>s+(i-xMean)**2,0);
                    const slope=den?num/den:0;
                    const intercept=yMean-slope*xMean;
                    const trendData=[{ts:pts[0].ts,trend:Math.round(intercept)},{ts:pts[n-1].ts,trend:Math.round(intercept+slope*(n-1))}];
                    // Get unique towers for legend + colour map
                    const towerKeys=[...new Set(pts.map(p=>p.tower))].sort();
                    const PALETTE=['#0077b6','#00bcd4','#4dd0e1','#26c6da','#0288d1','#0097a7','#006064','#00838f'];
                    const TOWER_COLOR=Object.fromEntries(towerKeys.map((t,i)=>[t,PALETTE[i%PALETTE.length]]));
                    const fmt=ts=>{const d=new Date(ts);return d.toLocaleDateString('en-IN',{month:'short',year:'2-digit'});};
                    // Window: show 90-day chunks with left/right scroll
                    const minTs=pts[0].ts, maxTs=pts[n-1].ts;
                    const totalDays=Math.ceil((maxTs-minTs)/86400000)||1;
                    const WIN_DAYS=180;
                    const needsScroll=totalDays>WIN_DAYS;
                    const visiblePts=pts; // Show all, let overflow scroll handle it
                    // Spread wide: 6px per point minimum, ensures dots don't overlap
                    const PX_PER_PT=4;
                    const innerW=Math.max(n*PX_PER_PT+100, 600);
                    const TICK_COUNT=8; // max readable X ticks
                    return(
                      <>
                        <div style={{overflowX:'auto',overflowY:'hidden',paddingBottom:4}}>
                          <div style={{width:innerW+'px',minWidth:'100%'}}>
                            <ResponsiveContainer width="100%" height={260}>
                              <ComposedChart margin={{top:8,right:20,bottom:48,left:0}}>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,60,100,0.06)"/>
                                <XAxis dataKey="ts" type="number" domain={[pts[0].ts,pts[n-1].ts]} scale="time"
                                  tickFormatter={fmt} tick={{fill:T.textM,fontSize:9,fontWeight:600}} axisLine={false} tickLine={false}
                                  angle={-35} textAnchor="end" height={44} ticks={Array.from({length:Math.ceil((pts[n-1].ts-pts[0].ts)/(30*86400000))+1},(_,i)=>pts[0].ts+i*30*86400000).filter(t=>t<=pts[n-1].ts)}/>
                                <YAxis tick={{fill:T.textM,fontSize:9}} axisLine={false} tickLine={false} width={48}
                                  tickFormatter={v=>v.toLocaleString('en-IN')} domain={['auto','auto']}/>
                                <Tooltip content={({active,payload})=>{
                                  if(!active||!payload?.length)return null;
                                  const d=payload[0]?.payload;
                                  if(!d?.rate)return null;
                                  return(<div style={{background:'#fff',border:'1px solid #e5e7eb',borderRadius:8,padding:'8px 12px',fontSize:10,boxShadow:'0 2px 8px rgba(0,0,0,0.1)'}}>
                                    
                                    <p style={{margin:'3px 0',color:T.tealD,fontWeight:800}}>₹{d.rate.toLocaleString('en-IN')}/sqft</p>
                                    <p style={{margin:0,color:T.textM}}>{d.date} · {d.tower}</p>
                                  </div>);
                                }}/>
                                <Scatter data={pts} dataKey="rate" name="rate">
                                  {pts.map((p,i)=><Cell key={i} fill={TOWER_COLOR[p.tower]||T.teal} fillOpacity={0.8}/>)}
                                </Scatter>
                                <Line data={trendData} type="linear" dataKey="trend" stroke="#22c55e" strokeWidth={2.5} dot={false} strokeDasharray="6 3" name="Trend"/>
                                <Legend wrapperStyle={{fontSize:9,fontWeight:700}} iconSize={8}
                                  payload={[...towerKeys.map(t=>({value:t,type:'circle',color:TOWER_COLOR[t]})),{value:'Trend',type:'line',color:'#22c55e'}]}/>
                              </ComposedChart>
                            </ResponsiveContainer>
                          </div>
                        </div>
                        <div style={{textAlign:'center',fontSize:9,color:T.textL,marginTop:2}}>← scroll to see full timeline →</div>
                      </>
                    );
                  })()}
                </GC>

                {/* ── CHART: Type Wise % Sale ─────────────────────── */}
                <GC style={{padding:16}}>
                  <SH title="Type Wise % Sale" sub="Units sold vs unsold per unit type · % sold line · all projects unless filtered"/>
                  {(()=>{
                    // bhkS is already filtered by iF (invr filtered) + pA (pdrn filtered) — works for all projects
                    const SHORTEN=v=>{
                      if(!v)return'';
                      if(v.startsWith('TYPE '))return v.replace('- 3BHK + STUDY + UTILITY','- 3BHK').replace('- 4BHK + STUDY + 2 UTILITY','- 4BHK').replace('- 4BHK + STUDY + UTILITY','- 4BHK').replace('- 2BHK + STUDY + UTILITY','- 2BHK');
                      return v.length>14?v.slice(0,14)+'…':v;
                    };
                    const EDITION_ORDER=['TYPE A- 3BHK + STUDY + UTILITY','TYPE A1- 3BHK + STUDY + UTILITY','TYPE B- 4BHK + STUDY + UTILITY','TYPE B1- 4BHK + STUDY + UTILITY','TYPE D- 3BHK + STUDY + UTILITY','TYPE E- 4BHK + STUDY + 2 UTILITY','TYPE F- 4BHK + STUDY + 2 UTILITY','TYPE G- 4BHK + STUDY + 2 UTILITY','TYPE C- 2BHK + STUDY + UTILITY'];
                    const selProjs=filters.project?filters.project.split('||').filter(Boolean):[];
                    const editionOnly=selProjs.length===1&&selProjs[0]==='SMARTWORLD THE EDITION';
                    let sorted=[...bhkS];
                    if(editionOnly){
                      const orderMap={};EDITION_ORDER.forEach((k,i)=>orderMap[k]=i);
                      sorted=sorted.sort((a,b)=>(orderMap[a.bhk]??99)-(orderMap[b.bhk]??99));
                    } else {
                      sorted=sorted.sort((a,b)=>b.booked-a.booked);
                    }
                    const data=sorted.filter(r=>r.total>0).map(r=>({
                      label:SHORTEN(r.bhk),
                      sold:r.booked,
                      unsold:r.available,
                      total:r.total,
                      pct:r.total>0?Math.round(r.booked/r.total*100):0,
                      avgAreaSqft:r.avgArea||0,
                    }));
                    const minBarW=32, innerW=Math.max(data.length*minBarW+80, 300);
                    const needsScroll=data.length>8;
                    return(
                      <div style={{overflowX:needsScroll?'auto':'visible',overflowY:'hidden',paddingBottom:4}}>
                        <div style={{width:needsScroll?innerW+'px':'100%',minWidth:'100%'}}>
                          <ResponsiveContainer width="100%" height={240}>
                            <ComposedChart data={data} margin={{top:18,right:40,bottom:52,left:0}} barSize={Math.max(18,Math.min(28,Math.floor(innerW/Math.max(data.length,1)-8)))}>
                              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,60,100,0.08)" vertical={false}/>
                              <XAxis dataKey="label" axisLine={false} tickLine={false} interval={0} height={68}
                                tick={({x,y,payload})=>{
                                  const d=data.find(r=>r.label===payload.value);
                                  return(
                                    <g transform={`translate(${x},${y})`}>
                                      <text transform="rotate(-35)" textAnchor="end" fontSize={8} fontWeight={600} fill={T.textM} dy={0}>{payload.value}</text>
                                      {d?.avgAreaSqft>0&&<text transform="rotate(-35)" textAnchor="end" fontSize={7} fontWeight={500} fill={T.teal} dy={10}>{Math.round(d.avgAreaSqft).toLocaleString('en-IN')} sqft</text>}
                                    </g>
                                  );
                                }}
                              />
                              <YAxis yAxisId="left" tick={{fill:T.textM,fontSize:9}} axisLine={false} tickLine={false} width={30}/>
                              <YAxis yAxisId="right" orientation="right" tickFormatter={v=>v+'%'} domain={[0,120]} tick={{fill:T.tealD,fontSize:9}} axisLine={false} tickLine={false} width={32}/>
                              <Tooltip content={({active,payload,label})=>{
                                if(!active||!payload?.length)return null;
                                const d=data.find(r=>r.label===label);
                                return(<div style={{background:'rgba(255,255,255,0.97)',border:'1px solid rgba(0,151,167,0.3)',borderRadius:10,padding:'8px 12px',fontSize:10}}>
                                  <p style={{margin:'0 0 4px',fontWeight:800,color:T.navy,fontSize:11}}>{label}</p>
                                  <p style={{margin:'0 0 2px',color:T.tealD,fontWeight:700}}>Sold: {d?.sold} / {d?.total} units ({d?.pct}%)</p>
                                  <p style={{margin:'0 0 2px',color:T.textM}}>Unsold: {d?.unsold} units</p>
                                  {d?.avgAreaSqft>0&&<p style={{margin:0,color:T.textM}}>Avg Area: {Math.round(d.avgAreaSqft).toLocaleString('en-IN')} sq ft</p>}
                                </div>);
                              }}/>
                              <Legend wrapperStyle={{fontSize:9,fontWeight:700,paddingTop:4}} iconSize={8}/>
                              <Bar yAxisId="left" dataKey="sold" name="Units Sold" stackId="s" fill={T.tealD} fillOpacity={0.9} radius={[0,0,3,3]}>
                                <LabelList dataKey="pct" position="insideTop" offset={6} formatter={v=>v+'%'} style={{fill:'#fff',fontSize:8,fontWeight:800}}/>
                              </Bar>
                              <Bar yAxisId="left" dataKey="unsold" name="Unsold Units" stackId="s" fill={T.teal} fillOpacity={0.18} radius={[3,3,0,0]}/>
                              <Line yAxisId="right" type="monotone" dataKey="pct" name="% Sold" stroke={T.tealD} strokeWidth={2} dot={{r:3,fill:T.tealD}} activeDot={{r:5}}/>
                            </ComposedChart>
                          </ResponsiveContainer>
                        </div>
                        {needsScroll&&<div style={{textAlign:'center',fontSize:9,color:T.textL,marginTop:2,letterSpacing:0.3}}>← scroll to see more →</div>}
                      </div>
                    );
                  })()}
                </GC>

              </div>{/* end tower & type chart grid */}

              {/* Tower-wise Booking Status table */}
              <GC style={{padding:16,marginTop:4,display:showTowerType?'block':'none',animation:showTowerType?'flipIn 0.8s cubic-bezier(0.4,0,0.2,1) forwards':'none'}}>
                <SH title="Tower-wise Booking Status" sub="Booked · Cancelled · Booked Area (L sqft) · Avg Price/sq ft"/>
                {(()=>{
                  const INIT=10;
                  const SHORT={'SMARTWORLD THE EDITION':'THE EDITION','Smartworld Sky Arc':'Sky Arc','Trump Residences Gurgaon':'Residences Gurgaon','Smartworld Le Courtyard':'Le Courtyard','Smartworld Suites':'Suites'};
                  const tMap={};
                  (raw?.pdrn||[]).forEach(r=>{
                    const key=r.project+'||'+r.tower;
                    if(!r.tower)return;
                    if(!tMap[key])tMap[key]={project:r.project,tower:r.tower,booked:0,cancelled:0,bookedBsp:0,bookedArea:0,cancelledArea:0};
                    if(r.status==='ACTIVE'){tMap[key].booked++;tMap[key].bookedBsp+=(r.bsp||0);tMap[key].bookedArea+=(r.superArea||0);}
                    else if(r.status==='CANCELLED'){tMap[key].cancelled++;tMap[key].cancelledArea+=(r.superArea||0);}
                  });
                  const sp=filters.project?filters.project.split('||').filter(Boolean):[];
                  const rows=Object.values(tMap).filter(r=>sp.length===0||sp.includes(r.project)).map(r=>({...r,successPct:r.booked+r.cancelled>0?Math.round(r.booked/(r.booked+r.cancelled)*100):0,avgRate:r.bookedArea>0?Math.round(r.bookedBsp/r.bookedArea):0,totalSalesCr:+(r.bookedBsp/1e7).toFixed(1)})).sort((a,b)=>b.booked-a.booked);
                  const visible=showAllT?rows:rows.slice(0,INIT);
                  const TH={padding:'8px 10px',fontSize:9,fontWeight:800,color:T.textM,textTransform:'uppercase',letterSpacing:0.5,borderBottom:'1px solid rgba(0,100,140,0.12)',background:'rgba(0,100,140,0.03)',whiteSpace:'nowrap'};
                  const TD={padding:'7px 10px',fontSize:11,borderBottom:'1px solid rgba(0,100,140,0.06)',verticalAlign:'middle'};
                  return(<>
                    <div style={{overflowX:'auto'}}>
                      <table style={{width:'100%',borderCollapse:'collapse'}}>
                        <thead><tr>
                          <th style={{...TH,textAlign:'left'}}>Project</th>
                          <th style={{...TH,textAlign:'left'}}>Tower</th>
                          <th style={{...TH,textAlign:'right'}}>Booked</th>
                          <th style={{...TH,textAlign:'right'}}>Cancelled</th>
                          <th style={{...TH,textAlign:'center',minWidth:110}}>Success %</th>
                          <th style={{...TH,textAlign:'right'}}>Booked Area</th>
                          <th style={{...TH,textAlign:'right'}}>Cancelled Area</th>
                          <th style={{...TH,textAlign:'right'}}>Total Sales</th>
                          <th style={{...TH,textAlign:'right'}}>Avg ₹/sq ft</th>
                        </tr></thead>
                        <tbody>
                          {visible.map((r,i)=>(
                            <tr key={i} style={{background:i%2===0?'transparent':'rgba(0,100,140,0.02)'}}>
                              <td style={{...TD,color:T.textM,fontWeight:600}}>{SHORT[r.project]||r.project}</td>
                              <td style={{...TD,fontWeight:800,color:T.navy}}>{r.tower}</td>
                              <td style={{...TD,textAlign:'right'}}><span style={{display:'inline-flex',alignItems:'center',gap:4,justifyContent:'flex-end'}}><span style={{width:8,height:8,borderRadius:'50%',background:T.teal,flexShrink:0}}/>{r.booked}</span></td>
                              <td style={{...TD,textAlign:'right'}}><span style={{display:'inline-flex',alignItems:'center',gap:4,justifyContent:'flex-end'}}><span style={{width:8,height:8,borderRadius:'50%',background:'#ef4444',flexShrink:0}}/><span style={{color:'#ef4444',fontWeight:700}}>{r.cancelled}</span></span></td>
                              <td style={{...TD}}><div style={{display:'flex',alignItems:'center',gap:6}}><div style={{flex:1,height:6,background:'rgba(0,100,140,0.1)',borderRadius:3,overflow:'hidden'}}><div style={{width:r.successPct+'%',height:'100%',background:r.successPct>=90?'#22c55e':r.successPct>=80?T.teal:'#f59e0b',borderRadius:3}}/></div><span style={{fontSize:10,fontWeight:800,color:r.successPct>=90?'#16a34a':r.successPct>=80?T.tealD:'#b45309',minWidth:28}}>{r.successPct}%</span></div></td>
                              <td style={{...TD,textAlign:'right',color:T.textM}}>{(r.bookedArea/100000).toFixed(2)} L sqft</td>
                              <td style={{...TD,textAlign:'right',color:T.textM}}>{r.cancelledArea.toLocaleString('en-IN')} sq ft</td>
                              <td style={{...TD,textAlign:'right',fontWeight:800,color:T.tealD}}>₹{r.totalSalesCr} Cr</td>
                              <td style={{...TD,textAlign:'right'}}><span style={{background:'rgba(0,151,167,0.08)',borderRadius:6,padding:'2px 8px',fontWeight:800,color:T.navy,fontSize:10}}>₹{r.avgRate.toLocaleString('en-IN')}/sq ft</span></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    {rows.length>INIT&&<div style={{textAlign:'center',marginTop:12}}><button onClick={()=>setShowAllT(v=>!v)} style={{padding:'6px 20px',borderRadius:20,border:'1px solid '+T.teal,background:'rgba(0,151,167,0.06)',color:T.tealD,fontSize:10,fontWeight:700,cursor:'pointer'}}>{showAllT?'▲ Show less':'▼ Show '+String(rows.length-INIT)+' more towers'}</button></div>}
                  </>);
                })()}
              </GC>

              {/* ── SECTION: CP Wise Sales — always visible ── */}
              <div style={{display:'flex',alignItems:'center',gap:10,margin:'16px 0 10px',animation:'flipIn 0.7s cubic-bezier(0.4,0,0.2,1) forwards'}}>
                <div style={{background:'linear-gradient(135deg,#1a3a5c,#2a5a8c)',borderRadius:10,padding:'5px 18px',display:'flex',alignItems:'center',gap:8,boxShadow:'0 2px 10px rgba(26,58,92,0.3)'}}>
                  <span style={{fontSize:13}}>🤝</span>
                  <span style={{fontSize:11,fontWeight:900,color:'#fff',textTransform:'uppercase',letterSpacing:1}}>CP Wise Sales</span>
                </div>
                <div style={{flex:1,height:1,background:'rgba(26,58,92,0.15)',borderRadius:1}}/>
              </div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>

                {/* ── CP: Top 10 Units Booked (line) ─────────────── */}
                <GC style={{padding:16}}>
                  <SH title="Top CP — Units Booked" sub="Top 10 channel partners by units · scroll for more · ₹Cr on line"/>
                  {(()=>{
                    const all=topCP;
                    const WIN=10;
                    const slice=all.slice(cpScroll,cpScroll+WIN);
                    const maxU=Math.max(...slice.map(d=>d.units),1);
                    return(
                      <>
                        <div style={{overflowX:'auto',overflowY:'hidden'}}>
                          <div style={{minWidth:slice.length*52+60+'px'}}>
                            <ResponsiveContainer width="100%" height={220}>
                              <ComposedChart data={slice} margin={{top:28,right:12,bottom:56,left:0}}>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,60,100,0.08)" vertical={false}/>
                                <XAxis dataKey="name" tick={{fill:T.textM,fontSize:8,fontWeight:600}} axisLine={false} tickLine={false} angle={-35} textAnchor="end" interval={0} height={60} tickFormatter={v=>v?.length>14?v.slice(0,14)+'…':v}/>
                                <YAxis tick={{fill:T.textM,fontSize:9}} axisLine={false} tickLine={false} width={24} domain={[0,maxU+10]}/>
                                <Tooltip content={({active,payload,label})=>{
                                  if(!active||!payload?.length)return null;
                                  const d=slice.find(r=>r.name===label)||{};
                                  return(<div style={{background:'#fff',border:'1px solid #e5e7eb',borderRadius:8,padding:'8px 12px',fontSize:10,boxShadow:'0 2px 8px rgba(0,0,0,0.1)'}}>
                                    <p style={{margin:'0 0 4px',fontWeight:800,color:T.navy,fontSize:11}}>{label}</p>
                                    <p style={{margin:'0 0 2px',color:T.tealD}}>Units: <strong>{d.units}</strong></p>
                                    <p style={{margin:'0 0 2px',color:T.amber}}>BSP: <strong>₹{d.bspCr} Cr</strong></p>
                                    <p style={{margin:0,color:'#7c3aed'}}>Avg Rate: <strong>₹{(d.avgRate||0).toLocaleString('en-IN')}/sqft</strong></p>
                                  </div>);
                                }}/>
                                <defs>
                                  <linearGradient id="cpLineGrad" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor={T.teal} stopOpacity={0.15}/>
                                    <stop offset="95%" stopColor={T.teal} stopOpacity={0}/>
                                  </linearGradient>
                                </defs>
                                <Area type="monotone" dataKey="units" fill="url(#cpLineGrad)" stroke="none"/>
                                <Line type="monotone" dataKey="units" name="Units" stroke={T.tealD} strokeWidth={2.5} dot={({cx,cy,index})=>(
                                  <circle key={index} cx={cx} cy={cy} r={index===0?6:4} fill={index===0?T.tealD:T.teal} stroke="#fff" strokeWidth={1.5}/>
                                )} activeDot={{r:7,fill:T.tealD,stroke:'#fff',strokeWidth:2}}>
                                  <LabelList dataKey="units" position="top" style={{fill:T.navy,fontSize:9,fontWeight:800}}/>
                                </Line>
                                <Line type="monotone" dataKey="bspCr" name="₹Cr" stroke={T.amber} strokeWidth={1.5} strokeDasharray="4 3" dot={{r:3,fill:T.amber,stroke:'#fff',strokeWidth:1}} activeDot={{r:5}}>
                                  <LabelList dataKey="bspCr" position="insideTopRight" style={{fill:T.amber,fontSize:7,fontWeight:700}} formatter={v=>'₹'+v}/>
                                </Line>
                              </ComposedChart>
                            </ResponsiveContainer>
                          </div>
                        </div>
                        {all.length>WIN&&(
                          <div style={{display:'flex',alignItems:'center',justifyContent:'center',gap:8,marginTop:4}}>
                            <button onClick={()=>setCpScroll(s=>Math.max(0,s-WIN))} disabled={cpScroll===0} style={{padding:'2px 10px',borderRadius:12,border:'1px solid rgba(0,151,167,0.3)',background:'rgba(0,151,167,0.06)',cursor:cpScroll===0?'default':'pointer',fontSize:10,color:cpScroll===0?T.textL:T.tealD,fontWeight:700}}>‹ Prev</button>
                            <span style={{fontSize:9,color:T.textL}}>{cpScroll+1}–{Math.min(cpScroll+WIN,all.length)} of {all.length}</span>
                            <button onClick={()=>setCpScroll(s=>Math.min(all.length-WIN,s+WIN))} disabled={cpScroll+WIN>=all.length} style={{padding:'2px 10px',borderRadius:12,border:'1px solid rgba(0,151,167,0.3)',background:'rgba(0,151,167,0.06)',cursor:cpScroll+WIN>=all.length?'default':'pointer',fontSize:10,color:cpScroll+WIN>=all.length?T.textL:T.tealD,fontWeight:700}}>Next ›</button>
                          </div>
                        )}
                      </>
                    );
                  })()}
                </GC>

                {/* ── CP: Sales Value ₹Cr (bar) + % line ───────── */}
                <GC style={{padding:16}}>
                  <SH title="Top CP — Sales Value (₹Cr)" sub="BSP value by channel partner · top 10 · scroll for more"/>
                  {(()=>{
                    const all=topCP;
                    const WIN=10;
                    const slice=all.slice(cpScroll2,cpScroll2+WIN);
                    const totalBSP=all.reduce((s,r)=>s+r.bspCr,0)||1;
                    const dataWithPct=slice.map(r=>({...r,pct:+((r.bspCr/totalBSP)*100).toFixed(1)}));
                    return(
                      <>
                        <div style={{overflowX:'auto',overflowY:'hidden'}}>
                          <div style={{minWidth:slice.length*52+60+'px'}}>
                            <ResponsiveContainer width="100%" height={220}>
                              <ComposedChart data={dataWithPct} margin={{top:28,right:36,bottom:56,left:0}} barSize={18}>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,60,100,0.08)" vertical={false}/>
                                <XAxis dataKey="name" tick={{fill:T.textM,fontSize:8,fontWeight:600}} axisLine={false} tickLine={false} angle={-35} textAnchor="end" interval={0} height={60} tickFormatter={v=>v?.length>14?v.slice(0,14)+'…':v}/>
                                <YAxis yAxisId="l" tick={{fill:T.textM,fontSize:9}} axisLine={false} tickLine={false} width={32} tickFormatter={v=>v+'Cr'}/>
                                <YAxis yAxisId="r" orientation="right" tickFormatter={v=>v+'%'} domain={[0,Math.max(...dataWithPct.map(d=>d.pct),10)+5]} tick={{fill:T.amber,fontSize:9}} axisLine={false} tickLine={false} width={28}/>
                                <YAxis yAxisId="rate" orientation="right" hide={true}/>
                                <Tooltip content={({active,payload,label})=>{
                                  if(!active||!payload?.length)return null;
                                  const d=dataWithPct.find(r=>r.name===label)||{};
                                  return(<div style={{background:'#fff',border:'1px solid #e5e7eb',borderRadius:8,padding:'8px 12px',fontSize:10,boxShadow:'0 2px 8px rgba(0,0,0,0.1)'}}>
                                    <p style={{margin:'0 0 4px',fontWeight:800,color:T.navy,fontSize:11}}>{label}</p>
                                    <p style={{margin:'0 0 2px',color:T.navy}}>BSP: <strong>₹{d.bspCr} Cr</strong></p>
                                    <p style={{margin:'0 0 2px',color:T.amber}}>% of Total: <strong>{d.pct}%</strong></p>
                                    <p style={{margin:0,color:'#7c3aed'}}>Avg Rate: <strong>₹{(d.avgRate||0).toLocaleString('en-IN')}/sqft</strong></p>
                                  </div>);
                                }}/>
                                <Legend wrapperStyle={{fontSize:9,fontWeight:700}} iconSize={8}/>
                                <Bar yAxisId="l" dataKey="bspCr" name="₹Cr" radius={[3,3,0,0]}>
                                  {dataWithPct.map((d,i)=><Cell key={i} fill={i===0?T.navy:i<3?'#1a4a6b':'#2a6a8b'}/>)}
                                  <LabelList dataKey="bspCr" position="top" style={{fill:T.navy,fontSize:8,fontWeight:800}} formatter={v=>'₹'+v}/>
                                </Bar>
                                <Line yAxisId="r" type="monotone" dataKey="pct" name="% of Total" stroke={T.amber} strokeWidth={2} dot={{r:3,fill:T.amber}} activeDot={{r:5}}/>
                                <Line yAxisId="rate" type="monotone" dataKey="avgRate" name="Avg ₹/sqft" stroke="#7c3aed" strokeWidth={1.5} strokeDasharray="3 3" dot={{r:3,fill:'#7c3aed',stroke:'#fff',strokeWidth:1}} activeDot={{r:5}}>
                                  <LabelList dataKey="avgRate" position="top" style={{fill:'#7c3aed',fontSize:7,fontWeight:700}} formatter={v=>v?'₹'+Math.round(v/1000)+'K':''}/>
                                </Line>
                              </ComposedChart>
                            </ResponsiveContainer>
                          </div>
                        </div>
                        {all.length>WIN&&(
                          <div style={{display:'flex',alignItems:'center',justifyContent:'center',gap:8,marginTop:4}}>
                            <button onClick={()=>setCpScroll2(s=>Math.max(0,s-WIN))} disabled={cpScroll2===0} style={{padding:'2px 10px',borderRadius:12,border:'1px solid rgba(0,151,167,0.3)',background:'rgba(0,151,167,0.06)',cursor:cpScroll2===0?'default':'pointer',fontSize:10,color:cpScroll2===0?T.textL:T.tealD,fontWeight:700}}>‹ Prev</button>
                            <span style={{fontSize:9,color:T.textL}}>{cpScroll2+1}–{Math.min(cpScroll2+WIN,all.length)} of {all.length}</span>
                            <button onClick={()=>setCpScroll2(s=>Math.min(all.length-WIN,s+WIN))} disabled={cpScroll2+WIN>=all.length} style={{padding:'2px 10px',borderRadius:12,border:'1px solid rgba(0,151,167,0.3)',background:'rgba(0,151,167,0.06)',cursor:cpScroll2+WIN>=all.length?'default':'pointer',fontSize:10,color:cpScroll2+WIN>=all.length?T.textL:T.tealD,fontWeight:700}}>Next ›</button>
                          </div>
                        )}
                      </>
                    );
                  })()}
                </GC>

              </div>{/* end CP wise grid */}

            </div>{/* end ROW 2 */}

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





{/* AREA & PRICING OVERVIEW — hidden, uncomment to restore */}
{false&&(
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
                  {label:'Total Booked Area',value:`${(areaSummary.bookedArea/100000)?.toFixed(2)} L`,sub:'sqft',icon:'🏢',color:T.teal},
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

)}
          </div>
        )}

        {/* ══════════════════════════════════════════════════════
            TAB: COLLECTIONS & DAPP
        ══════════════════════════════════════════════════════ */}
        {tab==='collections'&&(
          <div style={{display:'flex',flexDirection:'column',gap:16}}>
            <CollectionsTab T={T} GC={GC} SH={SH} filters={filters} raw={raw}/>
          </div>
        )}




                {tab==='pnl'&&(<PnLTab T={T} GC={GC} SH={SH} filters={filters} sf={sf} raw={raw}/>)}

        {/* FOOTER */}
        <div style={{marginTop:16,display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:8,background:'rgba(255,255,255,0.95)',borderRadius:12,padding:'8px 16px',border:'1px solid rgba(255,255,255,0.9)'}}>
          <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
            <Chip label="Units"    value={kpi.totalUnits?.toLocaleString('en-IN')} color={T.teal} small/>
            <Chip label="Active"   value={kpi.activeBookings?.toLocaleString('en-IN')} color={T.navy} small/>
            <Chip label="Demand"   value={fmtCr(kpi.dappDemand)} color={T.amber} small/>
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