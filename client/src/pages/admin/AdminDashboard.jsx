import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import axios from 'axios'
import {
  Package,
  ShoppingBag,
  Download,
  FileText,
  Table,
  IndianRupee,
  Clock,
  CheckCircle,
  RotateCcw,
  AlertTriangle,
  TrendingUp,
  BarChart3,
  Trophy,
  Layers,
  ArrowRight,
} from 'lucide-react'
import toast from 'react-hot-toast'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import * as XLSX from 'xlsx'
import BASE_URL from '../../utils/api'

const API = BASE_URL

export default function AdminDashboard() {
  const [stats, setStats] = useState({ products: 0, orders: 0 })
  const [products, setProducts] = useState([])
  const [orders, setOrders] = useState([])
  const [exporting, setExporting] = useState(false)

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [p, o] = await Promise.all([
          axios.get(`${API}/products?limit=1000`, { withCredentials: true }),
          axios.get(`${API}/orders`, { withCredentials: true }),
        ])

        setProducts(p.data.products || [])
        setOrders(o.data.orders || [])
        setStats({
          products: p.data.total,
          orders: o.data.orders?.length || 0,
        })
      } catch {
        toast.error('Failed to load dashboard data')
      }
    }
    fetchStats()
  }, [])

  const formatCurrency = (value) => `₹${Number(value || 0).toLocaleString('en-IN')}`

  const getOrderDate = (order) => new Date(order.shippedAt || order.deliveredAt || order.updatedAt || order.createdAt)

  const isSalesOrder = (order) => ['shipped', 'delivered'].includes(order.status)

  const salesOrders = orders.filter(isSalesOrder)
  const now = new Date()
  const todayKey = now.toDateString()

  const revenueToday = salesOrders.reduce((sum, order) => {
    const date = getOrderDate(order)
    return date.toDateString() === todayKey ? sum + Number(order.totalPrice || 0) : sum
  }, 0)

  const revenueThisMonth = salesOrders.reduce((sum, order) => {
    const date = getOrderDate(order)
    const sameMonth = date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear()
    return sameMonth ? sum + Number(order.totalPrice || 0) : sum
  }, 0)

  const totalSales = salesOrders.reduce((sum, order) => sum + Number(order.totalPrice || 0), 0)
  const pendingOrders = orders.filter((order) => ['pending', 'processing'].includes(order.status)).length
  const deliveredOrders = orders.filter((order) => order.status === 'delivered').length
  const returnRequests = orders.filter((order) => order.returnRequest?.status === 'requested').length
  const lowStockProducts = products.filter((product) => Number(product.stock || 0) <= 5 || product.isOutOfStock)

  const monthlySalesRows = () => {
    const grouped = {}

    orders.forEach((order) => {
      if (!isSalesOrder(order)) return

      const date = getOrderDate(order)
      const monthKey = date.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })

      if (!grouped[monthKey]) {
        grouped[monthKey] = {
          month: monthKey,
          orders: 0,
          unitsSold: 0,
          revenue: 0,
        }
      }

      grouped[monthKey].orders += 1
      grouped[monthKey].unitsSold += order.items?.reduce((sum, item) => sum + Number(item.qty || 0), 0) || 0
      grouped[monthKey].revenue += Number(order.totalPrice || 0)
    })

    return Object.values(grouped)
  }

  const monthlyChartRows = () => {
    const months = []

    for (let i = 5; i >= 0; i -= 1) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1)
      months.push({
        key: `${date.getFullYear()}-${date.getMonth()}`,
        label: date.toLocaleDateString('en-IN', { month: 'short' }),
        revenue: 0,
        orders: 0,
      })
    }

    salesOrders.forEach((order) => {
      const date = getOrderDate(order)
      const key = `${date.getFullYear()}-${date.getMonth()}`
      const match = months.find((month) => month.key === key)

      if (match) {
        match.revenue += Number(order.totalPrice || 0)
        match.orders += 1
      }
    })

    return months
  }

  const topSellingProducts = () => {
    const grouped = {}

    products.forEach((product) => {
      grouped[product._id] = {
        id: product._id,
        name: product.name,
        category: product.category,
        image: product.images?.[0],
        units: Number(product.soldCount || 0),
        revenue: Number(product.soldCount || 0) * Number(product.price || 0),
      }
    })

    salesOrders.forEach((order) => {
      order.items?.forEach((item) => {
        const productId = item.product || item.productId || item._id || item.id || item.name

        if (!grouped[productId]) {
          grouped[productId] = {
            id: productId,
            name: item.name,
            category: item.category || 'uncategorized',
            image: item.image,
            units: 0,
            revenue: 0,
          }
        }

        grouped[productId].units += Number(item.qty || 0)
        grouped[productId].revenue += Number(item.qty || 0) * Number(item.price || 0)
      })
    })

    return Object.values(grouped)
      .filter((product) => product.units > 0)
      .sort((a, b) => b.units - a.units)
      .slice(0, 5)
  }

  const categoryPerformance = () => {
    const grouped = {}

    products.forEach((product) => {
      if (!grouped[product.category]) {
        grouped[product.category] = {
          category: product.category,
          products: 0,
          revenue: 0,
          units: 0,
        }
      }

      grouped[product.category].products += 1
    })

    salesOrders.forEach((order) => {
      order.items?.forEach((item) => {
        const matchedProduct = products.find((product) => (
          product._id === item.product ||
          product._id === item.productId ||
          product.name === item.name
        ))

        const category = item.category || matchedProduct?.category || 'uncategorized'

        if (!grouped[category]) {
          grouped[category] = {
            category,
            products: 0,
            revenue: 0,
            units: 0,
          }
        }

        grouped[category].units += Number(item.qty || 0)
        grouped[category].revenue += Number(item.qty || 0) * Number(item.price || 0)
      })
    })

    return Object.values(grouped)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 6)
  }

  const recentOrders = [...orders]
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 5)

  const chartRows = monthlyChartRows()
  const maxChartRevenue = Math.max(...chartRows.map((row) => row.revenue), 1)
  const bestSellers = topSellingProducts()
  const categories = categoryPerformance()
  const maxCategoryRevenue = Math.max(...categories.map((row) => row.revenue), 1)

  const exportInventoryPDF = () => {
    setExporting(true)
    try {
      const doc = new jsPDF()
      doc.setFontSize(20)
      doc.setTextColor(59, 107, 255)
      doc.text('AUTOCRAFT', 14, 18)
      doc.setFontSize(12)
      doc.setTextColor(40)
      doc.text('Current Inventory Status', 14, 27)
      doc.setFontSize(9)
      doc.setTextColor(120)
      doc.text(`Generated: ${new Date().toLocaleString('en-IN')}`, 14, 34)

      autoTable(doc, {
        startY: 42,
        head: [['Product', 'Category', 'Price', 'Stock', 'Status', 'Sold']],
        body: products.map((p) => [
          p.name,
          p.category,
          `Rs.${Number(p.price || 0).toLocaleString()}`,
          p.stock,
          p.isOutOfStock || Number(p.stock || 0) <= 0 ? 'Out of Stock' : 'In Stock',
          p.soldCount || 0,
        ]),
        headStyles: { fillColor: [59, 107, 255] },
        styles: { fontSize: 8 },
      })

      doc.save(`AUTOCRAFT-Inventory-${new Date().toISOString().slice(0, 10)}.pdf`)
      toast.success('Inventory PDF exported')
    } finally {
      setExporting(false)
    }
  }

  const exportInventoryExcel = () => {
    setExporting(true)
    try {
      const rows = products.map((p) => ({
        Product: p.name,
        Category: p.category,
        Price: p.price,
        MRP: p.mrp,
        Stock: p.stock,
        Status: p.isOutOfStock || Number(p.stock || 0) <= 0 ? 'Out of Stock' : 'In Stock',
        'Sold Count': p.soldCount || 0,
        'Notify Requests': p.notifyList?.filter((n) => n.status === 'waiting').length || 0,
      }))

      const worksheet = XLSX.utils.json_to_sheet(rows)
      const workbook = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Inventory')
      XLSX.writeFile(workbook, `AUTOCRAFT-Inventory-${new Date().toISOString().slice(0, 10)}.xlsx`)
      toast.success('Inventory Excel exported')
    } finally {
      setExporting(false)
    }
  }

  const exportSalesPDF = () => {
    setExporting(true)
    try {
      const rows = monthlySalesRows()
      const doc = new jsPDF()
      doc.setFontSize(20)
      doc.setTextColor(59, 107, 255)
      doc.text('AUTOCRAFT', 14, 18)
      doc.setFontSize(12)
      doc.setTextColor(40)
      doc.text('Month Wise Sales Report', 14, 27)
      doc.setFontSize(9)
      doc.setTextColor(120)
      doc.text(`Generated: ${new Date().toLocaleString('en-IN')}`, 14, 34)

      autoTable(doc, {
        startY: 42,
        head: [['Month', 'Orders', 'Units Sold', 'Revenue']],
        body: rows.map((row) => [
          row.month,
          row.orders,
          row.unitsSold,
          `Rs.${row.revenue.toLocaleString()}`,
        ]),
        foot: [[
          'Total',
          rows.reduce((sum, r) => sum + r.orders, 0),
          rows.reduce((sum, r) => sum + r.unitsSold, 0),
          `Rs.${rows.reduce((sum, r) => sum + r.revenue, 0).toLocaleString()}`,
        ]],
        headStyles: { fillColor: [59, 107, 255] },
        footStyles: { fillColor: [240, 240, 240], textColor: 0, fontStyle: 'bold' },
      })

      doc.save(`AUTOCRAFT-Monthly-Sales-${new Date().toISOString().slice(0, 10)}.pdf`)
      toast.success('Sales PDF exported')
    } finally {
      setExporting(false)
    }
  }

  const exportSalesExcel = () => {
    setExporting(true)
    try {
      const worksheet = XLSX.utils.json_to_sheet(monthlySalesRows().map((row) => ({
        Month: row.month,
        Orders: row.orders,
        'Units Sold': row.unitsSold,
        Revenue: row.revenue,
      })))

      const workbook = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Monthly Sales')
      XLSX.writeFile(workbook, `AUTOCRAFT-Monthly-Sales-${new Date().toISOString().slice(0, 10)}.xlsx`)
      toast.success('Sales Excel exported')
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-28 pb-16">
      <div className="mb-8">
        <p className="text-xs text-primary-500 uppercase tracking-widest font-semibold mb-2">Business Command Center</p>
        <h1 className="font-display text-3xl font-bold text-dark-text">Admin Dashboard</h1>
        <p className="text-dark-muted mt-1">Live analytics, inventory health and store operations for AUTOCRAFT</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
        {[
          [IndianRupee, 'Revenue Today', formatCurrency(revenueToday), 'bg-green-500/10 text-green-400 border-green-500/20'],
          [TrendingUp, 'Revenue This Month', formatCurrency(revenueThisMonth), 'bg-primary-500/10 text-primary-500 border-primary-500/20'],
          [ShoppingBag, 'Total Sales', formatCurrency(totalSales), 'bg-accent-400/10 text-accent-400 border-accent-400/20'],
          [Clock, 'Pending Orders', pendingOrders, 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'],
          [CheckCircle, 'Delivered Orders', deliveredOrders, 'bg-green-500/10 text-green-400 border-green-500/20'],
          [RotateCcw, 'Return Requests', returnRequests, 'bg-red-500/10 text-red-400 border-red-500/20'],
          [AlertTriangle, 'Low Stock Products', lowStockProducts.length, 'bg-orange-500/10 text-orange-400 border-orange-500/20'],
          [Package, 'Total Products', stats.products, 'bg-primary-500/10 text-primary-500 border-primary-500/20'],
        ].map(([Icon, label, value, tone]) => (
          <div key={label} className="card p-5 relative overflow-hidden border-dark-border/80 bg-dark-card/80 shadow-[0_18px_60px_rgba(0,0,0,0.22)]">
            <div className="absolute inset-0 bg-gradient-to-br from-white/5 via-transparent to-primary-500/5 pointer-events-none" />
            <div className={`w-11 h-11 rounded-xl flex items-center justify-center mb-4 border ${tone}`}>
              <Icon size={21} />
            </div>
            <p className="text-2xl font-bold text-dark-text font-display">{value}</p>
            <p className="text-dark-muted text-sm mt-1">{label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-10">
        <div className="card p-6 xl:col-span-2">
          <div className="flex items-center justify-between gap-4 mb-6">
            <div>
              <h2 className="font-display text-xl font-bold text-dark-text">Monthly Sales Trend</h2>
              <p className="text-dark-muted text-sm mt-1">Revenue movement across the last 6 months</p>
            </div>
            <BarChart3 size={22} className="text-primary-500" />
          </div>

          <div className="h-72 flex items-end gap-3 sm:gap-5">
            {chartRows.map((row) => {
              const height = Math.max(8, Math.round((row.revenue / maxChartRevenue) * 100))

              return (
                <div key={row.key} className="flex-1 h-full flex flex-col justify-end">
                  <div className="mb-3 text-center">
                    <p className="text-xs text-dark-muted">{formatCurrency(row.revenue)}</p>
                    <p className="text-[11px] text-dark-muted/70">{row.orders} orders</p>
                  </div>
                  <div className="h-52 flex items-end">
                    <div
                      className="w-full rounded-t-2xl bg-gradient-to-t from-primary-600 via-primary-500 to-accent-400 shadow-[0_0_28px_rgba(59,107,255,0.28)] transition-all duration-500"
                      style={{ height: `${height}%` }}
                    />
                  </div>
                  <p className="text-xs text-dark-muted text-center mt-3">{row.label}</p>
                </div>
              )
            })}
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center justify-between gap-4 mb-5">
            <div>
              <h2 className="font-display text-xl font-bold text-dark-text">Best Sellers</h2>
              <p className="text-dark-muted text-sm mt-1">Top products by units sold</p>
            </div>
            <Trophy size={22} className="text-yellow-400" />
          </div>

          <div className="space-y-3">
            {bestSellers.length === 0 ? (
              <p className="text-sm text-dark-muted py-8 text-center">No sales data yet</p>
            ) : bestSellers.map((product, index) => (
              <div key={product.id || product.name} className="flex items-center gap-3 p-3 rounded-xl bg-dark-border/20">
                <div className="w-9 h-9 rounded-lg bg-primary-500/10 text-primary-500 flex items-center justify-center text-xs font-bold">
                  {index + 1}
                </div>
                <div className="w-10 h-10 rounded-lg bg-dark-border overflow-hidden shrink-0">
                  {product.image
                    ? <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
                    : <div className="w-full h-full flex items-center justify-center text-dark-muted text-xs font-bold">AC</div>
                  }
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-dark-text line-clamp-1">{product.name}</p>
                  <p className="text-xs text-dark-muted">{product.units} sold · {formatCurrency(product.revenue)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-10">
        <div className="card p-6">
          <div className="flex items-center justify-between gap-4 mb-5">
            <div>
              <h2 className="font-display text-xl font-bold text-dark-text">Inventory Alerts</h2>
              <p className="text-dark-muted text-sm mt-1">Products needing attention</p>
            </div>
            <AlertTriangle size={22} className="text-orange-400" />
          </div>

          <div className="space-y-3">
            {lowStockProducts.length === 0 ? (
              <p className="text-sm text-dark-muted py-8 text-center">Inventory looks healthy</p>
            ) : lowStockProducts.slice(0, 5).map((product) => (
              <div key={product._id} className="flex items-center justify-between gap-3 p-3 rounded-xl bg-orange-500/5 border border-orange-500/10">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-dark-text line-clamp-1">{product.name}</p>
                  <p className="text-xs text-dark-muted">
                    {Number(product.stock || 0) <= 0 ? 'Out of stock' : `Only ${product.stock} left`}
                    {product.notifyList?.filter((n) => n.status === 'waiting').length > 0 && (
                      <span> · {product.notifyList.filter((n) => n.status === 'waiting').length} notify requests</span>
                    )}
                  </p>
                </div>
                <span className="text-xs text-orange-400 bg-orange-500/10 px-2 py-1 rounded-full shrink-0">
                  Alert
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="card p-6 xl:col-span-2">
          <div className="flex items-center justify-between gap-4 mb-5">
            <div>
              <h2 className="font-display text-xl font-bold text-dark-text">Category Performance</h2>
              <p className="text-dark-muted text-sm mt-1">Revenue and product spread by category</p>
            </div>
            <Layers size={22} className="text-primary-500" />
          </div>

          <div className="space-y-4">
            {categories.map((row) => {
              const width = Math.max(4, Math.round((row.revenue / maxCategoryRevenue) * 100))

              return (
                <div key={row.category}>
                  <div className="flex items-center justify-between gap-3 mb-2">
                    <p className="text-sm font-medium text-dark-text capitalize">{row.category}</p>
                    <p className="text-xs text-dark-muted">{formatCurrency(row.revenue)} · {row.units} units</p>
                  </div>
                  <div className="h-2 rounded-full bg-dark-border/60 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-primary-500 to-accent-400"
                      style={{ width: `${width}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      <div className="card p-6 mb-10">
        <div className="flex items-center justify-between flex-wrap gap-4 mb-5">
          <div>
            <h2 className="font-display text-xl font-bold text-dark-text">Recent Orders</h2>
            <p className="text-dark-muted text-sm mt-1">Latest customer activity across the store</p>
          </div>
          <Link to="/admin/orders" className="text-sm text-primary-500 hover:text-primary-400 flex items-center gap-1">
            View all <ArrowRight size={14} />
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-dark-border">
                <th className="text-left px-3 py-3 text-xs text-dark-muted uppercase tracking-wider">Order</th>
                <th className="text-left px-3 py-3 text-xs text-dark-muted uppercase tracking-wider">Customer</th>
                <th className="text-left px-3 py-3 text-xs text-dark-muted uppercase tracking-wider">Status</th>
                <th className="text-left px-3 py-3 text-xs text-dark-muted uppercase tracking-wider">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-dark-border">
              {recentOrders.length === 0 ? (
                <tr>
                  <td colSpan="4" className="px-3 py-8 text-center text-sm text-dark-muted">No orders yet</td>
                </tr>
              ) : recentOrders.map((order) => (
                <tr key={order._id} className="hover:bg-dark-border/20 transition-colors">
                  <td className="px-3 py-3">
                    <p className="text-xs font-mono text-primary-500">{order._id}</p>
                    <p className="text-xs text-dark-muted">{new Date(order.createdAt).toLocaleDateString('en-IN')}</p>
                  </td>
                  <td className="px-3 py-3">
                    <p className="text-sm text-dark-text line-clamp-1">{order.user?.name || 'Customer'}</p>
                    <p className="text-xs text-dark-muted line-clamp-1">{order.user?.email}</p>
                  </td>
                  <td className="px-3 py-3">
                    <span className={`text-xs px-2 py-1 rounded-full capitalize ${
                      order.status === 'delivered'
                        ? 'bg-green-500/10 text-green-400'
                        : order.status === 'cancelled'
                          ? 'bg-red-500/10 text-red-400'
                          : 'bg-primary-500/10 text-primary-500'
                    }`}>
                      {order.status}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-sm font-semibold text-dark-text">{formatCurrency(order.totalPrice)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card p-6 mb-10">
        <div className="flex items-center justify-between flex-wrap gap-4 mb-5">
          <div>
            <h2 className="font-display text-xl font-bold text-dark-text">Realtime Exports</h2>
            <p className="text-dark-muted text-sm mt-1">Download current inventory and month wise sales reports</p>
          </div>
          <Download size={22} className="text-primary-500" />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <button onClick={exportInventoryPDF} disabled={exporting} className="btn-outline flex items-center justify-center gap-2 text-sm">
            <FileText size={16} /> Inventory PDF
          </button>
          <button onClick={exportInventoryExcel} disabled={exporting} className="btn-outline flex items-center justify-center gap-2 text-sm">
            <Table size={16} /> Inventory Excel
          </button>
          <button onClick={exportSalesPDF} disabled={exporting} className="btn-outline flex items-center justify-center gap-2 text-sm">
            <FileText size={16} /> Sales PDF
          </button>
          <button onClick={exportSalesExcel} disabled={exporting} className="btn-outline flex items-center justify-center gap-2 text-sm">
            <Table size={16} /> Sales Excel
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Link to="/admin/products" className="card p-6 hover:border-primary-500/30 hover:shadow-[0_18px_60px_rgba(59,107,255,0.12)] transition-all flex items-center gap-4">
          <div className="w-12 h-12 bg-primary-500/10 rounded-xl flex items-center justify-center">
            <Package size={22} className="text-primary-500" />
          </div>
          <div>
            <p className="font-semibold text-dark-text">Manage Products</p>
            <p className="text-dark-muted text-sm">Add, edit, delete products</p>
          </div>
        </Link>
        <Link to="/admin/orders" className="card p-6 hover:border-primary-500/30 hover:shadow-[0_18px_60px_rgba(59,107,255,0.12)] transition-all flex items-center gap-4">
          <div className="w-12 h-12 bg-accent-400/10 rounded-xl flex items-center justify-center">
            <ShoppingBag size={22} className="text-accent-400" />
          </div>
          <div>
            <p className="font-semibold text-dark-text">Manage Orders</p>
            <p className="text-dark-muted text-sm">View and update order status</p>
          </div>
        </Link>
      </div>
    </div>
  )
}
