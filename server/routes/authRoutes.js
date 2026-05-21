import express from 'express';
import passport from 'passport';
import User from '../models/userModel.js';
import {
  register,
  login,
  logout,
  getMe,
  forgotPassword,
  resetPassword,
  sendOTP,
  verifyOTP,
  resetPasswordOTP,
} from '../controllers/authController.js';
import { protect } from '../middleware/authMiddleware.js';
import { generateToken } from '../utils/generateToken.js';

const router = express.Router();

router.post('/send-otp',             sendOTP);
router.post('/verify-otp',           verifyOTP);
router.post('/register',             register);
router.post('/login',                login);
router.post('/logout',               logout);
router.get('/me',       protect,     getMe);
router.post('/forgot-password',      forgotPassword);
router.post('/reset-password/:token', resetPassword);
router.post('/reset-password-otp',   resetPasswordOTP);

router.put('/profile', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    user.name  = req.body.name  || user.name;
    user.phone = req.body.phone || user.phone;
    await user.save();
    res.json({ user });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/wishlist', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).populate('wishlist');
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json({ wishlist: user.wishlist || [] });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/wishlist/:productId', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const productId = req.params.productId;
    const exists = user.wishlist.some((id) => id.toString() === productId);
    if (!exists) user.wishlist.push(productId);

    await user.save();
    const populated = await User.findById(req.user._id).populate('wishlist');
    res.status(201).json({ wishlist: populated.wishlist || [], message: 'Added to wishlist' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.delete('/wishlist/:productId', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    user.wishlist = user.wishlist.filter((id) => id.toString() !== req.params.productId);
    await user.save();

    const populated = await User.findById(req.user._id).populate('wishlist');
    res.json({ wishlist: populated.wishlist || [], message: 'Removed from wishlist' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/google',
  passport.authenticate('google', { scope: ['profile', 'email'] })
);

router.get('/google/callback',
  passport.authenticate('google', {
    failureRedirect: `${process.env.CLIENT_URL}/login?error=google`,
  }),
  (req, res) => {
    generateToken(res, req.user);
    res.redirect(`${process.env.CLIENT_URL}?login=success`);
  }
);

export default router;

