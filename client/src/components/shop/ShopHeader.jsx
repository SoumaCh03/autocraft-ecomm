import { SlidersHorizontal } from 'lucide-react'
import { getCategoryDisplayName } from '../../utils/categories'

const SORT_OPTIONS = [
  { label: 'Latest',             value: '' },
  { label: 'Price: Low → High',  value: 'price-asc' },
  { label: 'Price: High → Low',  value: 'price-desc' },
  { label: 'Top Rated',          value: 'rating' },
  { label: 'Most Reviewed',      value: 'relevance' },
]

export default function ShopHeader({ brand, model, category, categories = [], total, sort, searchParams, setSearchParams, setPage }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
      <div>
        <h1 className="font-display text-3xl font-bold text-dark-text">
          {brand
            ? `${brand} ${model ? `— ${model}` : ''}`
            : category
              ? getCategoryDisplayName(category, categories)
              : 'All Products'}
        </h1>
        <p className="text-dark-muted text-sm mt-1">{total} products found</p>
      </div>

      <div className="flex items-center gap-2">
        <SlidersHorizontal size={16} className="text-dark-muted" />
        <select
          value={sort}
          onChange={(e) => {
            const params = new URLSearchParams(searchParams)
            if (e.target.value) params.set('sort', e.target.value)
            else params.delete('sort')
            setSearchParams(params)
            setPage(1)
          }}
          className="input-field py-2 text-sm w-48"
          aria-label="Sort products"
        >
          {SORT_OPTIONS.map(o => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>
    </div>
  )
}
