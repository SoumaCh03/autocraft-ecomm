import { useState, useEffect } from 'react'
import { useParams, useSearchParams, useNavigate } from 'react-router-dom'
import { SlidersHorizontal, ChevronDown } from 'lucide-react'
import axios from 'axios'
import toast from 'react-hot-toast'
import { useCart } from '../context/CartContext'
import { useWishlist } from '../context/WishlistContext'
import SEO from '../components/seo/SEO'
import BASE_URL from '../utils/api'
import ShopHeader from '../components/shop/ShopHeader'
import ShopFilters from '../components/shop/ShopFilters'
import ShopProductGrid from '../components/shop/ShopProductGrid'
import ShopPagination from '../components/shop/ShopPagination'
import ShopActiveFilters from '../components/shop/ShopActiveFilters'
import ShopMobileFilters from '../components/shop/ShopMobileFilters'
import useCategories from '../hooks/useCategories'
import { getCategoryDisplayName } from '../utils/categories'
import { trackEvent } from '../utils/analytics'

const API = BASE_URL

export const SORT_OPTIONS = [
  { label: 'Latest',             value: '' },
  { label: 'Price: Low → High',  value: 'price-asc' },
  { label: 'Price: High → Low',  value: 'price-desc' },
  { label: 'Top Rated',          value: 'rating' },
  { label: 'Most Reviewed',      value: 'relevance' },
]

export default function ShopPage() {
  const { category: catParam } = useParams()
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()
  const { addToCart } = useCart()
  const { isWishlisted, toggleWishlist } = useWishlist()
  const { categories } = useCategories()

  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pages, setPages] = useState(1)

  const [category, setCategory] = useState(catParam || '')
  const [sort, setSort] = useState(searchParams.get('sort') || '')
  const [search, setSearch] = useState(searchParams.get('search') || '')

  const brand = searchParams.get('brand') || ''
  const model = searchParams.get('model') || ''
  const priceMin = searchParams.get('priceMin') || ''
  const priceMax = searchParams.get('priceMax') || ''
  const ratingMin = searchParams.get('ratingMin') || ''
  const inStockOnly = searchParams.get('inStock') === 'true'

  const [showFilters, setShowFilters] = useState(window.innerWidth >= 768)
  const [filtersOpen, setFiltersOpen] = useState(false)

  useEffect(() => {
    const handleResize = () => setShowFilters(window.innerWidth >= 768)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  useEffect(() => {
    setCategory(catParam || '')
    setPage(1)
  }, [catParam])

  useEffect(() => {
    setSearch(searchParams.get('search') || '')
    setSort(searchParams.get('sort') || '')
    setPage(1)
  }, [searchParams])

  useEffect(() => {
    fetchProducts()
  }, [category, sort, page, brand, model, search, priceMin, priceMax, ratingMin, inStockOnly])

  const fetchProducts = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (category) params.set('category', category)
      if (sort) params.set('sort', sort)
      if (brand) params.set('brand', brand)
      if (model) params.set('model', model)
      if (search) params.set('search', search)
      if (priceMin) params.set('priceMin', priceMin)
      if (priceMax) params.set('priceMax', priceMax)
      if (ratingMin) params.set('ratingMin', ratingMin)
      if (inStockOnly) params.set('inStock', 'true')
      params.set('page', page)
      params.set('limit', 12)

      const { data } = await axios.get(`${API}/products?${params}`)
      setProducts(data.products)
      setTotal(data.total)
      setPages(data.pages)

      // Track search query with result counts
      if (search) {
        trackEvent('search', {
          searchQuery: search,
          searchHasResults: data.products.length > 0,
        })
      }
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

    if (filter === 'brand' || filter === 'model' || filter === 'search' || filter === 'price' || filter === 'rating' || filter === 'stock') {
      const params = new URLSearchParams(searchParams)
      params.delete(filter)
      if (filter === 'brand') params.delete('model')
      if (filter === 'price') {
        params.delete('priceMin')
        params.delete('priceMax')
      }
      if (filter === 'rating') params.delete('ratingMin')
      if (filter === 'stock') params.delete('inStock')
      setSearchParams(params)
    }

    setPage(1)
  }

  const clearAllFilters = () => {
    setCategory('')
    setSearch('')
    setPage(1)
    setSearchParams(new URLSearchParams())
    navigate('/shop')
  }

  const activeFilters = [
    brand && { label: `Brand: ${brand}`, clear: 'brand' },
    model && { label: `Model: ${model}`, clear: 'model' },
    category && { label: `Cat: ${getCategoryDisplayName(category, categories)}`, clear: 'category' },
    search && { label: `Search: "${search}"`, clear: 'search' },
    (priceMin || priceMax) && { label: `Price: ₹${priceMin || '0'}-${priceMax || '∞'}`, clear: 'price' },
    ratingMin && { label: `Rating: ★${ratingMin}+`, clear: 'rating' },
    inStockOnly && { label: 'In Stock', clear: 'stock' },
  ].filter(Boolean)

  // Dynamic Schema for CollectionPage
  const collectionSchema = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "name": "Shop Car Accessories",
    "description": "Browse premium car accessories and modification products at AUTOCRAFT Cooch Behar.",
    "url": "https://autocraft.in/shop"
  };

  return (
    <>
      <SEO 
        title={category ? `${getCategoryDisplayName(category, categories)} Accessories in Cooch Behar` : "Shop Car Accessories in Cooch Behar"}
        description={`Browse our premium selection of ${category ? getCategoryDisplayName(category, categories).toLowerCase() : 'car accessories and modification products'} at AUTOCRAFT Cooch Behar.`}
        schemaList={[collectionSchema]}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-28 pb-16">
        <ShopHeader brand={brand} model={model} category={category} categories={categories} total={total} sort={sort} searchParams={searchParams} setSearchParams={setSearchParams} setPage={setPage} />

        <ShopActiveFilters activeFilters={activeFilters} clearFilter={clearFilter} clearAllFilters={clearAllFilters} />

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {showFilters && <ShopFilters category={category} categories={categories} priceMin={priceMin} priceMax={priceMax} ratingMin={ratingMin} inStockOnly={inStockOnly} searchParams={searchParams} setSearchParams={setSearchParams} goToCategory={goToCategory} setPage={setPage} />}

          <div className="md:col-span-3">
            {!showFilters && (
              <button
                onClick={() => setFiltersOpen(!filtersOpen)}
                className="btn-outline w-full mb-4 flex items-center justify-center gap-2"
              >
                <SlidersHorizontal size={16} /> Filters {filtersOpen && <ChevronDown size={14} />}
              </button>
            )}

            <ShopMobileFilters filtersOpen={filtersOpen} category={category} categories={categories} ratingMin={ratingMin} searchParams={searchParams} goToCategory={goToCategory} setSearchParams={setSearchParams} setPage={setPage} />

            <ShopProductGrid products={products} loading={loading} categories={categories} isWishlisted={isWishlisted} toggleWishlist={toggleWishlist} handleAddToCart={handleAddToCart} />

            {!loading && products.length > 0 && (
              <ShopPagination pages={pages} page={page} setPage={setPage} />
            )}

            {!loading && products.length === 0 && activeFilters.length > 0 && (
              <button onClick={clearAllFilters} className="btn-primary mx-auto">
                Clear Filters
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
