import { useState } from 'react';
import {
  Wallet,
  ArrowDownLeft,
  ArrowUpRight,
  Copy,
  Check,
  Building,
  Smartphone,
  Coins,
  Sparkles,
  Tag,
} from 'lucide-react';
import WalletCard from '../../components/shared/WalletCard';
import Modal from '../../components/ui/Modal';
import { useWallet } from '../../store/WalletContext';
import { useAuth } from '../../store/AuthContext';
import { usePromo } from '../../store/PromoContext';
import { useToast } from '../../components/ui/Toast';
import { usePaymentRequests } from '../../store/PaymentRequestsContext';
import { getGatewaySettings, type GatewaySettings } from '../../lib/gatewaySettings';

type DepositChannel = 'upi' | 'bank' | 'crypto';
type WithdrawChannel = 'bank' | 'upi' | 'crypto';

export default function WalletPage() {
  const { balance, transactions, deposit, withdraw, addBalance } = useWallet();
  const { user } = useAuth();
  const { redeemCode } = usePromo();
  const { addToast } = useToast();
  const { createDepositRequest, createWithdrawalRequest } = usePaymentRequests();
  const [gateway, setGateway] = useState<GatewaySettings>(getGatewaySettings());

  // Listen for admin gateway updates
  useState(() => {
    const handler = () => setGateway(getGatewaySettings());
    window.addEventListener('gateway_settings_updated', handler);
    return () => window.removeEventListener('gateway_settings_updated', handler);
  });

  const [activeTab, setActiveTab] = useState<'transactions' | 'deposits' | 'withdrawals'>('transactions');
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);

  // Deposit Form State
  const [depositChannel, setDepositChannel] = useState<DepositChannel>('upi');
  const [depositAmount, setDepositAmount] = useState<string>('1000');
  const [utrNumber, setUtrNumber] = useState<string>('');
  const [selectedBonus, setSelectedBonus] = useState<number>(10); // 10% bonus
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Withdrawal Form State
  const [withdrawChannel, setWithdrawChannel] = useState<WithdrawChannel>('bank');
  const [withdrawAmount, setWithdrawAmount] = useState<string>('1000');
  const [bankAccountNumber, setBankAccountNumber] = useState<string>('');
  const [bankIfsc, setBankIfsc] = useState<string>('');
  const [bankHolderName, setBankHolderName] = useState<string>(user?.name || '');
  const [upiVpa, setUpiVpa] = useState<string>('');
  const [cryptoAddress, setCryptoAddress] = useState<string>('');

  // Promo Code State
  const [promoCode, setPromoCode] = useState<string>('');

  const copyToClipboard = (text: string, fieldName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    addToast({ type: 'info', title: 'Copied to Clipboard', message: text });
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleDepositSubmit = () => {
    const amt = parseFloat(depositAmount);
    if (isNaN(amt) || amt < 100) {
      addToast({ type: 'error', title: 'Minimum Deposit', message: 'Minimum deposit amount is ₹100.' });
      return;
    }

    if (!utrNumber.trim() || utrNumber.trim().length < 8) {
      addToast({ type: 'error', title: 'UTR / Ref Required', message: 'Please enter a valid 12-digit UTR or Transaction Hash.' });
      return;
    }

    const bonusAmount = Math.floor(amt * (selectedBonus / 100));

    createDepositRequest({
      userId: user?.id || 'usr_demo',
      userName: user?.name || 'Player',
      userEmail: user?.email || 'player@biscowin.com',
      amount: amt,
      whatsappNumber: utrNumber.trim(),
    });

    deposit(amt);
    if (bonusAmount > 0) {
      addBalance(bonusAmount, `VIP Deposit Bonus (${selectedBonus}%)`, 'bonus');
    }

    addToast({
      type: 'success',
      title: 'Deposit Received!',
      message: `₹${amt.toLocaleString('en-IN')} (+₹${bonusAmount} Bonus) credited to your balance.`,
    });

    setShowDepositModal(false);
    setUtrNumber('');
  };

  const handleWithdrawSubmit = () => {
    const amt = parseFloat(withdrawAmount);
    if (isNaN(amt) || amt < 500) {
      addToast({ type: 'error', title: 'Minimum Withdrawal', message: 'Minimum withdrawal amount is ₹500.' });
      return;
    }

    if (amt > balance) {
      addToast({ type: 'error', title: 'Insufficient Funds', message: 'Withdrawal amount exceeds your withdrawable balance.' });
      return;
    }

    if (withdrawChannel === 'bank' && (!bankAccountNumber.trim() || !bankIfsc.trim())) {
      addToast({ type: 'error', title: 'Bank Details Required', message: 'Please enter your Account Number and IFSC Code.' });
      return;
    }

    if (withdrawChannel === 'upi' && !upiVpa.includes('@')) {
      addToast({ type: 'error', title: 'Invalid UPI ID', message: 'Please enter a valid UPI VPA (e.g. name@okhdfcbank).' });
      return;
    }

    if (withdrawChannel === 'crypto' && cryptoAddress.trim().length < 20) {
      addToast({ type: 'error', title: 'Invalid Crypto Address', message: 'Please enter a valid USDT TRC20 wallet address.' });
      return;
    }

    if (withdraw(amt, `Withdrawal to ${withdrawChannel.toUpperCase()}`)) {
      createWithdrawalRequest({
        userId: user?.id || 'usr_demo',
        userName: user?.name || 'Player',
        userEmail: user?.email || 'player@biscowin.com',
        amount: amt,
        whatsappNumber: user?.phone || '9876543210',
        accountDetails: {
          type: withdrawChannel === 'bank' ? 'bank' : 'upi',
          accountHolder: bankHolderName || user?.name || 'Player',
          accountNumber: bankAccountNumber,
          ifscCode: bankIfsc,
          upiId: upiVpa,
        },
      });

      addToast({
        type: 'success',
        title: 'Withdrawal Submitted',
        message: `₹${amt.toLocaleString('en-IN')} payout is processing (24/7 Instant IMPS / TRC20).`,
      });

      setShowWithdrawModal(false);
    }
  };

  const handleRedeemPromo = () => {
    if (!promoCode.trim()) return;
    const res = redeemCode(promoCode, user?.id || 'usr_demo', user?.name || 'Player');
    if (res.success && res.amount) {
      addBalance(res.amount, `Promo Code: ${promoCode.toUpperCase()}`, 'deposit');
      addToast({ type: 'success', title: 'Promo Code Applied!', message: `₹${res.amount} credited instantly!` });
      setPromoCode('');
    } else {
      addToast({ type: 'error', title: 'Invalid Promo Code', message: res.message || 'Code is expired or already redeemed.' });
    }
  };

  return (
    <div className="py-4 space-y-6 w-full max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white font-heading tracking-tight flex items-center gap-2">
            <span>Royal Treasury & Banking</span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              PLAYARENA 24/7 GATEWAY
            </span>
          </h1>
          <p className="text-xs text-slate-400">Instant UPI Express • Bank IMPS • USDT TRC20 / BEP20 Crypto</p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setShowDepositModal(true)}
            className="btn-royal-gold px-5 py-2.5 rounded-2xl text-xs font-black uppercase tracking-wider flex items-center gap-2 shadow-lg"
          >
            <ArrowDownLeft className="w-4 h-4" />
            <span>Deposit Cash</span>
          </button>
          <button
            onClick={() => setShowWithdrawModal(true)}
            className="px-5 py-2.5 rounded-2xl text-xs font-black uppercase tracking-wider bg-slate-900 border border-gold/40 text-gold hover:bg-gold/15 transition-all shadow-md flex items-center gap-2 cursor-pointer"
          >
            <ArrowUpRight className="w-4 h-4" />
            <span>Withdraw</span>
          </button>
        </div>
      </div>

      {/* Hero Balance Card */}
      <WalletCard onDeposit={() => setShowDepositModal(true)} onWithdraw={() => setShowWithdrawModal(true)} />

      {/* Promo Code Redemption Pill */}
      <div className="royal-panel rounded-3xl p-4 sm:p-5 border border-gold/20 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
            <Tag className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-xs sm:text-sm font-bold text-white">Have a VIP Promo Voucher?</h4>
            <p className="text-[11px] text-slate-400">Redeem exclusive deposit coupons, reload bonuses, and free cash drops.</p>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <input
            type="text"
            placeholder="ENTER CODE (e.g. ROYAL100)"
            value={promoCode}
            onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
            className="bg-slate-950 border border-white/15 rounded-xl px-3.5 py-2 text-xs text-white uppercase font-mono placeholder:text-slate-600 focus:outline-none focus:border-gold w-full sm:w-48"
          />
          <button
            onClick={handleRedeemPromo}
            className="btn-royal-gold px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider shrink-0 cursor-pointer"
          >
            Redeem
          </button>
        </div>
      </div>

      {/* Transactions & Ledgers Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 p-1 bg-slate-900/90 rounded-2xl border border-white/10">
            {[
              { id: 'transactions', label: 'All Transactions' },
              { id: 'deposits', label: 'Deposits 💰' },
              { id: 'withdrawals', label: 'Withdrawals ⚡' },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeTab === tab.id
                    ? 'btn-royal-gold shadow-md font-heading'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <span className="text-xs text-slate-500 font-mono">
            {transactions.length} total entries
          </span>
        </div>

        {/* Transactions Table */}
        {transactions.length === 0 ? (
          <div className="royal-panel rounded-3xl p-10 text-center border border-white/5 space-y-2">
            <Wallet className="w-10 h-10 text-slate-600 mx-auto" />
            <h4 className="text-sm font-bold text-slate-300">No Transactions Yet</h4>
            <p className="text-xs text-slate-500">Make your first deposit to get started with instant gaming funds.</p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-3xl border border-gold/15 bg-slate-950/70 scrollbar-thin shadow-xl">
            <table className="w-full text-left text-xs border-collapse min-w-[650px]">
              <thead>
                <tr className="border-b border-white/10 bg-slate-900/80 text-slate-400 font-mono text-[10px] uppercase">
                  <th className="py-3 px-4">Transaction ID</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Description</th>
                  <th className="py-3 px-4 text-right">Amount (₹)</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Date & Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {transactions
                  .filter(t => {
                    if (activeTab === 'deposits') return t.type === 'deposit' || t.type === 'bonus';
                    if (activeTab === 'withdrawals') return t.type === 'withdrawal';
                    return true;
                  })
                  .map(t => {
                    const isCredit = t.type === 'deposit' || t.type === 'win' || t.type === 'bonus';
                    return (
                      <tr key={t.id} className="hover:bg-white/[0.02] font-mono text-xs transition-colors">
                        <td className="py-3 px-4 text-amber-400 font-bold">
                          {t.id.slice(0, 14)}...
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                              t.type === 'deposit'
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                : t.type === 'withdrawal'
                                ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                                : t.type === 'bonus'
                                ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                                : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                            }`}
                          >
                            {t.type}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-300 font-sans">
                          {t.description}
                        </td>
                        <td className={`py-3 px-4 text-right font-black ${isCredit ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {isCredit ? `+₹${t.amount.toLocaleString('en-IN')}` : `-₹${t.amount.toLocaleString('en-IN')}`}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-bold uppercase">
                            COMPLETED
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right text-slate-500 text-[11px]">
                          {new Date(t.createdAt).toLocaleString()}
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ──────────────────────────────────────────────────────────
          BISCOWIN-STYLE DEPOSIT MODAL
      ────────────────────────────────────────────────────────── */}
      <Modal isOpen={showDepositModal} onClose={() => setShowDepositModal(false)} title="🪙 Instant Deposit Portal">
        <div className="space-y-4 text-xs">
          
          {/* Channel Selector */}
          <div>
            <label className="text-slate-400 font-bold mb-1.5 block">Select Deposit Gateway</label>
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => setDepositChannel('upi')}
                className={`py-3 rounded-2xl font-bold flex flex-col items-center gap-1 transition-all cursor-pointer border ${
                  depositChannel === 'upi'
                    ? 'btn-royal-gold shadow-md'
                    : 'bg-slate-900 text-slate-400 border-white/10 hover:text-white'
                }`}
              >
                <Smartphone className="w-4 h-4" />
                <span>UPI Express</span>
              </button>

              <button
                onClick={() => setDepositChannel('bank')}
                className={`py-3 rounded-2xl font-bold flex flex-col items-center gap-1 transition-all cursor-pointer border ${
                  depositChannel === 'bank'
                    ? 'btn-royal-gold shadow-md'
                    : 'bg-slate-900 text-slate-400 border-white/10 hover:text-white'
                }`}
              >
                <Building className="w-4 h-4" />
                <span>Bank IMPS</span>
              </button>

              <button
                onClick={() => setDepositChannel('crypto')}
                className={`py-3 rounded-2xl font-bold flex flex-col items-center gap-1 transition-all cursor-pointer border ${
                  depositChannel === 'crypto'
                    ? 'btn-royal-gold shadow-md'
                    : 'bg-slate-900 text-slate-400 border-white/10 hover:text-white'
                }`}
              >
                <Coins className="w-4 h-4" />
                <span>USDT Crypto</span>
              </button>
            </div>
          </div>

          {/* Quick Amounts */}
          <div>
            <label className="text-slate-400 font-bold mb-1.5 block">Deposit Amount (₹)</label>
            <div className="grid grid-cols-5 gap-1.5">
              {['500', '1000', '2500', '5000', '10000'].map(amt => (
                <button
                  key={amt}
                  onClick={() => setDepositAmount(amt)}
                  className={`py-2 rounded-xl text-xs font-bold font-mono cursor-pointer transition-all ${
                    depositAmount === amt
                      ? 'bg-gold text-black shadow-md'
                      : 'bg-slate-900 text-slate-400 border border-white/10 hover:text-white'
                  }`}
                >
                  ₹{amt}
                </button>
              ))}
            </div>
          </div>

          {/* Bonus Booster Selection */}
          <div className="space-y-2">
            <label className="text-slate-400 font-bold mb-1 block">VIP Deposit Boost Reward</label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { pct: 5, label: '+5% Bronze' },
                { pct: 10, label: '+10% Silver VIP' },
                { pct: 20, label: '+20% Gold Elite' },
              ].map(b => (
                <button
                  key={b.pct}
                  type="button"
                  onClick={() => setSelectedBonus(b.pct)}
                  className={`py-2 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                    selectedBonus === b.pct
                      ? 'bg-amber-500/25 text-gold border-gold shadow'
                      : 'bg-slate-900 text-slate-400 border-white/10'
                  }`}
                >
                  {b.label}
                </button>
              ))}
            </div>
            <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-400" />
                <span className="text-[11px] text-amber-300 font-bold">Extra Bonus Credited:</span>
              </div>
              <span className="text-xs font-mono font-black text-emerald-400">
                +₹{Math.floor(parseFloat(depositAmount || '0') * (selectedBonus / 100))} FREE
              </span>
            </div>
          </div>

          {/* Gateway-Specific Details */}
          {depositChannel === 'upi' && (
            <div className="p-4 rounded-2xl bg-slate-950 border border-gold/30 space-y-4">
              <div className="flex flex-col sm:flex-row items-center gap-4">
                {/* Dynamic QR Code */}
                <div className="p-2 rounded-xl bg-white flex flex-col items-center shrink-0 shadow-lg">
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=140x140&data=${encodeURIComponent(
                      `upi://pay?pa=${gateway.upiId}&pn=${encodeURIComponent(gateway.merchantName)}&am=${depositAmount}&cu=INR`
                    )}`}
                    alt="Scan UPI QR"
                    className="w-28 h-28 sm:w-32 sm:h-32 object-contain"
                  />
                  <span className="text-[9px] font-bold text-black mt-1 font-mono">SCAN TO PAY ₹{depositAmount}</span>
                </div>

                <div className="flex-1 space-y-2.5 text-center sm:text-left">
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-bold">Official Merchant UPI ID</span>
                    <p className="text-sm font-mono font-black text-gold break-all">{gateway.upiId}</p>
                  </div>

                  <button
                    type="button"
                    onClick={() => copyToClipboard(gateway.upiId, 'upi')}
                    className="px-3.5 py-1.5 rounded-xl bg-slate-900 border border-gold/40 hover:bg-gold/20 text-gold text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer shadow"
                  >
                    {copiedField === 'upi' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedField === 'upi' ? 'Copied UPI ID!' : 'Copy UPI ID'}</span>
                  </button>

                  <p className="text-[11px] text-slate-400">
                    Scan the QR or copy the UPI ID above in PhonePe / Google Pay / Paytm.
                  </p>
                </div>
              </div>
            </div>
          )}

          {depositChannel === 'bank' && (
            <div className="p-4 rounded-2xl bg-slate-950 border border-gold/30 space-y-2.5 font-mono text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Bank Name:</span>
                <span className="text-white font-bold">{gateway.bankName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Account Name:</span>
                <span className="text-white font-bold">{gateway.accountHolder}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Account Number:</span>
                <div className="flex items-center gap-1.5">
                  <span className="text-gold font-bold">{gateway.accountNumber}</span>
                  <button onClick={() => copyToClipboard(gateway.accountNumber, 'acc')} className="p-1 text-gold cursor-pointer">
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">IFSC Code:</span>
                <div className="flex items-center gap-1.5">
                  <span className="text-gold font-bold">{gateway.ifscCode}</span>
                  <button onClick={() => copyToClipboard(gateway.ifscCode, 'ifsc')} className="p-1 text-gold cursor-pointer">
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {depositChannel === 'crypto' && (
            <div className="p-4 rounded-2xl bg-slate-950 border border-emerald-500/30 space-y-2.5">
              <div className="flex justify-between text-xs">
                <span className="text-slate-400">Network:</span>
                <span className="text-emerald-400 font-bold font-mono">USDT (TRC-20)</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-400">Rate:</span>
                <span className="text-white font-mono">1 USDT = ₹{gateway.usdtRateInr.toFixed(2)}</span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-900 border border-white/10 flex items-center justify-between">
                <span className="text-[11px] font-mono text-gold truncate max-w-[240px]">
                  {gateway.usdtTrc20Address}
                </span>
                <button
                  type="button"
                  onClick={() => copyToClipboard(gateway.usdtTrc20Address, 'trc20')}
                  className="p-1.5 text-gold hover:text-white cursor-pointer"
                >
                  <Copy className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

          {/* UTR / Ref Number Input */}
          <div>
            <label className="text-slate-400 font-bold mb-1.5 block">12-Digit UTR / Transaction Hash Reference</label>
            <input
              type="text"
              placeholder="Enter 12-digit UTR ref from your payment app"
              value={utrNumber}
              onChange={(e) => setUtrNumber(e.target.value)}
              className="w-full bg-slate-950 border border-white/15 rounded-xl px-3.5 py-2.5 text-xs text-white font-mono placeholder:text-slate-600 focus:outline-none focus:border-gold"
            />
          </div>

          <button
            onClick={handleDepositSubmit}
            className="btn-royal-gold w-full py-3.5 rounded-2xl font-black text-xs uppercase tracking-wider shadow-xl cursor-pointer"
          >
            Submit Deposit & Verify (₹{depositAmount})
          </button>
        </div>
      </Modal>

      {/* ──────────────────────────────────────────────────────────
          BISCOWIN-STYLE WITHDRAWAL MODAL
      ────────────────────────────────────────────────────────── */}
      <Modal isOpen={showWithdrawModal} onClose={() => setShowWithdrawModal(false)} title="⚡ 24/7 Instant Payout Portal">
        <div className="space-y-4 text-xs">
          
          {/* Channel Selector */}
          <div>
            <label className="text-slate-400 font-bold mb-1.5 block">Select Payout Channel</label>
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => setWithdrawChannel('bank')}
                className={`py-3 rounded-2xl font-bold flex flex-col items-center gap-1 transition-all cursor-pointer border ${
                  withdrawChannel === 'bank'
                    ? 'btn-royal-gold shadow-md'
                    : 'bg-slate-900 text-slate-400 border-white/10 hover:text-white'
                }`}
              >
                <Building className="w-4 h-4" />
                <span>Bank IMPS</span>
              </button>

              <button
                onClick={() => setWithdrawChannel('upi')}
                className={`py-3 rounded-2xl font-bold flex flex-col items-center gap-1 transition-all cursor-pointer border ${
                  withdrawChannel === 'upi'
                    ? 'btn-royal-gold shadow-md'
                    : 'bg-slate-900 text-slate-400 border-white/10 hover:text-white'
                }`}
              >
                <Smartphone className="w-4 h-4" />
                <span>UPI Transfer</span>
              </button>

              <button
                onClick={() => setWithdrawChannel('crypto')}
                className={`py-3 rounded-2xl font-bold flex flex-col items-center gap-1 transition-all cursor-pointer border ${
                  withdrawChannel === 'crypto'
                    ? 'btn-royal-gold shadow-md'
                    : 'bg-slate-900 text-slate-400 border-white/10 hover:text-white'
                }`}
              >
                <Coins className="w-4 h-4" />
                <span>USDT TRC20</span>
              </button>
            </div>
          </div>

          {/* Amount */}
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="text-slate-400 font-bold">Withdrawal Amount (₹)</label>
              <span className="text-slate-500 text-[10px]">Available: ₹{balance.toFixed(2)}</span>
            </div>
            <input
              type="number"
              value={withdrawAmount}
              onChange={(e) => setWithdrawAmount(e.target.value)}
              className="w-full bg-slate-950 border border-white/15 rounded-xl px-3.5 py-2.5 text-xs text-white font-mono focus:outline-none focus:border-gold"
            />
          </div>

          {/* Channel Form */}
          {withdrawChannel === 'bank' && (
            <div className="space-y-2.5">
              <div>
                <label className="text-slate-400 block mb-1">Account Holder Full Name</label>
                <input
                  type="text"
                  value={bankHolderName}
                  onChange={(e) => setBankHolderName(e.target.value)}
                  placeholder="As per bank passbook"
                  className="w-full bg-slate-950 border border-white/15 rounded-xl px-3.5 py-2 text-xs text-white"
                />
              </div>
              <div>
                <label className="text-slate-400 block mb-1">Bank Account Number</label>
                <input
                  type="text"
                  value={bankAccountNumber}
                  onChange={(e) => setBankAccountNumber(e.target.value)}
                  placeholder="Enter full bank account number"
                  className="w-full bg-slate-950 border border-white/15 rounded-xl px-3.5 py-2 text-xs text-white font-mono"
                />
              </div>
              <div>
                <label className="text-slate-400 block mb-1">Bank IFSC Code</label>
                <input
                  type="text"
                  value={bankIfsc}
                  onChange={(e) => setBankIfsc(e.target.value.toUpperCase())}
                  placeholder="e.g. HDFC0001234"
                  className="w-full bg-slate-950 border border-white/15 rounded-xl px-3.5 py-2 text-xs text-white uppercase font-mono"
                />
              </div>
            </div>
          )}

          {withdrawChannel === 'upi' && (
            <div>
              <label className="text-slate-400 block mb-1">Your UPI VPA ID</label>
              <input
                type="text"
                value={upiVpa}
                onChange={(e) => setUpiVpa(e.target.value)}
                placeholder="e.g. yourname@okhdfcbank"
                className="w-full bg-slate-950 border border-white/15 rounded-xl px-3.5 py-2.5 text-xs text-white font-mono"
              />
            </div>
          )}

          {withdrawChannel === 'crypto' && (
            <div>
              <label className="text-slate-400 block mb-1">USDT (TRC-20) Payout Address</label>
              <input
                type="text"
                value={cryptoAddress}
                onChange={(e) => setCryptoAddress(e.target.value)}
                placeholder="T..."
                className="w-full bg-slate-950 border border-white/15 rounded-xl px-3.5 py-2.5 text-xs text-white font-mono"
              />
            </div>
          )}

          <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-[11px] text-emerald-300">
            ✓ 0% Processing Fee • Instant 24/7 Automated Dispatch
          </div>

          <button
            onClick={handleWithdrawSubmit}
            className="btn-royal-gold w-full py-3.5 rounded-2xl font-black text-xs uppercase tracking-wider shadow-xl cursor-pointer"
          >
            Confirm Withdrawal (₹{withdrawAmount})
          </button>
        </div>
      </Modal>
    </div>
  );
}
