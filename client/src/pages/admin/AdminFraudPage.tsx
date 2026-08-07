import { useState } from 'react';
import { motion } from 'framer-motion';
import { ShieldAlert, CheckCircle, Ban, Bell, Lock } from 'lucide-react';
import { useNotifications } from '../../store/NotificationContext';

interface FraudFlag {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  riskScore: number; // 0-100
  reason: string;
  details: string;
  totalBets: number;
  winRate: number;
  netWinnings: number;
  status: 'pending' | 'dismissed' | 'warned' | 'restricted' | 'banned';
  flaggedAt: string;
}

const INITIAL_FLAGS: FraudFlag[] = [
  {
    id: 'flag_101',
    userId: 'usr_8829',
    userName: 'RapidSpinner99',
    userEmail: 'spinner99@tempmail.com',
    riskScore: 88,
    reason: 'Unusually High Win Rate Anomaly',
    details: 'Achieved 89.2% win rate over 65 consecutive Aviator rounds exceeding statistical threshold.',
    totalBets: 65,
    winRate: 89.2,
    netWinnings: 142500,
    status: 'pending',
    flaggedAt: new Date(Date.now() - 3600000 * 2).toISOString(),
  },
  {
    id: 'flag_102',
    userId: 'usr_4910',
    userName: 'InstantChurner',
    userEmail: 'churner@gmail.com',
    riskScore: 76,
    reason: 'Rapid Deposit-Withdrawal Churn',
    details: 'Deposited ₹50,000 and requested full withdrawal within 4 minutes without qualifying gameplay.',
    totalBets: 2,
    winRate: 50.0,
    netWinnings: 0,
    status: 'pending',
    flaggedAt: new Date(Date.now() - 3600000 * 5).toISOString(),
  },
  {
    id: 'flag_103',
    userId: 'usr_3019',
    userName: 'ScriptBot_X',
    userEmail: 'botx@fastmail.com',
    riskScore: 92,
    reason: 'Automated Scripting Pattern Detected',
    details: 'Exact sub-millisecond bet timing detected across Plinko & Mines auto-bet queues.',
    totalBets: 480,
    winRate: 61.5,
    netWinnings: 88400,
    status: 'pending',
    flaggedAt: new Date(Date.now() - 3600000 * 12).toISOString(),
  },
];

