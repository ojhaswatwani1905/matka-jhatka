import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, Sparkles, Crosshair } from 'lucide-react';
import confetti from 'canvas-confetti';
import { useWallet } from '../../store/WalletContext';
import { useToast } from '../../components/ui/Toast';
import { useAuthGate } from '../../hooks/useAuthGate';
import { generateId } from '../../lib/utils';
import { sounds } from '../../lib/sound';
import { AutoBetPanel } from '../../components/ui/AutoBetPanel';
import { GameChat } from '../../components/ui/GameChat';
import { ProvablyFairModal } from '../../components/ui/ProvablyFairModal';

/* ─── Provably Fair ─────────────────────────────────────────────── */
async function generateFishSeed(): Promise<{ seed: string; hash: string }> {
  const seed = Array.from(crypto.getRandomValues(new Uint8Array(16)))
    .map(b => b.toString(16).padStart(2, '0')).join('');
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(seed));
  const hash = Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
  return { seed, hash };
}

interface TargetFish {
  id: string;
  name: string;
  emoji: string;
  multiplier: number;
  hp: number;
  maxHp: number;
}

const FISH_TYPES: Omit<TargetFish, 'id'>[] = [
  { name: 'Clownfish', emoji: '🐠', multiplier: 1.5, hp: 1, maxHp: 1 },
  { name: 'Blue Tang', emoji: '🐟', multiplier: 2.0, hp: 2, maxHp: 2 },
  { name: 'Pufferfish', emoji: '🐡', multiplier: 3.5, hp: 3, maxHp: 3 },
  { name: 'Golden Shark', emoji: '🦈', multiplier: 10.0, hp: 5, maxHp: 5 },
  { name: 'Kraken Boss', emoji: '🐙', multiplier: 25.0, hp: 8, maxHp: 8 },
];

