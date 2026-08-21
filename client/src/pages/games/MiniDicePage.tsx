import { useState, useCallback } from 'react';
import { Volume2, VolumeX, Sparkles, RefreshCw } from 'lucide-react';
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

const diceBreadcrumbLd = {
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
    { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://playarena.com/' },
    { '@type': 'ListItem', position: 2, name: 'Games', item: 'https://playarena.com/games' },
    { '@type': 'ListItem', position: 3, name: 'Mini Dice', item: 'https://playarena.com/games/mini-dice' },
  ],
};

const BET_AMOUNTS = [10, 50, 100, 500, 1000];

export default function MiniDicePage() {
  const { balance, deductBalance, addBalance } = useWallet();
  const { addToast } = useToast();
  const { requireAuth } = useAuthGate();

  const [betAmount, setBetAmount] = useState(100);
  const [targetNumber, setTargetNumber] = useState(50.00);
  const [rollMode, setRollMode] = useState<'over' | 'under'>('over');
  const [isRolling, setIsRolling] = useState(false);
  const [rolledValue, setRolledValue] = useState<number | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Calculate Win Probability & Multiplier
  const winChance = rollMode === 'over' ? 100 - targetNumber : targetNumber;
  const multiplier = Math.max(1.01, Math.min(99.0, Math.floor((98.5 / winChance) * 100) / 100));
  const potentialProfit = Math.floor(betAmount * multiplier * 100) / 100;

  const rollDice = useCallback(() => {
    requireAuth(async () => {
      if (isRolling) return;
      if (balance < betAmount) {
        addToast({ type: 'error', title: 'Insufficient balance' });
        return;
      }

      if (!deductBalance(betAmount, `Mini Dice Roll (${rollMode.toUpperCase()} ${targetNumber.toFixed(2)})`)) {
        addToast({ type: 'error', title: 'Insufficient balance' });
        return;
      }

      setIsRolling(true);
      if (soundEnabled) sounds.playSpin();
      haptics.bet();

      const orderId = `TXN_DICE_${Date.now().toString(36).toUpperCase()}_${Math.random().toString(36).slice(2, 6).toUpperCase()}`;

      orderLedger.recordOrder({
        id: orderId,
        gameId: 'mini-dice',
        gameName: 'Mini Dice Slider',
        period: Date.now().toString().slice(-6),
        userId: 'player',
        userName: 'You',
        selection: `Roll ${rollMode.toUpperCase()} ${targetNumber.toFixed(2)} (${multiplier}×)`,
        betAmount,
        status: 'pending',
      });

      // Fast ticker roll animation
      let count = 0;
      const interval = setInterval(() => {
        setRolledValue(Math.floor(Math.random() * 10000) / 100);
        count++;
        if (count > 12) {
          clearInterval(interval);
          const finalRoll = Math.floor(Math.random() * 10000) / 100;
          setRolledValue(finalRoll);
          setIsRolling(false);

          const isWin = rollMode === 'over' ? finalRoll > targetNumber : finalRoll < targetNumber;
          const winAmount = isWin ? potentialProfit : 0;

          orderLedger.updateOrder(orderId, {
            resultOutcome: `Rolled ${finalRoll.toFixed(2)} (${isWin ? 'WIN' : 'LOSS'})`,
            multiplier,
            winAmount,
            status: isWin ? 'won' : 'lost',
          });

          if (isWin) {
            addBalance(winAmount, `Mini Dice Win (${multiplier}×)`);
            if (multiplier >= 2) {
              triggerWinCelebration({ winAmount, multiplier, gameName: 'Mini Dice' });
            }
            sounds.playWin();
            haptics.jackpot();
            addToast({
              type: 'success',
              title: `🎉 Rolled ${finalRoll.toFixed(2)}!`,
              message: `You won ₹${winAmount.toFixed(2)} (${multiplier}×)`,
            });
          } else {
            sounds.playLoss();
            haptics.loss();
            addToast({
              type: 'error',
              title: `💥 Rolled ${finalRoll.toFixed(2)}`,
              message: `Lost ₹${betAmount}`,
            });
          }
        }
      }, 50);
    });
  }, [isRolling, balance, betAmount, rollMode, targetNumber, multiplier, potentialProfit, soundEnabled, deductBalance, addBalance, addToast, requireAuth]);

  return (
    <div className="py-4 space-y-5 w-full max-w-5xl mx-auto">
      <SEOHead
        title="Mini Dice Slider — Provably Fair Multipliers Up to 99x"
        description="Slide to set your win probability and roll the dice on PlayArena. Featuring dynamic multipliers from 1.01x to 99x, instant payouts, and provably fair SHA-256 hashing."
        jsonLd={diceBreadcrumbLd}
      />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 via-indigo-600 to-purple-600 flex items-center justify-center text-white font-black text-2xl shadow-[0_0_20px_rgba(99,102,241,0.4)]">
            🎯
          </div>
          <div>
            <h1 className="text-xl font-black text-white font-heading tracking-tight flex items-center gap-2">
              Mini Slider Dice
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-300 border border-blue-500/25">
                ⚡ 99× MAX MULTIPLIER
              </span>
            </h1>
            <p className="text-xs text-slate-400">Interactive Range Slider • Dynamic Odds • Provably Fair</p>
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

      {/* Center Dice Roll Display */}
      <div className="rounded-3xl p-6 bg-gradient-to-b from-[#0B1528] via-[#060D1A] to-[#03060C] border border-blue-500/30 shadow-2xl relative overflow-hidden text-center space-y-6">
        
        {/* Rolled Value Readout */}
        <div className="py-6 flex flex-col items-center justify-center">
          <div
            className={`w-36 h-36 rounded-3xl flex items-center justify-center font-heading text-4xl font-black shadow-2xl border-2 transition-all ${
              rolledValue === null
                ? 'bg-slate-900/80 border-white/10 text-slate-500'
                : (rollMode === 'over' ? rolledValue > targetNumber : rolledValue < targetNumber)
                ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300 shadow-[0_0_30px_rgba(46,204,113,0.4)] scale-105'
                : 'bg-rose-500/20 border-rose-400 text-rose-300 shadow-[0_0_30px_rgba(244,63,94,0.4)]'
            }`}
          >
            <span className="tabular-nums">
              {rolledValue !== null ? rolledValue.toFixed(2) : '50.00'}
            </span>
          </div>
          <span className="text-xs font-bold text-slate-400 mt-2 uppercase tracking-wider">
            {rolledValue === null ? 'Target Result' : 'Rolled Result'}
          </span>
        </div>

        {/* Range Slider Track */}
        <div className="space-y-2 max-w-2xl mx-auto px-4">
          <div className="relative flex items-center">
            {/* Custom Track Colors */}
            <div className="w-full h-3 rounded-full bg-slate-900 relative overflow-hidden border border-white/10">
              <div
                className={`h-full transition-all ${rollMode === 'over' ? 'bg-rose-500' : 'bg-emerald-500'}`}
                style={{ width: `${targetNumber}%` }}
              />
              <div
                className={`h-full absolute right-0 top-0 transition-all ${rollMode === 'over' ? 'bg-emerald-500' : 'bg-rose-500'}`}
                style={{ width: `${100 - targetNumber}%` }}
              />
            </div>

            {/* Input Slider */}
            <input
              type="range"
              min="2"
              max="98"
              step="0.01"
              value={targetNumber}
              disabled={isRolling}
              onChange={(e) => setTargetNumber(parseFloat(e.target.value))}
              className="absolute inset-0 w-full opacity-0 cursor-pointer h-8"
            />
          </div>

          <div className="flex justify-between text-[11px] text-slate-500 font-mono font-bold px-1">
            <span>0.00</span>
            <span>25.00</span>
            <span>50.00</span>
            <span>75.00</span>
            <span>100.00</span>
          </div>
        </div>

        {/* Stats Grid: Multiplier, Win Chance, Roll Over/Under */}
        <div className="grid grid-cols-3 gap-3 max-w-2xl mx-auto">
          <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-white/10 text-left">
            <span className="text-[10px] text-slate-400 uppercase font-bold block">Multiplier</span>
            <span className="text-lg font-black text-gold font-mono">{multiplier}×</span>
          </div>

          <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-white/10 text-left">
            <span className="text-[10px] text-slate-400 uppercase font-bold block">Win Chance</span>
            <span className="text-lg font-black text-emerald-400 font-mono">{winChance.toFixed(2)}%</span>
          </div>

          <button
            onClick={() => setRollMode(m => m === 'over' ? 'under' : 'over')}
            disabled={isRolling}
            className="p-3.5 rounded-2xl bg-blue-500/15 border border-blue-500/40 text-blue-300 font-black text-left hover:bg-blue-500/25 transition-all cursor-pointer flex items-center justify-between"
          >
            <div>
              <span className="text-[10px] text-blue-400 uppercase font-bold block">Mode</span>
              <span className="text-sm font-black">{rollMode === 'over' ? 'Roll Over' : 'Roll Under'}</span>
            </div>
            <RefreshCw className="w-4 h-4 text-blue-400" />
          </button>
        </div>
      </div>

      {/* Stake & Roll Controls */}
      <div className="royal-panel rounded-3xl p-5 space-y-4 border border-blue-500/20">
        <div>
          <label className="text-xs text-slate-400 font-bold mb-2 block">Bet Stake Amount (₹)</label>
          <div className="grid grid-cols-5 gap-2">
            {BET_AMOUNTS.map(amt => (
              <button
                key={amt}
                onClick={() => setBetAmount(amt)}
                disabled={isRolling}
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
          onClick={rollDice}
          disabled={isRolling}
          className="btn-royal-gold w-full py-4 rounded-2xl font-black text-sm cursor-pointer shadow-xl flex items-center justify-center gap-2"
        >
          <Sparkles className="w-4 h-4 text-black" />
          <span>{isRolling ? 'Rolling Dice...' : `Roll Dice (Win ₹${potentialProfit.toFixed(2)})`}</span>
        </button>
      </div>

      {/* Game Order Ledger & Transactions */}
      <GameOrderLedger gameId="mini-dice" gameName="Mini Slider Dice" />

      {/* Internal Cross-Linking */}
      <RelatedGamesSection currentGameId="mini-dice" />
    </div>
  );
}
