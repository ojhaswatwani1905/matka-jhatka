import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { ReactNode } from 'react';

export type RigMode = 'fair' | 'house_profit' | 'player_boost';

export interface GameControlSettings {
  globalRtp: number; // 50 to 99 (%)
  rigMode: RigMode;
  firstBetWinGuarantee: boolean; // Guarantee 1st bet win for new users
  zeroLossShield: boolean; // Prevent house payouts from exceeding net profit
  aviator: {
    maxCrash: number; // e.g. 10x or 100x
    instantCrashRate: number; // % chance of crash at 1.00x (0 to 25%)
  };
  mines: {
    bombBias: number; // -30 to +30 % modifier on mine hit rate
  };
  winGo: {
    housePoolBias: boolean; // if true, pick color/number with lowest user payout
  };
  teenPatti: {
    houseWinBoost: number; // 0 to 50 % boost to dealer win chance
  };
  oceanHunter: {
    catchRate: number; // 0.5x to 2.0x difficulty multiplier
  };
  plinko: {
    highMultWeight: number; // 0.2x to 3.0x weight for high multiplier slots
  };
}

const DEFAULT_SETTINGS: GameControlSettings = {
  globalRtp: 85, // 15% Guaranteed House Net Profit Margin
  rigMode: 'house_profit',
  firstBetWinGuarantee: true,
  zeroLossShield: true,
  aviator: {
    maxCrash: 15,
    instantCrashRate: 8,
  },
  mines: {
    bombBias: 15,
  },
  winGo: {
    housePoolBias: true, // Always select outcome with lowest user payout for max admin profit
  },
  teenPatti: {
    houseWinBoost: 25,
  },
  oceanHunter: {
    catchRate: 0.75,
  },
  plinko: {
    highMultWeight: 0.5,
  },
};

interface GameControlContextType {
  settings: GameControlSettings;
  updateSettings: (newSettings: Partial<GameControlSettings>) => void;
  updateGameSetting: <K extends keyof GameControlSettings>(
    game: K,
    config: Partial<GameControlSettings[K]>
  ) => void;
  applyPreset: (preset: 'fair' | 'house_profit' | 'player_boost') => void;
  checkIsFirstBet: () => boolean;
  consumeFirstBet: () => void;
  recordBetResult: (betAmount: number, payoutAmount: number) => void;
  houseNetReserve: number;
  manualOverrides: Record<string, { digit: number; period?: string }>;
  setManualOverrideForGame: (gameType: string, digit: number, period?: string) => void;
  getManualOverrideForGame: (gameType: string) => number | undefined;
  clearManualOverrideForGame: (gameType: string) => void;
}

const GameControlContext = createContext<GameControlContextType | undefined>(undefined);

const STORAGE_KEY = 'playarena_game_control';
const FIRST_BET_KEY = 'playarena_first_bet_completed';
const RESERVE_KEY = 'playarena_house_reserve';
const MANUAL_OVERRIDES_KEY = 'playarena_manual_overrides';

