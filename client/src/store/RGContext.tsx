/**
 * Responsible Gaming Context
 * Handles: deposit caps (with 24h increase cooldown & immediate decrease), self-exclusion, session limits, 2FA, reality checks
 */
import { createContext, useContext, useReducer, useCallback, useEffect, useRef } from 'react';
import type { ReactNode } from 'react';

export type SessionLimit = 'off' | '30m' | '1h' | '2h' | '4h';
export type ExclusionPeriod = '24h' | '7d' | '30d' | 'permanent';

export interface DepositCap {
  daily?: number;
  weekly?: number;
  monthly?: number;
}

export interface PendingCapIncrease {
  field: 'daily' | 'weekly' | 'monthly';
  newVal: number;
  effectiveAt: string; // ISO string 24h in future
}

export interface RGSettings {
  sessionLimit: SessionLimit;
  twoFAEnabled: boolean;
  depositCap: DepositCap;
  pendingIncreases: PendingCapIncrease[];
  exclusionUntil?: string; // ISO timestamp, 'permanent' string, or undefined
  realityCheckHours: number; // 0 = off
}

const DEFAULT_SETTINGS: RGSettings = {
  sessionLimit: 'off',
  twoFAEnabled: false,
  depositCap: { daily: 5000, weekly: 20000, monthly: 50000 },
  pendingIncreases: [],
  realityCheckHours: 0,
};

interface RGState {
  settings: RGSettings;
  sessionStart: string | null;
}

type RGAction =
  | { type: 'SET_SETTINGS'; payload: Partial<RGSettings> }
  | { type: 'SET_SESSION_START'; payload: string | null }
  | { type: 'LOAD'; payload: RGState };

function rgReducer(state: RGState, action: RGAction): RGState {
  switch (action.type) {
    case 'SET_SETTINGS':
      return { ...state, settings: { ...state.settings, ...action.payload } };
    case 'SET_SESSION_START':
      return { ...state, sessionStart: action.payload };
    case 'LOAD':
      return action.payload;
    default:
      return state;
  }
}

const SESSION_MS: Record<SessionLimit, number> = {
  off: Infinity,
  '30m': 30 * 60 * 1000,
  '1h': 60 * 60 * 1000,
  '2h': 2 * 60 * 60 * 1000,
  '4h': 4 * 60 * 60 * 1000,
};

interface RGContextType extends RGState {
  updateSettings: (s: Partial<RGSettings>) => void;
  updateDepositCaps: (newCaps: DepositCap) => { immediate: boolean; pendingFields: string[] };
  cancelPendingIncrease: (field: 'daily' | 'weekly' | 'monthly') => void;
  setExclusion: (period: ExclusionPeriod) => void;
  clearExclusion: () => void;
  isExcluded: () => boolean;
  startSession: () => void;
  checkDepositAllowed: (amount: number, recentDeposits: number[]) => { allowed: boolean; reason?: string };
  sessionElapsedMs: () => number;
}

const RGContext = createContext<RGContextType | null>(null);

export function useRG() {
  const ctx = useContext(RGContext);
  if (!ctx) throw new Error('useRG must be inside RGProvider');
  return ctx;
}

const STORAGE_KEY = 'playarena_rg_settings';

