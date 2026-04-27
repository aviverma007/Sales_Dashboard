import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { loadExcel, parseINVR, parsePDRN } from './dataLoader';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  PieChart, Pie, Cell, AreaChart, Area, Legend, ComposedChart, LineChart, Line
} from 'recharts';
import {
  Building2, IndianRupee, TrendingUp, Home, LayoutGrid,
  RotateCcw, Loader2, BarChart3, PieChart as PieIcon,
  Activity, Wallet, MapPin, AlertCircle
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
      if (!map[r.tower]) map[r.tower] = { tower: r.tower, booked: 0, available: 0, total: 0 };
      if (r.status === 'Booked') map[r.tower].booked++;
      else map[r.tower].available++;
      map[r.tower].total++;
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

  const projectSalesData = useMemo(() => {
    const map = {};
    invr.forEach(r => {
      if (r['Status'] === 'Booked') {
        if (!map[r['Project Name']]) map[r['Project Name']] = { project: r['Project Name'], sales: 0, units: 0 };
        map[r['Project Name']].sales += Number(r['Net Basic Price'])||0;
        map[r['Project Name']].units++;
      }
    });
    const demand = {};
    const received = {};
    pdrn.forEach(r => {
      if (r['Booking Status'] === 'ACTIVE') {
        if (!demand[r['Project Name']]) demand[r['Project Name']] = 0;
        if (!received[r['Project Name']]) received[r['Project Name']] = 0;
        demand[r['Project Name']] += Number(r['Total Demand Amount'])||0;
        received[r['Project Name']] += Number(r['Total Received'])||0;
      }
    });
    return Object.keys(map).map(p => ({
      name: p.substring(0, 12),
      sales: map[p].sales,
      demand: demand[p] || 0,
      received: received[p] || 0
    })).sort((a, b) => b.sales - a.sales);
  }, [invr, pdrn]);

  const monthlyData = useMemo(() => {
    const map = {};
    fPdrn.filter(r => r.bookingStatus === 'ACTIVE' && r.month).forEach(r => {
      if (!map[r.month]) map[r.month] = { month: r.month, demand: 0, received: 0, bookings: 0 };
      map[r.month].demand += r.totalDemand;
      map[r.month].received += r.totalReceived;
      map[r.month].bookings++;
    });
    return Object.values(map).sort((a, b) => a.month.localeCompare(b.month));
  }, [fPdrn]);

  const dueOutstandingData = useMemo(() => {
    const map = {};
    pdrn.forEach(r => {
      if (r.bookingStatus === 'ACTIVE' && r.month) {
        const monthDate = new Date(r.year, parseInt(r.month.split('-')[1]) - 1);
        const now = new Date();
        if (monthDate < now) {
          if (!map[r.month]) map[r.month] = 0;
          map[r.month] += Math.max(0, r.totalDemand - r.totalReceived);
        }
      }
    });
    return Object.entries(map).map(([month, outstanding]) => ({
      month,
      outstanding
    })).sort((a, b) => a.month.localeCompare(b.month)).slice(0, 6);
  }, [pdrn]);

  const undueDemandData = useMemo(() => {
    const map = {};
    pdrn.forEach(r => {
      if (r.bookingStatus === 'ACTIVE' && r.month) {
        const monthDate = new Date(r.year, parseInt(r.month.split('-')[1]) - 1);
        const now = new Date();
        if (monthDate >= now) {
          if (!map[r.month]) map[r.month] = 0;
          map[r.month] += r.totalDemand;
        }
      }
    });
    return Object.entries(map).map(([month, demand]) => ({
      month,
      demand
    })).sort((a, b) => a.month.localeCompare(b.month)).slice(0, 6);
  }, [pdrn]);

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
      <Loader2 size={48} style={{ animation:'spin 1s linear infinite', color:'var(--blue)' }} />
      <span style={{ color:'var(--text2)', fontSize:16, fontWeight:500 }}>Loading Dashboard...</span>
    </div>
  );

  return (
    <div style={{ minHeight:'100vh', overflow:'auto', background:'var(--bg)', display:'flex', flexDirection:'column', position:'relative' }}>
      {/* Animated orbs background */}
      <div style={{ position:'fixed', inset:0, pointerEvents:'none', zIndex:0, overflow:'hidden' }}>
        <div style={{ position:'absolute', top:'3%', left:'8%', width:400, height:400, borderRadius:'50%', background:'radial-gradient(circle, rgba(30,58,95,0.12) 0%, transparent 70%)', animation:'orb-1 16s ease-in-out infinite', filter:'blur(60px)' }}/>
        <div style={{ position:'absolute', top:'50%', right:'5%', width:350, height:350, borderRadius:'50%', background:'radial-gradient(circle, rgba(139,94,60,0.1) 0%, transparent 70%)', animation:'orb-2 20s ease-in-out infinite', filter:'blur(70px)' }}/>
        <div style={{ position:'absolute', bottom:'8%', left:'30%', width:300, height:300, borderRadius:'50%', background:'radial-gradient(circle, rgba(196,154,60,0.09) 0%, transparent 70%)', animation:'orb-3 14s ease-in-out infinite', filter:'blur(50px)' }}/>
      </div>

      {/* Header */}
      <header style={{
        padding:'16px 32px', display:'flex', alignItems:'center', justifyContent:'space-between',
        background:'linear-gradient(135deg, #1e3a5f 0%, #2c5282 50%, #1e3a5f 100%)',
        backgroundSize:'200% 200%', animation:'grad-shift 8s ease infinite',
        color:'#fff', flexShrink:0, position:'relative', zIndex:20,
        boxShadow:'0 8px 32px rgba(30,58,95,0.35)'
      }}>
        <div style={{ position:'absolute', inset:0, background:'linear-gradient(90deg, transparent, rgba(255,255,255,0.04), transparent)', pointerEvents:'none' }}/>
        <div style={{ display:'flex', alignItems:'center', gap:16, position:'relative' }}>
          <div style={{
            width:48, height:48, borderRadius:14,
            background:'rgba(255,255,255,0.15)', backdropFilter:'blur(12px)',
            display:'flex', alignItems:'center', justifyContent:'center',
            border:'1.5px solid rgba(255,255,255,0.3)',
            boxShadow:'0 8px 24px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.2)',
            transform:'perspective(600px) rotateY(-5deg)'
          }}>
            <Building2 size={26} color="#fff" strokeWidth={1.5} />
          </div>
          <div>
            <h1 style={{ fontSize:24, fontWeight:700, letterSpacing:'-0.8px', textShadow:'0 2px 8px rgba(0,0,0,0.25)', margin:0 }}>Smartworld Sky Arc</h1>
            <span style={{ fontSize:12, color:'rgba(255,255,255,0.7)' }}>Real Estate Sales Dashboard</span>
          </div>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:18, position:'relative' }}>
          <span style={{
            padding:'6px 18px', borderRadius:24, fontSize:12, fontWeight:600,
            background:'rgba(45,122,79,0.35)', color:'#a8ffd4', border:'1.5px solid rgba(45,122,79,0.5)',
            boxShadow:'0 0 20px rgba(45,122,79,0.3)'
          }}>● LIVE</span>
          <span style={{ fontSize:12, color:'rgba(255,255,255,0.75)', fontWeight:500 }}>{invr.length} units  •  {pdrn.length} bookings</span>
        </div>
      </header>

      <div style={{ flex:1, display:'flex', flexDirection:'column', position:'relative', zIndex:10 }}>
        <div style={{ padding:'20px 32px', width:'100%', display:'flex', flexDirection:'column', gap:14 }}>

          {/* Filters */}
          <div style={{
            background:'var(--bg-glass)', backdropFilter:'blur(24px)', WebkitBackdropFilter:'blur(24px)',
            border:'1.5px solid rgba(255,255,255,0.65)', borderRadius:'18px',
            padding:'14px 20px', display:'flex', flexWrap:'wrap', gap:12, alignItems:'center',
            boxShadow:'0 6px 20px rgba(30,58,95,0.08), inset 0 1.5px 0 rgba(255,255,255,0.7)',
          }}>
            <FilterSelect label="Project" value={filters.project} options={options.projects} onChange={v => setFilters(f=>({...f, project:v}))} />
            <FilterSelect label="Company" value={filters.company} options={options.companies} onChange={v => setFilters(f=>({...f, company:v}))} />
            <FilterSelect label="Unit Number" value={filters.unit} options={options.units} onChange={v => setFilters(f=>({...f, unit:v}))} />
            <FilterSelect label="Month" value={filters.month} options={options.months} onChange={v => setFilters(f=>({...f, month:v}))} />
            <FilterSelect label="Year" value={filters.year} options={options.years.map(String)} onChange={v => setFilters(f=>({...f, year:v}))} />
            <button onClick={reset} style={{
              background:'linear-gradient(135deg, #b8443a, #8b2e26)', border:'none',
              color:'#fff', padding:'10px 24px', borderRadius:12, fontFamily:'inherit',
              fontSize:13, fontWeight:600, cursor:'pointer', display:'flex', alignItems:'center', gap:7,
              boxShadow:'0 6px 16px rgba(184,68,58,0.38), inset 0 1px 0 rgba(255,255,255,0.18)',
              transition:'all 0.3s',
            }}
            onMouseEnter={e => { e.currentTarget.style.transform='translateY(-3px)'; e.currentTarget.style.boxShadow='0 10px 28px rgba(184,68,58,0.5)'; }}
            onMouseLeave={e => { e.currentTarget.style.transform='none'; e.currentTarget.style.boxShadow='0 6px 16px rgba(184,68,58,0.38)'; }}
            ><RotateCcw size={14}/> Reset</button>
          </div>

          {/* KPI Grid - 2 rows of 4 */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(4, 1fr)', gap:12 }}>
            <KPI3D icon={<LayoutGrid size={22}/>} label="Total Units" value={kpi.totalUnits} sub={`${kpi.booked} booked · ${kpi.available} available`} color="#1e3a5f" delay={0} />
            <KPI3D icon={<Home size={22}/>} label="Booked Units" value={kpi.booked} sub={`${occupancy}% occupancy`} color="#8b5e3c" delay={0.1} ring={occupancy} />
            <KPI3D icon={<Building2 size={22}/>} label="Available Units" value={kpi.available} sub={fmtArea(kpi.availArea)} color="#c49a3c" delay={0.2} />
            <KPI3D icon={<IndianRupee size={22}/>} label="Total Sales BSP" value={fmt(kpi.totalSales)} color="#111" delay={0.3} sub="Net Basic Price" />
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(4, 1fr)', gap:12 }}>
            <KPI3D icon={<TrendingUp size={22}/>} label="Total Demand" value={fmt(kpi.demand)} color="#b07d56" delay={0.4} sub="Active Bookings" />
            <KPI3D icon={<Wallet size={22}/>} label="Received Amount" value={fmt(kpi.received)} color="#2d7a4f" delay={0.5} ring={collection} sub={`${collection}% collected`} />
            <KPI3D icon={<BarChart3 size={22}/>} label="TCV (With Tax)" value={fmt(kpi.tcv)} color="#b8443a" delay={0.6} sub="Total Contract Value" />
            <KPI3D icon={<MapPin size={22}/>} label="Booked Area" value={fmtArea(kpi.bookedArea)} color="#3b82c4" delay={0.7} sub="Super Built-up Area" />
          </div>

          {/* Charts Grid - 2x3 */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14, marginTop:8 }}>
            
            {/* 1. Tower Distribution - Stacked Bar with Labels */}
            <GlassCard title="Tower-wise Distribution (Booked + Available)" icon={<BarChart3 size={16}/>} color="var(--blue)" delay={0}>
              <ResponsiveContainer width="100%" height={320}>
                <BarChart data={towerData} barGap={0} margin={{ top:20, right:20, left:0, bottom:60 }}>
                  <CartesianGrid strokeDasharray="3 4" stroke="rgba(30,58,95,0.08)" vertical={false} />
                  <XAxis dataKey="tower" tick={{ fill:'#8b7355', fontSize:12, fontWeight:500 }} axisLine={false} tickLine={false} angle={0} />
                  <YAxis tick={{ fill:'#8b7355', fontSize:12, fontWeight:500 }} axisLine={false} tickLine={false} label={{ value: 'Units', angle: -90, position: 'insideLeft', offset:10, style:{fill:'#8b7355', fontSize:12, fontWeight:600} }} />
                  <Tooltip contentStyle={tooltipStyle} cursor={{ fill:'rgba(30,58,95,0.06)' }} formatter={(value, name) => name === 'booked' ? [value, 'Booked'] : [value, 'Available']} labelFormatter={(label) => `Tower ${label}`} />
                  <Bar dataKey="booked" stackId="stack" fill="#1e3a5f" name="Booked" radius={[8,8,0,0]} animationDuration={1600} label={{ position: 'insideBottomLeft', offset: 6, fill: '#fff', fontSize: 12, fontWeight: 600 }} />
                  <Bar dataKey="available" stackId="stack" fill="#b07d56" name="Available" radius={[8,8,0,0]} animationDuration={1600} animationBegin={300} label={{ position: 'insideBottomRight', offset: 6, fill: '#fff', fontSize: 12, fontWeight: 600 }} />
                  <Legend wrapperStyle={{ paddingTop: 16, fontSize: 12 }} />
                </BarChart>
              </ResponsiveContainer>
            </GlassCard>

            {/* 2. Demand vs Collection - Bar */}
            <GlassCard title="Demand vs Collection Overview" icon={<IndianRupee size={16}/>} color="var(--gold)" delay={0.1}>
              <ResponsiveContainer width="100%" height={320}>
                <BarChart data={[{ name: 'Amount', demand: kpi.demand, received: kpi.received, pending: kpi.demand - kpi.received }]} barGap={45} margin={{ top:20, right:20, left:0, bottom:40 }}>
                  <CartesianGrid strokeDasharray="3 4" stroke="rgba(30,58,95,0.08)" vertical={false} />
                  <XAxis dataKey="name" tick={{ fill:'#8b7355', fontSize:12, fontWeight:500 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill:'#8b7355', fontSize:12, fontWeight:500 }} axisLine={false} tickLine={false} tickFormatter={v => fmtShort(v)} label={{ value: 'Amount (Crores)', angle: -90, position: 'insideLeft', offset:10, style:{fill:'#8b7355', fontSize:12, fontWeight:600} }} />
                  <Tooltip contentStyle={tooltipStyle} formatter={(v) => fmt(v)} />
                  <Bar dataKey="demand" fill="#8b5e3c" name="Total Demand" radius={[8,8,0,0]} animationDuration={1400} label={{ position: 'top', fill: '#8b5e3c', fontSize: 11, fontWeight: 600 }} />
                  <Bar dataKey="received" fill="#2d7a4f" name="Received" radius={[8,8,0,0]} animationDuration={1400} animationBegin={200} label={{ position: 'top', fill: '#2d7a4f', fontSize: 11, fontWeight: 600 }} />
                  <Bar dataKey="pending" fill="#c49a3c" name="Pending" radius={[8,8,0,0]} animationDuration={1400} animationBegin={400} label={{ position: 'top', fill: '#c49a3c', fontSize: 11, fontWeight: 600 }} />
                  <Legend wrapperStyle={{ paddingTop: 16, fontSize: 12 }} />
                </BarChart>
              </ResponsiveContainer>
            </GlassCard>

            {/* 3. All Projects - Sales vs Demand vs Collections */}
            <GlassCard title="All Projects: Sales vs Demand vs Collections" icon={<BarChart3 size={16}/>} color="var(--brown)" delay={0.2} style={{ gridColumn: '1 / -1' }}>
              <ResponsiveContainer width="100%" height={320}>
                <BarChart data={projectSalesData} barGap={8} margin={{ top:20, right:20, left:0, bottom:80 }}>
                  <CartesianGrid strokeDasharray="3 4" stroke="rgba(30,58,95,0.08)" vertical={false} />
                  <XAxis dataKey="name" tick={{ fill:'#8b7355', fontSize:11, fontWeight:500 }} axisLine={false} tickLine={false} angle={-45} textAnchor="end" height={100} />
                  <YAxis tick={{ fill:'#8b7355', fontSize:12, fontWeight:500 }} axisLine={false} tickLine={false} tickFormatter={v => fmtShort(v)} label={{ value: 'Amount (Crores)', angle: -90, position: 'insideLeft', offset:10, style:{fill:'#8b7355', fontSize:12, fontWeight:600} }} />
                  <Tooltip contentStyle={tooltipStyle} formatter={(v) => fmt(v)} />
                  <Bar dataKey="sales" fill="#1e3a5f" name="Sales BSP" radius={[6,6,0,0]} animationDuration={1600} />
                  <Bar dataKey="demand" fill="#8b5e3c" name="Total Demand" radius={[6,6,0,0]} animationDuration={1600} animationBegin={250} />
                  <Bar dataKey="received" fill="#2d7a4f" name="Collections" radius={[6,6,0,0]} animationDuration={1600} animationBegin={500} />
                  <Legend wrapperStyle={{ paddingTop: 20, fontSize: 12 }} />
                </BarChart>
              </ResponsiveContainer>
            </GlassCard>

            {/* 4. Due Outstanding */}
            <GlassCard title="Due Outstanding Amount (Past Months)" icon={<AlertCircle size={16}/>} color="var(--rose)" delay={0.3}>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={dueOutstandingData} margin={{ top:20, right:20, left:0, bottom:50 }}>
                  <CartesianGrid strokeDasharray="3 4" stroke="rgba(30,58,95,0.08)" vertical={false} />
                  <XAxis dataKey="month" tick={{ fill:'#8b7355', fontSize:11, fontWeight:500 }} axisLine={false} tickLine={false} angle={-45} textAnchor="end" tickFormatter={v => { const [y,m]=v.split('-'); return `${['','Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][+m]}'${y.slice(2)}`; }} height={80} />
                  <YAxis tick={{ fill:'#8b7355', fontSize:11, fontWeight:500 }} axisLine={false} tickLine={false} tickFormatter={v => fmtShort(v)} label={{ value: 'Outstanding (Cr)', angle: -90, position: 'insideLeft', offset:10, style:{fill:'#8b7355', fontSize:11, fontWeight:600} }} />
                  <Tooltip contentStyle={tooltipStyle} formatter={(v) => fmt(v)} />
                  <Bar dataKey="outstanding" fill="#b8443a" name="Outstanding Amount" radius={[6,6,0,0]} animationDuration={1600} label={{ position: 'top', fill: '#b8443a', fontSize: 11, fontWeight: 600 }} />
                </BarChart>
              </ResponsiveContainer>
            </GlassCard>

            {/* 5. Undue Upcoming Demand */}
            <GlassCard title="Undue Upcoming Demand (Month-wise Future)" icon={<Activity size={16}/>} color="var(--green)" delay={0.4}>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={undueDemandData} margin={{ top:20, right:20, left:0, bottom:50 }}>
                  <CartesianGrid strokeDasharray="3 4" stroke="rgba(30,58,95,0.08)" vertical={false} />
                  <XAxis dataKey="month" tick={{ fill:'#8b7355', fontSize:11, fontWeight:500 }} axisLine={false} tickLine={false} angle={-45} textAnchor="end" tickFormatter={v => { const [y,m]=v.split('-'); return `${['','Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][+m]}'${y.slice(2)}`; }} height={80} />
                  <YAxis tick={{ fill:'#8b7355', fontSize:11, fontWeight:500 }} axisLine={false} tickLine={false} tickFormatter={v => fmtShort(v)} label={{ value: 'Demand (Crores)', angle: -90, position: 'insideLeft', offset:10, style:{fill:'#8b7355', fontSize:11, fontWeight:600} }} />
                  <Tooltip contentStyle={tooltipStyle} formatter={(v) => fmt(v)} />
                  <Bar dataKey="demand" fill="#2d7a4f" name="Upcoming Demand" radius={[6,6,0,0]} animationDuration={1600} label={{ position: 'top', fill: '#2d7a4f', fontSize: 11, fontWeight: 600 }} />
                </BarChart>
              </ResponsiveContainer>
            </GlassCard>

            {/* Booking Status Pie */}
            <GlassCard title="Booking Status Breakdown" icon={<PieIcon size={16}/>} color="var(--brown)" delay={0.5}>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie data={statusPie} cx="50%" cy="50%" innerRadius={70} outerRadius={100} dataKey="value" paddingAngle={5} strokeWidth={2} stroke="#fff" animationDuration={1200}>
                    {statusPie.map((e, i) => <Cell key={i} fill={e.color} />)}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} formatter={(v) => v} />
                  <Legend verticalAlign="bottom" height={36} fontSize={12} />
                </PieChart>
              </ResponsiveContainer>
            </GlassCard>

            {/* Collection Progress Pie */}
            <GlassCard title="Collection Progress" icon={<Wallet size={16}/>} color="var(--blue)" delay={0.6}>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie data={collectionPie} cx="50%" cy="50%" innerRadius={70} outerRadius={100} dataKey="value" paddingAngle={5} strokeWidth={2} stroke="#fff" animationDuration={1200}>
                    {collectionPie.map((e, i) => <Cell key={i} fill={e.color} />)}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} formatter={(v) => fmt(v)} />
                  <Legend verticalAlign="bottom" height={36} fontSize={12} />
                </PieChart>
              </ResponsiveContainer>
            </GlassCard>
          </div>

          <div style={{ height: 60 }}></div>
        </div>
      </div>
    </div>
  );
}

