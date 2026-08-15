import { Outlet, Link, useLocation, Navigate } from 'react-router-dom';
import { LayoutDashboard, Users, Gamepad2, ArrowLeft, CreditCard, ShieldCheck, Settings, Tag, Megaphone, ShieldAlert, BarChart3, Banknote, LayoutTemplate, ArrowDownLeft } from 'lucide-react';
import { useAuth } from '../../store/AuthContext';
import { usePaymentRequests } from '../../store/PaymentRequestsContext';

const sidebarItems = [
  { path: '/admin', icon: <LayoutDashboard className="w-5 h-5" />, label: 'Dashboard', exact: true },
  { path: '/admin/requests', icon: <ArrowDownLeft className="w-5 h-5 text-emerald-400" />, label: 'Payment Requests', badge: 'requests' },
  { path: '/admin/homepage', icon: <LayoutTemplate className="w-5 h-5" />, label: 'Homepage Content' },
  { path: '/admin/money', icon: <Banknote className="w-5 h-5" />, label: 'Add Money' },
  { path: '/admin/users', icon: <Users className="w-5 h-5" />, label: 'Users' },
  { path: '/admin/kyc', icon: <ShieldCheck className="w-5 h-5" />, label: 'KYC Queue' },
  { path: '/admin/transactions', icon: <CreditCard className="w-5 h-5" />, label: 'Transactions' },
  { path: '/admin/promos', icon: <Tag className="w-5 h-5" />, label: 'Promo Codes' },
  { path: '/admin/broadcasts', icon: <Megaphone className="w-5 h-5" />, label: 'Broadcasts' },
  { path: '/admin/fraud', icon: <ShieldAlert className="w-5 h-5" />, label: 'Fraud Queue' },
  { path: '/admin/analytics', icon: <BarChart3 className="w-5 h-5" />, label: 'Revenue Analytics' },
  { path: '/admin/games', icon: <Settings className="w-5 h-5" />, label: 'Game Control' },
  { path: '/admin/slots', icon: <Gamepad2 className="w-5 h-5" />, label: 'Slot Creator' },
];


export default function AdminLayout() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const { pendingTotalCount } = usePaymentRequests();
  const location = useLocation();

  const isAdmin = user?.role === 'admin' || Boolean(user?.isAdmin);

  if (isLoading) {
    return <div className="min-h-dvh bg-[#061A10] flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-amber-400/20 border-t-amber-400 rounded-full animate-spin" />
    </div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/auth/login?returnTo=%2Fadmin&reason=admin_required" replace />;
  }

  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="min-h-screen w-screen overflow-hidden flex relative" style={{ background: '#061A10' }}>
      {/* Fixed Stationary Sidebar */}
      <aside className="hidden lg:flex flex-col w-60 h-screen bg-[#0d2419] border-r border-[rgba(212,175,55,0.15)] p-4 shrink-0 fixed left-0 top-0 bottom-0 z-40">
        <div className="flex items-center gap-2.5 mb-8 px-2 shrink-0">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#D4AF37] to-[#8B6914] flex items-center justify-center">
            <Gamepad2 className="w-5 h-5 text-[#0B2318]" />
          </div>
          <div>
            <span className="text-base font-black font-heading text-[#E8C97A]">PlayArena</span>
            <span className="block text-[10px] text-[rgba(212,175,55,0.5)]">Admin Panel</span>
          </div>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto pr-1">
          {sidebarItems.map(item => {
            const isActive = item.exact ? location.pathname === item.path : location.pathname.startsWith(item.path);
            const showBadge = item.badge === 'requests' && pendingTotalCount > 0;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-bold transition-all ${
                  isActive
                    ? 'bg-[rgba(212,175,55,0.15)] text-gold border border-[rgba(212,175,55,0.3)]'
                    : 'text-[rgba(212,175,55,0.4)] hover:text-[#E8C97A] hover:bg-[rgba(212,175,55,0.06)]'
                }`}
              >
                <div className="flex items-center gap-3">
                  {item.icon}
                  {item.label}
                </div>
                {showBadge && (
                  <span className="px-1.5 py-0.5 rounded-full text-[10px] font-black bg-amber-500 text-black shadow-[0_0_8px_rgba(245,158,11,0.5)]">
                    {pendingTotalCount}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        <Link to="/" className="flex items-center gap-2 px-3 py-2.5 text-sm text-[rgba(212,175,55,0.4)] hover:text-[#E8C97A] transition-colors shrink-0 pt-2 border-t border-[rgba(212,175,55,0.1)]">
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

      {/* Independently Scrolling Content Area */}
      <main className="flex-1 h-screen overflow-y-auto lg:pl-64 lg:pt-6 pt-18 pb-24 px-4 lg:p-6 w-full">
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
