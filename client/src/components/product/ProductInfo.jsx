import { Heart, Star } from 'lucide-react'
import { motion } from 'framer-motion'

export default function ProductInfo({ category, name, rating, numReviews, isWishlisted, onWishlistToggle }) {
  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
      <span className="text-xs text-primary-500 uppercase tracking-widest font-medium">{category}</span>
      <div className="flex items-start justify-between gap-4 mt-2 mb-4">
        <h1 className="font-display text-3xl font-bold text-dark-text">{name}</h1>
        <button
          type="button"
          onClick={onWishlistToggle}
          className={`p-3 rounded-2xl border transition-all ${
            isWishlisted
              ? 'bg-red-500 text-white border-red-500 shadow-[0_0_28px_rgba(239,68,68,0.25)]'
              : 'border-dark-border text-dark-muted hover:text-red-400 hover:border-red-500/40'
          }`}
          aria-label={`${isWishlisted ? 'Remove from' : 'Add to'} wishlist`}
        >
          <Heart size={20} className={isWishlisted ? 'fill-current' : ''} />
        </button>
      </div>

      {numReviews > 0 && (
        <div className="flex items-center gap-2 mb-4">
          <div className="flex">
            {[...Array(5)].map((_, i) => (
              <Star key={i} size={16} className={i < Math.round(rating) ? 'fill-yellow-400 text-yellow-400' : 'text-dark-border'} />
            ))}
          </div>
          <span className="text-sm text-dark-muted">{rating.toFixed(1)} ({numReviews} reviews)</span>
        </div>
      )}
    </motion.div>
  )
}
