import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { ReactNode } from 'react';
import { redisCache } from '../lib/redisCache';

export interface SlotGame {
  id: string;
  name: string;
  subtitle: string;
  emoji: string;
  reels: 3 | 5;
  symbols: string[];
  banner_image?: string;
  slot_image?: string;
  symbolColors?: Record<string, string>;
  paytable: {
    threeOfAKind: number;
    jackpot777: number;
    twoOfAKind: number;
  };
  minBet: number;
  maxBet: number;
  targetRtp: number;
  enabled: boolean;
  totalWagered: number;
  totalPaidOut: number;
  createdAt: string;
}

const DEFAULT_SLOTS: SlotGame[] = [
  {
    id: 'mega-4x4-slots',
    name: 'Mega 4x4 Slots',
    subtitle: 'Dynamic Avalanche 5-Reel Slot',
    emoji: '🎰',
    reels: 5,
    banner_image: '/slots/back.png',
    slot_image: '/slots/k.png',
    symbols: ['/slots/k.png', '/slots/lag.png', '/slots/lam.png', '/slots/neck.png', '/slots/download.png', '/slots/back.png', '/slots/boobs.png'],
    symbolColors: {
      '/slots/k.png': '#ffd700',
      '/slots/lag.png': '#ff0000',
      '/slots/lam.png': '#0000ff',
      '/slots/neck.png': '#ffffff',
      '/slots/download.png': '#00ff00',
      '/slots/back.png': '#999999',
      '/slots/boobs.png': '#ff66cc',
    },
    paytable: {
      jackpot777: 200,
      threeOfAKind: 20,
      twoOfAKind: 2,
    },
    minBet: 10,
    maxBet: 2000,
    targetRtp: 94,
    enabled: true,
    totalWagered: 320000,
    totalPaidOut: 300800,
    createdAt: new Date().toISOString(),
  },
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
    totalWagered: 148500,
    totalPaidOut: 139100,
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
    totalWagered: 284000,
    totalPaidOut: 266960,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'mega-fruit-party',
    name: 'Mega Fruit Party',
    subtitle: '3-Reel Arcade Juicy Spins',
    emoji: '🍓',
    reels: 3,
    symbols: ['⭐', '🍓', '🍉', '🍇', '🍌', '🍒'],
    paytable: {
      jackpot777: 75,
      threeOfAKind: 12,
      twoOfAKind: 1.8,
    },
    minBet: 10,
    maxBet: 500,
    targetRtp: 96,
    enabled: true,
    totalWagered: 95400,
    totalPaidOut: 91584,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'diamond-deluxe',
    name: 'Diamond Deluxe',
    subtitle: '3-Reel Gem Deluxe Classic',
    emoji: '💎',
    reels: 3,
    symbols: ['💎', '👑', '🔮', '✨', '💙', '💍'],
    paytable: {
      jackpot777: 150,
      threeOfAKind: 20,
      twoOfAKind: 2.5,
    },
    minBet: 20,
    maxBet: 1500,
    targetRtp: 95,
    enabled: true,
    totalWagered: 112000,
    totalPaidOut: 106400,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'wild-safari',
    name: 'Wild Safari',
    subtitle: '5-Reel Mythic Safari Video Slot',
    emoji: '🦁',
    reels: 5,
    symbols: ['🦁', '🐘', '🦏', '🦒', '🦓', '🃏'],
    paytable: {
      jackpot777: 300,
      threeOfAKind: 30,
      twoOfAKind: 3.5,
    },
    minBet: 50,
    maxBet: 3000,
    targetRtp: 94,
    enabled: true,
    totalWagered: 198000,
    totalPaidOut: 186120,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'golden-pharaoh',
    name: 'Golden Pharaoh',
    subtitle: '5-Reel Flagship Egyptian Slot',
    emoji: '𓀾',
    reels: 5,
    symbols: ['𓀾', '👁️', '𓆣', '🪙', '🏺', '📜', '✨'],
    paytable: {
      jackpot777: 500,
      threeOfAKind: 50,
      twoOfAKind: 5,
    },
    minBet: 100,
    maxBet: 5000,
    targetRtp: 93,
    enabled: true,
    totalWagered: 450000,
    totalPaidOut: 418500,
    createdAt: new Date().toISOString(),
  },
];

interface SlotContextType {
  slots: SlotGame[];
  activeSlot: SlotGame;
  setActiveSlotId: (id: string) => void;
  createSlot: (newSlot: Omit<SlotGame, 'id' | 'createdAt' | 'totalWagered' | 'totalPaidOut'>) => void;
  updateSlot: (id: string, updates: Partial<SlotGame>) => void;
  deleteSlot: (id: string) => void;
  toggleSlotStatus: (id: string) => void;
  recordWagerAndPayout: (id: string, wagered: number, payout: number) => void;
}

const SlotContext = createContext<SlotContextType | undefined>(undefined);

const STORAGE_KEY = 'playarena_custom_slots_v2';

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

  const createSlot = useCallback((slotData: Omit<SlotGame, 'id' | 'createdAt' | 'totalWagered' | 'totalPaidOut'>) => {
    const newSlot: SlotGame = {
      ...slotData,
      id: `slot_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      totalWagered: 0,
      totalPaidOut: 0,
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

  const recordWagerAndPayout = useCallback((id: string, wagered: number, payout: number) => {
    setSlots(prev =>
      prev.map(s =>
        s.id === id
          ? { ...s, totalWagered: s.totalWagered + wagered, totalPaidOut: s.totalPaidOut + payout }
          : s
      )
    );
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
        recordWagerAndPayout,
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
