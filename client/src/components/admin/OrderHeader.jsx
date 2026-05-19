import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'

export default function OrderHeader({ ordersLength, returnRequests }) {
  return (
    <div className="mb-8">
      <Link to="/admin" className="flex items-center gap-2 text-dark-muted hover:text-dark-text text-sm mb-2 transition-colors">
        <ArrowLeft size={14} /> Admin Dashboard
      </Link>
      <h1 className="font-display text-3xl font-bold text-dark-text">All Orders</h1>
      <p className="text-dark-muted text-sm mt-1">
        {ordersLength} total orders
        {returnRequests > 0 && (
          <span className="ml-3 text-xs bg-red-500/10 text-red-400 px-2 py-1 rounded-full">
            {returnRequests} return request(s)
          </span>
        )}
      </p>
    </div>
  )
}
