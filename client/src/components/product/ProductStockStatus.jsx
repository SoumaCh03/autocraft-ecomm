export default function ProductStockStatus({ isOutOfStock, stock, lowStock }) {
  return (
    <div className="flex items-center gap-2 mb-6">
      <div className={`w-2 h-2 rounded-full ${isOutOfStock ? 'bg-red-400' : 'bg-green-400'}`} />
      <span className={`text-sm font-medium ${isOutOfStock ? 'text-red-400' : 'text-green-400'}`}>
        {isOutOfStock ? 'Out of Stock' : lowStock ? `Only ${stock} left` : `In Stock (${stock} left)`}
      </span>
    </div>
  )
}
