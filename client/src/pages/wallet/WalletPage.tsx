import { useState } from 'react';
import { motion } from 'framer-motion';
import { Crown, ArrowDownLeft, ArrowUpRight, Clock, TrendingUp, RefreshCw } from 'lucide-react';
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
      addToast({ type: 'warning', title: 'Minimum Deposit', message: 'Minimum deposit amount is ₹10.' });
      return;
    }
    addBalance(amt, `Instant Deposit of ₹${amt}`);
    addToast({ type: 'success', title: 'Deposit Successful', message: `Added ₹${amt} to your balance.` });
    setShowDeposit(false);
    setDepositAmount('100');
  };

  const typeIcons: Record<string, React.ReactNode> = {
    deposit: <ArrowDownLeft className="w-4 h-4 text-[#2ECC71]" />,
    withdrawal: <ArrowUpRight className="w-4 h-4 text-[#FF4D6D]" />,
    bet: <TrendingUp className="w-4 h-4 text-gold" />,
    win: <TrendingUp className="w-4 h-4 text-[#2ECC71]" />,
    bonus: <RefreshCw className="w-4 h-4 text-gold" />,
  };

  return (
    <div className="space-y-5 pb-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-[#E8C97A] font-heading flex items-center gap-2.5">
            <Crown className="w-6 h-6 text-gold" /> Funds & Wallet Manager
          </h1>
          <p className="text-xs text-[rgba(212,175,55,0.5)] mt-1">Manage deposits, withdrawals, and bonus rewards</p>
        </div>
      </motion.div>

      {/* Wallet Hero Card */}
      <WalletCard onDeposit={() => setShowDeposit(true)} onWithdraw={() => addToast({ type: 'info', title: 'Withdrawal Initiated', message: 'Withdrawal requests process within 15 minutes.' })} />

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => setShowDeposit(true)}
          className="btn-royal-gold py-3 rounded-xl font-black text-xs flex items-center justify-center gap-2 cursor-pointer"
        >
          <ArrowDownLeft className="w-4 h-4" /> Deposit Funds
        </button>
        <button
          onClick={() => addToast({ type: 'info', title: 'Withdrawal Initiated', message: 'Withdrawal requests process within 15 minutes.' })}
          className="py-3 rounded-xl font-black text-[#E8C97A] text-xs bg-[rgba(212,175,55,0.08)] border border-[rgba(212,175,55,0.25)] flex items-center justify-center gap-2 hover:bg-[rgba(212,175,55,0.15)] transition-all cursor-pointer"
        >
          <ArrowUpRight className="w-4 h-4" /> Withdraw Balance
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-1.5 bg-[#0d2419]/80 rounded-2xl p-1.5 border border-[rgba(212,175,55,0.15)]">
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
                ? 'bg-[rgba(212,175,55,0.18)] text-gold border border-[rgba(212,175,55,0.45)] shadow-[0_0_12px_rgba(212,175,55,0.2)]'
                : 'text-[rgba(212,175,55,0.5)] hover:text-[#E8C97A] border border-transparent'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Transaction List */}
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
              className="flex items-center gap-3 royal-panel rounded-2xl p-3.5"
            >
              <div className="w-10 h-10 rounded-xl bg-[rgba(212,175,55,0.08)] border border-[rgba(212,175,55,0.2)] flex items-center justify-center flex-shrink-0">
                {typeIcons[tx.type] || <Clock className="w-4 h-4 text-gold" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-[#F5F1E6] capitalize">{tx.type}</p>
                <p className="text-[11px] text-[rgba(212,175,55,0.45)] truncate">{tx.description || tx.type}</p>
              </div>
              <div className="text-right flex-shrink-0">
                <p className={`text-sm font-black font-heading tabular-nums ${
                  tx.type === 'deposit' || tx.type === 'win' || tx.type === 'bonus' ? 'text-[#2ECC71]' : 'text-[#FF4D6D]'
                }`}>
                  {tx.type === 'deposit' || tx.type === 'win' || tx.type === 'bonus' ? '+' : '-'}₹{tx.amount.toFixed(2)}
                </p>
                <span className="text-[10px] text-[rgba(212,175,55,0.4)] font-mono block">{getTimeAgo(tx.createdAt)}</span>
              </div>
            </motion.div>
          ))
        )}
      </div>

      {/* Deposit Modal */}
      <Modal isOpen={showDeposit} onClose={() => setShowDeposit(false)} title="Deposit Funds">
        <div className="space-y-4 text-xs">
          <div>
            <label className="block text-[rgba(212,175,55,0.7)] mb-1.5 font-bold">Select Preset Amount (₹)</label>
            <div className="grid grid-cols-4 gap-2">
              {[50, 100, 500, 1000].map(amt => (
                <button
                  key={amt}
                  onClick={() => setDepositAmount(amt.toString())}
                  className={`py-2 rounded-xl font-bold transition-all cursor-pointer ${
                    depositAmount === amt.toString()
                      ? 'btn-royal-gold text-[#0B2318]'
                      : 'bg-[#0d2419] border border-[rgba(212,175,55,0.2)] text-[#E8C97A] hover:border-[rgba(212,175,55,0.4)]'
                  }`}
                >
                  ₹{amt}
                </button>
              ))}
            </div>
          </div>

          <Input
            label="Or Enter Custom Amount (₹)"
            type="number"
            value={depositAmount}
            onChange={e => setDepositAmount(e.target.value)}
            placeholder="100"
          />

          <button
            onClick={handleDeposit}
            className="btn-royal-gold w-full py-3 rounded-xl font-black cursor-pointer text-xs"
          >
            Confirm Deposit (₹{depositAmount})
          </button>
        </div>
      </Modal>
    </div>
  );
}
