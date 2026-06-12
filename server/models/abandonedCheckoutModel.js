import mongoose from 'mongoose';

const checkoutTimelineSchema = new mongoose.Schema({
  stage: {
    type: String,
    required: true,
  },
  timestamp: {
    type: Date,
    default: Date.now,
  }
}, { _id: false });

const adminNoteSchema = new mongoose.Schema({
  content: {
    type: String,
    required: true,
  },
  timestamp: {
    type: Date,
    default: Date.now,
  }
}, { _id: false });

const cartItemSnapshotSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true,
  },
  name: {
    type: String,
    required: true,
  },
  qty: {
    type: Number,
    required: true,
  },
  price: {
    type: Number,
    required: true,
  },
  image: {
    type: String,
    default: '',
  },
  selectedVariant: {
    id: String,
    name: String,
  }
}, { _id: false });

const abandonedCheckoutSchema = new mongoose.Schema({
  visitorId: {
    type: String,
    required: true,
    index: true,
  },
  sessionId: {
    type: String,
    required: true,
    index: true,
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
    index: true,
  },
  name: {
    type: String,
    trim: true,
    default: '',
  },
  email: {
    type: String,
    lowercase: true,
    trim: true,
    default: '',
  },
  phone: {
    type: String,
    trim: true,
    default: '',
  },
  cartSnapshot: [cartItemSnapshotSchema],
  cartValue: {
    type: Number,
    default: 0,
  },
  itemsCount: {
    type: Number,
    default: 0,
  },
  paymentMethod: {
    type: String,
    default: 'unknown',
  },
  deviceType: {
    type: String,
    default: 'Desktop',
  },
  operatingSystem: {
    type: String,
    default: 'Others',
  },
  browser: {
    type: String,
    default: 'Others',
  },
  screenResolution: {
    type: String,
    default: '',
  },
  lastStage: {
    type: String,
    required: true,
    index: true,
  },
  status: {
    type: String,
    enum: ['pending', 'abandoned', 'converted'],
    default: 'pending',
    index: true,
  },
  reason: {
    type: String,
    default: '',
  },
  timeline: [checkoutTimelineSchema],
  notes: [adminNoteSchema],
  lastActivity: {
    type: Date,
    default: Date.now,
    index: true,
  },
}, { timestamps: true });

// Ensure compound index for fast lookup of session-specific checkout tracking
abandonedCheckoutSchema.index({ visitorId: 1, sessionId: 1 }, { unique: true });
abandonedCheckoutSchema.index({ createdAt: -1 });

export default mongoose.model('AbandonedCheckout', abandonedCheckoutSchema);
