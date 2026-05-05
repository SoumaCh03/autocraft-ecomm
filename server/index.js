import dotenv from 'dotenv';
dotenv.config(); // ✅ MUST BE FIRST

import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import connectDB from './config/db.js';
import session from 'express-session';

// ✅ Passport AFTER dotenv
import passport from './config/passport.js';

// ✅ Routes
import authRoutes    from './routes/authRoutes.js';
import productRoutes from './routes/productRoutes.js';
import orderRoutes   from './routes/orderRoutes.js';
import paymentRoutes from './routes/paymentRoutes.js';
import uploadRoutes  from './routes/uploadRoutes.js'; // ✅ from file 1

// ✅ Connect DB
connectDB();

const app = express();


// 🔥 CORS (must be before routes)
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true,
}));


// 🔥 Body parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));


// 🔥 Cookies
app.use(cookieParser());


// 🔥 Session (required for Passport Google OAuth)
app.use(session({
  secret: process.env.SESSION_SECRET || 'autocraft_secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000,
  }
}));


// 🔥 Passport init
app.use(passport.initialize());
app.use(passport.session());


// 🔥 API Routes
app.use('/api/auth',     authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders',   orderRoutes);
app.use('/api/payment',  paymentRoutes);
app.use('/api/upload',   uploadRoutes); // ✅ kept from file 1


// 🔥 Health check
app.get('/health', (req, res) => {
  res.json({ status: 'AUTOCRAFT server running ✅' });
});


// 🔥 Global error handler
app.use((err, req, res, next) => {
  console.error('GLOBAL ERROR:', err);
  res.status(500).json({
    message: err.message || 'Internal Server Error',
  });
});


const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});