export function RGProvider({ children, onSessionExpired }: { children: ReactNode; onSessionExpired: () => void }) {
  const [state, dispatch] = useReducer(rgReducer, {
    settings: DEFAULT_SETTINGS,
    sessionStart: null,
  });

  const onExpiredRef = useRef(onSessionExpired);
  onExpiredRef.current = onSessionExpired;
  const warnedRef = useRef(false);

  // Load from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as RGState;
        dispatch({ type: 'LOAD', payload: { ...parsed, sessionStart: null } });
      }
    } catch { /* ignore */ }
  }, []);

  // Check & apply mature pending limit increases
  useEffect(() => {
    const { pendingIncreases, depositCap } = state.settings;
    if (!pendingIncreases || pendingIncreases.length === 0) return;

    const now = Date.now();
    const ready = pendingIncreases.filter(p => new Date(p.effectiveAt).getTime() <= now);

    if (ready.length > 0) {
      const nextCap = { ...depositCap };
      ready.forEach(p => { nextCap[p.field] = p.newVal; });
      const remainingPending = pendingIncreases.filter(p => new Date(p.effectiveAt).getTime() > now);

      dispatch({
        type: 'SET_SETTINGS',
        payload: {
          depositCap: nextCap,
          pendingIncreases: remainingPending,
        },
      });
    }
  }, [state.settings]);

  // Persist settings
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch { /* ignore */ }
  }, [state]);

  // Session watchdog
  useEffect(() => {
    if (!state.sessionStart || state.settings.sessionLimit === 'off') return;
    const limitMs = SESSION_MS[state.settings.sessionLimit];

    const check = () => {
      if (!state.sessionStart) return;
      const elapsed = Date.now() - new Date(state.sessionStart).getTime();
      const remaining = limitMs - elapsed;

      if (remaining <= 0) {
        onExpiredRef.current();
      } else if (remaining <= 5 * 60 * 1000 && !warnedRef.current) {
        warnedRef.current = true;
        window.dispatchEvent(new CustomEvent('rg:session-warning', { detail: { remaining } }));
      }
    };

    const interval = setInterval(check, 10000);
    check();
    return () => clearInterval(interval);
  }, [state.sessionStart, state.settings.sessionLimit]);

  const updateSettings = useCallback((s: Partial<RGSettings>) => {
    dispatch({ type: 'SET_SETTINGS', payload: s });
  }, []);

  const updateDepositCaps = useCallback((newCaps: DepositCap): { immediate: boolean; pendingFields: string[] } => {
    const currentCaps = state.settings.depositCap;
    const currentPending = state.settings.pendingIncreases || [];

    const updatedCaps = { ...currentCaps };
    const newPending: PendingCapIncrease[] = [...currentPending];
    const pendingFields: string[] = [];

    (['daily', 'weekly', 'monthly'] as const).forEach(field => {
      const cur = currentCaps[field];
      const next = newCaps[field];

      if (next === undefined) return;

      if (cur === undefined || next <= cur) {
        // Immediate decrease or new setting
        updatedCaps[field] = next;
        // remove existing pending for this field
        const idx = newPending.findIndex(p => p.field === field);
        if (idx >= 0) newPending.splice(idx, 1);
      } else {
        // Upward increase -> 24h cooldown
        pendingFields.push(field);
        const idx = newPending.findIndex(p => p.field === field);
        const pendingItem: PendingCapIncrease = {
          field,
          newVal: next,
          effectiveAt: new Date(Date.now() + 24 * 3600000).toISOString(),
        };
        if (idx >= 0) {
          newPending[idx] = pendingItem;
        } else {
          newPending.push(pendingItem);
        }
      }
    });

    dispatch({
      type: 'SET_SETTINGS',
      payload: {
        depositCap: updatedCaps,
        pendingIncreases: newPending,
      },
    });

    return { immediate: pendingFields.length === 0, pendingFields };
  }, [state.settings]);

  const cancelPendingIncrease = useCallback((field: 'daily' | 'weekly' | 'monthly') => {
    dispatch({
      type: 'SET_SETTINGS',
      payload: {
        pendingIncreases: (state.settings.pendingIncreases || []).filter(p => p.field !== field),
      },
    });
  }, [state.settings]);

  const setExclusion = useCallback((period: ExclusionPeriod) => {
    let until: string;
    if (period === 'permanent') {
      until = 'permanent';
    } else {
      const ms = { '24h': 86400000, '7d': 7 * 86400000, '30d': 30 * 86400000 }[period];
      until = new Date(Date.now() + ms).toISOString();
    }
    dispatch({ type: 'SET_SETTINGS', payload: { exclusionUntil: until } });
  }, []);

  const clearExclusion = useCallback(() => {
    dispatch({ type: 'SET_SETTINGS', payload: { exclusionUntil: undefined } });
  }, []);

  const isExcluded = useCallback((): boolean => {
    const { exclusionUntil } = state.settings;
    if (!exclusionUntil) return false;
    if (exclusionUntil === 'permanent') return true;
    return Date.now() < new Date(exclusionUntil).getTime();
  }, [state.settings]);

  const startSession = useCallback(() => {
    warnedRef.current = false;
    dispatch({ type: 'SET_SESSION_START', payload: new Date().toISOString() });
  }, []);

  const checkDepositAllowed = useCallback((amount: number, recentDeposits: number[]): { allowed: boolean; reason?: string } => {
    const { depositCap } = state.settings;
    const [dayTotal = 0, weekTotal = 0, monthTotal = 0] = recentDeposits;

    if (depositCap.daily && dayTotal + amount > depositCap.daily) {
      const rem = Math.max(0, depositCap.daily - dayTotal);
      return { allowed: false, reason: `Daily limit ₹${depositCap.daily.toLocaleString()} exceeded. Remaining allowance: ₹${rem.toLocaleString()}` };
    }
    if (depositCap.weekly && weekTotal + amount > depositCap.weekly) {
      const rem = Math.max(0, depositCap.weekly - weekTotal);
      return { allowed: false, reason: `Weekly limit ₹${depositCap.weekly.toLocaleString()} exceeded. Remaining allowance: ₹${rem.toLocaleString()}` };
    }
    if (depositCap.monthly && monthTotal + amount > depositCap.monthly) {
      const rem = Math.max(0, depositCap.monthly - monthTotal);
      return { allowed: false, reason: `Monthly limit ₹${depositCap.monthly.toLocaleString()} exceeded. Remaining allowance: ₹${rem.toLocaleString()}` };
    }
    return { allowed: true };
  }, [state.settings]);

  const sessionElapsedMs = useCallback((): number => {
    if (!state.sessionStart) return 0;
    return Date.now() - new Date(state.sessionStart).getTime();
  }, [state.sessionStart]);

  return (
    <RGContext.Provider
      value={{
        ...state,
        updateSettings,
        updateDepositCaps,
        cancelPendingIncrease,
        setExclusion,
        clearExclusion,
        isExcluded,
        startSession,
        checkDepositAllowed,
        sessionElapsedMs,
      }}
    >
      {children}
    </RGContext.Provider>
  );
}
