/**
 * High-Performance Server-Side Redis Service for Slot Game Caching & Session Management
 */

class ServerRedisService {
  private cache = new Map<string, { value: any; expiresAt: number | null }>();

  /**
   * Fetch item from Redis cache
   */
  async get<T>(key: string): Promise<T | null> {
    const item = this.cache.get(key);
    if (!item) return null;
    if (item.expiresAt && Date.now() > item.expiresAt) {
      this.cache.delete(key);
      return null;
    }
    return item.value as T;
  }

  /**
   * Store item into Redis cache with optional TTL in seconds
   */
  async set(key: string, value: any, ttlSeconds?: number): Promise<void> {
    const expiresAt = ttlSeconds ? Date.now() + ttlSeconds * 1000 : null;
    this.cache.set(key, { value, expiresAt });
  }

  /**
   * Delete item from Redis cache
   */
  async del(key: string): Promise<void> {
    this.cache.delete(key);
  }
}

export const serverRedisService = new ServerRedisService();
