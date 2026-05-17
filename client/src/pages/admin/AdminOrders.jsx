import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import axios from 'axios'
import toast from 'react-hot-toast'
import {
  ArrowLeft, Download, Upload, Printer, RotateCcw,
  CheckCircle, XCircle, Truck, Save
} from 'lucide-react'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { downloadInvoice } from '../../utils/invoice'

import BASE_URL from '../../utils/api'

const API = BASE_URL
axios.defaults.withCredentials = true

const STATUS_OPTIONS = ['pending', 'processing', 'shipped', 'delivered', 'cancelled']

export default function AdminOrders() {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(null)
  const [returnUpdating, setReturnUpdating] = useState(null)
  const [trackingSaving, setTrackingSaving] = useState(null)
  const [trackingForms, setTrackingForms] = useState({})
  const [returnNotes, setReturnNotes] = useState({})
  const fileInputRef = useRef({})

  useEffect(() => { fetchOrders() }, [])

  const fetchOrders = async () => {
    setLoading(true)
    try {
      const { data } = await axios.get(`${API}/orders`)
      setOrders(data.orders)

      const nextTrackingForms = {}
      const nextReturnNotes = {}

      data.orders.forEach((order) => {
        nextTrackingForms[order._id] = {
          courierName: order.trackingInfo?.courierName || '',
          trackingId:  order.trackingInfo?.trackingId || '',
          trackingUrl: order.trackingInfo?.trackingUrl || '',
        }
        nextReturnNotes[order._id] = order.returnRequest?.adminNote || ''
      })

      setTrackingForms(nextTrackingForms)
      setReturnNotes(nextReturnNotes)
    } catch {
      toast.error('Failed to load orders')
    } finally {
      setLoading(false)
    }
  }

  const updateStatus = async (id, status) => {
    try {
      await axios.put(`${API}/orders/${id}/status`, { status })
      toast.success(`Order marked as ${status}`)
      fetchOrders()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Update failed')
    }
  }

  const updateReturnStatus = async (orderId, status) => {
    setReturnUpdating(`${orderId}-${status}`)
    try {
      await axios.put(`${API}/orders/${orderId}/return-status`, {
        status,
        adminNote: returnNotes[orderId] || '',
      })
      toast.success(`Return marked as ${status}`)
      fetchOrders()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Return update failed')
    } finally {
      setReturnUpdating(null)
    }
  }

  const saveTracking = async (orderId) => {
    setTrackingSaving(orderId)
    try {
      const { data } = await axios.put(`${API}/orders/${orderId}/tracking`, trackingForms[orderId])
      toast.success(data.message || 'Tracking details shared')
      fetchOrders()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Tracking update failed')
    } finally {
      setTrackingSaving(null)
    }
  }

  const handleTrackingChange = (orderId, field, value) => {
    setTrackingForms(prev => ({
      ...prev,
      [orderId]: {
        ...(prev[orderId] || {}),
        [field]: value,
      },
    }))
  }

  const downloadShippingPDF = (order) => {
    const doc = new jsPDF({ format: 'a5' })

    doc.setFontSize(18)
    doc.setTextColor(59, 107, 255)
    doc.text('AUTOCRAFT', 14, 16)
    doc.setFontSize(8)
    doc.setTextColor(100)
    doc.text('Car Decoration — Cooch Behar, WB 736101 | hello@autocraft.in', 14, 22)

    doc.setDrawColor(200)
    doc.line(14, 26, 134, 26)

    doc.setFontSize(11)
    doc.setTextColor(0)
    doc.text('SHIP TO:', 14, 34)

    doc.setFontSize(13)
    doc.text(order.shippingAddress.name, 14, 42)

    doc.setFontSize(10)
    doc.setTextColor(60)
    doc.text(order.shippingAddress.street, 14, 50)
    doc.text(`${order.shippingAddress.city}, ${order.shippingAddress.state}`, 14, 57)
    doc.text(`PIN: ${order.shippingAddress.pincode}`, 14, 64)

    doc.setFontSize(12)
    doc.setTextColor(0)
    doc.text(`Phone: ${order.shippingAddress.phone}`, 14, 73)

    doc.line(14, 78, 134, 78)

    doc.setFontSize(9)
    doc.setTextColor(100)
    doc.text(`Order ID: ${order._id}`, 14, 85)
    doc.text(`Date: ${new Date(order.createdAt).toLocaleDateString('en-IN')}`, 14, 91)
    doc.text(`Amount: Rs.${order.totalPrice?.toLocaleString()} | ${order.isPaid ? 'PREPAID' : 'COD'}`, 14, 97)

    const hasTracking = order.trackingInfo?.courierName || order.trackingInfo?.trackingId

    if (hasTracking) {
      doc.text(`Courier: ${order.trackingInfo.courierName || '-'}`, 14, 103)
      doc.text(`Tracking: ${order.trackingInfo.trackingId || '-'}`, 14, 109)
    }

    autoTable(doc, {
      startY: hasTracking ? 116 : 108,
      head: [['Product', 'Qty']],
      body: order.items.map(i => [i.name, i.qty]),
      headStyles: { fillColor: [59, 107, 255], fontSize: 8 },
      bodyStyles: { fontSize: 8 },
    })

    doc.save(`AUTOCRAFT-Shipping-${order._id}.pdf`)
    toast.success('Shipping label downloaded!')
  }

  const handleBillUpload = async (orderId, file) => {
    if (!file) return
    setUploading(orderId)
    try {
      const formData = new FormData()
      formData.append('image', file)
      const { data: uploadData } = await axios.post(`${API}/upload/image`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })

      await axios.put(`${API}/orders/${orderId}/bill`, { billUrl: uploadData.url })
      toast.success('Bill uploaded successfully!')
      fetchOrders()
    } catch {
      toast.error('Bill upload failed')
    } finally {
      setUploading(null)
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-28 pb-16">
      <div className="mb-8">
        <Link to="/admin" className="flex items-center gap-2 text-dark-muted hover:text-dark-text text-sm mb-2 transition-colors">
          <ArrowLeft size={14} /> Admin Dashboard
        </Link>
        <h1 className="font-display text-3xl font-bold text-dark-text">All Orders</h1>
        <p className="text-dark-muted text-sm mt-1">
          {orders.length} total orders
          {orders.some(o => o.returnRequest?.status === 'requested') && (
            <span className="ml-3 text-xs bg-red-500/10 text-red-400 px-2 py-1 rounded-full">
              {orders.filter(o => o.returnRequest?.status === 'requested').length} return request(s)
            </span>
          )}
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : orders.length === 0 ? (
        <div className="card p-12 text-center">
          <p className="text-dark-muted">No orders yet</p>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => {
            const hasReturn = order.returnRequest?.requested
            const canAddTracking = ['shipped', 'delivered'].includes(order.status)
            const returnBusy = returnUpdating?.startsWith(order._id)

            return (
              <div key={order._id} className={`card p-5 ${hasReturn ? 'border-blue-500/30' : ''}`}>
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-4">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <p className="text-xs text-dark-muted">Order ID</p>
                      {hasReturn && (
                        <span className="text-xs bg-blue-500/10 text-blue-400 px-2 py-0.5 rounded-full flex items-center gap-1 capitalize">
                          <RotateCcw size={11} /> Return {order.returnRequest.status}
                        </span>
                      )}
                    </div>
                    <p className="text-sm font-mono text-primary-500">{order._id}</p>
                    <p className="text-xs text-dark-muted mt-1">{order.user?.name} · {order.user?.email}</p>
                    <p className="text-xs text-dark-muted">
                      {new Date(order.createdAt).toLocaleDateString('en-IN', {
                        day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
                      })}
                    </p>
                  </div>

                  <div className="flex flex-col sm:items-end gap-2">
                    <p className="font-bold text-dark-text text-lg">₹{order.totalPrice?.toLocaleString()}</p>
                    <span className={`text-xs px-3 py-1 rounded-full font-medium w-fit ${order.isPaid ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
                      {order.isPaid ? '✓ Paid' : '✗ Unpaid'}
                    </span>
                    <select value={order.status} onChange={(e) => updateStatus(order._id, e.target.value)} className="input-field py-1.5 text-xs w-40">
                      {STATUS_OPTIONS.map(s => (
                        <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="flex gap-3 overflow-x-auto pb-1 mb-3">
                  {order.items.map((item, i) => (
                    <div key={i} className="flex items-center gap-2 shrink-0 bg-dark-border/30 rounded-xl p-2 pr-4">
                      <div className="w-10 h-10 rounded-lg bg-dark-border overflow-hidden">
                        {item.image && <img src={item.image} alt={item.name} className="w-full h-full object-cover" />}
                      </div>
                      <div>
                        <p className="text-xs font-medium text-dark-text max-w-32 line-clamp-1">{item.name}</p>
                        <p className="text-xs text-dark-muted">Qty: {item.qty} × ₹{item.price.toLocaleString()}</p>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="text-xs text-dark-muted bg-dark-border/20 rounded-lg p-3 mb-3">
                  <span className="text-dark-text font-medium">Ship to: </span>
                  {order.shippingAddress?.name}, {order.shippingAddress?.street}, {order.shippingAddress?.city}, {order.shippingAddress?.state} — {order.shippingAddress?.pincode}
                  <span className="ml-2">📞 {order.shippingAddress?.phone}</span>
                </div>

                {canAddTracking && (
                  <div className="bg-dark-border/20 rounded-xl p-4 mb-3">
                    <div className="flex items-center gap-2 mb-3">
                      <Truck size={15} className="text-primary-500" />
                      <p className="text-sm font-semibold text-dark-text">Courier Tracking</p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                      <input
                        value={trackingForms[order._id]?.courierName || ''}
                        onChange={(e) => handleTrackingChange(order._id, 'courierName', e.target.value)}
                        className="input-field text-xs"
                        placeholder="Courier name"
                      />
                      <input
                        value={trackingForms[order._id]?.trackingId || ''}
                        onChange={(e) => handleTrackingChange(order._id, 'trackingId', e.target.value)}
                        className="input-field text-xs"
                        placeholder="Tracking ID"
                      />
                      <input
                        value={trackingForms[order._id]?.trackingUrl || ''}
                        onChange={(e) => handleTrackingChange(order._id, 'trackingUrl', e.target.value)}
                        className="input-field text-xs"
                        placeholder="Tracking URL"
                      />
                      <button onClick={() => saveTracking(order._id)} disabled={trackingSaving === order._id} className="btn-primary text-xs py-2 flex items-center justify-center gap-2">
                        <Save size={13} /> {trackingSaving === order._id ? 'Sharing...' : 'Share Tracking'}
                      </button>
                    </div>
                  </div>
                )}

                {hasReturn && (
                  <div className="bg-blue-500/5 border border-blue-500/20 rounded-xl p-4 mb-3">
                    <div className="flex items-start justify-between gap-4 flex-wrap mb-3">
                      <div>
                        <p className="text-sm font-semibold text-dark-text flex items-center gap-2">
                          <RotateCcw size={15} className="text-blue-400" /> Return Request
                        </p>
                        <p className="text-xs text-dark-muted mt-1">
                          Requested on {new Date(order.returnRequest.requestedAt).toLocaleDateString('en-IN', {
                            day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
                          })}
                        </p>
                        {order.returnRequest.reason && (
                          <p className="text-sm text-dark-muted mt-2">Reason: {order.returnRequest.reason}</p>
                        )}
                      </div>
                      <span className="text-xs bg-blue-500/10 text-blue-400 px-3 py-1 rounded-full capitalize">
                        {order.returnRequest.status}
                      </span>
                    </div>

                    {order.returnRequest.history?.length > 0 && (
                      <div className="mb-3 text-xs text-dark-muted space-y-1">
                        {order.returnRequest.history.map((h, idx) => (
                          <p key={idx}>
                            <span className="text-dark-text capitalize">{h.status}</span>
                            {' '}· {new Date(h.date).toLocaleString('en-IN')}
                            {h.note ? ` · ${h.note}` : ''}
                          </p>
                        ))}
                      </div>
                    )}

                    <textarea
                      value={returnNotes[order._id] || ''}
                      onChange={(e) => setReturnNotes(prev => ({ ...prev, [order._id]: e.target.value }))}
                      rows={2}
                      className="input-field resize-none text-xs mb-3"
                      placeholder="Admin note for customer..."
                    />

                    <div className="flex flex-wrap gap-2">
                      <button onClick={() => updateReturnStatus(order._id, 'approved')} disabled={returnBusy} className="text-xs px-3 py-2 bg-green-500/10 text-green-400 hover:bg-green-500/20 rounded-lg flex items-center gap-1.5">
                        <CheckCircle size={13} /> Approve
                      </button>
                      <button onClick={() => updateReturnStatus(order._id, 'rejected')} disabled={returnBusy} className="text-xs px-3 py-2 bg-red-500/10 text-red-400 hover:bg-red-500/20 rounded-lg flex items-center gap-1.5">
                        <XCircle size={13} /> Reject
                      </button>
                      <button onClick={() => updateReturnStatus(order._id, 'received')} disabled={returnBusy} className="text-xs px-3 py-2 bg-primary-500/10 text-primary-500 hover:bg-primary-500/20 rounded-lg">
                        Mark Received
                      </button>
                      <button onClick={() => updateReturnStatus(order._id, 'refunded')} disabled={returnBusy} className="text-xs px-3 py-2 bg-accent-400/10 text-accent-400 hover:bg-accent-400/20 rounded-lg">
                        Mark Refunded
                      </button>
                    </div>
                  </div>
                )}

                <div className="flex flex-wrap gap-2">
                  <button onClick={() => downloadShippingPDF(order)} className="flex items-center gap-1.5 text-xs px-3 py-2 bg-primary-500/10 text-primary-500 hover:bg-primary-500/20 rounded-lg transition-all">
                    <Printer size={13} /> Shipping Label
                  </button>

                  <div>
                    <input
                      type="file"
                      accept=".pdf,image/*"
                      ref={el => fileInputRef.current[order._id] = el}
                      onChange={e => handleBillUpload(order._id, e.target.files[0])}
                      className="hidden"
                    />
                    <button onClick={() => fileInputRef.current[order._id]?.click()} disabled={uploading === order._id} className="flex items-center gap-1.5 text-xs px-3 py-2 bg-accent-400/10 text-accent-400 hover:bg-accent-400/20 rounded-lg transition-all">
                      {uploading === order._id
                        ? <div className="w-3 h-3 border border-accent-400 border-t-transparent rounded-full animate-spin" />
                        : <Upload size={13} />
                      }
                      {order.billUrl ? 'Update Bill' : 'Upload Bill'}
                    </button>
                  </div>

                  {order.billUrl && (
                    <a href={order.billUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-xs px-3 py-2 bg-green-500/10 text-green-400 hover:bg-green-500/20 rounded-lg transition-all">
                      <Download size={13} /> View Bill
                    </a>
                  )}

                  <button onClick={() => downloadInvoice(order, toast)} className="flex items-center gap-1.5 text-xs px-3 py-2 bg-green-500/10 text-green-400 hover:bg-green-500/20 rounded-lg transition-all">
                    <Download size={13} /> Download Invoice
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
