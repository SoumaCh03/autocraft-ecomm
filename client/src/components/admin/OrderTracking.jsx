import { Truck, Save } from 'lucide-react'

export default function OrderTracking({ order, trackingForms, handleTrackingChange, saveTracking, trackingSaving }) {
  const canAddTracking = ['shipped', 'delivered'].includes(order.status)

  if (!canAddTracking) return null

  return (
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
  )
}
