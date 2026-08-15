import { prisma } from '../prisma.js';
import { ProvablyFairService, type ProvablyFairResult, type MatkaOutcomeResult } from './provablyFair.service.js';

export interface ActiveRound {

  gameType: string; // 'wingo-1m' | 'wingo-3m' | 'wingo-5m' | 'matka-kalyan' | 'matka-mumbai' etc.
  period: string;   // e.g. '202607310001'
  serverSeed: string;
  commitHash: string;
  startTime: number;
  endTime: number;
  clientSeed: string;
  nonce: number;
  status: 'active' | 'locked' | 'resolved';
  manualOverride?: {
    digit: number;
    resultString: string;
    color: string;
    size: string;
    isManual: boolean;
  };
}

export interface DigitBetStat {
  digit: number;
  totalBetsOnDigit: number;
  totalPayoutIfWins: number;
  projectedHouseProfit: number;
  isLowestPayout: boolean;
}

export class GameManagerService {
  private activeRounds: Map<string, ActiveRound> = new Map();
  private ioServer: any = null;

  constructor() {
    this.initializeRounds();
  }

  public setSocketServer(io: any) {
    this.ioServer = io;
  }

  private initializeRounds() {
    const gameTypes = ['wingo-1m', 'wingo-3m', 'wingo-5m', 'matka-kalyan', 'matka-mumbai', 'matka-rajdhani'];
    const now = Date.now();

    gameTypes.forEach((gt) => {
      let durationMs = 60000; // 1 min
      if (gt.includes('3m')) durationMs = 180000;
      if (gt.includes('5m')) durationMs = 300000;
      if (gt.startsWith('matka')) durationMs = 120000; // 2 min demo cycle for matka markets

      const serverSeed = ProvablyFairService.generateServerSeed();
      const commitHash = ProvablyFairService.getCommitHash(serverSeed);
      const period = `${new Date().toISOString().slice(0, 10).replace(/-/g, '')}${Math.floor(Math.random() * 9000 + 1000)}`;

      this.activeRounds.set(gt, {
        gameType: gt,
        period,
        serverSeed,
        commitHash,
        startTime: now,
        endTime: now + durationMs,
        clientSeed: 'client-seed-2026',
        nonce: 1,
        status: 'active',
      });
    });

    // Start timer loop tick every 1000ms
    setInterval(() => this.tick(), 1000);
  }

  public getActiveRound(gameType: string): ActiveRound | undefined {
    return this.activeRounds.get(gameType);
  }

  public getAllActiveRounds(): ActiveRound[] {
    return Array.from(this.activeRounds.values());
  }

  public setManualOverride(gameType: string, period: string, digit: number) {
    const round = this.activeRounds.get(gameType);
    if (!round) throw new Error(`Game round not found for ${gameType}`);

    const color = digit === 0 ? 'violet-red' : digit === 5 ? 'violet-green' : digit % 2 === 0 ? 'red' : 'green';
    const size = digit >= 5 ? 'big' : 'small';

    round.manualOverride = {
      digit,
      resultString: digit.toString(),
      color,
      size,
      isManual: true,
    };

    if (this.ioServer) {
      this.ioServer.to(`game:${gameType}`).emit('admin-override-set', { gameType, period: round.period, digit });
    }

    return round.manualOverride;
  }

  public clearManualOverride(gameType: string) {
    const round = this.activeRounds.get(gameType);
    if (round) {
      delete round.manualOverride;
    }
  }

  public async autoSelectLowestPayoutDigit(gameType: string, period: string) {
    const summary = await this.getRoundBetsSummary(gameType, period);
    const lowestDigit = summary.lowestPayoutDigit;
    return this.setManualOverride(gameType, period, lowestDigit);
  }

