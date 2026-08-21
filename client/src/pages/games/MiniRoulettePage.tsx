import { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Volume2, VolumeX, Sparkles } from 'lucide-react';
import { useWallet } from '../../store/WalletContext';
import { useToast } from '../../components/ui/Toast';
import { useAuthGate } from '../../hooks/useAuthGate';
import { sounds } from '../../lib/sound';
import { haptics } from '../../lib/haptics';
import { triggerWinCelebration } from '../../components/ui/WinCelebrationOverlay';
import { SEOHead } from '../../components/shared/SEOHead';
import { RelatedGamesSection } from '../../components/shared/RelatedGamesSection';
import { orderLedger } from '../../lib/orderLedger';
import { GameOrderLedger } from '../../components/shared/GameOrderLedger';

const rouletteBreadcrumbLd = {
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
    { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://playarena.com/' },
    { '@type': 'ListItem', position: 2, name: 'Games', item: 'https://playarena.com/games' },
    { '@type': 'ListItem', position: 3, name: 'Mini Roulette', item: 'https://playarena.com/games/mini-roulette' },
  ],
};

const ROULETTE_NUMBERS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
const RED_NUMBERS = [1, 3, 5, 7, 9, 12];
const BLACK_NUMBERS = [2, 4, 6, 8, 10, 11];

const BET_AMOUNTS = [10, 50, 100, 500, 1000];

interface RouletteBet {
  type: 'number' | 'color' | 'parity' | 'half';
  value: string;
  label: string;
  multiplier: number;
}

