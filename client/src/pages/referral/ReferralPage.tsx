import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users, Copy, Check, Gift, Share2, Crown,
  TrendingUp, ChevronDown, Sparkles, Zap, Link2,
} from 'lucide-react';
import { useAuth } from '../../store/AuthContext';
import { useToast } from '../../components/ui/Toast';

/* ── Data ────────────────────────────────────────────────────── */
const REFERRAL_TIERS = [
  { count: 1,  reward: '₹100',    bonus: '+₹100',   label: 'First friend',     icon: '👥' },
  { count: 5,  reward: '₹750',    bonus: '+₹650',   label: '5 friends',        icon: '🎯' },
  { count: 10, reward: '₹2,000',  bonus: '+₹1,250', label: '10 friends',       icon: '🔥' },
  { count: 25, reward: '₹7,500',  bonus: '+₹5,500', label: '25 friends',       icon: '💎' },
  { count: 50, reward: '₹20,000', bonus: '+₹12,500',label: '50 friends – Max', icon: '👑' },
];

const MOCK_REFERRALS = [
  { name: 'Raj***',   joined: '2 days ago',  earned: '₹100', status: 'active',  initials: 'R' },
  { name: 'Priy***',  joined: '5 days ago',  earned: '₹100', status: 'active',  initials: 'P' },
  { name: 'Vik***',   joined: '1 week ago',  earned: '₹100', status: 'active',  initials: 'V' },
];

const HOW_IT_WORKS = [
  { step: '1', icon: Share2, text: 'Share your referral code or link with a friend' },
  { step: '2', icon: Users,  text: 'Friend registers & uses your code on sign-up' },
  { step: '3', icon: Gift,   text: 'Friend makes their first deposit of any amount' },
  { step: '4', icon: Crown,  text: 'You both get ₹100 instantly — no limits!' },
];

