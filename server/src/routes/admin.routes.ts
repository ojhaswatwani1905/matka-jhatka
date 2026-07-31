import { Router } from 'express';
import type { Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate, requireAdmin, type AuthRequest } from '../middleware/auth.js';

const router = Router();
const prisma = new PrismaClient();

// GET /api/admin/dashboard
router.get('/dashboard', authenticate, requireAdmin, async (_req: AuthRequest, res: Response) => {
  try {
    const [totalUsers, totalBets, totalTransactions] = await Promise.all([
      prisma.user.count(),
      prisma.bet.count(),
      prisma.transaction.count(),
    ]);

    const totalDeposits = await prisma.transaction.aggregate({
      where: { type: 'deposit' },
      _sum: { amount: true },
    });

    const totalWithdrawals = await prisma.transaction.aggregate({
      where: { type: 'withdrawal' },
      _sum: { amount: true },
    });

    res.json({
      success: true,
      data: {
        totalUsers,
        totalBets,
        totalTransactions,
        totalDeposits: totalDeposits._sum.amount || 0,
        totalWithdrawals: totalWithdrawals._sum.amount || 0,
        revenue: (totalDeposits._sum.amount || 0) - (totalWithdrawals._sum.amount || 0),
      },
    });
  } catch { res.status(500).json({ success: false, message: 'Failed to fetch dashboard' }); }
});

// GET /api/admin/users
router.get('/users', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const users = await prisma.user.findMany({
      select: { id: true, name: true, email: true, phone: true, role: true, balance: true, isActive: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    });
    const total = await prisma.user.count();
    res.json({ success: true, data: { users, total, page, pages: Math.ceil(total / limit) } });
  } catch { res.status(500).json({ success: false, message: 'Failed to fetch users' }); }
});

// GET /api/admin/transactions
router.get('/transactions', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const transactions = await prisma.transaction.findMany({
      include: { user: { select: { name: true, email: true } } },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    });
    const total = await prisma.transaction.count();
    res.json({ success: true, data: { transactions, total, page, pages: Math.ceil(total / limit) } });
  } catch { res.status(500).json({ success: false, message: 'Failed to fetch transactions' }); }
});

// PUT /api/admin/users/:id
router.put('/users/:id', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { isActive, role } = req.body;
    const userId = req.params.id as string;
    const user = await prisma.user.update({
      where: { id: userId },
      data: { ...(isActive !== undefined && { isActive }), ...(role && { role }) },
      select: { id: true, name: true, email: true, role: true, isActive: true },
    });
    res.json({ success: true, data: user });
  } catch { res.status(500).json({ success: false, message: 'Failed to update user' }); }
});

export default router;
