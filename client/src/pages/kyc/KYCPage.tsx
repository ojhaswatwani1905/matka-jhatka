import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldCheck, User, CreditCard, Upload, Camera, ChevronRight, Check, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../store/AuthContext';
import { useKYC } from '../../store/KYCContext';
import { useToast } from '../../components/ui/Toast';

const STEPS = [
  { id: 1, label: 'Personal Info', icon: User },
  { id: 2, label: 'Government ID', icon: CreditCard },
  { id: 3, label: 'Documents', icon: Upload },
  { id: 4, label: 'Selfie', icon: Camera },
];

const ID_TYPES = [
  { value: 'aadhaar', label: 'Aadhaar Card' },
  { value: 'pan', label: 'PAN Card' },
  { value: 'passport', label: 'Passport' },
  { value: 'voter_id', label: 'Voter ID' },
] as const;

export default function KYCPage() {
  const { user } = useAuth();
  const { submitKYC, status, data: kycData } = useKYC();
  const { addToast } = useToast();
  const navigate = useNavigate();

  const [step, setStep] = useState(1);
  const [fullName, setFullName] = useState(user?.name || '');
  const [dob, setDob] = useState('');
  const [idType, setIdType] = useState<'aadhaar' | 'pan' | 'passport' | 'voter_id'>('aadhaar');
  const [idNumber, setIdNumber] = useState('');
  const [frontDoc, setFrontDoc] = useState('');
  const [backDoc, setBackDoc] = useState('');
  const [selfie, setSelfie] = useState('');

  const inputCls = 'w-full bg-[#0d2419] border border-[rgba(212,175,55,0.2)] rounded-xl px-3.5 py-2.5 text-sm text-[#F5F1E6] placeholder-[rgba(212,175,55,0.25)] focus:outline-none focus:border-[rgba(212,175,55,0.5)] transition-colors';
  const labelCls = 'block text-xs font-bold text-[rgba(212,175,55,0.7)] mb-1.5';

  const handleFileChange = (setter: (v: string) => void) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setter(file.name);
      addToast({ type: 'success', title: 'File selected', message: file.name });
    }
  };

  const handleNext = () => {
    if (step === 1 && (!fullName || !dob)) {
      addToast({ type: 'warning', title: 'Required', message: 'Please fill full name and date of birth.' });
      return;
    }
    if (step === 2 && (!idType || !idNumber)) {
      addToast({ type: 'warning', title: 'Required', message: 'Please select ID type and enter ID number.' });
      return;
    }
    if (step === 3 && (!frontDoc || !backDoc)) {
      addToast({ type: 'warning', title: 'Required', message: 'Please upload both front and back of your ID.' });
      return;
    }
    if (step < 4) { setStep(s => s + 1); return; }

    // Final submit
    if (!selfie) {
      addToast({ type: 'warning', title: 'Required', message: 'Please upload your selfie.' });
      return;
    }

    submitKYC({
      userId: user?.id || 'demo',
      fullName,
      dob,
      idType,
      idNumber,
      frontDoc,
      backDoc,
      selfie,
    });

    addToast({ type: 'success', title: 'KYC Submitted!', message: 'Your documents are under review. We\'ll notify you within 24 hours.' });
  };

  // Already submitted view
  if (status === 'pending') {
    return (
      <div className="space-y-6 pb-8">
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-2xl font-black text-[#E8C97A] font-heading flex items-center gap-2.5">
            <ShieldCheck className="w-6 h-6 text-gold" /> KYC Verification
          </h1>
          <p className="text-xs text-[rgba(212,175,55,0.5)] mt-1">Document verification status</p>
        </motion.div>

        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="royal-panel rounded-3xl p-8 text-center space-y-4">
          <div className="w-20 h-20 rounded-full bg-amber-500/10 border-2 border-amber-500/40 flex items-center justify-center mx-auto">
            <div className="w-8 h-8 border-3 border-amber-400 border-t-transparent rounded-full animate-spin" />
          </div>
          <h2 className="text-xl font-black text-amber-400 font-heading">Under Review</h2>
          <p className="text-sm text-[rgba(212,175,55,0.6)] max-w-xs mx-auto">Your documents have been submitted and are being reviewed by our team. This typically takes 24–48 hours.</p>
          <div className="bg-[rgba(212,175,55,0.06)] border border-[rgba(212,175,55,0.15)] rounded-xl p-4 text-left space-y-2">
            <p className="text-xs text-[rgba(212,175,55,0.5)]"><span className="text-gold font-bold">Name:</span> {kycData?.fullName}</p>
            <p className="text-xs text-[rgba(212,175,55,0.5)]"><span className="text-gold font-bold">ID:</span> {kycData?.idType?.toUpperCase()} — {kycData?.idNumber}</p>
            <p className="text-xs text-[rgba(212,175,55,0.5)]"><span className="text-gold font-bold">Submitted:</span> {kycData?.submittedAt ? new Date(kycData.submittedAt).toLocaleDateString('en-IN', { dateStyle: 'medium' }) : '—'}</p>
          </div>
          <button onClick={() => navigate('/profile')} className="btn-royal-gold px-6 py-2.5 rounded-xl font-black text-xs cursor-pointer">
            Back to Profile
          </button>
        </motion.div>
      </div>
    );
  }

  if (status === 'verified') {
    return (
      <div className="space-y-6 pb-8">
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-2xl font-black text-[#E8C97A] font-heading flex items-center gap-2.5">
            <ShieldCheck className="w-6 h-6 text-[#2ECC71]" /> KYC Verified
          </h1>
        </motion.div>
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="royal-panel rounded-3xl p-8 text-center space-y-4">
          <div className="w-20 h-20 rounded-full bg-emerald-500/10 border-2 border-emerald-500/40 flex items-center justify-center mx-auto">
            <Check className="w-10 h-10 text-emerald-400" />
          </div>
          <h2 className="text-xl font-black text-emerald-400 font-heading">You're Verified!</h2>
          <p className="text-sm text-[rgba(212,175,55,0.6)]">Your identity has been verified. You can now withdraw funds freely.</p>
          <button onClick={() => navigate('/wallet')} className="btn-royal-gold px-6 py-2.5 rounded-xl font-black text-xs cursor-pointer">
            Go to Wallet
          </button>
        </motion.div>
      </div>
    );
  }

  if (status === 'rejected') {
    return (
      <div className="space-y-6 pb-8">
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-2xl font-black text-[#E8C97A] font-heading flex items-center gap-2.5">
            <AlertCircle className="w-6 h-6 text-rose-400" /> KYC Rejected
          </h1>
        </motion.div>
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="royal-panel rounded-3xl p-8 text-center space-y-4">
          <div className="w-20 h-20 rounded-full bg-rose-500/10 border-2 border-rose-500/40 flex items-center justify-center mx-auto">
            <AlertCircle className="w-10 h-10 text-rose-400" />
          </div>
          <h2 className="text-xl font-black text-rose-400 font-heading">Documents Rejected</h2>
          {kycData?.rejectionReason && (
            <div className="bg-rose-500/10 border border-rose-500/30 rounded-xl p-3 text-sm text-rose-300">
              <span className="font-bold">Reason: </span>{kycData.rejectionReason}
            </div>
          )}
          <p className="text-sm text-[rgba(212,175,55,0.6)]">Please resubmit with correct documents.</p>
          <button onClick={() => { setStep(1); }} className="btn-royal-gold px-6 py-2.5 rounded-xl font-black text-xs cursor-pointer">
            Resubmit Documents
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-black text-[#E8C97A] font-heading flex items-center gap-2.5">
          <ShieldCheck className="w-6 h-6 text-gold" /> KYC Verification
        </h1>
        <p className="text-xs text-[rgba(212,175,55,0.5)] mt-1">Complete identity verification to enable withdrawals</p>
      </motion.div>

      {/* Stepper */}
      <div className="flex items-center gap-0">
        {STEPS.map((s, i) => {
          const Icon = s.icon;
          const done = step > s.id;
          const active = step === s.id;
          return (
            <div key={s.id} className="flex items-center flex-1">
              <div className={`flex flex-col items-center gap-1 flex-shrink-0 ${i > 0 ? '' : ''}`}>
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center border transition-all ${
                  done ? 'bg-[#2ECC71] border-[#2ECC71]' :
                  active ? 'bg-[rgba(212,175,55,0.2)] border-[rgba(212,175,55,0.6)]' :
                  'bg-[#0d2419] border-[rgba(212,175,55,0.15)]'
                }`}>
                  {done ? <Check className="w-4 h-4 text-white" /> : <Icon className={`w-4 h-4 ${active ? 'text-gold' : 'text-[rgba(212,175,55,0.3)]'}`} />}
                </div>
                <span className={`text-[9px] font-bold whitespace-nowrap ${active ? 'text-gold' : done ? 'text-[#2ECC71]' : 'text-[rgba(212,175,55,0.3)]'}`}>{s.label}</span>
              </div>
              {i < STEPS.length - 1 && (
                <div className={`flex-1 h-px mx-1 ${done ? 'bg-[#2ECC71]' : 'bg-[rgba(212,175,55,0.15)]'}`} />
              )}
            </div>
          );
        })}
      </div>

      {/* Step Forms */}
      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.25 }}
          className="royal-panel rounded-2xl p-5 space-y-4"
        >
          {step === 1 && (
            <>
              <h3 className="text-sm font-black text-[#E8C97A] font-heading">Personal Information</h3>
              <div>
                <label className={labelCls}>Full Legal Name (as on ID)</label>
                <input className={inputCls} value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Enter your full name" />
              </div>
              <div>
                <label className={labelCls}>Date of Birth</label>
                <input type="date" className={inputCls} value={dob} onChange={e => setDob(e.target.value)} max={new Date(Date.now() - 18 * 365.25 * 24 * 3600 * 1000).toISOString().split('T')[0]} />
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <h3 className="text-sm font-black text-[#E8C97A] font-heading">Government ID Details</h3>
              <div>
                <label className={labelCls}>ID Type</label>
                <select className={inputCls} value={idType} onChange={e => setIdType(e.target.value as typeof idType)}>
                  {ID_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
              <div>
                <label className={labelCls}>ID Number</label>
                <input className={inputCls} value={idNumber} onChange={e => setIdNumber(e.target.value)} placeholder={idType === 'aadhaar' ? 'XXXX XXXX XXXX' : idType === 'pan' ? 'ABCDE1234F' : 'Enter ID number'} />
              </div>
            </>
          )}

          {step === 3 && (
            <>
              <h3 className="text-sm font-black text-[#E8C97A] font-heading">Document Upload</h3>
              <div>
                <label className={labelCls}>Front of ID Document</label>
                <label className="flex items-center gap-3 w-full bg-[#0d2419] border border-[rgba(212,175,55,0.2)] border-dashed rounded-xl px-4 py-4 cursor-pointer hover:border-[rgba(212,175,55,0.4)] transition-colors">
                  <Upload className="w-5 h-5 text-[rgba(212,175,55,0.4)]" />
                  <span className="text-sm text-[rgba(212,175,55,0.5)]">{frontDoc || 'Tap to upload front image'}</span>
                  <input type="file" accept="image/*" className="hidden" onChange={handleFileChange(setFrontDoc)} />
                </label>
              </div>
              <div>
                <label className={labelCls}>Back of ID Document</label>
                <label className="flex items-center gap-3 w-full bg-[#0d2419] border border-[rgba(212,175,55,0.2)] border-dashed rounded-xl px-4 py-4 cursor-pointer hover:border-[rgba(212,175,55,0.4)] transition-colors">
                  <Upload className="w-5 h-5 text-[rgba(212,175,55,0.4)]" />
                  <span className="text-sm text-[rgba(212,175,55,0.5)]">{backDoc || 'Tap to upload back image'}</span>
                  <input type="file" accept="image/*" className="hidden" onChange={handleFileChange(setBackDoc)} />
                </label>
              </div>
            </>
          )}

          {step === 4 && (
            <>
              <h3 className="text-sm font-black text-[#E8C97A] font-heading">Selfie / Liveness Check</h3>
              <p className="text-xs text-[rgba(212,175,55,0.5)]">Take a clear selfie while holding your ID document. Ensure your face and ID are clearly visible.</p>
              <label className="flex flex-col items-center gap-3 w-full bg-[#0d2419] border border-[rgba(212,175,55,0.2)] border-dashed rounded-xl px-4 py-8 cursor-pointer hover:border-[rgba(212,175,55,0.4)] transition-colors">
                <Camera className="w-10 h-10 text-[rgba(212,175,55,0.3)]" />
                <span className="text-sm text-[rgba(212,175,55,0.5)]">{selfie || 'Tap to upload selfie'}</span>
                {selfie && <Check className="w-5 h-5 text-[#2ECC71]" />}
                <input type="file" accept="image/*" capture="user" className="hidden" onChange={handleFileChange(setSelfie)} />
              </label>
              <div className="bg-[rgba(212,175,55,0.06)] border border-[rgba(212,175,55,0.15)] rounded-xl p-3 text-xs text-[rgba(212,175,55,0.5)] space-y-1">
                <p>✓ Face clearly visible and well-lit</p>
                <p>✓ ID document readable in frame</p>
                <p>✓ No sunglasses or hat</p>
              </div>
            </>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Navigation */}
      <div className="flex items-center gap-3">
        {step > 1 && (
          <button
            onClick={() => setStep(s => s - 1)}
            className="flex-1 py-3 rounded-xl font-black text-[#E8C97A] text-xs bg-[rgba(212,175,55,0.08)] border border-[rgba(212,175,55,0.25)] hover:bg-[rgba(212,175,55,0.15)] transition-all cursor-pointer"
          >
            ← Back
          </button>
        )}
        <button
          onClick={handleNext}
          className="btn-royal-gold flex-1 py-3 rounded-xl font-black text-xs flex items-center justify-center gap-2 cursor-pointer"
        >
          {step === 4 ? (
            <><ShieldCheck className="w-4 h-4" /> Submit for Review</>
          ) : (
            <>Next Step <ChevronRight className="w-4 h-4" /></>
          )}
        </button>
      </div>
    </div>
  );
}
