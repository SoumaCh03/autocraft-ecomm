import crypto from 'crypto';
import User from '../models/userModel.js';
import { generateToken, clearToken } from '../utils/generateToken.js';
import sendEmail from '../utils/sendEmail.js';
import { validatePassword } from '../utils/passwordValidator.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

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

      const otp     = generateOTP();
      const expires = Date.now() + 10 * 60 * 1000; // 10 minutes
      otpStore.set(email, { otp, expires, type });

      await sendEmail({
        to:      email,
        subject: 'AUTOCRAFT — Verify Your Email',
        html: `
          <div style="font-family:sans-serif;max-width:500px;margin:auto;padding:30px;background:#080c14;color:#e8eaf0;border-radius:16px;text-align:center;">
            <img src="https://res.cloudinary.com/${process.env.CLOUDINARY_CLOUD_NAME}/image/upload/autocraft/logo.png" style="height:60px;margin-bottom:20px;" onerror="this.style.display='none'"/>
            <h2 style="color:#3b6bff;margin-bottom:8px;">AUTOCRAFT</h2>
            <p style="color:#6b7590;margin-bottom:24px;">Verify your email to complete registration</p>
            <div style="background:#0e1422;border:2px solid #3b6bff;border-radius:12px;padding:24px;margin:20px 0;">
              <p style="color:#6b7590;font-size:14px;margin-bottom:8px;">Your OTP is:</p>
              <h1 style="color:#3b6bff;font-size:42px;letter-spacing:12px;margin:0;">${otp}</h1>
            </div>
            <p style="color:#6b7590;font-size:13px;">This OTP expires in <strong>10 minutes</strong>.</p>
          </div>
        `,
      });

      return res.json({ message: 'OTP sent to your email' });
    }

    if (type === 'reset') {
      const user = await User.findOne({ email });
      // To prevent email enumeration, we always return success message even if user does not exist
      if (!user) {
        return res.json({ message: 'If an account exists, an OTP has been sent.' });
      }

      // Generate secure OTP
      const otp = crypto.randomInt(100000, 1000000).toString();
      const hashedOTP = crypto.createHash('sha256').update(otp).digest('hex');

      user.otpCode = hashedOTP;
      user.otpExpire = Date.now() + 15 * 60 * 1000; // 15 minutes
      user.otpVerified = false;
      await user.save();

      await sendEmail({
        to:      email,
        subject: 'AUTOCRAFT — Password Reset OTP',
        html: `
          <div style="font-family:sans-serif;max-width:500px;margin:auto;padding:30px;background:#080c14;color:#e8eaf0;border-radius:16px;text-align:center;">
            <img src="https://res.cloudinary.com/${process.env.CLOUDINARY_CLOUD_NAME}/image/upload/autocraft/logo.png" style="height:60px;margin-bottom:20px;" onerror="this.style.display='none'"/>
            <h2 style="color:#3b6bff;margin-bottom:8px;">AUTOCRAFT</h2>
            <p style="color:#6b7590;margin-bottom:24px;">Use this OTP to reset your password</p>
            <div style="background:#0e1422;border:2px solid #3b6bff;border-radius:12px;padding:24px;margin:20px 0;">
              <p style="color:#6b7590;font-size:14px;margin-bottom:8px;">Your OTP is:</p>
              <h1 style="color:#3b6bff;font-size:42px;letter-spacing:12px;margin:0;">${otp}</h1>
            </div>
            <p style="color:#6b7590;font-size:13px;">This OTP expires in <strong>15 minutes</strong>.</p>
          </div>
        `,
      });

      return res.json({ message: 'If an account exists, an OTP has been sent.' });
    }

    return res.status(400).json({ message: 'Invalid OTP type' });
  } catch (error) {
    console.log('SEND OTP ERROR:', error);
    res.status(500).json({ message: error.message });
  }
};

