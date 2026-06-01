import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Trash2, Plus, Minus, ShoppingBag, ArrowRight, BadgePercent, X } from 'lucide-react'
import axios from 'axios'
import toast from 'react-hot-toast'
import { useCart } from '../context/CartContext'
import { useAuth } from '../context/AuthContext'
import { Helmet } from 'react-helmet-async'
import BASE_URL from '../utils/api'
import useCategories from '../hooks/useCategories'
import { getCategoryDisplayName } from '../utils/categories'

const API = BASE_URL

export default function CartPage() {
  const { cartItems, removeFromCart, updateQty, cartTotal, clearCart } = useCart()
  const { user } = useAuth()
  const { categories } = useCategories()
  const navigate = useNavigate()
  const [couponCode, setCouponCode] = useState('')
  const [appliedCoupon, setAppliedCoupon] = useState(null)
  const [discount, setDiscount] = useState(0)
  const [couponLoading, setCouponLoading] = useState(false)

  const shipping = cartTotal >= 999 ? 0 : 99
  const grandTotal = Math.max(0, cartTotal - discount + shipping)

  const applyCoupon = async (e) => {
    e.preventDefault()
    if (!user) return toast.error('Please login to apply coupons')
    if (!couponCode.trim()) return toast.error('Enter a coupon code')

    setCouponLoading(true)
    try {
      const { data } = await axios.post(`${API}/coupons/validate`, {
        code: couponCode.trim(),
        subtotal: cartTotal,
      }, { withCredentials: true })

      setAppliedCoupon(data.coupon)
      setDiscount(data.discount || 0)
      setCouponCode(data.coupon.code)
      toast.success(data.message || 'Coupon applied')
    } catch (err) {
      setAppliedCoupon(null)
      setDiscount(0)
      toast.error(err.response?.data?.message || 'Coupon validation failed')
    } finally {
      setCouponLoading(false)
    }
  }

  const removeCoupon = () => {
    setAppliedCoupon(null)
    setDiscount(0)
    setCouponCode('')
  }

  const goToCheckout = () => {
    navigate('/checkout', {
      state: {
        cartItems,
        cartTotal,
        shipping,
        grandTotal,
        discount,
        couponCode: appliedCoupon?.code || '',
      },
    })
  }

  if (cartItems.length === 0) return (
    <>
      <Helmet><title>Cart - AUTOCRAFT</title></Helmet>
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
      <Helmet><title>Cart - AUTOCRAFT</title></Helmet>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-28 pb-16">
        <div className="flex items-center justify-between mb-8">
          <h1 className="font-display text-3xl font-bold text-dark-text">Your Cart</h1>
          <button onClick={clearCart} className="text-sm text-red-400 hover:text-red-300 transition-colors">Clear Cart</button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
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
                  {item.selectedVariant && (
                    <p className="text-xs text-primary-400 mt-0.5">Variant: {item.selectedVariant.name}</p>
                  )}
                  <p className="text-xs text-primary-500 capitalize mt-0.5">{getCategoryDisplayName(item.category, categories)}</p>
                  <p className="font-bold text-dark-text mt-1">Rs.{Number(item.price || 0).toLocaleString('en-IN')}</p>
                  {Number(item.stock || 0) > 0 && Number(item.stock || 0) <= 5 && (
                    <p className="text-xs text-orange-400 mt-1">Only {item.stock} left</p>
                  )}
                </div>
                <div className="flex flex-col items-end justify-between">
                  <button onClick={() => removeFromCart(item._id, item.selectedVariant?._id)} className="text-dark-muted hover:text-red-400 transition-colors" aria-label={`Remove ${item.name}`}>
                    <Trash2 size={15} />
                  </button>
                  <div className="flex items-center gap-2 bg-dark-border/50 rounded-xl px-2 py-1">
                    <button onClick={() => updateQty(item._id, item.qty - 1, item.selectedVariant?._id)} className="text-dark-muted hover:text-dark-text" aria-label="Decrease quantity">
                      <Minus size={13} />
                    </button>
                    <span className="text-dark-text text-sm font-medium w-6 text-center">{item.qty}</span>
                    <button onClick={() => updateQty(item._id, item.qty + 1, item.selectedVariant?._id)} className="text-dark-muted hover:text-dark-text" aria-label="Increase quantity">
                      <Plus size={13} />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          <div className="lg:col-span-1">
            <div className="card p-6 sticky top-24">
              <h2 className="font-display text-lg font-bold text-dark-text mb-6">Order Summary</h2>
              <div className="space-y-3 mb-6">
                <div className="flex justify-between text-sm">
                  <span className="text-dark-muted">Subtotal ({cartItems.length} items)</span>
                  <span className="text-dark-text">Rs.{cartTotal.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-dark-muted">Shipping</span>
                  <span className={shipping === 0 ? 'text-green-400' : 'text-dark-text'}>
                    {shipping === 0 ? 'FREE' : `Rs.${shipping}`}
                  </span>
                </div>
                {shipping > 0 && (
                  <p className="text-xs text-dark-muted">Add Rs.{(999 - cartTotal).toLocaleString('en-IN')} more for free shipping</p>
                )}

                <form onSubmit={applyCoupon} className="pt-3 space-y-2">
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <BadgePercent size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-primary-500" />
                      <input
                        value={couponCode}
                        onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                        className="input-field py-2 pl-9 text-sm"
                        placeholder="WELCOME10"
                        disabled={!!appliedCoupon}
                      />
                    </div>
                    {appliedCoupon ? (
                      <button type="button" onClick={removeCoupon} className="btn-outline py-2 px-3" aria-label="Remove coupon">
                        <X size={15} />
                      </button>
                    ) : (
                      <button type="submit" disabled={couponLoading} className="btn-outline py-2 px-4 text-sm">
                        {couponLoading ? 'Checking' : 'Apply'}
                      </button>
                    )}
                  </div>
                  {appliedCoupon && (
                    <p className="text-xs text-green-400">
                      {appliedCoupon.code} saved Rs.{discount.toLocaleString('en-IN')}
                    </p>
                  )}
                </form>

                {discount > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-dark-muted">Discount</span>
                    <span className="text-green-400">-Rs.{discount.toLocaleString('en-IN')}</span>
                  </div>
                )}

                <hr className="border-dark-border" />
                <div className="flex justify-between font-bold">
                  <span className="text-dark-text">Total</span>
                  <span className="text-dark-text text-lg">Rs.{grandTotal.toLocaleString('en-IN')}</span>
                </div>
              </div>

              {user ? (
                <button onClick={goToCheckout} className="btn-primary w-full flex items-center justify-center gap-2">
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
