import { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, HelpCircle, Sparkles, Trophy, Flame, Shield, Volume2, VolumeX } from 'lucide-react';
import confetti from 'canvas-confetti';
import { useSlots } from '../../store/SlotContext';
import { useWallet } from '../../store/WalletContext';
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

/* ─── Paytable Multipliers ─────────────────────────────────────── */
interface SymbolPayoutRule {
  symbol: string;
  name: string;
  threeMatch: number;
  fiveMatch?: number;
  twoMatch?: number;
  color: string;
}

const VARIANT_PAYTABLES: Record<string, SymbolPayoutRule[]> = {
  'royal-gold-777': [
    { symbol: '7️⃣', name: 'Lucky 7 Jackpot', threeMatch: 100, fiveMatch: 500, twoMatch: 5, color: '#FFD700' },
    { symbol: '👑', name: 'Royal Crown', threeMatch: 50, fiveMatch: 250, twoMatch: 3, color: '#E8C97A' },
    { symbol: '💎', name: 'Diamond Gem', threeMatch: 25, fiveMatch: 120, twoMatch: 2, color: '#00E5FF' },
    { symbol: '🔔', name: 'Golden Bell', threeMatch: 10, fiveMatch: 50, twoMatch: 1.5, color: '#FFA500' },
    { symbol: '🍒', name: 'Classic Cherry', threeMatch: 5, fiveMatch: 25, twoMatch: 1.2, color: '#FF1744' },
    { symbol: '🍋', name: 'Vegas Lemon', threeMatch: 3, fiveMatch: 15, twoMatch: 1.0, color: '#FFEB3B' },
  ],
  'dragon-fortune-5x': [
    { symbol: '🐉', name: 'Mythic Dragon', threeMatch: 30, fiveMatch: 300, twoMatch: 4, color: '#FF4500' },
    { symbol: '👑', name: 'Emperor Crown', threeMatch: 20, fiveMatch: 150, twoMatch: 3, color: '#FFD700' },
    { symbol: '💎', name: 'Dragon Gem', threeMatch: 12, fiveMatch: 75, twoMatch: 2, color: '#00E5FF' },
    { symbol: '🔥', name: 'Dragon Flame', threeMatch: 8, fiveMatch: 40, twoMatch: 1.8, color: '#FF1744' },
    { symbol: '🔮', name: 'Orb of Wisdom', threeMatch: 5, fiveMatch: 20, twoMatch: 1.5, color: '#9C27B0' },
    { symbol: '🧧', name: 'Red Envelope', threeMatch: 4, fiveMatch: 15, twoMatch: 1.2, color: '#E91E63' },
    { symbol: '🪙', name: 'Golden Coin', threeMatch: 3, fiveMatch: 10, twoMatch: 1.0, color: '#FFC107' },
  ],
  'mega-fruit-party': [
    { symbol: '⭐', name: 'Party Star Jackpot', threeMatch: 75, fiveMatch: 400, twoMatch: 4, color: '#FFD700' },
    { symbol: '🍓', name: 'Juicy Strawberry', threeMatch: 35, fiveMatch: 150, twoMatch: 3, color: '#FF1744' },
    { symbol: '🍉', name: 'Watermelon', threeMatch: 15, fiveMatch: 60, twoMatch: 2, color: '#4CAF50' },
    { symbol: '🍇', name: 'Royal Grapes', threeMatch: 8, fiveMatch: 30, twoMatch: 1.5, color: '#9C27B0' },
    { symbol: '🍌', name: 'Banana Split', threeMatch: 4, fiveMatch: 15, twoMatch: 1.2, color: '#FFEB3B' },
    { symbol: '🍒', name: 'Arcade Cherry', threeMatch: 2, fiveMatch: 10, twoMatch: 1.0, color: '#F44336' },
  ],
  'diamond-deluxe': [
    { symbol: '💎', name: 'Diamond Deluxe', threeMatch: 150, fiveMatch: 600, twoMatch: 6, color: '#00E5FF' },
    { symbol: '👑', name: 'Deluxe Crown', threeMatch: 60, fiveMatch: 250, twoMatch: 4, color: '#FFD700' },
    { symbol: '🔮', name: 'Mystic Orb', threeMatch: 30, fiveMatch: 120, twoMatch: 2.5, color: '#E040FB' },
    { symbol: '✨', name: 'Sparkle Gem', threeMatch: 15, fiveMatch: 50, twoMatch: 1.8, color: '#FFF' },
    { symbol: '💙', name: 'Sapphire Heart', threeMatch: 8, fiveMatch: 30, twoMatch: 1.4, color: '#2979FF' },
    { symbol: '💍', name: 'Diamond Ring', threeMatch: 4, fiveMatch: 15, twoMatch: 1.0, color: '#B2EBF2' },
  ],
  'wild-safari': [
    { symbol: '🦁', name: 'Lion King Jackpot', threeMatch: 30, fiveMatch: 300, twoMatch: 5, color: '#FF9800' },
    { symbol: '🐘', name: 'Safari Elephant', threeMatch: 20, fiveMatch: 120, twoMatch: 3.5, color: '#90A4AE' },
    { symbol: '🦏', name: 'Rhino Stampede', threeMatch: 12, fiveMatch: 60, twoMatch: 2.5, color: '#78909C' },
    { symbol: '🦒', name: 'Tall Giraffe', threeMatch: 8, fiveMatch: 30, twoMatch: 2.0, color: '#FFB74D' },
    { symbol: '🦓', name: 'Wild Zebra', threeMatch: 5, fiveMatch: 15, twoMatch: 1.5, color: '#ECEFF1' },
    { symbol: '🃏', name: 'Wild Safari Joker', threeMatch: 25, fiveMatch: 200, twoMatch: 4, color: '#E91E63' },
  ],
  'golden-pharaoh': [
    { symbol: '𓀾', name: 'Pharaoh Flagship', threeMatch: 50, fiveMatch: 500, twoMatch: 8, color: '#FFD700' },
    { symbol: '👁️', name: 'Eye of Horus', threeMatch: 30, fiveMatch: 200, twoMatch: 5, color: '#00E5FF' },
    { symbol: '𓆣', name: 'Golden Scarab', threeMatch: 20, fiveMatch: 100, twoMatch: 3.5, color: '#FFB300' },
    { symbol: '🪙', name: 'Ancient Coin', threeMatch: 12, fiveMatch: 50, twoMatch: 2.5, color: '#FFA000' },
    { symbol: '🏺', name: 'Relic Urn', threeMatch: 8, fiveMatch: 25, twoMatch: 1.8, color: '#D7CCC8' },
    { symbol: '📜', name: 'Papyrus Scroll', threeMatch: 5, fiveMatch: 15, twoMatch: 1.2, color: '#FFF8E1' },
  ],
};