  public async getRoundBetsSummary(gameType: string, period: string) {
    const round = this.activeRounds.get(gameType);
    const activePeriod = period || round?.period || '';

    let bets: any[] = [];
    try {
      bets = await prisma.bet.findMany({
        where: {
          gameType,
          period: activePeriod,
        },
      });
    } catch {
      // Graceful fallback if database offline
      bets = [];
    }

    const totalVolume = bets.reduce((sum, b) => sum + (b.amount || 0), 0);

    const digitStats: DigitBetStat[] = [];
    let lowestPayout = Infinity;
    let lowestPayoutDigit = 0;

    for (let d = 0; d <= 9; d++) {
      const resultString = d.toString();
      const colorStr = d === 0 ? 'violet-red' : d === 5 ? 'violet-green' : d % 2 === 0 ? 'red' : 'green';
      const sizeStr = d >= 5 ? 'big' : 'small';

      let totalPayout = 0;
      let totalBetsOnDigit = 0;

      for (const b of bets) {
        let isWin = false;
        let payout = 0;

        if (b.selection === resultString) {
          totalBetsOnDigit += b.amount;
        }

        if (gameType.startsWith('wingo') || gameType.startsWith('color')) {
          if (b.selection === 'green' && (colorStr === 'green' || colorStr === 'violet-green')) {
            isWin = true;
            payout = colorStr === 'violet-green' ? b.amount * 1.5 : b.amount * 2;
          } else if (b.selection === 'red' && (colorStr === 'red' || colorStr === 'violet-red')) {
            isWin = true;
            payout = colorStr === 'violet-red' ? b.amount * 1.5 : b.amount * 2;
          } else if (b.selection === 'violet' && colorStr.includes('violet')) {
            isWin = true;
            payout = b.amount * 4.5;
          } else if (b.selection === 'big' && sizeStr === 'big') {
            isWin = true;
            payout = b.amount * 2;
          } else if (b.selection === 'small' && sizeStr === 'small') {
            isWin = true;
            payout = b.amount * 2;
          } else if (b.selection === resultString) {
            isWin = true;
            payout = b.amount * 9;
          }
        } else {
          if (b.selection === resultString) {
            isWin = true;
            payout = b.amount * 9;
          }
        }

        if (isWin) {
          totalPayout += payout;
        }
      }

      const houseProfit = totalVolume - totalPayout;

      if (totalPayout < lowestPayout) {
        lowestPayout = totalPayout;
        lowestPayoutDigit = d;
      }

      digitStats.push({
        digit: d,
        totalBetsOnDigit,
        totalPayoutIfWins: totalPayout,
        projectedHouseProfit: houseProfit,
        isLowestPayout: false,
      });
    }

    // Mark lowest payout digit
    digitStats.forEach((st) => {
      if (st.digit === lowestPayoutDigit) {
        st.isLowestPayout = true;
      }
    });

    return {
      gameType,
      period: activePeriod,
      totalVolume,
      totalBetsCount: bets.length,
      lowestPayoutDigit,
      manualOverride: round?.manualOverride,
      digitStats,
    };
  }

  private async tick() {
    const now = Date.now();

    for (const [gt, round] of this.activeRounds.entries()) {
      const remainingSec = Math.max(0, Math.floor((round.endTime - now) / 1000));

      // Lock round in final 5 seconds
      if (remainingSec <= 5 && round.status === 'active') {
        round.status = 'locked';
        if (this.ioServer) {
          this.ioServer.to(`game:${gt}`).emit('round-locked', { gameType: gt, period: round.period });
        }
      }

      // Broadcast tick
      if (this.ioServer) {
        this.ioServer.to(`game:${gt}`).emit('timer-tick', {
          gameType: gt,
          period: round.period,
          remainingSec,
          commitHash: round.commitHash,
          status: round.status,
        });
      }

      // Resolve round when time expires
      if (now >= round.endTime && round.status !== 'resolved') {
        round.status = 'resolved';
        await this.resolveRound(round);

        // Start new round
        let durationMs = 60000;
        if (gt.includes('3m')) durationMs = 180000;
        if (gt.includes('5m')) durationMs = 300000;
        if (gt.startsWith('matka')) durationMs = 120000;

        const newServerSeed = ProvablyFairService.generateServerSeed();
        const newCommitHash = ProvablyFairService.getCommitHash(newServerSeed);
        const newPeriod = `${new Date().toISOString().slice(0, 10).replace(/-/g, '')}${Math.floor(Math.random() * 9000 + 1000)}`;

        this.activeRounds.set(gt, {
          gameType: gt,
          period: newPeriod,
          serverSeed: newServerSeed,
          commitHash: newCommitHash,
          startTime: now,
          endTime: now + durationMs,
          clientSeed: 'client-seed-2026',
          nonce: round.nonce + 1,
          status: 'active',
        });

        if (this.ioServer) {
          this.ioServer.to(`game:${gt}`).emit('new-round', this.activeRounds.get(gt));
        }
      }
    }
  }

