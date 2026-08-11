import { prisma } from '../../../prisma.js';

export class WalletUtils {
  /**
   * Process a bet placement by deducting balance and recording bet + transaction
   */
  public static async processBet(userId: string, gameType: string, period: string, selection: string, amount: number) {
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { balance: true } });
    if (!user || user.balance < amount) {
      throw new Error('Insufficient balance');
    }

    const [betRecord] = await prisma.$transaction([
      prisma.bet.create({
        data: {
          userId,
          gameType,
          period,
          selection,
          amount,
        },
      }),
      prisma.user.update({
        where: { id: userId },
        data: { balance: { decrement: amount } },
      }),
      prisma.transaction.create({
        data: {
          userId,
          type: 'bet',
          amount,
          status: 'completed',
          description: `Placed ${gameType} bet on ${selection}`,
        },
      }),
    ]);

    return betRecord;
  }

  /**
   * Credit winning payout to user
   */
  public static async processWin(userId: string, gameType: string, period: string, payoutAmount: number) {
    if (payoutAmount <= 0) return;

    await prisma.$transaction([
      prisma.user.update({
        where: { id: userId },
        data: { balance: { increment: payoutAmount } },
      }),
      prisma.transaction.create({
        data: {
          userId,
          type: 'win',
          amount: payoutAmount,
          status: 'completed',
          description: `Won ${gameType} round ${period}`,
        },
      }),
    ]);
  }
}
