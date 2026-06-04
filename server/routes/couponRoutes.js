import express from 'express';
import Coupon from '../models/couponModel.js';
import { protect, adminOnly } from '../middleware/authMiddleware.js';
import { logAdminActivity } from '../utils/auditLogger.js';

const router = express.Router();

const calculateDiscount = (coupon, subtotal) => {
  const safeSubtotal = Math.max(0, Number(subtotal || 0));
  if (coupon.type === 'percentage') {
    return Math.min(safeSubtotal, Math.round((safeSubtotal * Number(coupon.value || 0)) / 100));
  }
  return Math.min(safeSubtotal, Math.round(Number(coupon.value || 0)));
};

const validateCoupon = (coupon, subtotal) => {
  if (!coupon || !coupon.active) return 'Coupon is not active';
  if (new Date(coupon.expiry).getTime() < Date.now()) return 'Coupon has expired';
  if (Number(subtotal || 0) < Number(coupon.minimumOrder || 0)) {
    return `Minimum order value is Rs.${Number(coupon.minimumOrder || 0).toLocaleString('en-IN')}`;
  }
  if (coupon.usageLimit > 0 && coupon.usedCount >= coupon.usageLimit) return 'Coupon usage limit reached';
  return '';
};

router.post('/validate', protect, async (req, res) => {
  try {
    const code = String(req.body.code || '').trim().toUpperCase();
    const subtotal = Number(req.body.subtotal || 0);
    if (!code) return res.status(400).json({ message: 'Coupon code is required' });

    const coupon = await Coupon.findOne({ code });
    const error = validateCoupon(coupon, subtotal);
    if (error) return res.status(400).json({ message: error });

    const discount = calculateDiscount(coupon, subtotal);
    res.json({
      coupon: {
        _id: coupon._id,
        code: coupon.code,
        type: coupon.type,
        value: coupon.value,
        minimumOrder: coupon.minimumOrder,
      },
      discount,
      message: `${coupon.code} applied successfully`,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/', protect, adminOnly, async (req, res) => {
  try {
    const coupons = await Coupon.find().sort({ createdAt: -1 });
    res.json({ coupons });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/', protect, adminOnly, async (req, res) => {
  try {
    const payload = {
      code: String(req.body.code || '').trim().toUpperCase(),
      type: req.body.type,
      value: Number(req.body.value || 0),
      expiry: req.body.expiry,
      minimumOrder: Number(req.body.minimumOrder || 0),
      usageLimit: Number(req.body.usageLimit || 0),
      active: req.body.active !== false,
    };

    const coupon = await Coupon.create(payload);
    await logAdminActivity(req, {
      action: 'ADD_COUPON',
      targetType: 'coupon',
      targetId: coupon._id.toString(),
      details: `Created discount coupon "${coupon.code}" (${coupon.type}: ${coupon.value})`
    });
    res.status(201).json({ coupon });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.put('/:id', protect, adminOnly, async (req, res) => {
  try {
    const payload = {
      code: String(req.body.code || '').trim().toUpperCase(),
      type: req.body.type,
      value: Number(req.body.value || 0),
      expiry: req.body.expiry,
      minimumOrder: Number(req.body.minimumOrder || 0),
      usageLimit: Number(req.body.usageLimit || 0),
      active: req.body.active !== false,
    };

    const coupon = await Coupon.findByIdAndUpdate(req.params.id, payload, { new: true, runValidators: true });
    if (!coupon) return res.status(404).json({ message: 'Coupon not found' });
    await logAdminActivity(req, {
      action: 'EDIT_COUPON',
      targetType: 'coupon',
      targetId: coupon._id.toString(),
      details: `Updated coupon "${coupon.code}" details`
    });
    res.json({ coupon });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.delete('/:id', protect, adminOnly, async (req, res) => {
  try {
    const coupon = await Coupon.findByIdAndDelete(req.params.id);
    if (!coupon) return res.status(404).json({ message: 'Coupon not found' });
    await logAdminActivity(req, {
      action: 'DELETE_COUPON',
      targetType: 'coupon',
      targetId: req.params.id,
      details: `Deleted coupon "${coupon.code}"`
    });
    res.json({ message: 'Coupon deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export { calculateDiscount, validateCoupon };
export default router;
