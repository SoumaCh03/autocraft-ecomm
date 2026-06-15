import axios from 'axios';
import offlineDb from './offlineDb.js';
import { getConnectionState, pingServer } from './syncEngine.js';
import { generateUUID, getDeviceDetails } from './deviceInfo.js';
import toast from 'react-hot-toast';

// Helper to check if url is a safe admin mutations route
const isSafeRoute = (url = '') => {
  const safePaths = ['/products', '/orders', '/categories', '/coupons'];
  // Exclude security, auth, uploads, and payment routes
  const unsafePaths = ['/auth', '/upload', '/payment', '/governance'];
  
  const hasSafePath = safePaths.some(path => url.includes(path));
  const hasUnsafePath = unsafePaths.some(path => url.includes(path));

  return hasSafePath && !hasUnsafePath;
};

// Helper to extract entity type from url
const getEntityFromUrl = (url = '') => {
  if (url.includes('/products')) return 'Product';
  if (url.includes('/orders')) return 'Order';
  if (url.includes('/categories')) return 'Category';
  if (url.includes('/coupons')) return 'Coupon';
  return null;
};

// Helper to extract entityId from url
const getEntityIdFromUrl = (url = '') => {
  // Regex to match MongoDB ObjectId (24 hex chars)
  const idMatch = url.match(/\/([a-f\d]{24})/i);
  return idMatch ? idMatch[1] : null;
};

const getOperationType = (method = '') => {
  const m = method.toLowerCase();
  if (m === 'post') return 'CREATE';
  if (m === 'put' || m === 'patch') return 'UPDATE';
  if (m === 'delete') return 'DELETE';
  return null;
};

// Lightweight checksum generator
const generateChecksum = (data) => {
  const str = JSON.stringify(data || {});
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return 'checksum_' + Math.abs(hash).toString(16);
};

export const initOfflineInterceptor = () => {
  // --- AXIOS REQUEST INTERCEPTOR ---
  axios.interceptors.request.use(
    async (config) => {
      if (config.bypassOfflineInterceptor) {
        return config;
      }

      // Automatically attach entity version header if we are mutating a cached entity
      if (config.method === 'put' || config.method === 'patch') {
        const entity = getEntityFromUrl(config.url);
        const entityId = getEntityIdFromUrl(config.url);
        if (entity && entityId) {
          // Check if we have cached this document and grab its version
          const cachedDoc = await offlineDb.getCache(config.url);
          if (cachedDoc && cachedDoc.entityVersion?.version) {
            config.headers['X-Entity-Version'] = cachedDoc.entityVersion.version;
          }
        }
      }

      const { isOnline } = getConnectionState();
      
      // Handle GET cache serving while offline
      if (!isOnline && config.method === 'get' && isSafeRoute(config.url)) {
        const cached = await offlineDb.getCache(config.url);
        if (cached) {
          console.log(`[Offline Interceptor] Serving cached GET: ${config.url}`);
          const err = new Error('Offline cached response');
          err.isOfflineCached = true;
          err.cachedData = cached;
          err.config = config;
          throw err; // Caught by response error handler to resolve
        }
      }

      // Handle Mutating requests while offline
      if (!isOnline && (config.method === 'post' || config.method === 'put' || config.method === 'delete') && isSafeRoute(config.url)) {
        const entity = getEntityFromUrl(config.url);
        const operationType = getOperationType(config.method);

        if (entity && operationType) {
          console.log(`[Offline Interceptor] Queueing mutation: ${operationType} on ${entity}`);
          
          const deviceDetails = getDeviceDetails();
          const opId = generateUUID();
          const entityId = getEntityIdFromUrl(config.url);
          
          const op = {
            id: opId,
            entity,
            entityId,
            operationType,
            url: config.url,
            method: config.method.toUpperCase(),
            payload: config.data,
            expectedVersion: config.headers['X-Entity-Version'] ? parseInt(config.headers['X-Entity-Version'], 10) : undefined,
            timestamp: Date.now(),
            deviceId: deviceDetails.deviceId,
            sessionId: deviceDetails.sessionId,
            browser: deviceDetails.browser,
            os: deviceDetails.os,
            platform: deviceDetails.platform,
            status: 'pending',
            retryCount: 0,
            checksum: generateChecksum(config.data)
          };

          // Save operation to IndexedDB persistent queue
          await offlineDb.saveOperation(op);

          // Mock successful optimistic response data
          let mockData = config.data || {};
          if (operationType === 'CREATE') {
            mockData = { ...mockData, _id: `temp_${generateUUID().slice(0, 18)}` };
          }

          toast.success(`Action queued offline: ${entity} modification recorded.`);

          const err = new Error('Offline queued operation');
          err.isOfflineMutated = true;
          err.mockedData = mockData;
          err.config = config;
          throw err;
        }
      }

      return config;
    },
    (error) => Promise.reject(error)
  );

  // --- AXIOS RESPONSE INTERCEPTOR ---
  axios.interceptors.response.use(
    async (response) => {
      // If request is successful, update our GET cache if it's a safe route
      if (response.config.method === 'get' && isSafeRoute(response.config.url) && !response.config.bypassOfflineInterceptor) {
        await offlineDb.saveCache(response.config.url, response.data);
      }
      return response;
    },
    async (error) => {
      // 1. Resolve offline cached responses
      if (error.isOfflineCached) {
        return Promise.resolve({
          data: error.cachedData,
          status: 200,
          statusText: 'OK',
          headers: {},
          config: error.config
        });
      }

      // 2. Resolve offline queued mutations
      if (error.isOfflineMutated) {
        return Promise.resolve({
          data: error.mockedData,
          status: 200,
          statusText: 'OK',
          headers: {},
          config: error.config
        });
      }

      // 3. Handle connection drops during active mutation requests (online -> offline transition)
      const isMutation = error.config && ['post', 'put', 'delete'].includes(error.config.method?.toLowerCase());
      const isNetworkError = !error.response || error.code === 'ECONNABORTED' || error.message === 'Network Error';

      if (isMutation && isNetworkError && isSafeRoute(error.config.url) && !error.config.bypassOfflineInterceptor) {
        console.warn('[Offline Interceptor] Network dropped during request. Queueing operation.');
        
        const entity = getEntityFromUrl(error.config.url);
        const operationType = getOperationType(error.config.method);

        if (entity && operationType) {
          const deviceDetails = getDeviceDetails();
          const opId = generateUUID();
          const entityId = getEntityIdFromUrl(error.config.url);
          
          const op = {
            id: opId,
            entity,
            entityId,
            operationType,
            url: error.config.url,
            method: error.config.method.toUpperCase(),
            payload: error.config.data,
            expectedVersion: error.config.headers['X-Entity-Version'] ? parseInt(error.config.headers['X-Entity-Version'], 10) : undefined,
            timestamp: Date.now(),
            deviceId: deviceDetails.deviceId,
            sessionId: deviceDetails.sessionId,
            browser: deviceDetails.browser,
            os: deviceDetails.os,
            platform: deviceDetails.platform,
            status: 'pending',
            retryCount: 0,
            checksum: generateChecksum(error.config.data)
          };

          await offlineDb.saveOperation(op);
          toast.error('Network timeout. Saved action to offline queue.');

          let mockData = error.config.data || {};
          if (operationType === 'CREATE') {
            mockData = { ...mockData, _id: `temp_${generateUUID().slice(0, 18)}` };
          }

          return Promise.resolve({
            data: mockData,
            status: 200,
            statusText: 'OK',
            headers: {},
            config: error.config
          });
        }
      }

      return Promise.reject(error);
    }
  );
};
