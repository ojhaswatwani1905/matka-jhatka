import { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowUpRight, ArrowDownLeft, Crown, Sparkles, Shield } from 'lucide-react';
import { useWallet } from '../../store/WalletContext';
import AnimatedCounter from '../ui/AnimatedCounter';

interface WalletCardProps {
  onDeposit?: () => void;
  onWithdraw?: () => void;
}

export default function WalletCard({ onDeposit, onWithdraw }: WalletCardProps) {
  const { balance, bonusBalance, bonusWagerRequired, bonusWagerProgress } = useWallet();
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [glare, setGlare] = useState({ x: 50, y: 50 });

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width;
    const py = (e.clientY - rect.top) / rect.height;
    setTilt({ x: (py - 0.5) * 10, y: (px - 0.5) * -12 });
    setGlare({ x: px * 100, y: py * 100 });
  };

  const handleMouseLeave = () => {
    setTilt({ x: 0, y: 0 });
    setGlare({ x: 50, y: 50 });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -14, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className="relative overflow-hidden rounded-3xl select-none cursor-default"
      style={{
        transform: `perspective(900px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)`,
        transition: tilt.x === 0 ? 'transform 0.5s ease' : 'transform 0.1s ease',
        border: '1.5px solid rgba(212,175,55,0.45)',
        boxShadow: '0 0 60px rgba(212,175,55,0.15), 0 20px 60px rgba(0,0,0,0.6)',
      }}
    >
      {/* ── Background image ─────────────────────────────── */}
      <div className="absolute inset-0">
        <img
          src="/wallet-card-bg.png"
          alt=""
          className="w-full h-full object-cover object-center"
          style={{ filter: 'saturate(1.1) brightness(0.55)' }}
        />
        <div className="absolute inset-0 bg-gradient-to-br from-[#040c05]/65 via-[#0B2318]/50 to-[#000]/65" />
      </div>

      {/* ── Mouse glare (pure CSS, no MotionValue) ────────── */}
      <div
        className="absolute inset-0 pointer-events-none rounded-3xl"
        style={{
          background: `radial-gradient(ellipse 55% 45% at ${glare.x}% ${glare.y}%, rgba(255,229,127,0.13) 0%, transparent 65%)`,
          transition: 'background 0.08s ease',
        }}
      />

      {/* ── Shimmer sweep ─────────────────────────────────── */}
      <motion.div
        className="absolute inset-0 pointer-events-none"
        style={{ background: 'linear-gradient(105deg, transparent 28%, rgba(255,220,80,0.07) 50%, transparent 72%)' }}
        animate={{ x: ['-110%', '210%'] }}
        transition={{ duration: 4.5, repeat: Infinity, repeatDelay: 3.5, ease: 'easeInOut' }}
      />

      {/* ── Top gold hairline ────────────────────────────── */}
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#FFE57F] to-transparent" />

      {/* ── Content ──────────────────────────────────────── */}
      <div className="relative z-10 p-5 sm:p-6">

        {/* Row 1 — label + verified */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2.5">
            <motion.div
              className="w-8 h-8 rounded-xl flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg,#F5D576,#B8860B)' }}
              animate={{ boxShadow: ['0 0 10px rgba(212,175,55,0.4)', '0 0 24px rgba(212,175,55,0.85)', '0 0 10px rgba(212,175,55,0.4)'] }}
              transition={{ duration: 2.5, repeat: Infinity }}
            >
              <Crown className="w-4 h-4 text-[#0B2318]" />
            </motion.div>
            <div>
              <p className="text-[9px] font-black text-[rgba(212,175,55,0.55)] uppercase tracking-[0.25em]">Royal Balance</p>
            </div>
          </div>

          <motion.div
            className="flex items-center gap-1.5 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest"
            style={{ background: 'rgba(46,204,113,0.1)', border: '1px solid rgba(46,204,113,0.35)', color: '#2ECC71' }}
            animate={{ opacity: [0.65, 1, 0.65] }}
            transition={{ duration: 2.2, repeat: Infinity }}
          >
            <Shield className="w-2.5 h-2.5" /> Verified
          </motion.div>
        </div>

        {/* Row 2 — Big balance number */}
        <div className="mb-1">
          <div className="flex items-baseline gap-2">
            <span className="text-xl font-black text-[rgba(212,175,55,0.5)]">₹</span>
            <span
              className="text-5xl sm:text-6xl font-black font-heading tabular-nums leading-none"
              style={{ color: '#FFE57F', textShadow: '0 0 28px rgba(212,175,55,0.55), 0 2px 0 rgba(0,0,0,0.4)' }}
            >
              <AnimatedCounter value={balance} decimals={2} />
            </span>
          </div>
          <div className="flex items-center gap-2 mt-2">
            <motion.div
              className="w-1.5 h-1.5 rounded-full bg-[#2ECC71]"
              animate={{ opacity: [1, 0.25, 1] }}
              transition={{ duration: 1.3, repeat: Infinity }}
            />
            <p className="text-[10px] font-bold text-[rgba(212,175,55,0.45)] uppercase tracking-wider">
              Withdrawable Funds
            </p>
          </div>
        </div>

        {/* Bonus Wallet Pill & Wagering Requirement Progress */}
        {bonusBalance > 0 && (
          <div className="mt-4 p-3 rounded-2xl bg-[rgba(212,175,55,0.06)] border border-[rgba(212,175,55,0.2)] space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black text-amber-300 uppercase tracking-wider flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-amber-400" /> Bonus Balance
              </span>
              <span className="text-xs font-black text-amber-300 font-mono">₹{bonusBalance.toFixed(2)}</span>
            </div>

            {bonusWagerRequired > 0 && (
              <div className="space-y-1">
                <div className="flex justify-between text-[9px] text-[rgba(212,175,55,0.5)] font-bold">
                  <span>5x Wagering Unlock Progress</span>
                  <span>₹{bonusWagerProgress.toFixed(0)} / ₹{bonusWagerRequired.toFixed(0)}</span>
                </div>
                <div className="h-2 bg-[#061510] rounded-full overflow-hidden border border-[rgba(212,175,55,0.15)]">
                  <div
                    className="h-full bg-gradient-to-r from-[#D4AF37] to-[#2ECC71] rounded-full transition-all"
                    style={{ width: `${Math.min(100, (bonusWagerProgress / bonusWagerRequired) * 100)}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Divider */}
        <div className="h-px bg-gradient-to-r from-transparent via-[rgba(212,175,55,0.22)] to-transparent my-4" />

        {/* Row 3 — Buttons */}
        <div className="flex gap-3">
          <motion.button
            whileHover={{ scale: 1.03, y: -1 }}
            whileTap={{ scale: 0.96 }}
            onClick={onDeposit}
            className="relative flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl font-black text-sm overflow-hidden cursor-pointer"
            style={{
              background: 'linear-gradient(135deg,#F5D576 0%,#D4AF37 50%,#B8860B 100%)',
              boxShadow: '0 4px 18px rgba(212,175,55,0.4), inset 0 1px 0 rgba(255,255,255,0.25)',
              color: '#0B2318',
            }}
          >
            <motion.div
              className="absolute inset-0"
              style={{ background: 'linear-gradient(60deg,transparent 28%,rgba(255,255,255,0.28) 50%,transparent 72%)' }}
              animate={{ x: ['-110%', '210%'] }}
              transition={{ duration: 2.5, repeat: Infinity, repeatDelay: 2 }}
            />
            <ArrowDownLeft className="w-4 h-4 relative z-10 stroke-[2.5]" />
            <span className="relative z-10">Deposit</span>
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.03, y: -1 }}
            whileTap={{ scale: 0.96 }}
            onClick={onWithdraw}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl font-black text-sm cursor-pointer"
            style={{
              background: 'rgba(212,175,55,0.07)',
              border: '1.5px solid rgba(212,175,55,0.32)',
              color: '#E8C97A',
            }}
          >
            <ArrowUpRight className="w-4 h-4" />
            Withdraw
          </motion.button>
        </div>

        {/* Watermark */}
        <motion.div
          className="absolute bottom-4 right-5 flex items-center gap-1 text-[9px] font-black"
          style={{ color: 'rgba(212,175,55,0.25)' }}
          animate={{ opacity: [0.25, 0.6, 0.25] }}
          transition={{ duration: 3.5, repeat: Infinity }}
        >
          <Sparkles className="w-3 h-3" /> PLAYARENA
        </motion.div>
      </div>

      {/* Bottom gold hairline */}
      <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[rgba(212,175,55,0.35)] to-transparent" />
    </motion.div>
  );
}
