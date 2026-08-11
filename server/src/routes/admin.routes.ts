import { Router } from 'express';
import type { Response } from 'express';
import { prisma } from '../prisma.js';
import { authenticate, requireAdmin, type AuthRequest } from '../middleware/auth.js';
import { gameManager } from '../services/gameManager.service.js';

import { redisService } from '../services/redisService.js';

const router = Router();

// Promo slides storage (in-memory store with Redis fallback cache)
let promoSlidesStore = [
  {
    id: '1',
    eyebrow: '🏆 NEW PLAYER EXCLUSIVE',
    headline: '100% WELCOME\nBONUS',
    ribbonText: 'UP TO ₹5,777 EXTRA CASH',
    ctaText: 'Claim Bonus Now',
    ctaLink: '/auth/register',
    bgGradient: 'linear-gradient(135deg, #061A10 0%, #0B2318 40%, #1A4A2C 100%)',
    bgImage: '',
    isActive: true,
    order: 0,
  },
  {
    id: '2',
    eyebrow: '⚡ DAILY CASHBACK',
    headline: 'UP TO 4%\nCASHBACK',
    ribbonText: 'NEXT DAY AUTO-PAYOUT',
    ctaText: 'Deposit Now',
    ctaLink: '/wallet',
    bgGradient: 'linear-gradient(135deg, #061A10 0%, #0A2A15 40%, #153D24 100%)',
    bgImage: '',
    isActive: true,
    order: 1,
  },
  {
    id: '3',
    eyebrow: '🎲 MATKA JHATKA ARENA',
    headline: '900X\nODDS',
    ribbonText: 'KALYAN & MUMBAI MARKETS',
    ctaText: 'Play Matka Jhatka',
    ctaLink: '/games/matka',
    bgGradient: 'linear-gradient(135deg, #0A1A08 0%, #122808 40%, #1C3B10 100%)',
    bgImage: '',
    isActive: true,
    order: 2,
  },
];

// POST /api/admin/users/:id/force-logout
router.post('/users/:id/force-logout', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.params.id as string;
    const { reason } = req.body;

    // Revoke user session in Redis
    await redisService.revokeUserSessions(userId);

    // Audit trail logging
    try {
      await prisma.transaction.create({
        data: {
          userId,
          type: 'admin_action',
          amount: 0,
          status: 'completed',
          description: `Force Logout by Admin (${req.userId || 'Admin'}): ${reason || 'Immediate session termination'}`,
        },
      });
    } catch {
      // Continue if non-critical audit log table is missing
    }

    res.json({
      success: true,
      message: `User ${userId} force-logged out immediately. Session invalidated in Redis.`,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err?.message || 'Failed to force-logout user' });
  }
});

// GET /api/admin/promo-slides (Returns all slides for admin)
router.get('/promo-slides', authenticate, requireAdmin, async (_req: AuthRequest, res: Response) => {
  try {
    const cached = await redisService.get<any[]>('promo_slides_all');
    const data = cached || promoSlidesStore;
    res.json({ success: true, data });
  } catch {
    res.json({ success: true, data: promoSlidesStore });
  }
});

// POST /api/admin/promo-slides (Create slide)
router.post('/promo-slides', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const newSlide = {
      id: `slide_${Date.now()}`,
      eyebrow: req.body.eyebrow || '🎁 SPECIAL OFFER',
      headline: req.body.headline || 'NEW PROMOTION',
      ribbonText: req.body.ribbonText || 'LIMITED TIME OFFER',
      ctaText: req.body.ctaText || 'Claim Now',
      ctaLink: req.body.ctaLink || '/wallet',
      bgGradient: req.body.bgGradient || 'linear-gradient(135deg, #061A10 0%, #0B2318 40%, #1A4A2C 100%)',
      bgImage: req.body.bgImage || '',
      isActive: req.body.isActive ?? true,
      order: promoSlidesStore.length,
    };
    promoSlidesStore.push(newSlide);
    await redisService.set('promo_slides_all', promoSlidesStore);
    res.json({ success: true, data: newSlide, message: 'Promo slide created successfully' });
  } catch {
    res.status(500).json({ success: false, message: 'Failed to create promo slide' });
  }
});

