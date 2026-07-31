import crypto from 'crypto';

export interface ProvablyFairResult {
  serverSeed: string;
  commitHash: string; // SHA256(serverSeed)
  clientSeed: string;
  nonce: number;
  hmacHash: string;
  digit: number;
  color: 'green' | 'red' | 'violet' | 'violet-red' | 'violet-green';
  size: 'big' | 'small';
}

export interface MatkaOutcomeResult {
  serverSeed: string;
  commitHash: string;
  singleDigit: number; // 0-9
  jodiDigit: string;   // 00-99
  pattiDigit: string;  // 000-999
}

export class ProvablyFairService {
  /**
   * Generates a 32-byte cryptographically secure server seed
   */
  static generateServerSeed(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Calculates the SHA256 commitment hash of the server seed
   */
  static getCommitHash(serverSeed: string): string {
    return crypto.createHash('sha256').update(serverSeed).digest('hex');
  }

  /**
   * Calculates the outcome for WinGo / Color Prediction
   */
  static calculateWinGoOutcome(
    serverSeed: string,
    clientSeed: string = 'default-client-seed',
    nonce: number = 1
  ): ProvablyFairResult {
    const commitHash = this.getCommitHash(serverSeed);
    const message = `${clientSeed}:${nonce}`;
    const hmacHash = crypto
      .createHmac('sha256', serverSeed)
      .update(message)
      .digest('hex');

    // Extract first 8 hex characters and map to decimal
    const subHash = hmacHash.substring(0, 8);
    const decimalValue = parseInt(subHash, 16);
    const digit = decimalValue % 10;

    let color: ProvablyFairResult['color'] = 'green';
    if (digit === 0) color = 'violet-red';
    else if (digit === 5) color = 'violet-green';
    else if ([1, 3, 7, 9].includes(digit)) color = 'green';
    else color = 'red';

    const size: ProvablyFairResult['size'] = digit >= 5 ? 'big' : 'small';

    return {
      serverSeed,
      commitHash,
      clientSeed,
      nonce,
      hmacHash,
      digit,
      color,
      size,
    };
  }

  /**
   * Calculates Matka Jhatka result (Single, Jodi, Patti)
   */
  static calculateMatkaOutcome(
    serverSeed: string,
    clientSeed: string = 'matka-client-seed',
    nonce: number = 1
  ): MatkaOutcomeResult {
    const commitHash = this.getCommitHash(serverSeed);
    const message = `${clientSeed}:${nonce}`;
    const hmacHash = crypto
      .createHmac('sha256', serverSeed)
      .update(message)
      .digest('hex');

    const subHash1 = hmacHash.substring(0, 8);
    const subHash2 = hmacHash.substring(8, 16);
    const subHash3 = hmacHash.substring(16, 24);

    const singleDigit = parseInt(subHash1, 16) % 10;
    const jodiVal = parseInt(subHash2, 16) % 100;
    const pattiVal = parseInt(subHash3, 16) % 1000;

    const jodiDigit = jodiVal.toString().padStart(2, '0');
    const pattiDigit = pattiVal.toString().padStart(3, '0');

    return {
      serverSeed,
      commitHash,
      singleDigit,
      jodiDigit,
      pattiDigit,
    };
  }

  /**
   * Verifies a past round's server seed against published commit hash
   */
  static verifyRound(serverSeed: string, expectedCommitHash: string): boolean {
    const calculatedCommitHash = this.getCommitHash(serverSeed);
    return calculatedCommitHash.toLowerCase() === expectedCommitHash.toLowerCase();
  }
}
