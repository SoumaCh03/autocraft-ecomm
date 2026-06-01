import { useState } from 'react'
import { Plus, Trash2, RefreshCw } from 'lucide-react'

const EMPTY_CATEGORY = {
  name: '',
  description: '',
  icon: '',
}

export default function CategoryManager({
  categories,
  categoryForm,
  setCategoryForm,
  savingCategory,
  deletingCategory,
  onCreateCategory,
  onDeleteCategory,
  onRefresh,
}) {
  const [open, setOpen] = useState(false)

  return (
    <div className="card p-5 mb-8">
      <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-5">
        <div>
          <p className="text-xs text-primary-500 uppercase tracking-widest font-semibold mb-2">
            Store Categories
          </p>
          <h2 className="font-display text-xl font-bold text-dark-text">
            Product Category Manager
          </h2>
          <p className="text-sm text-dark-muted mt-1 max-w-2xl">
            Add customer-facing shop categories without changing code. Categories that contain products are protected from deletion.
          </p>
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={onRefresh}
            className="btn-outline flex items-center gap-2 py-2"
            title="Refresh categories"
          >
            <RefreshCw size={16} /> Refresh
          </button>
          <button
            type="button"
            onClick={() => {
              setCategoryForm(EMPTY_CATEGORY)
              setOpen((value) => !value)
            }}
            className="btn-primary flex items-center gap-2 py-2"
          >
            <Plus size={16} /> Add Category
          </button>
        </div>
      </div>

      {open && (
        <form onSubmit={onCreateCategory} className="grid grid-cols-1 md:grid-cols-[1fr_1fr_96px_auto] gap-3 mt-5 pt-5 border-t border-dark-border">
          <input
            value={categoryForm.name}
            onChange={(e) => setCategoryForm((prev) => ({ ...prev, name: e.target.value }))}
            className="input-field"
            placeholder="Category name, e.g. RGB Lights"
          />
          <input
            value={categoryForm.description}
            onChange={(e) => setCategoryForm((prev) => ({ ...prev, description: e.target.value }))}
            className="input-field"
            placeholder="Short customer description"
          />
          <input
            value={categoryForm.icon}
            onChange={(e) => setCategoryForm((prev) => ({ ...prev, icon: e.target.value }))}
            className="input-field"
            placeholder="Icon"
            maxLength={12}
          />
          <button
            type="submit"
            disabled={savingCategory}
            className="btn-primary flex items-center justify-center gap-2"
          >
            {savingCategory ? (
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Plus size={16} />
            )}
            Save
          </button>
        </form>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mt-5">
        {categories.map((category) => (
          <div key={category.slug} className="rounded-xl border border-dark-border bg-dark-card/50 p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-lg shrink-0">{category.icon || 'AC'}</span>
                  <p className="font-semibold text-dark-text truncate">
                    {category.label || category.name}
                  </p>
                </div>
                <p className="text-xs text-dark-muted mt-1">/{category.slug}</p>
                {category.description && (
                  <p className="text-xs text-dark-muted mt-2 line-clamp-2">
                    {category.description}
                  </p>
                )}
                <p className="text-xs text-primary-500 mt-3">
                  {Number(category.productCount || 0)} product(s)
                </p>
              </div>

              <button
                type="button"
                onClick={() => onDeleteCategory(category)}
                disabled={deletingCategory === category._id}
                className="p-2 text-dark-muted hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-all disabled:opacity-50"
                title="Delete category"
              >
                {deletingCategory === category._id ? (
                  <span className="block w-4 h-4 border-2 border-red-400 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Trash2 size={16} />
                )}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
