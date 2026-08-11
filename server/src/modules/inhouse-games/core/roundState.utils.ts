import { redisService } from '../../../services/redisService.js';

export interface InHouseRoundState {
  gameType: string;
  period: string;
  serverSeed: string;
  commitHash: string;
  startTime: number;
  endTime: number;
  clientSeed: string;
  nonce: number;
  status: 'active' | 'locked' | 'resolved';
  manualOverride?: {
    digit: number;
    resultString: string;
    color: string;
    size: string;
    isManual: boolean;
  };
}

export class RoundStateUtils {
  public static async saveState(round: InHouseRoundState): Promise<void> {
    await redisService.setLiveRoundState(round.gameType, round);
  }

  public static async getState(gameType: string): Promise<InHouseRoundState | null> {
    return redisService.getLiveRoundState(gameType);
  }

  public static async recordLiveBet(gameType: string, betData: any): Promise<void> {
    await redisService.pushLiveBet(gameType, betData);
  }
}
