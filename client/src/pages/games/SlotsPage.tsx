import { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, HelpCircle, Sparkles, Trophy, Flame, Shield, Volume2, VolumeX, Award } from 'lucide-react';
import confetti from 'canvas-confetti';
import { useSlots } from '../../store/SlotContext';
import { useWallet } from '../../store/WalletContext';
import { useAuth } from '../../store/AuthContext';
import { useToast } from '../../components/ui/Toast';
import { useNotifications } from '../../store/NotificationContext';
import { useAuthGate } from '../../hooks/useAuthGate';
import { sounds } from '../../lib/sound';
import { redisCache } from '../../lib/redisCache';
import { AutoBetPanel } from '../../components/ui/AutoBetPanel';
import { GameChat } from '../../components/ui/GameChat';
import { triggerWinCelebration } from '../../components/ui/WinCelebrationOverlay';
import { haptics } from '../../lib/haptics';
import { evaluateAdaptiveSpinOutcome, recordSlotPayoutToProfile } from '../../lib/slotBetEngine';
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
  'mega-4x4-slots': [
    { symbol: '/slots/k.png', name: 'Gold Crown Trophy', threeMatch: 25, fiveMatch: 200, twoMatch: 3, color: '#FFD700' },
    { symbol: '/slots/lag.png', name: 'Ruby Dragon Gem', threeMatch: 18, fiveMatch: 120, twoMatch: 2.5, color: '#FF0000' },
    { symbol: '/slots/lam.png', name: 'Sapphire Crystal', threeMatch: 12, fiveMatch: 75, twoMatch: 2, color: '#0000FF' },
    { symbol: '/slots/neck.png', name: 'Diamond Relic', threeMatch: 8, fiveMatch: 40, twoMatch: 1.5, color: '#FFFFFF' },
    { symbol: '/slots/download.png', name: 'Emerald Amulet', threeMatch: 5, fiveMatch: 25, twoMatch: 1.2, color: '#00FF00' },
    { symbol: '/slots/boobs.png', name: 'Pink Star Jewel', threeMatch: 4, fiveMatch: 15, twoMatch: 1.0, color: '#FF66CC' },
    { symbol: '/slots/back.png', name: 'Silver Shield', threeMatch: 3, fiveMatch: 10, twoMatch: 1.0, color: '#999999' },
  ],
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
  '/slots/k.png': '#FFD700',
  '/slots/lag.png': '#FF0000',
  '/slots/lam.png': '#0000FF',
  '/slots/neck.png': '#FFFFFF',
  '/slots/download.png': '#00FF00',
  '/slots/back.png': '#999999',
  '/slots/boobs.png': '#FF66CC',
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
  const { user } = useAuth();
  const { addToast } = useToast();
  const { addNotification } = useNotifications();
  const { requireAuth } = useAuthGate();

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

  // Multi-column reels state
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

  // Responsive dynamic symbol size calculation based on columns count (3 vs 5 reels)
  const [symbolDimensions, setSymbolDimensions] = useState<{ width: number; height: number }>(() => {
    const is3Reel = columnsCount === 3;
    if (typeof window !== 'undefined') {
      const w = window.innerWidth;
      if (w <= 380) return { width: is3Reel ? 80 : 54, height: is3Reel ? 68 : 54 };
      if (w <= 480) return { width: is3Reel ? 96 : 64, height: is3Reel ? 76 : 62 };
      if (w <= 768) return { width: is3Reel ? 120 : 78, height: is3Reel ? 92 : 74 };
      return { width: is3Reel ? 148 : 96, height: is3Reel ? 104 : 84 };
    }
    return { width: is3Reel ? 130 : 90, height: is3Reel ? 96 : 80 };
  });

  const [showPaytable, setShowPaytable] = useState(false);
  const [showMegaJackpotModal, setShowMegaJackpotModal] = useState(false);
  const [megaJackpotAmount, setMegaJackpotAmount] = useState(0);

  // Provably Fair State
  const [commitHash, setCommitHash] = useState<string>('');

  // Update symbol dimensions on resize or variant change
  useEffect(() => {
    const calcDimensions = () => {
      const is3Reel = activeSlot.reels === 3;
      const w = window.innerWidth;
      if (w <= 380) {
        setSymbolDimensions({ width: is3Reel ? 84 : 54, height: is3Reel ? 68 : 54 });
      } else if (w <= 480) {
        setSymbolDimensions({ width: is3Reel ? 100 : 64, height: is3Reel ? 78 : 62 });
      } else if (w <= 768) {
        setSymbolDimensions({ width: is3Reel ? 124 : 80, height: is3Reel ? 94 : 76 });
      } else {
        setSymbolDimensions({ width: is3Reel ? 152 : 98, height: is3Reel ? 106 : 86 });
      }
    };
    calcDimensions();
    window.addEventListener('resize', calcDimensions);
    return () => window.removeEventListener('resize', calcDimensions);
  }, [activeSlot.reels]);

  // Prepare seed hash on mount & activeSlot change
  const initSeed = useCallback(async () => {
    const s = generateSlotSeed();
    const h = await hashSlotSeed(s);
    setCommitHash(h);
  }, []);

  useEffect(() => {
    initSeed();
    setReels(Array.from({ length: activeSlot.reels }, () => createReelStrip(activeSlot.symbols)));
    setStopIndex(activeSlot.reels - 1);
    setWinningCells([]);
    setActiveWinLines([]);
    setDestroyingCells([]);
    setWinMsg('');
    setLastWin(null);
  }, [activeSlot.id, activeSlot.reels, activeSlot.symbols, createReelStrip, initSeed]);

  const currentPaytableRules = VARIANT_PAYTABLES[activeSlot.id] || VARIANT_PAYTABLES['mega-4x4-slots'] || VARIANT_PAYTABLES['royal-gold-777'];

  // Evaluate winning lines and cells across the visible board
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

        // Credit combo payout to wallet & adaptive profile
        addBalance(comboBoost, `Slots — ${activeSlot.name} Cascade ×${currentCombo}`, 'win');
        recordSlotPayoutToProfile(user?.id || 'usr_guest', comboBoost);
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
  }, [applyCascade, columnsCount, activeSlot.symbols, activeSlot.name, evaluateWins, soundMuted, addBalance, user?.id]);

  // Main Spin Action with Adaptive Bet Logic
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

      const symbolPool = activeSlot.symbols;

      // 2. Evaluate Outcome using Adaptive Bet Engine
      const { decision } = evaluateAdaptiveSpinOutcome(
        user?.id || 'usr_guest',
        betAmount,
        symbolPool,
        VISIBLE_COUNT,
        activeSlot.targetRtp || 94
      );

      let newReels: string[][] = [];

      if (decision.isWin) {
        const winSym = decision.forcedWinSymbol || symbolPool[0];
        const winRow = decision.forcedWinRow >= 0 ? decision.forcedWinRow : 1;
        newReels = Array.from({ length: columnsCount }, () =>
          createReelStrip(symbolPool, winSym, winRow)
        );
      } else if (decision.isNearMiss && columnsCount >= 4) {
        // Exciting Near Miss: Columns 0 to 3 match, last column differs
        const nearSym = decision.nearMissSymbol || symbolPool[0];
        const diffSym = symbolPool.find(s => s !== nearSym) || symbolPool[1];
        const rowPos = decision.nearMissRow >= 0 ? decision.nearMissRow : 1;

        newReels = Array.from({ length: columnsCount }, (_, colIdx) => {
          if (colIdx < columnsCount - 1) {
            return createReelStrip(symbolPool, nearSym, rowPos);
          }
          return createReelStrip(symbolPool, diffSym, rowPos);
        });
      } else {
        // Standard clean random loss
        newReels = Array.from({ length: columnsCount }, () => createReelStrip(symbolPool));
      }

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
                recordSlotPayoutToProfile(user?.id || 'usr_guest', totalPayout);
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
    columnsCount,
    createReelStrip,
    initSeed,
    evaluateWins,
    recordWagerAndPayout,
    addBalance,
    addNotification,
    runCascadeLoop,
    user?.id,
  ]);

  return (
    <div className="min-h-screen py-2 px-2 sm:px-4 w-full max-w-7xl mx-auto space-y-4 relative">
      <SEOHead
        title="Royal 777 Jackpot Slots — Multi-Line Vegas Video Slots"
        description="Spin 7 exclusive 3-reel & 5-reel Vegas slot machines including Mega 4x4 Slots, Royal Gold 777, Dragon Fortune, and Golden Pharaoh with 777x jackpot multipliers and cascading avalanche wins."
        jsonLd={slotsBreadcrumbLd}
      />

      {/* Ambient Spotlight Background */}
      <div
        className="fixed inset-0 pointer-events-none z-0"
        style={{
          background: 'radial-gradient(circle at 50% 15%, rgba(212,175,55,0.18), rgba(2,9,6,0.99) 70%)',
        }}
      />

      {/* Main Content */}
      <div className="relative z-10 space-y-4">
        
        {/* Top Slot Theme Selector Carousel */}
        <div className="w-full flex items-center justify-start sm:justify-center gap-2 overflow-x-auto px-1 py-1.5 no-scrollbar scroll-smooth">
          {slots.filter(s => s.enabled).map(slot => (
            <button
              key={slot.id}
              onClick={() => setActiveSlotId(slot.id)}
              className={`px-3.5 py-2 rounded-xl text-xs font-black whitespace-nowrap transition-all flex items-center gap-2 border shadow-lg cursor-pointer shrink-0 ${
                activeSlot.id === slot.id
                  ? 'bg-gradient-to-r from-[#FFD700] via-[#F5D576] to-[#8B6914] text-[#061510] border-[#FFF8DC] shadow-[0_0_20px_rgba(212,175,55,0.6)] scale-[1.03]'
                  : 'bg-[#040E0A]/90 text-[rgba(212,175,55,0.75)] border-[rgba(212,175,55,0.2)] hover:border-gold hover:text-gold hover:bg-[#071710]'
              }`}
            >
              <span className="text-base drop-shadow">{slot.emoji}</span>
              <span className="tracking-wide uppercase font-heading">{slot.name}</span>
              <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded-full font-bold ${
                activeSlot.id === slot.id ? 'bg-black/30 text-[#061510]' : 'bg-gold/10 text-gold border border-gold/20'
              }`}>
                {slot.reels}R × 4
              </span>
            </button>
          ))}
        </div>

        {/* Master Center-Stage Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* Casino Cabinet & Slot Engine (lg:col-span-8) */}
          <div className="lg:col-span-8 w-full space-y-4">
            
            {/* Vegas Gold Arcade Cabinet Chassis */}
            <div className="rounded-[28px] p-1.5 bg-gradient-to-b from-[#FFD700] via-[#8B6914] via-[#2A1E06] to-[#FFD700] shadow-[0_15px_45px_rgba(0,0,0,0.9),0_0_40px_rgba(212,175,55,0.35)] border border-[#FFD700]/80 relative overflow-hidden">
              
              {/* Illuminated Arcade Canopy Top Header */}
              <div className="bg-gradient-to-r from-[#1A0E03] via-[#3A2207] via-[#1A0E03] to-[#3A2207] px-4 py-2.5 border-b border-[#FFD700]/30 flex items-center justify-between relative">
                <div className="flex items-center gap-2">
                  <div className="flex gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse shadow-[0_0_8px_#FFD700]" />
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping shadow-[0_0_8px_#2ECC71]" />
                    <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_8px_#00E5FF]" />
                  </div>
                  <span className="text-[10px] font-black tracking-widest text-[#FFD700] uppercase font-mono pl-1">
                    PLAYARENA LUXURY CASINO
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-[11px] font-black font-mono text-gold flex items-center gap-1 bg-black/40 px-2 py-0.5 rounded-full border border-gold/20">
                    <Award className="w-3.5 h-3.5 text-gold" />
                    RTP {activeSlot.targetRtp}%
                  </span>
                </div>
              </div>

              {/* Cabinet Inner Body */}
              <div className="p-3 sm:p-5 space-y-3 sm:space-y-4 bg-gradient-to-b from-[#0B251B] via-[#020B07] to-[#0B251B] relative">
                
                {/* Title & Info Strip */}
                <div className="flex flex-wrap items-center justify-between gap-2.5 border-b border-[rgba(212,175,55,0.2)] pb-2.5">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#FFD700] via-[#F5D576] to-[#8B6914] p-0.5 shadow-[0_0_15px_rgba(212,175,55,0.5)] flex items-center justify-center shrink-0">
                      <span className="text-xl drop-shadow">{activeSlot.emoji}</span>
                    </div>
                    <div>
                      <h1 className="text-base sm:text-lg font-black text-[#E8C97A] font-heading tracking-wide flex items-center gap-1.5 leading-none">
                        {activeSlot.name}
                        <Sparkles className="w-3.5 h-3.5 text-gold animate-bounce" />
                      </h1>
                      <p className="text-[10px] text-[rgba(212,175,55,0.65)] font-mono mt-1">
                        {activeSlot.reels} Reels × 4 Rows • Multi-Line Avalanche
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setSoundMuted(!soundMuted)}
                      className="p-1.5 rounded-lg bg-[rgba(212,175,55,0.1)] border border-[rgba(212,175,55,0.25)] text-gold hover:bg-[rgba(212,175,55,0.2)] transition-all cursor-pointer"
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
                    <span className="text-gold truncate max-w-[180px] sm:max-w-[280px]">{commitHash}</span>
                  </div>
                )}

                {/* Win / Cascade Animated Banner */}
                <div className="h-7 flex items-center justify-center">
                  <AnimatePresence>
                    {winMsg && (
                      <motion.div
                        initial={{ scale: 0.7, opacity: 0 }}
                        animate={{ scale: [1, 1.08, 1], opacity: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        transition={{ repeat: Infinity, duration: 0.8 }}
                        className="text-center font-black font-heading tracking-wide text-xs sm:text-sm text-gold drop-shadow-[0_0_12px_rgba(255,215,0,0.85)]"
                      >
                        {winMsg}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* ========================================================= */}
                {/* 🎰 REEL STAGE WINDOW WITH SIDE PAYLINE INDICATORS */}
                {/* ========================================================= */}
                <div className="relative flex items-center justify-center bg-[#030906] p-2 sm:p-3 rounded-2xl border-2 border-[#8B6914] shadow-[inset_0_0_40px_rgba(0,0,0,0.98),0_0_25px_rgba(212,175,55,0.25)] overflow-hidden mx-auto">
                  
                  {/* Left Payline Number Indicators */}
                  <div
                    className="flex flex-col justify-around pr-1.5 sm:pr-2 select-none"
                    style={{ height: symbolDimensions.height * VISIBLE_COUNT }}
                  >
                    {[0, 1, 2, 3].map(rowIdx => {
                      const isRowWinning = activeWinLines.includes(rowIdx);
                      return (
                        <div
                          key={rowIdx}
                          className={`w-4 h-4 sm:w-5 sm:h-5 rounded-full flex items-center justify-center text-[9px] sm:text-[10px] font-mono font-black transition-all ${
                            isRowWinning
                              ? 'bg-gold text-black shadow-[0_0_10px_#FFD700] scale-110'
                              : 'bg-black/60 text-gold/40 border border-gold/20'
                          }`}
                        >
                          {rowIdx + 1}
                        </div>
                      );
                    })}
                  </div>

                  {/* Glowing Laser Win Lines across winning rows */}
                  {activeWinLines.map(rowPos => (
                    <motion.div
                      key={rowPos}
                      initial={{ scaleX: 0 }}
                      animate={{ scaleX: 1 }}
                      style={{
                        position: 'absolute',
                        top: 8 + rowPos * symbolDimensions.height + symbolDimensions.height / 2 - 3,
                        left: 20,
                        width: 'calc(100% - 40px)',
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
                            width: symbolDimensions.width,
                            height: symbolDimensions.height * VISIBLE_COUNT,
                            overflow: 'hidden',
                            background: 'linear-gradient(180deg, #040E0A 0%, #071912 50%, #040E0A 100%)',
                            border: '1px solid rgba(212,175,55,0.25)',
                            borderRadius: '12px',
                            position: 'relative',
                            boxShadow: 'inset 0 12px 20px rgba(0,0,0,0.85), inset 0 -12px 20px rgba(0,0,0,0.85), 0 0 10px rgba(0,0,0,0.5)',
                          }}
                        >
                          <motion.div
                            animate={{
                              y: isStopped ? -8 * symbolDimensions.height : -(symbolDimensions.height * 22),
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
                              const symColor = activeSlot.symbolColors?.[sym] || DEFAULT_SYMBOL_COLORS[sym] || '#FFD700';
                              const isImageSymbol = sym.startsWith('/') || sym.startsWith('http');

                              return (
                                <div
                                  key={i}
                                  style={{
                                    width: symbolDimensions.width,
                                    height: symbolDimensions.height,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    position: 'relative',
                                    boxSizing: 'border-box',
                                    borderBottom: '1px solid rgba(212,175,55,0.08)',
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
                                      className="flex items-center justify-center select-none w-full h-full p-1"
                                      style={{
                                        fontSize: symbolDimensions.width > 110 ? '2.8rem' : symbolDimensions.width > 80 ? '2.1rem' : '1.5rem',
                                      }}
                                    >
                                      {isImageSymbol ? (
                                        <img
                                          src={sym}
                                          alt="slot symbol"
                                          className="w-[85%] h-[85%] object-contain select-none pointer-events-none"
                                        />
                                      ) : (
                                        sym
                                      )}
                                    </motion.div>
                                  )}

                                  {/* Bubble Particle Blast Explosion on winning cell */}
                                  {isDestroying && (
                                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                      {Array.from({ length: PARTICLE_COUNT }).map((_, pi) => {
                                        const angle = (pi / PARTICLE_COUNT) * Math.PI * 2;
                                        const dist = (symbolDimensions.width * 0.35) + Math.random() * (symbolDimensions.width * 0.45);
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
                                              width: symbolDimensions.width > 80 ? 10 : 7,
                                              height: symbolDimensions.width > 80 ? 10 : 7,
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

                  {/* Right Payline Number Indicators */}
                  <div
                    className="flex flex-col justify-around pl-1.5 sm:pr-2 select-none"
                    style={{ height: symbolDimensions.height * VISIBLE_COUNT }}
                  >
                    {[0, 1, 2, 3].map(rowIdx => {
                      const isRowWinning = activeWinLines.includes(rowIdx);
                      return (
                        <div
                          key={rowIdx}
                          className={`w-4 h-4 sm:w-5 sm:h-5 rounded-full flex items-center justify-center text-[9px] sm:text-[10px] font-mono font-black transition-all ${
                            isRowWinning
                              ? 'bg-gold text-black shadow-[0_0_10px_#FFD700] scale-110'
                              : 'bg-black/60 text-gold/40 border border-gold/20'
                          }`}
                        >
                          {rowIdx + 1}
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
                    className="text-center py-2 px-3 rounded-xl bg-gradient-to-r from-emerald-600/40 via-emerald-500/50 to-emerald-600/40 border border-emerald-400 text-emerald-200 font-black text-sm sm:text-base shadow-[0_0_25px_rgba(46,204,113,0.4)] flex items-center justify-center gap-2 uppercase tracking-wide"
                  >
                    <Trophy className="w-4 h-4 text-gold animate-bounce" />
                    TOTAL PAYOUT: +₹{lastWin.toLocaleString('en-IN')}
                  </motion.div>
                )}

                {/* Chip Selector & Controls */}
                <div className="space-y-2.5 pt-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-[rgba(212,175,55,0.8)] font-black uppercase tracking-wider flex items-center gap-1">
                      <Sparkles className="w-3.5 h-3.5 text-gold" />
                      Select Bet Chip
                    </span>
                    <span className="text-[11px] font-mono text-gold font-bold bg-[#030E09] px-3 py-1 rounded-full border border-[rgba(212,175,55,0.25)]">
                      Wallet: ₹{balance.toLocaleString('en-IN')}
                    </span>
                  </div>

                  <div className="grid grid-cols-5 gap-1.5 sm:gap-2">
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

          {/* Right Column: Live Chat & Assistant (lg:col-span-4) */}
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
                  {rule.symbol.startsWith('/') || rule.symbol.startsWith('http') ? (
                    <img src={rule.symbol} alt={rule.name} className="w-8 h-8 object-contain" />
                  ) : (
                    <span className="text-2xl">{rule.symbol}</span>
                  )}
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
