import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { ReactNode } from 'react';
import { redisCache } from '../lib/redisCache';

export interface SlotGame {
  id: string;
  name: string;
  subtitle: string;
  emoji: string;
  reels: 3 | 5;
  symbols: string[]; // e.g. ['👑', '💎', '7️⃣', '🔔', '🍇', '🍒']
  paytable: {
    threeOfAKind: number; // e.g. 10x
    jackpot777: number;   // e.g. 100x
    twoOfAKind: number;   // e.g. 2x
  };
  minBet: number;
  maxBet: number;
  targetRtp: number;
  enabled: boolean;
  createdAt: string;
}

const DEFAULT_SLOTS: SlotGame[] = [
  {
    id: 'royal-gold-777',
    name: 'Royal Gold 777',
    subtitle: 'Classic 3-Reel Vegas Slot',
    emoji: '👑',
    reels: 3,
    symbols: ['7️⃣', '👑', '💎', '🔔', '🍒', '🍋'],
    paytable: {
      jackpot777: 100,
      threeOfAKind: 15,
      twoOfAKind: 2,
    },
    minBet: 10,
    maxBet: 1000,
    targetRtp: 95,
    enabled: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'dragon-fortune-5x',
    name: 'Dragon Fortune',
    subtitle: '5-Reel Mythic Video Slot',
    emoji: '🐉',
    reels: 5,
    symbols: ['🐉', '👑', '💎', '🔥', '🔮', '🧧', '🪙'],
    paytable: {
      jackpot777: 250,
      threeOfAKind: 25,
      twoOfAKind: 3,
    },
    minBet: 50,
    maxBet: 2500,
    targetRtp: 94,
    enabled: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'mega-fruit-party',
    name: 'Mega Fruit Party',
    subtitle: '3-Reel Arcade Juicy Spins',
    emoji: '🍓',
    reels: 3,
    symbols: ['🍓', '🍉', '🍇', '🍌', '🍒', '🍋'],
    paytable: {
      jackpot777: 75,
      threeOfAKind: 12,
      twoOfAKind: 1.8,
    },
    minBet: 10,
    maxBet: 500,
    targetRtp: 96,
    enabled: true,
    createdAt: new Date().toISOString(),
  },
];

interface SlotContextType {
  slots: SlotGame[];
  activeSlot: SlotGame;
  setActiveSlotId: (id: string) => void;
  createSlot: (newSlot: Omit<SlotGame, 'id' | 'createdAt'>) => void;
  updateSlot: (id: string, updates: Partial<SlotGame>) => void;
  deleteSlot: (id: string) => void;
  toggleSlotStatus: (id: string) => void;
}

const SlotContext = createContext<SlotContextType | undefined>(undefined);

const STORAGE_KEY = 'playarena_custom_slots';

export function SlotProvider({ children }: { children: ReactNode }) {
  const [slots, setSlots] = useState<SlotGame[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch {
      // fallback
    }
    return DEFAULT_SLOTS;
  });

  const [activeSlotId, setActiveSlotId] = useState<string>(DEFAULT_SLOTS[0].id);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(slots));
    redisCache.set('slots:configs', slots);
  }, [slots]);

  const activeSlot = slots.find(s => s.id === activeSlotId) || slots[0] || DEFAULT_SLOTS[0];

  const createSlot = useCallback((slotData: Omit<SlotGame, 'id' | 'createdAt'>) => {
    const newSlot: SlotGame = {
      ...slotData,
      id: `slot_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      createdAt: new Date().toISOString(),
    };
    setSlots(prev => [newSlot, ...prev]);
  }, []);

  const updateSlot = useCallback((id: string, updates: Partial<SlotGame>) => {
    setSlots(prev => prev.map(s => (s.id === id ? { ...s, ...updates } : s)));
  }, []);

  const deleteSlot = useCallback((id: string) => {
    setSlots(prev => prev.filter(s => s.id !== id));
  }, []);

  const toggleSlotStatus = useCallback((id: string) => {
    setSlots(prev => prev.map(s => (s.id === id ? { ...s, enabled: !s.enabled } : s)));
  }, []);

  return (
    <SlotContext.Provider
      value={{
        slots,
        activeSlot,
        setActiveSlotId,
        createSlot,
        updateSlot,
        deleteSlot,
        toggleSlotStatus,
      }}
    >
      {children}
    </SlotContext.Provider>
  );
}

export function useSlots() {
  const context = useContext(SlotContext);
  if (!context) {
    throw new Error('useSlots must be used within a SlotProvider');
  }
  return context;
}
