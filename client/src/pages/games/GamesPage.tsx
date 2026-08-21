import { useState } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { ChevronRight, Play, LockKeyhole } from 'lucide-react';
import { SEOHead } from '../../components/shared/SEOHead';

const gamesBreadcrumbLd = {
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
    { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://playarena.com/' },
    { '@type': 'ListItem', position: 2, name: 'Games Lobby', item: 'https://playarena.com/games' },
  ],
};

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
    id: 'k3',
    name: 'K3 3-Dice Lottery',
    sub: 'Sum, Pairs & Triples',
    img: '/games/lottery.png',
    path: '/games/k3',
    badge: '🎲 207× HOT',
    badgeColor: 'bg-amber-500',
    hot: true,
    players: 7890,
  },
  {
    id: 'trx',
    name: 'TRX Hash WinGo',
    sub: 'Blockchain Block Hash',
    img: '/games/color.png',
    path: '/games/trx',
    badge: '⚡ CRYPTO',
    badgeColor: 'bg-rose-600',
    hot: true,
    players: 6420,
  },
  {
    id: 'mini-dice',
    name: 'Mini Slider Dice',
    sub: 'Dynamic Multiplier Odds',
    img: '/games/plinko.png',
    path: '/games/mini-dice',
    badge: '🎯 99× MAX',
    badgeColor: 'bg-blue-600',
    hot: true,
    players: 4120,
  },
  {
    id: 'mini-roulette',
    name: 'Mini Roulette 12',
    sub: 'European 12-Pocket Wheel',
    img: '/games/slots-hero.png',
    path: '/games/mini-roulette',
    badge: '🎡 12× WIN',
    badgeColor: 'bg-purple-600',
    players: 3890,
  },
  {
    id: 'matka',
    name: 'Matka Jhatka',
    sub: 'Kalyan & Mumbai Bazaars',
    img: '/games/matka.png',
    path: '/games/matka',
    badge: '🔥 10,000×',
    badgeColor: 'bg-amber-600',
    hot: true,
    players: 8940,
  },
  {
    id: 'slots',
    name: 'Royal 777 Slots',
    sub: 'Vegas Multi-Line Machines',
    img: '/games/slots-hero.png',
    path: '/games/slots',
    badge: '🎰 777× JACKPOT',
    badgeColor: 'bg-amber-500',
    hot: true,
    players: 5930,
  },
  {
    id: 'aviator',
    name: 'Aviator Crash',
    sub: 'Supersonic Jet Multiplier',
    img: '/games/aviator.png',
    path: '/games/aviator',
    badge: '🚀 HOT',
    badgeColor: 'bg-rose-600',
    hot: true,
    players: 9120,
  },
  {
    id: 'color',
    name: 'Color Prediction',
    sub: 'Win Go 1Min / 3Min',
    img: '/games/color.png',
    path: '/games/color-prediction',
    badge: '⚡ LIVE',
    badgeColor: 'bg-emerald-600',
    players: 5284,
  },
  {
    id: 'mines',
    name: 'Mines Strategy',
    sub: 'Dodge Bombs & Gems',
    img: '/games/mines.png',
    path: '/games/mines',
    badge: '💣 1000×',
    badgeColor: 'bg-amber-600',
    players: 3890,
  },
  {
    id: 'plinko',
    name: 'Plinko Gold',
    sub: '60FPS Real Physics',
    img: '/games/plinko.png',
    path: '/games/plinko',
    badge: '🪙 29×',
    badgeColor: 'bg-blue-600',
    players: 4740,
  },
  {
    id: 'teen_patti',
    name: 'Teen Patti',
    sub: 'Royal 3-Card Poker',
    img: '/games/teen_patti.png',
    path: '/games/teen-patti',
    badge: '🃏 PROVABLE',
    badgeColor: 'bg-purple-600',
    players: 3210,
  },
  {
    id: 'ocean_hunter',
    name: 'Ocean Hunter',
    sub: '2D Arcade Fish Hunter',
    img: '/games/ocean_hunter.png',
    path: '/games/ocean-hunter',
    badge: '🐟 50× BOSS',
    badgeColor: 'bg-cyan-600',
    players: 2840,
  },
];

