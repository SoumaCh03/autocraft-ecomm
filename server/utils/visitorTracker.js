import VisitorAnalytics from '../models/visitorAnalyticsModel.js';
import AbandonedCheckout from '../models/abandonedCheckoutModel.js';
import { AnalyticsSettings } from '../models/analyticsModel.js';

export const trackVisitorSession = async (event, reqUser) => {
  try {
    const {
      visitorID,
      sessionID,
      eventType,
      path,
      deviceType,
      operatingSystem,
      browser,
      screenResolution,
      language,
      timezone,
      timestamp
    } = event;

    if (!visitorID || !sessionID) return;

    const eventTime = timestamp ? new Date(timestamp) : new Date();

    // Resolve user details
    const userId = reqUser?._id || null;
    const isRegistered = !!reqUser;
    const name = reqUser?.name || '';
    const email = reqUser?.email || '';
    const phone = reqUser?.phone || '';

    // Determine journey step
    let journeyStep = null;
    if (eventType === 'page_view') {
      if (path === '/') journeyStep = 'Home';
      else if (path.startsWith('/shop/')) journeyStep = 'Category';
      else if (path.startsWith('/product/')) journeyStep = 'Product';
      else if (path.startsWith('/shop') && path.includes('search')) journeyStep = 'Search';
      else if (path === '/shop') journeyStep = 'Shop';
      else if (path === '/wishlist') journeyStep = 'Wishlist';
      else if (path === '/cart') journeyStep = 'Cart';
      else if (path === '/checkout') journeyStep = 'Checkout';
      else if (path === '/order-success') journeyStep = 'Order Success';
    } else if (eventType === 'add_to_cart') {
      journeyStep = 'Cart';
    } else if (eventType === 'checkout_start') {
      journeyStep = 'Checkout';
    } else if (eventType === 'payment_start') {
      journeyStep = 'Payment';
    } else if (eventType === 'order_success') {
      journeyStep = 'Order Success';
    } else if (eventType === 'wishlist_add') {
      journeyStep = 'Wishlist';
    } else if (eventType === 'search') {
      journeyStep = 'Search';
    }

    // Attempt to update existing visitor session
    let visitor = await VisitorAnalytics.findOne({ visitorId: visitorID, sessionId: sessionID });

    if (!visitor) {
      // Find if this visitor had other sessions to set correct visitCount
      const prevSessionsCount = await VisitorAnalytics.countDocuments({ visitorId: visitorID });

      visitor = new VisitorAnalytics({
        visitorId: visitorID,
        sessionId: sessionID,
        userId,
        isRegistered,
        name,
        email,
        phone,
        deviceType: deviceType || 'Desktop',
        operatingSystem: operatingSystem || 'Others',
        browser: browser || 'Others',
        screenResolution: screenResolution || '',
        language: language || '',
        timezone: timezone || '',
        firstVisit: eventTime,
        lastVisit: eventTime,
        pagesVisited: path ? [path] : [],
        visitCount: prevSessionsCount + 1,
        totalSessionTime: 0,
        journey: journeyStep ? [{ step: journeyStep, timestamp: eventTime, path: path || '/' }] : [],
      });
    } else {
      // Session exists, update it
      if (userId && !visitor.userId) {
        visitor.userId = userId;
        visitor.isRegistered = true;
      }
      if (name && !visitor.name) visitor.name = name;
      if (email && !visitor.email) visitor.email = email;
      if (phone && !visitor.phone) visitor.phone = phone;

      if (deviceType) visitor.deviceType = deviceType;
      if (operatingSystem) visitor.operatingSystem = operatingSystem;
      if (browser) visitor.browser = browser;
      if (screenResolution) visitor.screenResolution = screenResolution;
      if (language) visitor.language = language;
      if (timezone) visitor.timezone = timezone;

      visitor.lastVisit = eventTime;

      if (path && !visitor.pagesVisited.includes(path)) {
        visitor.pagesVisited.push(path);
      }

      if (journeyStep) {
        const lastStep = visitor.journey[visitor.journey.length - 1];
        // Avoid duplicate spamming if user clicks repeatedly
        if (!lastStep || lastStep.step !== journeyStep || (eventTime - new Date(lastStep.timestamp)) > 3000) {
          visitor.journey.push({ step: journeyStep, timestamp: eventTime, path: path || '/' });
        }
      }

      // Compute session duration
      const durationSeconds = Math.max(0, Math.round((eventTime - new Date(visitor.firstVisit)) / 1000));
      visitor.totalSessionTime = durationSeconds;
    }

    await visitor.save();
  } catch (error) {
    console.error('trackVisitorSession failed:', error.message);
  }
};

