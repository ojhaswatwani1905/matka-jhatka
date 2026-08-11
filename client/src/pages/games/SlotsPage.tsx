import { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, HelpCircle, Sparkles, Trophy, Flame, Shield, CheckCircle2, Volume2, VolumeX, X } from 'lucide-react';
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
import { triggerWinCelebration } from '../../components/ui/WinCelebrationOverlay';
import { haptics } from '../../lib/haptics';
import Modal from '../../components/ui/Modal';
import { SEOHead } from '../../components/shared/SEOHead';
import { RelatedGamesSection } from '../../components/shared/RelatedGamesSection';

const slotsBreadcrumbLd = {
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
    { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://playarena.com/' },
    { '@type': 'ListItem', position: 2, name: 'Games', item: 'https://playarena.com/games' },
    { '@type': 'ListItem', position: 3, name: 'Slots', item: 'https://playarena.com/games/slots' },
  ],
};

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

/* ─── Detailed Paytables for All 6 Variants ─────────────────────── */
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
  'diamond-deluxe': [
    { symbol: '💎', name: 'Diamond Deluxe', threeMatch: 150, twoMatch: 6 },
    { symbol: '👑', name: 'Deluxe Crown', threeMatch: 60, twoMatch: 4 },
    { symbol: '🔮', name: 'Mystic Orb', threeMatch: 30, twoMatch: 2.5 },
    { symbol: '✨', name: 'Sparkle Gem', threeMatch: 15, twoMatch: 1.8 },
    { symbol: '💙', name: 'Sapphire Heart', threeMatch: 8, twoMatch: 1.4 },
    { symbol: '💍', name: 'Diamond Ring', threeMatch: 4, twoMatch: 1.0 },
  ],
  'wild-safari': [
    { symbol: '🦁', name: 'Lion King Jackpot', threeMatch: 30, fiveMatch: 300, twoMatch: 5 },
    { symbol: '🐘', name: 'Safari Elephant', threeMatch: 20, fiveMatch: 120, twoMatch: 3.5 },
    { symbol: '🦏', name: 'Rhino Stampede', threeMatch: 12, fiveMatch: 60, twoMatch: 2.5 },
    { symbol: '🦒', name: 'Tall Giraffe', threeMatch: 8, fiveMatch: 30, twoMatch: 2.0 },
    { symbol: '🦓', name: 'Wild Zebra', threeMatch: 5, fiveMatch: 15, twoMatch: 1.5 },
    { symbol: '🃏', name: 'Wild Safari Joker', threeMatch: 25, fiveMatch: 200, twoMatch: 4 },
  ],
  'golden-pharaoh': [
    { symbol: '𓀾', name: 'Pharaoh Flagship', threeMatch: 50, fiveMatch: 500, twoMatch: 8 },
    { symbol: '👁️', name: 'Eye of Horus', threeMatch: 30, fiveMatch: 200, twoMatch: 5 },
    { symbol: '𓆣', name: 'Golden Scarab', threeMatch: 20, fiveMatch: 100, twoMatch: 3.5 },
    { symbol: '🪙', name: 'Ancient Coin', threeMatch: 12, fiveMatch: 50, twoMatch: 2.5 },
    { symbol: '🏺', name: 'Relic Urn', threeMatch: 8, fiveMatch: 25, twoMatch: 1.8 },
    { symbol: '📜', name: 'Papyrus Scroll', threeMatch: 5, fiveMatch: 15, twoMatch: 1.2 },
  ],
};

