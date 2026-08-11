import { ProvablyFairUtils } from './core/pf.utils.js';
import { WalletUtils } from './core/wallet.utils.js';
import { RoundStateUtils, type InHouseRoundState } from './core/roundState.utils.js';
import { WinGoEngine } from './games/wingo.game.js';
import { MatkaEngine } from './games/matka.game.js';
import { AviatorEngine } from './games/aviator.game.js';

export class InHouseGamesService {
  private activeRounds = new Map<string, InHouseRoundState>();

  constructor() {
    this.initializeDefaultRounds();
  }

  private initializeDefaultRounds() {
    const gameTypes = ['wingo-1m', 'wingo-3m', 'wingo-5m', 'matka-kalyan', 'matka-mumbai', 'matka-rajdhani'];
    const now = Date.now();

    gameTypes.forEach((gt) => {
      let durationMs = 60000;
      if (gt.includes('3m')) durationMs = 180000;
      if (gt.includes('5m')) durationMs = 300000;
      if (gt.startsWith('matka')) durationMs = 120000;

      const serverSeed = ProvablyFairUtils.generateServerSeed();
      const commitHash = ProvablyFairUtils.getCommitHash(serverSeed);
      const period = `${new Date().toISOString().slice(0, 10).replace(/-/g, '')}${Math.floor(Math.random() * 9000 + 1000)}`;

      const state: InHouseRoundState = {
        gameType: gt,
        period,
        serverSeed,
        commitHash,
        startTime: now,
        endTime: now + durationMs,
        clientSeed: 'client-seed-2026',
        nonce: 1,
        status: 'active',
      };

      this.activeRounds.set(gt, state);
      RoundStateUtils.saveState(state).catch(() => {});
    });
  }

  public getActiveRound(gameType: string): InHouseRoundState | undefined {
    return this.activeRounds.get(gameType);
  }

  public getAllActiveRounds(): InHouseRoundState[] {
    return Array.from(this.activeRounds.values());
  }

  public async placeBet(userId: string, gameType: string, period: string, selection: string, amount: number) {
    const betRecord = await WalletUtils.processBet(userId, gameType, period, selection, amount);
    RoundStateUtils.recordLiveBet(gameType, { userId, gameType, period, selection, amount, timestamp: new Date() }).catch(() => {});
    return betRecord;
  }

  public resolveWinGoOutcome(serverSeed: string, clientSeed: string, nonce: number) {
    return WinGoEngine.calculateOutcome(serverSeed, clientSeed, nonce);
  }

  public resolveMatkaOutcome(serverSeed: string, clientSeed: string, nonce: number) {
    return MatkaEngine.calculateOutcome(serverSeed, clientSeed, nonce);
  }

  public resolveAviatorCrash(serverSeed: string, clientSeed: string, nonce: number) {
    return AviatorEngine.calculateCrashPoint(serverSeed, clientSeed, nonce);
  }
}

export const inhouseGamesService = new InHouseGamesService();
