import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ShoppingCart, Star, ArrowLeft, Shield, Truck, Package } from 'lucide-react'
import axios from 'axios'
import toast from 'react-hot-toast'
import { useCart } from '../context/CartContext'
import { useAuth } from '../context/AuthContext'
import { Helmet } from 'react-helmet-async'

import BASE_URL from '../utils/api'; // Adjust the import path as needed

const API = BASE_URL; // from utils/api.js

export default function ProductPage() {
  const { id }          = useParams()
  const navigate        = useNavigate()
  const { addToCart }   = useCart()
  const { user }        = useAuth()

  const [product,  setProduct]  = useState(null)
  const [loading,  setLoading]  = useState(true)
  const [qty,      setQty]      = useState(1)
  const [imgIdx,   setImgIdx]   = useState(0)
  const [review,   setReview]   = useState({ rating: 5, comment: '' })
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    const fetch = async () => {
      try {
        const { data } = await axios.get(`${API}/products/${id}`)
        setProduct(data.product)
      } catch {
        toast.error('Product not found')
        navigate('/shop')
      } finally {
        setLoading(false)
      }
    }
    fetch()
  }, [id])

  const handleAddToCart = () => {
    if (product.isOutOfStock) return toast.error('Out of stock')
    addToCart(product, qty)
    toast.success(`${qty} item(s) added to cart!`)
  }

  const handleBuyNow = () => {
    if (product.isOutOfStock) return toast.error('Out of stock')
    addToCart(product, qty)
    navigate('/cart')
  }

  const handleReview = async (e) => {
    e.preventDefault()
    if (!user) return toast.error('Please login to review')
    if (!review.comment.trim()) return toast.error('Please write a comment')
    setSubmitting(true)
    try {
      await axios.post(`${API}/products/${id}/review`, review, { withCredentials: true })
      toast.success('Review submitted!')
      const { data } = await axios.get(`${API}/products/${id}`)
      setProduct(data.product)
      setReview({ rating: 5, comment: '' })
    } catch (err) {
      toast.error(err.response?.data?.message || 'Review failed')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-10 h-10 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  if (!product) return null

  const discount = product.mrp > product.price
    ? Math.round((1 - product.price / product.mrp) * 100)
    : 0

  return (
    <>
      <Helmet>
        <title>{product.name} — AUTOCRAFT</title>
        <meta name="description" content={product.description} />
      </Helmet>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-28 pb-16">

        {/* Back */}
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-dark-muted hover:text-dark-text text-sm mb-8 transition-colors">
          <ArrowLeft size={15} /> Back
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">

          {/* Images */}
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
            <div className="aspect-square rounded-2xl overflow-hidden bg-dark-card border border-dark-border mb-4">
              {product.images?.[imgIdx] ? (
                <img src={product.images[imgIdx]} alt={product.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-dark-muted/20 font-display text-6xl font-bold">AC</div>
              )}
            </div>
            {product.images?.length > 1 && (
              <div className="flex gap-3">
                {product.images.map((img, i) => (
                  <button
                    key={i}
                    onClick={() => setImgIdx(i)}
                    className={`w-16 h-16 rounded-xl overflow-hidden border-2 transition-all ${
                      imgIdx === i ? 'border-primary-500' : 'border-dark-border'
                    }`}
                  >
                    <img src={img} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </motion.div>

          {/* Details */}
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
            <span className="text-xs text-primary-500 uppercase tracking-widest font-medium">{product.category}</span>
            <h1 className="font-display text-3xl font-bold text-dark-text mt-2 mb-4">{product.name}</h1>

            {/* Rating */}
            {product.numReviews > 0 && (
              <div className="flex items-center gap-2 mb-4">
                <div className="flex">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} size={16} className={i < Math.round(product.rating) ? 'fill-yellow-400 text-yellow-400' : 'text-dark-border'} />
                  ))}
                </div>
                <span className="text-sm text-dark-muted">{product.rating.toFixed(1)} ({product.numReviews} reviews)</span>
              </div>
            )}

            {/* Price */}
            <div className="flex items-baseline gap-3 mb-6">
              <span className="font-display text-4xl font-bold text-dark-text">₹{product.price.toLocaleString()}</span>
              {product.mrp > product.price && (
                <>
                  <span className="text-xl text-dark-muted line-through">₹{product.mrp.toLocaleString()}</span>
                  <span className="text-sm bg-green-500/10 text-green-400 px-2 py-0.5 rounded-full font-medium">{discount}% OFF</span>
                </>
              )}
            </div>

            <p className="text-dark-muted leading-relaxed mb-6">{product.description}</p>

            {/* Compatible cars */}
            {product.carBrands?.length > 0 && (
              <div className="mb-6 p-4 bg-primary-500/5 border border-primary-500/20 rounded-xl">
                <p className="text-xs text-primary-500 font-medium uppercase tracking-wider mb-2">Compatible With</p>
                <p className="text-sm text-dark-text">{product.carBrands.join(', ')}</p>
                {product.carModels?.length > 0 && (
                  <p className="text-xs text-dark-muted mt-1">{product.carModels.join(', ')}</p>
                )}
              </div>
            )}

            {/* Stock */}
            <div className="flex items-center gap-2 mb-6">
              <div className={`w-2 h-2 rounded-full ${product.isOutOfStock ? 'bg-red-400' : 'bg-green-400'}`} />
              <span className={`text-sm font-medium ${product.isOutOfStock ? 'text-red-400' : 'text-green-400'}`}>
                {product.isOutOfStock ? 'Out of Stock' : `In Stock (${product.stock} left)`}
              </span>
            </div>

            {/* Qty + Buttons */}
            {!product.isOutOfStock && (
              <>
                <div className="flex items-center gap-3 mb-6">
                  <label className="text-sm text-dark-muted">Qty:</label>
                  <div className="flex items-center gap-2 bg-dark-card border border-dark-border rounded-xl px-3 py-2">
                    <button onClick={() => setQty(q => Math.max(1, q - 1))} className="text-dark-muted hover:text-dark-text w-6 text-center font-bold">−</button>
                    <span className="text-dark-text font-medium w-8 text-center">{qty}</span>
                    <button onClick={() => setQty(q => Math.min(product.stock, q + 1))} className="text-dark-muted hover:text-dark-text w-6 text-center font-bold">+</button>
                  </div>
                </div>

                <div className="flex gap-3 mb-8">
                  <button onClick={handleAddToCart} className="btn-outline flex items-center gap-2 flex-1 justify-center">
                    <ShoppingCart size={18} /> Add to Cart
                  </button>
                  <button onClick={handleBuyNow} className="btn-primary flex-1 justify-center">
                    Buy Now
                  </button>
                </div>
              </>
            )}

            {/* Trust badges */}
            <div className="grid grid-cols-3 gap-3">
              {[
                [Truck,   'Free Shipping', 'Above ₹999'],
                [Shield,  'Genuine Product', '100% authentic'],
                [Package, 'Easy Returns',  '7 day policy'],
              ].map(([Icon, title, sub]) => (
                <div key={title} className="card p-3 text-center">
                  <Icon size={18} className="text-primary-500 mx-auto mb-1" />
                  <p className="text-xs font-medium text-dark-text">{title}</p>
                  <p className="text-xs text-dark-muted">{sub}</p>
                </div>
              ))}
            </div>
          </motion.div>
        </div>

        {/* Reviews */}
        <div className="mt-16">
          <h2 className="font-display text-2xl font-bold text-dark-text mb-8">Customer Reviews</h2>

          {product.reviews?.length === 0 ? (
            <p className="text-dark-muted">No reviews yet. Be the first to review!</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
              {product.reviews.map((r, i) => (
                <div key={i} className="card p-5">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-8 h-8 bg-primary-500/20 rounded-full flex items-center justify-center text-primary-500 text-xs font-bold">
                      {r.name?.[0]?.toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-dark-text">{r.name}</p>
                      <div className="flex">
                        {[...Array(5)].map((_, j) => (
                          <Star key={j} size={10} className={j < r.rating ? 'fill-yellow-400 text-yellow-400' : 'text-dark-border'} />
                        ))}
                      </div>
                    </div>
                  </div>
                  <p className="text-sm text-dark-muted">{r.comment}</p>
                </div>
              ))}
            </div>
          )}

          {/* Add review */}
          {user && (
            <div className="card p-6 max-w-lg">
              <h3 className="font-semibold text-dark-text mb-4">Write a Review</h3>
              <form onSubmit={handleReview} className="space-y-4">
                <div>
                  <label className="text-sm text-dark-muted mb-1 block">Rating</label>
                  <div className="flex gap-2">
                    {[1,2,3,4,5].map(n => (
                      <button
                        key={n}
                        type="button"
                        onClick={() => setReview(r => ({ ...r, rating: n }))}
                      >
                        <Star size={24} className={n <= review.rating ? 'fill-yellow-400 text-yellow-400' : 'text-dark-border'} />
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-sm text-dark-muted mb-1 block">Comment</label>
                  <textarea
                    value={review.comment}
                    onChange={e => setReview(r => ({ ...r, comment: e.target.value }))}
                    rows={3}
                    className="input-field resize-none"
                    placeholder="Share your experience..."
                  />
                </div>
                <button type="submit" disabled={submitting} className="btn-primary">
                  {submitting ? 'Submitting...' : 'Submit Review'}
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </>
  )
}

