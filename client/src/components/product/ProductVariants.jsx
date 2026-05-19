export default function ProductVariants({ variants, selectedVariantId, onVariantSelect }) {
  if (!variants?.length) return null

  return (
    <div className="mb-6 p-4 bg-primary-500/5 border border-primary-500/20 rounded-xl">
      <p className="text-xs text-primary-500 font-medium uppercase tracking-wider mb-3">Select Variant</p>
      <div className="flex flex-wrap gap-2">
        {variants.map((variant) => (
          <button
            key={variant._id}
            type="button"
            onClick={() => onVariantSelect(variant)}
            className={`px-4 py-2 text-sm rounded-lg border-2 transition-all ${
              selectedVariantId === variant._id
                ? 'border-primary-500 bg-primary-500/20 text-primary-400'
                : 'border-dark-border text-dark-muted hover:border-primary-500/50'
            }`}
          >
            <span className="font-medium">{variant.name}</span>
            {variant.stock <= 0 && <span className="text-xs ml-1 text-red-400">(Out)</span>}
          </button>
        ))}
      </div>
    </div>
  )
}
