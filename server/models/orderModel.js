import mongoose from 'mongoose';

const returnHistorySchema = new mongoose.Schema({
  status: { type: String, required: true },
  note:   { type: String, default: '' },
  date:   { type: Date, default: Date.now },
}, { _id: false });

const returnRequestSchema = new mongoose.Schema({
  requested:   { type: Boolean, default: false },
  requestedAt: { type: Date },
  reason:      { type: String, trim: true, default: '' },
  status: {
    type: String,
    enum: ['none', 'requested', 'approved', 'rejected', 'received', 'refunded'],
    default: 'none',
  },
  adminNote: { type: String, trim: true, default: '' },
  history:   [returnHistorySchema],
}, { _id: false });

const trackingInfoSchema = new mongoose.Schema({
  courierName: { type: String, trim: true, default: '' },
  trackingId:  { type: String, trim: true, default: '' },
  trackingUrl: { type: String, trim: true, default: '' },
  updatedAt:   { type: Date },
}, { _id: false });

const orderSchema = new mongoose.Schema({
  user: {
    type:     mongoose.Schema.Types.ObjectId,
    ref:      'User',
    required: true,
  },
  items: [{
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    name:    { type: String, required: true },
    image:   { type: String },
    price:   { type: Number, required: true },
    qty:     { type: Number, required: true, default: 1 },
    variant: {
      id:    mongoose.Schema.Types.ObjectId,
      name:  String,
      sku:   String,
      price: Number,
    },
  }],
  shippingAddress: {
    name:    { type: String, required: true },
    phone:   { type: String, required: true },
    street:  { type: String, required: true },
    city:    { type: String, required: true },
    state:   { type: String, required: true },
    pincode: { type: String, required: true },
  },
  paymentMethod: {
    type:    String,
    enum:    ['razorpay', 'cod'],
    default: 'razorpay',
  },
  paymentResult: {
    razorpay_order_id:   String,
    razorpay_payment_id: String,
    razorpay_signature:  String,
    status:              String,
  },
  itemsPrice:    { type: Number, required: true },
  discountPrice: { type: Number, required: true, default: 0 },
  coupon: {
    code:     { type: String, trim: true, uppercase: true, default: '' },
    type:     { type: String, enum: ['percentage', 'fixed', ''], default: '' },
    value:    { type: Number, default: 0 },
    discount: { type: Number, default: 0 },
  },
  shippingPrice: { type: Number, required: true, default: 0 },
  totalPrice:    { type: Number, required: true },
  isPaid:        { type: Boolean, default: false },
  paidAt:        { type: Date },
  status: {
    type:    String,
    enum:    ['pending', 'processing', 'shipped', 'delivered', 'cancelled'],
    default: 'pending',
  },
  shippedAt:           { type: Date },
  deliveredAt:         { type: Date },
  inventoryDeducted:   { type: Boolean, default: false },
  inventoryDeductedAt: { type: Date },
  trackingInfo:        { type: trackingInfoSchema, default: () => ({}) },
  returnRequest:       { type: returnRequestSchema, default: () => ({}) },
  billUrl:             { type: String, default: '' },
  invoiceNumber:       { type: String, default: '' },
  invoiceGeneratedAt:  { type: Date },
}, { timestamps: true });

orderSchema.pre('save', function () {
  if (!this.invoiceNumber) {
    this.invoiceNumber = `AC-${new Date().getFullYear()}-${this._id.toString().slice(-8).toUpperCase()}`;
    this.invoiceGeneratedAt = new Date();
  }
});

orderSchema.index({ user: 1, createdAt: -1 });
orderSchema.index({ status: 1 });
orderSchema.index({ 'paymentResult.razorpay_order_id': 1 });

export default mongoose.model('Order', orderSchema);

