import { useState } from 'react';
import { Wallet, Bell, Crown, Plus, ShieldCheck, LogIn, UserPlus } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useWallet } from '../../store/WalletContext';
import { useAuth } from '../../store/AuthContext';
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
  const { isAuthenticated } = useAuth();
  const location = useLocation();
  const [isFairnessOpen, setIsFairnessOpen] = useState(false);

  return (
    <header className="fixed top-0 left-0 right-0 w-full z-50 bg-[#0d2419]/97 backdrop-blur-xl border-b border-[rgba(212,175,55,0.22)] shadow-[0_4px_30px_rgba(0,0,0,0.5)]">
      <div className="w-full max-w-[1400px] mx-auto pl-4 lg:pl-20 pr-4 sm:pr-6 h-16 flex items-center justify-between gap-4">

        {/* Brand Logo */}
        <Link to="/" className="flex items-center gap-2.5 group shrink-0">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#F5D576] via-[#D4AF37] to-[#B8860B] flex items-center justify-center shadow-[0_0_15px_rgba(212,175,55,0.4)] group-hover:shadow-[0_0_22px_rgba(212,175,55,0.6)] transition-all">
            <Crown className="w-5 h-5 text-[#0B2318]" strokeWidth={2.5} />
          </div>
          <div>
            <span className="text-xl font-black font-heading text-gradient-gold tracking-tight block leading-none" style={{
              textShadow: '0 1px 0 #B8860B, 0 2px 4px rgba(0,0,0,0.4)'
            }}>
              PLAYARENA
            </span>
            <span className="text-[9px] font-bold text-[rgba(212,175,55,0.6)] block tracking-widest uppercase mt-0.5">
              ROYAL CASINO
            </span>
          </div>
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-0.5 bg-[#0B2318]/80 p-1 rounded-2xl border border-[rgba(212,175,55,0.15)] relative">
          {desktopNavItems.map((navItem) => {
            const isActive = location.pathname === navItem.path || (navItem.path !== '/' && location.pathname.startsWith(navItem.path));
            return (
              <Link
                key={navItem.path}
                to={navItem.path}
                className={`relative px-4 py-1.5 rounded-xl text-xs font-black transition-colors z-10 ${
                  isActive ? 'text-[#0B2318]' : 'text-[rgba(212,175,55,0.7)] hover:text-[#E8C97A]'
                }`}
              >
                {isActive && (
                  <motion.div
                    layoutId="activeNavPill"
                    className="absolute inset-0 rounded-xl -z-10"
                    style={{ background: 'linear-gradient(180deg, #F5D576 0%, #D4AF37 100%)' }}
                    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                  />
                )}
                {navItem.label}
              </Link>
            );
          })}
        </nav>

        {/* Right Actions */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Provably Fair Badge */}
          <button
            onClick={() => setIsFairnessOpen(true)}
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl gold-badge hover:bg-[rgba(212,175,55,0.2)] transition-all cursor-pointer"
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span className="hidden lg:inline text-[10px]">Provably Fair</span>
          </button>

          {/* Wallet Balance Chip — only when authenticated */}
          {isAuthenticated && (
            <Link
              to="/wallet"
              className="flex items-center bg-[#0d2419] border border-[rgba(212,175,55,0.35)] rounded-xl px-3 py-1.5 hover:border-[rgba(212,175,55,0.65)] transition-all shadow-inner group"
            >
              <div className="w-6 h-6 rounded-lg bg-[rgba(212,175,55,0.15)] flex items-center justify-center mr-2">
                <Wallet className="w-3.5 h-3.5 text-gold" />
              </div>
              <div className="flex flex-col">
                <span className="text-[9px] font-bold text-[rgba(212,175,55,0.6)] uppercase leading-none">Balance</span>
                <AnimatedCounter
                  value={balance}
                  prefix="₹"
                  decimals={2}
                  className="text-sm font-black text-gold font-heading leading-tight tabular-nums"
                />
              </div>
              <div className="ml-2.5 w-5 h-5 rounded-md bg-[rgba(46,204,113,0.2)] text-[#2ECC71] flex items-center justify-center group-hover:bg-[#2ECC71] group-hover:text-[#062312] transition-colors">
                <Plus className="w-3.5 h-3.5 stroke-[3]" />
              </div>
            </Link>
          )}

          {/* Notifications */}
          {isAuthenticated && (
            <Link
              to="/notifications"
              className="relative p-2 rounded-xl bg-[#0d2419] border border-[rgba(212,175,55,0.2)] text-[rgba(212,175,55,0.6)] hover:text-gold hover:border-[rgba(212,175,55,0.45)] transition-colors"
            >
              <Bell className="w-4 h-4" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-[#0d2419]" />
            </Link>
          )}

          {/* Login link (text) */}
          {!isAuthenticated && (
            <Link
              to="/auth/login"
              className="hidden sm:flex items-center gap-1.5 px-3 py-2 text-[#E8C97A] text-xs font-bold hover:text-gold transition-colors"
            >
              <LogIn className="w-3.5 h-3.5" />
              Login
            </Link>
          )}

          {/* Sign Up gold pill button */}
          {!isAuthenticated ? (
            <Link
              to="/auth/register"
              className="btn-royal-gold px-5 py-2 text-xs font-black uppercase tracking-wider flex items-center gap-1.5"
            >
              <UserPlus className="w-3.5 h-3.5" />
              Sign Up
            </Link>
          ) : (
            <Link
              to="/profile"
              className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#F5D576] via-[#D4AF37] to-[#B8860B] flex items-center justify-center text-[#0B2318] font-black text-xs shadow-lg hover:scale-105 hover:shadow-[0_0_15px_rgba(212,175,55,0.5)] transition-all"
              title="User Profile"
            >
              <Crown className="w-4 h-4" strokeWidth={2.5} />
            </Link>
          )}
        </div>
      </div>

      <ProvablyFairModal isOpen={isFairnessOpen} onClose={() => setIsFairnessOpen(false)} />
    </header>
  );
}
