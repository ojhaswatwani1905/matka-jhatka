import { Router } from 'express';
import type { Request, Response } from 'express';
import { prisma } from '../prisma.js';
import { authenticate, type AuthRequest } from '../middleware/auth.js';
import { betRateLimiter } from '../middleware/rateLimiter.js';
import { gameManager } from '../services/gameManager.service.js';
import { ProvablyFairService } from '../services/provablyFair.service.js';

import { redisService } from '../services/redisService.js';

const router = Router();

// GET /api/promo-slides (Public active slides for homepage carousel)
router.get('/promo-slides', async (_req: Request, res: Response) => {
  try {
    const cached = await redisService.get<any[]>('promo_slides_all');
    const defaultSlides = [
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
    const slides = (cached || defaultSlides).filter(s => s.isActive !== false);
    res.json({ success: true, data: slides });
  } catch {
    res.status(500).json({ success: false, message: 'Failed to fetch promo slides' });
  }
});


// GET /api/games/active-round/:gameType
router.get('/active-round/:gameType', (req: Request, res: Response) => {
  const gameType = req.params.gameType as string;
  const activeRound = gameManager.getActiveRound(gameType);
  if (!activeRound) {
    res.status(404).json({ success: false, message: 'Game type active round not found' });
    return;
  }

  // Return public properties (mask unrevealed server seed until round finishes)
  res.json({
    success: true,
    data: {
      gameType: activeRound.gameType,
      period: activeRound.period,
      commitHash: activeRound.commitHash,
      startTime: activeRound.startTime,
      endTime: activeRound.endTime,
      remainingSec: Math.max(0, Math.floor((activeRound.endTime - Date.now()) / 1000)),
      clientSeed: activeRound.clientSeed,
      nonce: activeRound.nonce,
      status: activeRound.status,
    },
  });
});

// POST /api/games/verify
router.post('/verify', (req: Request, res: Response) => {
  const { serverSeed, expectedCommitHash, clientSeed, nonce } = req.body;
  if (!serverSeed) {
    res.status(400).json({ success: false, message: 'serverSeed is required' });
    return;
  }

  const isValidCommit = expectedCommitHash
    ? ProvablyFairService.verifyRound(serverSeed, expectedCommitHash)
    : true;

  const outcome = ProvablyFairService.calculateWinGoOutcome(serverSeed, clientSeed || 'default-client-seed', Number(nonce) || 1);

  res.json({
    success: true,
    data: {
      isValidCommit,
      outcome,
    },
  });
});

// POST /api/games/bet
router.post('/bet', authenticate, betRateLimiter, async (req: AuthRequest, res: Response) => {
  try {
    const { gameType, period, selection, amount, userName } = req.body;
    const activeRound = gameManager.getActiveRound(gameType);
    const targetPeriod = period || activeRound?.period || '10001';

    let playerName = userName || 'Player';
    let betId = `bet_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

    try {
      if (process.env.DATABASE_URL) {
        const user = await prisma.user.findUnique({ where: { id: req.userId }, select: { balance: true, name: true, phone: true } });
        if (user) {
          playerName = user.name || user.phone || playerName;
          const [bet] = await prisma.$transaction([
            prisma.bet.create({ data: { userId: req.userId!, gameType, period: targetPeriod, selection: String(selection), amount: Number(amount) } }),
            prisma.user.update({ where: { id: req.userId }, data: { balance: { decrement: Number(amount) } } }),
            prisma.transaction.create({ data: { userId: req.userId!, type: 'bet', amount: Number(amount), status: 'completed', description: `${gameType} bet on ${selection}` } }),
          ]);
          betId = bet.id;
        }
      }
    } catch {
      // Offline fallback
    }

    // Always record live real bet in gameManager for real-time admin cockpit
    gameManager.recordLiveBet({
      id: betId,
      userId: req.userId || 'usr_player',
      userName: playerName,
      gameType,
      period: targetPeriod,
      selection: String(selection),
      amount: Number(amount),
    });

    res.json({ success: true, data: { id: betId, gameType, period: targetPeriod, selection, amount } });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err?.message || 'Bet failed' });
  }
});


// GET /api/games/history
router.get('/history', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { gameType } = req.query;
    const bets = await prisma.bet.findMany({
      where: { userId: req.userId, ...(gameType ? { gameType: String(gameType) } : {}) },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    res.json({ success: true, data: bets });
  } catch { res.status(500).json({ success: false, message: 'Failed to fetch history' }); }
});

// GET /api/games/results/:gameType
router.get('/results/:gameType', async (req, res) => {
  try {
    const gameType = req.params.gameType as string;
    const results = await prisma.gameResult.findMany({
      where: { gameType },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    res.json({ success: true, data: results });
  } catch { res.status(500).json({ success: false, message: 'Failed to fetch results' }); }
});

export default router;

