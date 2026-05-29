import express from 'express';
import Order from '../models/orderModel.js';
import Product from '../models/productModel.js';
import User from '../models/userModel.js';
import Coupon from '../models/couponModel.js';
import { protect, adminOnly } from '../middleware/authMiddleware.js';
import sendEmail from '../utils/sendEmail.js';
import { deductInventoryForOrder, releaseExpiredPendingOrders } from '../utils/orderInventory.js';
import { calculateDiscount, validateCoupon } from './couponRoutes.js';
import {
  notifyAllAdmins,
  notifyCustomer as socketNotifyCustomer,
} from '../utils/notificationEmitter.js';

const router = express.Router();

const RETURN_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

const isReturnWindowOpen = (order) => {
  if (order.status !== 'delivered' || !order.deliveredAt) return false;
  return Date.now() - new Date(order.deliveredAt).getTime() <= RETURN_WINDOW_MS;
};

router.post('/', protect, async (req, res) => {
  try {
    // Run self-cleaning cycle on database stock leases before checking stock
    await releaseExpiredPendingOrders();

    const { items, shippingAddress, paymentMethod, itemsPrice, shippingPrice, totalPrice, couponCode } = req.body;
    if (!items || items.length === 0) return res.status(400).json({ message: 'No items in order' });

    for (const item of items) {
      const product = await Product.findById(item.product);
      if (!product) return res.status(404).json({ message: `Product not found: ${item.name}` });
      if (product.isOutOfStock || Number(product.stock || 0) <= 0) {
        return res.status(400).json({ message: `${product.name} is out of stock` });
      }
      if (Number(item.qty || 1) > Number(product.stock || 0)) {
        return res.status(400).json({ message: `Only ${product.stock} units available for ${product.name}` });
      }
    }

    let couponSnapshot = {};
    let discountPrice = 0;

    if (couponCode) {
      const coupon = await Coupon.findOne({ code: String(couponCode).trim().toUpperCase() });
      const couponError = validateCoupon(coupon, itemsPrice);
      if (couponError) return res.status(400).json({ message: couponError });

      discountPrice = calculateDiscount(coupon, itemsPrice);
      couponSnapshot = {
        code: coupon.code,
        type: coupon.type,
        value: coupon.value,
        discount: discountPrice,
      };
    }

    const safeTotalPrice = Math.max(0, Number(itemsPrice || 0) - discountPrice + Number(shippingPrice || 0));

    const order = await Order.create({
      user: req.user._id,
      items,
      shippingAddress,
      paymentMethod,
      itemsPrice,
      discountPrice,
      coupon: couponSnapshot,
      shippingPrice,
      totalPrice: couponCode ? safeTotalPrice : totalPrice,
    });

    try {
      // Reserve stock immediately to prevent double-selling under heavy traffic
      await deductInventoryForOrder(order);
      await order.save();
    } catch (invErr) {
      // Rollback order document if stock allocation fails
      await Order.findByIdAndDelete(order._id);
      return res.status(400).json({ message: invErr.message });
    }

    await notifyAllAdmins({
      type: 'new_order',
      title: `New Order #${order._id}`,
      message: `New order placed by ${shippingAddress.name}`,
      relatedData: { orderId: order._id },
    });

    await socketNotifyCustomer({
      userId: req.user._id,
      type: 'new_order',
      title: 'Order Placed',
      message: `Your order #${order._id} has been placed successfully`,
      relatedData: { orderId: order._id },
    });

    try {
      const itemsList = items.map(i => `${i.name} x${i.qty} - ₹${i.price}`).join('\n');
      await sendEmail({
        to: process.env.EMAIL_USER,
        subject: `New Order #${order._id} - AUTOCRAFT`,
        html: `
          <div style="font-family:sans-serif;max-width:600px;margin:auto;padding:24px;background:#080c14;color:#e8eaf0;border-radius:16px;">
            <h2 style="color:#3b6bff;">New Order Received</h2>
            <p><strong>Order ID:</strong> ${order._id}</p>
            <p><strong>Customer:</strong> ${shippingAddress.name}</p>
            <p><strong>Phone:</strong> ${shippingAddress.phone}</p>
            <p><strong>Address:</strong> ${shippingAddress.street}, ${shippingAddress.city}, ${shippingAddress.state} - ${shippingAddress.pincode}</p>
            <hr style="border-color:#1a2236;margin:16px 0"/>
            <h3 style="color:#00d4ff;">Items Ordered:</h3>
            <pre style="color:#e8eaf0;font-size:14px;">${itemsList}</pre>
            <hr style="border-color:#1a2236;margin:16px 0"/>
            <p><strong>Total:</strong> ₹${totalPrice}</p>
            <p><strong>Payment:</strong> ${paymentMethod}</p>
          </div>
        `,
      });
    } catch (emailErr) {
      console.log('Admin email notify failed:', emailErr.message);
    }

    try {
      await sendEmail({
        to: req.user.email,
        subject: `Order Confirmed - AUTOCRAFT #${order._id}`,
        html: `
          <div style="font-family:sans-serif;max-width:600px;margin:auto;padding:24px;background:#080c14;color:#e8eaf0;border-radius:16px;">
            <h2 style="color:#3b6bff;">Thank you for your order</h2>
            <p>Hi ${shippingAddress.name}, your order has been placed successfully.</p>
            <p><strong>Order ID:</strong> ${order._id}</p>
            <p><strong>Total Paid:</strong> ₹${totalPrice}</p>
            <p><strong>Delivering to:</strong> ${shippingAddress.street}, ${shippingAddress.city}, ${shippingAddress.state} - ${shippingAddress.pincode}</p>
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

router.get('/my', protect, async (req, res) => {
  try {
    const orders = await Order.find({ user: req.user._id }).sort({ createdAt: -1 });
    res.json({ orders });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/:id/return', protect, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id).populate('user', 'name email phone');
    if (!order) return res.status(404).json({ message: 'Order not found' });

    if (order.user._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    if (!isReturnWindowOpen(order)) {
      return res.status(400).json({ message: 'Return window is closed or order is not delivered yet' });
    }

    if (order.returnRequest?.requested) {
      return res.status(400).json({ message: 'Return request already submitted' });
    }

    order.returnRequest = {
      requested: true,
      requestedAt: new Date(),
      reason: req.body.reason || '',
      status: 'requested',
      adminNote: '',
      history: [{
        status: 'requested',
        note: req.body.reason || '',
        date: new Date(),
      }],
    };

    await order.save();

    await notifyAllAdmins({
      type: 'return_request',
      title: `Return Request #${order._id}`,
      message: `Return requested for order #${order._id}`,
      relatedData: { orderId: order._id },
    });

    try {
      await sendEmail({
        to: process.env.EMAIL_USER,
        subject: `Return Request #${order._id} - AUTOCRAFT`,
        html: `
          <div style="font-family:sans-serif;max-width:600px;margin:auto;padding:24px;background:#080c14;color:#e8eaf0;border-radius:16px;">
            <h2 style="color:#3b6bff;">New Return Request</h2>
            <p><strong>Order ID:</strong> ${order._id}</p>
            <p><strong>Customer:</strong> ${order.user.name}</p>
            <p><strong>Email:</strong> ${order.user.email}</p>
            <p><strong>Reason:</strong> ${order.returnRequest.reason || 'No reason provided'}</p>
          </div>
        `,
      });
    } catch (emailErr) {
      console.log('Return admin email failed:', emailErr.message);
    }

    try {
      await sendEmail({
        to: req.user.email,
        subject: `Return Request Submitted - AUTOCRAFT #${order._id}`,
        html: `
          <div style="font-family:sans-serif;max-width:600px;margin:auto;padding:24px;background:#080c14;color:#e8eaf0;border-radius:16px;">
            <h2 style="color:#3b6bff;">Return Request Submitted</h2>
            <p>We have received your return request for order <strong>${order._id}</strong>.</p>
            <p>Our team will review it and contact you soon.</p>
          </div>
        `,
      });
    } catch (emailErr) {
      console.log('Return customer email failed:', emailErr.message);
    }

    res.json({ order, message: 'Return request submitted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.put('/:id/tracking', protect, adminOnly, async (req, res) => {
  try {
    const { courierName, trackingId, trackingUrl } = req.body;
    const order = await Order.findById(req.params.id).populate('user', 'name email phone');
    if (!order) return res.status(404).json({ message: 'Order not found' });

    if (!['shipped', 'delivered'].includes(order.status)) {
      return res.status(400).json({ message: 'Tracking details can be shared after order is shipped' });
    }

    order.trackingInfo = {
      courierName: courierName || '',
      trackingId: trackingId || '',
      trackingUrl: trackingUrl || '',
      updatedAt: new Date(),
    };

    await order.save();

    try {
      if (order.user?.email) {
        await sendEmail({
          to: order.user.email,
          subject: `Tracking Details Shared - AUTOCRAFT #${order._id}`,
          html: `
            <div style="font-family:sans-serif;max-width:600px;margin:auto;padding:24px;background:#080c14;color:#e8eaf0;border-radius:16px;">
              <h2 style="color:#3b6bff;">Your order is on the way</h2>
              <p>Hi ${order.user.name}, tracking details for your AUTOCRAFT order are now available.</p>
              <p><strong>Order ID:</strong> ${order._id}</p>
              <p><strong>Courier:</strong> ${order.trackingInfo.courierName || 'Not provided'}</p>
              <p><strong>Tracking ID:</strong> ${order.trackingInfo.trackingId || 'Not provided'}</p>
              ${order.trackingInfo.trackingUrl ? `<p><a href="${order.trackingInfo.trackingUrl}" style="color:#3b6bff;">Track your order</a></p>` : ''}
            </div>
          `,
        });
      }
    } catch (emailErr) {
      console.log('Tracking email failed:', emailErr.message);
    }

    res.json({ order, message: 'Tracking details shared successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.put('/:id/return-status', protect, adminOnly, async (req, res) => {
  try {
    const { status, adminNote } = req.body;
    const allowed = ['approved', 'rejected', 'received', 'refunded'];

    if (!allowed.includes(status)) {
      return res.status(400).json({ message: 'Invalid return status' });
    }

    const order = await Order.findById(req.params.id).populate('user', 'name email phone');
    if (!order) return res.status(404).json({ message: 'Order not found' });

    if (!order.returnRequest?.requested) {
      return res.status(400).json({ message: 'No return request found for this order' });
    }

    order.returnRequest.status = status;
    order.returnRequest.adminNote = adminNote || order.returnRequest.adminNote || '';
    order.returnRequest.history = order.returnRequest.history || [];
    order.returnRequest.history.push({
      status,
      note: adminNote || '',
      date: new Date(),
    });

    await order.save();

    if (status === 'approved') {
      await socketNotifyCustomer({
        userId: order.user,
        type: 'return_approved',
        title: 'Return Approved',
        message: `Your return request for order #${order._id} has been approved`,
        relatedData: { orderId: order._id },
      });
    } else if (status === 'rejected') {
      await socketNotifyCustomer({
        userId: order.user,
        type: 'return_rejected',
        title: 'Return Rejected',
        message: `Your return request for order #${order._id} has been rejected`,
        relatedData: { orderId: order._id },
      });
    } else if (status === 'refunded') {
      await socketNotifyCustomer({
        userId: order.user,
        type: 'refunded',
        title: 'Refund Processed',
        message: `Your refund for order #${order._id} has been processed`,
        relatedData: { orderId: order._id },
      });
    }

    try {
      if (order.user?.email) {
        const statusText = {
          approved: 'Your return request has been approved.',
          rejected: 'Your return request has been rejected.',
          received: 'Your returned product has been received.',
          refunded: 'Your refund has been processed.',
        };

        await sendEmail({
          to: order.user.email,
          subject: `Return Update - ${status.toUpperCase()} - AUTOCRAFT #${order._id}`,
          html: `
            <div style="font-family:sans-serif;max-width:600px;margin:auto;padding:24px;background:#080c14;color:#e8eaf0;border-radius:16px;">
              <h2 style="color:#3b6bff;">Return Status Update</h2>
              <p>Hi ${order.user.name},</p>
              <p>${statusText[status]}</p>
              <p><strong>Order ID:</strong> ${order._id}</p>
              <p><strong>Status:</strong> ${status.toUpperCase()}</p>
              ${adminNote ? `<p><strong>Note:</strong> ${adminNote}</p>` : ''}
            </div>
          `,
        });
      }
    } catch (emailErr) {
      console.log('Return status email failed:', emailErr.message);
    }

    res.json({ order, message: `Return marked as ${status}` });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

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

router.get('/', protect, adminOnly, async (req, res) => {
  try {
    const orders = await Order.find().populate('user', 'name email phone').sort({ createdAt: -1 });
    res.json({ orders });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.put('/:id/status', protect, adminOnly, async (req, res) => {
  try {
    const requestedStatus = req.body.status;
    const validStatuses = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'];
    if (!validStatuses.includes(requestedStatus)) {
      return res.status(400).json({ message: 'Invalid order status' });
    }

    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Order not found' });

    const prevStatus = order.status;

    if (['shipped', 'delivered'].includes(requestedStatus) && !order.inventoryDeducted) {
      await deductInventoryForOrder(order);
    }

    order.status = requestedStatus;

    if (requestedStatus === 'shipped' && !order.shippedAt) {
      order.shippedAt = new Date();
    }

    if (requestedStatus === 'delivered') {
      if (!order.shippedAt) order.shippedAt = new Date();
      if (!order.deliveredAt) order.deliveredAt = new Date();
      
      // Auto-set COD orders as Paid when delivered
      if (order.paymentMethod === 'cod') {
        order.isPaid = true;
        if (!order.paidAt) order.paidAt = new Date();
      }
    }

    await order.save();

    if (requestedStatus === 'shipped') {
      await socketNotifyCustomer({
        userId: order.user,
        type: 'order_shipped',
        title: 'Order Shipped',
        message: `Your order #${order._id} has been shipped`,
        relatedData: { orderId: order._id },
      });
    }

    if (requestedStatus === 'delivered') {
      await socketNotifyCustomer({
        userId: order.user,
        type: 'order_delivered',
        title: 'Order Delivered',
        message: `Your order #${order._id} has been delivered`,
        relatedData: { orderId: order._id },
      });
    }

    try {
      const customerUser = await User.findById(order.user);
      if (customerUser?.email && prevStatus !== requestedStatus) {
        const statusMessages = {
          processing: 'Your order is being processed.',
          shipped: 'Your order has been shipped and is on its way.',
          delivered: 'Your order has been delivered. Your 7 day return window is now active.',
          cancelled: 'Your order has been cancelled.',
        };

        if (statusMessages[requestedStatus]) {
          await sendEmail({
            to: customerUser.email,
            subject: `Order Update - ${requestedStatus.toUpperCase()} - AUTOCRAFT`,
            html: `
              <div style="font-family:sans-serif;max-width:600px;margin:auto;padding:24px;background:#080c14;color:#e8eaf0;border-radius:16px;">
                <h2 style="color:#3b6bff;">Order Status Update</h2>
                <p>Hi ${customerUser.name},</p>
                <p>${statusMessages[requestedStatus]}</p>
                <p><strong>Order ID:</strong> ${order._id}</p>
                <p><strong>New Status:</strong> ${requestedStatus.toUpperCase()}</p>
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

// PUT update payment status (admin only)
router.put('/:id/pay-status', protect, adminOnly, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Order not found' });

    order.isPaid = Boolean(req.body.isPaid);
    order.paidAt = req.body.isPaid ? new Date() : undefined;
    await order.save();

    res.json({ order, message: `Order payment marked as ${order.isPaid ? 'Paid' : 'Unpaid'}` });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

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