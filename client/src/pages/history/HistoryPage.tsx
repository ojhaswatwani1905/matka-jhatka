import { useState } from 'react';
import { motion } from 'framer-motion';
import { Clock, Trophy, Gamepad2, ShieldCheck } from 'lucide-react';
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
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-white font-heading flex items-center gap-2.5">
            <Clock className="w-6 h-6 text-gold" /> Gaming Round History
          </h1>
          <p className="text-xs text-slate-400 mt-1">Audit past bets and cryptographically verify outcomes</p>
        </div>

        <button
          onClick={() => setIsFairnessOpen(true)}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold hover:bg-emerald-500/20 cursor-pointer"
        >
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>Verify Round Hash</span>
        </button>
      </motion.div>

      {/* Tabs */}
      <div className="flex gap-1.5 bg-slate-900/80 rounded-2xl p-1.5 border border-white/5">
        {[
          { key: 'bets' as const, label: 'Bet History', icon: <Gamepad2 className="w-4 h-4" /> },
          { key: 'wins' as const, label: 'Win History', icon: <Trophy className="w-4 h-4" /> },
          { key: 'games' as const, label: 'All Activity', icon: <Clock className="w-4 h-4" /> },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
              activeTab === tab.key
                ? 'bg-gold/20 text-gold border border-gold/50 shadow-[0_0_15px_rgba(245,185,44,0.3)] font-heading'
                : 'text-slate-400 hover:text-white border border-transparent'
            }`}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* Summary Stat Chips */}
      <div className="grid grid-cols-3 gap-3">
        <div className="app-card border border-white/5 rounded-2xl p-4 text-center">
          <p className="text-[11px] text-slate-400 font-medium">Total Bets</p>
          <p className="text-xl font-black text-white mt-1 font-heading tabular-nums">{betTxns.length}</p>
        </div>
        <div className="app-card border border-white/5 rounded-2xl p-4 text-center">
          <p className="text-[11px] text-slate-400 font-medium">Total Wins</p>
          <p className="text-xl font-black text-emerald-400 mt-1 font-heading tabular-nums">{winTxns.length}</p>
        </div>
        <div className="app-card border border-white/5 rounded-2xl p-4 text-center">
          <p className="text-[11px] text-slate-400 font-medium">Win Rate</p>
          <p className="text-xl font-black text-gold mt-1 font-heading tabular-nums">
            {betTxns.length > 0 ? Math.round((winTxns.length / betTxns.length) * 100) : 0}%
          </p>
        </div>
      </div>

      {/* List / Empty State */}
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
              className="flex items-center justify-between app-card border border-white/5 rounded-2xl p-4"
            >
              <div>
                <p className="text-xs font-bold text-white">{tx.description || tx.type}</p>
                <p className="text-[11px] text-slate-500 mt-0.5">{getTimeAgo(tx.createdAt)}</p>
              </div>
              <div className="text-right">
                <p className={`text-sm font-black font-heading tabular-nums ${tx.type === 'bet' ? 'text-rose-400' : 'text-emerald-400'}`}>
                  {tx.type === 'bet' ? '-' : '+'}${tx.amount.toFixed(2)}
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

