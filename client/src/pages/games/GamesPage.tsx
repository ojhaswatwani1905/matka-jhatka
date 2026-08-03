import { useState } from 'react';
import { motion } from 'framer-motion';
import { Palette, Dice1, Ticket, Fish, Crown, Lock, Trophy, Zap } from 'lucide-react';
import GameCard from '../../components/shared/GameCard';

const categories = [
  { id: 'all', label: '🔥 All Games' },
  { id: 'popular', label: '⚡ TOP' },
  { id: 'color', label: '🎨 Color' },
  { id: 'matka', label: '🎲 Matka' },
  { id: 'lottery', label: '🎟 Lottery' },
  { id: 'ocean', label: '🌊 Ocean' },
];

const comingSoonGames = [
  { name: 'Win Go 5m', emoji: '🎯' },
  { name: 'Lottery 3D', emoji: '🎟️' },
  { name: 'Crash X', emoji: '📈' },
  { name: 'Speed Dice', emoji: '🎲' },
  { name: 'Jewel Mines', emoji: '💎' },
  { name: 'Plinko Gold', emoji: '🔴' },
];

export default function GamesPage() {
  const [activeCategory, setActiveCategory] = useState('all');

  return (
    <div className="space-y-6 pb-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-black text-[#E8C97A] font-heading flex items-center gap-2.5">
          <Crown className="w-6 h-6 text-gold" /> All Casino Games
        </h1>
        <p className="text-xs text-[rgba(212,175,55,0.5)] mt-1">Provably Fair color prediction & numbers gaming suite</p>
      </motion.div>

      {/* Category Pills — K3 style */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.05 }}>
        <div className="flex items-center gap-2 overflow-x-auto scrollbar-none pb-1">
          {categories.map((cat) => (
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

      {/* Playable Games Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <GameCard
          title="Matka Jhatka"
          description="Classic single, jodi & patti numbers game with up to 900x payout"
          icon={<Dice1 className="w-12 h-12 text-[#F5D576]" />}
          gradient="linear-gradient(135deg, #1a1000 0%, #2d1f00 50%, #1a1000 100%)"
          path="/games/matka"
          players={4892}
          tag="🔥 Popular"
          delay={0}
        />
        <GameCard
          title="Color Prediction"
          description="Predict the winning color & number (WinGo style) — up to 9x payout"
          icon={<Palette className="w-12 h-12 text-[#2ECC71]" />}
          gradient="linear-gradient(135deg, #001a0d 0%, #003320 50%, #001a0d 100%)"
          path="/games/color-prediction"
          players={5284}
          tag="⚡ Provably Fair"
          delay={0.05}
        />
      </div>

      {/* Locked Coming Soon */}
      <div className="pt-4">
        <div className="flex items-center gap-2 mb-3">
          <Lock className="w-4 h-4 text-[rgba(212,175,55,0.5)]" />
          <h2 className="text-base font-bold text-[#E8C97A] font-heading">Coming Soon — Under Licensing Review</h2>
        </div>
        <div className="gold-divider mb-4" />

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
          {comingSoonGames.map((game, i) => (
            <motion.div
              key={game.name}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 0.55, y: 0 }}
              transition={{ delay: 0.1 + i * 0.04 }}
              className="rounded-2xl p-4 text-center cursor-not-allowed select-none relative overflow-hidden border border-[rgba(212,175,55,0.12)] bg-[#0d2419]"
            >
              {/* Gold lock icon */}
              <div className="absolute top-2 right-2 text-[#8B6914]">
                <Lock className="w-3.5 h-3.5" />
              </div>
              <span className="text-2xl block mb-2 opacity-50 grayscale">{game.emoji}</span>
              <p className="text-xs font-bold text-[rgba(212,175,55,0.6)] line-clamp-1">{game.name}</p>
              <span className="text-[9px] font-bold text-[#8B6914] bg-[rgba(212,175,55,0.08)] px-2 py-0.5 rounded-full inline-block mt-2 border border-[rgba(212,175,55,0.15)]">
                LOCKED
              </span>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Section separator & Upcoming row */}
      <div className="pt-4">
        <div className="gold-divider" />
        <div className="flex items-center gap-2 mt-3 mb-4">
          <Trophy className="w-4 h-4 text-gold" />
          <span className="text-sm font-black text-[#E8C97A]">Upcoming Games</span>
          <span className="gold-badge text-[9px] ml-1">SOON</span>
        </div>

        {/* Upcoming locked tiles — 3 per row */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { name: 'Lottery 5D', emoji: '🎟️', tag: 'K3 Style' },
            { name: 'Crash X', emoji: '📈', tag: 'Multiplier' },
            { name: 'Speed Dice', emoji: '🎲', tag: 'Real-Time' },
            { name: 'Jewel Mines', emoji: '💎', tag: 'Strategy' },
            { name: 'Plinko Gold', emoji: '🔴', tag: 'Physics' },
            { name: 'Ocean Hunter', emoji: '🐟', tag: 'Arcade' },
          ].map((game, i) => (
            <motion.div
              key={game.name}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 0.6, y: 0 }}
              transition={{ delay: 0.1 + i * 0.04 }}
              className="rounded-2xl p-4 text-center cursor-not-allowed select-none relative overflow-hidden border border-[rgba(212,175,55,0.18)] bg-[#0d2419]"
            >
              <div className="absolute top-2 right-2 text-[#8B6914]">
                <Lock className="w-3.5 h-3.5" />
              </div>
              <span className="text-3xl block mb-2 grayscale opacity-60">{game.emoji}</span>
              <p className="text-xs font-bold text-[rgba(212,175,55,0.7)] line-clamp-1">{game.name}</p>
              <span className="text-[9px] font-bold text-[#8B6914] bg-[rgba(212,175,55,0.08)] px-2 py-0.5 rounded-full inline-block mt-1.5 border border-[rgba(212,175,55,0.15)]">
                {game.tag}
              </span>
            </motion.div>
          ))}
        </div>

        {/* Icon bar */}
        <div className="flex items-center justify-center gap-3 mt-4 opacity-30">
          <Ticket className="w-4 h-4 text-gold" />
          <Fish className="w-4 h-4 text-gold" />
          <Zap className="w-4 h-4 text-gold" />
        </div>
      </div>
    </div>
  );
}
