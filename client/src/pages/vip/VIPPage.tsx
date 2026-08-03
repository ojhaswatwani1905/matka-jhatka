import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Crown, Star, Zap, Shield, Gift, Lock, TrendingUp,
  ChevronRight, Sparkles, Flame, Trophy,
} from 'lucide-react';
import { useWallet } from '../../store/WalletContext';

/* ── Tier data ──────────────────────────────────────────────── */
const VIP_TIERS = [
  {
    name: 'Bronze',
    min: 0,
    max: 10000,
    color: '#CD7F32',
    bg: 'linear-gradient(135deg,#4a2800,#8B4513)',
    reward: '₹100 weekly bonus',
    badge: '🥉',
    perks: ['Birthday bonus', 'Priority chat support'],
  },
  {
    name: 'Silver',
    min: 10000,
    max: 50000,
    color: '#C0C0C0',
    bg: 'linear-gradient(135deg,#3a3a3a,#7a7a7a)',
    reward: '₹500 weekly bonus',
    badge: '🥈',
    perks: ['Bronze perks', 'Same-day withdrawals', '2% cashback on losses'],
  },
  {
    name: 'Gold',
    min: 50000,
    max: 150000,
    color: '#D4AF37',
    bg: 'linear-gradient(135deg,#3a2900,#B8860B)',
    reward: '₹2,000 weekly bonus',
    badge: '🥇',
    perks: ['Silver perks', '5% weekly cashback', 'Dedicated WhatsApp manager'],
  },
  {
    name: 'Platinum',
    min: 150000,
    max: 500000,
    color: '#E5E4E2',
    bg: 'linear-gradient(135deg,#1a2a2a,#4a6a6a)',
    reward: '₹8,000 weekly bonus',
    badge: '💠',
    perks: ['Gold perks', '10% rakeback daily', 'VIP tournaments access', 'Exclusive deposit bonuses'],
  },
  {
    name: 'Diamond',
    min: 500000,
    max: Infinity,
    color: '#B9F2FF',
    bg: 'linear-gradient(135deg,#001a33,#0066aa)',
    reward: '₹25,000 weekly bonus',
    badge: '💎',
    perks: ['Platinum perks', '15% rakeback daily', 'Personal VIP host', 'Luxury gifts', 'Private tournaments'],
  },
];

/* ── Perks data ─────────────────────────────────────────────── */
const PERKS = [
  { icon: Gift,       label: 'Weekly Cashback',      desc: 'Up to 10% of weekly losses returned automatically',  tier: 'Gold',     tierIdx: 2 },
  { icon: Zap,        label: 'Priority Withdrawals', desc: 'Same-day processing, skip the queue entirely',       tier: 'Silver',   tierIdx: 1 },
  { icon: Shield,     label: 'Dedicated Support',    desc: 'Personal manager available via WhatsApp',            tier: 'Platinum', tierIdx: 3 },
  { icon: Star,       label: 'Birthday Bonus',       desc: 'A surprise bonus delivered on your birthday',        tier: 'Bronze',   tierIdx: 0 },
  { icon: Crown,      label: 'Diamond Rakeback',     desc: '15% rakeback on all bets, paid daily',              tier: 'Diamond',  tierIdx: 4 },
  { icon: Trophy,     label: 'VIP Tournaments',      desc: 'Invite-only high-stakes tournament events',          tier: 'Platinum', tierIdx: 3 },
  { icon: Flame,      label: 'Loyalty Multiplier',   desc: 'Earn XP faster with tier-specific multipliers',     tier: 'Gold',     tierIdx: 2 },
  { icon: TrendingUp, label: 'Exclusive Bonuses',    desc: 'Deposit bonuses unavailable to regular players',    tier: 'Gold',     tierIdx: 2 },
];

function fmt(n: number) {
  return n.toLocaleString('en-IN');
}

