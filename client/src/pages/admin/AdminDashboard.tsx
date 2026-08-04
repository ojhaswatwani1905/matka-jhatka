import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Users, Wallet, Gamepad2, TrendingUp, ArrowUpRight, ArrowDownRight, Clock, ShieldCheck } from 'lucide-react';
import type { Transaction, User } from '../../types';

function getAdminStats() {
  const users: User[] = JSON.parse(localStorage.getItem('playarena_users') || '[]');
  const txns: Transaction[] = JSON.parse(localStorage.getItem('playarena_all_transactions') || '[]');
  const kycQueue = JSON.parse(localStorage.getItem('playarena_kyc_queue') || '[]');

  const totalDeposits = txns.filter(t => t.type === 'deposit').reduce((s, t) => s + t.amount, 0);
  const totalWithdrawals = txns.filter(t => t.type === 'withdrawal' && t.status === 'completed').reduce((s, t) => s + t.amount, 0);
  const totalBets = txns.filter(t => t.type === 'bet').reduce((s, t) => s + t.amount, 0);
  const totalWins = txns.filter(t => t.type === 'win').reduce((s, t) => s + t.amount, 0);
  const pendingWithdrawals = txns.filter(t => t.type === 'withdrawal' && t.status === 'pending').length;
  const pendingKYC = kycQueue.filter((k: any) => !k.approved && !k.rejected).length;

  return {
    totalUsers: Math.max(users.length, 1),
    totalDeposits,
    totalWithdrawals,
    totalBets,
    revenue: totalBets - totalWins,
    winRate: totalBets > 0 ? ((totalWins / totalBets) * 100).toFixed(1) : '0.0',
    pendingWithdrawals,
    pendingKYC,
    recentActivity: txns.slice(0, 8),
  };
}

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.08 } } };
const item = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } };

