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

router.get('/google',
  passport.authenticate('google', { scope: ['profile', 'email'] })
);

router.get('/google/callback',
  passport.authenticate('google', {
    failureRedirect: `${process.env.CLIENT_URL}/login?error=google`,
  }),
  (req, res) => {
    generateToken(res, req.user._id);
    res.redirect(`${process.env.CLIENT_URL}?login=success`);
  }
);

export default router;