function FilterSelect({ label, value, options, onChange }) {
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:5, flex:1, minWidth:130 }}>
      <label style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:0.8, color:'var(--text3)' }}>{label}</label>
      <select value={value} onChange={e => onChange(e.target.value)}
        style={{
          background:'rgba(255,255,255,0.72)', border:'1px solid rgba(180,160,140,0.25)', color:'var(--text)',
          padding:'10px 14px', borderRadius:10, fontFamily:'inherit', fontSize:12, cursor:'pointer', outline:'none',
          backdropFilter:'blur(8px)', transition:'all 0.25s',
          boxShadow:'0 2px 6px rgba(0,0,0,0.04), inset 0 1px 0 rgba(255,255,255,0.7)'
        }}
        onFocus={e => { e.target.style.borderColor='#1e3a5f'; e.target.style.boxShadow='0 0 0 3px rgba(30,58,95,0.14)'; }}
        onBlur={e => { e.target.style.borderColor='rgba(180,160,140,0.25)'; e.target.style.boxShadow='0 2px 6px rgba(0,0,0,0.04)'; }}
      >
        <option value="">All</option>
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );
}

function KPI3D({ icon, label, value, color, sub, delay = 0, ring }) {
  const [hovered, setHovered] = useState(false);
  const cardRef = useRef(null);
  const [tilt, setTilt] = useState({ x:0, y:0 });

  const handleMove = useCallback((e) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    setTilt({ x: y * -8, y: x * 8 });
  }, []);

  return (
    <div
      ref={cardRef}
      onMouseEnter={() => setHovered(true)}
      onMouseMove={handleMove}
      onMouseLeave={() => { setHovered(false); setTilt({ x:0, y:0 }); }}
      style={{
        background:'var(--bg-glass)',
        backdropFilter:'blur(20px)', WebkitBackdropFilter:'blur(20px)',
        border:`1.5px solid ${hovered ? color+'35' : 'rgba(255,255,255,0.65)'}`,
        borderRadius:'18px',
        padding:'18px 16px 14px',
        position:'relative',
        overflow:'hidden',
        cursor:'default',
        animation:`slide-up 0.7s ease-out ${delay}s both, glow-breathe 4.5s ease-in-out infinite ${delay * 0.4}s`,
        '--glow-color': `${color}15`,
        transition:'all 0.25s ease',
        transform: `perspective(800px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg) ${hovered ? 'translateY(-8px) scale(1.03)' : ''}`,
        boxShadow: hovered
          ? `0 24px 60px ${color}28, 0 0 0 1px ${color}20, inset 0 1px 0 rgba(255,255,255,0.7)`
          : `0 4px 16px ${color}12, inset 0 1px 0 rgba(255,255,255,0.7)`,
        transformStyle:'preserve-3d',
      }}
    >
      <div style={{ position:'absolute', top:0, left:0, right:0, height:5, background:`linear-gradient(90deg, ${color}00, ${color}, ${color}00)`, transition:'opacity 0.3s', opacity: hovered ? 1 : 0.5 }} />
      <div style={{
        width:38, height:38, borderRadius:12,
        background:`linear-gradient(135deg, ${color}18, ${color}08)`,
        border:`1.5px solid ${color}22`,
        display:'flex', alignItems:'center', justifyContent:'center', color,
        marginBottom:10,
        transition:'all 0.3s',
        transform: hovered ? 'scale(1.18)' : 'scale(1)',
        boxShadow: hovered ? `0 8px 24px ${color}28` : `0 3px 10px ${color}12`,
      }}>{icon}</div>
      <div style={{ fontSize:10, color:'var(--text3)', fontWeight:700, textTransform:'uppercase', letterSpacing:0.6, marginBottom:3 }}>{label}</div>
      <div style={{
        fontFamily:"'Space Mono',monospace", fontSize:20, fontWeight:700, color:'var(--black)',
        animation:'counter-up 0.7s ease-out both', animationDelay:`${0.3 + delay}s`,
        marginBottom:4
      }}>{value}</div>
      {sub && <div style={{ fontSize:11, color:'var(--text2)', fontWeight:500 }}>{sub}</div>}
    </div>
  );
}

