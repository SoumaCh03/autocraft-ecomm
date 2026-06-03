import { AnalyticsEvent, AnalyticsSettings } from '../models/analyticsModel.js';

/**
 * Initializes the daily automatic background task to prune old raw analytics events
 * based on the administrator's retention settings (30, 90, 180, 365 days).
 */
export const startAnalyticsCleanupJob = () => {
  // Execute every 24 hours
  const DAILY_INTERVAL_MS = 24 * 60 * 60 * 1000;

  const executeCleanup = async () => {
    try {
      let settings = await AnalyticsSettings.findOne();
      const retentionDays = settings?.retentionDays || 90;

      // Special case: 9999 stands for infinite/custom long-term retention
      if (retentionDays === 9999) {
        console.log('[Analytics Cleanup] Infinite retention configured. Skipping automatic pruning.');
        return;
      }

      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

      const result = await AnalyticsEvent.deleteMany({
        timestamp: { $lt: cutoffDate }
      });

      console.log(`[Analytics Cleanup] Executed successfully. Deleted ${result.deletedCount} events older than ${retentionDays} days (cutoff: ${cutoffDate.toLocaleDateString()}).`);
    } catch (error) {
      console.error('[Analytics Cleanup] Job failed:', error.message);
    }
  };

  // Trigger initial run 10 seconds after server startup
  setTimeout(executeCleanup, 10000);

  // Set recurring daily interval
  setInterval(executeCleanup, DAILY_INTERVAL_MS);
};
