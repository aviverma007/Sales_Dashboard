import React, { useState, useEffect, useMemo } from 'react';
import { loadExcel, parseINVR, parsePDRN } from './dataLoader';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  PieChart, Pie, Cell, AreaChart, Area, Legend
} from 'recharts';
import {
  Building2, IndianRupee, TrendingUp, Home, LayoutGrid, ChevronDown,
  RotateCcw, Loader2, BarChart3, PieChart as PieIcon, Users, Landmark
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
const COLORS = ['#4e8cff', '#22c983', '#f5a623', '#f0506e', '#9b6dff', '#22d3ee', '#ff6b9d', '#36d6a0'];

export default function App() {
  const [invr, setInvr] = useState([]);
  const [pdrn, setPdrn] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ project: '', company: '', unit: '', month: '', year: '' });

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

  // Chart data
  const towerData = useMemo(() => {
    const map = {};
    fInvr.forEach(r => {
      if (!map[r.tower]) map[r.tower] = { tower: r.tower, booked: 0, available: 0 };
      if (r.status === 'Booked') map[r.tower].booked++;
      else map[r.tower].available++;
    });
    return Object.values(map).sort((a, b) => a.tower.localeCompare(b.tower));
  }, [fInvr]);

  const bhkData = useMemo(() => {
    const map = {};
    fInvr.forEach(r => {
      const label = r.bhk.split(' - ')[0].split('+')[0] || 'Other';
      if (!map[label]) map[label] = { name: label, count: 0, value: 0 };
      map[label].count++;
      map[label].value += r.totalSuperArea;
    });
    return Object.values(map).sort((a, b) => b.count - a.count);
  }, [fInvr]);

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

  const statusPie = useMemo(() => [
    { name: 'Booked', value: kpi.booked, color: '#22c983' },
    { name: 'Available', value: kpi.available, color: '#4e8cff' },
  ], [kpi]);

  const collectionPie = useMemo(() => {
    const pending = Math.max(0, kpi.demand - kpi.received);
    return [
      { name: 'Received', value: kpi.received, color: '#22c983' },
      { name: 'Pending', value: pending, color: '#f5a623' },
    ];
  }, [kpi]);

  const reset = () => setFilters({ project: '', company: '', unit: '', month: '', year: '' });

  if (loading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100vh', gap:12, flexDirection:'column' }}>
      <Loader2 size={36} style={{ animation:'spin 1s linear infinite', color:'var(--blue)' }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      <span style={{ color:'var(--text2)', fontSize:14 }}>Loading Excel Data...</span>
    </div>
  );

  return (
    <div style={{ minHeight:'100vh', background:'var(--bg)' }}>
      {/* Ambient gradient */}
      <div style={{
        position:'fixed', inset:0, zIndex:0, pointerEvents:'none',
        background:'radial-gradient(ellipse at 15% 10%, rgba(78,140,255,0.07) 0%, transparent 50%), radial-gradient(ellipse at 85% 85%, rgba(155,109,255,0.05) 0%, transparent 50%)'
      }}/>

      <div style={{ position:'relative', zIndex:1 }}>
        {/* Header */}
        <header style={{
          padding:'18px 28px', borderBottom:'1px solid var(--border)',
          display:'flex', alignItems:'center', justifyContent:'space-between',
          background:'rgba(6,9,15,0.85)', backdropFilter:'blur(20px)',
          position:'sticky', top:0, zIndex:100
        }}>
          <div style={{ display:'flex', alignItems:'center', gap:14 }}>
            <div style={{
              width:42, height:42, borderRadius:10,
              background:'linear-gradient(135deg,#4e8cff,#2563eb)',
              display:'flex', alignItems:'center', justifyContent:'center'
            }}>
              <Building2 size={22} color="#fff" />
            </div>
            <div>
              <h1 style={{ fontSize:20, fontWeight:700, letterSpacing:'-0.5px' }}>Smartworld Sky Arc</h1>
              <span style={{ fontSize:12, color:'var(--text3)' }}>Real Estate Sales Dashboard</span>
            </div>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:12 }}>
            <span style={{
              padding:'5px 14px', borderRadius:20, fontSize:11, fontWeight:600,
              background:'rgba(34,201,131,0.12)', color:'var(--green)', border:'1px solid rgba(34,201,131,0.25)'
            }}>● LIVE DATA</span>
            <span style={{ fontSize:11, color:'var(--text3)' }}>{invr.length} units · {pdrn.length} bookings</span>
          </div>
        </header>

        <div style={{ maxWidth:1480, margin:'0 auto', padding:'20px 24px' }}>
          {/* Filters */}
          <div style={{
            background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:'var(--radius)',
            padding:'16px 20px', marginBottom:20, display:'flex', flexWrap:'wrap', gap:12, alignItems:'flex-end'
          }}>
            <FilterSelect label="Project" value={filters.project} options={options.projects}
              onChange={v => setFilters(f=>({...f, project:v}))} />
            <FilterSelect label="Company" value={filters.company} options={options.companies}
              onChange={v => setFilters(f=>({...f, company:v}))} />
            <FilterSelect label="Unit Number" value={filters.unit} options={options.units}
              onChange={v => setFilters(f=>({...f, unit:v}))} />
            <FilterSelect label="Month" value={filters.month} options={options.months}
              onChange={v => setFilters(f=>({...f, month:v}))} />
            <FilterSelect label="Year" value={filters.year} options={options.years.map(String)}
              onChange={v => setFilters(f=>({...f, year:v}))} />
            <button onClick={reset} style={{
              background:'rgba(240,80,110,0.12)', border:'1px solid rgba(240,80,110,0.25)',
              color:'var(--rose)', padding:'9px 18px', borderRadius:8, fontFamily:'inherit',
              fontSize:12, fontWeight:600, cursor:'pointer', display:'flex', alignItems:'center', gap:6
            }}><RotateCcw size={13}/> Reset</button>
          </div>

          {/* KPI Cards */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(195px, 1fr))', gap:14, marginBottom:22 }}>
            <KPI icon={<LayoutGrid size={18}/>} label="Total Units" value={kpi.totalUnits} color="blue" sub={`${kpi.booked} booked · ${kpi.available} avail`} />
            <KPI icon={<Home size={18}/>} label="Booked Units" value={kpi.booked} color="green" sub={`${((kpi.booked/kpi.totalUnits)*100||0).toFixed(1)}% occupancy`} />
            <KPI icon={<Building2 size={18}/>} label="Available Units" value={kpi.available} color="cyan" sub={fmtArea(kpi.availArea)+' area'} />
            <KPI icon={<IndianRupee size={18}/>} label="Total Sales (BSP)" value={fmt(kpi.totalSales)} color="violet" sub="Net Basic Price" />
            <KPI icon={<TrendingUp size={18}/>} label="Total Demand" value={fmt(kpi.demand)} color="amber" sub="Active bookings" />
            <KPI icon={<Landmark size={18}/>} label="Received Amount" value={fmt(kpi.received)} color="green" sub={`${((kpi.received/kpi.demand)*100||0).toFixed(1)}% collected`} />
            <KPI icon={<BarChart3 size={18}/>} label="TCV (With Tax)" value={fmt(kpi.tcv)} color="rose" sub="Total Contract Value" />
            <KPI icon={<Users size={18}/>} label="Booked Area" value={fmtArea(kpi.bookedArea)} color="blue" sub="Super Built-up" />
          </div>

          {/* Charts Row 1 */}
          <div style={{ display:'grid', gridTemplateColumns:'2fr 1fr', gap:18, marginBottom:20 }}>
            {/* Tower-wise units */}
            <ChartCard title="Tower-wise Unit Distribution" icon={<BarChart3 size={14}/>} color="var(--blue)">
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={towerData} barGap={4}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                  <XAxis dataKey="tower" tick={{ fill:'#8899b0', fontSize:11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill:'#8899b0', fontSize:11 }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ background:'#0f1623', border:'1px solid #1a2435', borderRadius:10, fontSize:12 }} />
                  <Bar dataKey="booked" fill="#22c983" name="Booked" radius={[4,4,0,0]} />
                  <Bar dataKey="available" fill="#4e8cff" name="Available" radius={[4,4,0,0]} />
                  <Legend wrapperStyle={{ fontSize:11, color:'#8899b0' }} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>

            {/* Status Pie */}
            <ChartCard title="Booking Status" icon={<PieIcon size={14}/>} color="var(--green)">
              <div style={{ position:'relative' }}>
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie data={statusPie} cx="50%" cy="50%" innerRadius={70} outerRadius={100}
                      dataKey="value" paddingAngle={3} strokeWidth={0}>
                      {statusPie.map((e, i) => <Cell key={i} fill={e.color} />)}
                    </Pie>
                    <Tooltip contentStyle={{ background:'#0f1623', border:'1px solid #1a2435', borderRadius:10, fontSize:12 }} />
                    <Legend wrapperStyle={{ fontSize:11 }} />
                  </PieChart>
                </ResponsiveContainer>
                <div style={{
                  position:'absolute', top:'43%', left:'50%', transform:'translate(-50%,-50%)',
                  textAlign:'center', pointerEvents:'none'
                }}>
                  <div style={{ fontFamily:"'Space Mono',monospace", fontSize:26, fontWeight:700 }}>{kpi.totalUnits}</div>
                  <div style={{ fontSize:10, color:'var(--text3)' }}>Total Units</div>
                </div>
              </div>
            </ChartCard>
          </div>

          {/* Charts Row 2 */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:18, marginBottom:20 }}>
            {/* Monthly Trend */}
            <ChartCard title="Monthly Demand vs Received" icon={<TrendingUp size={14}/>} color="var(--amber)">
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={monthlyData}>
                  <defs>
                    <linearGradient id="gDemand" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#f5a623" stopOpacity={0.3}/>
                      <stop offset="100%" stopColor="#f5a623" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="gReceived" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#22c983" stopOpacity={0.3}/>
                      <stop offset="100%" stopColor="#22c983" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                  <XAxis dataKey="month" tick={{ fill:'#8899b0', fontSize:10 }} axisLine={false} tickLine={false}
                    tickFormatter={v => { const [y,m]=v.split('-'); return `${['','Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][+m]} ${y.slice(2)}`; }} />
                  <YAxis tick={{ fill:'#8899b0', fontSize:10 }} axisLine={false} tickLine={false}
                    tickFormatter={v => fmtShort(v)} />
                  <Tooltip contentStyle={{ background:'#0f1623', border:'1px solid #1a2435', borderRadius:10, fontSize:11 }}
                    formatter={(v) => [fmt(v)]} />
                  <Area type="monotone" dataKey="demand" stroke="#f5a623" fill="url(#gDemand)" strokeWidth={2} name="Demand" />
                  <Area type="monotone" dataKey="received" stroke="#22c983" fill="url(#gReceived)" strokeWidth={2} name="Received" />
                  <Legend wrapperStyle={{ fontSize:11 }} />
                </AreaChart>
              </ResponsiveContainer>
            </ChartCard>

            {/* Collection Pie */}
            <ChartCard title="Collection Progress" icon={<IndianRupee size={14}/>} color="var(--green)">
              <div style={{ position:'relative' }}>
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie data={collectionPie} cx="50%" cy="50%" innerRadius={70} outerRadius={100}
                      dataKey="value" paddingAngle={3} strokeWidth={0}>
                      {collectionPie.map((e, i) => <Cell key={i} fill={e.color} />)}
                    </Pie>
                    <Tooltip contentStyle={{ background:'#0f1623', border:'1px solid #1a2435', borderRadius:10, fontSize:12 }}
                      formatter={(v) => [fmt(v)]} />
                    <Legend wrapperStyle={{ fontSize:11 }} />
                  </PieChart>
                </ResponsiveContainer>
                <div style={{
                  position:'absolute', top:'43%', left:'50%', transform:'translate(-50%,-50%)',
                  textAlign:'center', pointerEvents:'none'
                }}>
                  <div style={{ fontFamily:"'Space Mono',monospace", fontSize:22, fontWeight:700, color:'var(--green)' }}>
                    {((kpi.received / kpi.demand) * 100 || 0).toFixed(1)}%
                  </div>
                  <div style={{ fontSize:10, color:'var(--text3)' }}>Collected</div>
                </div>
              </div>
            </ChartCard>
          </div>

          {/* Charts Row 3 */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:18, marginBottom:20 }}>
            {/* BHK Distribution */}
            <ChartCard title="BHK Type Distribution" icon={<Home size={14}/>} color="var(--violet)">
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={bhkData} layout="vertical" barSize={18}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                  <XAxis type="number" tick={{ fill:'#8899b0', fontSize:10 }} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="name" tick={{ fill:'#8899b0', fontSize:11 }} axisLine={false} tickLine={false} width={110} />
                  <Tooltip contentStyle={{ background:'#0f1623', border:'1px solid #1a2435', borderRadius:10, fontSize:12 }} />
                  <Bar dataKey="count" fill="#9b6dff" name="Units" radius={[0,4,4,0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>

            {/* Monthly Bookings Count */}
            <ChartCard title="Monthly Bookings Count" icon={<BarChart3 size={14}/>} color="var(--cyan)">
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={monthlyData} barSize={20}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                  <XAxis dataKey="month" tick={{ fill:'#8899b0', fontSize:10 }} axisLine={false} tickLine={false}
                    tickFormatter={v => { const [y,m]=v.split('-'); return `${['','Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][+m]}'${y.slice(2)}`; }} />
                  <YAxis tick={{ fill:'#8899b0', fontSize:10 }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ background:'#0f1623', border:'1px solid #1a2435', borderRadius:10, fontSize:12 }} />
                  <Bar dataKey="bookings" fill="#22d3ee" name="Bookings" radius={[4,4,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>

          {/* Data Tables */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr', gap:18 }}>
            {/* Inventory Table */}
            <div style={{
              background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:'var(--radius)', overflow:'hidden'
            }}>
              <div style={{
                padding:'14px 20px', borderBottom:'1px solid var(--border)',
                display:'flex', alignItems:'center', justifyContent:'space-between'
              }}>
                <h3 style={{ fontSize:14, fontWeight:600 }}>📋 Inventory Details (INVR)</h3>
                <span style={{ fontSize:11, color:'var(--text3)' }}>{fInvr.length} records</span>
              </div>
              <div style={{ overflowX:'auto', maxHeight:420, overflowY:'auto' }}>
                <table style={{ width:'100%', borderCollapse:'collapse', fontSize:11 }}>
                  <thead>
                    <tr>
                      {['Unit','Description','Status','Tower','Floor','BHK','Super Area','Carpet Area','Net Price','Total Cost'].map(h =>
                        <th key={h} style={{
                          background:'var(--bg)', padding:'9px 14px', textAlign:'left', fontWeight:600,
                          color:'var(--text3)', textTransform:'uppercase', letterSpacing:0.5, fontSize:10,
                          whiteSpace:'nowrap', borderBottom:'1px solid var(--border)', position:'sticky', top:0, zIndex:2
                        }}>{h}</th>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {fInvr.slice(0, 200).map((r, i) => (
                      <tr key={i} style={{ borderBottom:'1px solid rgba(26,36,53,0.5)' }}
                          onMouseEnter={e => e.currentTarget.style.background='rgba(78,140,255,0.04)'}
                          onMouseLeave={e => e.currentTarget.style.background='transparent'}>
                        <td style={{ padding:'8px 14px', color:'var(--text)' }}>{r.unitNumber}</td>
                        <td style={{ padding:'8px 14px', color:'var(--text2)' }}>{r.unitDesc}</td>
                        <td style={{ padding:'8px 14px' }}>
                          <span style={{
                            padding:'2px 10px', borderRadius:12, fontSize:10, fontWeight:600,
                            background: r.status==='Booked' ? 'rgba(34,201,131,0.12)' : 'rgba(78,140,255,0.12)',
                            color: r.status==='Booked' ? 'var(--green)' : 'var(--blue)'
                          }}>{r.status}</span>
                        </td>
                        <td style={{ padding:'8px 14px', color:'var(--text2)' }}>{r.tower}</td>
                        <td style={{ padding:'8px 14px', color:'var(--text2)' }}>{r.floor}</td>
                        <td style={{ padding:'8px 14px', color:'var(--text2)' }}>{r.bhk}</td>
                        <td style={{ padding:'8px 14px', fontFamily:"'Space Mono',monospace", fontSize:10, color:'var(--text2)' }}>{r.superArea.toLocaleString()}</td>
                        <td style={{ padding:'8px 14px', fontFamily:"'Space Mono',monospace", fontSize:10, color:'var(--text2)' }}>{r.carpetArea.toLocaleString()}</td>
                        <td style={{ padding:'8px 14px', fontFamily:"'Space Mono',monospace", fontSize:10, color:'var(--amber)' }}>{r.netBasicPrice ? fmt(r.netBasicPrice) : '-'}</td>
                        <td style={{ padding:'8px 14px', fontFamily:"'Space Mono',monospace", fontSize:10, color:'var(--text2)' }}>{r.totalUnitCost ? fmt(r.totalUnitCost) : '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* PDRN Table */}
            <div style={{
              background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:'var(--radius)', overflow:'hidden'
            }}>
              <div style={{
                padding:'14px 20px', borderBottom:'1px solid var(--border)',
                display:'flex', alignItems:'center', justifyContent:'space-between'
              }}>
                <h3 style={{ fontSize:14, fontWeight:600 }}>💰 Payment & Demand Details (PDRN)</h3>
                <span style={{ fontSize:11, color:'var(--text3)' }}>{fPdrn.length} records</span>
              </div>
              <div style={{ overflowX:'auto', maxHeight:420, overflowY:'auto' }}>
                <table style={{ width:'100%', borderCollapse:'collapse', fontSize:11 }}>
                  <thead>
                    <tr>
                      {['Unit','Customer','Status','Area','BSP Net','TCV','Demand','Received','Month'].map(h =>
                        <th key={h} style={{
                          background:'var(--bg)', padding:'9px 14px', textAlign:'left', fontWeight:600,
                          color:'var(--text3)', textTransform:'uppercase', letterSpacing:0.5, fontSize:10,
                          whiteSpace:'nowrap', borderBottom:'1px solid var(--border)', position:'sticky', top:0, zIndex:2
                        }}>{h}</th>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {fPdrn.slice(0, 200).map((r, i) => (
                      <tr key={i} style={{ borderBottom:'1px solid rgba(26,36,53,0.5)' }}
                          onMouseEnter={e => e.currentTarget.style.background='rgba(78,140,255,0.04)'}
                          onMouseLeave={e => e.currentTarget.style.background='transparent'}>
                        <td style={{ padding:'8px 14px', color:'var(--text)' }}>{r.unitNo}</td>
                        <td style={{ padding:'8px 14px', color:'var(--text2)', maxWidth:180, overflow:'hidden', textOverflow:'ellipsis' }}>{r.customerName}</td>
                        <td style={{ padding:'8px 14px' }}>
                          <span style={{
                            padding:'2px 10px', borderRadius:12, fontSize:10, fontWeight:600,
                            background: r.bookingStatus==='ACTIVE' ? 'rgba(34,201,131,0.12)' : 'rgba(240,80,110,0.12)',
                            color: r.bookingStatus==='ACTIVE' ? 'var(--green)' : 'var(--rose)'
                          }}>{r.bookingStatus}</span>
                        </td>
                        <td style={{ padding:'8px 14px', fontFamily:"'Space Mono',monospace", fontSize:10, color:'var(--text2)' }}>{r.superArea.toLocaleString()}</td>
                        <td style={{ padding:'8px 14px', fontFamily:"'Space Mono',monospace", fontSize:10, color:'var(--text2)' }}>{r.netBSP ? fmt(r.netBSP) : '-'}</td>
                        <td style={{ padding:'8px 14px', fontFamily:"'Space Mono',monospace", fontSize:10, color:'var(--violet)' }}>{r.tcv ? fmt(r.tcv) : '-'}</td>
                        <td style={{ padding:'8px 14px', fontFamily:"'Space Mono',monospace", fontSize:10, color:'var(--amber)' }}>{r.totalDemand ? fmt(r.totalDemand) : '-'}</td>
                        <td style={{ padding:'8px 14px', fontFamily:"'Space Mono',monospace", fontSize:10, color:'var(--green)' }}>{r.totalReceived ? fmt(r.totalReceived) : '-'}</td>
                        <td style={{ padding:'8px 14px', color:'var(--text3)', fontSize:10 }}>{r.month}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div style={{ textAlign:'center', padding:'32px 0 20px', color:'var(--text3)', fontSize:11 }}>
            Smartworld Sky Arc — Sales Dashboard · Data loaded from Excel files in <code style={{ color:'var(--blue)' }}>/public/data/</code>
          </div>
        </div>
      </div>
    </div>
  );
}

function FilterSelect({ label, value, options, onChange }) {
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:5, flex:1, minWidth:150 }}>
      <label style={{ fontSize:10, fontWeight:600, textTransform:'uppercase', letterSpacing:0.8, color:'var(--text3)' }}>{label}</label>
      <select value={value} onChange={e => onChange(e.target.value)}
        style={{
          background:'var(--bg-input)', border:'1px solid var(--border)', color:'var(--text)',
          padding:'9px 12px', borderRadius:8, fontFamily:'inherit', fontSize:12, cursor:'pointer', outline:'none'
        }}>
        <option value="">All</option>
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );
}

function KPI({ icon, label, value, color, sub }) {
  const colors = {
    blue: { bg:'rgba(78,140,255,0.1)', border:'rgba(78,140,255,0.2)', accent:'#4e8cff', grad:'linear-gradient(135deg,#4e8cff,#2563eb)' },
    green: { bg:'rgba(34,201,131,0.1)', border:'rgba(34,201,131,0.2)', accent:'#22c983', grad:'linear-gradient(135deg,#22c983,#059669)' },
    amber: { bg:'rgba(245,166,35,0.1)', border:'rgba(245,166,35,0.2)', accent:'#f5a623', grad:'linear-gradient(135deg,#f5a623,#d97706)' },
    rose: { bg:'rgba(240,80,110,0.1)', border:'rgba(240,80,110,0.2)', accent:'#f0506e', grad:'linear-gradient(135deg,#f0506e,#e11d48)' },
    violet: { bg:'rgba(155,109,255,0.1)', border:'rgba(155,109,255,0.2)', accent:'#9b6dff', grad:'linear-gradient(135deg,#9b6dff,#7c3aed)' },
    cyan: { bg:'rgba(34,211,238,0.1)', border:'rgba(34,211,238,0.2)', accent:'#22d3ee', grad:'linear-gradient(135deg,#22d3ee,#0891b2)' },
  };
  const c = colors[color];
  return (
    <div style={{
      background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:'var(--radius)',
      padding:'18px', position:'relative', overflow:'hidden', transition:'transform 0.2s'
    }} onMouseEnter={e=>e.currentTarget.style.transform='translateY(-2px)'}
       onMouseLeave={e=>e.currentTarget.style.transform='none'}>
      <div style={{ position:'absolute', top:0, left:0, right:0, height:3, background:c.grad }} />
      <div style={{
        width:34, height:34, borderRadius:8, background:c.bg,
        display:'flex', alignItems:'center', justifyContent:'center', color:c.accent, marginBottom:10
      }}>{icon}</div>
      <div style={{ fontSize:10, color:'var(--text3)', fontWeight:600, textTransform:'uppercase', letterSpacing:0.5, marginBottom:3 }}>{label}</div>
      <div style={{ fontFamily:"'Space Mono',monospace", fontSize:20, fontWeight:700 }}>{value}</div>
      {sub && <div style={{ fontSize:10, color:'var(--text2)', marginTop:5 }}>{sub}</div>}
    </div>
  );
}

function ChartCard({ title, icon, color, children }) {
  return (
    <div style={{
      background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:'var(--radius)', padding:'18px'
    }}>
      <div style={{ fontSize:13, fontWeight:600, marginBottom:14, display:'flex', alignItems:'center', gap:8 }}>
        <span style={{ color }}>{icon}</span> {title}
      </div>
      {children}
    </div>
  );
}