  private async resolveRound(round: ActiveRound) {
    try {
      let resultString = '';
      let colorStr = '';
      let numberVal = 0;
      let sizeStr = '';

      if (round.manualOverride) {
        // Use Admin manual override decision
        resultString = round.manualOverride.resultString;
        colorStr = round.manualOverride.color;
        numberVal = round.manualOverride.digit;
        sizeStr = round.manualOverride.size;
        console.log(`[GameManager] Resolving ${round.gameType} round ${round.period} using ADMIN MANUAL OVERRIDE digit: ${numberVal}`);
      } else {
        // House Profit Optimization: Check live bet stats to maximize admin profit margin
        const stats = await this.getRoundBetsSummary(round.gameType, round.period);
        if (stats && stats.totalBetsCount > 0) {
          numberVal = stats.lowestPayoutDigit;
          resultString = numberVal.toString();
          colorStr = (numberVal === 0 || numberVal === 5) ? 'violet' : (numberVal % 2 === 0 ? 'red' : 'green');
          sizeStr = numberVal >= 5 ? 'big' : 'small';
          console.log(`[GameManager] Resolving ${round.gameType} round ${round.period} using HOUSE PROFIT OPTIMIZATION digit: ${numberVal} (Lowest Payout)`);
        } else if (round.gameType.startsWith('wingo') || round.gameType.startsWith('color')) {
          const pfOutcome: ProvablyFairResult = ProvablyFairService.calculateWinGoOutcome(
            round.serverSeed,
            round.clientSeed,
            round.nonce
          );
          resultString = pfOutcome.digit.toString();
          colorStr = pfOutcome.color;
          numberVal = pfOutcome.digit;
          sizeStr = pfOutcome.size;
        } else {
          const matkaOutcome: MatkaOutcomeResult = ProvablyFairService.calculateMatkaOutcome(
            round.serverSeed,
            round.clientSeed,
            round.nonce
          );
          resultString = matkaOutcome.singleDigit.toString();
          numberVal = matkaOutcome.singleDigit;
          colorStr = 'matka';
          sizeStr = matkaOutcome.jodiDigit;
        }
      }

      // Persist GameResult in database (graceful fallback if DB offline)
      try {
        if (process.env.DATABASE_URL) {
          await prisma.gameResult.create({
          data: {
            gameType: round.gameType,
            period: round.period,
            result: resultString,
            color: colorStr,
            number: numberVal,
            size: sizeStr,
          },
        });

        // Fetch pending bets for this round and resolve payouts
        const pendingBets = await prisma.bet.findMany({
          where: {
            gameType: round.gameType,
            period: round.period,
            result: 'pending',
          },
        });

        await Promise.all(
          pendingBets.map(async (bet) => {
            let isWin = false;
            let payout = 0;

            if (round.gameType.startsWith('wingo') || round.gameType.startsWith('color')) {
              if (bet.selection === 'green' && (colorStr === 'green' || colorStr === 'violet-green')) {
                isWin = true;
                payout = colorStr === 'violet-green' ? bet.amount * 1.5 : bet.amount * 2;
              } else if (bet.selection === 'red' && (colorStr === 'red' || colorStr === 'violet-red')) {
                isWin = true;
                payout = colorStr === 'violet-red' ? bet.amount * 1.5 : bet.amount * 2;
              } else if (bet.selection === 'violet' && (colorStr.includes('violet'))) {
                isWin = true;
                payout = bet.amount * 4.5;
              } else if (bet.selection === 'big' && sizeStr === 'big') {
                isWin = true;
                payout = bet.amount * 2;
              } else if (bet.selection === 'small' && sizeStr === 'small') {
                isWin = true;
                payout = bet.amount * 2;
              } else if (bet.selection === resultString) {
                isWin = true;
                payout = bet.amount * 9;
              }
            } else {
              if (bet.selection === resultString) {
                isWin = true;
                payout = bet.amount * 9;
              }
            }

            await prisma.bet.update({
              where: { id: bet.id },
              data: {
                result: isWin ? 'win' : 'loss',
                payout: isWin ? payout : 0,
              },
            });

            if (isWin && payout > 0) {
              await prisma.user.update({
                where: { id: bet.userId },
                data: { balance: { increment: payout } },
              });

              await prisma.transaction.create({
                data: {
                  userId: bet.userId,
                  type: 'win',
                  amount: payout,
                  status: 'completed',
                  description: `Won ${round.gameType} round ${round.period}`,
                },
              });
            }
          })
        );
        }
      } catch (dbErr) {
        // Log DB notice, keep round manager ticking cleanly
        console.log(`[GameManager] DB sync skipped: ${round.gameType} ${round.period}`);
      }

      // Broadcast resolved outcome
      if (this.ioServer) {
        this.ioServer.to(`game:${round.gameType}`).emit('round-resolved', {
          gameType: round.gameType,
          period: round.period,
          result: resultString,
          color: colorStr,
          number: numberVal,
          size: sizeStr,
          revealedServerSeed: round.serverSeed,
          commitHash: round.commitHash,
          isManual: Boolean(round.manualOverride),
        });
      }
    } catch (err) {
      console.error('Failed to resolve round:', err);
    }
  }
}

export const gameManager = new GameManagerService();

