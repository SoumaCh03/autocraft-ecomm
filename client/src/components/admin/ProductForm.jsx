import { X, Upload, Link2 } from 'lucide-react'
import axios from 'axios'
import toast from 'react-hot-toast'
import BASE_URL from '../../utils/api'

const API = BASE_URL
const CATEGORIES = ['exterior', 'interior', 'lighting', 'electronics', 'car-care', 'dashboard']

const getUsableVariants = (variants = []) =>
  variants.filter((variant) => variant.name?.trim())

const getVariantStockTotal = (variants = []) =>
  getUsableVariants(variants).reduce(
    (sum, variant) => sum + Number(variant.stock || 0),
    0
  )

export default function ProductForm({
  showForm,
  setShowForm,
  editing,
  form,
  setForm,
  handleChange,
  imageMode,
  setImageMode,
  imageUrl,
  setImageUrl,
  uploadedImgs,
  uploading,
  handleFileUpload,
  fileRef,
  removeUploadedImg,
  handleSave,
  saving,
}) {
  const addVariant = () => {
    setForm((prev) => ({
      ...prev,
      variants: [
        ...(prev.variants || []),
        {
          name: '',
          color: '',
          colorHex: '#111111',
          stock: '',
          price: '',
          mrp: '',
          images: [],
          imageMode: 'url',
          imageUrl: '',
          uploadedImgs: [],
          uploading: false,
        },
      ],
    }))
  }

  const updateVariant = (index, field, value) => {
    setForm((prev) => {
      const updated = [...(prev.variants || [])]

      updated[index] = {
        ...updated[index],
        [field]: value,
      }

      return {
        ...prev,
        stock: getUsableVariants(updated).length
          ? getVariantStockTotal(updated)
          : prev.stock,
        variants: updated,
      }
    })
  }

  const removeVariant = (index) => {
    setForm((prev) => {
      const updated = prev.variants?.filter((_, i) => i !== index) || []

      return {
        ...prev,
        stock: getUsableVariants(updated).length
          ? getVariantStockTotal(updated)
          : prev.stock,
        variants: updated,
      }
    })
  }

  const handleVariantUpload = async (index, e) => {
    const files = Array.from(e.target.files)

    if (!files.length) return

    updateVariant(index, 'uploading', true)

    try {
      const uploaded = []

      for (const file of files) {
        const formData = new FormData()

        formData.append('image', file)

        const { data } = await axios.post(`${API}/upload/image`, formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
          withCredentials: true,
        })

        uploaded.push({
          url: data.url,
          public_id: data.public_id,
        })
      }

      setForm((prev) => {
        const updated = [...(prev.variants || [])]

        updated[index] = {
          ...updated[index],

          uploadedImgs: [
            ...(updated[index].uploadedImgs || []),
            ...uploaded,
          ],

          images: [
            ...(updated[index].images || []),
            ...uploaded.map((i) => i.url),
          ],
        }

        return {
          ...prev,
          variants: updated,
        }
      })

      toast.success(`${files.length} variant image(s) uploaded!`)
    } catch {
      toast.error('Upload failed')
    } finally {
      updateVariant(index, 'uploading', false)
    }
  }

  if (!showForm) return null

  const hasVariants = getUsableVariants(form.variants || []).length > 0
  const displayedStock = hasVariants
    ? getVariantStockTotal(form.variants)
    : form.stock

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
              <input type="number" name="stock" value={displayedStock} onChange={hasVariants ? undefined : handleChange} readOnly={hasVariants} className="input-field" placeholder="50" />
            </div>

            <div>
              <label className="block text-sm text-dark-muted mb-1">Compatible Car Brands <span className="text-xs">(comma separated)</span></label>
              <input name="carBrands" value={form.carBrands} onChange={handleChange} className="input-field" placeholder="Maruti Suzuki, Hyundai" />
            </div>

            <div>
              <label className="block text-sm text-dark-muted mb-1">Compatible Models <span className="text-xs">(comma separated)</span></label>
              <input name="carModels" value={form.carModels} onChange={handleChange} className="input-field" placeholder="Swift, Creta" />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-sm text-dark-muted mb-2">Product Images *</label>

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

              {imageMode === 'url' && (
                <input
                  value={imageUrl}
                  onChange={e => setImageUrl(e.target.value)}
                  className="input-field"
                  placeholder="https://example.com/image1.jpg, https://example.com/image2.jpg"
                />
              )}

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

            <div className="sm:col-span-2 mt-4">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-semibold text-dark-text">
                    Product Variants
                  </h3>
                  <p className="text-xs text-dark-muted mt-1">
                    Colors, compatibility, model-specific options
                  </p>
                </div>

                <button
                  type="button"
                  onClick={addVariant}
                  className="px-4 py-2 rounded-xl bg-primary-500 text-white hover:bg-primary-400 transition-all text-sm font-medium"
                >
                  + Add Variant
                </button>
              </div>

              {(form.variants || []).length > 0 && (
                <div className="space-y-4">
                  {form.variants.map((variant, index) => (
                    <div
                      key={index}
                      className="rounded-2xl border border-primary-500/20 bg-primary-500/5 backdrop-blur-sm p-5"
                    >
                      <div className="flex items-center justify-between mb-4">
                        <p className="text-sm font-semibold text-primary-400">
                          Variant #{index + 1}
                        </p>
                        <button
                          type="button"
                          onClick={() => removeVariant(index)}
                          className="text-red-400 hover:text-red-300 text-sm"
                        >
                          Remove
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <input
                          placeholder="Variant Name"
                          value={variant.name}
                          onChange={(e) => updateVariant(index, 'name', e.target.value)}
                          className="input-field"
                        />
                        <input
                          placeholder="Color Name"
                          value={variant.color}
                          onChange={(e) => updateVariant(index, 'color', e.target.value)}
                          className="input-field"
                        />

                        <div>
                          <label className="text-xs text-dark-muted block mb-2">Color Swatch</label>
                          <div className="flex gap-3 items-center">
                            <input
                              type="color"
                              value={variant.colorHex}
                              onChange={(e) => updateVariant(index, 'colorHex', e.target.value)}
                              className="w-14 h-12 rounded-xl overflow-hidden border border-dark-border bg-transparent"
                            />
                            <input
                              value={variant.colorHex}
                              onChange={(e) => updateVariant(index, 'colorHex', e.target.value)}
                              className="input-field"
                            />
                          </div>
                        </div>

                        <input
                          type="number"
                          placeholder="Stock"
                          value={variant.stock}
                          onChange={(e) => updateVariant(index, 'stock', e.target.value)}
                          className="input-field"
                        />
                        <input
                          type="number"
                          placeholder="Variant Price"
                          value={variant.price}
                          onChange={(e) => updateVariant(index, 'price', e.target.value)}
                          className="input-field"
                        />
                        <input
                          type="number"
                          placeholder="Variant MRP"
                          value={variant.mrp}
                          onChange={(e) => updateVariant(index, 'mrp', e.target.value)}
                          className="input-field"
                        />

                        <div className="sm:col-span-2">
                          <label className="text-xs text-dark-muted block mb-2">
                            Variant Images
                          </label>

                          <div className="flex gap-2 mb-3">
                            <button
                              type="button"
                              onClick={() => updateVariant(index, 'imageMode', 'url')}
                              className={`flex items-center gap-1.5 text-sm px-4 py-2 rounded-xl border transition-all ${
                                (variant.imageMode || 'url') === 'url'
                                  ? 'bg-primary-500 text-white border-primary-500'
                                  : 'border-dark-border text-dark-muted'
                              }`}
                            >
                              <Link2 size={14} />
                              Image URL
                            </button>

                            <button
                              type="button"
                              onClick={() => updateVariant(index, 'imageMode', 'upload')}
                              className={`flex items-center gap-1.5 text-sm px-4 py-2 rounded-xl border transition-all ${
                                variant.imageMode === 'upload'
                                  ? 'bg-primary-500 text-white border-primary-500'
                                  : 'border-dark-border text-dark-muted'
                              }`}
                            >
                              <Upload size={14} />
                              Upload
                            </button>
                          </div>

                          {(variant.imageMode || 'url') === 'url' && (
                            <input
                              placeholder="https://image1.jpg, https://image2.jpg"
                              value={variant.imageUrl || (variant.images || []).join(', ')}
                              onChange={(e) => {
                                updateVariant(index, 'imageUrl', e.target.value)
                                updateVariant(
                                  index,
                                  'images',
                                  e.target.value
                                    .split(',')
                                    .map((s) => s.trim())
                                    .filter(Boolean)
                                )
                              }}
                              className="input-field"
                            />
                          )}

                          {(variant.imageMode || 'url') === 'upload' && (
                            <div>
                              <input
                                type="file"
                                accept="image/*"
                                multiple
                                onChange={(e) => handleVariantUpload(index, e)}
                                className="hidden"
                                id={`variant-upload-${index}`}
                              />

                              <button
                                type="button"
                                onClick={() => document.getElementById(`variant-upload-${index}`)?.click()}
                                disabled={variant.uploading}
                                className="w-full border-2 border-dashed border-dark-border rounded-xl p-6 text-center hover:border-primary-500/50 transition-all"
                              >
                                {variant.uploading ? 'Uploading...' : 'Click to upload variant images'}
                              </button>

                              {(variant.images || []).length > 0 && (
                                <div className="flex gap-2 mt-3 flex-wrap">
                                  {variant.images.map((img, i) => (
                                    <img
                                      key={i}
                                      src={img}
                                      alt=""
                                      className="w-16 h-16 object-cover rounded-lg border border-dark-border"
                                    />
                                  ))}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
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

