import { motion } from 'framer-motion';
import { Bell, CheckCircle2, Trophy, Gift, ArrowDownLeft } from 'lucide-react';
import Card from '../../components/ui/Card';

const mockNotifications = [
  { id: '1', title: 'Daily Bonus Claimed', msg: 'You claimed 500 free demo coins.', time: '10 min ago', icon: <Gift className="w-5 h-5 text-gold" /> },
  { id: '2', title: 'Win Streak Reward', msg: 'Your 3x streak bonus of ₹1,200 is active!', time: '1 hour ago', icon: <Trophy className="w-5 h-5 text-neon-green" /> },
  { id: '3', title: 'Deposit Successful', msg: 'Added ₹10,000 demo coins to your wallet.', time: '3 hours ago', icon: <ArrowDownLeft className="w-5 h-5 text-neon-green" /> },
  { id: '4', title: 'Welcome to PlayArena', msg: 'Enjoy Matka Jhatka & Color Prediction with demo coins!', time: '1 day ago', icon: <CheckCircle2 className="w-5 h-5 text-violet-light" /> },
];

export default function NotificationsPage() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-black text-white font-heading flex items-center gap-2">
          <Bell className="w-5 h-5 text-gold" /> Notifications
        </h1>
        <span className="text-xs text-navy-500 font-semibold cursor-pointer hover:underline">Mark all as read</span>
      </div>

      <div className="space-y-3">
        {mockNotifications.map((n, i) => (
          <motion.div
            key={n.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
          >
            <Card variant="glass" padding="md">
              <div className="flex items-start gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-surface-light border border-white/5 flex items-center justify-center flex-shrink-0">
                  {n.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-sm font-bold text-white">{n.title}</h3>
                    <span className="text-[10px] text-navy-500 font-medium">{n.time}</span>
                  </div>
                  <p className="text-xs text-navy-500 mt-0.5 leading-relaxed">{n.msg}</p>
                </div>
              </div>
            </Card>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