/* ── Component ──────────────────────────────────────────────── */
export default function ReferralPage() {
  const { user } = useAuth();
  const { addToast } = useToast();
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [showHow, setShowHow] = useState(false);

  // Works on both http://localhost and https
  const legacyCopy = (text: string) => {
    const el = document.createElement('textarea');
    el.value = text;
    el.style.position = 'fixed';
    el.style.opacity = '0';
    document.body.appendChild(el);
    el.focus();
    el.select();
    try { document.execCommand('copy'); } catch (_) {}
    document.body.removeChild(el);
  };

  const copyToClipboard = (text: string) => {
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text).catch(() => legacyCopy(text));
    } else {
      legacyCopy(text);
    }
  };

  const referralCode = `PLAY-${(user?.id || 'USR84920').toUpperCase().slice(-6)}`;
  const referralLink = `https://playarena.gg/r/${referralCode}`;
  const totalReferred = MOCK_REFERRALS.length;
  const totalEarned   = totalReferred * 100;


  const handleCopyCode = () => {
    copyToClipboard(referralCode);
    setCopiedCode(true);
    addToast({ type: 'success', title: 'Referral code copied!', message: 'Share it with your friends to earn ₹100 each.' });
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleCopyLink = () => {
    copyToClipboard(referralLink);
    setCopiedLink(true);
    addToast({ type: 'success', title: 'Referral link copied!', message: 'Your friend just needs to click the link to sign up.' });
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const nextMilestone = REFERRAL_TIERS.find(t => t.count > totalReferred);
  const progressPct = nextMilestone
    ? (totalReferred / nextMilestone.count) * 100
    : 100;

  return (
    <div className="space-y-5 pb-10">

      {/* ── Hero ──────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative overflow-hidden rounded-3xl border border-[rgba(212,175,55,0.4)] shadow-[0_0_60px_rgba(212,175,55,0.15)]"
        style={{ background: 'linear-gradient(145deg,#0a1e12 0%,#0B2318 60%,#091a0f 100%)' }}
      >
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-[#D4AF37] to-transparent" />
        <div className="absolute -top-16 -right-16 w-64 h-64 rounded-full bg-[rgba(46,204,113,0.07)] blur-3xl pointer-events-none" />
        <div className="absolute -bottom-10 -left-10 w-48 h-48 rounded-full bg-[rgba(212,175,55,0.05)] blur-3xl pointer-events-none" />
        <div className="absolute bottom-2 right-4 text-[100px] leading-none select-none opacity-[0.05] font-black">♟</div>

        <div className="relative z-10 p-6">
          {/* Title */}
          <div className="flex items-center gap-2.5 mb-1">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#2ECC71] to-[#1a9950] flex items-center justify-center shadow-[0_0_12px_rgba(46,204,113,0.5)]">
              <Users className="w-4 h-4 text-white" />
            </div>
            <h1 className="text-2xl font-black text-[#E8C97A] font-heading tracking-tight">Refer &amp; Earn</h1>
            <span className="ml-auto text-[10px] font-black tracking-widest text-[rgba(46,204,113,0.7)] border border-[rgba(46,204,113,0.3)] rounded-full px-2 py-0.5 bg-[rgba(46,204,113,0.06)]">ACTIVE</span>
          </div>
          <p className="text-xs text-[rgba(212,175,55,0.5)] mb-6">Invite friends — earn ₹100 for each friend who joins &amp; plays</p>

          {/* Stats grid */}
          <div className="grid grid-cols-3 gap-2.5 mb-5">
            {[
              { label: 'Referred',      value: totalReferred.toString(), icon: Users,      color: '#F5D576' },
              { label: 'Total Earned',  value: `₹${totalEarned}`,        icon: TrendingUp, color: '#2ECC71' },
              { label: 'Per Friend',    value: '₹100',                   icon: Gift,       color: '#F5D576' },
            ].map((s, i) => (
              <div key={i} className="royal-panel rounded-2xl p-3 text-center">
                <s.icon className="w-4 h-4 mx-auto mb-1.5" style={{ color: s.color }} />
                <p className="text-base font-black font-heading" style={{ color: s.color }}>{s.value}</p>
                <p className="text-[9px] text-[rgba(212,175,55,0.5)] font-bold leading-tight mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Progress to next milestone */}
          {nextMilestone && (
            <div>
              <div className="flex justify-between text-[10px] font-bold text-[rgba(212,175,55,0.5)] mb-1.5">
                <span>{totalReferred} friend{totalReferred !== 1 ? 's' : ''} referred</span>
                <span>{nextMilestone.count} for {nextMilestone.reward} bonus</span>
              </div>
              <div className="h-2.5 bg-[#061510] rounded-full overflow-hidden border border-[rgba(212,175,55,0.15)]">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${progressPct}%` }}
                  transition={{ duration: 1.3, ease: 'easeOut' }}
                  className="h-full rounded-full"
                  style={{ background: 'linear-gradient(90deg,#2ECC71,#27AE60,#D4AF37)' }}
                />
              </div>
            </div>
          )}
        </div>
      </motion.div>

      {/* ── Referral code card ────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="royal-panel rounded-2xl p-4 space-y-3"
      >
        <h2 className="text-[10px] font-black text-[rgba(212,175,55,0.55)] uppercase tracking-[0.2em] flex items-center gap-2">
          <Sparkles className="w-3 h-3 text-gold" /> Your Referral Code
        </h2>

        {/* Code row */}
        <div className="flex items-center gap-2.5">
          <div className="flex-1 bg-[#061510] border border-[rgba(212,175,55,0.3)] rounded-xl px-4 py-3.5 font-mono font-black text-[#F5D576] text-lg tracking-[0.3em] text-center shadow-inner">
            {referralCode}
          </div>
          <motion.button
            whileTap={{ scale: 0.92 }}
            onClick={handleCopyCode}
            className="w-13 h-13 rounded-xl btn-royal-gold flex items-center justify-center flex-shrink-0 cursor-pointer px-3.5 py-3.5"
          >
            <AnimatePresence mode="wait">
              {copiedCode
                ? <motion.div key="check" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}>
                    <Check className="w-5 h-5" />
                  </motion.div>
                : <motion.div key="copy"  initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}>
                    <Copy className="w-5 h-5" />
                  </motion.div>
              }
            </AnimatePresence>
          </motion.button>
        </div>

        {/* Link row */}
        <div className="flex items-center gap-2.5 p-3 bg-[rgba(212,175,55,0.04)] rounded-xl border border-[rgba(212,175,55,0.12)]">
          <Link2 className="w-3.5 h-3.5 text-[rgba(212,175,55,0.4)] flex-shrink-0" />
          <span className="text-xs text-[rgba(212,175,55,0.5)] truncate flex-1 font-mono">{referralLink}</span>
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={handleCopyLink}
            className="flex items-center gap-1 text-[11px] font-black cursor-pointer flex-shrink-0 transition-colors"
            style={{ color: copiedLink ? '#2ECC71' : '#D4AF37' }}
          >
            {copiedLink ? <Check className="w-3.5 h-3.5" /> : <Share2 className="w-3.5 h-3.5" />}
            {copiedLink ? 'Copied!' : 'Share'}
          </motion.button>
        </div>
      </motion.div>

      {/* ── Milestone bonuses ─────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="space-y-2"
      >
        <h2 className="text-[10px] font-black text-[rgba(212,175,55,0.55)] uppercase tracking-[0.2em] mb-3 px-1 flex items-center gap-2">
          <Zap className="w-3 h-3 text-gold" /> Milestone Bonuses
        </h2>
        {REFERRAL_TIERS.map((tier, i) => {
          const unlocked = totalReferred >= tier.count;
          const isNext   = nextMilestone?.count === tier.count;
          return (
            <motion.div
              key={tier.count}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.25 + i * 0.06 }}
              className={`flex items-center gap-3.5 p-3.5 rounded-2xl border transition-all ${
                unlocked
                  ? 'border-[rgba(46,204,113,0.35)] bg-[rgba(46,204,113,0.06)]'
                  : isNext
                  ? 'border-[rgba(212,175,55,0.35)] bg-[rgba(212,175,55,0.05)]'
                  : 'border-[rgba(212,175,55,0.12)] bg-[#0d2419] opacity-60'
              }`}
            >
              <div className="text-2xl w-10 text-center flex-shrink-0">{tier.icon}</div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-black text-[#F5F1E6]">{tier.label}</p>
                <p className="text-[10px] text-[rgba(212,175,55,0.45)]">
                  {unlocked ? 'Bonus claimed ✓' : isNext ? `${nextMilestone!.count - totalReferred} more friend${nextMilestone!.count - totalReferred !== 1 ? 's' : ''} to go` : 'Bonus reward'}
                </p>
              </div>
              <div className="text-right flex-shrink-0">
                <p className={`text-sm font-black font-heading ${unlocked ? 'text-[#2ECC71]' : isNext ? 'text-[#F5D576]' : 'text-[rgba(212,175,55,0.45)]'}`}>
                  {tier.reward}
                </p>
                {unlocked && <p className="text-[9px] font-black text-[rgba(46,204,113,0.6)]">Earned</p>}
              </div>
            </motion.div>
          );
        })}
      </motion.div>

      {/* ── Friends list ──────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35 }}
        className="space-y-2"
      >
        <h2 className="text-[10px] font-black text-[rgba(212,175,55,0.55)] uppercase tracking-[0.2em] mb-3 px-1 flex items-center gap-2">
          <Users className="w-3 h-3 text-gold" /> Friends You Referred
        </h2>
        {MOCK_REFERRALS.length === 0 ? (
          <div className="text-center py-8 text-[rgba(212,175,55,0.35)] text-sm">
            No referrals yet — share your code!
          </div>
        ) : (
          MOCK_REFERRALS.map((ref, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 + i * 0.06 }}
              className="flex items-center gap-3.5 p-3.5 rounded-2xl border border-[rgba(212,175,55,0.18)] bg-[#0d2419]"
            >
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#F5D576] to-[#B8860B] flex items-center justify-center text-sm font-black text-[#0B2318] flex-shrink-0 shadow-[0_0_8px_rgba(212,175,55,0.25)]">
                {ref.initials}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-black text-[#F5F1E6]">{ref.name}</p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#2ECC71] animate-pulse flex-shrink-0" />
                  <p className="text-[10px] text-[rgba(212,175,55,0.45)]">Joined {ref.joined}</p>
                </div>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-sm font-black text-[#2ECC71] font-heading">+{ref.earned}</p>
                <p className="text-[9px] font-bold text-[rgba(46,204,113,0.55)]">You earned</p>
              </div>
            </motion.div>
          ))
        )}
      </motion.div>

      {/* ── How it works (collapsible) ────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="royal-panel rounded-2xl overflow-hidden"
      >
        <button
          onClick={() => setShowHow(v => !v)}
          className="w-full flex items-center justify-between p-4 cursor-pointer"
        >
          <span className="text-[10px] font-black text-[rgba(212,175,55,0.55)] uppercase tracking-[0.2em] flex items-center gap-2">
            <Gift className="w-3 h-3 text-gold" /> How It Works
          </span>
          <motion.div animate={{ rotate: showHow ? 180 : 0 }} transition={{ duration: 0.2 }}>
            <ChevronDown className="w-4 h-4 text-[rgba(212,175,55,0.4)]" />
          </motion.div>
        </button>

        <AnimatePresence>
          {showHow && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="overflow-hidden"
            >
              <div className="px-4 pb-4 space-y-2.5 border-t border-[rgba(212,175,55,0.1)] pt-3">
                {HOW_IT_WORKS.map((s, i) => (
                  <motion.div
                    key={s.step}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.07 }}
                    className="flex items-center gap-3.5"
                  >
                    <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#F5D576] to-[#B8860B] flex items-center justify-center text-xs font-black text-[#0B2318] flex-shrink-0 shadow-[0_0_8px_rgba(212,175,55,0.3)]">
                      {s.step}
                    </div>
                    <span className="text-sm text-[#F5F1E6] font-medium flex-1">{s.text}</span>
                    <s.icon className="w-4 h-4 text-[rgba(212,175,55,0.35)] flex-shrink-0" />
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

    </div>
  );
}
