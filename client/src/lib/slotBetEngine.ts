/**
 * 🎰 Adaptive Dynamic Slot Bet Engine
 *
 * Implements intelligent outcome determination based on:
 * - New User vs Old User tier (New users win frequently; Old users face house-edge loss dominance)
 * - Per-Day Net Amount (Tracks today's net P&L = wins - bets)
 * - Bet Time / Velocity (Interval between spins, chasing detection)
 * - Previous Bet Results (Streak suppression for 2+ wins; pity recovery for 5+ losses)
 * - Lifetime Win vs Loss ratio & Bet-to-Balance risk factor
 */

export interface UserSlotProfile {
  userId: string;
  totalSpins: number;
  consecutiveWins: number;
  consecutiveLosses: number;
  todayDate: string;             // YYYY-MM-DD
  todayBets: number;             // Total bets placed today
  todayWins: number;             // Total wins collected today
  todayNetProfit: number;        // todayWins - todayBets
  lifetimeBets: number;          // Lifetime wagered amount
  lifetimeWins: number;          // Lifetime won amount
  lastBetTimestamp: number;      // Epoch timestamp of last spin
  recentOutcomes: ('win' | 'loss')[];
}

export type SlotOutcomeTier =
  | 'JACKPOT'         // Full match top symbol / 777 (50x - 500x)
  | 'BIG_WIN'         // Full match high-tier symbol (15x - 35x)
  | 'MEDIUM_WIN'      // 3-of-a-kind or full match low-tier (3x - 10x)
  | 'NEAR_MISS'       // 4 out of 5 matching (Exciting visual teaser, 0x)
  | 'CLEAN_LOSS';     // Standard loss (0x)

