import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, HelpCircle } from 'lucide-react';
import confetti from 'canvas-confetti';
import { useSlots } from '../../store/SlotContext';
import { useWallet } from '../../store/WalletContext';
import { useAuth } from '../../store/AuthContext';
import { useToast } from '../../components/ui/Toast';
import { useAuthGate } from '../../hooks/useAuthGate';
import { useGameControl } from '../../store/GameControlContext';
import { sounds } from '../../lib/sound';
import { AutoBetPanel } from '../../components/ui/AutoBetPanel';
import { GameChat } from '../../components/ui/GameChat';
import Modal from '../../components/ui/Modal';

const CHIP_VALUES = [10, 50, 100, 500, 1000];

export default function SlotsPage() {
  const { slots, activeSlot, setActiveSlotId } = useSlots();
  const { balance, deductBalance, addBalance } = useWallet();
  const { isAuthenticated } = useAuth();
  const { addToast } = useToast();
  const { requireAuth } = useAuthGate();
  const { settings, checkIsFirstBet, consumeFirstBet } = useGameControl();

  const [betAmount, setBetAmount] = useState(100);
  const [spinning, setSpinning] = useState(false);
  const [reels, setReels] = useState<string[]>(() =>
    Array(activeSlot.reels).fill(activeSlot.symbols[0])
  );
  const [lastWin, setLastWin] = useState<number | null>(null);
  const [showPaytable, setShowPaytable] = useState(false);

  const spinReels = useCallback(() => {
    requireAuth(() => {
      if (spinning) return;
      if (balance < betAmount) {
        addToast({ type: 'error', title: 'Insufficient Funds', message: 'Please deposit coins to play.' });
        return;
      }

      if (!deductBalance(betAmount, `Slot Spin — ${activeSlot.name}`)) return;

      setSpinning(true);
      setLastWin(null);
      sounds.playSpin();

      const isFirstBet = checkIsFirstBet();
      const symbolPool = activeSlot.symbols;

      // Reel outcome calculation
      let finalReels: string[];
      let winMultiplier = 0;

      if (isFirstBet) {
        consumeFirstBet();
        // Guaranteed 777 Jackpot / 3-of-a-kind win for 1st bet!
        const winSym = symbolPool.includes('7️⃣') ? '7️⃣' : symbolPool[0];
        finalReels = Array(activeSlot.reels).fill(winSym);
        winMultiplier = activeSlot.paytable.jackpot777;
        addToast({ type: 'success', title: '🎉 Beginner Luck!', message: 'Jackpot hit on your 1st bet!' });
      } else {
        // Evaluate RNG against RTP settings
        const rand = Math.random() * 100;
        const targetRtp = settings.globalRtp ?? activeSlot.targetRtp;

        if (rand < targetRtp * 0.3) {
          // Jackpot 3/5 matching
          const sym = symbolPool[Math.floor(Math.random() * symbolPool.length)];
          finalReels = Array(activeSlot.reels).fill(sym);
          winMultiplier = sym === '7️⃣' ? activeSlot.paytable.jackpot777 : activeSlot.paytable.threeOfAKind;
        } else if (rand < targetRtp * 0.75) {
          // 2 matching pair
          const sym = symbolPool[Math.floor(Math.random() * symbolPool.length)];
          const other = symbolPool.find(s => s !== sym) || symbolPool[0];
          finalReels = activeSlot.reels === 3 ? [sym, sym, other] : [sym, sym, sym, other, other];
          winMultiplier = activeSlot.paytable.twoOfAKind;
        } else {
          // No match (loss)
          finalReels = Array.from({ length: activeSlot.reels }, (_, i) => symbolPool[i % symbolPool.length]);
          winMultiplier = 0;
        }
      }

      // Animate spinning reels
      const spinTimer = setTimeout(() => {
        setReels(finalReels);
        setSpinning(false);

        if (winMultiplier > 0) {
          const payout = Math.round(betAmount * winMultiplier);
          setLastWin(payout);
          addBalance(payout, `Slot Win (${winMultiplier}×) — ${activeSlot.name}`, 'win');
          sounds.playWin();
          addToast({
            type: 'success',
            title: `🎰 WINNER! ₹${payout}`,
            message: `Matched ${finalReels.join(' ')} (${winMultiplier}× payout)`,
          });
          confetti({ particleCount: 100, spread: 70, origin: { y: 0.5 }, colors: ['#D4AF37', '#2ECC71'] });
        } else {
          sounds.playLoss();
        }
      }, 1200);

      return () => clearTimeout(spinTimer);
    });
  }, [spinning, balance, betAmount, activeSlot, deductBalance, addToast, requireAuth, checkIsFirstBet, consumeFirstBet, settings.globalRtp, addBalance]);

  return (
    <div className="py-4 space-y-6 w-full max-w-6xl mx-auto">
      {/* Slot Machine Theme Selector Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 no-scrollbar">
        {slots.filter(s => s.enabled).map(slot => (
          <button
            key={slot.id}
            onClick={() => {
              setActiveSlotId(slot.id);
              setReels(Array(slot.reels).fill(slot.symbols[0]));
            }}
            className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-2 ${
              activeSlot.id === slot.id
                ? 'bg-gradient-to-r from-[#D4AF37] to-[#8B6914] text-[#061510] shadow-[0_0_15px_rgba(212,175,55,0.4)]'
                : 'royal-panel text-[rgba(212,175,55,0.7)] hover:text-gold'
            }`}
          >
            <span className="text-base">{slot.emoji}</span>
            {slot.name}
            <span className="text-[10px] opacity-75 font-mono">({slot.reels} Reels)</span>
          </button>
        ))}
      </div>

      {/* Main Desktop Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Slot Machine Engine (lg:col-span-8) */}
        <div className="lg:col-span-8 royal-panel rounded-3xl p-6 space-y-6 relative overflow-hidden border border-[rgba(212,175,55,0.25)]">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-3xl">{activeSlot.emoji}</span>
              <div>
                <h1 className="text-xl font-black text-[#E8C97A] font-heading">{activeSlot.name}</h1>
                <p className="text-xs text-[rgba(212,175,55,0.5)]">{activeSlot.subtitle}</p>
              </div>
            </div>

            <button
              onClick={() => setShowPaytable(true)}
              className="px-3 py-1.5 rounded-xl bg-[rgba(212,175,55,0.1)] border border-[rgba(212,175,55,0.2)] text-gold text-xs font-bold flex items-center gap-1.5 hover:bg-[rgba(212,175,55,0.2)] transition-all"
            >
              <HelpCircle className="w-4 h-4" />
              Paytable
            </button>
          </div>

          {/* Slot Reels Container */}
          <div className="bg-[#040E0A] p-6 rounded-2xl border-2 border-[rgba(212,175,55,0.3)] shadow-[inset_0_0_30px_rgba(0,0,0,0.8)] relative">
            {/* Payline Overlay Line */}
            <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-1 bg-gradient-to-r from-transparent via-[#D4AF37] to-transparent pointer-events-none opacity-40 z-10" />

            <div className={`grid gap-3 ${activeSlot.reels === 3 ? 'grid-cols-3' : 'grid-cols-5'}`}>
              {reels.map((sym, idx) => (
                <div
                  key={idx}
                  className="h-28 sm:h-36 bg-gradient-to-b from-[#091F16] via-[#0E2C20] to-[#091F16] rounded-xl border border-[rgba(212,175,55,0.2)] flex items-center justify-center text-4xl sm:text-6xl shadow-inner relative overflow-hidden"
                >
                  <AnimatePresence mode="wait">
                    <motion.span
                      key={spinning ? `spin_${Date.now()}_${idx}` : sym}
                      initial={spinning ? { y: -80, opacity: 0.2, filter: 'blur(4px)' } : { scale: 0.8 }}
                      animate={spinning ? { y: [80, -80, 0], opacity: [0.2, 1, 1], filter: ['blur(4px)', 'blur(0px)'] } : { scale: 1 }}
                      transition={{ duration: 0.4 + idx * 0.15, repeat: spinning ? Infinity : 0 }}
                    >
                      {sym}
                    </motion.span>
                  </AnimatePresence>
                </div>
              ))}
            </div>

            {/* Win Display */}
            {lastWin !== null && (
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="mt-4 text-center py-2 rounded-xl bg-gradient-to-r from-emerald-500/20 via-emerald-500/30 to-emerald-500/20 border border-emerald-500/40 text-emerald-400 font-black text-lg"
              >
                🎉 BIG WIN! +₹{lastWin}
              </motion.div>
            )}
          </div>

          {/* Bet Selector & Spin Control */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs text-[rgba(212,175,55,0.6)] font-bold">Select Bet Amount</span>
              <span className="text-xs font-mono text-gold font-bold">Balance: ₹{balance.toLocaleString('en-IN')}</span>
            </div>

            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              {CHIP_VALUES.map(val => (
                <button
                  key={val}
                  onClick={() => setBetAmount(val)}
                  className={`flex-1 min-w-[60px] py-2 rounded-xl text-xs font-black transition-all border ${
                    betAmount === val
                      ? 'bg-[rgba(212,175,55,0.2)] text-gold border-[#D4AF37]'
                      : 'bg-[#061510] text-[rgba(212,175,55,0.5)] border-[rgba(212,175,55,0.15)]'
                  }`}
                >
                  ₹{val}
                </button>
              ))}
            </div>

            <button
              onClick={spinReels}
              disabled={spinning}
              className={`w-full py-4 rounded-2xl font-black text-lg flex items-center justify-center gap-2 transition-all uppercase tracking-wider ${
                spinning
                  ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                  : 'bg-gradient-to-r from-[#D4AF37] via-[#F5D576] to-[#8B6914] text-[#061510] shadow-[0_0_25px_rgba(212,175,55,0.4)] hover:brightness-110 active:scale-[0.99]'
              }`}
            >
              <Play className="w-6 h-6 fill-current" />
              {spinning ? 'Spinning Reels...' : `SPIN SLOT (₹${betAmount})`}
            </button>
          </div>

          {/* Auto-Bet Integration */}
          <AutoBetPanel
            balance={balance}
            disabled={spinning}
            intervalMs={2500}
            onPlaceBet={async (amount) => {
              if (!isAuthenticated) return 0;
              if (balance < amount) return 0;
              deductBalance(amount, `Auto-Bet — ${activeSlot.name}`);
              const won = Math.random() > 0.6;
              const mult = won ? activeSlot.paytable.threeOfAKind : 0;
              const payout = won ? Math.round(amount * mult) : 0;
              if (won) addBalance(payout, `Auto-Bet Win — ${activeSlot.name} ${mult}×`, 'win');
              return won ? payout - amount : -amount;
            }}
          />
        </div>

        {/* Right Column: Live Chat (lg:col-span-4) */}
        <div className="lg:col-span-4 space-y-6">
          <GameChat gameId={`slot_${activeSlot.id}`} />
        </div>
      </div>

      {/* Paytable Modal */}
      <Modal isOpen={showPaytable} onClose={() => setShowPaytable(false)} title={`${activeSlot.name} Paytable`}>
        <div className="space-y-4 text-xs text-[#F5F1E6]/80">
          <div className="royal-panel p-4 rounded-xl space-y-3">
            <div className="flex items-center justify-between border-b border-[rgba(212,175,55,0.15)] pb-2">
              <span className="font-bold text-gold">7️⃣ 7️⃣ 7️⃣ Jackpot 3-Match</span>
              <span className="font-mono font-black text-emerald-400">{activeSlot.paytable.jackpot777}× Payout</span>
            </div>
            <div className="flex items-center justify-between border-b border-[rgba(212,175,55,0.15)] pb-2">
              <span className="font-bold text-gold">👑 👑 👑 Standard 3-Match</span>
              <span className="font-mono font-black text-emerald-400">{activeSlot.paytable.threeOfAKind}× Payout</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="font-bold text-gold">💎 💎 Pair 2-Match</span>
              <span className="font-mono font-black text-emerald-400">{activeSlot.paytable.twoOfAKind}× Payout</span>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}
