import express from 'express';
import geoip from 'geoip-lite';
import { protect, adminOnly, superAdminOnly } from '../middleware/authMiddleware.js';
import { localCache } from '../utils/cache.js';
import {
  AnalyticsEvent,
  HeatmapAnalytics,
  SearchAnalytics,
  AnalyticsSettings
} from '../models/analyticsModel.js';
import Product from '../models/productModel.js';
import Order from '../models/orderModel.js';
import User from '../models/userModel.js';
import Coupon from '../models/couponModel.js';
import { io } from '../index.js';

const router = express.Router();

// Helper: Geolocation resolver from client IP (never stores raw IP)
const getGeoIPLocation = (ip) => {
  // Normalize local addresses
  if (!ip || ip === '::1' || ip === '127.0.0.1' || ip.startsWith('::ffff:127.0.0.1')) {
    return { country: 'India', state: 'Maharashtra', city: 'Mumbai' };
  }

  // Extract IP if it is in an X-Forwarded-For format
  let cleanIp = ip;
  if (ip.includes(',')) {
    cleanIp = ip.split(',')[0].trim();
  }

  try {
    const geo = geoip.lookup(cleanIp);
    if (geo) {
      // Map country and region codes to friendly names where possible
      return {
        country: geo.country === 'IN' ? 'India' : (geo.country || 'Unknown'),
        state: geo.region || 'Unknown',
        city: geo.city || 'Unknown',
      };
    }
  } catch (err) {
    console.error('GeoIP lookup failed:', err.message);
  }

  // Fallback default
  return { country: 'Unknown', state: 'Unknown', city: 'Unknown' };
};

// 1. PUBLIC: Ingest Telemetry Batch
router.post('/track', async (req, res) => {
  try {
    const { events } = req.body;
    if (!Array.isArray(events) || events.length === 0) {
      return res.status(400).json({ message: 'No events provided' });
    }

    // Get client settings
    let settings = localCache.get('analytics:settings');
    if (!settings) {
      settings = await AnalyticsSettings.findOne();
      if (!settings) {
        settings = await AnalyticsSettings.create({
          retentionDays: 90,
          heatmapEnabled: true,
          trackingSampleRate: 100,
        });
      }
      localCache.set('analytics:settings', settings, 300);
    }

    // Sample rate check
    const randomVal = Math.random() * 100;
    if (randomVal > settings.trackingSampleRate) {
      return res.status(200).json({ status: 'sampled_out' });
    }

    const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '';
    const location = getGeoIPLocation(clientIp);

    const rawEventLogs = [];
    const realtimeStats = {
      activeVisitors: 1,
      pageViews: 0,
      addToCarts: 0,
      checkouts: 0,
      purchases: 0,
      lastEvent: null
    };

    for (const event of events) {
      const {
        sessionID,
        eventType,
        path,
        referrer,
        source,
        campaign,
        productId,
        searchQuery,
        searchHasResults,
        heatmapData
      } = event;

      if (!sessionID || !eventType) continue;

      // Handle search indexing
      if (eventType === 'search' && searchQuery) {
        await SearchAnalytics.updateOne(
          { query: searchQuery.toLowerCase().trim() },
          {
            $inc: { count: 1 },
            $set: { noResults: !searchHasResults }
          },
          { upsert: true }
        );
      }

      // Handle Heatmap aggregation
      if (['click', 'scroll', 'interaction'].includes(eventType) && heatmapData) {
        if (settings.heatmapEnabled) {
          const { x, y, deviceType } = heatmapData;
          // Bin x,y coordinates to grid points to avoid database bloat (aggregated data only)
          const binnedX = Math.min(100, Math.max(0, Math.round(x)));
          const binnedY = Math.min(100, Math.max(0, Math.round(y)));

          await HeatmapAnalytics.updateOne(
            {
              page: (path || '/').toLowerCase().trim(),
              type: eventType,
              x: binnedX,
              y: binnedY,
              deviceType: deviceType || 'desktop',
            },
            { $inc: { count: 1 } },
            { upsert: true }
          );
        }
        // Do not store raw heatmaps in AnalyticsEvent collection
        continue;
      }

      // Prepare Event Log Document
      const eventDoc = {
        sessionID,
        user: req.user?._id || event.userId || null,
        eventType,
        path,
        referrer,
        source: source || 'Direct',
        campaign: campaign || '',
        productId: productId || null,
        searchQuery: searchQuery || '',
        searchHasResults: searchHasResults !== undefined ? searchHasResults : null,
        location,
        timestamp: new Date(),
      };

      rawEventLogs.push(eventDoc);

      // Track live stats for Socket emit
      if (eventType === 'page_view') realtimeStats.pageViews++;
      if (eventType === 'add_to_cart') realtimeStats.addToCarts++;
      if (eventType === 'checkout_start') realtimeStats.checkouts++;
      if (eventType === 'order_success' || eventType === 'purchase') realtimeStats.purchases++;
      realtimeStats.lastEvent = { eventType, path, location, timestamp: new Date() };
    }

    if (rawEventLogs.length > 0) {
      await AnalyticsEvent.insertMany(rawEventLogs);
    }

    // Emit Realtime updates via Socket.IO
    if (io) {
      io.to('admin_analytics').emit('realtime_telemetry', realtimeStats);
    }

    res.status(200).json({ status: 'success', count: rawEventLogs.length });
  } catch (error) {
    console.error('Analytics tracking error:', error.message);
    res.status(500).json({ message: 'Internal tracking error' });
  }
});

