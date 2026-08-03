import { useState } from 'react';
import { motion } from 'framer-motion';
import { Clock, Trophy, Crown, ShieldCheck } from 'lucide-react';
import { useWallet } from '../../store/WalletContext';
import { StatusBadge } from '../../components/shared/HistoryTable';
import { EmptyState } from '../../components/ui/EmptyState';
import { ProvablyFairModal } from '../../components/ui/ProvablyFairModal';
import { getTimeAgo } from '../../lib/utils';

export default function HistoryPage() {
  const { transactions } = useWallet();
  const [activeTab, setActiveTab] = useState<'bets' | 'wins' | 'games'>('bets');
  const [isFairnessOpen, setIsFairnessOpen] = useState(false);

  const betTxns = transactions.filter(t => t.type === 'bet');
  const winTxns = transactions.filter(t => t.type === 'win' || (t.type === 'deposit' && t.description?.includes('Won')));
  const gameTxns = transactions.filter(t => t.type === 'bet' || t.type === 'win' || (t.type === 'deposit' && t.description?.includes('win')));
  const display = activeTab === 'bets' ? betTxns : activeTab === 'wins' ? winTxns : gameTxns;

  return (
    <div className="space-y-4 pb-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-[#E8C97A] font-heading flex items-center gap-2.5">
            <Clock className="w-6 h-6 text-gold" /> Gaming Round History
          </h1>
          <p className="text-xs text-[rgba(212,175,55,0.5)] mt-1">Audit past bets and cryptographically verify outcomes</p>
        </div>

        {/* Verify Hash Button — pa-btn-outline-gold */}
        <button
          onClick={() => setIsFairnessOpen(true)}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-[rgba(212,175,55,0.4)] text-[#E8C97A] text-xs font-bold hover:bg-[rgba(212,175,55,0.1)] transition-all cursor-pointer"
        >
          <ShieldCheck className="w-4 h-4 text-gold" />
          <span>Verify Round Hash</span>
        </button>
      </motion.div>

      {/* Filter Tabs */}
      <div className="flex gap-1.5 bg-[#0d2419]/80 rounded-2xl p-1.5 border border-[rgba(212,175,55,0.15)]">
        {[
          { key: 'bets' as const, label: 'Bet History', icon: <Crown className="w-4 h-4" /> },
          { key: 'wins' as const, label: 'Win History', icon: <Trophy className="w-4 h-4" /> },
          { key: 'games' as const, label: 'All Activity', icon: <Clock className="w-4 h-4" /> },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
              activeTab === tab.key
                ? 'bg-[rgba(212,175,55,0.18)] text-gold border border-[rgba(212,175,55,0.45)] shadow-[0_0_12px_rgba(212,175,55,0.2)]'
                : 'text-[rgba(212,175,55,0.5)] hover:text-[#E8C97A] border border-transparent'
            }`}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* Stat Cards — pa-panel with gold numbers */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Total Bets', value: betTxns.length, color: 'text-[#F5D576]' },
          { label: 'Total Wins', value: winTxns.length, color: 'text-[#2ECC71]' },
          { label: 'Win Rate', value: `${betTxns.length > 0 ? Math.round((winTxns.length / betTxns.length) * 100) : 0}%`, color: 'text-gold' },
        ].map((stat, i) => (
          <div key={i} className="royal-panel rounded-2xl p-4 text-center">
            <p className="text-[11px] text-[rgba(212,175,55,0.55)] font-bold uppercase tracking-wider">{stat.label}</p>
            <p className={`text-xl font-black mt-1 font-heading tabular-nums ${stat.color}`}>{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Transaction List */}
      <div className="space-y-2.5">
        {display.length === 0 ? (
          <EmptyState
            title="No Round History Found"
            description="You haven't placed any bets or won any rounds yet in this category."
            actionText="Play your first game →"
            actionLink="/games"
            iconType="history"
          />
        ) : (
          display.map((tx, i) => (
            <motion.div
              key={tx.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
              className="flex items-center justify-between royal-panel rounded-2xl p-4"
            >
              <div>
                <p className="text-xs font-bold text-[#F5F1E6]">{tx.description || tx.type}</p>
                <p className="text-[11px] text-[rgba(212,175,55,0.45)] mt-0.5">{getTimeAgo(tx.createdAt)}</p>
              </div>
              <div className="text-right">
                <p className={`text-sm font-black font-heading tabular-nums ${tx.type === 'bet' ? 'text-[#FF4D6D]' : 'text-[#2ECC71]'}`}>
                  {tx.type === 'bet' ? '-' : '+'}₹{tx.amount.toFixed(2)}
                </p>
                <StatusBadge status={tx.status} />
              </div>
            </motion.div>
          ))
        )}
      </div>

      <ProvablyFairModal isOpen={isFairnessOpen} onClose={() => setIsFairnessOpen(false)} />
    </div>
  );
}
