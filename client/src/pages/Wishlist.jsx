import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Heart, ShoppingCart, Trash2 } from 'lucide-react'
import { Helmet } from 'react-helmet-async'
import toast from 'react-hot-toast'
import { useWishlist } from '../context/WishlistContext'
import { useCart } from '../context/CartContext'

export default function Wishlist() {
  const { wishlist, loading, toggleWishlist } = useWishlist()
  const { addToCart } = useCart()

  const handleAddToCart = async (product, moveToCart = false) => {
    if (product.isOutOfStock || Number(product.stock || 0) <= 0) {
      return toast.error('Out of stock')
    }

    const added = addToCart(product)

    if (!added) {
      return toast.error('Out of stock')
    }

    if (moveToCart) {
      const removed = await toggleWishlist(product)

      if (removed === false) {
        toast.success('Moved to cart')
      }
    } else {
      toast.success('Added to cart')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <>
      <Helmet><title>My Wishlist - AUTOCRAFT</title></Helmet>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-28 pb-16">
        <div className="mb-8">
          <p className="text-xs text-primary-500 uppercase tracking-widest font-semibold mb-2">Saved Garage</p>
          <h1 className="font-display text-3xl font-bold text-dark-text">My Wishlist</h1>
          <p className="text-dark-muted text-sm mt-1">{wishlist.length} saved product{wishlist.length === 1 ? '' : 's'}</p>
        </div>

        {wishlist.length === 0 ? (
          <div className="card p-12 text-center">
            <Heart size={52} className="text-dark-border mx-auto mb-4" />
            <p className="font-semibold text-dark-text mb-1">No wishlist items yet</p>
            <p className="text-dark-muted text-sm mb-6">Save products you love and return when you are ready.</p>
            <Link to="/shop" className="btn-primary">Explore Products</Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            {wishlist.map((product, index) => (
              <motion.div
                key={product._id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.04 }}
                className="card flex flex-col overflow-hidden group hover:border-primary-500/35 transition-all"
              >
                <Link to={`/product/${product._id}`} className="block aspect-square bg-dark-border/50 relative overflow-hidden shrink-0">
                  {product.images?.[0] ? (
                    <img src={product.images[0]} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-dark-muted/25 font-display text-4xl font-bold">AC</div>
                  )}
                  {(product.isOutOfStock || Number(product.stock || 0) <= 0) && (
                    <span className="absolute top-3 left-3 bg-red-500 text-white text-[10px] font-bold px-2 py-1 rounded-full uppercase">
                      Out of Stock
                    </span>
                  )}
                </Link>
                
                <div className="p-4 flex flex-col flex-1">
                  <p className="text-xs text-primary-500 capitalize mb-1">{product.category}</p>
                  <Link to={`/product/${product._id}`} className="text-sm font-medium text-dark-text line-clamp-2 hover:text-primary-500 transition-colors">
                    {product.name}
                  </Link>
                  
                  {/* Pushed to the bottom using mt-auto */}
                  <div className="mt-auto pt-4">
                    {/* Price & Stock Row */}
                    <div className="mb-3">
                      <p className="font-display font-bold text-lg text-dark-text">
                        Rs.{Number(product.price || 0).toLocaleString('en-IN')}
                      </p>
                      {Number(product.stock || 0) > 0 && Number(product.stock || 0) <= 5 && (
                        <p className="text-xs font-medium text-orange-400 mt-0.5">Only {product.stock} left</p>
                      )}
                    </div>

                    {/* Actions Row */}
                    <div className="flex items-center justify-between gap-3">
                      <button
                        onClick={() => handleAddToCart(product)}
                        className="
                          w-11 h-11 shrink-0
                          rounded-2xl
                          bg-primary-500
                          hover:bg-primary-400
                          text-white
                          flex items-center justify-center
                          transition-all duration-300
                          hover:shadow-[0_0_20px_rgba(59,107,255,0.22)]
                          active:scale-95
                        "
                        aria-label={`Add ${product.name} to cart`}
                        title="Add to Cart"
                      >
                        <ShoppingCart size={18} />
                      </button>

                      <button
                        onClick={() => handleAddToCart(product, true)}
                        className="
                          flex-1 h-11 min-w-0
                          rounded-2xl
                          border border-primary-500/20
                          bg-primary-500/5
                          text-primary-400
                          hover:bg-primary-500/10
                          hover:border-primary-500/40
                          transition-all duration-300
                          text-sm font-semibold
                          whitespace-nowrap
                          backdrop-blur-sm
                          flex items-center justify-center
                          px-4
                        "
                      >
                        Move to Cart
                      </button>

                      <button
                        onClick={() => toggleWishlist(product)}
                        className="
                          w-11 h-11 shrink-0
                          rounded-2xl
                          bg-red-500/10
                          hover:bg-red-500/20
                          text-red-400
                          border border-red-500/10
                          flex items-center justify-center
                          transition-all duration-300
                          active:scale-95
                        "
                        aria-label={`Remove ${product.name} from wishlist`}
                        title="Remove from Wishlist"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>

                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </>
  )
}

