import { Router } from 'express';
import type { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../prisma.js';
import { generateToken } from '../middleware/auth.js';
import { authRateLimiter } from '../middleware/rateLimiter.js';

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
      data: { name, email, password: hashedPassword, phone, balance: 0 },
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
router.post('/login', authRateLimiter, async (req: Request, res: Response) => {

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

import { otpService } from '../services/otp.service.js';
import { emailService } from '../services/email.service.js';

// POST /api/auth/send-otp (Generates dynamic unique 6-digit OTP and dispatches email)
router.post('/send-otp', authRateLimiter, async (req: Request, res: Response) => {
  try {
    const { email, name } = req.body;
    if (!email) {
      res.status(400).json({ success: false, message: 'Email address is required.' });
      return;
    }

    const code = otpService.generateOtp(email);
    await emailService.sendOtpEmail(email, code, name);

    res.json({
      success: true,
      message: `Verification code sent to ${email}`,
      debugCode: code, // Dynamic OTP code generated for this user
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Failed to send OTP code.' });
  }
});

// POST /api/auth/verify-otp (Validates dynamic 6-digit OTP entered by user)
router.post('/verify-otp', async (req: Request, res: Response) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) {
      res.status(400).json({ success: false, message: 'Email and OTP code are required.' });
      return;
    }

    const result = otpService.verifyOtp(email, otp);
    if (!result.valid) {
      res.status(400).json({ success: false, message: result.message });
      return;
    }

    res.json({ success: true, message: 'OTP verified successfully.' });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'OTP verification failed.' });
  }
});

// POST /api/auth/forgot-password (Generates dynamic OTP for password reset)
router.post('/forgot-password', authRateLimiter, async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      res.status(404).json({ success: false, message: 'No account registered with this email.' });
      return;
    }

    const code = otpService.generateOtp(email);
    await emailService.sendOtpEmail(email, code, user.name);

    res.json({ success: true, message: `Password reset OTP sent to ${email}`, debugCode: code });
  } catch {
    res.status(500).json({ success: false, message: 'Failed to send reset email' });
  }
});

// POST /api/auth/reset-password
router.post('/reset-password', async (req: Request, res: Response) => {
  try {
    const { email, otp, newPassword } = req.body;
    const verifyResult = otpService.verifyOtp(email, otp);
    if (!verifyResult.valid) {
      res.status(400).json({ success: false, message: verifyResult.message });
      return;
    }

    const hashedPassword = await bcrypt.hash(newPassword, 12);
    await prisma.user.update({
      where: { email },
      data: { password: hashedPassword },
    });

    res.json({ success: true, message: 'Password reset successful. Please sign in.' });
  } catch {
    res.status(500).json({ success: false, message: 'Password reset failed.' });
  }
});


export default router;
