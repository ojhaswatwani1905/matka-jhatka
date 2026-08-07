/**
 * AutoBetPanel — configurable auto-bet widget for game pages
 * Usage: <AutoBetPanel onPlaceBet={fn} balance={n} disabled={phase !== 'betting'} />
 */
import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, Square, Settings2, TrendingUp, TrendingDown, ChevronDown } from 'lucide-react';
import { formatCurrency } from '../../lib/utils';
import { useRG } from '../../store/RGContext';
import { useWallet } from '../../store/WalletContext';

export interface AutoBetConfig {
  betAmount: number;
  maxRounds: number | 'infinite';
  stopOnLossAmount: number | null;      // stop if balance drops by X
  stopOnWinAmount: number | null;       // stop if net gain reaches Y
  onLoss: 'keep' | 'increase' | 'decrease';
  onLossPercent: number;               // % to increase/decrease after loss
  onWin: 'keep' | 'increase' | 'decrease';
  onWinPercent: number;
}

interface AutoBetState {
  active: boolean;
  roundsPlayed: number;
  netResult: number;
  currentBet: number;
}

interface AutoBetPanelProps {
  /** Called when auto-bet wants to place a round. Return the net P&L of that round (positive = win). */
  onPlaceBet: (amount: number) => Promise<number>;
  /** Current wallet balance */
  balance: number;
  /** Disable triggering (e.g. when game is in 'flying' phase) */
  disabled?: boolean;
  /** Interval between auto-bets in ms (defaults to 1500) */
  intervalMs?: number;
}

const DEFAULT_CONFIG: AutoBetConfig = {
  betAmount: 100,
  maxRounds: 10,
  stopOnLossAmount: null,
  stopOnWinAmount: null,
  onLoss: 'keep',
  onLossPercent: 50,
  onWin: 'keep',
  onWinPercent: 0,
};

