import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import axios from 'axios'
import { Package, ShoppingBag, Download, FileText, Table } from 'lucide-react'
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

  const monthlySalesRows = () => {
    const grouped = {}

    orders.forEach((order) => {
      if (!['shipped', 'delivered'].includes(order.status)) return

      const date = new Date(order.shippedAt || order.deliveredAt || order.updatedAt || order.createdAt)
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
        <h1 className="font-display text-3xl font-bold text-dark-text">Admin Dashboard</h1>
        <p className="text-dark-muted mt-1">Manage your AUTOCRAFT store</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-10">
        <div className="card p-6">
          <div className="w-12 h-12 bg-primary-500/10 rounded-xl flex items-center justify-center mb-4">
            <Package size={22} className="text-primary-500" />
          </div>
          <p className="text-2xl font-bold text-dark-text font-display">{stats.products}</p>
          <p className="text-dark-muted text-sm mt-1">Total Products</p>
        </div>
        <div className="card p-6">
          <div className="w-12 h-12 bg-accent-400/10 rounded-xl flex items-center justify-center mb-4">
            <ShoppingBag size={22} className="text-accent-400" />
          </div>
          <p className="text-2xl font-bold text-dark-text font-display">{stats.orders}</p>
          <p className="text-dark-muted text-sm mt-1">Total Orders</p>
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
        <Link to="/admin/products" className="card p-6 hover:border-primary-500/30 transition-all flex items-center gap-4">
          <div className="w-12 h-12 bg-primary-500/10 rounded-xl flex items-center justify-center">
            <Package size={22} className="text-primary-500" />
          </div>
          <div>
            <p className="font-semibold text-dark-text">Manage Products</p>
            <p className="text-dark-muted text-sm">Add, edit, delete products</p>
          </div>
        </Link>
        <Link to="/admin/orders" className="card p-6 hover:border-primary-500/30 transition-all flex items-center gap-4">
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
