import express from 'express';
import Order from '../models/orderModel.js';
import { protect, adminOnly } from '../middleware/authMiddleware.js';
import sendEmail from '../utils/sendEmail.js';

const router = express.Router();

// POST create order
router.post('/', protect, async (req, res) => {
  try {
    const { items, shippingAddress, paymentMethod, itemsPrice, shippingPrice, totalPrice } = req.body;
    if (!items || items.length === 0) {
      return res.status(400).json({ message: 'No items in order' });
    }

    const order = await Order.create({
      user: req.user._id,
      items,
      shippingAddress,
      paymentMethod,
      itemsPrice,
      shippingPrice,
      totalPrice,
    });

    // Send email notification to admin
    try {
      const itemsList = items.map(i => `${i.name} x${i.qty} — ₹${i.price}`).join('\n');
      await sendEmail({
        to:      process.env.EMAIL_USER,
        subject: `🛒 New Order #${order._id} — AUTOCRAFT`,
        html: `
          <div style="font-family:sans-serif;max-width:600px;margin:auto;padding:24px;background:#080c14;color:#e8eaf0;border-radius:16px;">
            <h2 style="color:#3b6bff;">New Order Received!</h2>
            <p><strong>Order ID:</strong> ${order._id}</p>
            <p><strong>Customer:</strong> ${shippingAddress.name}</p>
            <p><strong>Phone:</strong> ${shippingAddress.phone}</p>
            <p><strong>Address:</strong> ${shippingAddress.street}, ${shippingAddress.city}, ${shippingAddress.state} — ${shippingAddress.pincode}</p>
            <hr style="border-color:#1a2236;margin:16px 0"/>
            <h3 style="color:#00d4ff;">Items Ordered:</h3>
            <pre style="color:#e8eaf0;font-size:14px;">${itemsList}</pre>
            <hr style="border-color:#1a2236;margin:16px 0"/>
            <p><strong>Total:</strong> ₹${totalPrice}</p>
            <p><strong>Payment:</strong> ${paymentMethod}</p>
            <p style="color:#6b7590;font-size:12px;margin-top:24px;">Login to Admin Panel to manage this order.</p>
            <!-- WhatsApp notification can be added here via Twilio API in future -->
          </div>
        `,
      });
    } catch (emailErr) {
      console.log('Admin email notify failed:', emailErr.message);
    }

    // Send welcome email to customer
    try {
      await sendEmail({
        to:      req.user.email,
        subject: `✅ Order Confirmed — AUTOCRAFT #${order._id}`,
        html: `
          <div style="font-family:sans-serif;max-width:600px;margin:auto;padding:24px;background:#080c14;color:#e8eaf0;border-radius:16px;">
            <h2 style="color:#3b6bff;">Thank you for your order!</h2>
            <p>Hi ${shippingAddress.name}, your order has been placed successfully.</p>
            <p><strong>Order ID:</strong> ${order._id}</p>
            <p><strong>Total Paid:</strong> ₹${totalPrice}</p>
            <p><strong>Delivering to:</strong> ${shippingAddress.street}, ${shippingAddress.city}, ${shippingAddress.state} — ${shippingAddress.pincode}</p>
            <p style="color:#6b7590;font-size:12px;margin-top:24px;">You can track your order in My Orders section.</p>
          </div>
        `,
      });
    } catch (emailErr) {
      console.log('Customer email failed:', emailErr.message);
    }

    res.status(201).json({ order });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// GET my orders
router.get('/my', protect, async (req, res) => {
  try {
    const orders = await Order.find({ user: req.user._id }).sort({ createdAt: -1 });
    res.json({ orders });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// GET single order
router.get('/:id', protect, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id).populate('user', 'name email phone');
    if (!order) return res.status(404).json({ message: 'Order not found' });
    if (order.user._id.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized' });
    }
    res.json({ order });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// GET all orders (admin)
router.get('/', protect, adminOnly, async (req, res) => {
  try {
    const orders = await Order.find().populate('user', 'name email phone').sort({ createdAt: -1 });
    res.json({ orders });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// PUT update order status (admin)
router.put('/:id/status', protect, adminOnly, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Order not found' });

    const prevStatus = order.status;
    order.status = req.body.status;

    if (req.body.status === 'delivered') {
      order.deliveredAt = Date.now();
    }
    await order.save();

    // Email customer when status changes
    try {
      const customerUser = await (await import('../models/userModel.js')).default.findById(order.user);
      if (customerUser?.email) {
        const statusMessages = {
          processing: 'Your order is being processed.',
          shipped:    'Your order has been shipped and is on its way!',
          delivered:  'Your order has been delivered. Enjoy!',
          cancelled:  'Your order has been cancelled.',
        };
        if (statusMessages[req.body.status]) {
          await sendEmail({
            to:      customerUser.email,
            subject: `Order Update — ${req.body.status.toUpperCase()} — AUTOCRAFT`,
            html: `
              <div style="font-family:sans-serif;max-width:600px;margin:auto;padding:24px;background:#080c14;color:#e8eaf0;border-radius:16px;">
                <h2 style="color:#3b6bff;">Order Status Update</h2>
                <p>Hi ${customerUser.name},</p>
                <p>${statusMessages[req.body.status]}</p>
                <p><strong>Order ID:</strong> ${order._id}</p>
                <p><strong>New Status:</strong> ${req.body.status.toUpperCase()}</p>
                <p style="color:#6b7590;font-size:12px;margin-top:24px;">Check your order details in My Orders section.</p>
              </div>
            `,
          });
        }
      }
    } catch (emailErr) {
      console.log('Status email failed:', emailErr.message);
    }

    res.json({ order });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// PUT upload bill URL (admin)
router.put('/:id/bill', protect, adminOnly, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Order not found' });
    order.billUrl = req.body.billUrl;
    await order.save();
    res.json({ order, message: 'Bill uploaded successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;