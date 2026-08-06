/**
 * LiveFeedContext — simulated real-time bets across all games
 */
import { createContext, useContext, useReducer, useEffect, useCallback, useRef } from 'react';
import type { ReactNode } from 'react';

export interface LiveBetEntry {
  id: string;
  user: string;
  game: string;
  gameIcon: string;
  betAmount: number;
  result: 'pending' | 'won' | 'lost';
  winAmount?: number;
  multiplier?: number;
  timestamp: number;
}

const GAMES = [
  { name: 'Aviator',          icon: '✈️', minBet: 50,   maxBet: 2000, minMult: 1.2, maxMult: 10  },
  { name: 'Mines',            icon: '💣', minBet: 20,   maxBet: 1000, minMult: 1.3, maxMult: 8   },
  { name: 'Plinko',           icon: '🪙', minBet: 50,   maxBet: 1500, minMult: 0.5, maxMult: 16  },
  { name: 'Teen Patti',       icon: '🃏', minBet: 100,  maxBet: 5000, minMult: 1.8, maxMult: 3.5 },
  { name: 'WinGo',            icon: '🎨', minBet: 10,   maxBet: 500,  minMult: 2.0, maxMult: 9.0 },
  { name: 'Matka Jhatka',     icon: '🎲', minBet: 10,   maxBet: 500,  minMult: 9.0, maxMult: 90  },
  { name: 'Lottery 5D',       icon: '🎟️', minBet: 10,   maxBet: 200,  minMult: 2.0, maxMult: 500 },
  { name: 'Color Prediction', icon: '🟢', minBet: 10,   maxBet: 1000, minMult: 1.5, maxMult: 9.0 },
];

const MOCK_USERS = [
  'Raj***91', 'Priya***42', 'Amit***77', 'Sona***15', 'Vikram***33',
  'Neha***08', 'Rohit***66', 'Deepa***22', 'Karan***55', 'Pooja***81',
  'Arjun***10', 'Kavya***37', 'Shan***48', 'Riya***62', 'Dev***19',
];

function rnd(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function genEntry(): LiveBetEntry {
  const g = GAMES[Math.floor(Math.random() * GAMES.length)];
  const bet = rnd(g.minBet, g.maxBet);
  const won = Math.random() > 0.42; // 58% win rate feels realistic
  const mult = won ? parseFloat((g.minMult + Math.random() * (g.maxMult - g.minMult)).toFixed(2)) : 0;
  return {
    id: `lf_${Date.now()}_${Math.random().toString(36).slice(2)}`,
    user: MOCK_USERS[Math.floor(Math.random() * MOCK_USERS.length)],
    game: g.name,
    gameIcon: g.icon,
    betAmount: bet,
    result: won ? 'won' : 'lost',
    winAmount: won ? Math.round(bet * mult) : undefined,
    multiplier: won ? mult : undefined,
    timestamp: Date.now(),
  };
}

interface LiveFeedState {
  entries: LiveBetEntry[];
}

type LiveFeedAction =
  | { type: 'ADD'; payload: LiveBetEntry }
  | { type: 'PREPEND_MANY'; payload: LiveBetEntry[] };

function feedReducer(state: LiveFeedState, action: LiveFeedAction): LiveFeedState {
  switch (action.type) {
    case 'ADD':
      return { entries: [action.payload, ...state.entries].slice(0, 150) };
    case 'PREPEND_MANY':
      return { entries: [...action.payload, ...state.entries].slice(0, 150) };
    default:
      return state;
  }
}

interface LiveFeedContextType extends LiveFeedState {
  addEntry: (e: Omit<LiveBetEntry, 'id' | 'timestamp'>) => void;
}

const LiveFeedContext = createContext<LiveFeedContextType | null>(null);

export function useLiveFeed() {
  const ctx = useContext(LiveFeedContext);
  if (!ctx) throw new Error('useLiveFeed must be inside LiveFeedProvider');
  return ctx;
}

export function LiveFeedProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(feedReducer, {
    entries: Array.from({ length: 20 }, genEntry), // pre-populate
  });

  // Simulate real-time activity: add 1–2 entries every 1.5–4 seconds
  useEffect(() => {
    const tick = () => {
      const count = Math.random() > 0.65 ? 2 : 1;
      if (count === 2) {
        dispatch({ type: 'PREPEND_MANY', payload: [genEntry(), genEntry()] });
      } else {
        dispatch({ type: 'ADD', payload: genEntry() });
      }
    };

    const schedule = () => {
      const delay = 1500 + Math.random() * 2500;
      return setTimeout(() => { tick(); schedule(); }, delay);
    };

    const timer = schedule();
    return () => clearTimeout(timer);
  }, []);

  const addEntry = useCallback((e: Omit<LiveBetEntry, 'id' | 'timestamp'>) => {
    dispatch({
      type: 'ADD',
      payload: { ...e, id: `lf_${Date.now()}_${Math.random().toString(36).slice(2)}`, timestamp: Date.now() },
    });
  }, []);

  return (
    <LiveFeedContext.Provider value={{ ...state, addEntry }}>
      {children}
    </LiveFeedContext.Provider>
  );
}