// 2. ADMIN ONLY: Get Heatmap Settings
router.get('/settings', protect, superAdminOnly, async (req, res) => {
  try {
    let settings = await AnalyticsSettings.findOne();
    if (!settings) {
      settings = await AnalyticsSettings.create({
        retentionDays: 90,
        heatmapEnabled: true,
        trackingSampleRate: 100,
      });
    }
    res.json({ settings });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// 3. ADMIN ONLY: Update Analytics Settings
router.put('/settings', protect, superAdminOnly, async (req, res) => {
  try {
    const { retentionDays, heatmapEnabled, trackingSampleRate } = req.body;
    let settings = await AnalyticsSettings.findOne();
    if (!settings) {
      settings = new AnalyticsSettings();
    }

    if (retentionDays !== undefined) settings.retentionDays = Number(retentionDays);
    if (heatmapEnabled !== undefined) settings.heatmapEnabled = Boolean(heatmapEnabled);
    if (trackingSampleRate !== undefined) settings.trackingSampleRate = Number(trackingSampleRate);

    await settings.save();
    localCache.set('analytics:settings', settings, 300);
    localCache.flush(); // Flush cache to apply configuration changes

    res.json({ settings, message: 'Settings updated successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// 4. ADMIN ONLY: Executive Dashboard Stats (KPIs)
router.get('/dashboard-stats', protect, superAdminOnly, async (req, res) => {
  try {
    const cacheKey = 'analytics:dashboard-stats';
    const cachedStats = localCache.get(cacheKey);
    if (cachedStats) {
      return res.json(cachedStats);
    }

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterdayStart = new Date(todayStart.getTime() - 24 * 60 * 60 * 1000);
    const thisWeekStart = new Date(todayStart.getTime() - 7 * 24 * 60 * 60 * 1000);
    const lastWeekStart = new Date(thisWeekStart.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const thisYearStart = new Date(now.getFullYear(), 0, 1);

    // Fetch all completed/shipped/delivered sales orders
    const salesOrders = await Order.find({
      status: { $in: ['shipped', 'delivered', 'pending', 'processing'] }
    });

    const getOrderDate = (o) => new Date(o.createdAt);

    // Compute revenue windows
    let revenueToday = 0, revenueYesterday = 0;
    let revenueThisWeek = 0, revenueLastWeek = 0;
    let revenueThisMonth = 0, revenueLastMonth = 0;
    let revenueYearly = 0;

    let ordersToday = 0, ordersThisWeek = 0, ordersThisMonth = 0;
    let pendingCount = 0, shippedCount = 0, deliveredCount = 0, cancelledCount = 0, refundedCount = 0;

    salesOrders.forEach(order => {
      const val = Number(order.totalPrice || 0);
      const date = getOrderDate(order);
      const isPaidOrCOD = order.isPaid || order.paymentMethod === 'cod';

      // Status counters
      if (order.status === 'pending' || order.status === 'processing') pendingCount++;
      if (order.status === 'shipped') shippedCount++;
      if (order.status === 'delivered') deliveredCount++;
      if (order.status === 'cancelled') cancelledCount++;
      if (order.returnRequest?.status === 'refunded') refundedCount++;

      // Compute Revenue & Sales Counts (excl cancelled)
      if (order.status !== 'cancelled') {
        if (date >= todayStart) {
          revenueToday += val;
          ordersToday++;
        } else if (date >= yesterdayStart) {
          revenueYesterday += val;
        }

        if (date >= thisWeekStart) {
          revenueThisWeek += val;
          ordersThisWeek++;
        } else if (date >= lastWeekStart && date < thisWeekStart) {
          revenueLastWeek += val;
        }

        if (date >= thisMonthStart) {
          revenueThisMonth += val;
          ordersThisMonth++;
        } else if (date >= lastMonthStart && date < thisMonthStart) {
          revenueLastMonth += val;
        }

        if (date >= thisYearStart) {
          revenueYearly += val;
        }
      }
    });

    // Total counts
    const totalCustomers = await User.countDocuments({ role: 'customer' });
    const totalProducts = await Product.countDocuments();
    
    // Out of Stock / Low Stock count
    const outOfStockProducts = await Product.countDocuments({
      $or: [{ stock: 0 }, { isOutOfStock: true }]
    });
    const lowStockProducts = await Product.countDocuments({
      stock: { $gt: 0, $lte: 5 }
    });

    // AOV
    const totalOrderCount = salesOrders.filter(o => o.status !== 'cancelled').length;
    const totalSalesRevenue = salesOrders.filter(o => o.status !== 'cancelled').reduce((sum, o) => sum + (o.totalPrice || 0), 0);
    const avgOrderValue = totalOrderCount > 0 ? (totalSalesRevenue / totalOrderCount) : 0;

    // Conversion rate & unique sessions
    const totalUniqueSessions = await AnalyticsEvent.distinct('sessionID');
    const totalSessionCount = totalUniqueSessions.length || 1;
    const conversionRate = totalSessionCount > 0 ? ((totalOrderCount / totalSessionCount) * 100) : 0;

    // Customer Segmentation (New vs Returning counts)
    // A returning customer is a customer with more than 1 order
    const orderCountsByUser = await Order.aggregate([
      { $match: { status: { $ne: 'cancelled' } } },
      { $group: { _id: '$user', count: { $sum: 1 } } }
    ]);
    const repeatCustomersCount = orderCountsByUser.filter(u => u.count > 1).length;
    const totalOrderingCustomers = orderCountsByUser.length || 1;
    const returningCustomerPct = (repeatCustomersCount / totalOrderingCustomers) * 100;
    const newCustomerPct = 100 - returningCustomerPct;

    // Build statistics payload
    const stats = {
      kpis: {
        revenueToday,
        revenueYesterday,
        revenueTodayTrend: revenueYesterday > 0 ? ((revenueToday - revenueYesterday) / revenueYesterday) * 100 : 0,
        revenueThisWeek,
        revenueLastWeek,
        revenueThisWeekTrend: revenueLastWeek > 0 ? ((revenueThisWeek - revenueLastWeek) / revenueLastWeek) * 100 : 0,
        revenueThisMonth,
        revenueLastMonth,
        revenueThisMonthTrend: revenueLastMonth > 0 ? ((revenueThisMonth - revenueLastMonth) / revenueLastMonth) * 100 : 0,
        revenueYearly,
        ordersToday,
        ordersThisWeek,
        ordersThisMonth,
        avgOrderValue,
        conversionRate,
        returningCustomerPct,
        newCustomerPct,
        totalCustomers,
        totalProducts,
        outOfStockProducts,
        lowStockProducts,
      },
      statuses: {
        pending: pendingCount,
        shipped: shippedCount,
        delivered: deliveredCount,
        cancelled: cancelledCount,
        refunded: refundedCount,
      }
    };

    localCache.set(cacheKey, stats, 60); // Cache for 60 seconds

    res.json(stats);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// 5. ADMIN ONLY: Sales Analytics Details
router.get('/sales-analytics', protect, superAdminOnly, async (req, res) => {
  try {
    const { period = 'monthly' } = req.query; // daily, weekly, monthly, quarterly, yearly
    const cacheKey = `analytics:sales:${period}`;
    const cachedData = localCache.get(cacheKey);
    if (cachedData) {
      return res.json(cachedData);
    }

    const orders = await Order.find({ status: { $ne: 'cancelled' } }).populate('items.product');

    // Chart data aggregation based on period
    const salesGroup = {};
    let totalRevenue = 0;
    let totalOrdersCount = 0;
    let totalUnitsSold = 0;

    orders.forEach(order => {
      const date = new Date(order.createdAt);
      let key = '';

      if (period === 'daily') {
        key = date.toISOString().slice(0, 10); // YYYY-MM-DD
      } else if (period === 'weekly') {
        // Get week of year
        const startOfYear = new Date(date.getFullYear(), 0, 1);
        const pastDays = (date - startOfYear) / 86400000;
        const weekNum = Math.ceil((pastDays + startOfYear.getDay() + 1) / 7);
        key = `${date.getFullYear()}-W${weekNum}`;
      } else if (period === 'monthly') {
        key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`; // YYYY-MM
      } else if (period === 'quarterly') {
        const quarter = Math.floor(date.getMonth() / 3) + 1;
        key = `${date.getFullYear()}-Q${quarter}`;
      } else if (period === 'yearly') {
        key = `${date.getFullYear()}`;
      }

      if (!salesGroup[key]) {
        salesGroup[key] = { name: key, revenue: 0, orders: 0, units: 0, profit: 0 };
      }

      const orderPrice = Number(order.totalPrice || 0);
      const units = order.items.reduce((sum, item) => sum + (item.qty || 0), 0);

      salesGroup[key].revenue += orderPrice;
      salesGroup[key].orders += 1;
      salesGroup[key].units += units;
      // Profit estimation: 40% margin
      salesGroup[key].profit += orderPrice * 0.4;

      totalRevenue += orderPrice;
      totalOrdersCount += 1;
      totalUnitsSold += units;
    });

    const chartData = Object.keys(salesGroup)
      .sort()
      .map(k => salesGroup[k]);

    // Top Selling Categories and Brands
    const categorySales = {};
    const brandSales = {};
    const productSales = {};

    orders.forEach(order => {
      order.items.forEach(item => {
        const qty = Number(item.qty || 0);
        const price = Number(item.price || 0) * qty;

        // Categories
        const productData = item.product;
        const category = productData?.category || 'Uncategorized';
        if (!categorySales[category]) {
          categorySales[category] = { category, units: 0, revenue: 0 };
        }
        categorySales[category].units += qty;
        categorySales[category].revenue += price;

        // Brands (Unwind vehicle brands from product details)
        const brands = productData?.carBrands || ['Universal'];
        brands.forEach(brand => {
          if (!brandSales[brand]) {
            brandSales[brand] = { brand, units: 0, revenue: 0 };
          }
          brandSales[brand].units += qty;
          brandSales[brand].revenue += price;
        });

        // Top Selling Products
        const prodId = item.product?._id?.toString() || item.name;
        if (!productSales[prodId]) {
          productSales[prodId] = {
            id: prodId,
            name: item.name,
            image: item.image,
            category,
            units: 0,
            revenue: 0
          };
        }
        productSales[prodId].units += qty;
        productSales[prodId].revenue += price;
      });
    });

    const topCategories = Object.values(categorySales).sort((a, b) => b.revenue - a.revenue).slice(0, 5);
    const topBrands = Object.values(brandSales).sort((a, b) => b.revenue - a.revenue).slice(0, 5);
    const topProducts = Object.values(productSales).sort((a, b) => b.revenue - a.revenue).slice(0, 5);

    // Simple Linear Regression Revenue Forecast for next period
    let forecastedRevenue = 0;
    if (chartData.length >= 2) {
      let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;
      const n = chartData.length;
      chartData.forEach((d, index) => {
        sumX += index;
        sumY += d.revenue;
        sumXY += index * d.revenue;
        sumXX += index * index;
      });
      const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
      const intercept = (sumY - slope * sumX) / n;
      // Predict index n (next period)
      forecastedRevenue = Math.max(0, slope * n + intercept);
    } else {
      forecastedRevenue = totalRevenue; // fallback
    }

    const payload = {
      summary: {
        totalRevenue,
        totalOrders: totalOrdersCount,
        totalUnitsSold,
        avgOrderValue: totalOrdersCount > 0 ? (totalRevenue / totalOrdersCount) : 0,
        estimatedProfit: totalRevenue * 0.4,
        forecastedRevenueNextPeriod: forecastedRevenue
      },
      chartData,
      topCategories,
      topBrands,
      topProducts
    };

    localCache.set(cacheKey, payload, 300); // Cache for 5 minutes

    res.json(payload);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// 6. ADMIN ONLY: Conversion Funnel Analytics
router.get('/funnel-analytics', protect, superAdminOnly, async (req, res) => {
  try {
    const cacheKey = 'analytics:funnel';
    const cachedData = localCache.get(cacheKey);
    if (cachedData) {
      return res.json(cachedData);
    }

    // Aggregate unique sessionIDs per event step
    const funnelPipeline = async (eventType, matchPath = null) => {
      const query = { eventType };
      if (matchPath) {
        query.path = matchPath;
      }
      const sessions = await AnalyticsEvent.distinct('sessionID', query);
      return sessions.length;
    };

    // Calculate funnel counts (landing, shop, product view, add to cart, checkout, payment, success)
    const landing = await funnelPipeline('page_view', '/');
    
    // Shop view: count page_views on /shop or starting with /shop/
    const shopSessions = await AnalyticsEvent.distinct('sessionID', {
      eventType: 'page_view',
      path: { $regex: /^\/shop/ }
    });
    const shop = shopSessions.length;

    // Product view
    const productSessions = await AnalyticsEvent.distinct('sessionID', {
      eventType: 'page_view',
      path: { $regex: /^\/product/ }
    });
    const product = productSessions.length;

    const cart = await funnelPipeline('add_to_cart');
    const checkout = await funnelPipeline('checkout_start');
    const payment = await funnelPipeline('payment_start');
    const purchase = await funnelPipeline('purchase'); // or order_success

    const funnelData = [
      { step: 'Landing Page', count: landing, dropoff: 0 },
      { step: 'Category / Shop', count: shop, dropoff: landing > 0 ? ((landing - shop) / landing) * 100 : 0 },
      { step: 'Product Page', count: product, dropoff: shop > 0 ? ((shop - product) / shop) * 100 : 0 },
      { step: 'Add To Cart', count: cart, dropoff: product > 0 ? ((product - cart) / product) * 100 : 0 },
      { step: 'Checkout', count: checkout, dropoff: cart > 0 ? ((cart - checkout) / cart) * 100 : 0 },
      { step: 'Payment Page', count: payment, dropoff: checkout > 0 ? ((checkout - payment) / checkout) * 100 : 0 },
      { step: 'Purchase Success', count: purchase, dropoff: payment > 0 ? ((payment - purchase) / payment) * 100 : 0 },
    ];

    // Compute abandonment rates
    const cartAbandonment = cart > 0 ? ((cart - purchase) / cart) * 100 : 0;
    const checkoutAbandonment = checkout > 0 ? ((checkout - purchase) / checkout) * 100 : 0;

    const payload = {
      funnelData,
      abandonment: {
        cartAbandonment,
        checkoutAbandonment
      }
    };

    localCache.set(cacheKey, payload, 300); // 5 min cache
    res.json(payload);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// 7. ADMIN ONLY: Product Performance Analytics
router.get('/product-analytics', protect, superAdminOnly, async (req, res) => {
  try {
    const cacheKey = 'analytics:products-report';
    const cachedData = localCache.get(cacheKey);
    if (cachedData) {
      return res.json(cachedData);
    }

    // Get views per product from AnalyticsEvents
    const productViews = await AnalyticsEvent.aggregate([
      { $match: { eventType: 'page_view', productId: { $ne: null } } },
      {
        $group: {
          _id: '$productId',
          totalViews: { $sum: 1 },
          uniqueViews: { $addToSet: '$sessionID' }
        }
      }
    ]);

    const viewsMap = {};
    productViews.forEach(v => {
      viewsMap[v._id.toString()] = {
        totalViews: v.totalViews,
        uniqueViews: v.uniqueViews.length
      };
    });

    // Wishlist additions count
    const wishlists = await User.aggregate([
      { $unwind: '$wishlist' },
      { $group: { _id: '$wishlist', wishlistAdds: { $sum: 1 } } }
    ]);
    const wishlistMap = {};
    wishlists.forEach(w => {
      wishlistMap[w._id.toString()] = w.wishlistAdds;
    });

    // Add to cart count from AnalyticsEvent
    const cartAdds = await AnalyticsEvent.aggregate([
      { $match: { eventType: 'add_to_cart', productId: { $ne: null } } },
      { $group: { _id: '$productId', cartAdds: { $sum: 1 } } }
    ]);
    const cartAddsMap = {};
    cartAdds.forEach(c => {
      cartAddsMap[c._id.toString()] = c.cartAdds;
    });

    // Purchases from orders
    const orderPurchases = await Order.aggregate([
      { $match: { status: { $ne: 'cancelled' } } },
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.product',
          purchases: { $sum: '$items.qty' },
          revenue: { $sum: { $multiply: ['$items.price', '$items.qty'] } }
        }
      }
    ]);
    const purchasesMap = {};
    orderPurchases.forEach(p => {
      if (p._id) {
        purchasesMap[p._id.toString()] = {
          purchases: p.purchases,
          revenue: p.revenue
        };
      }
    });

    // Returned items count
    const returnedItems = await Order.aggregate([
      { $match: { 'returnRequest.status': 'refunded' } },
      { $unwind: '$items' },
      { $group: { _id: '$items.product', refundedCount: { $sum: '$items.qty' } } }
    ]);
    const refundMap = {};
    returnedItems.forEach(r => {
      if (r._id) refundMap[r._id.toString()] = r.refundedCount;
    });

    // Query all products to build final dataset
    const products = await Product.find();

    const productAnalyticsList = products.map(prod => {
      const id = prod._id.toString();
      const views = viewsMap[id] || { totalViews: 0, uniqueViews: 0 };
      const wishlistAdds = wishlistMap[id] || 0;
      const cartAdds = cartAddsMap[id] || 0;
      const purchaseStats = purchasesMap[id] || { purchases: 0, revenue: 0 };
      const refunded = refundMap[id] || 0;

      // Conversion rate = Purchases / (Unique views || 1)
      const conversionRate = views.uniqueViews > 0 ? (purchaseStats.purchases / views.uniqueViews) * 100 : 0;
      const refundRate = purchaseStats.purchases > 0 ? (refunded / purchaseStats.purchases) * 100 : 0;

      return {
        _id: id,
        name: prod.name,
        category: prod.category,
        stock: prod.stock,
        isOutOfStock: prod.isOutOfStock,
        totalViews: views.totalViews,
        uniqueViews: views.uniqueViews,
        wishlistAdds,
        cartAdds,
        purchases: purchaseStats.purchases,
        revenueGenerated: purchaseStats.revenue,
        refundRate,
        conversionRate,
        reviewCount: prod.numReviews || 0,
        averageRating: prod.rating || 0
      };
    });

    // Best Sellers, Worst Performers, etc.
    const bestSellers = [...productAnalyticsList].sort((a, b) => b.purchases - a.purchases).slice(0, 10);
    const worstPerformers = [...productAnalyticsList].filter(p => !p.isOutOfStock).sort((a, b) => a.purchases - b.purchases).slice(0, 10);
    const mostViewed = [...productAnalyticsList].sort((a, b) => b.totalViews - a.totalViews).slice(0, 10);
    const mostWishlisted = [...productAnalyticsList].sort((a, b) => b.wishlistAdds - a.wishlistAdds).slice(0, 10);
    const highestRevenue = [...productAnalyticsList].sort((a, b) => b.revenueGenerated - a.revenueGenerated).slice(0, 10);

    const payload = {
      allProductsList: productAnalyticsList,
      bestSellers,
      worstPerformers,
      mostViewed,
      mostWishlisted,
      highestRevenue
    };

    localCache.set(cacheKey, payload, 300); // 5 min cache
    res.json(payload);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// 8. ADMIN ONLY: Customer Segmentation & Cohorts
router.get('/customer-analytics', protect, superAdminOnly, async (req, res) => {
  try {
    const cacheKey = 'analytics:customers';
    const cachedData = localCache.get(cacheKey);
    if (cachedData) {
      return res.json(cachedData);
    }

    // Get order history grouped by user
    const userOrdersSummary = await Order.aggregate([
      { $match: { status: { $ne: 'cancelled' } } },
      {
        $group: {
          _id: '$user',
          orderCount: { $sum: 1 },
          totalSpent: { $sum: '$totalPrice' },
          lastOrderDate: { $max: '$createdAt' }
        }
      }
    ]);

    const userSummaryMap = {};
    userOrdersSummary.forEach(u => {
      if (u._id) {
        userSummaryMap[u._id.toString()] = u;
      }
    });

    const customers = await User.find({ role: 'customer' });

    const vipThreshold = 10000;
    const repeatThreshold = 2;
    const inactiveDaysLimit = 90;
    const now = new Date();

    const segmentedCustomers = customers.map(cust => {
      const summary = userSummaryMap[cust._id.toString()] || { orderCount: 0, totalSpent: 0, lastOrderDate: null };
      
      let segment = 'Inactive';
      if (summary.orderCount === 0) {
        segment = 'Inactive';
      } else if (summary.totalSpent >= vipThreshold || summary.orderCount >= 5) {
        segment = 'VIP Customer';
      } else if (summary.orderCount >= repeatThreshold) {
        segment = 'Repeat Customer';
      } else if (summary.orderCount === 1) {
        // Check if placed order recently or long ago
        const lastOrder = new Date(summary.lastOrderDate);
        const diffTime = Math.abs(now - lastOrder);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        segment = diffDays > inactiveDaysLimit ? 'Inactive Customer' : 'One-Time Customer';
      }

      return {
        _id: cust._id,
        name: cust.name,
        email: cust.email,
        phone: cust.phone,
        joinedAt: cust.createdAt,
        totalOrders: summary.orderCount,
        lifetimeValue: summary.totalSpent,
        lastOrderDate: summary.lastOrderDate,
        segment
      };
    });

    const vips = segmentedCustomers.filter(c => c.segment === 'VIP Customer').sort((a,b) => b.lifetimeValue - a.lifetimeValue);
    const repeats = segmentedCustomers.filter(c => c.segment === 'Repeat Customer');
    const oneTimes = segmentedCustomers.filter(c => c.segment === 'One-Time Customer');
    const inactives = segmentedCustomers.filter(c => c.segment.startsWith('Inactive'));

    // Churn rate calculation (no orders in 90 days / total ordering customers)
    const churnCount = segmentedCustomers.filter(c => c.totalOrders > 0 && (now - new Date(c.lastOrderDate)) / 86400000 > inactiveDaysLimit).length;
    const totalWithOrders = segmentedCustomers.filter(c => c.totalOrders > 0).length || 1;
    const churnRate = (churnCount / totalWithOrders) * 100;

    const payload = {
      summary: {
        totalVIPs: vips.length,
        totalRepeats: repeats.length,
        totalOneTimes: oneTimes.length,
        totalInactives: inactives.length,
        churnRate,
        retentionRate: 100 - churnRate,
      },
      segments: {
        vips: vips.slice(0, 20), // Top 20 VIPs
        repeats: repeats.slice(0, 20),
        oneTimes: oneTimes.slice(0, 20),
        inactives: inactives.slice(0, 20),
      },
      allCustomersList: segmentedCustomers
    };

    localCache.set(cacheKey, payload, 300);
    res.json(payload);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// 9. ADMIN ONLY: Location Analytics (Country, State, City groupings)
router.get('/location-analytics', protect, superAdminOnly, async (req, res) => {
  try {
    const cacheKey = 'analytics:location';
    const cachedData = localCache.get(cacheKey);
    if (cachedData) {
      return res.json(cachedData);
    }

    // Group orders by location
    const orderLocationAgg = await Order.aggregate([
      { $match: { status: { $ne: 'cancelled' } } },
      {
        $group: {
          _id: {
            country: '$shippingAddress.country', // If stored, otherwise default
            state: '$shippingAddress.state',
            city: '$shippingAddress.city'
          },
          orders: { $sum: 1 },
          revenue: { $sum: '$totalPrice' }
        }
      }
    ]);

    const cityStats = [];
    const stateStats = {};
    const countryStats = {};

    orderLocationAgg.forEach(loc => {
      const country = loc._id.country || 'India';
      const state = loc._id.state || 'Unknown';
      const city = loc._id.city || 'Unknown';

      // Cities
      cityStats.push({
        city,
        state,
        country,
        orders: loc.orders,
        revenue: loc.revenue
      });

      // States
      if (!stateStats[state]) {
        stateStats[state] = { state, country, orders: 0, revenue: 0 };
      }
      stateStats[state].orders += loc.orders;
      stateStats[state].revenue += loc.revenue;

      // Countries
      if (!countryStats[country]) {
        countryStats[country] = { country, orders: 0, revenue: 0 };
      }
      countryStats[country].orders += loc.orders;
      countryStats[country].revenue += loc.revenue;
    });

    const topCities = cityStats.sort((a,b) => b.revenue - a.revenue).slice(0, 15);
    const topStates = Object.values(stateStats).sort((a,b) => b.revenue - a.revenue).slice(0, 10);
    const topCountries = Object.values(countryStats).sort((a,b) => b.revenue - a.revenue).slice(0, 5);

    const payload = {
      topCities,
      topStates,
      topCountries
    };

    localCache.set(cacheKey, payload, 600); // 10 min cache
    res.json(payload);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// 10. ADMIN ONLY: Traffic Source & Campaign Analytics
router.get('/traffic-analytics', protect, superAdminOnly, async (req, res) => {
  try {
    const cacheKey = 'analytics:traffic';
    const cachedData = localCache.get(cacheKey);
    if (cachedData) {
      return res.json(cachedData);
    }

    // Session & orders per referrer source
    const sessionsBySource = await AnalyticsEvent.aggregate([
      { $match: { eventType: 'page_view' } },
      {
        $group: {
          _id: { source: '$source', sessionID: '$sessionID' }
        }
      },
      {
        $group: {
          _id: '$_id.source',
          uniqueVisitors: { $sum: 1 }
        }
      }
    ]);

    const sourceStatsMap = {};
    sessionsBySource.forEach(s => {
      sourceStatsMap[s._id] = {
        source: s._id,
        visitors: s.uniqueVisitors,
        orders: 0,
        revenue: 0,
        conversionRate: 0
      };
    });

    // Retrieve order events
    const ordersWithSource = await AnalyticsEvent.aggregate([
      { $match: { eventType: 'purchase' } } // or order_success
    ]);

    const sessionSources = await AnalyticsEvent.aggregate([
      { $match: { eventType: 'page_view' } },
      { $group: { _id: '$sessionID', source: { $first: '$source' } } }
    ]);
    const sessionSourceMap = {};
    sessionSources.forEach(s => {
      sessionSourceMap[s._id] = s.source;
    });

    // Populate orders and revenue per source
    const orders = await Order.find({ status: { $ne: 'cancelled' } });
    let totalDirectRevenue = 0, totalDirectOrders = 0;

    orders.forEach(order => {
      const orderPrice = Number(order.totalPrice || 0);
      const matchedEvent = sessionSourceMap[order._id.toString()]; // session matches order id on checkout
      const source = matchedEvent || 'Direct';

      if (!sourceStatsMap[source]) {
        sourceStatsMap[source] = { source, visitors: 1, orders: 0, revenue: 0, conversionRate: 0 };
      }
      sourceStatsMap[source].orders += 1;
      sourceStatsMap[source].revenue += orderPrice;
    });

    const trafficSources = Object.values(sourceStatsMap).map(src => {
      src.conversionRate = src.visitors > 0 ? (src.orders / src.visitors) * 100 : 0;
      return src;
    }).sort((a,b) => b.revenue - a.revenue);

    // Campaigns Performance (parsed UTM codes)
    const campaignsAgg = await AnalyticsEvent.aggregate([
      { $match: { campaign: { $ne: '' } } },
      {
        $group: {
          _id: '$campaign',
          visitors: { $addToSet: '$sessionID' }
        }
      }
    ]);

    const campaignStats = campaignsAgg.map(c => {
      return {
        campaign: c._id,
        visitors: c.visitors.length,
        orders: 0,
        revenue: 0
      };
    });

    res.json({ trafficSources, campaignStats });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// 11. ADMIN ONLY: Heatmap Aggregated Points
router.get('/heatmap-analytics', protect, superAdminOnly, async (req, res) => {
  try {
    const { page = '/', type = 'click' } = req.query;
    const cacheKey = `analytics:heatmap:${page}:${type}`;
    const cachedData = localCache.get(cacheKey);
    if (cachedData) {
      return res.json(cachedData);
    }

    const data = await HeatmapAnalytics.find({
      page: page.toLowerCase().trim(),
      type
    });

    localCache.set(cacheKey, data, 60); // cache for 1 minute
    res.json({ data });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// 12. ADMIN ONLY: Search Keywords Analytics
router.get('/search-analytics', protect, superAdminOnly, async (req, res) => {
  try {
    const cacheKey = 'analytics:search';
    const cachedData = localCache.get(cacheKey);
    if (cachedData) {
      return res.json(cachedData);
    }

    // Retrieve search analytics from SearchAnalytics model
    const searchHistory = await SearchAnalytics.find().sort({ count: -1 }).limit(100);

    const popularSearches = searchHistory.filter(s => !s.noResults).slice(0, 10);
    const searchFailures = searchHistory.filter(s => s.noResults).slice(0, 10);

    const payload = {
      searchHistory,
      popularSearches,
      searchFailures
    };

    localCache.set(cacheKey, payload, 300);
    res.json(payload);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// 13. ADMIN ONLY: Inventory Intelligence & Health Reports
router.get('/inventory-analytics', protect, superAdminOnly, async (req, res) => {
  try {
    const cacheKey = 'analytics:inventory-health';
    const cachedData = localCache.get(cacheKey);
    if (cachedData) {
      return res.json(cachedData);
    }

    const products = await Product.find();
    
    // Get sales in last 30 days to compute velocity (rate of stock consumption)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const ordersLast30Days = await Order.find({
      status: { $ne: 'cancelled' },
      createdAt: { $gte: thirtyDaysAgo }
    });

    const productSalesCount = {};
    ordersLast30Days.forEach(order => {
      order.items.forEach(item => {
        const prodId = item.product?.toString() || item.name;
        productSalesCount[prodId] = (productSalesCount[prodId] || 0) + (item.qty || 0);
      });
    });

    let totalProductsCount = products.length;
    let healthyProducts = 0;
    let lowStockCount = 0;
    let outOfStockCount = 0;
    let deadStockCount = 0;

    const inventoryReport = products.map(prod => {
      const unitsSold = productSalesCount[prod._id.toString()] || 0;
      const velocity = unitsSold / 30; // sell velocity per day
      const sellRate = velocity > 0 ? (unitsSold / (prod.stock + unitsSold)) * 100 : 0;

      // Inventory aging check (days since last updated / created)
      const diffTime = Math.abs(new Date() - new Date(prod.updatedAt));
      const agingDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      const isLow = prod.stock > 0 && prod.stock <= 5;
      const isOut = prod.stock === 0 || prod.isOutOfStock;
      const isDead = prod.stock > 0 && unitsSold === 0 && agingDays > 90;

      if (isOut) outOfStockCount++;
      else if (isLow) lowStockCount++;
      else if (isDead) deadStockCount++;
      else healthyProducts++;

      // Reorder forecast
      let daysUntilOut = Infinity;
      let suggestReorder = false;
      let suggestReorderQty = 0;

      if (velocity > 0) {
        daysUntilOut = prod.stock / velocity;
        if (daysUntilOut <= 15) {
          suggestReorder = true;
          // Reorder quantity based on 30-day velocity, aiming to stock 45 days
          suggestReorderQty = Math.round(velocity * 45) - prod.stock;
        }
      }

      return {
        _id: prod._id,
        name: prod.name,
        category: prod.category,
        stock: prod.stock,
        velocity, // units sold per day
        sellRate, // sellout speed
        agingDays,
        status: isOut ? 'Out of Stock' : isLow ? 'Low Stock' : isDead ? 'Dead Stock' : 'Healthy',
        daysUntilOut: daysUntilOut === Infinity ? 'N/A' : Math.round(daysUntilOut),
        suggestReorder,
        suggestReorderQty: suggestReorderQty > 0 ? suggestReorderQty : 0
      };
    });

    // Inventory Health Score calculation (0 - 100)
    // Formula: Healthy products ratio minus out-of-stock and dead-stock weightings
    const outOfStockPct = totalProductsCount > 0 ? (outOfStockCount / totalProductsCount) : 0;
    const deadStockPct = totalProductsCount > 0 ? (deadStockCount / totalProductsCount) : 0;
    const healthScore = Math.max(0, Math.round(100 - (outOfStockPct * 100 + deadStockPct * 50)));

    const payload = {
      healthScore,
      summary: {
        totalProductsCount,
        healthyProducts,
        lowStockCount,
        outOfStockCount,
        deadStockCount
      },
      suggestions: inventoryReport.filter(p => p.suggestReorder),
      report: inventoryReport
    };

    localCache.set(cacheKey, payload, 300);
    res.json(payload);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// 14. ADMIN ONLY: Order Fulfillment Analytics
router.get('/order-analytics', protect, superAdminOnly, async (req, res) => {
  try {
    const cacheKey = 'analytics:orders-performance';
    const cachedData = localCache.get(cacheKey);
    if (cachedData) {
      return res.json(cachedData);
    }

    const orders = await Order.find();

    let totalOrders = orders.length;
    let fulfilledOrders = 0;
    let totalFulfillmentTime = 0; // ms
    let totalDeliveryTime = 0; // ms

    const cancellationReasons = {};
    let cancelledCount = 0;

    orders.forEach(order => {
      if (order.status === 'delivered') {
        fulfilledOrders++;
        
        // Fulfillment speed (order placement to shipping)
        if (order.shippedAt) {
          totalFulfillmentTime += new Date(order.shippedAt) - new Date(order.createdAt);
        }
        
        // Delivery speed (shipping to delivery)
        if (order.shippedAt && order.deliveredAt) {
          totalDeliveryTime += new Date(order.deliveredAt) - new Date(order.shippedAt);
        }
      }

      if (order.status === 'cancelled') {
        cancelledCount++;
        const reason = order.returnRequest?.reason || 'No Reason Provided';
        cancellationReasons[reason] = (cancellationReasons[reason] || 0) + 1;
      }
    });

    const avgFulfillmentDays = fulfilledOrders > 0 ? (totalFulfillmentTime / fulfilledOrders) / (1000 * 60 * 60 * 24) : 0;
    const avgDeliveryDays = fulfilledOrders > 0 ? (totalDeliveryTime / fulfilledOrders) / (1000 * 60 * 60 * 24) : 0;
    const cancellationRate = totalOrders > 0 ? (cancelledCount / totalOrders) * 100 : 0;

    const cancellationChart = Object.keys(cancellationReasons).map(reason => ({
      reason,
      count: cancellationReasons[reason]
    }));

    const payload = {
      summary: {
        totalOrders,
        avgFulfillmentDays: avgFulfillmentDays.toFixed(1),
        avgDeliveryDays: avgDeliveryDays.toFixed(1),
        cancellationRate: cancellationRate.toFixed(1)
      },
      cancellationChart
    };

    localCache.set(cacheKey, payload, 300);
    res.json(payload);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// 15. ADMIN ONLY: Marketing & Coupon Intelligence
router.get('/marketing-analytics', protect, superAdminOnly, async (req, res) => {
  try {
    const cacheKey = 'analytics:marketing';
    const cachedData = localCache.get(cacheKey);
    if (cachedData) {
      return res.json(cachedData);
    }

    const coupons = await Coupon.find();
    
    // Group coupon orders
    const ordersWithCoupons = await Order.find({ 'coupon.code': { $ne: '' }, status: { $ne: 'cancelled' } });
    
    const couponUsageStats = coupons.map(c => {
      const usages = ordersWithCoupons.filter(o => o.coupon.code === c.code);
      const totalRevenue = usages.reduce((sum, o) => sum + (o.totalPrice || 0), 0);
      const totalDiscount = usages.reduce((sum, o) => sum + (o.discountPrice || 0), 0);

      return {
        _id: c._id,
        code: c.code,
        type: c.type,
        value: c.value,
        usedCount: usages.length,
        revenueImpact: totalRevenue,
        discountsApplied: totalDiscount,
        active: c.active && new Date(c.expiry) >= new Date()
      };
    }).sort((a,b) => b.revenueImpact - a.revenueImpact);

    res.json({ couponUsageStats });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// 16. ADMIN ONLY: Trigger Manual Database Pruning
router.post('/cleanup', protect, superAdminOnly, async (req, res) => {
  try {
    let settings = await AnalyticsSettings.findOne();
    const retentionDays = settings?.retentionDays || 90;
    
    if (retentionDays === 9999) {
      return res.json({ message: 'Infinite data retention configured. No cleanup executed.' });
    }

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    const deleted = await AnalyticsEvent.deleteMany({
      timestamp: { $lt: cutoffDate }
    });

    res.json({
      message: 'Database cleanup completed successfully',
      deletedCount: deleted.deletedCount,
      cutoffDate
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
