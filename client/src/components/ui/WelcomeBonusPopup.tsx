import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Crown, X } from 'lucide-react';
import { Link } from 'react-router-dom';

const POPUP_KEY = 'playarena_welcome_popup_seen';

const bonusTable = [
  { deposit: 100, bonus: 37 },
  { deposit: 300, bonus: 111 },
  { deposit: 500, bonus: 185 },
  { deposit: 1000, bonus: 370 },
  { deposit: 3000, bonus: 1110 },
  { deposit: 5000, bonus: 1850 },
  { deposit: 10000, bonus: 3700 },
  { deposit: 20000, bonus: 7400 },
  { deposit: 30000, bonus: 11100 },
  { deposit: 50000, bonus: 18500 },
];

export default function WelcomeBonusPopup() {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const seen = localStorage.getItem(POPUP_KEY);
    if (!seen) {
      const timer = setTimeout(() => setIsOpen(true), 2500);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleClose = () => {
    localStorage.setItem(POPUP_KEY, '1');
    setIsOpen(false);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm"
          onClick={handleClose}
        >
          <motion.div
            initial={{ scale: 0.85, opacity: 0, y: 30 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.85, opacity: 0, y: 30 }}
            transition={{ type: 'spring', stiffness: 280, damping: 25 }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-[340px] flex flex-col items-center"
          >
            {/* CARD */}
            <div className="w-full rounded-2xl overflow-hidden relative"
              style={{
                background: 'linear-gradient(180deg, #0a1f12 0%, #0B2318 50%, #061009 100%)',
                border: '1px solid rgba(212,175,55,0.45)',
                boxShadow: '0 0 60px rgba(212,175,55,0.25), 0 0 0 1px rgba(212,175,55,0.1), inset 0 0 60px rgba(212,175,55,0.03)',
              }}
            >
              {/* Ornate top gold arch */}
              <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-[#B8860B] via-[#F5D576] to-[#B8860B]" />

              {/* Palace background art layer */}
              <div className="absolute inset-0 opacity-20"
                style={{
                  backgroundImage: 'radial-gradient(ellipse at 50% 0%, rgba(212,175,55,0.3) 0%, transparent 60%)',
                }} />

              {/* Crown top — floating above card */}
              <div className="flex justify-center pt-5 pb-2 relative z-10">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#F5D576] to-[#B8860B] flex items-center justify-center shadow-[0_0_30px_rgba(212,175,55,0.6)]">
                  <Crown className="w-8 h-8 text-[#0B2318]" strokeWidth={2} />
                </div>
              </div>

              {/* Headline */}
              <div className="text-center px-5 pb-2 relative z-10">
                <h2 className="text-gold-3d text-3xl font-black font-heading leading-tight">
                  FIRST<br />DEPOSIT<br />BONUS
                </h2>
                <div className="inline-block mt-2">
                  <div className="ribbon-frame text-[10px] px-5 py-1">
                    NEW PLAYER EXCLUSIVE REWARD
                  </div>
                </div>
              </div>

              {/* Amount highlight */}
              <div className="flex items-center gap-3 px-5 py-3 relative z-10">
                <div>
                  <div className="text-[10px] text-[rgba(212,175,55,0.6)] font-bold uppercase">Up To</div>
                  <div className="text-3xl font-black text-gold text-gold-3d leading-none">₹18,500</div>
                  <div className="text-[9px] text-[#2ECC71] font-bold mt-0.5">▲ UP TO 37% EXTRA CASH BONUS</div>
                </div>
              </div>

              {/* Table + character container */}
              <div className="relative px-3 pb-2">
                {/* Deposit table */}
                <div className="rounded-xl overflow-hidden border border-[rgba(212,175,55,0.3)]">
                  <div className="grid grid-cols-2 bg-[rgba(212,175,55,0.15)] px-3 py-1.5">
                    <span className="text-[10px] font-black text-gold uppercase">DEPOSIT (₹)</span>
                    <span className="text-[10px] font-black text-gold uppercase text-right">BONUS (₹)</span>
                  </div>
                  {bonusTable.map((row, i) => (
                    <div key={i} className={`grid grid-cols-2 px-3 py-1 ${i % 2 === 0 ? 'bg-[rgba(212,175,55,0.04)]' : 'bg-transparent'}`}>
                      <span className="text-[11px] font-bold text-[#F5F1E6]">{row.deposit.toLocaleString()}</span>
                      <span className="text-[11px] font-bold text-gold text-right">{row.bonus.toLocaleString()}</span>
                    </div>
                  ))}
                </div>

                {/* Character image overlapping bottom-right of table */}
                <div className="absolute bottom-0 right-2 w-28 h-36 pointer-events-none select-none">
                  <img
                    src="/royal-queen-popup.png"
                    alt="Royal Queen"
                    className="w-full h-full object-cover object-top rounded-xl"
                    style={{ filter: 'drop-shadow(0 0 12px rgba(212,175,55,0.4))' }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#061009]/40 to-transparent rounded-xl" />
                </div>
              </div>

              {/* CTA Button */}
              <div className="px-5 pt-4 pb-5 relative z-10">
                <Link
                  to="/wallet"
                  onClick={handleClose}
                  className="btn-emerald-cta w-full py-3.5 flex items-center justify-center text-sm font-black uppercase tracking-widest"
                >
                  💰 CLAIM BONUS NOW
                </Link>
              </div>

              {/* Bottom ornate gold arch */}
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-[#B8860B] via-[#F5D576] to-[#B8860B]" />
            </div>

            {/* Close circle below card */}
            <button
              onClick={handleClose}
              className="mt-4 w-10 h-10 rounded-full bg-[rgba(255,255,255,0.1)] border border-[rgba(255,255,255,0.2)] flex items-center justify-center text-white hover:bg-[rgba(255,255,255,0.2)] transition-all cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
