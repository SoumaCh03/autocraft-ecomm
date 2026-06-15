import mongoose from 'mongoose';

const entityVersionSchema = new mongoose.Schema({
  version: { type: Number, default: 1 },
  lastModifiedTime: { type: Date, default: Date.now },
  lastModifiedBy: { type: String, default: 'system' },
  updateToken: { type: String, default: () => new mongoose.Types.ObjectId().toString() }
}, { _id: false });

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
  entityVersion: { type: entityVersionSchema, default: () => ({}) },
}, { timestamps: true });

couponSchema.pre('save', function (next) {
  this.code = String(this.code || '').trim().toUpperCase();

  if (!this.entityVersion) {
    this.entityVersion = {
      version: 1,
      lastModifiedTime: new Date(),
      lastModifiedBy: 'system',
      updateToken: new mongoose.Types.ObjectId().toString()
    };
  } else if (this.isModified()) {
    if (this.isNew) {
      this.entityVersion.version = 1;
      this.entityVersion.updateToken = new mongoose.Types.ObjectId().toString();
    } else {
      this.entityVersion.version += 1;
      this.entityVersion.lastModifiedTime = new Date();
      this.entityVersion.updateToken = new mongoose.Types.ObjectId().toString();
    }
  }
  next();
});

export default mongoose.model('Coupon', couponSchema);
