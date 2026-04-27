import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { loadExcel, parseINVR, parsePDRN } from './dataLoader';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  PieChart, Pie, Cell, Legend
} from 'recharts';
import {
  Building2, RotateCcw, Loader2
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
const tooltipStyle = {
  background:'rgba(255,255,255,0.96)', backdropFilter:'blur(10px)',
  border:'1px solid rgba(180,160,140,0.3)', borderRadius:10, fontSize:10,
  boxShadow:'0 8px 30px rgba(0,0,0,0.12)', padding:'6px 10px'
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
    const totalSales = fInvr.filter(r => r.status === 'Booked').reduce((s, r) => s + r.netBasicPrice, 0);
    const activePdrn = fPdrn.filter(r => r.bookingStatus === 'ACTIVE');
    const demand = activePdrn.reduce((s, r) => s + r.totalDemand, 0);
    const received = activePdrn.reduce((s, r) => s + r.totalReceived, 0);
    const tcv = activePdrn.reduce((s, r) => s + r.tcv, 0);
    return { totalUnits, booked, available, bookedArea, totalSales, demand, received, tcv };
  }, [fInvr, fPdrn]);

  const towerData = useMemo(() => {
    const map = {};
    fInvr.forEach(r => {
      if (!map[r.tower]) map[r.tower] = { tower: r.tower, booked: 0, available: 0 };
      if (r.status === 'Booked') map[r.tower].booked++;
      else map[r.tower].available++;
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
    return Object.keys(map).map(p => ({
      name: p.substring(0, 10),
      sales: map[p].sales
    })).sort((a, b) => b.sales - a.sales).slice(0, 3);
  }, [invr]);

  const dueOutstandingData = useMemo(() => {
    const map = {};
    pdrn.forEach(r => {
      if (r.bookingStatus === 'ACTIVE' && r.month) {
        const monthDate = new Date(r.year, parseInt(r.month.split('-')[1]) - 1);
        if (monthDate < new Date()) {
          if (!map[r.month]) map[r.month] = 0;
          map[r.month] += Math.max(0, r.totalDemand - r.totalReceived);
        }
      }
    });
    return Object.entries(map).map(([month, outstanding]) => ({ month, outstanding }))
      .sort((a, b) => a.month.localeCompare(b.month)).slice(0, 4);
  }, [pdrn]);

  const undueDemandData = useMemo(() => {
    const map = {};
    pdrn.forEach(r => {
      if (r.bookingStatus === 'ACTIVE' && r.month) {
        const monthDate = new Date(r.year, parseInt(r.month.split('-')[1]) - 1);
        if (monthDate >= new Date()) {
          if (!map[r.month]) map[r.month] = 0;
          map[r.month] += r.totalDemand;
        }
      }
    });
    return Object.entries(map).map(([month, demand]) => ({ month, demand }))
      .sort((a, b) => a.month.localeCompare(b.month)).slice(0, 4);
  }, [pdrn]);

  const statusPie = useMemo(() => [
    { name: `Booked ${kpi.booked}`, value: kpi.booked, color: '#1e3a5f' },
    { name: `Available ${kpi.available}`, value: kpi.available, color: '#b07d56' },
  ], [kpi]);

  const collectionPie = useMemo(() => {
    const pending = Math.max(0, kpi.demand - kpi.received);
    return [
      { name: `Received`, value: kpi.received, color: '#1e3a5f' },
      { name: `Pending`, value: pending, color: '#c49a3c' },
    ];
  }, [kpi]);

  const reset = () => setFilters({ project:'', company:'', unit:'', month:'', year:'' });
  const occupancy = ((kpi.booked / kpi.totalUnits) * 100 || 0).toFixed(1);
  const collection = ((kpi.received / kpi.demand) * 100 || 0).toFixed(1);

  if (loading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100vh', gap:12, flexDirection:'column', background:'#eee8e0' }}>
      <Loader2 size={40} style={{ animation:'spin 1s linear infinite', color:'#1e3a5f' }} />
      <span style={{ color:'#5c4a3a', fontSize:12, fontWeight:500 }}>Loading...</span>
    </div>
  );

  return (
    <div style={{ height:'100vh', display:'flex', flexDirection:'column', background:'#eee8e0', position:'relative', overflow:'hidden' }}>
      {/* Background orbs */}
      <div style={{ position:'fixed', inset:0, pointerEvents:'none', zIndex:0, overflow:'hidden' }}>
        <div style={{ position:'absolute', top:'5%', left:'10%', width:250, height:250, borderRadius:'50%', background:'radial-gradient(circle, rgba(30,58,95,0.08) 0%, transparent 65%)', filter:'blur(40px)' }}/>
        <div style={{ position:'absolute', top:'60%', right:'5%', width:200, height:200, borderRadius:'50%', background:'radial-gradient(circle, rgba(139,94,60,0.06) 0%, transparent 65%)', filter:'blur(45px)' }}/>
      </div>

      {/* Header */}
      <header style={{
        padding:'10px 20px', display:'flex', alignItems:'center', justifyContent:'space-between',
        background:'linear-gradient(135deg, #1e3a5f 0%, #2c5282 100%)',
        color:'#fff', flexShrink:0, position:'relative', zIndex:20,
        boxShadow:'0 4px 16px rgba(30,58,95,0.25)'
      }}>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <Building2 size={22} color="#fff" />
          <div>
            <h1 style={{ fontSize:18, fontWeight:700, margin:0 }}>Sky Arc Dashboard</h1>
            <span style={{ fontSize:10, color:'rgba(255,255,255,0.6)' }}>Real Estate</span>
          </div>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:12 }}>
          <span style={{ padding:'4px 12px', borderRadius:16, fontSize:10, fontWeight:600, background:'rgba(45,122,79,0.4)', color:'#a8ffd4' }}>● LIVE</span>
          <span style={{ fontSize:10, color:'rgba(255,255,255,0.65)' }}>{invr.length} units</span>
        </div>
      </header>

      {/* Main Content */}
      <div style={{ flex:1, overflow:'auto', display:'flex', flexDirection:'column', position:'relative', zIndex:10, padding:'10px 16px', gap:8 }}>
        
        {/* Filters */}
        <div style={{ display:'flex', gap:8, alignItems:'flex-end', flexWrap:'wrap', background:'rgba(255,255,255,0.5)', padding:'8px', borderRadius:10, border:'1px solid rgba(255,255,255,0.7)', flexShrink:0 }}>
          <FilterSelect label="Project" value={filters.project} options={options.projects} onChange={v => setFilters(f=>({...f, project:v}))} />
          <FilterSelect label="Company" value={filters.company} options={options.companies} onChange={v => setFilters(f=>({...f, company:v}))} />
          <FilterSelect label="Unit" value={filters.unit} options={options.units} onChange={v => setFilters(f=>({...f, unit:v}))} />
          <FilterSelect label="Month" value={filters.month} options={options.months} onChange={v => setFilters(f=>({...f, month:v}))} />
          <FilterSelect label="Year" value={filters.year} options={options.years.map(String)} onChange={v => setFilters(f=>({...f, year:v}))} />
          <button onClick={reset} style={{ background:'#b8443a', border:'none', color:'#fff', padding:'7px 14px', borderRadius:6, cursor:'pointer', fontSize:10, fontWeight:600 }}>Reset</button>
        </div>

        {/* KPI Cards */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(8, 1fr)', gap:6, flexShrink:0 }}>
          <KPICard label="Units" value={kpi.totalUnits} color="#1e3a5f" />
          <KPICard label="Booked" value={kpi.booked} color="#8b5e3c" />
          <KPICard label="Avail" value={kpi.available} color="#c49a3c" />
          <KPICard label="Sales" value={`₹${(kpi.totalSales/1e7).toFixed(1)}Cr`} color="#111" />
          <KPICard label="Demand" value={`₹${(kpi.demand/1e7).toFixed(1)}Cr`} color="#b07d56" />
          <KPICard label="Received" value={`₹${(kpi.received/1e7).toFixed(1)}Cr`} color="#2d7a4f" />
          <KPICard label="TCV" value={`₹${(kpi.tcv/1e7).toFixed(1)}Cr`} color="#b8443a" />
          <KPICard label="Area" value={`${(kpi.bookedArea/100000).toFixed(1)}L`} color="#3b82c4" />
        </div>

        {/* Charts - 3x2 Grid + 1 */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gap:6, flex:1, minHeight:0 }}>
          
          {/* 1. Tower */}
          <ChartCard title="Tower Distribution">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={towerData} margin={{ top:5, right:5, left:-20, bottom:20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" />
                <XAxis dataKey="tower" tick={{ fontSize:8 }} />
                <YAxis tick={{ fontSize:8 }} width={25} />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="booked" stackId="a" fill="#1e3a5f" radius={[2,2,0,0]} />
                <Bar dataKey="available" stackId="a" fill="#b07d56" radius={[2,2,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          {/* 2. Demand vs Collection */}
          <ChartCard title="Demand vs Collection">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={demandCollectionData} margin={{ top:5, right:5, left:-20, bottom:15 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" />
                <XAxis dataKey="name" tick={{ fontSize:8 }} />
                <YAxis tick={{ fontSize:8 }} width={25} tickFormatter={v => fmtShort(v)} />
                <Tooltip contentStyle={tooltipStyle} formatter={(v) => fmt(v)} />
                <Bar dataKey="demand" fill="#8b5e3c" radius={[2,2,0,0]} />
                <Bar dataKey="received" fill="#2d7a4f" radius={[2,2,0,0]} />
                <Bar dataKey="pending" fill="#c49a3c" radius={[2,2,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          {/* 3. Projects */}
          <ChartCard title="Top Projects">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={projectSalesData} margin={{ top:5, right:5, left:-20, bottom:35 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" />
                <XAxis dataKey="name" tick={{ fontSize:7 }} angle={-45} textAnchor="end" height={50} />
                <YAxis tick={{ fontSize:8 }} width={25} tickFormatter={v => fmtShort(v)} />
                <Tooltip contentStyle={tooltipStyle} formatter={(v) => fmt(v)} />
                <Bar dataKey="sales" fill="#1e3a5f" radius={[2,2,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          {/* 4. Outstanding */}
          <ChartCard title="Due Outstanding">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dueOutstandingData} margin={{ top:5, right:5, left:-20, bottom:25 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" />
                <XAxis dataKey="month" tick={{ fontSize:7 }} angle={-45} textAnchor="end" height={40} tickFormatter={v => { const [y,m]=v.split('-'); return `${['','J','F','M','A','M','J','J','A','S','O','N','D'][+m]}'${y.slice(2)}`; }} />
                <YAxis tick={{ fontSize:8 }} width={25} tickFormatter={v => fmtShort(v)} />
                <Tooltip contentStyle={tooltipStyle} formatter={(v) => fmt(v)} />
                <Bar dataKey="outstanding" fill="#b8443a" radius={[2,2,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          {/* 5. Upcoming */}
          <ChartCard title="Upcoming Demand">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={undueDemandData} margin={{ top:5, right:5, left:-20, bottom:25 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" />
                <XAxis dataKey="month" tick={{ fontSize:7 }} angle={-45} textAnchor="end" height={40} tickFormatter={v => { const [y,m]=v.split('-'); return `${['','J','F','M','A','M','J','J','A','S','O','N','D'][+m]}'${y.slice(2)}`; }} />
                <YAxis tick={{ fontSize:8 }} width={25} tickFormatter={v => fmtShort(v)} />
                <Tooltip contentStyle={tooltipStyle} formatter={(v) => fmt(v)} />
                <Bar dataKey="demand" fill="#2d7a4f" radius={[2,2,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          {/* 6. Booking Status */}
          <ChartCard title="Booking Status">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={statusPie} cx="50%" cy="50%" innerRadius={25} outerRadius={45} dataKey="value" paddingAngle={2} strokeWidth={1} stroke="#fff">
                  {statusPie.map((e, i) => <Cell key={i} fill={e.color} />)}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} />
              </PieChart>
            </ResponsiveContainer>
          </ChartCard>

          {/* 7. Collection */}
          <ChartCard title="Collection %">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={collectionPie} cx="50%" cy="50%" innerRadius={25} outerRadius={45} dataKey="value" paddingAngle={2} strokeWidth={1} stroke="#fff">
                  {collectionPie.map((e, i) => <Cell key={i} fill={e.color} />)}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} />
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
    <div style={{ flex:1, minWidth:90 }}>
      <label style={{ fontSize:8, fontWeight:700, textTransform:'uppercase', color:'#8b7355', display:'block', marginBottom:2 }}>{label}</label>
      <select value={value} onChange={e => onChange(e.target.value)}
        style={{ width:'100%', padding:'5px 8px', borderRadius:5, border:'1px solid #ddd', fontSize:9, fontFamily:'inherit' }}>
        <option value="">All</option>
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );
}

function KPICard({ label, value, color }) {
  return (
    <div style={{
      background:'rgba(255,255,255,0.5)', border:'1px solid rgba(255,255,255,0.7)',
      borderRadius:8, padding:'8px 6px', textAlign:'center', boxShadow:'0 2px 6px rgba(0,0,0,0.04)', display:'flex', flexDirection:'column', gap:2
    }}>
      <div style={{ fontSize:8, fontWeight:700, color:'#8b7355', textTransform:'uppercase', letterSpacing:0.3 }}>{label}</div>
      <div style={{ fontSize:13, fontWeight:700, color:color }}>{value}</div>
    </div>
  );
}

function ChartCard({ title, children }) {
  return (
    <div style={{
      background:'rgba(255,255,255,0.5)', border:'1px solid rgba(255,255,255,0.7)',
      borderRadius:8, padding:'8px', boxShadow:'0 2px 6px rgba(0,0,0,0.04)',
      display:'flex', flexDirection:'column', overflow:'hidden'
    }}>
      <h3 style={{ fontSize:10, fontWeight:600, color:'#1a1a1a', margin:'0 0 4px 0', paddingBottom:2, borderBottom:'1px solid #ddd' }}>
        {title}
      </h3>
      <div style={{ flex:1, minHeight:0 }}>
        {children}
      </div>
    </div>
  );
}
