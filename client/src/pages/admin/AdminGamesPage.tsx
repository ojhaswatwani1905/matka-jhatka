import { useState } from 'react';
import { motion } from 'framer-motion';
import { Settings, Power, Clock, ChevronDown, ChevronUp, Shield } from 'lucide-react';
import { useToast } from '../../components/ui/Toast';

interface GameConfig {
  id: string;
  name: string;
  emoji: string;
  enabled: boolean;
  timerDuration?: number; // seconds
  odds: { label: string; key: string; value: number; description: string }[];
  commitHash?: string;
}

const DEFAULT_CONFIGS: GameConfig[] = [
  {
    id: 'color-prediction',
    name: 'Color Prediction / WinGo',
    emoji: '🎨',
    enabled: true,
    timerDuration: 60,
    commitHash: '8f9a3b2c1d0e4f5a6b7c8d9e0f1a2b3c...',
    odds: [
      { label: 'Green', key: 'green', value: 2.0, description: 'Payout for correct color' },
      { label: 'Red', key: 'red', value: 2.0, description: 'Payout for correct color' },
      { label: 'Violet', key: 'violet', value: 4.5, description: 'Payout for violet' },
      { label: 'Big', key: 'big', value: 2.0, description: 'Payout for big (5–9)' },
      { label: 'Small', key: 'small', value: 2.0, description: 'Payout for small (0–4)' },
      { label: 'Single Number', key: 'number', value: 9.0, description: 'Exact number match' },
    ],
  },
  {
    id: 'matka',
    name: 'Matka Jhatka',
    emoji: '🎲',
    enabled: true,
    commitHash: '7a8b9c1d2e3f4a5b6c7d8e9f0a1b2c3d...',
    odds: [
      { label: 'Single', key: 'single', value: 9.0, description: '1 digit (0–9)' },
      { label: 'Jodi', key: 'jodi', value: 90.0, description: '2-digit pair' },
      { label: 'Patti', key: 'patti', value: 900.0, description: '3-digit combo' },
    ],
  },
  {
    id: 'lottery',
    name: 'Lottery 5D',
    emoji: '🎫',
    enabled: true,
    commitHash: 'a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6...',
    odds: [
      { label: 'All 6 Match', key: 'jackpot', value: 10000.0, description: 'Jackpot payout' },
      { label: '5 Match', key: 'five', value: 500.0, description: '5 correct numbers' },
      { label: '4 Match', key: 'four', value: 50.0, description: '4 correct numbers' },
      { label: '3 Match', key: 'three', value: 10.0, description: '3 correct numbers' },
    ],
  },
  {
    id: 'ocean-hunter',
    name: 'Ocean Hunter',
    emoji: '🌊',
    enabled: false,
    commitHash: '—',
    odds: [
      { label: 'Base RTP', key: 'rtp', value: 96.0, description: 'Return to player (%)' },
    ],
  },
];

const TIMER_OPTIONS = [
  { label: '1 Min', value: 60 },
  { label: '3 Min', value: 180 },
  { label: '5 Min', value: 300 },
];

function loadConfigs(): GameConfig[] {
  const saved = localStorage.getItem('playarena_game_config');
  if (saved) {
    try { return JSON.parse(saved); } catch { /* fallback */ }
  }
  return DEFAULT_CONFIGS;
}

