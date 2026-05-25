import { useState, useEffect, useRef } from 'react'
import axios from 'axios'
import toast from 'react-hot-toast'
import BASE_URL from '../../utils/api'
import ProductHeader from '../../components/admin/ProductHeader'
import ProductForm from '../../components/admin/ProductForm'
import ProductList from '../../components/admin/ProductList'

const API = BASE_URL
axios.defaults.withCredentials = true

const getUsableVariants = (variants = []) =>
  variants.filter((variant) => variant.name?.trim())

const getVariantStockTotal = (variants = []) =>
  getUsableVariants(variants).reduce(
    (sum, variant) => sum + Number(variant.stock || 0),
    0
  )

const EMPTY = {
  name: '',
  description: '',
  price: '',
  mrp: '',
  category: 'exterior',
  carBrands: '',
  carModels: '',
  stock: '',
  isFeatured: false,
  variants: [],
}

export default function AdminProducts() {
  const [products,     setProducts]     = useState([])
  const [loading,      setLoading]      = useState(true)
  const [showForm,     setShowForm]     = useState(false)
  const [editing,      setEditing]      = useState(null)
  const [form,         setForm]         = useState(EMPTY)
  const [saving,       setSaving]       = useState(false)

  // Image state
  const [imageMode,    setImageMode]   = useState('url')  // 'url' or 'upload'
  const [imageUrl,     setImageUrl]    = useState('')      // comma separated URLs
  const [uploadedImgs, setUploadedImgs] = useState([])   // [{url, public_id}]
  const [uploading,    setUploading]   = useState(false)
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
    setForm({
      ...EMPTY,
      variants: [],
    })
    setImageUrl('')
    setUploadedImgs([])
    setImageMode('url')
    setShowForm(true)
  }

  const openEdit = (p) => {
    const hasVariants = getUsableVariants(p.variants || []).length > 0

    setEditing(p._id)
    setForm({
      name: p.name,
      description: p.description,
      price: p.price,
      mrp: p.mrp || '',
      category: p.category,
      carBrands: p.carBrands?.join(', ') || '',
      carModels: p.carModels?.join(', ') || '',
      stock: hasVariants ? getVariantStockTotal(p.variants) : p.stock,
      isFeatured: p.isFeatured,
      variants:
        p.variants?.map((variant) => ({
          _id: variant._id,
          name: variant.name || '',
          color: variant.color || '',
          colorHex: variant.colorHex || '#111111',
          stock: variant.stock || '',
          price: variant.price || '',
          mrp: variant.mrp || '',
          images: variant.images || [],
          imageMode: 'url',
          imageUrl: (variant.images || []).join(', '),
          uploadedImgs: [],
          uploading: false,
        })) || [],
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

    const variantPayload = (form.variants || [])
      .filter((variant) => variant.name?.trim())
      .map((variant) => {
        const finalVariantImages =
          variant.imageMode === 'url'
            ? (variant.imageUrl ?? (variant.images || []).join(', '))
                .split(',')
                .map((s) => s.trim())
                .filter(Boolean)
            : (variant.uploadedImgs || []).length > 0
              ? (variant.uploadedImgs || []).map(
                  (img) => img.url
                )
              : (variant.images || [])

        return {
          ...(variant._id ? { _id: variant._id } : {}),

          name: variant.name?.trim(),
          color: variant.color?.trim(),
          colorHex:
            variant.colorHex || '#111111',

          stock: Number(
            variant.stock || 0
          ),

          price: Number(
            variant.price || form.price
          ),

          mrp: Number(
            variant.mrp ||
            variant.price ||
            form.price
          ),

          images: finalVariantImages,

          available:
            Number(variant.stock || 0) > 0,
        }
      })

    const hasVariants = variantPayload.length > 0
    const finalStock = hasVariants
      ? getVariantStockTotal(variantPayload)
      : Number(form.stock || 0)

    if (!form.name || !form.price || (!hasVariants && form.stock === '')) {
      return toast.error('Name, price and stock are required')
    }

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
        price: Number(form.price),
        mrp: Number(form.mrp) || Number(form.price),
        stock: finalStock,
        carBrands: form.carBrands
          .split(',')
          .map(s => s.trim())
          .filter(Boolean),
        carModels: form.carModels
          .split(',')
          .map(s => s.trim())
          .filter(Boolean),
        images: finalImages,
        variants: variantPayload,
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
      <ProductHeader productsLength={products.length} openAdd={openAdd} />
      <ProductForm
        showForm={showForm}
        setShowForm={setShowForm}
        editing={editing}
        form={form}
        setForm={setForm}
        handleChange={handleChange}
        imageMode={imageMode}
        setImageMode={setImageMode}
        imageUrl={imageUrl}
        setImageUrl={setImageUrl}
        uploadedImgs={uploadedImgs}
        uploading={uploading}
        handleFileUpload={handleFileUpload}
        fileRef={fileRef}
        removeUploadedImg={removeUploadedImg}
        handleSave={handleSave}
        saving={saving}
      />
      <ProductList
        loading={loading}
        products={products}
        openEdit={openEdit}
        toggleStock={toggleStock}
        handleDelete={handleDelete}
      />
    </div>
  )
}

