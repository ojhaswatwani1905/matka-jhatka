import crypto from 'crypto';

export interface PFCommitReveal {
  serverSeed: string;
  commitHash: string;
  clientSeed: string;
  nonce: number;
}

export class ProvablyFairUtils {
  public static generateServerSeed(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  public static getCommitHash(serverSeed: string): string {
    return crypto.createHash('sha256').update(serverSeed).digest('hex');
  }

  public static verifyCommit(serverSeed: string, commitHash: string): boolean {
    return this.getCommitHash(serverSeed) === commitHash;
  }

  public static generateCombinedHash(serverSeed: string, clientSeed: string, nonce: number): string {
    return crypto
      .createHmac('sha256', serverSeed)
      .update(`${clientSeed}:${nonce}`)
      .digest('hex');
  }

  public static hashToFloat(hash: string): number {
    const sub = hash.substring(0, 8);
    const num = parseInt(sub, 16);
    return num / 0xffffffff;
  }
}
