import { Outlet, Link, useLocation, Navigate } from 'react-router-dom';
import { LayoutDashboard, Users, Gamepad2, ArrowLeft, CreditCard, ShieldCheck, Settings, Tag, Megaphone, ShieldAlert, BarChart3 } from 'lucide-react';
import { useAuth } from '../../store/AuthContext';

const sidebarItems = [
  { path: '/admin', icon: <LayoutDashboard className="w-5 h-5" />, label: 'Dashboard', exact: true },
  { path: '/admin/users', icon: <Users className="w-5 h-5" />, label: 'Users' },
  { path: '/admin/kyc', icon: <ShieldCheck className="w-5 h-5" />, label: 'KYC Queue' },
  { path: '/admin/transactions', icon: <CreditCard className="w-5 h-5" />, label: 'Transactions' },
  { path: '/admin/promos', icon: <Tag className="w-5 h-5" />, label: 'Promo Codes' },
  { path: '/admin/broadcasts', icon: <Megaphone className="w-5 h-5" />, label: 'Broadcasts' },
  { path: '/admin/fraud', icon: <ShieldAlert className="w-5 h-5" />, label: 'Fraud Queue' },
  { path: '/admin/analytics', icon: <BarChart3 className="w-5 h-5" />, label: 'Revenue Analytics' },
  { path: '/admin/games', icon: <Settings className="w-5 h-5" />, label: 'Game Control' },
];

export default function AdminLayout() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return <div className="min-h-dvh bg-[#061A10] flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-amber-400/20 border-t-amber-400 rounded-full animate-spin" />
    </div>;
  }

  if (!isAuthenticated || !user?.isAdmin) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="min-h-dvh flex" style={{ background: '#061A10' }}>
      {/* Sidebar */}
      <aside className="hidden lg:flex flex-col w-60 bg-[#0d2419] border-r border-[rgba(212,175,55,0.15)] p-4 shrink-0">
        <div className="flex items-center gap-2.5 mb-8 px-2">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#D4AF37] to-[#8B6914] flex items-center justify-center">
            <Gamepad2 className="w-5 h-5 text-[#0B2318]" />
          </div>
          <div>
            <span className="text-base font-black font-heading text-[#E8C97A]">PlayArena</span>
            <span className="block text-[10px] text-[rgba(212,175,55,0.5)]">Admin Panel</span>
          </div>
        </div>

        <nav className="flex-1 space-y-1">
          {sidebarItems.map(item => {
            const isActive = item.exact ? location.pathname === item.path : location.pathname.startsWith(item.path);
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold transition-all ${
                  isActive
                    ? 'bg-[rgba(212,175,55,0.15)] text-gold border border-[rgba(212,175,55,0.3)]'
                    : 'text-[rgba(212,175,55,0.4)] hover:text-[#E8C97A] hover:bg-[rgba(212,175,55,0.06)]'
                }`}
              >
                {item.icon}
                {item.label}
              </Link>
            );
          })}
        </nav>

        <Link to="/" className="flex items-center gap-2 px-3 py-2.5 text-sm text-[rgba(212,175,55,0.4)] hover:text-[#E8C97A] transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to App
        </Link>
      </aside>

      {/* Mobile top bar */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-[#0d2419]/97 border-b border-[rgba(212,175,55,0.15)] h-14 flex items-center px-4 gap-3">
        <Link to="/" className="p-2 rounded-lg hover:bg-[rgba(212,175,55,0.08)]">
          <ArrowLeft className="w-4 h-4 text-[rgba(212,175,55,0.5)]" />
        </Link>
        <span className="text-sm font-black text-[#E8C97A] font-heading">Admin Panel</span>
      </div>

      {/* Content */}
      <main className="flex-1 lg:pt-0 pt-14 pb-20 px-4 lg:p-6 overflow-y-auto">
        <Outlet />
      </main>

      {/* Mobile bottom nav */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-[#0d2419]/97 border-t border-[rgba(212,175,55,0.15)] flex items-center justify-around h-[60px] px-2">
        {sidebarItems.map(item => {
          const isActive = item.exact ? location.pathname === item.path : location.pathname.startsWith(item.path);
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex flex-col items-center gap-0.5 py-2 px-2 ${isActive ? 'text-gold' : 'text-[rgba(212,175,55,0.35)]'}`}
            >
              {item.icon}
              <span className="text-[9px] font-bold">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
