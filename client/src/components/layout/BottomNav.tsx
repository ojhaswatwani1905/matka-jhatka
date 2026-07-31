import { useLocation, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Home, Gift, Trophy, Wallet, User } from 'lucide-react';

const tabs = [
  { path: '/', icon: Home, label: 'Home' },
  { path: '/games', icon: Gift, label: 'Games' },
  { path: '/history', icon: Trophy, label: 'History' },
  { path: '/wallet', icon: Wallet, label: 'Wallet' },
  { path: '/profile', icon: User, label: 'Account' },
];

export default function BottomNav() {
  const location = useLocation();

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 w-full z-50 bg-[#0A0E1A]/95 backdrop-blur-xl border-t border-white/10 shadow-2xl">
      <div className="flex items-center justify-around h-16 max-w-md mx-auto px-2">
        {tabs.map((tab) => {
          const active = isActive(tab.path);
          const Icon = tab.icon;

          return (
            <Link
              key={tab.path}
              to={tab.path}
              className="relative flex flex-col items-center justify-center min-h-[44px] min-w-[44px] flex-1 py-1 group cursor-pointer"
            >
              {active && (
                <motion.div
                  layoutId="bottomNavIndicator"
                  className="absolute inset-x-2 inset-y-1 rounded-xl bg-gold/15 border border-gold/40 shadow-inner"
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                />
              )}
              <Icon
                className={`w-5 h-5 relative z-10 transition-transform duration-200 ${
                  active ? 'text-gold scale-110' : 'text-slate-400 group-hover:text-slate-200'
                }`}
              />
              <span
                className={`text-[10px] font-bold relative z-10 transition-colors duration-200 ${
                  active ? 'text-gold' : 'text-slate-400 group-hover:text-slate-200'
                }`}
              >
                {tab.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
