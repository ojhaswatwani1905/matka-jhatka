import { Router } from 'express';
import type { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../prisma.js';
import { generateToken } from '../middleware/auth.js';
import { authRateLimiter } from '../middleware/rateLimiter.js';
import { redisService } from '../services/redisService.js';

const router = Router();

// POST /api/auth/register
router.post('/register', authRateLimiter, async (req: Request, res: Response) => {
  try {
    const { name, email, password, phone } = req.body;

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      res.status(400).json({ success: false, message: 'Email already registered' });
      return;
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const user = await prisma.user.create({
      data: { name, email, password: hashedPassword, phone, balance: 10000 },
    });

    const token = generateToken(user.id, user.role, true);

    res.status(201).json({
      success: true,
      data: {
        user: { id: user.id, name: user.name, email: user.email, role: user.role, balance: user.balance },
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

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      res.status(401).json({ success: false, message: 'Invalid email or password' });
      return;
    }

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
