import express from 'express';
import { protect, superAdminOnly } from '../middleware/authMiddleware.js';
import AbandonedCheckout from '../models/abandonedCheckoutModel.js';
import VisitorAnalytics from '../models/visitorAnalyticsModel.js';

const router = express.Router();

// 1. GET Abandoned Checkout stats (KPIs & Charts)
router.get('/stats', protect, superAdminOnly, async (req, res) => {
  try {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfYesterday = new Date(startOfToday.getTime() - 24 * 60 * 60 * 1000);
    const startOfWeek = new Date(startOfToday.getTime() - 7 * 24 * 60 * 60 * 1000);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // Fetch analytics totals to compute Conversion Rates
    const totalVisitorSessions = await VisitorAnalytics.countDocuments();

    // Aggregating statistics
    const [
      abandonedCount,
      convertedCount,
      pendingCount,
      abandonedCartValueAgg,
      recoveredRevenueAgg,
      timeCounts
    ] = await Promise.all([
      // Status Counts
      AbandonedCheckout.countDocuments({ status: 'abandoned' }),
      AbandonedCheckout.countDocuments({ status: 'converted' }),
      AbandonedCheckout.countDocuments({ status: 'pending' }),
      // Total Abandoned Cart Value
      AbandonedCheckout.aggregate([
        { $match: { status: 'abandoned' } },
        { $group: { _id: null, total: { $sum: '$cartValue' } } }
      ]),
      // Recovered Revenue
      AbandonedCheckout.aggregate([
        { $match: { status: 'converted' } },
        { $group: { _id: null, total: { $sum: '$cartValue' } } }
      ]),
      // Time-series filters for abandonment
      Promise.all([
        AbandonedCheckout.countDocuments({ status: 'abandoned', createdAt: { $gte: startOfToday } }),
        AbandonedCheckout.countDocuments({ status: 'abandoned', createdAt: { $gte: startOfYesterday, $lt: startOfToday } }),
        AbandonedCheckout.countDocuments({ status: 'abandoned', createdAt: { $gte: startOfWeek } }),
        AbandonedCheckout.countDocuments({ status: 'abandoned', createdAt: { $gte: startOfMonth } })
      ])
    ]);

    const abandonedCartValue = abandonedCartValueAgg.length > 0 ? abandonedCartValueAgg[0].total : 0;
    const recoveredRevenue = recoveredRevenueAgg.length > 0 ? recoveredRevenueAgg[0].total : 0;

    // Recovery Rate: Converted / Total Abandoned Cases (Converted + Abandoned)
    const totalCases = convertedCount + abandonedCount;
    const recoveryRate = totalCases > 0 ? (convertedCount / totalCases) * 100 : 0;

    // Conversion Rate: Converted / Total Site Visitor Sessions
    const conversionRate = totalVisitorSessions > 0 ? (convertedCount / totalVisitorSessions) * 100 : 0;

    // 1. Hourly abandonment graph (today)
    const hourlyAbandonments = await AbandonedCheckout.aggregate([
      { $match: { status: 'abandoned', createdAt: { $gte: startOfToday } } },
      {
        $group: {
          _id: { $hour: '$createdAt' },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id': 1 } }
    ]);

    const hourlyAbandonmentData = Array.from({ length: 24 }, (_, hour) => {
      const match = hourlyAbandonments.find(h => h._id === hour);
      return {
        hour: `${String(hour).padStart(2, '0')}:00`,
        abandonments: match ? match.count : 0
      };
    });

    // 2. Daily trend (last 7 days)
    const dailyData = await AbandonedCheckout.aggregate([
      { $match: { status: 'abandoned', createdAt: { $gte: startOfWeek } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt', timezone: 'Asia/Kolkata' } },
          abandoned: { $sum: 1 }
        }
      },
      { $sort: { '_id': 1 } }
    ]);

    // 3. Product & Category abandonment trends
    // Aggregate which items are most abandoned in cartSnapshot
    const abandonedProductsAgg = await AbandonedCheckout.aggregate([
      { $match: { status: 'abandoned' } },
      { $unwind: '$cartSnapshot' },
      {
        $group: {
          _id: '$cartSnapshot.product',
          name: { $first: '$cartSnapshot.name' },
          image: { $first: '$cartSnapshot.image' },
          price: { $first: '$cartSnapshot.price' },
          count: { $sum: '$cartSnapshot.qty' },
          totalValue: { $sum: { $multiply: ['$cartSnapshot.price', '$cartSnapshot.qty'] } }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 5 }
    ]);

    res.json({
      totalAbandoned: abandonedCount,
      totalConverted: convertedCount,
      totalPending: pendingCount,
      todayCount: timeCounts[0],
      yesterdayCount: timeCounts[1],
      weekCount: timeCounts[2],
      monthCount: timeCounts[3],
      recoveryRate,
      conversionRate,
      abandonedCartValue,
      recoveredRevenue,
      hourlyAbandonmentData,
      dailyData: dailyData.map(d => ({ date: d._id, abandonments: d.abandoned })),
      topAbandonedProducts: abandonedProductsAgg
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// 2. GET Abandoned Checkout List (Paginated, Searchable, Filterable)
router.get('/list', protect, superAdminOnly, async (req, res) => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const {
      search,
      status,
      device,
      os,
      browser,
      paymentMethod,
      dateRange,
      startDate,
      endDate
    } = req.query;

    const query = {};

    // 1. Search (Name, Email, Phone, Product Name, Visitor ID, Session ID, Order Value)
    if (search) {
      const searchRegex = new RegExp(String(search).trim(), 'i');
      const searchOr = [
        { name: searchRegex },
        { email: searchRegex },
        { phone: searchRegex },
        { visitorId: searchRegex },
        { sessionId: searchRegex },
        { 'cartSnapshot.name': searchRegex }
      ];

      // Check if search query is a number representing order value
      const searchNum = Number(search);
      if (!isNaN(searchNum) && searchNum > 0) {
        searchOr.push({ cartValue: searchNum });
      }

      query.$or = searchOr;
    }

    // 2. Filter by Status (pending, abandoned, converted)
    if (status) {
      query.status = String(status);
    }

    // 3. Filter by Device Type
    if (device) {
      query.deviceType = String(device);
    }

    // 4. Filter by OS
    if (os) {
      query.operatingSystem = String(os);
    }

    // 5. Filter by Browser
    if (browser) {
      query.browser = String(browser);
    }

    // 6. Filter by Payment Method
    if (paymentMethod) {
      query.paymentMethod = String(paymentMethod);
    }

    // 7. Filter by Date Range
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    if (dateRange === 'today') {
      query.createdAt = { $gte: startOfToday };
    } else if (dateRange === 'yesterday') {
      const startOfYesterday = new Date(startOfToday.getTime() - 24 * 60 * 60 * 1000);
      query.createdAt = { $gte: startOfYesterday, $lt: startOfToday };
    } else if (dateRange === 'week') {
      const startOfWeek = new Date(startOfToday.getTime() - 7 * 24 * 60 * 60 * 1000);
      query.createdAt = { $gte: startOfWeek };
    } else if (dateRange === 'month') {
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      query.createdAt = { $gte: startOfMonth };
    } else if (dateRange === 'custom' && startDate && endDate) {
      query.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(new Date(endDate).setHours(23, 59, 59, 999))
      };
    }

    const [checkouts, total] = await Promise.all([
      AbandonedCheckout.find(query)
        .sort({ lastActivity: -1 })
        .skip(skip)
        .limit(limit)
        .populate('userId', 'name email phone role'),
      AbandonedCheckout.countDocuments(query)
    ]);

    res.json({
      checkouts,
      total,
      page,
      pages: Math.ceil(total / limit)
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// 3. POST Add Notes to Abandoned Checkout record
router.post('/:id/notes', protect, superAdminOnly, async (req, res) => {
  try {
    const { content } = req.body;
    if (!content || !content.trim()) {
      return res.status(400).json({ message: 'Note content is required' });
    }

    const checkout = await AbandonedCheckout.findById(req.params.id);
    if (!checkout) {
      return res.status(404).json({ message: 'Abandoned checkout record not found' });
    }

    checkout.notes.push({
      content: content.trim(),
      timestamp: new Date()
    });

    await checkout.save();
    res.json({ notes: checkout.notes, message: 'Note saved successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
