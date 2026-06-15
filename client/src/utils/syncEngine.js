import axios from 'axios';
import offlineDb from './offlineDb.js';
import BASE_URL from './api.js';

let isOnline = navigator.onLine;
let syncStatus = 'idle'; // 'idle', 'syncing', 'success', 'error'
const listeners = new Set();
let checkConnectionInterval = null;

export const getConnectionState = () => ({
  isOnline,
  syncStatus
});

export const registerConnectionListener = (callback) => {
  listeners.add(callback);
  callback({ isOnline, syncStatus });
  return () => listeners.delete(callback);
};

const notifyListeners = () => {
  listeners.forEach((callback) => callback({ isOnline, syncStatus }));
};

/**
 * Checks connectivity by pinging the backend health endpoint.
 */
export const pingServer = async () => {
  try {
    // We use a clean fetch request with a cache-busting timestamp to avoid browser cache
    const response = await fetch(`${BASE_URL.replace('/api', '')}/health?t=${Date.now()}`, {
      method: 'GET',
      mode: 'cors',
      cache: 'no-store'
    });
    return response.ok;
  } catch (err) {
    return false;
  }
};

/**
 * Updates the online status state and triggers sync if transitioning to online.
 */
export const setOnlineStatus = async (online) => {
  const previousOnline = isOnline;
  isOnline = online;
  
  if (isOnline && !previousOnline) {
    console.log('[Sync Engine] Transitioned to ONLINE. Triggering synchronization...');
    triggerSync();
  } else {
    notifyListeners();
  }
};

/**
 * Triggers the queue replay synchronization sequence.
 */
export const triggerSync = async () => {
  if (syncStatus === 'syncing') return;
  if (!isOnline) {
    console.log('[Sync Engine] Offline. Sync deferred.');
    return;
  }

  const operations = await offlineDb.getOperations();
  
  // Filter operations: we replay operations that are 'pending' or 'failed'.
  // We skip active 'conflict' items until resolved by an admin.
  const executableOps = operations.filter(
    (op) => op.status === 'pending' || op.status === 'failed'
  );

  if (executableOps.length === 0) {
    syncStatus = 'idle';
    notifyListeners();
    return;
  }

  console.log(`[Sync Engine] Starting sync replay for ${executableOps.length} pending operations.`);
  syncStatus = 'syncing';
  notifyListeners();

  try {
    // Replay operations by batching them to the /api/sync/replay route
    const { data } = await axios.post(
      `${BASE_URL}/sync/replay`,
      { operations: executableOps },
      {
        withCredentials: true,
        // Custom flag to bypass Axios interceptor queueing
        bypassOfflineInterceptor: true
      }
    );

    const { results } = data;
    let hasConflicts = false;
    let hasFailures = false;

    for (const result of results) {
      const originalOp = executableOps.find((op) => op.id === result.id);
      if (!originalOp) continue;

      if (result.status === 'synced') {
        // Success: Clean from IndexedDB operations queue
        await offlineDb.deleteOperation(originalOp.id);
        
        // Cache the newly returned server state
        if (result.serverState) {
          const cacheUrl = originalOp.url;
          // Invalidate/refresh list cache for related categories
          await offlineDb.saveCache(cacheUrl, result.serverState);
        }
      } 
      else if (result.status === 'conflict') {
        hasConflicts = true;
        // Save to conflicts database
        await offlineDb.saveConflict({
          id: originalOp.id,
          operation: originalOp,
          serverState: result.serverState,
          clientVersion: result.clientVersion,
          serverVersion: result.serverVersion,
          resolved: false,
          timestamp: Date.now()
        });

        // Set status in queue to 'conflict'
        await offlineDb.saveOperation({
          ...originalOp,
          status: 'conflict',
          errorMessage: result.errorMessage
        });
      } 
      else {
        hasFailures = true;
        // General transaction fail
        const updatedOp = {
          ...originalOp,
          status: 'failed',
          retryCount: (originalOp.retryCount || 0) + 1,
          errorMessage: result.errorMessage || 'Unknown server execution error'
        };

        if (updatedOp.retryCount >= 5) {
          // Permanently block auto-retries if threshold is breached, requires admin intervention
          updatedOp.status = 'failed';
        }

        await offlineDb.saveOperation(updatedOp);
      }
    }

    if (hasConflicts) {
      syncStatus = 'error';
      console.warn('[Sync Engine] Synced with unresolved conflicts.');
    } else if (hasFailures) {
      syncStatus = 'error';
      console.error('[Sync Engine] Sync failed for some operations.');
    } else {
      syncStatus = 'success';
      console.log('[Sync Engine] Synchronization completed successfully.');
      setTimeout(() => {
        if (syncStatus === 'success') {
          syncStatus = 'idle';
          notifyListeners();
        }
      }, 5000);
    }
  } catch (error) {
    console.error('[Sync Engine] Sync network request failed:', error);
    syncStatus = 'error';
    
    // Check if network failed mid-sync
    const stillOnline = await pingServer();
    if (!stillOnline) {
      isOnline = false;
    }
  } finally {
    notifyListeners();
  }
};

/**
 * Initializes the background synchronization scheduler and triggers connection checks.
 */
export const initSyncScheduler = () => {
  window.addEventListener('online', () => setOnlineStatus(true));
  window.addEventListener('offline', () => setOnlineStatus(false));

  // Regular server ping to check actual connection availability (every 20s)
  checkConnectionInterval = setInterval(async () => {
    const reachable = await pingServer();
    if (reachable !== isOnline) {
      setOnlineStatus(reachable);
    } else if (reachable && syncStatus === 'idle') {
      // Periodic auto-check for pending operations
      const ops = await offlineDb.getOperations();
      const hasPending = ops.some((op) => op.status === 'pending' || op.status === 'failed');
      if (hasPending) {
        triggerSync();
      }
    }
  }, 20000);

  // Initial connection check
  pingServer().then((reachable) => {
    isOnline = reachable;
    notifyListeners();
    if (reachable) {
      triggerSync();
    }
  });
};

export const stopSyncScheduler = () => {
  if (checkConnectionInterval) {
    clearInterval(checkConnectionInterval);
  }
  window.removeEventListener('online', () => setOnlineStatus(true));
  window.removeEventListener('offline', () => setOnlineStatus(false));
};
