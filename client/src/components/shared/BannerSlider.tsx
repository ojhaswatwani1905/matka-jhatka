import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, Sparkles } from 'lucide-react';
import type { BannerSlide } from '../../types';

const slides: BannerSlide[] = [
  {
    id: '1',
    title: '🎰 100% Welcome Bonus',
    subtitle: 'Get 5,000 free demo coins instantly to kickstart your win streak!',
    ctaText: 'Claim Bonus Now',
    ctaLink: '/register',
    gradient: 'linear-gradient(135deg, #1E1B4B 0%, #312E81 50%, #4C1D95 100%)',
  },
  {
    id: '2',
    title: '🎨 Color Prediction League',
    subtitle: 'Predict Green, Red, or Violet for up to 9x instant multiplier payouts!',
    ctaText: 'Play Color Game',
    ctaLink: '/games/color-prediction',
    gradient: 'linear-gradient(135deg, #064E3B 0%, #047857 50%, #059669 100%)',
  },
  {
    id: '3',
    title: '⚡ Matka Jhatka Arena',
    subtitle: 'Classic Kalyan & Mumbai markets with high-odds Single, Jodi & Patti bets!',
    ctaText: 'Play Matka Jhatka',
    ctaLink: '/games/matka',
    gradient: 'linear-gradient(135deg, #78350F 0%, #B45309 50%, #D97706 100%)',
  },
];

export default function BannerSlider() {
  const [current, setCurrent] = useState(0);

  const next = useCallback(() => {
    setCurrent((prev) => (prev + 1) % slides.length);
  }, []);

  const prev = useCallback(() => {
    setCurrent((prev) => (prev - 1 + slides.length) % slides.length);
  }, []);

  useEffect(() => {
    const timer = setInterval(next, 5000);
    return () => clearInterval(timer);
  }, [next]);

  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/10 shadow-2xl">
      <AnimatePresence mode="wait">
        <motion.div
          key={slides[current].id}
          initial={{ opacity: 0, x: 25 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -25 }}
          transition={{ duration: 0.35, ease: 'easeInOut' }}
          className="relative min-h-[200px] sm:min-h-[220px] flex items-center pl-16 sm:pl-20 pr-16 sm:pr-20 py-8"
          style={{ background: slides[current].gradient }}
        >
          {/* Ambient Lighting Background */}
          <div className="absolute top-0 right-0 w-64 h-64 rounded-full bg-white/10 blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-48 h-48 rounded-full bg-black/20 blur-2xl pointer-events-none" />
          <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:20px_20px]" />

          <div className="relative z-10 max-w-xl">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/40 border border-white/15 backdrop-blur-md mb-3 text-[10px] font-black uppercase text-gold tracking-widest">
              <Sparkles className="w-3 h-3 text-gold" /> Exclusive Offer
            </div>

            <motion.h2
              initial={{ y: 6, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.1 }}
              className="text-xl sm:text-2xl md:text-3xl font-black text-white font-heading tracking-tight mb-2 leading-tight"
            >
              {slides[current].title}
            </motion.h2>

            <motion.p
              initial={{ y: 6, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="text-xs sm:text-sm text-white/80 font-medium mb-5 leading-relaxed max-w-lg"
            >
              {slides[current].subtitle}
            </motion.p>

            <motion.button
              initial={{ y: 6, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3 }}
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.96 }}
              className="px-6 py-2.5 bg-gradient-to-r from-gold to-gold-dark hover:from-gold-light hover:to-gold text-navy-950 rounded-xl text-xs font-black uppercase tracking-wider shadow-lg shadow-gold/20 transition-all cursor-pointer"
            >
              {slides[current].ctaText}
            </motion.button>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Navigation Arrows with generous margin */}
      <button
        onClick={prev}
        className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-xl bg-navy-950/70 hover:bg-navy-950/95 text-white/80 hover:text-white flex items-center justify-center border border-white/15 backdrop-blur-md transition-all cursor-pointer z-20 shadow-lg"
      >
        <ChevronLeft size={20} />
      </button>
      <button
        onClick={next}
        className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-xl bg-navy-950/70 hover:bg-navy-950/95 text-white/80 hover:text-white flex items-center justify-center border border-white/15 backdrop-blur-md transition-all cursor-pointer z-20 shadow-lg"
      >
        <ChevronRight size={20} />
      </button>

      {/* Dot Indicators */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5 z-20">
        {slides.map((_, i) => (
          <button key={i} onClick={() => setCurrent(i)} className="cursor-pointer">
            <motion.div
              animate={{
                width: i === current ? 28 : 8,
                backgroundColor: i === current ? '#FFC700' : 'rgba(255,255,255,0.3)',
              }}
              transition={{ duration: 0.25 }}
              className="h-1.5 rounded-full"
            />
          </button>
        ))}
      </div>
    </div>
  );
}
