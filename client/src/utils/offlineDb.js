const DB_NAME = 'autocraft_offline_db';
const DB_VERSION = 1;

/**
 * Native Promise-based IndexedDB wrapper for offline capabilities.
 */
class OfflineDb {
  constructor() {
    this.db = null;
  }

  open() {
    if (this.db) return Promise.resolve(this.db);

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = (event) => {
        console.error('[Offline DB] Error opening IndexedDB:', event.target.error);
        reject(event.target.error);
      };

      request.onsuccess = (event) => {
        this.db = event.target.result;
        resolve(this.db);
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;

        // Queue of mutations to execute when online
        if (!db.objectStoreNames.contains('operations')) {
          const opStore = db.createObjectStore('operations', { keyPath: 'id' });
          opStore.createIndex('timestamp', 'timestamp', { unique: false });
        }

        // Cache of GET endpoints for offline viewing
        if (!db.objectStoreNames.contains('cache')) {
          db.createObjectStore('cache', { keyPath: 'url' });
        }

        // Active version conflicts that require admin reconciliation
        if (!db.objectStoreNames.contains('conflicts')) {
          db.createObjectStore('conflicts', { keyPath: 'id' });
        }

        // General settings/metadata (e.g. Device ID, sync settings)
        if (!db.objectStoreNames.contains('metadata')) {
          db.createObjectStore('metadata', { keyPath: 'key' });
        }
      };
    });
  }

  // --- OPERATIONS QUEUE METHODS ---

  async saveOperation(op) {
    const db = await this.open();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['operations'], 'readwrite');
      const store = transaction.objectStore(transaction.objectStoreNames[0]);
      const request = store.put(op);

      request.onsuccess = () => resolve(op);
      request.onerror = (event) => reject(event.target.error);
    });
  }

  async getOperations() {
    const db = await this.open();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['operations'], 'readonly');
      const store = transaction.objectStore('operations');
      const index = store.index('timestamp');
      const request = index.openCursor(null, 'next'); // Ascending order (FIFO)
      const operations = [];

      request.onsuccess = (event) => {
        const cursor = event.target.result;
        if (cursor) {
          operations.push(cursor.value);
          cursor.continue();
        } else {
          resolve(operations);
        }
      };
      request.onerror = (event) => reject(event.target.error);
    });
  }

  async deleteOperation(id) {
    const db = await this.open();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['operations'], 'readwrite');
      const store = transaction.objectStore('operations');
      const request = store.delete(id);

      request.onsuccess = () => resolve(true);
      request.onerror = (event) => reject(event.target.error);
    });
  }

  async clearOperations() {
    const db = await this.open();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['operations'], 'readwrite');
      const store = transaction.objectStore('operations');
      const request = store.clear();

      request.onsuccess = () => resolve(true);
      request.onerror = (event) => reject(event.target.error);
    });
  }

  // --- CACHE METHODS ---

  async saveCache(url, data) {
    const db = await this.open();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['cache'], 'readwrite');
      const store = transaction.objectStore('cache');
      const cachedItem = {
        url,
        data,
        cachedAt: Date.now()
      };
      const request = store.put(cachedItem);

      request.onsuccess = () => resolve(true);
      request.onerror = (event) => reject(event.target.error);
    });
  }

  async getCache(url) {
    const db = await this.open();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['cache'], 'readonly');
      const store = transaction.objectStore('cache');
      const request = store.get(url);

      request.onsuccess = (event) => {
        const result = event.target.result;
        resolve(result ? result.data : null);
      };
      request.onerror = (event) => reject(event.target.error);
    });
  }

  async clearCache() {
    const db = await this.open();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['cache'], 'readwrite');
      const store = transaction.objectStore('cache');
      const request = store.clear();

      request.onsuccess = () => resolve(true);
      request.onerror = (event) => reject(event.target.error);
    });
  }

  // --- CONFLICTS METHODS ---

  async saveConflict(conflict) {
    const db = await this.open();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['conflicts'], 'readwrite');
      const store = transaction.objectStore('conflicts');
      const request = store.put(conflict);

      request.onsuccess = () => resolve(conflict);
      request.onerror = (event) => reject(event.target.error);
    });
  }

  async getConflicts() {
    const db = await this.open();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['conflicts'], 'readonly');
      const store = transaction.objectStore('conflicts');
      const request = store.getAll();

      request.onsuccess = (event) => resolve(event.target.result || []);
      request.onerror = (event) => reject(event.target.error);
    });
  }

  async deleteConflict(id) {
    const db = await this.open();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['conflicts'], 'readwrite');
      const store = transaction.objectStore('conflicts');
      const request = store.delete(id);

      request.onsuccess = () => resolve(true);
      request.onerror = (event) => reject(event.target.error);
    });
  }

  async clearConflicts() {
    const db = await this.open();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['conflicts'], 'readwrite');
      const store = transaction.objectStore('conflicts');
      const request = store.clear();

      request.onsuccess = () => resolve(true);
      request.onerror = (event) => reject(event.target.error);
    });
  }

  // --- METADATA METHODS ---

  async setMeta(key, value) {
    const db = await this.open();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['metadata'], 'readwrite');
      const store = transaction.objectStore('metadata');
      const request = store.put({ key, value });

      request.onsuccess = () => resolve(true);
      request.onerror = (event) => reject(event.target.error);
    });
  }

  async getMeta(key) {
    const db = await this.open();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['metadata'], 'readonly');
      const store = transaction.objectStore('metadata');
      const request = store.get(key);

      request.onsuccess = (event) => {
        const result = event.target.result;
        resolve(result ? result.value : null);
      };
      request.onerror = (event) => reject(event.target.error);
    });
  }
}

const offlineDb = new OfflineDb();
export default offlineDb;
