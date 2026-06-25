import { useState, useEffect } from 'react'
import { trackEvent } from '../utils/analytics'
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
  const { user, setUser } = useAuth()

  const cartItems  = state?.cartItems  || []
  const cartTotal  = state?.cartTotal  || 0
  const shipping   = state?.shipping   || 0
  const grandTotal = state?.grandTotal || 0
  const discount   = state?.discount   || 0
  const couponCode = state?.couponCode || ''

  useEffect(() => {
    trackEvent('checkout_start', {
      cartItemsCount: cartItems.length,
      cartTotal,
      discount,
      couponCode,
      grandTotal
    })

    trackEvent('checkout_stage', {
      stage: 'checkout_started',
      cartSnapshot: cartItems.map(item => ({
        product: item._id,
        name: item.name,
        qty: item.qty,
        price: item.price,
        image: item.images?.[0] || '',
        selectedVariant: item.selectedVariant ? { id: item.selectedVariant._id, name: item.selectedVariant.name } : undefined
      })),
      cartValue: cartTotal,
      itemsCount: cartItems.reduce((acc, item) => acc + item.qty, 0)
    })
  }, [])
  
  const [paymentMethod, setPaymentMethod] = useState('razorpay')
  const [addressTracked, setAddressTracked] = useState(false)
  const [address, setAddress] = useState({
    name:    user?.name || '',
    phone:   user?.phone || '',
    street:  '',
    city:    '',
    state:   '',
    pincode: '',
  })
  const [loading, setLoading] = useState(false)
  const [saveAddress, setSaveAddress] = useState(false)
  const [addressLabel, setAddressLabel] = useState('Home')

  const handlePaymentMethodSelect = (method) => {
    setPaymentMethod(method)
    trackEvent('checkout_stage', {
      stage: 'payment_method_selected',
      paymentMethod: method
    })
  }

  const handleChange = (e) => setAddress({ ...address, [e.target.name]: e.target.value })

  const handleSelectSavedAddress = (savedAddress) => {
    setAddress((prev) => ({
      ...prev,
      street: savedAddress.street || '',
      city: savedAddress.city || '',
      state: savedAddress.state || '',
      pincode: savedAddress.pincode || '',
    }))

    toast.success('Address selected')
  }

  useEffect(() => {
    const { name, phone, street, city, state: st, pincode } = address
    if (name && phone && street && city && st && pincode && !addressTracked) {
      trackEvent('checkout_stage', {
        stage: 'address_selected',
        name,
        phone,
        shippingAddress: address
      })

      trackEvent('checkout_stage', {
        stage: 'payment_page_opened',
        paymentMethod
      })

      setAddressTracked(true)
    }
  }, [address, addressTracked, paymentMethod])

  const codFee =
    paymentMethod === 'cod'
    ? Math.min(
        Math.ceil(cartTotal * 0.02),
        75
      )
    : 0

  const finalTotal = grandTotal + codFee

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

    trackEvent('payment_start', {
      paymentMethod,
      totalPrice: finalTotal,
      couponCode
    })

    trackEvent('checkout_stage', {
      stage: 'payment_attempted',
      paymentMethod,
      cartValue: cartTotal,
      totalPrice: finalTotal,
      couponCode
    })

    setLoading(true)

    // Save address if enabled
    if (saveAddress && user) {
      try {
        const { data } = await axios.post(
          `${API}/auth/addresses`,
          {
            label: addressLabel,
            street: address.street,
            city: address.city,
            state: address.state,
            pincode: address.pincode,
          },
          {
            withCredentials: true,
          }
        )

        if (data.user) {
          setUser(data.user)
        }
      } catch {
        toast.error('Failed to save address')
      }
    }

    try {
      // COD FLOW
      if (paymentMethod === 'cod') {
        const orderItems = cartItems.map(i => ({
          product: i._id,
          name: i.name,
          image: i.images?.[0] || '',
          price: i.price,
          qty: i.qty,
        }))

        const { data } = await axios.post(
          `${API}/orders`,
          {
            items: orderItems,
            shippingAddress: address,
            paymentMethod: 'cod',
            itemsPrice: cartTotal,
            discountPrice: discount,
            couponCode,
            shippingPrice: shipping,
            totalPrice: finalTotal,
            sessionId: sessionStorage.getItem('autocraft_session_id') || '',
          },
          { withCredentials: true }
        )

        trackEvent('checkout_stage', {
          stage: 'payment_success',
          paymentMethod: 'cod',
          orderId: data.order._id
        })
        trackEvent('checkout_stage', {
          stage: 'order_created',
          orderId: data.order._id
        })

        clearCart()

        navigate('/order-success', {
          state: {
            order: data.order,
          },
        })

        toast.success('Order placed successfully')

        return
      }

      // Razorpay flow
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
        paymentMethod,
        itemsPrice:      cartTotal,
        discountPrice:   discount,
        couponCode,
        shippingPrice:   shipping,
        totalPrice:      finalTotal,
        sessionId:       sessionStorage.getItem('autocraft_session_id') || '',
      }, { withCredentials: true })

      // Send orderId instead of amount
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
          name: user?.name || address.name,
          email: user?.email || '',
          contact: user?.phone || address.phone,
        },
        theme: { color: '#3b6bff' },
        handler: async (response) => {
          try {
            const { data: verifiedData } = await axios.post(`${API}/payment/verify`, {
              ...response,
              orderId: orderData.order._id,
            }, { withCredentials: true })

            trackEvent('checkout_stage', {
              stage: 'payment_success',
              paymentMethod: 'razorpay',
              orderId: orderData.order._id
            })
            trackEvent('checkout_stage', {
              stage: 'order_created',
              orderId: orderData.order._id
            })

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

              {user?.addresses?.length > 0 && (
                <div className="mb-6">
                  <p className="text-xs text-primary-500 font-medium uppercase tracking-wider mb-3">
                    Saved Addresses
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {user.addresses.map((savedAddress, index) => (
                      <button
                        key={index}
                        type="button"
                        onClick={() =>
                          handleSelectSavedAddress(savedAddress)
                        }
                        className="text-left p-4 rounded-2xl border border-primary-500/20 bg-primary-500/5 hover:border-primary-500/50 hover:bg-primary-500/10 transition-all duration-300"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-semibold uppercase tracking-wider text-primary-500">
                            {savedAddress.label || 'Address'}
                          </span>

                          <span className="text-xs text-dark-muted">
                            Deliver Here
                          </span>
                        </div>

                        <p className="text-sm text-dark-text line-clamp-2">
                          {savedAddress.street}
                        </p>

                        <p className="text-xs text-dark-muted mt-2">
                          {savedAddress.city},{' '}
                          {savedAddress.state} —{' '}
                          {savedAddress.pincode}
                        </p>
                      </button>
                    ))}
                  </div>
                </div>
              )}

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

                <div className="p-4 rounded-2xl border border-primary-500/20 bg-primary-500/5 space-y-4">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={saveAddress}
                      onChange={(e) =>
                        setSaveAddress(e.target.checked)
                      }
                      className="w-4 h-4 accent-primary-500"
                    />

                    <span className="text-sm text-dark-text">
                      Save this address
                    </span>
                  </label>

                  {saveAddress && (
                    <div>
                      <label className="block text-sm text-dark-muted mb-2">
                        Address Type
                      </label>

                      <select
                        value={addressLabel}
                        onChange={(e) =>
                          setAddressLabel(e.target.value)
                        }
                        className="input-field"
                      >
                        <option>Home</option>
                        <option>Office</option>
                        <option>Other</option>
                      </select>
                    </div>
                  )}
                </div>

                <div className="space-y-4 mt-4">
                  <p className="text-sm font-semibold text-dark-text">
                    Payment Method
                  </p>

                  <button
                    type="button"
                    onClick={() =>
                      handlePaymentMethodSelect('razorpay')
                    }
                    className={`w-full text-left p-4 rounded-2xl border transition-all ${
                      paymentMethod === 'razorpay'
                        ? 'border-primary-500 bg-primary-500/10'
                        : 'border-dark-border hover:border-primary-500/30'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="radio"
                        checked={paymentMethod === 'razorpay'}
                        readOnly
                      />

                      <div>
                        <p className="font-medium text-dark-text">
                          Online Payment
                        </p>

                        <p className="text-xs text-dark-muted">
                          UPI, Cards, Wallets, Net Banking
                        </p>
                      </div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      handlePaymentMethodSelect('cod')
                    }
                    className={`w-full text-left p-4 rounded-2xl border transition-all ${
                      paymentMethod === 'cod'
                        ? 'border-primary-500 bg-primary-500/10'
                        : 'border-dark-border hover:border-primary-500/30'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <input
                          type="radio"
                          checked={paymentMethod === 'cod'}
                          readOnly
                        />

                        <div>
                          <p className="font-medium text-dark-text">
                            Cash on Delivery
                          </p>

                          <p className="text-xs text-dark-muted">
                            Extra handling fee applies
                          </p>
                        </div>
                      </div>

                      {codFee > 0 && (
                        <span className="text-sm font-semibold text-amber-400">
                          +₹{codFee}
                        </span>
                      )}
                    </div>
                  </button>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="btn-primary w-full flex items-center justify-center gap-2 mt-4 py-4 text-base"
                >
                  {loading
                    ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    : <><CreditCard size={18} /> {paymentMethod === 'cod'
                        ? `Place Order ₹${finalTotal.toLocaleString()}`
                        : `Pay ₹${finalTotal.toLocaleString()}`
                      }</>
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
              
              {paymentMethod === 'cod' && codFee > 0 && (
                <div className="flex justify-between">
                  <span className="text-dark-muted">
                    COD Handling Fee
                  </span>

                  <span className="text-amber-400">
                    ₹{codFee}
                  </span>
                </div>
              )}

              {discount > 0 && (
                <div className="flex justify-between">
                  <span className="text-dark-muted">Discount {couponCode ? `(${couponCode})` : ''}</span>
                  <span className="text-green-400">-₹{discount.toLocaleString()}</span>
                </div>
              )}
              <hr className="border-dark-border" />
              <div className="flex justify-between font-bold text-base">
                <span className="text-dark-text">Total</span>
                <span className="text-dark-text">₹{finalTotal.toLocaleString()}</span>
              </div>
            </div>

          </div>
        </div>
      </div>
    </>
  )
}

