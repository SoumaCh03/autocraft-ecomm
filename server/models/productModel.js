import mongoose from 'mongoose';

const reviewSchema = new mongoose.Schema({
  user:             { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name:             { type: String, required: true },
  rating:           { type: Number, required: true, min: 1, max: 5 },
  comment:          { type: String, required: true },
  verifiedPurchase: { type: Boolean, default: false },
  order:            { type: mongoose.Schema.Types.ObjectId, ref: 'Order' },
}, { timestamps: true });

const notifyRequestSchema = new mongoose.Schema({
  user:        { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  email:       { type: String, required: true, lowercase: true, trim: true },
  requestedAt: { type: Date, default: Date.now },
  notifiedAt:  { type: Date },
  status:      { type: String, enum: ['waiting', 'notified'], default: 'waiting' },
}, { _id: false });

const salesHistorySchema = new mongoose.Schema({
  order:  { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true },
  qty:    { type: Number, required: true, min: 1 },
  soldAt: { type: Date, default: Date.now },
}, { _id: false });

const variantSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },

  color: {
    type: String,
    trim: true,
    default: '',
  },

  colorHex: {
    type: String,
    trim: true,
    default: '#111111',
  },

  sku: {
    type: String,
    trim: true,
  },

  stock: {
    type: Number,
    required: true,
    default: 0,
    min: 0,
  },

  price: {
    type: Number,
  },

  mrp: {
    type: Number,
  },

  discount: {
    type: Number,
    default: 0,
    min: 0,
    max: 100,
  },

  images: [{ type: String }],

  available: {
    type: Boolean,
    default: true,
  },
}, { _id: true });

const productSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Product name is required'],
    trim: true,
  },
  description: {
    type: String,
    required: [true, 'Description is required'],
  },
  price: {
    type: Number,
    required: [true, 'Price is required'],
    min: 0,
  },
  mrp: {
    type: Number,
    min: 0,
  },
  images: [{ type: String }],
  category: {
    type: String,
    required: true,
    trim: true,
    lowercase: true,
  },
  carBrands: [{ type: String }],
  carModels: [{ type: String }],
  stock: {
    type: Number,
    required: true,
    default: 0,
    min: 0,
  },
  isOutOfStock: {
    type: Boolean,
    default: false,
  },
  isFeatured: {
    type: Boolean,
    default: false,
  },
  variants: [variantSchema],
  hasVariants: {
    type: Boolean,
    default: false,
  },
  soldCount: {
    type: Number,
    default: 0,
    min: 0,
  },
  salesHistory: [salesHistorySchema],
  notifyList:   [notifyRequestSchema],
  reviews:      [reviewSchema],
  rating:       { type: Number, default: 0 },
  numReviews:   { type: Number, default: 0 },
  tags:         [{ type: String }],
}, { timestamps: true });

const applyVariantStockState = (target, variants, fallbackStock) => {
  const hasVariants = Array.isArray(variants) && variants.length > 0

  target.hasVariants = hasVariants

  if (hasVariants) {
    const totalVariantStock = variants.reduce(
      (sum, variant) => sum + Number(variant.stock || 0),
      0
    )

    target.stock = totalVariantStock
    target.isOutOfStock = totalVariantStock <= 0
    return
  }

  const safeStock = Math.max(0, Number(fallbackStock || 0))

  target.stock = safeStock
  target.isOutOfStock = safeStock === 0
}

productSchema.pre('save', function () {
  applyVariantStockState(this, this.variants, this.stock)
})

productSchema.pre(
  'findOneAndUpdate',
  function (next) {
    const update =
      this.getUpdate() || {}

    const variants =
      update.variants ??
      update.$set?.variants

    if (Array.isArray(variants)) {
      const derived = {}
      const stock =
        update.stock ??
        update.$set?.stock

      applyVariantStockState(derived, variants, stock)

      if (update.$set) {
        update.$set.stock = derived.stock
        update.$set.isOutOfStock = derived.isOutOfStock
        update.$set.hasVariants = derived.hasVariants
      } else {
        update.stock = derived.stock
        update.isOutOfStock = derived.isOutOfStock
        update.hasVariants = derived.hasVariants
      }
    } else {
      const stock =
        update.stock ??
        update.$set?.stock

      if (stock !== undefined) {
        const safeStock =
          Math.max(
            0,
            Number(stock || 0)
          )

        if (update.$set) {
          update.$set.stock =
            safeStock

          update.$set
            .isOutOfStock =
            safeStock === 0

          update.$set
            .hasVariants =
            false
        } else {
          update.stock =
            safeStock

          update.isOutOfStock =
            safeStock === 0

          update.hasVariants =
            false
        }
      }
    }

    this.setUpdate(update)

    next()
  }
)

productSchema.index({ category: 1 });
productSchema.index({ price: 1 });
productSchema.index({ rating: -1 });
productSchema.index({ stock: 1 });
productSchema.index({
  name: 'text',
  description: 'text',
  category: 'text',
  carBrands: 'text',
}, {
  weights: {
    name: 10,
    category: 5,
    carBrands: 3,
    description: 1,
  },
  name: 'ProductTextIndex',
});

export default mongoose.model('Product', productSchema);
