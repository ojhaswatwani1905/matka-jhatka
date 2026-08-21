import { ProvablyFairUtils } from '../core/pf.utils.js';

export type MatkaGameType =
  | 'SINGLE'
  | 'JODI'
  | 'PATTI'
  | 'DOUBLE_PATTI'
  | 'TRIPLE_PATTI'
  | 'HALF_SANGAM'
  | 'FULL_SANGAM';

export interface MatkaResult {
  openPanna: [number, number, number];
  openPatti: string;
  openDigit: number;
  closePanna: [number, number, number];
  closePatti: string;
  closeDigit: number;
  jodiDigit: string;
  displayFormatted: string; // e.g. "128-16-349"
}

export interface MatkaBetEvaluation {
  isWin: boolean;
  payout: number;
  multiplier: number;
  matchDetails?: string;
}

export const MATKA_MULTIPLIERS: Record<MatkaGameType, number> = {
  SINGLE: 9.5,
  JODI: 90,
  PATTI: 140,
  DOUBLE_PATTI: 280,
  TRIPLE_PATTI: 700,
  HALF_SANGAM: 1200,
  FULL_SANGAM: 10000,
};

// Generate all 120 Single Pattis (3 strictly unique ascending digits, treating 0 as highest in Matka or standard 0-9)
export function generateSinglePattis(): string[] {
  const list: string[] = [];
  for (let i = 0; i <= 9; i++) {
    for (let j = i + 1; j <= 9; j++) {
      for (let k = j + 1; k <= 9; k++) {
        list.push(`${i}${j}${k}`);
      }
    }
  }
  return list;
}

// Generate all 90 Double Pattis (3 ascending digits with exactly 2 duplicate digits)
export function generateDoublePattis(): string[] {
  const list: string[] = [];
  for (let d1 = 0; d1 <= 9; d1++) {
    for (let d2 = 0; d2 <= 9; d2++) {
      if (d1 !== d2) {
        const sorted = [d1, d1, d2].sort((a, b) => a - b).join('');
        if (!list.includes(sorted)) {
          list.push(sorted);
        }
      }
    }
  }
  return list.sort();
}

// Generate all 10 Triple Pattis (000, 111, ..., 999)
export function generateTriplePattis(): string[] {
  return Array.from({ length: 10 }, (_, i) => `${i}${i}${i}`);
}

export const SINGLE_PATTIS = generateSinglePattis();
export const DOUBLE_PATTIS = generateDoublePattis();
export const TRIPLE_PATTIS = generateTriplePattis();

export class MatkaEngine {
  /**
   * Sorts 3 digits ascending according to Matka rules
   */
  public static sortPattiDigits(d1: number, d2: number, d3: number): [number, number, number] {
    const arr = [d1, d2, d3].sort((a, b) => a - b);
    return [arr[0], arr[1], arr[2]];
  }

  /**
   * Calculate deterministic Provably Fair Matka Outcome
   */
  public static calculateOutcome(serverSeed: string, clientSeed: string, nonce: number): MatkaResult {
    const hash = ProvablyFairUtils.generateCombinedHash(serverSeed, clientSeed, nonce);

    // Open Pana digits (3 digits)
    const rawD1 = Math.floor(ProvablyFairUtils.hashToFloat(hash.substring(0, 8)) * 10);
    const rawD2 = Math.floor(ProvablyFairUtils.hashToFloat(hash.substring(8, 16)) * 10);
    const rawD3 = Math.floor(ProvablyFairUtils.hashToFloat(hash.substring(16, 24)) * 10);
    const openPanna = this.sortPattiDigits(rawD1, rawD2, rawD3);
    const openPatti = openPanna.join('');
    const openDigit = (openPanna[0] + openPanna[1] + openPanna[2]) % 10;

    // Close Pana digits (3 digits)
    const rawD4 = Math.floor(ProvablyFairUtils.hashToFloat(hash.substring(24, 32)) * 10);
    const rawD5 = Math.floor(ProvablyFairUtils.hashToFloat(hash.substring(32, 40)) * 10);
    const rawD6 = Math.floor(ProvablyFairUtils.hashToFloat(hash.substring(40, 48)) * 10);
    const closePanna = this.sortPattiDigits(rawD4, rawD5, rawD6);
    const closePatti = closePanna.join('');
    const closeDigit = (closePanna[0] + closePanna[1] + closePanna[2]) % 10;

    const jodiDigit = `${openDigit}${closeDigit}`;
    const displayFormatted = `${openPatti} - ${jodiDigit} - ${closePatti}`;

    return {
      openPanna,
      openPatti,
      openDigit,
      closePanna,
      closePatti,
      closeDigit,
      jodiDigit,
      displayFormatted,
    };
  }

