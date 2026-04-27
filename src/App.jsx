import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { loadExcel, parseINVR, parsePDRN } from './dataLoader';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  PieChart, Pie, Cell, AreaChart, Area, Legend, ReferenceLine
} from 'recharts';
import {
  Building2, IndianRupee, TrendingUp, Home, LayoutGrid,
  RotateCcw, Loader2, BarChart3, PieChart as PieIcon, Users, Landmark,
  Activity, Wallet, MapPin
} from 'lucide-react';

const fmt = (n) => {
  if (n >= 1e7) return `₹${(n / 1e7).toFixed(2)} Cr`;
  if (n >= 1e5) return `₹${(n / 1e5).toFixed(2)} L`;
  return `₹${n.toLocaleString('en-IN')}`;
};
const fmtShort = (n) => {
  if (n >= 1e7) return `${(n / 1e7).toFixed(1)}Cr`;
  if (n >= 1e5) return `${(n / 1e5).toFixed(1)}L`;
  return n.toLocaleString('en-IN');
};
const fmtArea = (n) => n.toLocaleString('en-IN', { maximumFractionDigits: 0 }) + ' sqft';
const tooltipStyle = {
  background:'rgba(255,255,255,0.96)', backdropFilter:'blur(12px)',
  border:'1px solid rgba(180,160,140,0.3)', borderRadius:14, fontSize:12,
  boxShadow:'0 10px 40px rgba(0,0,0,0.12)', padding:'10px 14px'
};

