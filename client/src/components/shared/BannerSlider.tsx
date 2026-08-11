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

// Coin component
function FloatingCoin({ style }: { style: React.CSSProperties }) {
  return (
    <div className="absolute pointer-events-none select-none text-xl coin-float opacity-75" style={style}>
      🪙
    </div>
  );
}

export default function BannerSlider() {
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
    <div className="relative w-full overflow-hidden rounded-2xl border border-[rgba(212,175,55,0.35)] shadow-[0_0_40px_rgba(212,175,55,0.15)]"
         style={{ minHeight: '240px' }}>

      <AnimatePresence mode="wait">
        <motion.div
          key={slide.id || current}
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -30 }}
          transition={{ duration: 0.4, ease: 'easeInOut' }}
          className="relative min-h-[240px] sm:min-h-[270px] flex items-center"
          style={{ background: slide.bgImage ? `url(${slide.bgImage}) center/cover` : slide.bgGradient || 'linear-gradient(135deg, #061A10 0%, #0B2318 40%, #1A4A2C 100%)' }}
        >
          {/* Ornate gold border glow */}
          <div className="absolute inset-0 rounded-2xl pointer-events-none" style={{
            boxShadow: 'inset 0 0 0 1px rgba(212,175,55,0.2), inset 0 0 40px rgba(212,175,55,0.05)'
          }} />

          {/* Palace column overlay on right */}
          <div className="absolute right-0 top-0 bottom-0 w-2/5 overflow-hidden opacity-30">
            <div className="absolute inset-0 bg-gradient-to-l from-[rgba(212,175,55,0.1)] to-transparent" />
          </div>

          {/* Character image — right third */}
          <div className="absolute right-0 bottom-0 h-full w-2/5 sm:w-1/3 pointer-events-none select-none flex items-end justify-center overflow-hidden">
            <img
              src="/royal-queen-hero.png"
              alt="Royal Queen"
              className="sm:h-full sm:w-full sm:object-cover sm:object-top h-[85%] w-auto object-contain object-bottom opacity-90 max-h-full"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-[#0B2318]/90 via-transparent to-transparent" />
          </div>

          {/* Floating coins */}
          <FloatingCoin style={{ top: '15%', left: '55%', animationDelay: '0s', fontSize: '18px' }} />
          <FloatingCoin style={{ top: '60%', left: '60%', animationDelay: '1.2s', fontSize: '14px' }} />
          <FloatingCoin style={{ top: '25%', left: '70%', animationDelay: '0.7s', fontSize: '22px' }} />
          <FloatingCoin style={{ top: '70%', left: '45%', animationDelay: '2s', fontSize: '16px' }} />

          {/* Content — left side */}
          <div className="relative z-10 px-6 sm:px-8 py-6 w-3/5 sm:w-2/3">
            {/* Eyebrow */}
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[rgba(212,175,55,0.15)] border border-[rgba(212,175,55,0.3)] mb-3">
              <Crown className="w-3 h-3 text-gold" />
              <span className="text-[10px] font-black uppercase tracking-widest text-gold">{slide.eyebrow}</span>
            </div>

            {/* Headline with 3D gold bevel */}
            <motion.h2
              key={slide.id + '-h'}
              initial={{ y: 8, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.1 }}
              className="text-gold-3d text-2xl sm:text-3xl md:text-4xl font-black font-heading leading-tight mb-3 whitespace-pre-line"
            >
              {slide.headline}
            </motion.h2>

            {/* Ribbon frame subtitle */}
            <motion.div
              key={slide.id + '-r'}
              initial={{ y: 8, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.18 }}
              className="inline-block mb-4"
            >
              <div className="ribbon-frame text-[11px] px-6 py-1.5">
                {slide.ribbonText}
              </div>
            </motion.div>

            {/* Reward tiles */}
            <motion.div
              key={slide.id + '-t'}
              initial={{ y: 8, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.25 }}
              className="flex items-center gap-2 mb-4"
            >
              {rewardTiles.map((tile) => (
                <div key={tile.label}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[rgba(212,175,55,0.1)] border border-[rgba(212,175,55,0.3)]"
                >
                  <span className="text-base">{tile.icon}</span>
                  <div>
                    <div className="text-[9px] text-[rgba(212,175,55,0.7)] font-bold uppercase">{tile.label}</div>
                    <div className="text-[11px] font-black text-gold">{tile.reward}</div>
                  </div>
                </div>
              ))}
            </motion.div>

            {/* CTA */}
            <motion.div
              key={slide.id + '-c'}
              initial={{ y: 8, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.33 }}
            >
              <Link
                to={slide.ctaLink}
                className="btn-royal-gold inline-flex items-center gap-2 px-6 py-2.5 text-xs font-black uppercase tracking-wider"
              >
                <UserPlus className="w-3.5 h-3.5" />
                {slide.ctaText}
              </Link>
            </motion.div>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Nav arrows */}
      <button
        onClick={prev}
        className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-xl bg-[#0B2318]/80 hover:bg-[#0B2318] text-[rgba(212,175,55,0.7)] hover:text-gold flex items-center justify-center border border-[rgba(212,175,55,0.3)] backdrop-blur-md transition-all cursor-pointer z-20"
      >
        <ChevronLeft size={18} />
      </button>
      <button
        onClick={next}
        className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-xl bg-[#0B2318]/80 hover:bg-[#0B2318] text-[rgba(212,175,55,0.7)] hover:text-gold flex items-center justify-center border border-[rgba(212,175,55,0.3)] backdrop-blur-md transition-all cursor-pointer z-20"
      >
        <ChevronRight size={18} />
      </button>

      {/* Dot indicators */}
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5 z-20">
        {slides.map((_, i) => (
          <button key={i} onClick={() => setCurrent(i)} className="cursor-pointer">
            <motion.div
              animate={{
                width: i === current ? 28 : 8,
                backgroundColor: i === current ? '#D4AF37' : 'rgba(212,175,55,0.3)',
              }}
              transition={{ duration: 0.25 }}
              className="h-1.5 rounded-full"
            />
          </button>
        ))}
      </div>

      {/* Gift promo badge */}
      <div className="absolute top-3 right-3 z-20 hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-[#0B2318]/80 border border-[rgba(212,175,55,0.4)] backdrop-blur-md">
        <Gift className="w-3.5 h-3.5 text-gold" />
        <span className="text-[10px] font-black text-gold uppercase tracking-wider">Bonus</span>
      </div>
    </div>
  );
}
