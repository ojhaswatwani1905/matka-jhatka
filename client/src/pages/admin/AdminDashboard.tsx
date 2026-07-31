import { motion } from 'framer-motion';
import { Users, Wallet, Gamepad2, TrendingUp, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import AnimatedCounter from '../../components/ui/AnimatedCounter';
import Card from '../../components/ui/Card';

const stats = [
  { label: 'Total Users', value: 24853, change: '+12%', up: true, icon: <Users className="w-5 h-5 text-violet-light" />, bg: 'from-violet/10' },
  { label: 'Revenue', value: 1250000, prefix: '₹', change: '+8%', up: true, icon: <Wallet className="w-5 h-5 text-neon-green" />, bg: 'from-neon-green/10' },
  { label: 'Active Games', value: 1847, change: '+23%', up: true, icon: <Gamepad2 className="w-5 h-5 text-gold" />, bg: 'from-gold/10' },
  { label: 'Profit', value: 340000, prefix: '₹', change: '-3%', up: false, icon: <TrendingUp className="w-5 h-5 text-neon-red" />, bg: 'from-neon-red/10' },
];

const recentActivity = [
  { user: 'Rahul K.', action: 'Won ₹5,200 in Color Prediction', time: '2 min ago', type: 'win' },
  { user: 'Priya S.', action: 'Deposited ₹10,000', time: '5 min ago', type: 'deposit' },
  { user: 'Amit P.', action: 'Registered new account', time: '8 min ago', type: 'register' },
  { user: 'Deepa M.', action: 'Won ₹22,000 in Lottery', time: '12 min ago', type: 'win' },
  { user: 'Vikram R.', action: 'Withdrew ₹15,000', time: '20 min ago', type: 'withdraw' },
  { user: 'Sneha T.', action: 'Placed bet ₹500 on Matka', time: '25 min ago', type: 'bet' },
];

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08 } },
};
const item = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } };

export default function AdminDashboard() {
  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6 max-w-6xl">
      <motion.div variants={item}>
        <h1 className="text-2xl font-bold text-white font-heading">Dashboard</h1>
        <p className="text-sm text-navy-500">Welcome back, Admin</p>
      </motion.div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {stats.map((stat, i) => (
          <motion.div key={i} variants={item}>
            <Card variant="glass" hover>
              <div className={`w-10 h-10 rounded-xl bg-gradient-to-b ${stat.bg} to-transparent flex items-center justify-center mb-3`}>
                {stat.icon}
              </div>
              <p className="text-xs text-navy-500 mb-1">{stat.label}</p>
              <AnimatedCounter value={stat.value} prefix={stat.prefix || ''} className="text-xl font-bold text-white font-heading" />
              <div className={`flex items-center gap-1 mt-2 text-xs font-semibold ${stat.up ? 'text-neon-green' : 'text-neon-red'}`}>
                {stat.up ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                {stat.change}
                <span className="text-navy-600 font-normal ml-1">vs last month</span>
              </div>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Revenue Chart Placeholder */}
      <motion.div variants={item}>
        <Card variant="glass" padding="lg">
          <h3 className="text-base font-bold text-white font-heading mb-4">Revenue Overview</h3>
          <div className="h-48 flex items-end justify-between gap-2 px-2">
            {[40, 65, 45, 80, 55, 70, 90, 60, 75, 85, 50, 95].map((h, i) => (
              <motion.div
                key={i}
                initial={{ height: 0 }}
                animate={{ height: `${h}%` }}
                transition={{ delay: 0.3 + i * 0.05, duration: 0.6, ease: 'easeOut' }}
                className="flex-1 bg-gradient-to-t from-violet to-violet/30 rounded-t-lg relative group"
              >
                <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-[9px] text-navy-500 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                  {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][i]}
                </div>
              </motion.div>
            ))}
          </div>
          <div className="flex justify-between mt-2 text-[9px] text-navy-600">
            {['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'].map((m, i) => (
              <span key={i} className="flex-1 text-center">{m}</span>
            ))}
          </div>
        </Card>
      </motion.div>

      {/* Recent Activity */}
      <motion.div variants={item}>
        <Card variant="glass" padding="md">
          <h3 className="text-base font-bold text-white font-heading mb-4">Recent Activity</h3>
          <div className="space-y-3">
            {recentActivity.map((act, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.5 + i * 0.05 }}
                className="flex items-center gap-3"
              >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                  act.type === 'win' ? 'bg-neon-green/10 text-neon-green' :
                  act.type === 'deposit' ? 'bg-gold/10 text-gold' :
                  act.type === 'withdraw' ? 'bg-neon-red/10 text-neon-red' :
                  'bg-violet/10 text-violet-light'
                }`}>
                  {act.user.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white font-medium">{act.user}</p>
                  <p className="text-xs text-navy-500 truncate">{act.action}</p>
                </div>
                <span className="text-[10px] text-navy-600 flex-shrink-0">{act.time}</span>
              </motion.div>
            ))}
          </div>
        </Card>
      </motion.div>
    </motion.div>
  );
}
