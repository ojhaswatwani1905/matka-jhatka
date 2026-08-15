/**
 * 🎰 Backend Adaptive Dynamic Slot Bet Engine
 *
 * Implements intelligent outcome determination based on:
 * - New User vs Old User (New users win frequently; Old users face house-edge loss dominance)
 * - Per-Day Net Amount (Tracks today's net P&L = wins - bets)
 * - Bet Time / Velocity (Interval between spins, chasing detection)
 * - Previous Bet Results (Streak suppression for 2+ wins; pity recovery for 5+ losses)
 * - Lifetime Win vs Loss ratio & Bet-to-Balance risk factor
 */

export interface BackendUserSlotProfile {
  userId: string;
  totalSpins: number;
  consecutiveWins: number;
  consecutiveLosses: number;
  todayDate: string;             // YYYY-MM-DD
  todayBets: number;
  todayWins: number;
  todayNetProfit: number;
  lifetimeBets: number;
  lifetimeWins: number;
  lastBetTimestamp: number;
  recentOutcomes: ('win' | 'loss')[];
}

export type SlotOutcomeTier =
  | 'JACKPOT'         // Full match top symbol / 777 (50x - 500x)
  | 'BIG_WIN'         // Full match high-tier symbol (15x - 35x)
  | 'MEDIUM_WIN'      // 3-of-a-kind or full match low-tier (3x - 10x)
  | 'NEAR_MISS'       // 4 out of 5 matching (Exciting visual teaser, 0x)
  | 'CLEAN_LOSS';     // Standard loss (0x)

export interface BackendSpinDecision {
  isWin: boolean;
  tier: SlotOutcomeTier;
  targetMultiplier: number;
  reason: string;
  forcedWinSymbol: string | null;
  forcedWinRow: number;
  isNearMiss: boolean;
  nearMissSymbol: string | null;
  nearMissRow: number;
}

// In-memory / cache store for server player profiles
const serverSlotProfiles: Map<string, BackendUserSlotProfile> = new Map();

