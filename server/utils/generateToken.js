import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import User from '../models/userModel.js';

/**
 * Generates short-lived accessToken and long-lived refreshToken.
 * Stores accessToken and refreshToken in httpOnly cookies.
 * Saves hashed refreshToken in DB.
 * @param {Response} res 
 * @param {Object|string} user 
 * @returns {Promise<string>} accessToken
 */
export const generateToken = async (res, user) => {
  const userId = user._id || user.id || user;
  const role = user.role || 'customer';

  // 1. Generate short-lived access token
  const token = jwt.sign(
    { id: userId, role },
    process.env.JWT_SECRET,
    { expiresIn: '15m' } // 15 mins expiry
  );

  // 2. Generate long-lived refresh token
  const refreshSecret = process.env.JWT_REFRESH_SECRET || (process.env.JWT_SECRET + '_refresh');
  const refreshId = crypto.randomBytes(40).toString('hex');
  const refreshToken = jwt.sign(
    { id: userId, refreshId },
    refreshSecret,
    { expiresIn: '7d' } // 7 days expiry
  );

  // 3. Set access token cookie
  res.cookie('token', token, {
    httpOnly: true,
    secure:   process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    maxAge:   15 * 60 * 1000, // 15 mins
    path:     '/',
  });

  // 4. Set refresh token cookie
  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure:   process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    maxAge:   7 * 24 * 60 * 60 * 1000, // 7 days
    path:     '/',
  });

  // 5. Save the refresh token to User database (hashed)
  try {
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const hashedRefresh = crypto.createHash('sha256').update(refreshToken).digest('hex');

    await User.findByIdAndUpdate(userId, {
      $push: {
        refreshTokens: { token: hashedRefresh, expiresAt }
      }
    });

    // Automatically prune expired refresh tokens to prevent bloating
    await User.findByIdAndUpdate(userId, {
      $pull: {
        refreshTokens: { expiresAt: { $lt: new Date() } }
      }
    });
  } catch (err) {
    console.error('Failed to save refresh token to DB:', err.message);
  }

  return token;
};

/**
 * Clears both access token and refresh token cookies.
 * @param {Response} res 
 */
export const clearToken = (res) => {
  res.cookie('token', '', {
    httpOnly: true,
    expires:  new Date(0),
    secure:   process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    path:     '/',
  });

  res.cookie('refreshToken', '', {
    httpOnly: true,
    expires:  new Date(0),
    secure:   process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    path:     '/',
  });
};
