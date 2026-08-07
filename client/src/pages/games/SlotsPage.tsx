import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, HelpCircle, Sparkles, Trophy, Flame } from 'lucide-react';
import confetti from 'canvas-confetti';
import { useSlots } from '../../store/SlotContext';
import { useWallet } from '../../store/WalletContext';
import { useAuth } from '../../store/AuthContext';
import { useToast } from '../../components/ui/Toast';
import { useAuthGate } from '../../hooks/useAuthGate';
import { useGameControl } from '../../store/GameControlContext';
import { sounds } from '../../lib/sound';
import { redisCache } from '../../lib/redisCache';
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

        const payout = winMultiplier > 0 ? Math.round(betAmount * winMultiplier) : 0;
        redisCache.set(`slot:last_spin:${activeSlot.id}`, { reels: finalReels, winMultiplier, payout, timestamp: Date.now() }, 3600);

        if (winMultiplier > 0) {
          setLastWin(payout);
          addBalance(payout, `Slot Win (${winMultiplier}×) — ${activeSlot.name}`, 'win');
          sounds.playWin();
          addToast({
            type: 'success',
            title: `🎰 WINNER! ₹${payout}`,
            message: `Matched ${finalReels.join(' ')} (${winMultiplier}× payout)`,
          });
          confetti({ particleCount: 120, spread: 80, origin: { y: 0.5 }, colors: ['#FFD700', '#2ECC71', '#E74C3C'] });
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
            className={`px-4 py-2.5 rounded-xl text-xs font-black whitespace-nowrap transition-all flex items-center gap-2 border ${
              activeSlot.id === slot.id
                ? 'bg-gradient-to-r from-[#D4AF37] via-[#F5D576] to-[#8B6914] text-[#061510] border-[#FFD700] shadow-[0_0_20px_rgba(212,175,55,0.6)] scale-[1.02]'
                : 'bg-[#061510]/80 text-[rgba(212,175,55,0.7)] border-[rgba(212,175,55,0.2)] hover:border-gold hover:text-gold'
            }`}
          >
            <span className="text-lg">{slot.emoji}</span>
            {slot.name}
            <span className="text-[10px] opacity-80 font-mono bg-black/30 px-1.5 py-0.5 rounded">({slot.reels} Reels)</span>
          </button>
        ))}
      </div>

      {/* Main Desktop Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: 3D Casino Cabinet Frame (lg:col-span-8) */}
        <div className="lg:col-span-8 relative rounded-3xl p-1 bg-gradient-to-b from-[#D4AF37] via-[#2A1D08] to-[#D4AF37] shadow-[0_10px_40px_rgba(0,0,0,0.8),0_0_30px_rgba(212,175,55,0.25)] border-2 border-[#FFD700]">
          <div className="royal-panel rounded-[22px] p-6 space-y-6 bg-gradient-to-b from-[#0B251C] via-[#040E0A] to-[#0B251C] relative overflow-hidden">
            {/* LED Marquee Lights Top Bar */}
            <div className="flex items-center justify-between border-b border-[rgba(212,175,55,0.25)] pb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#FFD700] to-[#8B6914] p-0.5 shadow-[0_0_15px_rgba(212,175,55,0.5)] flex items-center justify-center">
                  <span className="text-2xl">{activeSlot.emoji}</span>
                </div>
                <div>
                  <h1 className="text-xl font-black text-[#E8C97A] font-heading tracking-wide flex items-center gap-2">
                    {activeSlot.name}
                    <Sparkles className="w-4 h-4 text-gold animate-pulse" />
                  </h1>
                  <p className="text-xs text-[rgba(212,175,55,0.6)] font-mono">{activeSlot.subtitle}</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="px-2.5 py-1 rounded-lg text-[10px] font-black uppercase font-mono bg-amber-500/10 text-gold border border-amber-500/30 flex items-center gap-1">
                  <Flame className="w-3 h-3 text-gold" />
                  {activeSlot.paytable.jackpot777}x Max Jackpot
                </span>

                <button
                  onClick={() => setShowPaytable(true)}
                  className="px-3 py-1.5 rounded-xl bg-[rgba(212,175,55,0.15)] border border-[rgba(212,175,55,0.3)] text-gold text-xs font-bold flex items-center gap-1.5 hover:bg-[rgba(212,175,55,0.3)] transition-all shadow-sm"
                >
                  <HelpCircle className="w-4 h-4" />
                  Paytable
                </button>
              </div>
            </div>

            {/* 3D Slot Reels Screen Box */}
            <div className="bg-gradient-to-b from-[#020806] via-[#061B12] to-[#020806] p-6 rounded-2xl border-4 border-[#8B6914] shadow-[inset_0_0_40px_rgba(0,0,0,0.95),0_0_20px_rgba(212,175,55,0.2)] relative">
              {/* Payline Laser Line */}
              <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-1.5 bg-gradient-to-r from-transparent via-[#FFD700] to-transparent pointer-events-none opacity-60 z-20 shadow-[0_0_12px_#FFD700]" />

              <div className={`grid gap-3 ${activeSlot.reels === 3 ? 'grid-cols-3' : 'grid-cols-5'}`}>
                {reels.map((sym, idx) => (
                  <div
                    key={idx}
                    className="h-32 sm:h-40 bg-gradient-to-b from-[#05140E] via-[#0E3525] to-[#05140E] rounded-xl border-2 border-[rgba(212,175,55,0.35)] flex items-center justify-center text-4xl sm:text-6xl shadow-[inset_0_0_20px_rgba(0,0,0,0.8),0_4px_10px_rgba(0,0,0,0.5)] relative overflow-hidden"
                  >
                    {/* Glass Reflection Glare */}
                    <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-transparent pointer-events-none" />

                    <AnimatePresence mode="wait">
                      <motion.span
                        key={spinning ? `spin_${Date.now()}_${idx}` : sym}
                        initial={spinning ? { y: -100, opacity: 0.2, filter: 'blur(6px)' } : { scale: 0.8 }}
                        animate={spinning ? { y: [100, -100, 0], opacity: [0.2, 1, 1], filter: ['blur(6px)', 'blur(0px)'] } : { scale: 1 }}
                        transition={{ duration: 0.35 + idx * 0.15, repeat: spinning ? Infinity : 0 }}
                      >
                        {sym}
                      </motion.span>
                    </AnimatePresence>
                  </div>
                ))}
              </div>

              {/* Win Display Banner */}
              {lastWin !== null && (
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="mt-4 text-center py-2.5 rounded-xl bg-gradient-to-r from-emerald-600/30 via-emerald-500/40 to-emerald-600/30 border-2 border-emerald-400 text-emerald-300 font-black text-xl shadow-[0_0_20px_rgba(46,204,113,0.4)] flex items-center justify-center gap-2"
                >
                  <Trophy className="w-6 h-6 text-gold" />
                  JACKPOT PAYOUT! +₹{lastWin}
                </motion.div>
              )}
            </div>

            {/* 3D Embossed Casino Chips Selector */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs text-[rgba(212,175,55,0.7)] font-black uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-gold" />
                  Casino Bet Chips
                </span>
                <span className="text-xs font-mono text-gold font-bold bg-[#040E0A] px-3 py-1 rounded-full border border-[rgba(212,175,55,0.2)]">
                  Wallet: ₹{balance.toLocaleString('en-IN')}
                </span>
              </div>

              <div className="flex items-center gap-2 overflow-x-auto pb-1">
                {CHIP_VALUES.map(val => (
                  <button
                    key={val}
                    onClick={() => setBetAmount(val)}
                    className={`flex-1 min-w-[65px] py-2.5 rounded-full text-xs font-black transition-all border-2 relative overflow-hidden shadow-md ${
                      betAmount === val
                        ? 'bg-gradient-to-b from-[#FFD700] via-[#D4AF37] to-[#8B6914] text-[#061510] border-[#FFF8DC] shadow-[0_0_15px_rgba(212,175,55,0.6)] scale-105'
                        : 'bg-[#040E0A] text-[rgba(212,175,55,0.6)] border-[rgba(212,175,55,0.2)] hover:border-gold hover:text-gold'
                    }`}
                  >
                    ₹{val}
                  </button>
                ))}
              </div>

              {/* Physical Metallic Spin Lever Button */}
              <button
                onClick={spinReels}
                disabled={spinning}
                className={`w-full py-4 rounded-2xl font-black text-xl flex items-center justify-center gap-3 transition-all uppercase tracking-widest border-2 border-[#FFE4B5] ${
                  spinning
                    ? 'bg-gray-800 text-gray-500 border-gray-600 cursor-not-allowed'
                    : 'bg-gradient-to-r from-[#FFD700] via-[#F5D576] to-[#B8860B] text-[#061510] shadow-[0_0_30px_rgba(212,175,55,0.6)] hover:brightness-115 active:scale-[0.98]'
                }`}
              >
                <Play className="w-7 h-7 fill-current" />
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
