import { useState } from 'react';
import { motion } from 'framer-motion';
import { Shield, Clock, Ban, AlertTriangle, ChevronRight, Check } from 'lucide-react';
import { useRG, type ExclusionPeriod, type SessionLimit } from '../../store/RGContext';
import { useAuth } from '../../store/AuthContext';
import { useNavigate } from 'react-router-dom';

const SESSION_OPTIONS: { value: SessionLimit; label: string }[] = [
  { value: 'off', label: 'Off (no limit)' },
  { value: '30m', label: '30 minutes' },
  { value: '1h', label: '1 hour' },
  { value: '2h', label: '2 hours' },
  { value: '4h', label: '4 hours' },
];

const REALITY_OPTIONS = [
  { value: 0, label: 'Off' },
  { value: 1, label: 'Every 1 hour' },
  { value: 2, label: 'Every 2 hours' },
  { value: 4, label: 'Every 4 hours' },
];

const EXCLUSION_OPTIONS: { value: ExclusionPeriod; label: string; desc: string }[] = [
  { value: '24h', label: '24 Hours', desc: 'Short cooling-off period' },
  { value: '7d', label: '7 Days', desc: 'One week break' },
  { value: '30d', label: '30 Days', desc: 'One month exclusion' },
  { value: 'permanent', label: 'Permanent', desc: 'Irrevocable account lock' },
];

function SectionCard({ icon, title, subtitle, children }: { icon: React.ReactNode; title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <div className="royal-panel rounded-2xl p-5 space-y-4">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-[rgba(212,175,55,0.08)] border border-[rgba(212,175,55,0.2)] flex items-center justify-center flex-shrink-0">
          {icon}
        </div>
        <div>
          <h3 className="text-sm font-black text-[#E8C97A]">{title}</h3>
          <p className="text-[10px] text-[rgba(212,175,55,0.45)] mt-0.5">{subtitle}</p>
        </div>
      </div>
      {children}
    </div>
  );
}

