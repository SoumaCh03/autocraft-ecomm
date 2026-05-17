import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { MapPin, CreditCard } from 'lucide-react'
import axios from 'axios'
import toast from 'react-hot-toast'
import { useCart } from '../context/CartContext'
import { useAuth } from '../context/AuthContext'
import { Helmet } from 'react-helmet-async'

import BASE_URL from '../utils/api'; //adjust the import path as needed

const API = BASE_URL; // from utils/api.js

export default function CheckoutPage() {
  const { state }     = useLocation()
  const navigate      = useNavigate()
  const { clearCart } = useCart()
  const { user }      = useAuth()

  const cartItems  = state?.cartItems  || []
  const cartTotal  = state?.cartTotal  || 0
  const shipping   = state?.shipping   || 0
  const grandTotal = state?.grandTotal || 0
  const discount   = state?.discount   || 0
  const couponCode = state?.couponCode || ''

  const [address, setAddress] = useState({
    name:    user?.name || '',
    phone:   user?.phone || '',
    street:  '',
    city:    '',
    state:   '',
    pincode: '',
  })
  const [loading, setLoading] = useState(false)

  const handleChange = (e) => setAddress({ ...address, [e.target.name]: e.target.value })

  const loadRazorpay = () => {
    return new Promise((resolve) => {
      const script = document.createElement('script')
      script.src = 'https://checkout.razorpay.com/v1/checkout.js'
      script.onload = () => resolve(true)
      script.onerror = () => resolve(false)
      document.body.appendChild(script)
    })
  }

  const handlePlaceOrder = async (e) => {
    e.preventDefault()
    const { name, phone, street, city, state: st, pincode } = address

    if (!name || !phone || !street || !city || !st || !pincode) {
      return toast.error('Please fill all address fields')
    }

    if (cartItems.length === 0) {
      return toast.error('Your cart is empty')
    }

    setLoading(true)

    try {
      const loaded = await loadRazorpay()
      if (!loaded) return toast.error('Payment gateway failed to load')

      // Create order in DB first
      const orderItems = cartItems.map(i => ({
        product: i._id,
        name:    i.name,
        image:   i.images?.[0] || '',
        price:   i.price,
        qty:     i.qty,
      }))

      const { data: orderData } = await axios.post(`${API}/orders`, {
        items:           orderItems,
        shippingAddress: address,
        paymentMethod:   'razorpay',
        itemsPrice:      cartTotal,
        discountPrice:   discount,
        couponCode,
        shippingPrice:   shipping,
        totalPrice:      grandTotal,
      }, { withCredentials: true })

      // ✅ FIXED: send orderId instead of amount
      const { data: rzpData } = await axios.post(`${API}/payment/create-order`, {
        orderId: orderData.order._id,
      }, { withCredentials: true })

      // Open Razorpay checkout
      const options = {
        key:          import.meta.env.VITE_RAZORPAY_KEY_ID || 'YOUR_KEY_ID',
        amount:       rzpData.order.amount,
        currency:     'INR',
        name:         'AUTOCRAFT',
        description:  'Car Accessories Order',
        order_id:     rzpData.order.id,
        prefill: {
          name:    user.name,
          email:   user.email,
          contact: user.phone || address.phone,
        },
        theme: { color: '#3b6bff' },
        handler: async (response) => {
          try {
            const { data: verifiedData } = await axios.post(`${API}/payment/verify`, {
              ...response,
              orderId: orderData.order._id,
            }, { withCredentials: true })

            clearCart()
            navigate('/order-success', { state: { order: verifiedData.order || orderData.order } })

          } catch {
            toast.error('Payment verification failed')
          }
        },
        modal: {
          ondismiss: () => {
            setLoading(false)
            toast.error('Payment cancelled')
          }
        }
      }

      const rzp = new window.Razorpay(options)
      rzp.open()

    } catch (err) {
      toast.error(err.response?.data?.message || 'Order failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Helmet><title>Checkout — AUTOCRAFT</title></Helmet>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-28 pb-16">
        <h1 className="font-display text-3xl font-bold text-dark-text mb-8">Checkout</h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* Address Form */}
          <div className="lg:col-span-2">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="card p-6">
              
              <div className="flex items-center gap-3 mb-6">
                <div className="w-8 h-8 bg-primary-500/10 rounded-lg flex items-center justify-center">
                  <MapPin size={16} className="text-primary-500" />
                </div>
                <h2 className="font-semibold text-dark-text">Delivery Address</h2>
              </div>

              <form onSubmit={handlePlaceOrder} className="space-y-4">
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-dark-muted mb-1">Full Name *</label>
                    <input name="name" value={address.name} onChange={handleChange} className="input-field" placeholder="Your name" />
                  </div>
                  <div>
                    <label className="block text-sm text-dark-muted mb-1">Phone Number *</label>
                    <input name="phone" value={address.phone} onChange={handleChange} className="input-field" placeholder="+91 98765 43210" />
                  </div>
                </div>

                <div>
                  <label className="block text-sm text-dark-muted mb-1">Street Address *</label>
                  <input name="street" value={address.street} onChange={handleChange} className="input-field" placeholder="House no, Street, Area" />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm text-dark-muted mb-1">City *</label>
                    <input name="city" value={address.city} onChange={handleChange} className="input-field" placeholder="City" />
                  </div>
                  <div>
                    <label className="block text-sm text-dark-muted mb-1">State *</label>
                    <input name="state" value={address.state} onChange={handleChange} className="input-field" placeholder="State" />
                  </div>
                  <div>
                    <label className="block text-sm text-dark-muted mb-1">Pincode *</label>
                    <input name="pincode" value={address.pincode} onChange={handleChange} className="input-field" placeholder="700001" />
                  </div>
                </div>

                <div className="flex items-center gap-3 p-4 bg-primary-500/5 border border-primary-500/20 rounded-xl mt-4">
                  <CreditCard size={20} className="text-primary-500 shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-dark-text">Pay via Razorpay</p>
                    <p className="text-xs text-dark-muted">UPI, Cards, Net Banking, Wallets — all supported</p>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="btn-primary w-full flex items-center justify-center gap-2 mt-4 py-4 text-base"
                >
                  {loading
                    ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    : <><CreditCard size={18} /> Pay ₹{grandTotal.toLocaleString()}</>
                  }
                </button>

              </form>
            </motion.div>
          </div>

          {/* Order Summary */}
          <div className="card p-6 h-fit sticky top-24">
            <h2 className="font-semibold text-dark-text mb-4">Order Summary</h2>

            <div className="space-y-3 mb-4">
              {cartItems.map(item => (
                <div key={item._id} className="flex gap-3">
                  <div className="w-12 h-12 rounded-lg bg-dark-border overflow-hidden shrink-0">
                    {item.images?.[0] && <img src={item.images[0]} alt={item.name} className="w-full h-full object-cover" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-dark-text line-clamp-1">{item.name}</p>
                    <p className="text-xs text-dark-muted">Qty: {item.qty}</p>
                  </div>
                  <p className="text-sm font-medium text-dark-text">₹{(item.price * item.qty).toLocaleString()}</p>
                </div>
              ))}
            </div>

            <hr className="border-dark-border my-4" />

            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-dark-muted">Subtotal</span>
                <span className="text-dark-text">₹{cartTotal.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-dark-muted">Shipping</span>
                <span className={shipping === 0 ? 'text-green-400' : 'text-dark-text'}>
                  {shipping === 0 ? 'FREE' : `₹${shipping}`}
                </span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between">
                  <span className="text-dark-muted">Discount {couponCode ? `(${couponCode})` : ''}</span>
                  <span className="text-green-400">-₹{discount.toLocaleString()}</span>
                </div>
              )}
              <hr className="border-dark-border" />
              <div className="flex justify-between font-bold text-base">
                <span className="text-dark-text">Total</span>
                <span className="text-dark-text">₹{grandTotal.toLocaleString()}</span>
              </div>
            </div>

          </div>
        </div>
      </div>
    </>
  )
}

