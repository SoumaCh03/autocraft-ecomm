import { Pencil, Trash2, PackageX, Package } from 'lucide-react'

const getUsableVariants = (variants = []) =>
  variants.filter((variant) => variant.name?.trim())

const getDisplayStock = (product) => {
  const variants = getUsableVariants(product.variants || [])

  if (!variants.length) return Number(product.stock || 0)

  return variants.reduce(
    (sum, variant) => sum + Number(variant.stock || 0),
    0
  )
}

export default function ProductTable({ products, openEdit, toggleStock, handleDelete }) {
  return (
    <div className="card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-dark-border">
              <th className="text-left px-4 py-3 text-xs text-dark-muted uppercase tracking-wider">Product</th>
              <th className="text-left px-4 py-3 text-xs text-dark-muted uppercase tracking-wider">Category</th>
              <th className="text-left px-4 py-3 text-xs text-dark-muted uppercase tracking-wider">Price</th>
              <th className="text-left px-4 py-3 text-xs text-dark-muted uppercase tracking-wider">Stock</th>
              <th className="text-left px-4 py-3 text-xs text-dark-muted uppercase tracking-wider">Status</th>
              <th className="text-left px-4 py-3 text-xs text-dark-muted uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-dark-border">
            {products.map((p) => {
              const displayStock = getDisplayStock(p)
              const isOutOfStock = displayStock <= 0

              return (
                <tr key={p._id} className="hover:bg-dark-border/20 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-dark-border overflow-hidden shrink-0">
                        {p.images?.[0]
                          ? <img src={p.images[0]} alt={p.name} className="w-full h-full object-cover" />
                          : <div className="w-full h-full flex items-center justify-center text-dark-muted text-xs font-bold">AC</div>
                        }
                      </div>
                      <div>
                        <p className="text-sm font-medium text-dark-text line-clamp-1">{p.name}</p>
                        <p className="text-xs text-dark-muted">{p.carBrands?.slice(0, 2).join(', ')}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs bg-primary-500/10 text-primary-500 px-2 py-1 rounded-full capitalize">{p.category}</span>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-sm font-semibold text-dark-text">Rs.{p.price.toLocaleString()}</p>
                    {p.mrp > p.price && <p className="text-xs text-dark-muted line-through">Rs.{p.mrp.toLocaleString()}</p>}
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-sm text-dark-text">{displayStock}</p>
                    {displayStock > 0 && displayStock <= 5 && (
                      <p className="text-xs text-orange-400 mt-0.5">Low stock warning</p>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                      isOutOfStock ? 'bg-red-500/10 text-red-400' : 'bg-green-500/10 text-green-400'
                    }`}>
                      {isOutOfStock ? 'Out of Stock' : 'In Stock'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button onClick={() => openEdit(p)} className="p-1.5 text-dark-muted hover:text-primary-500 hover:bg-primary-500/10 rounded-lg transition-all" title="Edit">
                        <Pencil size={14} />
                      </button>
                      <button onClick={() => toggleStock(p)} className="p-1.5 text-dark-muted hover:text-yellow-400 hover:bg-yellow-400/10 rounded-lg transition-all" title="Toggle Stock">
                        {isOutOfStock ? <Package size={14} /> : <PackageX size={14} />}
                      </button>
                      <button onClick={() => handleDelete(p._id)} className="p-1.5 text-dark-muted hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-all" title="Delete">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
