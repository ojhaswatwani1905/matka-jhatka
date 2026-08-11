import { motion } from 'framer-motion';
import { ChevronRight, Play, LockKeyhole, Flame, Gamepad2, Rocket, Dice1, Clock } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useState } from 'react';
import BannerSlider from '../../components/shared/BannerSlider';
import RecentWinners from '../../components/shared/RecentWinners';
import WalletCard from '../../components/shared/WalletCard';
import WelcomeBonusPopup from '../../components/ui/WelcomeBonusPopup';
import { LiveFeedPanel } from '../../components/ui/GlobalLiveFeed';
import { useAuth } from '../../store/AuthContext';
import { useContent } from '../../content/useContent';
import { SEOHead } from '../../components/shared/SEOHead';

const homeJsonLd = [
  {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'PlayArena',
    url: 'https://playarena.com',
    logo: 'https://playarena.com/logo.png',
    description: 'Premier Jaipur & Rajasthan Royal Casino Simulation Platform featuring Matka Jhatka, WinGo Color Prediction, Aviator Crash & 777 Jackpot Slots.',
    sameAs: ['https://twitter.com/playarena', 'https://facebook.com/playarena'],
  },
  {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'PlayArena',
    url: 'https://playarena.com',
    potentialAction: {
      '@type': 'SearchAction',
      target: 'https://playarena.com/games?q={search_term_string}',
      'query-input': 'required name=search_term_string',
    },
  },
];

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
  { id: 'slots', label: '🎰 Slots' },
  { id: 'matka', label: '🎲 Matka' },
  { id: 'crash', label: '🚀 Crash' },
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

interface MatkaVariant {
  id: string;
  name: string;
  openTime: string;
  closeTime: string;
  status: 'open' | 'closed';
  lastResult: string;
  odds: string;
}

/* ─── Game Datasets ─────────────────────────────────────────────────── */
const TOP_GAMES: Game[] = [
  { id: 'aviator', name: 'Aviator', sub: 'Crash Multiplier', img: '/games/aviator.png', path: '/games/aviator', badge: '🚀 HOT', badgeColor: 'bg-rose-600', players: 6120 },
  { id: 'slots', name: 'Royal 777 Slots', sub: 'Multi-Line Jackpot', img: '/games/slots-hero.png', path: '/games/slots', badge: '💎 777x', badgeColor: 'bg-amber-500', players: 7420 },
  { id: 'color', name: 'Color Prediction', sub: 'Win Go 1Min / 3Min', img: '/games/color.png', path: '/games/color-prediction', badge: '⚡ Live', badgeColor: 'bg-emerald-600', players: 5284 },
  { id: 'wingo', name: 'Win Go 3Min', sub: 'Number Draw', img: '/games/wingo.png', path: '/games/wingo', badge: 'NEW', badgeColor: 'bg-blue-600', players: 3127 },
  { id: 'plinko', name: 'Plinko Gold', sub: 'Physics Ball Drop', img: '/games/plinko.png', path: '/games/plinko', badge: '🪙 29x', badgeColor: 'bg-amber-600', players: 4190 },
  { id: 'mines', name: 'Mines', sub: 'Dodge Bombs Strategy', img: '/games/mines.png', path: '/games/mines', badge: '💣 Win 100x', badgeColor: 'bg-rose-500', players: 3880 },
];

const SLOT_GAMES: Game[] = [
  { id: 'royal-gold-777', name: 'Royal Gold 777', sub: 'Classic 3-Reel Vegas Slot', img: '/games/slots-hero.png', path: '/games/slots', badge: '777x Jackpot', badgeColor: 'bg-amber-500', players: 5400 },
  { id: 'dragon-fortune-5x', name: 'Dragon Fortune', sub: '5-Reel Mythic Video Slot', img: '/games/slots-hero.png', path: '/games/slots', badge: '🐉 250x', badgeColor: 'bg-rose-600', players: 4120 },
  { id: 'mega-fruit-party', name: 'Mega Fruit Party', sub: '3-Reel Arcade Juicy Spins', img: '/games/slots-hero.png', path: '/games/slots', badge: '🍓 75x', badgeColor: 'bg-purple-600', players: 3290 },
  { id: 'diamond-deluxe', name: 'Diamond Deluxe', sub: '3-Reel Gem Deluxe Classic', img: '/games/slots-hero.png', path: '/games/slots', badge: '💎 150x', badgeColor: 'bg-cyan-600', players: 2840 },
  { id: 'wild-safari', name: 'Wild Safari', sub: '5-Reel Mythic Safari Slot', img: '/games/slots-hero.png', path: '/games/slots', badge: '🦁 300x', badgeColor: 'bg-amber-600', players: 3710 },
  { id: 'golden-pharaoh', name: 'Golden Pharaoh', sub: '5-Reel Egyptian Legend', img: '/games/slots-hero.png', path: '/games/slots', badge: '𓀾 500x', badgeColor: 'bg-[#8B6914]', players: 6890 },
];

