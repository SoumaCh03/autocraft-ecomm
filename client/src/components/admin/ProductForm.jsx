import { X, Upload, Link2 } from 'lucide-react'

const CATEGORIES = ['exterior', 'interior', 'lighting', 'electronics', 'car-care', 'dashboard']

export default function ProductForm({ showForm, setShowForm, editing, form, setForm, handleChange, imageMode, setImageMode, imageUrl, setImageUrl, uploadedImgs, uploading, handleFileUpload, fileRef, removeUploadedImg, handleSave, saving }) {
  if (!showForm) return null

  return (
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
  )
}
