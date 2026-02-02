/**
 * Simple in-memory cache implementation with TTL support
 */
class Cache {
  constructor() {
    this.store = new Map();
  }

  /**
   * Set a value in the cache with optional TTL
   * @param {string} key - Cache key
   * @param {any} value - Value to cache
   * @param {number} ttlMs - Time to live in milliseconds
   */
  set(key, value, ttlMs = 60000) {
    const expiresAt = Date.now() + ttlMs;
    this.store.set(key, { value, expiresAt });
  }

  /**
   * Get a value from the cache
   * @param {string} key - Cache key
   * @returns {any|null} Cached value or null if expired/not found
   */
  get(key) {
    const entry = this.store.get(key);
    
    if (!entry) {
      return null;
    }

    // Check if expired
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return null;
    }

    return entry.value;
  }

  /**
   * Delete a value from the cache
   * @param {string} key - Cache key
   */
  delete(key) {
    this.store.delete(key);
  }

  /**
   * Clear all cached values
   */
  clear() {
    this.store.clear();
  }

  /**
   * Get cache statistics
   * @returns {Object} Cache stats
   */
  getStats() {
    const now = Date.now();
    let activeEntries = 0;
    let expiredEntries = 0;

    for (const [, entry] of this.store) {
      if (now > entry.expiresAt) {
        expiredEntries++;
      } else {
        activeEntries++;
      }
    }

    return {
      totalEntries: this.store.size,
      activeEntries,
      expiredEntries
    };
  }

  /**
   * Clean up expired entries
   */
  cleanup() {
    const now = Date.now();
    const keysToDelete = [];

    for (const [key, entry] of this.store) {
      if (now > entry.expiresAt) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach(key => this.store.delete(key));
    
    if (keysToDelete.length > 0) {
      console.log(`[Cache] Cleaned up ${keysToDelete.length} expired entries`);
    }
  }
}

// Create singleton instance
const cache = new Cache();

// Run cleanup every 5 minutes
setInterval(() => {
  cache.cleanup();
}, 5 * 60 * 1000);

export default cache;
