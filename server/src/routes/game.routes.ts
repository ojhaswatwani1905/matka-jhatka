import { Router } from 'express';
import type { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate, type AuthRequest } from '../middleware/auth.js';
import { gameManager } from '../services/gameManager.service.js';
import { ProvablyFairService } from '../services/provablyFair.service.js';

const router = Router();
const prisma = new PrismaClient();

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
router.post('/bet', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { gameType, period, selection, amount } = req.body;
    
    const user = await prisma.user.findUnique({ where: { id: req.userId }, select: { balance: true } });
    if (!user || user.balance < amount) { res.status(400).json({ success: false, message: 'Insufficient balance' }); return; }

    const activeRound = gameManager.getActiveRound(gameType);
    if (activeRound && activeRound.status === 'locked') {
      res.status(400).json({ success: false, message: 'Round is locked for resolution. Wait for next round.' });
      return;
    }

    const targetPeriod = period || activeRound?.period || '10001';

    const [bet] = await prisma.$transaction([
      prisma.bet.create({ data: { userId: req.userId!, gameType, period: targetPeriod, selection: String(selection), amount: Number(amount) } }),
      prisma.user.update({ where: { id: req.userId }, data: { balance: { decrement: Number(amount) } } }),
      prisma.transaction.create({ data: { userId: req.userId!, type: 'bet', amount: Number(amount), status: 'completed', description: `${gameType} bet on ${selection}` } }),
    ]);

    res.json({ success: true, data: bet });
  } catch { res.status(500).json({ success: false, message: 'Bet failed' }); }
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

