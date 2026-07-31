import { Outlet, Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Users, Gamepad2, ArrowLeft, CreditCard } from 'lucide-react';

const sidebarItems = [
  { path: '/admin', icon: <LayoutDashboard className="w-5 h-5" />, label: 'Dashboard', exact: true },
  { path: '/admin/users', icon: <Users className="w-5 h-5" />, label: 'Users' },
  { path: '/admin/transactions', icon: <CreditCard className="w-5 h-5" />, label: 'Transactions' },
];

export default function AdminLayout() {
  const location = useLocation();

  return (
    <div className="min-h-dvh bg-navy-950 flex">
      {/* Sidebar */}
      <aside className="hidden lg:flex flex-col w-64 bg-surface border-r border-border p-4">
        <div className="flex items-center gap-2.5 mb-8 px-2">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet to-gold flex items-center justify-center">
            <Gamepad2 className="w-5 h-5 text-white" />
          </div>
          <div>
            <span className="text-base font-bold font-heading text-gradient-gold">PlayArena</span>
            <span className="block text-[10px] text-navy-500">Admin Panel</span>
          </div>
        </div>

        <nav className="flex-1 space-y-1">
          {sidebarItems.map(item => {
            const isActive = item.exact ? location.pathname === item.path : location.pathname.startsWith(item.path);
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  isActive ? 'bg-violet/15 text-violet-light' : 'text-navy-500 hover:text-white hover:bg-white/5'
                }`}
              >
                {item.icon}
                {item.label}
              </Link>
            );
          })}
        </nav>

        <Link to="/" className="flex items-center gap-2 px-3 py-2.5 text-sm text-navy-500 hover:text-white transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to App
        </Link>
      </aside>

      {/* Mobile top bar */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 glass-strong h-14 flex items-center px-4 gap-3">
        <Link to="/" className="p-2 rounded-lg hover:bg-white/5"><ArrowLeft className="w-4 h-4 text-navy-500" /></Link>
        <span className="text-sm font-bold text-white font-heading">Admin Panel</span>
      </div>

      {/* Content */}
      <main className="flex-1 lg:pt-0 pt-14 pb-4 px-4 lg:p-6 overflow-y-auto">
        <Outlet />
      </main>

      {/* Mobile bottom nav for admin */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 glass-strong border-t border-border flex items-center justify-around h-[60px] px-2">
        {sidebarItems.map(item => {
          const isActive = item.exact ? location.pathname === item.path : location.pathname.startsWith(item.path);
          return (
            <Link key={item.path} to={item.path} className={`flex flex-col items-center gap-1 py-2 px-3 ${isActive ? 'text-violet-light' : 'text-navy-600'}`}>
              {item.icon}
              <span className="text-[10px] font-medium">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
