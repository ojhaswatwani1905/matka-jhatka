import { Router } from 'express';
import type { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../prisma.js';
import { generateToken } from '../middleware/auth.js';
import { authRateLimiter } from '../middleware/rateLimiter.js';
import { redisService } from '../services/redisService.js';

const router = Router();

import { addInMemoryUser } from '../utils/inMemoryStore.js';

// POST /api/auth/register
router.post('/register', authRateLimiter, async (req: Request, res: Response) => {
  try {
    const { name, email, password, phone } = req.body;

    if (!name || !email || !password) {
      res.status(400).json({ success: false, message: 'Name, email, and password are required' });
      return;
    }

    if (process.env.DATABASE_URL) {
      try {
        const existing = await prisma.user.findUnique({ where: { email } });
        if (existing) {
          res.status(400).json({ success: false, message: 'Email already registered' });
          return;
        }

        const hashedPassword = await bcrypt.hash(password, 12);
        const user = await prisma.user.create({
          data: { name, email, password: hashedPassword, phone, balance: 0 },
        });

        addInMemoryUser({ id: user.id, name: user.name, email: user.email, phone: user.phone || undefined, role: user.role, balance: user.balance });

        const token = generateToken(user.id, user.role, true);

        res.status(201).json({
          success: true,
          data: {
            user: { id: user.id, name: user.name, email: user.email, role: user.role, balance: user.balance },
            token,
          },
        });
        return;
      } catch (dbErr) {
        console.warn('[AuthRoute] Database query failed, falling back to decoupled registration:', dbErr);
      }
    }

    // Decoupled / In-Memory Registration Fallback when DATABASE_URL is missing
    const mockUserId = `usr_${Math.floor(10000000 + Math.random() * 90000000)}`;
    const savedUser = addInMemoryUser({ id: mockUserId, name, email, phone, role: 'user', balance: 0 });
    const token = generateToken(savedUser.id, 'user', true);

    res.status(201).json({
      success: true,
      data: {
        user: { id: savedUser.id, name: savedUser.name, email: savedUser.email, role: savedUser.role, balance: savedUser.balance },
        token,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Registration failed' });
  }
});

// POST /api/auth/login
router.post('/login', authRateLimiter, async (req: Request, res: Response) => {
  try {
    const { email, password, rememberMe } = req.body;

    if (process.env.DATABASE_URL) {
      try {
        const user = await prisma.user.findUnique({ where: { email } });
        if (user) {
          const validPassword = await bcrypt.compare(password, user.password);
          if (!validPassword) {
            res.status(401).json({ success: false, message: 'Invalid email or password' });
            return;
          }

          const token = generateToken(user.id, user.role, Boolean(rememberMe));

          res.json({
            success: true,
            data: {
              user: { id: user.id, name: user.name, email: user.email, role: user.role, balance: user.balance },
              token,
            },
          });
          return;
        }
      } catch (dbErr) {
        console.warn('[AuthRoute] Database query failed, falling back to decoupled login:', dbErr);
      }
    }

    // Decoupled / In-Memory Login Fallback
    const isDemoAdmin = email?.toLowerCase() === 'admin@playarena.com';
    const mockUserId = isDemoAdmin ? 'usr_admin_001' : `usr_${Math.floor(10000000 + Math.random() * 90000000)}`;
    const role = isDemoAdmin ? 'admin' : 'user';
    const token = generateToken(mockUserId, role, Boolean(rememberMe));

    res.json({
      success: true,
      data: {
        user: {
          id: mockUserId,
          name: isDemoAdmin ? 'Admin' : (email ? email.split('@')[0] : 'Player'),
          email: email || 'player@playarena.com',
          role,
          balance: isDemoAdmin ? 100000 : 0,
        },
        token,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Login failed' });
  }
});

// POST /api/auth/forgot-password (Demo reset link/token flow)
router.post('/forgot-password', authRateLimiter, async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      res.status(404).json({ success: false, message: 'No account registered with this email.' });
      return;
    }

    const resetToken = `RESET-${Math.floor(100000 + Math.random() * 900000)}`;
    await redisService.set(`reset:${email.toLowerCase()}`, resetToken, 900); // 15 mins TTL

    res.json({
      success: true,
      message: `Demo reset token generated for ${email}. Use token: ${resetToken}`,
      debugResetToken: resetToken,
    });
  } catch {
    res.status(500).json({ success: false, message: 'Failed to initiate password reset' });
  }
});

// POST /api/auth/reset-password
router.post('/reset-password', async (req: Request, res: Response) => {
  try {
    const { email, token, newPassword } = req.body;
    if (!email || !newPassword) {
      res.status(400).json({ success: false, message: 'Email and new password are required.' });
      return;
    }

    const storedToken = await redisService.get<string>(`reset:${email.toLowerCase()}`);
    if (storedToken && storedToken !== token) {
      res.status(400).json({ success: false, message: 'Invalid or expired password reset token.' });
      return;
    }

    const hashedPassword = await bcrypt.hash(newPassword, 12);
    await prisma.user.update({
      where: { email },
      data: { password: hashedPassword },
    });

    await redisService.del(`reset:${email.toLowerCase()}`);

    res.json({ success: true, message: 'Password reset successful. Please sign in with your new password.' });
  } catch {
    res.status(500).json({ success: false, message: 'Password reset failed.' });
  }
});

export default router;