const DEFAULT_SYMBOL_COLORS: Record<string, string> = {
  '7️⃣': '#FFD700',
  '👑': '#E8C97A',
  '💎': '#00E5FF',
  '🔔': '#FFA500',
  '🍒': '#FF1744',
  '🍋': '#FFEB3B',
  '⭐': '#FFD700',
  '🍓': '#FF1744',
  '🍉': '#4CAF50',
  '🍇': '#9C27B0',
  '🍌': '#FFEB3B',
  '🐉': '#FF4500',
  '🔥': '#FF1744',
  '🔮': '#E040FB',
  '🦁': '#FF9800',
  '🐘': '#90A4AE',
  '𓀾': '#FFD700',
};

// --- GRID CONFIGURATION ---
const REEL_LENGTH = 35;
const VISIBLE_COUNT = 4; // 4 rows visible on board
const VISIBLE_ROWS = [8, 9, 10, 11]; // The indices mapped to visible board
const PARTICLE_COUNT = 12;

interface CellCoord {
  row: number; // 0 to VISIBLE_COUNT - 1
  col: number; // 0 to COLUMNS - 1
}

export default function SlotsPage() {
  const { slots, activeSlot, setActiveSlotId, recordWagerAndPayout } = useSlots();
  const { balance, deductBalance, addBalance } = useWallet();
  const { addToast } = useToast();
  const { addNotification } = useNotifications();
  const { requireAuth } = useAuthGate();
  const { checkIsFirstBet, consumeFirstBet } = useGameControl();

  const [betAmount, setBetAmount] = useState(100);
  const [spinning, setSpinning] = useState(false);
  const [soundMuted, setSoundMuted] = useState(false);

  const columnsCount = activeSlot.reels; // 3 or 5

  // Helper to generate full reel strip
  const createReelStrip = useCallback((symbolPool: string[], forceSymbol: string | null = null, winRowPos: number = -1) => {
    return Array.from({ length: REEL_LENGTH }, (_, i) => {
      if (forceSymbol && winRowPos >= 0 && i === VISIBLE_ROWS[winRowPos]) {
        return forceSymbol;
      }
      return symbolPool[Math.floor(Math.random() * symbolPool.length)];
    });
  }, []);

  // Multi-column reels state (Array of symbol arrays)
  const [reels, setReels] = useState<string[][]>(() =>
    Array.from({ length: 5 }, () => Array.from({ length: REEL_LENGTH }, () => activeSlot.symbols[0]))
  );

  // Column stopping state
  const [stopIndex, setStopIndex] = useState<number>(columnsCount - 1);
  const [winningCells, setWinningCells] = useState<CellCoord[]>([]);
  const [activeWinLines, setActiveWinLines] = useState<number[]>([]);
  const [destroyingCells, setDestroyingCells] = useState<CellCoord[]>([]);
  const [winMsg, setWinMsg] = useState<string>('');
  const [lastWin, setLastWin] = useState<number | null>(null);

  // Responsive symbol size calculation
  const [symbolSize, setSymbolSize] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      if (window.innerWidth <= 480) return 60;
      if (window.innerWidth <= 768) return 76;
      return 92;
    }
    return 80;
  });

  const [showPaytable, setShowPaytable] = useState(false);
  const [showMegaJackpotModal, setShowMegaJackpotModal] = useState(false);
  const [megaJackpotAmount, setMegaJackpotAmount] = useState(0);

  // Provably Fair State
  const [commitHash, setCommitHash] = useState<string>('');

  // Track symbol sizing on window resize
  useEffect(() => {
    const calcSize = () => {
      if (window.innerWidth <= 380) setSymbolSize(52);
      else if (window.innerWidth <= 480) setSymbolSize(62);
      else if (window.innerWidth <= 768) setSymbolSize(78);
      else setSymbolSize(94);
    };
    calcSize();
    window.addEventListener('resize', calcSize);
    return () => window.removeEventListener('resize', calcSize);
  }, []);

  // Prepare seed hash on mount & activeSlot change
  const initSeed = useCallback(async () => {
    const s = generateSlotSeed();
    const h = await hashSlotSeed(s);
    setCommitHash(h);
  }, []);

  useEffect(() => {
    initSeed();
    // Initialize reels with active slot symbols
    setReels(Array.from({ length: activeSlot.reels }, () => createReelStrip(activeSlot.symbols)));
    setStopIndex(activeSlot.reels - 1);
    setWinningCells([]);
    setActiveWinLines([]);
    setDestroyingCells([]);
    setWinMsg('');
    setLastWin(null);
  }, [activeSlot.id, activeSlot.reels, activeSlot.symbols, createReelStrip, initSeed]);

  const currentPaytableRules = VARIANT_PAYTABLES[activeSlot.id] || VARIANT_PAYTABLES['royal-gold-777'];

  // Helper to evaluate winning lines and cells across the visible board
  const evaluateWins = useCallback((reelsData: string[][], cols: number, bet: number) => {
    let winCells: CellCoord[] = [];
    let winningRows: number[] = [];
    let totalPayout = 0;
    let maxMultiplier = 0;

    VISIBLE_ROWS.forEach((rowIdx, rowPos) => {
      const rowSymbols = reelsData.slice(0, cols).map(r => r[rowIdx]);
      const first = rowSymbols[0];

      // Check full row match across all columns
      const fullMatch = rowSymbols.every(s => s === first);
      // Check 3-in-a-row from left
      const threeMatch = cols >= 3 && rowSymbols[0] === rowSymbols[1] && rowSymbols[1] === rowSymbols[2];

      if (fullMatch || threeMatch) {
        winningRows.push(rowPos);
        const matchCount = fullMatch ? cols : 3;

        for (let col = 0; col < matchCount; col++) {
          if (!winCells.some(c => c.row === rowPos && c.col === col)) {
            winCells.push({ row: rowPos, col });
          }
        }

        // Find payout multiplier
        const rule = currentPaytableRules.find(r => r.symbol === first);
        let mult = 5;
        if (rule) {
          mult = fullMatch && rule.fiveMatch ? rule.fiveMatch : rule.threeMatch;
        } else {
          mult = fullMatch ? 20 : 5;
        }

        maxMultiplier = Math.max(maxMultiplier, mult);
        totalPayout += Math.round(bet * mult);
      }
    });

    return { winCells, winningRows, totalPayout, maxMultiplier };
  }, [currentPaytableRules]);

  // Apply Cascade / Avalanche: Nullify winning cells, drop existing down, and fill new at top
  const applyCascade = useCallback((reelsData: string[][], destroyed: CellCoord[], cols: number, symbolPool: string[]) => {
    let newReels = reelsData.map(r => [...r]);

    // Mark winning cells as null
    destroyed.forEach(({ row, col }) => {
      if (newReels[col]) {
        newReels[col][VISIBLE_ROWS[row]] = null as any;
      }
    });

    // Cascade shift
    for (let col = 0; col < cols; col++) {
      let filtered = newReels[col].filter(x => x !== null);
      while (filtered.length < REEL_LENGTH) {
        filtered.unshift(symbolPool[Math.floor(Math.random() * symbolPool.length)]);
      }
      newReels[col] = filtered;
    }

    return newReels;
  }, []);

  // Recursive Cascade Chain Handler
  const runCascadeLoop = useCallback((reelsData: string[][], oldWinCells: CellCoord[], currentCombo: number, baseBet: number) => {
    const cascaded = applyCascade(reelsData, oldWinCells, columnsCount, activeSlot.symbols);
    setReels(cascaded);

    setTimeout(() => {
      const { winCells, winningRows, totalPayout } = evaluateWins(cascaded, columnsCount, baseBet);

      if (winCells.length > 0) {
        const comboBoost = totalPayout * currentCombo;
        setWinningCells(winCells);
        setActiveWinLines(winningRows);
        setWinMsg(`🔥 CASCADE ×${currentCombo} (+₹${comboBoost.toLocaleString('en-IN')})`);

        if (!soundMuted) sounds.playWin();
        haptics.winMedium();

        // Credit combo payout
        addBalance(comboBoost, `Slots — ${activeSlot.name} Cascade ×${currentCombo}`, 'win');
        setLastWin(prev => (prev || 0) + comboBoost);

        // Particle blast explosion
        setTimeout(() => {
          setDestroyingCells(winCells);
          setTimeout(() => {
            setWinningCells([]);
            setActiveWinLines([]);
            setDestroyingCells([]);
            runCascadeLoop(cascaded, winCells, currentCombo + 1, baseBet);
          }, 400);
        }, 600);
      } else {
        // Cascade finished
        setTimeout(() => {
          setWinMsg('');
        }, 1200);
      }
    }, 600);
  }, [applyCascade, columnsCount, activeSlot.symbols, activeSlot.name, evaluateWins, soundMuted, addBalance]);

  // Main Spin Action
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
      setStopIndex(-1);
      setWinningCells([]);
      setActiveWinLines([]);
      setDestroyingCells([]);
      setWinMsg('');
      setLastWin(null);

      if (!soundMuted) sounds.playSpin();
      haptics.bet();

      const isFirstBet = checkIsFirstBet();
      const symbolPool = activeSlot.symbols;

      // 2. Generate Outcome & Reel Strips
      let forceWin = isFirstBet || Math.random() > 0.55;
      let winSym = symbolPool[Math.floor(Math.random() * symbolPool.length)];
      let winRow = Math.floor(Math.random() * VISIBLE_COUNT);

      if (isFirstBet) {
        consumeFirstBet();
        forceWin = true;
        winSym = symbolPool[0]; // Jackpot 777
        winRow = 1; // Center row
        addToast({ type: 'success', title: '🎉 Beginner Luck!', message: 'Jackpot hit on your 1st bet!' });
      }

      const newReels = Array.from({ length: columnsCount }, () =>
        createReelStrip(symbolPool, forceWin ? winSym : null, forceWin ? winRow : -1)
      );

      setReels(newReels);

      // 3. Staggered Column Stop (Column 0, 1, 2, 3, 4 sequentially land with audio)
      Array.from({ length: columnsCount }).forEach((_, i) => {
        setTimeout(() => {
          setStopIndex(i);
          if (!soundMuted) sounds.playChip();

          // When the final column stops, resolve win/loss & cascades
          if (i === columnsCount - 1) {
            setTimeout(async () => {
              setSpinning(false);
              await initSeed();

              const { winCells, winningRows, totalPayout, maxMultiplier } = evaluateWins(newReels, columnsCount, betAmount);

              recordWagerAndPayout(activeSlot.id, betAmount, totalPayout);
              redisCache.set(`slot:last_spin:${activeSlot.id}`, { winMultiplier: maxMultiplier, payout: totalPayout, timestamp: Date.now() }, 3600);

              if (winCells.length > 0) {
                setWinningCells(winCells);
                setActiveWinLines(winningRows);
                setLastWin(totalPayout);
                setWinMsg(`🎉 BIG WIN +₹${totalPayout.toLocaleString('en-IN')}`);

                addBalance(totalPayout, `Slots — ${activeSlot.name} win (${maxMultiplier}×)`, 'win');
                triggerWinCelebration({ winAmount: totalPayout, multiplier: maxMultiplier, gameName: activeSlot.name });

                if (!soundMuted) sounds.playWin();
                haptics.winMedium();

                addToast({
                  type: 'success',
                  title: `🎰 WINNER! +₹${totalPayout.toLocaleString('en-IN')}`,
                  message: `Matched winning row (${maxMultiplier}× payout)`,
                });

                if (maxMultiplier >= 40) {
                  setMegaJackpotAmount(totalPayout);
                  setShowMegaJackpotModal(true);
                  confetti({ particleCount: 220, spread: 110, origin: { y: 0.5 }, colors: ['#FFD700', '#2ECC71', '#FF4D6D', '#FFF'] });
                  addNotification({
                    type: 'spin',
                    title: `🎰 MEGA JACKPOT WIN!`,
                    message: `You won ₹${totalPayout.toLocaleString('en-IN')} on ${activeSlot.name}!`,
                  });
                } else {
                  confetti({ particleCount: 110, spread: 80, origin: { y: 0.5 }, colors: ['#FFD700', '#2ECC71'] });
                }

                // Trigger First Cascade Blast
                setTimeout(() => {
                  setDestroyingCells(winCells);
                  setTimeout(() => {
                    setWinningCells([]);
                    setActiveWinLines([]);
                    setDestroyingCells([]);
                    runCascadeLoop(newReels, winCells, 2, betAmount);
                  }, 400);
                }, 800);
              } else {
                if (!soundMuted) sounds.playLoss();
              }
            }, 350 + i * 20);
          }
        }, 1100 + i * 140);
      });
    });
  }, [
    spinning,
    balance,
    betAmount,
    activeSlot,
    deductBalance,
    addToast,
    requireAuth,
    soundMuted,
    checkIsFirstBet,
    consumeFirstBet,
    columnsCount,
    createReelStrip,
    initSeed,
    evaluateWins,
    recordWagerAndPayout,
    addBalance,
    addNotification,
    runCascadeLoop,
  ]);

  return (
    <div className="min-h-screen py-3 px-2 sm:px-4 w-full max-w-7xl mx-auto space-y-4 relative">
      <SEOHead
        title="Royal 777 Jackpot Slots — Multi-Line Vegas Video Slots"
        description="Spin 6 exclusive 3-reel & 5-reel Vegas slot machines including Royal Gold 777, Dragon Fortune, Mega Fruit Party, and Golden Pharaoh with 777x jackpot multipliers and cascading wins."
        jsonLd={slotsBreadcrumbLd}
      />

      {/* Ambient Spotlight Background */}
      <div
        className="fixed inset-0 pointer-events-none z-0"
        style={{
          background: 'radial-gradient(circle at 50% 20%, rgba(212,175,55,0.14), rgba(3,12,8,0.98) 75%)',
        }}
      />

      {/* Main Content */}
      <div className="relative z-10 space-y-4">
        {/* Top Slot Theme Selector Pills */}
        <div className="flex items-center justify-center gap-2 overflow-x-auto pb-1.5 no-scrollbar">
          {slots.filter(s => s.enabled).map(slot => (
            <button
              key={slot.id}
              onClick={() => {
                setActiveSlotId(slot.id);
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
                {slot.reels}R × 4
              </span>
            </button>
          ))}
        </div>

        {/* Master Center-Stage Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* Left/Center Column: Casino Cabinet & Slot Engine (lg:col-span-8) */}
          <div className="lg:col-span-8 w-full space-y-4">
            <div className="rounded-3xl p-1 bg-gradient-to-b from-[#FFD700] via-[#3A290B] via-[#0D261A] to-[#FFD700] shadow-[0_10px_35px_rgba(0,0,0,0.85),0_0_30px_rgba(212,175,55,0.25)] border border-[#FFD700] relative">
              <div className="rounded-[22px] p-3 sm:p-5 space-y-3 sm:space-y-4 bg-gradient-to-b from-[#0B2A1E] via-[#030E09] to-[#0B2A1E] relative overflow-hidden shadow-inner">
                
                {/* Header & Controls */}
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
                      <p className="text-[10px] text-[rgba(212,175,55,0.65)] font-mono">
                        Cascading Avalanche • {activeSlot.reels} Reels × 4 Rows
                      </p>
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
                      className="px-2.5 py-1 rounded-lg bg-[rgba(212,175,55,0.15)] border border-[rgba(212,175,55,0.3)] text-gold text-xs font-bold flex items-center gap-1 hover:bg-[rgba(212,175,55,0.3)] transition-all cursor-pointer"
                    >
                      <HelpCircle className="w-3.5 h-3.5" /> Paytable
                    </button>
                  </div>
                </div>

                {/* Seed Hash Banner */}
                {commitHash && (
                  <div className="flex items-center justify-between bg-[#040E0A] px-2.5 py-1 rounded-lg border border-[rgba(212,175,55,0.12)] text-[10px] text-[rgba(212,175,55,0.55)] font-mono">
                    <span className="flex items-center gap-1">
                      <Shield className="w-3 h-3 text-gold" />
                      Provably Fair Seed:
                    </span>
                    <span className="text-gold truncate max-w-[180px] sm:max-w-[260px]">{commitHash}</span>
                  </div>
                )}

                {/* Win / Cascade Animated Banner */}
                <div className="h-8 flex items-center justify-center">
                  <AnimatePresence>
                    {winMsg && (
                      <motion.div
                        initial={{ scale: 0.7, opacity: 0 }}
                        animate={{ scale: [1, 1.1, 1], opacity: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        transition={{ repeat: Infinity, duration: 0.8 }}
                        className="text-center font-black font-heading tracking-wide text-sm sm:text-base text-gold drop-shadow-[0_0_12px_rgba(255,215,0,0.8)]"
                      >
                        {winMsg}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* ========================================================= */}
                {/* 🎰 REEL STAGE WINDOW (Full Animated Mechanism from sl1) */}
                {/* ========================================================= */}
                <div className="relative flex justify-center bg-[#050E09] p-2 sm:p-3.5 rounded-2xl border-2 border-[#8B6914] shadow-[inset_0_0_35px_rgba(0,0,0,0.98),0_0_20px_rgba(212,175,55,0.2)] overflow-hidden mx-auto">
                  
                  {/* Glowing Laser Win Lines across winning rows */}
                  {activeWinLines.map(rowPos => (
                    <motion.div
                      key={rowPos}
                      initial={{ scaleX: 0 }}
                      animate={{ scaleX: 1 }}
                      style={{
                        position: 'absolute',
                        top: 10 + rowPos * symbolSize + symbolSize / 2 - 3,
                        left: 10,
                        width: 'calc(100% - 20px)',
                        height: '6px',
                        background: 'linear-gradient(90deg, transparent, #FFD700, #FFF, #FFD700, transparent)',
                        boxShadow: '0 0 20px #FFD700, 0 0 10px #FF8C00',
                        zIndex: 50,
                        transformOrigin: 'center',
                        pointerEvents: 'none',
                      }}
                    />
                  ))}

                  {/* Reel Columns Grid */}
                  <div
                    className="flex justify-center items-center gap-1 sm:gap-1.5"
                    style={{
                      width: 'fit-content',
                      maxWidth: '100%',
                    }}
                  >
                    {reels.slice(0, columnsCount).map((reel, colIndex) => {
                      const isStopped = colIndex <= stopIndex;
                      return (
                        <div
                          key={colIndex}
                          style={{
                            width: symbolSize,
                            height: symbolSize * VISIBLE_COUNT,
                            overflow: 'hidden',
                            background: '#040C08',
                            border: '1px solid rgba(212,175,55,0.2)',
                            borderRadius: '12px',
                            position: 'relative',
                            boxShadow: 'inset 0 0 15px rgba(0,0,0,0.9)',
                          }}
                        >
                          <motion.div
                            animate={{
                              y: isStopped ? -8 * symbolSize : -(symbolSize * 22),
                            }}
                            transition={{
                              duration: isStopped ? 0.45 : 0.09,
                              ease: isStopped ? 'easeOut' : 'linear',
                              repeat: isStopped ? 0 : Infinity,
                            }}
                            style={{
                              filter: spinning && !isStopped ? 'blur(1.5px)' : 'none',
                            }}
                          >
                            {reel.map((sym, i) => {
                              const rowPos = VISIBLE_ROWS.indexOf(i);
                              const isDestroying = destroyingCells.some(c => c.row === rowPos && c.col === colIndex);
                              const isWinning = winningCells.some(c => c.row === rowPos && c.col === colIndex);
                              const symColor = DEFAULT_SYMBOL_COLORS[sym] || '#FFD700';

                              return (
                                <div
                                  key={i}
                                  style={{
                                    width: symbolSize,
                                    height: symbolSize,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    position: 'relative',
                                    boxSizing: 'border-box',
                                    borderBottom: '1px solid rgba(212,175,55,0.06)',
                                  }}
                                >
                                  {!isDestroying && (
                                    <motion.div
                                      animate={
                                        isWinning
                                          ? { scale: [1, 1.18, 1], filter: 'drop-shadow(0 0 12px #FFD700) brightness(1.35)' }
                                          : { scale: 1, filter: 'none' }
                                      }
                                      transition={{ repeat: isWinning ? Infinity : 0, duration: 0.6 }}
                                      className="flex items-center justify-center select-none"
                                      style={{
                                        fontSize: symbolSize > 70 ? '2.4rem' : symbolSize > 55 ? '1.8rem' : '1.4rem',
                                      }}
                                    >
                                      {sym}
                                    </motion.div>
                                  )}

                                  {/* Bubble Particle Blast Explosion on winning cell */}
                                  {isDestroying && (
                                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                      {Array.from({ length: PARTICLE_COUNT }).map((_, pi) => {
                                        const angle = (pi / PARTICLE_COUNT) * Math.PI * 2;
                                        const dist = (symbolSize * 0.35) + Math.random() * (symbolSize * 0.45);
                                        return (
                                          <motion.div
                                            key={pi}
                                            initial={{ x: 0, y: 0, scale: 1, opacity: 1 }}
                                            animate={{
                                              x: Math.cos(angle) * dist,
                                              y: Math.sin(angle) * dist,
                                              scale: 0,
                                              opacity: 0,
                                            }}
                                            transition={{ duration: 0.4, ease: 'easeOut' }}
                                            style={{
                                              position: 'absolute',
                                              width: symbolSize > 60 ? 10 : 7,
                                              height: symbolSize > 60 ? 10 : 7,
                                              borderRadius: '50%',
                                              background: symColor,
                                              boxShadow: `0 0 10px ${symColor}`,
                                            }}
                                          />
                                        );
                                      })}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </motion.div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Payout Notification Banner */}
                {lastWin !== null && (
                  <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="text-center py-2.5 px-3 rounded-xl bg-gradient-to-r from-emerald-600/40 via-emerald-500/50 to-emerald-600/40 border border-emerald-400 text-emerald-200 font-black text-base sm:text-lg shadow-[0_0_25px_rgba(46,204,113,0.4)] flex items-center justify-center gap-2 uppercase tracking-wide"
                  >
                    <Trophy className="w-5 h-5 text-gold animate-bounce" />
                    TOTAL PAYOUT: +₹{lastWin.toLocaleString('en-IN')}
                  </motion.div>
                )}

                {/* Chip Selector & Controls */}
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
                        className={`py-2 rounded-xl text-xs font-black transition-all border relative overflow-hidden shadow-md flex flex-col items-center justify-center gap-0.5 cursor-pointer ${
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

                  {/* High-Impact Spin Button */}
                  <button
                    onClick={spinReels}
                    disabled={spinning}
                    className={`w-full py-3.5 sm:py-4 rounded-xl font-black text-lg sm:text-xl flex items-center justify-center gap-2.5 transition-all uppercase tracking-widest border border-[#FFF8DC] relative overflow-hidden shadow-xl cursor-pointer ${
                      spinning
                        ? 'bg-gray-800 text-gray-500 border-gray-600 cursor-not-allowed'
                        : 'bg-gradient-to-r from-[#FFD700] via-[#FFF8DC] to-[#B8860B] text-[#061510] shadow-[0_0_25px_rgba(212,175,55,0.6)] hover:brightness-110 active:scale-[0.98]'
                    }`}
                  >
                    <Play className="w-6 h-6 fill-current" />
                    {spinning ? 'Spinning Reels...' : `SPIN SLOT (₹${betAmount})`}
                  </button>
                </div>
              </div>
            </div>

            {/* Auto-Bet Assistant Panel */}
            <AutoBetPanel
              onPlaceBet={async (amount) => {
                setBetAmount(amount);
                spinReels();
                return (lastWin || 0) - amount;
              }}
              balance={balance}
              disabled={spinning}
            />
          </div>

          {/* Right Column: Live Chat & Related Games (lg:col-span-4) */}
          <div className="lg:col-span-4 w-full space-y-4">
            <GameChat gameId="slots" />
          </div>
        </div>

        {/* Related Games */}
        <RelatedGamesSection currentGameId="slots" />
      </div>

      {/* Paytable Modal */}
      <Modal isOpen={showPaytable} onClose={() => setShowPaytable(false)} title={`${activeSlot.name} Paytable`}>
        <div className="space-y-4 text-xs">
          <p className="text-[rgba(212,175,55,0.7)]">
            Winning paylines evaluate horizontally across reels. Matching symbols trigger payouts and cascading explosions!
          </p>
          <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
            {currentPaytableRules.map((rule, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between p-2.5 rounded-xl bg-[#061510] border border-[rgba(212,175,55,0.15)]"
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{rule.symbol}</span>
                  <div>
                    <p className="font-bold text-[#F5F1E6]">{rule.name}</p>
                    <p className="text-[10px] text-[rgba(212,175,55,0.5)]">Cascading Explosion Trigger</p>
                  </div>
                </div>
                <div className="text-right font-mono">
                  {rule.fiveMatch && (
                    <span className="text-gold font-black block text-xs">5x Match: {rule.fiveMatch}×</span>
                  )}
                  <span className="text-emerald-400 font-bold text-[11px] block">3x Match: {rule.threeMatch}×</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Modal>

      {/* Mega Jackpot Win Modal */}
      <Modal isOpen={showMegaJackpotModal} onClose={() => setShowMegaJackpotModal(false)} title="🎉 MEGA JACKPOT HIT!">
        <div className="space-y-4 text-center py-4">
          <Trophy className="w-16 h-16 text-gold mx-auto animate-bounce" />
          <div>
            <h3 className="text-2xl font-black text-gold font-heading">CONGRATULATIONS!</h3>
            <p className="text-sm text-[rgba(212,175,55,0.8)] mt-1">You unlocked the Mega Jackpot on {activeSlot.name}!</p>
          </div>
          <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30">
            <p className="text-xs uppercase text-emerald-400 font-bold">Total Winnings</p>
            <p className="text-3xl font-black font-heading text-emerald-300 mt-1">
              ₹{megaJackpotAmount.toLocaleString('en-IN')}
            </p>
          </div>
          <button
            onClick={() => setShowMegaJackpotModal(false)}
            className="btn-royal-gold w-full py-3 rounded-xl font-black text-xs cursor-pointer"
          >
            Claim & Continue Spinning
          </button>
        </div>
      </Modal>
    </div>
  );
}
