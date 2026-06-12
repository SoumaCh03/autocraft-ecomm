import BASE_URL from './api';

// Helper: OS detector
export const getOS = () => {
  if (typeof window === 'undefined') return 'Others';
  const ua = navigator.userAgent.toLowerCase();
  if (ua.includes('win')) return 'Windows';
  if (ua.includes('mac') && !ua.includes('iphone') && !ua.includes('ipad') && !ua.includes('ipod')) return 'macOS';
  if (ua.includes('android')) return 'Android';
  if (ua.includes('iphone') || ua.includes('ipad') || ua.includes('ipod')) return 'iOS';
  if (ua.includes('linux')) return 'Linux';
  if (ua.includes('cros')) return 'ChromeOS';
  return 'Others';
};

// Helper: Browser detector
export const getBrowser = () => {
  if (typeof window === 'undefined') return 'Others';
  const ua = navigator.userAgent;
  if (ua.includes('Opera') || ua.includes('OPR')) return 'Opera';
  if (ua.includes('Brave')) return 'Brave';
  if (ua.includes('Edg')) return 'Edge';
  if (ua.includes('Chrome') && !ua.includes('Chromium')) {
    if (navigator.brave && typeof navigator.brave.isBrave === 'function') {
      return 'Brave';
    }
    return 'Chrome';
  }
  if (ua.includes('Safari') && !ua.includes('Chrome')) return 'Safari';
  if (ua.includes('Firefox')) return 'Firefox';
  return 'Others';
};

// Helper: Device type detector (Mobile, Tablet, Laptop, Desktop)
export const getDeviceType = () => {
  if (typeof window === 'undefined') return 'Desktop';
  const ua = navigator.userAgent.toLowerCase();
  if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(ua)) {
    return 'Tablet';
  }
  if (/Mobile|Android|iP(hone|od)|IEMobile|BlackBerry|Kindle|Silk-Accelerated/i.test(ua)) {
    return 'Mobile';
  }
  const width = window.screen.width;
  if (width >= 1024 && width <= 1536) {
    return 'Laptop';
  }
  return 'Desktop';
};

// 1. Session, Visitor & Acquisition Source setup
const getOrInitializeSession = () => {
  if (typeof window === 'undefined') {
    return { sessionID: '', visitorID: '', source: 'Direct', campaign: '', referrer: '' };
  }

  let sessionID = sessionStorage.getItem('autocraft_session_id');
  if (!sessionID) {
    // Generate session ID
    sessionID = 'ac_' + Math.random().toString(36).substring(2, 15) + '_' + Date.now().toString(36);
    sessionStorage.setItem('autocraft_session_id', sessionID);
  }

  let visitorID = localStorage.getItem('autocraft_visitor_id');
  if (!visitorID) {
    // Generate persistent Visitor ID
    visitorID = 'v_' + Math.random().toString(36).substring(2, 15) + '_' + Date.now().toString(36);
    localStorage.setItem('autocraft_visitor_id', visitorID);
  }

  // Parse acquisition traffic source and campaign
  let source = sessionStorage.getItem('autocraft_source');
  let campaign = sessionStorage.getItem('autocraft_campaign');
  let referrer = sessionStorage.getItem('autocraft_referrer');

  if (!source) {
    referrer = document.referrer || '';
    sessionStorage.setItem('autocraft_referrer', referrer);

    const urlParams = new URLSearchParams(window.location.search);
    const utmSource = urlParams.get('utm_source');
    const utmCampaign = urlParams.get('utm_campaign') || '';

    campaign = utmCampaign;
    sessionStorage.setItem('autocraft_campaign', campaign);

    // Determine acquisition source channels
    if (utmSource) {
      source = utmSource.charAt(0).toUpperCase() + utmSource.slice(1);
    } else if (!referrer) {
      source = 'Direct';
    } else if (referrer.includes('google.')) {
      source = 'Google';
    } else if (referrer.includes('bing.')) {
      source = 'Bing';
    } else if (referrer.includes('facebook.com')) {
      source = 'Facebook';
    } else if (referrer.includes('instagram.com')) {
      source = 'Instagram';
    } else if (referrer.includes('youtube.com')) {
      source = 'YouTube';
    } else if (referrer.includes('pinterest.com')) {
      source = 'Pinterest';
    } else if (referrer.includes('linkedin.com')) {
      source = 'LinkedIn';
    } else {
      try {
        const refUrl = new URL(referrer);
        source = refUrl.hostname;
      } catch {
        source = 'Referral';
      }
    }
    sessionStorage.setItem('autocraft_source', source);
  }

  return { sessionID, visitorID, source, campaign, referrer };
};

const { sessionID, visitorID, source, campaign, referrer } = getOrInitializeSession();

// Export visitorID and sessionID for checkout forms
export { visitorID, sessionID };

// 2. High-performance background event queue batcher
let eventQueue = [];
let flushTimeout = null;
const BATCH_SIZE_LIMIT = 10;
const FLUSH_INTERVAL_MS = 5000;

export const flushQueue = () => {
  if (eventQueue.length === 0) return;

  const batch = [...eventQueue];
  eventQueue = [];

  if (flushTimeout) {
    clearTimeout(flushTimeout);
    flushTimeout = null;
  }

  const payload = JSON.stringify({ events: batch });

  // Use sendBeacon for page-unload reliability, fallback to fetch with keepalive
  if (navigator.sendBeacon) {
    navigator.sendBeacon(`${BASE_URL}/analytics/track`, new Blob([payload], { type: 'application/json' }));
  } else {
    fetch(`${BASE_URL}/analytics/track`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: payload,
      keepalive: true,
    }).catch((err) => console.warn('[Analytics Telemetry] Batch flush failed:', err.message));
  }
};

export const trackEvent = (eventType, details = {}) => {
  if (typeof window === 'undefined') return;

  const eventDoc = {
    visitorID,
    sessionID,
    eventType,
    path: window.location.pathname,
    referrer: referrer || '',
    source: source || 'Direct',
    campaign: campaign || '',
    timestamp: new Date().toISOString(),
    deviceType: getDeviceType(),
    operatingSystem: getOS(),
    browser: getBrowser(),
    screenResolution: `${window.screen.width}x${window.screen.height}`,
    language: navigator.language || navigator.userLanguage || 'en',
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
    ...details,
  };

  eventQueue.push(eventDoc);

  if (eventQueue.length >= BATCH_SIZE_LIMIT) {
    flushQueue();
  } else if (!flushTimeout) {
    flushTimeout = setTimeout(flushQueue, FLUSH_INTERVAL_MS);
  }
};

// 4. Set up page unload hook to guarantee no data loss on close
if (typeof window !== 'undefined') {
  window.addEventListener('pagehide', flushQueue);
  window.addEventListener('beforeunload', flushQueue);
}
