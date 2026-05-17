import { useState, useEffect } from 'react'
import { useParams, useSearchParams, Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { SlidersHorizontal, Star, ShoppingCart, X } from 'lucide-react'
import axios from 'axios'
import toast from 'react-hot-toast'
import { useCart } from '../context/CartContext'
import { Helmet } from 'react-helmet-async'

import BASE_URL from '../utils/api'

const API = BASE_URL

const CATEGORIES = [
  { label: 'All',         slug: '' },
  { label: 'Exterior',    slug: 'exterior' },
  { label: 'Interior',    slug: 'interior' },
  { label: 'Lighting',    slug: 'lighting' },
  { label: 'Electronics', slug: 'electronics' },
  { label: 'Car Care',    slug: 'car-care' },
  { label: 'Dashboard',   slug: 'dashboard' },
]

const SORT_OPTIONS = [
  { label: 'Latest',             value: '' },
  { label: 'Price: Low → High',  value: 'price-asc' },
  { label: 'Price: High → Low',  value: 'price-desc' },
  { label: 'Top Rated',          value: 'rating' },
  { label: 'Most Reviewed',      value: 'relevance' },
]

const formatCategoryTitle = (slug) => {
  const match = CATEGORIES.find((cat) => cat.slug === slug)
  return match?.label || slug.charAt(0).toUpperCase() + slug.slice(1)
}

export default function ShopPage() {
  const { category: catParam } = useParams()
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()
  const { addToCart } = useCart()

  const [products, setProducts] = useState([])
  const [loading,  setLoading]  = useState(true)
  const [total,    setTotal]    = useState(0)
  const [page,     setPage]     = useState(1)
  const [pages,    setPages]    = useState(1)

  const [category, setCategory] = useState(catParam || '')
  const [sort,     setSort]     = useState('')
  const [search,   setSearch]   = useState(searchParams.get('search') || '')

  const brand = searchParams.get('brand') || ''
  const model = searchParams.get('model') || ''

  useEffect(() => {
    setCategory(catParam || '')
    setPage(1)
  }, [catParam])

  useEffect(() => {
    setSearch(searchParams.get('search') || '')
    setPage(1)
  }, [searchParams])

  useEffect(() => {
    fetchProducts()
  }, [category, sort, page, brand, model, search])

  const fetchProducts = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (category) params.set('category', category)
      if (sort)     params.set('sort', sort)
      if (brand)    params.set('brand', brand)
      if (model)    params.set('model', model)
      if (search)   params.set('search', search)
      params.set('page',  page)
      params.set('limit', 12)

      const { data } = await axios.get(`${API}/products?${params}`)
      setProducts(data.products)
      setTotal(data.total)
      setPages(data.pages)
    } catch {
      toast.error('Failed to load products')
    } finally {
      setLoading(false)
    }
  }

  const goToCategory = (slug) => {
    setCategory(slug)
    setPage(1)

    const query = searchParams.toString()
    navigate({
      pathname: slug ? `/shop/${slug}` : '/shop',
      search: query ? `?${query}` : '',
    })
  }

  const handleAddToCart = (product) => {
    if (product.isOutOfStock || Number(product.stock || 0) <= 0) {
      return toast.error('Out of stock')
    }

    const added = addToCart(product)
    if (added === false) return toast.error('Out of stock')

    toast.success('Added to cart!')
  }

  const clearFilter = (filter) => {
    if (filter === 'category') {
      setCategory('')
      setPage(1)

      const query = searchParams.toString()
      navigate({
        pathname: '/shop',
        search: query ? `?${query}` : '',
      })
      return
    }

    if (filter === 'search') setSearch('')

    if (filter === 'brand' || filter === 'model' || filter === 'search') {
      const params = new URLSearchParams(searchParams)
      params.delete(filter)
      if (filter === 'brand') params.delete('model')
      setSearchParams(params)
    }

    setPage(1)
  }

  const clearAllFilters = () => {
    setCategory('')
    setSort('')
    setSearch('')
    setPage(1)
    setSearchParams(new URLSearchParams())
    navigate('/shop')
  }

  const activeFilters = [
    brand    && { label: `Brand: ${brand}`,       clear: 'brand' },
    model    && { label: `Model: ${model}`,       clear: 'model' },
    category && { label: `Cat: ${category}`,      clear: 'category' },
    search   && { label: `Search: "${search}"`,   clear: 'search' },
  ].filter(Boolean)

  return (
    <>
      <Helmet>
        <title>Shop — AUTOCRAFT</title>
      </Helmet>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-28 pb-16">

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="font-display text-3xl font-bold text-dark-text">
              {brand
                ? `${brand} ${model ? `— ${model}` : ''}`
                : category
                  ? formatCategoryTitle(category)
                  : 'All Products'}
            </h1>
            <p className="text-dark-muted text-sm mt-1">{total} products found</p>
          </div>

          <div className="flex items-center gap-2">
            <SlidersHorizontal size={16} className="text-dark-muted" />
            <select
              value={sort}
              onChange={(e) => { setSort(e.target.value); setPage(1) }}
              className="input-field py-2 text-sm w-48"
              aria-label="Sort products"
            >
              {SORT_OPTIONS.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
        </div>

        {activeFilters.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-6">
            {activeFilters.map((f) => (
              <span key={f.label} className="flex items-center gap-1.5 px-3 py-1 bg-primary-500/10 border border-primary-500/30 rounded-full text-xs text-primary-500">
                {f.label}
                <button
                  type="button"
                  aria-label={`Clear ${f.label}`}
                  onClick={() => clearFilter(f.clear)}
                >
                  <X size={12} />
                </button>
              </span>
            ))}
          </div>
        )}

        <div className="flex gap-2 overflow-x-auto pb-2 mb-8 scrollbar-hide">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.slug}
              type="button"
              onClick={() => goToCategory(cat.slug)}
              className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
                category === cat.slug
                  ? 'bg-primary-500 text-white'
                  : 'bg-dark-card border border-dark-border text-dark-muted hover:text-dark-text'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
            {[...Array(12)].map((_, i) => (
              <div
                key={i}
                className="group relative overflow-hidden rounded-3xl border border-dark-border/80 bg-dark-card/80 shadow-[0_18px_60px_rgba(0,0,0,0.28)]"
              >
                <div className="absolute -inset-px rounded-3xl bg-gradient-to-br from-primary-500/20 via-white/5 to-transparent opacity-60" />
                <div className="absolute inset-0 overflow-hidden rounded-3xl">
                  <div className="absolute inset-y-0 -left-full w-2/3 bg-gradient-to-r from-transparent via-white/12 to-transparent animate-shimmer" />
                </div>

                <div className="relative">
                  <div className="aspect-square bg-gradient-to-br from-dark-border/90 via-dark-card to-dark-card relative overflow-hidden">
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_35%_20%,rgba(255,255,255,0.12),transparent_32%)]" />
                    <div className="absolute top-3 left-3 h-5 w-16 rounded-full bg-dark-border/80 shadow-[0_0_24px_rgba(255,255,255,0.04)]" />
                    <div className="absolute bottom-4 left-4 right-4 h-24 rounded-3xl bg-gradient-to-t from-primary-500/10 to-transparent blur-xl" />
                  </div>

                  <div className="p-4">
                    <div className="h-3 w-20 rounded-full bg-dark-border/80 mb-3" />

                    <div className="space-y-2 mb-3">
                      <div className="h-4 rounded-full bg-dark-border/80 w-full" />
                      <div className="h-4 rounded-full bg-dark-border/60 w-3/4" />
                    </div>

                    <div className="flex items-center gap-1.5 mb-4">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <div key={star} className="h-3 w-3 rounded-full bg-dark-border/70" />
                      ))}
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="space-y-2">
                        <div className="h-5 w-20 rounded-full bg-dark-border/80" />
                        <div className="h-3 w-14 rounded-full bg-dark-border/50" />
                      </div>

                      <div className="w-11 h-11 rounded-2xl bg-primary-500/20 border border-primary-500/25 shadow-[0_0_28px_rgba(59,130,246,0.12)]" />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-4xl mb-4">🚗</p>
            <p className="text-dark-text font-semibold text-lg">No products found</p>
            <p className="text-dark-muted text-sm mt-1">Try changing your filters</p>
            <button
              type="button"
              onClick={clearAllFilters}
              className="btn-primary mt-4 text-sm"
            >
              Clear Filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
            {products.map((product, i) => (
              <motion.div
                key={product._id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                whileHover={{ y: -6 }}
                transition={{ duration: 0.3, delay: i * 0.05 }}
                className="card relative overflow-hidden group border-dark-border/80 bg-dark-card/85 shadow-[0_16px_46px_rgba(0,0,0,0.24)] transition-all duration-300 hover:border-primary-500/35 hover:shadow-[0_24px_70px_rgba(0,0,0,0.36),0_0_34px_rgba(59,130,246,0.12)]"
              >
                <div className="pointer-events-none absolute -inset-px rounded-[inherit] bg-gradient-to-br from-primary-500/0 via-white/0 to-primary-500/0 opacity-0 transition-opacity duration-500 group-hover:opacity-100 group-hover:from-primary-500/16 group-hover:via-white/5" />
                <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(255,255,255,0.10),transparent_38%)] opacity-0 transition-opacity duration-500 group-hover:opacity-100" />

                <Link to={`/product/${product._id}`}>
                  <div className="aspect-square bg-dark-border/50 relative overflow-hidden">
                    <div className="pointer-events-none absolute inset-0 z-10 bg-gradient-to-t from-black/28 via-transparent to-white/5 opacity-70 transition-opacity duration-500 group-hover:opacity-95" />
                    {product.images?.[0] ? (
                      <img
                        src={product.images[0]}
                        alt={product.name}
                        className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-110"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-dark-muted/20 font-display text-4xl font-bold">AC</div>
                    )}
                    {(product.isOutOfStock || Number(product.stock || 0) <= 0) && (
                      <div className="absolute inset-0 z-20 bg-black/60 flex items-center justify-center">
                        <span className="bg-red-500 text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg">OUT OF STOCK</span>
                      </div>
                    )}
                    {product.mrp > product.price && (
                      <div className="absolute top-2 left-2 z-20 bg-green-500/95 text-white text-xs font-bold px-2.5 py-1 rounded-full shadow-[0_8px_24px_rgba(34,197,94,0.28)] backdrop-blur-sm">
                        {Math.round((1 - product.price / product.mrp) * 100)}% OFF
                      </div>
                    )}
                  </div>
                </Link>

                <div className="relative p-4">
                  <p className="text-xs text-primary-500 mb-1 capitalize">{product.category}</p>

                  <Link to={`/product/${product._id}`}>
                    <h3 className="text-sm font-medium text-dark-text line-clamp-2 group-hover:text-primary-500 transition-colors duration-300">
                      {product.name}
                    </h3>
                  </Link>

                  <div className="flex items-center gap-1 mt-1">
                    <Star size={14} className="text-yellow-400 fill-yellow-400 drop-shadow-[0_0_8px_rgba(250,204,21,0.25)]" />
                    <span className="text-xs text-dark-muted">
                      {product.rating || 4.5}
                    </span>
                  </div>

                  <div className="flex items-center justify-between mt-3">
                    <div>
                      <p className="text-base font-semibold text-dark-text">
                        ₹{product.price}
                      </p>
                      {product.mrp > product.price && (
                        <p className="text-xs text-dark-muted line-through">
                          ₹{product.mrp}
                        </p>
                      )}
                    </div>

                    <button
                      type="button"
                      aria-label={`Add ${product.name} to cart`}
                      onClick={() => handleAddToCart(product)}
                      disabled={product.isOutOfStock || Number(product.stock || 0) <= 0}
                      className={`p-2 rounded-xl transition-all duration-300 ${
                        product.isOutOfStock || Number(product.stock || 0) <= 0
                          ? 'bg-dark-border text-dark-muted cursor-not-allowed'
                          : 'bg-primary-500 text-white hover:bg-primary-600 hover:shadow-[0_0_26px_rgba(59,130,246,0.35)] active:scale-95'
                      }`}
                    >
                      <ShoppingCart size={16} />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {!loading && pages > 1 && (
          <div className="flex justify-center gap-2 mt-10">
            {[...Array(pages)].map((_, i) => {
              const pageNo = i + 1
              return (
                <button
                  key={pageNo}
                  type="button"
                  onClick={() => setPage(pageNo)}
                  className={`w-9 h-9 rounded-lg text-sm font-medium transition-all ${
                    page === pageNo
                      ? 'bg-primary-500 text-white'
                      : 'bg-dark-card border border-dark-border text-dark-muted hover:text-dark-text'
                  }`}
                >
                  {pageNo}
                </button>
              )
            })}
          </div>
        )}
      </div>
    </>
  )
}
