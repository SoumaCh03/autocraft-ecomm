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
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from 'recharts'
import {
  ShoppingBag,
  Clock,
  TrendingUp,
  Percent,
  Search,
  Download,
  Calendar,
  RefreshCw,
  Phone,
  Mail,
  MessageSquare,
  Copy,
  ChevronRight,
  X,
  FileText,
  Bookmark,
  PlusCircle,
  AlertCircle
} from 'lucide-react'
import BASE_URL from '../../utils/api'

const API = BASE_URL

export default function AdminAbandonedCheckouts() {
  const [stats, setStats] = useState(null)
  const [checkouts, setCheckouts] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [limit] = useState(10)
  const [loading, setLoading] = useState(true)
  const [statsLoading, setStatsLoading] = useState(true)

  // Filters
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [device, setDevice] = useState('')
  const [os, setOs] = useState('')
  const [browser, setBrowser] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('')
  const [dateRange, setDateRange] = useState('week')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [showCustomDates, setShowCustomDates] = useState(false)

  // Details Modal & Notes
  const [selectedCheckout, setSelectedCheckout] = useState(null)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [newNote, setNewNote] = useState('')
  const [savingNote, setSavingNote] = useState(false)

  const fetchStats = async () => {
    setStatsLoading(true)
    try {
      const { data } = await axios.get(`${API}/abandoned-checkouts/stats`, { withCredentials: true })
      setStats(data)
    } catch {
      toast.error('Failed to load abandoned checkout stats')
    } finally {
      setStatsLoading(false)
    }
  }

  const fetchCheckoutsList = async () => {
    setLoading(true)
    try {
      const params = {
        page,
        limit,
        search,
        status,
        device,
        os,
        browser,
        paymentMethod,
        dateRange,
        startDate: dateRange === 'custom' ? startDate : '',
        endDate: dateRange === 'custom' ? endDate : ''
      }
      const { data } = await axios.get(`${API}/abandoned-checkouts/list`, { params, withCredentials: true })
      setCheckouts(data.checkouts || [])
      setTotal(data.total || 0)
    } catch {
      toast.error('Failed to load abandoned checkout logs')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStats()
  }, [])

  useEffect(() => {
    fetchCheckoutsList()
  }, [page, status, device, os, browser, paymentMethod, dateRange, startDate, endDate])

  const handleSearchSubmit = (e) => {
    e.preventDefault()
    setPage(1)
    fetchCheckoutsList()
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

  const handleAddNote = async (e) => {
    e.preventDefault()
    if (!newNote.trim()) return

    setSavingNote(true)
    try {
      const { data } = await axios.post(`${API}/abandoned-checkouts/${selectedCheckout._id}/notes`, {
        content: newNote.trim()
      }, { withCredentials: true })

      // Update state for selected checkout notes
      setSelectedCheckout(prev => ({
        ...prev,
        notes: data.notes
      }))

      // Update list state
      setCheckouts(prev => prev.map(c => c._id === selectedCheckout._id ? { ...c, notes: data.notes } : c))

      setNewNote('')
      toast.success('Admin note saved')
    } catch {
      toast.error('Failed to save admin note')
    } finally {
      setSavingNote(false)
    }
  }

  const formatCurrency = (val) => `₹${Number(val || 0).toLocaleString('en-IN')}`

  const copyToClipboard = (text, type) => {
    navigator.clipboard.writeText(text)
    toast.success(`${type} copied to clipboard`)
  }

  const getWhatsAppLink = (phone, name) => {
    const cleanPhone = phone.replace(/[^0-9]/g, '')
    // Prefix 91 if it's 10 digits
    const destination = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone
    const text = `Hello ${name || 'there'}, we noticed you were looking at some premium accessories on AUTOCRAFT and started checking out. Did you have any questions or experience any issues with the checkout process? Let us know how we can help!`
    return `https://wa.me/${destination}?text=${encodeURIComponent(text)}`
  }

  // Export Exporters
  const exportExcel = async () => {
    try {
      const params = {
        page: 1,
        limit: 10000,
        search,
        status,
        device,
        os,
        browser,
        paymentMethod,
        dateRange,
        startDate,
        endDate
      }
      const { data } = await axios.get(`${API}/abandoned-checkouts/list`, { params, withCredentials: true })
      const rows = data.checkouts.map(c => ({
        'Customer Name': c.name || 'Anonymous',
        'Email Address': c.email || '-',
        'Phone Number': c.phone || '-',
        'Cart Value': c.cartValue,
        'Items Count': c.itemsCount,
        'Payment Method': c.paymentMethod,
        'Last Funnel Stage': c.lastStage,
        'Recovery Status': c.status,
        'OS': c.operatingSystem,
        'Browser': c.browser,
        'Device': c.deviceType,
        'Visitor ID': c.visitorId,
        'Session ID': c.sessionId,
        'Admin Notes Count': c.notes?.length || 0,
        'Created Time': new Date(c.createdAt).toLocaleString('en-IN'),
        'Last Activity Time': new Date(c.lastActivity).toLocaleString('en-IN')
      }))

      const worksheet = XLSX.utils.json_to_sheet(rows)
      const workbook = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Abandoned Checkouts')
      XLSX.writeFile(workbook, `AUTOCRAFT_Abandoned_Checkouts_${new Date().toISOString().slice(0, 10)}.xlsx`)
      toast.success('Excel report exported')
    } catch {
      toast.error('Failed to export Excel')
    }
  }

  const exportCSV = async () => {
    try {
      const params = {
        page: 1,
        limit: 10000,
        search,
        status,
        device,
        os,
        browser,
        paymentMethod,
        dateRange,
        startDate,
        endDate
      }
      const { data } = await axios.get(`${API}/abandoned-checkouts/list`, { params, withCredentials: true })
      const rows = data.checkouts.map(c => ({
        Name: c.name || 'Anonymous',
        Email: c.email || '',
        Phone: c.phone || '',
        CartValue: c.cartValue,
        Items: c.itemsCount,
        PaymentMethod: c.paymentMethod,
        LastStage: c.lastStage,
        Status: c.status,
        LastActivity: new Date(c.lastActivity).toISOString()
      }))

      const worksheet = XLSX.utils.json_to_sheet(rows)
      const csv = XLSX.utils.sheet_to_csv(worksheet)
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
      const link = document.createElement('a')
      link.href = URL.createObjectURL(blob)
      link.setAttribute('download', `AUTOCRAFT_Abandoned_Checkouts_${new Date().toISOString().slice(0, 10)}.csv`)
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      toast.success('CSV report exported')
    } catch {
      toast.error('Failed to export CSV')
    }
  }

  const exportPDF = async () => {
    try {
      const params = {
        page: 1,
        limit: 100,
        search,
        status,
        device,
        os,
        browser,
        paymentMethod,
        dateRange,
        startDate,
        endDate
      }
      const { data } = await axios.get(`${API}/abandoned-checkouts/list`, { params, withCredentials: true })

      const doc = new jsPDF()
      doc.setFontSize(18)
      doc.setTextColor(59, 107, 255)
      doc.text('AUTOCRAFT', 14, 18)
      doc.setFontSize(12)
      doc.setTextColor(40)
      doc.text('Abandoned Checkouts & Recovery Logs', 14, 27)
      doc.setFontSize(8)
      doc.setTextColor(120)
      doc.text(`Generated: ${new Date().toLocaleString('en-IN')} (Top 100 entries)`, 14, 34)

      autoTable(doc, {
        startY: 42,
        head: [['Customer', 'Contact', 'Cart Value', 'Items', 'Pay Method', 'Last Stage', 'Status', 'Time']],
        body: data.checkouts.map(c => [
          c.name || 'Anonymous',
          `${c.email || '-'}\n${c.phone || '-'}`,
          `Rs. ${c.cartValue.toLocaleString()}`,
          c.itemsCount,
          c.paymentMethod,
          c.lastStage,
          c.status.toUpperCase(),
          new Date(c.lastActivity).toLocaleDateString('en-IN')
        ]),
        headStyles: { fillColor: [59, 107, 255] },
        styles: { fontSize: 8 },
      })

      doc.save(`AUTOCRAFT-Abandoned-Checkouts-${new Date().toISOString().slice(0, 10)}.pdf`)
      toast.success('PDF report exported')
    } catch {
      toast.error('Failed to export PDF')
    }
  }

  return (
    <>
      <Helmet><title>Abandoned Checkouts - AUTOCRAFT</title></Helmet>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-28 pb-16">
        {/* Header Block */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
          <div>
            <h1 className="section-title text-dark-text tracking-wide flex items-center gap-3">
              Abandoned Checkouts
            </h1>
            <p className="text-dark-muted text-sm mt-1">
              Identify visitors who reached payment checkout but did not complete order placements.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                fetchStats()
                fetchCheckoutsList()
                toast.success('Recovery metrics synced')
              }}
              className="btn-outline py-2 px-4 text-xs font-semibold flex items-center gap-2 hover:scale-105"
            >
              <RefreshCw size={12} /> Sync Telemetry
            </button>
          </div>
        </div>

        {/* KPIs Cards */}
        {!statsLoading && stats && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {[
              { label: 'Total Abandoned', value: stats.totalAbandoned, desc: `${stats.totalPending} pending checkouts`, icon: AlertCircle, color: 'text-amber-400 border-amber-500/20' },
              { label: 'Recovery Rate', value: `${stats.recoveryRate.toFixed(1)}%`, desc: `${stats.totalConverted} checkouts recovered`, icon: Percent, color: 'text-green-400 border-green-500/20' },
              { label: 'Abandoned Cart Value', value: formatCurrency(stats.abandonedCartValue), desc: 'Lost sales value', icon: ShoppingBag, color: 'text-red-400 border-red-500/20' },
              { label: 'Recovered Revenue', value: formatCurrency(stats.recoveredRevenue), desc: 'Recovered sales value', icon: TrendingUp, color: 'text-primary-500 border-primary-500/20' }
            ].map((stat, i) => {
              const Icon = stat.icon
              return (
                <div key={i} className="card p-5 relative overflow-hidden bg-dark-card/60">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-[10px] text-dark-muted uppercase font-semibold tracking-wider">{stat.label}</span>
                    <Icon size={18} className={stat.color.split(' ')[0]} />
                  </div>
                  <p className="text-2xl font-bold text-dark-text font-display">{stat.value}</p>
                  <p className="text-dark-muted text-xs mt-1">{stat.desc}</p>
                </div>
              )
            })}
          </div>
        )}

        {/* Chart Analysis */}
        {!statsLoading && stats && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-10">
            {/* Hourly Abandonment Area Chart */}
            <div className="card p-5 lg:col-span-2 bg-dark-card/40">
              <h3 className="font-semibold text-dark-text text-sm mb-4">Abandonment Density (Hourly Today)</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={stats.hourlyAbandonmentData}>
                    <defs>
                      <linearGradient id="colorAbandon" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f5a623" stopOpacity={0.4}/>
                        <stop offset="95%" stopColor="#f5a623" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" opacity={0.3} />
                    <XAxis dataKey="hour" stroke="#6b7280" fontSize={9} />
                    <YAxis stroke="#6b7280" fontSize={9} />
                    <Tooltip contentStyle={{ backgroundColor: '#111625', borderColor: '#1f2937', color: '#f3f4f6' }} />
                    <Area type="monotone" name="Abandonments" dataKey="abandonments" stroke="#f5a623" strokeWidth={2} fillOpacity={1} fill="url(#colorAbandon)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Top Abandoned Products */}
            <div className="card p-5 bg-dark-card/40">
              <h3 className="font-semibold text-dark-text text-sm mb-4">Most Abandoned Products</h3>
              <div className="h-64">
                {stats.topAbandonedProducts?.length === 0 ? (
                  <p className="text-xs text-dark-muted text-center py-10">No product abandonment data</p>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={stats.topAbandonedProducts}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" opacity={0.3} />
                      <XAxis dataKey="name" stroke="#6b7280" fontSize={8} tickFormatter={(t) => t.slice(0, 10) + '...'} />
                      <YAxis stroke="#6b7280" fontSize={9} />
                      <Tooltip contentStyle={{ backgroundColor: '#111625', borderColor: '#1f2937', color: '#f3f4f6' }} />
                      <Bar dataKey="count" name="Abandoned Units" fill="#ff2a5f" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Toolbar: Filters & Searching */}
        <div className="card p-5 mb-6 bg-dark-card/50">
          <form onSubmit={handleSearchSubmit} className="flex flex-col gap-4">
            {/* Search Input Row */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-dark-muted" />
                <input
                  type="text"
                  placeholder="Search by Customer Name, Email, Phone, Product or session ID..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="input-field pl-10 text-sm py-2.5"
                />
              </div>
              <button type="submit" className="btn-primary text-xs py-2.5 px-6 shrink-0 flex items-center justify-center gap-2 hover:scale-100">
                Apply Search
              </button>
            </div>

            {/* Filters grid */}
            <div className="grid grid-cols-2 md:grid-cols-6 gap-3 pt-2 border-t border-dark-border/40">
              {/* Status */}
              <div className="flex flex-col">
                <label className="text-[10px] uppercase font-bold text-dark-muted tracking-wider mb-1.5">Status</label>
                <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} className="input-field text-xs py-2">
                  <option value="">All Status</option>
                  <option value="abandoned">Abandoned</option>
                  <option value="converted">Recovered (Converted)</option>
                  <option value="pending">Pending Checkouts</option>
                </select>
              </div>

              {/* Payment Method */}
              <div className="flex flex-col">
                <label className="text-[10px] uppercase font-bold text-dark-muted tracking-wider mb-1.5">Payment Type</label>
                <select value={paymentMethod} onChange={(e) => { setPaymentMethod(e.target.value); setPage(1); }} className="input-field text-xs py-2">
                  <option value="">All Methods</option>
                  <option value="razorpay">Razorpay (Online)</option>
                  <option value="cod">Cash on Delivery (COD)</option>
                </select>
              </div>

              {/* Device */}
              <div className="flex flex-col">
                <label className="text-[10px] uppercase font-bold text-dark-muted tracking-wider mb-1.5">Device</label>
                <select value={device} onChange={(e) => { setDevice(e.target.value); setPage(1); }} className="input-field text-xs py-2">
                  <option value="">All Devices</option>
                  <option value="Desktop">Desktop</option>
                  <option value="Laptop">Laptop</option>
                  <option value="Mobile">Mobile</option>
                  <option value="Tablet">Tablet</option>
                </select>
              </div>

              {/* OS */}
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
                </select>
              </div>

              {/* Time-range */}
              <div className="flex flex-col">
                <label className="text-[10px] uppercase font-bold text-dark-muted tracking-wider mb-1.5">Time Frame</label>
                <select value={dateRange} onChange={(e) => handleDateRangeChange(e.target.value)} className="input-field text-xs py-2">
                  <option value="">All Time</option>
                  <option value="today">Today</option>
                  <option value="yesterday">Yesterday</option>
                  <option value="week">Last 7 Days</option>
                  <option value="month">Last 30 Days</option>
                  <option value="custom">Custom Range</option>
                </select>
              </div>
            </div>

            {showCustomDates && (
              <div className="flex items-center gap-3 pt-3 border-t border-dashed border-dark-border/40">
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

        {/* Results Info & Exporters */}
        <div className="flex items-center justify-between flex-wrap gap-4 mb-4 bg-dark-card/20 border border-dark-border/40 p-4 rounded-2xl">
          <p className="text-xs text-dark-muted">
            Found <span className="font-bold text-dark-text">{total}</span> checkouts.
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
          ) : checkouts.length === 0 ? (
            <div className="py-20 text-center">
              <ShoppingBag size={48} className="mx-auto text-dark-border mb-3" />
              <h4 className="text-dark-text font-bold">No Abandoned Checkouts Found</h4>
              <p className="text-dark-muted text-sm mt-1">Refine filters or wait for cron check cycles.</p>
            </div>
          ) : (
            <>
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-dark-border text-xs uppercase tracking-wider text-dark-muted">
                    <th className="py-3.5 px-4">Customer Name</th>
                    <th className="py-3.5 px-4">Contact</th>
                    <th className="py-3.5 px-4">Cart Value</th>
                    <th className="py-3.5 px-4">Items Count</th>
                    <th className="py-3.5 px-4">Method</th>
                    <th className="py-3.5 px-4">Last Stage</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4">Last Active</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-dark-border/40 text-sm">
                  {checkouts.map((c) => (
                    <tr key={c._id} className="hover:bg-dark-border/10 transition-colors">
                      <td className="py-3 px-4 font-semibold text-dark-text">
                        {c.name || 'Anonymous Customer'}
                        {c.notes?.length > 0 && (
                          <span className="ml-2 inline-flex items-center gap-0.5 text-[10px] text-primary-400 bg-primary-500/10 px-1.5 py-0.5 rounded font-mono">
                            <Bookmark size={8} /> {c.notes.length} note(s)
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-xs font-mono text-dark-muted">
                        <p>{c.email || '-'}</p>
                        <p>{c.phone || '-'}</p>
                      </td>
                      <td className="py-3 px-4 font-semibold text-dark-text">
                        {formatCurrency(c.cartValue)}
                      </td>
                      <td className="py-3 px-4 font-mono">
                        {c.itemsCount}
                      </td>
                      <td className="py-3 px-4 capitalize text-xs">
                        {c.paymentMethod === 'cod' ? 'COD' : c.paymentMethod === 'razorpay' ? 'Razorpay' : c.paymentMethod}
                      </td>
                      <td className="py-3 px-4 font-mono text-xs text-dark-text">
                        {c.lastStage}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                          c.status === 'converted'
                            ? 'bg-green-500/10 text-green-400 border border-green-500/20'
                            : c.status === 'abandoned'
                              ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                              : 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20'
                        }`}>
                          {c.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-xs text-dark-muted">
                        {new Date(c.lastActivity).toLocaleString('en-IN')}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => {
                            setSelectedCheckout(c)
                            setShowDetailModal(true)
                          }}
                          className="text-xs text-primary-500 hover:text-primary-400 font-semibold flex items-center gap-1 ml-auto cursor-pointer"
                        >
                          Recover <ChevronRight size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
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

        {/* Details & Notes Recovery Modal */}
        {showDetailModal && selectedCheckout && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="card w-full max-w-3xl bg-dark-card border-dark-border shadow-2xl animate-slide-up flex flex-col max-h-[85vh]">
              
              {/* Header */}
              <div className="flex items-center justify-between p-5 border-b border-dark-border shrink-0">
                <div>
                  <h3 className="font-display text-lg font-bold text-dark-text">
                    Recover Abandoned Checkout
                  </h3>
                  <p className="text-xs text-dark-muted font-mono mt-0.5">
                    Session ID: {selectedCheckout.sessionId}
                  </p>
                </div>
                <button
                  onClick={() => setShowDetailModal(false)}
                  className="p-1.5 text-dark-muted hover:text-dark-text hover:bg-dark-border/40 rounded-xl transition-all"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Body */}
              <div className="p-6 overflow-y-auto space-y-6 flex-1">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Left Column: Customer details & Contact Controls */}
                  <div className="space-y-6">
                    <div>
                      <h4 className="text-[10px] uppercase font-bold text-primary-500 tracking-wider mb-2.5">Customer & Contact Information</h4>
                      <div className="bg-dark-border/20 p-4 rounded-xl space-y-3">
                        <div>
                          <p className="text-[10px] text-dark-muted uppercase font-semibold">Name</p>
                          <p className="text-sm font-semibold text-dark-text">{selectedCheckout.name || 'Anonymous Customer'}</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-dark-muted uppercase font-semibold">Email Address</p>
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-sm text-dark-text font-mono truncate">{selectedCheckout.email || '-'}</span>
                            {selectedCheckout.email && (
                              <button onClick={() => copyToClipboard(selectedCheckout.email, 'Email')} className="p-1 hover:bg-dark-border rounded text-dark-muted hover:text-dark-text" aria-label="Copy Email">
                                <Copy size={12} />
                              </button>
                            )}
                          </div>
                        </div>
                        <div>
                          <p className="text-[10px] text-dark-muted uppercase font-semibold">Phone Number</p>
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-sm text-dark-text font-mono">{selectedCheckout.phone || '-'}</span>
                            {selectedCheckout.phone && (
                              <button onClick={() => copyToClipboard(selectedCheckout.phone, 'Phone')} className="p-1 hover:bg-dark-border rounded text-dark-muted hover:text-dark-text" aria-label="Copy Phone">
                                <Copy size={12} />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Contact Actions panel */}
                    {selectedCheckout.phone || selectedCheckout.email ? (
                      <div>
                        <h4 className="text-[10px] uppercase font-bold text-primary-500 tracking-wider mb-2.5">Admin Recovery Actions</h4>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                          {selectedCheckout.phone && (
                            <>
                              <a
                                href={`tel:${selectedCheckout.phone}`}
                                className="btn-outline flex items-center justify-center gap-1.5 text-xs py-2 px-3 text-center"
                              >
                                <Phone size={12} /> Call Customer
                              </a>
                              <a
                                href={getWhatsAppLink(selectedCheckout.phone, selectedCheckout.name)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="btn-outline flex items-center justify-center gap-1.5 text-xs py-2 px-3 text-center border-green-500 text-green-400 hover:bg-green-500"
                              >
                                <MessageSquare size={12} /> WhatsApp
                              </a>
                            </>
                          )}
                          {selectedCheckout.email && (
                            <a
                              href={`mailto:${selectedCheckout.email}?subject=Your%20AUTOCRAFT%20Cart&body=Hello%20${selectedCheckout.name || 'there'},%20we%20noticed%20you%20started%20checking%20out...`}
                              className="btn-outline flex items-center justify-center gap-1.5 text-xs py-2 px-3 text-center"
                            >
                              <Mail size={12} /> Email
                            </a>
                          )}
                        </div>
                      </div>
                    ) : null}

                    {/* Funnel Timeline */}
                    <div>
                      <h4 className="text-[10px] uppercase font-bold text-primary-500 tracking-wider mb-3">Checkout Progression Timeline</h4>
                      {selectedCheckout.timeline && selectedCheckout.timeline.length > 0 ? (
                        <div className="relative border-l border-dark-border ml-3 pl-5 space-y-3">
                          {selectedCheckout.timeline.map((step, idx) => {
                            const isLast = idx === selectedCheckout.timeline.length - 1
                            return (
                              <div key={idx} className="relative">
                                <span className={`absolute -left-[25px] top-1.5 w-2 h-2 rounded-full ${
                                  isLast ? 'bg-primary-500 ring-4 ring-primary-500/20' : 'bg-dark-border'
                                }`} />
                                <div className="flex justify-between items-center text-xs">
                                  <span className="font-semibold text-dark-text capitalize">
                                    {step.stage?.replace('_', ' ')}
                                  </span>
                                  <span className="text-[10px] text-dark-muted font-mono">
                                    {new Date(step.timestamp).toLocaleTimeString('en-IN')}
                                  </span>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      ) : (
                        <p className="text-xs text-dark-muted italic">No transitions recorded.</p>
                      )}
                    </div>
                  </div>

                  {/* Right Column: Cart Contents & Note history taking */}
                  <div className="space-y-6">
                    {/* Cart Items list */}
                    <div>
                      <h4 className="text-[10px] uppercase font-bold text-primary-500 tracking-wider mb-2.5">Cart Snapshot ({selectedCheckout.itemsCount} items)</h4>
                      <div className="border border-dark-border rounded-xl p-3 bg-dark-bg/40 max-h-48 overflow-y-auto space-y-2">
                        {selectedCheckout.cartSnapshot?.map((item, idx) => (
                          <div key={idx} className="flex gap-3 text-xs items-center justify-between">
                            <div className="w-8 h-8 bg-dark-border rounded overflow-hidden shrink-0">
                              {item.image && <img src={item.image} alt={item.name} className="w-full h-full object-cover" />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-dark-text truncate">{item.name}</p>
                              {item.selectedVariant && (
                                <p className="text-[10px] text-primary-400 font-mono">Variant: {item.selectedVariant.name}</p>
                              )}
                              <p className="text-[10px] text-dark-muted">Qty: {item.qty} · {formatCurrency(item.price)}</p>
                            </div>
                            <span className="font-semibold text-dark-text shrink-0">{formatCurrency(item.qty * item.price)}</span>
                          </div>
                        ))}
                        <div className="pt-2 border-t border-dark-border flex justify-between items-center text-xs font-bold text-dark-text shrink-0">
                          <span>Subtotal Value:</span>
                          <span>{formatCurrency(selectedCheckout.cartValue)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Admin Notes logs and editor */}
                    <div>
                      <h4 className="text-[10px] uppercase font-bold text-primary-500 tracking-wider mb-2.5">Super Admin Recovery Notes</h4>
                      
                      {/* Note History */}
                      <div className="space-y-2 mb-3 max-h-36 overflow-y-auto">
                        {selectedCheckout.notes && selectedCheckout.notes.length > 0 ? (
                          selectedCheckout.notes.map((note, index) => (
                            <div key={index} className="p-2.5 rounded-lg border border-dark-border/40 bg-dark-bg/20 text-xs">
                              <p className="text-dark-text leading-relaxed">{note.content}</p>
                              <p className="text-[9px] text-dark-muted mt-1.5 text-right font-mono">
                                {new Date(note.timestamp).toLocaleString('en-IN')}
                              </p>
                            </div>
                          ))
                        ) : (
                          <p className="text-xs text-dark-muted italic">No notes logged for this customer checkout.</p>
                        )}
                      </div>

                      {/* Notes creator form */}
                      <form onSubmit={handleAddNote} className="space-y-2">
                        <textarea
                          rows="2"
                          placeholder="E.g., Customer requested callback, price concern..."
                          value={newNote}
                          onChange={(e) => setNewNote(e.target.value)}
                          className="input-field text-xs p-2 bg-dark-bg border-dark-border text-dark-text"
                        />
                        <button
                          type="submit"
                          disabled={savingNote || !newNote.trim()}
                          className="btn-outline text-xs py-1.5 w-full flex items-center justify-center gap-1.5"
                        >
                          <PlusCircle size={12} /> Add Follow-up Note
                        </button>
                      </form>
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="p-4 border-t border-dark-border flex justify-end gap-3 shrink-0">
                <button
                  onClick={() => setShowDetailModal(false)}
                  className="btn-outline text-xs py-2 px-4"
                >
                  Close panel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  )
}
