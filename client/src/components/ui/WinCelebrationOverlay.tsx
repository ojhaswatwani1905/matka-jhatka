import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import { Sparkles, Trophy, Flame } from 'lucide-react';
import { formatCurrency } from '../../lib/utils';
import { haptics } from '../../lib/haptics';

export interface WinCelebrationEvent {
  winAmount: number;
  multiplier: number;
  gameName: string;
}

/**
 * Global helper function to trigger a win celebration from any game component
 */
export function triggerWinCelebration(data: WinCelebrationEvent) {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('win:celebration', { detail: data }));
  }
}

export function WinCelebrationOverlay() {
  const [activeWin, setActiveWin] = useState<WinCelebrationEvent | null>(null);

  const handleWinEvent = useCallback((evt: Event) => {
    const customEvt = evt as CustomEvent<WinCelebrationEvent>;
    const data = customEvt.detail;
    if (!data || data.winAmount <= 0) return;

    setActiveWin(data);

    const mult = data.multiplier;

    if (mult >= 20) {
      // Big Win / Jackpot Tier
      haptics.jackpot();
      confetti({
        particleCount: 220,
        spread: 120,
        origin: { y: 0.4 },
        colors: ['#FFD700', '#F5D576', '#2ECC71', '#FFFFFF', '#E74C3C'],
      });
      const timer = setTimeout(() => setActiveWin(null), 4000);
      return () => clearTimeout(timer);
    } else if (mult >= 5) {
      // Medium Win Tier
      haptics.winMedium();
      confetti({
        particleCount: 90,
        spread: 80,
        origin: { y: 0.5 },
        colors: ['#FFD700', '#2ECC71', '#FFFFFF'],
      });
      const timer = setTimeout(() => setActiveWin(null), 2500);
      return () => clearTimeout(timer);
    } else {
      // Small Win Tier
      haptics.winSmall();
      const timer = setTimeout(() => setActiveWin(null), 1800);
      return () => clearTimeout(timer);
    }
  }, []);

  useEffect(() => {
    window.addEventListener('win:celebration', handleWinEvent);
    return () => window.removeEventListener('win:celebration', handleWinEvent);
  }, [handleWinEvent]);

  if (!activeWin) return null;

  const isBigWin = activeWin.multiplier >= 20;
  const isMediumWin = activeWin.multiplier >= 5 && activeWin.multiplier < 20;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 pointer-events-none z-[100] flex items-center justify-center p-4">
        {/* Screen Edge Gold Flash on Big Wins */}
        {isBigWin && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 0.8, 0.3, 0.7, 0] }}
            transition={{ duration: 3.5, times: [0, 0.1, 0.3, 0.5, 1] }}
            className="absolute inset-0 border-[16px] border-[#FFD700]/70 shadow-[inset_0_0_80px_rgba(255,215,0,0.6)]"
          />
        )}

        {/* Floating Coin Shower Particles on Big Wins */}
        {isBigWin && (
          <div className="absolute inset-0 overflow-hidden pointer-events-none select-none">
            {Array.from({ length: 24 }).map((_, i) => (
              <motion.div
                key={i}
                initial={{ y: -50, x: `${(i / 24) * 100}%`, opacity: 0, rotate: 0 }}
                animate={{
                  y: '110vh',
                  opacity: [0, 1, 1, 0],
                  rotate: i % 2 === 0 ? 360 : -360,
                }}
                transition={{
                  duration: 2.2 + (i % 5) * 0.4,
                  delay: (i % 8) * 0.1,
                  repeat: Infinity,
                  ease: 'linear',
                }}
                className="absolute text-2xl"
              >
                🪙
              </motion.div>
            ))}
          </div>
        )}

        {/* Celebration Banner Card */}
        <motion.div
          initial={{ scale: 0.4, opacity: 0, y: 40 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.6, opacity: 0, y: -40 }}
          transition={{ type: 'spring', stiffness: 350, damping: 20 }}
          className={`royal-panel rounded-3xl p-6 sm:p-8 text-center max-w-sm w-full border-2 shadow-[0_0_50px_rgba(212,175,55,0.4)] backdrop-blur-xl ${
            isBigWin
              ? 'border-[#FFD700] bg-gradient-to-b from-[#2A1E08] via-[#0B2A1E] to-[#1F1706]'
              : isMediumWin
              ? 'border-emerald-500/60 bg-gradient-to-b from-[#0B2A1E] to-[#040E0A]'
              : 'border-amber-500/40 bg-[#0B2A1E]/95'
          }`}
        >
          {isBigWin ? (
            <div className="w-20 h-20 mx-auto rounded-3xl bg-gradient-to-br from-[#FFD700] via-[#F5D576] to-[#8B6914] p-0.5 shadow-[0_0_30px_#FFD700] animate-bounce mb-3 flex items-center justify-center">
              <Trophy className="w-10 h-10 text-[#061510]" />
            </div>
          ) : isMediumWin ? (
            <div className="w-14 h-14 mx-auto rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 mb-3 shadow-[0_0_20px_rgba(46,204,113,0.3)]">
              <Flame className="w-8 h-8" />
            </div>
          ) : (
            <div className="w-12 h-12 mx-auto rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 mb-2">
              <Sparkles className="w-6 h-6" />
            </div>
          )}

          <span className="text-[10px] font-black uppercase tracking-widest text-gold opacity-90 block mb-1">
            {activeWin.gameName}
          </span>

          <h2 className="text-2xl sm:text-3xl font-black font-heading tracking-tight text-gold drop-shadow-md">
            {isBigWin ? '🎰 MEGA JACKPOT!' : isMediumWin ? '🔥 BIG WIN!' : '✨ WINNER!'}
          </h2>

          <div className="my-3 py-2 px-4 rounded-2xl bg-black/40 border border-[rgba(212,175,55,0.2)]">
            <p className="text-3xl sm:text-4xl font-black font-heading text-[#2ECC71] tabular-nums">
              +₹{formatCurrency(activeWin.winAmount)}
            </p>
            <p className="text-xs font-mono font-bold text-gold mt-0.5">
              {activeWin.multiplier}× Multiplier
            </p>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
