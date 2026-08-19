// Real-time synchronization & autonomous round engine for Aviator Crash Game
// Cross-tab BroadcastChannel, LocalStorage triggers, and self-sustaining live simulator

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

const MOCK_PILOTS = ['Raj***91', 'Priya***42', 'Amit***77', 'Sona***15', 'Vikram***33', 'Neha***08', 'Rohit***66', 'Karan***99', 'Pooja***21', 'Dev***55'];

function generateMockBets(): AviatorLiveBet[] {
  const count = 4 + Math.floor(Math.random() * 4);
  const selected = [...MOCK_PILOTS].sort(() => 0.5 - Math.random()).slice(0, count);
  const amounts = [100, 200, 500, 1000, 2500, 5000];
  return selected.map((u, i) => ({
    id: `bet_${Date.now()}_${i}`,
    user: u,
    bet: amounts[Math.floor(Math.random() * amounts.length)],
    status: 'active' as const,
  }));
}

class AviatorSyncService {
  private channel: BroadcastChannel | null = null;
  private stateListeners: Set<(state: AviatorLiveState) => void> = new Set();
  private crashListeners: Set<(data: { multiplier?: number; timestamp: number }) => void> = new Set();
  private lastState: AviatorLiveState | null = null;
  private isPlayerMasterActive = false;
  private lastPlayerHeartbeat = 0;
  private autonomousTimer: any = null;
  private autonomousFlightRaf: any = null;

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

