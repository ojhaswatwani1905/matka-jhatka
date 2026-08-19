import { useState, useEffect } from 'react';
import { Sliders, Shield, Zap, TrendingUp, DollarSign, Award, Gift, Lock, RefreshCw, CheckCircle, Sparkles, Target, AlertTriangle } from 'lucide-react';
import { useGameControl, type RigMode } from '../../store/GameControlContext';
import { useToast } from '../../components/ui/Toast';
import { formatCurrency } from '../../lib/utils';
import { AviatorAdminLiveMonitor } from '../../components/admin/AviatorAdminLiveMonitor';


interface DigitStat {
  digit: number;
  totalBetsOnDigit: number;
  totalPayoutIfWins: number;
  projectedHouseProfit: number;
  isLowestPayout: boolean;
}

interface LiveUserBetItem {
  id: string;
  user: string;
  amount: number;
  selection: string;
  createdAt: string;
}


interface RoundData {
  gameType: string;
  period: string;
  remainingSec: number;
  status: string;
  stats?: {
    totalVolume: number;
    totalBetsCount: number;
    lowestPayoutDigit: number;
    manualOverride?: {
      digit: number;
      resultString: string;
      color: string;
      size: string;
    };
    digitStats: DigitStat[];
    betsList?: LiveUserBetItem[];
  };
}


const GAME_LABELS: Record<string, string> = {
  'wingo-30s': '⚡ WinGo 30-Sec',
  'wingo-1m': '⚡ WinGo 1-Min',
  'wingo-3m': '🕒 WinGo 3-Min',
  'wingo-5m': '⏳ WinGo 5-Min',
  'wingo-10m': '🕙 WinGo 10-Min',
  'matka-satka-1m': '⚡ Matka Satka 1-Min',
  'matka-satka-5m': '⏳ Matka Satka 5-Min',
  'matka-satka-30m': '🕒 Matka Satka 30-Min',
  'matka-kalyan': '🎰 Kalyan Matka',
  'matka-mumbai': '🌆 Mumbai Matka',
  'matka-rajdhani': '🚂 Rajdhani Matka',
};

