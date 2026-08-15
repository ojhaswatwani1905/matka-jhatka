import { useState } from 'react';
import { motion } from 'framer-motion';
import { Crown, ArrowDownLeft, ArrowUpRight, Clock, TrendingUp, RefreshCw, ShieldCheck, AlertCircle, Phone, Sparkles, CheckCircle2, XCircle, Info, Tag } from 'lucide-react';
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
import { usePaymentRequests } from '../../store/PaymentRequestsContext';
import { getTimeAgo } from '../../lib/utils';

const STATUS_BADGE: Record<string, string> = {
  pending: 'text-amber-400 bg-amber-500/10 border border-amber-500/30',
  completed: 'text-emerald-400 bg-emerald-500/10 border border-emerald-500/30',
  approved: 'text-emerald-400 bg-emerald-500/10 border border-emerald-500/30',
  failed: 'text-rose-400 bg-rose-500/10 border border-rose-500/30',
  rejected: 'text-rose-400 bg-rose-500/10 border border-rose-500/30',
};

export default function WalletPage() {
  const { balance, transactions, deposit, addBalance } = useWallet();
  const { user } = useAuth();
  const { redeemCode } = usePromo();
  const { accounts, defaultAccount } = useWithdrawalAccounts();
  const { checkDepositAllowed } = useRG();
  const { status: kycStatus } = useKYC();
  const { addToast } = useToast();
  const { createDepositRequest, createWithdrawalRequest, getUserRequests } = usePaymentRequests();

  const [activeTab, setActiveTab] = useState<'all' | 'deposit' | 'withdrawal' | 'requests'>('all');
  const [showDeposit, setShowDeposit] = useState(false);
  const [depositMode, setDepositMode] = useState<'request' | 'instant'>('request');
  const [showWithdraw, setShowWithdraw] = useState(false);
  const [showKYCGate, setShowKYCGate] = useState(false);

  // Form states
  const [depositAmount, setDepositAmount] = useState('500');
  const [depositWhatsApp, setDepositWhatsApp] = useState(user?.phone || '');
  const [withdrawAmount, setWithdrawAmount] = useState('500');
  const [withdrawWhatsApp, setWithdrawWhatsApp] = useState(user?.phone || '');
  const [selectedAccountId, setSelectedAccountId] = useState<string>(defaultAccount?.id || '');
  const [promoInput, setPromoInput] = useState('');

  const userRequests = getUserRequests(user?.id || 'demo');
  const pendingUserRequests = userRequests.filter(r => r.status === 'pending');

  const filteredTransactions = transactions.filter(t => {
    if (activeTab === 'deposit') return t.type === 'deposit' || t.type === 'bonus';
    if (activeTab === 'withdrawal') return t.type === 'withdrawal';
    return true;
  });

  // Handle Request-Based Deposit
  const handleSubmitDepositRequest = () => {
    const amt = parseFloat(depositAmount);
    if (isNaN(amt) || amt < 10) {
      addToast({ type: 'warning', title: 'Minimum Deposit', message: 'Minimum deposit request amount is ₹10.' });
      return;
    }
    if (!depositWhatsApp.trim() || depositWhatsApp.trim().length < 8) {
      addToast({ type: 'warning', title: 'WhatsApp Number Required', message: 'Please enter a valid WhatsApp or contact number.' });
      return;
    }

    // RG checks
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

    createDepositRequest({
      userId: user?.id || 'usr_demo',
      userName: user?.name || 'Player',
      userEmail: user?.email || 'player@playarena.com',
      amount: amt,
      whatsappNumber: depositWhatsApp.trim(),
    });

    addToast({
      type: 'success',
      title: 'Deposit Request Submitted',
      message: `Deposit request of ₹${amt.toLocaleString('en-IN')} submitted. Pending admin approval (Demo Flow).`,
    });

    setShowDeposit(false);
    setActiveTab('requests');
  };

  // Handle Instant Demo Deposit
  const handleInstantDeposit = () => {
    const amt = parseFloat(depositAmount);
    if (isNaN(amt) || amt < 10) {
      addToast({ type: 'warning', title: 'Minimum Deposit', message: 'Minimum deposit amount is ₹10.' });
      return;
    }
    deposit(amt);
    addToast({ type: 'success', title: 'Instant Deposit Added', message: `Added ₹${amt} to your balance (Instant Demo Mode).` });
    setShowDeposit(false);
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

  // Handle Request-Based Withdrawal
  const handleSubmitWithdrawalRequest = () => {
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
      addToast({ type: 'error', title: 'Insufficient Balance', message: `Your current balance is ₹${balance.toFixed(2)}.` });
      return;
    }
    if (!withdrawWhatsApp.trim() || withdrawWhatsApp.trim().length < 8) {
      addToast({ type: 'warning', title: 'WhatsApp Number Required', message: 'Please enter a valid WhatsApp or contact number.' });
      return;
    }

    const selectedAcc = accounts.find(a => a.id === selectedAccountId) || defaultAccount || accounts[0];

    createWithdrawalRequest({
      userId: user?.id || 'usr_demo',
      userName: user?.name || 'Player',
      userEmail: user?.email || 'player@playarena.com',
      amount: amt,
      whatsappNumber: withdrawWhatsApp.trim(),
      accountDetails: {
        id: selectedAcc.id,
        label: selectedAcc.label,
        type: selectedAcc.type,
        bankName: selectedAcc.bankName,
        accountNumber: selectedAcc.accountNumber,
        ifscCode: selectedAcc.ifscCode,
        accountHolder: selectedAcc.accountHolder,
        upiId: selectedAcc.upiId,
      },
    });

    addToast({
      type: 'success',
      title: 'Withdrawal Request Submitted',
      message: `₹${amt.toLocaleString('en-IN')} held for withdrawal to ${selectedAcc.label}. Pending admin approval (Demo Flow).`,
    });

    setShowWithdraw(false);
    setActiveTab('requests');
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
          <p className="text-xs text-[rgba(212,175,55,0.5)] mt-1">Manage deposits, withdrawals, and payment requests</p>
        </div>
      </motion.div>

      {/* Demo Notice Banner */}
      <div className="bg-amber-500/10 border border-amber-500/25 rounded-2xl p-3 flex items-start gap-2.5">
        <Info className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
        <div className="text-xs">
          <span className="font-bold text-amber-300">Client Demo Mode:</span>{' '}
          <span className="text-[rgba(212,175,55,0.8)]">
            Simulated payment & payout request flow. No real money, payment gateways, or WhatsApp APIs are involved.
          </span>
        </div>
      </div>

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
      <div className="flex gap-1.5 bg-[#0d2419]/80 rounded-2xl p-1.5 border border-[rgba(212,175,55,0.15)] overflow-x-auto">
        {[
          { key: 'all' as const, label: 'All History' },
          { key: 'deposit' as const, label: 'Deposits' },
          { key: 'withdrawal' as const, label: 'Withdrawals' },
          {
            key: 'requests' as const,
            label: `Payment Requests${pendingUserRequests.length > 0 ? ` (${pendingUserRequests.length})` : ''}`,
          },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-black transition-all cursor-pointer whitespace-nowrap ${
              activeTab === tab.key
                ? 'bg-[rgba(212,175,55,0.18)] text-gold border border-[rgba(212,175,55,0.45)] shadow-[0_0_12px_rgba(212,175,55,0.2)]'
                : 'text-[rgba(212,175,55,0.5)] hover:text-[#E8C97A] border border-transparent'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'requests' ? (
        /* Requests View */
        <div className="space-y-3">
          {userRequests.length === 0 ? (
            <EmptyState
              title="No Payment Requests"
              description="You haven't submitted any deposit or withdrawal requests yet."
              actionText="Make a Deposit Request →"
              actionLink="/wallet"
              iconType="wallet"
            />
          ) : (
            userRequests.map((req, i) => (
              <motion.div
                key={req.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
                className="royal-panel rounded-2xl p-4 space-y-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                        req.type === 'deposit'
                          ? 'bg-emerald-500/10 border border-emerald-500/30'
                          : 'bg-rose-500/10 border border-rose-500/30'
                      }`}
                    >
                      {req.type === 'deposit' ? (
                        <ArrowDownLeft className="w-5 h-5 text-emerald-400" />
                      ) : (
                        <ArrowUpRight className="w-5 h-5 text-rose-400" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-xs font-bold text-[#F5F1E6] capitalize">
                          {req.type} Request (Demo Flow)
                        </p>
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-[rgba(212,175,55,0.1)] text-gold font-mono">
                          {req.id}
                        </span>
                      </div>
                      <p className="text-[11px] text-[rgba(212,175,55,0.6)] flex items-center gap-1 mt-0.5">
                        <Phone className="w-3 h-3" /> {req.whatsappNumber}
                      </p>
                    </div>
                  </div>

                  <div className="text-right flex-shrink-0">
                    <p
                      className={`text-base font-black font-heading tabular-nums ${
                        req.type === 'deposit' ? 'text-emerald-400' : 'text-rose-400'
                      }`}
                    >
                      ₹{req.amount.toLocaleString('en-IN')}
                    </p>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full inline-block mt-1 ${STATUS_BADGE[req.status] || ''}`}>
                      {req.status === 'pending' ? '⏳ Pending Approval' : req.status === 'approved' ? '✓ Approved' : '✕ Rejected'}
                    </span>
                  </div>
                </div>

                {/* Account Details if withdrawal */}
                {req.accountDetails && (
                  <div className="bg-[#061510] border border-[rgba(212,175,55,0.12)] rounded-xl p-2.5 text-[11px] text-[rgba(212,175,55,0.7)]">
                    <span className="font-bold text-[#E8C97A]">Payout Destination:</span> {req.accountDetails.label}
                    {req.accountDetails.type === 'bank' && (
                      <span className="block text-[10px] text-[rgba(212,175,55,0.5)]">
                        IFSC: {req.accountDetails.ifscCode} | A/C: {req.accountDetails.accountNumber}
                      </span>
                    )}
                  </div>
                )}

                {/* Rejection Reason notice if rejected */}
                {req.status === 'rejected' && req.rejectionReason && (
                  <div className="bg-rose-500/10 border border-rose-500/25 rounded-xl p-2.5 text-[11px] text-rose-300 flex items-start gap-2">
                    <XCircle className="w-4 h-4 flex-shrink-0 text-rose-400 mt-0.5" />
                    <div>
                      <span className="font-bold">Declined by Admin:</span> {req.rejectionReason}
                      {req.type === 'withdrawal' && <span className="block text-[10px] text-emerald-400 mt-0.5">Funds have been refunded to your active balance.</span>}
                    </div>
                  </div>
                )}

                {/* Approved notice if approved */}
                {req.status === 'approved' && (
                  <div className="bg-emerald-500/10 border border-emerald-500/25 rounded-xl p-2 text-[11px] text-emerald-300 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-emerald-400" />
                    <span>
                      {req.type === 'deposit' ? 'Funds successfully credited to your wallet balance.' : 'Funds disbursed to your destination account.'}
                    </span>
                  </div>
                )}

                <div className="flex items-center justify-between text-[10px] text-[rgba(212,175,55,0.4)] pt-1 border-t border-[rgba(212,175,55,0.08)]">
                  <span>Created: {getTimeAgo(req.createdAt)}</span>
                  {req.resolvedAt && <span>Resolved: {getTimeAgo(req.resolvedAt)}</span>}
                </div>
              </motion.div>
            ))
          )}
        </div>
      ) : (
        /* Regular Transaction List */
        <div className="space-y-2.5">
          {filteredTransactions.length === 0 ? (
            <EmptyState
              title="No Transactions Found"
              description="You haven't performed any wallet deposits or withdrawals in this view."
              actionText="Deposit Funds Now →"
              actionLink="/wallet"
              iconType="wallet"
            />
          ) : (
            filteredTransactions.map((tx, i) => (
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
                  <p
                    className={`text-sm font-black font-heading tabular-nums ${
                      tx.type === 'deposit' || tx.type === 'win' || tx.type === 'bonus' ? 'text-[#2ECC71]' : 'text-[#FF4D6D]'
                    }`}
                  >
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
      )}

      {/* Deposit Modal */}
      <Modal isOpen={showDeposit} onClose={() => setShowDeposit(false)} title="Deposit Funds">
        <div className="space-y-4 text-xs">
          {/* Mode Switcher */}
          <div className="grid grid-cols-2 gap-1.5 bg-[#061510] p-1 rounded-xl border border-[rgba(212,175,55,0.15)]">
            <button
              onClick={() => setDepositMode('request')}
              className={`py-2 rounded-lg font-bold transition-all text-xs cursor-pointer flex items-center justify-center gap-1.5 ${
                depositMode === 'request'
                  ? 'btn-royal-gold text-[#0B2318]'
                  : 'text-[rgba(212,175,55,0.5)] hover:text-[#E8C97A]'
              }`}
            >
              <Phone className="w-3.5 h-3.5" /> Request Deposit (Demo)
            </button>
            <button
              onClick={() => setDepositMode('instant')}
              className={`py-2 rounded-lg font-bold transition-all text-xs cursor-pointer flex items-center justify-center gap-1.5 ${
                depositMode === 'instant'
                  ? 'btn-royal-gold text-[#0B2318]'
                  : 'text-[rgba(212,175,55,0.5)] hover:text-[#E8C97A]'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" /> Instant Demo Credit
            </button>
          </div>

          {/* Preset Amounts */}
          <div>
            <label className="block text-[rgba(212,175,55,0.7)] mb-1.5 font-bold">Select Amount (₹)</label>
            <div className="grid grid-cols-4 gap-2">
              {[100, 500, 1000, 2000].map(amt => (
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
            placeholder="500"
          />

          {depositMode === 'request' && (
            <Input
              label="WhatsApp / Contact Number"
              type="text"
              value={depositWhatsApp}
              onChange={e => setDepositWhatsApp(e.target.value)}
              placeholder="+91 98765 43210"
              icon={<Phone className="w-4 h-4 text-gold" />}
            />
          )}

          {/* Demo Note */}
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-2.5 text-[11px] text-[rgba(212,175,55,0.8)]">
            <span className="font-bold text-amber-300">ℹ️ Note: </span>
            {depositMode === 'request'
              ? 'Demo flow — Submitting creates a pending request. Balance is credited after admin approval in Admin Panel.'
              : 'Instant demo credit mode adds balance directly for rapid testing.'}
          </div>

          <button
            onClick={depositMode === 'request' ? handleSubmitDepositRequest : handleInstantDeposit}
            className="btn-royal-gold w-full py-3 rounded-xl font-black cursor-pointer text-xs flex items-center justify-center gap-2"
          >
            {depositMode === 'request' ? (
              <>
                <Phone className="w-4 h-4" /> Submit Deposit Request (₹{depositAmount})
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" /> Instant Credit (₹{depositAmount})
              </>
            )}
          </button>

          {/* Promo Code section */}
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
                value={selectedAccountId || defaultAccount?.id || accounts[0]?.id}
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
            <p className="text-[10px] text-[rgba(212,175,55,0.4)] mt-1">Available balance: ₹{balance.toFixed(2)}</p>
          </div>

          <Input
            label="WhatsApp / Contact Number"
            type="text"
            value={withdrawWhatsApp}
            onChange={e => setWithdrawWhatsApp(e.target.value)}
            placeholder="+91 98765 43210"
            icon={<Phone className="w-4 h-4 text-gold" />}
          />

          {/* Held Balance notice */}
          <div className="bg-amber-500/10 border border-amber-500/25 rounded-xl p-2.5 text-[11px] text-[rgba(212,175,55,0.8)]">
            <span className="font-bold text-amber-300">🔒 Held Balance: </span>
            The requested amount (₹{withdrawAmount || '0'}) will be locked from your balance while pending review. If rejected by admin, it is instantly refunded.
          </div>

          <button
            onClick={handleSubmitWithdrawalRequest}
            disabled={accounts.length === 0}
            className="w-full py-3 rounded-xl font-black text-[#E8C97A] text-xs bg-[rgba(212,175,55,0.08)] border border-[rgba(212,175,55,0.25)] hover:bg-[rgba(212,175,55,0.15)] transition-all cursor-pointer disabled:opacity-40 flex items-center justify-center gap-2"
          >
            <ArrowUpRight className="w-4 h-4" /> Submit Withdrawal Request
          </button>
          <p className="text-[10px] text-[rgba(212,175,55,0.4)] text-center">
            Demo flow — for presentation purposes. Admin processes request in Admin Panel.
          </p>
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
              To protect our users and comply with regulations, KYC verification is required before you can withdraw funds.
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
            <button
              onClick={() => setShowKYCGate(false)}
              className="w-full py-2 text-[rgba(212,175,55,0.4)] hover:text-[#E8C97A] transition-colors cursor-pointer"
            >
              Maybe later
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
