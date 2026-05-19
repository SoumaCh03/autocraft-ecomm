import ProductTable from './ProductTable'

export default function ProductList({ loading, products, openEdit, toggleStock, handleDelete }) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (products.length === 0) {
    return (
      <div className="text-center py-20 card">
        <p className="text-4xl mb-3">📦</p>
        <p className="text-dark-text font-semibold">No products yet</p>
        <p className="text-dark-muted text-sm mt-1">Click "Add Product" to get started</p>
      </div>
    )
  }

  return <ProductTable products={products} openEdit={openEdit} toggleStock={toggleStock} handleDelete={handleDelete} />
}