export default function ResponsibleGamingPage() {
  const { settings, updateSettings, updateDepositCaps, cancelPendingIncrease, setExclusion, isExcluded } = useRG();
  const { logout } = useAuth();
  const navigate = useNavigate();

  const [depositDay, setDepositDay] = useState(settings.depositCap.daily?.toString() ?? '');
  const [depositWeek, setDepositWeek] = useState(settings.depositCap.weekly?.toString() ?? '');
  const [depositMonth, setDepositMonth] = useState(settings.depositCap.month?.toString() ?? '');
  const [savedMessage, setSavedMessage] = useState<string | null>(null);
  const [confirmExclusion, setConfirmExclusion] = useState<ExclusionPeriod | null>(null);
  const [showExclusionWarning, setShowExclusionWarning] = useState(false);

  const saveDepositCaps = () => {
    const res = updateDepositCaps({
      daily: depositDay ? parseInt(depositDay) : undefined,
      weekly: depositWeek ? parseInt(depositWeek) : undefined,
      monthly: depositMonth ? parseInt(depositMonth) : undefined,
    });

    if (res.immediate) {
      setSavedMessage('Deposit limits updated immediately!');
    } else {
      setSavedMessage(`Limit decrease saved immediately. Upward increase for (${res.pendingFields.join(', ')}) scheduled with 24h cooldown.`);
    }
    setTimeout(() => setSavedMessage(null), 4000);
  };

  const handleExclusion = (period: ExclusionPeriod) => {
    if (period === 'permanent') {
      setConfirmExclusion(period);
      setShowExclusionWarning(true);
    } else {
      setConfirmExclusion(period);
      setShowExclusionWarning(true);
    }
  };

  const confirmAndExclude = () => {
    if (!confirmExclusion) return;
    setExclusion(confirmExclusion);
    logout();
    navigate('/auth/login');
  };

  const inputCls = 'w-full bg-[#061510] border border-[rgba(212,175,55,0.2)] rounded-xl px-3 py-2.5 text-sm text-[#F5F1E6] focus:outline-none focus:border-[rgba(212,175,55,0.5)] transition-colors placeholder-[rgba(212,175,55,0.2)]';

  return (
    <div className="space-y-5 pb-10">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="space-y-1">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-xl bg-[rgba(46,204,113,0.1)] border border-[rgba(46,204,113,0.3)] flex items-center justify-center">
            <Shield className="w-5 h-5 text-[#2ECC71]" />
          </div>
          <div>
            <h1 className="text-xl font-black text-[#E8C97A] font-heading">Responsible Gaming</h1>
            <p className="text-[10px] text-[rgba(212,175,55,0.45)]">Tools to keep your play safe and within your means</p>
          </div>
        </div>

        {/* Info banner */}
        <div className="bg-[rgba(46,204,113,0.06)] border border-[rgba(46,204,113,0.2)] rounded-xl p-3 text-xs text-[rgba(212,175,55,0.6)] leading-relaxed">
          🛡️ PlayArena is committed to responsible gambling. These tools are designed to help you stay in control. All limits take effect immediately and are stored on this device.
        </div>
      </motion.div>

      {/* 1. Session Limit */}
      <SectionCard
        icon={<Clock className="w-5 h-5 text-gold" />}
        title="Session Time Limit"
        subtitle="Automatically log out after a set play duration"
      >
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {SESSION_OPTIONS.map(opt => (
            <button key={opt.value} onClick={() => updateSettings({ sessionLimit: opt.value })}
              className={`py-2.5 px-2 rounded-xl text-xs font-bold cursor-pointer transition-all border text-center ${settings.sessionLimit === opt.value
                ? 'bg-[rgba(212,175,55,0.18)] border-[rgba(212,175,55,0.55)] text-gold'
                : 'bg-[#0a1e12] border-[rgba(212,175,55,0.1)] text-[rgba(212,175,55,0.5)] hover:text-gold'}`}>
              {opt.value === 'off' ? '🚫 ' : '⏱ '}{opt.label}
            </button>
          ))}
        </div>
        {settings.sessionLimit !== 'off' && (
          <p className="text-[10px] text-amber-400 font-bold">⚠️ You will receive a 5-minute warning before auto-logout.</p>
        )}
      </SectionCard>

      {/* 2. Reality Check */}
      <SectionCard
        icon={<AlertTriangle className="w-5 h-5 text-amber-400" />}
        title="Reality Check Reminders"
        subtitle="Periodic popup showing session time and net win/loss"
      >
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {REALITY_OPTIONS.map(opt => (
            <button key={opt.value} onClick={() => updateSettings({ realityCheckHours: opt.value })}
              className={`py-2.5 rounded-xl text-xs font-bold cursor-pointer transition-all border text-center ${settings.realityCheckHours === opt.value
                ? 'bg-[rgba(245,158,11,0.15)] border-amber-500/50 text-amber-400'
                : 'bg-[#0a1e12] border-[rgba(212,175,55,0.1)] text-[rgba(212,175,55,0.5)] hover:text-gold'}`}>
              {opt.label}
            </button>
          ))}
        </div>
      </SectionCard>

      {/* 3. Deposit Caps */}
      <SectionCard
        icon={<span className="text-xl">💰</span>}
        title="Self-Set Deposit Limits"
        subtitle="Lowering limits applies immediately; raising limits requires a 24-hour cooling-off period"
      >
        <div className="space-y-2.5">
          {[
            { field: 'daily' as const, label: 'Daily Limit (₹)', value: depositDay, set: setDepositDay, placeholder: 'e.g. 2000' },
            { field: 'weekly' as const, label: 'Weekly Limit (₹)', value: depositWeek, set: setDepositWeek, placeholder: 'e.g. 10000' },
            { field: 'monthly' as const, label: 'Monthly Limit (₹)', value: depositMonth, set: setDepositMonth, placeholder: 'e.g. 30000' },
          ].map(f => {
            const pending = (settings.pendingIncreases || []).find(p => p.field === f.field);
            return (
              <div key={f.label} className="space-y-1">
                <div className="flex justify-between">
                  <label className="text-[10px] text-[rgba(212,175,55,0.5)] font-bold">{f.label}</label>
                  {pending && (
                    <span className="text-[9px] text-amber-400 font-bold flex items-center gap-1">
                      ⏱ 24h Cooldown Pending: ₹{pending.newVal.toLocaleString()} (Effective {new Date(pending.effectiveAt).toLocaleTimeString()})
                    </span>
                  )}
                </div>
                <input type="number" min="0" value={f.value} onChange={e => f.set(e.target.value)} placeholder={f.placeholder} className={inputCls} />
              </div>
            );
          })}
        </div>
        <button onClick={saveDepositCaps}
          className={`w-full py-2.5 rounded-xl font-black text-xs cursor-pointer transition-all ${savedMessage ? 'bg-[rgba(46,204,113,0.15)] border border-[rgba(46,204,113,0.4)] text-[#2ECC71]' : 'btn-royal-gold'}`}>
          {savedMessage ? <><Check className="w-3.5 h-3.5 inline mr-1" />{savedMessage}</> : 'Save Deposit Limits'}
        </button>
        {(settings.depositCap.daily || settings.depositCap.weekly || settings.depositCap.monthly) && (
          <div className="grid grid-cols-3 gap-2 text-center">
            {[
              { label: 'Daily', val: settings.depositCap.daily },
              { label: 'Weekly', val: settings.depositCap.weekly },
              { label: 'Monthly', val: settings.depositCap.monthly },
            ].map(s => s.val ? (
              <div key={s.label} className="p-2 rounded-xl bg-[rgba(46,204,113,0.06)] border border-[rgba(46,204,113,0.15)]">
                <p className="text-xs font-black text-[#2ECC71]">₹{s.val.toLocaleString()}</p>
                <p className="text-[9px] text-[rgba(212,175,55,0.4)]">{s.label} Cap</p>
              </div>
            ) : null)}
          </div>
        )}
      </SectionCard>

      {/* 4. Self Exclusion */}
      <SectionCard
        icon={<Ban className="w-5 h-5 text-[#FF4D6D]" />}
        title="Self-Exclusion"
        subtitle="Lock yourself out of the platform completely for a set period"
      >
        {isExcluded() ? (
          <div className="text-center py-3 rounded-xl bg-[#FF4D6D]/10 border border-[#FF4D6D]/30 text-[#FF4D6D] font-bold text-sm">
            🔒 Self-exclusion is currently active
            <p className="text-[10px] font-normal mt-1 text-[#FF4D6D]/70">Exclusion ends: {settings.exclusionUntil === 'permanent' ? 'Never (Permanent)' : new Date(settings.exclusionUntil!).toLocaleDateString('en-IN')}</p>
          </div>
        ) : (
          <>
            <div className="bg-[rgba(255,77,109,0.06)] border border-[rgba(255,77,109,0.2)] rounded-xl p-3 text-xs text-[rgba(212,175,55,0.6)]">
              ⚠️ During exclusion, you will be logged out immediately and cannot log back in until the period ends.
            </div>
            <div className="grid grid-cols-2 gap-2">
              {EXCLUSION_OPTIONS.map(opt => (
                <button key={opt.value} onClick={() => handleExclusion(opt.value)}
                  className={`py-3 px-3 rounded-xl text-xs font-bold cursor-pointer transition-all border text-left space-y-0.5 hover:border-[#FF4D6D]/50 hover:bg-[#FF4D6D]/08 ${opt.value === 'permanent' ? 'border-[#FF4D6D]/30 bg-[#FF4D6D]/05' : 'border-[rgba(212,175,55,0.12)] bg-[#0a1e12]'}`}>
                  <p className={opt.value === 'permanent' ? 'text-[#FF4D6D]' : 'text-[rgba(212,175,55,0.7)]'}>{opt.label}</p>
                  <p className="text-[9px] text-[rgba(212,175,55,0.35)]">{opt.desc}</p>
                </button>
              ))}
            </div>
          </>
        )}
      </SectionCard>

      {/* Confirmation Modal */}
      {showExclusionWarning && confirmExclusion && (
        <div className="fixed inset-0 z-50 flex items-end justify-center p-4" style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(6px)' }}>
          <motion.div initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
            className="royal-panel rounded-3xl p-6 w-full max-w-sm space-y-4">
            <div className="text-center space-y-2">
              <div className="text-4xl">⚠️</div>
              <h3 className="text-lg font-black text-[#FF4D6D]">Confirm Self-Exclusion</h3>
              <p className="text-xs text-[rgba(212,175,55,0.6)]">
                You are about to lock yourself out of PlayArena for <strong className="text-gold">{EXCLUSION_OPTIONS.find(o => o.value === confirmExclusion)?.label}</strong>.
                {confirmExclusion === 'permanent' && <span className="text-[#FF4D6D] font-bold"> This is permanent and cannot be reversed.</span>}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => setShowExclusionWarning(false)}
                className="py-3 rounded-xl text-xs font-black border border-[rgba(212,175,55,0.2)] text-[rgba(212,175,55,0.6)] hover:text-gold cursor-pointer transition-all">
                Cancel
              </button>
              <button onClick={confirmAndExclude}
                className="py-3 rounded-xl text-xs font-black bg-[#FF4D6D]/15 border border-[#FF4D6D]/50 text-[#FF4D6D] hover:bg-[#FF4D6D]/25 cursor-pointer transition-all">
                Confirm & Lock
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
