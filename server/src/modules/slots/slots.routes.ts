import { Router } from 'express';
import type { Request, Response } from 'express';
import { slotEngineService } from './slots.service.js';
import { authenticate, type AuthRequest } from '../../middleware/auth.js';
import { prisma } from '../../prisma.js';

const router = Router();

// GET /api/slots/configs
router.get('/configs', (_req: Request, res: Response) => {
  try {
    const configs = slotEngineService.getAllGameConfigs();
    res.json({ success: true, data: configs });
  } catch {
    res.status(500).json({ success: false, message: 'Failed to fetch slot configs' });
  }
});

// POST /api/slots/spin
router.post('/spin', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { gameId, betAmount, clientSeed } = req.body;
    const amount = Number(betAmount);

    if (!gameId || isNaN(amount) || amount <= 0) {
      res.status(400).json({ success: false, message: 'Valid gameId and betAmount are required.' });
      return;
    }

    const user = await prisma.user.findUnique({ where: { id: req.userId }, select: { balance: true } });
    if (!user || user.balance < amount) {
      res.status(400).json({ success: false, message: 'Insufficient balance for slot spin.' });
      return;
    }

    const spinResult = slotEngineService.resolveSpin(gameId, amount, clientSeed);

    // Deduct bet and credit payout in database
    const netPayout = spinResult.payoutAmount;
    const balanceChange = netPayout - amount;

    const [updatedUser, betRecord] = await prisma.$transaction([
      prisma.user.update({
        where: { id: req.userId },
        data: { balance: { increment: balanceChange } },
      }),
      prisma.bet.create({
        data: {
          userId: req.userId!,
          gameType: `slot:${gameId}`,
          period: `spin-${Date.now()}`,
          selection: spinResult.reelsResult.join('|'),
          amount,
          payout: netPayout,
          result: spinResult.isWin ? 'win' : 'loss',
        },
      }),
      prisma.transaction.create({
        data: {
          userId: req.userId!,
          type: spinResult.isWin ? 'win' : 'bet',
          amount: spinResult.isWin ? netPayout : amount,
          status: 'completed',
          description: `Slot ${gameId} spin ${spinResult.matchDetail}`,
        },
      }),
    ]);

    res.json({
      success: true,
      data: {
        spin: spinResult,
        newBalance: updatedUser.balance,
        betId: betRecord.id,
      },
    });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message || 'Slot spin execution failed.' });
  }
});

export default router;