export default function AdminFraudPage() {
  const { addNotification } = useNotifications();
  const [flags, setFlags] = useState<FraudFlag[]>(() => {
    try {
      const saved = localStorage.getItem('playarena_fraud_flags');
      return saved ? JSON.parse(saved) : INITIAL_FLAGS;
    } catch {
      return INITIAL_FLAGS;
    }
  });

  const handleAction = (id: string, action: 'dismissed' | 'warned' | 'restricted' | 'banned') => {
    setFlags(prev =>
      prev.map(f => {
        if (f.id !== id) return f;
        return { ...f, status: action };
      })
    );

    const flag = flags.find(f => f.id === id);
    if (!flag) return;

    if (action === 'warned') {
      addNotification({
        title: '⚠️ Security Notice',
        message: 'Our automated compliance system detected unusual activity on your account. Please review terms of service.',
        type: 'system',
      });
    } else if (action === 'restricted') {
      addNotification({
        title: '🔒 Account Temporarily Restricted',
        message: 'Withdrawals are currently locked pending security review. Contact support for assistance.',
        type: 'system',
      });
    }

    const updated = flags.map(f => (f.id === id ? { ...f, status: action } : f));
    localStorage.setItem('playarena_fraud_flags', JSON.stringify(updated));
  };

  const pendingCount = flags.filter(f => f.status === 'pending').length;

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-[#E8C97A] font-heading flex items-center gap-2">
          <ShieldAlert className="w-6 h-6 text-rose-400" /> Fraud Detection Review Queue
        </h1>
        <p className="text-xs text-[rgba(212,175,55,0.5)] mt-1">
          Automated pattern-detection alerts for statistical anomalies, rapid churn & bot activity
        </p>
      </div>

      {/* Stats summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Pending Review', value: pendingCount, color: 'text-amber-400' },
          { label: 'High Risk (Score > 80)', value: flags.filter(f => f.riskScore > 80).length, color: 'text-rose-400' },
          { label: 'Accounts Restricted', value: flags.filter(f => f.status === 'restricted').length, color: 'text-amber-500' },
          { label: 'Banned Accounts', value: flags.filter(f => f.status === 'banned').length, color: 'text-rose-500' },
        ].map((s, i) => (
          <div key={i} className="royal-panel rounded-2xl p-4 text-center border border-[rgba(212,175,55,0.15)]">
            <p className="text-[10px] text-[rgba(212,175,55,0.5)] font-bold uppercase">{s.label}</p>
            <p className={`text-2xl font-black font-heading mt-1 ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Flag Queue */}
      <div className="space-y-4">
        {flags.length === 0 ? (
          <div className="royal-panel rounded-2xl p-8 text-center text-xs text-[rgba(212,175,55,0.4)]">
            No fraud detection flags logged in review queue.
          </div>
        ) : (
          flags.map(flag => (
            <motion.div
              key={flag.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="royal-panel rounded-2xl p-5 border border-[rgba(212,175,55,0.18)] space-y-4"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[rgba(212,175,55,0.1)] pb-3">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm ${
                    flag.riskScore >= 80 ? 'bg-rose-500/15 text-rose-400 border border-rose-500/30' : 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                  }`}>
                    {flag.riskScore}%
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-gold flex items-center gap-2 font-heading">
                      {flag.userName} <span className="text-[10px] font-mono text-[rgba(212,175,55,0.4)]">({flag.userId})</span>
                    </h3>
                    <p className="text-xs text-rose-400 font-bold mt-0.5">{flag.reason}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-[rgba(212,175,55,0.4)] font-mono">
                    Flagged {new Date(flag.flaggedAt).toLocaleTimeString()}
                  </span>
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                    flag.status === 'pending' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                    flag.status === 'dismissed' ? 'bg-slate-500/10 text-slate-400 border border-slate-500/20' :
                    flag.status === 'warned' ? 'bg-sky-500/10 text-sky-400 border border-sky-500/20' :
                    flag.status === 'restricted' ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30' :
                    'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                  }`}>
                    {flag.status}
                  </span>
                </div>
              </div>

              {/* Details & Metrics */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                <div className="md:col-span-2 p-3 rounded-xl bg-[#061510] border border-[rgba(212,175,55,0.1)] space-y-1">
                  <p className="text-[10px] font-bold text-[rgba(212,175,55,0.5)] uppercase">Pattern Details</p>
                  <p className="text-[rgba(212,175,55,0.85)] leading-relaxed">{flag.details}</p>
                </div>

                <div className="p-3 rounded-xl bg-[#061510] border border-[rgba(212,175,55,0.1)] space-y-1.5 font-mono text-[11px]">
                  <div className="flex justify-between">
                    <span className="text-[rgba(212,175,55,0.5)]">Total Bets:</span>
                    <span className="font-bold text-[#F5F1E6]">{flag.totalBets}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[rgba(212,175,55,0.5)]">Win Rate:</span>
                    <span className="font-bold text-amber-400">{flag.winRate}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[rgba(212,175,55,0.5)]">Net Winnings:</span>
                    <span className="font-bold text-emerald-400">₹{flag.netWinnings.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              {/* Actions Toolbar */}
              {flag.status === 'pending' && (
                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    onClick={() => handleAction(flag.id, 'dismissed')}
                    className="px-3 py-1.5 rounded-xl text-xs font-bold border border-[rgba(212,175,55,0.2)] text-[rgba(212,175,55,0.6)] hover:text-gold hover:bg-[rgba(212,175,55,0.06)] transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    <CheckCircle className="w-3.5 h-3.5" /> Dismiss (False Positive)
                  </button>
                  <button
                    onClick={() => handleAction(flag.id, 'warned')}
                    className="px-3 py-1.5 rounded-xl text-xs font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30 hover:bg-amber-500/20 transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    <Bell className="w-3.5 h-3.5" /> Warn User
                  </button>
                  <button
                    onClick={() => handleAction(flag.id, 'restricted')}
                    className="px-3 py-1.5 rounded-xl text-xs font-bold bg-orange-500/10 text-orange-400 border border-orange-500/30 hover:bg-orange-500/20 transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    <Lock className="w-3.5 h-3.5" /> Restrict Account
                  </button>
                  <button
                    onClick={() => handleAction(flag.id, 'banned')}
                    className="px-3 py-1.5 rounded-xl text-xs font-bold bg-rose-500/15 text-rose-400 border border-rose-500/40 hover:bg-rose-500/25 transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    <Ban className="w-3.5 h-3.5" /> Ban Account
                  </button>
                </div>
              )}
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
}
