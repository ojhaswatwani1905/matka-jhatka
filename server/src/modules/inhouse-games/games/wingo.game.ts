import { ProvablyFairUtils } from '../core/pf.utils.js';

export interface WinGoResult {
  digit: number;
  color: string;
  size: string;
}

export class WinGoEngine {
  public static calculateOutcome(serverSeed: string, clientSeed: string, nonce: number): WinGoResult {
    const hash = ProvablyFairUtils.generateCombinedHash(serverSeed, clientSeed, nonce);
    const floatVal = ProvablyFairUtils.hashToFloat(hash);
    const digit = Math.floor(floatVal * 10);

    const color =
      digit === 0
        ? 'violet-red'
        : digit === 5
        ? 'violet-green'
        : digit % 2 === 0
        ? 'red'
        : 'green';

    const size = digit >= 5 ? 'big' : 'small';

    return { digit, color, size };
  }

  public static evaluatePayout(selection: string, result: WinGoResult, betAmount: number): { isWin: boolean; payout: number } {
    const resultString = result.digit.toString();
    let isWin = false;
    let payout = 0;

    if (selection === 'green' && (result.color === 'green' || result.color === 'violet-green')) {
      isWin = true;
      payout = result.color === 'violet-green' ? betAmount * 1.5 : betAmount * 2;
    } else if (selection === 'red' && (result.color === 'red' || result.color === 'violet-red')) {
      isWin = true;
      payout = result.color === 'violet-red' ? betAmount * 1.5 : betAmount * 2;
    } else if (selection === 'violet' && result.color.includes('violet')) {
      isWin = true;
      payout = betAmount * 4.5;
    } else if (selection === 'big' && result.size === 'big') {
      isWin = true;
      payout = betAmount * 2;
    } else if (selection === 'small' && result.size === 'small') {
      isWin = true;
      payout = betAmount * 2;
    } else if (selection === resultString) {
      isWin = true;
      payout = betAmount * 9;
    }

    return { isWin, payout };
  }
}