export const trackCheckoutStage = async (event, reqUser) => {
  try {
    const {
      visitorID,
      sessionID,
      stage,
      cartSnapshot,
      cartValue,
      itemsCount,
      paymentMethod,
      deviceType,
      operatingSystem,
      browser,
      screenResolution,
      name: eventName,
      phone: eventPhone,
      timestamp
    } = event;

    if (!visitorID || !sessionID || !stage) return;

    const eventTime = timestamp ? new Date(timestamp) : new Date();

    const userId = reqUser?._id || null;
    const name = eventName || reqUser?.name || '';
    const email = reqUser?.email || '';
    const phone = eventPhone || reqUser?.phone || '';

    let checkout = await AbandonedCheckout.findOne({ visitorId: visitorID, sessionId: sessionID });

    if (!checkout) {
      const isCompleted = (stage === 'order_created' || stage === 'payment_success');

      checkout = new AbandonedCheckout({
        visitorId: visitorID,
        sessionId: sessionID,
        userId,
        name,
        email,
        phone,
        cartSnapshot: cartSnapshot || [],
        cartValue: cartValue || 0,
        itemsCount: itemsCount || 0,
        paymentMethod: paymentMethod || 'unknown',
        deviceType: deviceType || 'Desktop',
        operatingSystem: operatingSystem || 'Others',
        browser: browser || 'Others',
        screenResolution: screenResolution || '',
        lastStage: stage,
        status: isCompleted ? 'converted' : 'pending',
        timeline: [{ stage, timestamp: eventTime }],
        lastActivity: eventTime,
      });
    } else {
      if (checkout.status === 'converted') {
        return;
      }

      if (userId) checkout.userId = userId;
      if (name) checkout.name = name;
      if (email) checkout.email = email;
      if (phone) checkout.phone = phone;

      if (cartSnapshot) checkout.cartSnapshot = cartSnapshot;
      if (cartValue !== undefined) checkout.cartValue = cartValue;
      if (itemsCount !== undefined) checkout.itemsCount = itemsCount;
      if (paymentMethod) checkout.paymentMethod = paymentMethod;

      if (deviceType) checkout.deviceType = deviceType;
      if (operatingSystem) checkout.operatingSystem = operatingSystem;
      if (browser) checkout.browser = browser;
      if (screenResolution) checkout.screenResolution = screenResolution;

      checkout.lastStage = stage;
      checkout.lastActivity = eventTime;

      if (!checkout.timeline.some(t => t.stage === stage)) {
        checkout.timeline.push({ stage, timestamp: eventTime });
      }

      if (stage === 'order_created' || stage === 'payment_success') {
        checkout.status = 'converted';
      }
    }

    await checkout.save();
  } catch (error) {
    console.error('trackCheckoutStage failed:', error.message);
  }
};

export const startAbandonedCheckoutJob = () => {
  const INTERVAL_MS = 5 * 60 * 1000;

  const checkAbandonment = async () => {
    try {
      const settings = await AnalyticsSettings.findOne();
      const delayMinutes = settings?.abandonmentDelayMinutes || 30;
      const cutoffTime = new Date(Date.now() - delayMinutes * 60 * 1000);

      const result = await AbandonedCheckout.updateMany(
        {
          status: 'pending',
          lastStage: {
            $in: [
              'payment_page_opened',
              'payment_method_selected',
              'payment_attempted'
            ]
          },
          lastActivity: { $lt: cutoffTime }
        },
        {
          $set: {
            status: 'abandoned',
            lastActivity: new Date()
          },
          $push: {
            timeline: { stage: 'checkout_abandoned', timestamp: new Date() }
          }
        }
      );

      if (result.modifiedCount > 0) {
        console.log(`[Abandonment Check] Successfully marked ${result.modifiedCount} sessions as abandoned.`);
      }
    } catch (err) {
      console.error('[Abandonment Check] Job failed:', err.message);
    }
  };

  setTimeout(checkAbandonment, 15000);
  setInterval(checkAbandonment, INTERVAL_MS);
};