export interface SpinDecision {
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

const STORAGE_PREFIX = 'playarena_slot_profile_';

function getTodayString(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function getUserSlotProfile(userId: string): UserSlotProfile {
  const today = getTodayString();
  const key = `${STORAGE_PREFIX}${userId}`;
  try {
    const raw = localStorage.getItem(key);
    if (raw) {
      const parsed: UserSlotProfile = JSON.parse(raw);
      // Reset daily counters if day rolled over
      if (parsed.todayDate !== today) {
        parsed.todayDate = today;
        parsed.todayBets = 0;
        parsed.todayWins = 0;
        parsed.todayNetProfit = 0;
      }
      return parsed;
    }
  } catch { /* ignore */ }

  return {
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
}

export function saveUserSlotProfile(profile: UserSlotProfile): void {
  try {
    const key = `${STORAGE_PREFIX}${profile.userId}`;
    localStorage.setItem(key, JSON.stringify(profile));
  } catch { /* ignore */ }
}

/**
 * Evaluates the next spin outcome dynamically based on player history, daily net, velocity, and streaks.
 */
export function evaluateAdaptiveSpinOutcome(
  userId: string,
  betAmount: number,
  symbols: string[],
  visibleRowsCount: number = 4,
  targetRtp: number = 92
): { decision: SpinDecision; updatedProfile: UserSlotProfile } {
  const profile = getUserSlotProfile(userId);
  const now = Date.now();
  const timeSinceLastSpinMs = profile.lastBetTimestamp > 0 ? now - profile.lastBetTimestamp : 999999;
  const isRapidSpinning = timeSinceLastSpinMs < 2000;

  let winProbability = 0.22; // Base slot hit rate
  let reason = 'Standard slot RNG calculation';

  // ── 1. NEW USER LOGIC: High win rate on onboarding ──
  if (profile.totalSpins === 0) {
    // Guaranteed beginner luck jackpot
    winProbability = 1.0;
    reason = 'New player 1st spin guaranteed jackpot';
  } else if (profile.totalSpins <= 2) {
    winProbability = 0.85;
    reason = 'New player onboarding high win rate (85%)';
  } else if (profile.totalSpins <= 5) {
    winProbability = 0.65;
    reason = 'New player early game boost (65%)';
  } else {
    // ── 2. OLD USER LOGIC: Maximum time loss dominance (Target House Edge) ──
    const normalizedRtp = (targetRtp || 92) / 100;
    winProbability = Math.min(0.25, normalizedRtp * 0.24); // ~20% hit rate for regular players
    reason = 'Established player house-edge RTP mode';

    // ── 3. PER-DAY NET AMOUNT ADJUSTMENT ──
    if (profile.todayNetProfit > betAmount * 4) {
      // Player is winning heavily today -> Suppress wins to protect house margin
      winProbability = Math.max(0.08, winProbability - 0.12);
      reason += ' | Daily profit ceiling suppression';
    } else if (profile.todayNetProfit < -betAmount * 12) {
      // Player has significant losses today -> Grant retention recovery chance
      winProbability = Math.min(0.38, winProbability + 0.14);
      reason += ' | Daily loss pity retention boost';
    }

    // ── 4. STREAK ADJUSTMENT ──
    if (profile.consecutiveWins >= 2) {
      // Max consecutive wins reached -> Strict loss enforcement
      winProbability = 0.05;
      reason += ' | Win-streak breaker';
    } else if (profile.consecutiveLosses >= 5) {
      // Long dry spell -> Pity teaser or small win
      winProbability = Math.min(0.55, winProbability + 0.25);
      reason += ' | Dry-spell recovery boost';
    }

    // ── 5. BET VELOCITY / CHASING FACTOR ──
    if (isRapidSpinning && profile.consecutiveLosses >= 2) {
      // Rapid loss chasing -> Maintain high-volatility house edge
      winProbability = Math.max(0.12, winProbability - 0.06);
      reason += ' | Rapid velocity chasing control';
    }
  }

  // Determine outcome
  const roll = Math.random();
  const isWin = roll < winProbability;

  let tier: SlotOutcomeTier = 'CLEAN_LOSS';
  let targetMultiplier = 0;
  let forcedWinSymbol: string | null = null;
  let forcedWinRow: number = -1;
  let isNearMiss = false;
  let nearMissSymbol: string | null = null;
  let nearMissRow: number = -1;

  const topSymbol = symbols[0]; // Jackpot symbol (e.g. 777 or Crown)
  const highSymbols = symbols.slice(1, 3);
  const midLowSymbols = symbols.slice(3);

  if (isWin) {
    const winTierRoll = Math.random();

    if (profile.totalSpins === 0 || winTierRoll < 0.10) {
      // JACKPOT (10% of wins)
      tier = 'JACKPOT';
      targetMultiplier = 100;
      forcedWinSymbol = topSymbol;
      forcedWinRow = Math.floor(Math.random() * visibleRowsCount);
    } else if (winTierRoll < 0.40) {
      // BIG WIN (30% of wins)
      tier = 'BIG_WIN';
      targetMultiplier = 25;
      forcedWinSymbol = highSymbols[Math.floor(Math.random() * highSymbols.length)] || topSymbol;
      forcedWinRow = Math.floor(Math.random() * visibleRowsCount);
    } else {
      // MEDIUM WIN (60% of wins)
      tier = 'MEDIUM_WIN';
      targetMultiplier = 8;
      forcedWinSymbol = midLowSymbols[Math.floor(Math.random() * midLowSymbols.length)] || symbols[1];
      forcedWinRow = Math.floor(Math.random() * visibleRowsCount);
    }
  } else {
    // Loss outcome: 40% chance of exciting NEAR-MISS teaser
    if (Math.random() < 0.40) {
      tier = 'NEAR_MISS';
      isNearMiss = true;
      nearMissSymbol = symbols[Math.floor(Math.random() * symbols.length)];
      nearMissRow = Math.floor(Math.random() * visibleRowsCount);
    } else {
      tier = 'CLEAN_LOSS';
    }
  }

  // Update User Profile Stats
  const updatedProfile: UserSlotProfile = {
    ...profile,
    totalSpins: profile.totalSpins + 1,
    consecutiveWins: isWin ? profile.consecutiveWins + 1 : 0,
    consecutiveLosses: !isWin ? profile.consecutiveLosses + 1 : 0,
    todayBets: profile.todayBets + betAmount,
    lifetimeBets: profile.lifetimeBets + betAmount,
    lastBetTimestamp: now,
    recentOutcomes: [(isWin ? 'win' : 'loss') as 'win' | 'loss', ...profile.recentOutcomes].slice(0, 20),
  };

  saveUserSlotProfile(updatedProfile);

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
    updatedProfile,
  };
}

/**
 * Records payout when win resolves
 */
export function recordSlotPayoutToProfile(userId: string, payoutAmount: number): void {
  const profile = getUserSlotProfile(userId);
  profile.todayWins += payoutAmount;
  profile.todayNetProfit = profile.todayWins - profile.todayBets;
  profile.lifetimeWins += payoutAmount;
  saveUserSlotProfile(profile);
}
