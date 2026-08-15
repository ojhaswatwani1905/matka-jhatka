import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowDownLeft,
  ArrowUpRight,
  CheckCircle2,
  Clock,
  Search,
  Filter,
  Phone,
  CreditCard,
  Building2,
  Smartphone,
  Info,
  Check,
  X,
  AlertTriangle,
} from 'lucide-react';
import { usePaymentRequests } from '../../store/PaymentRequestsContext';
import { useToast } from '../../components/ui/Toast';
import Modal from '../../components/ui/Modal';
import { getTimeAgo } from '../../lib/utils';
import type { PaymentRequest, PaymentRequestStatus } from '../../types';

export default function AdminRequestsPage() {
  const { requests, approveRequest, rejectRequest, pendingDepositCount, pendingWithdrawalCount } = usePaymentRequests();
  const { addToast } = useToast();

  const [activeTab, setActiveTab] = useState<'deposit' | 'withdrawal' | 'all'>('deposit');
  const [statusFilter, setStatusFilter] = useState<PaymentRequestStatus | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Rejection modal state
  const [rejectingReq, setRejectingReq] = useState<PaymentRequest | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  // Stats
  const stats = useMemo(() => {
    const pendingDeposits = requests.filter(r => r.type === 'deposit' && r.status === 'pending');
    const pendingWithdrawals = requests.filter(r => r.type === 'withdrawal' && r.status === 'pending');
    const approvedRequests = requests.filter(r => r.status === 'approved');

    const pendingDepositVol = pendingDeposits.reduce((acc, r) => acc + r.amount, 0);
    const pendingWithdrawalVol = pendingWithdrawals.reduce((acc, r) => acc + r.amount, 0);
    const approvedVol = approvedRequests.reduce((acc, r) => acc + r.amount, 0);

    return {
      pendingDepositCount: pendingDeposits.length,
      pendingDepositVol,
      pendingWithdrawalCount: pendingWithdrawals.length,
      pendingWithdrawalVol,
      approvedCount: approvedRequests.length,
      approvedVol,
    };
  }, [requests]);

  // Filtered requests
  const filteredRequests = useMemo(() => {
    return requests.filter(r => {
      const matchType = activeTab === 'all' || r.type === activeTab;
      const matchStatus = statusFilter === 'all' || r.status === statusFilter;
      const q = searchQuery.toLowerCase().trim();
      const matchQuery =
        !q ||
        r.userName.toLowerCase().includes(q) ||
        r.userEmail.toLowerCase().includes(q) ||
        r.whatsappNumber.toLowerCase().includes(q) ||
        r.id.toLowerCase().includes(q) ||
        (r.accountDetails?.accountHolder && r.accountDetails.accountHolder.toLowerCase().includes(q)) ||
        (r.accountDetails?.bankName && r.accountDetails.bankName.toLowerCase().includes(q)) ||
        (r.accountDetails?.upiId && r.accountDetails.upiId.toLowerCase().includes(q));

      return matchType && matchStatus && matchQuery;
    });
  }, [requests, activeTab, statusFilter, searchQuery]);

  const handleApprove = (req: PaymentRequest) => {
    const ok = approveRequest(req.id, 'Admin');
    if (ok) {
      addToast({
        type: 'success',
        title: `${req.type === 'deposit' ? 'Deposit' : 'Withdrawal'} Approved`,
        message: `Request for ₹${req.amount.toLocaleString('en-IN')} (${req.userName}) approved successfully.`,
      });
    }
  };

  const handleOpenRejectModal = (req: PaymentRequest) => {
    setRejectingReq(req);
    setRejectionReason(
      req.type === 'deposit'
        ? 'Payment screenshot / reference not verified.'
        : 'Bank account name does not match KYC verification.'
    );
  };

  const handleConfirmReject = () => {
    if (!rejectingReq) return;
    if (!rejectionReason.trim()) {
      addToast({ type: 'warning', title: 'Reason Required', message: 'Please enter a rejection reason.' });
      return;
    }

    const ok = rejectRequest(rejectingReq.id, rejectionReason.trim(), 'Admin');
    if (ok) {
      addToast({
        type: 'warning',
        title: `${rejectingReq.type === 'deposit' ? 'Deposit' : 'Withdrawal'} Rejected`,
        message: `Request for ₹${rejectingReq.amount.toLocaleString('en-IN')} declined. User notified.`,
      });
      setRejectingReq(null);
      setRejectionReason('');
    }
  };

  return (
    <div className="space-y-5 max-w-6xl pt-4 pb-12">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-[#E8C97A] font-heading flex items-center gap-2.5">
            <CreditCard className="w-6 h-6 text-gold" /> Payment Requests Queue
          </h1>
          <p className="text-xs text-[rgba(212,175,55,0.5)] mt-1">
            Review, approve, and manage player deposit and withdrawal requests (Demo Flow)
          </p>
        </div>
      </div>

      {/* Demo Mode Banner */}
      <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-3.5 flex items-start gap-3">
        <Info className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
        <div className="text-xs">
          <p className="font-bold text-amber-300">Client Demo Simulation Flow</p>
          <p className="text-[rgba(212,175,55,0.8)] mt-0.5">
            Approving a <strong>Deposit Request</strong> instantly credits the player's wallet and creates a verified deposit record. Approving a <strong>Withdrawal Request</strong> finalizes the held funds deduction. Rejecting refunds held balances immediately.
          </p>
        </div>
      </div>

      {/* KPI Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="royal-panel rounded-2xl p-4 border border-emerald-500/25 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-emerald-400 flex items-center gap-1.5 uppercase">
              <ArrowDownLeft className="w-4 h-4" /> Pending Deposits
            </span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              {stats.pendingDepositCount} Queue
            </span>
          </div>
          <p className="text-2xl font-black text-[#F5F1E6] font-heading mt-2 tabular-nums">
            ₹{stats.pendingDepositVol.toLocaleString('en-IN')}
          </p>
          <p className="text-[10px] text-[rgba(212,175,55,0.5)] mt-1">Awaiting approval to credit user wallets</p>
        </div>

        <div className="royal-panel rounded-2xl p-4 border border-rose-500/25 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-rose-400 flex items-center gap-1.5 uppercase">
              <ArrowUpRight className="w-4 h-4" /> Pending Withdrawals
            </span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-500/20 text-rose-300 border border-rose-500/30">
              {stats.pendingWithdrawalCount} Queue
            </span>
          </div>
          <p className="text-2xl font-black text-[#F5F1E6] font-heading mt-2 tabular-nums">
            ₹{stats.pendingWithdrawalVol.toLocaleString('en-IN')}
          </p>
          <p className="text-[10px] text-[rgba(212,175,55,0.5)] mt-1">Currently held from active user balances</p>
        </div>

        <div className="royal-panel rounded-2xl p-4 border border-gold/25 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-gold flex items-center gap-1.5 uppercase">
              <CheckCircle2 className="w-4 h-4" /> Total Approved Volume
            </span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-gold/20 text-gold border border-gold/30">
              {stats.approvedCount} Settled
            </span>
          </div>
          <p className="text-2xl font-black text-gold font-heading mt-2 tabular-nums">
            ₹{stats.approvedVol.toLocaleString('en-IN')}
          </p>
          <p className="text-[10px] text-[rgba(212,175,55,0.5)] mt-1">Successfully processed demo transactions</p>
        </div>
      </div>

      {/* Main Controls: Type Tabs, Status Filter, Search */}
      <div className="space-y-3">
        {/* Type Tabs */}
        <div className="flex gap-2 border-b border-[rgba(212,175,55,0.15)] pb-3 overflow-x-auto">
          <button
            onClick={() => setActiveTab('deposit')}
            className={`px-4 py-2 rounded-xl text-xs font-black cursor-pointer transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'deposit'
                ? 'btn-royal-gold text-[#0B2318]'
                : 'bg-[#0d2419] text-[rgba(212,175,55,0.6)] hover:text-[#E8C97A] border border-[rgba(212,175,55,0.15)]'
            }`}
          >
            <ArrowDownLeft className="w-4 h-4 text-emerald-400" />
            Deposit Requests
            {pendingDepositCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-emerald-500 text-black font-black">
                {pendingDepositCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('withdrawal')}
            className={`px-4 py-2 rounded-xl text-xs font-black cursor-pointer transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'withdrawal'
                ? 'btn-royal-gold text-[#0B2318]'
                : 'bg-[#0d2419] text-[rgba(212,175,55,0.6)] hover:text-[#E8C97A] border border-[rgba(212,175,55,0.15)]'
            }`}
          >
            <ArrowUpRight className="w-4 h-4 text-rose-400" />
            Withdrawal Requests
            {pendingWithdrawalCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-rose-500 text-black font-black">
                {pendingWithdrawalCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('all')}
            className={`px-4 py-2 rounded-xl text-xs font-black cursor-pointer transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'all'
                ? 'btn-royal-gold text-[#0B2318]'
                : 'bg-[#0d2419] text-[rgba(212,175,55,0.6)] hover:text-[#E8C97A] border border-[rgba(212,175,55,0.15)]'
            }`}
          >
            All Requests History
          </button>
        </div>

        {/* Filter bar & Search */}
        <div className="flex flex-col md:flex-row gap-2.5 items-stretch md:items-center justify-between">
          {/* Status filters */}
          <div className="flex gap-1.5 items-center flex-wrap">
            <Filter className="w-4 h-4 text-[rgba(212,175,55,0.5)] flex-shrink-0" />
            {(['all', 'pending', 'approved', 'rejected'] as const).map(st => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold capitalize cursor-pointer transition-all ${
                  statusFilter === st
                    ? 'bg-[rgba(212,175,55,0.2)] text-gold border border-[rgba(212,175,55,0.5)]'
                    : 'bg-[#0d2419] border border-[rgba(212,175,55,0.15)] text-[rgba(212,175,55,0.5)] hover:text-[#E8C97A]'
                }`}
              >
                {st}
              </button>
            ))}
          </div>

          {/* Search Box */}
          <div className="relative min-w-[240px]">
            <Search className="w-3.5 h-3.5 text-[rgba(212,175,55,0.4)] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search by user, email, WhatsApp, or ID..."
              className="w-full bg-[#061510] border border-[rgba(212,175,55,0.2)] rounded-xl pl-9 pr-3 py-1.5 text-xs text-[#F5F1E6] placeholder-[rgba(212,175,55,0.3)] focus:outline-none focus:border-gold"
            />
          </div>
        </div>
      </div>

      {/* Requests List */}
      <div className="space-y-3">
        {filteredRequests.length === 0 ? (
          <div className="royal-panel rounded-2xl p-8 text-center space-y-2">
            <Clock className="w-8 h-8 text-[rgba(212,175,55,0.4)] mx-auto" />
            <p className="text-sm font-bold text-[#E8C97A]">No Payment Requests Found</p>
            <p className="text-xs text-[rgba(212,175,55,0.5)]">
              There are no {activeTab !== 'all' ? activeTab : ''} requests matching your selected filters.
            </p>
          </div>
        ) : (
          filteredRequests.map((req, i) => (
            <motion.div
              key={req.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.02 }}
              className={`royal-panel rounded-2xl p-4 border transition-all ${
                req.status === 'pending'
                  ? 'border-[rgba(212,175,55,0.35)] bg-[#0d2419]/90 shadow-[0_4px_20px_rgba(0,0,0,0.3)]'
                  : 'border-[rgba(212,175,55,0.12)] opacity-85'
              }`}
            >
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                {/* Left: User info & type */}
                <div className="flex items-start gap-3.5">
                  <div
                    className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5 ${
                      req.type === 'deposit'
                        ? 'bg-emerald-500/10 border border-emerald-500/30'
                        : 'bg-rose-500/10 border border-rose-500/30'
                    }`}
                  >
                    {req.type === 'deposit' ? (
                      <ArrowDownLeft className="w-6 h-6 text-emerald-400" />
                    ) : (
                      <ArrowUpRight className="w-6 h-6 text-rose-400" />
                    )}
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-black text-[#F5F1E6]">{req.userName}</span>
                      <span className="text-[10px] text-[rgba(212,175,55,0.5)] font-mono">{req.userEmail}</span>
                      <span
                        className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded-full ${
                          req.type === 'deposit'
                            ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                            : 'bg-rose-500/15 text-rose-300 border border-rose-500/30'
                        }`}
                      >
                        {req.type}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 text-xs text-[rgba(212,175,55,0.7)] flex-wrap">
                      <span className="flex items-center gap-1">
                        <Phone className="w-3.5 h-3.5 text-emerald-400" />
                        <strong className="text-[#E8C97A]">WhatsApp:</strong> {req.whatsappNumber}
                      </span>
                      <span className="text-[rgba(212,175,55,0.3)]">•</span>
                      <span className="text-[11px] text-[rgba(212,175,55,0.5)] font-mono">ID: {req.id}</span>
                      <span className="text-[rgba(212,175,55,0.3)]">•</span>
                      <span className="text-[11px] text-[rgba(212,175,55,0.5)]">{getTimeAgo(req.createdAt)}</span>
                    </div>

                    {/* Account Details if withdrawal */}
                    {req.accountDetails && (
                      <div className="mt-2 bg-[#061510] border border-[rgba(212,175,55,0.15)] rounded-xl p-2.5 text-xs text-[rgba(212,175,55,0.8)] flex items-center gap-2 flex-wrap">
                        {req.accountDetails.type === 'bank' ? (
                          <Building2 className="w-4 h-4 text-gold flex-shrink-0" />
                        ) : (
                          <Smartphone className="w-4 h-4 text-gold flex-shrink-0" />
                        )}
                        <span>
                          <strong className="text-[#E8C97A]">Payout Account:</strong> {req.accountDetails.label}
                        </span>
                        {req.accountDetails.accountHolder && (
                          <span className="text-[rgba(212,175,55,0.6)]">
                            (Holder: {req.accountDetails.accountHolder})
                          </span>
                        )}
                        {req.accountDetails.ifscCode && (
                          <span className="text-[rgba(212,175,55,0.5)] font-mono">
                            IFSC: {req.accountDetails.ifscCode}
                          </span>
                        )}
                      </div>
                    )}

                    {/* Rejection reason display if rejected */}
                    {req.status === 'rejected' && req.rejectionReason && (
                      <div className="mt-1 text-xs text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-xl px-3 py-1.5">
                        <strong>Reason:</strong> {req.rejectionReason}
                      </div>
                    )}
                  </div>
                </div>

                {/* Right: Amount & Actions */}
                <div className="flex lg:flex-col items-center lg:items-end justify-between gap-3 pt-3 lg:pt-0 border-t lg:border-t-0 border-[rgba(212,175,55,0.1)] flex-shrink-0">
                  <div className="text-left lg:text-right">
                    <p
                      className={`text-xl font-black font-heading tabular-nums ${
                        req.type === 'deposit' ? 'text-emerald-400' : 'text-rose-400'
                      }`}
                    >
                      ₹{req.amount.toLocaleString('en-IN')}
                    </p>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full inline-block mt-0.5 ${
                        req.status === 'pending'
                          ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                          : req.status === 'approved'
                          ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                          : 'bg-rose-500/15 text-rose-300 border border-rose-500/30'
                      }`}
                    >
                      {req.status === 'pending' ? '⏳ Pending Review' : req.status === 'approved' ? '✓ Approved' : '✕ Rejected'}
                    </span>
                  </div>

                  {/* Actions for Pending Requests */}
                  {req.status === 'pending' ? (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleApprove(req)}
                        className="px-3.5 py-2 rounded-xl text-xs font-black bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 transition-all flex items-center gap-1.5 cursor-pointer shadow-[0_0_12px_rgba(46,204,113,0.2)]"
                      >
                        <Check className="w-3.5 h-3.5" /> Approve
                      </button>
                      <button
                        onClick={() => handleOpenRejectModal(req)}
                        className="px-3.5 py-2 rounded-xl text-xs font-black bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30 transition-all flex items-center gap-1.5 cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" /> Reject
                      </button>
                    </div>
                  ) : (
                    <div className="text-[10px] text-[rgba(212,175,55,0.4)] text-right">
                      {req.resolvedAt && <span>Resolved {getTimeAgo(req.resolvedAt)}</span>}
                      {req.resolvedBy && <span className="block">by {req.resolvedBy}</span>}
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          ))
        )}
      </div>

      {/* Reject Modal */}
      <Modal
        isOpen={Boolean(rejectingReq)}
        onClose={() => setRejectingReq(null)}
        title={`Reject ${rejectingReq?.type === 'deposit' ? 'Deposit' : 'Withdrawal'} Request`}
      >
        {rejectingReq && (
          <div className="space-y-4 text-xs">
            <div className="bg-rose-500/10 border border-rose-500/30 rounded-xl p-3 flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-rose-300">
                  Rejecting ₹{rejectingReq.amount.toLocaleString('en-IN')} for {rejectingReq.userName}
                </p>
                <p className="text-[11px] text-[rgba(212,175,55,0.7)] mt-0.5">
                  {rejectingReq.type === 'withdrawal'
                    ? 'The held amount will be immediately unlocked and refunded to the player balance.'
                    : 'No balance will be added to the player account.'}
                </p>
              </div>
            </div>

            <div>
              <label className="block text-[rgba(212,175,55,0.7)] font-bold mb-1.5">
                Rejection Reason (will be shown to the player)
              </label>
              <textarea
                value={rejectionReason}
                onChange={e => setRejectionReason(e.target.value)}
                placeholder="Enter rejection reason..."
                rows={3}
                className="w-full bg-[#061510] border border-[rgba(212,175,55,0.2)] rounded-xl p-3 text-xs text-[#F5F1E6] focus:outline-none focus:border-gold resize-none"
              />
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleConfirmReject}
                className="flex-1 py-2.5 rounded-xl font-black text-xs bg-rose-500 text-black hover:bg-rose-400 transition-all cursor-pointer"
              >
                Confirm Rejection
              </button>
              <button
                onClick={() => setRejectingReq(null)}
                className="px-4 py-2.5 rounded-xl text-xs font-bold text-[rgba(212,175,55,0.6)] hover:text-[#E8C97A] bg-[#0d2419] border border-[rgba(212,175,55,0.15)] cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
