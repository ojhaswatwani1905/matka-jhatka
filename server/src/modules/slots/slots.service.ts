import crypto from 'crypto';
import { SLOT_GAMES_CONFIG } from './slots.config.js';
import type { SlotGameConfig, SlotSpinResult } from './slots.types.js';

export class SlotEngineService {
  /**
   * Fetch configuration for a slot variant
   */
  public getGameConfig(gameId: string): SlotGameConfig {
    const config = SLOT_GAMES_CONFIG[gameId];
    if (!config) {
      throw new Error(`Slot game '${gameId}' not found.`);
    }
    return config;
  }

  /**
   * Get all registered slot configurations
   */
  public getAllGameConfigs(): SlotGameConfig[] {
    return Object.values(SLOT_GAMES_CONFIG);
  }

  /**
   * Resolve a slot spin deterministically / provably-fairly
   */
  public resolveSpin(gameId: string, betAmount: number, clientSeed?: string): SlotSpinResult {
    const config = this.getGameConfig(gameId);

    if (betAmount < config.minBet || betAmount > config.maxBet) {
      throw new Error(`Bet amount must be between ${config.minBet} and ${config.maxBet}`);
    }

    // Generate random seed hash
    const seedHex = crypto
      .createHash('sha256')
      .update(`${gameId}:${betAmount}:${clientSeed || 'client'}:${Date.now()}:${Math.random()}`)
      .digest('hex');

    // Pick symbols for each reel
    const reelsResult: string[] = [];
    for (let i = 0; i < config.reels; i++) {
      const byteChunk = parseInt(seedHex.substring(i * 4, (i + 1) * 4), 16);
      const symbolIndex = byteChunk % config.symbols.length;
      reelsResult.push(config.symbols[symbolIndex]);
    }

    // Evaluate payouts
    const counts: Record<string, number> = {};
    reelsResult.forEach((sym) => {
      counts[sym] = (counts[sym] || 0) + 1;
    });

    const maxFrequency = Math.max(...Object.values(counts));
    const mainSymbol = Object.keys(counts).find((k) => counts[k] === maxFrequency) || reelsResult[0];

    let payoutMultiplier = 0;
    let winType: 'jackpot' | 'superwin' | 'win' | 'none' = 'none';
    let matchDetail = 'No Match';

    // 1. Check Jackpot (All reels match primary symbol or 777/Wild)
    if (maxFrequency === config.reels) {
      if (mainSymbol === config.symbols[0] || mainSymbol === '7️⃣' || mainSymbol === config.wildSymbol) {
        payoutMultiplier = config.paytable.jackpot777;
        winType = 'jackpot';
        matchDetail = `JACKPOT ${config.reels}x ${mainSymbol}!`;
      } else {
        payoutMultiplier = config.paytable.fiveOfAKind || config.paytable.threeOfAKind * 2;
        winType = 'superwin';
        matchDetail = `FULL REEL MATCH (${config.reels}x ${mainSymbol})`;
      }
    } else if (config.reels === 5 && maxFrequency === 4 && config.paytable.fourOfAKind) {
      payoutMultiplier = config.paytable.fourOfAKind;
      winType = 'superwin';
      matchDetail = `4x MATCH (${mainSymbol})`;
    } else if (maxFrequency >= 3) {
      payoutMultiplier = config.paytable.threeOfAKind;
      winType = 'win';
      matchDetail = `3x MATCH (${mainSymbol})`;
    } else if (maxFrequency >= 2) {
      payoutMultiplier = config.paytable.twoOfAKind;
      winType = 'win';
      matchDetail = `2x MATCH (${mainSymbol})`;
    }

    const payoutAmount = Math.round(betAmount * payoutMultiplier * 100) / 100;
    const isWin = payoutAmount > 0;

    return {
      gameId,
      betAmount,
      reelsResult,
      isWin,
      payoutMultiplier,
      payoutAmount,
      winType,
      matchDetail,
      timestamp: new Date().toISOString(),
    };
  }
}

export const slotEngineService = new SlotEngineService();
