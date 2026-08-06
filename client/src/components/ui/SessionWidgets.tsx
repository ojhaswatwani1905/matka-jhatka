/**
 * Session Warning Banner + Reality Check popup
 * Mounted once globally in AppLayout — listens for rg:session-warning events
 */
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, X } from 'lucide-react';
import { useRG } from '../../store/RGContext';
import { useWallet } from '../../store/WalletContext';
import { formatCurrency } from '../../lib/utils';

export function SessionWarningBanner() {
  const [showWarning, setShowWarning] = useState(false);
  const [remainingMs, setRemainingMs] = useState(0);

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail as { remaining: number };
      setRemainingMs(detail.remaining);
      setShowWarning(true);
    };
    window.addEventListener('rg:session-warning', handler);
    return () => window.removeEventListener('rg:session-warning', handler);
  }, []);

  const mins = Math.ceil(remainingMs / 60000);

  return (
    <AnimatePresence>
      {showWarning && (
        <motion.div
          initial={{ y: -60, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -60, opacity: 0 }}
          className="fixed top-16 left-0 right-0 z-50 mx-4 mt-2"
        >
          <div className="max-w-lg mx-auto flex items-center gap-3 px-4 py-3 rounded-2xl bg-amber-500/10 border border-amber-500/40 backdrop-blur-xl shadow-[0_4px_20px_rgba(245,158,11,0.2)]">
            <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 animate-pulse" />
            <p className="flex-1 text-xs font-bold text-amber-300">
              ⏱ Session limit — <strong>{mins} minute{mins !== 1 ? 's' : ''}</strong> remaining before auto-logout.
            </p>
            <button onClick={() => setShowWarning(false)} className="text-amber-400/60 hover:text-amber-400 cursor-pointer">
              <X className="w-4 h-4" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function RealityCheckPopup() {
  const { settings, sessionElapsedMs } = useRG();
  const { transactions } = useWallet();
  const [show, setShow] = useState(false);
  const [lastCheck, setLastCheck] = useState(Date.now());

  useEffect(() => {
    if (settings.realityCheckHours === 0) return;
    const intervalMs = settings.realityCheckHours * 3600000;
    const interval = setInterval(() => {
      if (Date.now() - lastCheck >= intervalMs) {
        setShow(true);
        setLastCheck(Date.now());
      }
    }, 60000); // check every minute
    return () => clearInterval(interval);
  }, [settings.realityCheckHours, lastCheck]);

  // Net session P&L
  const sessionNet = (() => {
    const started = Date.now() - sessionElapsedMs();
    const sessionTxns = transactions.filter(t => new Date(t.createdAt).getTime() >= started);
    const won = sessionTxns.filter(t => t.type === 'win').reduce((s, t) => s + t.amount, 0);
    const bet = sessionTxns.filter(t => t.type === 'bet').reduce((s, t) => s + t.amount, 0);
    return won - bet;
  })();

  const elapsedMin = Math.floor(sessionElapsedMs() / 60000);
  const elapsedH = Math.floor(elapsedMin / 60);
  const elapsedM = elapsedMin % 60;
  const elapsedStr = elapsedH > 0 ? `${elapsedH}h ${elapsedM}m` : `${elapsedM}m`;

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)' }}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="royal-panel rounded-3xl p-6 w-full max-w-sm space-y-4"
          >
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-amber-500 to-transparent rounded-t-3xl" />
            <div className="text-center space-y-1">
              <div className="text-4xl">🛡️</div>
              <h3 className="text-lg font-black text-[#E8C97A]">Reality Check</h3>
              <p className="text-xs text-[rgba(212,175,55,0.5)]">You've been playing for a while. Here's how things are going.</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="royal-panel rounded-xl p-3 text-center">
                <p className="text-xl font-black text-gold font-heading">{elapsedStr}</p>
                <p className="text-[9px] text-[rgba(212,175,55,0.45)] mt-0.5">Session Duration</p>
              </div>
              <div className="royal-panel rounded-xl p-3 text-center">
                <p className={`text-xl font-black font-heading ${sessionNet >= 0 ? 'text-[#2ECC71]' : 'text-[#FF4D6D]'}`}>
                  {sessionNet >= 0 ? '+' : ''}₹{formatCurrency(Math.abs(sessionNet))}
                </p>
                <p className="text-[9px] text-[rgba(212,175,55,0.45)] mt-0.5">Session Net P&L</p>
              </div>
            </div>
            <p className="text-[10px] text-[rgba(212,175,55,0.45)] text-center leading-relaxed">
              Remember to gamble responsibly. Take breaks and never bet more than you can afford to lose.
            </p>
            <button onClick={() => setShow(false)}
              className="w-full btn-royal-gold py-3 rounded-xl font-black text-sm cursor-pointer">
              Continue Playing
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
