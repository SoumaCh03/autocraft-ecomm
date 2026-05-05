import mongoose from 'mongoose';

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
  shippingPrice: { type: Number, required: true, default: 0 },
  totalPrice:    { type: Number, required: true },
  isPaid:        { type: Boolean, default: false },
  paidAt:        { type: Date },
  status: {
    type:    String,
    enum:    ['pending', 'processing', 'shipped', 'delivered', 'cancelled'],
    default: 'pending',
  },
  deliveredAt: { type: Date },
  billUrl:     { type: String, default: '' },
}, { timestamps: true });

export default mongoose.model('Order', orderSchema);