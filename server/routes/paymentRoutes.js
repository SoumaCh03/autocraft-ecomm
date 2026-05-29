import express from 'express';
import Razorpay from 'razorpay';
import crypto from 'crypto';
import Order from '../models/orderModel.js';
import { protect } from '../middleware/authMiddleware.js';
import { deductInventoryForOrder, releaseExpiredPendingOrders } from '../utils/orderInventory.js';

const router = express.Router();

// Helper to get razorpay instance
const getRazorpay = () => {
  if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
    throw new Error('Razorpay keys not configured');
  }
  return new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
  });
};

// 🔥 CREATE ORDER
router.post('/create-order', protect, async (req, res) => {
  try {
    // Run self-cleaning cycle on database stock leases
    await releaseExpiredPendingOrders();

    const razorpay = getRazorpay();
    const { orderId } = req.body;

    // ✅ Debug log
    console.log('CREATE ORDER REQUEST:', req.body);

    // ❗ STRICT VALIDATION
    if (!orderId) {
      return res.status(400).json({ message: 'Order ID is required' });
    }

    const order = await Order.findById(orderId);

    if (!order) {
      console.log('ORDER NOT FOUND FOR ID:', orderId);
      return res.status(404).json({ message: 'Order not found' });
    }

    // Check if the order is already cancelled because it took too long
    if (order.status === 'cancelled') {
      return res.status(400).json({ message: 'This order session has expired. Please place a new order.' });
    }

    const options = {
      amount: Math.round(order.totalPrice * 100),
      currency: 'INR',
      receipt: `order_${order._id}`,
    };

    const rzpOrder = await razorpay.orders.create(options);

    res.json({ order: rzpOrder });

  } catch (error) {
    console.error('CREATE ORDER ERROR:', error);
    res.status(500).json({ message: error.message });
  }
});

// 🔥 VERIFY PAYMENT
router.post('/verify', protect, async (req, res) => {
  try {
    // Run self-cleaning cycle on database stock leases
    await releaseExpiredPendingOrders();

    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      orderId,
    } = req.body;

    console.log('VERIFY REQUEST:', req.body);

    if (!orderId) {
      return res.status(400).json({ message: 'Order ID missing in verification' });
    }

    const body = razorpay_order_id + '|' + razorpay_payment_id;

    const expected = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(body)
      .digest('hex');

    if (expected !== razorpay_signature) {
      return res.status(400).json({ message: 'Payment verification failed' });
    }

    const order = await Order.findById(orderId);

    if (!order) {
      console.log('VERIFY ORDER NOT FOUND:', orderId);
      return res.status(404).json({ message: 'Order not found' });
    }

    const razorpay = getRazorpay();
    const rzpOrder = await razorpay.orders.fetch(razorpay_order_id);

    if (rzpOrder.amount !== Math.round(order.totalPrice * 100)) {
      return res.status(400).json({ message: 'Amount mismatch' });
    }

    order.isPaid = true;
    order.paidAt = Date.now();
    order.paymentResult = {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      status: 'paid',
    };

    // If order was cancelled because payment took > 15 minutes, attempt to allocate stock or mark for refund
    if (order.status === 'cancelled') {
      try {
        console.log(`⚠️ Order ${order._id} was cancelled prior to payment verification. Attempting stock re-allocation...`);
        // Temporarily reset status so we can check/deduct inventory
        order.status = 'pending';
        await deductInventoryForOrder(order);
        order.status = 'processing';
      } catch (invErr) {
        console.log(`❌ Stock re-allocation failed for paid cancelled order ${order._id}. Marking for manual refund:`, invErr.message);
        order.status = 'processing';
        order.billUrl = 'REFUND_REQUIRED: Out of stock during delayed payment';
      }
    } else {
      order.status = 'processing';
    }

    await order.save();

    res.json({ message: 'Payment verified successfully', order });

  } catch (error) {
    console.error('VERIFY ERROR:', error);
    res.status(500).json({ message: error.message });
  }
});

export default router;
