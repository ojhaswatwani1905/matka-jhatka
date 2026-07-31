import React, { useState } from 'react';
import { ShieldCheck, HelpCircle, Lock } from 'lucide-react';
import { ProvablyFairModal } from '../ui/ProvablyFairModal';

export const Footer: React.FC = () => {
  const [isFairnessOpen, setIsFairnessOpen] = useState(false);

  return (
    <footer className="w-full bg-[#070913] border-t border-white/5 py-10 px-4 md:px-8 text-slate-400 text-xs mt-auto relative z-10">
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
        {/* Brand & Responsible Gaming */}
        <div className="space-y-3 md:col-span-2">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-gold to-amber-500 flex items-center justify-center font-bold text-black font-heading text-sm">
              P
            </div>
            <span className="text-base font-bold text-white font-heading tracking-wide">
              PLAY<span className="text-gold">ARENA</span>
            </span>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
              18+ ONLY
            </span>
          </div>
          <p className="text-slate-400 text-xs leading-relaxed max-w-md">
            PlayArena operates as an international gaming platform offering provably fair color prediction and matka numbers gaming. Please play responsibly and within your financial limits.
          </p>
          <div className="flex items-center gap-4 text-slate-300 pt-1">
            <button
              onClick={() => setIsFairnessOpen(true)}
              className="flex items-center gap-1.5 hover:text-gold transition-colors cursor-pointer"
            >
              <ShieldCheck className="w-4 h-4 text-gold" />
              <span>Provably Fair Verification</span>
            </button>
            <span className="text-slate-700">|</span>
            <div className="flex items-center gap-1.5 text-slate-400">
              <Lock className="w-4 h-4 text-emerald-400" />
              <span>SSL 256-Bit Encrypted</span>
            </div>
          </div>
        </div>

        {/* Quick Links */}
        <div>
          <h4 className="text-white font-bold mb-3 font-heading text-sm">Platform & Gaming</h4>
          <ul className="space-y-2 text-slate-400">
            <li><a href="/games/color-prediction" className="hover:text-white transition-colors">Color Prediction (WinGo)</a></li>
            <li><a href="/games/matka" className="hover:text-white transition-colors">Matka Jhatka</a></li>
            <li><a href="/games" className="hover:text-white transition-colors">All Casino Games</a></li>
            <li><a href="/history" className="hover:text-white transition-colors">Round History</a></li>
          </ul>
        </div>

        {/* Compliance & Support */}
        <div>
          <h4 className="text-white font-bold mb-3 font-heading text-sm">Compliance & Trust</h4>
          <ul className="space-y-2 text-slate-400">
            <li><button onClick={() => setIsFairnessOpen(true)} className="hover:text-white transition-colors cursor-pointer">Hash Audit Tool</button></li>
            <li><a href="/support" className="hover:text-white transition-colors">Responsible Gaming & Self-Exclusion</a></li>
            <li><a href="/support" className="hover:text-white transition-colors">Terms of Service & Privacy</a></li>
            <li><a href="/support" className="hover:text-white transition-colors">Customer Support FAQ</a></li>
          </ul>
        </div>
      </div>

      <div className="max-w-7xl mx-auto pt-6 border-t border-white/5 flex flex-col md:flex-row items-center justify-between gap-4 text-[11px] text-slate-500">
        <p>© 2026 PlayArena Gaming Ltd. All rights reserved. International License #PAG-88291/GC.</p>
        <p className="text-slate-400 flex items-center gap-1">
          <HelpCircle className="w-3.5 h-3.5" /> Demo Real-Money Simulation — Play Responsibly.
        </p>
      </div>

      <ProvablyFairModal isOpen={isFairnessOpen} onClose={() => setIsFairnessOpen(false)} />
    </footer>
  );
};
