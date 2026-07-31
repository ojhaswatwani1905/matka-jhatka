import { motion } from 'framer-motion';
import { Palette, Dice1, Gamepad2, Lock } from 'lucide-react';
import GameCard from '../../components/shared/GameCard';

export default function GamesPage() {
  return (
    <div className="space-y-6 pb-6">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-black text-white font-heading flex items-center gap-2.5">
          <Gamepad2 className="w-6 h-6 text-gold" /> All Casino Games
        </h1>
        <p className="text-xs text-slate-400 mt-1">Provably Fair color prediction & numbers gaming suite</p>
      </motion.div>

      {/* Playable Games Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <GameCard
          title="Matka Jhatka"
          description="Classic single, jodi & patti numbers game"
          icon={<Dice1 className="w-12 h-12 text-white" />}
          gradient="linear-gradient(135deg, #7C3AED, #4C1D95)"
          path="/games/matka"
          players={4892}
          tag="🔥 Popular"
          delay={0}
        />
        <GameCard
          title="Color Prediction"
          description="Predict the winning color & number (WinGo style)"
          icon={<Palette className="w-12 h-12 text-white" />}
          gradient="linear-gradient(135deg, #EF4444, #991B1B)"
          path="/games/color-prediction"
          players={5284}
          tag="⚡ Provably Fair"
          delay={0.05}
        />
      </div>

      {/* Disabled / Locked Coming Soon Section */}
      <div className="pt-4 border-t border-white/5">
        <h2 className="text-base font-bold text-white font-heading mb-3 flex items-center gap-2">
          <Lock className="w-4 h-4 text-slate-500" /> Coming Soon (Under Licensing Review)
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
          {[
            { name: 'Win Go 5m', emoji: '🎯' },
            { name: 'Lottery 3D', emoji: '🎟️' },
            { name: 'Crash X', emoji: '📈' },
            { name: 'Speed Dice', emoji: '🎲' },
            { name: 'Jewel Mines', emoji: '💎' },
            { name: 'Plinko Gold', emoji: '🔴' },
          ].map((game, i) => (
            <motion.div
              key={game.name}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 0.45, y: 0 }}
              transition={{ delay: 0.1 + i * 0.04 }}
              className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 text-center cursor-not-allowed select-none relative overflow-hidden"
            >
              <div className="absolute top-2 right-2 text-slate-500">
                <Lock className="w-3.5 h-3.5" />
              </div>
              <span className="text-2xl block mb-2 opacity-50 grayscale">{game.emoji}</span>
              <p className="text-xs font-bold text-slate-400 line-clamp-1">{game.name}</p>
              <span className="text-[9px] font-bold text-amber-500/70 bg-amber-500/10 px-2 py-0.5 rounded-full inline-block mt-2 border border-amber-500/20">
                LOCKED
              </span>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
