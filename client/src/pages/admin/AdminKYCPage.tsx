import { useState } from 'react';
import { motion } from 'framer-motion';
import { ShieldCheck, Check, X, AlertCircle } from 'lucide-react';
import { useToast } from '../../components/ui/Toast';
import Modal from '../../components/ui/Modal';
import type { KYCData } from '../../types';

const ID_LABELS: Record<string, string> = {
  aadhaar: 'Aadhaar Card',
  pan: 'PAN Card',
  passport: 'Passport',
  voter_id: 'Voter ID',
};

export default function AdminKYCPage() {
  const { addToast } = useToast();
  const [queue, setQueue] = useState<(KYCData & { approved?: boolean; rejected?: boolean })[]>(() =>
    JSON.parse(localStorage.getItem('playarena_kyc_queue') || '[]')
  );
  const [rejectModal, setRejectModal] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [viewModal, setViewModal] = useState<KYCData | null>(null);

  const saveQueue = (updated: typeof queue) => {
    setQueue(updated);
    localStorage.setItem('playarena_kyc_queue', JSON.stringify(updated));
  };

  const approveKYC = (userId: string) => {
    const updated = queue.map(k => k.userId === userId
      ? { ...k, approved: true, rejected: false, reviewedAt: new Date().toISOString() }
      : k
    );
    saveQueue(updated);

    // If this is the current user's KYC, update their kyc store
    const current = JSON.parse(localStorage.getItem('playarena_kyc') || '{}');
    if (current.data?.userId === userId) {
      localStorage.setItem('playarena_kyc', JSON.stringify({ ...current, status: 'verified' }));
    }

    addToast({ type: 'success', title: 'KYC Approved', message: `User ${userId} verified.` });
  };

  const rejectKYC = (userId: string) => {
    if (!rejectReason.trim()) {
      addToast({ type: 'warning', title: 'Reason required', message: 'Please enter a rejection reason.' });
      return;
    }
    const updated = queue.map(k => k.userId === userId
      ? { ...k, rejected: true, approved: false, rejectionReason: rejectReason, reviewedAt: new Date().toISOString() }
      : k
    );
    saveQueue(updated);

    // Update user's KYC store
    const current = JSON.parse(localStorage.getItem('playarena_kyc') || '{}');
    if (current.data?.userId === userId) {
      localStorage.setItem('playarena_kyc', JSON.stringify({
        ...current,
        status: 'rejected',
        data: { ...current.data, rejectionReason: rejectReason }
      }));
    }

    addToast({ type: 'warning', title: 'KYC Rejected', message: rejectReason });
    setRejectModal(null);
    setRejectReason('');
  };

  const pending = queue.filter(k => !k.approved && !k.rejected);
  const reviewed = queue.filter(k => k.approved || k.rejected);

  const KYCCard = ({ k }: { k: typeof queue[0] }) => {
    const status = k.approved ? 'verified' : k.rejected ? 'rejected' : 'pending';
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="royal-panel rounded-2xl p-4 space-y-3"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-black text-[#F5F1E6]">{k.fullName}</p>
            <p className="text-xs text-[rgba(212,175,55,0.5)]">User ID: {k.userId}</p>
          </div>
          <span className={`px-2.5 py-1 rounded-full text-[10px] font-black border flex-shrink-0 ${
            status === 'verified' ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30' :
            status === 'rejected' ? 'text-rose-400 bg-rose-500/10 border-rose-500/30' :
            'text-amber-400 bg-amber-500/10 border-amber-500/30'
          }`}>
            {status === 'verified' ? '✓ Verified' : status === 'rejected' ? '✗ Rejected' : '⏳ Pending'}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="bg-[rgba(212,175,55,0.04)] rounded-xl p-2.5 border border-[rgba(212,175,55,0.1)]">
            <p className="text-[rgba(212,175,55,0.4)] mb-0.5">ID Type</p>
            <p className="font-bold text-[#F5F1E6]">{ID_LABELS[k.idType] || k.idType}</p>
          </div>
          <div className="bg-[rgba(212,175,55,0.04)] rounded-xl p-2.5 border border-[rgba(212,175,55,0.1)]">
            <p className="text-[rgba(212,175,55,0.4)] mb-0.5">ID Number</p>
            <p className="font-bold text-[#F5F1E6] font-mono">{k.idNumber}</p>
          </div>
          <div className="bg-[rgba(212,175,55,0.04)] rounded-xl p-2.5 border border-[rgba(212,175,55,0.1)]">
            <p className="text-[rgba(212,175,55,0.4)] mb-0.5">DOB</p>
            <p className="font-bold text-[#F5F1E6]">{k.dob || '—'}</p>
          </div>
          <div className="bg-[rgba(212,175,55,0.04)] rounded-xl p-2.5 border border-[rgba(212,175,55,0.1)]">
            <p className="text-[rgba(212,175,55,0.4)] mb-0.5">Submitted</p>
            <p className="font-bold text-[#F5F1E6]">{k.submittedAt ? new Date(k.submittedAt).toLocaleDateString('en-IN') : '—'}</p>
          </div>
        </div>

        <div className="flex gap-2 text-xs">
          <span className={`flex items-center gap-1 px-2 py-1 rounded-lg ${k.frontDoc ? 'text-emerald-400 bg-emerald-500/10' : 'text-[rgba(212,175,55,0.3)] bg-[rgba(212,175,55,0.04)]'}`}>
            {k.frontDoc ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />} Front Doc
          </span>
          <span className={`flex items-center gap-1 px-2 py-1 rounded-lg ${k.backDoc ? 'text-emerald-400 bg-emerald-500/10' : 'text-[rgba(212,175,55,0.3)] bg-[rgba(212,175,55,0.04)]'}`}>
            {k.backDoc ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />} Back Doc
          </span>
          <span className={`flex items-center gap-1 px-2 py-1 rounded-lg ${k.selfie ? 'text-emerald-400 bg-emerald-500/10' : 'text-[rgba(212,175,55,0.3)] bg-[rgba(212,175,55,0.04)]'}`}>
            {k.selfie ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />} Selfie
          </span>
        </div>

        {k.rejectionReason && (
          <div className="flex items-start gap-2 bg-rose-500/10 border border-rose-500/20 rounded-xl p-2.5 text-xs text-rose-400">
            <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
            <span><span className="font-bold">Rejection reason: </span>{k.rejectionReason}</span>
          </div>
        )}

        {status === 'pending' && (
          <div className="flex gap-2">
            <button
              onClick={() => approveKYC(k.userId)}
              className="flex-1 py-2.5 rounded-xl text-xs font-black bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Check className="w-3.5 h-3.5" /> Approve
            </button>
            <button
              onClick={() => setRejectModal(k.userId)}
              className="flex-1 py-2.5 rounded-xl text-xs font-black bg-rose-500/10 border border-rose-500/30 text-rose-400 hover:bg-rose-500/20 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" /> Reject
            </button>
          </div>
        )}
      </motion.div>
    );
  };

  return (
    <div className="space-y-5 max-w-4xl pt-4">
      <div>
        <h1 className="text-2xl font-black text-[#E8C97A] font-heading flex items-center gap-2.5">
          <ShieldCheck className="w-6 h-6" /> KYC Review Queue
        </h1>
        <p className="text-xs text-[rgba(212,175,55,0.5)] mt-1">{pending.length} pending review{pending.length !== 1 ? 's' : ''}</p>
      </div>

      {pending.length === 0 && reviewed.length === 0 && (
        <div className="royal-panel rounded-2xl p-10 text-center">
          <ShieldCheck className="w-10 h-10 text-[rgba(212,175,55,0.2)] mx-auto mb-3" />
          <p className="text-sm text-[rgba(212,175,55,0.4)]">No KYC submissions yet</p>
          <p className="text-xs text-[rgba(212,175,55,0.3)] mt-1">Submissions appear here when users complete the KYC flow</p>
        </div>
      )}

      {pending.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-black text-amber-400 uppercase tracking-wider">⏳ Pending Review ({pending.length})</h2>
          {pending.map(k => <KYCCard key={k.userId} k={k} />)}
        </div>
      )}

      {reviewed.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-black text-[rgba(212,175,55,0.5)] uppercase tracking-wider">Reviewed ({reviewed.length})</h2>
          {reviewed.map(k => <KYCCard key={k.userId} k={k} />)}
        </div>
      )}

      {/* Reject Modal */}
      <Modal isOpen={!!rejectModal} onClose={() => { setRejectModal(null); setRejectReason(''); }} title="Reject KYC Submission">
        <div className="space-y-4 text-xs">
          <p className="text-[rgba(212,175,55,0.6)]">Please provide a clear reason for rejection. This will be shown to the user so they can resubmit correctly.</p>
          <div>
            <label className="block text-[rgba(212,175,55,0.7)] mb-1.5 font-bold">Rejection Reason</label>
            <textarea
              value={rejectReason}
              onChange={e => setRejectReason(e.target.value)}
              placeholder="e.g. ID document is blurry, Selfie does not match ID, ID number mismatch..."
              rows={3}
              className="w-full bg-[#0d2419] border border-[rgba(212,175,55,0.2)] rounded-xl px-3.5 py-2.5 text-sm text-[#F5F1E6] placeholder-[rgba(212,175,55,0.25)] focus:outline-none focus:border-[rgba(212,175,55,0.5)] transition-colors resize-none"
            />
          </div>
          <button
            onClick={() => rejectModal && rejectKYC(rejectModal)}
            className="w-full py-3 rounded-xl font-black text-xs bg-rose-500/10 border border-rose-500/30 text-rose-400 hover:bg-rose-500/20 transition-colors cursor-pointer"
          >
            Confirm Rejection
          </button>
        </div>
      </Modal>
    </div>
  );
}
