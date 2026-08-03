import { motion } from 'framer-motion';
import { Palette, Dice1, Ticket, Fish, Trophy, Play, ChevronRight, ArrowDownLeft, ArrowUpRight, Crown, Lock } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useState } from 'react';
import BannerSlider from '../../components/shared/BannerSlider';
import RecentWinners from '../../components/shared/RecentWinners';
import AnimatedCounter from '../../components/ui/AnimatedCounter';
import WelcomeBonusPopup from '../../components/ui/WelcomeBonusPopup';
import { useWallet } from '../../store/WalletContext';
import { useAuth } from '../../store/AuthContext';

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06 } },
};
const item = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0 },
};

const gameCategories = [
  { id: 'all', label: '🔥 All Games', icon: null, active: true },
  { id: 'top', label: '⚡ TOP', icon: null },
  { id: 'color', label: '🎨 Color', icon: null },
  { id: 'matka', label: '🎲 Matka', icon: null },
  { id: 'lottery', label: '🎟 Lottery', icon: null },
  { id: 'ocean', label: '🌊 Ocean', icon: null },
];

const games = [
  {
    id: 'color-prediction',
    title: 'Color Prediction',
    subtitle: 'Win Go 1Min / 3Min',
    icon: <Palette className="w-10 h-10 text-white" />,
    path: '/games/color-prediction',
    badge: '🔥 PROVABLY FAIR',
    bg: 'linear-gradient(135deg, #0B2318 0%, #1A4A1A 100%)',
    accentColor: '#2ECC71',
    locked: false,
  },
  {
    id: 'matka',
    title: 'Matka Jhatka',
    subtitle: 'Kalyan & Mumbai',
    icon: <Dice1 className="w-10 h-10 text-white" />,
    path: '/games/matka',
    badge: '⚡ 900X ODDS',
    bg: 'linear-gradient(135deg, #1A1200 0%, #3D2D00 100%)',
    accentColor: '#D4AF37',
    locked: false,
  },
  {
    id: 'lottery',
    title: 'Lottery 5D',
    subtitle: '5D & K3 Draw',
    icon: <Ticket className="w-10 h-10 text-white" />,
    path: '/games',
    badge: '💰 JACKPOT',
    bg: 'linear-gradient(135deg, #0B1A00 0%, #1A3800 100%)',
    accentColor: '#8CC63F',
    locked: false,
  },
  {
    id: 'fishing',
    title: 'Ocean Hunter',
    subtitle: 'Arcade Fishing',
    icon: <Fish className="w-10 h-10 text-white" />,
    path: '/games',
    badge: '🌊 COMING SOON',
    bg: 'linear-gradient(135deg, #001A1A 0%, #002D2D 100%)',
    accentColor: '#1ABC9C',
    locked: true,
  },
];