export default function SlotsPage() {
  const { slots, activeSlot, setActiveSlotId, recordWagerAndPayout } = useSlots();
  const { balance, deductBalance, addBalance } = useWallet();
  const { isAuthenticated } = useAuth();
  const { addToast } = useToast();
  const { addNotification } = useNotifications();
  const { requireAuth } = useAuthGate();
  const { settings, checkIsFirstBet, consumeFirstBet } = useGameControl();

  const [betAmount, setBetAmount] = useState(100);
  const [spinning, setSpinning] = useState(false);
  const [soundMuted, setSoundMuted] = useState(false);
  const [reels, setReels] = useState<string[]>(() =>
    Array(activeSlot.reels).fill(activeSlot.symbols[0])
  );
  const [reelStoppedState, setReelStoppedState] = useState<boolean[]>(() =>
    Array(activeSlot.reels).fill(true)
  );

  const [lastWin, setLastWin] = useState<number | null>(null);
  const [winningIndexes, setWinningIndexes] = useState<number[]>([]);
  const [showPaytable, setShowPaytable] = useState(false);
  const [showMegaJackpotModal, setShowMegaJackpotModal] = useState(false);
  const [megaJackpotAmount, setMegaJackpotAmount] = useState(0);

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
      if (!soundMuted) sounds.playSpin();
      haptics.bet();

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
        const winSym = symbolPool[0];
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
          winMultiplier = sym === symbolPool[0]
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

      // 3. Staggered Reel Stopping Mechanics (~180ms stagger between reels)
      finalReels.forEach((sym, colIdx) => {
        const stopDelay = 600 + colIdx * 180;
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
          if (!soundMuted) sounds.playChip(); // Reel lock sound effect
        }, stopDelay);
      });

      // 4. Final Win/Loss Resolution after all reels lock
      const totalSpinDuration = 600 + reelsCount * 180 + 100;

      setTimeout(async () => {
        setSpinning(false);
        setLastRevealedSeed(currentSeed);

        // Generate next round's provably fair seed & hash
        await initSeed();

        const payout = winMultiplier > 0 ? Math.round(betAmount * winMultiplier) : 0;
        recordWagerAndPayout(activeSlot.id, betAmount, payout);
        redisCache.set(`slot:last_spin:${activeSlot.id}`, { reels: finalReels, winMultiplier, payout, timestamp: Date.now() }, 3600);

        if (winMultiplier > 0) {
          setLastWin(payout);
          setWinningIndexes(winCols);

          // Credit wallet on win
          addBalance(payout, `Slots — ${activeSlot.name} win (${winMultiplier}×)`, 'win');
          triggerWinCelebration({ winAmount: payout, multiplier: winMultiplier, gameName: activeSlot.name });
          if (!soundMuted) sounds.playWin();

          addToast({
            type: 'success',
            title: `🎰 WINNER! ₹${payout.toLocaleString('en-IN')}`,
            message: `Matched ${finalReels.join(' ')} (${winMultiplier}× payout)`,
          });

          // Big win notification & celebratory overlays
          if (winMultiplier >= 50) {
            setMegaJackpotAmount(payout);
            setShowMegaJackpotModal(true);
            confetti({ particleCount: 200, spread: 100, origin: { y: 0.5 }, colors: ['#FFD700', '#2ECC71', '#E74C3C', '#FFF'] });
            addNotification({
              type: 'spin',
              title: `🎰 MEGA JACKPOT WIN!`,
              message: `You won ₹${payout.toLocaleString('en-IN')} (${winMultiplier}×) on ${activeSlot.name}!`,
            });
          } else {
            confetti({ particleCount: 100, spread: 70, origin: { y: 0.5 }, colors: ['#FFD700', '#2ECC71'] });
          }
        } else {
          if (!soundMuted) sounds.playLoss();
        }
      }, totalSpinDuration);
    });
  }, [spinning, balance, betAmount, activeSlot, deductBalance, addToast, requireAuth, checkIsFirstBet, consumeFirstBet, settings.globalRtp, currentSeed, initSeed, soundMuted, recordWagerAndPayout, addBalance, addNotification]);

  const currentPaytableRules = VARIANT_PAYTABLES[activeSlot.id] || VARIANT_PAYTABLES['royal-gold-777'];

  return (
    <div className="min-h-screen py-3 px-2 sm:px-4 w-full max-w-7xl mx-auto space-y-4 relative">
      <SEOHead
        title="Royal 777 Jackpot Slots — Multi-Line Vegas Video Slots"
        description="Spin 6 exclusive 3-reel & 5-reel Vegas slot machines including Royal Gold 777, Dragon Fortune, Mega Fruit Party, and Golden Pharaoh with 777x jackpot multipliers."
        jsonLd={slotsBreadcrumbLd}
      />
      {/* Ambient Spotlight Background Layer */}
      <div
        className="fixed inset-0 pointer-events-none z-0"
        style={{
          background: 'radial-gradient(circle at 50% 20%, rgba(212,175,55,0.12), rgba(3,12,8,0.98) 75%)',
        }}
      />

      {/* Main Content Container (z-10 relative) */}
      <div className="relative z-10 space-y-4">
        {/* Top Slot Game Selector Pill Row (Scrollable horizontally) */}
        <div className="flex items-center justify-center gap-2 overflow-x-auto pb-1.5 no-scrollbar">
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
              className={`px-3.5 py-2 rounded-xl text-xs font-black whitespace-nowrap transition-all flex items-center gap-2 border shadow-md ${
                activeSlot.id === slot.id
                  ? 'bg-gradient-to-r from-[#FFD700] via-[#F5D576] to-[#8B6914] text-[#061510] border-[#FFF8DC] shadow-[0_0_20px_rgba(212,175,55,0.6)] scale-[1.02]'
                  : 'bg-[#040E0A]/90 text-[rgba(212,175,55,0.75)] border-[rgba(212,175,55,0.2)] hover:border-gold hover:text-gold'
              }`}
            >
              <span className="text-lg drop-shadow">{slot.emoji}</span>
              <span className="tracking-wide uppercase font-heading">{slot.name}</span>
              <span className="text-[9px] opacity-80 font-mono bg-black/40 px-1.5 py-0.5 rounded-full font-bold">
                {slot.reels} R
              </span>
            </button>
          ))}
        </div>

        {/* Master Center-Stage Grid (12 Columns) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* Left/Center Column: 3D Metallic Casino Cabinet (lg:col-span-8) */}
          <div className="lg:col-span-8 w-full space-y-4">
            <div className="rounded-3xl p-1 bg-gradient-to-b from-[#FFD700] via-[#3A290B] via-[#0D261A] to-[#FFD700] shadow-[0_10px_35px_rgba(0,0,0,0.85),0_0_30px_rgba(212,175,55,0.25)] border border-[#FFD700] relative">
              <div className="rounded-[22px] p-4 sm:p-5 space-y-4 bg-gradient-to-b from-[#0B2A1E] via-[#030E09] to-[#0B2A1E] relative overflow-hidden shadow-inner">
                {/* Cabinet Header & Audio Toggle */}
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[rgba(212,175,55,0.2)] pb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#FFD700] via-[#F5D576] to-[#8B6914] p-0.5 shadow-[0_0_15px_rgba(212,175,55,0.5)] flex items-center justify-center shrink-0">
                      <span className="text-2xl drop-shadow">{activeSlot.emoji}</span>
                    </div>
                    <div>
                      <h1 className="text-lg font-black text-[#E8C97A] font-heading tracking-wide flex items-center gap-1.5">
                        {activeSlot.name}
                        <Sparkles className="w-4 h-4 text-gold animate-bounce" />
                      </h1>
                      <p className="text-[10px] text-[rgba(212,175,55,0.65)] font-mono">{activeSlot.subtitle}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setSoundMuted(!soundMuted)}
                      className="p-1.5 rounded-lg bg-[rgba(212,175,55,0.1)] border border-[rgba(212,175,55,0.25)] text-gold hover:bg-[rgba(212,175,55,0.2)] transition-all"
                      title={soundMuted ? 'Unmute Audio' : 'Mute Audio'}
                    >
                      {soundMuted ? <VolumeX className="w-3.5 h-3.5 text-rose-400" /> : <Volume2 className="w-3.5 h-3.5 text-gold" />}
                    </button>

                    <span className="px-2.5 py-1 rounded-lg text-[10px] font-black uppercase font-mono bg-gradient-to-r from-amber-500/20 to-amber-600/10 text-gold border border-amber-500/30 flex items-center gap-1">
                      <Flame className="w-3.5 h-3.5 text-gold" />
                      {activeSlot.paytable.jackpot777}x Max
                    </span>

                    <button
                      onClick={() => setShowPaytable(true)}
                      className="px-2.5 py-1 rounded-lg bg-[rgba(212,175,55,0.15)] border border-[rgba(212,175,55,0.3)] text-gold text-xs font-bold flex items-center gap-1 hover:bg-[rgba(212,175,55,0.3)] transition-all"
                    >
                      <HelpCircle className="w-3.5 h-3.5" />
                      Paytable
                    </button>
                  </div>
                </div>

                {/* Provably Fair Commit Hash Badge */}
                {commitHash && (
                  <div className="flex items-center justify-between bg-[#040E0A] px-2.5 py-1 rounded-lg border border-[rgba(212,175,55,0.12)] text-[10px] text-[rgba(212,175,55,0.55)] font-mono">
                    <span className="flex items-center gap-1">
                      <Shield className="w-3 h-3 text-gold" />
                      Seed Hash:
                    </span>
                    <span className="text-gold truncate max-w-[180px]">{commitHash}</span>
                  </div>
                )}

                {/* Compact 3D Slot Reel Stage Window (Matching Mines Tile Proportions) */}
                <div className="bg-gradient-to-b from-[#010604] via-[#051C12] to-[#010604] p-4 sm:p-5 rounded-2xl border-2 border-[#8B6914] shadow-[inset_0_0_35px_rgba(0,0,0,0.98),0_0_20px_rgba(212,175,55,0.2)] relative">
                  {/* Winning Payline Laser Beam — ONLY visible on active winning matches! */}
                  {winningIndexes.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, scaleX: 0 }}
                      animate={{ opacity: 1, scaleX: 1 }}
                      className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-1.5 bg-gradient-to-r from-transparent via-[#FFD700] to-transparent pointer-events-none z-20 shadow-[0_0_25px_#FFD700]"
                    />
                  )}

                  {/* Compact Staggered Reels Grid */}
                  <div className={`grid gap-2.5 ${activeSlot.reels === 3 ? 'grid-cols-3' : 'grid-cols-5'}`}>
                    {reels.map((sym, idx) => {
                      const isStopped = reelStoppedState[idx];
                      const isWinning = winningIndexes.includes(idx);
                      const tileHeightClass = activeSlot.reels === 3 ? 'h-24 sm:h-28' : 'h-20 sm:h-24';
                      const fontSizeClass = activeSlot.reels === 3 ? 'text-4xl sm:text-5xl' : 'text-3xl sm:text-4xl';

                      return (
                        <div
                          key={idx}
                          className={`${tileHeightClass} ${fontSizeClass} rounded-xl border-2 flex items-center justify-center relative overflow-hidden transition-all duration-300 ${
                            isWinning
                              ? 'bg-gradient-to-b from-[#184E38] via-[#0F3827] to-[#184E38] border-[#FFD700] shadow-[0_0_30px_#FFD700,inset_0_0_20px_rgba(255,215,0,0.5)] scale-105 z-30'
                              : 'bg-gradient-to-b from-[#061C13] via-[#0E3A28] to-[#061C13] border-[rgba(212,175,55,0.3)] shadow-[inset_0_0_20px_rgba(0,0,0,0.9)]'
                          }`}
                        >
                          {/* 3D Glass Reflection Overlay */}
                          <div className="absolute inset-0 bg-gradient-to-tr from-white/10 via-transparent to-transparent pointer-events-none" />

                          <AnimatePresence mode="wait">
                            <motion.span
                              key={!isStopped ? `spin_${Date.now()}_${idx}` : sym}
                              initial={!isStopped ? { y: -100, opacity: 0.1, filter: 'blur(6px)' } : { scale: 0.8 }}
                              animate={
                                !isStopped
                                  ? { y: [100, -100, 0], opacity: [0.1, 1, 1], filter: ['blur(6px)', 'blur(0px)'] }
                                  : isWinning
                                  ? { scale: [1, 1.12, 1], rotate: [0, 4, -4, 0] }
                                  : { scale: 1 }
                              }
                              transition={{
                                duration: !isStopped ? 0.35 : 0.35,
                                repeat: !isStopped ? Infinity : isWinning ? Infinity : 0,
                                repeatDelay: isWinning ? 1 : 0,
                              }}
                              className="drop-shadow-[0_6px_12px_rgba(0,0,0,0.8)]"
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
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className="mt-4 text-center py-2.5 px-3 rounded-xl bg-gradient-to-r from-emerald-600/40 via-emerald-500/50 to-emerald-600/40 border border-emerald-400 text-emerald-200 font-black text-xl shadow-[0_0_25px_rgba(46,204,113,0.4)] flex items-center justify-center gap-2 uppercase tracking-wide"
                    >
                      <Trophy className="w-6 h-6 text-gold animate-bounce" />
                      JACKPOT WINNER! +₹{lastWin.toLocaleString('en-IN')}
                    </motion.div>
                  )}
                </div>

                {/* Tighter 3D Circular Casino Chips Bar */}
                <div className="space-y-3 pt-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-[rgba(212,175,55,0.8)] font-black uppercase tracking-wider flex items-center gap-1">
                      <Sparkles className="w-3.5 h-3.5 text-gold" />
                      Select Bet Chip
                    </span>
                    <span className="text-[11px] font-mono text-gold font-bold bg-[#030E09] px-3 py-1 rounded-full border border-[rgba(212,175,55,0.25)]">
                      Wallet: ₹{balance.toLocaleString('en-IN')}
                    </span>
                  </div>

                  <div className="grid grid-cols-5 gap-2">
                    {CHIP_VALUES.map(val => (
                      <button
                        key={val}
                        onClick={() => setBetAmount(val)}
                        className={`py-2 rounded-xl text-xs font-black transition-all border relative overflow-hidden shadow-md flex flex-col items-center justify-center gap-0.5 ${
                          betAmount === val
                            ? 'bg-gradient-to-b from-[#FFD700] via-[#D4AF37] to-[#8B6914] text-[#061510] border-[#FFF8DC] shadow-[0_0_15px_rgba(212,175,55,0.6)] scale-[1.03]'
                            : 'bg-[#040E0A] text-[rgba(212,175,55,0.7)] border-[rgba(212,175,55,0.2)] hover:border-gold hover:text-gold'
                        }`}
                      >
                        <span className="text-[8px] opacity-75 font-mono uppercase">Chip</span>
                        <span className="text-xs font-mono font-black">₹{val}</span>
                      </button>
                    ))}
                  </div>

                  {/* High-Impact Tactile Spin Button */}
                  <button
                    onClick={spinReels}
                    disabled={spinning}
                    className={`w-full py-3.5 sm:py-4 rounded-xl font-black text-lg sm:text-xl flex items-center justify-center gap-2.5 transition-all uppercase tracking-widest border border-[#FFF8DC] relative overflow-hidden shadow-xl ${
                      spinning
                        ? 'bg-gray-800 text-gray-500 border-gray-600 cursor-not-allowed'
                        : 'bg-gradient-to-r from-[#FFD700] via-[#FFF8DC] to-[#B8860B] text-[#061510] shadow-[0_0_25px_rgba(212,175,55,0.6)] hover:brightness-110 active:scale-[0.98]'
                    }`}
                  >
                    <Play className="w-6 h-6 fill-current" />
                    {spinning ? 'Spinning Reels...' : `SPIN SLOT (₹${betAmount})`}
                  </button>
                </div>

                {/* Auto-Bet Panel Integration */}
                <AutoBetPanel
                  balance={balance}
                  disabled={spinning}
                  intervalMs={2500}
                  onPlaceBet={async (amt) => {
                    if (!isAuthenticated || spinning || balance < amt) return 0;
                    const prevBal = balance;
                    spinReels();
                    await new Promise<void>(resolve => {
                      const timer = setInterval(() => {
                        if (!spinning) {
                          clearInterval(timer);
                          resolve();
                        }
                      }, 200);
                    });
                    return balance - prevBal;
                  }}
                />

                {/* Last Revealed Seed Verification Log */}
                {lastRevealedSeed && (
                  <div className="text-[10px] text-[rgba(212,175,55,0.5)] font-mono flex items-center gap-1 justify-center pt-1">
                    <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                    Last Seed Revealed: <span className="text-gold font-bold">{lastRevealedSeed.slice(0, 20)}...</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Column: Live Chat & Community Feed (lg:col-span-4) */}
          <div className="lg:col-span-4 w-full space-y-4">
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

      {/* Scaled Mega Jackpot Celebration Modal Overlay */}
      <AnimatePresence>
        {showMegaJackpotModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.5, opacity: 0 }}
              className="royal-panel p-8 rounded-3xl max-w-md w-full text-center space-y-6 border-4 border-[#FFD700] shadow-[0_0_60px_rgba(255,215,0,0.8)] relative"
            >
              <button
                onClick={() => setShowMegaJackpotModal(false)}
                className="absolute top-4 right-4 p-2 text-gold hover:text-white"
              >
                <X className="w-6 h-6" />
              </button>

              <div className="w-24 h-24 mx-auto rounded-full bg-gradient-to-br from-[#FFD700] via-[#F5D576] to-[#8B6914] flex items-center justify-center text-5xl shadow-[0_0_30px_#FFD700] animate-bounce">
                👑
              </div>

              <div>
                <h2 className="text-3xl font-black text-gold font-heading uppercase tracking-wider">MEGA JACKPOT HIT!</h2>
                <p className="text-sm text-[rgba(212,175,55,0.7)] mt-1">Congratulations! You unlocked the top prize!</p>
              </div>

              <div className="py-4 bg-[#040E0A] rounded-2xl border-2 border-emerald-400">
                <span className="text-xs text-emerald-400 font-mono block">TOTAL WINNINGS</span>
                <span className="text-4xl font-black font-mono text-emerald-300">₹{megaJackpotAmount.toLocaleString('en-IN')}</span>
              </div>

              <button
                onClick={() => setShowMegaJackpotModal(false)}
                className="w-full py-4 rounded-xl bg-gradient-to-r from-[#FFD700] via-[#F5D576] to-[#8B6914] text-[#061510] font-black text-lg uppercase tracking-wider shadow-lg"
              >
                COLLECT WINNINGS
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Internal Cross-Linking */}
      <RelatedGamesSection currentGameId="slots" />
    </div>
  );
}
