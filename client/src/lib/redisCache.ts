/**
 * High-Performance Client-Side Redis Cache Simulator & Engine
 * Provides sub-millisecond key-value caching, TTL expiration, and hash operations for Slot Games.
 */

interface CacheEntry<T> {
  data: T;
  expiresAt: number | null;
}

class RedisCacheEngine {
  private cache = new Map<string, CacheEntry<any>>();
  private hits = 0;
  private misses = 0;

  /**
   * Get a cached value by key
   */
  async get<T>(key: string): Promise<T | null> {
    const entry = this.cache.get(key);
    if (!entry) {
      this.misses++;
      return null;
    }

    if (entry.expiresAt && Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      this.misses++;
      return null;
    }

    this.hits++;
    return entry.data as T;
  }

  /**
   * Set a key in Redis cache with optional TTL in seconds
   */
  async set(key: string, value: any, ttlSeconds?: number): Promise<void> {
    const expiresAt = ttlSeconds ? Date.now() + ttlSeconds * 1000 : null;
    this.cache.set(key, { data: value, expiresAt });
  }

  /**
   * Delete a key from Redis cache
   */
  async del(key: string): Promise<void> {
    this.cache.delete(key);
  }

  /**
   * Store field-value in a Redis Hash
   */
  async hset(hashKey: string, field: string, value: any): Promise<void> {
    const existing = (await this.get<Record<string, any>>(hashKey)) || {};
    existing[field] = value;
    await this.set(hashKey, existing);
  }

  /**
   * Get all fields from a Redis Hash
   */
  async hgetall<T>(hashKey: string): Promise<T | null> {
    return this.get<T>(hashKey);
  }

  /**
   * Clear all Redis cache entries
   */
  async flushall(): Promise<void> {
    this.cache.clear();
    this.hits = 0;
    this.misses = 0;
  }

  /**
   * Cache telemetry metrics
   */
  getStats() {
    return {
      size: this.cache.size,
      hits: this.hits,
      misses: this.misses,
      hitRate: this.hits + this.misses > 0 ? `${((this.hits / (this.hits + this.misses)) * 100).toFixed(1)}%` : '0%',
    };
  }
}

export const redisCache = new RedisCacheEngine();
