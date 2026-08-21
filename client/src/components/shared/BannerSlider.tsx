import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, Crown, UserPlus, Gift } from 'lucide-react';
import { Link } from 'react-router-dom';

interface Slide {
  id: string;
  eyebrow: string;
  headline: string;
  ribbonText: string;
  ctaText: string;
  ctaLink: string;
  bgGradient?: string;
  bgImage?: string;
  isActive?: boolean;
}

const DEFAULT_SLIDES: Slide[] = [
  {
    id: '1',
    eyebrow: '🏆 NEW PLAYER EXCLUSIVE',
    headline: '100% WELCOME\nBONUS',
    ribbonText: 'UP TO ₹5,777 EXTRA CASH',
    ctaText: 'Claim Bonus Now',
    ctaLink: '/auth/register',
    bgGradient: 'linear-gradient(135deg, #061A10 0%, #0B2318 40%, #1A4A2C 100%)',
  },
  {
    id: '2',
    eyebrow: '⚡ DAILY CASHBACK',
    headline: 'UP TO 4%\nCASHBACK',
    ribbonText: 'NEXT DAY AUTO-PAYOUT',
    ctaText: 'Deposit Now',
    ctaLink: '/wallet',
    bgGradient: 'linear-gradient(135deg, #061A10 0%, #0A2A15 40%, #153D24 100%)',
  },
  {
    id: '3',
    eyebrow: '🎲 MATKA JHATKA ARENA',
    headline: '900X\nODDS',
    ribbonText: 'KALYAN & MUMBAI MARKETS',
    ctaText: 'Play Matka Jhatka',
    ctaLink: '/games/matka',
    bgGradient: 'linear-gradient(135deg, #0A1A08 0%, #122808 40%, #1C3B10 100%)',
  },
];

const rewardTiles = [
  { label: 'Invite Friend', reward: 'GET ₹100', icon: '👥', detail: 'Per referral bonus' },
  { label: 'First Deposit', reward: '+37% BONUS', icon: '💰', detail: 'Welcome reward' },
];

interface BannerSliderProps {
  className?: string;
}

