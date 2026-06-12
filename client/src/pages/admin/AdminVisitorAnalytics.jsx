import { useState, useEffect } from 'react'
import { Helmet } from 'react-helmet-async'
import axios from 'axios'
import toast from 'react-hot-toast'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import * as XLSX from 'xlsx'
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from 'recharts'
import {
  Users,
  Eye,
  Monitor,
  Laptop,
  Smartphone,
  Tablet,
  Search,
  Download,
  Calendar,
  Filter,
  RefreshCw,
  Clock,
  ChevronRight,
  X,
  FileText
} from 'lucide-react'
import BASE_URL from '../../utils/api'

const API = BASE_URL
const COLORS = ['#3b6bff', '#00f2fe', '#00e676', '#ff2a5f', '#f5a623', '#b800ff']

export default function AdminVisitorAnalytics() {
  const [stats, setStats] = useState(null)
  const [visitors, setVisitors] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [limit] = useState(10)
  const [loading, setLoading] = useState(true)
  const [statsLoading, setStatsLoading] = useState(true)

  // Filter & Search states
  const [search, setSearch] = useState('')
  const [userType, setUserType] = useState('')
  const [device, setDevice] = useState('')
  const [os, setOs] = useState('')
  const [browser, setBrowser] = useState('')
  const [dateRange, setDateRange] = useState('week')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [showCustomDates, setShowCustomDates] = useState(false)

  // Journey Detail Modal
  const [selectedVisitor, setSelectedVisitor] = useState(null)
  const [showDetailModal, setShowDetailModal] = useState(false)

  const fetchStats = async () => {
    setStatsLoading(true)
    try {
      const { data } = await axios.get(`${API}/visitor-analytics/stats`, { withCredentials: true })
      setStats(data)
    } catch {
      toast.error('Failed to load visitor statistics')
    } finally {
      setStatsLoading(false)
    }
  }

  const fetchVisitorsList = async () => {
    setLoading(true)
    try {
      const params = {
        page,
        limit,
        search,
        userType,
        device,
        os,
        browser,
        dateRange,
        startDate: dateRange === 'custom' ? startDate : '',
        endDate: dateRange === 'custom' ? endDate : ''
      }
      const { data } = await axios.get(`${API}/visitor-analytics/list`, { params, withCredentials: true })
      setVisitors(data.visitors || [])
      setTotal(data.total || 0)
    } catch {
      toast.error('Failed to load visitors list')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStats()
  }, [])

  useEffect(() => {
    fetchVisitorsList()
  }, [page, userType, device, os, browser, dateRange, startDate, endDate])

  const handleSearchSubmit = (e) => {
    e.preventDefault()
    setPage(1)
    fetchVisitorsList()
  }

  const handleDateRangeChange = (val) => {
    setDateRange(val)
    if (val === 'custom') {
      setShowCustomDates(true)
    } else {
      setShowCustomDates(false)
      setPage(1)
    }
  }

  const formatDuration = (sec) => {
    if (!sec && sec !== 0) return '-'
    const m = Math.floor(sec / 60)
    const s = sec % 60
    return m > 0 ? `${m}m ${s}s` : `${s}s`
  }

  // Export Data to Excel
  const exportExcel = async () => {
    try {
      const params = {
        page: 1,
        limit: 10000,
        search,
        userType,
        device,
        os,
        browser,
        dateRange,
        startDate,
        endDate
      }
      const { data } = await axios.get(`${API}/visitor-analytics/list`, { params, withCredentials: true })
      const rows = data.visitors.map(v => ({
        'Visitor ID': v.visitorId,
        'Session ID': v.sessionId,
        'User Status': v.isRegistered ? 'Registered' : 'Guest',
        'Customer Name': v.name || 'Anonymous Guest',
        'Email Address': v.email || '-',
        'Phone Number': v.phone || '-',
        'Device': v.deviceType,
        'OS': v.operatingSystem,
        'Browser': v.browser,
        'Language': v.language,
        'Timezone': v.timezone,
        'Screen Resolution': v.screenResolution || '-',
        'Visits Count': v.visitCount,
        'Pages Visited Count': v.pagesVisited?.length || 0,
        'Session Duration (Sec)': v.totalSessionTime,
        'First Visited Time': new Date(v.firstVisit).toLocaleString('en-IN'),
        'Last Active Time': new Date(v.lastVisit).toLocaleString('en-IN')
      }))

      const worksheet = XLSX.utils.json_to_sheet(rows)
      const workbook = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Visitor Logs')
      XLSX.writeFile(workbook, `AUTOCRAFT_Visitor_Analytics_${new Date().toISOString().slice(0, 10)}.xlsx`)
      toast.success('Visitor logs exported to Excel')
    } catch {
      toast.error('Failed to export Excel report')
    }
  }

  // Export Data to CSV
  const exportCSV = async () => {
    try {
      const params = {
        page: 1,
        limit: 10000,
        search,
        userType,
        device,
        os,
        browser,
        dateRange,
        startDate,
        endDate
      }
      const { data } = await axios.get(`${API}/visitor-analytics/list`, { params, withCredentials: true })
      const rows = data.visitors.map(v => ({
        VisitorID: v.visitorId,
        SessionID: v.sessionId,
        Status: v.isRegistered ? 'Registered' : 'Guest',
        Name: v.name || 'Anonymous',
        Email: v.email || '',
        Phone: v.phone || '',
        Device: v.deviceType,
        OS: v.operatingSystem,
        Browser: v.browser,
        Visits: v.visitCount,
        Pages: v.pagesVisited?.length || 0,
        DurationSec: v.totalSessionTime,
        LastActive: new Date(v.lastVisit).toISOString()
      }))

      const worksheet = XLSX.utils.json_to_sheet(rows)
      const csv = XLSX.utils.sheet_to_csv(worksheet)
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
      const link = document.createElement('a')
      link.href = URL.createObjectURL(blob)
      link.setAttribute('download', `AUTOCRAFT_Visitor_Logs_${new Date().toISOString().slice(0, 10)}.csv`)
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      toast.success('Visitor logs exported to CSV')
    } catch {
      toast.error('Failed to export CSV report')
    }
  }

  // Export Data to PDF
  const exportPDF = async () => {
    try {
      const params = {
        page: 1,
        limit: 100,
        search,
        userType,
        device,
        os,
        browser,
        dateRange,
        startDate,
        endDate
      }
      const { data } = await axios.get(`${API}/visitor-analytics/list`, { params, withCredentials: true })
      
      const doc = new jsPDF()
      doc.setFontSize(18)
      doc.setTextColor(59, 107, 255)
      doc.text('AUTOCRAFT', 14, 18)
      doc.setFontSize(12)
      doc.setTextColor(40)
      doc.text('Visitor Analytics & Session Telemetry Log', 14, 27)
      doc.setFontSize(8)
      doc.setTextColor(120)
      doc.text(`Generated: ${new Date().toLocaleString('en-IN')} (Top 100 entries)`, 14, 34)

      autoTable(doc, {
        startY: 42,
        head: [['Visitor ID', 'User Type', 'Name/Email', 'Device', 'OS', 'Browser', 'Pages', 'Duration']],
        body: data.visitors.map(v => [
          v.visitorId.slice(0, 10) + '...',
          v.isRegistered ? 'Registered' : 'Guest',
          v.name ? `${v.name}\n(${v.email || '-'})` : 'Anonymous Guest',
          v.deviceType,
          v.operatingSystem,
          v.browser,
          v.pagesVisited?.length || 0,
          formatDuration(v.totalSessionTime)
        ]),
        headStyles: { fillColor: [59, 107, 255] },
        styles: { fontSize: 8 },
      })

      doc.save(`AUTOCRAFT-Visitor-Analytics-${new Date().toISOString().slice(0, 10)}.pdf`)
      toast.success('Visitor logs exported to PDF')
    } catch {
      toast.error('Failed to export PDF report')
    }
  }

  return (
    <>
      <Helmet><title>Visitor Analytics - AUTOCRAFT</title></Helmet>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-28 pb-16">
        {/* Header Block */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
          <div>
            <h1 className="section-title text-dark-text tracking-wide flex items-center gap-3">
              Visitor Analytics
            </h1>
            <p className="text-dark-muted text-sm mt-1">
              Analyze anonymous sessions, client devices, and trace chronological user journey conversion maps.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                fetchStats()
                fetchVisitorsList()
                toast.success('Sync completed')
              }}
              className="btn-outline py-2 px-4 text-xs font-semibold flex items-center gap-2 hover:scale-105"
            >
              <RefreshCw size={12} /> Sync Live Data
            </button>
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
            </span>
            <span className="text-xs text-dark-muted font-semibold tracking-wider uppercase font-mono">
              Live Feed Connected
            </span>
          </div>
        </div>

        {/* Dashboard KPIs */}
        {!statsLoading && stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-8">
            {[
              { label: 'Total Visits', value: stats.totalVisitors, icon: Eye, color: 'text-primary-500 bg-primary-500/10' },
              { label: 'Unique Visitors', value: stats.uniqueVisitors, icon: Users, color: 'text-cyan-400 bg-cyan-400/10' },
              { label: 'Registered', value: stats.registeredVisitors, valuePct: stats.totalVisitors > 0 ? `${Math.round((stats.registeredVisitors / stats.totalVisitors)*100)}%` : '0%', icon: Users, color: 'text-emerald-400 bg-emerald-400/10' },
              { label: 'Guest Visits', value: stats.guestVisitors, valuePct: stats.totalVisitors > 0 ? `${Math.round((stats.guestVisitors / stats.totalVisitors)*100)}%` : '0%', icon: Users, color: 'text-orange-400 bg-orange-400/10' },
              { label: 'Today\'s visits', value: stats.todayCount, icon: Clock, color: 'text-red-400 bg-red-400/10' },
              { label: 'Top Browser', value: stats.topBrowser, icon: Monitor, color: 'text-purple-400 bg-purple-400/10' }
            ].map((stat, i) => {
              const Icon = stat.icon
              return (
                <div key={i} className="card p-4 relative overflow-hidden flex flex-col justify-between min-h-[110px] bg-dark-card/60">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-dark-muted uppercase font-semibold tracking-wider">{stat.label}</span>
                    <div className={`p-1.5 rounded-lg ${stat.color}`}>
                      <Icon size={14} />
                    </div>
                  </div>
                  <div className="mt-2 flex items-baseline gap-2">
                    <span className="text-xl font-display font-extrabold text-dark-text">{stat.value}</span>
                    {stat.valuePct && <span className="text-xs text-dark-muted font-mono">{stat.valuePct}</span>}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Charts Section */}
        {!statsLoading && stats && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-10">
            {/* Area Chart: Hourly visits */}
            <div className="card p-5 lg:col-span-2 bg-dark-card/40">
              <h3 className="font-semibold text-dark-text text-sm mb-4">Visitor Traffic Streams (Hourly Today)</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={stats.hourlyData}>
                    <defs>
                      <linearGradient id="colorVisits" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b6bff" stopOpacity={0.4}/>
                        <stop offset="95%" stopColor="#3b6bff" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" opacity={0.3} />
                    <XAxis dataKey="hour" stroke="#6b7280" fontSize={9} />
                    <YAxis stroke="#6b7280" fontSize={9} />
                    <Tooltip contentStyle={{ backgroundColor: '#111625', borderColor: '#1f2937', color: '#f3f4f6' }} />
                    <Area type="monotone" name="Visits" dataKey="visitors" stroke="#3b6bff" strokeWidth={2} fillOpacity={1} fill="url(#colorVisits)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Devices Share Pie */}
            <div className="card p-5 bg-dark-card/40">
              <h3 className="font-semibold text-dark-text text-sm mb-4">Device Allocations</h3>
              <div className="h-64 flex flex-col justify-between">
                <div className="h-44">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={stats.deviceShare}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={70}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {stats.deviceShare.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ backgroundColor: '#111625', borderColor: '#1f2937', color: '#f3f4f6' }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-1 justify-center text-xs">
                  {stats.deviceShare.map((entry, index) => (
                    <div key={index} className="flex items-center gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                      <span className="text-dark-text font-medium">{entry.name}:</span>
                      <span className="text-dark-muted font-mono">{entry.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Filter and Control Toolbar */}
        <div className="card p-5 mb-6 bg-dark-card/50">
          <form onSubmit={handleSearchSubmit} className="flex flex-col gap-4">
            {/* Search Input Row */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-dark-muted" />
                <input
                  type="text"
                  placeholder="Search by ID, Name, Email, Phone, Session..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="input-field pl-10 text-sm py-2.5"
                />
              </div>
              <button type="submit" className="btn-primary text-xs py-2.5 px-6 shrink-0 flex items-center justify-center gap-2 hover:scale-100">
                Apply Search
              </button>
            </div>

            {/* Dropdown Filters Row */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 pt-2 border-t border-dark-border/40">
              {/* User Type */}
              <div className="flex flex-col">
                <label className="text-[10px] uppercase font-bold text-dark-muted tracking-wider mb-1.5">User Role</label>
                <select value={userType} onChange={(e) => { setUserType(e.target.value); setPage(1); }} className="input-field text-xs py-2">
                  <option value="">All Roles</option>
                  <option value="registered">Registered Customers</option>
                  <option value="guest">Guest Visitors</option>
                </select>
              </div>

              {/* Device */}
              <div className="flex flex-col">
                <label className="text-[10px] uppercase font-bold text-dark-muted tracking-wider mb-1.5">Device Type</label>
                <select value={device} onChange={(e) => { setDevice(e.target.value); setPage(1); }} className="input-field text-xs py-2">
                  <option value="">All Devices</option>
                  <option value="Desktop">Desktop</option>
                  <option value="Laptop">Laptop</option>
                  <option value="Mobile">Mobile</option>
                  <option value="Tablet">Tablet</option>
                </select>
              </div>

              {/* Operating System */}
              <div className="flex flex-col">
                <label className="text-[10px] uppercase font-bold text-dark-muted tracking-wider mb-1.5">Operating System</label>
                <select value={os} onChange={(e) => { setOs(e.target.value); setPage(1); }} className="input-field text-xs py-2">
                  <option value="">All OS</option>
                  <option value="Windows">Windows</option>
                  <option value="macOS">macOS</option>
                  <option value="Linux">Linux</option>
                  <option value="Android">Android</option>
                  <option value="iOS">iOS</option>
                  <option value="ChromeOS">ChromeOS</option>
                </select>
              </div>

              {/* Browser */}
              <div className="flex flex-col">
                <label className="text-[10px] uppercase font-bold text-dark-muted tracking-wider mb-1.5">Browser</label>
                <select value={browser} onChange={(e) => { setBrowser(e.target.value); setPage(1); }} className="input-field text-xs py-2">
                  <option value="">All Browsers</option>
                  <option value="Chrome">Chrome</option>
                  <option value="Firefox">Firefox</option>
                  <option value="Safari">Safari</option>
                  <option value="Edge">Edge</option>
                  <option value="Brave">Brave</option>
                  <option value="Opera">Opera</option>
                </select>
              </div>

              {/* Date Filter */}
              <div className="flex flex-col">
                <label className="text-[10px] uppercase font-bold text-dark-muted tracking-wider mb-1.5">Time Frame</label>
                <select value={dateRange} onChange={(e) => handleDateRangeChange(e.target.value)} className="input-field text-xs py-2">
                  <option value="">All Time</option>
                  <option value="today">Today</option>
                  <option value="yesterday">Yesterday</option>
                  <option value="week">Last 7 Days</option>
                  <option value="month">Last 30 Days</option>
                  <option value="custom">Custom Date Range</option>
                </select>
              </div>
            </div>

            {/* Custom Dates Inputs */}
            {showCustomDates && (
              <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-dashed border-dark-border/40">
                <Calendar size={14} className="text-primary-500" />
                <div className="flex items-center gap-2">
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="input-field text-xs py-1.5 px-3 max-w-[150px]"
                  />
                  <span className="text-xs text-dark-muted">to</span>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="input-field text-xs py-1.5 px-3 max-w-[150px]"
                  />
                </div>
              </div>
            )}
          </form>
        </div>

        {/* Realtime Exports Row */}
        <div className="flex items-center justify-between flex-wrap gap-4 mb-4 bg-dark-card/20 border border-dark-border/40 p-4 rounded-2xl">
          <p className="text-xs text-dark-muted">
            Matching results: <span className="font-bold text-dark-text">{total}</span> visitor sessions found.
          </p>

          <div className="flex items-center gap-2">
            <button onClick={exportCSV} className="btn-outline flex items-center gap-1.5 text-xs py-1.5 px-3">
              <Download size={12} /> CSV
            </button>
            <button onClick={exportExcel} className="btn-outline flex items-center gap-1.5 text-xs py-1.5 px-3">
              <Download size={12} /> Excel
            </button>
            <button onClick={exportPDF} className="btn-outline flex items-center gap-1.5 text-xs py-1.5 px-3">
              <FileText size={12} /> PDF Report
            </button>
          </div>
        </div>

        {/* Data Table */}
        <div className="card p-6 bg-dark-card/40 overflow-x-auto">
          {loading ? (
            <div className="py-20 flex justify-center items-center">
              <div className="w-10 h-10 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : visitors.length === 0 ? (
            <div className="py-20 text-center">
              <Users size={48} className="mx-auto text-dark-border mb-3" />
              <h4 className="text-dark-text font-bold">No Visitor Sessions Found</h4>
              <p className="text-dark-muted text-sm mt-1">Refine your search queries or filter attributes.</p>
            </div>
          ) : (
            <>
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-dark-border text-xs uppercase tracking-wider text-dark-muted">
                    <th className="py-3.5 px-4">Visitor ID</th>
                    <th className="py-3.5 px-4">User Type</th>
                    <th className="py-3.5 px-4">Customer Info</th>
                    <th className="py-3.5 px-4">Device Details</th>
                    <th className="py-3.5 px-4">Visits</th>
                    <th className="py-3.5 px-4">Pages Visited</th>
                    <th className="py-3.5 px-4">Duration</th>
                    <th className="py-3.5 px-4">Last Activity</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-dark-border/40 text-sm">
                  {visitors.map((v) => {
                    const isMob = v.deviceType === 'Mobile';
                    const isTab = v.deviceType === 'Tablet';
                    const isLap = v.deviceType === 'Laptop';
                    
                    return (
                      <tr key={v._id} className="hover:bg-dark-border/10 transition-colors">
                        <td className="py-3 px-4 font-mono text-xs text-primary-500">
                          {v.visitorId.slice(0, 12)}...
                        </td>
                        <td className="py-3 px-4">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                            v.isRegistered
                              ? 'bg-green-500/10 text-green-400 border border-green-500/20'
                              : 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20'
                          }`}>
                            {v.isRegistered ? 'Registered' : 'Guest'}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <p className="text-sm font-semibold text-dark-text">
                            {v.userId?.name || v.name || 'Anonymous Guest'}
                          </p>
                          <p className="text-xs text-dark-muted">
                            {v.userId?.email || v.email || '-'}
                          </p>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2 text-xs">
                            {isMob ? <Smartphone size={13} /> : isTab ? <Tablet size={13} /> : isLap ? <Laptop size={13} /> : <Monitor size={13} />}
                            <span>{v.browser} / {v.operatingSystem}</span>
                          </div>
                          {v.screenResolution && (
                            <p className="text-[10px] text-dark-muted font-mono mt-0.5">{v.screenResolution}</p>
                          )}
                        </td>
                        <td className="py-3 px-4 font-mono font-medium text-dark-text">
                          {v.visitCount}
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-mono font-medium">{v.pagesVisited?.length || 0}</span> pages
                        </td>
                        <td className="py-3 px-4 font-mono text-xs text-dark-text">
                          {formatDuration(v.totalSessionTime)}
                        </td>
                        <td className="py-3 px-4 text-xs text-dark-muted">
                          {new Date(v.lastVisit).toLocaleString('en-IN')}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => {
                              setSelectedVisitor(v)
                              setShowDetailModal(true)
                            }}
                            className="text-xs text-primary-500 hover:text-primary-400 font-semibold flex items-center gap-1 ml-auto cursor-pointer"
                          >
                            Journey <ChevronRight size={14} />
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>

              {/* Pagination Controls */}
              <div className="flex justify-between items-center mt-6 pt-4 border-t border-dark-border">
                <span className="text-xs text-dark-muted">
                  Page {page} of {Math.ceil(total / limit)}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    disabled={page === 1}
                    onClick={() => setPage(page - 1)}
                    className="btn-outline py-1 px-3 text-xs disabled:opacity-50 disabled:pointer-events-none"
                  >
                    Previous
                  </button>
                  <button
                    disabled={page >= Math.ceil(total / limit)}
                    onClick={() => setPage(page + 1)}
                    className="btn-outline py-1 px-3 text-xs disabled:opacity-50 disabled:pointer-events-none"
                  >
                    Next
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Expandable Journey Detail Modal */}
        {showDetailModal && selectedVisitor && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="card w-full max-w-2xl bg-dark-card border-dark-border shadow-2xl animate-slide-up flex flex-col max-h-[85vh]">
              {/* Modal Header */}
              <div className="flex items-center justify-between p-5 border-b border-dark-border shrink-0">
                <div>
                  <h3 className="font-display text-lg font-bold text-dark-text">
                    Customer Session Journey
                  </h3>
                  <p className="text-xs text-dark-muted font-mono mt-0.5">
                    Visitor Session ID: {selectedVisitor.sessionId}
                  </p>
                </div>
                <button
                  onClick={() => setShowDetailModal(false)}
                  className="p-1.5 text-dark-muted hover:text-dark-text hover:bg-dark-border/40 rounded-xl transition-all"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-6 overflow-y-auto space-y-6 flex-1">
                {/* Section 1: Customer Profile details */}
                <div>
                  <h4 className="text-[10px] uppercase font-bold text-primary-500 tracking-wider mb-2">Customer Profile</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-dark-border/20 p-4 rounded-xl">
                    <div>
                      <p className="text-xs text-dark-muted">Name</p>
                      <p className="text-sm font-semibold text-dark-text">{selectedVisitor.userId?.name || selectedVisitor.name || 'Anonymous Guest'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-dark-muted">User Status</p>
                      <p className="text-sm font-semibold text-dark-text">{selectedVisitor.isRegistered ? 'Registered User' : 'Unregistered Guest'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-dark-muted">Email</p>
                      <p className="text-sm font-semibold text-dark-text font-mono">{selectedVisitor.userId?.email || selectedVisitor.email || '-'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-dark-muted">Phone Number</p>
                      <p className="text-sm font-semibold text-dark-text font-mono">{selectedVisitor.userId?.phone || selectedVisitor.phone || '-'}</p>
                    </div>
                  </div>
                </div>

                {/* Section 2: Device Information */}
                <div>
                  <h4 className="text-[10px] uppercase font-bold text-primary-500 tracking-wider mb-2">Device & Environment Metadata</h4>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs bg-dark-bg/50 p-4 rounded-xl border border-dark-border/30">
                    <div>
                      <p className="text-dark-muted">Device Type</p>
                      <p className="font-semibold text-dark-text mt-0.5">{selectedVisitor.deviceType}</p>
                    </div>
                    <div>
                      <p className="text-dark-muted">Operating System</p>
                      <p className="font-semibold text-dark-text mt-0.5">{selectedVisitor.operatingSystem}</p>
                    </div>
                    <div>
                      <p className="text-dark-muted">Browser</p>
                      <p className="font-semibold text-dark-text mt-0.5">{selectedVisitor.browser}</p>
                    </div>
                    <div>
                      <p className="text-dark-muted">Resolution</p>
                      <p className="font-semibold text-dark-text mt-0.5 font-mono">{selectedVisitor.screenResolution || '-'}</p>
                    </div>
                    <div>
                      <p className="text-dark-muted">Preferred Language</p>
                      <p className="font-semibold text-dark-text mt-0.5 font-mono">{selectedVisitor.language || '-'}</p>
                    </div>
                    <div>
                      <p className="text-dark-muted">Timezone</p>
                      <p className="font-semibold text-dark-text mt-0.5 font-mono truncate">{selectedVisitor.timezone || '-'}</p>
                    </div>
                    <div>
                      <p className="text-dark-muted">Session Duration</p>
                      <p className="font-semibold text-dark-text mt-0.5 font-mono">{formatDuration(selectedVisitor.totalSessionTime)}</p>
                    </div>
                    <div>
                      <p className="text-dark-muted">Visits Count</p>
                      <p className="font-semibold text-dark-text mt-0.5 font-mono">{selectedVisitor.visitCount}</p>
                    </div>
                  </div>
                </div>

                {/* Section 3: Journey Timeline path */}
                <div>
                  <h4 className="text-[10px] uppercase font-bold text-primary-500 tracking-wider mb-3">Chronological Session Event History</h4>
                  {selectedVisitor.journey && selectedVisitor.journey.length > 0 ? (
                    <div className="relative border-l border-dark-border ml-3 pl-6 space-y-4">
                      {selectedVisitor.journey.map((step, idx) => {
                        const isLast = idx === selectedVisitor.journey.length - 1
                        
                        return (
                          <div key={idx} className="relative">
                            {/* Dot Indicator */}
                            <span className={`absolute -left-[30px] top-1.5 w-2.5 h-2.5 rounded-full border border-dark-bg ${
                              isLast ? 'bg-primary-500 shadow-[0_0_10px_rgba(59,107,255,0.8)]' : 'bg-dark-border'
                            }`} />
                            
                            <div className="flex flex-col sm:flex-row justify-between items-start gap-1">
                              <div>
                                <span className={`text-xs font-semibold px-2 py-0.5 rounded ${
                                  step.step === 'Order Success'
                                    ? 'bg-green-500/10 text-green-400'
                                    : step.step === 'Checkout' || step.step === 'Payment'
                                      ? 'bg-primary-500/10 text-primary-500'
                                      : 'bg-dark-border/40 text-dark-muted'
                                }`}>
                                  {step.step}
                                </span>
                                <p className="text-xs font-mono text-dark-muted mt-1.5 truncate max-w-sm">
                                  Path: {step.path}
                                </p>
                              </div>
                              <span className="text-[10px] text-dark-muted font-mono">
                                {new Date(step.timestamp).toLocaleTimeString('en-IN')}
                              </span>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  ) : (
                    <p className="text-xs text-dark-muted italic pl-3">No timeline records registered for this session.</p>
                  )}
                </div>
              </div>

              {/* Modal Footer */}
              <div className="p-4 border-t border-dark-border flex justify-end gap-3 shrink-0">
                <button
                  onClick={() => setShowDetailModal(false)}
                  className="btn-outline text-xs py-2 px-4"
                >
                  Close Panel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  )
}
