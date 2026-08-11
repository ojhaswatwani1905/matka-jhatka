import { ProvablyFairUtils } from '../core/pf.utils.js';

export interface MatkaResult {
  pannaDigits: [number, number, number];
  openDigit: number;
  closePannaDigits: [number, number, number];
  closeDigit: number;
  jodiDigit: string;
  singleDigit: number;
}

export class MatkaEngine {
  public static calculateOutcome(serverSeed: string, clientSeed: string, nonce: number): MatkaResult {
    const hash = ProvablyFairUtils.generateCombinedHash(serverSeed, clientSeed, nonce);

    const d1 = Math.floor(ProvablyFairUtils.hashToFloat(hash.substring(0, 8)) * 10);
    const d2 = Math.floor(ProvablyFairUtils.hashToFloat(hash.substring(8, 16)) * 10);
    const d3 = Math.floor(ProvablyFairUtils.hashToFloat(hash.substring(16, 24)) * 10);

    const openDigit = (d1 + d2 + d3) % 10;

    const d4 = Math.floor(ProvablyFairUtils.hashToFloat(hash.substring(24, 32)) * 10);
    const d5 = Math.floor(ProvablyFairUtils.hashToFloat(hash.substring(32, 40)) * 10);
    const d6 = Math.floor(ProvablyFairUtils.hashToFloat(hash.substring(40, 48)) * 10);

    const closeDigit = (d4 + d5 + d6) % 10;
    const jodiDigit = `${openDigit}${closeDigit}`;

    return {
      pannaDigits: [d1, d2, d3],
      openDigit,
      closePannaDigits: [d4, d5, d6],
      closeDigit,
      jodiDigit,
      singleDigit: openDigit,
    };
  }

  public static evaluatePayout(selection: string, result: MatkaResult, betAmount: number): { isWin: boolean; payout: number } {
    const isWin = selection === result.singleDigit.toString() || selection === result.jodiDigit;
    const multiplier = selection.length === 2 ? 90 : 9;
    return { isWin, payout: isWin ? betAmount * multiplier : 0 };
  }
}
