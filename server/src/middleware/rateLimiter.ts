import type { Request, Response, NextFunction } from 'express';

interface RateLimitStore {
  hits: number;
  resetTime: number;
}

const stores = new Map<string, Map<string, RateLimitStore>>();

export function createRateLimiter(windowMs: number = 60000, maxRequests: number = 100, name: string = 'global') {
  if (!stores.has(name)) {
    stores.set(name, new Map());
  }

  const store = stores.get(name)!;

  // Cleanup old entries every 5 minutes
  setInterval(() => {
    const now = Date.now();
    for (const [ip, entry] of store.entries()) {
      if (now > entry.resetTime) {
        store.delete(ip);
      }
    }
  }, 300000);

  return (req: Request, res: Response, next: NextFunction) => {
    const ip = req.ip || req.socket.remoteAddress || 'unknown-ip';
    const now = Date.now();

    const record = store.get(ip);

    if (!record || now > record.resetTime) {
      store.set(ip, { hits: 1, resetTime: now + windowMs });
      return next();
    }

    record.hits += 1;

    if (record.hits > maxRequests) {
      res.status(429).json({
        success: false,
        message: `Too many requests from this IP. Please try again in ${Math.ceil((record.resetTime - now) / 1000)} seconds.`,
      });
      return;
    }

    next();
  };
}

export const authRateLimiter = createRateLimiter(15 * 60 * 1000, 20, 'auth'); // 20 requests per 15 mins for login/register
export const betRateLimiter = createRateLimiter(10000, 15, 'bet'); // Max 15 bets per 10 seconds per IP
export const globalRateLimiter = createRateLimiter(60000, 300, 'global'); // 300 requests per minute overall
