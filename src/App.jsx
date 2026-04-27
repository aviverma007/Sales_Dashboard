import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { loadExcel, parseINVR, parsePDRN } from './dataLoader';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  PieChart, Pie, Cell, AreaChart, Area, Legend, ComposedChart
} from 'recharts';
import {
  Building2, IndianRupee, TrendingUp, Home, LayoutGrid,
  RotateCcw, Loader2, BarChart3, PieChart as PieIcon, Activity, Wallet, MapPin, AlertCircle
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

  const demandCollectionData = [
    { name: 'Amount', demand: kpi.demand, received: kpi.received, pending: Math.max(0, kpi.demand - kpi.received) }
  ];

  const projectSalesData = useMemo(() => {
    const map = {};
    invr.forEach(r => {
      if (r.status === 'Booked') {
        if (!map[r.projectName]) map[r.projectName] = { project: r.projectName, sales: 0 };
        map[r.projectName].sales += Number(r.netBasicPrice)||0;
      }
    });
    const demand = {}, received = {};
    pdrn.forEach(r => {
      if (r.bookingStatus === 'ACTIVE') {
        if (!demand[r.projectName]) demand[r.projectName] = 0;
        if (!received[r.projectName]) received[r.projectName] = 0;
        demand[r.projectName] += Number(r.totalDemand)||0;
        received[r.projectName] += Number(r.totalReceived)||0;
      }
    });
    return Object.keys(map).map(p => ({
      name: p.substring(0, 12),
      sales: map[p].sales,
      demand: demand[p] || 0,
      received: received[p] || 0
    })).sort((a, b) => b.sales - a.sales);
  }, [invr, pdrn]);

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
    { name: `Booked (${kpi.booked})`, value: kpi.booked, color: '#1e3a5f' },
    { name: `Available (${kpi.available})`, value: kpi.available, color: '#b07d56' },
  ], [kpi]);

  const collectionPie = useMemo(() => {
    const pending = Math.max(0, kpi.demand - kpi.received);
    return [
      { name: `Received (₹${(kpi.received/1e7).toFixed(1)}Cr)`, value: kpi.received, color: '#1e3a5f' },
      { name: `Pending (₹${(pending/1e7).toFixed(1)}Cr)`, value: pending, color: '#c49a3c' },
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
      {/* Background orbs */}
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
        <div style={{ display:'flex', alignItems:'center', gap:16, position:'relative' }}>
          <Building2 size={28} color="#fff" />
          <div>
            <h1 style={{ fontSize:24, fontWeight:700, margin:0 }}>Smartworld Sky Arc</h1>
            <span style={{ fontSize:12, color:'rgba(255,255,255,0.7)' }}>Real Estate Sales Dashboard</span>
          </div>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:18 }}>
          <span style={{ padding:'6px 18px', borderRadius:24, fontSize:12, fontWeight:600, background:'rgba(45,122,79,0.35)', color:'#a8ffd4', border:'1.5px solid rgba(45,122,79,0.5)' }}>● LIVE</span>
          <span style={{ fontSize:12, color:'rgba(255,255,255,0.75)' }}>{invr.length} units • {pdrn.length} bookings</span>
        </div>
      </header>

      <div style={{ flex:1, padding:'24px 32px', position:'relative', zIndex:10 }}>
        {/* Filters */}
        <div style={{ display:'flex', gap:12, marginBottom:20, flexWrap:'wrap', alignItems:'flex-end' }}>
          <FilterSelect label="Project" value={filters.project} options={options.projects} onChange={v => setFilters(f=>({...f, project:v}))} />
          <FilterSelect label="Company" value={filters.company} options={options.companies} onChange={v => setFilters(f=>({...f, company:v}))} />
          <FilterSelect label="Unit" value={filters.unit} options={options.units} onChange={v => setFilters(f=>({...f, unit:v}))} />
          <FilterSelect label="Month" value={filters.month} options={options.months} onChange={v => setFilters(f=>({...f, month:v}))} />
          <FilterSelect label="Year" value={filters.year} options={options.years.map(String)} onChange={v => setFilters(f=>({...f, year:v}))} />
          <button onClick={reset} style={{ background:'#b8443a', border:'none', color:'#fff', padding:'10px 20px', borderRadius:8, cursor:'pointer', fontSize:12, fontWeight:600 }}>Reset</button>
        </div>

        {/* KPI Cards - 2 rows of 4 */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4, 1fr)', gap:14, marginBottom:20 }}>
          <KPICard label="Total Units" value={kpi.totalUnits} sub={`${kpi.booked}B · ${kpi.available}A`} color="#1e3a5f" />
          <KPICard label="Booked" value={kpi.booked} sub={`${occupancy}%`} color="#8b5e3c" />
          <KPICard label="Available" value={kpi.available} sub={fmtArea(kpi.availArea)} color="#c49a3c" />
          <KPICard label="Sales" value={fmt(kpi.totalSales)} sub="BSP" color="#111" />
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4, 1fr)', gap:14, marginBottom:20 }}>
          <KPICard label="Demand" value={fmt(kpi.demand)} sub="Active" color="#b07d56" />
          <KPICard label="Received" value={fmt(kpi.received)} sub={`${collection}%`} color="#2d7a4f" />
          <KPICard label="TCV" value={fmt(kpi.tcv)} sub="With Tax" color="#b8443a" />
          <KPICard label="Booked Area" value={fmtArea(kpi.bookedArea)} sub="SuperBuilt-up" color="#3b82c4" />
        </div>

        {/* Charts - 2x3 Grid */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, marginBottom:40 }}>
          
          {/* 1. Tower Distribution */}
          <ChartCard title="Tower-wise Distribution" color="#1e3a5f">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={towerData} margin={{ top:10, right:20, left:0, bottom:40 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.08)" />
                <XAxis dataKey="tower" tick={{ fontSize:11 }} angle={-45} textAnchor="end" height={80} />
                <YAxis tick={{ fontSize:11 }} label={{ value: 'Units', angle: -90, position: 'insideLeft' }} />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="booked" stackId="a" fill="#1e3a5f" name="Booked" radius={[4,4,0,0]} label={{ position: 'insideBottomLeft', offset: 5, fill: '#fff', fontSize: 10 }} />
                <Bar dataKey="available" stackId="a" fill="#b07d56" name="Available" radius={[4,4,0,0]} label={{ position: 'insideBottomRight', offset: 5, fill: '#fff', fontSize: 10 }} />
                <Legend />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          {/* 2. Demand vs Collection */}
          <ChartCard title="Demand vs Collection" color="#c49a3c">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={demandCollectionData} margin={{ top:10, right:20, left:0, bottom:20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.08)" />
                <XAxis dataKey="name" tick={{ fontSize:11 }} />
                <YAxis tick={{ fontSize:11 }} tickFormatter={v => fmtShort(v)} label={{ value: 'Amount', angle: -90, position: 'insideLeft' }} />
                <Tooltip contentStyle={tooltipStyle} formatter={(v) => fmt(v)} />
                <Bar dataKey="demand" fill="#8b5e3c" name="Total Demand" radius={[4,4,0,0]} />
                <Bar dataKey="received" fill="#2d7a4f" name="Received" radius={[4,4,0,0]} />
                <Bar dataKey="pending" fill="#c49a3c" name="Pending" radius={[4,4,0,0]} />
                <Legend />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          {/* 3. All Projects */}
          <ChartCard title="All Projects: Sales vs Demand vs Collections" color="#8b5e3c" fullWidth>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={projectSalesData} margin={{ top:10, right:20, left:0, bottom:80 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.08)" />
                <XAxis dataKey="name" tick={{ fontSize:10 }} angle={-45} textAnchor="end" height={100} />
                <YAxis tick={{ fontSize:11 }} tickFormatter={v => fmtShort(v)} label={{ value: 'Amount', angle: -90, position: 'insideLeft' }} />
                <Tooltip contentStyle={tooltipStyle} formatter={(v) => fmt(v)} />
                <Bar dataKey="sales" fill="#1e3a5f" name="Sales" radius={[3,3,0,0]} />
                <Bar dataKey="demand" fill="#8b5e3c" name="Demand" radius={[3,3,0,0]} />
                <Bar dataKey="received" fill="#2d7a4f" name="Collections" radius={[3,3,0,0]} />
                <Legend />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          {/* 4. Due Outstanding */}
          <ChartCard title="Due Outstanding (Past Months)" color="#b8443a">
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={dueOutstandingData} margin={{ top:10, right:20, left:0, bottom:60 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.08)" />
                <XAxis dataKey="month" tick={{ fontSize:10 }} angle={-45} textAnchor="end" height={80} tickFormatter={v => { const [y,m]=v.split('-'); return `${['','J','F','M','A','M','J','J','A','S','O','N','D'][+m]}'${y.slice(2)}`; }} />
                <YAxis tick={{ fontSize:11 }} tickFormatter={v => fmtShort(v)} label={{ value: 'Amount', angle: -90, position: 'insideLeft' }} />
                <Tooltip contentStyle={tooltipStyle} formatter={(v) => fmt(v)} />
                <Bar dataKey="outstanding" fill="#b8443a" name="Outstanding" radius={[4,4,0,0]} label={{ position: 'top', fill: '#b8443a', fontSize: 9 }} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          {/* 5. Undue Upcoming */}
          <ChartCard title="Undue Upcoming Demand (Future)" color="#2d7a4f">
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={undueDemandData} margin={{ top:10, right:20, left:0, bottom:60 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.08)" />
                <XAxis dataKey="month" tick={{ fontSize:10 }} angle={-45} textAnchor="end" height={80} tickFormatter={v => { const [y,m]=v.split('-'); return `${['','J','F','M','A','M','J','J','A','S','O','N','D'][+m]}'${y.slice(2)}`; }} />
                <YAxis tick={{ fontSize:11 }} tickFormatter={v => fmtShort(v)} label={{ value: 'Amount', angle: -90, position: 'insideLeft' }} />
                <Tooltip contentStyle={tooltipStyle} formatter={(v) => fmt(v)} />
                <Bar dataKey="demand" fill="#2d7a4f" name="Upcoming Demand" radius={[4,4,0,0]} label={{ position: 'top', fill: '#2d7a4f', fontSize: 9 }} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          {/* 6. Status Pie */}
          <ChartCard title="Booking Status" color="#8b5e3c">
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie data={statusPie} cx="50%" cy="50%" innerRadius={50} outerRadius={90} dataKey="value" paddingAngle={4} strokeWidth={2} stroke="#fff">
                  {statusPie.map((e, i) => <Cell key={i} fill={e.color} />)}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </ChartCard>

          {/* 7. Collection Pie */}
          <ChartCard title="Collection Progress" color="#1e3a5f">
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie data={collectionPie} cx="50%" cy="50%" innerRadius={50} outerRadius={90} dataKey="value" paddingAngle={4} strokeWidth={2} stroke="#fff">
                  {collectionPie.map((e, i) => <Cell key={i} fill={e.color} />)}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} formatter={(v) => fmt(v)} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>
      </div>
    </div>
  );
}

function FilterSelect({ label, value, options, onChange }) {
  return (
    <div style={{ flex:1, minWidth:120 }}>
      <label style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', color:'#8b7355', display:'block', marginBottom:4 }}>{label}</label>
      <select value={value} onChange={e => onChange(e.target.value)}
        style={{ width:'100%', padding:'8px 12px', borderRadius:8, border:'1px solid #ddd', fontSize:11, fontFamily:'inherit' }}>
        <option value="">All</option>
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );
}

function KPICard({ label, value, sub, color }) {
  return (
    <div style={{
      background:'rgba(255,255,255,0.6)', backdropFilter:'blur(20px)', border:'1px solid rgba(255,255,255,0.8)',
      borderRadius:14, padding:'16px', textAlign:'center', boxShadow:'0 4px 12px rgba(0,0,0,0.08)'
    }}>
      <div style={{ fontSize:10, fontWeight:700, color:'#8b7355', textTransform:'uppercase', marginBottom:6 }}>{label}</div>
      <div style={{ fontSize:20, fontWeight:700, color:color, marginBottom:4 }}>{value}</div>
      {sub && <div style={{ fontSize:9, color:'#5c4a3a' }}>{sub}</div>}
    </div>
  );
}

function ChartCard({ title, color, children, fullWidth }) {
  return (
    <div style={{
      background:'rgba(255,255,255,0.6)', backdropFilter:'blur(20px)', border:'1px solid rgba(255,255,255,0.8)',
      borderRadius:14, padding:'16px', boxShadow:'0 4px 12px rgba(0,0,0,0.08)',
      gridColumn: fullWidth ? '1 / -1' : 'auto'
    }}>
      <h3 style={{ fontSize:13, fontWeight:600, color:'var(--text)', margin:'0 0 12px 0', borderBottom:'2px solid ' + color, paddingBottom:8 }}>
        ■ {title}
      </h3>
      <div style={{ minHeight:280 }}>
        {children}
      </div>
    </div>
  );
}
