import { Star } from 'lucide-react'

export default function ReviewForm({ user, review, onReviewChange, onSubmit, submitting }) {
  if (!user) return null

  return (
    <div className="card p-6 max-w-lg">
      <h3 className="font-semibold text-dark-text mb-4">Write a Review</h3>
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label className="text-sm text-dark-muted mb-1 block">Rating</label>
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5].map(n => (
              <button key={n} type="button" onClick={() => onReviewChange({ ...review, rating: n })}>
                <Star size={24} className={n <= review.rating ? 'fill-yellow-400 text-yellow-400' : 'text-dark-border'} />
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="text-sm text-dark-muted mb-1 block">Comment</label>
          <textarea value={review.comment} onChange={e => onReviewChange({ ...review, comment: e.target.value })} rows={3} className="input-field resize-none" placeholder="Share your experience..." />
        </div>
        <button type="submit" disabled={submitting} className="btn-primary">
          {submitting ? 'Submitting...' : 'Submit Review'}
        </button>
      </form>
    </div>
  )
}