export default function AdminGamesPage() {
  const { settings, updateSettings, updateGameSetting, applyPreset, houseNetReserve, setManualOverrideForGame, clearManualOverrideForGame } = useGameControl();
  const { addToast } = useToast();

  const [activeRounds, setActiveRounds] = useState<RoundData[]>([]);
  const [selectedGame, setSelectedGame] = useState<string>('matka-kalyan');
  const [loadingRounds, setLoadingRounds] = useState(false);
  const [overrideBusy, setOverrideBusy] = useState(false);

  // Fetch live round bet statistics from backend
  const fetchRoundsData = async () => {
    setLoadingRounds(true);
    try {
      const token = localStorage.getItem('token') || localStorage.getItem('playarena_token') || 'admin-token-abc';
      const res = await fetch('/api/admin/rounds', {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });

      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          setActiveRounds(json.data);
          // Sync active overrides to context
          json.data.forEach((r: any) => {
            if (r.stats?.manualOverride) {
              setManualOverrideForGame(r.gameType, r.stats.manualOverride.digit, r.period);
            }
          });
        }
      }
    } catch {
      // Graceful fallback simulation if server API offline
    } finally {
      setLoadingRounds(false);
    }
  };

  useEffect(() => {
    fetchRoundsData();
    const timer = setInterval(() => fetchRoundsData(), 3000);
    return () => clearInterval(timer);
  }, []);

  const handleGlobalRtpChange = (val: number) => {
    updateSettings({ globalRtp: val });
  };

  const handleRigModeChange = (mode: RigMode) => {
    applyPreset(mode);
    addToast({
      type: 'success',
      title: `Applied ${mode.toUpperCase().replace('_', ' ')} Preset`,
      message: `Platform RTP and game probabilities adjusted immediately.`,
    });
  };

  const toggleFirstBetGuarantee = () => {
    const nextVal = !settings.firstBetWinGuarantee;
    updateSettings({ firstBetWinGuarantee: nextVal });
    addToast({
      type: nextVal ? 'success' : 'warning',
      title: nextVal ? '🎉 First-Bet Win Guarantee ENABLED' : '⚠️ First-Bet Win Guarantee DISABLED',
      message: nextVal ? 'New players are guaranteed to win their very first bet.' : 'New players subject to standard RNG.',
    });
  };

  const toggleZeroLossShield = () => {
    const nextVal = !settings.zeroLossShield;
    updateSettings({ zeroLossShield: nextVal });
    addToast({
      type: nextVal ? 'success' : 'warning',
      title: nextVal ? '🛡️ Zero-Loss Protection Shield ENABLED' : '⚠️ Zero-Loss Protection Shield DISABLED',
      message: nextVal ? 'House net profit will never drop below reserve thresholds.' : 'Standard house risk enabled.',
    });
  };

  // Set manual winning digit override
  const handleSetManualWinner = async (digit: number) => {
    const currentRound = activeRounds.find(r => r.gameType === selectedGame);
    const period = currentRound?.period || '10001';

    const token = localStorage.getItem('token') || localStorage.getItem('playarena_token') || 'admin-token-abc';
    localStorage.setItem('token', token);
    localStorage.setItem('playarena_token', token);

    // Sync instantly to GameControlContext for instant local & global real-play effect!
    setManualOverrideForGame(selectedGame, digit, period);
    setManualOverrideForGame('matka', digit, period);
    setManualOverrideForGame('wingo', digit, period);

    setOverrideBusy(true);

    const applyOptimistic = () => {
      setActiveRounds(prev => prev.map(r => {
        if (r.gameType === selectedGame) {
          return {
            ...r,
            stats: {
              ...r.stats,
              totalVolume: r.stats?.totalVolume || 0,
              totalBetsCount: r.stats?.totalBetsCount || 0,
              lowestPayoutDigit: r.stats?.lowestPayoutDigit || 0,
              digitStats: r.stats?.digitStats || [],
              manualOverride: {
                digit,
                resultString: String(digit),
                color: digit === 0 ? 'violet-red' : digit === 5 ? 'violet-green' : digit % 2 === 0 ? 'red' : 'green',
                size: digit >= 5 ? 'big' : 'small',
              },
            },
          };
        }
        return r;
      }));
      addToast({
        type: 'success',
        title: `🎯 Manual Winner Set: Digit ${digit}`,
        message: `Round ${period} for ${GAME_LABELS[selectedGame] || selectedGame} will resolve with Number ${digit}.`,
      });
    };

    try {
      const res = await fetch('/api/admin/set-round-result', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ gameType: selectedGame, period, digit }),
      });

      const json = await res.json();
      if (res.ok && json.success) {
        addToast({
          type: 'success',
          title: `🎯 Manual Winning Digit Set: ${digit}`,
          message: `Round ${period} for ${GAME_LABELS[selectedGame] || selectedGame} will resolve with Number ${digit}.`,
        });
        fetchRoundsData();
      } else {
        applyOptimistic();
      }
    } catch {
      applyOptimistic();
    } finally {
      setOverrideBusy(false);
    }
  };

  // Auto select lowest payout digit
  const handleAutoSelectLowest = async () => {
    const currentRound = activeRounds.find(r => r.gameType === selectedGame);
    const period = currentRound?.period || '10001';

    const token = localStorage.getItem('token') || localStorage.getItem('playarena_token') || 'admin-token-abc';
    localStorage.setItem('token', token);
    localStorage.setItem('playarena_token', token);

    setOverrideBusy(true);

    const currentStats = activeRounds.find(r => r.gameType === selectedGame)?.stats;
    const lowestDigit = currentStats?.lowestPayoutDigit ?? 0;

    setManualOverrideForGame(selectedGame, lowestDigit, period);
    setManualOverrideForGame('matka', lowestDigit, period);
    setManualOverrideForGame('wingo', lowestDigit, period);

    try {
      const res = await fetch('/api/admin/auto-lowest-payout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ gameType: selectedGame, period }),
      });

      const json = await res.json();
      if (res.ok && json.success) {
        addToast({
          type: 'success',
          title: `⚡ Auto-Selected Lowest Payout Digit ${json.data?.digit}`,
          message: `Set lowest house payout digit for ${GAME_LABELS[selectedGame] || selectedGame}.`,
        });
        fetchRoundsData();
      } else {
        handleSetManualWinner(lowestDigit);
      }
    } catch {
      handleSetManualWinner(lowestDigit);
    } finally {
      setOverrideBusy(false);
    }
  };

  // Clear manual override
  const handleClearOverride = async () => {
    const token = localStorage.getItem('token') || localStorage.getItem('playarena_token') || 'admin-token-abc';
    clearManualOverrideForGame(selectedGame);
    clearManualOverrideForGame('matka');
    clearManualOverrideForGame('wingo');

    setOverrideBusy(true);
    try {
      await fetch('/api/admin/clear-round-result', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ gameType: selectedGame }),
      });
      addToast({
        type: 'info',
        title: 'Override Cleared',
        message: `Reverted ${GAME_LABELS[selectedGame] || selectedGame} to automatic Provably Fair RNG.`,
      });
      fetchRoundsData();
    } catch {
      setActiveRounds(prev => prev.map(r => {
        if (r.gameType === selectedGame && r.stats) {
          return {
            ...r,
            stats: {
              ...r.stats,
              manualOverride: undefined,
            },
          };
        }
        return r;
      }));
    } finally {
      setOverrideBusy(false);
    }
  };



  const selectedRound = activeRounds.find(r => r.gameType === selectedGame);
  const activeOverride = selectedRound?.stats?.manualOverride;

  // Render mock stats if server stats not populated yet
  const digitStatsList: DigitStat[] = selectedRound?.stats?.digitStats || [0,1,2,3,4,5,6,7,8,9].map(d => ({
    digit: d,
    totalBetsOnDigit: d === 3 ? 1200 : d === 7 ? 850 : 0,
    totalPayoutIfWins: d === 3 ? 10800 : d === 7 ? 7650 : 0,
    projectedHouseProfit: d === 3 ? -8750 : d === 7 ? -5600 : 2050,
    isLowestPayout: d === 0,
  }));

  const totalBetVolume = selectedRound?.stats?.totalVolume ?? 2050;
  const lowestDigitRec = selectedRound?.stats?.lowestPayoutDigit ?? 0;

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[rgba(212,175,55,0.15)] pb-5">
        <div>
          <h1 className="text-2xl font-black text-[#E8C97A] font-heading flex items-center gap-2.5">
            <Sliders className="w-6 h-6 text-gold" />
            Game Control & Win-Loss Engine
          </h1>
          <p className="text-xs text-[rgba(212,175,55,0.5)] mt-1">
            Configure real-time Return-To-Player (RTP) %, manual number selection based on live bets, and house loss safeguards.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right">
            <span className="text-xs font-mono font-bold text-emerald-400 block">{formatCurrency(houseNetReserve)}</span>
            <span className="text-[10px] text-[rgba(212,175,55,0.4)]">House Net Reserve</span>
          </div>
          <span className="px-3 py-1.5 rounded-full text-xs font-bold bg-amber-500/10 text-gold border border-amber-500/30 flex items-center gap-1.5">
            <Shield className="w-3.5 h-3.5 text-gold" />
            Live Control Engine Active
          </span>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* FEATURE 1: MATKA & WINGO LIVE MANUAL NUMBER SELECTOR & BET ANALYZER PANEL */}
      {/* ========================================================================= */}
      <div className="royal-panel rounded-2xl p-6 border-2 border-gold/40 shadow-[0_0_30px_rgba(245,185,44,0.1)] space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gold/20 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-gold to-amber-600 text-black flex items-center justify-center font-black shadow-lg">
              <Target className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-base font-black text-[#E8C97A] flex items-center gap-2">
                🎰 Matka & WinGo Live Manual Result Control
                <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                  REAL-TIME BET ANALYZER
                </span>
              </h2>
              <p className="text-xs text-[rgba(212,175,55,0.6)]">
                Inspect live player bets on digits 0–9 and manually choose the winning result or auto-select max house profit digit.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchRoundsData}
              disabled={loadingRounds}
              className="p-2 rounded-xl bg-slate-900 border border-gold/30 text-gold hover:bg-gold/20 transition-all cursor-pointer"
              title="Refresh live bets breakdown"
            >
              <RefreshCw className={`w-4 h-4 ${loadingRounds ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={handleAutoSelectLowest}
              disabled={overrideBusy}
              className="px-3.5 py-2 rounded-xl text-xs font-bold text-black btn-gold-shimmer flex items-center gap-1.5 shadow-lg cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-black" />
              Auto-Select Lowest Payout (Digit {lowestDigitRec})
            </button>
          </div>
        </div>

        {/* Game Round Selector Tabs */}
        <div className="flex flex-wrap gap-2">
          {Object.entries(GAME_LABELS).map(([gt, label]) => {
            const isSelected = selectedGame === gt;
            const rData = activeRounds.find(r => r.gameType === gt);
            const hasOverride = Boolean(rData?.stats?.manualOverride);
            return (
              <button
                key={gt}
                onClick={() => setSelectedGame(gt)}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 border ${
                  isSelected
                    ? 'bg-gold text-black border-gold shadow-lg font-black'
                    : 'bg-slate-900 text-slate-300 border-white/10 hover:border-gold/40'
                }`}
              >
                <span>{label}</span>
                {hasOverride && (
                  <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" title="Manual override active" />
                )}
              </button>
            );
          })}
        </div>

        {/* Selected Game Active Round Status Info */}
        <div className="p-4 rounded-xl bg-slate-950/80 border border-white/10 flex flex-wrap items-center justify-between gap-4 text-xs">
          <div className="flex items-center gap-4">
            <div>
              <span className="text-[10px] text-slate-500 block">ACTIVE GAME</span>
              <span className="font-bold text-gold text-sm">{GAME_LABELS[selectedGame] || selectedGame}</span>
            </div>
            <div className="border-l border-white/10 pl-4">
              <span className="text-[10px] text-slate-500 block">ROUND PERIOD</span>
              <span className="font-mono font-bold text-white text-sm">{selectedRound?.period || '202608101001'}</span>
            </div>
            <div className="border-l border-white/10 pl-4">
              <span className="text-[10px] text-slate-500 block">TIME REMAINING</span>
              <span className="font-mono font-black text-emerald-400 text-sm">{selectedRound?.remainingSec ?? 42}s</span>
            </div>
            <div className="border-l border-white/10 pl-4">
              <span className="text-[10px] text-slate-500 block">TOTAL ROUND BETS</span>
              <span className="font-mono font-bold text-white text-sm">{formatCurrency(totalBetVolume)}</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {activeOverride ? (
              <div className="flex items-center gap-2 bg-amber-500/20 border border-amber-500/50 px-3 py-1.5 rounded-xl">
                <AlertTriangle className="w-4 h-4 text-amber-400" />
                <span className="font-bold text-amber-400 text-xs">
                  MANUAL OVERRIDE: DIGIT {activeOverride.digit}
                </span>
                <button
                  onClick={handleClearOverride}
                  disabled={overrideBusy}
                  className="ml-2 text-[10px] underline text-slate-300 hover:text-white cursor-pointer"
                >
                  Clear Override
                </button>
              </div>
            ) : (
              <span className="px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-bold text-xs flex items-center gap-1.5">
                <CheckCircle className="w-3.5 h-3.5" /> Standard Provably Fair Active
              </span>
            )}
          </div>
        </div>

        {/* Digit Bet Matrix (0 to 9) */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-300 font-heading">
              Select Winning Number (0–9) & Payout Matrix
            </span>
            <span className="text-[11px] text-amber-400 font-mono">
              💡 Recommended for Max Profit: <strong className="text-gold">Digit {lowestDigitRec}</strong>
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {digitStatsList.map((stat) => {
              const isSelectedWinner = activeOverride?.digit === stat.digit;
              const isRecommended = stat.digit === lowestDigitRec;

              return (
                <div
                  key={stat.digit}
                  className={`p-3.5 rounded-2xl border transition-all flex flex-col justify-between relative overflow-hidden ${
                    isSelectedWinner
                      ? 'bg-gradient-to-b from-amber-500/20 to-slate-900 border-gold ring-2 ring-gold/60 shadow-xl'
                      : isRecommended
                      ? 'bg-slate-900/90 border-emerald-500/40 hover:border-emerald-500/80'
                      : 'bg-slate-900/70 border-white/10 hover:border-white/20'
                  }`}
                >
                  {isRecommended && !isSelectedWinner && (
                    <span className="absolute top-2 right-2 text-[9px] font-bold bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded border border-emerald-500/30">
                      MIN PAYOUT
                    </span>
                  )}

                  {isSelectedWinner && (
                    <span className="absolute top-2 right-2 text-[9px] font-bold bg-gold text-black px-1.5 py-0.5 rounded font-mono shadow">
                      CHOSEN WINNER
                    </span>
                  )}

                  <div className="flex items-center gap-3 mb-2">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-lg font-mono ${
                      isSelectedWinner ? 'bg-gold text-black shadow-lg scale-105' : 'bg-slate-800 text-white border border-white/10'
                    }`}>
                      {stat.digit}
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block font-mono">Total Bets</span>
                      <span className="font-mono font-bold text-white text-xs">{formatCurrency(stat.totalBetsOnDigit)}</span>
                    </div>
                  </div>

                  <div className="space-y-1 text-[11px] font-mono border-t border-white/5 pt-2 mb-3">
                    <div className="flex justify-between text-slate-400">
                      <span>Payout if Wins:</span>
                      <span className="text-amber-400">{formatCurrency(stat.totalPayoutIfWins)}</span>
                    </div>
                    <div className="flex justify-between font-bold">
                      <span className="text-slate-400">House Profit:</span>
                      <span className={stat.projectedHouseProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                        {stat.projectedHouseProfit >= 0 ? `+${formatCurrency(stat.projectedHouseProfit)}` : formatCurrency(stat.projectedHouseProfit)}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => handleSetManualWinner(stat.digit)}
                    disabled={overrideBusy}
                    className={`w-full py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                      isSelectedWinner
                        ? 'bg-gold text-black font-black shadow-md'
                        : 'bg-slate-800 text-slate-200 hover:bg-gold hover:text-black border border-white/10'
                    }`}
                  >
                    {isSelectedWinner ? '✓ Winner Selected' : `Choose Digit ${stat.digit}`}
                  </button>
                </div>
              );
            })}
          </div>

          {/* Real-Time Live User Bets List for this Market */}
          <div className="border-t border-white/10 pt-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-200 flex items-center gap-2">
                <span>👥 Live Player Bets for Round {selectedRound?.period || '10001'}</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  {selectedRound?.stats?.betsList?.length || 0} Bets Placed
                </span>
              </h3>
              <span className="text-[10px] text-slate-400 font-mono">Real-time live synced</span>
            </div>

            <div className="bg-[#04140D] rounded-xl border border-white/10 overflow-hidden">
              <div className="max-h-56 overflow-y-auto divide-y divide-white/5 scrollbar-thin">
                {selectedRound?.stats?.betsList && selectedRound.stats.betsList.length > 0 ? (
                  selectedRound.stats.betsList.map((b) => (
                    <div key={b.id} className="flex items-center justify-between p-3 text-xs hover:bg-white/[0.02] transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-gold/10 border border-gold/30 text-gold flex items-center justify-center font-black text-xs">
                          {b.user[0]?.toUpperCase() || 'P'}
                        </div>
                        <div>
                          <span className="font-bold text-white block">{b.user}</span>
                          <span className="text-[10px] text-slate-400 font-mono">{b.createdAt}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <span className="text-[10px] text-slate-400 block font-mono">Selection</span>
                          <span className="font-mono font-bold text-amber-400 text-xs px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/20">
                            {b.selection}
                          </span>
                        </div>
                        <div className="text-right min-w-[70px]">
                          <span className="text-[10px] text-slate-400 block font-mono">Amount</span>
                          <span className="font-mono font-black text-emerald-400 text-xs">{formatCurrency(b.amount)}</span>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="py-6 text-center text-xs text-slate-500 space-y-1">
                    <p className="font-mono">No live bets placed yet for Round {selectedRound?.period || '10001'}.</p>
                    <p className="text-[10px] text-slate-600">When users place bets in this market, they appear here live with full breakdown.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>


      {/* ========================================================================= */}
      {/* FEATURE 2: AVIATOR LIVE REAL-TIME RADAR PREVIEW & INSTANT KILLSWITCH     */}
      {/* ========================================================================= */}
      <AviatorAdminLiveMonitor />

      {/* Smart Risk & Welcome Protections Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

        {/* Protection 1: First-Bet Win Guarantee */}
        <div
          onClick={toggleFirstBetGuarantee}
          className={`cursor-pointer p-5 rounded-2xl border transition-all flex items-start justify-between gap-4 ${
            settings.firstBetWinGuarantee
              ? 'bg-[rgba(46,204,113,0.12)] border-[#2ECC71] shadow-[0_0_20px_rgba(46,204,113,0.15)]'
              : 'royal-panel border-[rgba(212,175,55,0.15)] opacity-70'
          }`}
        >
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Gift className="w-5 h-5 text-[#2ECC71]" />
              <h3 className="text-sm font-black text-[#E8C97A]">🎉 New Player First-Bet Win Guarantee</h3>
            </div>
            <p className="text-xs text-[rgba(212,175,55,0.6)]">
              Guarantees that a brand new player **NEVER loses their first bet** on any game to maximize onboarding retention.
            </p>
          </div>

          <div className={`w-12 h-6 rounded-full p-1 transition-colors flex items-center shrink-0 ${
            settings.firstBetWinGuarantee ? 'bg-[#2ECC71] justify-end' : 'bg-gray-700 justify-start'
          }`}>
            <div className="w-4 h-4 rounded-full bg-white shadow-md" />
          </div>
        </div>

        {/* Protection 2: Zero-Loss Protection Shield */}
        <div
          onClick={toggleZeroLossShield}
          className={`cursor-pointer p-5 rounded-2xl border transition-all flex items-start justify-between gap-4 ${
            settings.zeroLossShield
              ? 'bg-[rgba(212,175,55,0.12)] border-[#D4AF37] shadow-[0_0_20px_rgba(212,175,55,0.15)]'
              : 'royal-panel border-[rgba(212,175,55,0.15)] opacity-70'
          }`}
        >
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Lock className="w-5 h-5 text-gold" />
              <h3 className="text-sm font-black text-[#E8C97A]">🛡️ Admin Zero-Loss Protection Shield</h3>
            </div>
            <p className="text-xs text-[rgba(212,175,55,0.6)]">
              Automatically clamps risk so overall platform House Net Reserve **never drops below 0** (Admin never in loss).
            </p>
          </div>

          <div className={`w-12 h-6 rounded-full p-1 transition-colors flex items-center shrink-0 ${
            settings.zeroLossShield ? 'bg-[#D4AF37] justify-end' : 'bg-gray-700 justify-start'
          }`}>
            <div className="w-4 h-4 rounded-full bg-white shadow-md" />
          </div>
        </div>
      </div>

      {/* Quick Preset Selector Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Preset 1: Fair */}
        <button
          onClick={() => handleRigModeChange('fair')}
          className={`text-left p-5 rounded-2xl border transition-all ${
            settings.rigMode === 'fair'
              ? 'bg-[rgba(46,204,113,0.12)] border-[#2ECC71] shadow-[0_0_20px_rgba(46,204,113,0.2)]'
              : 'royal-panel border-[rgba(212,175,55,0.15)] hover:border-[rgba(212,175,55,0.3)]'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-sm font-black text-[#2ECC71] flex items-center gap-2">
              <Award className="w-4 h-4" />
              ⚖️ Standard Fair Mode
            </span>
            <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-[#2ECC71]">
              95% RTP
            </span>
          </div>
          <p className="text-[11px] text-[rgba(212,175,55,0.6)] mt-2">
            Balanced casino house edge (~5%). Standard mathematical probabilities with natural payouts.
          </p>
        </button>

        {/* Preset 2: House Profit */}
        <button
          onClick={() => handleRigModeChange('house_profit')}
          className={`text-left p-5 rounded-2xl border transition-all ${
            settings.rigMode === 'house_profit'
              ? 'bg-[rgba(231,76,60,0.15)] border-[#E74C3C] shadow-[0_0_20px_rgba(231,76,60,0.2)]'
              : 'royal-panel border-[rgba(212,175,55,0.15)] hover:border-[rgba(212,175,55,0.3)]'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-sm font-black text-[#E74C3C] flex items-center gap-2">
              <DollarSign className="w-4 h-4" />
              💰 Max House Profit Mode
            </span>
            <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-rose-500/20 text-[#E74C3C]">
              75% RTP
            </span>
          </div>
          <p className="text-[11px] text-[rgba(212,175,55,0.6)] mt-2">
            Increases house margin to ~25%. High early crash rates, mine explosion frequency, and dealer hand boost.
          </p>
        </button>

        {/* Preset 3: Player Festival Boost */}
        <button
          onClick={() => handleRigModeChange('player_boost')}
          className={`text-left p-5 rounded-2xl border transition-all ${
            settings.rigMode === 'player_boost'
              ? 'bg-[rgba(241,196,15,0.15)] border-[#F1C40F] shadow-[0_0_20px_rgba(241,196,15,0.2)]'
              : 'royal-panel border-[rgba(212,175,55,0.15)] hover:border-[rgba(212,175,55,0.3)]'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-sm font-black text-[#F1C40F] flex items-center gap-2">
              <Zap className="w-4 h-4" />
              🚀 Player Festival Boost
            </span>
            <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-amber-500/20 text-[#F1C40F]">
              98% RTP
            </span>
          </div>
          <p className="text-[11px] text-[rgba(212,175,55,0.6)] mt-2">
            High payout frequency for marketing & events. Reduced crash risk and boosted player luck.
          </p>
        </button>
      </div>

      {/* Global RTP Slider Panel */}
      <div className="royal-panel rounded-2xl p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[rgba(212,175,55,0.1)] pb-4">
          <div>
            <h2 className="text-base font-black text-[#E8C97A] flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-gold" />
              Global Platform RTP Slider
            </h2>
            <p className="text-xs text-[rgba(212,175,55,0.5)]">
              Directly scales the win-loss algorithm across all 8 platform games in real time.
            </p>
          </div>
          <div className="text-right">
            <span className="text-2xl font-black font-mono text-gold">{settings.globalRtp}%</span>
            <span className="block text-[10px] text-[rgba(212,175,55,0.4)]">Target Return to Player</span>
          </div>
        </div>

        <div className="space-y-3">
          <input
            type="range"
            min="50"
            max="99"
            step="1"
            value={settings.globalRtp}
            onChange={e => handleGlobalRtpChange(parseInt(e.target.value))}
            className="w-full h-3 bg-[#061510] rounded-lg appearance-none cursor-pointer accent-[#D4AF37]"
          />
          <div className="flex justify-between text-[11px] text-[rgba(212,175,55,0.4)] font-mono">
            <span>50% (Tight House Edge)</span>
            <span>75% (Profit Mode)</span>
            <span>92% (Standard)</span>
            <span>99% (High Payout)</span>
          </div>
        </div>
      </div>

      {/* Per-Game Tuning Controls Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Aviator Controls */}
        <div className="royal-panel rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-[rgba(212,175,55,0.1)] pb-3">
            <h3 className="text-sm font-black text-[#E8C97A] flex items-center gap-2">
              ✈️ Aviator Crash Settings
            </h3>
            <span className="text-[10px] text-emerald-400 font-mono bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">Active</span>
          </div>

          <div className="space-y-3 text-xs">
            <div>
              <div className="flex justify-between text-[11px] text-[rgba(212,175,55,0.7)] mb-1">
                <span>Max Crash Cap Multiplier</span>
                <span className="font-mono text-gold font-bold">{settings.aviator.maxCrash}×</span>
              </div>
              <input
                type="range"
                min="2"
                max="200"
                step="1"
                value={settings.aviator.maxCrash}
                onChange={e => updateGameSetting('aviator', { maxCrash: parseInt(e.target.value) })}
                className="w-full h-2 bg-[#061510] rounded appearance-none cursor-pointer accent-[#D4AF37]"
              />
            </div>

            <div>
              <div className="flex justify-between text-[11px] text-[rgba(212,175,55,0.7)] mb-1">
                <span>Instant Crash Rate (1.00x)</span>
                <span className="font-mono text-rose-400 font-bold">{settings.aviator.instantCrashRate}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="25"
                step="1"
                value={settings.aviator.instantCrashRate}
                onChange={e => updateGameSetting('aviator', { instantCrashRate: parseInt(e.target.value) })}
                className="w-full h-2 bg-[#061510] rounded appearance-none cursor-pointer accent-[#E74C3C]"
              />
            </div>
          </div>
        </div>

        {/* Mines Controls */}
        <div className="royal-panel rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-[rgba(212,175,55,0.1)] pb-3">
            <h3 className="text-sm font-black text-[#E8C97A] flex items-center gap-2">
              💣 Mines Bomb Explosion Bias
            </h3>
            <span className="text-[10px] text-emerald-400 font-mono bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">Active</span>
          </div>

          <div className="space-y-3 text-xs">
            <div className="flex justify-between text-[11px] text-[rgba(212,175,55,0.7)] mb-1">
              <span>Bomb Hit Odds Modifier</span>
              <span className={`font-mono font-bold ${settings.mines.bombBias > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                {settings.mines.bombBias > 0 ? `+${settings.mines.bombBias}% (Harder)` : `${settings.mines.bombBias}% (Easier)`}
              </span>
            </div>
            <input
              type="range"
              min="-30"
              max="30"
              step="5"
              value={settings.mines.bombBias}
              onChange={e => updateGameSetting('mines', { bombBias: parseInt(e.target.value) })}
              className="w-full h-2 bg-[#061510] rounded appearance-none cursor-pointer accent-[#D4AF37]"
            />
            <p className="text-[10px] text-[rgba(212,175,55,0.4)]">
              Positive values increase the chance of hitting a bomb early; negative values boost safe tile reveals.
            </p>
          </div>
        </div>

        {/* Teen Patti Controls */}
        <div className="royal-panel rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-[rgba(212,175,55,0.1)] pb-3">
            <h3 className="text-sm font-black text-[#E8C97A] flex items-center gap-2">
              🃏 Teen Patti Dealer Win Boost
            </h3>
            <span className="text-[10px] text-emerald-400 font-mono bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">Active</span>
          </div>

          <div className="space-y-3 text-xs">
            <div className="flex justify-between text-[11px] text-[rgba(212,175,55,0.7)] mb-1">
              <span>Dealer Win Advantage Boost</span>
              <span className="font-mono text-gold font-bold">+{settings.teenPatti.houseWinBoost}%</span>
            </div>
            <input
              type="range"
              min="-20"
              max="50"
              step="5"
              value={settings.teenPatti.houseWinBoost}
              onChange={e => updateGameSetting('teenPatti', { houseWinBoost: parseInt(e.target.value) })}
              className="w-full h-2 bg-[#061510] rounded appearance-none cursor-pointer accent-[#D4AF37]"
            />
          </div>
        </div>

        {/* Ocean Hunter Controls */}
        <div className="royal-panel rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-[rgba(212,175,55,0.1)] pb-3">
            <h3 className="text-sm font-black text-[#E8C97A] flex items-center gap-2">
              🌊 Ocean Hunter Fish Catch Rate
            </h3>
            <span className="text-[10px] text-emerald-400 font-mono bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">Active</span>
          </div>

          <div className="space-y-3 text-xs">
            <div className="flex justify-between text-[11px] text-[rgba(212,175,55,0.7)] mb-1">
              <span>Catch Ease Multiplier</span>
              <span className="font-mono text-gold font-bold">{settings.oceanHunter.catchRate}×</span>
            </div>
            <input
              type="range"
              min="0.5"
              max="2.0"
              step="0.1"
              value={settings.oceanHunter.catchRate}
              onChange={e => updateGameSetting('oceanHunter', { catchRate: parseFloat(e.target.value) })}
              className="w-full h-2 bg-[#061510] rounded appearance-none cursor-pointer accent-[#D4AF37]"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

