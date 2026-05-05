import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Trash2, Plus, Minus, ShoppingBag, ArrowRight } from 'lucide-react'
import { useCart } from '../context/CartContext'
import { useAuth } from '../context/AuthContext'
import { Helmet } from 'react-helmet-async'

export default function CartPage() {
  const { cartItems, removeFromCart, updateQty, cartTotal, clearCart } = useCart()
  const { user }    = useAuth()
  const navigate    = useNavigate()

  const shipping    = cartTotal >= 999 ? 0 : 99
  const grandTotal  = cartTotal + shipping

  if (cartItems.length === 0) return (
    <>
      <Helmet><title>Cart — AUTOCRAFT</title></Helmet>
      <div className="min-h-screen flex flex-col items-center justify-center text-center px-4 pt-20">
        <ShoppingBag size={64} className="text-dark-border mb-4" />
        <h2 className="font-display text-2xl font-bold text-dark-text mb-2">Your cart is empty</h2>
        <p className="text-dark-muted mb-6">Add some products to get started</p>
        <Link to="/shop" className="btn-primary">Browse Products</Link>
      </div>
    </>
  )

  return (
    <>
      <Helmet><title>Cart — AUTOCRAFT</title></Helmet>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-28 pb-16">
        <div className="flex items-center justify-between mb-8">
          <h1 className="font-display text-3xl font-bold text-dark-text">Your Cart</h1>
          <button onClick={clearCart} className="text-sm text-red-400 hover:text-red-300 transition-colors">Clear Cart</button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* Items */}
          <div className="lg:col-span-2 space-y-4">
            {cartItems.map((item, i) => (
              <motion.div
                key={item._id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="card p-4 flex gap-4"
              >
                <div className="w-20 h-20 rounded-xl overflow-hidden bg-dark-border shrink-0">
                  {item.images?.[0]
                    ? <img src={item.images[0]} alt={item.name} className="w-full h-full object-cover" />
                    : <div className="w-full h-full flex items-center justify-center text-dark-muted text-xs font-bold">AC</div>
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-dark-text text-sm line-clamp-2">{item.name}</p>
                  <p className="text-xs text-primary-500 capitalize mt-0.5">{item.category}</p>
                  <p className="font-bold text-dark-text mt-1">₹{item.price.toLocaleString()}</p>
                </div>
                <div className="flex flex-col items-end justify-between">
                  <button onClick={() => removeFromCart(item._id)} className="text-dark-muted hover:text-red-400 transition-colors">
                    <Trash2 size={15} />
                  </button>
                  <div className="flex items-center gap-2 bg-dark-border/50 rounded-xl px-2 py-1">
                    <button onClick={() => updateQty(item._id, item.qty - 1)} className="text-dark-muted hover:text-dark-text">
                      <Minus size={13} />
                    </button>
                    <span className="text-dark-text text-sm font-medium w-6 text-center">{item.qty}</span>
                    <button onClick={() => updateQty(item._id, item.qty + 1)} className="text-dark-muted hover:text-dark-text">
                      <Plus size={13} />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Summary */}
          <div className="lg:col-span-1">
            <div className="card p-6 sticky top-24">
              <h2 className="font-display text-lg font-bold text-dark-text mb-6">Order Summary</h2>
              <div className="space-y-3 mb-6">
                <div className="flex justify-between text-sm">
                  <span className="text-dark-muted">Subtotal ({cartItems.length} items)</span>
                  <span className="text-dark-text">₹{cartTotal.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-dark-muted">Shipping</span>
                  <span className={shipping === 0 ? 'text-green-400' : 'text-dark-text'}>
                    {shipping === 0 ? 'FREE' : `₹${shipping}`}
                  </span>
                </div>
                {shipping > 0 && (
                  <p className="text-xs text-dark-muted">Add ₹{(999 - cartTotal).toLocaleString()} more for free shipping</p>
                )}
                <hr className="border-dark-border" />
                <div className="flex justify-between font-bold">
                  <span className="text-dark-text">Total</span>
                  <span className="text-dark-text text-lg">₹{grandTotal.toLocaleString()}</span>
                </div>
              </div>

              {user ? (
                <button
                  onClick={() => navigate('/checkout', { state: { cartItems, cartTotal, shipping, grandTotal } })}
                  className="btn-primary w-full flex items-center justify-center gap-2"
                >
                  Proceed to Checkout <ArrowRight size={16} />
                </button>
              ) : (
                <Link to="/login" className="btn-primary w-full flex items-center justify-center gap-2">
                  Login to Checkout <ArrowRight size={16} />
                </Link>
              )}

              <Link to="/shop" className="block text-center text-sm text-dark-muted hover:text-primary-500 transition-colors mt-4">
                Continue Shopping
              </Link>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

