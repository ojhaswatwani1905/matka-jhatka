import { Router } from 'express';
import type { Response } from 'express';
import { prisma } from '../prisma.js';
import { authenticate, type AuthRequest } from '../middleware/auth.js';

const router = Router();


// GET /api/users/profile
router.get('/profile', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: { id: true, name: true, email: true, phone: true, avatar: true, role: true, balance: true, createdAt: true },
    });
    if (!user) { res.status(404).json({ success: false, message: 'User not found' }); return; }
    res.json({ success: true, data: user });
  } catch { res.status(500).json({ success: false, message: 'Failed to fetch profile' }); }
});

// PUT /api/users/profile
router.put('/profile', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { name, phone } = req.body;
    const user = await prisma.user.update({
      where: { id: req.userId },
      data: { name, phone },
      select: { id: true, name: true, email: true, phone: true, role: true, balance: true },
    });
    res.json({ success: true, data: user });
  } catch { res.status(500).json({ success: false, message: 'Failed to update profile' }); }
});

// PUT /api/users/bank-details
router.put('/bank-details', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { bankName, accountNumber, ifscCode, accountHolder } = req.body;
    const bankDetail = await prisma.bankDetail.upsert({
      where: { id: req.userId || '' },
      create: { userId: req.userId!, bankName, accountNumber, ifscCode, accountHolder },
      update: { bankName, accountNumber, ifscCode, accountHolder },
    });
    res.json({ success: true, data: bankDetail });
  } catch { res.status(500).json({ success: false, message: 'Failed to update bank details' }); }
});

export default router;
