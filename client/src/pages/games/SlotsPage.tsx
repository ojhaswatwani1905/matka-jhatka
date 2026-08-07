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
  const [winningIndexes, setWinningIndexes] = useState<number[]>([]);
  const [showPaytable, setShowPaytable] = useState(false);

  const spinReels = useCallback(() => {
    requireAuth(() => {
      if (spinning) return;
      if (balance < betAmount) {
        addToast({ type: 'error', title: 'Insufficient Balance', message: 'Please deposit coins to play.' });
        return;
      }

      if (!deductBalance(betAmount, `Slot Spin — ${activeSlot.name}`)) return;

      setSpinning(true);
      setLastWin(null);
      setWinningIndexes([]);
      sounds.playSpin();

      const isFirstBet = checkIsFirstBet();
      const symbolPool = activeSlot.symbols;

      // Reel outcome calculation
      let finalReels: string[];
      let winMultiplier = 0;
      let winCols: number[] = [];

      if (isFirstBet) {
        consumeFirstBet();
        // Guaranteed 777 Jackpot / 3-of-a-kind win for 1st bet!
        const winSym = symbolPool.includes('7️⃣') ? '7️⃣' : symbolPool[0];
        finalReels = Array(activeSlot.reels).fill(winSym);
        winMultiplier = activeSlot.paytable.jackpot777;
        winCols = Array.from({ length: activeSlot.reels }, (_, i) => i);
        addToast({ type: 'success', title: '🎉 Beginner Luck!', message: 'Jackpot hit on your 1st bet!' });
      } else {
        // Evaluate RNG against RTP settings
        const rand = Math.random() * 100;
        const targetRtp = settings.globalRtp ?? activeSlot.targetRtp;

        if (rand < targetRtp * 0.35) {
          // Jackpot 3/5 matching
          const sym = symbolPool[Math.floor(Math.random() * symbolPool.length)];
          finalReels = Array(activeSlot.reels).fill(sym);
          winMultiplier = sym === '7️⃣' ? activeSlot.paytable.jackpot777 : activeSlot.paytable.threeOfAKind;
          winCols = Array.from({ length: activeSlot.reels }, (_, i) => i);
        } else if (rand < targetRtp * 0.8) {
          // 2 matching pair
          const sym = symbolPool[Math.floor(Math.random() * symbolPool.length)];
          const other = symbolPool.find(s => s !== sym) || symbolPool[0];
          finalReels = activeSlot.reels === 3 ? [sym, sym, other] : [sym, sym, sym, other, other];
          winMultiplier = activeSlot.paytable.twoOfAKind;
          winCols = [0, 1];
        } else {
          // No match (loss)
          finalReels = Array.from({ length: activeSlot.reels }, (_, i) => symbolPool[i % symbolPool.length]);
          winMultiplier = 0;
          winCols = [];
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
          setWinningIndexes(winCols);
          addBalance(payout, `Slot Win (${winMultiplier}×) — ${activeSlot.name}`, 'win');
          sounds.playWin();
          addToast({
            type: 'success',
            title: `🎰 JACKPOT WINNER! ₹${payout.toLocaleString('en-IN')}`,
            message: `Matched ${finalReels.join(' ')} (${winMultiplier}× payout)`,
          });
          confetti({ particleCount: 150, spread: 90, origin: { y: 0.5 }, colors: ['#FFD700', '#2ECC71', '#E74C3C', '#FFF'] });
        } else {
          sounds.playLoss();
        }
      }, 1100);

      return () => clearTimeout(spinTimer);
    });
  }, [spinning, balance, betAmount, activeSlot, deductBalance, addToast, requireAuth, checkIsFirstBet, consumeFirstBet, settings.globalRtp, addBalance]);

  return (
    <div className="min-h-screen py-4 px-2 sm:px-4 w-full max-w-7xl mx-auto space-y-6 relative">
      {/* Ambient Spotlight Background Layer */}
      <div
        className="fixed inset-0 pointer-events-none z-0"
        style={{
          background: 'radial-gradient(circle at 50% 20%, rgba(212,175,55,0.15), rgba(3,12,8,0.98) 75%)',
        }}
      />

      {/* Main Content Container (z-10 relative) */}
      <div className="relative z-10 space-y-6">
        {/* Top Slot Game Selector Tabs */}
        <div className="flex items-center justify-center gap-3 overflow-x-auto pb-2 no-scrollbar">
          {slots.filter(s => s.enabled).map(slot => (
            <button
              key={slot.id}
              onClick={() => {
                setActiveSlotId(slot.id);
                setReels(Array(slot.reels).fill(slot.symbols[0]));
                setWinningIndexes([]);
                setLastWin(null);
              }}
              className={`px-5 py-3 rounded-2xl text-xs font-black whitespace-nowrap transition-all flex items-center gap-2.5 border-2 shadow-lg ${
                activeSlot.id === slot.id
                  ? 'bg-gradient-to-r from-[#FFD700] via-[#F5D576] to-[#8B6914] text-[#061510] border-[#FFF8DC] shadow-[0_0_25px_rgba(212,175,55,0.7)] scale-105'
                  : 'bg-[#040E0A]/90 text-[rgba(212,175,55,0.75)] border-[rgba(212,175,55,0.25)] hover:border-gold hover:text-gold hover:scale-102'
              }`}
            >
              <span className="text-xl drop-shadow">{slot.emoji}</span>
              <span className="tracking-wide uppercase">{slot.name}</span>
              <span className="text-[10px] opacity-80 font-mono bg-black/40 px-2 py-0.5 rounded-full font-bold">
                {slot.reels} Reels
              </span>
            </button>
          ))}
        </div>

        {/* Master Center-Stage Grid (12 Columns) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left/Center Column: 3D Metallic Casino Cabinet (lg:col-span-8) */}
          <div className="lg:col-span-8 w-full space-y-6">
            <div className="rounded-[32px] p-1 bg-gradient-to-b from-[#FFD700] via-[#3A290B] via-[#0D261A] to-[#FFD700] shadow-[0_15px_50px_rgba(0,0,0,0.9),0_0_40px_rgba(212,175,55,0.3)] border-2 border-[#FFD700] relative">
              <div className="rounded-[28px] p-6 sm:p-8 space-y-6 bg-gradient-to-b from-[#0B2A1E] via-[#030E09] to-[#0B2A1E] relative overflow-hidden shadow-inner">
                {/* Cabinet Header & LED Marquee */}
                <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[rgba(212,175,55,0.25)] pb-4">
                  <div className="flex items-center gap-3.5">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#FFD700] via-[#F5D576] to-[#8B6914] p-0.5 shadow-[0_0_20px_rgba(212,175,55,0.6)] flex items-center justify-center shrink-0">
                      <span className="text-3xl drop-shadow">{activeSlot.emoji}</span>
                    </div>
                    <div>
                      <h1 className="text-2xl font-black text-[#E8C97A] font-heading tracking-wide flex items-center gap-2">
                        {activeSlot.name}
                        <Sparkles className="w-5 h-5 text-gold animate-bounce" />
                      </h1>
                      <p className="text-xs text-[rgba(212,175,55,0.65)] font-mono">{activeSlot.subtitle}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="px-3 py-1.5 rounded-xl text-xs font-black uppercase font-mono bg-gradient-to-r from-amber-500/20 to-amber-600/10 text-gold border border-amber-500/40 shadow-sm flex items-center gap-1.5">
                      <Flame className="w-4 h-4 text-gold" />
                      {activeSlot.paytable.jackpot777}x Max Jackpot
                    </span>

                    <button
                      onClick={() => setShowPaytable(true)}
                      className="px-3.5 py-1.5 rounded-xl bg-[rgba(212,175,55,0.15)] border border-[rgba(212,175,55,0.35)] text-gold text-xs font-bold flex items-center gap-1.5 hover:bg-[rgba(212,175,55,0.3)] transition-all shadow-sm"
                    >
                      <HelpCircle className="w-4 h-4" />
                      Paytable
                    </button>
                  </div>
                </div>

                {/* 3D Slot Reel Stage Window */}
                <div className="bg-gradient-to-b from-[#010604] via-[#051C12] to-[#010604] p-6 sm:p-8 rounded-3xl border-4 border-[#8B6914] shadow-[inset_0_0_50px_rgba(0,0,0,0.98),0_0_30px_rgba(212,175,55,0.25)] relative">
                  {/* Glowing Laser Payline Beam */}
                  <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-2 bg-gradient-to-r from-transparent via-[#FFD700] to-transparent pointer-events-none opacity-80 z-20 shadow-[0_0_20px_#FFD700]" />

                  {/* Reels Grid */}
                  <div className={`grid gap-4 ${activeSlot.reels === 3 ? 'grid-cols-3' : 'grid-cols-5'}`}>
                    {reels.map((sym, idx) => {
                      const isWinning = winningIndexes.includes(idx);
                      return (
                        <div
                          key={idx}
                          className={`h-36 sm:h-44 rounded-2xl border-2 flex items-center justify-center text-5xl sm:text-7xl relative overflow-hidden transition-all duration-300 ${
                            isWinning
                              ? 'bg-gradient-to-b from-[#184E38] via-[#0F3827] to-[#184E38] border-[#FFD700] shadow-[0_0_35px_#FFD700,inset_0_0_25px_rgba(255,215,0,0.5)] scale-105 z-30'
                              : 'bg-gradient-to-b from-[#061C13] via-[#0E3A28] to-[#061C13] border-[rgba(212,175,55,0.35)] shadow-[inset_0_0_25px_rgba(0,0,0,0.9)]'
                          }`}
                        >
                          {/* 3D Glass Reflection Overlay */}
                          <div className="absolute inset-0 bg-gradient-to-tr from-white/10 via-transparent to-transparent pointer-events-none" />

                          <AnimatePresence mode="wait">
                            <motion.span
                              key={spinning ? `spin_${Date.now()}_${idx}` : sym}
                              initial={spinning ? { y: -120, opacity: 0.1, filter: 'blur(8px)' } : { scale: 0.7 }}
                              animate={
                                spinning
                                  ? { y: [120, -120, 0], opacity: [0.1, 1, 1], filter: ['blur(8px)', 'blur(0px)'] }
                                  : isWinning
                                  ? { scale: [1, 1.15, 1], rotate: [0, 5, -5, 0] }
                                  : { scale: 1 }
                              }
                              transition={{
                                duration: spinning ? 0.35 + idx * 0.15 : 0.4,
                                repeat: spinning ? Infinity : isWinning ? Infinity : 0,
                                repeatDelay: isWinning ? 1 : 0,
                              }}
                              className="drop-shadow-[0_8px_15px_rgba(0,0,0,0.8)]"
                            >
                              {sym}
                            </motion.span>
                          </AnimatePresence>
                        </div>
                      );
                    })}
                  </div>

                  {/* Winner Jackpot Banner */}
                  {lastWin !== null && (
                    <motion.div
                      initial={{ scale: 0.7, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className="mt-6 text-center py-3.5 px-4 rounded-2xl bg-gradient-to-r from-emerald-600/40 via-emerald-500/50 to-emerald-600/40 border-2 border-emerald-400 text-emerald-200 font-black text-2xl shadow-[0_0_30px_rgba(46,204,113,0.5)] flex items-center justify-center gap-3 tracking-wide uppercase"
                    >
                      <Trophy className="w-8 h-8 text-gold animate-bounce" />
                      JACKPOT WINNER! +₹{lastWin.toLocaleString('en-IN')}
                    </motion.div>
                  )}
                </div>

                {/* 3D Circular Casino Chips Bar */}
                <div className="space-y-4 pt-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-[rgba(212,175,55,0.8)] font-black uppercase tracking-wider flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-gold" />
                      Select Bet Chip
                    </span>
                    <span className="text-xs font-mono text-gold font-bold bg-[#030E09] px-3.5 py-1.5 rounded-full border border-[rgba(212,175,55,0.3)] shadow-sm">
                      Wallet: ₹{balance.toLocaleString('en-IN')}
                    </span>
                  </div>

                  <div className="grid grid-cols-5 gap-2 sm:gap-3">
                    {CHIP_VALUES.map(val => (
                      <button
                        key={val}
                        onClick={() => setBetAmount(val)}
                        className={`py-3 rounded-2xl text-xs font-black transition-all border-2 relative overflow-hidden shadow-lg flex flex-col items-center justify-center gap-0.5 ${
                          betAmount === val
                            ? 'bg-gradient-to-b from-[#FFD700] via-[#D4AF37] to-[#8B6914] text-[#061510] border-[#FFF8DC] shadow-[0_0_20px_rgba(212,175,55,0.7)] -translate-y-1 scale-105'
                            : 'bg-[#040E0A] text-[rgba(212,175,55,0.7)] border-[rgba(212,175,55,0.25)] hover:border-gold hover:text-gold hover:-translate-y-0.5'
                        }`}
                      >
                        <span className="text-[9px] opacity-75 font-mono uppercase">Chip</span>
                        <span className="text-sm font-mono font-black">₹{val}</span>
                      </button>
                    ))}
                  </div>

                  {/* High-Impact Shimmering Spin Button */}
                  <button
                    onClick={spinReels}
                    disabled={spinning}
                    className={`w-full py-4 sm:py-5 rounded-2xl font-black text-xl sm:text-2xl flex items-center justify-center gap-3 transition-all uppercase tracking-widest border-2 border-[#FFF8DC] relative overflow-hidden shadow-2xl ${
                      spinning
                        ? 'bg-gray-800 text-gray-500 border-gray-600 cursor-not-allowed'
                        : 'bg-gradient-to-r from-[#FFD700] via-[#FFF8DC] to-[#B8860B] text-[#061510] shadow-[0_0_35px_rgba(212,175,55,0.7)] hover:brightness-115 active:scale-[0.98]'
                    }`}
                  >
                    {/* Metallic Light Sweep Shimmer */}
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent -translate-x-full animate-[shimmer_2.5s_infinite]" />

                    <Play className="w-7 h-7 sm:w-8 sm:h-8 fill-current" />
                    {spinning ? 'Spinning Reels...' : `SPIN SLOT (₹${betAmount})`}
                  </button>
                </div>

                {/* Auto-Bet Panel Integration */}
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
          </div>

          {/* Right Column: Live Chat & Community Feed (lg:col-span-4) */}
          <div className="lg:col-span-4 w-full space-y-6">
            <GameChat gameId={`slot_${activeSlot.id}`} />
          </div>
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