const LOTTERY_DICE_GAMES: Game[] = [
  {
    id: 'k3-2',
    name: 'K3 3-Dice Lottery',
    sub: 'Sum, Pairs & Triples',
    img: '/games/lottery.png',
    path: '/games/k3',
    badge: '🎲 207× HOT',
    badgeColor: 'bg-amber-500',
    players: 7890,
  },
  {
    id: 'matka2',
    name: 'Matka Jhatka',
    sub: 'Kalyan & Mumbai Bazaars',
    img: '/games/matka.png',
    path: '/games/matka',
    badge: '🔥 10,000×',
    badgeColor: 'bg-rose-600',
    hot: true,
    players: 8940,
  },
  {
    id: 'lottery2',
    name: 'Lottery 5D',
    sub: '5-Digit Tumbler Draw',
    img: '/games/lottery.png',
    path: '/games/lottery',
    badge: '💰 JACKPOT',
    badgeColor: 'bg-amber-600',
    players: 3341,
  },
];

const CRYPTO_WINGO_GAMES: Game[] = [
  {
    id: 'trx2',
    name: 'TRX Hash WinGo',
    sub: 'Tron Block Hash Draw',
    img: '/games/color.png',
    path: '/games/trx',
    badge: '⚡ BLOCKCHAIN',
    badgeColor: 'bg-rose-600',
    players: 6420,
  },
  {
    id: 'color2',
    name: 'Color Prediction',
    sub: 'Win Go 1Min',
    img: '/games/color.png',
    path: '/games/color-prediction',
    badge: '⚡ LIVE',
    badgeColor: 'bg-emerald-600',
    players: 5284,
  },
  {
    id: 'wingo2',
    name: 'Win Go 3Min',
    sub: 'Number & Color Draw',
    img: '/games/wingo.png',
    path: '/games/wingo',
    badge: 'HOT',
    badgeColor: 'bg-rose-600',
    players: 2943,
  },
];

const MINI_GAMES_LIST: Game[] = [
  {
    id: 'mini-dice2',
    name: 'Mini Slider Dice',
    sub: 'Dynamic Multiplier Odds',
    img: '/games/plinko.png',
    path: '/games/mini-dice',
    badge: '🎯 99× MAX',
    badgeColor: 'bg-blue-600',
    players: 4120,
  },
  {
    id: 'mini-roulette2',
    name: 'Mini Roulette 12',
    sub: 'European 12-Pocket Wheel',
    img: '/games/slots-hero.png',
    path: '/games/mini-roulette',
    badge: '🎡 12× WIN',
    badgeColor: 'bg-purple-600',
    players: 3890,
  },
  {
    id: 'plinko2',
    name: 'Plinko Gold',
    sub: '60FPS Real Physics',
    img: '/games/plinko.png',
    path: '/games/plinko',
    badge: '🪙 29×',
    badgeColor: 'bg-blue-600',
    players: 4740,
  },
  {
    id: 'mines2',
    name: 'Mines Strategy',
    sub: 'Dodge Bombs & Gems',
    img: '/games/mines.png',
    path: '/games/mines',
    badge: '💣 1000×',
    badgeColor: 'bg-amber-600',
    players: 3890,
  },
];

const CATS = [
  { id: 'all', label: '🔥 All Games' },
  { id: 'top', label: '⚡ TOP' },
  { id: 'lottery', label: '🎲 K3 & Matka' },
  { id: 'crypto', label: '⚡ TRX & WinGo' },
  { id: 'mini', label: '🎯 Mini Games' },
];

