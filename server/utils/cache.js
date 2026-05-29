/**
 * High-performance, in-memory TTL Cache Engine.
 * Ideal for caching heavy aggregations and database queries under high concurrent loads.
 */
class LocalCache {
  constructor() {
    this.cache = new Map();
  }

  /**
   * Sets a value in the cache with a Time-To-Live (TTL) in seconds.
   * @param {string} key 
   * @param {*} value 
   * @param {number} ttlSeconds 
   */
  set(key, value, ttlSeconds) {
    const expiresAt = Date.now() + (ttlSeconds * 1000);
    this.cache.set(key, { value, expiresAt });
  }

  /**
   * Retrieves a value from the cache. Returns null if missing or expired.
   * @param {string} key 
   * @returns {*} cached value or null
   */
  get(key) {
    const item = this.cache.get(key);
    if (!item) return null;

    if (Date.now() > item.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return item.value;
  }

  /**
   * Deletes a specific key from the cache.
   * @param {string} key 
   */
  del(key) {
    this.cache.delete(key);
  }

  /**
   * Clears all items in the cache.
   */
  flush() {
    this.cache.clear();
  }

  /**
   * Deletes all cached items that match a specific key prefix (e.g. "products").
   * @param {string} prefix 
   */
  clearByPrefix(prefix) {
    for (const key of this.cache.keys()) {
      if (key.startsWith(prefix)) {
        this.cache.delete(key);
      }
    }
  }
}

export const localCache = new LocalCache();
