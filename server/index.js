import dotenv from 'dotenv';
dotenv.config(); // MUST BE FIRST

import express from 'express';
import mongoose from 'mongoose';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import connectDB from './config/db.js';
import session from 'express-session';
import helmet from 'helmet';

import passport from './config/passport.js';

import authRoutes        from './routes/authRoutes.js';
import productRoutes     from './routes/productRoutes.js';
import orderRoutes       from './routes/orderRoutes.js';
import paymentRoutes     from './routes/paymentRoutes.js';
import uploadRoutes      from './routes/uploadRoutes.js';
import couponRoutes      from './routes/couponRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';
import categoryRoutes    from './routes/categoryRoutes.js';
import analyticsRoutes   from './routes/analyticsRoutes.js';
import governanceRoutes  from './routes/governanceRoutes.js';
import visitorAnalyticsRoutes from './routes/visitorAnalyticsRoutes.js';
import abandonedCheckoutRoutes from './routes/abandonedCheckoutRoutes.js';
import syncRoutes from './routes/syncRoutes.js';
import seoRoutes from './routes/seoRoutes.js';

import { sanitizeInput } from './middleware/sanitizeMiddleware.js';
import { apiLimiter, authLimiter, passwordResetLimiter } from './middleware/rateLimitMiddleware.js';

import { initNotificationSocket } from './sockets/notificationSocket.js';
import { initNotificationEmitter } from './utils/notificationEmitter.js';
import { startAnalyticsCleanupJob } from './utils/analyticsCleanup.js';
import { startAbandonedCheckoutJob } from './utils/visitorTracker.js';

connectDB();
startAnalyticsCleanupJob();
startAbandonedCheckoutJob();

const app = express();

app.set('trust proxy', 1);

// --- OPTIMIZED HEALTH CHECK ---
app.get('/health', (req, res) => {
  const dbState = mongoose.connection.readyState;
  const dbStatusMap = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting',
    99: 'uninitialized'
  };

  res.status(dbState === 1 ? 200 : 503).json({
    status: dbState === 1 ? 'AUTOCRAFT server running' : 'AUTOCRAFT server degraded',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    database: {
      state: dbState,
      status: dbStatusMap[dbState] || 'unknown'
    }
  });
});
// ------------------------------

const defaultAllowedOrigins = [
  'http://localhost:5173',
  'http://localhost:4173',
];

const envAllowedOrigins = process.env.CLIENT_URL
  ? process.env.CLIENT_URL.split(',').map((origin) => origin.trim()).filter(Boolean)
  : [];

const allowedOrigins = [...new Set([...defaultAllowedOrigins, ...envAllowedOrigins])];

app.use(helmet({
  contentSecurityPolicy: false, // Pure API server; CSP is disabled to not block frontend client assets
  crossOriginOpenerPolicy: { policy: 'same-origin' },
  crossOriginResourcePolicy: { policy: 'cross-origin' }, // Allow cross-origin resource loading (images, fonts, API responses)
  originAgentCluster: true,
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  strictTransportSecurity: {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
  },
  xContentTypeOptions: true, // nosniff
  xFrameOptions: { action: 'sameorigin' },
  permissionsPolicy: {
    features: {
      camera: ["'none'"],
      microphone: ["'none'"],
      geolocation: ["'self'"],
      payment: ["'self'"],
    }
  },
}));

app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    return callback(new Error(`CORS blocked for origin: ${origin}`));
  },
  credentials: true,
}));

// Payload size limits to protect against buffer overflow/JSON flooding DOS
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

app.use(cookieParser());

// Custom recursive NoSQL Injection sanitizer
app.use(sanitizeInput);

// Rate limiting setup
app.use('/api', apiLimiter);

// Specific brute-force protection rate limits
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);
app.use('/api/auth/forgot-password', passwordResetLimiter);
app.use('/api/auth/reset-password', passwordResetLimiter);
app.use('/api/auth/reset-password-otp', passwordResetLimiter);

app.use(session({
  secret: process.env.SESSION_SECRET || 'autocraft_secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    maxAge: 24 * 60 * 60 * 1000,
  },
}));

app.use(passport.initialize());
app.use(passport.session());

app.use('/api/auth',          authRoutes);
app.use('/api/products',       productRoutes);
app.use('/api/orders',         orderRoutes);
app.use('/api/payment',        paymentRoutes);
app.use('/api/upload',         uploadRoutes);
app.use('/api/coupons',        couponRoutes);
app.use('/api/notifications',  notificationRoutes);
app.use('/api/categories',     categoryRoutes);
app.use('/api/analytics',      analyticsRoutes);
app.use('/api/governance',     governanceRoutes);
app.use('/api/visitor-analytics', visitorAnalyticsRoutes);
app.use('/api/abandoned-checkouts', abandonedCheckoutRoutes);
app.use('/api/sync',          syncRoutes);
app.use('/api/seo',           seoRoutes);


app.use((err, req, res, next) => {
  console.error('GLOBAL ERROR:', err);
  res.status(500).json({
    message: err.message || 'Internal Server Error',
  });
});

const PORT = process.env.PORT || 5000;

// Create HTTP server for Socket.IO
const httpServer = createServer(app);

// Initialize Socket.IO with CORS settings
const io = new Server(httpServer, {
  cors: {
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error(`CORS blocked for origin: ${origin}`));
    },
    credentials: true,
  },
  transports: ['websocket', 'polling'],
  pingInterval: 25000,
  pingTimeout: 60000,
});

// Initialize notification socket and emitter
initNotificationSocket(io);
initNotificationEmitter(io);

// Export io for use in routes
export { io };

httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down AUTOCRAFT server...');

  httpServer.close(() => {
    console.log('✅ HTTP server closed');
    process.exit(0);
  });
});

process.on('SIGTERM', async () => {
  console.log('\n🛑 SIGTERM received. Closing server...');

  httpServer.close(() => {
    console.log('✅ HTTP server closed');
    process.exit(0);
  });
});
