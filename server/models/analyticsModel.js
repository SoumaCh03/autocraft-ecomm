import mongoose from 'mongoose';

// 1. Raw Analytics Event Schema
const analyticsEventSchema = new mongoose.Schema({
  sessionID: {
    type: String,
    required: true,
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
  },
  eventType: {
    type: String,
    required: true,
    enum: [
      'page_view',
      'add_to_cart',
      'checkout_start',
      'payment_start',
      'order_success',
      'search',
      'wishlist_add',
      'click',
      'scroll',
      'interaction'
    ],
  },
  path: {
    type: String,
    trim: true,
  },
  referrer: {
    type: String,
    trim: true,
    default: '',
  },
  source: {
    type: String,
    trim: true,
    default: 'Direct',
  },
  campaign: {
    type: String,
    trim: true,
    default: '',
  },
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    default: null,
  },
  searchQuery: {
    type: String,
    trim: true,
    default: '',
  },
  searchHasResults: {
    type: Boolean,
    default: null,
  },
  location: {
    country: { type: String, default: 'Unknown' },
    state:   { type: String, default: 'Unknown' },
    city:    { type: String, default: 'Unknown' },
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
}, { timestamps: false });

// Indexes for raw event querying and cleanup performance
analyticsEventSchema.index({ sessionID: 1 });
analyticsEventSchema.index({ eventType: 1, timestamp: -1 });
analyticsEventSchema.index({ timestamp: -1 });
analyticsEventSchema.index({ productId: 1 });
analyticsEventSchema.index({ user: 1 });
analyticsEventSchema.index({ source: 1 });

// 2. Aggregated Heatmap Analytics Schema
const heatmapAnalyticsSchema = new mongoose.Schema({
  page: {
    type: String,
    required: true,
    lowercase: true,
    trim: true,
  },
  type: {
    type: String,
    required: true,
    enum: ['click', 'scroll', 'interaction'],
  },
  x: {
    type: Number,
    required: true,
    min: 0,
    max: 100,
  },
  y: {
    type: Number,
    required: true,
    min: 0,
    max: 100,
  },
  count: {
    type: Number,
    default: 1,
    min: 1,
  },
  deviceType: {
    type: String,
    enum: ['desktop', 'tablet', 'mobile'],
    default: 'desktop',
  },
}, { timestamps: true });

// Compound index to facilitate high-frequency aggregation upserts
heatmapAnalyticsSchema.index({ page: 1, type: 1, x: 1, y: 1, deviceType: 1 }, { unique: true });

// 3. Search Analytics Schema
const searchAnalyticsSchema = new mongoose.Schema({
  query: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
  },
  count: {
    type: Number,
    default: 1,
    min: 1,
  },
  noResults: {
    type: Boolean,
    default: false,
  },
  purchases: {
    type: Number,
    default: 0,
    min: 0,
  },
}, { timestamps: true });

searchAnalyticsSchema.index({ query: 1 });

// 4. Analytics System Settings Schema
const analyticsSettingsSchema = new mongoose.Schema({
  retentionDays: {
    type: Number,
    default: 90,
    enum: [30, 90, 180, 365, 9999], // 9999 represents custom/infinite
  },
  heatmapEnabled: {
    type: Boolean,
    default: true,
  },
  trackingSampleRate: {
    type: Number,
    default: 100,
    min: 0,
    max: 100,
  },
}, { timestamps: true });

const AnalyticsEvent = mongoose.model('AnalyticsEvent', analyticsEventSchema);
const HeatmapAnalytics = mongoose.model('HeatmapAnalytics', heatmapAnalyticsSchema);
const SearchAnalytics = mongoose.model('SearchAnalytics', searchAnalyticsSchema);
const AnalyticsSettings = mongoose.model('AnalyticsSettings', analyticsSettingsSchema);

export {
  AnalyticsEvent,
  HeatmapAnalytics,
  SearchAnalytics,
  AnalyticsSettings,
};