const LIVE_CRASH_GAMES: Game[] = [
  { id: 'aviator-live', name: 'Aviator', sub: 'Real-Time Flight Crash', img: '/games/aviator.png', path: '/games/aviator', badge: '🚀 100x', badgeColor: 'bg-rose-600', players: 6120 },
  { id: 'plinko-live', name: 'Plinko Gold', sub: 'Physics Pegboard', img: '/games/plinko.png', path: '/games/plinko', badge: '🪙 29x', badgeColor: 'bg-amber-500', players: 4190 },
  { id: 'mines-live', name: 'Mines', sub: 'Grid Tile Reveal', img: '/games/mines.png', path: '/games/mines', badge: '💣 1000x', badgeColor: 'bg-emerald-600', players: 3880 },
  { id: 'teen-patti-live', name: 'Teen Patti 3Card', sub: 'Royal Indian Card Poker', img: '/games/teenpatti.png', path: '/games/teen-patti', badge: '👑 3.8x', badgeColor: 'bg-amber-600', players: 4760 },
  { id: 'ocean-hunter-live', name: 'Ocean Hunter Arcade', sub: 'Multiplier Target Shooter', img: '/games/oceanhunter.png', path: '/games/ocean-hunter', badge: '🌊 25x', badgeColor: 'bg-blue-600', players: 2950 },
];

const MATKA_VARIANTS: MatkaVariant[] = [
  { id: '1', name: 'Mumbai Jhatka', openTime: '09:00 AM', closeTime: '10:30 AM', status: 'open', lastResult: '256', odds: '900x' },
  { id: '2', name: 'Kalyan Jhatka', openTime: '11:00 AM', closeTime: '12:30 PM', status: 'open', lastResult: '189', odds: '900x' },
  { id: '3', name: 'Rajdhani Express', openTime: '02:00 PM', closeTime: '03:30 PM', status: 'open', lastResult: '347', odds: '900x' },
  { id: '4', name: 'Night Jhatka', openTime: '08:00 PM', closeTime: '09:30 PM', status: 'closed', lastResult: '492', odds: '900x' },
  { id: '5', name: 'Main Bazar Jhatka', openTime: '10:00 PM', closeTime: '11:30 PM', status: 'closed', lastResult: '715', odds: '900x' },
];

/* ─── Compact Game Card with Scroll-Snap ───────────────────────────── */
function CompactGameCard({ game }: { game: Game }) {
  const inner = (
    <motion.div
      whileHover={game.locked ? {} : { y: -4, scale: 1.02 }}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
      className={`group relative rounded-xl overflow-hidden border border-[rgba(212,175,55,0.2)] bg-[#0a1e12] shadow-lg ${
        game.locked ? 'cursor-not-allowed opacity-70' : 'cursor-pointer hover:border-[#FFD700] hover:shadow-[0_8px_25px_rgba(212,175,55,0.22)]'
      } transition-all duration-300 w-full`}
    >
      {/* Thumbnail */}
      <div className="relative h-24 sm:h-28 overflow-hidden">
        <img
          src={game.img}
          alt={game.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/20" />

        {game.badge && (
          <span className={`absolute top-2 left-2 ${game.badgeColor ?? 'bg-[#8B6914]'} text-white text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-full shadow`}>
            {game.badge}
          </span>
        )}

        {game.locked && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <LockKeyhole className="w-5 h-5 text-[rgba(212,175,55,0.7)]" />
          </div>
        )}

        {!game.locked && (
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center z-10">
            <div className="w-9 h-9 rounded-full btn-royal-gold flex items-center justify-center scale-75 group-hover:scale-100 transition-transform duration-300 shadow-lg">
              <Play className="w-4 h-4 fill-[#0B2318] ml-0.5" />
            </div>
          </div>
        )}

        {game.players && (
          <div className="absolute bottom-2 right-2 flex items-center gap-1 bg-black/70 rounded-full px-1.5 py-0.5 border border-emerald-500/30">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[9px] text-emerald-300 font-bold">{(game.players / 1000).toFixed(1)}k</span>
          </div>
        )}
      </div>

      {/* Title Bar */}
      <div className="px-2.5 py-2 bg-[#0d2419] border-t border-[rgba(212,175,55,0.12)]">
        <p className="text-xs font-black text-[#F5F1E6] truncate group-hover:text-[#F5D576] transition-colors leading-tight font-heading">
          {game.name}
        </p>
        <p className="text-[10px] text-[rgba(212,175,55,0.5)] truncate mt-0.5 font-medium">
          {game.sub}
        </p>
      </div>
    </motion.div>
  );

  return game.locked ? inner : <Link to={game.path} className="block w-full">{inner}</Link>;
}

