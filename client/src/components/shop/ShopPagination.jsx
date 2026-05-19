export default function ShopPagination({ pages, page, setPage }) {
  if (pages <= 1) return null

  return (
    <div className="flex justify-center gap-2 mt-8">
      {[...Array(pages)].map((_, i) => (
        <button
          key={i + 1}
          onClick={() => { setPage(i + 1); window.scrollTo({ top: 0, behavior: 'smooth' }) }}
          className={`px-4 py-2 rounded-lg transition-colors ${page === i + 1 ? 'bg-primary-500 text-white' : 'border border-dark-border text-dark-muted hover:border-primary-500'}`}
        >
          {i + 1}
        </button>
      ))}
    </div>
  )
}
