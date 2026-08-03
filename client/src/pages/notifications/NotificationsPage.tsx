import { motion } from 'framer-motion';
import { Bell, CheckCircle2, Trophy, Gift, ArrowDownLeft, Crown } from 'lucide-react';

const mockNotifications = [
  {
    id: '1',
    title: 'Daily Bonus Claimed',
    msg: 'You claimed ₹500 free demo coins.',
    time: '10 min ago',
    icon: <Gift className="w-5 h-5 text-gold" />,
    iconBg: 'bg-[rgba(212,175,55,0.15)] border-[rgba(212,175,55,0.3)]',
  },
  {
    id: '2',
    title: 'Win Streak Reward',
    msg: 'Your 3x streak bonus of ₹1,200 is active!',
    time: '1 hour ago',
    icon: <Trophy className="w-5 h-5 text-[#2ECC71]" />,
    iconBg: 'bg-[rgba(46,204,113,0.15)] border-[rgba(46,204,113,0.3)]',
  },
  {
    id: '3',
    title: 'Deposit Successful',
    msg: 'Added ₹10,000 demo coins to your wallet.',
    time: '3 hours ago',
    icon: <ArrowDownLeft className="w-5 h-5 text-[#2ECC71]" />,
    iconBg: 'bg-[rgba(46,204,113,0.15)] border-[rgba(46,204,113,0.3)]',
  },
  {
    id: '4',
    title: 'Welcome to PlayArena',
    msg: 'Enjoy Matka Jhatka & Color Prediction with demo coins!',
    time: '1 day ago',
    icon: <CheckCircle2 className="w-5 h-5 text-gold" />,
    iconBg: 'bg-[rgba(212,175,55,0.15)] border-[rgba(212,175,55,0.3)]',
  },
];

export default function NotificationsPage() {
  return (
    <div className="space-y-4 pb-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-black text-[#E8C97A] font-heading flex items-center gap-2">
          <Bell className="w-5 h-5 text-gold" /> Notifications
        </h1>
        <button className="text-xs text-[rgba(212,175,55,0.6)] font-bold hover:text-gold transition-colors cursor-pointer">
          Mark all as read
        </button>
      </div>

      {/* Notification rows — pa-panel-alt */}
      <div className="space-y-3">
        {mockNotifications.map((n, i) => (
          <motion.div
            key={n.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="royal-panel rounded-xl p-4 hover:border-[rgba(212,175,55,0.45)] transition-all"
          >
            <div className="flex items-start gap-3.5">
              <div className={`w-10 h-10 rounded-xl border flex items-center justify-center flex-shrink-0 ${n.iconBg}`}>
                {n.icon}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-sm font-bold text-[#F5F1E6]">{n.title}</h3>
                  <span className="text-[10px] text-[rgba(212,175,55,0.45)] font-medium shrink-0">{n.time}</span>
                </div>
                <p className="text-xs text-[rgba(212,175,55,0.6)] mt-0.5 leading-relaxed">{n.msg}</p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Crown divider at bottom */}
      <div className="flex items-center justify-center gap-3 pt-4 opacity-25">
        <div className="h-px flex-1 bg-gradient-to-r from-transparent to-[rgba(212,175,55,0.4)]" />
        <Crown className="w-4 h-4 text-gold" />
        <div className="h-px flex-1 bg-gradient-to-l from-transparent to-[rgba(212,175,55,0.4)]" />
      </div>
    </div>
  );
}
