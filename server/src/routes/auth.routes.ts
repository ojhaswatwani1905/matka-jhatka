import { Router } from 'express';
import type { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';
import { generateToken } from '../middleware/auth.js';

const router = Router();
const prisma = new PrismaClient();

// POST /api/auth/register
router.post('/register', async (req: Request, res: Response) => {
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

    const token = generateToken(user.id, user.role);

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
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      res.status(401).json({ success: false, message: 'Invalid credentials' });
      return;
    }

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      res.status(401).json({ success: false, message: 'Invalid credentials' });
      return;
    }

    const token = generateToken(user.id, user.role);

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

// POST /api/auth/forgot-password (demo — returns success)
router.post('/forgot-password', async (req: Request, res: Response) => {
  res.json({ success: true, message: 'OTP sent to email (demo)' });
});

// POST /api/auth/verify-otp (demo — always succeeds)
router.post('/verify-otp', async (req: Request, res: Response) => {
  res.json({ success: true, message: 'OTP verified (demo)' });
});

// POST /api/auth/reset-password (demo)
router.post('/reset-password', async (req: Request, res: Response) => {
  res.json({ success: true, message: 'Password reset successful (demo)' });
});

export default router;
