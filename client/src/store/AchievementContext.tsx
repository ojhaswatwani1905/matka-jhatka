import { createContext, useContext, useReducer, useCallback, useEffect } from 'react';
import type { ReactNode } from 'react';

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  target: number;        // target value to reach
  progress: number;      // current progress
  unlocked: boolean;
  unlockedAt?: string;
  reward: number;        // bonus coins on unlock
}

const ACHIEVEMENT_DEFINITIONS: Omit<Achievement, 'progress' | 'unlocked' | 'unlockedAt'>[] = [
  { id: 'first_deposit',   title: 'First Deposit',       description: 'Make your first deposit',                icon: '💰', target: 1,   reward: 500  },
  { id: 'first_win',       title: 'First Win',           description: 'Win your first game round',              icon: '🏆', target: 1,   reward: 200  },
  { id: 'win_10',          title: 'On a Roll',           description: 'Win 10 game rounds',                     icon: '🎯', target: 10,  reward: 1000 },
  { id: 'win_50',          title: 'Veteran Winner',      description: 'Win 50 game rounds',                     icon: '👑', target: 50,  reward: 5000 },
  { id: 'play_5_games',    title: 'Game Explorer',       description: 'Play 5 different games',                 icon: '🎮', target: 5,   reward: 750  },
  { id: 'streak_7',        title: '7-Day Streak',        description: 'Log in 7 days in a row',                icon: '🔥', target: 7,   reward: 2000 },
  { id: 'big_win',         title: 'Big Win',             description: 'Win ₹5,000 or more in a single round',  icon: '💎', target: 5000, reward: 1500 },
];

interface AchievementState {
  achievements: Achievement[];
}

type AchievementAction =
  | { type: 'SET'; payload: Achievement[] }
  | { type: 'UPDATE_PROGRESS'; payload: { id: string; progress: number; unlocked?: boolean } };

function achReducer(state: AchievementState, action: AchievementAction): AchievementState {
  switch (action.type) {
    case 'SET':
      return { achievements: action.payload };
    case 'UPDATE_PROGRESS':
      return {
        achievements: state.achievements.map(a =>
          a.id === action.payload.id
            ? { ...a, progress: action.payload.progress, unlocked: action.payload.unlocked ?? a.unlocked, unlockedAt: (action.payload.unlocked && !a.unlocked) ? new Date().toISOString() : a.unlockedAt }
            : a
        ),
      };
    default:
      return state;
  }
}

interface AchievementContextType extends AchievementState {
  trackEvent: (event: AchievementEvent) => Achievement[];  // returns newly unlocked achievements
  isUnlocked: (id: string) => boolean;
  getProgress: (id: string) => number;
}

export type AchievementEvent =
  | { type: 'deposit' }
  | { type: 'win'; amount: number; gameName?: string }
  | { type: 'play_game'; gameName: string }
  | { type: 'login_streak'; days: number };

const AchievementContext = createContext<AchievementContextType | null>(null);

export function useAchievements() {
  const ctx = useContext(AchievementContext);
  if (!ctx) throw new Error('useAchievements must be inside AchievementProvider');
  return ctx;
}

const STORAGE_KEY = 'playarena_achievements';
const GAMES_PLAYED_KEY = 'playarena_games_played';

function initAchievements(saved: string | null): Achievement[] {
  const defaults: Achievement[] = ACHIEVEMENT_DEFINITIONS.map(d => ({ ...d, progress: 0, unlocked: false }));
  if (!saved) return defaults;
  try {
    const parsed: Achievement[] = JSON.parse(saved);
    // Merge saved with definitions (handles new achievements added later)
    return defaults.map(d => parsed.find(p => p.id === d.id) ?? d);
  } catch {
    return defaults;
  }
}

export function AchievementProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(achReducer, { achievements: initAchievements(null) });

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    dispatch({ type: 'SET', payload: initAchievements(saved) });
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state.achievements));
    } catch { /* ignore */ }
  }, [state.achievements]);

  const trackEvent = useCallback((event: AchievementEvent): Achievement[] => {
    const newlyUnlocked: Achievement[] = [];

    // We need to read current achievements from state
    // Since this runs synchronously, we'll do it all in one pass
    const updates: { id: string; progress: number; unlocked: boolean }[] = [];

    // We'll use a ref-like approach — read from state.achievements directly
    state.achievements.forEach(a => {
      if (a.unlocked) return;
      let newProgress = a.progress;

      if (event.type === 'deposit' && a.id === 'first_deposit') {
        newProgress = 1;
      } else if (event.type === 'win') {
        if (a.id === 'first_win') newProgress = 1;
        if (a.id === 'win_10') newProgress = Math.min(a.target, a.progress + 1);
        if (a.id === 'win_50') newProgress = Math.min(a.target, a.progress + 1);
        if (a.id === 'big_win' && event.amount >= 5000) newProgress = event.amount;
      } else if (event.type === 'play_game' && a.id === 'play_5_games') {
        // Track unique games
        try {
          const gamesSet: string[] = JSON.parse(localStorage.getItem(GAMES_PLAYED_KEY) || '[]');
          if (!gamesSet.includes(event.gameName)) {
            gamesSet.push(event.gameName);
            localStorage.setItem(GAMES_PLAYED_KEY, JSON.stringify(gamesSet));
          }
          newProgress = Math.min(a.target, gamesSet.length);
        } catch { newProgress = a.progress; }
      } else if (event.type === 'login_streak' && a.id === 'streak_7') {
        newProgress = Math.min(a.target, event.days);
      }

      if (newProgress !== a.progress) {
        const unlocked = newProgress >= a.target;
        if (unlocked) newlyUnlocked.push({ ...a, progress: newProgress, unlocked: true });
        updates.push({ id: a.id, progress: newProgress, unlocked });
      }
    });

    updates.forEach(u => dispatch({ type: 'UPDATE_PROGRESS', payload: u }));
    return newlyUnlocked;
  }, [state.achievements]);

  const isUnlocked = useCallback((id: string) => state.achievements.find(a => a.id === id)?.unlocked ?? false, [state.achievements]);
  const getProgress = useCallback((id: string) => state.achievements.find(a => a.id === id)?.progress ?? 0, [state.achievements]);

  return (
    <AchievementContext.Provider value={{ ...state, trackEvent, isUnlocked, getProgress }}>
      {children}
    </AchievementContext.Provider>
  );
}
