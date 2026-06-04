import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import User from '../models/userModel.js';
import { generateToken, clearToken } from '../utils/generateToken.js';

export const protect = async (req, res, next) => {
  try {
    const token = req.cookies?.token;

    if (!token) {
      // Access token is missing, attempt to refresh using the refresh token
      return await handleTokenRefresh(req, res, next);
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id).select('-password');

      if (!user) {
        clearToken(res);
        return res.status(401).json({ message: 'Not authorized, user not found' });
      }

      if (user.status === 'disabled') {
        clearToken(res);
        return res.status(401).json({ message: 'This account has been disabled. Please contact support.' });
      }

      req.user = user;
      req.token = token;
      return next();
    } catch (err) {
      // Access token is expired/invalid, try refresh token
      if (err.name === 'TokenExpiredError' || err.name === 'JsonWebTokenError') {
        return await handleTokenRefresh(req, res, next);
      }
      throw err;
    }
  } catch (error) {
    console.log('PROTECT MIDDLEWARE ERROR:', error);
    clearToken(res);
    return res.status(401).json({ message: 'Not authorized, token failed' });
  }
};

const handleTokenRefresh = async (req, res, next) => {
  const refreshToken = req.cookies?.refreshToken;
  if (!refreshToken) {
    clearToken(res);
    return res.status(401).json({ message: 'Not authorized, no token' });
  }

  try {
    const refreshSecret = process.env.JWT_REFRESH_SECRET || (process.env.JWT_SECRET + '_refresh');
    const decoded = jwt.verify(refreshToken, refreshSecret);

    // Hash refresh token to verify against whitelisted DB tokens
    const hashedRefresh = crypto.createHash('sha256').update(refreshToken).digest('hex');

    // Retrieve user and check if token is valid and hasn't expired in database
    const user = await User.findOne({
      _id: decoded.id,
      'refreshTokens.token': hashedRefresh,
      'refreshTokens.expiresAt': { $gt: new Date() }
    }).select('-password');

    if (!user) {
      clearToken(res);
      return res.status(401).json({ message: 'Not authorized, session expired or revoked' });
    }

    if (user.status === 'disabled') {
      clearToken(res);
      return res.status(401).json({ message: 'This account has been disabled. Please contact support.' });
    }

    // Revoke the old refresh token (implementing refresh token rotation)
    await User.findByIdAndUpdate(user._id, {
      $pull: { refreshTokens: { token: hashedRefresh } }
    });

    // Generate new access token and rotated refresh token
    const newToken = await generateToken(res, user);

    req.user = user;
    req.token = newToken;
    return next();
  } catch (err) {
    console.log('REFRESH TOKEN ERROR:', err.message);
    clearToken(res);
    return res.status(401).json({ message: 'Not authorized, session expired' });
  }
};

export const adminOnly = (req, res, next) => {
  try {
    if (req.user && (req.user.role === 'admin' || req.user.role === 'super_admin')) {
      return next(); // ✅ ensured return
    }

    return res.status(403).json({ message: 'Admin access only' });
  } catch (error) {
    console.log('ADMIN MIDDLEWARE ERROR:', error);
    return res.status(500).json({ message: 'Server error' });
  }
};

export const superAdminOnly = (req, res, next) => {
  try {
    if (req.user && req.user.role === 'super_admin') {
      return next();
    }

    return res.status(403).json({ message: 'Super Admin access only' });
  } catch (error) {
    console.log('SUPER ADMIN MIDDLEWARE ERROR:', error);
    return res.status(500).json({ message: 'Server error' });
  }
};