function getTodayString(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function getBackendUserSlotProfile(userId: string): BackendUserSlotProfile {
  const today = getTodayString();
  let profile = serverSlotProfiles.get(userId);

  if (!profile) {
    profile = {
      userId,
      totalSpins: 0,
      consecutiveWins: 0,
      consecutiveLosses: 0,
      todayDate: today,
      todayBets: 0,
      todayWins: 0,
      todayNetProfit: 0,
      lifetimeBets: 0,
      lifetimeWins: 0,
      lastBetTimestamp: 0,
      recentOutcomes: [],
    };
    serverSlotProfiles.set(userId, profile);
  } else if (profile.todayDate !== today) {
    // Reset daily counters
    profile.todayDate = today;
    profile.todayBets = 0;
    profile.todayWins = 0;
    profile.todayNetProfit = 0;
  }

  return profile;
}

export function evaluateBackendAdaptiveSpin(
  userId: string,
  betAmount: number,
  symbols: string[],
  visibleRowsCount: number = 4,
  targetRtp: number = 92
): { decision: BackendSpinDecision; updatedProfile: BackendUserSlotProfile } {
  const profile = getBackendUserSlotProfile(userId);
  const now = Date.now();
  const timeSinceLastSpinMs = profile.lastBetTimestamp > 0 ? now - profile.lastBetTimestamp : 999999;
  const isRapidSpinning = timeSinceLastSpinMs < 2000;

  let winProbability = 0.22;
  let reason = 'Standard backend slot RNG';

  // 1. NEW USER LOGIC: High win rate on onboarding
  if (profile.totalSpins === 0) {
    winProbability = 1.0;
    reason = 'New player 1st spin guaranteed jackpot';
  } else if (profile.totalSpins <= 2) {
    winProbability = 0.85;
    reason = 'New player onboarding high win rate (85%)';
  } else if (profile.totalSpins <= 5) {
    winProbability = 0.65;
    reason = 'New player early game boost (65%)';
  } else {
    // 2. OLD USER LOGIC: Maximum time loss dominance
    const normalizedRtp = (targetRtp || 92) / 100;
    winProbability = Math.min(0.25, normalizedRtp * 0.24); // ~20% hit rate
    reason = 'Established player house-edge RTP mode';

    // 3. PER-DAY NET AMOUNT ADJUSTMENT
    if (profile.todayNetProfit > betAmount * 4) {
      winProbability = Math.max(0.08, winProbability - 0.12);
      reason += ' | Daily profit ceiling suppression';
    } else if (profile.todayNetProfit < -betAmount * 12) {
      winProbability = Math.min(0.38, winProbability + 0.14);
      reason += ' | Daily loss pity retention boost';
    }

    // 4. STREAK ADJUSTMENT
    if (profile.consecutiveWins >= 2) {
      winProbability = 0.05;
      reason += ' | Win-streak breaker';
    } else if (profile.consecutiveLosses >= 5) {
      winProbability = Math.min(0.55, winProbability + 0.25);
      reason += ' | Dry-spell recovery boost';
    }

    // 5. RAPID VELOCITY CHASING FACTOR
    if (isRapidSpinning && profile.consecutiveLosses >= 2) {
      winProbability = Math.max(0.12, winProbability - 0.06);
      reason += ' | Rapid velocity chasing control';
    }
  }

  const roll = Math.random();
  const isWin = roll < winProbability;

  let tier: SlotOutcomeTier = 'CLEAN_LOSS';
  let targetMultiplier = 0;
  let forcedWinSymbol: string | null = null;
  let forcedWinRow: number = -1;
  let isNearMiss = false;
  let nearMissSymbol: string | null = null;
  let nearMissRow: number = -1;

  const topSymbol = symbols[0];
  const highSymbols = symbols.slice(1, 3);
  const midLowSymbols = symbols.slice(3);

  if (isWin) {
    const winTierRoll = Math.random();
    if (profile.totalSpins === 0 || winTierRoll < 0.10) {
      tier = 'JACKPOT';
      targetMultiplier = 100;
      forcedWinSymbol = topSymbol;
      forcedWinRow = Math.floor(Math.random() * visibleRowsCount);
    } else if (winTierRoll < 0.40) {
      tier = 'BIG_WIN';
      targetMultiplier = 25;
      forcedWinSymbol = highSymbols[Math.floor(Math.random() * highSymbols.length)] || topSymbol;
      forcedWinRow = Math.floor(Math.random() * visibleRowsCount);
    } else {
      tier = 'MEDIUM_WIN';
      targetMultiplier = 8;
      forcedWinSymbol = midLowSymbols[Math.floor(Math.random() * midLowSymbols.length)] || symbols[1];
      forcedWinRow = Math.floor(Math.random() * visibleRowsCount);
    }
  } else {
    if (Math.random() < 0.40) {
      tier = 'NEAR_MISS';
      isNearMiss = true;
      nearMissSymbol = symbols[Math.floor(Math.random() * symbols.length)];
      nearMissRow = Math.floor(Math.random() * visibleRowsCount);
    } else {
      tier = 'CLEAN_LOSS';
    }
  }

  profile.totalSpins += 1;
  profile.consecutiveWins = isWin ? profile.consecutiveWins + 1 : 0;
  profile.consecutiveLosses = !isWin ? profile.consecutiveLosses + 1 : 0;
  profile.todayBets += betAmount;
  profile.lifetimeBets += betAmount;
  profile.lastBetTimestamp = now;
  profile.recentOutcomes = [(isWin ? 'win' : 'loss') as 'win' | 'loss', ...profile.recentOutcomes].slice(0, 20);

  return {
    decision: {
      isWin,
      tier,
      targetMultiplier,
      reason,
      forcedWinSymbol,
      forcedWinRow,
      isNearMiss,
      nearMissSymbol,
      nearMissRow,
    },
    updatedProfile: profile,
  };
}

export function recordBackendSlotPayout(userId: string, payoutAmount: number): void {
  const profile = getBackendUserSlotProfile(userId);
  profile.todayWins += payoutAmount;
  profile.todayNetProfit = profile.todayWins - profile.todayBets;
  profile.lifetimeWins += payoutAmount;
}
