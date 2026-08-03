import React, { useState } from 'react';
import { ShieldCheck, HelpCircle, LockKeyhole, Crown } from 'lucide-react';
import { ProvablyFairModal } from '../ui/ProvablyFairModal';

export const Footer: React.FC = () => {
  const [isFairnessOpen, setIsFairnessOpen] = useState(false);

  return (
    <footer className="w-full bg-[#061009] border-t border-[rgba(212,175,55,0.18)] py-10 px-4 md:px-8 text-[rgba(212,175,55,0.5)] text-xs mt-auto relative z-10">
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[rgba(212,175,55,0.4)] to-transparent" />

      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
        <div className="space-y-3 md:col-span-2">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#F5D576] to-[#B8860B] flex items-center justify-center text-[#0B2318] shadow-[0_0_10px_rgba(212,175,55,0.3)]">
              <Crown className="w-4 h-4" />
            </div>
            <span className="text-base font-bold font-heading tracking-wide">
              <span className="text-gradient-gold">PLAY</span><span className="text-[#E8C97A]">ARENA</span>
            </span>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[rgba(212,175,55,0.1)] text-gold border border-[rgba(212,175,55,0.25)]">18+ ONLY</span>
          </div>
          <p className="text-[rgba(212,175,55,0.45)] text-xs leading-relaxed max-w-md">
            PlayArena operates as an international gaming platform offering provably fair color prediction and matka numbers gaming. Please play responsibly and within your financial limits.
          </p>
          <div className="flex items-center gap-4 text-[rgba(212,175,55,0.6)] pt-1">
            <button onClick={() => setIsFairnessOpen(true)} className="flex items-center gap-1.5 hover:text-gold transition-colors cursor-pointer">
              <ShieldCheck className="w-4 h-4 text-gold" />
              <span>Provably Fair Verification</span>
            </button>
            <span className="text-[rgba(212,175,55,0.2)]">|</span>
            <div className="flex items-center gap-1.5">
              <LockKeyhole className="w-4 h-4 text-[#2ECC71]" />
              <span>SSL 256-Bit Encrypted</span>
            </div>
          </div>
        </div>

        <div>
          <h4 className="text-[#E8C97A] font-bold mb-3 font-heading text-sm">Platform & Gaming</h4>
          <ul className="space-y-2 text-[rgba(212,175,55,0.5)]">
            <li><a href="/games/color-prediction" className="hover:text-gold transition-colors">Color Prediction (WinGo)</a></li>
            <li><a href="/games/matka" className="hover:text-gold transition-colors">Matka Jhatka</a></li>
            <li><a href="/games" className="hover:text-gold transition-colors">All Casino Games</a></li>
            <li><a href="/history" className="hover:text-gold transition-colors">Round History</a></li>
          </ul>
        </div>

        <div>
          <h4 className="text-[#E8C97A] font-bold mb-3 font-heading text-sm">Compliance & Trust</h4>
          <ul className="space-y-2 text-[rgba(212,175,55,0.5)]">
            <li><button onClick={() => setIsFairnessOpen(true)} className="hover:text-gold transition-colors cursor-pointer">Hash Audit Tool</button></li>
            <li><a href="/support" className="hover:text-gold transition-colors">Responsible Gaming</a></li>
            <li><a href="/support" className="hover:text-gold transition-colors">Terms of Service & Privacy</a></li>
            <li><a href="/support" className="hover:text-gold transition-colors">Customer Support FAQ</a></li>
          </ul>
        </div>
      </div>

      <div className="max-w-7xl mx-auto pt-6 border-t border-[rgba(212,175,55,0.1)] flex flex-col md:flex-row items-center justify-between gap-4 text-[11px] text-[rgba(212,175,55,0.35)]">
        <p>© 2026 PlayArena Gaming Ltd. All rights reserved. International License #PAG-88291/GC.</p>
        <p className="flex items-center gap-1">
          <HelpCircle className="w-3.5 h-3.5" /> Demo Real-Money Simulation — Play Responsibly.
        </p>
      </div>

      <ProvablyFairModal isOpen={isFairnessOpen} onClose={() => setIsFairnessOpen(false)} />
    </footer>
  );
};