export default function MiniRoulettePage() {
  const { balance, deductBalance, addBalance } = useWallet();
  const { addToast } = useToast();
  const { requireAuth } = useAuthGate();

  const [betAmount, setBetAmount] = useState(100);
  const [selectedBet, setSelectedBet] = useState<RouletteBet | null>({
    type: 'color',
    value: 'red',
    label: 'RED (2.0×)',
    multiplier: 2.0,
  });

  const [isSpinning, setIsSpinning] = useState(false);
  const [winningNumber, setWinningNumber] = useState<number | null>(null);
  const [wheelRotation, setWheelRotation] = useState(0);
  const [soundEnabled, setSoundEnabled] = useState(true);

  const spinWheel = useCallback(() => {
    requireAuth(async () => {
      if (isSpinning || !selectedBet) return;
      if (balance < betAmount) {
        addToast({ type: 'error', title: 'Insufficient balance' });
        return;
      }

      if (!deductBalance(betAmount, `Mini Roulette: ${selectedBet.label}`)) {
        addToast({ type: 'error', title: 'Insufficient balance' });
        return;
      }

      setIsSpinning(true);
      if (soundEnabled) sounds.playSpin();
      haptics.bet();

      const orderId = `TXN_ROULETTE_${Date.now().toString(36).toUpperCase()}_${Math.random().toString(36).slice(2, 6).toUpperCase()}`;

      orderLedger.recordOrder({
        id: orderId,
        gameId: 'mini-roulette',
        gameName: 'Mini Roulette 12',
        period: Date.now().toString().slice(-6),
        userId: 'player',
        userName: 'You',
        selection: selectedBet.label,
        betAmount,
        status: 'pending',
      });

      // Physics spin calculation: 4-6 full turns + random target pocket
      const targetNum = ROULETTE_NUMBERS[Math.floor(Math.random() * ROULETTE_NUMBERS.length)];
      const pocketAngle = 360 / 13;
      const targetAngle = 360 * 5 + (13 - targetNum) * pocketAngle;

      setWheelRotation(prev => prev + targetAngle);

      setTimeout(() => {
        setWinningNumber(targetNum);
        setIsSpinning(false);

        // Evaluate bet
        let isWin = false;
        if (selectedBet.type === 'number') {
          isWin = parseInt(selectedBet.value) === targetNum;
        } else if (selectedBet.type === 'color') {
          if (selectedBet.value === 'red') isWin = RED_NUMBERS.includes(targetNum);
          else if (selectedBet.value === 'black') isWin = BLACK_NUMBERS.includes(targetNum);
        } else if (selectedBet.type === 'parity') {
          if (targetNum !== 0) {
            isWin = selectedBet.value === 'even' ? targetNum % 2 === 0 : targetNum % 2 !== 0;
          }
        } else if (selectedBet.type === 'half') {
          if (targetNum !== 0) {
            isWin = selectedBet.value === 'low' ? targetNum <= 6 : targetNum >= 7;
          }
        }

        const winAmount = isWin ? Math.floor(betAmount * selectedBet.multiplier * 100) / 100 : 0;

        orderLedger.updateOrder(orderId, {
          resultOutcome: `Landed on ${targetNum} (${targetNum === 0 ? 'GREEN' : RED_NUMBERS.includes(targetNum) ? 'RED' : 'BLACK'})`,
          multiplier: selectedBet.multiplier,
          winAmount,
          status: isWin ? 'won' : 'lost',
        });

        if (isWin) {
          addBalance(winAmount, `Roulette Win on ${targetNum}`);
          if (selectedBet.multiplier >= 3) {
            triggerWinCelebration({ winAmount, multiplier: selectedBet.multiplier, gameName: 'Mini Roulette' });
          }
          sounds.playWin();
          haptics.jackpot();
          addToast({
            type: 'success',
            title: `🎉 Ball Landed on ${targetNum}!`,
            message: `You won ₹${winAmount.toFixed(2)} (${selectedBet.multiplier}×)`,
          });
        } else {
          sounds.playLoss();
          haptics.loss();
          addToast({
            type: 'error',
            title: `💥 Ball Landed on ${targetNum}`,
            message: `Lost ₹${betAmount}`,
          });
        }
      }, 3000);
    });
  }, [isSpinning, selectedBet, balance, betAmount, soundEnabled, deductBalance, addBalance, addToast, requireAuth]);

  return (
    <div className="py-4 space-y-5 w-full max-w-5xl mx-auto">
      <SEOHead
        title="Mini Roulette 12 — Real Physics Spinning Wheel & Straight-Up Payouts"
        description="Spin the 12-number European Mini Roulette on PlayArena. Featuring real wheel momentum physics, Red/Black, Even/Odd, and 12x straight-up multipliers."
        jsonLd={rouletteBreadcrumbLd}
      />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-400 via-gold to-yellow-600 flex items-center justify-center text-black font-black text-2xl shadow-[0_0_20px_rgba(212,175,55,0.4)]">
            🎡
          </div>
          <div>
            <h1 className="text-xl font-black text-white font-heading tracking-tight flex items-center gap-2">
              Mini Roulette 12
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/25">
                ⚡ 12× STRAIGHT-UP
              </span>
            </h1>
            <p className="text-xs text-slate-400">12-Pocket European Wheel • Dynamic Deceleration • Provably Fair</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="p-2.5 rounded-xl bg-slate-900 border border-white/10 text-slate-300 hover:text-white cursor-pointer"
          >
            {soundEnabled ? <Volume2 className="w-4 h-4 text-emerald-400" /> : <VolumeX className="w-4 h-4 text-slate-500" />}
          </button>
        </div>
      </div>

      {/* 3D Roulette Wheel Visualizer */}
      <div className="rounded-3xl p-6 bg-gradient-to-b from-[#1A1208] via-[#0E0A04] to-[#050301] border border-gold/30 shadow-2xl relative overflow-hidden flex flex-col items-center justify-center text-center space-y-4">
        
        {/* Pointer */}
        <div className="w-0 h-0 border-l-[10px] border-l-transparent border-r-[10px] border-r-transparent border-t-[16px] border-t-gold z-20 shadow-md" />

        {/* Rotating Wheel Frame */}
        <div className="w-56 h-56 sm:w-64 sm:h-64 rounded-full border-4 border-gold/50 shadow-[0_0_40px_rgba(212,175,55,0.3)] relative flex items-center justify-center overflow-hidden bg-slate-950">
          <motion.div
            animate={{ rotate: wheelRotation }}
            transition={{ duration: 3.0, ease: [0.25, 0.1, 0.25, 1] }}
            className="w-full h-full rounded-full relative"
          >
            {ROULETTE_NUMBERS.map((num, idx) => {
              const angle = (idx * 360) / 13;
              const isRed = RED_NUMBERS.includes(num);
              const isGreen = num === 0;

              return (
                <div
                  key={num}
                  className="absolute inset-0 flex items-start justify-center pt-2"
                  style={{ transform: `rotate(${angle}deg)` }}
                >
                  <span
                    className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black text-white shadow-md ${
                      isGreen ? 'bg-emerald-600' : isRed ? 'bg-rose-600' : 'bg-slate-900'
                    }`}
                  >
                    {num}
                  </span>
                </div>
              );
            })}
          </motion.div>

          {/* Center Hub */}
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-gold via-amber-600 to-yellow-800 border-2 border-white/40 shadow-inner flex items-center justify-center text-black font-black text-lg absolute z-10">
            <span>{winningNumber !== null ? winningNumber : '🎡'}</span>
          </div>
        </div>
      </div>

      {/* Betting Board Grid */}
      <div className="royal-panel rounded-3xl p-5 space-y-4 border border-gold/20">
        <span className="text-xs font-bold text-slate-300 font-heading block">Select Your Bet</span>

        {/* Numbers 0 to 12 */}
        <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
          {ROULETTE_NUMBERS.map(num => {
            const isRed = RED_NUMBERS.includes(num);
            const isGreen = num === 0;
            const isSelected = selectedBet?.type === 'number' && selectedBet.value === num.toString();

            return (
              <button
                key={num}
                onClick={() => setSelectedBet({
                  type: 'number',
                  value: num.toString(),
                  label: `Number ${num} (12.0×)`,
                  multiplier: 12.0,
                })}
                className={`py-3 rounded-xl font-black text-sm text-white shadow transition-all cursor-pointer border ${
                  isSelected
                    ? 'ring-2 ring-gold scale-105 shadow-[0_0_15px_#FFD700]'
                    : ''
                } ${
                  isGreen ? 'bg-emerald-600 border-emerald-400' : isRed ? 'bg-rose-600 border-rose-400' : 'bg-slate-900 border-white/10'
                }`}
              >
                {num}
              </button>
            );
          })}
        </div>

        {/* Outside Bets: Red/Black, Even/Odd, 1-6 / 7-12 */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2">
          <button
            onClick={() => setSelectedBet({ type: 'color', value: 'red', label: 'RED (2.0×)', multiplier: 2.0 })}
            className={`py-3 rounded-xl bg-rose-600 text-white font-black text-xs cursor-pointer border ${
              selectedBet?.type === 'color' && selectedBet.value === 'red' ? 'ring-2 ring-gold scale-105' : 'border-rose-400'
            }`}
          >
            RED (2.0×)
          </button>
          <button
            onClick={() => setSelectedBet({ type: 'color', value: 'black', label: 'BLACK (2.0×)', multiplier: 2.0 })}
            className={`py-3 rounded-xl bg-slate-900 text-white font-black text-xs cursor-pointer border ${
              selectedBet?.type === 'color' && selectedBet.value === 'black' ? 'ring-2 ring-gold scale-105' : 'border-white/20'
            }`}
          >
            BLACK (2.0×)
          </button>
          <button
            onClick={() => setSelectedBet({ type: 'parity', value: 'even', label: 'EVEN (2.0×)', multiplier: 2.0 })}
            className={`py-3 rounded-xl bg-purple-600/30 text-purple-300 font-black text-xs cursor-pointer border ${
              selectedBet?.type === 'parity' && selectedBet.value === 'even' ? 'ring-2 ring-gold scale-105' : 'border-purple-500/40'
            }`}
          >
            EVEN (2.0×)
          </button>
          <button
            onClick={() => setSelectedBet({ type: 'parity', value: 'odd', label: 'ODD (2.0×)', multiplier: 2.0 })}
            className={`py-3 rounded-xl bg-purple-600/30 text-purple-300 font-black text-xs cursor-pointer border ${
              selectedBet?.type === 'parity' && selectedBet.value === 'odd' ? 'ring-2 ring-gold scale-105' : 'border-purple-500/40'
            }`}
          >
            ODD (2.0×)
          </button>
        </div>

        {/* Stake Selector */}
        <div>
          <label className="text-xs text-slate-400 font-bold mb-2 block">Bet Stake Amount (₹)</label>
          <div className="grid grid-cols-5 gap-2">
            {BET_AMOUNTS.map(amt => (
              <button
                key={amt}
                onClick={() => setBetAmount(amt)}
                disabled={isSpinning}
                className={`py-2.5 rounded-xl text-xs font-bold font-mono cursor-pointer transition-all ${
                  betAmount === amt
                    ? 'btn-royal-gold shadow-md'
                    : 'bg-slate-900 text-slate-400 border border-white/10 hover:text-white'
                }`}
              >
                ₹{amt}
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={spinWheel}
          disabled={isSpinning}
          className="btn-royal-gold w-full py-4 rounded-2xl font-black text-sm cursor-pointer shadow-xl flex items-center justify-center gap-2"
        >
          <Sparkles className="w-4 h-4 text-black" />
          <span>{isSpinning ? 'Spinning Wheel...' : `Spin Wheel on ${selectedBet?.label} (₹${betAmount})`}</span>
        </button>
      </div>

      {/* Game Order Ledger & Transactions */}
      <GameOrderLedger gameId="mini-roulette" gameName="Mini Roulette 12" />

      {/* Internal Cross-Linking */}
      <RelatedGamesSection currentGameId="mini-roulette" />
    </div>
  );
}