export default function AdminDashboard() {
  const stats = useMemo(() => getAdminStats(), []);

  const statCards = [
    { label: 'Total Users', value: stats.totalUsers, prefix: '', suffix: '', change: '+12%', up: true, icon: <Users className="w-5 h-5 text-[#E8C97A]" />, color: 'text-[#E8C97A]' },
    { label: 'Total Deposits', value: stats.totalDeposits, prefix: '₹', suffix: '', change: '+8%', up: true, icon: <Wallet className="w-5 h-5 text-[#2ECC71]" />, color: 'text-[#2ECC71]' },
    { label: 'Total Bets', value: stats.totalBets, prefix: '₹', suffix: '', change: '+23%', up: true, icon: <Gamepad2 className="w-5 h-5 text-gold" />, color: 'text-gold' },
    { label: 'House Revenue', value: Math.max(0, stats.revenue), prefix: '₹', suffix: '', change: stats.revenue >= 0 ? '+' : '-', up: stats.revenue >= 0, icon: <TrendingUp className="w-5 h-5 text-gold" />, color: 'text-gold' },
  ];

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6 max-w-5xl pt-4">
      <motion.div variants={item}>
        <h1 className="text-2xl font-black text-[#E8C97A] font-heading">Dashboard</h1>
        <p className="text-sm text-[rgba(212,175,55,0.5)]">PlayArena Admin Overview</p>
      </motion.div>

      {/* Alert badges */}
      {(stats.pendingWithdrawals > 0 || stats.pendingKYC > 0) && (
        <motion.div variants={item} className="flex flex-wrap gap-2">
          {stats.pendingWithdrawals > 0 && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs font-bold text-amber-400">
              <Clock className="w-3.5 h-3.5" /> {stats.pendingWithdrawals} pending withdrawal{stats.pendingWithdrawals > 1 ? 's' : ''}
            </div>
          )}
          {stats.pendingKYC > 0 && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-blue-500/10 border border-blue-500/30 text-xs font-bold text-blue-400">
              <ShieldCheck className="w-3.5 h-3.5" /> {stats.pendingKYC} pending KYC review{stats.pendingKYC > 1 ? 's' : ''}
            </div>
          )}
        </motion.div>
      )}

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {statCards.map((stat, i) => (
          <motion.div key={i} variants={item}>
            <div className="royal-panel rounded-2xl p-4">
              <div className="w-10 h-10 rounded-xl bg-[rgba(212,175,55,0.08)] flex items-center justify-center mb-3">
                {stat.icon}
              </div>
              <p className="text-xs text-[rgba(212,175,55,0.5)] mb-1">{stat.label}</p>
              <p className={`text-xl font-black font-heading ${stat.color}`}>
                {stat.prefix}{stat.value.toLocaleString('en-IN')}{stat.suffix}
              </p>
              <div className={`flex items-center gap-1 mt-1.5 text-xs font-bold ${stat.up ? 'text-[#2ECC71]' : 'text-[#FF4D6D]'}`}>
                {stat.up ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                {stat.change} <span className="text-[rgba(212,175,55,0.3)] font-normal ml-1">vs last month</span>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Win rate + stats row */}
      <motion.div variants={item} className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        <div className="royal-panel rounded-2xl p-4">
          <p className="text-xs text-[rgba(212,175,55,0.5)] mb-1">Win Rate (Players)</p>
          <p className="text-2xl font-black text-[#E8C97A] font-heading">{stats.winRate}%</p>
        </div>
        <div className="royal-panel rounded-2xl p-4">
          <p className="text-xs text-[rgba(212,175,55,0.5)] mb-1">Total Withdrawals</p>
          <p className="text-2xl font-black text-[#FF4D6D] font-heading">₹{stats.totalWithdrawals.toLocaleString('en-IN')}</p>
        </div>
        <div className="royal-panel rounded-2xl p-4 lg:block hidden">
          <p className="text-xs text-[rgba(212,175,55,0.5)] mb-1">Total Win Payouts</p>
          <p className="text-2xl font-black text-[#2ECC71] font-heading">—</p>
        </div>
      </motion.div>

      {/* Bar chart — revenue */}
      <motion.div variants={item}>
        <div className="royal-panel rounded-2xl p-5">
          <h3 className="text-sm font-black text-[#E8C97A] font-heading mb-4">Revenue Overview (Simulated)</h3>
          <div className="h-36 flex items-end justify-between gap-1.5 px-2">
            {[40, 65, 45, 80, 55, 70, 90, 60, 75, 85, 50, 95].map((h, i) => (
              <motion.div
                key={i}
                initial={{ height: 0 }}
                animate={{ height: `${h}%` }}
                transition={{ delay: 0.3 + i * 0.04, duration: 0.5, ease: 'easeOut' }}
                className="flex-1 rounded-t-lg relative group"
                style={{ background: 'linear-gradient(to top, rgba(212,175,55,0.6), rgba(212,175,55,0.2))' }}
              >
                <div className="absolute -top-5 left-1/2 -translate-x-1/2 text-[9px] text-[rgba(212,175,55,0.4)] opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                  {['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'][i]}
                </div>
              </motion.div>
            ))}
          </div>
          <div className="flex justify-between mt-2 text-[9px] text-[rgba(212,175,55,0.3)]">
            {['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'].map((m, i) => (
              <span key={i} className="flex-1 text-center">{m}</span>
            ))}
          </div>
        </div>
      </motion.div>

      {/* Recent Activity */}
      <motion.div variants={item}>
        <div className="royal-panel rounded-2xl p-5">
          <h3 className="text-sm font-black text-[#E8C97A] font-heading mb-4">Recent Transactions</h3>
          {stats.recentActivity.length === 0 ? (
            <p className="text-xs text-[rgba(212,175,55,0.4)] text-center py-4">No transactions yet</p>
          ) : (
            <div className="space-y-2.5">
              {stats.recentActivity.map((tx, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-black ${
                    tx.type === 'win' ? 'bg-[#2ECC71]/10 text-[#2ECC71]' :
                    tx.type === 'deposit' ? 'bg-gold/10 text-gold' :
                    tx.type === 'withdrawal' ? 'bg-[#FF4D6D]/10 text-[#FF4D6D]' :
                    'bg-[rgba(212,175,55,0.08)] text-[rgba(212,175,55,0.5)]'
                  }`}>
                    {tx.type.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-[#F5F1E6] capitalize">{tx.type}</p>
                    <p className="text-[10px] text-[rgba(212,175,55,0.4)] truncate">{tx.description || tx.type}</p>
                  </div>
                  <div className="text-right">
                    <p className={`text-xs font-black ${tx.type === 'deposit' || tx.type === 'win' || tx.type === 'bonus' ? 'text-[#2ECC71]' : 'text-[#FF4D6D]'}`}>
                      {tx.type === 'deposit' || tx.type === 'win' || tx.type === 'bonus' ? '+' : '-'}₹{tx.amount}
                    </p>
                    <p className="text-[9px] text-[rgba(212,175,55,0.3)]">{tx.status}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
