import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  ArrowLeft, Download, Star, Package,
  MapPin, CreditCard, CheckCircle, Truck, Clock, RotateCcw
} from 'lucide-react'
import axios from 'axios'
import toast from 'react-hot-toast'
import { Helmet } from 'react-helmet-async'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { downloadInvoice } from '../utils/invoice'

import BASE_URL from '../utils/api'

const API = BASE_URL

const STATUS_STEPS = ['pending', 'processing', 'shipped', 'delivered']
const RETURN_WINDOW_MS = 7 * 24 * 60 * 60 * 1000

export default function OrderDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [order, setOrder] = useState(null)
  const [loading, setLoading] = useState(true)
  const [review, setReview] = useState({ rating: 5, comment: '', productId: '' })
  const [submitting, setSubmitting] = useState(false)
  const [showReview, setShowReview] = useState(null)
  const [returnReason, setReturnReason] = useState('')
  const [returning, setReturning] = useState(false)

  const fetchOrder = async () => {
    try {
      const { data } = await axios.get(`${API}/orders/${id}`, { withCredentials: true })
      setOrder(data.order)
    } catch {
      toast.error('Order not found')
      navigate('/my-orders')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchOrder()
  }, [id])

  const isReturnWindowOpen = () => {
    if (!order || order.status !== 'delivered' || !order.deliveredAt) return false
    return Date.now() - new Date(order.deliveredAt).getTime() <= RETURN_WINDOW_MS
  }

  const getReturnDaysLeft = () => {
    if (!order?.deliveredAt) return 0
    const returnEndsAt = new Date(order.deliveredAt).getTime() + RETURN_WINDOW_MS
    return Math.max(0, Math.ceil((returnEndsAt - Date.now()) / (24 * 60 * 60 * 1000)))
  }

  const handleReturnRequest = async (e) => {
    e.preventDefault()
    setReturning(true)

    try {
      const { data } = await axios.post(`${API}/orders/${order._id}/return`, {
        reason: returnReason.trim(),
      }, { withCredentials: true })

      setOrder(data.order)
      setReturnReason('')
      toast.success(data.message || 'Return request submitted')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Return request failed')
    } finally {
      setReturning(false)
    }
  }

  const generatePDF = () => {
    downloadInvoice(order, toast)
    const doc = new jsPDF()

    doc.setFontSize(20)
    doc.setTextColor(59, 107, 255)
    doc.text('AUTOCRAFT', 14, 20)
    doc.setFontSize(10)
    doc.setTextColor(100)
    doc.text('Car Decoration — Premium Car Accessories', 14, 27)
    doc.text('Old Military Hospital Road, Gowala Patti, Cooch Behar, WB 736101', 14, 33)
    doc.text('autocraftcoochbehar@gmail.com', 14, 39)

    doc.setFontSize(16)
    doc.setTextColor(0)
    doc.text('INVOICE', 160, 20)
    doc.setFontSize(10)
    doc.setTextColor(100)
    doc.text(`Order ID: ${order._id}`, 140, 27)
    doc.text(`Date: ${new Date(order.createdAt).toLocaleDateString('en-IN')}`, 140, 33)
    doc.text(`Status: ${order.status.toUpperCase()}`, 140, 39)

    doc.setDrawColor(200)
    doc.line(14, 44, 196, 44)

    doc.setFontSize(11)
    doc.setTextColor(0)
    doc.text('Bill To:', 14, 52)
    doc.setFontSize(10)
    doc.setTextColor(60)
    doc.text(order.shippingAddress.name, 14, 59)
    doc.text(order.shippingAddress.street, 14, 65)
    doc.text(`${order.shippingAddress.city}, ${order.shippingAddress.state} — ${order.shippingAddress.pincode}`, 14, 71)
    doc.text(`Phone: ${order.shippingAddress.phone}`, 14, 77)

    doc.setFontSize(11)
    doc.setTextColor(0)
    doc.text('Payment:', 130, 52)
    doc.setFontSize(10)
    doc.setTextColor(60)
    doc.text(`Method: ${order.paymentMethod.toUpperCase()}`, 130, 59)
    doc.text(`Status: ${order.isPaid ? 'PAID' : 'UNPAID'}`, 130, 65)
    if (order.paidAt) {
      doc.text(`Paid on: ${new Date(order.paidAt).toLocaleDateString('en-IN')}`, 130, 71)
    }
    if (order.paymentResult?.razorpay_payment_id) {
      doc.text(`TXN ID: ${order.paymentResult.razorpay_payment_id}`, 130, 77)
    }

    autoTable(doc, {
      startY: 88,
      head: [['#', 'Product', 'Qty', 'Unit Price', 'Total']],
      body: order.items.map((item, i) => [
        i + 1,
        item.name,
        item.qty,
        `Rs.${item.price.toLocaleString()}`,
        `Rs.${(item.price * item.qty).toLocaleString()}`,
      ]),
      foot: [
        ['', '', '', 'Items Total:', `Rs.${order.itemsPrice?.toLocaleString()}`],
        ['', '', '', 'Shipping:', order.shippingPrice === 0 ? 'FREE' : `Rs.${order.shippingPrice}`],
        ['', '', '', 'GRAND TOTAL:', `Rs.${order.totalPrice?.toLocaleString()}`],
      ],
      headStyles: { fillColor: [59, 107, 255], textColor: 255, fontSize: 10 },
      footStyles: { fillColor: [240, 240, 240], textColor: 0, fontStyle: 'bold' },
      bodyStyles: { fontSize: 9 },
      alternateRowStyles: { fillColor: [248, 248, 248] },
    })

    const finalY = doc.lastAutoTable.finalY + 10
    doc.setFontSize(9)
    doc.setTextColor(150)
    doc.text('Thank you for shopping with AUTOCRAFT!', 14, finalY)
    doc.text('For support: autocraftcoochbehar@gmail.com', 14, finalY + 5)

    // Legacy layout retained above for compatibility; premium invoice download is handled first.
  }

  const handleReviewSubmit = async (productId) => {
    if (!review.comment.trim()) return toast.error('Please write a comment')
    setSubmitting(true)
    try {
      await axios.post(`${API}/products/${productId}/review`, {
        rating: review.rating,
        comment: review.comment,
      }, { withCredentials: true })
      toast.success('Review submitted! Thank you.')
      setShowReview(null)
      setReview({ rating: 5, comment: '', productId: '' })
    } catch (err) {
      toast.error(err.response?.data?.message || 'Review failed')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-10 h-10 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  if (!order) return null

  const currentStep = order.status === 'cancelled' ? -1 : STATUS_STEPS.indexOf(order.status)
  const returnOpen = isReturnWindowOpen()
  const returnDaysLeft = getReturnDaysLeft()
  const returnRequested = order.returnRequest?.requested
  const hasTracking = order.trackingInfo?.courierName || order.trackingInfo?.trackingId || order.trackingInfo?.trackingUrl

  return (
    <>
      <Helmet><title>Order Details — AUTOCRAFT</title></Helmet>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-28 pb-16">

        <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
          <div>
            <button onClick={() => navigate('/my-orders')} className="flex items-center gap-2 text-dark-muted hover:text-dark-text text-sm mb-2 transition-colors">
              <ArrowLeft size={14} /> My Orders
            </button>
            <h1 className="font-display text-2xl font-bold text-dark-text">Order Details</h1>
            <p className="text-xs font-mono text-primary-500 mt-1">{order._id}</p>
          </div>
          <div className="flex gap-3 flex-wrap">
            {order.billUrl ? (
              <a href={order.billUrl} target="_blank" rel="noopener noreferrer" className="btn-outline flex items-center gap-2 text-sm py-2">
                <Download size={15} /> Download Bill
              </a>
            ) : (
              <button onClick={generatePDF} className="btn-outline flex items-center gap-2 text-sm py-2">
                <Download size={15} /> Download Invoice
              </button>
            )}
          </div>
        </div>

        {order.status !== 'cancelled' && (
          <div className="card p-6 mb-6">
            <h2 className="font-semibold text-dark-text mb-6">Order Status</h2>
            <div className="flex items-center justify-between relative">
              <div className="absolute left-0 right-0 top-5 h-0.5 bg-dark-border mx-8" />
              <div
                className="absolute left-0 top-5 h-0.5 bg-primary-500 mx-8 transition-all duration-500"
                style={{ width: `${(currentStep / (STATUS_STEPS.length - 1)) * 100}%` }}
              />
              {STATUS_STEPS.map((status, i) => (
                <div key={status} className="flex flex-col items-center relative z-10">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all ${
                    i <= currentStep
                      ? 'bg-primary-500 border-primary-500 text-white'
                      : 'bg-dark-bg border-dark-border text-dark-muted'
                  }`}>
                    {i < currentStep ? <CheckCircle size={18} /> : i === 0 ? <Clock size={16} /> : i === 1 ? <Package size={16} /> : i === 2 ? <Truck size={16} /> : <CheckCircle size={16} />}
                  </div>
                  <p className={`text-xs mt-2 capitalize font-medium ${i <= currentStep ? 'text-primary-500' : 'text-dark-muted'}`}>{status}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {order.status === 'cancelled' && (
          <div className="card p-4 mb-6 border-red-500/30 bg-red-500/5">
            <p className="text-red-400 font-medium text-sm">This order has been cancelled.</p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <div className="card p-6">
              <h2 className="font-semibold text-dark-text mb-4">Items Ordered</h2>
              <div className="space-y-4">
                {order.items.map((item, i) => (
                  <div key={i}>
                    <div className="flex gap-4 items-start">
                      <Link to={`/product/${item.product}`} className="shrink-0">
                        <div className="w-16 h-16 rounded-xl overflow-hidden bg-dark-border hover:opacity-80 transition-opacity">
                          {item.image
                            ? <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                            : <div className="w-full h-full flex items-center justify-center text-dark-muted text-xs font-bold">AC</div>
                          }
                        </div>
                      </Link>
                      <div className="flex-1">
                        <Link to={`/product/${item.product}`} className="font-medium text-dark-text hover:text-primary-500 transition-colors text-sm">
                          {item.name}
                        </Link>
                        <p className="text-xs text-dark-muted mt-0.5">Qty: {item.qty}</p>
                        <p className="text-sm font-semibold text-dark-text mt-1">
                          ₹{item.price.toLocaleString()} × {item.qty} = <span className="text-primary-500">₹{(item.price * item.qty).toLocaleString()}</span>
                        </p>
                      </div>

                      {order.status === 'delivered' && (
                        <button onClick={() => setShowReview(showReview === item.product ? null : item.product)} className="text-xs btn-outline py-1.5 px-3 shrink-0">
                          <Star size={12} className="inline mr-1" />
                          Rate
                        </button>
                      )}
                    </div>

                    {showReview === item.product && order.status === 'delivered' && (
                      <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="mt-3 p-4 bg-dark-border/20 rounded-xl">
                        <p className="text-sm font-medium text-dark-text mb-3">Rate this product</p>
                        <div className="flex gap-2 mb-3">
                          {[1, 2, 3, 4, 5].map(n => (
                            <button key={n} type="button" onClick={() => setReview(r => ({ ...r, rating: n }))}>
                              <Star size={22} className={n <= review.rating ? 'fill-yellow-400 text-yellow-400' : 'text-dark-border'} />
                            </button>
                          ))}
                        </div>
                        <textarea
                          value={review.comment}
                          onChange={e => setReview(r => ({ ...r, comment: e.target.value }))}
                          placeholder="Share your experience with this product..."
                          rows={3}
                          className="input-field resize-none text-sm mb-3"
                        />
                        <div className="flex gap-2">
                          <button onClick={() => handleReviewSubmit(item.product)} disabled={submitting} className="btn-primary text-sm py-2 flex items-center gap-1">
                            {submitting ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : 'Submit Review'}
                          </button>
                          <button onClick={() => setShowReview(null)} className="btn-outline text-sm py-2">Cancel</button>
                        </div>
                      </motion.div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {order.status === 'delivered' && (
              <div className={`card p-6 ${returnRequested ? 'border-blue-500/30 bg-blue-500/5' : returnOpen ? 'border-green-500/30 bg-green-500/5' : 'border-dark-border'}`}>
                <h2 className="font-semibold text-dark-text mb-2 flex items-center gap-2">
                  <RotateCcw size={16} className={returnRequested ? 'text-blue-400' : returnOpen ? 'text-green-400' : 'text-dark-muted'} />
                  Return Product
                </h2>

                {returnRequested ? (
                  <div>
                    <p className="text-sm text-blue-400 font-medium capitalize">Return request {order.returnRequest.status}</p>
                    <p className="text-xs text-dark-muted mt-1">
                      Requested on {new Date(order.returnRequest.requestedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </p>
                    {order.returnRequest.reason && (
                      <p className="text-sm text-dark-muted mt-3">Reason: {order.returnRequest.reason}</p>
                    )}
                    {order.returnRequest.adminNote && (
                      <p className="text-sm text-dark-muted mt-3">Admin note: {order.returnRequest.adminNote}</p>
                    )}
                    {order.returnRequest.history?.length > 0 && (
                      <div className="mt-4 border-t border-dark-border pt-3 space-y-2">
                        <p className="text-xs text-dark-muted uppercase tracking-wider">Return Trail</p>
                        {order.returnRequest.history.map((h, idx) => (
                          <div key={idx} className="text-xs text-dark-muted">
                            <span className="text-dark-text capitalize">{h.status}</span>
                            {' '}· {new Date(h.date).toLocaleString('en-IN')}
                            {h.note ? ` · ${h.note}` : ''}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ) : returnOpen ? (
                  <form onSubmit={handleReturnRequest} className="space-y-4">
                    <p className="text-sm text-dark-muted">
                      Return is available for this order. {returnDaysLeft} day{returnDaysLeft !== 1 ? 's' : ''} left in your 7 day return window.
                    </p>
                    <textarea
                      value={returnReason}
                      onChange={(e) => setReturnReason(e.target.value)}
                      rows={3}
                      className="input-field resize-none text-sm"
                      placeholder="Tell us why you want to return this order..."
                    />
                    <button type="submit" disabled={returning} className="btn-primary text-sm py-2 flex items-center gap-2">
                      {returning ? 'Submitting...' : 'Request Return'}
                    </button>
                  </form>
                ) : (
                  <p className="text-sm text-dark-muted">The 7 day return window for this delivered order has closed.</p>
                )}
              </div>
            )}

            <div className="card p-6">
              <h2 className="font-semibold text-dark-text mb-4 flex items-center gap-2">
                <MapPin size={16} className="text-primary-500" /> Delivery Address
              </h2>
              <p className="font-medium text-dark-text">{order.shippingAddress.name}</p>
              <p className="text-dark-muted text-sm mt-1">{order.shippingAddress.street}</p>
              <p className="text-dark-muted text-sm">{order.shippingAddress.city}, {order.shippingAddress.state} — {order.shippingAddress.pincode}</p>
              <p className="text-dark-muted text-sm mt-1">📞 {order.shippingAddress.phone}</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="card p-6">
              <h2 className="font-semibold text-dark-text mb-4">Order Summary</h2>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-dark-muted">Items Total</span>
                  <span className="text-dark-text">₹{order.itemsPrice?.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-dark-muted">Shipping</span>
                  <span className={order.shippingPrice === 0 ? 'text-green-400' : 'text-dark-text'}>
                    {order.shippingPrice === 0 ? 'FREE' : `₹${order.shippingPrice}`}
                  </span>
                </div>
                <hr className="border-dark-border" />
                <div className="flex justify-between font-bold text-base">
                  <span className="text-dark-text">Total</span>
                  <span className="text-dark-text">₹{order.totalPrice?.toLocaleString()}</span>
                </div>
              </div>
            </div>

            {hasTracking && (
              <div className="card p-6">
                <h2 className="font-semibold text-dark-text mb-4 flex items-center gap-2">
                  <Truck size={16} className="text-primary-500" /> Tracking Details
                </h2>
                <div className="space-y-2 text-sm">
                  {order.trackingInfo.courierName && (
                    <div className="flex justify-between gap-4">
                      <span className="text-dark-muted">Courier</span>
                      <span className="text-dark-text text-right">{order.trackingInfo.courierName}</span>
                    </div>
                  )}
                  {order.trackingInfo.trackingId && (
                    <div className="flex justify-between gap-4">
                      <span className="text-dark-muted">Tracking ID</span>
                      <span className="text-primary-500 text-right font-mono break-all">{order.trackingInfo.trackingId}</span>
                    </div>
                  )}
                  {order.trackingInfo.trackingUrl && (
                    <a href={order.trackingInfo.trackingUrl} target="_blank" rel="noopener noreferrer" className="btn-outline text-sm py-2 w-full flex justify-center mt-3">
                      Track Order
                    </a>
                  )}
                  {order.trackingInfo.updatedAt && (
                    <p className="text-xs text-dark-muted pt-2">
                      Updated {new Date(order.trackingInfo.updatedAt).toLocaleString('en-IN')}
                    </p>
                  )}
                </div>
              </div>
            )}

            <div className="card p-6">
              <h2 className="font-semibold text-dark-text mb-4 flex items-center gap-2">
                <CreditCard size={16} className="text-primary-500" /> Payment Details
              </h2>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-dark-muted">Method</span>
                  <span className="text-dark-text uppercase">{order.paymentMethod}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-dark-muted">Status</span>
                  <span className={order.isPaid ? 'text-green-400' : 'text-red-400'}>
                    {order.isPaid ? '✓ Paid' : '✗ Unpaid'}
                  </span>
                </div>
                {order.paidAt && (
                  <div className="flex justify-between">
                    <span className="text-dark-muted">Paid on</span>
                    <span className="text-dark-text text-xs">{new Date(order.paidAt).toLocaleDateString('en-IN')}</span>
                  </div>
                )}
                {order.paymentResult?.razorpay_payment_id && (
                  <div className="mt-2 pt-2 border-t border-dark-border">
                    <p className="text-xs text-dark-muted mb-1">Transaction ID</p>
                    <p className="text-xs font-mono text-primary-500 break-all">{order.paymentResult.razorpay_payment_id}</p>
                  </div>
                )}
              </div>
            </div>

            <div className="card p-6">
              <h2 className="font-semibold text-dark-text mb-2">Order Date</h2>
              <p className="text-dark-muted text-sm">
                {new Date(order.createdAt).toLocaleDateString('en-IN', {
                  weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
                })}
              </p>
              {order.shippedAt && (
                <>
                  <h2 className="font-semibold text-dark-text mb-2 mt-4">Shipped on</h2>
                  <p className="text-purple-400 text-sm">
                    {new Date(order.shippedAt).toLocaleDateString('en-IN', {
                      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
                    })}
                  </p>
                </>
              )}
              {order.deliveredAt && (
                <>
                  <h2 className="font-semibold text-dark-text mb-2 mt-4">Delivered on</h2>
                  <p className="text-green-400 text-sm">
                    {new Date(order.deliveredAt).toLocaleDateString('en-IN', {
                      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
                    })}
                  </p>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
