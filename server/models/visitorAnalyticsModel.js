import mongoose from 'mongoose';

const journeyStepSchema = new mongoose.Schema({
  step: {
    type: String,
    required: true,
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
  path: {
    type: String,
    required: true,
  }
}, { _id: false });

const visitorAnalyticsSchema = new mongoose.Schema({
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
  isRegistered: {
    type: Boolean,
    default: false,
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
  language: {
    type: String,
    default: '',
  },
  timezone: {
    type: String,
    default: '',
  },
  firstVisit: {
    type: Date,
    default: Date.now,
  },
  lastVisit: {
    type: Date,
    default: Date.now,
    index: true,
  },
  pagesVisited: [{
    type: String
  }],
  visitCount: {
    type: Number,
    default: 1,
  },
  totalSessionTime: {
    type: Number,
    default: 0, // In seconds
  },
  journey: [journeyStepSchema],
}, { timestamps: true });

// Compound index to quickly find user session details
visitorAnalyticsSchema.index({ visitorId: 1, sessionId: 1 }, { unique: true });
visitorAnalyticsSchema.index({ createdAt: -1 });

export default mongoose.model('VisitorAnalytics', visitorAnalyticsSchema);
