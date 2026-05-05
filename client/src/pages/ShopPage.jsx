import { useState, useEffect } from 'react'
import { useParams, useSearchParams, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { SlidersHorizontal, Star, ShoppingCart, X } from 'lucide-react'
import axios from 'axios'
import toast from 'react-hot-toast'
import { useCart } from '../context/CartContext'
import { Helmet } from 'react-helmet-async'

import BASE_URL from '../utils/api' // Update this to your actual backend URL
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
  { label: 'Latest',        value: '' },
  { label: 'Price: Low → High', value: 'price-asc' },
  { label: 'Price: High → Low', value: 'price-desc' },
  { label: 'Top Rated',     value: 'rating' },
  { label: 'Most Reviewed', value: 'relevance' },
]

export default function ShopPage() {
  const { category: catParam }    = useParams()
  const [searchParams, setSearchParams] = useSearchParams()
  const { addToCart }             = useCart()

  const [products, setProducts]   = useState([])
  const [loading,  setLoading]    = useState(true)
  const [total,    setTotal]      = useState(0)
  const [page,     setPage]       = useState(1)
  const [pages,    setPages]      = useState(1)

  const [category, setCategory]   = useState(catParam || '')
  const [sort,     setSort]       = useState('')
  const [search,   setSearch]     = useState(searchParams.get('search') || '')
  const brand                     = searchParams.get('brand') || ''
  const model                     = searchParams.get('model') || ''

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

  const handleAddToCart = (product) => {
    if (product.isOutOfStock) return toast.error('Out of stock')
    addToCart(product)
    toast.success('Added to cart!')
  }

  const clearFilter = (filter) => {
    if (filter === 'category') setCategory('')
    if (filter === 'search')   setSearch('')

    if (filter === 'brand' || filter === 'model' || filter === 'search') {
      const params = new URLSearchParams(searchParams)
      params.delete(filter)
      if (filter === 'brand') params.delete('model')
      setSearchParams(params)
    }

    setPage(1)
  }

  const activeFilters = [
    brand    && { label: `Brand: ${brand}`,    clear: 'brand' },
    model    && { label: `Model: ${model}`,    clear: 'model' },
    category && { label: `Cat: ${category}`,   clear: 'category' },
    search   && { label: `Search: "${search}"`, clear: 'search' },
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
              {brand ? `${brand} ${model ? `— ${model}` : ''}` : category ? category.charAt(0).toUpperCase() + category.slice(1) : 'All Products'}
            </h1>
            <p className="text-dark-muted text-sm mt-1">{total} products found</p>
          </div>

          <div className="flex items-center gap-2">
            <SlidersHorizontal size={16} className="text-dark-muted" />
            <select
              value={sort}
              onChange={(e) => { setSort(e.target.value); setPage(1) }}
              className="input-field py-2 text-sm w-48"
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
                <button onClick={() => clearFilter(f.clear)}>
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
              onClick={() => { setCategory(cat.slug); setPage(1) }}
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
            {[...Array(8)].map((_, i) => (
              <div key={i} className="card overflow-hidden animate-pulse">
                <div className="aspect-square bg-dark-border" />
                <div className="p-4 space-y-2">
                  <div className="h-3 bg-dark-border rounded w-1/3" />
                  <div className="h-4 bg-dark-border rounded w-3/4" />
                  <div className="h-4 bg-dark-border rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-4xl mb-4">🚗</p>
            <p className="text-dark-text font-semibold text-lg">No products found</p>
            <p className="text-dark-muted text-sm mt-1">Try changing your filters</p>
            <button onClick={() => { setCategory(''); setSort(''); setSearch(''); setSearchParams(new URLSearchParams()) }} className="btn-primary mt-4 text-sm">
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
                transition={{ duration: 0.3, delay: i * 0.05 }}
                className="card overflow-hidden group hover:border-primary-500/30 transition-all duration-300"
              >
                <Link to={`/product/${product._id}`}>
                  <div className="aspect-square bg-dark-border/50 relative overflow-hidden">
                    {product.images?.[0] ? (
                      <img
                        src={product.images[0]}
                        alt={product.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-dark-muted/20 font-display text-4xl font-bold">AC</div>
                    )}
                    {product.isOutOfStock && (
                      <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                        <span className="bg-red-500 text-white text-xs font-bold px-3 py-1 rounded-full">OUT OF STOCK</span>
                      </div>
                    )}
                    {product.mrp > product.price && (
                      <div className="absolute top-2 left-2 bg-green-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                        {Math.round((1 - product.price / product.mrp) * 100)}% OFF
                      </div>
                    )}
                  </div>
                </Link>

                <div className="p-4">
                  <p className="text-xs text-primary-500 mb-1 capitalize">{product.category}</p>

                  <Link to={`/product/${product._id}`}>
                    <h3 className="text-sm font-medium text-dark-text line-clamp-2 group-hover:text-primary-500 transition-colors">
                      {product.name}
                    </h3>
                  </Link>

                  <div className="flex items-center gap-1 mt-1">
                    <Star size={14} className="text-yellow-400 fill-yellow-400" />
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
                      onClick={() => handleAddToCart(product)}
                      className="p-2 rounded-lg bg-primary-500 text-white hover:bg-primary-600 transition-colors"
                    >
                      <ShoppingCart size={16} />
                    </button>
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
