import { X } from 'lucide-react'

export default function ShopActiveFilters({ activeFilters, clearFilter, clearAllFilters }) {
  if (activeFilters.length === 0) return null

  return (
    <div className="flex flex-wrap gap-2 mb-6">
      {activeFilters.map((f) => (
        <span key={f.label} className="flex items-center gap-1.5 px-3 py-1 bg-primary-500/10 border border-primary-500/30 rounded-full text-xs text-primary-500">
          {f.label}
          <button
            type="button"
            onClick={() => clearFilter(f.clear)}
            className="hover:text-primary-400 transition-colors"
            aria-label={`Remove ${f.label} filter`}
          >
            <X size={12} />
          </button>
        </span>
      ))}
      {activeFilters.length > 0 && (
        <button
          type="button"
          onClick={clearAllFilters}
          className="px-3 py-1 text-xs text-red-400 hover:text-red-300 transition-colors"
        >
          Clear All
        </button>
      )}
    </div>
  )
}
