import jwt from 'jsonwebtoken';
import User from '../models/userModel.js';

export const protect = async (req, res, next) => {
  try {
    // 🔥 safer token extraction
    const token = req.cookies?.token;

    if (!token) {
      return res.status(401).json({ message: 'Not authorized, no token' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findById(decoded.id).select('-password');

    if (!user) {
      return res.status(401).json({ message: 'User not found' });
    }

    req.user = user;

    return next(); // ✅ ensured return
  } catch (error) {
    console.log('PROTECT MIDDLEWARE ERROR:', error); // 🔥 debug added
    return res.status(401).json({ message: 'Not authorized, token failed' });
  }
};

export const adminOnly = (req, res, next) => {
  try {
    if (req.user && req.user.role === 'admin') {
      return next(); // ✅ ensured return
    }

    return res.status(403).json({ message: 'Admin access only' });
  } catch (error) {
    console.log('ADMIN MIDDLEWARE ERROR:', error); // 🔥 debug added
    return res.status(500).json({ message: 'Server error' });
  }
};