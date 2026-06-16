import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Star, ShoppingCart, Heart } from 'lucide-react'
import { getCategoryDisplayName } from '../../utils/categories'

export default function ShopProductGrid({ products, loading, categories = [], isWishlisted, toggleWishlist, handleAddToCart }) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="card p-4 animate-pulse">
            <div className="aspect-square bg-dark-border rounded-xl mb-3" />
            <div className="h-4 bg-dark-border rounded w-3/4 mb-2" />
            <div className="h-3 bg-dark-border rounded w-1/2" />
          </div>
        ))}
      </div>
    )
  }

  if (products.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-dark-muted mb-4">No products found</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {products.map((product) => (
        <motion.div
          key={product._id}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="card overflow-hidden hover:shadow-lg hover:shadow-primary-500/10 transition-all group"
        >
          <div className="relative aspect-square overflow-hidden bg-dark-border rounded-xl">
            <Link to={`/product/${product._id}`}>
              {product.images?.[0] ? (
                <img src={product.images[0]} alt={product.name} loading="lazy" className={`w-full h-full object-cover group-hover:scale-110 transition-transform duration-300 ${product.isOutOfStock ? 'opacity-50 grayscale' : ''}`} />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-dark-muted text-2xl font-bold">AC</div>
              )}
            </Link>

            {product.isOutOfStock && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm">
                <span className="text-white font-bold text-sm">Out of Stock</span>
              </div>
            )}

            {product.mrp > product.price && (
              <div className="absolute top-3 right-3 bg-green-500 text-white text-xs font-bold px-2 py-1 rounded-full">
                {Math.round((1 - product.price / product.mrp) * 100)}% OFF
              </div>
            )}

            <button
              type="button"
              onClick={() => toggleWishlist(product)}
              className={`absolute top-3 left-3 p-2 rounded-full transition-all ${isWishlisted(product._id) ? 'bg-red-500 text-white' : 'bg-black/30 text-white hover:bg-black/50'}`}
              aria-label="Toggle wishlist"
            >
              <Heart size={16} className={isWishlisted(product._id) ? 'fill-current' : ''} />
            </button>
          </div>

          <div className="p-4">
            <Link to={`/product/${product._id}`} className="text-sm text-primary-500 hover:text-primary-400">
              {getCategoryDisplayName(product.category, categories)}
            </Link>
            <Link to={`/product/${product._id}`} className="font-semibold text-dark-text line-clamp-2 hover:text-primary-500 transition-colors mt-1">
              {product.name}
            </Link>

            <div className="flex items-center gap-1 mt-2">
              {product.numReviews > 0 && (
                <>
                  <div className="flex">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} size={12} className={i < Math.round(product.rating) ? 'fill-yellow-400 text-yellow-400' : 'text-dark-border'} />
                    ))}
                  </div>
                  <span className="text-xs text-dark-muted">({product.numReviews})</span>
                </>
              )}
            </div>

            <div className="flex items-baseline gap-2 mt-3 mb-4">
              <span className="font-bold text-lg text-dark-text">₹{product.price.toLocaleString()}</span>
              {product.mrp > product.price && (
                <span className="text-sm text-dark-muted line-through">₹{product.mrp.toLocaleString()}</span>
              )}
            </div>

            <button
              onClick={() => handleAddToCart(product)}
              disabled={product.isOutOfStock}
              className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <ShoppingCart size={16} /> Add
            </button>
          </div>
        </motion.div>
      ))}
    </div>
  )
}
