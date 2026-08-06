import { motion } from 'framer-motion';
import { Bell, CheckCircle2, Trophy, Gift, ArrowDownLeft, Crown, Star, Shield, Zap, ArrowUpRight } from 'lucide-react';
import { useNotifications, type AppNotification } from '../../store/NotificationContext';
import { getTimeAgo } from '../../lib/utils';

const TYPE_CONFIG: Record<AppNotification['type'], { icon: React.ReactNode; bg: string }> = {
  win:         { icon: <Trophy className="w-5 h-5 text-[#2ECC71]" />,     bg: 'bg-[rgba(46,204,113,0.15)] border-[rgba(46,204,113,0.3)]' },
  bonus:       { icon: <Gift className="w-5 h-5 text-gold" />,             bg: 'bg-[rgba(212,175,55,0.15)] border-[rgba(212,175,55,0.3)]' },
  achievement: { icon: <Star className="w-5 h-5 text-amber-400" />,        bg: 'bg-[rgba(245,158,11,0.15)] border-[rgba(245,158,11,0.3)]' },
  vip:         { icon: <Crown className="w-5 h-5 text-gold" />,            bg: 'bg-[rgba(212,175,55,0.15)] border-[rgba(212,175,55,0.3)]' },
  kyc:         { icon: <Shield className="w-5 h-5 text-blue-400" />,       bg: 'bg-[rgba(59,130,246,0.15)] border-[rgba(59,130,246,0.3)]' },
  wallet:      { icon: <ArrowDownLeft className="w-5 h-5 text-[#2ECC71]" />, bg: 'bg-[rgba(46,204,113,0.15)] border-[rgba(46,204,113,0.3)]' },
  system:      { icon: <CheckCircle2 className="w-5 h-5 text-gold" />,     bg: 'bg-[rgba(212,175,55,0.15)] border-[rgba(212,175,55,0.3)]' },
  spin:        { icon: <Zap className="w-5 h-5 text-amber-400" />,         bg: 'bg-[rgba(245,158,11,0.15)] border-[rgba(245,158,11,0.3)]' },
};

export default function NotificationsPage() {
  const { notifications, markRead, markAllRead, unreadCount } = useNotifications();

  return (
    <div className="space-y-4 pb-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-black text-[#E8C97A] font-heading flex items-center gap-2">
          <Bell className="w-5 h-5 text-gold" /> Notifications
          {unreadCount > 0 && (
            <span className="px-2 py-0.5 rounded-full bg-rose-500 text-white text-[10px] font-black">{unreadCount}</span>
          )}
        </h1>
        {unreadCount > 0 && (
          <button onClick={markAllRead} className="text-xs text-[rgba(212,175,55,0.6)] font-bold hover:text-gold transition-colors cursor-pointer">
            Mark all as read
          </button>
        )}
      </div>

      {notifications.length === 0 ? (
        <div className="text-center py-16 space-y-3">
          <div className="text-5xl">🔔</div>
          <p className="text-sm font-bold text-[rgba(212,175,55,0.5)]">No notifications yet</p>
          <p className="text-xs text-[rgba(212,175,55,0.3)]">You'll see game wins, bonuses, and updates here</p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {notifications.map((n, i) => {
            const cfg = TYPE_CONFIG[n.type] ?? TYPE_CONFIG.system;
            return (
              <motion.div
                key={n.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                onClick={() => markRead(n.id)}
                className={`royal-panel rounded-xl p-4 cursor-pointer transition-all hover:border-[rgba(212,175,55,0.4)] ${!n.read ? 'border-[rgba(212,175,55,0.35)] shadow-[0_0_12px_rgba(212,175,55,0.08)]' : 'opacity-70'}`}
              >
                <div className="flex items-start gap-3.5">
                  {/* Unread dot */}
                  <div className="relative flex-shrink-0">
                    <div className={`w-10 h-10 rounded-xl border flex items-center justify-center ${cfg.bg}`}>
                      {cfg.icon}
                    </div>
                    {!n.read && (
                      <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-rose-500 ring-2 ring-[#0d2419]" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className={`text-sm font-bold ${n.read ? 'text-[rgba(212,175,55,0.7)]' : 'text-[#F5F1E6]'}`}>{n.title}</h3>
                      <span className="text-[10px] text-[rgba(212,175,55,0.4)] shrink-0">{getTimeAgo(n.createdAt)}</span>
                    </div>
                    <p className="text-xs text-[rgba(212,175,55,0.55)] mt-0.5 leading-relaxed">{n.message}</p>
                    {n.icon && <span className="text-lg mt-1 block">{n.icon}</span>}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      <div className="flex items-center justify-center gap-3 pt-4 opacity-25">
        <div className="h-px flex-1 bg-gradient-to-r from-transparent to-[rgba(212,175,55,0.4)]" />
        <Crown className="w-4 h-4 text-gold" />
        <div className="h-px flex-1 bg-gradient-to-l from-transparent to-[rgba(212,175,55,0.4)]" />
      </div>
    </div>
  );
}
