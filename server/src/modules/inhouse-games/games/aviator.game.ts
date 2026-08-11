import { ProvablyFairUtils } from '../core/pf.utils.js';

export interface AviatorResult {
  crashMultiplier: number;
  hash: string;
}

export class AviatorEngine {
  public static calculateCrashPoint(serverSeed: string, clientSeed: string, nonce: number): AviatorResult {
    const hash = ProvablyFairUtils.generateCombinedHash(serverSeed, clientSeed, nonce);
    const floatVal = ProvablyFairUtils.hashToFloat(hash);

    // House edge ~ 3%
    if (floatVal < 0.03) {
      return { crashMultiplier: 1.0, hash };
    }

    const multiplier = Math.floor((100 / (1 - floatVal * 0.97)) * 0.01 * 100) / 100;
    return { crashMultiplier: Math.max(1.0, multiplier), hash };
  }
}
