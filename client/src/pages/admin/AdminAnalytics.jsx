import { useState, useEffect, useRef } from 'react'
import { Helmet } from 'react-helmet-async'
import axios from 'axios'
import toast from 'react-hot-toast'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import * as XLSX from 'xlsx'
import { useSearchParams } from 'react-router-dom'
import {
  ResponsiveContainer,
  AreaChart,
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
  FileText,
  Eye,
  Monitor,
  Smartphone,
  Tablet,
  Laptop,
  Calendar,
  ChevronRight,
  X,
  Phone,
  Mail,
  MessageSquare,
  Copy,
  Bookmark,
  AlertCircle,
  PlusCircle
} from 'lucide-react'
import BASE_URL from '../../utils/api'
import { getSocket } from '../../utils/socketClient'

// h337 is the global heatmap.js constructor
import h337 from 'heatmap.js'

const API = BASE_URL

// Vibrant UI Theme Colors
const COLORS = ['#3b6bff', '#00f2fe', '#00e676', '#ff2a5f', '#f5a623', '#b800ff', '#e040fb']

export default function AdminAnalytics() {
  const [searchParams, setSearchParams] = useSearchParams()
  const tabParam = searchParams.get('tab')
  const [activeTab, setActiveTab] = useState(tabParam || 'overview')

  useEffect(() => {
    if (tabParam && tabParam !== activeTab) {
      setActiveTab(tabParam)
    }
  }, [tabParam])

  const handleTabChange = (tabId) => {
    setActiveTab(tabId)
    setSearchParams({ tab: tabId })
  }

  const [, setLoading] = useState(true)

  // --- Visitor Analytics States ---
  const [visitorStats, setVisitorStats] = useState(null)
  const [visitors, setVisitors] = useState([])
  const [visitorTotal, setVisitorTotal] = useState(0)
  const [visitorPage, setVisitorPage] = useState(1)
  const [visitorLimit] = useState(10)
  const [visitorLoading, setVisitorLoading] = useState(true)
  const [visitorStatsLoading, setVisitorStatsLoading] = useState(true)

  const [visitorSearch, setVisitorSearch] = useState('')
  const [visitorUserType, setVisitorUserType] = useState('')
  const [visitorDevice, setVisitorDevice] = useState('')
  const [visitorOs, setVisitorOs] = useState('')
  const [visitorBrowser, setVisitorBrowser] = useState('')
  const [visitorDateRange, setVisitorDateRange] = useState('week')
  const [visitorStartDate, setVisitorStartDate] = useState('')
  const [visitorEndDate, setVisitorEndDate] = useState('')
  const [visitorShowCustomDates, setVisitorShowCustomDates] = useState(false)

  const [selectedVisitor, setSelectedVisitor] = useState(null)
  const [showVisitorDetailModal, setShowVisitorDetailModal] = useState(false)

  // --- Abandoned Checkout States ---
  const [abandonedStats, setAbandonedStats] = useState(null)
  const [abandonedCheckouts, setAbandonedCheckouts] = useState([])
  const [abandonedTotal, setAbandonedTotal] = useState(0)
  const [abandonedPage, setAbandonedPage] = useState(1)
  const [abandonedLimit] = useState(10)
  const [abandonedLoading, setAbandonedLoading] = useState(true)
  const [abandonedStatsLoading, setAbandonedStatsLoading] = useState(true)

  const [abandonedSearch, setAbandonedSearch] = useState('')
  const [abandonedStatus, setAbandonedStatus] = useState('')
  const [abandonedShowCustomDates, setAbandonedShowCustomDates] = useState(false)
  const [abandonedStartDate, setAbandonedStartDate] = useState('')
  const [abandonedEndDate, setAbandonedEndDate] = useState('')
  const [abandonedDateRange, setAbandonedDateRange] = useState('week')
  const [abandonedPaymentMethod, setAbandonedPaymentMethod] = useState('')
  const [abandonedBrowser, setAbandonedBrowser] = useState('')
  const [abandonedOs, setAbandonedOs] = useState('')
  const [abandonedDevice, setAbandonedDevice] = useState('')

  const [selectedCheckout, setSelectedCheckout] = useState(null)
  const [showCheckoutDetailModal, setShowCheckoutDetailModal] = useState(false)
  const [newNote, setNewNote] = useState('')
  const [savingNote, setSavingNote] = useState(false)

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
    if (activeTab === 'visitors') {
      fetchVisitorStats()
      fetchVisitorsList()
    }
    if (activeTab === 'abandoned') {
      fetchAbandonedStats()
      fetchAbandonedCheckoutsList()
    }
  }, [
    activeTab, salesPeriod, heatmapPage, heatmapType,
    visitorPage, visitorUserType, visitorDevice, visitorOs, visitorBrowser, visitorDateRange, visitorStartDate, visitorEndDate,
    abandonedPage, abandonedStatus, abandonedDevice, abandonedOs, abandonedBrowser, abandonedPaymentMethod, abandonedDateRange, abandonedStartDate, abandonedEndDate
  ])

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

  // --- Visitor & Abandoned Checkout API / Formatting / Export Helpers ---
  const formatDuration = (sec) => {
    if (!sec && sec !== 0) return '-'
    const m = Math.floor(sec / 60)
    const s = sec % 60
    return m > 0 ? `${m}m ${s}s` : `${s}s`
  }

  const formatCurrency = (val) => `₹${Number(val || 0).toLocaleString('en-IN')}`

  const copyToClipboard = (text, type) => {
    navigator.clipboard.writeText(text)
    toast.success(`${type} copied to clipboard`)
  }

  const getWhatsAppLink = (phone, name) => {
    const cleanPhone = phone.replace(/[^0-9]/g, '')
    const destination = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone
    const text = `Hello ${name || 'there'}, we noticed you were looking at some premium accessories on AUTOCRAFT and started checking out. Did you have any questions or experience any issues with the checkout process? Let us know how we can help!`
    return `https://wa.me/${destination}?text=${encodeURIComponent(text)}`
  }

  const fetchVisitorStats = async () => {
    setVisitorStatsLoading(true)
    try {
      const { data } = await axios.get(`${API}/visitor-analytics/stats`, { withCredentials: true })
      setVisitorStats(data)
    } catch {
      toast.error('Failed to load visitor statistics')
    } finally {
      setVisitorStatsLoading(false)
    }
  }

  const fetchVisitorsList = async () => {
    setVisitorLoading(true)
    try {
      const params = {
        page: visitorPage,
        limit: visitorLimit,
        search: visitorSearch,
        userType: visitorUserType,
        device: visitorDevice,
        os: visitorOs,
        browser: visitorBrowser,
        dateRange: visitorDateRange,
        startDate: visitorDateRange === 'custom' ? visitorStartDate : '',
        endDate: visitorDateRange === 'custom' ? visitorEndDate : ''
      }
      const { data } = await axios.get(`${API}/visitor-analytics/list`, { params, withCredentials: true })
      setVisitors(data.visitors || [])
      setVisitorTotal(data.total || 0)
    } catch {
      toast.error('Failed to load visitors list')
    } finally {
      setVisitorLoading(false)
    }
  }

  const fetchAbandonedStats = async () => {
    setAbandonedStatsLoading(true)
    try {
      const { data } = await axios.get(`${API}/abandoned-checkouts/stats`, { withCredentials: true })
      setAbandonedStats(data)
    } catch {
      toast.error('Failed to load abandoned checkout stats')
    } finally {
      setAbandonedStatsLoading(false)
    }
  }

  const fetchAbandonedCheckoutsList = async () => {
    setAbandonedLoading(true)
    try {
      const params = {
        page: abandonedPage,
        limit: abandonedLimit,
        search: abandonedSearch,
        status: abandonedStatus,
        device: abandonedDevice,
        os: abandonedOs,
        browser: abandonedBrowser,
        paymentMethod: abandonedPaymentMethod,
        dateRange: abandonedDateRange,
        startDate: abandonedDateRange === 'custom' ? abandonedStartDate : '',
        endDate: abandonedDateRange === 'custom' ? abandonedEndDate : ''
      }
      const { data } = await axios.get(`${API}/abandoned-checkouts/list`, { params, withCredentials: true })
      setAbandonedCheckouts(data.checkouts || [])
      setAbandonedTotal(data.total || 0)
    } catch {
      toast.error('Failed to load abandoned checkout logs')
    } finally {
      setAbandonedLoading(false)
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

      setSelectedCheckout(prev => ({
        ...prev,
        notes: data.notes
      }))

      setAbandonedCheckouts(prev => prev.map(c => c._id === selectedCheckout._id ? { ...c, notes: data.notes } : c))
      setNewNote('')
      toast.success('Admin note saved')
    } catch {
      toast.error('Failed to save admin note')
    } finally {
      setSavingNote(false)
    }
  }

  const handleVisitorSearchSubmit = (e) => {
    e.preventDefault()
    setVisitorPage(1)
    fetchVisitorsList()
  }

  const handleAbandonedSearchSubmit = (e) => {
    e.preventDefault()
    setAbandonedPage(1)
    fetchAbandonedCheckoutsList()
  }

  const handleVisitorDateRangeChange = (val) => {
    setVisitorDateRange(val)
    if (val === 'custom') {
      setVisitorShowCustomDates(true)
    } else {
      setVisitorShowCustomDates(false)
      setVisitorPage(1)
    }
  }

  const handleAbandonedDateRangeChange = (val) => {
    setAbandonedDateRange(val)
    if (val === 'custom') {
      setAbandonedShowCustomDates(true)
    } else {
      setAbandonedShowCustomDates(false)
      setAbandonedPage(1)
    }
  }

  const exportVisitorExcel = async () => {
    try {
      const params = {
        page: 1,
        limit: 10000,
        search: visitorSearch,
        userType: visitorUserType,
        device: visitorDevice,
        os: visitorOs,
        browser: visitorBrowser,
        dateRange: visitorDateRange,
        startDate: visitorStartDate,
        endDate: visitorEndDate
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

  const exportVisitorCSV = async () => {
    try {
      const params = {
        page: 1,
        limit: 10000,
        search: visitorSearch,
        userType: visitorUserType,
        device: visitorDevice,
        os: visitorOs,
        browser: visitorBrowser,
        dateRange: visitorDateRange,
        startDate: visitorStartDate,
        endDate: visitorEndDate
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

  const exportVisitorPDF = async () => {
    try {
      const params = {
        page: 1,
        limit: 100,
        search: visitorSearch,
        userType: visitorUserType,
        device: visitorDevice,
        os: visitorOs,
        browser: visitorBrowser,
        dateRange: visitorDateRange,
        startDate: visitorStartDate,
        endDate: visitorEndDate
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

  const exportAbandonedExcel = async () => {
    try {
      const params = {
        page: 1,
        limit: 10000,
        search: abandonedSearch,
        status: abandonedStatus,
        device: abandonedDevice,
        os: abandonedOs,
        browser: abandonedBrowser,
        paymentMethod: abandonedPaymentMethod,
        dateRange: abandonedDateRange,
        startDate: abandonedStartDate,
        endDate: abandonedEndDate
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

  const exportAbandonedCSV = async () => {
    try {
      const params = {
        page: 1,
        limit: 10000,
        search: abandonedSearch,
        status: abandonedStatus,
        device: abandonedDevice,
        os: abandonedOs,
        browser: abandonedBrowser,
        paymentMethod: abandonedPaymentMethod,
        dateRange: abandonedDateRange,
        startDate: abandonedStartDate,
        endDate: abandonedEndDate
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

  const exportAbandonedPDF = async () => {
    try {
      const params = {
        page: 1,
        limit: 100,
        search: abandonedSearch,
        status: abandonedStatus,
        device: abandonedDevice,
        os: abandonedOs,
        browser: abandonedBrowser,
        paymentMethod: abandonedPaymentMethod,
        dateRange: abandonedDateRange,
        startDate: abandonedStartDate,
        endDate: abandonedEndDate
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
            { id: 'visitors', label: 'Visitor Analytics', icon: Users },
            { id: 'abandoned', label: 'Abandoned Checkouts', icon: ShoppingBag },
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
                onClick={() => handleTabChange(tab.id)}
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

        {activeTab === 'visitors' && (
          <div className="space-y-8 animate-slide-up">
            {/* Dashboard KPIs */}
            {!visitorStatsLoading && visitorStats && (
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {[
                  { label: 'Total Visits', value: visitorStats.totalVisitors, icon: Eye, color: 'text-primary-500 bg-primary-500/10' },
                  { label: 'Unique Visitors', value: visitorStats.uniqueVisitors, icon: Users, color: 'text-cyan-400 bg-cyan-400/10' },
                  { label: 'Registered', value: visitorStats.registeredVisitors, valuePct: visitorStats.totalVisitors > 0 ? `${Math.round((visitorStats.registeredVisitors / visitorStats.totalVisitors)*100)}%` : '0%', icon: Users, color: 'text-emerald-400 bg-emerald-400/10' },
                  { label: 'Guest Visits', value: visitorStats.guestVisitors, valuePct: visitorStats.totalVisitors > 0 ? `${Math.round((visitorStats.guestVisitors / visitorStats.totalVisitors)*100)}%` : '0%', icon: Users, color: 'text-orange-400 bg-orange-400/10' },
                  { label: 'Today\'s visits', value: visitorStats.todayCount, icon: Clock, color: 'text-red-400 bg-red-400/10' },
                  { label: 'Top Browser', value: visitorStats.topBrowser, icon: Monitor, color: 'text-purple-400 bg-purple-400/10' }
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
            {!visitorStatsLoading && visitorStats && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Area Chart: Hourly visits */}
                <div className="card p-5 lg:col-span-2 bg-dark-card/40">
                  <h3 className="font-semibold text-dark-text text-sm mb-4">Visitor Traffic Streams (Hourly Today)</h3>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={visitorStats.hourlyData}>
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
                            data={visitorStats.deviceShare}
                            cx="50%"
                            cy="50%"
                            innerRadius={50}
                            outerRadius={70}
                            paddingAngle={3}
                            dataKey="value"
                          >
                            {visitorStats.deviceShare.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip contentStyle={{ backgroundColor: '#111625', borderColor: '#1f2937', color: '#f3f4f6' }} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 justify-center text-xs">
                      {visitorStats.deviceShare.map((entry, index) => (
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
            <div className="card p-5 bg-dark-card/50">
              <form onSubmit={handleVisitorSearchSubmit} className="flex flex-col gap-4">
                {/* Search Input Row */}
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="relative flex-1">
                    <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-dark-muted" />
                    <input
                      type="text"
                      placeholder="Search by ID, Name, Email, Phone, Session..."
                      value={visitorSearch}
                      onChange={(e) => setVisitorSearch(e.target.value)}
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
                    <select value={visitorUserType} onChange={(e) => { setVisitorUserType(e.target.value); setVisitorPage(1); }} className="input-field text-xs py-2">
                      <option value="">All Roles</option>
                      <option value="registered">Registered Customers</option>
                      <option value="guest">Guest Visitors</option>
                    </select>
                  </div>

                  {/* Device */}
                  <div className="flex flex-col">
                    <label className="text-[10px] uppercase font-bold text-dark-muted tracking-wider mb-1.5">Device Type</label>
                    <select value={visitorDevice} onChange={(e) => { setVisitorDevice(e.target.value); setVisitorPage(1); }} className="input-field text-xs py-2">
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
                    <select value={visitorOs} onChange={(e) => { setVisitorOs(e.target.value); setVisitorPage(1); }} className="input-field text-xs py-2">
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
                    <select value={visitorBrowser} onChange={(e) => { setVisitorBrowser(e.target.value); setVisitorPage(1); }} className="input-field text-xs py-2">
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
                    <select value={visitorDateRange} onChange={(e) => handleVisitorDateRangeChange(e.target.value)} className="input-field text-xs py-2">
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
                {visitorShowCustomDates && (
                  <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-dashed border-dark-border/40">
                    <Calendar size={14} className="text-primary-500" />
                    <div className="flex items-center gap-2">
                      <input
                        type="date"
                        value={visitorStartDate}
                        onChange={(e) => setVisitorStartDate(e.target.value)}
                        className="input-field text-xs py-1.5 px-3 max-w-[150px]"
                      />
                      <span className="text-xs text-dark-muted">to</span>
                      <input
                        type="date"
                        value={visitorEndDate}
                        onChange={(e) => setVisitorEndDate(e.target.value)}
                        className="input-field text-xs py-1.5 px-3 max-w-[150px]"
                      />
                    </div>
                  </div>
                )}
              </form>
            </div>

            {/* Realtime Exports Row */}
            <div className="flex items-center justify-between flex-wrap gap-4 bg-dark-card/20 border border-dark-border/40 p-4 rounded-2xl">
              <p className="text-xs text-dark-muted">
                Matching results: <span className="font-bold text-dark-text">{visitorTotal}</span> visitor sessions found.
              </p>

              <div className="flex items-center gap-2">
                <button onClick={exportVisitorCSV} className="btn-outline flex items-center gap-1.5 text-xs py-1.5 px-3">
                  <Download size={12} /> CSV
                </button>
                <button onClick={exportVisitorExcel} className="btn-outline flex items-center gap-1.5 text-xs py-1.5 px-3">
                  <Download size={12} /> Excel
                </button>
                <button onClick={exportVisitorPDF} className="btn-outline flex items-center gap-1.5 text-xs py-1.5 px-3">
                  <FileText size={12} /> PDF Report
                </button>
              </div>
            </div>

            {/* Data Table */}
            <div className="card p-6 bg-dark-card/40 overflow-x-auto">
              {visitorLoading ? (
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
                                  setShowVisitorDetailModal(true)
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
                      Page {visitorPage} of {Math.ceil(visitorTotal / visitorLimit)}
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        disabled={visitorPage === 1}
                        onClick={() => setVisitorPage(visitorPage - 1)}
                        className="btn-outline py-1 px-3 text-xs disabled:opacity-50 disabled:pointer-events-none"
                      >
                        Previous
                      </button>
                      <button
                        disabled={visitorPage >= Math.ceil(visitorTotal / visitorLimit)}
                        onClick={() => setVisitorPage(visitorPage + 1)}
                        className="btn-outline py-1 px-3 text-xs disabled:opacity-50 disabled:pointer-events-none"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {activeTab === 'abandoned' && (
          <div className="space-y-8 animate-slide-up">
            {/* KPIs Cards */}
            {!abandonedStatsLoading && abandonedStats && (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { label: 'Total Abandoned', value: abandonedStats.totalAbandoned, desc: `${abandonedStats.totalPending} pending checkouts`, icon: AlertCircle, color: 'text-amber-400 border-amber-500/20' },
                  { label: 'Recovery Rate', value: `${abandonedStats.recoveryRate.toFixed(1)}%`, desc: `${abandonedStats.totalConverted} checkouts recovered`, icon: Percent, color: 'text-green-400 border-green-500/20' },
                  { label: 'Abandoned Cart Value', value: formatCurrency(abandonedStats.abandonedCartValue), desc: 'Lost sales value', icon: ShoppingBag, color: 'text-red-400 border-red-500/20' },
                  { label: 'Recovered Revenue', value: formatCurrency(abandonedStats.recoveredRevenue), desc: 'Recovered sales value', icon: TrendingUp, color: 'text-primary-500 border-primary-500/20' }
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
            {!abandonedStatsLoading && abandonedStats && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Hourly Abandonment Area Chart */}
                <div className="card p-5 lg:col-span-2 bg-dark-card/40">
                  <h3 className="font-semibold text-dark-text text-sm mb-4">Abandonment Density (Hourly Today)</h3>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={abandonedStats.hourlyAbandonmentData}>
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
                    {abandonedStats.topAbandonedProducts?.length === 0 ? (
                      <p className="text-xs text-dark-muted text-center py-10">No product abandonment data</p>
                    ) : (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={abandonedStats.topAbandonedProducts}>
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
            <div className="card p-5 bg-dark-card/50">
              <form onSubmit={handleAbandonedSearchSubmit} className="flex flex-col gap-4">
                {/* Search Input Row */}
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="relative flex-1">
                    <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-dark-muted" />
                    <input
                      type="text"
                      placeholder="Search by Customer Name, Email, Phone, Product or session ID..."
                      value={abandonedSearch}
                      onChange={(e) => setAbandonedSearch(e.target.value)}
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
                    <select value={abandonedStatus} onChange={(e) => { setAbandonedStatus(e.target.value); setAbandonedPage(1); }} className="input-field text-xs py-2">
                      <option value="">All Status</option>
                      <option value="abandoned">Abandoned</option>
                      <option value="converted">Recovered (Converted)</option>
                      <option value="pending">Pending Checkouts</option>
                    </select>
                  </div>

                  {/* Payment Method */}
                  <div className="flex flex-col">
                    <label className="text-[10px] uppercase font-bold text-dark-muted tracking-wider mb-1.5">Payment Type</label>
                    <select value={abandonedPaymentMethod} onChange={(e) => { setAbandonedPaymentMethod(e.target.value); setAbandonedPage(1); }} className="input-field text-xs py-2">
                      <option value="">All Methods</option>
                      <option value="razorpay">Razorpay (Online)</option>
                      <option value="cod">Cash on Delivery (COD)</option>
                    </select>
                  </div>

                  {/* Device */}
                  <div className="flex flex-col">
                    <label className="text-[10px] uppercase font-bold text-dark-muted tracking-wider mb-1.5">Device</label>
                    <select value={abandonedDevice} onChange={(e) => { setAbandonedDevice(e.target.value); setAbandonedPage(1); }} className="input-field text-xs py-2">
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
                    <select value={abandonedOs} onChange={(e) => { setAbandonedOs(e.target.value); setAbandonedPage(1); }} className="input-field text-xs py-2">
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
                    <select value={abandonedBrowser} onChange={(e) => { setAbandonedBrowser(e.target.value); setAbandonedPage(1); }} className="input-field text-xs py-2">
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
                    <select value={abandonedDateRange} onChange={(e) => handleAbandonedDateRangeChange(e.target.value)} className="input-field text-xs py-2">
                      <option value="">All Time</option>
                      <option value="today">Today</option>
                      <option value="yesterday">Yesterday</option>
                      <option value="week">Last 7 Days</option>
                      <option value="month">Last 30 Days</option>
                      <option value="custom">Custom Range</option>
                    </select>
                  </div>
                </div>

                {abandonedShowCustomDates && (
                  <div className="flex items-center gap-3 pt-3 border-t border-dashed border-dark-border/40">
                    <Calendar size={14} className="text-primary-500" />
                    <div className="flex items-center gap-2">
                      <input
                        type="date"
                        value={abandonedStartDate}
                        onChange={(e) => setAbandonedStartDate(e.target.value)}
                        className="input-field text-xs py-1.5 px-3 max-w-[150px]"
                      />
                      <span className="text-xs text-dark-muted">to</span>
                      <input
                        type="date"
                        value={abandonedEndDate}
                        onChange={(e) => setAbandonedEndDate(e.target.value)}
                        className="input-field text-xs py-1.5 px-3 max-w-[150px]"
                      />
                    </div>
                  </div>
                )}
              </form>
            </div>

            {/* Results Info & Exporters */}
            <div className="flex items-center justify-between flex-wrap gap-4 bg-dark-card/20 border border-dark-border/40 p-4 rounded-2xl">
              <p className="text-xs text-dark-muted">
                Found <span className="font-bold text-dark-text">{abandonedTotal}</span> checkouts.
              </p>

              <div className="flex items-center gap-2">
                <button onClick={exportAbandonedCSV} className="btn-outline flex items-center gap-1.5 text-xs py-1.5 px-3">
                  <Download size={12} /> CSV
                </button>
                <button onClick={exportAbandonedExcel} className="btn-outline flex items-center gap-1.5 text-xs py-1.5 px-3">
                  <Download size={12} /> Excel
                </button>
                <button onClick={exportAbandonedPDF} className="btn-outline flex items-center gap-1.5 text-xs py-1.5 px-3">
                  <FileText size={12} /> PDF Report
                </button>
              </div>
            </div>

            {/* Data Table */}
            <div className="card p-6 bg-dark-card/40 overflow-x-auto">
              {abandonedLoading ? (
                <div className="py-20 flex justify-center items-center">
                  <div className="w-10 h-10 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : abandonedCheckouts.length === 0 ? (
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
                      {abandonedCheckouts.map((c) => (
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
                                setShowCheckoutDetailModal(true)
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
                      Page {abandonedPage} of {Math.ceil(abandonedTotal / abandonedLimit)}
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        disabled={abandonedPage === 1}
                        onClick={() => setAbandonedPage(abandonedPage - 1)}
                        className="btn-outline py-1 px-3 text-xs disabled:opacity-50 disabled:pointer-events-none"
                      >
                        Previous
                      </button>
                      <button
                        disabled={abandonedPage >= Math.ceil(abandonedTotal / abandonedLimit)}
                        onClick={() => setAbandonedPage(abandonedPage + 1)}
                        className="btn-outline py-1 px-3 text-xs disabled:opacity-50 disabled:pointer-events-none"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                </>
              )}
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
        {/* Expandable Journey Detail Modal */}
        {showVisitorDetailModal && selectedVisitor && (
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
                  onClick={() => setShowVisitorDetailModal(false)}
                  className="p-1.5 text-dark-muted hover:text-dark-text hover:bg-dark-border/40 rounded-xl transition-all"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-6 overflow-y-auto space-y-6 flex-1 text-left">
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
                  onClick={() => setShowVisitorDetailModal(false)}
                  className="btn-outline text-xs py-2 px-4"
                >
                  Close Panel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Details & Notes Recovery Modal */}
        {showCheckoutDetailModal && selectedCheckout && (
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
                  onClick={() => setShowCheckoutDetailModal(false)}
                  className="p-1.5 text-dark-muted hover:text-dark-text hover:bg-dark-border/40 rounded-xl transition-all"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Body */}
              <div className="p-6 overflow-y-auto space-y-6 flex-1 text-left">
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
                              <p className="font-semibold text-dark-text truncate">{item.name}</p>
                              <p className="text-dark-muted">{item.qty} x {formatCurrency(item.price)}</p>
                            </div>
                            <span className="font-mono text-dark-text font-bold">{formatCurrency(item.qty * item.price)}</span>
                          </div>
                        ))}
                      </div>
                      <div className="flex justify-between items-center mt-3 text-sm font-semibold text-dark-text">
                        <span>Cart Total Value</span>
                        <span className="text-primary-500 font-mono text-base font-extrabold">{formatCurrency(selectedCheckout.cartValue)}</span>
                      </div>
                    </div>

                    {/* Save notes */}
                    <div>
                      <h4 className="text-[10px] uppercase font-bold text-primary-500 tracking-wider mb-2">Super Admin Recovery Notes</h4>
                      <form onSubmit={handleAddNote} className="space-y-3">
                        <div className="relative">
                          <textarea
                            rows="3"
                            value={newNote}
                            onChange={(e) => setNewNote(e.target.value)}
                            placeholder="Type progress update (e.g. payment failed, price concern, customer requested callback...)"
                            className="input-field w-full text-xs p-2.5 bg-dark-bg/60 border-dark-border"
                          />
                        </div>
                        <div className="flex justify-end">
                          <button
                            type="submit"
                            disabled={savingNote || !newNote.trim()}
                            className="btn-primary flex items-center gap-1.5 text-xs py-1.5 px-4"
                          >
                            <PlusCircle size={12} /> {savingNote ? 'Saving...' : 'Add Note'}
                          </button>
                        </div>
                      </form>

                      {/* Note Logs History */}
                      <div className="space-y-2 mt-4 max-h-36 overflow-y-auto">
                        {selectedCheckout.notes && selectedCheckout.notes.length > 0 ? (
                          selectedCheckout.notes.map((note, index) => (
                            <div key={index} className="p-2.5 rounded-lg border border-dark-border/40 bg-dark-bg/25 text-xs">
                              <p className="text-dark-text">{note.content}</p>
                              <span className="text-[10px] text-dark-muted font-mono mt-1 block">
                                Logged: {new Date(note.timestamp).toLocaleString('en-IN')}
                              </span>
                            </div>
                          ))
                        ) : (
                          <p className="text-xs text-dark-muted italic pl-1">No notes recorded yet for this session.</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="p-4 border-t border-dark-border flex justify-end gap-3 shrink-0">
                <button
                  onClick={() => setShowCheckoutDetailModal(false)}
                  className="btn-outline text-xs py-2 px-4"
                >
                  Close Recovery Panel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  )
}
