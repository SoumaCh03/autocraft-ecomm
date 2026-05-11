import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Package, ChevronRight, Download, RotateCcw } from 'lucide-react'
import axios from 'axios'
import toast from 'react-hot-toast'
import { Helmet } from 'react-helmet-async'
import BASE_URL from '../utils/api'

const API = BASE_URL

const STATUS_COLORS = {
  pending:    'bg-yellow-500/10 text-yellow-400',
  processing: 'bg-blue-500/10 text-blue-400',
  shipped:    'bg-purple-500/10 text-purple-400',
  delivered:  'bg-green-500/10 text-green-400',
  cancelled:  'bg-red-500/10 text-red-400',
}

const RETURN_WINDOW_MS = 7 * 24 * 60 * 60 * 1000

const getReturnInfo = (order) => {
  if (order.returnRequest?.requested) {
    return {
      label: `Return ${order.returnRequest.status}`,
      className: 'bg-blue-500/10 text-blue-400',
    }
  }

  if (order.status !== 'delivered' || !order.deliveredAt) return null

  const deliveredAt = new Date(order.deliveredAt).getTime()
  const returnEndsAt = deliveredAt + RETURN_WINDOW_MS
  const isOpen = Date.now() <= returnEndsAt

  if (!isOpen) {
    return {
      label: 'Return window closed',
      className: 'bg-dark-border text-dark-muted',
    }
  }

  const daysLeft = Math.max(1, Math.ceil((returnEndsAt - Date.now()) / (24 * 60 * 60 * 1000)))

  return {
    label: `${daysLeft} day${daysLeft > 1 ? 's' : ''} left to return`,
    className: 'bg-green-500/10 text-green-400',
  }
}

export default function OrdersPage() {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const { data } = await axios.get(`${API}/orders/my`, { withCredentials: true })
        setOrders(data.orders)
      } catch {
        toast.error('Failed to load orders')
      } finally {
        setLoading(false)
      }
    }
    fetchOrders()
  }, [])

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return (
    <>
      <Helmet><title>My Orders — AUTOCRAFT</title></Helmet>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-28 pb-16">
        <h1 className="font-display text-3xl font-bold text-dark-text mb-8">My Orders</h1>

        {orders.length === 0 ? (
          <div className="card p-12 text-center">
            <Package size={48} className="text-dark-border mx-auto mb-4" />
            <p className="font-semibold text-dark-text mb-1">No orders yet</p>
            <p className="text-dark-muted text-sm mb-6">Start shopping to see your orders here</p>
            <Link to="/shop" className="btn-primary">Browse Products</Link>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map((order, i) => {
              const returnInfo = getReturnInfo(order)

              return (
                <motion.div
                  key={order._id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                >
                  <Link
                    to={`/order/${order._id}`}
                    className="card p-5 hover:border-primary-500/30 transition-all block group"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                      <div>
                        <p className="text-xs text-dark-muted mb-1">Order ID</p>
                        <p className="text-sm font-mono text-primary-500">{order._id}</p>
                        <p className="text-xs text-dark-muted mt-1">
                          {new Date(order.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </p>
                      </div>
                      <div className="flex items-center gap-3 flex-wrap">
                        <span className={`text-xs px-3 py-1 rounded-full font-medium capitalize ${STATUS_COLORS[order.status] || 'bg-dark-border text-dark-muted'}`}>
                          {order.status}
                        </span>
                        <span className={`text-xs px-3 py-1 rounded-full font-medium ${order.isPaid ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
                          {order.isPaid ? 'Paid' : 'Unpaid'}
                        </span>
                        {returnInfo && (
                          <span className={`text-xs px-3 py-1 rounded-full font-medium flex items-center gap-1 ${returnInfo.className}`}>
                            <RotateCcw size={11} /> {returnInfo.label}
                          </span>
                        )}
                        <ChevronRight size={16} className="text-dark-muted group-hover:text-primary-500 transition-colors" />
                      </div>
                    </div>

                    <div className="flex gap-3 overflow-x-auto pb-2 mb-3">
                      {order.items.map((item, j) => (
                        <div key={j} className="flex items-center gap-2 shrink-0 bg-dark-border/30 rounded-xl p-2 pr-4">
                          <div className="w-10 h-10 rounded-lg bg-dark-border overflow-hidden">
                            {item.image && <img src={item.image} alt={item.name} className="w-full h-full object-cover" />}
                          </div>
                          <div>
                            <p className="text-xs font-medium text-dark-text line-clamp-1 max-w-32">{item.name}</p>
                            <p className="text-xs text-dark-muted">Qty: {item.qty} × ₹{item.price.toLocaleString()}</p>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3 flex-wrap">
                        <p className="font-bold text-dark-text">₹{order.totalPrice?.toLocaleString()}</p>
                        {order.billUrl && (
                          <span className="text-xs bg-green-500/10 text-green-400 px-2 py-0.5 rounded-full flex items-center gap-1">
                            <Download size={10} /> Bill Available
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-primary-500 group-hover:underline shrink-0">View Details →</span>
                    </div>
                  </Link>
                </motion.div>
              )
            })}
          </div>
        )}
      </div>
    </>
  )
}
