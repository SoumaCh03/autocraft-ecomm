import crypto from 'crypto';
import User from '../models/userModel.js';
import { generateToken, clearToken } from '../utils/generateToken.js';
import sendEmail from '../utils/sendEmail.js';

// Store OTPs temporarily in memory (use Redis in production)
const otpStore = new Map();

const generateOTP = () => Math.floor(100000 + Math.random() * 900000).toString();

// @POST /api/auth/send-otp
export const sendOTP = async (req, res) => {
  try {
    const { email, type } = req.body;

    if (!email) return res.status(400).json({ message: 'Email is required' });

    if (type === 'register') {
      const exists = await User.findOne({ email });
      if (exists) return res.status(400).json({ message: 'Email already registered' });
    }

    if (type === 'reset') {
      const exists = await User.findOne({ email });
      if (!exists) return res.status(404).json({ message: 'No account with that email' });
    }

    const otp     = generateOTP();
    const expires = Date.now() + 10 * 60 * 1000; // 10 minutes

    otpStore.set(email, { otp, expires, type });

    await sendEmail({
      to:      email,
      subject: type === 'register' ? 'AUTOCRAFT — Verify Your Email' : 'AUTOCRAFT — Password Reset OTP',
      html: `
        <div style="font-family:sans-serif;max-width:500px;margin:auto;padding:30px;background:#080c14;color:#e8eaf0;border-radius:16px;text-align:center;">
          <img src="https://res.cloudinary.com/${process.env.CLOUDINARY_CLOUD_NAME}/image/upload/autocraft/logo.png" style="height:60px;margin-bottom:20px;" onerror="this.style.display='none'"/>
          <h2 style="color:#3b6bff;margin-bottom:8px;">AUTOCRAFT</h2>
          <p style="color:#6b7590;margin-bottom:24px;">
            ${type === 'register' ? 'Verify your email to complete registration' : 'Use this OTP to reset your password'}
          </p>
          <div style="background:#0e1422;border:2px solid #3b6bff;border-radius:12px;padding:24px;margin:20px 0;">
            <p style="color:#6b7590;font-size:14px;margin-bottom:8px;">Your OTP is:</p>
            <h1 style="color:#3b6bff;font-size:42px;letter-spacing:12px;margin:0;">${otp}</h1>
          </div>
          <p style="color:#6b7590;font-size:13px;">This OTP expires in <strong>10 minutes</strong>.</p>
          <p style="color:#6b7590;font-size:12px;margin-top:20px;">If you didn't request this, please ignore this email.</p>
        </div>
      `,
    });

    res.json({ message: 'OTP sent to your email' });
  } catch (error) {
    console.log('SEND OTP ERROR:', error);
    res.status(500).json({ message: error.message });
  }
};

// @POST /api/auth/verify-otp
export const verifyOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;

    const stored = otpStore.get(email);

    if (!stored) {
      return res.status(400).json({ message: 'OTP not found. Please request a new one.' });
    }

    if (Date.now() > stored.expires) {
      otpStore.delete(email);
      return res.status(400).json({ message: 'OTP has expired. Please request a new one.' });
    }

    if (stored.otp !== otp.toString()) {
      return res.status(400).json({ message: 'Invalid OTP. Please try again.' });
    }

    otpStore.delete(email);
    res.json({ message: 'OTP verified successfully', verified: true });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @POST /api/auth/register
