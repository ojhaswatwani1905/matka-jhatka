import React, { useState, useEffect } from 'react';
import { ShieldAlert, CheckCircle } from 'lucide-react';

export const AgeGateModal: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [agreedTerms, setAgreedTerms] = useState(true);

  useEffect(() => {
    const isConfirmed = localStorage.getItem('casino_age_confirmed');
    if (!isConfirmed) {
      setIsOpen(true);
    }
  }, []);

  const handleConfirm = () => {
    if (!agreedTerms) return;
    localStorage.setItem('casino_age_confirmed', 'true');
    setIsOpen(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-md app-card overflow-hidden border border-gold/40 shadow-2xl p-6 text-center">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gold/10 border border-gold/30 flex items-center justify-center text-gold">
          <ShieldAlert className="w-8 h-8" />
        </div>

        <h2 className="text-xl font-bold text-white font-heading mb-2">Age & Jurisdiction Gate</h2>
        <p className="text-xs text-slate-300 mb-6 leading-relaxed">
          Welcome to <span className="text-gold font-bold">PlayArena</span>. You must be at least 18 years old (or legal age in your jurisdiction) and acknowledge that real-money style gaming is allowed in your region to access games.
        </p>

        <div className="space-y-4 text-left mb-6">
          <label className="flex items-start gap-3 p-3 rounded-xl bg-slate-900/80 border border-slate-800 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={agreedTerms}
              onChange={(e) => setAgreedTerms(e.target.checked)}
              className="mt-0.5 accent-gold"
            />
            <span className="text-xs text-slate-300 leading-snug">
              I am 18+ years old and accept the Responsible Gaming policies, Terms of Service, and regional jurisdiction laws.
            </span>
          </label>
        </div>

        <button
          onClick={handleConfirm}
          disabled={!agreedTerms}
          className="w-full py-3 rounded-xl font-bold text-black btn-gold-shimmer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer shadow-lg"
        >
          <CheckCircle className="w-5 h-5" />
          I Confirm — Enter Platform
        </button>
      </div>
    </div>
  );
};
