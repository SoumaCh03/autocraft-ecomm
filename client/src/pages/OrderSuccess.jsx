import { useLocation, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { CheckCircle, Package, ArrowRight, Download } from 'lucide-react'
import { Helmet } from 'react-helmet-async'
import toast from 'react-hot-toast'
import { downloadInvoice } from '../utils/invoice'

export default function OrderSuccess() {
  const { state } = useLocation()
  const order     = state?.order

  return (
    <>
      <Helmet><title>Order Confirmed — AUTOCRAFT</title></Helmet>
      <div className="min-h-screen flex items-center justify-center px-4 pt-20">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="card p-10 max-w-md w-full text-center"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
            className="w-20 h-20 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-6"
          >
            <CheckCircle size={40} className="text-green-400" />
          </motion.div>

          <h1 className="font-display text-3xl font-bold text-dark-text mb-2">Order Confirmed!</h1>
          <p className="text-dark-muted mb-6">
            Thank you for your purchase. Your order has been placed successfully.
          </p>

          {order && (
            <div className="bg-dark-border/30 rounded-xl p-4 mb-6 text-left">
              <p className="text-xs text-dark-muted mb-1">Order ID</p>
              <p className="text-sm font-mono text-primary-500 break-all">{order._id}</p>
              <p className="text-xs text-dark-muted mt-3 mb-1">Total Paid</p>
              <p className="text-lg font-bold text-dark-text">₹{order.totalPrice?.toLocaleString()}</p>
            </div>
          )}

          <div className="flex flex-col gap-3">
            <Link to="/my-orders" className="btn-primary flex items-center justify-center gap-2">
              <Package size={16} /> View My Orders
            </Link>
            {order && (
              <button onClick={() => downloadInvoice(order, toast)} className="btn-outline flex items-center justify-center gap-2">
                <Download size={16} /> Download Invoice
              </button>
            )}
            <Link to="/shop" className="btn-outline flex items-center justify-center gap-2">
              Continue Shopping <ArrowRight size={16} />
            </Link>
          </div>
        </motion.div>
      </div>
    </>
  )
}

