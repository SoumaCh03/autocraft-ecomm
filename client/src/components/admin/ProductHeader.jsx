import { Link } from 'react-router-dom'
import { ArrowLeft, Plus } from 'lucide-react'

export default function ProductHeader({ productsLength, openAdd }) {
  return (
    <div className="flex items-center justify-between mb-8">
      <div>
        <Link to="/admin" className="flex items-center gap-2 text-dark-muted hover:text-dark-text text-sm mb-2 transition-colors">
          <ArrowLeft size={14} /> Admin Dashboard
        </Link>
        <h1 className="font-display text-3xl font-bold text-dark-text">Products</h1>
        <p className="text-dark-muted text-sm mt-1">{productsLength} total products</p>
      </div>
      <button onClick={openAdd} className="btn-primary flex items-center gap-2">
        <Plus size={18} /> Add Product
      </button>
    </div>
  )
}
