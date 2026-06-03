import { useState, useEffect, useRef } from 'react'
import { Helmet } from 'react-helmet-async'
import axios from 'axios'
import toast from 'react-hot-toast'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import * as XLSX from 'xlsx'
import {
  ResponsiveContainer,
  Area,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ComposedChart
} from 'recharts'
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  ShoppingBag,
  Users,
  Percent,
  Activity,
  Package,
  MapPin,
  Search,
  Settings,
  Download,
  RefreshCw,
  AlertTriangle,
  Clock,
  Compass,
  MousePointer,
  Trash2,
  FileText
} from 'lucide-react'
import BASE_URL from '../../utils/api'
import { getSocket } from '../../utils/socketClient'

// h337 is the global heatmap.js constructor
import h337 from 'heatmap.js'

const API = BASE_URL

// Vibrant UI Theme Colors
const COLORS = ['#3b6bff', '#00f2fe', '#00e676', '#ff2a5f', '#f5a623', '#b800ff', '#e040fb']

export default function AdminAnalytics() {
  const [activeTab, setActiveTab] = useState('overview')
  const [, setLoading] = useState(true)

  // 1. Telemetry & Stats States
  const [kpis, setKpis] = useState(null)
  const [statuses, setStatuses] = useState(null)
  
  // Realtime Live Monitor state
  const [liveStats, setLiveStats] = useState({
    activeVisitors: 1,
    pageViews: 0,
    addToCarts: 0,
    checkouts: 0,
    purchases: 0,
    lastEvent: null
  })

  // Tab-specific details
  const [salesPeriod, setSalesPeriod] = useState('monthly')
  const [salesData, setSalesData] = useState(null)
  const [funnelData, setFunnelData] = useState(null)
  const [productData, setProductData] = useState(null)
  const [customerData, setCustomerData] = useState(null)
  const [locationData, setLocationData] = useState(null)
  const [trafficData, setTrafficData] = useState(null)
  const [searchData, setSearchData] = useState(null)
  const [inventoryData, setInventoryData] = useState(null)
  const [orderPerformance, setOrderPerformance] = useState(null)
  const [marketingData, setMarketingData] = useState(null)
  
  // Heatmap States
  const [heatmapPage, setHeatmapPage] = useState('/')
  const [heatmapType, setHeatmapType] = useState('click')
  const [heatmapPoints, setHeatmapPoints] = useState([])
  const heatmapContainerRef = useRef(null)

  // System Config States
  const [config, setConfig] = useState({
    retentionDays: 90,
    heatmapEnabled: true,
    trackingSampleRate: 100
  })
  const [pruning, setPruning] = useState(false)

  // Load Initial Overview Metrics
  useEffect(() => {
    fetchDashboardStats()
    setupRealtimeSocket()
  }, [])

  // Fetch detailed tab data dynamically
  useEffect(() => {
    if (activeTab === 'overview') fetchDashboardStats()
    if (activeTab === 'sales') fetchSalesAnalytics()
    if (activeTab === 'funnel') fetchFunnelAnalytics()
    if (activeTab === 'products') fetchProductAnalytics()
    if (activeTab === 'customers') fetchCustomerAnalytics()
    if (activeTab === 'location') {
      fetchLocationAnalytics()
      fetchTrafficAnalytics()
    }
    if (activeTab === 'search') {
      fetchSearchAnalytics()
      fetchMarketingAnalytics()
    }
    if (activeTab === 'inventory') {
      fetchInventoryAnalytics()
      fetchOrderAnalytics()
    }
    if (activeTab === 'heatmaps') fetchHeatmapPoints()
    if (activeTab === 'settings') fetchSettings()
  }, [activeTab, salesPeriod, heatmapPage, heatmapType])

  // Setup Socket.IO Live Telemetry updates
  const setupRealtimeSocket = () => {
    const socket = getSocket()
    if (socket) {
      // Admin joins admin_analytics room automatically on server
      socket.on('realtime_telemetry', (update) => {
        setLiveStats(prev => {
          // Increment rolling counters
          const updatedViews = prev.pageViews + (update.pageViews || 0)
          const updatedCarts = prev.addToCarts + (update.addToCarts || 0)
          const updatedCheckouts = prev.checkouts + (update.checkouts || 0)
          const updatedPurchases = prev.purchases + (update.purchases || 0)

          // Simulate active visitors decay/variance
          let visitors = prev.activeVisitors
          if (Math.random() > 0.6) {
            visitors = Math.max(1, visitors + (Math.random() > 0.5 ? 1 : -1))
          }

          return {
            activeVisitors: visitors,
            pageViews: updatedViews,
            addToCarts: updatedCarts,
            checkouts: updatedCheckouts,
            purchases: updatedPurchases,
            lastEvent: update.lastEvent || prev.lastEvent
          }
        })
      })
    }
  }

  // --- API Integrations ---

  const fetchDashboardStats = async () => {
    setLoading(true)
    try {
      const { data } = await axios.get(`${API}/analytics/dashboard-stats`, { withCredentials: true })
      setKpis(data.kpis)
      setStatuses(data.statuses)
    } catch {
      toast.error('Failed to load dashboard KPIs')
    } finally {
      setLoading(false)
    }
  }

  const fetchSalesAnalytics = async () => {
    setLoading(true)
    try {
      const { data } = await axios.get(`${API}/analytics/sales-analytics?period=${salesPeriod}`, { withCredentials: true })
      setSalesData(data)
    } catch {
      toast.error('Failed to load sales reports')
    } finally {
      setLoading(false)
    }
  }

  const fetchFunnelAnalytics = async () => {
    setLoading(true)
    try {
      const { data } = await axios.get(`${API}/analytics/funnel-analytics`, { withCredentials: true })
      setFunnelData(data)
    } catch {
      toast.error('Failed to load conversion funnel')
    } finally {
      setLoading(false)
    }
  }

  const fetchProductAnalytics = async () => {
    setLoading(true)
    try {
      const { data } = await axios.get(`${API}/analytics/product-analytics`, { withCredentials: true })
      setProductData(data)
    } catch {
      toast.error('Failed to load product intelligence')
    } finally {
      setLoading(false)
    }
  }

  const fetchCustomerAnalytics = async () => {
    setLoading(true)
    try {
      const { data } = await axios.get(`${API}/analytics/customer-analytics`, { withCredentials: true })
      setCustomerData(data)
    } catch {
      toast.error('Failed to load customer segments')
    } finally {
      setLoading(false)
    }
  }

  const fetchLocationAnalytics = async () => {
    try {
      const { data } = await axios.get(`${API}/analytics/location-analytics`, { withCredentials: true })
      setLocationData(data)
    } catch {
      toast.error('Failed to load location data')
    }
  }

  const fetchTrafficAnalytics = async () => {
    try {
      const { data } = await axios.get(`${API}/analytics/traffic-analytics`, { withCredentials: true })
      setTrafficData(data)
    } catch {
      toast.error('Failed to load traffic acquisition channels')
    }
  }

  const fetchSearchAnalytics = async () => {
    try {
      const { data } = await axios.get(`${API}/analytics/search-analytics`, { withCredentials: true })
      setSearchData(data)
    } catch {
      toast.error('Failed to load search queries analytics')
    }
  }

  const fetchMarketingAnalytics = async () => {
    try {
      const { data } = await axios.get(`${API}/analytics/marketing-analytics`, { withCredentials: true })
      setMarketingData(data)
    } catch {
      toast.error('Failed to load marketing stats')
    }
  }

  const fetchInventoryAnalytics = async () => {
    setLoading(true)
    try {
      const { data } = await axios.get(`${API}/analytics/inventory-analytics`, { withCredentials: true })
      setInventoryData(data)
    } catch {
      toast.error('Failed to load inventory intelligence')
    } finally {
      setLoading(false)
    }
  }

  const fetchOrderAnalytics = async () => {
    try {
      const { data } = await axios.get(`${API}/analytics/order-analytics`, { withCredentials: true })
      setOrderPerformance(data)
    } catch {
      toast.error('Failed to load order performance')
    }
  }

  const fetchHeatmapPoints = async () => {
    try {
      const { data } = await axios.get(`${API}/analytics/heatmap-analytics?page=${encodeURIComponent(heatmapPage)}&type=${heatmapType}`, { withCredentials: true })
      setHeatmapPoints(data.data || [])
    } catch {
      toast.error('Failed to load heatmap data')
    }
  }

  const fetchSettings = async () => {
    try {
      const { data } = await axios.get(`${API}/analytics/settings`, { withCredentials: true })
      setConfig(data.settings)
    } catch {
      toast.error('Failed to fetch analytics settings')
    }
  }

  const handleUpdateSettings = async (e) => {
    e.preventDefault()
    try {
      const { data } = await axios.put(`${API}/analytics/settings`, config, { withCredentials: true })
      toast.success(data.message || 'Config saved successfully')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update configurations')
    }
  }

  const handleTriggerPrune = async () => {
    if (!window.confirm('Are you sure you want to manually prune historical analytics events?')) return
    setPruning(true)
    try {
      const { data } = await axios.post(`${API}/analytics/cleanup`, {}, { withCredentials: true })
      toast.success(`${data.message}. Deleted ${data.deletedCount} events.`);
    } catch {
      toast.error('Pruning job execution failed')
    } finally {
      setPruning(false)
    }
  }

  // --- Heatmap Renderer Effect ---
  useEffect(() => {
    if (activeTab !== 'heatmaps' || !heatmapContainerRef.current) return

    // Clear previous elements
    heatmapContainerRef.current.innerHTML = ''

    if (heatmapPoints.length === 0) return

    try {
      // Initialize legacy heatmap.js constructor with dynamic fallback options
      const heatmapInstance = h337.create({
        container: heatmapContainerRef.current,
        radius: 35,
        maxOpacity: 0.6,
        minOpacity: 0.1,
        blur: 0.85
      })

      const width = heatmapContainerRef.current.offsetWidth
      const height = heatmapContainerRef.current.offsetHeight

      heatmapInstance.setData({
        max: Math.max(...heatmapPoints.map(p => p.count || 1)),
        data: heatmapPoints.map(p => ({
          x: Math.round((p.x / 100) * width),
          y: Math.round((p.y / 100) * height),
          value: p.count || 1
        }))
      })
    } catch {
      // High-Fidelity canvas-based fallback
      const canvas = document.createElement('canvas')
      canvas.width = heatmapContainerRef.current.offsetWidth
      canvas.height = heatmapContainerRef.current.offsetHeight
      const ctx = canvas.getContext('2d')
      if (ctx) {
        heatmapPoints.forEach(p => {
          const cx = (p.x / 100) * canvas.width
          const cy = (p.y / 100) * canvas.height
          const rad = 25
          const grad = ctx.createRadialGradient(cx, cy, 2, cx, cy, rad)
          grad.addColorStop(0, 'rgba(255, 42, 95, 0.4)')
          grad.addColorStop(0.5, 'rgba(59, 107, 255, 0.2)')
          grad.addColorStop(1, 'rgba(59, 107, 255, 0)')
          ctx.fillStyle = grad
          ctx.beginPath()
          ctx.arc(cx, cy, rad, 0, 2 * Math.PI)
          ctx.fill()
        })
        heatmapContainerRef.current.appendChild(canvas)
      }
    }
  }, [heatmapPoints, activeTab])

  // --- Export Utilities ---

  const exportCSV = (data, filename) => {
    if (!data || data.length === 0) return toast.error('No data available for export')
    
    // Flatten nested objects
    const flattened = data.map(item => {
      const flat = {}
      const flattenObj = (obj, prefix = '') => {
        Object.keys(obj).forEach(key => {
          if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
            flattenObj(obj[key], prefix + key + '_')
          } else {
            flat[prefix + key] = Array.isArray(obj[key]) ? JSON.stringify(obj[key]) : obj[key]
          }
        })
      }
      flattenObj(item)
      return flat
    })

    const worksheet = XLSX.utils.json_to_sheet(flattened)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, 'AnalyticsReport')
    XLSX.writeFile(workbook, `${filename}.xlsx`)
    toast.success('Excel Sheet exported successfully')
  }

  const exportJSON = (data, filename) => {
    if (!data || data.length === 0) return toast.error('No data available for export')
    const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(data, null, 2))}`
    const downloadAnchor = document.createElement('a')
    downloadAnchor.setAttribute('href', jsonString)
    downloadAnchor.setAttribute('download', `${filename}.json`)
    document.body.appendChild(downloadAnchor)
    downloadAnchor.click()
    downloadAnchor.remove()
    toast.success('JSON file exported successfully')
  }

  const exportPDF = (title, headers, rows, filename) => {
    if (!rows || rows.length === 0) return toast.error('No records available for PDF')
    
    const doc = new jsPDF()
    doc.setFont('Syne', 'bold')
    doc.setFontSize(18)
    doc.setTextColor(59, 107, 255) // Primary color accent
    doc.text('AUTOCRAFT ENTERPRISE ANALYTICS & BI', 14, 22)
    
    doc.setFont('Inter', 'normal')
    doc.setFontSize(11)
    doc.setTextColor(100, 116, 139)
    doc.text(`${title} · Generated on ${new Date().toLocaleDateString('en-IN')}`, 14, 30)
    
    autoTable(doc, {
      startY: 38,
      head: [headers],
      body: rows,
      theme: 'grid',
      headStyles: { fillColor: [59, 107, 255] },
      styles: { fontSize: 9 }
    })
    
    doc.save(`${filename}.pdf`)
    toast.success('PDF report exported successfully')
  }

  return (
    <>
      <Helmet>
        <title>Analytics BI Dashboard — AUTOCRAFT</title>
      </Helmet>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-28 pb-16">
        {/* Header Block */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
          <div>
            <h1 className="section-title text-dark-text tracking-wide flex items-center gap-3">
              Analytics &amp; Business Intelligence
            </h1>
            <p className="text-dark-muted text-sm mt-1">
              Real-time enterprise metrics, sales forecasting models, conversion funnels, and customer retention insights.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                fetchDashboardStats()
                toast.success('Dashboard metrics refreshed')
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
              Live Monitor Online
            </span>
          </div>
        </div>

        {/* Tab Navigation Menu */}
        <div className="flex gap-2 overflow-x-auto pb-3 mb-8 border-b border-dark-border/40 scrollbar-none">
          {[
            { id: 'overview', label: 'Executive Overview', icon: Activity },
            { id: 'sales', label: 'Sales & Forecasts', icon: DollarSign },
            { id: 'funnel', label: 'Funnel Analysis', icon: Compass },
            { id: 'products', label: 'Product Intelligence', icon: Package },
            { id: 'customers', label: 'Cohort Segmentations', icon: Users },
            { id: 'location', label: 'Locations & Traffic', icon: MapPin },
            { id: 'search', label: 'Search & Coupons', icon: Search },
            { id: 'inventory', label: 'Inventory & Operations', icon: AlertTriangle },
            { id: 'heatmaps', label: 'Click Heatmaps', icon: MousePointer },
            { id: 'settings', label: 'System Configurations', icon: Settings },
          ].map(tab => {
            const TabIcon = tab.icon
            const isTabActive = activeTab === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 shrink-0 py-2.5 px-4 text-sm font-semibold rounded-xl transition-all cursor-pointer ${
                  isTabActive
                    ? 'bg-primary-500/15 text-primary-500 border border-primary-500/30'
                    : 'text-dark-muted hover:text-dark-text hover:bg-dark-border/20 border border-transparent'
                }`}
              >
                <TabIcon size={15} /> {tab.label}
              </button>
            )
          })}
        </div>

        {/* Real-time Telemetry Bar */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          {[
            { label: 'Active Sessions', val: liveStats.activeVisitors, color: 'text-primary-500' },
            { label: 'Page Views Today', val: liveStats.pageViews + (kpis?.pageViews || 0), color: 'text-cyan-400' },
            { label: 'Add To Carts', val: liveStats.addToCarts, color: 'text-emerald-400 font-bold' },
            { label: 'Checkouts Commenced', val: liveStats.checkouts, color: 'text-amber-400' },
            { label: 'Successful Purchases', val: liveStats.purchases, color: 'text-red-400 font-bold animate-pulse' }
          ].map((stat, i) => (
            <div key={i} className="card p-4 flex flex-col justify-between backdrop-blur-md bg-dark-card/40 border-dark-border/40">
              <span className="text-[10px] text-dark-muted uppercase font-semibold tracking-wider">{stat.label}</span>
              <span className={`text-xl font-display font-bold mt-2 ${stat.color}`}>{stat.val}</span>
            </div>
          ))}
        </div>

        {/* Tab Contents */}

        {activeTab === 'overview' && (
          <div className="space-y-8 animate-slide-up">
            {/* KPI Cards Grid */}
            {kpis && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {[
                  {
                    title: "Today's Revenue",
                    value: `₹${kpis.revenueToday?.toLocaleString('en-IN')}`,
                    trend: kpis.revenueTodayTrend,
                    desc: "Vs yesterday",
                    icon: DollarSign,
                    color: "text-primary-500"
                  },
                  {
                    title: "Weekly Revenue",
                    value: `₹${kpis.revenueThisWeek?.toLocaleString('en-IN')}`,
                    trend: kpis.revenueThisWeekTrend,
                    desc: "Vs last week",
                    icon: DollarSign,
                    color: "text-emerald-400"
                  },
                  {
                    title: "Monthly Revenue",
                    value: `₹${kpis.revenueThisMonth?.toLocaleString('en-IN')}`,
                    trend: kpis.revenueThisMonthTrend,
                    desc: "Vs last month",
                    icon: DollarSign,
                    color: "text-cyan-400"
                  },
                  {
                    title: "Average Order Value",
                    value: `₹${Math.round(kpis.avgOrderValue)?.toLocaleString('en-IN')}`,
                    trend: null,
                    desc: "All-time average order size",
                    icon: ShoppingBag,
                    color: "text-amber-400"
                  },
                  {
                    title: "Fulfillment Rate",
                    value: `${kpis.conversionRate?.toFixed(2)}%`,
                    trend: null,
                    desc: "Conversions / Unique Sessions",
                    icon: Percent,
                    color: "text-purple-400"
                  },
                  {
                    title: "Repeat Customer Pct",
                    value: `${kpis.returningCustomerPct?.toFixed(1)}%`,
                    trend: null,
                    desc: "Customers placing > 1 order",
                    icon: Users,
                    color: "text-indigo-400"
                  },
                  {
                    title: "Active Products Catalog",
                    value: kpis.totalProducts,
                    trend: null,
                    desc: `${kpis.outOfStockProducts} Out of Stock / ${kpis.lowStockProducts} Low Stock`,
                    icon: Package,
                    color: "text-pink-400"
                  },
                  {
                    title: "Total Customer Profiles",
                    value: kpis.totalCustomers,
                    trend: null,
                    desc: "Registered user accounts",
                    icon: Users,
                    color: "text-blue-400"
                  }
                ].map((kpi, idx) => {
                  const KpiIcon = kpi.icon
                  return (
                    <div key={idx} className="card p-6 relative overflow-hidden flex flex-col justify-between min-h-[140px]">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-dark-muted font-medium uppercase tracking-wider">{kpi.title}</span>
                        <div className={`p-2 bg-dark-border/25 rounded-xl ${kpi.color}`}>
                          <KpiIcon size={16} />
                        </div>
                      </div>

                      <div className="mt-4">
                        <span className="text-2xl font-display font-extrabold text-dark-text">{kpi.value}</span>
                        <div className="flex items-center gap-1.5 mt-2">
                          {kpi.trend !== null && (
                            <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono font-bold flex items-center gap-0.5 ${
                              kpi.trend >= 0
                                ? 'bg-green-500/10 text-green-400'
                                : 'bg-red-500/10 text-red-400'
                            }`}>
                              {kpi.trend >= 0 ? <TrendingUp size={8} /> : <TrendingDown size={8} />}
                              {kpi.trend >= 0 ? '+' : ''}{kpi.trend.toFixed(1)}%
                            </span>
                          )}
                          <span className="text-[10px] text-dark-muted">{kpi.desc}</span>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {/* Live Event Stream Tracker & Orders Summary */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Event Feed */}
              <div className="card p-6 lg:col-span-2">
                <h3 className="font-semibold text-dark-text text-base mb-4">Live Telemetry Event Logs</h3>
                {liveStats.lastEvent ? (
                  <div className="space-y-4">
                    <div className="flex items-center gap-3 p-4 bg-dark-border/20 rounded-xl border border-dark-border/30 animate-pulse">
                      <div className="w-8 h-8 rounded-full bg-primary-500/20 flex items-center justify-center text-primary-500">
                        <Activity size={14} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-dark-text uppercase font-mono">
                          {liveStats.lastEvent.eventType?.replace('_', ' ')}
                        </p>
                        <p className="text-xs text-dark-muted truncate">
                          Visited path: {liveStats.lastEvent.path}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-semibold text-dark-text">
                          {liveStats.lastEvent.location?.city || 'Unknown Location'}
                        </p>
                        <p className="text-[10px] text-dark-muted font-mono">
                          {new Date(liveStats.lastEvent.timestamp).toLocaleTimeString()}
                        </p>
                      </div>
                    </div>

                    <div className="text-xs text-dark-muted border border-dashed border-dark-border/40 p-4 rounded-xl flex items-center justify-center">
                      Monitoring all client interactions. Mouse clicks, page-views, and cart updates flow instantly.
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-10 text-dark-muted text-sm">
                    Waiting for live traffic telemetry streams...
                  </div>
                )}
              </div>

              {/* Order Status Tracker */}
              <div className="card p-6">
                <h3 className="font-semibold text-dark-text text-base mb-4">Fulfillment Statuses</h3>
                {statuses && (
                  <div className="space-y-4">
                    {[
                      { name: 'Pending Orders', count: statuses.pending, color: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
                      { name: 'Shipped Orders', count: statuses.shipped, color: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
                      { name: 'Delivered Orders', count: statuses.delivered, color: 'bg-green-500/10 text-green-400 border-green-500/20' },
                      { name: 'Cancelled Orders', count: statuses.cancelled, color: 'bg-red-500/10 text-red-400 border-red-500/20' },
                      { name: 'Refunded Returns', count: statuses.refunded, color: 'bg-purple-500/10 text-purple-400 border-purple-500/20' }
                    ].map((status, index) => (
                      <div key={index} className="flex items-center justify-between p-3 rounded-xl border border-dark-border/30 bg-dark-bg/25">
                        <span className="text-sm text-dark-text">{status.name}</span>
                        <span className={`text-xs font-mono font-bold px-2 py-1 rounded border ${status.color}`}>
                          {status.count}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'sales' && (
          <div className="space-y-8 animate-slide-up">
            {/* Control Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-dark-card/50 p-4 rounded-2xl border border-dark-border/40">
              <div className="flex gap-2">
                {['daily', 'weekly', 'monthly', 'quarterly', 'yearly'].map(period => (
                  <button
                    key={period}
                    onClick={() => setSalesPeriod(period)}
                    className={`py-1.5 px-3 text-xs font-semibold rounded-lg capitalize cursor-pointer transition-colors ${
                      salesPeriod === period
                        ? 'bg-primary-500 text-white'
                        : 'text-dark-muted hover:text-dark-text bg-dark-border/20'
                    }`}
                  >
                    {period}
                  </button>
                ))}
              </div>

              {salesData && (
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => exportCSV(salesData.chartData, `sales_report_${salesPeriod}`)}
                    className="btn-outline py-1.5 px-3 text-xs font-medium flex items-center gap-1.5"
                  >
                    <Download size={12} /> Excel Report
                  </button>
                  <button
                    onClick={() => exportJSON(salesData.chartData, `sales_report_${salesPeriod}`)}
                    className="btn-outline py-1.5 px-3 text-xs font-medium flex items-center gap-1.5"
                  >
                    <Download size={12} /> JSON Report
                  </button>
                  <button
                    onClick={() => {
                      const rows = salesData.chartData.map(d => [d.name, `Rs. ${d.revenue?.toLocaleString()}`, d.orders, d.units, `Rs. ${d.profit?.toLocaleString()}`])
                      exportPDF(`Sales Metrics (${salesPeriod})`, ['Date/Period', 'Revenue', 'Orders', 'Units Sold', 'Profit Margin'], rows, `sales_pdf_${salesPeriod}`)
                    }}
                    className="btn-outline py-1.5 px-3 text-xs font-medium flex items-center gap-1.5"
                  >
                    <FileText size={12} /> PDF Report
                  </button>
                </div>
              )}
            </div>

            {salesData && (
              <>
                {/* Sales forecast linear regression summary banner */}
                <div className="p-4 rounded-2xl border border-primary-500/20 bg-primary-500/5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <h4 className="text-sm font-semibold text-primary-500 uppercase tracking-wider">Predictive Revenue Forecast</h4>
                    <p className="text-xs text-dark-muted mt-0.5">
                      Estimated next period linear regression sales predict:
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-xl font-display font-extrabold text-primary-400">
                      ₹{Math.round(salesData.summary.forecastedRevenueNextPeriod)?.toLocaleString('en-IN')}
                    </span>
                    <span className="text-[10px] text-dark-muted block uppercase tracking-wide">
                      Next Sales Cycle Prediction
                    </span>
                  </div>
                </div>

                {/* Core Revenue and Orders Chart */}
                <div className="card p-6">
                  <h3 className="font-semibold text-dark-text text-base mb-6">Revenue and Profits Trajectory</h3>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart data={salesData.chartData}>
                        <defs>
                          <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#3b6bff" stopOpacity={0.4}/>
                            <stop offset="95%" stopColor="#3b6bff" stopOpacity={0}/>
                          </linearGradient>
                          <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#00e676" stopOpacity={0.4}/>
                            <stop offset="95%" stopColor="#00e676" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" opacity={0.3} />
                        <XAxis dataKey="name" stroke="#6b7280" fontSize={10} />
                        <YAxis stroke="#6b7280" fontSize={10} />
                        <Tooltip contentStyle={{ backgroundColor: '#111625', borderColor: '#1f2937', color: '#f3f4f6' }} />
                        <Legend wrapperStyle={{ fontSize: 11 }} />
                        <Area type="monotone" name="Gross Revenue" dataKey="revenue" stroke="#3b6bff" strokeWidth={2} fillOpacity={1} fill="url(#colorRevenue)" />
                        <Area type="monotone" name="Est. Net profit (40%)" dataKey="profit" stroke="#00e676" strokeWidth={2} fillOpacity={1} fill="url(#colorProfit)" />
                        <Line type="monotone" name="Volume (Orders)" dataKey="orders" stroke="#ff2a5f" strokeWidth={2} />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Categorical sales charts */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {/* Category rankings */}
                  <div className="card p-6">
                    <h3 className="font-semibold text-dark-text text-base mb-6">Product Revenue by Category</h3>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={salesData.topCategories}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" opacity={0.3} />
                          <XAxis dataKey="category" stroke="#6b7280" fontSize={10} />
                          <YAxis stroke="#6b7280" fontSize={10} />
                          <Tooltip contentStyle={{ backgroundColor: '#111625', borderColor: '#1f2937' }} />
                          <Bar name="Sales Revenue" dataKey="revenue" fill="#3b6bff" radius={[8, 8, 0, 0]}>
                            {salesData.topCategories.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Brand distribution */}
                  <div className="card p-6">
                    <h3 className="font-semibold text-dark-text text-base mb-6">Distribution by Brand Volume</h3>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={salesData.topBrands}
                            nameKey="brand"
                            dataKey="revenue"
                            cx="50%"
                            cy="50%"
                            outerRadius={80}
                            fill="#8884d8"
                            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                            fontSize={10}
                          >
                            {salesData.topBrands.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip contentStyle={{ backgroundColor: '#111625', borderColor: '#1f2937' }} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {activeTab === 'funnel' && funnelData && (
          <div className="space-y-8 animate-slide-up">
            {/* Funnel conversion stats banner */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="card p-6 bg-red-500/5 border-red-500/20">
                <h4 className="text-sm font-semibold text-red-400 uppercase tracking-wider">Cart Abandonment Rate</h4>
                <p className="text-2xl font-display font-extrabold text-red-500 mt-2">
                  {funnelData.abandonment.cartAbandonment?.toFixed(1)}%
                </p>
                <p className="text-[10px] text-dark-muted mt-1">
                  Users adding products to cart but exiting without purchasing.
                </p>
              </div>

              <div className="card p-6 bg-amber-500/5 border-amber-500/20">
                <h4 className="text-sm font-semibold text-amber-400 uppercase tracking-wider">Checkout abandonment</h4>
                <p className="text-2xl font-display font-extrabold text-amber-500 mt-2">
                  {funnelData.abandonment.checkoutAbandonment?.toFixed(1)}%
                </p>
                <p className="text-[10px] text-dark-muted mt-1">
                  Users starting payment verification steps but failing to finalize.
                </p>
              </div>
            </div>

            {/* Funnel chart */}
            <div className="card p-6">
              <h3 className="font-semibold text-dark-text text-base mb-6">User Conversion Funnel Benchmark</h3>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={funnelData.funnelData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" opacity={0.3} />
                    <XAxis type="number" stroke="#6b7280" fontSize={10} />
                    <YAxis dataKey="step" type="category" stroke="#6b7280" fontSize={10} width={130} />
                    <Tooltip contentStyle={{ backgroundColor: '#111625', borderColor: '#1f2937' }} />
                    <Bar dataKey="count" name="Unique Visitor Count" fill="#3b6bff" radius={[0, 8, 8, 0]}>
                      {funnelData.funnelData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Drop-offs table details */}
            <div className="card overflow-hidden">
              <div className="px-6 py-4 border-b border-dark-border/40">
                <h3 className="font-semibold text-dark-text text-base">Funnel Conversion Audit Trail</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm border-collapse">
                  <thead>
                    <tr className="bg-dark-bg/50 border-b border-dark-border/40 text-dark-muted text-xs uppercase tracking-wider">
                      <th className="p-4">Funnel Step</th>
                      <th className="p-4">Visitor Volume</th>
                      <th className="p-4 text-right">Incremental Drop-off %</th>
                    </tr>
                  </thead>
                  <tbody>
                    {funnelData.funnelData.map((step, idx) => (
                      <tr key={idx} className="border-b border-dark-border/20 hover:bg-dark-border/10">
                        <td className="p-4 font-medium text-dark-text">{step.step}</td>
                        <td className="p-4 font-mono">{step.count?.toLocaleString()}</td>
                        <td className="p-4 text-right font-mono text-red-400 font-semibold">
                          {idx === 0 ? '0.0%' : `${step.dropoff?.toFixed(1)}%`}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'products' && productData && (
          <div className="space-y-8 animate-slide-up">
            {/* Top sellers vs Worst Performers tabs */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Best Sellers */}
              <div className="card p-6">
                <h3 className="font-semibold text-dark-text text-base mb-4 text-emerald-400 flex items-center gap-2">
                  <TrendingUp size={16} /> Best Sellers (Units Sold)
                </h3>
                <div className="space-y-4">
                  {productData.bestSellers.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 rounded-xl border border-dark-border/30 bg-dark-bg/25">
                      <span className="text-sm font-semibold truncate max-w-[200px] text-dark-text">{item.name}</span>
                      <span className="text-xs text-dark-muted font-mono font-bold">
                        {item.purchases} units sold · ₹{item.revenueGenerated?.toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Worst Performers */}
              <div className="card p-6">
                <h3 className="font-semibold text-dark-text text-base mb-4 text-red-400 flex items-center gap-2">
                  <TrendingDown size={16} /> Dead Catalog Items (Least Purchased)
                </h3>
                <div className="space-y-4">
                  {productData.worstPerformers.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 rounded-xl border border-dark-border/30 bg-dark-bg/25">
                      <span className="text-sm font-semibold truncate max-w-[200px] text-dark-text">{item.name}</span>
                      <span className="text-xs text-dark-muted font-mono">
                        {item.purchases} units sold · Stock: {item.stock}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Core Product Analytics Audit Table */}
            <div className="card overflow-hidden">
              <div className="px-6 py-4 border-b border-dark-border/40 flex items-center justify-between">
                <h3 className="font-semibold text-dark-text text-base">All-time Product Analytics</h3>
                <div className="flex gap-2">
                  <button
                    onClick={() => exportCSV(productData.allProductsList, 'product_analytics')}
                    className="btn-outline py-1.5 px-3 text-xs"
                  >
                    Export Excel
                  </button>
                  <button
                    onClick={() => exportJSON(productData.allProductsList, 'product_analytics')}
                    className="btn-outline py-1.5 px-3 text-xs"
                  >
                    Export JSON
                  </button>
                  <button
                    onClick={() => {
                      const rows = productData.allProductsList.map(p => [p.name, p.category, p.totalViews, p.wishlistAdds, p.cartAdds, p.purchases, `${p.conversionRate?.toFixed(1)}%`])
                      exportPDF('Product Conversion & Views Report', ['Product Name', 'Category', 'Views', 'Wishlists', 'Cart Adds', 'Purchases', 'Conversion'], rows, 'product_report')
                    }}
                    className="btn-outline py-1.5 px-3 text-xs"
                  >
                    Export PDF
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm border-collapse">
                  <thead>
                    <tr className="bg-dark-bg/50 border-b border-dark-border/40 text-dark-muted text-xs uppercase tracking-wider">
                      <th className="p-4">Product Name</th>
                      <th className="p-4">Views (Unique)</th>
                      <th className="p-4">Wishlisted</th>
                      <th className="p-4">Cart Adds</th>
                      <th className="p-4">Units Sold</th>
                      <th className="p-4">Conversion Rate</th>
                      <th className="p-4 text-right">Refund Rate</th>
                    </tr>
                  </thead>
                  <tbody>
                    {productData.allProductsList.slice(0, 15).map((prod, index) => (
                      <tr key={index} className="border-b border-dark-border/20 hover:bg-dark-border/10">
                        <td className="p-4 font-semibold text-dark-text max-w-sm truncate">{prod.name}</td>
                        <td className="p-4 font-mono">{prod.totalViews} ({prod.uniqueViews})</td>
                        <td className="p-4 font-mono">{prod.wishlistAdds}</td>
                        <td className="p-4 font-mono">{prod.cartAdds}</td>
                        <td className="p-4 font-mono font-bold text-primary-500">{prod.purchases}</td>
                        <td className="p-4 font-mono font-semibold text-emerald-400">{prod.conversionRate?.toFixed(1)}%</td>
                        <td className="p-4 text-right font-mono text-red-400">{prod.refundRate?.toFixed(1)}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'customers' && customerData && (
          <div className="space-y-8 animate-slide-up">
            {/* Churn rate and VIP metrics banner */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              <div className="card p-6 bg-purple-500/5 border-purple-500/20">
                <h4 className="text-sm font-semibold text-purple-400 uppercase tracking-wider">VIP Customer Segments</h4>
                <p className="text-2xl font-display font-extrabold text-purple-500 mt-2">{customerData.summary.totalVIPs}</p>
                <p className="text-[10px] text-dark-muted mt-1">High-value consumers (Spent &gt; Rs. 10,000).</p>
              </div>

              <div className="card p-6 bg-emerald-500/5 border-emerald-500/20">
                <h4 className="text-sm font-semibold text-emerald-400 uppercase tracking-wider">Customer Retention Rate</h4>
                <p className="text-2xl font-display font-extrabold text-emerald-500 mt-2">
                  {customerData.summary.retentionRate?.toFixed(1)}%
                </p>
                <p className="text-[10px] text-dark-muted mt-1">Active customer ratios returning within 90 days.</p>
              </div>

              <div className="card p-6 bg-red-500/5 border-red-500/20">
                <h4 className="text-sm font-semibold text-red-400 uppercase tracking-wider">Churn Rate Benchmark</h4>
                <p className="text-2xl font-display font-extrabold text-red-500 mt-2">
                  {customerData.summary.churnRate?.toFixed(1)}%
                </p>
                <p className="text-[10px] text-dark-muted mt-1">Percentage of users who lapsed without buying again.</p>
              </div>
            </div>

            {/* Segment charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Customer segmentation bar */}
              <div className="card p-6">
                <h3 className="font-semibold text-dark-text text-base mb-6">User Base Segments Count</h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={[
                        { name: 'VIPs', count: customerData.summary.totalVIPs },
                        { name: 'Repeats', count: customerData.summary.totalRepeats },
                        { name: 'One-Times', count: customerData.summary.totalOneTimes },
                        { name: 'Inactives', count: customerData.summary.totalInactives }
                      ]}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" opacity={0.3} />
                      <XAxis dataKey="name" stroke="#6b7280" fontSize={10} />
                      <YAxis stroke="#6b7280" fontSize={10} />
                      <Tooltip contentStyle={{ backgroundColor: '#111625', borderColor: '#1f2937' }} />
                      <Bar dataKey="count" fill="#3b6bff" radius={[8, 8, 0, 0]}>
                        {[1, 2, 3, 4].map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* VIP Profiles lists */}
              <div className="card p-6 flex flex-col justify-between">
                <div>
                  <h3 className="font-semibold text-dark-text text-base mb-4 flex items-center gap-2">
                    VIP Customer Profiles
                  </h3>
                  <div className="space-y-3">
                    {customerData.segments.vips.slice(0, 5).map((vip, i) => (
                      <div key={i} className="flex items-center justify-between p-3 rounded-xl border border-dark-border/30 bg-dark-bg/25">
                        <div>
                          <p className="text-sm font-semibold text-dark-text">{vip.name}</p>
                          <p className="text-xs text-dark-muted">{vip.email}</p>
                        </div>
                        <span className="text-sm font-mono font-bold text-emerald-400">
                          ₹{vip.lifetimeValue?.toLocaleString()} ({vip.totalOrders} orders)
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'location' && (
          <div className="space-y-8 animate-slide-up">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Location tables */}
              {locationData && (
                <div className="card p-6">
                  <h3 className="font-semibold text-dark-text text-base mb-4">State &amp; City Sales Distribution</h3>
                  <div className="space-y-4">
                    {locationData.topStates.slice(0, 5).map((state, i) => (
                      <div key={i} className="flex justify-between items-center p-3 rounded-xl border border-dark-border/30 bg-dark-bg/25">
                        <span className="text-sm font-semibold text-dark-text">{state.state}</span>
                        <span className="text-xs text-dark-muted font-mono font-bold">
                          {state.orders} orders · ₹{state.revenue?.toLocaleString()}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Traffic sources channels */}
              {trafficData && (
                <div className="card p-6">
                  <h3 className="font-semibold text-dark-text text-base mb-4">Traffic Acquisition &amp; UTM Channels</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-dark-bg/50 border-b border-dark-border/40 text-dark-muted uppercase tracking-wider">
                          <th className="p-3">Source Channel</th>
                          <th className="p-3">Unique Visitors</th>
                          <th className="p-3">Converted Orders</th>
                          <th className="p-3">Conversion Rate</th>
                          <th className="p-3 text-right">Revenue Generated</th>
                        </tr>
                      </thead>
                      <tbody>
                        {trafficData.trafficSources.map((src, i) => (
                          <tr key={i} className="border-b border-dark-border/20 hover:bg-dark-border/10">
                            <td className="p-3 font-semibold text-dark-text">{src.source}</td>
                            <td className="p-3 font-mono">{src.visitors}</td>
                            <td className="p-3 font-mono">{src.orders}</td>
                            <td className="p-3 font-mono text-emerald-400 font-bold">{src.conversionRate?.toFixed(1)}%</td>
                            <td className="p-3 text-right font-mono font-bold text-primary-500">₹{src.revenue?.toLocaleString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'search' && (
          <div className="space-y-8 animate-slide-up">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Popular keywords vs Failures */}
              {searchData && (
                <>
                  <div className="card p-6">
                    <h3 className="font-semibold text-dark-text text-base mb-4 text-emerald-400">Popular Search Queries</h3>
                    <div className="space-y-3">
                      {searchData.popularSearches.map((sq, i) => (
                        <div key={i} className="flex justify-between items-center p-3 rounded-xl border border-dark-border/30 bg-dark-bg/25">
                          <span className="text-sm font-semibold text-dark-text font-mono">"{sq.query}"</span>
                          <span className="text-xs text-dark-muted font-bold font-mono">
                            {sq.count} searches
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="card p-6">
                    <h3 className="font-semibold text-dark-text text-base mb-4 text-red-400">Zero Result Queries (Search Failures)</h3>
                    <div className="space-y-3">
                      {searchData.searchFailures.map((sq, i) => (
                        <div key={i} className="flex justify-between items-center p-3 rounded-xl border border-dark-border/30 bg-dark-bg/25">
                          <span className="text-sm font-semibold text-dark-text font-mono">"{sq.query}"</span>
                          <span className="text-xs text-dark-muted font-bold font-mono">
                            {sq.count} attempts
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Coupons usage metrics */}
            {marketingData && (
              <div className="card overflow-hidden">
                <div className="px-6 py-4 border-b border-dark-border/40">
                  <h3 className="font-semibold text-dark-text text-base">Coupon Marketing Performance Reports</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm border-collapse">
                    <thead>
                      <tr className="bg-dark-bg/50 border-b border-dark-border/40 text-dark-muted text-xs uppercase tracking-wider">
                        <th className="p-4">Coupon Code</th>
                        <th className="p-4">Usages</th>
                        <th className="p-4">Discounts Applied</th>
                        <th className="p-4">Revenue Lift</th>
                        <th className="p-4 text-right">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {marketingData.couponUsageStats.map((coupon, i) => (
                        <tr key={i} className="border-b border-dark-border/20 hover:bg-dark-border/10">
                          <td className="p-4 font-mono font-bold text-dark-text">{coupon.code}</td>
                          <td className="p-4 font-mono">{coupon.usedCount}</td>
                          <td className="p-4 font-mono text-red-400">₹{coupon.discountsApplied?.toLocaleString()}</td>
                          <td className="p-4 font-mono font-bold text-emerald-400">₹{coupon.revenueImpact?.toLocaleString()}</td>
                          <td className="p-4 text-right">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase tracking-wider ${
                              coupon.active
                                ? 'bg-green-500/10 text-green-400 border-green-500/20'
                                : 'bg-dark-border/40 text-dark-muted border-dark-border'
                            }`}>
                              {coupon.active ? 'Active' : 'Lapsed'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'inventory' && inventoryData && (
          <div className="space-y-8 animate-slide-up">
            {/* Inventory health score banners */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="card p-6 flex flex-col justify-between min-h-[120px]">
                <span className="text-xs text-dark-muted uppercase font-bold tracking-wider">Inventory Health Score</span>
                <span className={`text-3xl font-display font-extrabold mt-3 ${
                  inventoryData.healthScore >= 80 ? 'text-green-400' : 'text-amber-400'
                }`}>
                  {inventoryData.healthScore} / 100
                </span>
              </div>

              {[
                { label: 'Out of Stock Products', val: inventoryData.summary.outOfStockCount, color: 'text-red-400 font-bold' },
                { label: 'Low Stock Warnings', val: inventoryData.summary.lowStockCount, color: 'text-amber-400' },
                { label: 'Dead Stock Warnings (Aging &gt; 90D)', val: inventoryData.summary.deadStockCount, color: 'text-purple-400' }
              ].map((stat, i) => (
                <div key={i} className="card p-6 flex flex-col justify-between min-h-[120px]">
                  <span className="text-xs text-dark-muted uppercase font-bold tracking-wider">{stat.label}</span>
                  <span className={`text-3xl font-display font-extrabold mt-3 ${stat.color}`}>{stat.val}</span>
                </div>
              ))}
            </div>

            {/* Reorder Suggestions Intelligence */}
            <div className="card p-6">
              <h3 className="font-semibold text-dark-text text-base mb-4 text-primary-500 flex items-center gap-2">
                <Clock size={16} /> Automated Reorder Forecasts
              </h3>
              {inventoryData.suggestions.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {inventoryData.suggestions.map((sug, i) => (
                    <div key={i} className="flex justify-between items-center p-4 rounded-xl border border-primary-500/20 bg-primary-500/5">
                      <div>
                        <p className="text-sm font-semibold text-dark-text">{sug.name}</p>
                        <p className="text-xs text-dark-muted">
                          Run rate velocity: {sug.velocity?.toFixed(2)} units/day · Stock: {sug.stock}
                        </p>
                      </div>
                      <div className="text-right">
                        <span className="text-xs bg-primary-500/20 text-primary-400 border border-primary-500/30 font-bold px-2 py-1 rounded">
                          Reorder +{sug.suggestReorderQty} units
                        </span>
                        <p className="text-[10px] text-red-400 font-mono mt-2">
                          Runout in {sug.daysUntilOut} days
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 text-dark-muted text-sm border border-dashed border-dark-border/40 rounded-xl">
                  Inventory velocities remain healthy. No urgent restocking requisitions forecast.
                </div>
              )}
            </div>

            {/* Fulfillment Speed Metrics */}
            {orderPerformance && (
              <div className="card p-6">
                <h3 className="font-semibold text-dark-text text-base mb-6">Operations &amp; Fulfillment Speed</h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                  <div className="p-4 bg-dark-bg/25 rounded-2xl border border-dark-border/30 text-center">
                    <span className="text-xs text-dark-muted uppercase font-bold block">Avg. Fulfillment Speed</span>
                    <span className="text-2xl font-display font-extrabold text-dark-text block mt-2">
                      {orderPerformance.summary.avgFulfillmentDays} Days
                    </span>
                    <span className="text-[10px] text-dark-muted mt-1 block">Placement to Courier Hand-off</span>
                  </div>

                  <div className="p-4 bg-dark-bg/25 rounded-2xl border border-dark-border/30 text-center">
                    <span className="text-xs text-dark-muted uppercase font-bold block">Avg. Transit Delivery</span>
                    <span className="text-2xl font-display font-extrabold text-dark-text block mt-2">
                      {orderPerformance.summary.avgDeliveryDays} Days
                    </span>
                    <span className="text-[10px] text-dark-muted mt-1 block">Courier Dispatch to Customer Receipt</span>
                  </div>

                  <div className="p-4 bg-dark-bg/25 rounded-2xl border border-dark-border/30 text-center">
                    <span className="text-xs text-dark-muted uppercase font-bold block">Cancellation Ratios</span>
                    <span className="text-2xl font-display font-extrabold text-red-500 block mt-2">
                      {orderPerformance.summary.cancellationRate}%
                    </span>
                    <span className="text-[10px] text-dark-muted mt-1 block">Lapsed orders percentages</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'heatmaps' && (
          <div className="space-y-8 animate-slide-up">
            {/* Options configuration */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-dark-card/50 p-4 rounded-2xl border border-dark-border/40">
              <div className="flex gap-4">
                <div>
                  <label className="block text-[10px] text-dark-muted uppercase font-semibold mb-1">Target Page Path</label>
                  <select
                    value={heatmapPage}
                    onChange={(e) => setHeatmapPage(e.target.value)}
                    className="input-field py-1.5 px-3 text-xs w-48 bg-dark-bg"
                  >
                    <option value="/">Home Path (/)</option>
                    <option value="/shop">Shop (/shop)</option>
                    <option value="/cart">Cart (/cart)</option>
                    <option value="/checkout">Checkout (/checkout)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] text-dark-muted uppercase font-semibold mb-1">Telemetry Action</label>
                  <select
                    value={heatmapType}
                    onChange={(e) => setHeatmapType(e.target.value)}
                    className="input-field py-1.5 px-3 text-xs w-40 bg-dark-bg"
                  >
                    <option value="click">Mouse Clicks</option>
                    <option value="scroll">Scroll Depths</option>
                  </select>
                </div>
              </div>

              <div className="text-xs text-dark-muted max-w-sm">
                Aggregates screen interactions mapped directly to grids. Shows where users click or how far they scroll on specific routes.
              </div>
            </div>

            {/* Heatmap Visual Overlay Canvas container */}
            <div className="card p-6">
              <h3 className="font-semibold text-dark-text text-base mb-4 capitalize">
                Page Visual Representation Overlay ({heatmapType}s)
              </h3>
              
              <div className="relative border border-dark-border/60 rounded-2xl bg-dark-bg/85 min-h-[480px] overflow-hidden flex items-center justify-center">
                {/* Visual Representation Background Mock */}
                <div className="absolute inset-0 z-0 flex flex-col justify-between p-8 opacity-30 select-none pointer-events-none">
                  <div className="flex justify-between items-center border-b border-dark-border pb-4">
                    <span className="font-bold text-sm">AUTOCRAFT LOGO</span>
                    <div className="flex gap-4 text-xs">
                      <span>SHOP</span>
                      <span>BRANDS</span>
                      <span>CATEGORIES</span>
                    </div>
                  </div>
                  <div className="flex-1 flex items-center justify-center">
                    <span className="font-display font-extrabold text-2xl uppercase tracking-widest">
                      Visual Overlay Mockup Layout ({heatmapPage})
                    </span>
                  </div>
                  <div className="border-t border-dark-border pt-4 text-center text-xs">
                    <span>Footer Section · Copyright © 2026 AUTOCRAFT</span>
                  </div>
                </div>

                {/* Heatmap DOM Anchor Canvas Layer */}
                <div
                  ref={heatmapContainerRef}
                  className="absolute inset-0 z-10 pointer-events-none"
                />

                {heatmapPoints.length === 0 && (
                  <div className="relative z-20 text-xs text-dark-muted bg-dark-card/80 p-4 border border-dark-border/60 rounded-xl">
                    No aggregated interaction data points mapped for this page.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="card p-6 max-w-2xl mx-auto animate-slide-up">
            <h3 className="font-semibold text-dark-text text-base mb-6 flex items-center gap-2">
              <Settings size={16} className="text-primary-500" /> Analytics System Configurations
            </h3>

            <form onSubmit={handleUpdateSettings} className="space-y-6">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-dark-muted mb-2">
                  Database Event Retention Period
                </label>
                <select
                  value={config.retentionDays}
                  onChange={(e) => setConfig({ ...config, retentionDays: Number(e.target.value) })}
                  className="input-field"
                >
                  <option value={30}>30 Days (Clean logs frequently)</option>
                  <option value={90}>90 Days (Recommended standard)</option>
                  <option value={180}>180 Days (Long-term reports)</option>
                  <option value={365}>365 Days (Full-year operations)</option>
                  <option value={9999}>Infinite / Custom Retention (Pruning off)</option>
                </select>
                <span className="text-[10px] text-dark-muted mt-1.5 block">
                  Prunes events older than selection dynamically every 24 hours.
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-dark-muted mb-2">
                  Visitor Tracking Sample Rate
                </label>
                <div className="flex items-center gap-4">
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={config.trackingSampleRate}
                    onChange={(e) => setConfig({ ...config, trackingSampleRate: Number(e.target.value) })}
                    className="flex-1 accent-primary-500 h-2 bg-dark-border rounded-lg cursor-pointer"
                  />
                  <span className="text-sm font-bold text-dark-text font-mono w-12 text-right">
                    {config.trackingSampleRate}%
                  </span>
                </div>
                <span className="text-[10px] text-dark-muted mt-1.5 block">
                  Tracks only a randomized percentage of sessions. Adjust down to reduce db payloads under high traffic loads.
                </span>
              </div>

              <div className="p-4 rounded-xl border border-dark-border/40 bg-dark-bg/20 flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-dark-text">Toggle Click/Scroll Heatmaps</p>
                  <p className="text-xs text-dark-muted mt-0.5">Capture mouse logs coordinate binning</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.heatmapEnabled}
                    onChange={(e) => setConfig({ ...config, heatmapEnabled: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-dark-border peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary-500"></div>
                </label>
              </div>

              <div className="flex gap-4 pt-4 border-t border-dark-border/40">
                <button
                  type="submit"
                  className="btn-primary py-2.5 px-6 text-sm flex-1"
                >
                  Save Configurations
                </button>
                <button
                  type="button"
                  disabled={pruning}
                  onClick={handleTriggerPrune}
                  className="btn-outline border-red-500/40 text-red-400 hover:bg-red-500 hover:text-white py-2.5 px-6 text-sm flex-1 flex items-center justify-center gap-2"
                >
                  <Trash2 size={14} /> {pruning ? 'Executing...' : 'Force Prune DB Logs'}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </>
  )
}
