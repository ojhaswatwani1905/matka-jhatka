import { useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Target, Wallet, History } from 'lucide-react';
import confetti from 'canvas-confetti';
import Timer from '../../components/shared/Timer';
import Button from '../../components/ui/Button';
import AnimatedCounter from '../../components/ui/AnimatedCounter';
import Modal from '../../components/ui/Modal';
import { StatusBadge } from '../../components/shared/HistoryTable';
import { useWallet } from '../../store/WalletContext';
import { formatCurrency, getRandomNumber, generateId, generatePeriod } from '../../lib/utils';

const ROUND_DURATION = 45;
const BET_AMOUNTS = [10, 50, 100, 500, 1000];

interface WinGoBet {
  id: string;
  period: string;
  selection: number;
  amount: number;
  result?: 'win' | 'loss';
  payout?: number;
}

export default function WinGoPage() {
  const { balance, deductBalance, addBalance } = useWallet();
  const [period, setPeriod] = useState(generatePeriod());
  const [selectedNumber, setSelectedNumber] = useState<number | null>(null);
  const [betAmount, setBetAmount] = useState(100);
  const [bets, setBets] = useState<WinGoBet[]>([]);
  const [resultHistory, setResultHistory] = useState<{ period: string; number: number }[]>([]);
  const [isLocked, setIsLocked] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [lastResult, setLastResult] = useState<{ number: number; period: string } | null>(null);
  const [roundKey, setRoundKey] = useState(0);
  const [activeTab, setActiveTab] = useState<'game' | 'history'>('game');
  const callbackRef = useRef<(() => void) | null>(null);

  const handleRoundComplete = useCallback(() => {
    setIsLocked(true);

    setTimeout(() => {
      const resultNumber = getRandomNumber(0, 9);
      const result = { period, number: resultNumber };
      setLastResult(result);
      setResultHistory(prev => [result, ...prev].slice(0, 50));

      const currentBets = bets.filter(b => b.period === period && !b.result);
      let totalWin = 0;

      const updated = currentBets.map(b => {
        const won = b.selection === resultNumber;
        const payout = won ? b.amount * 9 : 0;
        if (won) totalWin += payout;
        return { ...b, result: (won ? 'win' : 'loss') as 'win' | 'loss', payout };
      });

      setBets(prev => prev.map(b => {
        const u = updated.find(x => x.id === b.id);
        return u || b;
      }));

      if (totalWin > 0) {
        addBalance(totalWin, `WinGo win - ₹${totalWin}`);
        confetti({ particleCount: 80, spread: 60, origin: { y: 0.6 }, colors: ['#FFD700', '#00FF88', '#8B5CF6'] });
      }

      setShowResult(true);
      setTimeout(() => {
        setShowResult(false);
        setIsLocked(false);
        setPeriod(generatePeriod());
        setRoundKey(prev => prev + 1);
      }, 4000);
    }, 2000);
  }, [period, bets, addBalance]);

  useEffect(() => { callbackRef.current = handleRoundComplete; }, [handleRoundComplete]);

  const placeBet = () => {
    if (selectedNumber === null || isLocked) return;
    if (!deductBalance(betAmount, `WinGo - Number ${selectedNumber}`)) return;

    setBets(prev => [{
      id: generateId(),
      period,
      selection: selectedNumber,
      amount: betAmount,
    }, ...prev]);
    setSelectedNumber(null);
  };

  const getNumberColor = (n: number) => {
    const colors = [
      'from-violet to-violet-dark', 'from-neon-green to-neon-green-dark',
      'from-neon-red to-neon-red-dark', 'from-neon-green to-neon-green-dark',
      'from-neon-red to-neon-red-dark', 'from-violet to-violet-dark',
      'from-neon-red to-neon-red-dark', 'from-neon-green to-neon-green-dark',
      'from-neon-red to-neon-red-dark', 'from-neon-green to-neon-green-dark',
    ];
    return colors[n];
  };

  return (
    <div className="px-4 py-4 space-y-4">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white font-heading flex items-center gap-2">
            <Target className="w-5 h-5 text-neon-green" /> Win Go
          </h1>
          <p className="text-xs text-navy-500 mt-0.5">Pick a number, win 9x!</p>
        </div>
        <div className="flex items-center gap-2 bg-surface border border-border rounded-full px-3 py-1.5">
          <Wallet className="w-3.5 h-3.5 text-gold" />
          <AnimatedCounter value={balance} prefix="₹" className="text-sm font-bold text-gold" />
        </div>
      </motion.div>

      {/* Timer */}
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="glass rounded-[var(--radius-xl)] p-5 flex items-center justify-between">
        <div>
          <p className="text-xs text-navy-500 mb-1">Period</p>
          <p className="text-lg font-bold text-white font-heading tabular-nums">{period}</p>
          {isLocked && <p className="text-xs text-neon-red font-medium mt-1">⏳ Revealing...</p>}
        </div>
        <Timer key={roundKey} duration={ROUND_DURATION} onComplete={() => callbackRef.current?.()} size="lg" />
      </motion.div>

      {/* Tabs */}
      <div className="flex gap-1 bg-surface rounded-[var(--radius-md)] p-1 border border-border">
        {[
          { key: 'game' as const, label: 'Game', icon: <Target className="w-3.5 h-3.5" /> },
          { key: 'history' as const, label: 'History', icon: <History className="w-3.5 h-3.5" /> },
        ].map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)} className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${activeTab === tab.key ? 'bg-violet/15 text-violet-light' : 'text-navy-500 hover:text-white'}`}>
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'game' ? (
          <motion.div key="game" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-4">
            {/* Number Grid */}
            <div className="grid grid-cols-5 gap-3">
              {Array.from({ length: 10 }, (_, i) => (
                <motion.button
                  key={i}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setSelectedNumber(i)}
                  disabled={isLocked}
                  className={`aspect-square rounded-[var(--radius-lg)] font-bold text-2xl flex items-center justify-center transition-all cursor-pointer border-2 ${
                    selectedNumber === i
                      ? `bg-gradient-to-b ${getNumberColor(i)} border-white/30 text-white shadow-lg`
                      : 'bg-surface border-border hover:border-border-light text-white'
                  } ${isLocked ? 'opacity-40 cursor-not-allowed' : ''}`}
                >
                  {i}
                </motion.button>
              ))}
            </div>

            {/* Bet Amount */}
            <div className="grid grid-cols-5 gap-2">
              {BET_AMOUNTS.map(amt => (
                <button key={amt} onClick={() => setBetAmount(amt)} className={`py-2.5 rounded-lg text-xs font-semibold transition-all cursor-pointer border ${betAmount === amt ? 'bg-violet/15 border-violet/40 text-violet-light' : 'bg-surface border-border text-white'}`}>
                  ₹{amt}
                </button>
              ))}
            </div>

            <Button variant="primary" size="lg" fullWidth onClick={placeBet} disabled={selectedNumber === null || isLocked}>
              {selectedNumber !== null ? `Bet on ${selectedNumber} — ${formatCurrency(betAmount)}` : 'Select a Number'}
            </Button>

            {/* Last Results Strip */}
            {resultHistory.length > 0 && (
              <div>
                <p className="text-xs text-navy-500 mb-2">Last 10 Results</p>
                <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
                  {resultHistory.slice(0, 10).map((r, i) => (
                    <motion.div key={i} initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: i * 0.05 }} className={`w-10 h-10 rounded-xl bg-gradient-to-b ${getNumberColor(r.number)} flex items-center justify-center text-white font-bold text-sm flex-shrink-0`}>
                      {r.number}
                    </motion.div>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        ) : (
          <motion.div key="history" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-2">
            {bets.length === 0 ? (
              <div className="text-center py-12 text-navy-500 text-sm">No bets yet</div>
            ) : bets.map((b, i) => (
              <motion.div key={b.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.03 }} className="flex items-center justify-between bg-surface border border-border rounded-[var(--radius-md)] p-3">
                <div>
                  <p className="text-xs text-navy-500 tabular-nums">{b.period}</p>
                  <p className="text-sm font-bold text-white mt-0.5">Number {b.selection}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-white">{formatCurrency(b.amount)}</p>
                  {b.result && <StatusBadge status={b.result} />}
                  {b.payout && b.payout > 0 && <p className="text-xs text-neon-green font-bold">+{formatCurrency(b.payout)}</p>}
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Result Modal */}
      <Modal isOpen={showResult} onClose={() => setShowResult(false)} title="Round Result">
        {lastResult && (
          <div className="text-center py-4">
            <motion.div initial={{ scale: 0, rotate: -180 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: 'spring', stiffness: 200, damping: 15 }} className={`w-24 h-24 rounded-3xl bg-gradient-to-b ${getNumberColor(lastResult.number)} flex items-center justify-center mx-auto mb-4 shadow-deep`}>
              <span className="text-4xl font-bold text-white">{lastResult.number}</span>
            </motion.div>
            <p className="text-xs text-navy-500">Period: {lastResult.period}</p>
          </div>
        )}
      </Modal>
    </div>
  );
}
