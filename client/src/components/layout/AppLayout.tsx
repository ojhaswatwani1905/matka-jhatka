import { useEffect, useRef, useState } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import Navbar from './Navbar';
import BottomNav from './BottomNav';
import { Footer } from './Footer';
import { AgeGateModal } from '../ui/AgeGateModal';
import { SessionWarningBanner, RealityCheckPopup } from '../ui/SessionWidgets';
import { useAuth } from '../../store/AuthContext';
import { useRG } from '../../store/RGContext';
import {
  Home,
  Wallet,
  Flame,
  Dice1,
  Palette,
  Sparkles,
  Rocket,
  Ticket,
  History,
  MessageCircle,
  Medal,
  Users,
  Globe,
  ShieldAlert,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react';

interface SidebarItem {
  icon: any;
  label: string;
  fullLabel: string;
  sub?: string;
  path: string;
  activeMatch: string;
  exact?: boolean;
  category?: string;
  badge?: string;
}

const allSidebarItems: SidebarItem[] = [
  { icon: Home,          label: 'Home',     fullLabel: 'Lobby Home',      sub: 'Main Casino Lobby',  path: '/',                       activeMatch: '/',                       exact: true,  category: 'MAIN' },
  { icon: Wallet,        label: 'Wallet',   fullLabel: 'Royal Treasury',  sub: 'Deposit & Withdraw', path: '/wallet',                  activeMatch: '/wallet',                  exact: false, category: 'MAIN' },
  { icon: Flame,         label: 'Games',    fullLabel: 'All Games',       sub: 'Top Trending',       path: '/games',                   activeMatch: '/games',                   exact: true,  category: 'GAMES' },
  { icon: Dice1,         label: 'K3 Dice',  fullLabel: 'K3 3-Dice Lottery', sub: '207x Triples & Sum', path: '/games/k3',             activeMatch: '/games/k3',                exact: false, category: 'GAMES', badge: '207x' },
  { icon: Globe,         label: 'TRX WinGo', fullLabel: 'TRX Hash WinGo', sub: 'Blockchain Lottery', path: '/games/trx',               activeMatch: '/games/trx',               exact: false, category: 'GAMES', badge: 'CRYPTO' },
  { icon: Dice1,         label: 'Matka',    fullLabel: 'Matka Jhatka',    sub: 'Kalyan & Mumbai',    path: '/games/matka',             activeMatch: '/games/matka',             exact: false, category: 'GAMES', badge: '10,000x' },
  { icon: Palette,       label: 'WinGo',    fullLabel: 'WinGo Color',     sub: '1Min & 3Min Draw',   path: '/games/color-prediction',  activeMatch: '/games/color-prediction',  exact: false, category: 'GAMES', badge: 'LIVE' },
  { icon: Sparkles,      label: 'Slots',    fullLabel: '777 Jackpot Slots', sub: 'Multi-Line Reels', path: '/games/slots',             activeMatch: '/games/slots',             exact: false, category: 'GAMES', badge: '777x' },
  { icon: Rocket,        label: 'Aviator',  fullLabel: 'Aviator Flight',  sub: 'Crash Multiplier',   path: '/games/aviator',           activeMatch: '/games/aviator',           exact: false, category: 'GAMES', badge: 'HOT' },
  { icon: Ticket,        label: 'Bonus',    fullLabel: 'Bonuses & Promos', sub: 'Claim Extra Cash',  path: '/promotions',              activeMatch: '/promotions',              exact: false, category: 'REWARDS' },
  { icon: History,       label: 'History',  fullLabel: 'Bet History',     sub: 'Past Bets & Ledger', path: '/history',                 activeMatch: '/history',                 exact: false, category: 'REWARDS' },
  { icon: MessageCircle, label: 'Support',  fullLabel: '24/7 Live Support', sub: 'Helpdesk & Ticket', path: '/support',                 activeMatch: '/support',                 exact: false, category: 'ASSISTANCE' },
  { icon: Medal,         label: 'VIP',      fullLabel: 'VIP Elite Club',  sub: 'Exclusive Tiers',    path: '/vip',                     activeMatch: '/vip',                     exact: false, category: 'REWARDS' },
  { icon: Users,         label: 'Referral', fullLabel: 'Invite & Earn',   sub: 'Get ₹100 Per Friend', path: '/referral',                activeMatch: '/referral',                exact: false, category: 'REWARDS', badge: '₹100' },
  { icon: ShieldAlert,   label: 'Admin',    fullLabel: 'Admin Panel',     sub: 'Management Portal',  path: '/admin',                   activeMatch: '/admin',                   exact: false, category: 'ADMIN' },
];

function AppSidebar({
  isExpanded,
  onToggle,
}: {
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const location = useLocation();
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin' || Boolean(user?.isAdmin);

  const visibleItems = allSidebarItems.filter((item) => item.path !== '/admin' || isAdmin);

  return (
    <aside
      className={`hidden lg:flex flex-col fixed left-0 top-16 bottom-0 z-40 bg-[#0d2419] border-r border-[rgba(212,175,55,0.2)] shadow-2xl transition-[width] duration-300 ease-in-out select-none ${
        isExpanded ? 'w-64' : 'w-16'
      }`}
    >
      {/* Header / Collapse Toggle Bar */}
      <div className="flex items-center justify-between px-3 py-3 border-b border-[rgba(212,175,55,0.12)] shrink-0 bg-[#091b12]/60">
        {isExpanded ? (
          <div className="flex items-center justify-between w-full px-1">
            <span className="text-[11px] font-black uppercase tracking-[0.2em] text-[rgba(212,175,55,0.7)] font-heading">
              Quick Navigation
            </span>
            <button
              onClick={onToggle}
              title="Collapse sidebar"
              className="p-1.5 rounded-lg bg-[rgba(212,175,55,0.1)] hover:bg-[rgba(212,175,55,0.2)] text-gold transition-colors cursor-pointer"
            >
              <PanelLeftClose className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="w-full flex justify-center">
            <button
              onClick={onToggle}
              title="Expand sidebar"
              className="p-2 rounded-xl bg-[rgba(212,175,55,0.08)] hover:bg-[rgba(212,175,55,0.2)] text-gold transition-all cursor-pointer group"
            >
              <PanelLeftOpen className="w-4 h-4 group-hover:scale-110 transition-transform" />
            </button>
          </div>
        )}
      </div>

      {/* Navigation Items List */}
      <div className="flex-1 overflow-y-auto scrollbar-none py-2 px-2 space-y-1">
        {visibleItems.map(({ icon: Icon, label, fullLabel, sub, path, activeMatch, exact, badge }, index) => {
          const isActive = activeMatch
            ? exact
              ? location.pathname === activeMatch
              : location.pathname === activeMatch || (activeMatch !== '/' && location.pathname.startsWith(activeMatch + '/'))
            : false;

          return (
            <Link
              key={path + label + index}
              to={path}
              title={isExpanded ? undefined : fullLabel}
              className={`group flex items-center rounded-xl transition-all duration-200 relative outline-none focus-visible:ring-1 focus-visible:ring-[rgba(212,175,55,0.6)] ${
                isExpanded ? 'px-3 py-2 gap-3 w-full' : 'flex-col justify-center w-12 h-12 mx-auto my-0.5'
              } ${
                isActive
                  ? 'bg-[rgba(212,175,55,0.18)] shadow-[0_0_15px_rgba(212,175,55,0.2)] border border-[rgba(212,175,55,0.35)]'
                  : 'hover:bg-[rgba(212,175,55,0.08)] border border-transparent'
              }`}
            >
              <div className="shrink-0 relative">
                <Icon
                  className={`w-5 h-5 transition-colors ${
                    isActive ? 'text-[#FFE57F]' : 'text-[rgba(212,175,55,0.65)] group-hover:text-gold'
                  }`}
                />
              </div>

              {isExpanded ? (
                <div className="flex-1 min-w-0 flex items-center justify-between">
                  <div className="truncate pr-1">
                    <p
                      className={`text-xs font-black truncate leading-tight transition-colors ${
                        isActive ? 'text-[#FFE57F]' : 'text-[#F5F1E6] group-hover:text-gold'
                      }`}
                    >
                      {fullLabel}
                    </p>
                    {sub && (
                      <p className="text-[10px] text-[rgba(212,175,55,0.45)] truncate mt-0.5">
                        {sub}
                      </p>
                    )}
                  </div>
                  {badge && (
                    <span className="shrink-0 text-[9px] font-black px-1.5 py-0.5 rounded-md bg-gradient-to-r from-amber-500/25 to-yellow-500/25 border border-amber-400/40 text-amber-300">
                      {badge}
                    </span>
                  )}
                </div>
              ) : (
                <span className="text-[8px] font-bold text-center leading-tight mt-0.5 text-[rgba(212,175,55,0.6)] group-hover:text-gold transition-colors">
                  {label}
                </span>
              )}

              {isActive && (
                <div className="absolute left-0 top-1.5 bottom-1.5 w-1 bg-gold rounded-r-full shadow-[0_0_8px_#D4AF37]" />
              )}
            </Link>
          );
        })}
      </div>

      {/* Language / Footer Pin */}
      <div className="p-2 border-t border-[rgba(212,175,55,0.12)] shrink-0 bg-[#091b12]/50">
        {isExpanded ? (
          <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-[rgba(212,175,55,0.06)] border border-[rgba(212,175,55,0.15)]">
            <div className="flex items-center gap-2">
              <Globe className="w-4 h-4 text-gold" />
              <span className="text-xs font-bold text-[rgba(212,175,55,0.8)]">Language</span>
            </div>
            <span className="text-[10px] font-black px-2 py-0.5 rounded bg-[rgba(212,175,55,0.2)] text-gold border border-[rgba(212,175,55,0.35)]">
              English (IN)
            </span>
          </div>
        ) : (
          <button
            title="Language: English"
            className="flex flex-col items-center justify-center w-12 h-12 mx-auto rounded-xl hover:bg-[rgba(212,175,55,0.1)] transition-all group outline-none"
          >
            <Globe className="w-5 h-5 text-[rgba(212,175,55,0.6)] group-hover:text-gold transition-colors" />
            <span className="text-[8px] font-bold text-[rgba(212,175,55,0.6)] group-hover:text-gold mt-0.5">EN</span>
          </button>
        )}
      </div>
    </aside>
  );
}

export default function AppLayout() {
  const { startSession } = useRG();
  const location = useLocation();
  const contentContainerRef = useRef<HTMLDivElement>(null);
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(() => {
    try {
      return localStorage.getItem('playarena_sidebar_expanded') === 'true';
    } catch {
      return false;
    }
  });

  const toggleSidebar = () => {
    setIsSidebarExpanded((prev) => {
      const nextState = !prev;
      try {
        localStorage.setItem('playarena_sidebar_expanded', String(nextState));
      } catch {}
      return nextState;
    });
  };

  // Start session timer when layout mounts (user navigated into app)
  useEffect(() => { startSession(); }, [startSession]);

  // Scroll window AND inner content container to top whenever route changes so every page & game opens at the top
  useEffect(() => {
    window.scrollTo(0, 0);
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
    if (contentContainerRef.current) {
      contentContainerRef.current.scrollTop = 0;
    }
  }, [location.pathname]);

  return (
    <div className="h-screen w-screen bg-[#0B2318] text-[#F5F1E6] flex flex-col relative overflow-hidden">
      {/* Ambient background glows for wide viewports */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute -top-32 left-1/4 w-[600px] h-[600px] rounded-full bg-[radial-gradient(circle,rgba(212,175,55,0.07)_0%,transparent_70%)] blur-3xl" />
        <div className="absolute top-1/3 -right-32 w-[700px] h-[700px] rounded-full bg-[radial-gradient(circle,rgba(46,204,113,0.06)_0%,transparent_70%)] blur-3xl" />
        <div className="absolute bottom-10 left-1/3 w-[500px] h-[500px] rounded-full bg-[radial-gradient(circle,rgba(212,175,55,0.05)_0%,transparent_70%)] blur-3xl" />
      </div>

      {/* Age & Compliance Modal */}
      <AgeGateModal />

      {/* Session widgets (warning banner + reality check) */}
      <SessionWarningBanner />
      <RealityCheckPopup />

      {/* Top Fixed Website Header */}
      <Navbar />

      {/* Left Fixed Collapsible / Expandable Sidebar (desktop) */}
      <AppSidebar isExpanded={isSidebarExpanded} onToggle={toggleSidebar} />

      {/* Independently Scrolling Content Container */}
      <div
        ref={contentContainerRef}
        className={`flex-1 h-full w-full overflow-y-auto pt-16 relative z-10 scrollbar-thin transition-[padding] duration-300 ease-in-out ${
          isSidebarExpanded ? 'lg:pl-64' : 'lg:pl-16'
        }`}
      >
        <main className="w-full pb-24 lg:pb-16 pt-4">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <Outlet />
          </div>
        </main>

        {/* Footer */}
        <Footer />
      </div>

      {/* Mobile Bottom Navigation */}
      <div className="lg:hidden relative z-50">
        <BottomNav />
      </div>
    </div>
  );
}

