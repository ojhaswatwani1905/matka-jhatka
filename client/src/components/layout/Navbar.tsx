import { useState } from 'react';
import { Wallet, Bell, Headset, User, Gamepad2, Plus, ShieldCheck } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useWallet } from '../../store/WalletContext';
import AnimatedCounter from '../ui/AnimatedCounter';
import { ProvablyFairModal } from '../ui/ProvablyFairModal';

const desktopNavItems = [
  { path: '/', label: 'Home' },
  { path: '/games', label: 'Games' },
  { path: '/wallet', label: 'Wallet' },
  { path: '/history', label: 'History' },
  { path: '/support', label: 'Support' },
];

export default function Navbar() {
  const { balance } = useWallet();
  const location = useLocation();
  const [isFairnessOpen, setIsFairnessOpen] = useState(false);

  return (
    <header className="fixed top-0 left-0 right-0 w-full z-50 bg-[#0A0E1A]/95 backdrop-blur-xl border-b border-white/10 shadow-2xl">
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Brand Logo & Desktop Nav */}
        <div className="flex items-center gap-8">
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-gold via-amber-500 to-amber-600 flex items-center justify-center font-black text-black text-base shadow-md group-hover:scale-105 transition-transform">
              <Gamepad2 className="w-5 h-5 text-black" />
            </div>
            <div>
              <span className="text-xl font-black font-heading text-gradient-gold tracking-tight block leading-none">
                PLAYARENA
              </span>
              <span className="text-[9px] font-bold text-slate-400 block tracking-widest uppercase mt-0.5">
                PROVABLY FAIR CASINO
              </span>
            </div>
          </Link>

          {/* Desktop Navigation Links with Sliding Pill */}
          <nav className="hidden md:flex items-center gap-1 bg-slate-900/80 p-1 rounded-2xl border border-white/5 relative">
            {desktopNavItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`relative px-4 py-1.5 rounded-xl text-xs font-black transition-colors z-10 ${
                    isActive ? 'text-gold' : 'text-slate-300 hover:text-white'
                  }`}
                >
                  {isActive && (
                    <motion.div
                      layoutId="activeNavPill"
                      className="absolute inset-0 rounded-xl bg-gold/20 border border-gold/50 shadow-[0_0_15px_rgba(245,185,44,0.3)] -z-10"
                      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                    />
                  )}
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Right Actions (Wallet + Provably Fair + Support + Profile) */}
        <div className="flex items-center gap-2.5 sm:gap-3">
          {/* Provably Fair Badge */}
          <button
            onClick={() => setIsFairnessOpen(true)}
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold hover:bg-emerald-500/20 transition-all cursor-pointer"
          >
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span className="hidden lg:inline">Provably Fair</span>
          </button>

          {/* Wallet Balance Chip */}
          <Link
            to="/wallet"
            className="flex items-center bg-slate-900/90 border border-gold/40 rounded-xl px-3 py-1.5 hover:border-gold transition-all shadow-inner group"
          >
            <div className="w-6 h-6 rounded-lg bg-gold/15 flex items-center justify-center mr-2">
              <Wallet className="w-3.5 h-3.5 text-gold" />
            </div>
            <div className="flex flex-col">
              <span className="text-[9px] font-bold text-slate-400 uppercase leading-none">Balance</span>
              <AnimatedCounter
                value={balance}
                prefix="$"
                decimals={2}
                className="text-sm font-black text-gold font-heading leading-tight tabular-nums"
              />
            </div>
            <div className="ml-2.5 w-5 h-5 rounded-md bg-emerald-500/20 text-emerald-400 flex items-center justify-center group-hover:bg-emerald-500 group-hover:text-black transition-colors">
              <Plus className="w-3.5 h-3.5 stroke-[3]" />
            </div>
          </Link>

          {/* Support Link */}
          <Link
            to="/support"
            className="p-2 rounded-xl bg-slate-800/80 border border-white/5 text-slate-300 hover:text-white transition-colors hidden sm:flex"
          >
            <Headset className="w-4 h-4 text-violet-400" />
          </Link>

          {/* Notifications Link */}
          <Link
            to="/notifications"
            className="relative p-2 rounded-xl bg-slate-800/80 border border-white/5 text-slate-300 hover:text-white transition-colors"
          >
            <Bell className="w-4 h-4" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-[#0A0E1A]" />
          </Link>

          {/* Profile Avatar & Login Quick Button */}
          <Link
            to="/profile"
            className="w-8 h-8 rounded-xl bg-gradient-to-br from-gold to-amber-600 flex items-center justify-center text-black font-black text-xs shadow-lg hover:scale-105 transition-transform"
            title="User Profile"
          >
            <User className="w-4 h-4 text-black" />
          </Link>

          <Link
            to="/auth/login"
            className="hidden sm:flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-900 border border-gold/40 text-gold text-xs font-bold hover:bg-gold/15 transition-colors cursor-pointer"
          >
            <span>Sign In</span>
          </Link>
        </div>
      </div>

      <ProvablyFairModal isOpen={isFairnessOpen} onClose={() => setIsFairnessOpen(false)} />
    </header>
  );
}