export default function App() {
  const [invr, setInvr] = useState([]);
  const [pdrn, setPdrn] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ project:'', company:'', unit:'', month:'', year:'' });

  useEffect(() => {
    Promise.all([
      loadExcel('/data/SKYARC_INVR.XLSX').then(parseINVR),
      loadExcel('/data/skyarc_pdrn.XLSX').then(parsePDRN),
    ]).then(([i, p]) => { setInvr(i); setPdrn(p); setLoading(false); })
      .catch(e => { console.error(e); setLoading(false); });
  }, []);

  const options = useMemo(() => {
    const s = (arr, key) => [...new Set(arr.map(r => r[key]).filter(Boolean))].sort();
    return {
      projects: s(invr, 'projectName'),
      companies: [...new Set([...invr.map(r=>r.companyName), ...pdrn.map(r=>r.companyName)].filter(Boolean))].sort(),
      units: s(invr, 'unitNumber'),
      months: s(pdrn, 'month'),
      years: [...new Set(pdrn.map(r=>r.year).filter(y=>y>0))].sort(),
    };
  }, [invr, pdrn]);

  const fInvr = useMemo(() => invr.filter(r =>
    (!filters.project || r.projectName === filters.project) &&
    (!filters.company || r.companyName === filters.company) &&
    (!filters.unit || r.unitNumber === filters.unit)
  ), [invr, filters]);

  const fPdrn = useMemo(() => pdrn.filter(r =>
    (!filters.project || r.projectName === filters.project) &&
    (!filters.company || r.companyName === filters.company) &&
    (!filters.unit || r.unitNo === filters.unit) &&
    (!filters.month || r.month === filters.month) &&
    (!filters.year || r.year === Number(filters.year))
  ), [pdrn, filters]);

  const kpi = useMemo(() => {
    const totalUnits = fInvr.length;
    const booked = fInvr.filter(r => r.status === 'Booked').length;
    const available = fInvr.filter(r => r.status === 'Available').length;
    const bookedArea = fInvr.filter(r => r.status === 'Booked').reduce((s, r) => s + r.totalSuperArea, 0);
    const availArea = fInvr.filter(r => r.status === 'Available').reduce((s, r) => s + r.totalSuperArea, 0);
    const totalSales = fInvr.filter(r => r.status === 'Booked').reduce((s, r) => s + r.netBasicPrice, 0);
    const activePdrn = fPdrn.filter(r => r.bookingStatus === 'ACTIVE');
    const demand = activePdrn.reduce((s, r) => s + r.totalDemand, 0);
    const received = activePdrn.reduce((s, r) => s + r.totalReceived, 0);
    const tcv = activePdrn.reduce((s, r) => s + r.tcv, 0);
    return { totalUnits, booked, available, bookedArea, availArea, totalSales, demand, received, tcv };
  }, [fInvr, fPdrn]);

  const towerData = useMemo(() => {
    const map = {};
    fInvr.forEach(r => {
      if (!map[r.tower]) map[r.tower] = { tower: r.tower, booked: 0, available: 0 };
      if (r.status === 'Booked') map[r.tower].booked++; else map[r.tower].available++;
    });
    return Object.values(map).sort((a, b) => a.tower.localeCompare(b.tower));
  }, [fInvr]);

  const bhkData = useMemo(() => {
    const map = {};
    fInvr.forEach(r => {
      const label = r.bhk.split(' - ')[0].split('+')[0] || 'Other';
      if (!map[label]) map[label] = { name: label, count: 0 };
      map[label].count++;
    });
    return Object.values(map).sort((a, b) => b.count - a.count);
  }, [fInvr]);

  const monthlyData = useMemo(() => {
    const map = {};
    fPdrn.filter(r => r.bookingStatus === 'ACTIVE' && r.month).forEach(r => {
      if (!map[r.month]) map[r.month] = { month: r.month, demand: 0, received: 0, bookings: 0, sales: 0 };
      map[r.month].demand += r.totalDemand;
      map[r.month].received += r.totalReceived;
      map[r.month].bookings++;
      map[r.month].sales += r.totalBSP;
    });
    return Object.values(map).sort((a, b) => a.month.localeCompare(b.month));
  }, [fPdrn]);

  const statusPie = useMemo(() => [
    { name: 'Booked', value: kpi.booked, color: '#1e3a5f' },
    { name: 'Available', value: kpi.available, color: '#b07d56' },
  ], [kpi]);

  const collectionPie = useMemo(() => {
    const pending = Math.max(0, kpi.demand - kpi.received);
    return [
      { name: 'Received', value: kpi.received, color: '#1e3a5f' },
      { name: 'Pending', value: pending, color: '#c49a3c' },
    ];
  }, [kpi]);

  const reset = () => setFilters({ project:'', company:'', unit:'', month:'', year:'' });
  const occupancy = ((kpi.booked / kpi.totalUnits) * 100 || 0).toFixed(1);
  const collection = ((kpi.received / kpi.demand) * 100 || 0).toFixed(1);

  if (loading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100vh', gap:16, flexDirection:'column', background:'var(--bg)' }}>
      <div style={{ position:'relative' }}>
        <Loader2 size={48} style={{ animation:'spin 1s linear infinite', color:'var(--blue)' }} />
        <div style={{ position:'absolute', inset:-10, borderRadius:'50%', border:'2px solid var(--blue)', opacity:0.2, animation:'pulse-ring 1.5s ease-out infinite' }}/>
      </div>
      <span style={{ color:'var(--text2)', fontSize:16, fontWeight:500 }}>Loading Dashboard...</span>
    </div>
  );

  return (
    <div style={{ height:'100vh', overflow:'hidden', background:'var(--bg)', display:'flex', flexDirection:'column', position:'relative' }}>
      {/* Animated orbs */}
      <div style={{ position:'fixed', inset:0, pointerEvents:'none', zIndex:0, overflow:'hidden' }}>
        <div style={{ position:'absolute', top:'3%', left:'8%', width:350, height:350, borderRadius:'50%', background:'radial-gradient(circle, rgba(30,58,95,0.1) 0%, transparent 65%)', animation:'orb-1 14s ease-in-out infinite', filter:'blur(50px)' }}/>
        <div style={{ position:'absolute', top:'55%', right:'3%', width:300, height:300, borderRadius:'50%', background:'radial-gradient(circle, rgba(139,94,60,0.09) 0%, transparent 65%)', animation:'orb-2 18s ease-in-out infinite', filter:'blur(60px)' }}/>
        <div style={{ position:'absolute', bottom:'5%', left:'35%', width:250, height:250, borderRadius:'50%', background:'radial-gradient(circle, rgba(196,154,60,0.08) 0%, transparent 65%)', animation:'orb-3 12s ease-in-out infinite', filter:'blur(45px)' }}/>
        <svg width="100%" height="100%" style={{ opacity:0.035 }}>
          <defs><pattern id="grid" width="50" height="50" patternUnits="userSpaceOnUse">
            <path d="M 50 0 L 0 0 0 50" fill="none" stroke="#1e3a5f" strokeWidth="0.5"/>
          </pattern></defs>
          <rect width="100%" height="100%" fill="url(#grid)"/>
        </svg>
      </div>

      {/* Header */}
      <header style={{
        padding:'12px 28px', display:'flex', alignItems:'center', justifyContent:'space-between',
        background:'linear-gradient(135deg, #1e3a5f 0%, #2c5282 50%, #1e3a5f 100%)',
        backgroundSize:'200% 200%', animation:'grad-shift 8s ease infinite',
        color:'#fff', flexShrink:0, position:'relative', zIndex:10,
        boxShadow:'0 6px 30px rgba(30,58,95,0.35)'
      }}>
        <div style={{ position:'absolute', inset:0, background:'linear-gradient(90deg, transparent, rgba(255,255,255,0.04), transparent)', pointerEvents:'none' }}/>
        <div style={{ display:'flex', alignItems:'center', gap:14, position:'relative' }}>
          <div style={{
            width:42, height:42, borderRadius:12,
            background:'rgba(255,255,255,0.14)', backdropFilter:'blur(12px)',
            display:'flex', alignItems:'center', justifyContent:'center',
            border:'1px solid rgba(255,255,255,0.22)',
            boxShadow:'0 6px 20px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.15)',
            transform:'perspective(600px) rotateY(-5deg)'
          }}>
            <Building2 size={22} color="#fff" />
          </div>
          <div>
            <h1 style={{ fontSize:20, fontWeight:700, letterSpacing:'-0.5px', textShadow:'0 2px 4px rgba(0,0,0,0.2)' }}>Smartworld Sky Arc</h1>
            <span style={{ fontSize:11, color:'rgba(255,255,255,0.65)' }}>Real Estate Sales Dashboard</span>
          </div>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:14, position:'relative' }}>
          <span style={{
            padding:'5px 16px', borderRadius:20, fontSize:11, fontWeight:600,
            background:'rgba(45,122,79,0.3)', color:'#80eeaa', border:'1px solid rgba(45,122,79,0.4)',
            boxShadow:'0 0 16px rgba(45,122,79,0.25)', animation:'glow-breathe 3s ease-in-out infinite',
            '--glow-color':'rgba(45,122,79,0.2)'
          }}>● LIVE</span>
          <span style={{ fontSize:11, color:'rgba(255,255,255,0.6)' }}>{invr.length} units · {pdrn.length} bookings</span>
        </div>
      </header>

      <div style={{ flex:1, overflow:'auto', display:'flex', flexDirection:'column', position:'relative', zIndex:1 }}>
        <div style={{ maxWidth:1800, margin:'0 auto', padding:'10px 20px', width:'100%', display:'flex', flexDirection:'column', overflow:'visible', gap:10 }}>

          {/* Filters */}
          <div style={{
            background:'var(--bg-glass)', backdropFilter:'blur(20px)', WebkitBackdropFilter:'blur(20px)',
            border:'1px solid var(--border-glass)', borderRadius:'var(--radius)',
            padding:'10px 18px', display:'flex', flexWrap:'wrap', gap:10, alignItems:'flex-end',
            boxShadow:'0 4px 16px rgba(30,58,95,0.06), inset 0 1px 0 rgba(255,255,255,0.6)',
            flexShrink:0, animation:'slide-up 0.5s ease-out'
          }}>
            <FilterSelect label="Project" value={filters.project} options={options.projects} onChange={v => setFilters(f=>({...f, project:v}))} />
            <FilterSelect label="Company" value={filters.company} options={options.companies} onChange={v => setFilters(f=>({...f, company:v}))} />
            <FilterSelect label="Unit Number" value={filters.unit} options={options.units} onChange={v => setFilters(f=>({...f, unit:v}))} />
            <FilterSelect label="Month" value={filters.month} options={options.months} onChange={v => setFilters(f=>({...f, month:v}))} />
            <FilterSelect label="Year" value={filters.year} options={options.years.map(String)} onChange={v => setFilters(f=>({...f, year:v}))} />
            <button onClick={reset} style={{
              background:'linear-gradient(135deg, #b8443a, #8b2e26)', border:'none',
              color:'#fff', padding:'9px 20px', borderRadius:10, fontFamily:'inherit',
              fontSize:12, fontWeight:600, cursor:'pointer', display:'flex', alignItems:'center', gap:6,
              boxShadow:'0 4px 14px rgba(184,68,58,0.35), inset 0 1px 0 rgba(255,255,255,0.15)',
              transition:'all 0.25s',
            }}
            onMouseEnter={e => { e.currentTarget.style.transform='translateY(-2px) scale(1.04)'; e.currentTarget.style.boxShadow='0 8px 24px rgba(184,68,58,0.45)'; }}
            onMouseLeave={e => { e.currentTarget.style.transform='none'; e.currentTarget.style.boxShadow='0 4px 14px rgba(184,68,58,0.35)'; }}
            ><RotateCcw size={13}/> Reset</button>
          </div>

          {/* KPI Row — bigger cards, 4 per row x 2 rows */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(4, 1fr)', gap:10, flexShrink:0 }}>
            <KPI3D icon={<LayoutGrid size={20}/>} label="Total Units" value={kpi.totalUnits} sub={`${kpi.booked} booked · ${kpi.available} available`} color="#1e3a5f" delay={0} />
            <KPI3D icon={<Home size={20}/>} label="Booked Units" value={kpi.booked} sub={`${occupancy}% occupancy`} color="#8b5e3c" delay={1} ring={occupancy} />
            <KPI3D icon={<Building2 size={20}/>} label="Available Units" value={kpi.available} sub={fmtArea(kpi.availArea)} color="#c49a3c" delay={2} />
            <KPI3D icon={<IndianRupee size={20}/>} label="Total Sales (BSP)" value={fmt(kpi.totalSales)} color="#111" delay={3} sub="Net Basic Price" />
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(4, 1fr)', gap:10, flexShrink:0 }}>
            <KPI3D icon={<TrendingUp size={20}/>} label="Total Demand" value={fmt(kpi.demand)} color="#b07d56" delay={4} sub="Active bookings" />
            <KPI3D icon={<Wallet size={20}/>} label="Received Amount" value={fmt(kpi.received)} color="#2d7a4f" delay={5} ring={collection} sub={`${collection}% collected`} />
            <KPI3D icon={<BarChart3 size={20}/>} label="TCV (With Tax)" value={fmt(kpi.tcv)} color="#b8443a" delay={6} sub="Total Contract Value" />
            <KPI3D icon={<MapPin size={20}/>} label="Booked Area" value={fmtArea(kpi.bookedArea)} color="#3b82c4" delay={7} sub="Super Built-up Area" />
          </div>

          {/* Charts */}
          <div style={{ flex:1, minHeight:0, display:'grid', gridTemplateColumns:'1.6fr 1fr 1.6fr 1fr', gap:10 }}>
            <GlassCard title="Tower-wise Distribution" icon={<BarChart3 size={15}/>} color="var(--blue)" delay={0.2}>
              <div style={{ position:'relative', height:'100%', display:'flex', flexDirection:'column' }}>
                {/* Totals Row */}
                <div style={{ display:'flex', justifyContent:'space-around', marginBottom:8, paddingBottom:8, borderBottom:'2px solid rgba(30,58,95,0.1)' }}>
                  {towerData.map(t => (
                    <div key={t.tower} style={{ textAlign:'center', fontSize:10, fontWeight:700, color:'#1e3a5f' }}>
                      <div>Total</div>
                      <div style={{ fontSize:13 }}>{t.booked + t.available}</div>
                    </div>
                  ))}
                </div>
                {/* Chart */}
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={towerData} barGap={20} margin={{ top:10, right:15, left:0, bottom:35 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(30,58,95,0.07)" />
                    <XAxis dataKey="tower" tick={{ fill:'#8b7355', fontSize:12, fontWeight:600 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill:'#8b7355', fontSize:11 }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={tooltipStyle} cursor={{ fill:'rgba(30,58,95,0.04)' }} labelFormatter={(v) => `Tower ${v}`} formatter={(value, name) => name === 'booked' ? [value, 'Booked'] : [value, 'Available']} />
                    <Bar dataKey="booked" stackId="stack" fill="#1e3a5f" name="Booked" radius={[5,5,0,0]} animationDuration={1400} label={{ position:'insideBottomLeft', offset:6, fill:'#fff', fontSize:10, fontWeight:700 }} />
                    <Bar dataKey="available" stackId="stack" fill="#b07d56" name="Available" radius={[5,5,0,0]} animationDuration={1400} animationBegin={200} label={{ position:'insideBottomRight', offset:6, fill:'#fff', fontSize:10, fontWeight:700 }} />
                    <Legend wrapperStyle={{ fontSize:11, color:'#5c4a3a', paddingTop:6 }} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </GlassCard>

            <div style={{ display:'flex', flexDirection:'column', gap:10, minHeight:0 }}>
              <GlassCard title="Booking Status" icon={<PieIcon size={15}/>} color="var(--brown)" delay={0.3} style={{ flex:1 }}>
                <div style={{ position:'relative', height:'100%' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={statusPie} cx="50%" cy="48%" innerRadius="42%" outerRadius="72%" dataKey="value" paddingAngle={4} strokeWidth={0} animationDuration={1200}>
                        {statusPie.map((e, i) => <Cell key={i} fill={e.color} />)}
                      </Pie>
                      <Tooltip contentStyle={tooltipStyle} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div style={{ position:'absolute', top:'40%', left:'50%', transform:'translate(-50%,-50%)', textAlign:'center', pointerEvents:'none' }}>
                    <div style={{ fontFamily:"'Space Mono',monospace", fontSize:24, fontWeight:700, color:'var(--blue)', animation:'counter-up 0.8s ease-out 0.5s both' }}>{kpi.totalUnits}</div>
                    <div style={{ fontSize:9, color:'var(--text3)', fontWeight:600, textTransform:'uppercase', letterSpacing:1 }}>Units</div>
                  </div>
                </div>
              </GlassCard>
              <GlassCard title="BHK Distribution" icon={<Home size={15}/>} color="var(--brown-dark)" delay={0.5} style={{ flex:1 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={bhkData} layout="vertical" barSize={16}>
                    <XAxis type="number" hide />
                    <YAxis type="category" dataKey="name" tick={{ fill:'#5c4a3a', fontSize:11, fontWeight:600 }} axisLine={false} tickLine={false} width={55} />
                    <Tooltip contentStyle={tooltipStyle} cursor={{ fill:'rgba(139,94,60,0.06)' }} />
                    <Bar dataKey="count" fill="#8b5e3c" name="Units" radius={[0,8,8,0]} animationDuration={1600}>
                      {bhkData.map((e, i) => <Cell key={i} fill={['#1e3a5f','#8b5e3c','#3b82c4','#c49a3c'][i] || '#8b5e3c'} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </GlassCard>
            </div>

            <GlassCard title="Monthly Demand vs Received" icon={<Activity size={15}/>} color="var(--brown-dark)" delay={0.4}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={monthlyData}>
                  <defs>
                    <linearGradient id="gDemand" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#8b5e3c" stopOpacity={0.4}/>
                      <stop offset="100%" stopColor="#8b5e3c" stopOpacity={0.02}/>
                    </linearGradient>
                    <linearGradient id="gReceived" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#1e3a5f" stopOpacity={0.4}/>
                      <stop offset="100%" stopColor="#1e3a5f" stopOpacity={0.02}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(30,58,95,0.07)" />
                  <XAxis dataKey="month" tick={{ fill:'#8b7355', fontSize:9 }} axisLine={false} tickLine={false}
                    tickFormatter={v => { const [y,m]=v.split('-'); return `${['','Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][+m]}'${y.slice(2)}`; }} />
                  <YAxis tick={{ fill:'#8b7355', fontSize:9 }} axisLine={false} tickLine={false} tickFormatter={v => fmtShort(v)} />
                  <Tooltip contentStyle={tooltipStyle} formatter={(v) => [fmt(v)]} />
                  <Area type="monotone" dataKey="demand" stroke="#8b5e3c" fill="url(#gDemand)" strokeWidth={2.5} name="Demand" animationDuration={1800} dot={{ r:3, fill:'#fff', stroke:'#8b5e3c', strokeWidth:2 }} activeDot={{ r:6, fill:'#8b5e3c', stroke:'#fff', strokeWidth:2 }} />
                  <Area type="monotone" dataKey="received" stroke="#1e3a5f" fill="url(#gReceived)" strokeWidth={2.5} name="Received" animationDuration={1800} animationBegin={400} dot={{ r:3, fill:'#fff', stroke:'#1e3a5f', strokeWidth:2 }} activeDot={{ r:6, fill:'#1e3a5f', stroke:'#fff', strokeWidth:2 }} />
                  <Legend wrapperStyle={{ fontSize:11, paddingTop:4 }} />
                </AreaChart>
              </ResponsiveContainer>
            </GlassCard>

            <div style={{ display:'flex', flexDirection:'column', gap:10, minHeight:0 }}>
              <GlassCard title="Collection Progress" icon={<IndianRupee size={15}/>} color="var(--blue)" delay={0.5} style={{ flex:1 }}>
                <div style={{ position:'relative', height:'100%' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={collectionPie} cx="50%" cy="48%" innerRadius="42%" outerRadius="72%" dataKey="value" paddingAngle={4} strokeWidth={0} animationDuration={1200}>
                        {collectionPie.map((e, i) => <Cell key={i} fill={e.color} />)}
                      </Pie>
                      <Tooltip contentStyle={tooltipStyle} formatter={(v) => [fmt(v)]} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div style={{ position:'absolute', top:'40%', left:'50%', transform:'translate(-50%,-50%)', textAlign:'center', pointerEvents:'none' }}>
                    <div style={{ fontFamily:"'Space Mono',monospace", fontSize:20, fontWeight:700, color:'var(--blue)', animation:'counter-up 0.8s ease-out 0.8s both' }}>{collection}%</div>
                    <div style={{ fontSize:9, color:'var(--text3)', fontWeight:600, textTransform:'uppercase', letterSpacing:1 }}>Collected</div>
                  </div>
                </div>
              </GlassCard>
              <GlassCard title="Monthly Bookings" icon={<BarChart3 size={15}/>} color="var(--blue-accent)" delay={0.6} style={{ flex:1 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthlyData} barSize={20}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(30,58,95,0.07)" />
                    <XAxis dataKey="month" tick={{ fill:'#8b7355', fontSize:8 }} axisLine={false} tickLine={false}
                      tickFormatter={v => { const [y,m]=v.split('-'); return `${['','J','F','M','A','M','J','J','A','S','O','N','D'][+m]}'${y.slice(2)}`; }} />
                    <YAxis tick={{ fill:'#8b7355', fontSize:9 }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Bar dataKey="bookings" fill="#3b82c4" name="Bookings" radius={[5,5,0,0]} animationDuration={1400} />
                  </BarChart>
                </ResponsiveContainer>
              </GlassCard>
              {/* Sales vs Demand vs Collections (compact card) */}
              <GlassCard title="Sales vs Demand vs Collections" icon={<Activity size={15}/>} color="var(--brown-dark)" delay={0.7} style={{ flex:1 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthlyData} barSize={6} barGap={2} margin={{ top:4, right:8, left:0, bottom:20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(30,58,95,0.07)" />
                    <XAxis dataKey="month" tick={{ fill:'#8b7355', fontSize:7 }} axisLine={false} tickLine={false}
                      tickFormatter={v => { const [y,m]=v.split('-'); return `${['','J','F','M','A','M','J','J','A','S','O','N','D'][+m]}'${y.slice(2)}`; }} />
                    <YAxis tick={{ fill:'#8b7355', fontSize:7 }} axisLine={false} tickLine={false} tickFormatter={v => fmtShort(v)} width={32} />
                    <Tooltip contentStyle={tooltipStyle} formatter={(value, name) => [`₹ ${fmtShort(value)}`, name]} />
                    <Legend wrapperStyle={{ fontSize:9, color:'#5c4a3a', paddingTop:2 }} iconType="circle" iconSize={6} />
                    <Bar dataKey="sales" name="Sales" fill="#1e3a5f" radius={[3,3,0,0]} animationDuration={1200} />
                    <Bar dataKey="demand" name="Demand" fill="#b07d56" radius={[3,3,0,0]} animationDuration={1400} animationBegin={150} />
                    <Bar dataKey="received" name="Collections" fill="#4caf7d" radius={[3,3,0,0]} animationDuration={1600} animationBegin={300} />
                  </BarChart>
                </ResponsiveContainer>
              </GlassCard>
            </div>
          </div>
        </div>

        {/* ── Page 2: Bottom Cards Section ── */}
        <div style={{ padding: '20px 28px', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', minHeight: '400px' }}>
          {/* Collection Progress Card */}
          <GlassCard title="Collection Progress" icon={<IndianRupee size={15}/>} color="var(--blue)" delay={0.5}>
            <div style={{ position:'relative', height:'280px', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center' }}>
              <div style={{ fontFamily:"'Space Mono',monospace", fontSize:40, fontWeight:700, color:'var(--blue)' }}>{collection}%</div>
              <div style={{ fontSize:12, color:'var(--text3)', fontWeight:600, textTransform:'uppercase', letterSpacing:1, marginTop:12 }}>Collected</div>
              <div style={{ fontSize:14, color:'var(--text2)', marginTop:16, textAlign:'center' }}>
                ₹ {fmt(kpi.received)}
              </div>
            </div>
          </GlassCard>

          {/* Monthly Bookings Card */}
          <GlassCard title="Monthly Bookings" icon={<BarChart3 size={15}/>} color="var(--blue-accent)" delay={0.6}>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={monthlyData} barSize={16}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(30,58,95,0.07)" />
                <XAxis dataKey="month" tick={{ fill:'#8b7355', fontSize:8 }} axisLine={false} tickLine={false}
                  tickFormatter={v => { const [y,m]=v.split('-'); return `${['','J','F','M','A','M','J','J','A','S','O','N','D'][+m]}'${y.slice(2)}`; }} />
                <YAxis tick={{ fill:'#8b7355', fontSize:8 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="bookings" fill="#3b82c4" name="Bookings" radius={[5,5,0,0]} animationDuration={1400} />
              </BarChart>
            </ResponsiveContainer>
          </GlassCard>

          {/* Sales vs Demand vs Collections Card */}
          <GlassCard title="Sales vs Demand vs Collections" icon={<Activity size={15}/>} color="var(--brown-dark)" delay={0.7}>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={monthlyData} barSize={7} barGap={2} margin={{ top:4, right:8, left:0, bottom:20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(30,58,95,0.07)" />
                <XAxis dataKey="month" tick={{ fill:'#8b7355', fontSize:7 }} axisLine={false} tickLine={false}
                  tickFormatter={v => { const [y,m]=v.split('-'); return `${['','J','F','M','A','M','J','J','A','S','O','N','D'][+m]}'${y.slice(2)}`; }} />
                <YAxis tick={{ fill:'#8b7355', fontSize:7 }} axisLine={false} tickLine={false} tickFormatter={v => fmtShort(v)} width={28} />
                <Tooltip contentStyle={tooltipStyle} formatter={(value, name) => [`₹ ${fmtShort(value)}`, name]} />
                <Legend wrapperStyle={{ fontSize:8, color:'#5c4a3a', paddingTop:4 }} iconType="circle" iconSize={6} />
                <Bar dataKey="sales" name="Sales" fill="#1e3a5f" radius={[3,3,0,0]} animationDuration={1200} />
                <Bar dataKey="demand" name="Demand" fill="#b07d56" radius={[3,3,0,0]} animationDuration={1400} animationBegin={150} />
                <Bar dataKey="received" name="Collections" fill="#4caf7d" radius={[3,3,0,0]} animationDuration={1600} animationBegin={300} />
              </BarChart>
            </ResponsiveContainer>
          </GlassCard>
        </div>
      </div>
    </div>
  );
}

/* ─── Filter ──────────────────────────── */
function FilterSelect({ label, value, options, onChange }) {
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:4, flex:1, minWidth:120 }}>
      <label style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:0.8, color:'var(--text3)' }}>{label}</label>
      <select value={value} onChange={e => onChange(e.target.value)}
        style={{
          background:'rgba(255,255,255,0.65)', border:'1px solid rgba(180,160,140,0.3)', color:'var(--text)',
          padding:'8px 12px', borderRadius:10, fontFamily:'inherit', fontSize:12, cursor:'pointer', outline:'none',
          backdropFilter:'blur(8px)', transition:'all 0.25s',
          boxShadow:'0 2px 6px rgba(0,0,0,0.04), inset 0 1px 0 rgba(255,255,255,0.7)'
        }}
        onFocus={e => { e.target.style.borderColor='var(--blue)'; e.target.style.boxShadow='0 0 0 3px rgba(30,58,95,0.12)'; }}
        onBlur={e => { e.target.style.borderColor='rgba(180,160,140,0.3)'; e.target.style.boxShadow='0 2px 6px rgba(0,0,0,0.04)'; }}
      >
        <option value="">All</option>
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );
}

/* ─── 3D KPI Card ──────────────────────────── */
function KPI3D({ icon, label, value, color, sub, delay = 0, ring }) {
  const [hovered, setHovered] = useState(false);
  const cardRef = useRef(null);
  const [tilt, setTilt] = useState({ x:0, y:0 });

  const handleMove = useCallback((e) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    setTilt({ x: y * -12, y: x * 12 });
  }, []);

  const handleLeave = useCallback(() => {
    setHovered(false);
    setTilt({ x:0, y:0 });
  }, []);

  return (
    <div
      ref={cardRef}
      onMouseEnter={() => setHovered(true)}
      onMouseMove={handleMove}
      onMouseLeave={handleLeave}
      style={{
        background:'var(--bg-glass)',
        backdropFilter:'blur(20px)', WebkitBackdropFilter:'blur(20px)',
        border:`1.5px solid ${hovered ? color+'40' : 'var(--border-glass)'}`,
        borderRadius:'var(--radius)',
        padding:'14px 16px 12px',
        position:'relative',
        overflow:'hidden',
        cursor:'default',
        animation:`slide-up 0.6s ease-out ${delay * 0.08}s both, glow-breathe 4s ease-in-out infinite ${delay * 0.3}s`,
        '--glow-color': `${color}18`,
        transition:'all 0.15s ease-out',
        transform: `perspective(600px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg) ${hovered ? 'translateY(-6px) scale(1.02)' : ''}`,
        boxShadow: hovered
          ? `0 20px 50px ${color}25, 0 0 0 1px ${color}15, inset 0 1px 0 rgba(255,255,255,0.6)`
          : `0 3px 12px ${color}10, inset 0 1px 0 rgba(255,255,255,0.6)`,
        transformStyle:'preserve-3d',
      }}
    >
      {/* Top bar */}
      <div style={{ position:'absolute', top:0, left:0, right:0, height:4, background:`linear-gradient(90deg, ${color}00, ${color}, ${color}00)`, transition:'opacity 0.3s', opacity: hovered ? 1 : 0.6 }} />

      {/* Shimmer */}
      <div style={{ position:'absolute', inset:0, pointerEvents:'none', overflow:'hidden', borderRadius:'var(--radius)' }}>
        <div style={{
          position:'absolute', top:'-60%', left:'-60%', width:'60%', height:'220%',
          background:'linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent)',
          animation:`shimmer 3.5s ease-in-out infinite ${delay * 0.15}s`,
        }}/>
      </div>

      {/* Corner glow */}
      <div style={{
        position:'absolute', top:-20, right:-20, width:70, height:70, borderRadius:'50%',
        background:`radial-gradient(circle, ${color}20 0%, transparent 65%)`,
        transition:'all 0.4s ease',
        transform: hovered ? 'scale(2)' : 'scale(1)',
        opacity: hovered ? 0.9 : 0.3
      }}/>

      {/* Progress ring */}
      {ring && (
        <svg width="32" height="32" style={{ position:'absolute', top:8, right:8 }} viewBox="0 0 32 32">
          <circle cx="16" cy="16" r="12" fill="none" stroke={`${color}18`} strokeWidth="3"/>
          <circle cx="16" cy="16" r="12" fill="none" stroke={color} strokeWidth="3" strokeLinecap="round"
            strokeDasharray={`${(ring / 100) * 75.4} 75.4`}
            transform="rotate(-90 16 16)"
            style={{ transition:'stroke-dasharray 1.2s cubic-bezier(0.4,0,0.2,1)' }}
          />
          <text x="16" y="17" textAnchor="middle" dominantBaseline="central" fill={color} fontSize="7" fontWeight="700" fontFamily="Space Mono">{Math.round(ring)}</text>
        </svg>
      )}

      {/* Icon */}
      <div style={{
        width:34, height:34, borderRadius:10,
        background:`linear-gradient(145deg, ${color}15, ${color}08)`,
        border:`1.5px solid ${color}20`,
        display:'flex', alignItems:'center', justifyContent:'center', color,
        marginBottom:8,
        transition:'all 0.35s cubic-bezier(0.175,0.885,0.32,1.275)',
        transform: hovered ? 'scale(1.15) translateZ(15px)' : 'scale(1)',
        boxShadow: hovered ? `0 6px 20px ${color}25` : `0 2px 8px ${color}10`,
        animation: hovered ? 'icon-bounce 0.5s ease' : 'none',
      }}>{icon}</div>

      <div style={{ fontSize:9, color:'var(--text3)', fontWeight:700, textTransform:'uppercase', letterSpacing:0.6, marginBottom:2 }}>{label}</div>
      <div style={{
        fontFamily:"'Space Mono',monospace", fontSize:18, fontWeight:700, color:'var(--black)',
        transition:'all 0.3s', transform: hovered ? 'translateZ(8px) scale(1.02)' : 'none',
        animation:'counter-up 0.6s ease-out both',
        animationDelay:`${0.3 + delay * 0.08}s`
      }}>{value}</div>
      {sub && <div style={{ fontSize:10, color:'var(--text2)', marginTop:4, fontWeight:500 }}>{sub}</div>}

      {/* Bottom reflection */}
      <div style={{
        position:'absolute', bottom:0, left:0, right:0, height:'45%',
        background:'linear-gradient(to top, rgba(255,255,255,0.06), transparent)',
        pointerEvents:'none', borderRadius:'0 0 var(--radius) var(--radius)'
      }}/>
    </div>
  );
}

/* ─── Glass Chart Card ──────────────────────────── */
function GlassCard({ title, icon, color, children, delay = 0, style: extraStyle }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background:'var(--bg-glass)',
        backdropFilter:'blur(20px)', WebkitBackdropFilter:'blur(20px)',
        border:`1.5px solid ${hovered ? 'rgba(30,58,95,0.2)' : 'var(--border-glass)'}`,
        borderRadius:'var(--radius)',
        padding:'12px 16px',
        display:'flex', flexDirection:'column', overflow:'hidden',
        boxShadow: hovered
          ? '0 16px 45px rgba(30,58,95,0.14), inset 0 1px 0 rgba(255,255,255,0.6)'
          : '0 3px 14px rgba(30,58,95,0.06), inset 0 1px 0 rgba(255,255,255,0.6)',
        transition:'all 0.35s cubic-bezier(0.4,0,0.2,1)',
        transform: hovered ? 'perspective(800px) rotateX(-1.5deg) translateY(-4px)' : 'none',
        animation:`slide-up 0.7s ease-out ${delay}s both`,
        position:'relative',
        ...extraStyle
      }}
    >
      <div style={{ position:'absolute', top:0, left:0, right:0, height:3, background:`linear-gradient(90deg, transparent, ${color}, transparent)`, opacity: hovered ? 0.7 : 0.3, transition:'opacity 0.3s' }} />

      <div style={{
        fontSize:13, fontWeight:600, marginBottom:8, display:'flex', alignItems:'center', gap:8,
        color:'var(--text)', flexShrink:0
      }}>
        <span style={{
          color, width:26, height:26, borderRadius:8,
          background:`${color}10`, display:'flex', alignItems:'center', justifyContent:'center',
          border:`1.5px solid ${color}18`,
          boxShadow:`0 2px 8px ${color}10`,
          transition:'all 0.3s',
          transform: hovered ? 'scale(1.1)' : 'scale(1)',
        }}>{icon}</span>
        {title}
      </div>
      <div style={{ flex:1, minHeight:0 }}>{children}</div>
    </div>
  );
}
