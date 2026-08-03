import { motion } from 'framer-motion';
import { ChevronRight, Play, LockKeyhole } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useState } from 'react';
import BannerSlider from '../../components/shared/BannerSlider';
import RecentWinners from '../../components/shared/RecentWinners';
import WalletCard from '../../components/shared/WalletCard';
import WelcomeBonusPopup from '../../components/ui/WelcomeBonusPopup';
import { useAuth } from '../../store/AuthContext';

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.06 } },
};
const item = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0 },
};

const CATS = [
  { id: 'all', label: '🔥 All Games' },
  { id: 'top', label: '⚡ TOP' },
  { id: 'color', label: '🎨 Color' },
  { id: 'matka', label: '🎲 Matka' },
  { id: 'fishing', label: '🌊 Fishing' },
];

interface Game {
  id: string;
  name: string;
  sub: string;
  img: string;
  path: string;
  badge?: string;
  badgeColor?: string;
  locked?: boolean;
  players?: number;
}

const TOP_GAMES: Game[] = [
  { id: 'matka', name: 'Matka Jhatka', sub: 'Kalyan & Mumbai', img: '/games/matka.png', path: '/games/matka', badge: '🔥 Hot', badgeColor: 'bg-rose-600', players: 4892 },
  { id: 'color', name: 'Color Prediction', sub: 'Win Go 1Min / 3Min', img: '/games/color.png', path: '/games/color-prediction', badge: '⚡ Live', badgeColor: 'bg-emerald-600', players: 5284 },
  { id: 'wingo', name: 'Win Go', sub: 'Number Draw', img: '/games/wingo.png', path: '/games/color-prediction', badge: 'NEW', badgeColor: 'bg-blue-600', players: 3127 },
  { id: 'lottery', name: 'Lottery 5D', sub: '5D & K3 Style', img: '/games/lottery.png', path: '/games/lottery', badge: '💰 Jackpot', badgeColor: 'bg-amber-600', players: 2341 },
  { id: 'aviator', name: 'Aviator', sub: 'Crash Multiplier', img: '/games/aviator.png', path: '#', badge: 'SOON', badgeColor: 'bg-purple-700', locked: true },
  { id: 'fishing', name: 'Ocean Hunter', sub: 'Arcade Fishing', img: '/games/fishing.png', path: '#', badge: 'SOON', badgeColor: 'bg-purple-700', locked: true },
];

function GamePhotoCard({ game }: { game: Game }) {
  const inner = (
    <motion.div
      whileHover={game.locked ? {} : { y: -3, scale: 1.02 }}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
      className={`group relative rounded-xl overflow-hidden border border-[rgba(212,175,55,0.18)] bg-[#0a1e12] shadow-lg ${game.locked ? 'cursor-not-allowed opacity-70' : 'cursor-pointer hover:border-[rgba(212,175,55,0.55)] hover:shadow-[0_8px_30px_rgba(212,175,55,0.18)]'} transition-all duration-300`}
    >
      {/* Thumbnail */}
      <div className="relative h-28 sm:h-32 overflow-hidden">
        <img
          src={game.img}
          alt={game.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/10" />

        {game.badge && (
          <span className={`absolute top-2 left-2 ${game.badgeColor ?? 'bg-[#8B6914]'} text-white text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-full`}>
            {game.badge}
          </span>
        )}

        {game.locked && (
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
            <LockKeyhole className="w-5 h-5 text-[rgba(212,175,55,0.6)]" />
          </div>
        )}

        {!game.locked && (
          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center z-10">
            <div className="w-10 h-10 rounded-full btn-royal-gold flex items-center justify-center scale-75 group-hover:scale-100 transition-transform duration-300">
              <Play className="w-4 h-4 fill-[#0B2318] ml-0.5" />
            </div>
          </div>
        )}

        {game.players && (
          <div className="absolute bottom-2 right-2 flex items-center gap-1 bg-black/60 rounded-full px-1.5 py-0.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[9px] text-emerald-300 font-bold">{(game.players / 1000).toFixed(1)}k</span>
          </div>
        )}
      </div>

      {/* Name bar */}
      <div className="px-2.5 py-2 bg-[#0d2419] border-t border-[rgba(212,175,55,0.1)]">
        <p className="text-xs font-black text-[#F5F1E6] truncate group-hover:text-[#F5D576] transition-colors leading-tight">{game.name}</p>
        <p className="text-[10px] text-[rgba(212,175,55,0.45)] truncate mt-0.5">{game.sub}</p>
      </div>
    </motion.div>
  );

  return game.locked ? inner : <Link to={game.path}>{inner}</Link>;
}

export default function HomePage() {
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
          <motion.div variants={item} className="lg:col-span-1">
            <WalletCard
              onDeposit={() => window.location.href = '/wallet'}
              onWithdraw={() => window.location.href = '/wallet'}
            />
          </motion.div>
          <motion.div variants={item} className="lg:col-span-2">
            <BannerSlider />
          </motion.div>
        </div>

        {/* 2. Category pills */}
        <motion.div variants={item}>
          <div className="flex items-center gap-2 overflow-x-auto scrollbar-none pb-1">
            {CATS.map((cat) => (
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

        {/* 3. Recent Winners */}
        <motion.div variants={item}>
          <RecentWinners />
        </motion.div>

        {/* 4. TOP Games — photo grid */}
        <motion.div variants={item} className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black text-rose-500 uppercase tracking-widest">TOP</span>
              <h2 className="text-base font-black text-[#E8C97A] font-heading">Top Games</h2>
            </div>
            <Link to="/games" className="text-xs font-bold text-[rgba(212,175,55,0.6)] hover:text-gold flex items-center gap-0.5 transition-colors">
              View All <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          <div className="gold-divider" />

          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
            {TOP_GAMES.map((g) => (
              <GamePhotoCard key={g.id} game={g} />
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
