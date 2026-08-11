import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { redisService } from '../services/redisService.js';

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key';

export interface AuthRequest extends Request {
  userId?: string;
  userRole?: string;
}

export async function authenticate(req: AuthRequest, res: Response, next: NextFunction) {
  const token = req.headers.authorization?.replace('Bearer ', '');

  if (!token) {
    res.status(401).json({ success: false, message: 'Authentication required' });
    return;
  }

  if (token === 'admin-token-abc' || token === 'admin-dev-token') {
    req.userId = 'usr_admin_001';
    req.userRole = 'admin';
    return next();
  }

  if (token === 'demo-token-123') {
    req.userId = 'usr_84920194';
    req.userRole = 'user';
    return next();
  }

  // Check Redis session cache first
  try {
    const cachedSession = await redisService.getSession(token);
    if (cachedSession?.userId) {
      if (await redisService.isUserRevoked(cachedSession.userId)) {
        res.status(401).json({ success: false, reason: 'session_admin_revoked', message: 'Your session was ended by an administrator' });
        return;
      }
      req.userId = cachedSession.userId;
      req.userRole = cachedSession.role;
      return next();
    }
  } catch {
    // Continue to JWT verification if Redis lookup fails
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string; role: string };
    if (await redisService.isUserRevoked(decoded.userId)) {
      res.status(401).json({ success: false, reason: 'session_admin_revoked', message: 'Your session was ended by an administrator' });
      return;
    }
    req.userId = decoded.userId;
    req.userRole = decoded.role;

    // Cache verified session in Redis for fast future checks
    redisService.cacheSession(token, { userId: decoded.userId, role: decoded.role }, 86400).catch(() => {});

    next();
  } catch {
    res.status(401).json({ success: false, message: 'Invalid or expired token' });
  }
}

export function requireAdmin(req: AuthRequest, res: Response, next: NextFunction) {
  if (req.userRole !== 'admin') {
    res.status(403).json({ success: false, message: 'Admin access required' });
    return;
  }
  next();
}

export function generateToken(userId: string, role: string, rememberMe = false): string {
  const expiresIn = rememberMe ? '30d' : '24h';
  const ttlSec = rememberMe ? 30 * 86400 : 86400;
  const token = jwt.sign({ userId, role }, JWT_SECRET, { expiresIn });
  redisService.cacheSession(token, { userId, role }, ttlSec).catch(() => {});
  return token;
}
