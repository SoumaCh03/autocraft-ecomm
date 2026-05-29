import { RotateCcw } from 'lucide-react'
import OrderTracking from './OrderTracking'
import OrderReturn from './OrderReturn'
import OrderActions from './OrderActions'

const STATUS_OPTIONS = ['pending', 'processing', 'shipped', 'delivered', 'cancelled']

export default function OrderCard({ order, updateStatus, setPaymentStatus, trackingForms, handleTrackingChange, saveTracking, trackingSaving, returnNotes, setReturnNotes, updateReturnStatus, returnUpdating, downloadShippingPDF, handleBillUpload, uploading, fileInputRef, toast }) {
  const hasReturn = order.returnRequest?.requested
  const returnRequests = order.returnRequest?.status === 'requested' ? 1 : 0

  return (
    <div className={`card p-5 ${hasReturn ? 'border-blue-500/30' : ''}`}>
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-4">
        <div>
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <p className="text-xs text-dark-muted">Order ID</p>
            {order.paymentMethod && (
              <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold border tracking-wide font-mono ${
                order.paymentMethod === 'cod'
                  ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                  : 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'
              }`}>
                {order.paymentMethod.toUpperCase()}
              </span>
            )}
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
          <select
            value={order.isPaid ? 'paid' : 'unpaid'}
            onChange={(e) => {
              const targetPaid = e.target.value === 'paid';
              if (window.confirm(`Are you sure you want to mark this order as ${targetPaid ? 'PAID' : 'UNPAID'}?`)) {
                setPaymentStatus(order._id, targetPaid);
              }
            }}
            className={`input-field py-1.5 text-xs w-40 font-medium ${
              order.isPaid
                ? 'bg-green-500/10 text-green-400 border-green-500/30'
                : 'bg-red-500/10 text-red-400 border-red-500/30'
            }`}
          >
            <option value="unpaid" className="bg-dark-bg text-red-400">✗ Unpaid</option>
            <option value="paid" className="bg-dark-bg text-green-400">✓ Paid</option>
          </select>
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

      <OrderTracking order={order} trackingForms={trackingForms} handleTrackingChange={handleTrackingChange} saveTracking={saveTracking} trackingSaving={trackingSaving} />

      <OrderReturn order={order} returnNotes={returnNotes} setReturnNotes={setReturnNotes} updateReturnStatus={updateReturnStatus} returnUpdating={returnUpdating} />

      <OrderActions order={order} downloadShippingPDF={downloadShippingPDF} handleBillUpload={handleBillUpload} uploading={uploading} fileInputRef={fileInputRef} toast={toast} />
    </div>
  )
}
