import mongoose from 'mongoose';

const reviewSchema = new mongoose.Schema({
  user:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name:    { type: String, required: true },
  rating:  { type: Number, required: true, min: 1, max: 5 },
  comment: { type: String, required: true },
}, { timestamps: true });

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
  reviews:     [reviewSchema],
  rating:      { type: Number, default: 0 },
  numReviews:  { type: Number, default: 0 },
  tags:        [{ type: String }],
}, { timestamps: true });

/* ✅ FIXED HOOK */
productSchema.pre('save', function () {
  this.isOutOfStock = this.stock === 0;
});

export default mongoose.model('Product', productSchema);