export default function BannerSlider({ className = '' }: BannerSliderProps) {
  const [slides, setSlides] = useState<Slide[]>(() => {
    try {
      const saved = localStorage.getItem('playarena_promo_slides');
      if (saved) {
        const parsed: Slide[] = JSON.parse(saved);
        const active = parsed.filter(s => s.isActive !== false);
        if (active.length > 0) return active;
      }
    } catch { /* ignore */ }
    return DEFAULT_SLIDES;
  });

  const [current, setCurrent] = useState(0);

  // Fetch live server slides
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/promo-slides');
        const json = await res.json();
        if (json.success && Array.isArray(json.data) && json.data.length > 0) {
          setSlides(json.data.filter((s: any) => s.isActive !== false));
        }
      } catch {
        // Continue with local storage fallback
      }
    })();
  }, []);

  const next = useCallback(() => {
    setSlides(prev => {
      if (prev.length === 0) return prev;
      setCurrent(c => (c + 1) % prev.length);
      return prev;
    });
  }, []);

  const prev = useCallback(() => {
    setSlides(prev => {
      if (prev.length === 0) return prev;
      setCurrent(c => (c - 1 + prev.length) % prev.length);
      return prev;
    });
  }, []);

  useEffect(() => {
    if (slides.length === 0) return;
    const timer = setInterval(next, 5500);
    return () => clearInterval(timer);
  }, [next, slides.length]);

  const slide = slides[current] || DEFAULT_SLIDES[0];

  return (
    <div
      className={`relative w-full h-full overflow-hidden rounded-3xl border border-[rgba(212,175,55,0.45)] shadow-[0_0_60px_rgba(212,175,55,0.15),0_20px_60px_rgba(0,0,0,0.6)] flex flex-col ${className}`}
      style={{ minHeight: '260px' }}
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={slide.id || current}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.35, ease: 'easeInOut' }}
          className="relative w-full h-full flex-1 flex items-center overflow-hidden"
          style={{ background: slide.bgImage ? `url(${slide.bgImage}) center/cover` : slide.bgGradient || 'linear-gradient(135deg, #061A10 0%, #0B2318 40%, #1A4A2C 100%)' }}
        >
          {/* Ornate gold border glow */}
          <div className="absolute inset-0 rounded-3xl pointer-events-none z-10" style={{
            boxShadow: 'inset 0 0 0 1px rgba(212,175,55,0.2), inset 0 0 40px rgba(212,175,55,0.05)'
          }} />

          {/* Character image with seamless gradient feathering (No hard cut) */}
          <div
            className="absolute right-0 top-0 bottom-0 w-3/5 sm:w-1/2 lg:w-3/5 pointer-events-none select-none flex items-end justify-end overflow-hidden z-0"
            style={{
              WebkitMaskImage: 'linear-gradient(to right, transparent 0%, rgba(0,0,0,0.2) 20%, rgba(0,0,0,0.85) 55%, black 90%)',
              maskImage: 'linear-gradient(to right, transparent 0%, rgba(0,0,0,0.2) 20%, rgba(0,0,0,0.85) 55%, black 90%)',
            }}
          >
            <img
              src="/royal-queen-hero.png"
              alt="Royal Queen"
              className="h-full w-full object-cover object-right-top opacity-90 sm:opacity-95"
            />
          </div>

          {/* Left Content Column */}
          <div className="relative z-10 p-4 sm:p-6 w-[70%] sm:w-[68%] flex flex-col justify-between h-full">
            <div>
              {/* Eyebrow & Promo Tag */}
              <div className="flex items-center gap-2 mb-2 sm:mb-2.5">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 sm:px-3 sm:py-1 rounded-full bg-[rgba(212,175,55,0.15)] border border-[rgba(212,175,55,0.3)]">
                  <Crown className="w-3 h-3 text-gold shrink-0" />
                  <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-wider text-gold truncate">
                    {slide.eyebrow}
                  </span>
                </div>
              </div>

              {/* Headline with 3D gold bevel */}
              <motion.h2
                key={slide.id + '-h'}
                initial={{ y: 6, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.08 }}
                className="text-gold-3d text-lg sm:text-2xl md:text-3xl font-black font-heading leading-tight mb-2 sm:mb-2.5 whitespace-pre-line"
              >
                {slide.headline}
              </motion.h2>

              {/* Ribbon frame subtitle */}
              <motion.div
                key={slide.id + '-r'}
                initial={{ y: 6, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.14 }}
                className="inline-block mb-2.5 sm:mb-3 max-w-full"
              >
                <div className="ribbon-frame text-[9px] sm:text-[11px] px-2.5 sm:px-4 py-1 truncate">
                  {slide.ribbonText}
                </div>
              </motion.div>

              {/* Reward tiles — clean side-by-side or stacked without overlapping artwork */}
              <motion.div
                key={slide.id + '-t'}
                initial={{ y: 6, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="flex flex-wrap sm:flex-nowrap items-center gap-1.5 sm:gap-2 mb-3"
              >
                {rewardTiles.map((tile) => (
                  <div
                    key={tile.label}
                    className="flex items-center gap-1.5 px-2 py-1 sm:px-2.5 sm:py-1.5 rounded-xl bg-[#061510]/85 border border-[rgba(212,175,55,0.25)] shadow-sm backdrop-blur-sm"
                  >
                    <span className="text-xs sm:text-sm shrink-0">{tile.icon}</span>
                    <div className="min-w-0">
                      <div className="text-[7px] sm:text-[8px] text-[rgba(212,175,55,0.7)] font-bold uppercase truncate leading-none mb-0.5">
                        {tile.label}
                      </div>
                      <div className="text-[9px] sm:text-[10px] font-black text-gold truncate leading-tight whitespace-nowrap">
                        {tile.reward}
                      </div>
                    </div>
                  </div>
                ))}
              </motion.div>
            </div>

            {/* Bottom Row: CTA Button & Dots */}
            <div className="flex items-center justify-between gap-3 pt-1">
              <Link
                to={slide.ctaLink}
                className="btn-royal-gold inline-flex items-center gap-1.5 px-3.5 sm:px-5 py-1.5 sm:py-2 text-[11px] sm:text-xs font-black uppercase tracking-wider shadow-lg shrink-0"
              >
                <UserPlus className="w-3.5 h-3.5" />
                {slide.ctaText}
              </Link>

              {/* Dot indicators */}
              <div className="flex items-center gap-1.5 shrink-0 pr-1">
                {slides.map((_, i) => (
                  <button key={i} onClick={() => setCurrent(i)} className="cursor-pointer">
                    <motion.div
                      animate={{
                        width: i === current ? 20 : 6,
                        backgroundColor: i === current ? '#D4AF37' : 'rgba(212,175,55,0.3)',
                      }}
                      transition={{ duration: 0.2 }}
                      className="h-1.5 rounded-full"
                    />
                  </button>
                ))}
              </div>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Top-right sleek slide navigation controls (NO overlapping the slide body!) */}
      <div className="absolute top-3 right-3 z-20 flex items-center gap-1.5">
        <div className="hidden sm:flex items-center gap-1 px-2 py-1 rounded-lg bg-[#0B2318]/90 border border-[rgba(212,175,55,0.3)] backdrop-blur-md mr-1">
          <Gift className="w-3 h-3 text-gold" />
          <span className="text-[9px] font-black text-gold uppercase tracking-wider">Promo</span>
        </div>
        <button
          onClick={prev}
          title="Previous slide"
          className="w-7 h-7 rounded-lg bg-[#0B2318]/90 hover:bg-[#0B2318] text-[rgba(212,175,55,0.7)] hover:text-gold flex items-center justify-center border border-[rgba(212,175,55,0.3)] backdrop-blur-md transition-all cursor-pointer shadow-md"
        >
          <ChevronLeft size={14} />
        </button>
        <button
          onClick={next}
          title="Next slide"
          className="w-7 h-7 rounded-lg bg-[#0B2318]/90 hover:bg-[#0B2318] text-[rgba(212,175,55,0.7)] hover:text-gold flex items-center justify-center border border-[rgba(212,175,55,0.3)] backdrop-blur-md transition-all cursor-pointer shadow-md"
        >
          <ChevronRight size={14} />
        </button>
      </div>
    </div>
  );
}