/* ─── Reusable Scroll-Snap Horizontal Row ──────────────────────────── */
function GameRowSection({ title, icon, games, viewAllLink }: { title: string; icon: React.ReactNode; games: Game[]; viewAllLink: string }) {
  return (
    <motion.div variants={item} className="space-y-2.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {icon}
          <h2 className="text-base font-black text-[#E8C97A] font-heading tracking-tight">{title}</h2>
        </div>
        <Link to={viewAllLink} className="text-xs font-bold text-[rgba(212,175,55,0.6)] hover:text-gold flex items-center gap-0.5 transition-colors">
          View All <ChevronRight className="w-3.5 h-3.5" />
        </Link>
      </div>
      <div className="gold-divider opacity-50" />

      {/* Horizontal Scroll Snap Container: 2 per view on mobile, 4-5 on desktop */}
      <div className="flex overflow-x-auto gap-3.5 snap-x snap-mandatory scrollbar-none pb-2 pt-1 -mx-4 px-4 sm:mx-0 sm:px-0">
        {games.map((game) => (
          <div key={game.id} className="w-[calc(50%-7px)] sm:w-48 lg:w-52 shrink-0 snap-start">
            <CompactGameCard game={game} />
          </div>
        ))}
      </div>
    </motion.div>
  );
}

