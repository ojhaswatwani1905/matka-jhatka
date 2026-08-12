import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { CreditCard, Check, X, Filter } from 'lucide-react';
import { useToast } from '../../components/ui/Toast';
import Modal from '../../components/ui/Modal';
import type { Transaction } from '../../types';
import { getTimeAgo } from '../../lib/utils';

type FilterType = 'all' | 'deposit' | 'withdrawal' | 'bet' | 'win';
type FilterStatus = 'all' | 'pending' | 'completed' | 'failed';

export default function AdminTransactionsPage() {
  const { addToast } = useToast();
  const [txns, setTxns] = useState<Transaction[]>(() =>
    JSON.parse(localStorage.getItem('playarena_all_transactions') || '[]')
  );
  const [typeFilter, setTypeFilter] = useState<FilterType>('all');
  const [statusFilter, setStatusFilter] = useState<FilterStatus>('all');
  const [rejectModal, setRejectModal] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const filtered = useMemo(() =>
    txns.filter(t => {
      const matchType = typeFilter === 'all' || t.type === typeFilter;
      const matchStatus = statusFilter === 'all' || t.status === statusFilter;
      return matchType && matchStatus;
    }),
  [txns, typeFilter, statusFilter]);

  const saveTxns = (updated: Transaction[]) => {
    setTxns(updated);
    localStorage.setItem('playarena_all_transactions', JSON.stringify(updated));
  };

  const approveWithdrawal = (txId: string) => {
    const updated = txns.map(t => t.id === txId ? { ...t, status: 'completed' as const } : t);
    saveTxns(updated);
    addToast({ type: 'success', title: 'Withdrawal Approved', message: 'Funds disbursed.' });
  };

  const rejectWithdrawal = (txId: string) => {
    if (!rejectReason.trim()) {
      addToast({ type: 'warning', title: 'Reason required' });
      return;
    }
    const tx = txns.find(t => t.id === txId);
    const updated = txns.map(t =>
      t.id === txId
        ? { ...t, status: 'failed' as const, description: (t.description || '') + ` (Rejected: ${rejectReason})` }
        : t
    );
    saveTxns(updated);

    // Refund to user wallet
    if (tx?.userId) {
      const key = `wallet_${tx.userId}`;
      const wallet = JSON.parse(localStorage.getItem(key) || '{}');
      wallet.balance = (wallet.balance || 0) + tx.amount;
      localStorage.setItem(key, JSON.stringify(wallet));
    }

    addToast({ type: 'warning', title: 'Withdrawal Rejected', message: 'Funds refunded.' });
    setRejectModal(null);
    setRejectReason('');
  };

  const TYPE_COLORS: Record<string, string> = {
    deposit: 'text-emerald-400',
    win: 'text-emerald-400',
    bonus: 'text-gold',
    withdrawal: 'text-rose-400',
    bet: 'text-[rgba(212,175,55,0.6)]',
  };

  const STATUS_BADGE: Record<string, string> = {
    pending: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
    completed: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
    failed: 'text-rose-400 bg-rose-500/10 border-rose-500/30',
    cancelled: 'text-[rgba(212,175,55,0.4)] bg-[rgba(212,175,55,0.06)] border-[rgba(212,175,55,0.15)]',
  };

  return (
    <div className="space-y-5 max-w-5xl pt-4">
      <div>
        <h1 className="text-2xl font-black text-[#E8C97A] font-heading flex items-center gap-2.5">
          <CreditCard className="w-6 h-6" /> Transaction Management
        </h1>
        <p className="text-xs text-[rgba(212,175,55,0.5)] mt-1">{txns.length} total transactions</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-center">
        <Filter className="w-4 h-4 text-[rgba(212,175,55,0.5)]" />
        <div className="flex gap-1.5 flex-wrap">
          {(['all', 'deposit', 'withdrawal', 'bet', 'win'] as FilterType[]).map(t => (
            <button
              key={t}
              onClick={() => setTypeFilter(t)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold capitalize cursor-pointer transition-all ${typeFilter === t ? 'btn-royal-gold' : 'bg-[#0d2419] border border-[rgba(212,175,55,0.15)] text-[rgba(212,175,55,0.5)] hover:text-[#E8C97A]'}`}
            >
              {t}
            </button>
          ))}
        </div>
        <div className="flex gap-1.5">
          {(['all', 'pending', 'completed', 'failed'] as FilterStatus[]).map(s => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold capitalize cursor-pointer transition-all ${statusFilter === s ? 'bg-[rgba(212,175,55,0.18)] text-gold border border-[rgba(212,175,55,0.4)]' : 'bg-[#0d2419] border border-[rgba(212,175,55,0.1)] text-[rgba(212,175,55,0.4)]'}`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="royal-panel rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-[rgba(212,175,55,0.1)]">
                {['Type', 'Amount', 'Description', 'Status', 'Date', 'Actions'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-[rgba(212,175,55,0.5)] font-bold uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.slice(0, 50).map((tx, i) => (
                <motion.tr
                  key={tx.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.02 }}
                  className="border-b border-[rgba(212,175,55,0.06)] hover:bg-[rgba(212,175,55,0.02)] transition-colors"
                >
                  <td className="px-4 py-3">
                    <span className={`font-black capitalize ${TYPE_COLORS[tx.type] || 'text-gold'}`}>{tx.type}</span>
                  </td>
                  <td className="px-4 py-3 font-black font-heading">
                    <span className={tx.type === 'deposit' || tx.type === 'win' || tx.type === 'bonus' ? 'text-emerald-400' : 'text-rose-400'}>
                      {tx.type === 'deposit' || tx.type === 'win' || tx.type === 'bonus' ? '+' : '-'}₹{tx.amount.toLocaleString('en-IN')}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-[rgba(212,175,55,0.5)] max-w-[200px] truncate">{tx.description || '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full border text-[10px] font-bold ${STATUS_BADGE[tx.status] || ''}`}>
                      {tx.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-[rgba(212,175,55,0.4)]">{getTimeAgo(tx.createdAt)}</td>
                  <td className="px-4 py-3">
                    {tx.type === 'withdrawal' && tx.status === 'pending' && (
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => approveWithdrawal(tx.id)}
                          className="p-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 cursor-pointer transition-colors"
                          title="Approve"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setRejectModal(tx.id)}
                          className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 cursor-pointer transition-colors"
                          title="Reject"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <p className="text-center text-xs text-[rgba(212,175,55,0.4)] py-8">No transactions found</p>
          )}
        </div>
      </div>

      {/* Reject Modal */}
      <Modal isOpen={!!rejectModal} onClose={() => { setRejectModal(null); setRejectReason(''); }} title="Reject Withdrawal">
        <div className="space-y-4 text-xs">
          <p className="text-[rgba(212,175,55,0.6)]">Rejecting will refund the amount to the user's wallet.</p>
          <div>
            <label className="block text-[rgba(212,175,55,0.7)] mb-1.5 font-bold">Rejection Reason</label>
            <input
              value={rejectReason}
              onChange={e => setRejectReason(e.target.value)}
              placeholder="e.g. Bank details mismatch, KYC not verified..."
              className="w-full bg-[#0d2419] border border-[rgba(212,175,55,0.2)] rounded-xl px-3.5 py-2.5 text-sm text-[#F5F1E6] placeholder-[rgba(212,175,55,0.25)] focus:outline-none focus:border-[rgba(212,175,55,0.5)] transition-colors"
            />
          </div>
          <button onClick={() => rejectModal && rejectWithdrawal(rejectModal)} className="w-full py-3 rounded-xl font-black text-xs bg-rose-500/10 border border-rose-500/30 text-rose-400 hover:bg-rose-500/20 transition-colors cursor-pointer">
            Reject & Refund
          </button>
        </div>
      </Modal>
    </div>
  );
}
