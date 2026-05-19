export default function ProductPrice({ price, mrp }) {
  const discount = mrp > price ? Math.round((1 - price / mrp) * 100) : 0

  return (
    <div className="flex items-baseline gap-3 mb-6">
      <span className="font-display text-4xl font-bold text-dark-text">₹{price.toLocaleString()}</span>
      {mrp > price && (
        <>
          <span className="text-xl text-dark-muted line-through">₹{mrp.toLocaleString()}</span>
          <span className="text-sm bg-green-500/10 text-green-400 px-2 py-0.5 rounded-full font-medium">{discount}% OFF</span>
        </>
      )}
    </div>
  )
}
