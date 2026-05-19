import { ShoppingCart, Mail } from 'lucide-react'

export default function ProductActions({
  isOutOfStock,
  stock,
  qty,
  onQtyChange,
  onAddToCart,
  onBuyNow,
  notifyEmail,
  onNotifyEmailChange,
  onNotifyMe,
  notifying
}) {
  if (!isOutOfStock) {
    return (
      <>
        <div className="flex items-center gap-3 mb-6">
          <label className="text-sm text-dark-muted">Qty:</label>
          <div className="flex items-center gap-2 bg-dark-card border border-dark-border rounded-xl px-3 py-2">
            <button onClick={() => onQtyChange(Math.max(1, qty - 1))} className="text-dark-muted hover:text-dark-text w-6 text-center font-bold">−</button>
            <span className="text-dark-text font-medium w-8 text-center">{qty}</span>
            <button onClick={() => onQtyChange(Math.min(stock, qty + 1))} className="text-dark-muted hover:text-dark-text w-6 text-center font-bold">+</button>
          </div>
        </div>

        <div className="flex gap-3 mb-8">
          <button onClick={onAddToCart} className="btn-outline flex items-center gap-2 flex-1 justify-center">
            <ShoppingCart size={18} /> Add to Cart
          </button>
          <button onClick={onBuyNow} className="btn-primary flex-1 justify-center">
            Buy Now
          </button>
        </div>
      </>
    )
  }

  return (
    <form onSubmit={onNotifyMe} className="card p-5 mb-8 border-red-500/20 bg-red-500/5">
      <div className="flex items-start gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center shrink-0">
          <Mail size={18} className="text-red-400" />
        </div>
        <div>
          <p className="font-semibold text-dark-text">Notify Me</p>
          <p className="text-sm text-dark-muted mt-1">Enter your email and we will notify you when this product is back in stock.</p>
        </div>
      </div>
      <div className="flex flex-col sm:flex-row gap-3">
        <input
          type="email"
          value={notifyEmail}
          onChange={(e) => onNotifyEmailChange(e.target.value)}
          className="input-field flex-1"
          placeholder="your@email.com"
        />
        <button type="submit" disabled={notifying} className="btn-primary justify-center sm:w-40">
          {notifying ? 'Saving...' : 'Notify Me'}
        </button>
      </div>
    </form>
  )
}