  /**
   * Evaluates if a bet won for any of the 7 supported Matka game types
   * @param gameType 'SINGLE' | 'JODI' | 'PATTI' | 'DOUBLE_PATTI' | 'TRIPLE_PATTI' | 'HALF_SANGAM' | 'FULL_SANGAM'
   * @param selection User's formatted prediction (e.g. "5", "56", "128", "118", "777", "128-6" or "128-349")
   * @param result Declared Matka result outcome
   * @param betAmount Stake amount
   * @param session Optional 'open' | 'close' (defaults to checking either/active for Single/Patti)
   */
  public static evaluatePayout(
    gameType: MatkaGameType,
    selection: string,
    result: MatkaResult,
    betAmount: number,
    session: 'open' | 'close' | 'any' = 'any'
  ): MatkaBetEvaluation {
    const cleanSel = selection.trim().replace(/\s+/g, '');
    const mult = MATKA_MULTIPLIERS[gameType] || 9.5;
    let isWin = false;
    let matchDetails = '';

    switch (gameType) {
      case 'SINGLE': {
        const userDigit = parseInt(cleanSel, 10);
        if (session === 'open') {
          isWin = userDigit === result.openDigit;
          matchDetails = `Open Single: ${result.openDigit}`;
        } else if (session === 'close') {
          isWin = userDigit === result.closeDigit;
          matchDetails = `Close Single: ${result.closeDigit}`;
        } else {
          isWin = userDigit === result.openDigit || userDigit === result.closeDigit;
          matchDetails = `Open: ${result.openDigit}, Close: ${result.closeDigit}`;
        }
        break;
      }

      case 'JODI': {
        const normalizedSel = cleanSel.padStart(2, '0');
        isWin = normalizedSel === result.jodiDigit;
        matchDetails = `Jodi: ${result.jodiDigit}`;
        break;
      }

      case 'PATTI': {
        // Single Patti (3 distinct sorted digits)
        const sortedSel = cleanSel.split('').sort().join('');
        if (session === 'open') {
          isWin = sortedSel === result.openPatti;
          matchDetails = `Open Patti: ${result.openPatti}`;
        } else if (session === 'close') {
          isWin = sortedSel === result.closePatti;
          matchDetails = `Close Patti: ${result.closePatti}`;
        } else {
          isWin = sortedSel === result.openPatti || sortedSel === result.closePatti;
          matchDetails = `Open: ${result.openPatti}, Close: ${result.closePatti}`;
        }
        break;
      }

      case 'DOUBLE_PATTI': {
        // Double Patti (3 sorted digits with 2 duplicate digits)
        const sortedSel = cleanSel.split('').sort().join('');
        if (session === 'open') {
          isWin = sortedSel === result.openPatti;
          matchDetails = `Open Patti: ${result.openPatti}`;
        } else if (session === 'close') {
          isWin = sortedSel === result.closePatti;
          matchDetails = `Close Patti: ${result.closePatti}`;
        } else {
          isWin = sortedSel === result.openPatti || sortedSel === result.closePatti;
          matchDetails = `Open: ${result.openPatti}, Close: ${result.closePatti}`;
        }
        break;
      }

      case 'TRIPLE_PATTI': {
        // Triple Patti (000, 111, ..., 999)
        const sortedSel = cleanSel;
        if (session === 'open') {
          isWin = sortedSel === result.openPatti;
          matchDetails = `Open Patti: ${result.openPatti}`;
        } else if (session === 'close') {
          isWin = sortedSel === result.closePatti;
          matchDetails = `Close Patti: ${result.closePatti}`;
        } else {
          isWin = sortedSel === result.openPatti || sortedSel === result.closePatti;
          matchDetails = `Open: ${result.openPatti}, Close: ${result.closePatti}`;
        }
        break;
      }

      case 'HALF_SANGAM': {
        // Format A: "OpenPatti-CloseAnk" (e.g. "128-6")
        // Format B: "OpenAnk-ClosePatti" (e.g. "1-349")
        const parts = cleanSel.split(/[-–/]/);
        if (parts.length === 2) {
          const part1 = parts[0].trim();
          const part2 = parts[1].trim();

          if (part1.length === 3 && part2.length === 1) {
            // Mode A: Open Patti + Close Ank
            const sortedP1 = part1.split('').sort().join('');
            const p2Digit = parseInt(part2, 10);
            isWin = sortedP1 === result.openPatti && p2Digit === result.closeDigit;
            matchDetails = `Required Open Patti: ${result.openPatti} + Close Ank: ${result.closeDigit}`;
          } else if (part1.length === 1 && part2.length === 3) {
            // Mode B: Open Ank + Close Patti
            const p1Digit = parseInt(part1, 10);
            const sortedP2 = part2.split('').sort().join('');
            isWin = p1Digit === result.openDigit && sortedP2 === result.closePatti;
            matchDetails = `Required Open Ank: ${result.openDigit} + Close Patti: ${result.closePatti}`;
          }
        }
        break;
      }

      case 'FULL_SANGAM': {
        // Format: "OpenPatti-ClosePatti" (e.g. "128-349")
        const parts = cleanSel.split(/[-–/]/);
        if (parts.length === 2) {
          const sortedP1 = parts[0].trim().split('').sort().join('');
          const sortedP2 = parts[1].trim().split('').sort().join('');
          isWin = sortedP1 === result.openPatti && sortedP2 === result.closePatti;
          matchDetails = `Required: ${result.openPatti} - ${result.closePatti}`;
        }
        break;
      }
    }

    const payout = isWin ? Math.round(betAmount * mult) : 0;
    return {
      isWin,
      payout,
      multiplier: mult,
      matchDetails,
    };
  }
}
