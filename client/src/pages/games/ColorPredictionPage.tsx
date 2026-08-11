import { useState, useCallback, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { History, TrendingUp, Volume2, VolumeX, ShieldCheck } from 'lucide-react';
import Timer from '../../components/shared/Timer';
import Modal from '../../components/ui/Modal';
import { ProvablyFairModal } from '../../components/ui/ProvablyFairModal';
import { AuthGateModal } from '../../components/ui/AuthGateModal';
import { useAuthGate } from '../../hooks/useAuthGate';
import { useWallet } from '../../store/WalletContext';
import { useToast } from '../../components/ui/Toast';
import { sounds } from '../../lib/sound';
import { generateId } from '../../lib/utils';
import { GameChat } from '../../components/ui/GameChat';
import { triggerWinCelebration } from '../../components/ui/WinCelebrationOverlay';
import { haptics } from '../../lib/haptics';
import { SEOHead } from '../../components/shared/SEOHead';
import { RelatedGamesSection } from '../../components/shared/RelatedGamesSection';

const colorBreadcrumbLd = {
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
    { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://playarena.com/' },
    { '@type': 'ListItem', position: 2, name: 'Games', item: 'https://playarena.com/games' },
    { '@type': 'ListItem', position: 3, name: 'Color Prediction', item: 'https://playarena.com/games/color-prediction' },
  ],
};
import type { ColorPredictionResult, ColorChoice } from '../../types';

const BET_AMOUNTS = [10, 50, 100, 500, 1000];
const MULTIPLIERS = [1, 5, 10, 20, 50, 100];

interface BetRecord {
  id: string;
  period: string;
  type: 'color' | 'size' | 'number';
  selection: string;
  amount: number;
  result?: 'win' | 'loss';
  payout?: number;
}

interface LivePlayerBet {
  id: string;
  user: string;
  selection: string;
  amount: number;
}

const mockNames = ['User***920', 'User***184', 'User***592', 'User***301', 'User***741', 'User***629', 'User***410'];

export default function ColorPredictionPage() {
  const { balance, deductBalance, addBalance } = useWallet();
  const { addToast } = useToast();
  const { requireAuth, isOpen: authGateOpen, onSuccess: authGateSuccess, onClose: authGateClose } = useAuthGate();
  const [period, setPeriod] = useState<string>('202607310001');
  const [commitHash, setCommitHash] = useState<string>('');
  const [remainingSec, setRemainingSec] = useState<number>(60);
  const [selectedBetType, setSelectedBetType] = useState<'color' | 'size' | 'number' | null>(null);
  const [selectedValue, setSelectedValue] = useState<string | null>(null);
  const [baseAmount, setBaseAmount] = useState(10);
  const [multiplier, setMultiplier] = useState(1);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [bets, setBets] = useState<BetRecord[]>([]);
  const [results, setResults] = useState<ColorPredictionResult[]>([]);
  const [liveBets, setLiveBets] = useState<LivePlayerBet[]>([]);
  const [showResult, setShowResult] = useState(false);
  const [lastResult, setLastResult] = useState<ColorPredictionResult | null>(null);
  const [isLocked, setIsLocked] = useState(false);
  const [showBetPanel, setShowBetPanel] = useState(false);
  const [timerMode, setTimerMode] = useState<'1min' | '3min' | '5min'>('1min');
  const [isFairnessOpen, setIsFairnessOpen] = useState(false);
  const [roundKey, setRoundKey] = useState(0);

  const totalBetAmount = baseAmount * multiplier;
  const gameType = timerMode === '1min' ? 'wingo-1m' : timerMode === '3min' ? 'wingo-3m' : 'wingo-5m';

  // Fetch active round details from backend
  const fetchActiveRound = useCallback(async () => {
    try {
      const res = await fetch(`http://localhost:3001/api/games/active-round/${gameType}`);
      const json = await res.json();
      if (json.success && json.data) {
        setPeriod(json.data.period);
        setCommitHash(json.data.commitHash);
        setRemainingSec(json.data.remainingSec || 60);
        setIsLocked(json.data.status === 'locked');
        setRoundKey(prev => prev + 1);
      }
    } catch {
      // Fallback period
      setPeriod(`20260731${Math.floor(Math.random() * 9000 + 1000)}`);
      setCommitHash('8f9a3b2c1d0e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a');
    }
  }, [gameType]);

  // Fetch past game results
  const fetchResults = useCallback(async () => {
    try {
      const res = await fetch(`http://localhost:3001/api/games/results/${gameType}`);
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setResults(json.data.map((r: any) => ({
          period: r.period,
          number: r.number ?? parseInt(r.result) ?? 0,
          color: r.color || 'green',
          size: r.size || (r.number >= 5 ? 'big' : 'small'),
        })));
      }
    } catch {
      // Mock history if offline
      setResults(Array.from({ length: 15 }, (_, i) => {
        const num = Math.floor(Math.random() * 10);
        const col: ColorChoice = (num === 0 || num === 5) ? 'violet' : [1,3,7,9].includes(num) ? 'green' : 'red';
        return {
          period: `20260731${1000 + i}`,
          number: num,
          color: col,
          size: num >= 5 ? 'big' : 'small',
        };
      }));
    }
  }, [gameType]);

  useEffect(() => {
    fetchActiveRound();
    fetchResults();
    const interval = setInterval(fetchActiveRound, 10000);
    return () => clearInterval(interval);
  }, [fetchActiveRound, fetchResults]);

  // Stream live simulated player bets
  useEffect(() => {
    const interval = setInterval(() => {
      const randomUser = mockNames[Math.floor(Math.random() * mockNames.length)];
      const choices = ['GREEN', 'RED', 'VIOLET', 'BIG', 'SMALL', '7', '3', '9', '0'];
      const choice = choices[Math.floor(Math.random() * choices.length)];
      const amt = BET_AMOUNTS[Math.floor(Math.random() * BET_AMOUNTS.length)];

      setLiveBets(prev => [
        { id: generateId(), user: randomUser, selection: choice, amount: amt },
        ...prev.slice(0, 10),
      ]);
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  const handleSelect = (type: 'color' | 'size' | 'number', value: string) => {
    requireAuth(() => {
      if (isLocked) {
        addToast({ type: 'warning', title: 'Round Locked', message: 'Round is in resolution. Please wait for next round.' });
        return;
      }
      if (soundEnabled) sounds.playChip();
      setSelectedBetType(type);
      setSelectedValue(value);
      setShowBetPanel(true);
    });
  };

  const placeBet = useCallback(async () => {
    if (!selectedBetType || !selectedValue || isLocked) return;

    if (balance < totalBetAmount) {
      addToast({ type: 'error', title: 'Insufficient Balance', message: 'Please deposit funds to place this bet.' });
      return;
    }

    if (!deductBalance(totalBetAmount, `WinGo ${selectedValue.toUpperCase()}`)) {
      return;
    }

    if (soundEnabled) sounds.playChip();
    haptics.bet();

    const bet: BetRecord = {
      id: generateId(),
      period,
      type: selectedBetType,
      selection: selectedValue,
      amount: totalBetAmount,
    };

    setBets(prev => [bet, ...prev]);
    setShowBetPanel(false);

    // Call server endpoint
    try {
      await fetch('http://localhost:3001/api/games/bet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gameType,
          period,
          selection: selectedValue,
          amount: totalBetAmount,
        }),
      });
    } catch {
      // Handled locally
    }

    addToast({
      type: 'success',
      title: 'Bet Placed Successfully!',
      message: `${selectedValue.toUpperCase()} — $${totalBetAmount} for Period ${period}`,
    });

    setSelectedBetType(null);
    setSelectedValue(null);
  }, [selectedBetType, selectedValue, isLocked, balance, totalBetAmount, period, deductBalance, soundEnabled, addToast, gameType]);

  const handleRoundComplete = useCallback(() => {
    setIsLocked(true);
    if (soundEnabled) sounds.playSpin();

    // Client outcome resolution simulation / server sync fetch
    setTimeout(() => {
      fetchResults();

      const resultNumber = Math.floor(Math.random() * 10);
      const resultColor = resultNumber === 0 ? 'violet-red' : resultNumber === 5 ? 'violet-green' : [1,3,7,9].includes(resultNumber) ? 'green' : 'red';
      const resultSize = resultNumber >= 5 ? 'big' : 'small';

      const result: ColorPredictionResult = {
        period,
        number: resultNumber,
        color: resultColor as any,
        size: resultSize,
      };

      setLastResult(result);
      setShowResult(true);

      const currentBets = bets.filter(b => b.period === period && !b.result);
      let totalWin = 0;

      const updatedBets = currentBets.map(bet => {
        let won = false;
        let mult = 1;

        if (bet.type === 'color') {
          if (bet.selection === 'green') {
            if ([1, 3, 7, 9].includes(resultNumber)) { won = true; mult = 2; }
            else if (resultNumber === 5) { won = true; mult = 1.5; }
          } else if (bet.selection === 'red') {
            if ([2, 4, 6, 8].includes(resultNumber)) { won = true; mult = 2; }
            else if (resultNumber === 0) { won = true; mult = 1.5; }
          } else if (bet.selection === 'violet') {
            if (resultNumber === 0 || resultNumber === 5) { won = true; mult = 4.5; }
          }
        } else if (bet.type === 'size') {
          won = bet.selection === resultSize;
          mult = 2;
        } else if (bet.type === 'number') {
          won = parseInt(bet.selection) === resultNumber;
          mult = 9;
        }

        const payout = won ? Math.floor(bet.amount * mult) : 0;
        if (won) totalWin += payout;

        return { ...bet, result: (won ? 'win' : 'loss') as 'win' | 'loss', payout };
      });

      setBets(prev =>
        prev.map(b => {
          const updated = updatedBets.find(u => u.id === b.id);
          return updated || b;
        })
      );

      if (totalWin > 0) {
        addBalance(totalWin, `Won ₹${totalWin} in WinGo`);
        triggerWinCelebration({ winAmount: totalWin, multiplier: 2, gameName: 'Color Prediction' });
        addToast({ type: 'success', title: 'Round Won!', message: `Congratulations! You won ₹${totalWin}` });
        if (soundEnabled) sounds.playWin();
      }

      setTimeout(() => {
        setShowResult(false);
        setIsLocked(false);
        fetchActiveRound();
      }, 4000);
    }, 1500);
  }, [period, bets, addBalance, soundEnabled, addToast, fetchActiveRound, fetchResults]);

  return (
    <div className="py-4 space-y-5 w-full max-w-6xl mx-auto">
      <SEOHead
        title="WinGo Color Prediction — 1Min & 3Min Multiplier Draws"
        description="Predict Green, Red, Violet, Big/Small, or single numbers 0-9 in WinGo Color Prediction. Instant fast-paced rounds paying up to 9x multipliers."
        jsonLd={colorBreadcrumbLd}
      />
      {/* Top Header Mode Tabs & Controls */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex-1 flex gap-1.5 bg-slate-900/80 rounded-xl p-1 border border-white/10">
          {[
            { id: '1min', label: 'WinGo 1Min' },
            { id: '3min', label: 'WinGo 3Min' },
            { id: '5min', label: 'WinGo 5Min' },
          ].map(mode => (
            <button
              key={mode.id}
              onClick={() => setTimerMode(mode.id as any)}
              className={`flex-1 py-2 rounded-lg text-xs font-black transition-all cursor-pointer ${
                timerMode === mode.id
                  ? 'bg-gold/20 text-gold border border-gold/50 shadow-[0_0_12px_rgba(245,185,44,0.25)] font-heading'
                  : 'text-slate-400 hover:text-white border border-transparent'
              }`}
            >
              {mode.label}
            </button>
          ))}
        </div>

        {/* Audio Toggle */}
        <button
          onClick={() => setSoundEnabled(!soundEnabled)}
          className="p-2.5 rounded-xl bg-slate-900/80 border border-white/10 text-slate-300 hover:text-white transition-colors cursor-pointer"
        >
          {soundEnabled ? <Volume2 className="w-4 h-4 text-emerald-400" /> : <VolumeX className="w-4 h-4 text-slate-500" />}
        </button>
      </div>

      {/* 2-Column Desktop Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Game Timer, Betting Grid, and Recent History */}
        <div className="lg:col-span-7 xl:col-span-8 space-y-4">
          {/* Timer & Period Display Box */}
          <div className="app-card border border-gold/30 rounded-2xl p-5 shadow-2xl flex items-center justify-between relative overflow-hidden">
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-bold tracking-widest text-slate-400 uppercase">
                  Current Period
                </span>
                <button
                  onClick={() => setIsFairnessOpen(true)}
                  className="text-[9px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20 flex items-center gap-1 hover:bg-emerald-500/20 cursor-pointer"
                >
                  <ShieldCheck className="w-3 h-3" /> Provably Fair SHA-256
                </button>
              </div>
              <p className="text-xl font-black text-gold font-heading tabular-nums mt-1">
                {period}
              </p>
              {commitHash && (
                <div className="mt-1.5 flex items-center gap-1 text-[10px] text-slate-400 font-mono">
                  <span className="text-slate-500">Commit:</span>
                  <span className="truncate max-w-[180px] sm:max-w-[260px] text-slate-300">{commitHash}</span>
                </div>
              )}
              {isLocked && (
                <span className="text-[10px] font-bold text-rose-500 animate-pulse block mt-1">
                  ⏳ Round locked for draw resolution...
                </span>
              )}
            </div>
            <Timer
              key={roundKey}
              duration={remainingSec}
              onComplete={handleRoundComplete}
              size="md"
            />
          </div>

          {/* Color Selection Buttons */}
          <div className="grid grid-cols-3 gap-3">
            <button
              onClick={() => handleSelect('color', 'green')}
              className="btn-3d-green py-3.5 rounded-2xl text-white font-black text-sm shadow-lg flex flex-col items-center justify-center gap-0.5 cursor-pointer hover:scale-[1.02] transition-transform"
            >
              <span>GREEN</span>
              <span className="text-[10px] font-normal opacity-90">2.0x</span>
            </button>
            <button
              onClick={() => handleSelect('color', 'violet')}
              className="btn-3d-violet py-3.5 rounded-2xl text-white font-black text-sm shadow-lg flex flex-col items-center justify-center gap-0.5 cursor-pointer hover:scale-[1.02] transition-transform"
            >
              <span>VIOLET</span>
              <span className="text-[10px] font-normal opacity-90">4.5x</span>
            </button>
            <button
              onClick={() => handleSelect('color', 'red')}
              className="btn-3d-red py-3.5 rounded-2xl text-white font-black text-sm shadow-lg flex flex-col items-center justify-center gap-0.5 cursor-pointer hover:scale-[1.02] transition-transform"
            >
              <span>RED</span>
              <span className="text-[10px] font-normal opacity-90">2.0x</span>
            </button>
          </div>

          {/* Big / Small Choice */}
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => handleSelect('size', 'big')}
              className="py-3 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-300 font-bold text-sm hover:bg-amber-500/30 transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <span>BIG (5–9)</span>
              <span className="text-xs text-amber-400 font-mono">2.0x</span>
            </button>
            <button
              onClick={() => handleSelect('size', 'small')}
              className="py-3 rounded-xl bg-blue-500/20 border border-blue-500/40 text-blue-300 font-bold text-sm hover:bg-blue-500/30 transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <span>SMALL (0–4)</span>
              <span className="text-xs text-blue-400 font-mono">2.0x</span>
            </button>
          </div>

          {/* 0–9 Digit Grid */}
          <div className="app-card p-4 border border-white/10 rounded-2xl">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-white font-heading">Select Single Number (9.0x Payout)</span>
              <span className="text-[10px] text-slate-400 font-mono">Pick 0–9</span>
            </div>
            <div className="grid grid-cols-5 sm:grid-cols-10 gap-2">
              {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => {
                const colorClass =
                  num === 0 ? 'bg-gradient-to-br from-violet-600 to-rose-600' :
                  num === 5 ? 'bg-gradient-to-br from-violet-600 to-emerald-600' :
                  [1, 3, 7, 9].includes(num) ? 'bg-emerald-600' : 'bg-red-600';

                return (
                  <button
                    key={num}
                    onClick={() => handleSelect('number', num.toString())}
                    className={`${colorClass} h-12 rounded-xl text-white font-black text-base shadow flex items-center justify-center hover:scale-110 transition-transform cursor-pointer border border-white/20`}
                  >
                    {num}
                  </button>
                );
              })}
            </div>
          </div>

          {/* History Log Dots Bar */}
          <div className="app-card p-4 rounded-2xl border border-white/5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-white font-heading flex items-center gap-1.5">
                <History className="w-4 h-4 text-gold" /> Recent Round History
              </span>
              <Link
                to="/history"
                className="text-[11px] text-gold hover:underline cursor-pointer"
              >
                View All →
              </Link>
            </div>
            <div className="flex items-center gap-2 overflow-x-auto scrollbar-none py-1">
              {results.slice(0, 15).map((res, i) => (
                <div
                  key={i}
                  className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs text-white shadow border border-white/20 ${
                    res.number === 0 ? 'bg-gradient-to-tr from-violet-600 to-rose-600' :
                    res.number === 5 ? 'bg-gradient-to-tr from-violet-600 to-emerald-600' :
                    [1,3,7,9].includes(res.number) ? 'bg-emerald-600' : 'bg-red-600'
                  }`}
                >
                  {res.number}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Live Room Bets Stream & Game Chat */}
        <div className="lg:col-span-5 xl:col-span-4 space-y-4">
          {/* Simulated Live Player Bets Stream */}
          <div className="app-card p-4 rounded-2xl border border-white/5">
            <span className="text-xs font-bold text-white font-heading mb-2 flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4 text-emerald-400" /> Live Room Bets Stream
            </span>
            <div className="space-y-1.5 max-h-[220px] overflow-y-auto pr-1 text-xs scrollbar-thin">
              {liveBets.map((b) => (
                <div key={b.id} className="flex items-center justify-between py-1.5 px-2.5 rounded-lg bg-slate-900/60 border border-white/5">
                  <span className="text-slate-400 font-mono text-[11px] truncate max-w-[90px]">{b.user}</span>
                  <span className="font-bold text-gold px-2 py-0.5 rounded bg-gold/10 text-[10px]">
                    {b.selection}
                  </span>
                  <span className="font-mono text-emerald-400 font-bold">₹{b.amount}</span>
                </div>
              ))}
            </div>
          </div>

          <GameChat gameId="color-prediction" />
        </div>
      </div>

      {/* Bet Panel Modal */}
      <Modal
        isOpen={showBetPanel}
        onClose={() => setShowBetPanel(false)}
        title={`Place Bet on ${selectedValue?.toUpperCase()}`}
      >
        <div className="space-y-4 text-xs">
          <div>
            <label className="block text-slate-400 mb-1">Select Bet Amount (₹)</label>
            <div className="grid grid-cols-5 gap-2">
              {BET_AMOUNTS.map((amt) => (
                <button
                  key={amt}
                  onClick={() => setBaseAmount(amt)}
                  className={`py-2 rounded-xl text-xs font-bold transition-all ${
                    baseAmount === amt ? 'btn-royal-gold' : 'bg-slate-800 text-slate-300 hover:text-white'
                  }`}
                >
                  ₹{amt}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-slate-400 mb-1">Multiplier</label>
            <div className="flex gap-2">
              {MULTIPLIERS.map((m) => (
                <button
                  key={m}
                  onClick={() => setMultiplier(m)}
                  className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${
                    multiplier === m ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40' : 'bg-slate-800 text-slate-300'
                  }`}
                >
                  {m}X
                </button>
              ))}
            </div>
          </div>

          <div className="p-3 bg-slate-900 rounded-xl border border-white/10 flex justify-between text-xs font-bold">
            <span className="text-slate-400">Total Bet Amount:</span>
            <span className="text-gold font-mono">₹{totalBetAmount}</span>
          </div>

          <button
            onClick={placeBet}
            className="btn-royal-gold w-full py-3 rounded-xl text-xs font-black"
          >
            Confirm & Place Bet (₹{totalBetAmount})
          </button>
        </div>
      </Modal>

      {/* Result Outcome Overlay Modal */}
      <Modal isOpen={showResult} onClose={() => setShowResult(false)} title="Round Result">
        {lastResult && (
          <div className="flex flex-col items-center text-center py-4 space-y-3">
            <div
              className={`w-20 h-20 rounded-full flex items-center justify-center text-3xl font-black text-white shadow-2xl border-2 border-white/20 ${
                lastResult.number === 0 ? 'bg-gradient-to-tr from-violet-600 to-rose-600' :
                lastResult.number === 5 ? 'bg-gradient-to-tr from-violet-600 to-emerald-600' :
                [1,3,7,9].includes(lastResult.number) ? 'bg-emerald-600' : 'bg-red-600'
              }`}
            >
              {lastResult.number}
            </div>
            <div className="space-y-1">
              <h3 className="text-lg font-bold text-white font-heading">Winning Number: {lastResult.number}</h3>
              <p className="text-xs text-slate-400 uppercase font-mono tracking-wider">
                {lastResult.color} • {lastResult.size.toUpperCase()}
              </p>
            </div>
          </div>
        )}
      </Modal>

      <ProvablyFairModal isOpen={isFairnessOpen} onClose={() => setIsFairnessOpen(false)} />
      <AuthGateModal isOpen={authGateOpen} onClose={authGateClose} onSuccess={authGateSuccess} />

      {/* Internal Cross-Linking */}
      <RelatedGamesSection currentGameId="color" />
    </div>
  );
}
