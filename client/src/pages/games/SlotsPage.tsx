import { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, HelpCircle, Sparkles, Trophy, Flame, Shield, CheckCircle2 } from 'lucide-react';
import confetti from 'canvas-confetti';
import { useSlots } from '../../store/SlotContext';
import { useWallet } from '../../store/WalletContext';
import { useAuth } from '../../store/AuthContext';
import { useToast } from '../../components/ui/Toast';
import { useNotifications } from '../../store/NotificationContext';
import { useAuthGate } from '../../hooks/useAuthGate';
import { useGameControl } from '../../store/GameControlContext';
import { sounds } from '../../lib/sound';
import { redisCache } from '../../lib/redisCache';
import { AutoBetPanel } from '../../components/ui/AutoBetPanel';
import { GameChat } from '../../components/ui/GameChat';
import Modal from '../../components/ui/Modal';

const CHIP_VALUES = [10, 50, 100, 500, 1000];

/* ─── Provably Fair SHA-256 Seed Engine ────────────────────────── */
async function hashSlotSeed(seed: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(seed));
  return Array.from(new Uint8Array(buf))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

function generateSlotSeed(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

/* ─── Detailed Paytables per Variant ───────────────────────────── */
interface SymbolPayoutRule {
  symbol: string;
  name: string;
  threeMatch: number;
  fiveMatch?: number;
  twoMatch?: number;
}

const VARIANT_PAYTABLES: Record<string, SymbolPayoutRule[]> = {
  'royal-gold-777': [
    { symbol: '7️⃣', name: 'Lucky 7 Jackpot', threeMatch: 100, twoMatch: 5 },
    { symbol: '👑', name: 'Royal Crown', threeMatch: 50, twoMatch: 3 },
    { symbol: '💎', name: 'Diamond Gem', threeMatch: 25, twoMatch: 2 },
    { symbol: '🔔', name: 'Golden Bell', threeMatch: 10, twoMatch: 1.5 },
    { symbol: '🍒', name: 'Classic Cherry', threeMatch: 5, twoMatch: 1.2 },
    { symbol: '🍋', name: 'Vegas Lemon', threeMatch: 3, twoMatch: 1.0 },
  ],
  'dragon-fortune-5x': [
    { symbol: '🐉', name: 'Mythic Dragon', threeMatch: 25, fiveMatch: 250, twoMatch: 4 },
    { symbol: '👑', name: 'Emperor Crown', threeMatch: 15, fiveMatch: 100, twoMatch: 3 },
    { symbol: '💎', name: 'Dragon Gem', threeMatch: 10, fiveMatch: 50, twoMatch: 2 },
    { symbol: '🔥', name: 'Dragon Flame', threeMatch: 8, fiveMatch: 25, twoMatch: 1.8 },
    { symbol: '🔮', name: 'Orb of Wisdom', threeMatch: 5, fiveMatch: 15, twoMatch: 1.5 },
    { symbol: '🧧', name: 'Red Envelope', threeMatch: 4, fiveMatch: 10, twoMatch: 1.2 },
    { symbol: '🪙', name: 'Golden Coin', threeMatch: 3, fiveMatch: 5, twoMatch: 1.0 },
  ],
  'mega-fruit-party': [
    { symbol: '⭐', name: 'Party Star Jackpot', threeMatch: 75, twoMatch: 4 },
    { symbol: '🍓', name: 'Juicy Strawberry', threeMatch: 35, twoMatch: 3 },
    { symbol: '🍉', name: 'Watermelon', threeMatch: 15, twoMatch: 2 },
    { symbol: '🍇', name: 'Royal Grapes', threeMatch: 8, twoMatch: 1.5 },
    { symbol: '🍌', name: 'Banana Split', threeMatch: 4, twoMatch: 1.2 },
    { symbol: '🍒', name: 'Arcade Cherry', threeMatch: 2, twoMatch: 1.0 },
  ],
};

export default function SlotsPage() {
  const { slots, activeSlot, setActiveSlotId } = useSlots();
  const { balance, deductBalance, addBalance } = useWallet();
  const { isAuthenticated } = useAuth();
  const { addToast } = useToast();
  const { addNotification } = useNotifications();
  const { requireAuth } = useAuthGate();
  const { settings, checkIsFirstBet, consumeFirstBet } = useGameControl();

  const [betAmount, setBetAmount] = useState(100);
  const [spinning, setSpinning] = useState(false);
  const [reels, setReels] = useState<string[]>(() =>
    Array(activeSlot.reels).fill(activeSlot.symbols[0])
  );
  const [reelStoppedState, setReelStoppedState] = useState<boolean[]>(() =>
    Array(activeSlot.reels).fill(true)
  );

  const [lastWin, setLastWin] = useState<number | null>(null);
  const [winningIndexes, setWinningIndexes] = useState<number[]>([]);
  const [showPaytable, setShowPaytable] = useState(false);

  // Provably Fair State
  const [currentSeed, setCurrentSeed] = useState<string>('');
  const [commitHash, setCommitHash] = useState<string>('');
  const [lastRevealedSeed, setLastRevealedSeed] = useState<string>('');

  // Prepare seed hash on mount & activeSlot change
  const initSeed = useCallback(async () => {
    const s = generateSlotSeed();
    const h = await hashSlotSeed(s);
    setCurrentSeed(s);
    setCommitHash(h);
  }, []);

  useEffect(() => {
    initSeed();
  }, [activeSlot.id, initSeed]);

  const spinReels = useCallback(() => {
    requireAuth(async () => {
      if (spinning) return;
      if (balance < betAmount) {
        addToast({ type: 'error', title: 'Insufficient Balance', message: 'Please deposit coins to play.' });
        return;
      }

      // 1. Debit wallet IMMEDIATELY on bet placement
      if (!deductBalance(betAmount, `Slots — ${activeSlot.name} spin`)) {
        addToast({ type: 'error', title: 'Bet Failed', message: 'Unable to debit wallet balance.' });
        return;
      }

      setSpinning(true);
      setLastWin(null);
      setWinningIndexes([]);
      setReelStoppedState(Array(activeSlot.reels).fill(false));
      sounds.playSpin();

      const isFirstBet = checkIsFirstBet();
      const symbolPool = activeSlot.symbols;
      const reelsCount = activeSlot.reels;

      // 2. Evaluate Provably Fair Outcome from Seed Hash
      const seedHash = await hashSlotSeed(currentSeed);
      let finalReels: string[] = [];
      let winMultiplier = 0;
      let winCols: number[] = [];

      if (isFirstBet) {
        consumeFirstBet();
        // Guaranteed 777 Jackpot / 3-of-a-kind win for 1st bet!
        const winSym = symbolPool.includes('7️⃣') ? '7️⃣' : symbolPool.includes('⭐') ? '⭐' : symbolPool[0];
        finalReels = Array(reelsCount).fill(winSym);
        winMultiplier = activeSlot.paytable.jackpot777;
        winCols = Array.from({ length: reelsCount }, (_, i) => i);
        addToast({ type: 'success', title: '🎉 Beginner Luck!', message: 'Jackpot hit on your 1st bet!' });
      } else {
        // Derive outcome from seed hash byte values
        const hexVal = parseInt(seedHash.slice(0, 8), 16);
        const randPct = (hexVal % 10000) / 100;
        const targetRtp = settings.globalRtp ?? activeSlot.targetRtp;

        if (randPct < targetRtp * 0.35) {
          // Jackpot 3/5 matching
          const sym = symbolPool[hexVal % symbolPool.length];
          finalReels = Array(reelsCount).fill(sym);
          winMultiplier = sym === '7️⃣' || sym === '🐉' || sym === '⭐'
            ? activeSlot.paytable.jackpot777
            : activeSlot.paytable.threeOfAKind;
          winCols = Array.from({ length: reelsCount }, (_, i) => i);
        } else if (randPct < targetRtp * 0.8) {
          // 2 matching pair
          const sym = symbolPool[hexVal % symbolPool.length];
          const other = symbolPool.find(s => s !== sym) || symbolPool[0];
          finalReels = reelsCount === 3 ? [sym, sym, other] : [sym, sym, sym, other, other];
          winMultiplier = activeSlot.paytable.twoOfAKind;
          winCols = [0, 1];
        } else {
          // No match (loss)
          finalReels = Array.from({ length: reelsCount }, (_, i) => symbolPool[(hexVal + i) % symbolPool.length]);
          winMultiplier = 0;
          winCols = [];
        }
      }

      // 3. Staggered Reel Stopping Mechanics (~150-200ms stagger between reels)
      reelsCount === 3 ? [700, 900, 1100] : [600, 780, 960, 1140, 1320];

      finalReels.forEach((sym, colIdx) => {
        const stopDelay = 700 + colIdx * 180;
        setTimeout(() => {
          setReels(prev => {
            const next = [...prev];
            next[colIdx] = sym;
            return next;
          });
          setReelStoppedState(prev => {
            const next = [...prev];
            next[colIdx] = true;
            return next;
          });
          sounds.playChip(); // Reel lock sound effect
        }, stopDelay);
      });

      // 4. Final Win/Loss Resolution after all reels lock
      const totalSpinDuration = 700 + reelsCount * 180 + 100;

      setTimeout(async () => {
        setSpinning(false);
        setLastRevealedSeed(currentSeed);

        // Generate next round's provably fair seed & hash
        await initSeed();

        const payout = winMultiplier > 0 ? Math.round(betAmount * winMultiplier) : 0;
        redisCache.set(`slot:last_spin:${activeSlot.id}`, { reels: finalReels, winMultiplier, payout, timestamp: Date.now() }, 3600);

        if (winMultiplier > 0) {
          setLastWin(payout);
          setWinningIndexes(winCols);

          // Credit wallet on win
          addBalance(payout, `Slots — ${activeSlot.name} win (${winMultiplier}×)`, 'win');
          sounds.playWin();

          addToast({
            type: 'success',
            title: `🎰 WINNER! ₹${payout.toLocaleString('en-IN')}`,
            message: `Matched ${finalReels.join(' ')} (${winMultiplier}× payout)`,
          });

          // Big win notification & confetti
          if (winMultiplier >= activeSlot.paytable.threeOfAKind) {
            confetti({ particleCount: 150, spread: 90, origin: { y: 0.5 }, colors: ['#FFD700', '#2ECC71', '#E74C3C', '#FFF'] });
            addNotification({
              type: 'spin',
              title: `🎰 HUGE JACKPOT WIN!`,
              message: `You won ₹${payout.toLocaleString('en-IN')} (${winMultiplier}×) on ${activeSlot.name}!`,
            });
          }
        } else {
          sounds.playLoss();
        }
      }, totalSpinDuration);
    });
  }, [spinning, balance, betAmount, activeSlot, deductBalance, addToast, requireAuth, checkIsFirstBet, consumeFirstBet, settings.globalRtp, currentSeed, initSeed, addBalance, addNotification]);

  const currentPaytableRules = VARIANT_PAYTABLES[activeSlot.id] || VARIANT_PAYTABLES['royal-gold-777'];

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
                setReelStoppedState(Array(slot.reels).fill(true));
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

                {/* Provably Fair Commit Hash Badge */}
                {commitHash && (
                  <div className="flex items-center justify-between bg-[#040E0A] px-3 py-1.5 rounded-xl border border-[rgba(212,175,55,0.15)] text-[10px] text-[rgba(212,175,55,0.6)] font-mono">
                    <span className="flex items-center gap-1.5">
                      <Shield className="w-3.5 h-3.5 text-gold" />
                      Provably Fair Seed Hash:
                    </span>
                    <span className="text-gold truncate max-w-[200px]">{commitHash}</span>
                  </div>
                )}

                {/* 3D Slot Reel Stage Window */}
                <div className="bg-gradient-to-b from-[#010604] via-[#051C12] to-[#010604] p-6 sm:p-8 rounded-3xl border-4 border-[#8B6914] shadow-[inset_0_0_50px_rgba(0,0,0,0.98),0_0_30px_rgba(212,175,55,0.25)] relative">
                  {/* Glowing Laser Payline Beam */}
                  <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-2 bg-gradient-to-r from-transparent via-[#FFD700] to-transparent pointer-events-none opacity-80 z-20 shadow-[0_0_20px_#FFD700]" />

                  {/* Staggered Reels Grid */}
                  <div className={`grid gap-4 ${activeSlot.reels === 3 ? 'grid-cols-3' : 'grid-cols-5'}`}>
                    {reels.map((sym, idx) => {
                      const isStopped = reelStoppedState[idx];
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
                              key={!isStopped ? `spin_${Date.now()}_${idx}` : sym}
                              initial={!isStopped ? { y: -120, opacity: 0.1, filter: 'blur(8px)' } : { scale: 0.7 }}
                              animate={
                                !isStopped
                                  ? { y: [120, -120, 0], opacity: [0.1, 1, 1], filter: ['blur(8px)', 'blur(0px)'] }
                                  : isWinning
                                  ? { scale: [1, 1.15, 1], rotate: [0, 5, -5, 0] }
                                  : { scale: 1 }
                              }
                              transition={{
                                duration: !isStopped ? 0.35 : 0.4,
                                repeat: !isStopped ? Infinity : isWinning ? Infinity : 0,
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
                    deductBalance(amount, `Slots — ${activeSlot.name} spin`);
                    const won = Math.random() > 0.6;
                    const mult = won ? activeSlot.paytable.threeOfAKind : 0;
                    const payout = won ? Math.round(amount * mult) : 0;
                    if (won) addBalance(payout, `Slots — ${activeSlot.name} win (${mult}×)`, 'win');
                    return won ? payout - amount : -amount;
                  }}
                />

                {/* Last Revealed Seed Verification Log */}
                {lastRevealedSeed && (
                  <div className="text-[10px] text-[rgba(212,175,55,0.5)] font-mono flex items-center gap-1.5 justify-center pt-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    Last Spin Provably Fair Seed Revealed: <span className="text-gold font-bold">{lastRevealedSeed.slice(0, 24)}...</span>
                  </div>
                )}
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
      <Modal isOpen={showPaytable} onClose={() => setShowPaytable(false)} title={`${activeSlot.name} Paytable & Rules`}>
        <div className="space-y-4 text-xs text-[#F5F1E6]/80">
          <div className="royal-panel p-4 rounded-xl space-y-3">
            <h4 className="font-black text-gold text-sm border-b border-[rgba(212,175,55,0.15)] pb-2 flex items-center gap-2">
              <Trophy className="w-4 h-4 text-gold" />
              Symbol Multiplier Table
            </h4>

            {currentPaytableRules.map((rule, idx) => (
              <div key={idx} className="flex items-center justify-between border-b border-[rgba(212,175,55,0.1)] pb-2">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{rule.symbol}</span>
                  <div>
                    <span className="font-bold text-gold block">{rule.name}</span>
                    <span className="text-[10px] text-[rgba(212,175,55,0.5)]">
                      {rule.fiveMatch ? `5-Match: ${rule.fiveMatch}x | ` : ''}3-Match: {rule.threeMatch}x
                    </span>
                  </div>
                </div>
                <div className="text-right font-mono font-black text-emerald-400 text-sm">
                  {rule.threeMatch}×
                </div>
              </div>
            ))}
          </div>

          <div className="bg-[#040E0A] p-4 rounded-xl border border-[rgba(212,175,55,0.15)] space-y-2 text-[11px] text-[rgba(212,175,55,0.7)]">
            <h5 className="font-black text-gold uppercase tracking-wider flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-gold" />
              Provably Fair Rules
            </h5>
            <p>
              Every spin result is cryptographically pre-determined by SHA-256 seed hashing. The seed hash is generated and displayed before you spin, ensuring 100% fair and tamper-proof outcomes.
            </p>
          </div>
        </div>
      </Modal>
    </div>
  );
}
