import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import axios from 'axios'
import toast from 'react-hot-toast'
import { Plus, Pencil, Trash2, PackageX, Package, ArrowLeft, Upload, Link2, X } from 'lucide-react'

import BASE_URL from '../../utils/api'; // Adjust the path as needed

const API = BASE_URL;
axios.defaults.withCredentials = true

const CATEGORIES = ['exterior', 'interior', 'lighting', 'electronics', 'car-care', 'dashboard']
const EMPTY = {
  name: '', description: '', price: '', mrp: '',
  category: 'exterior', carBrands: '', carModels: '',
  stock: '', isFeatured: false,
}

export default function AdminProducts() {
  const [products,    setProducts]    = useState([])
  const [loading,     setLoading]     = useState(true)
  const [showForm,    setShowForm]    = useState(false)
  const [editing,     setEditing]     = useState(null)
  const [form,        setForm]        = useState(EMPTY)
  const [saving,      setSaving]      = useState(false)

  // Image state
  const [imageMode,   setImageMode]   = useState('url')  // 'url' or 'upload'
  const [imageUrl,    setImageUrl]    = useState('')      // comma separated URLs
  const [uploadedImgs, setUploadedImgs] = useState([])   // [{url, public_id}]
  const [uploading,   setUploading]   = useState(false)
  const fileRef = useRef()

  useEffect(() => { fetchProducts() }, [])

  const fetchProducts = async () => {
    setLoading(true)
    try {
      const { data } = await axios.get(`${API}/products?limit=100`)
      setProducts(data.products)
    } catch {
      toast.error('Failed to load products')
    } finally {
      setLoading(false)
    }
  }

  const openAdd = () => {
    setEditing(null)
    setForm(EMPTY)
    setImageUrl('')
    setUploadedImgs([])
    setImageMode('url')
    setShowForm(true)
  }

  const openEdit = (p) => {
    setEditing(p._id)
    setForm({
      name:        p.name,
      description: p.description,
      price:       p.price,
      mrp:         p.mrp || '',
      category:    p.category,
      carBrands:   p.carBrands?.join(', ') || '',
      carModels:   p.carModels?.join(', ') || '',
      stock:       p.stock,
      isFeatured:  p.isFeatured,
    })
    setImageUrl(p.images?.join(', ') || '')
    setUploadedImgs([])
    setImageMode('url')
    setShowForm(true)
  }

  const handleChange = (e) => {
    const val = e.target.type === 'checkbox' ? e.target.checked : e.target.value
    setForm({ ...form, [e.target.name]: val })
  }

  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files)
    if (!files.length) return
    setUploading(true)
    try {
      const uploaded = []
      for (const file of files) {
        const formData = new FormData()
        formData.append('image', file)
        const { data } = await axios.post(`${API}/upload/image`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        })
        uploaded.push({ url: data.url, public_id: data.public_id })
      }
      setUploadedImgs(prev => [...prev, ...uploaded])
      toast.success(`${files.length} image(s) uploaded!`)
    } catch {
      toast.error('Image upload failed')
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  const removeUploadedImg = (idx) => {
    setUploadedImgs(prev => prev.filter((_, i) => i !== idx))
  }

  const handleSave = async (e) => {
    e.preventDefault()
    if (!form.name || !form.price || !form.stock) {
      return toast.error('Name, price and stock are required')
    }

    // Determine final images array
    const finalImages = imageMode === 'url'
      ? imageUrl.split(',').map(s => s.trim()).filter(Boolean)
      : uploadedImgs.map(img => img.url)

    if (finalImages.length === 0) {
      return toast.error('Please add at least one product image')
    }

    setSaving(true)
    try {
      const payload = {
        ...form,
        price:     Number(form.price),
        mrp:       Number(form.mrp) || Number(form.price),
        stock:     Number(form.stock),
        carBrands: form.carBrands.split(',').map(s => s.trim()).filter(Boolean),
        carModels: form.carModels.split(',').map(s => s.trim()).filter(Boolean),
        images:    finalImages,
      }

      if (editing) {
        await axios.put(`${API}/products/${editing}`, payload)
        toast.success('Product updated!')
      } else {
        await axios.post(`${API}/products`, payload)
        toast.success('Product created!')
      }
      setShowForm(false)
      fetchProducts()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this product?')) return
    try {
      await axios.delete(`${API}/products/${id}`)
      toast.success('Product deleted')
      fetchProducts()
    } catch {
      toast.error('Delete failed')
    }
  }

  const toggleStock = async (p) => {
    try {
      await axios.put(`${API}/products/${p._id}`, {
        ...p,
        carBrands: p.carBrands || [],
        carModels: p.carModels || [],
        images:    p.images    || [],
        stock:     p.isOutOfStock ? 10 : 0,
      })
      toast.success(p.isOutOfStock ? 'Marked In Stock' : 'Marked Out of Stock')
      fetchProducts()
    } catch {
      toast.error('Failed to update stock')
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-28 pb-16">

      <div className="flex items-center justify-between mb-8">
        <div>
          <Link to="/admin" className="flex items-center gap-2 text-dark-muted hover:text-dark-text text-sm mb-2 transition-colors">
            <ArrowLeft size={14} /> Admin Dashboard
          </Link>
          <h1 className="font-display text-3xl font-bold text-dark-text">Products</h1>
          <p className="text-dark-muted text-sm mt-1">{products.length} total products</p>
        </div>
        <button onClick={openAdd} className="btn-primary flex items-center gap-2">
          <Plus size={18} /> Add Product
        </button>
      </div>

      {/* Modal Form */}
      {showForm && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="card w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 sm:p-8">
            <h2 className="font-display text-xl font-bold text-dark-text mb-6">
              {editing ? 'Edit Product' : 'Add New Product'}
            </h2>

            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

                <div className="sm:col-span-2">
                  <label className="block text-sm text-dark-muted mb-1">Product Name *</label>
                  <input name="name" value={form.name} onChange={handleChange} className="input-field" placeholder="e.g. Premium Seat Cover Set" />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-sm text-dark-muted mb-1">Description *</label>
                  <textarea name="description" value={form.description} onChange={handleChange} rows={3} className="input-field resize-none" placeholder="Describe the product..." />
                </div>

                <div>
                  <label className="block text-sm text-dark-muted mb-1">Selling Price (Rs.) *</label>
                  <input type="number" name="price" value={form.price} onChange={handleChange} className="input-field" placeholder="999" />
                </div>

                <div>
                  <label className="block text-sm text-dark-muted mb-1">MRP (Rs.) — for discount</label>
                  <input type="number" name="mrp" value={form.mrp} onChange={handleChange} className="input-field" placeholder="1499" />
                </div>

                <div>
                  <label className="block text-sm text-dark-muted mb-1">Category *</label>
                  <select name="category" value={form.category} onChange={handleChange} className="input-field">
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-sm text-dark-muted mb-1">Stock Quantity *</label>
                  <input type="number" name="stock" value={form.stock} onChange={handleChange} className="input-field" placeholder="50" />
                </div>

                <div>
                  <label className="block text-sm text-dark-muted mb-1">Compatible Car Brands <span className="text-xs">(comma separated)</span></label>
                  <input name="carBrands" value={form.carBrands} onChange={handleChange} className="input-field" placeholder="Maruti Suzuki, Hyundai" />
                </div>

                <div>
                  <label className="block text-sm text-dark-muted mb-1">Compatible Models <span className="text-xs">(comma separated)</span></label>
                  <input name="carModels" value={form.carModels} onChange={handleChange} className="input-field" placeholder="Swift, Creta" />
                </div>

                {/* IMAGE SECTION */}
                <div className="sm:col-span-2">
                  <label className="block text-sm text-dark-muted mb-2">Product Images *</label>

                  {/* Toggle */}
                  <div className="flex gap-2 mb-3">
                    <button
                      type="button"
                      onClick={() => setImageMode('url')}
                      className={`flex items-center gap-1.5 text-sm px-4 py-2 rounded-xl border transition-all ${
                        imageMode === 'url'
                          ? 'bg-primary-500 text-white border-primary-500'
                          : 'border-dark-border text-dark-muted hover:text-dark-text'
                      }`}
                    >
                      <Link2 size={14} /> Image URL
                    </button>
                    <button
                      type="button"
                      onClick={() => setImageMode('upload')}
                      className={`flex items-center gap-1.5 text-sm px-4 py-2 rounded-xl border transition-all ${
                        imageMode === 'upload'
                          ? 'bg-primary-500 text-white border-primary-500'
                          : 'border-dark-border text-dark-muted hover:text-dark-text'
                      }`}
                    >
                      <Upload size={14} /> Upload Image
                    </button>
                  </div>

                  {/* URL Input */}
                  {imageMode === 'url' && (
                    <input
                      value={imageUrl}
                      onChange={e => setImageUrl(e.target.value)}
                      className="input-field"
                      placeholder="https://example.com/image1.jpg, https://example.com/image2.jpg"
                    />
                  )}

                  {/* Upload Input */}
                  {imageMode === 'upload' && (
                    <div>
                      <input
                        type="file"
                        ref={fileRef}
                        accept="image/*"
                        multiple
                        onChange={handleFileUpload}
                        className="hidden"
                      />
                      <button
                        type="button"
                        onClick={() => fileRef.current?.click()}
                        disabled={uploading}
                        className="w-full border-2 border-dashed border-dark-border rounded-xl p-6 text-center hover:border-primary-500/50 transition-all"
                      >
                        {uploading ? (
                          <div className="flex items-center justify-center gap-2 text-dark-muted">
                            <div className="w-5 h-5 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
                            Uploading...
                          </div>
                        ) : (
                          <div>
                            <Upload size={24} className="text-dark-muted mx-auto mb-2" />
                            <p className="text-sm text-dark-muted">Click to upload images</p>
                            <p className="text-xs text-dark-muted/60 mt-1">JPG, PNG, WebP — multiple allowed</p>
                          </div>
                        )}
                      </button>

                      {/* Preview uploaded images */}
                      {uploadedImgs.length > 0 && (
                        <div className="flex gap-2 mt-3 flex-wrap">
                          {uploadedImgs.map((img, i) => (
                            <div key={i} className="relative">
                              <img src={img.url} alt="" className="w-16 h-16 object-cover rounded-lg border border-dark-border" />
                              <button
                                type="button"
                                onClick={() => removeUploadedImg(i)}
                                className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600"
                              >
                                <X size={10} />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  <input type="checkbox" name="isFeatured" id="feat" checked={form.isFeatured} onChange={handleChange} className="w-4 h-4 accent-primary-500" />
                  <label htmlFor="feat" className="text-sm text-dark-text">Featured on Homepage</label>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={saving || uploading} className="btn-primary flex items-center gap-2">
                  {saving
                    ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    : editing ? 'Update Product' : 'Create Product'
                  }
                </button>
                <button type="button" onClick={() => setShowForm(false)} className="btn-outline">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Products Table */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : products.length === 0 ? (
        <div className="text-center py-20 card">
          <p className="text-4xl mb-3">📦</p>
          <p className="text-dark-text font-semibold">No products yet</p>
          <p className="text-dark-muted text-sm mt-1">Click "Add Product" to get started</p>
        </div>
      ) : (
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
                {products.map((p) => (
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
                      <p className="text-sm text-dark-text">{p.stock}</p>
                      {Number(p.stock || 0) > 0 && Number(p.stock || 0) <= 5 && (
                        <p className="text-xs text-orange-400 mt-0.5">Low stock warning</p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                        p.isOutOfStock ? 'bg-red-500/10 text-red-400' : 'bg-green-500/10 text-green-400'
                      }`}>
                        {p.isOutOfStock ? 'Out of Stock' : 'In Stock'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button onClick={() => openEdit(p)} className="p-1.5 text-dark-muted hover:text-primary-500 hover:bg-primary-500/10 rounded-lg transition-all" title="Edit">
                          <Pencil size={14} />
                        </button>
                        <button onClick={() => toggleStock(p)} className="p-1.5 text-dark-muted hover:text-yellow-400 hover:bg-yellow-400/10 rounded-lg transition-all" title="Toggle Stock">
                          {p.isOutOfStock ? <Package size={14} /> : <PackageX size={14} />}
                        </button>
                        <button onClick={() => handleDelete(p._id)} className="p-1.5 text-dark-muted hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-all" title="Delete">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
