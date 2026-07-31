import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Gamepad2, ArrowLeft, ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';

interface AuthLayoutProps {
  children: React.ReactNode;
  title: string;
  subtitle: string;
  activeMode?: 'login' | 'register' | 'forgot';
  heroImage?: string;
  heroCaption?: string;
}

export const AuthLayout: React.FC<AuthLayoutProps> = ({
  children,
  title,
  subtitle,
  heroImage = '/auth-hero.png',
  heroCaption = 'PlayArena — Provably Fair Casino Platform',
}) => {
  const [imgFailed, setImgFailed] = useState(false);

  return (
    <div className="w-full min-h-screen lg:h-screen lg:max-h-screen bg-[#0B0D14] text-white flex flex-col lg:flex-row relative overflow-x-hidden lg:overflow-hidden selection:bg-gold selection:text-black">
      {/* Mobile Header */}
      <header className="lg:hidden w-full h-14 bg-[#0B0D14]/95 border-b border-white/10 px-4 flex items-center justify-between z-30 sticky top-0 backdrop-blur-md">
        <Link to="/" className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors">
          <ArrowLeft className="w-4 h-4" />
          <span className="text-xs font-bold">Home</span>
        </Link>

        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-gold flex items-center justify-center text-black font-black">
            <Gamepad2 className="w-4 h-4 text-black" />
          </div>
          <span className="text-sm font-black font-heading tracking-tight text-white">PLAYARENA</span>
        </div>

        <div className="flex items-center gap-1 bg-slate-900 px-2 py-1 rounded-lg border border-white/5 text-[10px] font-bold text-emerald-400">
          <ShieldCheck className="w-3 h-3 text-emerald-400" />
          <span>18+</span>
        </div>
      </header>

      {/* Form Zone (Left Column: 45% Width on Desktop) */}
      <div className="w-full lg:w-[45%] xl:w-[40%] flex flex-col justify-between p-5 sm:p-8 lg:px-10 lg:py-6 h-full max-h-screen overflow-y-auto lg:overflow-hidden relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: 'easeOut' }}
          className="w-full max-w-[380px] mx-auto space-y-4 my-auto"
        >
          {/* Brand Logo & Wordmark */}
          <div className="flex items-center justify-between">
            <Link to="/" className="flex items-center gap-2.5 group">
              <div className="w-8 h-8 rounded-xl bg-gold/10 border border-gold/30 flex items-center justify-center text-gold group-hover:bg-gold group-hover:text-black transition-all">
                <Gamepad2 className="w-4 h-4" />
              </div>
              <span className="text-base font-black font-heading tracking-tight text-white">PLAYARENA</span>
            </Link>

            <Link to="/" className="hidden sm:flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors">
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to home</span>
            </Link>
          </div>

          {/* Headline & Subtext */}
          <div className="space-y-1">
            <h1 className="text-xl sm:text-2xl font-black text-white font-heading tracking-tight">
              {title}
            </h1>
            <p className="text-xs text-slate-400 leading-relaxed">{subtitle}</p>
          </div>

          {/* Form Content */}
          <div className="w-full space-y-4">
            {children}
          </div>
        </motion.div>
      </div>

      {/* Hero Visual Zone (Full Bleed Image: 55% Width on Desktop) */}
      <div className="hidden lg:block lg:w-[55%] xl:w-[60%] relative bg-[#06080F] overflow-hidden h-screen max-h-screen border-l border-white/5">
        {!imgFailed ? (
          <img
            src={heroImage}
            alt="PlayArena Hero Visual"
            onError={() => setImgFailed(true)}
            className="w-full h-full object-cover object-center filter brightness-[0.9] contrast-[1.05]"
          />
        ) : (
          /* Graceful Fallback */
          <div className="w-full h-full bg-gradient-to-br from-[#060812] via-[#0D1120] to-[#080B15] flex items-center justify-center relative p-12">
            <div className="text-center space-y-3 opacity-40">
              <div className="w-16 h-16 rounded-2xl bg-gold/10 border border-gold/30 flex items-center justify-center mx-auto text-gold">
                <Gamepad2 className="w-8 h-8" />
              </div>
              <p className="text-xs font-mono tracking-widest text-slate-400 uppercase">PLAYARENA CASINO</p>
            </div>
          </div>
        )}

        {/* Subtle Bottom Gradient Scrim & Single Caption */}
        {heroCaption && !imgFailed && (
          <div className="absolute inset-x-0 bottom-0 p-6 bg-gradient-to-t from-black/80 via-black/40 to-transparent flex items-end justify-between">
            <p className="text-xs font-medium text-slate-300/90 tracking-wide drop-shadow-md">
              {heroCaption}
            </p>
            <span className="text-[10px] font-bold text-gold/80 uppercase tracking-widest px-2.5 py-1 rounded bg-black/40 border border-white/10 backdrop-blur-sm">
              PROVABLY FAIR
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
