import mongoose from 'mongoose';

const couponSchema = new mongoose.Schema({
  code: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    trim: true,
  },
  type: {
    type: String,
    enum: ['percentage', 'fixed'],
    required: true,
    default: 'percentage',
  },
  value: {
    type: Number,
    required: true,
    min: 0,
  },
  expiry: {
    type: Date,
    required: true,
  },
  minimumOrder: {
    type: Number,
    default: 0,
    min: 0,
  },
  usageLimit: {
    type: Number,
    default: 0,
    min: 0,
  },
  usedCount: {
    type: Number,
    default: 0,
    min: 0,
  },
  revenueImpact: {
    type: Number,
    default: 0,
    min: 0,
  },
  active: {
    type: Boolean,
    default: true,
  },
}, { timestamps: true });

couponSchema.pre('save', function () {
  this.code = String(this.code || '').trim().toUpperCase();
});

export default mongoose.model('Coupon', couponSchema);
