// Real-time synchronization service for Aviator Crash Game
// Supports BroadcastChannel, storage events, and WebSocket bridges

export interface AviatorLiveBet {
  id: string;
  user: string;
  bet: number;
  cashedAt?: number;
  status: 'active' | 'won' | 'lost';
}

export interface AviatorLiveState {
  roundId: string;
  phase: 'betting' | 'flying' | 'crashed';
  multiplier: number;
  crashPoint: number;
  countdown: number;
  commitHash: string;
  liveBets: AviatorLiveBet[];
  isManualCrash?: boolean;
  timestamp: number;
}

export interface AviatorAdminOverride {
  forceNext100xCrash?: boolean;
  forcedTargetMultiplier?: number | null;
}

const BROADCAST_CHANNEL_NAME = 'playarena_aviator_sync_channel';
const STORAGE_STATE_KEY = 'playarena_aviator_live_state';
const STORAGE_CRASH_TRIGGER_KEY = 'playarena_aviator_admin_crash_cmd';
const STORAGE_OVERRIDE_KEY = 'playarena_aviator_admin_override';

class AviatorSyncService {
  private channel: BroadcastChannel | null = null;
  private stateListeners: Set<(state: AviatorLiveState) => void> = new Set();
  private crashListeners: Set<(data: { multiplier?: number; timestamp: number }) => void> = new Set();
  private lastState: AviatorLiveState | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      try {
        if ('BroadcastChannel' in window) {
          this.channel = new BroadcastChannel(BROADCAST_CHANNEL_NAME);
          this.channel.onmessage = (event) => {
            this.handleIncomingMessage(event.data);
          };
        }
      } catch (err) {
        console.warn('[AviatorSync] BroadcastChannel unsupported:', err);
      }

      // Storage event listener for fallback cross-tab sync
      window.addEventListener('storage', (e) => {
        if (e.key === STORAGE_CRASH_TRIGGER_KEY && e.newValue) {
          try {
            const data = JSON.parse(e.newValue);
            this.notifyCrashListeners(data);
          } catch {
            // ignore
          }
        } else if (e.key === STORAGE_STATE_KEY && e.newValue) {
          try {
            const state = JSON.parse(e.newValue);
            this.notifyStateListeners(state);
          } catch {
            // ignore
          }
        }
      });
    }
  }

  private handleIncomingMessage(data: any) {
    if (!data || typeof data !== 'object') return;

    if (data.type === 'AVIATOR_STATE_UPDATE' && data.payload) {
      this.notifyStateListeners(data.payload);
    } else if (data.type === 'ADMIN_INSTANT_CRASH') {
      this.notifyCrashListeners(data.payload || { timestamp: Date.now() });
    }
  }

  private notifyStateListeners(state: AviatorLiveState) {
    this.lastState = state;
    this.stateListeners.forEach((fn) => {
      try {
        fn(state);
      } catch (err) {
        console.error('[AviatorSync] Error in state listener:', err);
      }
    });
  }

  private notifyCrashListeners(data: { multiplier?: number; timestamp: number }) {
    this.crashListeners.forEach((fn) => {
      try {
        fn(data);
      } catch (err) {
        console.error('[AviatorSync] Error in crash listener:', err);
      }
    });
  }

  // Publish live state from the active game page
  public publishState(state: Omit<AviatorLiveState, 'timestamp'>) {
    const fullState: AviatorLiveState = {
      ...state,
      timestamp: Date.now(),
    };
    this.lastState = fullState;

    // 1. BroadcastChannel
    if (this.channel) {
      try {
        this.channel.postMessage({
          type: 'AVIATOR_STATE_UPDATE',
          payload: fullState,
        });
      } catch {
        // ignore
      }
    }

    // 2. LocalStorage for persistence & cross-tab
    try {
      localStorage.setItem(STORAGE_STATE_KEY, JSON.stringify(fullState));
    } catch {
      // ignore
    }
  }

  // Get current or cached state
  public getCurrentState(): AviatorLiveState | null {
    if (this.lastState) return this.lastState;
    try {
      const saved = localStorage.getItem(STORAGE_STATE_KEY);
      if (saved) {
        this.lastState = JSON.parse(saved);
        return this.lastState;
      }
    } catch {
      // ignore
    }
    return null;
  }

  // Subscribe to live state updates (for Admin Live Preview)
  public subscribeToState(callback: (state: AviatorLiveState) => void): () => void {
    this.stateListeners.add(callback);
    if (this.lastState) {
      callback(this.lastState);
    } else {
      const current = this.getCurrentState();
      if (current) callback(current);
    }
    return () => {
      this.stateListeners.delete(callback);
    };
  }

  // Subscribe to Instant Crash command (for active game tabs)
  public subscribeToAdminCrash(
    callback: (data: { multiplier?: number; timestamp: number }) => void
  ): () => void {
    this.crashListeners.add(callback);
    return () => {
      this.crashListeners.delete(callback);
    };
  }

  // Trigger Instant Crash from Admin Panel
  public triggerAdminInstantCrash(multiplier?: number) {
    const payload = {
      multiplier,
      timestamp: Date.now(),
      nonce: Math.random(),
    };

    // 1. BroadcastChannel (cross-tab zero latency)
    if (this.channel) {
      try {
        this.channel.postMessage({
          type: 'ADMIN_INSTANT_CRASH',
          payload,
        });
      } catch {
        // ignore
      }
    }

    // 2. Custom DOM event (same window / iframes)
    if (typeof window !== 'undefined') {
      try {
        window.dispatchEvent(
          new CustomEvent('playarena_aviator_admin_crash_evt', { detail: payload })
        );
      } catch {
        // ignore
      }
    }

    // 3. LocalStorage trigger (guaranteed storage event in other tabs)
    try {
      localStorage.setItem(STORAGE_CRASH_TRIGGER_KEY, JSON.stringify(payload));
    } catch {
      // ignore
    }

    // 4. In-memory local listeners
    this.notifyCrashListeners(payload);

    // 5. Send API request to server backend to notify all network-connected clients
    try {
      const token = localStorage.getItem('token') || localStorage.getItem('playarena_token');
      fetch('/api/admin/aviator-crash', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ multiplier, timestamp: payload.timestamp }),
      }).catch(() => {
        // graceful if offline
      });
    } catch {
      // ignore
    }
  }


  // Set / Get Admin overrides (Force 1.00x next round or custom target)
  public setAdminOverride(override: AviatorAdminOverride) {
    try {
      localStorage.setItem(STORAGE_OVERRIDE_KEY, JSON.stringify(override));
    } catch {
      // ignore
    }
  }

  public getAdminOverride(): AviatorAdminOverride {
    try {
      const saved = localStorage.getItem(STORAGE_OVERRIDE_KEY);
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return {};
  }

  public clearAdminOverride() {
    try {
      localStorage.removeItem(STORAGE_OVERRIDE_KEY);
    } catch {
      // ignore
    }
  }
}

export const aviatorSync = new AviatorSyncService();
