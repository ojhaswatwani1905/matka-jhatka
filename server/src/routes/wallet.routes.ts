import { Router } from 'express';
import type { Response } from 'express';
import { prisma } from '../prisma.js';
import { authenticate, type AuthRequest } from '../middleware/auth.js';

const router = Router();


import { inMemoryUsersStore } from '../utils/inMemoryStore.js';

// GET /api/wallet/balance
router.get('/balance', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    if (process.env.DATABASE_URL) {
      try {
        const user = await prisma.user.findUnique({ where: { id: req.userId }, select: { balance: true } });
        if (user) {
          res.json({ success: true, data: { balance: user.balance } });
          return;
        }
      } catch {
        // Fallback to in-memory store if DB query fails
      }
    }
    const memUser = inMemoryUsersStore.find(u => u.id === req.userId || u.email.toLowerCase() === req.userId?.toLowerCase());
    if (memUser && typeof memUser.balance === 'number' && memUser.balance > 0) {
      res.json({ success: true, data: { balance: memUser.balance } });
      return;
    }
    res.json({ success: true, data: { balance: null } });
  } catch { res.status(500).json({ success: false, message: 'Failed to fetch balance' }); }
});

// GET /api/wallet/transactions
router.get('/transactions', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const transactions = await prisma.transaction.findMany({
      where: { userId: req.userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    res.json({ success: true, data: transactions });
  } catch { res.status(500).json({ success: false, message: 'Failed to fetch transactions' }); }
});

// POST /api/wallet/deposit (demo)
router.post('/deposit', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { amount } = req.body;
    if (!amount || amount < 100) { res.status(400).json({ success: false, message: 'Min deposit ₹100' }); return; }

    await prisma.$transaction([
      prisma.user.update({ where: { id: req.userId }, data: { balance: { increment: amount } } }),
      prisma.transaction.create({ data: { userId: req.userId!, type: 'deposit', amount, status: 'completed', description: `Demo deposit of ₹${amount}` } }),
    ]);

    const user = await prisma.user.findUnique({ where: { id: req.userId }, select: { balance: true } });
    res.json({ success: true, data: { balance: user?.balance } });
  } catch { res.status(500).json({ success: false, message: 'Deposit failed' }); }
});

// POST /api/wallet/withdraw (demo)
router.post('/withdraw', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { amount } = req.body;
    const user = await prisma.user.findUnique({ where: { id: req.userId }, select: { balance: true } });
    if (!user || user.balance < amount) { res.status(400).json({ success: false, message: 'Insufficient balance' }); return; }

    await prisma.$transaction([
      prisma.user.update({ where: { id: req.userId }, data: { balance: { decrement: amount } } }),
      prisma.transaction.create({ data: { userId: req.userId!, type: 'withdrawal', amount, status: 'completed', description: `Withdrawal of ₹${amount}` } }),
    ]);

    res.json({ success: true, data: { balance: user.balance - amount } });
  } catch { res.status(500).json({ success: false, message: 'Withdrawal failed' }); }
});

export default router;
