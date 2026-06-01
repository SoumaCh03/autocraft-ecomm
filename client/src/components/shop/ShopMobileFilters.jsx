import { motion } from 'framer-motion'

export default function ShopMobileFilters({ filtersOpen, category, categories = [], ratingMin, searchParams, goToCategory, setSearchParams, setPage }) {
  if (!filtersOpen) return null

  const categoryOptions = [{ label: 'All', slug: '' }, ...categories]

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      className="card p-4 mb-4 grid grid-cols-2 gap-4"
    >
      <div>
        <p className="text-xs font-semibold text-dark-muted mb-2">Category</p>
        <select
          value={category}
          onChange={(e) => goToCategory(e.target.value)}
          className="input-field text-sm py-1.5 w-full"
        >
          {categoryOptions.map((cat) => (
            <option key={cat.slug} value={cat.slug}>{cat.label || cat.name}</option>
          ))}
        </select>
      </div>
      <div>
        <p className="text-xs font-semibold text-dark-muted mb-2">Rating</p>
        <select
          value={ratingMin}
          onChange={(e) => {
            const params = new URLSearchParams(searchParams)
            if (e.target.value) params.set('ratingMin', e.target.value)
            else params.delete('ratingMin')
            setSearchParams(params)
            setPage(1)
          }}
          className="input-field text-sm py-1.5 w-full"
        >
          <option value="">All Ratings</option>
          {[5, 4, 3, 2, 1].map((r) => (
            <option key={r} value={r}>{r}+ Stars</option>
          ))}
        </select>
      </div>
    </motion.div>
  )
}
