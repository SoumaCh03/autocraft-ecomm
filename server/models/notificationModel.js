import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  type: {
    type: String,
    enum: [
      'new_order',
      'order_shipped',
      'order_delivered',
      'low_stock',
      'back_in_stock',
      'return_request',
      'return_approved',
      'return_rejected',
      'refunded',
      'coupon_expiry',
    ],
    required: true,
  },
  title: {
    type: String,
    required: true,
  },
  message: {
    type: String,
    required: true,
  },
  relatedData: {
    orderId: mongoose.Schema.Types.ObjectId,
    productId: mongoose.Schema.Types.ObjectId,
    couponCode: String,
  },
  read: {
    type: Boolean,
    default: false,
    index: true,
  },
  role: {
    type: String,
    enum: ['admin', 'customer'],
    required: true,
  },
  deduplicationToken: {
    type: String,
    index: true,
  },
  socketDelivered: {
    type: Boolean,
    default: false,
  },
  socketDeliveredAt: Date,
  createdAt: {
    type: Date,
    default: Date.now,
    index: true,
  },
}, { timestamps: true });

notificationSchema.index({ user: 1, read: 1, createdAt: -1 });

export default mongoose.model('Notification', notificationSchema);
