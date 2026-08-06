/**
 * Responsible Gaming Context
 * Handles: deposit caps, self-exclusion, session limits, 2FA, reality checks
 */
import { createContext, useContext, useReducer, useCallback, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';

export type SessionLimit = 'off' | '30m' | '1h' | '2h' | '4h';
export type ExclusionPeriod = '24h' | '7d' | '30d' | 'permanent';

export interface DepositCap {
  daily?: number;
  weekly?: number;
  monthly?: number;
}

export interface RGSettings {
  sessionLimit: SessionLimit;
  twoFAEnabled: boolean;
  depositCap: DepositCap;
  exclusionUntil?: string; // ISO timestamp, 'permanent' string, or undefined
  realityCheckHours: number; // 0 = off
}

const DEFAULT_SETTINGS: RGSettings = {
  sessionLimit: 'off',
  twoFAEnabled: false,
  depositCap: {},
  realityCheckHours: 0,
};

interface RGState {
  settings: RGSettings;
  sessionStart: string | null; // ISO timestamp when session started
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
  setExclusion: (period: ExclusionPeriod) => void;
  clearExclusion: () => void;
  isExcluded: () => boolean;
  startSession: () => void;
  checkDepositAllowed: (amount: number, deposits: number[]) => { allowed: boolean; reason?: string };
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
        // Fire a custom DOM event that the SessionWarningBanner listens to
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

    // For demo: recentDeposits are amounts in order [today, thisWeek, thisMonth]
    const [dayTotal = 0, weekTotal = 0, monthTotal = 0] = recentDeposits;

    if (depositCap.daily && dayTotal + amount > depositCap.daily) {
      return { allowed: false, reason: `Daily limit ₹${depositCap.daily} reached. Used: ₹${dayTotal}` };
    }
    if (depositCap.weekly && weekTotal + amount > depositCap.weekly) {
      return { allowed: false, reason: `Weekly limit ₹${depositCap.weekly} reached. Used: ₹${weekTotal}` };
    }
    if (depositCap.monthly && monthTotal + amount > depositCap.monthly) {
      return { allowed: false, reason: `Monthly limit ₹${depositCap.monthly} reached. Used: ₹${monthTotal}` };
    }
    return { allowed: true };
  }, [state.settings]);

  const sessionElapsedMs = useCallback((): number => {
    if (!state.sessionStart) return 0;
    return Date.now() - new Date(state.sessionStart).getTime();
  }, [state.sessionStart]);

  return (
    <RGContext.Provider value={{ ...state, updateSettings, setExclusion, clearExclusion, isExcluded, startSession, checkDepositAllowed, sessionElapsedMs }}>
      {children}
    </RGContext.Provider>
  );
}