export default function AdminGamesPage() {
  const { addToast } = useToast();
  const [configs, setConfigs] = useState<GameConfig[]>(loadConfigs);
  const [expanded, setExpanded] = useState<string | null>('color-prediction');

  const saveConfigs = (updated: GameConfig[]) => {
    setConfigs(updated);
    localStorage.setItem('playarena_game_config', JSON.stringify(updated));
    addToast({ type: 'success', title: 'Game config saved', message: 'Changes applied immediately.' });
  };

  const toggleGame = (id: string) => {
    const updated = configs.map(g => g.id === id ? { ...g, enabled: !g.enabled } : g);
    saveConfigs(updated);
  };

  const updateOdd = (gameId: string, key: string, value: number) => {
    const updated = configs.map(g =>
      g.id === gameId
        ? { ...g, odds: g.odds.map(o => o.key === key ? { ...o, value } : o) }
        : g
    );
    setConfigs(updated);
  };

  const updateTimer = (gameId: string, value: number) => {
    const updated = configs.map(g => g.id === gameId ? { ...g, timerDuration: value } : g);
    setConfigs(updated);
  };

  const applyChanges = (gameId: string) => {
    localStorage.setItem('playarena_game_config', JSON.stringify(configs));
    addToast({ type: 'success', title: 'Changes applied', message: `Game config for ${configs.find(g => g.id === gameId)?.name} saved.` });
  };

  return (
    <div className="space-y-5 max-w-4xl pt-4">
      <div>
        <h1 className="text-2xl font-black text-[#E8C97A] font-heading flex items-center gap-2.5">
          <Settings className="w-6 h-6" /> Game Control
        </h1>
        <p className="text-xs text-[rgba(212,175,55,0.5)] mt-1">Manage game odds, status, and round timers</p>
      </div>

      <div className="space-y-3">
        {configs.map(game => (
          <motion.div
            key={game.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="royal-panel rounded-2xl overflow-hidden"
          >
            {/* Game header */}
            <div
              className="flex items-center gap-3 p-4 cursor-pointer"
              onClick={() => setExpanded(expanded === game.id ? null : game.id)}
            >
              <span className="text-2xl">{game.emoji}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-black text-[#F5F1E6]">{game.name}</p>
                <p className="text-xs text-[rgba(212,175,55,0.4)]">{game.odds.length} configurable odds</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={e => { e.stopPropagation(); toggleGame(game.id); }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-black border transition-all cursor-pointer ${
                    game.enabled
                      ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30 hover:bg-emerald-500/20'
                      : 'text-rose-400 bg-rose-500/10 border-rose-500/30 hover:bg-rose-500/20'
                  }`}
                >
                  <Power className="w-3.5 h-3.5" />
                  {game.enabled ? 'Live' : 'Off'}
                </button>
                {expanded === game.id ? <ChevronUp className="w-4 h-4 text-[rgba(212,175,55,0.4)]" /> : <ChevronDown className="w-4 h-4 text-[rgba(212,175,55,0.4)]" />}
              </div>
            </div>

            {expanded === game.id && (
              <div className="border-t border-[rgba(212,175,55,0.1)] p-4 space-y-4">
                {/* Provably Fair */}
                <div className="flex items-start gap-2 bg-[rgba(212,175,55,0.04)] border border-[rgba(212,175,55,0.1)] rounded-xl p-3 text-xs">
                  <Shield className="w-4 h-4 text-gold flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold text-[rgba(212,175,55,0.7)] mb-0.5">Provably Fair — Active Commit Hash</p>
                    <p className="font-mono text-[rgba(212,175,55,0.45)] break-all">{game.commitHash || '—'}</p>
                  </div>
                </div>

                {/* Timer (WinGo only) */}
                {game.timerDuration !== undefined && (
                  <div>
                    <p className="text-xs font-bold text-[rgba(212,175,55,0.7)] mb-2 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5" /> Round Timer Duration
                    </p>
                    <div className="flex gap-2">
                      {TIMER_OPTIONS.map(opt => (
                        <button
                          key={opt.value}
                          onClick={() => updateTimer(game.id, opt.value)}
                          className={`flex-1 py-2 rounded-xl text-xs font-bold cursor-pointer transition-all ${
                            game.timerDuration === opt.value
                              ? 'btn-royal-gold'
                              : 'bg-[#0d2419] border border-[rgba(212,175,55,0.15)] text-[rgba(212,175,55,0.5)] hover:text-[#E8C97A]'
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Odds */}
                <div>
                  <p className="text-xs font-bold text-[rgba(212,175,55,0.7)] mb-2">Payout Multipliers</p>
                  <div className="space-y-2">
                    {game.odds.map(odd => (
                      <div key={odd.key} className="flex items-center gap-3">
                        <div className="flex-1">
                          <p className="text-xs font-bold text-[#F5F1E6]">{odd.label}</p>
                          <p className="text-[10px] text-[rgba(212,175,55,0.4)]">{odd.description}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            value={odd.value}
                            step={0.1}
                            min={1}
                            onChange={e => updateOdd(game.id, odd.key, parseFloat(e.target.value))}
                            className="w-20 bg-[#0d2419] border border-[rgba(212,175,55,0.2)] rounded-lg px-2 py-1.5 text-xs text-gold font-black text-center focus:outline-none focus:border-[rgba(212,175,55,0.5)]"
                          />
                          <span className="text-xs text-[rgba(212,175,55,0.4)]">×</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <button
                  onClick={() => applyChanges(game.id)}
                  className="btn-royal-gold w-full py-2.5 rounded-xl font-black text-xs cursor-pointer"
                >
                  Save Changes
                </button>
              </div>
            )}
          </motion.div>
        ))}
      </div>
    </div>
  );
}
