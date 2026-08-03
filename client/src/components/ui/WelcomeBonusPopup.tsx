import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Flame, Zap, Crown } from 'lucide-react';
import { Link } from 'react-router-dom';

const POPUP_KEY = 'playarena_welcome_popup_v3';

const bonusTable = [
  { deposit: 100,   bonus: 37 },
  { deposit: 300,   bonus: 111 },
  { deposit: 500,   bonus: 185 },
  { deposit: 1000,  bonus: 370 },
  { deposit: 3000,  bonus: 1110 },
  { deposit: 5000,  bonus: 1850 },
  { deposit: 10000, bonus: 3700 },
  { deposit: 20000, bonus: 7400 },
  { deposit: 30000, bonus: 11100 },
  { deposit: 50000, bonus: 18500 },
];

const COINS = Array.from({ length: 14 }, (_, i) => ({
  id: i,
  x: 5 + (i * 7) % 95,
  delay: (i * 0.4) % 5,
  dur: 3.5 + (i % 4),
  emoji: ['💰', '✨', '💎', '🔥', '⚡'][i % 5],
  size: 14 + (i % 3) * 6,
}));

export default function WelcomeBonusPopup() {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const seen = localStorage.getItem(POPUP_KEY);
    if (!seen) {
      const t = setTimeout(() => setIsOpen(true), 1800);
      return () => clearTimeout(t);
    }
  }, []);

  const handleClose = () => {
    localStorage.setItem(POPUP_KEY, '1');
    setIsOpen(false);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        /* ── Backdrop ─────────────────────────────────────── */
        <motion.div
          key="backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4 }}
          className="fixed inset-0 z-[300] flex items-center justify-center"
          style={{ background: 'rgba(0,0,0,0.88)', backdropFilter: 'blur(10px)' }}
          onClick={handleClose}
        >
          {/* Floating particles */}
          {COINS.map(c => (
            <motion.span
              key={c.id}
              className="absolute pointer-events-none select-none"
              style={{ left: `${c.x}%`, bottom: '-5%', fontSize: c.size, lineHeight: 1 }}
              animate={{ y: [0, -1100], opacity: [0, 0.9, 0.9, 0], rotate: [-20, 20] }}
              transition={{ duration: c.dur, delay: c.delay, repeat: Infinity, ease: 'easeOut' }}
            >
              {c.emoji}
            </motion.span>
          ))}

          {/* ── Main card — horizontal split ──────────────── */}
          <motion.div
            key="card"
            initial={{ opacity: 0, scale: 0.82, y: 50, rotateX: 6 }}
            animate={{ opacity: 1, scale: 1,    y: 0,  rotateX: 0 }}
            exit={{ opacity: 0, scale: 0.88, y: 30 }}
            transition={{ type: 'spring', stiffness: 240, damping: 24, delay: 0.05 }}
            style={{
              transformPerspective: 1200,
              maxWidth: 680,
              border: '1.5px solid rgba(212,175,55,0.55)',
              boxShadow: '0 0 0 1px rgba(212,175,55,0.12), 0 0 80px rgba(212,175,55,0.25), 0 30px 80px rgba(0,0,0,0.8)',
            }}
            onClick={e => e.stopPropagation()}
            className="relative flex w-full mx-3 rounded-3xl overflow-hidden"
          >
            {/* ── LEFT — Queen photo panel ─────────────────── */}
            <motion.div
              className="relative hidden sm:block flex-shrink-0"
              style={{ width: 260 }}
              initial={{ x: -60, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.18, duration: 0.55, ease: 'easeOut' }}
            >
              {/* Queen image — full cover, no clipping */}
              <img
                src="/royal-queen-popup.png"
                alt="Royal Queen"
                className="w-full h-full object-cover object-center"
                style={{ display: 'block', minHeight: 520 }}
              />
              {/* Gradient fade → right so it blends into the dark panel */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-transparent to-[#0a0f0a]/90 pointer-events-none" />
              {/* Top subtle fade */}
              <div className="absolute inset-0 bg-gradient-to-b from-[#0a0f0a]/40 via-transparent to-transparent pointer-events-none" />

              {/* HOT badge on photo */}
              <motion.div
                className="absolute top-4 left-4 flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider text-white"
                style={{ background: 'linear-gradient(135deg,#ff2d55,#ff6600)', boxShadow: '0 0 18px rgba(255,45,85,0.7)' }}
                animate={{ boxShadow: ['0 0 14px rgba(255,45,85,0.5)', '0 0 32px rgba(255,45,85,1)', '0 0 14px rgba(255,45,85,0.5)'] }}
                transition={{ duration: 1.6, repeat: Infinity }}
              >
                <Flame className="w-3 h-3" /> HOT DEAL
              </motion.div>

              {/* Amount overlay on photo */}
              <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-[#060e07] via-[#060e07]/80 to-transparent">
                <div className="text-[9px] font-black text-[rgba(212,175,55,0.6)] uppercase tracking-[0.25em]">Bonus Up To</div>
                <motion.div
                  className="text-4xl font-black font-heading leading-none mt-0.5"
                  style={{ color: '#FFE57F' }}
                  animate={{
                    textShadow: [
                      '0 0 12px rgba(212,175,55,0.5)',
                      '0 0 35px rgba(212,175,55,1), 0 0 60px rgba(255,229,127,0.4)',
                      '0 0 12px rgba(212,175,55,0.5)',
                    ],
                  }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  ₹18,500
                </motion.div>
                <motion.div
                  className="text-[9px] font-black mt-1 flex items-center gap-1"
                  style={{ color: '#2ECC71' }}
                  animate={{ opacity: [0.6, 1, 0.6] }}
                  transition={{ duration: 1.4, repeat: Infinity }}
                >
                  <Zap className="w-2.5 h-2.5" /> 37% EXTRA CASH BONUS
                </motion.div>
              </div>
            </motion.div>

            {/* ── RIGHT — Info panel ───────────────────────── */}
            <motion.div
              className="flex-1 flex flex-col relative"
              style={{ background: 'linear-gradient(160deg, #0a1410 0%, #0B2318 50%, #071008 100%)' }}
              initial={{ x: 60, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.22, duration: 0.55, ease: 'easeOut' }}
            >
              {/* Animated top gold line */}
              <div className="absolute top-0 left-0 right-0 h-[2px] overflow-hidden">
                <motion.div
                  className="h-full"
                  style={{ background: 'linear-gradient(90deg, transparent, #FFE57F, #D4AF37, #FFE57F, transparent)' }}
                  animate={{ x: ['-100%', '100%'] }}
                  transition={{ duration: 2.5, repeat: Infinity, ease: 'linear' }}
                />
              </div>

              {/* Inner radial glow */}
              <div className="absolute inset-0 pointer-events-none"
                style={{ background: 'radial-gradient(ellipse at 60% 0%, rgba(212,175,55,0.1) 0%, transparent 65%)' }}
              />

              {/* Close button */}
              <button
                onClick={handleClose}
                className="absolute top-3 right-3 z-20 w-7 h-7 rounded-full flex items-center justify-center cursor-pointer transition-all hover:bg-white/10"
                style={{ background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.15)' }}
              >
                <X className="w-3.5 h-3.5 text-white/60" />
              </button>

              <div className="relative z-10 flex flex-col h-full p-5 pt-6">

                {/* Crown + title */}
                <div className="flex items-center gap-2.5 mb-1">
                  <motion.div
                    className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: 'linear-gradient(135deg,#F5D576,#B8860B)', boxShadow: '0 0 20px rgba(212,175,55,0.6)' }}
                    animate={{ boxShadow: ['0 0 14px rgba(212,175,55,0.4)', '0 0 30px rgba(212,175,55,0.9)', '0 0 14px rgba(212,175,55,0.4)'] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  >
                    <Crown className="w-5 h-5 text-[#0B2318]" />
                  </motion.div>
                  <div>
                    <h2
                      className="text-lg font-black font-heading leading-none"
                      style={{
                        background: 'linear-gradient(135deg, #FFE57F, #D4AF37, #FFE57F)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        backgroundClip: 'text',
                      }}
                    >
                      FIRST DEPOSIT BONUS
                    </h2>
                    <p className="text-[9px] font-black text-[rgba(46,204,113,0.8)] uppercase tracking-widest mt-0.5">New Player Exclusive</p>
                  </div>
                </div>

                {/* Mobile-only amount */}
                <div className="sm:hidden mb-3 mt-1">
                  <div className="text-[9px] font-black text-[rgba(212,175,55,0.5)] uppercase tracking-widest">Bonus Up To</div>
                  <div className="text-3xl font-black font-heading" style={{ color: '#FFE57F' }}>₹18,500</div>
                </div>

                {/* Divider */}
                <div className="h-px bg-gradient-to-r from-transparent via-[rgba(212,175,55,0.3)] to-transparent mb-3" />

                {/* Table */}
                <div className="flex-1 overflow-hidden rounded-xl border border-[rgba(212,175,55,0.25)]"
                  style={{ background: 'rgba(0,0,0,0.35)' }}
                >
                  {/* Header */}
                  <div className="grid grid-cols-2 px-3 py-2"
                    style={{ background: 'linear-gradient(90deg, rgba(212,175,55,0.18), rgba(212,175,55,0.06))' }}
                  >
                    <span className="text-[9px] font-black text-gold uppercase tracking-wider">Deposit (₹)</span>
                    <span className="text-[9px] font-black text-gold uppercase tracking-wider text-right">You Get (₹)</span>
                  </div>

                  {/* Rows with stagger */}
                  {bonusTable.map((row, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: 10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.35 + i * 0.035 }}
                      className="grid grid-cols-2 px-3 py-[5px] border-t border-[rgba(212,175,55,0.06)]"
                      style={{ background: i % 2 === 0 ? 'rgba(212,175,55,0.025)' : 'transparent' }}
                    >
                      <span className="text-[11px] font-semibold text-[#E8E8E8]">
                        {row.deposit.toLocaleString('en-IN')}
                      </span>
                      <span className="text-[11px] font-black text-right" style={{ color: '#2ECC71' }}>
                        +{row.bonus.toLocaleString('en-IN')}
                      </span>
                    </motion.div>
                  ))}
                </div>

                {/* CTA */}
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.8 }}
                  className="mt-3"
                >
                  <Link
                    to="/wallet"
                    onClick={handleClose}
                    className="relative w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl font-black text-sm uppercase tracking-widest overflow-hidden cursor-pointer text-white"
                    style={{
                      background: 'linear-gradient(135deg, #ff2d55 0%, #ff6b35 50%, #ffb700 100%)',
                      boxShadow: '0 0 30px rgba(255,45,85,0.5), 0 4px 20px rgba(255,107,53,0.4)',
                    }}
                  >
                    {/* Shimmer */}
                    <motion.div
                      className="absolute inset-0 pointer-events-none"
                      style={{ background: 'linear-gradient(60deg, transparent 25%, rgba(255,255,255,0.3) 50%, transparent 75%)' }}
                      animate={{ x: ['-100%', '200%'] }}
                      transition={{ duration: 2, repeat: Infinity, repeatDelay: 1 }}
                    />
                    <Flame className="w-4 h-4 relative z-10" />
                    <span className="relative z-10">💰 GRAB MY BONUS</span>
                    <Flame className="w-4 h-4 relative z-10" />
                  </Link>

                  <p className="text-center text-[8px] text-[rgba(212,175,55,0.3)] mt-2 font-bold tracking-wide">
                    Limited time · New users only · T&amp;C apply
                  </p>
                </motion.div>
              </div>

              {/* Bottom gold line */}
              <div className="absolute bottom-0 left-0 right-0 h-[2px]"
                style={{ background: 'linear-gradient(90deg, transparent, #D4AF37, #FFE57F, #D4AF37, transparent)' }}
              />
            </motion.div>
          </motion.div>

          {/* Close pill below card */}
          <motion.button
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            onClick={handleClose}
            className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-bold text-white/50 hover:text-white/80 cursor-pointer transition-colors"
            style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)' }}
          >
            <X className="w-3 h-3" /> Close
          </motion.button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