// @POST /api/auth/verify-otp
export const verifyOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) {
      return res.status(400).json({ message: 'Email and OTP are required' });
    }

    // 1. Try DB user first (for reset password)
    const user = await User.findOne({ email });
    if (user && user.otpCode && user.otpExpire) {
      if (Date.now() > user.otpExpire.getTime()) {
        user.otpCode = undefined;
        user.otpExpire = undefined;
        await user.save();
        return res.status(400).json({ message: 'OTP has expired. Please request a new one.' });
      }

      const hashedInput = crypto.createHash('sha256').update(otp.toString()).digest('hex');
      const match = crypto.timingSafeEqual(Buffer.from(user.otpCode), Buffer.from(hashedInput));
      if (match) {
        user.otpVerified = true;
        await user.save();

        const resetToken = jwt.sign(
          { email: user.email, purpose: 'reset-password' },
          process.env.JWT_SECRET,
          { expiresIn: '5m' }
        );

        return res.json({
          message: 'OTP verified successfully',
          verified: true,
          resetToken
        });
      }
    }

    // 2. Try in-memory store (for register verification)
    const stored = otpStore.get(email);
    if (stored) {
      if (Date.now() > stored.expires) {
        otpStore.delete(email);
        return res.status(400).json({ message: 'OTP has expired. Please request a new one.' });
      }

      if (stored.otp === otp.toString()) {
        otpStore.delete(email);
        return res.json({ message: 'OTP verified successfully', verified: true });
      }
    }

    return res.status(400).json({ message: 'Invalid OTP. Please try again.' });
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

    const token = await generateToken(res, user);

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
      token,
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

    const token = await generateToken(res, user);

    res.json({
      message: 'Login successful',
      token,
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
export const logout = async (req, res) => {
  try {
    const refreshToken = req.cookies?.refreshToken;
    if (refreshToken) {
      const hashedRefresh = crypto.createHash('sha256').update(refreshToken).digest('hex');
      await User.findOneAndUpdate(
        { 'refreshTokens.token': hashedRefresh },
        { $pull: { refreshTokens: { token: hashedRefresh } } }
      );
    }
  } catch (err) {
    console.error('Logout token cleanup failed:', err.message);
  }

  if (req.session) {
    req.session.destroy();
  }

  clearToken(res);
  res.json({ message: 'Logged out successfully' });
};

// @GET /api/auth/me
export const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    res.json({
      user,
      token: req.token,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @POST /api/auth/forgot-password
export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });

    // Protect against email enumeration
    if (!user) {
      return res.json({ message: 'If an account exists, a reset link has been sent.' });
    }

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

    res.json({ message: 'If an account exists, a reset link has been sent.' });
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
    }).select('+password');

    if (!user) return res.status(400).json({ message: 'Invalid or expired reset token' });

    // 1. Password complexity check
    const strength = validatePassword(req.body.password);
    if (!strength.isValid) {
      return res.status(400).json({ message: strength.message });
    }

    // 2. Prevent reuse of current password
    if (user.password) {
      const matchesCurrent = await bcrypt.compare(req.body.password, user.password);
      if (matchesCurrent) {
        return res.status(400).json({ message: 'New password cannot be the same as the current password' });
      }
    }

    // 3. Prevent reuse from history
    if (user.passwordHistory && user.passwordHistory.length > 0) {
      for (const oldHash of user.passwordHistory) {
        const isReused = await bcrypt.compare(req.body.password, oldHash);
        if (isReused) {
          return res.status(400).json({ message: 'New password cannot be one of your previous passwords' });
        }
      }
    }

    // 4. Update history
    user.passwordHistory = user.passwordHistory || [];
    if (user.password) {
      user.passwordHistory.push(user.password);
    }
    if (user.passwordHistory.length > 5) {
      user.passwordHistory.shift();
    }

    user.password            = req.body.password;
    user.resetPasswordToken  = undefined;
    user.resetPasswordExpire = undefined;
    user.refreshTokens       = []; // Revoke all sessions
    await user.save();

    if (req.session) {
      req.session.destroy();
    }

    res.json({ message: 'Password reset successful. Please log in.' });
  } catch (error) {
    console.log('RESET PASSWORD ERROR:', error);
    res.status(500).json({ message: error.message });
  }
};