export default function HomePage() {
  const { isAuthenticated } = useAuth();
  const { t } = useContent();
  const [activeCategory, setActiveCategory] = useState('all');

  return (
    <>
      <SEOHead
        title="PlayArena — Premier Royal Casino & Gaming Platform | Jaipur, Rajasthan"
        description="Access live Matka Jhatka draws (Kalyan & Mumbai), WinGo 1Min/3Min color prediction, high-multiplier Aviator crash game & 6 exclusive 777 slot machine variants."
        keywords="Matka Jhatka, Kalyan Matka, Mumbai Main Bazar, WinGo color prediction, Aviator crash game, 777 slots, Jaipur casino online, Jaipur gaming platform"
        jsonLd={homeJsonLd}
      />
      <WelcomeBonusPopup />

      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="space-y-6 pb-8 max-w-7xl mx-auto"
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

        {/* 2. Category Pills */}
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

        {/* 3. Recent Winners Banner */}
        <motion.div variants={item}>
          <RecentWinners />
        </motion.div>

        {/* 4. Row 1: TOP Games Horizontal Scroll Snap */}
        <GameRowSection
          title={t('categories.all', 'Top Games')}
          icon={<Flame className="w-5 h-5 text-rose-500" />}
          games={TOP_GAMES}
          viewAllLink="/games"
        />

        {/* Featured Slot Machine Banner */}
        <motion.div variants={item}>
          <Link to="/games/slots" className="group block relative rounded-2xl overflow-hidden border border-[rgba(212,175,55,0.4)] shadow-[0_0_30px_rgba(212,175,55,0.15)] bg-gradient-to-r from-[#0B2A1E] via-[#040E0A] to-[#0B2A1E] hover:border-gold transition-all">
            <div className="flex flex-col sm:flex-row items-center justify-between p-4 sm:p-6 gap-4">
              <div className="space-y-2 text-center sm:text-left">
                <span className="inline-block px-2.5 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/40 text-gold text-[10px] font-black uppercase tracking-wider">
                  🎰 FEATURED CASINO SLOT
                </span>
                <h3 className="text-xl sm:text-2xl font-black text-[#E8C97A] font-heading leading-tight">
                  ROYAL 777 JACKPOT SLOTS
                </h3>
                <p className="text-xs text-[rgba(212,175,55,0.6)]">
                  Spin multi-line reels with provably fair seed hashes & 777x jackpot payouts!
                </p>
                <div className="pt-1">
                  <span className="btn-royal-gold inline-flex items-center gap-1.5 px-4 py-2 text-xs font-black uppercase">
                    Play 777 Slots Now <ChevronRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              </div>

              <div className="w-full sm:w-48 h-32 sm:h-36 rounded-xl overflow-hidden border border-[rgba(212,175,55,0.3)] shrink-0 shadow-lg relative">
                <img
                  src="/games/slots-hero.png"
                  alt="Royal 777 Slot Machine"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                <span className="absolute bottom-2 right-2 text-[9px] font-black bg-gold text-black px-1.5 py-0.5 rounded font-mono">
                  777x JACKPOT
                </span>
              </div>
            </div>
          </Link>
        </motion.div>

        {/* 5. Row 2: Slots Arena Horizontal Scroll Snap */}
        <GameRowSection
          title="Slots Arena"
          icon={<Gamepad2 className="w-5 h-5 text-gold" />}
          games={SLOT_GAMES}
          viewAllLink="/games/slots"
        />

        {/* 6. Row 3: Live & Crash Games Horizontal Scroll Snap */}
        <GameRowSection
          title="Live & Crash Games"
          icon={<Rocket className="w-5 h-5 text-emerald-400" />}
          games={LIVE_CRASH_GAMES}
          viewAllLink="/games"
        />

        {/* 7. Dedicated Matka Jhatka Section */}
        <motion.div variants={item} className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Dice1 className="w-5 h-5 text-amber-400" />
              <div>
                <h2 className="text-base font-black text-[#E8C97A] font-heading tracking-tight">Matka Jhatka Markets</h2>
                <p className="text-[10px] text-[rgba(212,175,55,0.5)]">Kalyan, Mumbai & Rajdhani Daily Bazaars</p>
              </div>
            </div>
            <Link to="/games/matka" className="text-xs font-bold text-[rgba(212,175,55,0.6)] hover:text-gold flex items-center gap-0.5 transition-colors">
              View All Markets <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          <div className="gold-divider opacity-50" />

          {/* Matka Variants Horizontal Scroll Container */}
          <div className="flex overflow-x-auto gap-3.5 snap-x snap-mandatory scrollbar-none pb-2 pt-1 -mx-4 px-4 sm:mx-0 sm:px-0">
            {MATKA_VARIANTS.map((m) => (
              <motion.div
                key={m.id}
                whileHover={{ y: -4, scale: 1.02 }}
                transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                className="w-[calc(85%-10px)] sm:w-64 shrink-0 snap-start royal-panel rounded-2xl p-4 border border-[rgba(212,175,55,0.25)] flex flex-col justify-between hover:border-gold hover:shadow-[0_8px_30px_rgba(212,175,55,0.18)] transition-all"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border ${
                      m.status === 'open' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                    }`}>
                      {m.status === 'open' ? '⚡ LIVE DRAW' : '🔒 SCHEDULED'}
                    </span>
                    <span className="text-[10px] font-mono font-bold text-gold bg-[rgba(212,175,55,0.1)] px-2 py-0.5 rounded-lg border border-[rgba(212,175,55,0.2)]">
                      {m.odds} Payout
                    </span>
                  </div>

                  <h3 className="text-base font-black text-gold font-heading">{m.name}</h3>
                  <div className="flex items-center gap-1.5 text-[11px] text-[rgba(212,175,55,0.6)] mt-1 font-mono">
                    <Clock className="w-3 h-3 text-amber-400" />
                    <span>{m.openTime} - {m.closeTime}</span>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-[rgba(212,175,55,0.12)] flex items-center justify-between">
                  <div>
                    <span className="text-[9px] text-[rgba(212,175,55,0.4)] uppercase font-bold block">Last Result</span>
                    <span className="text-sm font-mono font-black text-emerald-400">{m.lastResult}</span>
                  </div>

                  <Link
                    to={`/games/matka?market=${m.id}`}
                    className="btn-royal-gold px-3.5 py-1.5 rounded-xl text-xs font-black uppercase flex items-center gap-1 shadow-md"
                  >
                    Play Now <ChevronRight className="w-3 h-3" />
                  </Link>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* 8. Live Bet Feed Ticker Panel */}
        <motion.div variants={item}>
          <LiveFeedPanel />
        </motion.div>

        {/* 9. Trust Badges */}
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
