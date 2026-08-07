import { useState } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { ChevronRight, Play, LockKeyhole } from 'lucide-react';

/* ─── Game Data ──────────────────────────────────────────────────── */
interface Game {
  id: string;
  name: string;
  sub: string;
  img: string;
  path: string;
  badge?: string;
  badgeColor?: string;
  locked?: boolean;
  hot?: boolean;
  players?: number;
}

const TOP_GAMES: Game[] = [
  {
    id: 'matka',
    name: 'Matka Jhatka',
    sub: 'Kalyan & Mumbai',
    img: '/games/matka.png',
    path: '/games/matka',
    badge: '🔥 Popular',
    badgeColor: 'bg-rose-600',
    hot: true,
    players: 4892,
  },
  {
    id: 'color',
    name: 'Color Prediction',
    sub: 'Win Go 1Min / 3Min',
    img: '/games/color.png',
    path: '/games/color-prediction',
    badge: '⚡ Live',
    badgeColor: 'bg-emerald-600',
    players: 5284,
  },
  {
    id: 'aviator',
    name: 'Aviator',
    sub: 'Crash Multiplier',
    img: '/games/aviator.png',
    path: '/games/aviator',
    badge: '🚀 HOT',
    badgeColor: 'bg-rose-600',
    players: 6120,
  },
  {
    id: 'mines',
    name: 'Mines',
    sub: 'Strategy · Dodge Bombs',
    img: '/games/mines.png',
    path: '/games/mines',
    badge: '💣 NEW',
    badgeColor: 'bg-amber-600',
    players: 2890,
  },
  {
    id: 'plinko',
    name: 'Plinko Gold',
    sub: 'Physics Drop',
    img: '/games/plinko.png',
    path: '/games/plinko',
    badge: '🪙 NEW',
    badgeColor: 'bg-blue-600',
    players: 1740,
  },
  {
    id: 'teen_patti',
    name: 'Teen Patti',
    sub: 'Indian Card Game',
    img: '/games/teen_patti.png',
    path: '/games/teen-patti',
    badge: '🃏 NEW',
    badgeColor: 'bg-purple-600',
    players: 3210,
  },
];

const COLOR_GAMES: Game[] = [
  {
    id: 'color2',
    name: 'Color Prediction',
    sub: 'Win Go 1Min',
    img: '/games/color.png',
    path: '/games/color-prediction',
    badge: '⚡ Live',
    badgeColor: 'bg-emerald-600',
    players: 5284,
  },
  {
    id: 'wingo2',
    name: 'Win Go 3Min',
    sub: 'Number & Color',
    img: '/games/wingo.png',
    path: '/games/wingo',
    badge: 'HOT',
    badgeColor: 'bg-rose-600',
    players: 1943,
  },
];

const MATKA_GAMES: Game[] = [
  {
    id: 'matka2',
    name: 'Matka Jhatka',
    sub: 'Kalyan & Mumbai',
    img: '/games/matka.png',
    path: '/games/matka',
    badge: '🔥 Popular',
    badgeColor: 'bg-rose-600',
    hot: true,
    players: 4892,
  },
  {
    id: 'lottery2',
    name: 'Lottery 5D',
    sub: '5D & K3 Draw',
    img: '/games/lottery.png',
    path: '/games/lottery',
    badge: '💰 Jackpot',
    badgeColor: 'bg-amber-600',
    players: 2341,
  },
];

const CRASH_CARD_GAMES: Game[] = [
  {
    id: 'aviator2',
    name: 'Aviator',
    sub: 'Crash Multiplier',
    img: '/games/aviator.png',
    path: '/games/aviator',
    badge: '🚀 HOT',
    badgeColor: 'bg-rose-600',
    players: 6120,
  },
  {
    id: 'mines2',
    name: 'Mines',
    sub: 'Strategy · Dodge Bombs',
    img: '/games/mines.png',
    path: '/games/mines',
    badge: '💣 NEW',
    badgeColor: 'bg-amber-600',
    players: 2890,
  },
  {
    id: 'plinko2',
    name: 'Plinko Gold',
    sub: 'Physics Drop',
    img: '/games/plinko.png',
    path: '/games/plinko',
    badge: '🪙 NEW',
    badgeColor: 'bg-blue-600',
    players: 1740,
  },
  {
    id: 'teen2',
    name: 'Teen Patti',
    sub: 'Indian Card Game',
    img: '/games/teen_patti.png',
    path: '/games/teen-patti',
    badge: '🃏 LIVE',
    badgeColor: 'bg-purple-600',
    players: 3210,
  },
];

const FISHING_GAMES: Game[] = [
  {
    id: 'fishing',
    name: 'Ocean Hunter',
    sub: 'Arcade Fishing',
    img: '/games/fishing.png',
    path: '/games/ocean-hunter',
    badge: '🐟 LIVE',
    badgeColor: 'bg-emerald-600',
  },
];

/* ─── Category tabs ─────────────────────────────────────────────── */
const CATS = [
  { id: 'all', label: '🔥 All Games' },
  { id: 'top', label: '⚡ TOP' },
  { id: 'color', label: '🎨 Color' },
  { id: 'matka', label: '🎲 Matka' },
  { id: 'crash', label: '🚀 Crash & Cards' },
  { id: 'fishing', label: '🌊 Fishing' },
];

