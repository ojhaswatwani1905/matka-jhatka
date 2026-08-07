import { useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { Link, useLocation } from 'react-router-dom';
import Navbar from './Navbar';
import BottomNav from './BottomNav';
import { Footer } from './Footer';
import { AgeGateModal } from '../ui/AgeGateModal';
import { SessionWarningBanner, RealityCheckPopup } from '../ui/SessionWidgets';
import { useRG } from '../../store/RGContext';
import { Flame, Dice1, Palette, Ticket, History, MessageCircle, Medal, Users, Crown, Globe, ShieldAlert } from 'lucide-react';

const iconRailItems = [
  { icon: Flame,         label: 'Popular',   path: '/games',               activeMatch: '/games',    exact: true  },
  { icon: Dice1,         label: 'Matka',     path: '/games/matka',         activeMatch: '/games/matka',           exact: false },
  { icon: Palette,       label: 'WinGo',     path: '/games/color-prediction', activeMatch: '/games/color-prediction', exact: false },
  { icon: Ticket,        label: 'Bonus',     path: '/wallet',              activeMatch: '/wallet',   exact: false },
  { icon: History,       label: 'History',   path: '/history',             activeMatch: '/history',  exact: false },
  { icon: MessageCircle, label: 'Support',   path: '/support',             activeMatch: '/support',  exact: false },
  { icon: Medal,         label: 'VIP',       path: '/vip',                 activeMatch: '/vip',      exact: false },
  { icon: Users,         label: 'Referral',  path: '/referral',            activeMatch: '/referral', exact: false },
  { icon: ShieldAlert,   label: 'Admin',     path: '/admin',               activeMatch: '/admin',    exact: false },
];

function IconRail() {
  const location = useLocation();

  return (
    <aside className="hidden lg:flex flex-col items-center w-16 fixed left-0 top-16 bottom-0 z-40 bg-[#0d2419] border-r border-[rgba(212,175,55,0.2)] shadow-xl overflow-y-auto scrollbar-none">
      {/* Rail Items */}
      <div className="flex flex-col items-center gap-1 py-4 flex-1 w-full">
        {iconRailItems.map(({ icon: Icon, label, path, activeMatch, exact }) => {
          const isActive = activeMatch
            ? exact
              ? location.pathname === activeMatch
              : location.pathname === activeMatch || location.pathname.startsWith(activeMatch + '/')
            : false;
          return (
            <Link
              key={label}
              to={path}
              title={label}
              className={`group flex flex-col items-center justify-center w-12 h-12 rounded-xl transition-all duration-200 relative outline-none focus-visible:ring-1 focus-visible:ring-[rgba(212,175,55,0.6)] ${
                isActive
                  ? 'bg-[rgba(212,175,55,0.18)] shadow-[0_0_12px_rgba(212,175,55,0.25)]'
                  : 'hover:bg-[rgba(212,175,55,0.1)]'
              }`}
            >
              <Icon className={`w-5 h-5 ${isActive ? 'text-gold' : 'text-[rgba(212,175,55,0.6)]'} group-hover:text-gold transition-colors`} />
              <span className="text-[8px] font-bold text-center leading-tight mt-0.5 text-[rgba(212,175,55,0.6)] group-hover:text-gold transition-colors">
                {label}
              </span>
              {isActive && (
                <div className="absolute left-0 top-2 bottom-2 w-0.5 bg-gold rounded-r-full" />
              )}
            </Link>
          );
        })}
      </div>

      {/* Language pin at bottom */}
      <div className="pb-4">
        <button
          title="Language"
          className="flex flex-col items-center justify-center w-12 h-12 rounded-xl hover:bg-[rgba(212,175,55,0.1)] transition-all group outline-none"
        >
          <Globe className="w-5 h-5 text-[rgba(212,175,55,0.6)] group-hover:text-gold transition-colors" />
          <span className="text-[8px] font-bold text-[rgba(212,175,55,0.6)] group-hover:text-gold mt-0.5">EN</span>
        </button>
      </div>
    </aside>
  );
}

export default function AppLayout() {
  const { startSession } = useRG();
  const location = useLocation();

  // Start session timer when layout mounts (user navigated into app)
  useEffect(() => { startSession(); }, [startSession]);

  // Scroll window to top whenever route changes so every page & game opens at the top
  useEffect(() => {
    window.scrollTo(0, 0);
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  }, [location.pathname]);

  return (
    <div className="w-full min-h-screen bg-[#0B2318] text-[#F5F1E6] flex flex-col relative overflow-x-hidden">
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

      {/* Top Website Header */}
      <Navbar />

      {/* Left Icon Rail (desktop) */}
      <IconRail />

      {/* Main Website Container — offset left on desktop for sidebar */}
      <main className="flex-1 w-full pt-24 pb-20 lg:pl-16 relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Outlet />
        </div>
      </main>

      {/* Footer */}
      <div className="lg:pl-16">
        <Footer />
      </div>

      {/* Mobile Bottom Navigation */}
      <div className="lg:hidden relative z-50">
        <BottomNav />
      </div>
    </div>
  );
}