      // Storage event listener for cross-tab sync
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
            this.lastPlayerHeartbeat = Date.now();
            this.notifyStateListeners(state);
          } catch {
            // ignore
          }
        }
      });

      // Initial state
      const saved = this.getCurrentState();
      if (!saved) {
        this.lastState = {
          roundId: `rd_${Date.now().toString(36)}`,
          phase: 'betting',
          multiplier: 1.00,
          crashPoint: 2.35,
          countdown: 5,
          commitHash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
          liveBets: generateMockBets(),
          timestamp: Date.now(),
        };
      }
    }
  }

  private handleIncomingMessage(data: any) {
    if (!data || typeof data !== 'object') return;

    if (data.type === 'AVIATOR_STATE_UPDATE' && data.payload) {
      if (data.fromPlayer) {
        this.isPlayerMasterActive = true;
        this.lastPlayerHeartbeat = Date.now();
        this.stopAutonomousEngine();
      }
      this.notifyStateListeners(data.payload);
    } else if (data.type === 'ADMIN_INSTANT_CRASH') {
      this.notifyCrashListeners(data.payload || { timestamp: Date.now() });
      if (!this.isPlayerMasterActive && this.lastState && this.lastState.phase === 'flying') {
        this.crashAutonomousFlight(data.payload?.multiplier || this.lastState.multiplier);
      }
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

  // Publish live state from the player page (Marked as player master)
  public publishState(state: Omit<AviatorLiveState, 'timestamp'>) {
    this.isPlayerMasterActive = true;
    this.lastPlayerHeartbeat = Date.now();
    this.stopAutonomousEngine();

    const fullState: AviatorLiveState = {
      ...state,
      timestamp: Date.now(),
    };
    this.lastState = fullState;

    if (this.channel) {
      try {
        this.channel.postMessage({
          type: 'AVIATOR_STATE_UPDATE',
          fromPlayer: true,
          payload: fullState,
        });
      } catch {
        // ignore
      }
    }

    try {
      localStorage.setItem(STORAGE_STATE_KEY, JSON.stringify(fullState));
    } catch {
      // ignore
    }
  }

  // Get current state
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

  // Subscribe to live state updates
  public subscribeToState(callback: (state: AviatorLiveState) => void): () => void {
    this.stateListeners.add(callback);
    
    // Send immediate snapshot
    const current = this.getCurrentState();
    if (current) callback(current);

    // If no player has emitted recently, start the autonomous ticker so admin panel runs live
    this.checkAndStartAutonomousEngine();

    return () => {
      this.stateListeners.delete(callback);
      if (this.stateListeners.size === 0 && !this.isPlayerMasterActive) {
        this.stopAutonomousEngine();
      }
    };
  }

  // Subscribe to Instant Crash command
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
    const targetMult = multiplier ?? (this.lastState?.multiplier || 1.00);
    const payload = {
      multiplier: targetMult,
      timestamp: Date.now(),
      nonce: Math.random(),
    };

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

    if (typeof window !== 'undefined') {
      try {
        window.dispatchEvent(
          new CustomEvent('playarena_aviator_admin_crash_evt', { detail: payload })
        );
      } catch {
        // ignore
      }
    }

    try {
      localStorage.setItem(STORAGE_CRASH_TRIGGER_KEY, JSON.stringify(payload));
    } catch {
      // ignore
    }

    this.notifyCrashListeners(payload);

    // If autonomous engine is running, crash immediately
    if (this.lastState && (this.lastState.phase === 'flying' || this.lastState.phase === 'betting')) {
      this.crashAutonomousFlight(targetMult);
    }
  }

  // Admin Overrides
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

  /* ── Autonomous Simulator for standalone Admin view ── */
  private checkAndStartAutonomousEngine() {
    const isPlayerRecent = Date.now() - this.lastPlayerHeartbeat < 4000;
    if (!isPlayerRecent) {
      this.isPlayerMasterActive = false;
      this.startAutonomousLoop();
    }
  }

  private stopAutonomousEngine() {
    if (this.autonomousTimer) {
      clearInterval(this.autonomousTimer);
      clearTimeout(this.autonomousTimer);
      this.autonomousTimer = null;
    }
    if (this.autonomousFlightRaf) {
      cancelAnimationFrame(this.autonomousFlightRaf);
      this.autonomousFlightRaf = null;
    }
  }

  private startAutonomousLoop() {
    this.stopAutonomousEngine();
    
    // Determine next crash point considering overrides
    let targetCrash = 1.30 + Math.random() * 3.5;
    const override = this.getAdminOverride();
    if (override.forceNext100xCrash) {
      targetCrash = 1.00;
      this.clearAdminOverride();
    } else if (override.forcedTargetMultiplier) {
      targetCrash = override.forcedTargetMultiplier;
      this.clearAdminOverride();
    }

    let countdown = 5;
    const roundId = `rd_${Date.now().toString(36)}`;
    const hash = 'a9f2' + Math.random().toString(16).slice(2, 10) + '...';
    const bets = generateMockBets();

    const publish = (phase: 'betting' | 'flying' | 'crashed', multiplier: number, cd: number) => {
      const state: AviatorLiveState = {
        roundId,
        phase,
        multiplier: Math.round(multiplier * 100) / 100,
        crashPoint: targetCrash,
        countdown: cd,
        commitHash: hash,
        liveBets: bets,
        timestamp: Date.now(),
      };
      this.notifyStateListeners(state);
    };

    // Step 1: Betting Countdown
    publish('betting', 1.00, countdown);
    this.autonomousTimer = setInterval(() => {
      // Check if real player took over
      if (Date.now() - this.lastPlayerHeartbeat < 3000) {
        this.stopAutonomousEngine();
        return;
      }

      countdown -= 1;
      if (countdown > 0) {
        publish('betting', 1.00, countdown);
      } else {
        clearInterval(this.autonomousTimer);
        this.autonomousTimer = null;

        // Step 2: Instant Crash at 1.00x check
        if (targetCrash <= 1.00) {
          this.crashAutonomousFlight(1.00);
          return;
        }

        // Step 3: Flight Loop
        let mult = 1.00;
        const flightStartTime = Date.now();
        const runFlight = () => {
          if (Date.now() - this.lastPlayerHeartbeat < 3000) {
            this.stopAutonomousEngine();
            return;
          }

          const elapsedSec = (Date.now() - flightStartTime) / 1000;
          // Smooth non-linear curve
          mult = 1.00 + Math.pow(elapsedSec * 0.48, 1.25);

          // Simulated bot cashouts along the way
          bets.forEach((b) => {
            if (b.status === 'active' && Math.random() < 0.02 && mult > 1.2) {
              b.status = 'won';
              b.cashedAt = mult;
            }
          });

          if (mult >= targetCrash) {
            this.crashAutonomousFlight(targetCrash);
          } else {
            publish('flying', mult, 0);
            this.autonomousFlightRaf = requestAnimationFrame(runFlight);
          }
        };

        publish('flying', 1.00, 0);
        this.autonomousFlightRaf = requestAnimationFrame(runFlight);
      }
    }, 1000);
  }

  private crashAutonomousFlight(finalMultiplier: number) {
    if (this.autonomousFlightRaf) {
      cancelAnimationFrame(this.autonomousFlightRaf);
      this.autonomousFlightRaf = null;
    }
    if (this.autonomousTimer) {
      clearInterval(this.autonomousTimer);
      clearTimeout(this.autonomousTimer);
      this.autonomousTimer = null;
    }

    const curr = this.lastState;
    if (curr) {
      const lostBets = (curr.liveBets || []).map((b) => (!b.cashedAt ? { ...b, status: 'lost' as const } : b));
      const crashState: AviatorLiveState = {
        ...curr,
        phase: 'crashed',
        multiplier: Math.round(finalMultiplier * 100) / 100,
        liveBets: lostBets,
        timestamp: Date.now(),
      };
      this.notifyStateListeners(crashState);
    }

    // After 3.5s cooldown, start next autonomous round
    this.autonomousTimer = setTimeout(() => {
      this.checkAndStartAutonomousEngine();
    }, 3500);
  }
}

export const aviatorSync = new AviatorSyncService();
