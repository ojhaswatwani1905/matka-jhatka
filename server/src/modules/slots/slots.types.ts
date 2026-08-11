export interface SlotPaytable {
  twoOfAKind: number;
  threeOfAKind: number;
  fourOfAKind?: number;
  fiveOfAKind?: number;
  jackpot777: number;
}

export interface SlotGameConfig {
  id: string;
  name: string;
  subtitle: string;
  emoji: string;
  reels: 3 | 5;
  symbols: string[];
  paytable: SlotPaytable;
  minBet: number;
  maxBet: number;
  targetRtp: number; // e.g. 95%
  enabled: boolean;
  wildSymbol?: string;
  scatterSymbol?: string;
  jackpotMultiplier: number;
}

export interface SlotSpinRequest {
  gameId: string;
  betAmount: number;
  clientSeed?: string;
}

export interface SlotSpinResult {
  gameId: string;
  betAmount: number;
  reelsResult: string[];
  isWin: boolean;
  payoutMultiplier: number;
  payoutAmount: number;
  winType: 'jackpot' | 'superwin' | 'win' | 'none';
  matchDetail: string;
  timestamp: string;
}
