// Real-time synchronization service for Real User Bets & Manual Outcome Overrides
// Zero-latency cross-tab BroadcastChannel & LocalStorage fallback

export interface RealPlayerBet {
  id: string;
  user: string;
  gameType: string;
  period: string;
  selection: string;
  amount: number;
  createdAt: string;
}

const BETS_CHANNEL_NAME = 'playarena_real_bets_channel';
const STORAGE_BETS_KEY = 'playarena_real_active_bets';

class RealBetSyncService {
  private channel: BroadcastChannel | null = null;
  private betListeners: Set<(bet: RealPlayerBet) => void> = new Set();

  constructor() {
    if (typeof window !== 'undefined') {
      try {
        if ('BroadcastChannel' in window) {
          this.channel = new BroadcastChannel(BETS_CHANNEL_NAME);
          this.channel.onmessage = (event) => {
            if (event.data?.type === 'REAL_BET_PLACED' && event.data.payload) {
              this.notifyBetListeners(event.data.payload);
            }
          };
        }
      } catch (err) {
        console.warn('[RealBetSync] BroadcastChannel unavailable:', err);
      }

      window.addEventListener('storage', (e) => {
        if (e.key === STORAGE_BETS_KEY && e.newValue) {
          try {
            const bet = JSON.parse(e.newValue);
            this.notifyBetListeners(bet);
          } catch {
            // ignore
          }
        }
      });
    }
  }

  private notifyBetListeners(bet: RealPlayerBet) {
    this.betListeners.forEach((fn) => {
      try {
        fn(bet);
      } catch (err) {
        console.error('[RealBetSync] Error in bet listener:', err);
      }
    });
  }

  public publishRealBet(bet: Omit<RealPlayerBet, 'createdAt'>) {
    const fullBet: RealPlayerBet = {
      ...bet,
      createdAt: new Date().toLocaleTimeString(),
    };

    // 1. BroadcastChannel (0ms latency across tabs)
    if (this.channel) {
      try {
        this.channel.postMessage({
          type: 'REAL_BET_PLACED',
          payload: fullBet,
        });
      } catch {
        // ignore
      }
    }

    // 2. LocalStorage trigger
    try {
      localStorage.setItem(STORAGE_BETS_KEY, JSON.stringify(fullBet));
    } catch {
      // ignore
    }

    // 3. Notify local in-tab listeners
    this.notifyBetListeners(fullBet);

    // 4. Send to server backend
    try {
      const token = localStorage.getItem('token') || localStorage.getItem('playarena_token') || 'demo-token-123';
      fetch('/api/games/bet', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          gameType: fullBet.gameType,
          period: fullBet.period,
          selection: fullBet.selection,
          amount: fullBet.amount,
          userName: fullBet.user,
        }),
      }).catch(() => {});
    } catch {
      // ignore
    }
  }

  public subscribeToRealBets(callback: (bet: RealPlayerBet) => void): () => void {
    this.betListeners.add(callback);
    return () => {
      this.betListeners.delete(callback);
    };
  }
}

export const realBetSync = new RealBetSyncService();