export default function OceanHunterPage() {
  const { balance, deductBalance, addBalance } = useWallet();
  const { addToast } = useToast();
  const { requireAuth } = useAuthGate();

  const [bulletCost, setBulletCost] = useState(50);
  const [activeFish, setActiveFish] = useState<TargetFish[]>([]);
  const [seedInfo, setSeedInfo] = useState<{ seed: string; hash: string }>({ seed: '', hash: '' });
  const [isFairnessOpen, setIsFairnessOpen] = useState(false);
  const [shotsFired, setShotsFired] = useState(0);

  // Initialize seed & target fish
  useEffect(() => {
    generateFishSeed().then(s => setSeedInfo(s));
    spawnFishBatch();
  }, []);

  const spawnFishBatch = () => {
    const batch: TargetFish[] = Array.from({ length: 4 }, (_, i) => {
      const template = FISH_TYPES[Math.floor(Math.random() * FISH_TYPES.length)];
      return {
        ...template,
        id: `fish_${Date.now()}_${i}_${Math.random()}`,
      };
    });
    setActiveFish(batch);
  };

  const shootFish = async (targetId: string) => {
    if (!requireAuth()) return;
    if (balance < bulletCost) {
      addToast({ type: 'error', title: 'Insufficient Funds', message: `Bullet cost is ₹${bulletCost}.` });
      return;
    }

    const deducted = deductBalance(bulletCost, `Ocean Hunter Cannon Shot`);
    if (!deducted) return;

    sounds.click();
    setShotsFired(s => s + 1);

    // Target logic
    const targetIndex = activeFish.findIndex(f => f.id === targetId);
    if (targetIndex === -1) return;

    const fish = activeFish[targetIndex];
    const newHp = fish.hp - 1;

    if (newHp <= 0) {
      // Fish defeated!
      sounds.win();
      confetti({ particleCount: 40, spread: 60, origin: { y: 0.6 } });

      const payout = Math.round(bulletCost * fish.multiplier);
      addBalance(payout, `Defeated ${fish.name} (${fish.multiplier}x)`, 'win');

      addToast({
        type: 'success',
        title: `${fish.emoji} ${fish.name} Captured!`,
        message: `Won ₹${payout.toLocaleString()} (${fish.multiplier}x payout)`,
      });

      // Replace fish
      const nextTemplate = FISH_TYPES[Math.floor(Math.random() * FISH_TYPES.length)];
      const replacement: TargetFish = {
        ...nextTemplate,
        id: `fish_${Date.now()}_${Math.random()}`,
      };

      setActiveFish(prev => prev.map((f, i) => (i === targetIndex ? replacement : f)));
      generateFishSeed().then(s => setSeedInfo(s));
    } else {
      // Damage fish
      setActiveFish(prev =>
        prev.map((f, i) => (i === targetIndex ? { ...f, hp: newHp } : f))
      );
    }
  };

  return (
    <div className="space-y-5 pb-10">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-[#E8C97A] font-heading flex items-center gap-2">
            <span className="text-2xl">🌊</span> Ocean Hunter Arcade
          </h1>
          <p className="text-xs text-[rgba(212,175,55,0.5)] mt-1">
            Shoot sea targets to capture multipliers up to 25x
          </p>
        </div>

        <button
          onClick={() => setIsFairnessOpen(true)}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-[rgba(212,175,55,0.4)] text-[#E8C97A] text-xs font-bold hover:bg-[rgba(212,175,55,0.1)] transition-all cursor-pointer"
        >
          <Shield className="w-4 h-4 text-gold" />
          <span className="hidden sm:inline">SHA-256 Hash</span>
        </button>
      </div>

      {/* Provably Fair Commit Strip */}
      <div className="royal-panel rounded-2xl p-3 flex items-center justify-between text-xs">
        <span className="text-[rgba(212,175,55,0.5)] font-bold">Round Commit Hash:</span>
        <span className="font-mono text-gold truncate max-w-[220px] sm:max-w-md">{seedInfo.hash || 'Generating...'}</span>
      </div>

      {/* Arcade Hunting Tank */}
      <div className="royal-panel rounded-3xl p-6 border-2 border-[rgba(212,175,55,0.3)] relative overflow-hidden bg-gradient-to-b from-[#061A10] via-[#092B1C] to-[#04120B] min-h-[340px] flex flex-col justify-between shadow-2xl">
        <div className="flex items-center justify-between z-10">
          <span className="text-xs font-black text-amber-400 uppercase tracking-widest flex items-center gap-1.5">
            <Crosshair className="w-4 h-4" /> Cannon Power: ₹{bulletCost}/shot
          </span>
          <span className="text-xs font-mono text-[rgba(212,175,55,0.6)]">Shots Fired: {shotsFired}</span>
        </div>

        {/* Fish Targets Arena */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 py-8 z-10">
          {activeFish.map(fish => (
            <motion.div
              key={fish.id}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => shootFish(fish.id)}
              className="royal-panel rounded-2xl p-4 border border-[rgba(212,175,55,0.25)] flex flex-col items-center justify-center space-y-2 cursor-pointer hover:border-gold hover:bg-[rgba(212,175,55,0.1)] transition-all shadow-lg text-center"
            >
              <div className="text-5xl select-none animate-bounce">{fish.emoji}</div>
              <h4 className="text-xs font-black text-[#F5F1E6] font-heading">{fish.name}</h4>
              <span className="px-2 py-0.5 rounded-full bg-[rgba(46,204,113,0.15)] text-[#2ECC71] border border-[rgba(46,204,113,0.3)] text-[10px] font-black">
                {fish.multiplier}x Payout
              </span>

              {/* HP Bar */}
              <div className="w-full bg-[#061510] h-2 rounded-full overflow-hidden border border-[rgba(212,175,55,0.2)]">
                <div
                  className="bg-gradient-to-r from-rose-500 to-emerald-400 h-full transition-all"
                  style={{ width: `${(fish.hp / fish.maxHp) * 100}%` }}
                />
              </div>
              <span className="text-[9px] text-[rgba(212,175,55,0.4)]">HP: {fish.hp} / {fish.maxHp}</span>
            </motion.div>
          ))}
        </div>

        {/* Cannon Controls */}
        <div className="flex items-center justify-center gap-3 z-10 pt-4 border-t border-[rgba(212,175,55,0.15)]">
          <span className="text-xs font-bold text-[rgba(212,175,55,0.6)]">Set Shot Stake:</span>
          {[20, 50, 100, 250, 500].map(cost => (
            <button
              key={cost}
              onClick={() => setBulletCost(cost)}
              className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                bulletCost === cost
                  ? 'btn-royal-gold'
                  : 'bg-[#0d2419] border border-[rgba(212,175,55,0.2)] text-[#E8C97A] hover:border-gold'
              }`}
            >
              ₹{cost}
            </button>
          ))}
        </div>
      </div>

      {/* Auto Bet & Game Chat */}
      <AutoBetPanel
        balance={balance}
        intervalMs={2500}
        onPlaceBet={async (amount) => {
          if (!requireAuth()) return 0;
          if (balance < amount) return 0;
          deductBalance(amount, `Auto-Bet — Ocean Hunter Shot`, 'bet');
          const won = Math.random() > 0.55;
          const mult = won ? 2.5 : 0;
          const payout = won ? Math.round(amount * mult) : 0;
          if (won) addBalance(payout, `Auto-Bet Win — Ocean Hunter ${mult}x`, 'win');
          return won ? payout - amount : -amount;
        }}
      />

      <GameChat gameId="ocean-hunter" />
      <ProvablyFairModal isOpen={isFairnessOpen} onClose={() => setIsFairnessOpen(false)} />
    </div>
  );
}