export function AutoBetPanel({ onPlaceBet, balance, disabled = false, intervalMs = 1500 }: AutoBetPanelProps) {
  const [config, setConfig] = useState<AutoBetConfig>(DEFAULT_CONFIG);
  const [abState, setAbState] = useState<AutoBetState>({ active: false, roundsPlayed: 0, netResult: 0, currentBet: DEFAULT_CONFIG.betAmount });
  const [expanded, setExpanded] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const { settings: rgSettings } = useRG();
  const { balance: walletBalance } = useWallet();

  const stateRef = useRef(abState);
  stateRef.current = abState;
  const configRef = useRef(config);
  configRef.current = config;
  const timerRef = useRef<any>(null);
  const startingBalanceRef = useRef(0);

  const updateConfig = (partial: Partial<AutoBetConfig>) => setConfig(c => ({ ...c, ...partial }));

  const stopAutoBet = useCallback((reason?: string) => {
    clearTimeout(timerRef.current);
    setAbState(prev => ({ ...prev, active: false }));
    if (reason) {
      // fire a small DOM event so the game page can optionally display it
      window.dispatchEvent(new CustomEvent('autobet:stopped', { detail: { reason } }));
    }
  }, []);

  const runNextRound = useCallback(async () => {
    const s = stateRef.current;
    const c = configRef.current;

    // Stop checks
    if (!s.active) return;
    if (walletBalance < s.currentBet) { stopAutoBet('Insufficient balance'); return; }
    if (c.maxRounds !== 'infinite' && s.roundsPlayed >= c.maxRounds) { stopAutoBet('All rounds played'); return; }
    if (c.stopOnLossAmount && (startingBalanceRef.current - walletBalance) >= c.stopOnLossAmount) { stopAutoBet(`Loss limit reached (₹${c.stopOnLossAmount})`); return; }
    if (c.stopOnWinAmount && s.netResult >= c.stopOnWinAmount) { stopAutoBet(`Win target reached (+₹${c.stopOnWinAmount})`); return; }

    // Deposit cap check
    const capCheck = rgSettings.depositCap.daily || rgSettings.depositCap.weekly || rgSettings.depositCap.monthly;
    if (capCheck && s.currentBet > walletBalance) { stopAutoBet('Responsible Gaming: bet exceeds balance'); return; }

    try {
      const roundPL = await onPlaceBet(s.currentBet);
      const won = roundPL >= 0;

      // Calculate next bet
      let nextBet = s.currentBet;
      if (!won && c.onLoss !== 'keep') {
        const factor = c.onLossPercent / 100;
        nextBet = c.onLoss === 'increase'
          ? Math.round(s.currentBet * (1 + factor))
          : Math.round(s.currentBet * (1 - factor));
      }
      if (won && c.onWin !== 'keep') {
        const factor = c.onWinPercent / 100;
        nextBet = c.onWin === 'increase'
          ? Math.round(s.currentBet * (1 + factor))
          : Math.round(s.currentBet * (1 - factor));
      }
      nextBet = Math.max(10, nextBet); // minimum bet

      setAbState(prev => ({
        ...prev,
        roundsPlayed: prev.roundsPlayed + 1,
        netResult: prev.netResult + roundPL,
        currentBet: nextBet,
      }));

      // Schedule next
      timerRef.current = setTimeout(runNextRound, intervalMs);
    } catch {
      stopAutoBet('Error placing bet');
    }
  }, [onPlaceBet, walletBalance, intervalMs, stopAutoBet, rgSettings]);

  const startAutoBet = useCallback(() => {
    if (disabled) return;
    startingBalanceRef.current = walletBalance;
    setAbState({ active: true, roundsPlayed: 0, netResult: 0, currentBet: config.betAmount });
    timerRef.current = setTimeout(runNextRound, 300);
  }, [disabled, walletBalance, config.betAmount, runNextRound]);

  // Auto-start next round when state becomes active
  useEffect(() => {
    if (!abState.active) return;
    return () => clearTimeout(timerRef.current);
  }, [abState.active]);

  useEffect(() => {
    return () => clearTimeout(timerRef.current);
  }, []);

  const cfg = config;
  const st = abState;

  return (
    <div className="royal-panel rounded-2xl overflow-hidden">
      {/* Header */}
      <button onClick={() => setExpanded(e => !e)}
        className="w-full flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-[rgba(212,175,55,0.04)] transition-colors">
        <div className="flex items-center gap-2">
          <Zap className={`w-4 h-4 ${st.active ? 'text-amber-400 animate-pulse' : 'text-[rgba(212,175,55,0.5)]'}`} />
          <span className="text-sm font-black text-[#E8C97A]">Auto-Bet</span>
          {st.active && (
            <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-400 font-black animate-pulse">
              RUNNING
            </span>
          )}
        </div>
        <ChevronDown className={`w-4 h-4 text-[rgba(212,175,55,0.5)] transition-transform ${expanded ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <div className="px-4 pb-4 space-y-3">
              {/* Live stats when running */}
              {st.active && (
                <div className="grid grid-cols-3 gap-2 p-3 rounded-xl bg-[rgba(245,158,11,0.06)] border border-amber-500/20">
                  {[
                    { label: 'Rounds', value: `${st.roundsPlayed}${cfg.maxRounds !== 'infinite' ? `/${cfg.maxRounds}` : ''}` },
                    { label: 'Current Bet', value: `₹${formatCurrency(st.currentBet)}` },
                    { label: 'Net P&L', value: `${st.netResult >= 0 ? '+' : ''}₹${formatCurrency(Math.abs(st.netResult))}`, color: st.netResult >= 0 ? 'text-[#2ECC71]' : 'text-[#FF4D6D]' },
                  ].map(s => (
                    <div key={s.label} className="text-center">
                      <p className={`text-sm font-black font-heading tabular-nums ${s.color ?? 'text-gold'}`}>{s.value}</p>
                      <p className="text-[8px] text-[rgba(212,175,55,0.4)] mt-0.5">{s.label}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Stop button */}
              {st.active ? (
                <button onClick={() => stopAutoBet('Manually stopped')}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-[#FF4D6D]/15 border border-[#FF4D6D]/40 text-[#FF4D6D] font-black text-sm cursor-pointer hover:bg-[#FF4D6D]/25 transition-all">
                  <Square className="w-4 h-4 fill-current" /> Stop Auto-Bet
                </button>
              ) : (
                <>
                  {/* Config fields */}
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[9px] font-black text-[rgba(212,175,55,0.5)] uppercase tracking-wider block mb-1">Bet Amount (₹)</label>
                      <input type="number" min={10} max={balance} value={cfg.betAmount}
                        onChange={e => updateConfig({ betAmount: Math.max(10, parseInt(e.target.value) || 10) })}
                        className="w-full bg-[#061510] border border-[rgba(212,175,55,0.15)] rounded-xl px-3 py-2 text-sm text-gold focus:outline-none focus:border-[rgba(212,175,55,0.4)]" />
                    </div>
                    <div>
                      <label className="text-[9px] font-black text-[rgba(212,175,55,0.5)] uppercase tracking-wider block mb-1">Rounds</label>
                      <select value={cfg.maxRounds === 'infinite' ? 'infinite' : String(cfg.maxRounds)}
                        onChange={e => updateConfig({ maxRounds: e.target.value === 'infinite' ? 'infinite' : parseInt(e.target.value) })}
                        className="w-full bg-[#061510] border border-[rgba(212,175,55,0.15)] rounded-xl px-3 py-2 text-sm text-gold focus:outline-none focus:border-[rgba(212,175,55,0.4)] cursor-pointer">
                        {[5, 10, 20, 50, 100].map(n => <option key={n} value={n}>{n} rounds</option>)}
                        <option value="infinite">∞ Until stopped</option>
                      </select>
                    </div>
                  </div>

                  {/* Stop conditions */}
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[9px] font-black text-[rgba(212,175,55,0.5)] uppercase tracking-wider block mb-1">Stop on Loss (₹)</label>
                      <input type="number" min={0} placeholder="e.g. 500"
                        value={cfg.stopOnLossAmount ?? ''}
                        onChange={e => updateConfig({ stopOnLossAmount: e.target.value ? parseInt(e.target.value) : null })}
                        className="w-full bg-[#061510] border border-[rgba(212,175,55,0.15)] rounded-xl px-3 py-2 text-sm text-gold focus:outline-none focus:border-[rgba(212,175,55,0.4)] placeholder-[rgba(212,175,55,0.2)]" />
                    </div>
                    <div>
                      <label className="text-[9px] font-black text-[rgba(212,175,55,0.5)] uppercase tracking-wider block mb-1">Stop on Win (₹)</label>
                      <input type="number" min={0} placeholder="e.g. 1000"
                        value={cfg.stopOnWinAmount ?? ''}
                        onChange={e => updateConfig({ stopOnWinAmount: e.target.value ? parseInt(e.target.value) : null })}
                        className="w-full bg-[#061510] border border-[rgba(212,175,55,0.15)] rounded-xl px-3 py-2 text-sm text-gold focus:outline-none focus:border-[rgba(212,175,55,0.4)] placeholder-[rgba(212,175,55,0.2)]" />
                    </div>
                  </div>

                  {/* Advanced toggle */}
                  <button onClick={() => setShowAdvanced(s => !s)}
                    className="flex items-center gap-1.5 text-[10px] font-black text-[rgba(212,175,55,0.5)] hover:text-gold cursor-pointer transition-colors">
                    <Settings2 className="w-3.5 h-3.5" />
                    {showAdvanced ? 'Hide' : 'Show'} Bet Progression
                  </button>

                  <AnimatePresence>
                    {showAdvanced && (
                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden space-y-2">
                        {/* On Loss */}
                        <div>
                          <label className="text-[9px] font-black text-[rgba(212,175,55,0.5)] block mb-1 flex items-center gap-1">
                            <TrendingDown className="w-3 h-3" /> On Loss
                          </label>
                          <div className="flex gap-1.5">
                            {(['keep', 'increase', 'decrease'] as const).map(v => (
                              <button key={v} onClick={() => updateConfig({ onLoss: v })}
                                className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold cursor-pointer border transition-all capitalize ${cfg.onLoss === v ? 'bg-[rgba(212,175,55,0.18)] border-[rgba(212,175,55,0.4)] text-gold' : 'border-[rgba(212,175,55,0.1)] text-[rgba(212,175,55,0.4)] hover:text-gold bg-[#0a1e12]'}`}>
                                {v === 'keep' ? '= Keep' : v === 'increase' ? '↑ Up' : '↓ Down'}
                              </button>
                            ))}
                          </div>
                          {cfg.onLoss !== 'keep' && (
                            <div className="flex items-center gap-2 mt-1.5">
                              <input type="number" min={1} max={200} value={cfg.onLossPercent}
                                onChange={e => updateConfig({ onLossPercent: parseInt(e.target.value) || 50 })}
                                className="w-20 bg-[#061510] border border-[rgba(212,175,55,0.15)] rounded-lg px-2 py-1 text-xs text-gold focus:outline-none" />
                              <span className="text-[10px] text-[rgba(212,175,55,0.45)]">% per loss</span>
                            </div>
                          )}
                        </div>
                        {/* On Win */}
                        <div>
                          <label className="text-[9px] font-black text-[rgba(212,175,55,0.5)] block mb-1 flex items-center gap-1">
                            <TrendingUp className="w-3 h-3" /> On Win
                          </label>
                          <div className="flex gap-1.5">
                            {(['keep', 'increase', 'decrease'] as const).map(v => (
                              <button key={v} onClick={() => updateConfig({ onWin: v })}
                                className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold cursor-pointer border transition-all ${cfg.onWin === v ? 'bg-[rgba(212,175,55,0.18)] border-[rgba(212,175,55,0.4)] text-gold' : 'border-[rgba(212,175,55,0.1)] text-[rgba(212,175,55,0.4)] hover:text-gold bg-[#0a1e12]'}`}>
                                {v === 'keep' ? '= Keep' : v === 'increase' ? '↑ Up' : '↓ Down'}
                              </button>
                            ))}
                          </div>
                          {cfg.onWin !== 'keep' && (
                            <div className="flex items-center gap-2 mt-1.5">
                              <input type="number" min={1} max={200} value={cfg.onWinPercent}
                                onChange={e => updateConfig({ onWinPercent: parseInt(e.target.value) || 0 })}
                                className="w-20 bg-[#061510] border border-[rgba(212,175,55,0.15)] rounded-lg px-2 py-1 text-xs text-gold focus:outline-none" />
                              <span className="text-[10px] text-[rgba(212,175,55,0.45)]">% per win</span>
                            </div>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Start button */}
                  <button
                    onClick={startAutoBet}
                    disabled={disabled || cfg.betAmount > balance}
                    className="w-full flex items-center justify-center gap-2 py-3 rounded-xl btn-royal-gold font-black text-sm cursor-pointer disabled:opacity-40 disabled:shadow-none disabled:transform-none transition-all"
                  >
                    <Zap className="w-4 h-4" />
                    {disabled ? 'Wait for next round…' : `Start Auto-Bet (${cfg.maxRounds === 'infinite' ? '∞' : cfg.maxRounds} rounds)`}
                  </button>
                  {cfg.betAmount > balance && (
                    <p className="text-[10px] text-[#FF4D6D] text-center">Bet amount exceeds balance</p>
                  )}
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