// @POST /api/auth/reset-password-otp
export const resetPasswordOTP = async (req, res) => {
  try {
    const { email, password, token } = req.body;
    if (!email || !password || !token) {
      return res.status(400).json({ message: 'Email, password, and reset token are required' });
    }

    // 1. Verify strength of new password
    const strength = validatePassword(password);
    if (!strength.isValid) {
      return res.status(400).json({ message: strength.message });
    }

    // 2. Verify the signed resetToken
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      return res.status(400).json({ message: 'Invalid or expired reset token. Please verify OTP again.' });
    }

    if (decoded.email !== email || decoded.purpose !== 'reset-password') {
      return res.status(400).json({ message: 'Invalid token payload' });
    }

    // 3. Find user and verify otpVerified status
    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (!user.otpVerified) {
      return res.status(400).json({ message: 'OTP has not been verified' });
    }

    // 4. Prevent reuse of current password
    if (user.password) {
      const matchesCurrent = await bcrypt.compare(password, user.password);
      if (matchesCurrent) {
        return res.status(400).json({ message: 'New password cannot be the same as the current password' });
      }
    }

    // 5. Prevent reuse of previous passwords
    if (user.passwordHistory && user.passwordHistory.length > 0) {
      for (const oldHash of user.passwordHistory) {
        const isReused = await bcrypt.compare(password, oldHash);
        if (isReused) {
          return res.status(400).json({ message: 'New password cannot be one of your previous passwords' });
        }
      }
    }

    // 6. Push current password to history
    user.passwordHistory = user.passwordHistory || [];
    if (user.password) {
      user.passwordHistory.push(user.password);
    }
    if (user.passwordHistory.length > 5) {
      user.passwordHistory.shift();
    }

    // 7. Update password and clear OTP states
    user.password = password;
    user.otpCode = undefined;
    user.otpExpire = undefined;
    user.otpVerified = false;
    user.refreshTokens = []; // Revoke all sessions
    await user.save();

    if (req.session) {
      req.session.destroy();
    }

    res.json({ message: 'Password reset successful. Please log in.' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @PUT /api/auth/update-password
// @Access Private
export const updatePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword, confirmPassword } = req.body;

    if (!currentPassword || !newPassword || !confirmPassword) {
      return res.status(400).json({ message: 'All password fields are required' });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({ message: 'New passwords do not match' });
    }

    const strength = validatePassword(newPassword);
    if (!strength.isValid) {
      return res.status(400).json({ message: strength.message });
    }

    const user = await User.findById(req.user._id).select('+password');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // 1. Verify current password matches
    const isMatch = await user.matchPassword(currentPassword);
    if (!isMatch) {
      return res.status(401).json({ message: 'Current password is incorrect' });
    }

    // 2. Prevent current password reuse
    if (user.password) {
      const matchesCurrent = await bcrypt.compare(newPassword, user.password);
      if (matchesCurrent) {
        return res.status(400).json({ message: 'New password cannot be the same as the current password' });
      }
    }

    // 3. Prevent reuse from history
    if (user.passwordHistory && user.passwordHistory.length > 0) {
      for (const oldHash of user.passwordHistory) {
        const isReused = await bcrypt.compare(newPassword, oldHash);
        if (isReused) {
          return res.status(400).json({ message: 'New password cannot be one of your previous passwords' });
        }
      }
    }

    // 4. Update password and history
    user.passwordHistory = user.passwordHistory || [];
    if (user.password) {
      user.passwordHistory.push(user.password);
    }
    if (user.passwordHistory.length > 5) {
      user.passwordHistory.shift();
    }

    user.password = newPassword;
    user.refreshTokens = []; // Clear refresh tokens (forces log out of other sessions)
    await user.save();

    if (req.session) {
      req.session.destroy();
    }

    clearToken(res);

    res.json({ message: 'Password updated successfully. Please log in again.' });
  } catch (error) {
    console.error('UPDATE PASSWORD ERROR:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