export default function VIPPage() {
  useWallet();

  const totalWagered = 45200;
  const currentTierIdx = VIP_TIERS.findIndex(t => totalWagered >= t.min && totalWagered < t.max);
  const safeIdx = Math.max(0, currentTierIdx);
  const currentTier = VIP_TIERS[safeIdx];
  const nextTier = VIP_TIERS[safeIdx + 1];
  const progress = nextTier
    ? ((totalWagered - currentTier.min) / (nextTier.min - currentTier.min)) * 100
    : 100;

  const [expandedTier, setExpandedTier] = useState<string | null>(null);

  return (
    <div className="space-y-5 pb-10">

      {/* ── Hero card ─────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative overflow-hidden rounded-3xl border border-[rgba(212,175,55,0.4)] shadow-[0_0_60px_rgba(212,175,55,0.15)]"
        style={{ background: 'linear-gradient(145deg,#0a1e12 0%,#0B2318 60%,#091a0f 100%)' }}
      >
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-[#D4AF37] to-transparent" />
        <div className="absolute -top-16 -right-16 w-64 h-64 rounded-full bg-[rgba(212,175,55,0.08)] blur-3xl pointer-events-none" />
        <div className="absolute -bottom-10 -left-10 w-48 h-48 rounded-full bg-[rgba(46,204,113,0.05)] blur-3xl pointer-events-none" />
        <div className="absolute bottom-2 right-4 text-[120px] leading-none select-none opacity-[0.04] font-black">♛</div>

        <div className="relative z-10 p-6">
          <div className="flex items-center gap-2.5 mb-1">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#F5D576] to-[#B8860B] flex items-center justify-center shadow-[0_0_12px_rgba(212,175,55,0.5)]">
              <Crown className="w-4 h-4 text-[#0B2318]" />
            </div>
            <h1 className="text-2xl font-black text-[#E8C97A] font-heading tracking-tight">VIP Royal Club</h1>
            <span className="ml-auto text-[10px] font-black tracking-widest text-[rgba(212,175,55,0.6)] border border-[rgba(212,175,55,0.25)] rounded-full px-2 py-0.5 bg-[rgba(212,175,55,0.05)]">EXCLUSIVE</span>
          </div>
          <p className="text-xs text-[rgba(212,175,55,0.5)] mb-6">Climb the ranks — unlock elite rewards at every level</p>

          {/* Current tier */}
          <div className="flex items-start gap-4">
            <div
              className="w-20 h-20 rounded-2xl flex items-center justify-center text-4xl flex-shrink-0 shadow-xl border border-[rgba(255,255,255,0.12)]"
              style={{ background: currentTier.bg }}
            >
              {currentTier.badge}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-xl font-black font-heading" style={{ color: currentTier.color }}>{currentTier.name}</span>
                <span className="text-[10px] font-black px-2 py-0.5 rounded-full border border-[rgba(212,175,55,0.35)] text-[rgba(212,175,55,0.7)] bg-[rgba(212,175,55,0.06)]">YOUR TIER</span>
              </div>
              <p className="text-xs text-[rgba(212,175,55,0.5)] mb-3">{currentTier.reward}</p>

              {nextTier && (
                <>
                  <div className="h-3 bg-[#061510] rounded-full overflow-hidden border border-[rgba(212,175,55,0.15)] mb-1.5">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${progress}%` }}
                      transition={{ duration: 1.4, ease: 'easeOut' }}
                      className="h-full rounded-full"
                      style={{ background: `linear-gradient(90deg, ${currentTier.color}80, ${currentTier.color}, ${nextTier.color})` }}
                    />
                  </div>
                  <div className="flex justify-between text-[10px] font-bold text-[rgba(212,175,55,0.45)]">
                    <span>₹{fmt(totalWagered)} wagered</span>
                    <span>₹{fmt(nextTier.min)} → {nextTier.name} {nextTier.badge}</span>
                  </div>
                </>
              )}
              {!nextTier && (
                <p className="text-xs font-black text-[#B9F2FF]">✦ Maximum tier reached ✦</p>
              )}
            </div>
          </div>

          {/* Mini stats strip */}
          <div className="grid grid-cols-3 gap-2.5 mt-5">
            {[
              { label: 'Wagered',  value: `₹${fmt(totalWagered)}` },
              { label: 'Tier',     value: currentTier.name },
              { label: 'Next Up',  value: nextTier ? nextTier.name : '—' },
            ].map(s => (
              <div key={s.label} className="text-center p-2.5 rounded-xl border border-[rgba(212,175,55,0.15)] bg-[rgba(212,175,55,0.04)]">
                <p className="text-xs font-black text-[#F5D576] font-heading truncate">{s.value}</p>
                <p className="text-[9px] text-[rgba(212,175,55,0.45)] font-bold mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </motion.div>

      {/* ── Tier ladder ───────────────────────────────────────── */}
      <div>
        <h2 className="text-[10px] font-black text-[rgba(212,175,55,0.55)] uppercase tracking-[0.2em] mb-3 px-1 flex items-center gap-2">
          <Sparkles className="w-3 h-3 text-gold" /> All VIP Tiers
        </h2>
        <div className="space-y-2">
          {VIP_TIERS.map((tier, i) => {
            const isUnlocked = totalWagered >= tier.min;
            const isCurrent  = tier.name === currentTier.name;
            const isExpanded = expandedTier === tier.name;

            return (
              <motion.div
                key={tier.name}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.07 }}
              >
                <button
                  onClick={() => setExpandedTier(isExpanded ? null : tier.name)}
                  className={`w-full text-left flex items-center gap-3 p-4 rounded-2xl border transition-all duration-200 ${
                    isCurrent
                      ? 'border-[rgba(212,175,55,0.5)] bg-[rgba(212,175,55,0.08)] shadow-[0_0_20px_rgba(212,175,55,0.1)]'
                      : isUnlocked
                      ? 'border-[rgba(212,175,55,0.2)] bg-[#0d2419]'
                      : 'border-[rgba(212,175,55,0.1)] bg-[rgba(11,35,24,0.5)] opacity-55'
                  }`}
                >
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl flex-shrink-0 border border-[rgba(255,255,255,0.1)] shadow-lg"
                    style={{ background: tier.bg }}
                  >
                    {tier.badge}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-sm font-black text-[#F5F1E6]">{tier.name} VIP</span>
                      {isCurrent && (
                        <span className="text-[9px] font-black text-[#D4AF37] bg-[rgba(212,175,55,0.12)] px-2 py-0.5 rounded-full border border-[rgba(212,175,55,0.3)]">
                          YOU ARE HERE
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-[rgba(212,175,55,0.5)]">{tier.reward}</p>
                    {tier.max !== Infinity && (
                      <p className="text-[10px] text-[rgba(212,175,55,0.3)] mt-0.5">
                        ₹{fmt(tier.min)} – ₹{fmt(tier.max)}
                      </p>
                    )}
                  </div>

                  <div className="flex-shrink-0 flex flex-col items-end gap-1.5">
                    {isUnlocked
                      ? <span className="text-[10px] font-black text-[#2ECC71]">✓ Active</span>
                      : <Lock className="w-3.5 h-3.5 text-[rgba(212,175,55,0.3)]" />
                    }
                    <motion.div animate={{ rotate: isExpanded ? 90 : 0 }} transition={{ duration: 0.2 }}>
                      <ChevronRight className="w-3.5 h-3.5 text-[rgba(212,175,55,0.35)]" />
                    </motion.div>
                  </div>
                </button>

                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.22 }}
                      className="overflow-hidden"
                    >
                      <div className="mt-1.5 ml-4 p-3.5 rounded-xl border border-[rgba(212,175,55,0.12)] bg-[rgba(212,175,55,0.03)]">
                        <p className="text-[9px] font-black text-[rgba(212,175,55,0.5)] uppercase tracking-widest mb-2">Perks included</p>
                        <div className="space-y-1.5">
                          {tier.perks.map(p => (
                            <div key={p} className="flex items-center gap-2 text-xs text-[#F5F1E6]">
                              <span style={{ color: tier.color }}>✦</span> {p}
                            </div>
                          ))}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* ── Member Perks grid ─────────────────────────────────── */}
      <div>
        <h2 className="text-[10px] font-black text-[rgba(212,175,55,0.55)] uppercase tracking-[0.2em] mb-3 px-1 flex items-center gap-2">
          <Crown className="w-3 h-3 text-gold" /> Member Perks
        </h2>
        <div className="grid grid-cols-2 gap-2.5">
          {PERKS.map((perk, i) => {
            const unlocked = safeIdx >= perk.tierIdx;
            return (
              <motion.div
                key={perk.label}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 + i * 0.05 }}
                className={`relative overflow-hidden p-3.5 rounded-2xl border transition-all ${
                  unlocked
                    ? 'border-[rgba(212,175,55,0.28)] bg-[#0d2419]'
                    : 'border-[rgba(212,175,55,0.1)] bg-[rgba(11,35,24,0.5)] opacity-50'
                }`}
              >
                {!unlocked && (
                  <div className="absolute top-2 right-2">
                    <Lock className="w-3 h-3 text-[rgba(212,175,55,0.35)]" />
                  </div>
                )}
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-2.5 border ${
                  unlocked
                    ? 'bg-[rgba(212,175,55,0.1)] border-[rgba(212,175,55,0.25)]'
                    : 'bg-[rgba(212,175,55,0.04)] border-[rgba(212,175,55,0.1)]'
                }`}>
                  <perk.icon className={`w-4 h-4 ${unlocked ? 'text-gold' : 'text-[rgba(212,175,55,0.3)]'}`} />
                </div>
                <p className="text-xs font-black text-[#F5F1E6] leading-tight mb-1">{perk.label}</p>
                <p className="text-[10px] text-[rgba(212,175,55,0.45)] leading-relaxed">{perk.desc}</p>
                <span className={`inline-block mt-2 text-[9px] font-black px-1.5 py-0.5 rounded-full border ${
                  unlocked
                    ? 'border-[rgba(46,204,113,0.4)] text-[#2ECC71] bg-[rgba(46,204,113,0.06)]'
                    : 'border-[rgba(212,175,55,0.15)] text-[rgba(212,175,55,0.45)]'
                }`}>
                  {unlocked ? '✓ Active' : `${perk.tier}+`}
                </span>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* ── CTA bottom ────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="relative overflow-hidden rounded-2xl p-5 border border-[rgba(212,175,55,0.35)] text-center"
        style={{ background: 'linear-gradient(135deg,#0a1e12,#0B2318,#0a1e12)' }}
      >
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,rgba(212,175,55,0.12),transparent_70%)] pointer-events-none" />
        <Crown className="w-10 h-10 text-gold mx-auto mb-3 drop-shadow-[0_0_10px_rgba(212,175,55,0.5)]" />
        <p className="text-lg font-black text-[#E8C97A] font-heading mb-1">Climb the Ranks</p>
        <p className="text-xs text-[rgba(212,175,55,0.5)] mb-4 max-w-xs mx-auto leading-relaxed">
          Every rupee wagered counts toward your VIP tier. The higher you climb, the more you earn.
        </p>
        {nextTier && (
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-[rgba(212,175,55,0.3)] bg-[rgba(212,175,55,0.06)] text-xs font-black text-[#F5D576]">
            <span>{nextTier.badge}</span>
            ₹{fmt(nextTier.min - totalWagered)} more to reach {nextTier.name}
          </div>
        )}
      </motion.div>
    </div>
  );
}