export const register = async (req, res) => {
  try {
    const { name, email, password, phone } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Please fill all fields' });
    }

    const exists = await User.findOne({ email });
    if (exists) {
      return res.status(400).json({ message: 'Email already registered' });
    }

    const user = await User.create({ name, email, password, phone, isVerified: true });

    generateToken(res, user._id);

    // Welcome email
    try {
      await sendEmail({
        to:      email,
        subject: '🎉 Welcome to AUTOCRAFT!',
        html: `
          <div style="font-family:sans-serif;max-width:500px;margin:auto;padding:30px;background:#080c14;color:#e8eaf0;border-radius:16px;">
            <h2 style="color:#3b6bff;">Welcome to AUTOCRAFT, ${name}!</h2>
            <p>Your account has been created successfully.</p>
            <p>Start exploring premium car accessories for your vehicle.</p>
            <a href="${process.env.CLIENT_URL}/shop" style="display:inline-block;background:#3b6bff;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;margin-top:16px;">Start Shopping</a>
            <p style="color:#6b7590;font-size:12px;margin-top:24px;">Thank you for joining AUTOCRAFT!</p>
          </div>
        `,
      });
    } catch (emailErr) {
      console.log('Welcome email failed:', emailErr.message);
    }

    res.status(201).json({
      message: 'Account created successfully',
      user: {
        _id:   user._id,
        name:  user.name,
        email: user.email,
        role:  user.role,
      },
    });
  } catch (error) {
    console.log('REGISTER ERROR:', error);
    res.status(500).json({ message: error.message });
  }
};

// @POST /api/auth/login
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Please provide email and password' });
    }

    const user = await User.findOne({ email }).select('+password');

    if (!user || !user.password) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    generateToken(res, user._id);

    res.json({
      message: 'Login successful',
      user: {
        _id:   user._id,
        name:  user.name,
        email: user.email,
        role:  user.role,
        phone: user.phone,
      },
    });
  } catch (error) {
    console.log('LOGIN ERROR:', error);
    res.status(500).json({ message: error.message });
  }
};

// @POST /api/auth/logout
export const logout = (req, res) => {
  clearToken(res);
  res.json({ message: 'Logged out successfully' });
};

// @GET /api/auth/me
export const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    res.json({ user });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @POST /api/auth/forgot-password
export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: 'No account with that email' });

    const resetToken = crypto.randomBytes(32).toString('hex');
    user.resetPasswordToken  = crypto.createHash('sha256').update(resetToken).digest('hex');
    user.resetPasswordExpire = Date.now() + 15 * 60 * 1000;
    await user.save();

    const resetUrl = `${process.env.CLIENT_URL}/reset-password/${resetToken}`;

    await sendEmail({
      to:      user.email,
      subject: 'AUTOCRAFT — Password Reset',
      html: `
        <div style="font-family:sans-serif;max-width:500px;margin:auto;padding:30px;background:#080c14;color:#e8eaf0;border-radius:16px;">
          <h2 style="color:#3b6bff;">AUTOCRAFT</h2>
          <p>You requested a password reset. Click the button below:</p>
          <a href="${resetUrl}" style="display:inline-block;background:#3b6bff;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;margin:20px 0;">Reset Password</a>
          <p style="color:#6b7590;font-size:12px;">This link expires in 15 minutes. If you didn't request this, ignore this email.</p>
        </div>
      `,
    });

    res.json({ message: 'Password reset email sent' });
  } catch (error) {
    console.log('FORGOT PASSWORD ERROR:', error);
    res.status(500).json({ message: error.message });
  }
};

// @POST /api/auth/reset-password/:token
export const resetPassword = async (req, res) => {
  try {
    const hashedToken = crypto.createHash('sha256').update(req.params.token).digest('hex');
    const user = await User.findOne({
      resetPasswordToken:  hashedToken,
      resetPasswordExpire: { $gt: Date.now() },
    });

    if (!user) return res.status(400).json({ message: 'Invalid or expired reset token' });

    user.password            = req.body.password;
    user.resetPasswordToken  = undefined;
    user.resetPasswordExpire = undefined;
    await user.save();

    generateToken(res, user._id);
    res.json({ message: 'Password reset successful' });
  } catch (error) {
    console.log('RESET PASSWORD ERROR:', error);
    res.status(500).json({ message: error.message });
  }
};

// @POST /api/auth/reset-password-otp
export const resetPasswordOTP = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ message: 'Email and password required' });

    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: 'User not found' });

    user.password = password;
    await user.save();

    generateToken(res, user._id);
    res.json({ message: 'Password reset successful' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
