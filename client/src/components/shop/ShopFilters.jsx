import { motion } from 'framer-motion'
import { Star } from 'lucide-react'

export default function ShopFilters({ category, categories = [], priceMin, priceMax, ratingMin, inStockOnly, searchParams, setSearchParams, goToCategory, setPage }) {
  const categoryOptions = [{ label: 'All', slug: '' }, ...categories]

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      className="md:col-span-1"
    >
      <div className="card p-4 sticky top-24">
        <h3 className="font-semibold text-dark-text mb-4">Filters</h3>

        {/* Category Filter */}
        <div className="mb-6 pb-6 border-b border-dark-border">
          <p className="text-xs font-semibold text-dark-muted mb-3 uppercase">Category</p>
          <div className="space-y-2">
            {categoryOptions.map((cat) => (
              <button
                key={cat.slug}
                onClick={() => goToCategory(cat.slug)}
                className={`block text-sm transition-colors ${category === cat.slug ? 'text-primary-500 font-semibold' : 'text-dark-muted hover:text-dark-text'}`}
              >
                {cat.label || cat.name}
              </button>
            ))}
          </div>
        </div>

        {/* Price Filter */}
        <div className="mb-6 pb-6 border-b border-dark-border">
          <p className="text-xs font-semibold text-dark-muted mb-3 uppercase">Price Range</p>
          <div className="space-y-2">
            <input
              type="number"
              placeholder="Min"
              value={priceMin}
              onChange={(e) => {
                const params = new URLSearchParams(searchParams)
                if (e.target.value) params.set('priceMin', e.target.value)
                else params.delete('priceMin')
                setSearchParams(params)
                setPage(1)
              }}
              className="input-field text-sm py-1.5"
            />
            <input
              type="number"
              placeholder="Max"
              value={priceMax}
              onChange={(e) => {
                const params = new URLSearchParams(searchParams)
                if (e.target.value) params.set('priceMax', e.target.value)
                else params.delete('priceMax')
                setSearchParams(params)
                setPage(1)
              }}
              className="input-field text-sm py-1.5"
            />
          </div>
        </div>

        {/* Rating Filter */}
        <div className="mb-6 pb-6 border-b border-dark-border">
          <p className="text-xs font-semibold text-dark-muted mb-3 uppercase">Rating</p>
          <div className="space-y-2">
            {[5, 4, 3, 2, 1].map((rating) => (
              <button
                key={rating}
                onClick={() => {
                  const params = new URLSearchParams(searchParams)
                  params.set('ratingMin', rating)
                  setSearchParams(params)
                  setPage(1)
                }}
                className={`flex items-center gap-2 text-sm transition-colors ${ratingMin === String(rating) ? 'text-primary-500' : 'text-dark-muted hover:text-dark-text'}`}
              >
                <div className="flex">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} size={12} className={i < rating ? 'fill-yellow-400 text-yellow-400' : 'text-dark-border'} />
                  ))}
                </div>
                <span>{rating}+ Stars</span>
              </button>
            ))}
          </div>
        </div>

        {/* Stock Filter */}
        <div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={inStockOnly}
              onChange={(e) => {
                const params = new URLSearchParams(searchParams)
                if (e.target.checked) params.set('inStock', 'true')
                else params.delete('inStock')
                setSearchParams(params)
                setPage(1)
              }}
              className="rounded"
            />
            <span className="text-sm text-dark-text">In Stock Only</span>
          </label>
        </div>
      </div>
    </motion.div>
  )
}