function GamePhotoCard({ game, size = 'md' }: { game: Game; size?: 'sm' | 'md' }) {
  const imgH = size === 'sm' ? 'h-28 sm:h-32' : 'h-36 sm:h-40';

  const inner = (
    <motion.div
      whileHover={game.locked ? {} : { y: -4, scale: 1.01 }}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
      className={`group relative rounded-2xl overflow-hidden border border-[rgba(212,175,55,0.2)] bg-[#0a1e12] shadow-lg ${game.locked ? 'cursor-not-allowed opacity-70' : 'cursor-pointer hover:border-gold hover:shadow-[0_8px_30px_rgba(212,175,55,0.25)]'} transition-all duration-300`}
    >
      {/* Thumbnail */}
      <div className={`relative ${imgH} overflow-hidden`}>
        <img
          src={game.img}
          alt={game.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          loading="lazy"
        />

        <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-black/15" />

        {/* Badge */}
        {game.badge && (
          <span className={`absolute top-2 left-2 ${game.badgeColor ?? 'bg-[#8B6914]'} text-white text-[9px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full shadow-md`}>
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
            <div className="w-12 h-12 rounded-full btn-royal-gold flex items-center justify-center scale-75 group-hover:scale-100 transition-transform duration-300 shadow-xl">
              <Play className="w-5 h-5 fill-[#0B2318] ml-0.5" />
            </div>
          </div>
        )}

        {/* Online dot */}
        {game.players && (
          <div className="absolute bottom-2 right-2 flex items-center gap-1 bg-black/70 rounded-full px-2 py-0.5 backdrop-blur-sm">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[9px] text-emerald-300 font-bold font-mono">{(game.players / 1000).toFixed(1)}k live</span>
          </div>
        )}
      </div>

      {/* Name bar */}
      <div className="px-3.5 py-2.5 bg-[#0d2419] border-t border-[rgba(212,175,55,0.15)]">
        <p className="text-xs font-black text-[#F5F1E6] truncate group-hover:text-gold transition-colors">{game.name}</p>
        <p className="text-[10px] text-[rgba(212,175,55,0.5)] truncate mt-0.5 font-medium">{game.sub}</p>
      </div>
    </motion.div>
  );

  return game.locked ? inner : <Link to={game.path}>{inner}</Link>;
}

function SectionHeader({ emoji, title, to }: { emoji: string; title: string; to?: string }) {
  return (
    <div className="flex items-center justify-between mb-3">
      <div className="flex items-center gap-2">
        <span className="text-xs font-black text-gold uppercase tracking-widest">{emoji}</span>
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

export default function GamesPage() {
  const [active, setActive] = useState('all');
  const showAll = active === 'all';

  return (
    <div className="space-y-7 pb-8">
      <SEOHead
        title="Royal Games Lobby — K3 Dice, TRX WinGo, Slots, Aviator & Mini Games"
        description="Explore PlayArena's luxury games suite. Play K3 3-Dice Lottery, TRX Block Hash WinGo, Royal 777 Slots, Aviator Crash, Mini Slider Dice, and Mini Roulette."
        jsonLd={gamesBreadcrumbLd}
      />

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
          <SectionHeader emoji="⚡ TOP" title="Featured Flagship Games" to="/games" />
          <div className="gold-divider mb-4" />
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {TOP_GAMES.map((g) => <GamePhotoCard key={g.id} game={g} />)}
          </div>
        </motion.section>
      )}

      {/* Lottery & Dice Section */}
      {(showAll || active === 'lottery') && (
        <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay: 0.05 }}>
          <SectionHeader emoji="🎲" title="K3 3-Dice & Matka Lotteries" to="/games/k3" />
          <div className="gold-divider mb-4" />
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {LOTTERY_DICE_GAMES.map((g) => <GamePhotoCard key={g.id} game={g} />)}
          </div>
        </motion.section>
      )}

      {/* Crypto & WinGo Section */}
      {(showAll || active === 'crypto') && (
        <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay: 0.08 }}>
          <SectionHeader emoji="⚡" title="TRX Block Hash & WinGo Color" to="/games/trx" />
          <div className="gold-divider mb-4" />
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {CRYPTO_WINGO_GAMES.map((g) => <GamePhotoCard key={g.id} game={g} />)}
          </div>
        </motion.section>
      )}

      {/* Mini Games Section */}
      {(showAll || active === 'mini') && (
        <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay: 0.1 }}>
          <SectionHeader emoji="🎯" title="Provably Fair Mini Games" />
          <div className="gold-divider mb-4" />
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {MINI_GAMES_LIST.map((g) => <GamePhotoCard key={g.id} game={g} />)}
          </div>
        </motion.section>
      )}
    </div>
  );
}
