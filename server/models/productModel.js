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
    enum: ['exterior', 'interior', 'lighting', 'electronics', 'car-care', 'dashboard'],
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

productSchema.pre('save', function () {
  const hasVariants =
    this.variants &&
    this.variants.length > 0

  this.hasVariants = hasVariants

  if (hasVariants) {
    const totalVariantStock =
      this.variants.reduce(
        (sum, variant) =>
          sum +
          Number(
            variant.stock || 0
          ),
        0
      )

    this.stock =
      totalVariantStock

    this.isOutOfStock =
      totalVariantStock <= 0
  } else {
    this.stock = Math.max(
      0,
      Number(this.stock || 0)
    )

    this.isOutOfStock =
      this.stock === 0
  }
})

productSchema.pre(
  'findOneAndUpdate',
  function (next) {
    const update =
      this.getUpdate() || {}

    const variants =
      update.variants ??
      update.$set?.variants

    if (
      variants &&
      variants.length > 0
    ) {
      const totalStock =
        variants.reduce(
          (sum, variant) =>
            sum +
            Number(
              variant.stock || 0
            ),
          0
        )

      if (update.$set) {
        update.$set.stock =
          totalStock

        update.$set
          .isOutOfStock =
          totalStock <= 0

        update.$set
          .hasVariants = true
      } else {
        update.stock =
          totalStock

        update.isOutOfStock =
          totalStock <= 0

        update.hasVariants =
          true
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

export default mongoose.model('Product', productSchema);
