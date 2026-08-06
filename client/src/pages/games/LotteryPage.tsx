import { useState } from 'react';
import { motion } from 'framer-motion';
import { Ticket, Clock, Trophy, Sparkles } from 'lucide-react';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import AnimatedCounter from '../../components/ui/AnimatedCounter';
import { AuthGateModal } from '../../components/ui/AuthGateModal';
import { useAuthGate } from '../../hooks/useAuthGate';
import { useWallet } from '../../store/WalletContext';
import { formatCurrency, getRandomNumber, generateId } from '../../lib/utils';
import confetti from 'canvas-confetti';
import { AutoBetPanel } from '../../components/ui/AutoBetPanel';
import { GameChat } from '../../components/ui/GameChat';

const TICKET_PRICE = 50;
const JACKPOT = 500000;
const MAX_NUMBERS = 6;
const NUMBER_RANGE = 49;

interface LotteryTicket {
  id: string;
  numbers: number[];
  timestamp: string;
  matched?: number;
  won?: boolean;
  payout?: number;
}

export default function LotteryPage() {
  const { deductBalance, addBalance } = useWallet();
  const { requireAuth, isOpen: authGateOpen, onSuccess: authGateSuccess, onClose: authGateClose } = useAuthGate();
  const [selectedNumbers, setSelectedNumbers] = useState<number[]>([]);
  const [tickets, setTickets] = useState<LotteryTicket[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawnNumbers, setDrawnNumbers] = useState<number[]>([]);
  const [, setShowDraw] = useState(false);

  const toggleNumber = (num: number) => {
    requireAuth(() => {
      setSelectedNumbers(prev =>
        prev.includes(num)
          ? prev.filter(n => n !== num)
          : prev.length < MAX_NUMBERS
          ? [...prev, num]
          : prev
      );
    });
  };

  const quickPick = () => {
    requireAuth(() => {
      const nums: number[] = [];
      while (nums.length < MAX_NUMBERS) {
        const n = getRandomNumber(1, NUMBER_RANGE);
        if (!nums.includes(n)) nums.push(n);
      }
      setSelectedNumbers(nums.sort((a, b) => a - b));
    });
  };

  const buyTicket = () => {
    requireAuth(() => {
      if (selectedNumbers.length !== MAX_NUMBERS) return;
      if (!deductBalance(TICKET_PRICE, 'Lottery ticket')) return;
      setTickets(prev => [{
        id: generateId(),
        numbers: [...selectedNumbers].sort((a, b) => a - b),
        timestamp: new Date().toISOString(),
      }, ...prev]);
      setSelectedNumbers([]);
    });
  };

  const drawLottery = () => {
    if (tickets.filter(t => t.matched === undefined).length === 0) return;
    setIsDrawing(true);

    const drawn: number[] = [];
    while (drawn.length < MAX_NUMBERS) {
      const n = getRandomNumber(1, NUMBER_RANGE);
      if (!drawn.includes(n)) drawn.push(n);
    }

    // Reveal numbers one by one
    drawn.forEach((num, i) => {
      setTimeout(() => {
        setDrawnNumbers(prev => [...prev, num]);
      }, (i + 1) * 600);
    });

    // After all revealed, calculate results
    setTimeout(() => {
      setTickets(prev => prev.map(t => {
        if (t.matched !== undefined) return t;
        const matched = t.numbers.filter(n => drawn.includes(n)).length;
        let payout = 0;
        if (matched === 6) payout = JACKPOT;
        else if (matched === 5) payout = 10000;
        else if (matched === 4) payout = 1000;
        else if (matched === 3) payout = 100;

        if (payout > 0) addBalance(payout, `Lottery win - ${matched} matched`);
        return { ...t, matched, won: payout > 0, payout };
      }));

      const anyBigWin = tickets.some(t => {
        const m = t.numbers.filter(n => drawn.includes(n)).length;
        return m >= 4;
      });

      if (anyBigWin) {
        confetti({ particleCount: 150, spread: 90, origin: { y: 0.5 }, colors: ['#FFD700', '#00FF88', '#8B5CF6', '#FF3B5C'] });
      }

      setIsDrawing(false);
      setShowDraw(true);
    }, (MAX_NUMBERS + 1) * 600);
  };

  return (
    <div className="px-4 py-4 space-y-4">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-xl font-bold text-white font-heading flex items-center gap-2">
          <Ticket className="w-5 h-5 text-gold" /> Lottery
        </h1>
        <p className="text-xs text-navy-500 mt-0.5">Pick {MAX_NUMBERS} numbers and win the jackpot!</p>
      </motion.div>

      {/* Jackpot Card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative overflow-hidden rounded-[var(--radius-xl)] p-6 text-center"
        style={{ background: 'linear-gradient(135deg, #92400E 0%, #D97706 50%, #FBBF24 100%)' }}
      >
        <div className="absolute top-0 right-0 w-32 h-32 rounded-full bg-white/10 -translate-y-1/2 translate-x-1/4" />
        <Sparkles className="w-6 h-6 text-white/80 mx-auto mb-2 animate-pulse-glow" />
        <p className="text-sm font-medium text-white/80 mb-1">Mega Jackpot</p>
        <AnimatedCounter value={JACKPOT} prefix="₹" className="text-3xl font-bold text-white font-heading" />
        <p className="text-xs text-white/60 mt-2">Match all {MAX_NUMBERS} numbers to win!</p>
      </motion.div>

      {/* Number Grid */}
      <Card variant="glass" padding="md">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-semibold text-white">
            Select {MAX_NUMBERS} Numbers
            <span className="text-xs text-navy-500 ml-2">({selectedNumbers.length}/{MAX_NUMBERS})</span>
          </p>
          <button onClick={quickPick} className="text-xs text-violet-light font-semibold cursor-pointer hover:underline">
            Quick Pick ✨
          </button>
        </div>

        <div className="grid grid-cols-7 gap-1.5">
          {Array.from({ length: NUMBER_RANGE }, (_, i) => i + 1).map(num => {
            const isSelected = selectedNumbers.includes(num);
            const isDrawn = drawnNumbers.includes(num);
            return (
              <motion.button
                key={num}
                whileTap={{ scale: 0.85 }}
                onClick={() => toggleNumber(num)}
                className={`aspect-square rounded-lg text-xs font-bold flex items-center justify-center transition-all cursor-pointer border ${
                  isSelected
                    ? 'bg-gradient-to-b from-gold to-gold-dark text-navy-950 border-gold shadow-md'
                    : isDrawn
                    ? 'bg-neon-green/20 border-neon-green/40 text-neon-green'
                    : 'bg-surface border-border text-navy-500 hover:text-white hover:border-border-light'
                }`}
              >
                {num}
              </motion.button>
            );
          })}
        </div>

        {/* Selected Preview */}
        {selectedNumbers.length > 0 && (
          <div className="flex items-center gap-2 mt-4 pt-4 border-t border-border">
            <span className="text-xs text-navy-500">Your picks:</span>
            <div className="flex gap-1.5">
              {selectedNumbers.sort((a, b) => a - b).map(n => (
                <motion.span key={n} initial={{ scale: 0 }} animate={{ scale: 1 }} className="w-8 h-8 rounded-lg bg-gradient-to-b from-gold to-gold-dark text-navy-950 text-xs font-bold flex items-center justify-center">
                  {n}
                </motion.span>
              ))}
            </div>
          </div>
        )}
      </Card>

      {/* Actions */}
      <div className="grid grid-cols-2 gap-3">
        <Button variant="primary" onClick={buyTicket} disabled={selectedNumbers.length !== MAX_NUMBERS} fullWidth>
          Buy Ticket — ₹{TICKET_PRICE}
        </Button>
        <Button variant="violet" onClick={drawLottery} disabled={isDrawing || tickets.filter(t => t.matched === undefined).length === 0} isLoading={isDrawing} fullWidth>
          Draw Now
        </Button>
      </div>

      {/* Drawn Numbers */}
      {drawnNumbers.length > 0 && (
        <Card variant="glass" padding="md">
          <p className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
            <Trophy className="w-4 h-4 text-gold" /> Drawn Numbers
          </p>
          <div className="flex gap-2 justify-center">
            {drawnNumbers.map((n, i) => (
              <motion.div
                key={i}
                initial={{ scale: 0, rotateY: 180 }}
                animate={{ scale: 1, rotateY: 0 }}
                transition={{ type: 'spring', delay: i * 0.1 }}
                className="w-12 h-12 rounded-xl bg-gradient-to-b from-neon-green to-neon-green-dark flex items-center justify-center text-lg font-bold text-navy-950 shadow-lg"
              >
                {n}
              </motion.div>
            ))}
          </div>
        </Card>
      )}

      {/* Tickets */}
      {tickets.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-semibold text-white">My Tickets</p>
          {tickets.map((t, i) => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className={`bg-surface border rounded-[var(--radius-md)] p-3 ${
                t.won ? 'border-neon-green/30 bg-neon-green/5' : t.matched !== undefined ? 'border-border' : 'border-gold/20'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex gap-1.5">
                  {t.numbers.map(n => (
                    <span key={n} className={`w-7 h-7 rounded-md text-xs font-bold flex items-center justify-center ${
                      drawnNumbers.includes(n) ? 'bg-neon-green/20 text-neon-green border border-neon-green/30' : 'bg-surface-light text-white border border-border'
                    }`}>
                      {n}
                    </span>
                  ))}
                </div>
                <div className="text-right">
                  {t.matched !== undefined ? (
                    <div>
                      <p className="text-xs text-navy-500">{t.matched} matched</p>
                      {t.payout && t.payout > 0 && <p className="text-sm font-bold text-neon-green">+{formatCurrency(t.payout)}</p>}
                    </div>
                  ) : (
                    <span className="text-xs text-gold font-medium flex items-center gap-1"><Clock className="w-3 h-3" /> Pending</span>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Auto-Bet Panel */}
      <AutoBetPanel
        balance={balance}
        intervalMs={4000}
        onPlaceBet={async (amount) => {
          if (!requireAuth()) return 0;
          if (balance < amount) return 0;
          deductBalance(amount, `Auto-Bet — Lottery 5D`, 'bet');
          const won = Math.random() > 0.7;
          const mult = won ? 5.0 : 0;
          const payout = won ? Math.round(amount * mult) : 0;
          if (won) addBalance(payout, `Auto-Bet Win — Lottery 5D ${mult}×`, 'win');
          return won ? payout - amount : -amount;
        }}
      />

      <GameChat gameId="lottery" />
      <AuthGateModal isOpen={authGateOpen} onClose={authGateClose} onSuccess={authGateSuccess} />
    </div>
  );
}
