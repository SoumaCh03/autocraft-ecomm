import { RotateCcw, CheckCircle, XCircle } from 'lucide-react'

export default function OrderReturn({ order, returnNotes, setReturnNotes, updateReturnStatus, returnUpdating }) {
  if (!order.returnRequest?.requested) return null

  const returnBusy = returnUpdating?.startsWith(order._id)

  return (
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
  )
}
