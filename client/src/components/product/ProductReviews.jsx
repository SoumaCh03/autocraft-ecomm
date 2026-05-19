import { Star, BadgeCheck } from 'lucide-react'

export default function ProductReviews({ reviews }) {
  if (!reviews?.length) {
    return <p className="text-dark-muted">No reviews yet. Be the first to review!</p>
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
      {reviews.map((r, i) => (
        <div key={i} className="card p-5">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 bg-primary-500/20 rounded-full flex items-center justify-center text-primary-500 text-xs font-bold">
              {r.name?.[0]?.toUpperCase()}
            </div>
            <div>
              <p className="text-sm font-medium text-dark-text">{r.name}</p>
              {r.verifiedPurchase && (
                <p className="text-[11px] text-green-400 flex items-center gap-1 mt-0.5">
                  <BadgeCheck size={11} /> Verified Purchase
                </p>
              )}
              <div className="flex">
                {[...Array(5)].map((_, j) => (
                  <Star key={j} size={10} className={j < r.rating ? 'fill-yellow-400 text-yellow-400' : 'text-dark-border'} />
                ))}
              </div>
            </div>
          </div>
          <p className="text-sm text-dark-muted">{r.comment}</p>
        </div>
      ))}
    </div>
  )
}
