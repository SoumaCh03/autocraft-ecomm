import { useState, useEffect, useRef } from 'react'
import axios from 'axios'
import toast from 'react-hot-toast'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { downloadInvoice } from '../../utils/invoice'
import BASE_URL from '../../utils/api'
import OrderHeader from '../../components/admin/OrderHeader'
import OrderList from '../../components/admin/OrderList'

const API = BASE_URL
axios.defaults.withCredentials = true

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
      <OrderHeader ordersLength={orders.length} returnRequests={orders.filter(o => o.returnRequest?.status === 'requested').length} />
      <OrderList
        orders={orders}
        loading={loading}
        updateStatus={updateStatus}
        trackingForms={trackingForms}
        handleTrackingChange={handleTrackingChange}
        saveTracking={saveTracking}
        trackingSaving={trackingSaving}
        returnNotes={returnNotes}
        setReturnNotes={setReturnNotes}
        updateReturnStatus={updateReturnStatus}
        returnUpdating={returnUpdating}
        downloadShippingPDF={downloadShippingPDF}
        handleBillUpload={handleBillUpload}
        uploading={uploading}
        fileInputRef={fileInputRef}
        toast={toast}
      />
    </div>
  )
}
