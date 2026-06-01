import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Shield, Truck, Package, Heart, Star, Mail, BadgeCheck, ShoppingCart } from 'lucide-react'
import { motion } from 'framer-motion'
import axios from 'axios'
import toast from 'react-hot-toast'
import { useCart } from '../context/CartContext'
import { useAuth } from '../context/AuthContext'
import { useWishlist } from '../context/WishlistContext'
import BASE_URL from '../utils/api'
import Skeleton from '../components/ui/Skeleton'
import ProductSEO from '../components/product/ProductSEO'
import ProductVariants from '../components/product/ProductVariants'
import RecentlyViewed from '../components/product/RecentlyViewed'
import useCategories from '../hooks/useCategories'
import { getCategoryDisplayName } from '../utils/categories'

const API = BASE_URL

export default function ProductPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { addToCart } = useCart()
  const { user } = useAuth()
  const { isWishlisted, toggleWishlist } = useWishlist()
  const { categories } = useCategories()

  const [product, setProduct] = useState(null)
  const [loading, setLoading] = useState(true)
  const [qty, setQty] = useState(1)
  const [imgIdx, setImgIdx] = useState(0)
  const [selectedVariant, setSelectedVariant] = useState(null)
  const [review, setReview] = useState({ rating: 5, comment: '' })
  const [submitting, setSubmitting] = useState(false)
  const [notifyEmail, setNotifyEmail] = useState('')
  const [notifying, setNotifying] = useState(false)
  const [recentlyViewed, setRecentlyViewed] = useState([])

  useEffect(() => {
    const fetch = async () => {
      try {
        const { data } = await axios.get(`${API}/products/${id}`)
        const fetchedProduct = data.product

        setProduct(fetchedProduct)
        setQty(1)
        setImgIdx(0)

        const fetchedVariants =
          fetchedProduct.variants?.filter((variant) => variant?.name) || []

        if (fetchedVariants.length > 0) {
          setSelectedVariant(fetchedVariants[0])
        } else {
          setSelectedVariant(null)
        }
      } catch {
        toast.error('Product not found')
        navigate('/shop')
      } finally {
        setLoading(false)
      }
    }
    fetch()
  }, [id, navigate])

  useEffect(() => {
    if (!product?._id) return

    try {
      const existing =
        JSON.parse(localStorage.getItem('autocraft-recently-viewed')) || []

      const filtered = existing.filter(
        (item) => item._id !== product._id
      )

      const updated = [product, ...filtered].slice(0, 10)

      localStorage.setItem(
        'autocraft-recently-viewed',
        JSON.stringify(updated)
      )

      const visibleProducts = updated.filter(
        (item) => item._id !== product._id
      )

      setRecentlyViewed(visibleProducts)
    } catch (err) {
      console.error('Recently viewed failed:', err)
    }
  }, [product])

  useEffect(() => {
    if (user?.email) setNotifyEmail(user.email)
  }, [user])

  const productVariants =
    product?.variants?.filter((variant) => variant?.name) || []

  const displayProduct = selectedVariant
    ? {
        ...product,
        price: selectedVariant.price ?? product.price,
        mrp: selectedVariant.mrp ?? product.mrp,
        stock: selectedVariant.stock ?? product.stock,
        images: selectedVariant.images?.length
          ? selectedVariant.images
          : product.images,
      }
    : product

  const isOutOfStock = displayProduct?.isOutOfStock || Number(displayProduct?.stock || 0) <= 0

  const handleVariantSelect = (variant) => {
    setSelectedVariant(variant)
    setImgIdx(0)
    setQty(1)
  }

  const handleAddToCart = () => {
    if (isOutOfStock) return toast.error('Out of stock')
    const added = addToCart(product, qty, selectedVariant)
    if (!added) return toast.error('Out of stock')
    toast.success(`${qty} item(s) added to cart!`)
  }

  const handleRecentlyViewedAddToCart = (product) => {
    if (product.isOutOfStock || Number(product.stock || 0) <= 0) {
      return toast.error('Out of stock')
    }

    const added = addToCart(product)

    if (added === false) {
      return toast.error('Out of stock')
    }

    toast.success('Added to cart!')
  }

  const handleBuyNow = () => {
    if (isOutOfStock) return toast.error('Out of stock')
    const added = addToCart(product, qty, selectedVariant)
    if (!added) return toast.error('Out of stock')
    navigate('/cart')
  }

  const handleNotifyMe = async (e) => {
    e.preventDefault()
    if (!notifyEmail.trim()) return toast.error('Please enter your email')
    setNotifying(true)

    try {
      const { data } = await axios.post(`${API}/products/${id}/notify`, { email: notifyEmail.trim() }, { withCredentials: true })
      toast.success(data.message || 'We will notify you when this product is back in stock')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Notify request failed')
    } finally {
      setNotifying(false)
    }
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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-28 pb-16">
      <div className="mb-8">
        <Skeleton className="h-5 w-24 rounded-lg" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        {/* Left Image Section */}
        <div>
          <Skeleton className="aspect-square rounded-3xl border border-dark-border" />

          <div className="flex gap-3 mt-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton
                key={i}
                className="w-16 h-16 rounded-xl border border-dark-border"
              />
            ))}
          </div>
        </div>

        {/* Right Content Section */}
        <div>
          <Skeleton className="h-4 w-28 mb-4" />

          <Skeleton className="h-12 w-4/5 mb-4 rounded-xl" />

          <div className="flex gap-2 mb-6">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="w-5 h-5 rounded-full" />
            ))}
            <Skeleton className="h-5 w-24 ml-2" />
          </div>

          <div className="flex items-center gap-4 mb-6">
            <Skeleton className="h-12 w-36 rounded-xl" />
            <Skeleton className="h-8 w-24 rounded-xl" />
          </div>

          <div className="space-y-3 mb-8">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-11/12" />
            <Skeleton className="h-4 w-10/12" />
            <Skeleton className="h-4 w-8/12" />
          </div>

          <Skeleton className="h-24 rounded-2xl mb-6" />

          <div className="flex items-center gap-2 mb-6">
            <Skeleton className="w-3 h-3 rounded-full" />
            <Skeleton className="h-4 w-40" />
          </div>

          <div className="flex items-center gap-3 mb-6">
            <Skeleton className="h-12 w-36 rounded-xl" />
          </div>

          <div className="flex gap-3 mb-8">
            <Skeleton className="h-14 flex-1 rounded-2xl" />
            <Skeleton className="h-14 flex-1 rounded-2xl" />
          </div>

          <div className="grid grid-cols-3 gap-3">
            {[1, 2, 3].map((i) => (
              <Skeleton
                key={i}
                className="h-28 rounded-2xl border border-dark-border"
              />
            ))}
          </div>
        </div>
      </div>

      {/* Reviews Skeleton */}
      <div className="mt-16">
        <Skeleton className="h-10 w-64 mb-8 rounded-xl" />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2].map((i) => (
            <Skeleton
              key={i}
              className="h-40 rounded-2xl border border-dark-border"
            />
          ))}
        </div>
      </div>
    </div>
  )

  if (!product) return null

  const discount = displayProduct.mrp > displayProduct.price
    ? Math.round((1 - displayProduct.price / displayProduct.mrp) * 100)
    : 0
  const lowStock = !isOutOfStock && Number(displayProduct.stock || 0) <= 5

  return (
    <>
      <ProductSEO product={product} displayProduct={displayProduct} isOutOfStock={isOutOfStock} />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-28 pb-16">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-dark-muted hover:text-dark-text text-sm mb-8 transition-colors">
          <ArrowLeft size={15} /> Back
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
            <div className="aspect-square rounded-2xl overflow-hidden bg-dark-card border border-dark-border mb-4 relative">
              {displayProduct.images?.[imgIdx] ? (
                <img src={displayProduct.images[imgIdx]} alt={product.name} className={`w-full h-full object-cover ${isOutOfStock ? 'opacity-60 grayscale' : ''}`} />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-dark-muted/20 font-display text-6xl font-bold">AC</div>
              )}

              {isOutOfStock && (
                <div className="absolute top-4 left-4 bg-red-500 text-white text-xs font-bold px-3 py-1.5 rounded-full uppercase tracking-wide shadow-lg">
                  Out of Stock
                </div>
              )}
            </div>

            {displayProduct.images?.length > 1 && (
              <div className="flex gap-3">
                {displayProduct.images.map((img, i) => (
                  <button key={i} onClick={() => setImgIdx(i)} className={`w-16 h-16 rounded-xl overflow-hidden border-2 transition-all ${imgIdx === i ? 'border-primary-500' : 'border-dark-border'}`}>
                    <img src={img} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </motion.div>

          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
            <span className="text-xs text-primary-500 uppercase tracking-widest font-medium">{getCategoryDisplayName(product.category, categories)}</span>
            <div className="flex items-start justify-between gap-4 mt-2 mb-4">
              <h1 className="font-display text-3xl font-bold text-dark-text">{product.name}</h1>
              <button
                type="button"
                onClick={() => toggleWishlist(product)}
                className={`p-3 rounded-2xl border transition-all ${
                  isWishlisted(product._id)
                    ? 'bg-red-500 text-white border-red-500 shadow-[0_0_28px_rgba(239,68,68,0.25)]'
                    : 'border-dark-border text-dark-muted hover:text-red-400 hover:border-red-500/40'
                }`}
                aria-label={`${isWishlisted(product._id) ? 'Remove from' : 'Add to'} wishlist`}
              >
                <Heart size={20} className={isWishlisted(product._id) ? 'fill-current' : ''} />
              </button>
            </div>

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

            <div className="flex items-baseline gap-3 mb-6">
              <span className="font-display text-4xl font-bold text-dark-text">₹{displayProduct.price.toLocaleString()}</span>
              {displayProduct.mrp > displayProduct.price && (
                <>
                  <span className="text-xl text-dark-muted line-through">₹{displayProduct.mrp.toLocaleString()}</span>
                  <span className="text-sm bg-green-500/10 text-green-400 px-2 py-0.5 rounded-full font-medium">{discount}% OFF</span>
                </>
              )}
            </div>

            {productVariants.length > 0 && (
              <ProductVariants
                variants={productVariants}
                selectedVariantId={
                  selectedVariant?._id
                }
                onVariantSelect={
                  handleVariantSelect
                }
              />
            )}

            <p className="text-dark-muted leading-relaxed mb-6">{product.description}</p>

            {product.carBrands?.length > 0 && (
              <div className="mb-6 p-4 bg-primary-500/5 border border-primary-500/20 rounded-xl">
                <p className="text-xs text-primary-500 font-medium uppercase tracking-wider mb-2">Compatible With</p>
                <p className="text-sm text-dark-text">{product.carBrands.join(', ')}</p>
                {product.carModels?.length > 0 && (
                  <p className="text-xs text-dark-muted mt-1">{product.carModels.join(', ')}</p>
                )}
              </div>
            )}

            <div className="flex items-center gap-2 mb-6">
              <div className={`w-2 h-2 rounded-full ${isOutOfStock ? 'bg-red-400' : 'bg-green-400'}`} />
              <span className={`text-sm font-medium ${isOutOfStock ? 'text-red-400' : 'text-green-400'}`}>
                {isOutOfStock ? 'Out of Stock' : lowStock ? `Only ${displayProduct.stock} left` : `In Stock (${displayProduct.stock} left)`}
              </span>
            </div>

            {!isOutOfStock ? (
              <>
                <div className="flex items-center gap-3 mb-6">
                  <label className="text-sm text-dark-muted">Qty:</label>
                  <div className="flex items-center gap-2 bg-dark-card border border-dark-border rounded-xl px-3 py-2">
                    <button onClick={() => setQty(q => Math.max(1, q - 1))} className="text-dark-muted hover:text-dark-text w-6 text-center font-bold">−</button>
                    <span className="text-dark-text font-medium w-8 text-center">{qty}</span>
                    <button onClick={() => setQty(q => Math.min(displayProduct.stock, q + 1))} className="text-dark-muted hover:text-dark-text w-6 text-center font-bold">+</button>
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
            ) : (
              <form onSubmit={handleNotifyMe} className="card p-5 mb-8 border-red-500/20 bg-red-500/5">
                <div className="flex items-start gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center shrink-0">
                    <Mail size={18} className="text-red-400" />
                  </div>
                  <div>
                    <p className="font-semibold text-dark-text">Notify Me</p>
                    <p className="text-sm text-dark-muted mt-1">Enter your email and we will notify you when this product is back in stock.</p>
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row gap-3">
                  <input
                    type="email"
                    value={notifyEmail}
                    onChange={(e) => setNotifyEmail(e.target.value)}
                    className="input-field flex-1"
                    placeholder="your@email.com"
                  />
                  <button type="submit" disabled={notifying} className="btn-primary justify-center sm:w-40">
                    {notifying ? 'Saving...' : 'Notify Me'}
                  </button>
                </div>
              </form>
            )}

            <div className="grid grid-cols-3 gap-3">
              {[
                [Truck, 'Free Shipping', 'Above ₹999'],
                [Shield, 'Genuine Product', '100% authentic'],
                [Package, 'Easy Returns', '7 day policy'],
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
                      {r.verifiedPurchase && (
                        <p className="text-[11px] text-green-400 flex items-center gap-1 mt-0.5">
                          <BadgeCheck size={11} /> Verified Purchase
                        </p>
                      )}
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

          {user && (
            <div className="card p-6 max-w-lg">
              <h3 className="font-semibold text-dark-text mb-4">Write a Review</h3>
              <form onSubmit={handleReview} className="space-y-4">
                <div>
                  <label className="text-sm text-dark-muted mb-1 block">Rating</label>
                  <div className="flex gap-2">
                    {[1,2,3,4,5].map(n => (
                      <button key={n} type="button" onClick={() => setReview(r => ({ ...r, rating: n }))}>
                        <Star size={24} className={n <= review.rating ? 'fill-yellow-400 text-yellow-400' : 'text-dark-border'} />
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-sm text-dark-muted mb-1 block">Comment</label>
                  <textarea value={review.comment} onChange={e => setReview(r => ({ ...r, comment: e.target.value }))} rows={3} className="input-field resize-none" placeholder="Share your experience..." />
                </div>
                <button type="submit" disabled={submitting} className="btn-primary">
                  {submitting ? 'Submitting...' : 'Submit Review'}
                </button>
              </form>
            </div>
          )}
        </div>

          <RecentlyViewed
            products={recentlyViewed}
            categories={categories}
            isWishlisted={isWishlisted}
            toggleWishlist={toggleWishlist}
            handleAddToCart={handleRecentlyViewedAddToCart}
        />
      </div>
    </>
  )
}

