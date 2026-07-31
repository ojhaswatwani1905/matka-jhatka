import { motion } from 'framer-motion';
import { Wallet, ArrowUpRight, ArrowDownLeft, Sparkles } from 'lucide-react';
import { useWallet } from '../../store/WalletContext';
import AnimatedCounter from '../ui/AnimatedCounter';

export default function WalletCard() {
  const { balance } = useWallet();

  return (
    <div className="relative overflow-hidden rounded-2xl p-5 sm:p-6 shadow-xl border border-violet-500/20 bg-gradient-to-br from-slate-900 via-indigo-950 to-purple-950">
      {/* Background ambient lighting */}
      <div className="absolute -top-10 -right-10 w-48 h-48 rounded-full bg-violet-600/20 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-10 -left-10 w-40 h-40 rounded-full bg-amber-500/10 blur-2xl pointer-events-none" />

      <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <div className="w-7 h-7 rounded-lg bg-amber-500/20 flex items-center justify-center border border-amber-500/30">
              <Wallet className="w-4 h-4 text-amber-400" />
            </div>
            <span className="text-xs font-semibold tracking-wide uppercase text-indigo-200/70">Total Demo Balance</span>
            <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
          </div>

          <div className="flex items-baseline gap-2">
            <AnimatedCounter
              value={balance}
              prefix="₹"
              className="text-3xl sm:text-4xl font-black text-white tracking-tight font-heading"
            />
            <span className="text-[11px] text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
              Virtual Coins
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3">
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl text-sm transition-all shadow-lg shadow-emerald-500/20 cursor-pointer"
          >
            <ArrowDownLeft className="w-4 h-4 stroke-[3]" />
            Deposit
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-2.5 bg-white/10 hover:bg-white/15 text-white font-bold rounded-xl text-sm border border-white/10 transition-all cursor-pointer"
          >
            <ArrowUpRight className="w-4 h-4 text-amber-400" />
            Withdraw
          </motion.button>
        </div>
      </div>
    </div>
  );
}