// PUT /api/admin/promo-slides/:id (Update slide)
router.put('/promo-slides/:id', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const index = promoSlidesStore.findIndex(s => s.id === id);
    if (index === -1) {
      res.status(404).json({ success: false, message: 'Slide not found' });
      return;
    }
    promoSlidesStore[index] = { ...promoSlidesStore[index], ...req.body };
    await redisService.set('promo_slides_all', promoSlidesStore);
    res.json({ success: true, data: promoSlidesStore[index], message: 'Slide updated successfully' });
  } catch {
    res.status(500).json({ success: false, message: 'Failed to update promo slide' });
  }
});

// PUT /api/admin/promo-slides-reorder (Reorder slides)
router.put('/promo-slides-reorder', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { slides } = req.body;
    if (Array.isArray(slides)) {
      promoSlidesStore = slides;
      await redisService.set('promo_slides_all', promoSlidesStore);
    }
    res.json({ success: true, data: promoSlidesStore, message: 'Slides reordered successfully' });
  } catch {
    res.status(500).json({ success: false, message: 'Failed to reorder slides' });
  }
});

// DELETE /api/admin/promo-slides/:id (Delete slide)
router.delete('/promo-slides/:id', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    promoSlidesStore = promoSlidesStore.filter(s => s.id !== id);
    await redisService.set('promo_slides_all', promoSlidesStore);
    res.json({ success: true, message: 'Slide deleted successfully' });
  } catch {
    res.status(500).json({ success: false, message: 'Failed to delete promo slide' });
  }
});


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

// POST /api/admin/users/:id/balance (Admin adds or deducts money for user)
router.post('/users/:id/balance', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.params.id as string;
    const { amount, type, description } = req.body; // type: 'add' | 'subtract'
    const numAmount = Number(amount);

    if (isNaN(numAmount) || numAmount <= 0) {
      res.status(400).json({ success: false, message: 'Invalid balance amount' });
      return;
    }

    const delta = type === 'subtract' ? -numAmount : numAmount;

    const [updatedUser] = await prisma.$transaction([
      prisma.user.update({
        where: { id: userId },
        data: { balance: { increment: delta } },
        select: { id: true, name: true, email: true, balance: true },
      }),
      prisma.transaction.create({
        data: {
          userId,
          type: type === 'subtract' ? 'admin_deduction' : 'deposit',
          amount: numAmount,
          status: 'completed',
          description: description || `Admin ${type === 'subtract' ? 'deducted' : 'credited'} ₹${numAmount}`,
        },
      }),
    ]);

    res.json({ success: true, data: updatedUser, message: `Updated ${updatedUser.name}'s balance to ₹${updatedUser.balance}` });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err?.message || 'Failed to adjust user balance' });
  }
});


// GET /api/admin/rounds (Live active rounds with bet stats)
router.get('/rounds', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const activeRounds = gameManager.getAllActiveRounds();
    const roundsWithStats = await Promise.all(
      activeRounds.map(async (r) => {
        const stats = await gameManager.getRoundBetsSummary(r.gameType, r.period);
        return {
          ...r,
          remainingSec: Math.max(0, Math.floor((r.endTime - Date.now()) / 1000)),
          stats,
        };
      })
    );
    res.json({ success: true, data: roundsWithStats });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch active round stats' });
  }
});

// POST /api/admin/set-round-result (Manually pick winning digit 0-9)
router.post('/set-round-result', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { gameType, period, digit } = req.body;
    if (digit === undefined || digit === null || Number(digit) < 0 || Number(digit) > 9) {
      res.status(400).json({ success: false, message: 'Invalid digit (must be between 0 and 9)' });
      return;
    }

    const override = gameManager.setManualOverride(gameType, period, Number(digit));
    res.json({ success: true, data: override, message: `Manual winning digit ${digit} set for ${gameType}` });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err?.message || 'Failed to set round result' });
  }
});

// POST /api/admin/auto-lowest-payout (Auto select digit with lowest house payout)
router.post('/auto-lowest-payout', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { gameType, period } = req.body;
    const override = await gameManager.autoSelectLowestPayoutDigit(gameType, period);
    res.json({ success: true, data: override, message: `Auto-selected lowest payout digit ${override.digit} for ${gameType}` });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err?.message || 'Failed to auto-set lowest payout' });
  }
});

// POST /api/admin/clear-round-result (Clear manual override)
router.post('/clear-round-result', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { gameType } = req.body;
    gameManager.clearManualOverride(gameType);
    res.json({ success: true, message: `Manual override cleared for ${gameType}` });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err?.message || 'Failed to clear override' });
  }
});

export default router;

