import { useState } from 'react';
import { motion } from 'framer-motion';
import { Wallet as WalletIcon, ArrowDownLeft, ArrowUpRight, Clock, TrendingUp, RefreshCw } from 'lucide-react';
import WalletCard from '../../components/shared/WalletCard';
import Modal from '../../components/ui/Modal';
import Input from '../../components/ui/Input';
import { EmptyState } from '../../components/ui/EmptyState';
import { useWallet } from '../../store/WalletContext';
import { useToast } from '../../components/ui/Toast';
import { getTimeAgo } from '../../lib/utils';

export default function WalletPage() {
  const { transactions, addBalance } = useWallet();
  const { addToast } = useToast();
  const [activeTab, setActiveTab] = useState<'all' | 'deposit' | 'withdrawal'>('all');
  const [showDeposit, setShowDeposit] = useState(false);
  const [depositAmount, setDepositAmount] = useState('100');

  const filtered = transactions.filter(t => {
    if (activeTab === 'deposit') return t.type === 'deposit' || t.type === 'bonus';
    if (activeTab === 'withdrawal') return t.type === 'withdrawal';
    return true;
  });

  const handleDeposit = () => {
    const amt = parseFloat(depositAmount);
    if (isNaN(amt) || amt < 10) {
      addToast({ type: 'warning', title: 'Minimum Deposit', message: 'Minimum deposit amount is $10.' });
      return;
    }
    addBalance(amt, `Instant Deposit of $${amt}`);
    addToast({ type: 'success', title: 'Deposit Successful', message: `Added $${amt} to your balance.` });
    setShowDeposit(false);
    setDepositAmount('100');
  };

  const typeIcons: Record<string, React.ReactNode> = {
    deposit: <ArrowDownLeft className="w-4 h-4 text-emerald-400" />,
    withdrawal: <ArrowUpRight className="w-4 h-4 text-rose-400" />,
    bet: <TrendingUp className="w-4 h-4 text-gold" />,
    win: <TrendingUp className="w-4 h-4 text-emerald-400" />,
    bonus: <RefreshCw className="w-4 h-4 text-violet-400" />,
  };

  return (
    <div className="space-y-5 pb-6">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-white font-heading flex items-center gap-2.5">
            <WalletIcon className="w-6 h-6 text-gold" /> Funds & Wallet Manager
          </h1>
          <p className="text-xs text-slate-400 mt-1">Manage deposits, withdrawals, and bonus rewards</p>
        </div>
      </motion.div>

      <WalletCard />

      {/* Quick Action Deposit & Withdraw */}
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => setShowDeposit(true)}
          className="py-3 rounded-xl font-bold text-black text-xs btn-gold-shimmer flex items-center justify-center gap-2 cursor-pointer shadow-lg"
        >
          <ArrowDownLeft className="w-4 h-4" /> Deposit Funds
        </button>
        <button
          onClick={() => addToast({ type: 'info', title: 'Withdrawal Initiated', message: 'Withdrawal requests process within 15 minutes.' })}
          className="py-3 rounded-xl font-bold text-white text-xs bg-slate-800 border border-white/10 flex items-center justify-center gap-2 hover:bg-slate-700 transition-all cursor-pointer shadow-md"
        >
          <ArrowUpRight className="w-4 h-4 text-emerald-400" /> Withdraw Balance
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-1.5 bg-slate-900/80 rounded-2xl p-1.5 border border-white/5">
        {[
          { key: 'all' as const, label: 'All Transactions' },
          { key: 'deposit' as const, label: 'Deposits & Bonuses' },
          { key: 'withdrawal' as const, label: 'Withdrawals' },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex-1 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
              activeTab === tab.key
                ? 'bg-gold/20 text-gold border border-gold/50 shadow-[0_0_15px_rgba(245,185,44,0.3)] font-heading'
                : 'text-slate-400 hover:text-white border border-transparent'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* List / Empty State */}
      <div className="space-y-2.5">
        {filtered.length === 0 ? (
          <EmptyState
            title="No Transactions Found"
            description="You haven't performed any wallet deposits or withdrawals in this view."
            actionText="Deposit Funds Now →"
            actionLink="/wallet"
            iconType="wallet"
          />
        ) : (
          filtered.map((tx, i) => (
            <motion.div
              key={tx.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
              className="flex items-center gap-3 app-card border border-white/5 rounded-2xl p-3.5"
            >
              <div className="w-10 h-10 rounded-xl bg-slate-900 border border-white/10 flex items-center justify-center flex-shrink-0">
                {typeIcons[tx.type] || <Clock className="w-4 h-4 text-slate-400" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-white capitalize">{tx.type}</p>
                <p className="text-[11px] text-slate-500 truncate">{tx.description || tx.type}</p>
              </div>
              <div className="text-right flex-shrink-0">
                <p className={`text-sm font-black font-heading tabular-nums ${
                  tx.type === 'deposit' || tx.type === 'win' || tx.type === 'bonus' ? 'text-emerald-400' : 'text-rose-400'
                }`}>
                  {tx.type === 'deposit' || tx.type === 'win' || tx.type === 'bonus' ? '+' : '-'}${tx.amount.toFixed(2)}
                </p>
                <span className="text-[10px] text-slate-500 font-mono block">{getTimeAgo(tx.createdAt)}</span>
              </div>
            </motion.div>
          ))
        )}
      </div>

      {/* Deposit Modal with Preset Chips */}
      <Modal isOpen={showDeposit} onClose={() => setShowDeposit(false)} title="Deposit Funds">
        <div className="space-y-4 text-xs">
          <div>
            <label className="block text-slate-400 mb-1.5 font-medium">Select Preset Amount ($)</label>
            <div className="grid grid-cols-4 gap-2">
              {[50, 100, 500, 1000].map(amt => (
                <button
                  key={amt}
                  onClick={() => setDepositAmount(amt.toString())}
                  className={`py-2 rounded-xl font-bold transition-all cursor-pointer ${
                    depositAmount === amt.toString() ? 'btn-gold-shimmer text-black' : 'bg-slate-900 border border-slate-800 text-slate-300'
                  }`}
                >
                  ${amt}
                </button>
              ))}
            </div>
          </div>

          <Input
            label="Or Enter Custom Amount ($)"
            type="number"
            value={depositAmount}
            onChange={e => setDepositAmount(e.target.value)}
            placeholder="100"
          />

          <button
            onClick={handleDeposit}
            className="w-full py-3 rounded-xl font-bold text-black btn-gold-shimmer cursor-pointer shadow-lg text-xs"
          >
            Confirm Deposit (${depositAmount})
          </button>
        </div>
      </Modal>
    </div>
  );
}
