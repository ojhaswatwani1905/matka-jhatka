import React, { useState } from 'react';
import { ShieldCheck, HelpCircle, LockKeyhole, Crown, Globe } from 'lucide-react';
import { ProvablyFairModal } from '../ui/ProvablyFairModal';
import { useContent } from '../../content/useContent';

export const Footer: React.FC = () => {
  const [isFairnessOpen, setIsFairnessOpen] = useState(false);
  const { lang, setLanguage, t } = useContent();

  return (
    <footer className="w-full bg-[#061009] border-t border-[rgba(212,175,55,0.18)] py-10 px-4 md:px-8 text-[rgba(212,175,55,0.5)] text-xs mt-auto relative z-10">
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[rgba(212,175,55,0.4)] to-transparent" />

      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
        <div className="space-y-3 md:col-span-2">
          <div className="flex items-center justify-between sm:justify-start gap-4">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#F5D576] to-[#B8860B] flex items-center justify-center text-[#0B2318] shadow-[0_0_10px_rgba(212,175,55,0.3)]">
                <Crown className="w-4 h-4" />
              </div>
              <span className="text-base font-bold font-heading tracking-wide">
                <span className="text-gradient-gold">PLAY</span><span className="text-[#E8C97A]">ARENA</span>
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[rgba(212,175,55,0.1)] text-gold border border-[rgba(212,175,55,0.25)]">18+ ONLY</span>
            </div>

            {/* Language Switcher Toggle */}
            <div className="flex items-center gap-1 bg-[#0a1e12] border border-[rgba(212,175,55,0.25)] p-1 rounded-xl">
              <Globe className="w-3.5 h-3.5 text-gold ml-1" />
              <button
                onClick={() => setLanguage('en')}
                className={`px-2 py-0.5 rounded-lg text-[10px] font-black transition-colors cursor-pointer ${
                  lang === 'en' ? 'bg-gold text-[#0B2318]' : 'text-[rgba(212,175,55,0.6)] hover:text-gold'
                }`}
              >
                EN
              </button>
              <button
                onClick={() => setLanguage('hi')}
                className={`px-2 py-0.5 rounded-lg text-[10px] font-black transition-colors cursor-pointer ${
                  lang === 'hi' ? 'bg-gold text-[#0B2318]' : 'text-[rgba(212,175,55,0.6)] hover:text-gold'
                }`}
              >
                हिंदी
              </button>
            </div>
          </div>

          <p className="text-[rgba(212,175,55,0.45)] text-xs leading-relaxed max-w-md">
            {t('footer.tagline', '100% Safe & Encrypted Gaming Environment — Jaipur & Rajasthan Premier Royal Casino Simulation Platform.')}
          </p>

          <div className="flex items-center gap-4 text-[rgba(212,175,55,0.6)] pt-1 flex-wrap">
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
            <li><a href="/games/aviator" className="hover:text-gold transition-colors">Aviator Crash Game</a></li>
            <li><a href="/games/slots" className="hover:text-gold transition-colors">Royal 777 Slots</a></li>
            <li><a href="/games/color-prediction" className="hover:text-gold transition-colors">Color Prediction (WinGo)</a></li>
            <li><a href="/games/matka" className="hover:text-gold transition-colors">Matka Jhatka Bazaars</a></li>
            <li><a href="/games/mines" className="hover:text-gold transition-colors">Mines Strategy</a></li>
            <li><a href="/games/plinko" className="hover:text-gold transition-colors">Plinko Gold</a></li>
            <li><a href="/games/teen-patti" className="hover:text-gold transition-colors">Teen Patti Poker</a></li>
            <li><a href="/games" className="hover:text-gold transition-colors">All Casino Suite</a></li>
          </ul>
        </div>

        <div>
          <h4 className="text-[#E8C97A] font-bold mb-3 font-heading text-sm">Compliance & Trust</h4>
          <ul className="space-y-2 text-[rgba(212,175,55,0.5)]">
            <li><button onClick={() => setIsFairnessOpen(true)} className="hover:text-gold transition-colors cursor-pointer">Hash Audit Tool</button></li>
            <li><a href="/responsible-gaming" className="hover:text-gold transition-colors">Responsible Gaming</a></li>
            <li><a href="/leaderboard" className="hover:text-gold transition-colors">Live Leaderboard</a></li>
            <li><a href="/live" className="hover:text-gold transition-colors">Real-Time Bet Ticker</a></li>
            <li><a href="/admin" className="hover:text-amber-300 text-amber-400 font-bold transition-colors">🛡️ Admin Portal</a></li>
            <li><a href="/support" className="hover:text-gold transition-colors">Customer Support FAQ</a></li>
          </ul>
        </div>
      </div>

      <div className="max-w-7xl mx-auto pt-6 border-t border-[rgba(212,175,55,0.1)] flex flex-col md:flex-row items-center justify-between gap-4 text-[11px] text-[rgba(212,175,55,0.35)]">
        <p>© 2026 PlayArena Gaming Ltd. Jaipur, Rajasthan, India. License #PAG-88291/GC.</p>
        <p className="flex items-center gap-1">
          <HelpCircle className="w-3.5 h-3.5" /> Demo Real-Money Simulation — Play Responsibly.
        </p>
      </div>

      <ProvablyFairModal isOpen={isFairnessOpen} onClose={() => setIsFairnessOpen(false)} />
    </footer>
  );
};
