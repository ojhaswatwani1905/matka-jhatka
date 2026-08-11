import Redis from 'ioredis';

/**
 * High-Performance Server-Side Redis Service for Ephemeral State, Caching, and Session Management
 * Includes automatic in-memory fallback if Redis connection is unavailable.
 */

class ServerRedisService {
  private client: Redis | null = null;
  private isAvailable: boolean = false;
  private memoryCache = new Map<string, { value: any; expiresAt: number | null }>();

  constructor() {
    this.initRedis();
  }

  private initRedis() {
    const redisUrl = process.env.REDIS_URL || 'redis://127.0.0.1:6379';
    try {
      this.client = new Redis(redisUrl, {
        maxRetriesPerRequest: 2,
        connectTimeout: 3000,
        enableOfflineQueue: false,
        retryStrategy(times) {
          if (times > 3) return null; // Stop retrying quickly to use fallback
          return Math.min(times * 500, 2000);
        },
      });

      this.client.on('connect', () => {
        this.isAvailable = true;
        console.log('✅ Redis connected successfully.');
      });

      this.client.on('error', (err) => {
        if (this.isAvailable) {
          console.warn('[Redis] Connection warning (using in-memory fallback):', err.message);
        }
        this.isAvailable = false;
      });
    } catch {
      this.isAvailable = false;
      console.warn('[Redis] Client initialization skipped. Operating in fallback mode.');
    }
  }

  /**
   * Fetch item from Redis (or fallback cache)
   */
  async get<T>(key: string): Promise<T | null> {
    if (this.isAvailable && this.client) {
      try {
        const data = await this.client.get(key);
        return data ? JSON.parse(data) : null;
      } catch {
        this.isAvailable = false;
      }
    }

    // Fallback in-memory check
    const item = this.memoryCache.get(key);
    if (!item) return null;
    if (item.expiresAt && Date.now() > item.expiresAt) {
      this.memoryCache.delete(key);
      return null;
    }
    return item.value as T;
  }

  /**
   * Store item into Redis (or fallback cache) with optional TTL in seconds
   */
  async set(key: string, value: any, ttlSeconds?: number): Promise<void> {
    const serialized = JSON.stringify(value);

    if (this.isAvailable && this.client) {
      try {
        if (ttlSeconds) {
          await this.client.set(key, serialized, 'EX', ttlSeconds);
        } else {
          await this.client.set(key, serialized);
        }
        return;
      } catch {
        this.isAvailable = false;
      }
    }

    // Fallback in-memory store
    const expiresAt = ttlSeconds ? Date.now() + ttlSeconds * 1000 : null;
    this.memoryCache.set(key, { value, expiresAt });
  }

  /**
   * Delete item from Redis (or fallback cache)
   */
  async del(key: string): Promise<void> {
    if (this.isAvailable && this.client) {
      try {
        await this.client.del(key);
        return;
      } catch {
        this.isAvailable = false;
      }
    }
    this.memoryCache.delete(key);
  }

  /**
   * Active User Session Management (Avoid DB hits on auth check)
   */
  async cacheSession(token: string, user: any, ttlSec: number = 86400): Promise<void> {
    await this.set(`session:${token}`, user, ttlSec);
  }

  async getSession(token: string): Promise<any | null> {
    return this.get<any>(`session:${token}`);
  }

  async invalidateSession(token: string): Promise<void> {
    await this.del(`session:${token}`);
  }

  /**
   * Immediately Revoke All Active Sessions for a Specific User (Force-Logout)
   */
  async revokeUserSessions(userId: string, ttlSec: number = 86400): Promise<void> {
    await this.set(`revoked_user:${userId}`, true, ttlSec);
  }

  async isUserRevoked(userId: string): Promise<boolean> {
    const revoked = await this.get<boolean>(`revoked_user:${userId}`);
    return !!revoked;
  }

  async unrevokeUser(userId: string): Promise<void> {
    await this.del(`revoked_user:${userId}`);
  }

  /**
   * Live Game Round Ephemeral State
   */
  async setLiveRoundState(gameType: string, state: any): Promise<void> {
    await this.set(`round:${gameType}`, state, 3600);
  }

  async getLiveRoundState(gameType: string): Promise<any | null> {
    return this.get<any>(`round:${gameType}`);
  }

  /**
   * Live Bet Activity Ticker
   */
  async pushLiveBet(gameType: string, bet: any): Promise<void> {
    const key = `live_bets:${gameType}`;
    const current = (await this.get<any[]>(key)) || [];
    const updated = [bet, ...current.slice(0, 49)];
    await this.set(key, updated, 1800);
  }

  async getRecentLiveBets(gameType: string): Promise<any[]> {
    return (await this.get<any[]>(`live_bets:${gameType}`)) || [];
  }

  /**
   * Redis Chat Rate Limiter (e.g. max 5 messages in 10 seconds)
   */
  async checkChatRateLimit(userId: string, maxMessages = 5, windowSec = 10): Promise<{ allowed: boolean; remaining: number }> {
    const key = `ratelimit:chat:${userId}`;
    if (this.isAvailable && this.client) {
      try {
        const count = await this.client.incr(key);
        if (count === 1) {
          await this.client.expire(key, windowSec);
        }
        return {
          allowed: count <= maxMessages,
          remaining: Math.max(0, maxMessages - count),
        };
      } catch {
        this.isAvailable = false;
      }
    }

    // In-memory fallback rate check
    const item = this.memoryCache.get(key);
    const count = (item?.value || 0) + 1;
    this.memoryCache.set(key, { value: count, expiresAt: Date.now() + windowSec * 1000 });
    return {
      allowed: count <= maxMessages,
      remaining: Math.max(0, maxMessages - count),
    };
  }
}

export const redisService = new ServerRedisService();
export const serverRedisService = redisService; // Alias for backward compatibility
