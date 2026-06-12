import express from 'express';
import { protect, superAdminOnly } from '../middleware/authMiddleware.js';
import VisitorAnalytics from '../models/visitorAnalyticsModel.js';

const router = express.Router();

// 1. GET Visitor Analytics Stats (KPIs & Charts)
router.get('/stats', protect, superAdminOnly, async (req, res) => {
  try {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfYesterday = new Date(startOfToday.getTime() - 24 * 60 * 60 * 1000);
    const startOfWeek = new Date(startOfToday.getTime() - 7 * 24 * 60 * 60 * 1000);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // Run parallel aggregation pipelines for efficiency
    const [
      totalCount,
      uniqueCount,
      registeredCount,
      guestCount,
      deviceCounts,
      topOSAgg,
      topBrowserAgg,
      timeCounts
    ] = await Promise.all([
      // Total Visitor Sessions
      VisitorAnalytics.countDocuments(),
      // Unique Visitors (distinct visitorIds)
      VisitorAnalytics.distinct('visitorId').then(arr => arr.length),
      // Registered vs Guest
      VisitorAnalytics.countDocuments({ userId: { $ne: null } }),
      VisitorAnalytics.countDocuments({ userId: null }),
      // Device Types Breakdown
      VisitorAnalytics.aggregate([
        { $group: { _id: '$deviceType', count: { $sum: 1 } } }
      ]),
      // Top OS Ranking
      VisitorAnalytics.aggregate([
        { $group: { _id: '$operatingSystem', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 5 }
      ]),
      // Top Browser Ranking
      VisitorAnalytics.aggregate([
        { $group: { _id: '$browser', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 5 }
      ]),
      // Time-series filters for counts
      Promise.all([
        VisitorAnalytics.countDocuments({ lastVisit: { $gte: startOfToday } }),
        VisitorAnalytics.countDocuments({ lastVisit: { $gte: startOfYesterday, $lt: startOfToday } }),
        VisitorAnalytics.countDocuments({ lastVisit: { $gte: startOfWeek } }),
        VisitorAnalytics.countDocuments({ lastVisit: { $gte: startOfMonth } })
      ])
    ]);

    // Map device counts
    const devices = { Mobile: 0, Desktop: 0, Tablet: 0, Laptop: 0 };
    deviceCounts.forEach(d => {
      if (d._id) {
        devices[d._id] = d.count;
      }
    });

    const topOS = topOSAgg.length > 0 ? topOSAgg[0]._id : 'Others';
    const topBrowser = topBrowserAgg.length > 0 ? topBrowserAgg[0]._id : 'Others';

    // Aggregate visitor volumes for charts (hourly for today, daily for last 30 days)
    // 1. Hourly graph for today
    const hourlyVisits = await VisitorAnalytics.aggregate([
      { $match: { lastVisit: { $gte: startOfToday } } },
      {
        $group: {
          _id: { $hour: '$lastVisit' },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id': 1 } }
    ]);

    // Format hourly output to full 24 hours array for chart smoothness
    const hourlyData = Array.from({ length: 24 }, (_, hour) => {
      const match = hourlyVisits.find(h => h._id === hour);
      return {
        hour: `${String(hour).padStart(2, '0')}:00`,
        visitors: match ? match.count : 0
      };
    });

    // 2. Daily visitor trend (last 7 days)
    const dailyVisits = await VisitorAnalytics.aggregate([
      { $match: { lastVisit: { $gte: startOfWeek } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$lastVisit', timezone: 'Asia/Kolkata' } },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id': 1 } }
    ]);

    const dailyData = dailyVisits.map(d => ({
      date: d._id,
      visitors: d.count
    }));

    res.json({
      totalVisitors: totalCount,
      uniqueVisitors: uniqueCount,
      registeredVisitors: registeredCount,
      guestVisitors: guestCount,
      devices,
      topOS,
      topBrowser,
      todayCount: timeCounts[0],
      yesterdayCount: timeCounts[1],
      weekCount: timeCounts[2],
      monthCount: timeCounts[3],
      deviceShare: deviceCounts.map(d => ({ name: d._id || 'Desktop', value: d.count })),
      osShare: topOSAgg.map(o => ({ name: o._id || 'Others', value: o.count })),
      browserShare: topBrowserAgg.map(b => ({ name: b._id || 'Others', value: b.count })),
      hourlyData,
      dailyData
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// 2. GET Visitor Analytics List (Paginated, Searchable, Filterable)
router.get('/list', protect, superAdminOnly, async (req, res) => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const {
      search,
      userType,
      device,
      os,
      browser,
      dateRange,
      startDate,
      endDate
    } = req.query;

    const query = {};

    // 1. Apply search filters (Visitor ID, Session ID, Name, Email, Phone)
    if (search) {
      const searchRegex = new RegExp(String(search).trim(), 'i');
      query.$or = [
        { name: searchRegex },
        { email: searchRegex },
        { phone: searchRegex },
        { visitorId: searchRegex },
        { sessionId: searchRegex }
      ];
    }

    // 2. Filter by User Type (Registered vs Guest)
    if (userType === 'registered') {
      query.userId = { $ne: null };
    } else if (userType === 'guest') {
      query.userId = null;
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

    // 6. Filter by Date Range
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    if (dateRange === 'today') {
      query.lastVisit = { $gte: startOfToday };
    } else if (dateRange === 'yesterday') {
      const startOfYesterday = new Date(startOfToday.getTime() - 24 * 60 * 60 * 1000);
      query.lastVisit = { $gte: startOfYesterday, $lt: startOfToday };
    } else if (dateRange === 'week') {
      const startOfWeek = new Date(startOfToday.getTime() - 7 * 24 * 60 * 60 * 1000);
      query.lastVisit = { $gte: startOfWeek };
    } else if (dateRange === 'month') {
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      query.lastVisit = { $gte: startOfMonth };
    } else if (dateRange === 'custom' && startDate && endDate) {
      query.lastVisit = {
        $gte: new Date(startDate),
        $lte: new Date(new Date(endDate).setHours(23, 59, 59, 999))
      };
    }

    // Execute queries
    const [visitors, total] = await Promise.all([
      VisitorAnalytics.find(query)
        .sort({ lastVisit: -1 })
        .skip(skip)
        .limit(limit)
        .populate('userId', 'name email phone role'),
      VisitorAnalytics.countDocuments(query)
    ]);

    res.json({
      visitors,
      total,
      page,
      pages: Math.ceil(total / limit)
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// 3. GET Visitor Journey detail by ID
router.get('/journey/:id', protect, superAdminOnly, async (req, res) => {
  try {
    const visitor = await VisitorAnalytics.findById(req.params.id).populate('userId', 'name email phone role');
    if (!visitor) {
      return res.status(404).json({ message: 'Visitor session not found' });
    }
    res.json({ visitor });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
