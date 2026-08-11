import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ChevronRight, Play, Flame } from 'lucide-react';

interface GameItem {
  id: string;
  name: string;
  sub: string;
  img: string;
  path: string;
  badge?: string;
  badgeColor?: string;
}

const ALL_GAMES: GameItem[] = [
  { id: 'aviator', name: 'Aviator', sub: 'Crash Multiplier', img: '/games/aviator.png', path: '/games/aviator', badge: '🚀 HOT', badgeColor: 'bg-rose-600' },
  { id: 'slots', name: 'Royal 777 Slots', sub: 'Multi-Line Jackpot', img: '/games/slots-hero.png', path: '/games/slots', badge: '💎 777x', badgeColor: 'bg-amber-500' },
  { id: 'color', name: 'Color Prediction', sub: 'Win Go 1Min / 3Min', img: '/games/color.png', path: '/games/color-prediction', badge: '⚡ Live', badgeColor: 'bg-emerald-600' },
  { id: 'wingo', name: 'Win Go 3Min', sub: 'Number Draw', img: '/games/wingo.png', path: '/games/wingo', badge: 'NEW', badgeColor: 'bg-blue-600' },
  { id: 'matka', name: 'Matka Jhatka', sub: 'Kalyan & Mumbai', img: '/games/matka.png', path: '/games/matka', badge: '🔥 Hot', badgeColor: 'bg-rose-600' },
  { id: 'mines', name: 'Mines', sub: 'Dodge Bombs Strategy', img: '/games/mines.png', path: '/games/mines', badge: '💣 1000x', badgeColor: 'bg-rose-500' },
  { id: 'plinko', name: 'Plinko Gold', sub: 'Physics Ball Drop', img: '/games/plinko.png', path: '/games/plinko', badge: '🪙 29x', badgeColor: 'bg-amber-600' },
  { id: 'teenpatti', name: 'Teen Patti 3Card', sub: 'Indian Poker', img: '/games/teenpatti.png', path: '/games/teen-patti', badge: '👑 3.8x', badgeColor: 'bg-amber-600' },
];

export function RelatedGamesSection({ currentGameId }: { currentGameId: string }) {
  const filtered = ALL_GAMES.filter(g => g.id !== currentGameId).slice(0, 4);

  return (
    <div className="pt-6 border-t border-[rgba(212,175,55,0.15)] space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Flame className="w-4 h-4 text-gold" />
          <h3 className="text-sm font-black text-[#E8C97A] font-heading">You Might Also Like</h3>
        </div>
        <Link to="/games" className="text-xs font-bold text-[rgba(212,175,55,0.6)] hover:text-gold flex items-center gap-0.5 transition-colors">
          View All Games <ChevronRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {filtered.map(game => (
          <Link key={game.id} to={game.path} className="group block">
            <motion.div
              whileHover={{ y: -3, scale: 1.02 }}
              transition={{ type: 'spring', stiffness: 300, damping: 20 }}
              className="rounded-xl overflow-hidden border border-[rgba(212,175,55,0.2)] bg-[#0a1e12] hover:border-gold hover:shadow-[0_6px_20px_rgba(212,175,55,0.2)] transition-all duration-300"
            >
              <div className="relative h-24 overflow-hidden">
                <img
                  src={game.img}
                  alt={game.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                {game.badge && (
                  <span className={`absolute top-1.5 left-1.5 ${game.badgeColor} text-white text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-full`}>
                    {game.badge}
                  </span>
                )}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                  <div className="w-8 h-8 rounded-full btn-royal-gold flex items-center justify-center scale-75 group-hover:scale-100 transition-transform duration-300">
                    <Play className="w-3.5 h-3.5 fill-[#0B2318] ml-0.5" />
                  </div>
                </div>
              </div>
              <div className="px-2.5 py-2 bg-[#0d2419]">
                <p className="text-xs font-bold text-[#F5F1E6] truncate group-hover:text-gold transition-colors">{game.name}</p>
                <p className="text-[10px] text-[rgba(212,175,55,0.5)] truncate">{game.sub}</p>
              </div>
            </motion.div>
          </Link>
        ))}
      </div>
    </div>
  );
}
