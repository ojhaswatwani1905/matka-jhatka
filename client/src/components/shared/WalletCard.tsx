import { motion } from 'framer-motion';
import { ArrowUpRight, ArrowDownLeft, Crown } from 'lucide-react';
import { useWallet } from '../../store/WalletContext';
import AnimatedCounter from '../ui/AnimatedCounter';

export default function WalletCard() {
  const { balance } = useWallet();

  return (
    <div className="relative overflow-hidden rounded-2xl p-5 sm:p-6 shadow-xl border border-[rgba(212,175,55,0.35)] bg-[#0d2419]"
      style={{ boxShadow: '0 8px 40px rgba(0,0,0,0.5), inset 0 1px 0 rgba(212,175,55,0.1)' }}
    >
      {/* Ornate top accent */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-[#D4AF37] to-transparent" />

      {/* Ambient lighting */}
      <div className="absolute -top-10 -right-10 w-48 h-48 rounded-full bg-[rgba(212,175,55,0.08)] blur-3xl pointer-events-none" />
      <div className="absolute -bottom-10 -left-10 w-40 h-40 rounded-full bg-[rgba(46,204,113,0.05)] blur-2xl pointer-events-none" />

      {/* Corner flourish */}
      <div className="absolute bottom-4 right-4 text-[rgba(212,175,55,0.1)] text-5xl font-black font-heading select-none pointer-events-none">♛</div>

      <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <div className="w-7 h-7 rounded-lg bg-[rgba(212,175,55,0.15)] flex items-center justify-center border border-[rgba(212,175,55,0.3)]">
              <Crown className="w-4 h-4 text-gold" />
            </div>
            <span className="text-xs font-bold tracking-wide uppercase text-[rgba(212,175,55,0.65)]">Royal Balance</span>
            <span className="gold-badge text-[9px]">VERIFIED</span>
          </div>

          <div className="flex items-baseline gap-2">
            <span className="text-sm font-bold text-[rgba(212,175,55,0.6)]">₹</span>
            <AnimatedCounter
              value={balance}
              className="text-3xl sm:text-4xl font-black text-gold tracking-tight font-heading tabular-nums"
            />
          </div>
          <div className="gold-divider mt-2 mb-1" />
          <span className="text-[10px] text-[rgba(212,175,55,0.45)]">Available for live betting & withdrawal</span>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3">
          <motion.button
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.97 }}
            className="btn-royal-gold flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-black cursor-pointer"
          >
            <ArrowDownLeft className="w-4 h-4 stroke-[2.5]" />
            Deposit
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.97 }}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-2.5 bg-[rgba(212,175,55,0.08)] hover:bg-[rgba(212,175,55,0.15)] text-[#E8C97A] font-black rounded-xl text-sm border border-[rgba(212,175,55,0.25)] transition-all cursor-pointer"
          >
            <ArrowUpRight className="w-4 h-4" />
            Withdraw
          </motion.button>
        </div>
      </div>
    </div>
  );
}