/* ─── Single Photo-Card ─────────────────────────────────────────── */
function GamePhotoCard({ game, size = 'md' }: { game: Game; size?: 'sm' | 'md' }) {
  const imgH = size === 'sm' ? 'h-28 sm:h-32' : 'h-36 sm:h-40';

  const inner = (
    <motion.div
      whileHover={game.locked ? {} : { y: -4, scale: 1.01 }}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
      className={`group relative rounded-xl overflow-hidden border border-[rgba(212,175,55,0.18)] bg-[#0a1e12] shadow-lg ${game.locked ? 'cursor-not-allowed opacity-70' : 'cursor-pointer hover:border-[rgba(212,175,55,0.55)] hover:shadow-[0_8px_30px_rgba(212,175,55,0.18)]'} transition-all duration-300`}
    >
      {/* Thumbnail */}
      <div className={`relative ${imgH} overflow-hidden`}>
        <img
          src={game.img}
          alt={game.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          loading="lazy"
        />

        {/* Dark gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/10" />

        {/* Badge */}
        {game.badge && (
          <span className={`absolute top-2 left-2 ${game.badgeColor ?? 'bg-[#8B6914]'} text-white text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full shadow-md`}>
            {game.badge}
          </span>
        )}

        {/* Lock overlay */}
        {game.locked && (
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
            <LockKeyhole className="w-6 h-6 text-[rgba(212,175,55,0.6)]" />
          </div>
        )}

        {/* Hover Play overlay */}
        {!game.locked && (
          <div className="absolute inset-0 bg-black/55 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center z-10">
            <div className="w-11 h-11 rounded-full btn-royal-gold flex items-center justify-center scale-75 group-hover:scale-100 transition-transform duration-300 shadow-xl">
              <Play className="w-4 h-4 fill-[#0B2318] ml-0.5" />
            </div>
          </div>
        )}

        {/* Online dot */}
        {game.players && (
          <div className="absolute bottom-2 right-2 flex items-center gap-1 bg-black/60 rounded-full px-1.5 py-0.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[9px] text-emerald-300 font-bold">{(game.players / 1000).toFixed(1)}k</span>
          </div>
        )}
      </div>

      {/* Name bar */}
      <div className="px-3 py-2 bg-[#0d2419] border-t border-[rgba(212,175,55,0.1)]">
        <p className="text-xs font-black text-[#F5F1E6] truncate group-hover:text-[#F5D576] transition-colors">{game.name}</p>
        <p className="text-[10px] text-[rgba(212,175,55,0.45)] truncate mt-0.5">{game.sub}</p>
      </div>
    </motion.div>
  );

  return game.locked ? inner : <Link to={game.path}>{inner}</Link>;
}

/* ─── Section Header ─────────────────────────────────────────────── */
function SectionHeader({ emoji, title, to }: { emoji: string; title: string; to?: string }) {
  return (
    <div className="flex items-center justify-between mb-3">
      <div className="flex items-center gap-2">
        <span className="text-xs font-black text-rose-500 uppercase tracking-widest">{emoji}</span>
        <h2 className="text-base font-black text-[#E8C97A] font-heading">{title}</h2>
      </div>
      {to && (
        <Link to={to} className="text-xs font-bold text-[rgba(212,175,55,0.6)] hover:text-gold flex items-center gap-0.5 transition-colors">
          View All <ChevronRight className="w-3.5 h-3.5" />
        </Link>
      )}
    </div>
  );
}

/* ─── Page ───────────────────────────────────────────────────────── */
export default function GamesPage() {
  const [active, setActive] = useState('all');

  const showAll = active === 'all';

  return (
    <div className="space-y-7 pb-8">
      {/* Category pills */}
      <div className="flex items-center gap-2 overflow-x-auto scrollbar-none pb-1">
        {CATS.map((c) => (
          <button
            key={c.id}
            onClick={() => setActive(c.id)}
            className={`category-pill shrink-0 ${active === c.id ? 'category-pill-active' : 'category-pill-inactive'}`}
          >
            {c.label}
          </button>
        ))}
      </div>

      {/* TOP Section */}
      {(showAll || active === 'top') && (
        <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
          <SectionHeader emoji="TOP" title="Top Games" to="/games" />
          <div className="gold-divider mb-4" />
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
            {TOP_GAMES.map((g) => <GamePhotoCard key={g.id} game={g} />)}
          </div>
        </motion.section>
      )}

      {/* Color Section */}
      {(showAll || active === 'color') && (
        <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay: 0.05 }}>
          <SectionHeader emoji="🎨" title="Color Prediction" to="/games/color-prediction" />
          <div className="gold-divider mb-4" />
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
            {COLOR_GAMES.map((g) => <GamePhotoCard key={g.id} game={g} />)}
          </div>
        </motion.section>
      )}

      {/* Matka Section */}
      {(showAll || active === 'matka') && (
        <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay: 0.08 }}>
          <SectionHeader emoji="🎲" title="Matka & Lottery" to="/games/matka" />
          <div className="gold-divider mb-4" />
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
            {MATKA_GAMES.map((g) => <GamePhotoCard key={g.id} game={g} />)}
          </div>
        </motion.section>
      )}

      {/* Crash & Cards Section */}
      {(showAll || active === 'crash') && (
        <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay: 0.1 }}>
          <SectionHeader emoji="🚀" title="Crash & Cards" />
          <div className="gold-divider mb-4" />
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
            {CRASH_CARD_GAMES.map((g) => <GamePhotoCard key={g.id} game={g} />)}
          </div>
        </motion.section>
      )}

      {/* Fishing Section */}
      {(showAll || active === 'fishing') && (
        <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay: 0.12 }}>
          <SectionHeader emoji="🌊" title="Fishing Games" />
          <div className="gold-divider mb-4" />
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
            {FISHING_GAMES.map((g) => <GamePhotoCard key={g.id} game={g} />)}
          </div>
        </motion.section>
      )}
    </div>
  );
}
