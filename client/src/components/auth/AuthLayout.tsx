import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Crown, ArrowLeft, ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';

interface AuthLayoutProps {
  children: React.ReactNode;
  title: string;
  subtitle: string;
  activeMode?: 'login' | 'register' | 'forgot';
}

export const AuthLayout: React.FC<AuthLayoutProps> = ({
  children,
  title,
  subtitle,
}) => {
  const [imgFailed, setImgFailed] = useState(false);

  return (
    <div className="w-full min-h-screen lg:h-screen lg:max-h-screen bg-[#0B2318] text-[#F5F1E6] flex flex-col lg:flex-row relative overflow-x-hidden lg:overflow-hidden">
      {/* Mobile Header */}
      <header className="lg:hidden w-full h-14 bg-[#0d2419]/97 border-b border-[rgba(212,175,55,0.22)] px-4 flex items-center justify-between z-30 sticky top-0 backdrop-blur-md">
        <Link to="/" className="flex items-center gap-2 text-[rgba(212,175,55,0.6)] hover:text-gold transition-colors">
          <ArrowLeft className="w-4 h-4" />
          <span className="text-xs font-bold">Home</span>
        </Link>

        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#F5D576] to-[#B8860B] flex items-center justify-center text-[#0B2318] font-black shadow-[0_0_10px_rgba(212,175,55,0.4)]">
            <Crown className="w-4 h-4" />
          </div>
          <span className="text-sm font-black font-heading tracking-tight text-gradient-gold">PLAYARENA</span>
        </div>

        <div className="flex items-center gap-1 bg-[rgba(212,175,55,0.1)] px-2 py-1 rounded-lg border border-[rgba(212,175,55,0.2)] text-[10px] font-bold text-gold">
          <ShieldCheck className="w-3 h-3" />
          <span>18+</span>
        </div>
      </header>

      {/* Form Zone (Left Column) */}
      <div className="w-full lg:w-[45%] xl:w-[40%] flex flex-col justify-between p-5 sm:p-8 lg:px-10 lg:py-6 h-full max-h-screen overflow-y-auto lg:overflow-hidden relative z-10 bg-[#0B2318]/95">
        {/* Gold top accent line */}
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-[#D4AF37] to-transparent lg:hidden" />

        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: 'easeOut' }}
          className="w-full max-w-[380px] mx-auto space-y-4 my-auto"
        >
          {/* Brand Logo */}
          <div className="flex items-center justify-between">
            <Link to="/" className="flex items-center gap-2.5 group">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#F5D576] via-[#D4AF37] to-[#B8860B] flex items-center justify-center shadow-[0_0_15px_rgba(212,175,55,0.4)] group-hover:shadow-[0_0_22px_rgba(212,175,55,0.6)] transition-all">
                <Crown className="w-5 h-5 text-[#0B2318]" strokeWidth={2.5} />
              </div>
              <div>
                <span className="text-lg font-black font-heading text-gradient-gold tracking-tight block leading-none"
                  style={{ textShadow: '0 1px 0 #B8860B' }}>
                  PLAYARENA
                </span>
                <span className="text-[9px] font-bold text-[rgba(212,175,55,0.5)] uppercase tracking-widest">ROYAL CASINO</span>
              </div>
            </Link>

            <Link to="/" className="hidden sm:flex items-center gap-1.5 text-xs text-[rgba(212,175,55,0.6)] hover:text-gold transition-colors">
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to home</span>
            </Link>
          </div>

          {/* Gold divider */}
          <div className="gold-divider" />

          {/* Headline */}
          <div className="space-y-1">
            <h1 className="text-xl sm:text-2xl font-black text-[#E8C97A] font-heading tracking-tight">{title}</h1>
            <p className="text-xs text-[rgba(212,175,55,0.5)] leading-relaxed">{subtitle}</p>
          </div>

          {/* Form Content */}
          <div className="w-full space-y-4">
            {children}
          </div>
        </motion.div>
      </div>

      {/* Hero Visual Zone — 55% right column, palace + character */}
      <div className="hidden lg:block lg:w-[55%] xl:w-[60%] relative overflow-hidden h-screen max-h-screen border-l border-[rgba(212,175,55,0.2)]"
        style={{ background: 'linear-gradient(135deg, #061A10 0%, #0B2318 40%, #0F3324 100%)' }}
      >
        {!imgFailed ? (
          <img
            src="/royal-queen-hero.png"
            alt="Royal Palace — PlayArena Casino"
            onError={() => setImgFailed(true)}
            className="w-full h-full object-cover object-center"
            style={{ filter: 'brightness(0.85) contrast(1.05)' }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center relative p-12">
            <div className="text-center space-y-4 opacity-50">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[#F5D576] to-[#B8860B] flex items-center justify-center mx-auto shadow-[0_0_30px_rgba(212,175,55,0.4)]">
                <Crown className="w-10 h-10 text-[#0B2318]" />
              </div>
              <p className="text-sm font-black tracking-widest text-[rgba(212,175,55,0.6)] uppercase font-heading">PLAYARENA ROYAL CASINO</p>
            </div>
          </div>
        )}

        {/* Gradient scrim + caption */}
        {!imgFailed && (
          <div className="absolute inset-x-0 bottom-0 p-6 bg-gradient-to-t from-[#0B2318]/90 via-[#0B2318]/40 to-transparent flex items-end justify-between">
            <p className="text-xs font-bold text-[rgba(212,175,55,0.7)] tracking-wide">
              PlayArena — Royal Casino Platform
            </p>
            <span className="gold-badge">PROVABLY FAIR</span>
          </div>
        )}

        {/* Gold vertical ornament lines */}
        <div className="absolute left-0 top-0 bottom-0 w-px bg-gradient-to-b from-transparent via-[rgba(212,175,55,0.4)] to-transparent" />
      </div>
    </div>
  );
};
