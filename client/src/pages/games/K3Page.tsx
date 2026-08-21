import { useState, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { ShieldCheck, Volume2, VolumeX, History, Sparkles, Trophy, Flame } from 'lucide-react';
import Timer from '../../components/shared/Timer';
import Modal from '../../components/ui/Modal';
import { ProvablyFairModal } from '../../components/ui/ProvablyFairModal';
import { AuthGateModal } from '../../components/ui/AuthGateModal';
import { useAuthGate } from '../../hooks/useAuthGate';
import { useWallet } from '../../store/WalletContext';
import { useToast } from '../../components/ui/Toast';
import { sounds } from '../../lib/sound';
import { haptics } from '../../lib/haptics';
import { triggerWinCelebration } from '../../components/ui/WinCelebrationOverlay';
import { SEOHead } from '../../components/shared/SEOHead';
import { RelatedGamesSection } from '../../components/shared/RelatedGamesSection';
import { orderLedger } from '../../lib/orderLedger';
import { GameOrderLedger } from '../../components/shared/GameOrderLedger';

const k3BreadcrumbLd = {
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
    { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://playarena.com/' },
    { '@type': 'ListItem', position: 2, name: 'Games', item: 'https://playarena.com/games' },
    { '@type': 'ListItem', position: 3, name: 'K3 Lottery', item: 'https://playarena.com/games/k3' },
  ],
};

/* ─── K3 Game Types & Payout Rules ──────────────────────────────── */
type K3Tab = 'sum' | 'two_same' | 'three_same' | 'different';

interface BetSelection {
  tab: K3Tab;
  code: string;
  label: string;
  multiplier: number;
}

const SUM_PAYOUTS: Record<number, number> = {
  3: 207.36, 4: 69.12, 5: 34.56, 6: 20.74, 7: 13.82, 8: 9.88,
  9: 8.30, 10: 7.68, 11: 7.68, 12: 8.30, 13: 9.88, 14: 13.82,
  15: 20.74, 16: 34.56, 17: 69.12, 18: 207.36,
};

const BET_AMOUNTS = [10, 50, 100, 500, 1000];
const MULTIPLIERS = [1, 5, 10, 20, 50, 100];

/* ─── 3D Die SVG Component ──────────────────────────────────────── */
function Dice3D({ value, isRolling }: { value: number; isRolling: boolean }) {
  const pipCoords: Record<number, [number, number][]> = {
    1: [[50, 50]],
    2: [[25, 25], [75, 75]],
    3: [[25, 25], [50, 50], [75, 75]],
    4: [[25, 25], [75, 25], [25, 75], [75, 75]],
    5: [[25, 25], [75, 25], [50, 50], [25, 75], [75, 75]],
    6: [[25, 22], [75, 22], [25, 50], [75, 50], [25, 78], [75, 78]],
  };

  const pips = pipCoords[value] || pipCoords[1];

  return (
    <motion.div
      animate={isRolling ? {
        rotateX: [0, 360, 720, 1080],
        rotateY: [0, 720, 1440, 2160],
        scale: [1, 1.25, 0.9, 1],
        y: [0, -35, -15, 0],
      } : { rotateX: 0, rotateY: 0, scale: 1, y: 0 }}
      transition={{ duration: 1.2, ease: 'easeOut' }}
      className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-br from-[#FFFDF5] via-[#F4E8C1] to-[#D4AF37] p-1.5 shadow-[0_8px_20px_rgba(0,0,0,0.6),inset_0_2px_4px_rgba(255,255,255,0.9),inset_0_-2px_4px_rgba(184,134,11,0.5)] border border-[#FFE57F] flex items-center justify-center relative"
    >
      <svg viewBox="0 0 100 100" className="w-full h-full">
        {pips.map(([cx, cy], i) => (
          <circle
            key={i}
            cx={cx}
            cy={cy}
            r={value === 1 ? 14 : 9}
            fill={value === 1 || value === 4 ? '#E60026' : '#1A1A1A'}
            stroke={value === 1 || value === 4 ? '#8B0000' : '#000000'}
            strokeWidth={1.5}
            filter="drop-shadow(0 1px 2px rgba(0,0,0,0.4))"
          />
        ))}
      </svg>
    </motion.div>
  );
}

/* ─── Main K3 Component ─────────────────────────────────────────── */
export default function K3Page() {
  const { balance, deductBalance, addBalance } = useWallet();
  const { addToast } = useToast();
  const { requireAuth, isOpen: authGateOpen, onSuccess: authGateSuccess, onClose: authGateClose } = useAuthGate();

  const [timerMode, setTimerMode] = useState<'1m' | '3m' | '5m' | '10m'>('1m');
  const [period, setPeriod] = useState<string>('20260821001');
  const [remainingSec] = useState<number>(60);
  const [isLocked, setIsLocked] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [isFairnessOpen, setIsFairnessOpen] = useState(false);

  // Active Bet Configuration
  const [activeTab, setActiveTab] = useState<K3Tab>('sum');
  const [selectedBet, setSelectedBet] = useState<BetSelection | null>(null);
  const [baseAmount, setBaseAmount] = useState(10);
  const [multiplier, setMultiplier] = useState(1);
  const [showBetModal, setShowBetModal] = useState(false);

  // Physical Dice State
  const [dice, setDice] = useState<[number, number, number]>([3, 4, 5]);
  const [isRolling, setIsRolling] = useState(false);
  const [lastResult, setLastResult] = useState<{
    period: string;
    dice: [number, number, number];
    sum: number;
    size: 'big' | 'small';
    parity: 'odd' | 'even';
  } | null>(null);

  const [roundHistory, setRoundHistory] = useState<Array<{
    period: string;
    dice: [number, number, number];
    sum: number;
    size: 'big' | 'small';
  }>>([
    { period: '20260821000', dice: [2, 4, 6], sum: 12, size: 'big' },
    { period: '20260820999', dice: [1, 3, 4], sum: 8, size: 'small' },
    { period: '20260820998', dice: [5, 5, 5], sum: 15, size: 'big' },
    { period: '20260820997', dice: [2, 3, 5], sum: 10, size: 'small' },
  ]);

  const activeBetsRef = useRef<Array<{
    id: string;
    period: string;
    selection: BetSelection;
    betAmount: number;
  }>>([]);

  const totalBetAmount = baseAmount * multiplier;

  // Handle Bet Confirmation
  const confirmBet = () => {
    requireAuth(async () => {
      if (!selectedBet) return;
      if (isLocked) {
        addToast({ type: 'warning', title: 'Round Locked', message: 'Wait for next round draw!' });
        return;
      }
      if (balance < totalBetAmount) {
        addToast({ type: 'error', title: 'Insufficient Balance' });
        return;
      }

      if (!deductBalance(totalBetAmount, `K3 bet — ${selectedBet.label}`)) {
        addToast({ type: 'error', title: 'Insufficient Balance' });
        return;
      }

      const orderId = `TXN_K3_${Date.now().toString(36).toUpperCase()}_${Math.random().toString(36).slice(2, 6).toUpperCase()}`;

      orderLedger.recordOrder({
        id: orderId,
        gameId: 'k3',
        gameName: 'K3 3-Dice Lottery',
        period,
        userId: 'player',
        userName: 'You',
        selection: `${selectedBet.label} (${selectedBet.multiplier}×)`,
        betAmount: totalBetAmount,
        status: 'pending',
      });

      activeBetsRef.current.push({
        id: orderId,
        period,
        selection: selectedBet,
        betAmount: totalBetAmount,
      });

      setShowBetModal(false);
      sounds.playChip();
      haptics.bet();
      addToast({
        type: 'success',
        title: 'K3 Bet Placed!',
        message: `${selectedBet.label} — ₹${totalBetAmount} for Period #${period}`,
      });
    });
  };

  // Resolve Round
  const handleRoundComplete = useCallback(() => {
    setIsLocked(true);
    setIsRolling(true);
    if (soundEnabled) sounds.playSpin();

    setTimeout(() => {
      const d1 = Math.floor(Math.random() * 6) + 1;
      const d2 = Math.floor(Math.random() * 6) + 1;
      const d3 = Math.floor(Math.random() * 6) + 1;
      const newDice: [number, number, number] = [d1, d2, d3];
      const sum = d1 + d2 + d3;
      const size: 'big' | 'small' = sum >= 11 ? 'big' : 'small';
      const parity: 'odd' | 'even' = sum % 2 === 0 ? 'even' : 'odd';

      setDice(newDice);
      setIsRolling(false);

      const outcome = { period, dice: newDice, sum, size, parity };
      setLastResult(outcome);
      setRoundHistory(prev => [outcome, ...prev].slice(0, 15));

      // Settle active player bets
      const currentBets = activeBetsRef.current.filter(b => b.period === period);
      let totalWon = 0;

      currentBets.forEach(bet => {
        let isWon = false;
        const sel = bet.selection;

        if (sel.tab === 'sum') {
          if (sel.code === 'big') isWon = size === 'big';
          else if (sel.code === 'small') isWon = size === 'small';
          else if (sel.code === 'odd') isWon = parity === 'odd';
          else if (sel.code === 'even') isWon = parity === 'even';
          else if (sel.code === `sum_${sum}`) isWon = true;
        } else if (sel.tab === 'two_same') {
          const counts = [d1, d2, d3].reduce((acc, val) => {
            acc[val] = (acc[val] || 0) + 1;
            return acc;
          }, {} as Record<number, number>);
          const hasPair = Object.values(counts).some(c => c >= 2);
          if (sel.code === 'any_pair') isWon = hasPair;
          else {
            const targetNum = parseInt(sel.code.replace('pair_', ''));
            isWon = (counts[targetNum] || 0) >= 2;
          }
        } else if (sel.tab === 'three_same') {
          const isTriple = d1 === d2 && d2 === d3;
          if (sel.code === 'any_triple') isWon = isTriple;
          else {
            const targetNum = parseInt(sel.code.replace('triple_', ''));
            isWon = isTriple && d1 === targetNum;
          }
        } else if (sel.tab === 'different') {
          const isDiff = d1 !== d2 && d2 !== d3 && d1 !== d3;
          if (sel.code === 'three_different') isWon = isDiff;
          else if (sel.code === 'consecutive') {
            const sorted = [d1, d2, d3].sort((a, b) => a - b);
            isWon = sorted[0] + 1 === sorted[1] && sorted[1] + 1 === sorted[2];
          }
        }

        const payout = isWon ? Math.floor(bet.betAmount * sel.multiplier * 100) / 100 : 0;
        if (isWon) totalWon += payout;

        orderLedger.updateOrder(bet.id, {
          resultOutcome: `Dice [${d1}, ${d2}, ${d3}] Sum ${sum} (${size.toUpperCase()})`,
          multiplier: sel.multiplier,
          winAmount: payout,
          status: isWon ? 'won' : 'lost',
        });
      });

      if (totalWon > 0) {
        addBalance(totalWon, `K3 Win — ₹${totalWon}`);
        triggerWinCelebration({ winAmount: totalWon, multiplier: 5, gameName: 'K3 Dice' });
        sounds.playWin();
        haptics.jackpot();
        addToast({ type: 'success', title: '🎉 K3 Win!', message: `Congratulations! Won ₹${totalWon}` });
      }

      activeBetsRef.current = [];

      // Advance period
      setTimeout(() => {
        setPeriod(p => (parseInt(p) + 1).toString());
        setIsLocked(false);
      }, 3000);
    }, 1200);
  }, [period, soundEnabled, addBalance, addToast]);

  const openBetModal = (tab: K3Tab, code: string, label: string, multiplier: number) => {
    setSelectedBet({ tab, code, label, multiplier });
    setShowBetModal(true);
  };

  return (
    <div className="py-4 space-y-5 w-full max-w-6xl mx-auto">
      <SEOHead
        title="K3 3-Dice Lottery — Real Physical Dice Rolls & Sum Multipliers"
        description="Play K3 3-Dice Lottery on PlayArena. Featuring 3D rolling dice cup physics, Total Sum (3-18), Pairs, Triples up to 207x, and provably fair SHA-256 rounds."
        jsonLd={k3BreadcrumbLd}
      />

      {/* Header & Modes */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-400 via-gold to-amber-600 flex items-center justify-center text-black font-black text-2xl shadow-[0_0_20px_rgba(212,175,55,0.4)]">
            🎲
          </div>
          <div>
            <h1 className="text-xl font-black text-white font-heading tracking-tight flex items-center gap-2">
              K3 3-Dice Lottery
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/25 flex items-center gap-1">
                <Flame className="w-3 h-3 text-amber-400" /> UP TO 207.36×
              </span>
            </h1>
            <p className="text-xs text-slate-400">Total Sum • Two Same • Three Same Triples • Consecutive</p>
          </div>
        </div>

        {/* Timer Modes & Fairness */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 p-1 bg-slate-900/90 rounded-xl border border-white/10">
            {(['1m', '3m', '5m', '10m'] as const).map(m => (
              <button
                key={m}
                onClick={() => setTimerMode(m)}
                className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer ${
                  timerMode === m
                    ? 'bg-gold text-black shadow-md font-heading'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                K3 {m}
              </button>
            ))}
          </div>

          <button
            onClick={() => setIsFairnessOpen(true)}
            className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20 cursor-pointer"
            title="Provably Fair Audit"
          >
            <ShieldCheck className="w-4 h-4" />
          </button>
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="p-2.5 rounded-xl bg-slate-900 border border-white/10 text-slate-300 hover:text-white cursor-pointer"
          >
            {soundEnabled ? <Volume2 className="w-4 h-4 text-emerald-400" /> : <VolumeX className="w-4 h-4 text-slate-500" />}
          </button>
        </div>
      </div>

      {/* Center 3D Rolling Glass Cup & Live Draw Board */}
      <div className="rounded-3xl p-5 bg-gradient-to-b from-[#0B2318] via-[#061510] to-[#020A06] border border-gold/30 shadow-[0_20px_50px_rgba(0,0,0,0.8),0_0_30px_rgba(212,175,55,0.15)] relative overflow-hidden">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6 relative z-10">
          
          {/* Period Info */}
          <div className="text-center md:text-left">
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Active Draw Period</span>
            <h2 className="text-2xl font-black text-gold font-heading tabular-nums">#{period}</h2>
            {isLocked && (
              <span className="text-xs font-bold text-rose-400 animate-pulse block mt-1">
                ⏳ Rolling 3D Dice...
              </span>
            )}
          </div>

          {/* 3D Glass Cup with 3 Rolling Dice */}
          <div className="flex flex-col items-center">
            <div className="px-8 py-5 rounded-3xl bg-slate-950/80 border-2 border-gold/40 shadow-[inset_0_0_30px_rgba(212,175,55,0.2),0_10px_30px_rgba(0,0,0,0.8)] backdrop-blur-xl flex items-center gap-4 relative">
              <Dice3D value={dice[0]} isRolling={isRolling} />
              <Dice3D value={dice[1]} isRolling={isRolling} />
              <Dice3D value={dice[2]} isRolling={isRolling} />
            </div>

            {lastResult && (
              <div className="mt-3 flex items-center gap-2 text-xs font-bold font-mono">
                <span className="text-slate-400">Sum:</span>
                <span className="text-gold text-sm px-2 py-0.5 rounded bg-gold/10 border border-gold/30">{lastResult.sum}</span>
                <span className={`px-2 py-0.5 rounded text-white ${lastResult.size === 'big' ? 'bg-amber-600' : 'bg-blue-600'}`}>
                  {lastResult.size.toUpperCase()}
                </span>
                <span className={`px-2 py-0.5 rounded text-white ${lastResult.parity === 'odd' ? 'bg-emerald-600' : 'bg-purple-600'}`}>
                  {lastResult.parity.toUpperCase()}
                </span>
              </div>
            )}
          </div>

          {/* Round Countdown */}
          <div className="flex flex-col items-center">
            <Timer duration={remainingSec} onComplete={handleRoundComplete} size="md" />
          </div>
        </div>
      </div>

      {/* K3 Bet Type Selector Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
        {[
          { id: 'sum', label: 'Total Sum (3–18)', badge: 'Up to 207×' },
          { id: 'two_same', label: '2 Same Numbers', badge: 'Up to 69×' },
          { id: 'three_same', label: '3 Same Triples', badge: 'Up to 207×' },
          { id: 'different', label: 'Different & Consecutive', badge: 'Up to 34.5×' },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as K3Tab)}
            className={`px-4 py-2.5 rounded-2xl text-xs font-black whitespace-nowrap transition-all cursor-pointer flex items-center gap-2 border ${
              activeTab === tab.id
                ? 'btn-royal-gold shadow-lg'
                : 'bg-slate-900/80 text-slate-400 border-white/10 hover:text-white'
            }`}
          >
            <span>{tab.label}</span>
            <span className="text-[9px] px-1.5 py-0.5 rounded bg-black/30 text-gold font-mono">{tab.badge}</span>
          </button>
        ))}
      </div>

      {/* Tab 1: Total Sum Grid */}
      {activeTab === 'sum' && (
        <div className="royal-panel rounded-3xl p-5 space-y-4 border border-gold/20">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <button
              onClick={() => openBetModal('sum', 'big', 'BIG (11–18)', 1.96)}
              className="p-3.5 rounded-2xl bg-amber-500/15 border border-amber-500/40 text-amber-300 font-black text-sm flex flex-col items-center justify-center hover:bg-amber-500/25 transition-all cursor-pointer"
            >
              <span>BIG (11–18)</span>
              <span className="text-xs text-amber-400 font-mono">1.96×</span>
            </button>
            <button
              onClick={() => openBetModal('sum', 'small', 'SMALL (3–10)', 1.96)}
              className="p-3.5 rounded-2xl bg-blue-500/15 border border-blue-500/40 text-blue-300 font-black text-sm flex flex-col items-center justify-center hover:bg-blue-500/25 transition-all cursor-pointer"
            >
              <span>SMALL (3–10)</span>
              <span className="text-xs text-blue-400 font-mono">1.96×</span>
            </button>
            <button
              onClick={() => openBetModal('sum', 'odd', 'ODD SUM', 1.96)}
              className="p-3.5 rounded-2xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 font-black text-sm flex flex-col items-center justify-center hover:bg-emerald-500/25 transition-all cursor-pointer"
            >
              <span>ODD</span>
              <span className="text-xs text-emerald-400 font-mono">1.96×</span>
            </button>
            <button
              onClick={() => openBetModal('sum', 'even', 'EVEN SUM', 1.96)}
              className="p-3.5 rounded-2xl bg-purple-500/15 border border-purple-500/40 text-purple-300 font-black text-sm flex flex-col items-center justify-center hover:bg-purple-500/25 transition-all cursor-pointer"
            >
              <span>EVEN</span>
              <span className="text-xs text-purple-400 font-mono">1.96×</span>
            </button>
          </div>

          <div className="grid grid-cols-4 sm:grid-cols-8 gap-2 pt-2">
            {Object.entries(SUM_PAYOUTS).map(([sumStr, mult]) => {
              const sumNum = parseInt(sumStr);
              return (
                <button
                  key={sumStr}
                  onClick={() => openBetModal('sum', `sum_${sumNum}`, `Sum ${sumNum}`, mult)}
                  className="p-2.5 rounded-xl bg-slate-950/80 border border-white/10 hover:border-gold/60 text-center transition-all cursor-pointer flex flex-col items-center"
                >
                  <span className="text-base font-black text-white font-mono">{sumNum}</span>
                  <span className="text-[10px] font-bold text-gold font-mono">{mult}×</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Tab 2: 2 Same Numbers Grid */}
      {activeTab === 'two_same' && (
        <div className="royal-panel rounded-3xl p-5 space-y-4 border border-gold/20">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <button
              onClick={() => openBetModal('two_same', 'any_pair', 'Any 2 Matching Pair', 13.82)}
              className="col-span-2 sm:col-span-4 p-4 rounded-2xl bg-gradient-to-r from-amber-500/20 to-gold/20 border border-gold/40 text-gold font-black text-sm flex items-center justify-between cursor-pointer hover:bg-gold/20"
            >
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-amber-400" />
                <span>Any Two Matching Numbers (Pair)</span>
              </div>
              <span className="text-base font-mono text-white">13.82× Payout</span>
            </button>

            {[1, 2, 3, 4, 5, 6].map(num => (
              <button
                key={num}
                onClick={() => openBetModal('two_same', `pair_${num}`, `Pair ${num}${num}`, 69.12)}
                className="p-3.5 rounded-xl bg-slate-950/80 border border-white/10 hover:border-gold text-center cursor-pointer flex items-center justify-between"
              >
                <span className="text-lg font-black text-white font-mono">{num}{num}</span>
                <span className="text-xs font-bold text-gold font-mono">69.12×</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Tab 3: 3 Same Triples Grid */}
      {activeTab === 'three_same' && (
        <div className="royal-panel rounded-3xl p-5 space-y-4 border border-gold/20">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <button
              onClick={() => openBetModal('three_same', 'any_triple', 'Any 3 Identical (Any Triple)', 34.56)}
              className="col-span-2 sm:col-span-4 p-4 rounded-2xl bg-gradient-to-r from-rose-500/20 via-amber-500/20 to-gold/20 border border-gold/50 text-gold font-black text-sm flex items-center justify-between cursor-pointer hover:scale-[1.01] transition-transform"
            >
              <div className="flex items-center gap-2">
                <Trophy className="w-5 h-5 text-amber-400" />
                <span>Any 3 Same Numbers (Any Triple)</span>
              </div>
              <span className="text-base font-mono text-white">34.56× Payout</span>
            </button>

            {[1, 2, 3, 4, 5, 6].map(num => (
              <button
                key={num}
                onClick={() => openBetModal('three_same', `triple_${num}`, `Specific Triple ${num}${num}${num}`, 207.36)}
                className="p-4 rounded-2xl bg-slate-950 border border-amber-500/30 hover:border-gold text-center cursor-pointer flex items-center justify-between shadow-md"
              >
                <span className="text-lg font-black text-white font-mono">{num}{num}{num}</span>
                <span className="text-xs font-bold text-emerald-400 font-mono">207.36×</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Tab 4: Different Numbers */}
      {activeTab === 'different' && (
        <div className="royal-panel rounded-3xl p-5 space-y-4 border border-gold/20">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              onClick={() => openBetModal('different', 'three_different', '3 Distinct Numbers', 8.64)}
              className="p-5 rounded-2xl bg-slate-950/80 border border-white/10 hover:border-gold flex items-center justify-between cursor-pointer"
            >
              <div className="text-left">
                <span className="text-sm font-black text-white block">3 Distinct Numbers</span>
                <span className="text-[10px] text-slate-400">All 3 dice have different values</span>
              </div>
              <span className="text-sm font-bold text-gold font-mono">8.64×</span>
            </button>

            <button
              onClick={() => openBetModal('different', 'consecutive', '3 Consecutive Sequence (e.g. 1-2-3)', 34.56)}
              className="p-5 rounded-2xl bg-slate-950/80 border border-white/10 hover:border-gold flex items-center justify-between cursor-pointer"
            >
              <div className="text-left">
                <span className="text-sm font-black text-white block">3 Consecutive Sequence</span>
                <span className="text-[10px] text-slate-400">e.g. 1-2-3, 2-3-4, 3-4-5, 4-5-6</span>
              </div>
              <span className="text-sm font-bold text-gold font-mono">34.56×</span>
            </button>
          </div>
        </div>
      )}

      {/* Recent History */}
      <div className="app-card p-4 rounded-2xl border border-white/5 space-y-2">
        <span className="text-xs font-bold text-white font-heading flex items-center gap-1.5">
          <History className="w-4 h-4 text-gold" /> Recent K3 Draws
        </span>
        <div className="flex items-center gap-2 overflow-x-auto py-1 no-scrollbar">
          {roundHistory.map((h, idx) => (
            <div key={idx} className="flex-shrink-0 p-2 rounded-xl bg-slate-900/80 border border-white/5 text-center min-w-[90px]">
              <span className="text-[9px] text-slate-500 font-mono block">#{h.period.slice(-3)}</span>
              <div className="flex items-center justify-center gap-1 my-1">
                {h.dice.map((d, i) => (
                  <span key={i} className="w-4 h-4 rounded bg-white text-black font-black text-[10px] flex items-center justify-center">
                    {d}
                  </span>
                ))}
              </div>
              <span className="text-xs font-bold text-gold font-mono">{h.sum}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Bet Modal */}
      <Modal isOpen={showBetModal} onClose={() => setShowBetModal(false)} title={`Confirm K3 Bet: ${selectedBet?.label}`}>
        <div className="space-y-4 text-xs">
          <div>
            <label className="block text-slate-400 mb-1">Select Base Amount (₹)</label>
            <div className="grid grid-cols-5 gap-2">
              {BET_AMOUNTS.map(amt => (
                <button
                  key={amt}
                  onClick={() => setBaseAmount(amt)}
                  className={`py-2 rounded-xl text-xs font-bold transition-all ${
                    baseAmount === amt ? 'btn-royal-gold' : 'bg-slate-800 text-slate-300'
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
              {MULTIPLIERS.map(m => (
                <button
                  key={m}
                  onClick={() => setMultiplier(m)}
                  className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${
                    multiplier === m ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' : 'bg-slate-800 text-slate-300'
                  }`}
                >
                  {m}X
                </button>
              ))}
            </div>
          </div>

          <div className="p-3 bg-slate-900 rounded-xl border border-white/10 flex justify-between text-xs font-bold">
            <span className="text-slate-400">Total Bet:</span>
            <span className="text-gold font-mono">₹{totalBetAmount}</span>
          </div>

          <button onClick={confirmBet} className="btn-royal-gold w-full py-3 rounded-xl text-xs font-black">
            Confirm Bet (₹{totalBetAmount})
          </button>
        </div>
      </Modal>

      <ProvablyFairModal isOpen={isFairnessOpen} onClose={() => setIsFairnessOpen(false)} />
      <AuthGateModal isOpen={authGateOpen} onClose={authGateClose} onSuccess={authGateSuccess} />

      {/* Game Order Ledger & Transactions */}
      <GameOrderLedger gameId="k3" gameName="K3 3-Dice Lottery" currentPeriod={period} />

      {/* Internal Cross-Linking */}
      <RelatedGamesSection currentGameId="k3" />
    </div>
  );
}
