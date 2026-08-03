import { Outlet } from 'react-router-dom';
import { Link, useLocation } from 'react-router-dom';
import Navbar from './Navbar';
import BottomNav from './BottomNav';
import { Footer } from './Footer';
import { AgeGateModal } from '../ui/AgeGateModal';
import { Flame, Spade, Search, Ticket, Send, MessageCircle, Medal, Users, Crown, Globe } from 'lucide-react';

const iconRailItems = [
  { icon: Flame,         label: 'Popular',   path: '/games',               activeMatch: '/games',               exact: true  },
  { icon: Spade,         label: 'Card Games', path: '/games/color-prediction', activeMatch: '/games/color-prediction', exact: false },
  { icon: Search,        label: 'Search',    path: '/games',               activeMatch: null,                   exact: false },
  { icon: Ticket,        label: 'Promos',    path: '/wallet',              activeMatch: '/wallet',              exact: false },
  { icon: Send,          label: 'Telegram',  path: '/support',             activeMatch: null,                   exact: false },
  { icon: MessageCircle, label: 'Support',   path: '/support',             activeMatch: '/support',             exact: false },
  { icon: Medal,         label: 'VIP',       path: '/profile',             activeMatch: '/profile',             exact: false },
  { icon: Users,         label: 'Referral',  path: '/profile',             activeMatch: null,                   exact: false },
  { icon: Crown,         label: 'Royal VIP', path: '/profile',             activeMatch: null,                   exact: false },
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
  return (
    <div className="w-full min-h-screen bg-[#0B2318] text-[#F5F1E6] flex flex-col relative overflow-x-hidden">
      {/* Age & Compliance Modal */}
      <AgeGateModal />

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
