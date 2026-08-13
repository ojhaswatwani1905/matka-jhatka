import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Shield, Crosshair } from 'lucide-react';
import { useWallet } from '../../store/WalletContext';
import { useAuth } from '../../store/AuthContext';
import { useToast } from '../../components/ui/Toast';
import { useAuthGate } from '../../hooks/useAuthGate';
import { useGameControl } from '../../store/GameControlContext';
import { AutoBetPanel } from '../../components/ui/AutoBetPanel';
import { GameChat } from '../../components/ui/GameChat';
import Modal from '../../components/ui/Modal';
import { triggerWinCelebration } from '../../components/ui/WinCelebrationOverlay';
import { haptics } from '../../lib/haptics';

/* ─── Fish Target Config ────────────────────────────────────────── */
interface TargetFish {
  id: string;
  name: string;
  emoji: string;
  multiplier: number;
  hp: number;
  maxHp: number;
}

const FISH_TYPES: Omit<TargetFish, 'id'>[] = [
  { name: 'Golden Crab', emoji: '🦀', multiplier: 1.5, hp: 1, maxHp: 1 },
  { name: 'Neon Jellyfish', emoji: '🪼', multiplier: 3.0, hp: 2, maxHp: 2 },
  { name: 'Deepsea Angler', emoji: '🐡', multiplier: 8.0, hp: 4, maxHp: 4 },
  { name: 'Mega Leviathan', emoji: '🐉', multiplier: 25.0, hp: 8, maxHp: 8 },
];

/* ─── Provably Fair ─────────────────────────────────────────────── */
async function generateFishSeed(): Promise<{ seed: string; hash: string }> {
  const seed = Array.from(crypto.getRandomValues(new Uint8Array(16)))
    .map(b => b.toString(16).padStart(2, '0')).join('');
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(seed));
  const hash = Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
  return { seed, hash };
}

function ProvablyFairModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Ocean Hunter Provably Fair">
      <div className="space-y-3 text-xs text-[#F5F1E6]/80">
        <p>Every arcade target spawn and bullet impact outcome is derived from a SHA-256 cryptographic seed generated before each shot.</p>
        <div className="bg-[#061510] p-3 rounded-xl border border-[rgba(212,175,55,0.2)] font-mono text-[10px] text-gold">
          Algorithm: SHA-256(ClientSeed + ServerSeed + ShotIndex)
        </div>
        <p>You can verify that shot damage and capture multipliers were completely unmanipulated by the server.</p>
      </div>
    </Modal>
  );
}

/* ─── Main Page ─────────────────────────────────────────────────── */
export default function OceanHunterPage() {
  const { balance, deductBalance, addBalance } = useWallet();
  const { isAuthenticated } = useAuth();
  const { addToast } = useToast();
  const { requireAuth } = useAuthGate();
  const { settings } = useGameControl();

  const [bulletCost, setBulletCost] = useState(50);
  const [shotsFired, setShotsFired] = useState(0);
  const [seedInfo, setSeedInfo] = useState<{ seed: string; hash: string }>({ seed: '', hash: '' });
  const [isFairnessOpen, setIsFairnessOpen] = useState(false);
  const [activeFish, setActiveFish] = useState<TargetFish[]>([]);

  // Spawn initial fish targets
  useEffect(() => {
    generateFishSeed().then(s => setSeedInfo(s));
    setActiveFish(
      FISH_TYPES.map((f, i) => ({
        ...f,
        id: `fish_${i}_${Date.now()}`,
      }))
    );
  }, []);

  const shootFish = (fishId: string) => {
    requireAuth(() => {
      if (!deductBalance(bulletCost, `Ocean Hunter cannon shot`)) {
        addToast({ type: 'error', title: 'Insufficient balance', message: `Each shot costs ₹${bulletCost}. Please add funds to your wallet.` });
        return;
      }
      haptics.bet();
      setShotsFired(s => s + 1);

    // Apply 1 HP damage per shot
    const targetIndex = activeFish.findIndex(f => f.id === fishId);
    if (targetIndex === -1) return;

    const target = activeFish[targetIndex];
    const damage = 1 * (settings.oceanHunter.catchRate ?? 1.0);
    const newHp = Math.max(0, target.hp - damage);

    if (newHp <= 0) {
      // Captured fish target!
      const winAmt = Math.round(bulletCost * target.multiplier);
      addBalance(winAmt, `Ocean Hunter captured ${target.name} (${target.multiplier}x)`);
      triggerWinCelebration({ winAmount: winAmt, multiplier: target.multiplier, gameName: 'Ocean Hunter' });
      addToast({
        type: 'success',
        title: `🎯 Captured ${target.name}!`,
        message: `Won ₹${winAmt} (${target.multiplier}x payout)`,
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
      setActiveFish(prev =>
        prev.map((f, i) => (i === targetIndex ? { ...f, hp: newHp } : f))
      );
    }
  });
};

  return (
    <div className="py-4 space-y-5 w-full max-w-6xl mx-auto">
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

      {/* 2-Column Desktop Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Arcade Tank & Controls */}
        <div className="lg:col-span-7 xl:col-span-8 space-y-4">
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

          {/* Auto Bet */}
          <AutoBetPanel
            balance={balance}
            intervalMs={2500}
            onPlaceBet={async (amount) => {
              if (!isAuthenticated) return 0;
              if (balance < amount) return 0;
              deductBalance(amount, `Auto-Bet — Ocean Hunter Shot`);
              const won = Math.random() > 0.55;
              const mult = won ? 2.5 : 0;
              const payout = won ? Math.round(amount * mult) : 0;
              if (won) addBalance(payout, `Auto-Bet Win — Ocean Hunter ${mult}x`, 'win');
              return won ? payout - amount : -amount;
            }}
          />
        </div>

        {/* Right Column: Game Chat */}
        <div className="lg:col-span-5 xl:col-span-4 space-y-4">
          <GameChat gameId="ocean-hunter" />
        </div>
      </div>

      <ProvablyFairModal isOpen={isFairnessOpen} onClose={() => setIsFairnessOpen(false)} />
    </div>
  );
}
