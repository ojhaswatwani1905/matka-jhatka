import { useState } from 'react';
import { motion } from 'framer-motion';
import { Crown, ArrowDownLeft, ArrowUpRight, Clock, TrendingUp, RefreshCw, ShieldCheck, AlertCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import WalletCard from '../../components/shared/WalletCard';
import Modal from '../../components/ui/Modal';
import Input from '../../components/ui/Input';
import { EmptyState } from '../../components/ui/EmptyState';
import { useWallet } from '../../store/WalletContext';
import { useKYC } from '../../store/KYCContext';
import { useAuth } from '../../store/AuthContext';
import { usePromo } from '../../store/PromoContext';
import { useWithdrawalAccounts } from '../../store/WithdrawalAccountsContext';
import { useRG } from '../../store/RGContext';
import { useToast } from '../../components/ui/Toast';
import { getTimeAgo } from '../../lib/utils';
import { Tag } from 'lucide-react';

const STATUS_BADGE: Record<string, string> = {
  pending: 'text-amber-400 bg-amber-500/10 border border-amber-500/30',
  completed: 'text-emerald-400 bg-emerald-500/10 border border-emerald-500/30',
  failed: 'text-rose-400 bg-rose-500/10 border border-rose-500/30',
};

export default function WalletPage() {
  const { balance, transactions, deposit, withdraw, addBalance } = useWallet();
  const { user } = useAuth();
  const { redeemCode } = usePromo();
  const { accounts, defaultAccount } = useWithdrawalAccounts();
  const { checkDepositAllowed } = useRG();
  const { status: kycStatus } = useKYC();
  const { addToast } = useToast();
  const [activeTab, setActiveTab] = useState<'all' | 'deposit' | 'withdrawal'>('all');
  const [showDeposit, setShowDeposit] = useState(false);
  const [showWithdraw, setShowWithdraw] = useState(false);
  const [showKYCGate, setShowKYCGate] = useState(false);
  const [depositAmount, setDepositAmount] = useState('100');
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [selectedAccountId, setSelectedAccountId] = useState<string>(defaultAccount?.id || '');
  const [promoInput, setPromoInput] = useState('');

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

    // Check Responsible Gaming Deposit Limits
    const todayCutoff = new Date().setHours(0, 0, 0, 0);
    const weekCutoff = Date.now() - 7 * 86400000;
    const monthCutoff = Date.now() - 30 * 86400000;

    const dayTotal = transactions.filter(t => t.type === 'deposit' && new Date(t.createdAt).getTime() >= todayCutoff).reduce((s, t) => s + t.amount, 0);
    const weekTotal = transactions.filter(t => t.type === 'deposit' && new Date(t.createdAt).getTime() >= weekCutoff).reduce((s, t) => s + t.amount, 0);
    const monthTotal = transactions.filter(t => t.type === 'deposit' && new Date(t.createdAt).getTime() >= monthCutoff).reduce((s, t) => s + t.amount, 0);

    const check = checkDepositAllowed(amt, [dayTotal, weekTotal, monthTotal]);
    if (!check.allowed) {
      addToast({ type: 'error', title: 'Deposit Limit Blocked', message: check.reason || 'Self-set deposit limit reached.' });
      return;
    }

    deposit(amt);
    addToast({ type: 'success', title: 'Deposit Successful', message: `Added ₹${amt} to your balance.` });
    setShowDeposit(false);
    setDepositAmount('100');
  };

  const handleRedeemPromo = () => {
    if (!promoInput.trim()) return;
    const res = redeemCode(promoInput, user?.id || 'usr_demo', user?.name || 'Player');
    if (res.success && res.amount) {
      addBalance(res.amount, `Promo Code — ${promoInput.toUpperCase().trim()}`, 'deposit');
      addToast({ type: 'success', title: 'Bonus Credited!', message: res.message });
      setPromoInput('');
    } else {
      addToast({ type: 'error', title: 'Redemption Failed', message: res.message });
    }
  };

  const handleWithdrawClick = () => {
    if (kycStatus !== 'verified') {
      setShowKYCGate(true);
    } else {
      setShowWithdraw(true);
    }
  };

  const handleWithdraw = () => {
    if (accounts.length === 0) {
      addToast({ type: 'warning', title: 'No Saved Account', message: 'Please add a saved withdrawal account on your Profile page.' });
      return;
    }
    const amt = parseFloat(withdrawAmount);
    if (isNaN(amt) || amt < 100) {
      addToast({ type: 'warning', title: 'Minimum Withdrawal', message: 'Minimum withdrawal is ₹100.' });
      return;
    }
    if (amt > balance) {
      addToast({ type: 'error', title: 'Insufficient Balance', message: `Your balance is ₹${balance.toFixed(2)}.` });
      return;
    }

    const selectedAcc = accounts.find(a => a.id === selectedAccountId) || defaultAccount || accounts[0];
    const txId = withdraw(amt, selectedAcc?.label);
    if (txId) {
      addToast({ type: 'success', title: 'Withdrawal Requested', message: `₹${amt} withdrawal requested to ${selectedAcc?.label}. Pending approval.` });
      setShowWithdraw(false);
      setWithdrawAmount('');
    }
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
      <WalletCard onDeposit={() => setShowDeposit(true)} onWithdraw={handleWithdrawClick} />

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => setShowDeposit(true)}
          className="btn-royal-gold py-3 rounded-xl font-black text-xs flex items-center justify-center gap-2 cursor-pointer"
        >
          <ArrowDownLeft className="w-4 h-4" /> Deposit Funds
        </button>
        <button
          onClick={handleWithdrawClick}
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
              <div className="text-right flex-shrink-0 space-y-0.5">
                <p className={`text-sm font-black font-heading tabular-nums ${
                  tx.type === 'deposit' || tx.type === 'win' || tx.type === 'bonus' ? 'text-[#2ECC71]' : 'text-[#FF4D6D]'
                }`}>
                  {tx.type === 'deposit' || tx.type === 'win' || tx.type === 'bonus' ? '+' : '-'}₹{tx.amount.toFixed(2)}
                </p>
                {tx.status !== 'completed' && (
                  <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${STATUS_BADGE[tx.status] || ''}`}>
                    {tx.status}
                  </span>
                )}
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

          {/* Promo Code section in Deposit Modal */}
          <div className="pt-2 border-t border-[rgba(212,175,55,0.15)] space-y-2">
            <label className="block text-[rgba(212,175,55,0.7)] font-bold text-[10px] uppercase flex items-center gap-1">
              <Tag className="w-3 h-3 text-gold" /> Have a Promo Code?
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={promoInput}
                onChange={e => setPromoInput(e.target.value)}
                placeholder="Enter code (e.g. WELCOME500)"
                className="flex-1 bg-[#061510] border border-[rgba(212,175,55,0.2)] rounded-xl px-3 py-2 text-xs font-mono uppercase text-gold focus:outline-none focus:border-gold"
              />
              <button
                onClick={handleRedeemPromo}
                className="px-3 py-2 rounded-xl bg-[rgba(212,175,55,0.15)] text-gold border border-[rgba(212,175,55,0.3)] font-black text-xs hover:bg-[rgba(212,175,55,0.25)] transition-all cursor-pointer"
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      </Modal>

      {/* Withdraw Modal */}
      <Modal isOpen={showWithdraw} onClose={() => setShowWithdraw(false)} title="Withdraw Funds">
        <div className="space-y-4 text-xs">
          <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-3">
            <ShieldCheck className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            <p className="text-emerald-400 font-bold">KYC Verified — Withdrawals enabled</p>
          </div>

          {/* Destination Saved Account Selector */}
          <div>
            <label className="block text-[rgba(212,175,55,0.7)] mb-1.5 font-bold uppercase text-[10px]">
              Select Payout Account
            </label>
            {accounts.length === 0 ? (
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs">
                ⚠️ No saved withdrawal accounts found. <Link to="/profile" className="underline font-bold text-gold">Add an account on Profile page</Link> first.
              </div>
            ) : (
              <select
                value={selectedAccountId || defaultAccount?.id}
                onChange={e => setSelectedAccountId(e.target.value)}
                className="w-full bg-[#0d2419] border border-[rgba(212,175,55,0.2)] rounded-xl px-3.5 py-2.5 text-xs text-[#F5F1E6] focus:outline-none focus:border-[rgba(212,175,55,0.5)] cursor-pointer"
              >
                {accounts.map(acc => (
                  <option key={acc.id} value={acc.id}>
                    {acc.isDefault ? '⭐ [DEFAULT] ' : ''}{acc.label} ({acc.type === 'bank' ? `${acc.bankName} ${acc.accountNumber}` : acc.upiId})
                  </option>
                ))}
              </select>
            )}
          </div>

          <div>
            <label className="block text-[rgba(212,175,55,0.7)] mb-1.5 font-bold">Amount to Withdraw (₹)</label>
            <input
              type="number"
              value={withdrawAmount}
              onChange={e => setWithdrawAmount(e.target.value)}
              placeholder="Min ₹100"
              className="w-full bg-[#0d2419] border border-[rgba(212,175,55,0.2)] rounded-xl px-3.5 py-2.5 text-sm text-[#F5F1E6] placeholder-[rgba(212,175,55,0.25)] focus:outline-none focus:border-[rgba(212,175,55,0.5)] transition-colors"
            />
            <p className="text-[10px] text-[rgba(212,175,55,0.4)] mt-1">Available: ₹{balance.toFixed(2)}</p>
          </div>

          <button
            onClick={handleWithdraw}
            disabled={accounts.length === 0}
            className="w-full py-3 rounded-xl font-black text-[#E8C97A] text-xs bg-[rgba(212,175,55,0.08)] border border-[rgba(212,175,55,0.25)] hover:bg-[rgba(212,175,55,0.15)] transition-all cursor-pointer disabled:opacity-40"
          >
            Submit Withdrawal Request
          </button>
          <p className="text-[10px] text-[rgba(212,175,55,0.4)] text-center">Withdrawals are processed within 24 hours after admin review</p>
        </div>
      </Modal>

      {/* KYC Gate Modal */}
      <Modal isOpen={showKYCGate} onClose={() => setShowKYCGate(false)} title="Verification Required">
        <div className="space-y-4 text-xs text-center">
          <div className="w-16 h-16 rounded-full bg-amber-500/10 border-2 border-amber-500/30 flex items-center justify-center mx-auto">
            <AlertCircle className="w-8 h-8 text-amber-400" />
          </div>
          <div>
            <h3 className="text-base font-black text-[#E8C97A] mb-2">KYC Required to Withdraw</h3>
            <p className="text-[rgba(212,175,55,0.6)]">
              To protect our users and comply with regulations, KYC (Know Your Customer) verification is required before you can withdraw funds.
              <br /><br />
              Deposits and gameplay are not affected.
            </p>
          </div>
          <div className="space-y-2">
            <Link
              to="/kyc"
              onClick={() => setShowKYCGate(false)}
              className="btn-royal-gold w-full py-3 rounded-xl font-black flex items-center justify-center gap-2"
            >
              <ShieldCheck className="w-4 h-4" /> Start KYC Verification
            </Link>
            <button onClick={() => setShowKYCGate(false)} className="w-full py-2 text-[rgba(212,175,55,0.4)] hover:text-[#E8C97A] transition-colors cursor-pointer">
              Maybe later
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
