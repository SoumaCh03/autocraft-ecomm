import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import axios from 'axios'
import { Package, ShoppingBag } from 'lucide-react'
import BASE_URL from '../../utils/api'

const API = BASE_URL

export default function AdminDashboard() {
  const [stats, setStats] = useState({ products: 0, orders: 0 })

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [p, o] = await Promise.all([
          axios.get(`${API}/products?limit=1`, { withCredentials: true }),
          axios.get(`${API}/orders`, { withCredentials: true }),
        ])
        setStats({
          products: p.data.total,
          orders:   o.data.orders?.length || 0,
        })
      } catch {}
    }
    fetchStats()
  }, [])

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