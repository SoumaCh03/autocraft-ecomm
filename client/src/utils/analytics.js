import BASE_URL from './api';

// 1. Session & Acquisition Source setup
const getOrInitializeSession = () => {
  if (typeof window === 'undefined') return { sessionID: '', source: 'Direct', campaign: '' };

  let sessionID = sessionStorage.getItem('autocraft_session_id');
  if (!sessionID) {
    // Generate UUID-like unique identifier
    sessionID = 'ac_' + Math.random().toString(36).substring(2, 15) + '_' + Date.now().toString(36);
    sessionStorage.setItem('autocraft_session_id', sessionID);
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

  return { sessionID, source, campaign, referrer };
};

const { sessionID, source, campaign, referrer } = getOrInitializeSession();

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
    sessionID,
    eventType,
    path: window.location.pathname,
    referrer: referrer || '',
    source: source || 'Direct',
    campaign: campaign || '',
    timestamp: new Date().toISOString(),
    ...details,
  };

  eventQueue.push(eventDoc);

  if (eventQueue.length >= BATCH_SIZE_LIMIT) {
    flushQueue();
  } else if (!flushTimeout) {
    flushTimeout = setTimeout(flushQueue, FLUSH_INTERVAL_MS);
  }
};

// 3. Helper: Device type detector
export const getDeviceType = () => {
  if (typeof window === 'undefined') return 'desktop';
  const width = window.innerWidth;
  if (width < 768) return 'mobile';
  if (width < 1024) return 'tablet';
  return 'desktop';
};

// 4. Set up page unload hook to guarantee no data loss on close
if (typeof window !== 'undefined') {
  window.addEventListener('pagehide', flushQueue);
  window.addEventListener('beforeunload', flushQueue);
}
