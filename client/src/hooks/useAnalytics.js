import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { trackEvent, getDeviceType, flushQueue } from '../utils/analytics';

export default function useAnalytics() {
  const location = useLocation();

  useEffect(() => {
    // 1. Resolve product page views
    let productId = null;
    if (location.pathname.startsWith('/product/')) {
      const parts = location.pathname.split('/');
      productId = parts[2] || null;
    }

    // 2. Track page view
    trackEvent('page_view', { productId });

    // Flush immediately on page transitions to maintain real-time telemetry updates
    flushQueue();
  }, [location.pathname]);

  useEffect(() => {
    // 3. Click Heatmap Telemetry (Throttled click coordinates tracker)
    let clickTimeout = null;
    const handleGlobalClick = (e) => {
      if (clickTimeout) return;

      clickTimeout = setTimeout(() => {
        clickTimeout = null;
      }, 500); // Throttling: Max 1 click per 500ms

      const x = Math.min(100, Math.max(0, Math.round((e.clientX / window.innerWidth) * 100)));
      const y = Math.min(100, Math.max(0, Math.round((e.pageY / document.documentElement.scrollHeight) * 100)));

      trackEvent('click', {
        heatmapData: {
          x,
          y,
          deviceType: getDeviceType(),
        },
      });
    };

    // 4. Scroll Depth Telemetry (Tracks scroll benchmarks by 15% thresholds)
    let lastReportedScroll = 0;
    let scrollTimeout = null;

    const handleScroll = () => {
      if (scrollTimeout) return;

      scrollTimeout = setTimeout(() => {
        scrollTimeout = null;

        const scrollTop = window.scrollY || document.documentElement.scrollTop;
        const totalScrollable = document.documentElement.scrollHeight - window.innerHeight;
        if (totalScrollable <= 0) return;

        const scrollPercent = Math.min(100, Math.max(0, Math.round((scrollTop / totalScrollable) * 100)));

        if (scrollPercent >= lastReportedScroll + 15) {
          lastReportedScroll = Math.floor(scrollPercent / 15) * 15;
          trackEvent('scroll', {
            heatmapData: {
              x: 50, // Centered horizontal coordinate
              y: lastReportedScroll,
              deviceType: getDeviceType(),
            },
          });
        }
      }, 300); // Throttling: Max check every 300ms
    };

    window.addEventListener('click', handleGlobalClick);
    window.addEventListener('scroll', handleScroll);

    return () => {
      window.removeEventListener('click', handleGlobalClick);
      window.removeEventListener('scroll', handleScroll);
    };
  }, [location.pathname]);
}