function GlassCard({ title, icon, color, children, delay = 0, style: extraStyle }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background:'var(--bg-glass)',
        backdropFilter:'blur(24px)', WebkitBackdropFilter:'blur(24px)',
        border:`1.5px solid ${hovered ? 'rgba(30,58,95,0.22)' : 'rgba(255,255,255,0.65)'}`,
        borderRadius:'18px',
        padding:'16px 18px',
        display:'flex', flexDirection:'column', overflow:'hidden',
        boxShadow: hovered
          ? '0 20px 50px rgba(30,58,95,0.16), inset 0 1.5px 0 rgba(255,255,255,0.7)'
          : '0 4px 16px rgba(30,58,95,0.08), inset 0 1.5px 0 rgba(255,255,255,0.7)',
        transition:'all 0.35s cubic-bezier(0.4,0,0.2,1)',
        transform: hovered ? 'perspective(1000px) rotateX(-1deg) translateY(-5px)' : 'none',
        animation:`slide-up 0.8s ease-out ${delay}s both`,
        position:'relative',
        ...extraStyle
      }}
    >
      <div style={{ position:'absolute', top:0, left:0, right:0, height:3, background:`linear-gradient(90deg, transparent, ${color}, transparent)`, opacity: hovered ? 0.8 : 0.4, transition:'opacity 0.3s' }} />
      <div style={{
        fontSize:14, fontWeight:600, marginBottom:12, display:'flex', alignItems:'center', gap:10,
        color:'var(--text)', flexShrink:0
      }}>
        <span style={{
          color, width:28, height:28, borderRadius:10,
          background:`${color}12`, display:'flex', alignItems:'center', justifyContent:'center',
          border:`1.5px solid ${color}20`, boxShadow:`0 3px 10px ${color}12`,
          transition:'all 0.3s', transform: hovered ? 'scale(1.15)' : 'scale(1)',
          fontSize:16
        }}>{icon}</span>
        {title}
      </div>
      <div style={{ flex:1, minHeight:0 }}>{children}</div>
    </div>
  );
}
