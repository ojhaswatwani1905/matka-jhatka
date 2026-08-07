import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';

export type RigMode = 'fair' | 'house_profit' | 'player_boost';

export interface GameControlSettings {
  globalRtp: number; // 50 to 99 (%)
  rigMode: RigMode;
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
  globalRtp: 92,
  rigMode: 'fair',
  aviator: {
    maxCrash: 50,
    instantCrashRate: 3,
  },
  mines: {
    bombBias: 0,
  },
  winGo: {
    housePoolBias: false,
  },
  teenPatti: {
    houseWinBoost: 0,
  },
  oceanHunter: {
    catchRate: 1.0,
  },
  plinko: {
    highMultWeight: 1.0,
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
}

const GameControlContext = createContext<GameControlContextType | undefined>(undefined);

const STORAGE_KEY = 'playarena_game_control';

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

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  }, [settings]);

  const updateSettings = (partial: Partial<GameControlSettings>) => {
    setSettings(prev => ({ ...prev, ...partial }));
  };

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
      setSettings({
        globalRtp: 95,
        rigMode: 'fair',
        aviator: { maxCrash: 100, instantCrashRate: 2 },
        mines: { bombBias: 0 },
        winGo: { housePoolBias: false },
        teenPatti: { houseWinBoost: 0 },
        oceanHunter: { catchRate: 1.0 },
        plinko: { highMultWeight: 1.0 },
      });
    } else if (preset === 'house_profit') {
      setSettings({
        globalRtp: 75,
        rigMode: 'house_profit',
        aviator: { maxCrash: 8, instantCrashRate: 12 },
        mines: { bombBias: 20 },
        winGo: { housePoolBias: true },
        teenPatti: { houseWinBoost: 35 },
        oceanHunter: { catchRate: 0.6 },
        plinko: { highMultWeight: 0.3 },
      });
    } else if (preset === 'player_boost') {
      setSettings({
        globalRtp: 98,
        rigMode: 'player_boost',
        aviator: { maxCrash: 200, instantCrashRate: 0 },
        mines: { bombBias: -20 },
        winGo: { housePoolBias: false },
        teenPatti: { houseWinBoost: -20 },
        oceanHunter: { catchRate: 1.6 },
        plinko: { highMultWeight: 2.0 },
      });
    }
  };

  return (
    <GameControlContext.Provider
      value={{
        settings,
        updateSettings,
        updateGameSetting,
        applyPreset,
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