export default function HomePage() {
  const { balance } = useWallet();
  const { isAuthenticated } = useAuth();
  const [activeCategory, setActiveCategory] = useState('all');

  return (
    <>
      <WelcomeBonusPopup />

      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="space-y-5 pb-6"
      >
        {/* 1. Hero Banner + Wallet Card */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Wallet Balance Card — Royal Ticket style */}
          <motion.div variants={item} className="lg:col-span-1">
            <div className="royal-panel p-5 h-full flex flex-col justify-between relative overflow-hidden" style={{ minHeight: '240px' }}>
              {/* Ornate top accent */}
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-[#D4AF37] to-transparent opacity-60" />
              <div className="absolute -top-12 -right-12 w-32 h-32 rounded-full bg-[rgba(212,175,55,0.05)] blur-2xl pointer-events-none" />

              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Crown className="w-4 h-4 text-gold" />
                  <span className="text-xs font-bold text-[rgba(212,175,55,0.7)] uppercase tracking-wider">Royal Balance</span>
                </div>
                <span className="gold-badge">VERIFIED</span>
              </div>

              <div className="my-2">
                <div className="flex items-baseline gap-1">
                  <span className="text-sm font-bold text-[rgba(212,175,55,0.6)]">₹</span>
                  <span className="text-3xl sm:text-4xl font-black text-gold font-heading tabular-nums tracking-tight">
                    <AnimatedCounter value={balance} decimals={2} duration={1} />
                  </span>
                </div>
                <div className="gold-divider mt-2 mb-1" />
                <span className="text-xs text-[rgba(212,175,55,0.5)]">Available for live betting & withdrawal</span>
              </div>

              <div className="grid grid-cols-2 gap-2.5 mt-4">
                <Link
                  to="/wallet"
                  className="btn-royal-gold py-2.5 rounded-xl text-xs font-black flex items-center justify-center gap-1.5"
                >
                  <ArrowDownLeft className="w-3.5 h-3.5" /> Deposit
                </Link>
                <Link
                  to="/wallet"
                  className="py-2.5 rounded-xl font-black text-xs text-[#E8C97A] bg-[rgba(212,175,55,0.08)] border border-[rgba(212,175,55,0.25)] flex items-center justify-center gap-1.5 hover:bg-[rgba(212,175,55,0.15)] transition-all"
                >
                  <ArrowUpRight className="w-3.5 h-3.5" /> Withdraw
                </Link>
              </div>

              {/* Corner flourish */}
              <div className="absolute bottom-3 right-3 text-[rgba(212,175,55,0.15)] text-4xl font-black font-heading select-none pointer-events-none">♛</div>
            </div>
          </motion.div>

          {/* Hero Banner Slider */}
          <motion.div variants={item} className="lg:col-span-2">
            <BannerSlider />
          </motion.div>
        </div>

        {/* 2. Category Pill Row (K3-style) */}
        <motion.div variants={item}>
          <div className="flex items-center gap-2 overflow-x-auto scrollbar-none pb-1">
            {gameCategories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`category-pill shrink-0 ${activeCategory === cat.id ? 'category-pill-active' : 'category-pill-inactive'}`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </motion.div>

        {/* 3. Recent Winners Ticker */}
        <motion.div variants={item}>
          <RecentWinners />
        </motion.div>

        {/* 4. Featured Games — K3 tile format */}
        <motion.div variants={item} className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black text-rose-500 uppercase tracking-wider">TOP</span>
              <h2 className="text-lg font-black text-[#E8C97A] font-heading tracking-tight flex items-center gap-2">
                <Trophy className="w-5 h-5 text-gold" /> TOP GAMES
              </h2>
            </div>
            <Link to="/games" className="text-xs font-black text-gold hover:text-[#F5D576] flex items-center gap-1 transition-colors">
              View All <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="gold-divider" />

          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {games.map((game) => (
              <Link
                key={game.id}
                to={game.locked ? '#' : game.path}
                onClick={game.locked ? (e) => e.preventDefault() : undefined}
                className={`group block rounded-xl overflow-hidden border border-[rgba(212,175,55,0.2)] hover:border-[rgba(212,175,55,0.5)] transition-all duration-300 ${game.locked ? 'cursor-not-allowed opacity-70' : 'hover:-translate-y-1 hover:shadow-[0_8px_30px_rgba(212,175,55,0.2)]'}`}
              >
                {/* Image/Icon area */}
                <div
                  className="relative h-36 flex items-center justify-center overflow-hidden"
                  style={{ background: game.bg }}
                >
                  <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[rgba(0,0,0,0.4)]" />
                  {/* Dot grid texture */}
                  <div className="absolute inset-0 opacity-10 bg-[radial-gradient(rgba(212,175,55,0.8)_1px,transparent_1px)] [background-size:16px_16px]" />

                  {/* Glow circle behind icon */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-20 h-20 rounded-full blur-2xl opacity-30" style={{ background: game.accentColor }} />
                  </div>

                  <div className="relative z-10 p-4 rounded-2xl bg-[rgba(255,255,255,0.1)] backdrop-blur-sm border border-[rgba(255,255,255,0.15)] group-hover:scale-110 transition-transform duration-300">
                    {game.locked ? <Lock className="w-10 h-10 text-[#8B6914]" /> : game.icon}
                  </div>

                  {/* Badge */}
                  <div className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-[rgba(0,0,0,0.65)] border border-[rgba(212,175,55,0.3)]">
                    <span className="text-[9px] font-black text-gold uppercase">{game.badge}</span>
                  </div>

                  {/* Hover play overlay */}
                  {!game.locked && (
                    <div className="absolute inset-0 bg-[rgba(0,0,0,0.6)] opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center z-20">
                      <div className="w-12 h-12 rounded-full flex items-center justify-center scale-75 group-hover:scale-100 transition-transform duration-300 btn-royal-gold">
                        <Play className="w-5 h-5 fill-[#0B2318] ml-0.5" />
                      </div>
                    </div>
                  )}
                </div>

                {/* Title bar */}
                <div className="bg-[#0d2419] border-t border-[rgba(212,175,55,0.15)] px-3 py-2.5 flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-black text-[#F5F1E6] font-heading leading-tight group-hover:text-gold transition-colors">{game.title}</h3>
                    <p className="text-[10px] text-[rgba(212,175,55,0.55)] mt-0.5">{game.subtitle}</p>
                  </div>
                  {!game.locked && (
                    <span className="text-[10px] font-black text-gold opacity-0 group-hover:opacity-100 transition-opacity">Play Now →</span>
                  )}
                </div>
              </Link>
            ))}
          </div>
        </motion.div>

        {/* 5. Trust Badges */}
        {!isAuthenticated && (
          <motion.div variants={item} className="flex items-center justify-center gap-3 flex-wrap py-2">
            <span className="gold-badge"><span>🔒</span> SSL Encrypted</span>
            <span className="gold-badge"><span>⚖️</span> Provably Fair</span>
            <span className="gold-badge"><span>🔞</span> 18+ Only</span>
            <span className="gold-badge"><span>👑</span> Royal Casino</span>
          </motion.div>
        )}
      </motion.div>
    </>
  );
}
