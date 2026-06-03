import rateLimit from 'express-rate-limit';

// Standard rate limit for general API access
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1500, // limit each IP to 1500 requests per windowMs
  message: {
    message: 'Too many requests from this IP, please try again after 15 minutes',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Stricter rate limit for authentication routes to prevent brute-force attacks
export const authLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 10, // limit each IP to 10 requests per windowMs
  message: {
    message: 'Too many login attempts from this IP, please try again after 5 minutes',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Stricter rate limit for password resets to prevent abuse
export const passwordResetLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 requests per windowMs
  message: {
    message: 'Too many password recovery attempts from this IP, please try again after 15 minutes',
  },
  standardHeaders: true,
  legacyHeaders: false,
});