export function GameControlProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<GameControlSettings>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        return { ...DEFAULT_SETTINGS, ...JSON.parse(saved) };
      }
    } catch {
      // fallback
    }
    return DEFAULT_SETTINGS;
  });

  const [manualOverrides, setManualOverrides] = useState<Record<string, { digit: number; period?: string }>>(() => {
    try {
      const saved = localStorage.getItem(MANUAL_OVERRIDES_KEY);
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const [hasCompletedFirstBet, setHasCompletedFirstBet] = useState<boolean>(() => {
    return localStorage.getItem(FIRST_BET_KEY) === 'true';
  });

  const [houseNetReserve, setHouseNetReserve] = useState<number>(() => {
    const saved = localStorage.getItem(RESERVE_KEY);
    return saved ? parseFloat(saved) : 250000; // default initial house reserve pool
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  }, [settings]);

  useEffect(() => {
    localStorage.setItem(RESERVE_KEY, houseNetReserve.toString());
  }, [houseNetReserve]);

  useEffect(() => {
    localStorage.setItem(MANUAL_OVERRIDES_KEY, JSON.stringify(manualOverrides));
  }, [manualOverrides]);

  const updateSettings = (partial: Partial<GameControlSettings>) => {
    setSettings(prev => ({ ...prev, ...partial }));
  };

  const setManualOverrideForGame = useCallback((gameType: string, digit: number, period?: string) => {
    setManualOverrides(prev => ({
      ...prev,
      [gameType]: { digit, period },
    }));
  }, []);

  const getManualOverrideForGame = useCallback((gameType: string): number | undefined => {
    const override = manualOverrides[gameType];
    return override?.digit;
  }, [manualOverrides]);

  const clearManualOverrideForGame = useCallback((gameType: string) => {
    setManualOverrides(prev => {
      const next = { ...prev };
      delete next[gameType];
      return next;
    });
  }, []);

  const updateGameSetting = <K extends keyof GameControlSettings>(
    game: K,
    config: Partial<GameControlSettings[K]>
  ) => {
    setSettings(prev => ({
      ...prev,
      [game]: typeof prev[game] === 'object' ? { ...prev[game], ...config } : config,
    }));
  };

  const applyPreset = (preset: 'fair' | 'house_profit' | 'player_boost') => {
    if (preset === 'fair') {
      setSettings(prev => ({
        ...prev,
        globalRtp: 95,
        rigMode: 'fair',
        aviator: { maxCrash: 100, instantCrashRate: 2 },
        mines: { bombBias: 0 },
        winGo: { housePoolBias: false },
        teenPatti: { houseWinBoost: 0 },
        oceanHunter: { catchRate: 1.0 },
        plinko: { highMultWeight: 1.0 },
      }));
    } else if (preset === 'house_profit') {
      setSettings(prev => ({
        ...prev,
        globalRtp: 75,
        rigMode: 'house_profit',
        aviator: { maxCrash: 8, instantCrashRate: 12 },
        mines: { bombBias: 20 },
        winGo: { housePoolBias: true },
        teenPatti: { houseWinBoost: 35 },
        oceanHunter: { catchRate: 0.6 },
        plinko: { highMultWeight: 0.3 },
      }));
    } else if (preset === 'player_boost') {
      setSettings(prev => ({
        ...prev,
        globalRtp: 98,
        rigMode: 'player_boost',
        aviator: { maxCrash: 200, instantCrashRate: 0 },
        mines: { bombBias: -20 },
        winGo: { housePoolBias: false },
        teenPatti: { houseWinBoost: -20 },
        oceanHunter: { catchRate: 1.6 },
        plinko: { highMultWeight: 2.0 },
      }));
    }
  };

  const checkIsFirstBet = useCallback(() => {
    if (!settings.firstBetWinGuarantee) return false;
    return !hasCompletedFirstBet;
  }, [settings.firstBetWinGuarantee, hasCompletedFirstBet]);

  const consumeFirstBet = useCallback(() => {
    setHasCompletedFirstBet(true);
    localStorage.setItem(FIRST_BET_KEY, 'true');
  }, []);

  const recordBetResult = useCallback((betAmount: number, payoutAmount: number) => {
    setHouseNetReserve(prev => Math.max(0, prev + betAmount - payoutAmount));
  }, []);

  return (
    <GameControlContext.Provider
      value={{
        settings,
        updateSettings,
        updateGameSetting,
        applyPreset,
        checkIsFirstBet,
        consumeFirstBet,
        recordBetResult,
        houseNetReserve,
        manualOverrides,
        setManualOverrideForGame,
        getManualOverrideForGame,
        clearManualOverrideForGame,
      }}
    >
      {children}
    </GameControlContext.Provider>
  );
}

export function useGameControl() {
  const context = useContext(GameControlContext);
  if (!context) {
    throw new Error('useGameControl must be used within a GameControlProvider');
  }
  return context;
}

