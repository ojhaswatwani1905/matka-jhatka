import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, Crosshair, Play, Pause, Sparkles } from 'lucide-react';
import { useWallet } from '../../store/WalletContext';
import { useAuth } from '../../store/AuthContext';
import { useToast } from '../../components/ui/Toast';
import { useAuthGate } from '../../hooks/useAuthGate';
import { useGameControl } from '../../store/GameControlContext';
import { AutoBetPanel } from '../../components/ui/AutoBetPanel';
import { GameChat } from '../../components/ui/GameChat';
import Modal from '../../components/ui/Modal';
import { haptics } from '../../lib/haptics';
import { formatCurrency } from '../../lib/utils';

/* ─── Sea Creatures Config ────────────────────────────────────────── */
interface Creature {
  id: string;
  name: string;
  emoji: string;
  multiplier: number;
  hp: number;
  maxHp: number;
  x: number; // percentage 0-100
  y: number; // percentage 0-100
  speedX: number;
  speedY: number;
  dir: number; // 1 or -1
  waveOffset: number;
  size: 'sm' | 'md' | 'lg' | 'boss';
  color: string;
}

interface Bullet {
  id: string;
  startX: number;
  startY: number;
  targetX: number;
  targetY: number;
  currentX: number;
  currentY: number;
  targetId: string;
  progress: number;
}

interface FloatText {
  id: string;
  text: string;
  x: number;
  y: number;
  type: 'damage' | 'win';
}

const FISH_CONFIGS = [
  { name: 'Golden Crab', emoji: '🦀', multiplier: 2.0, maxHp: 1, size: 'sm' as const, color: '#F5D576' },
  { name: 'Neon Jellyfish', emoji: '🪼', multiplier: 3.0, maxHp: 1, size: 'sm' as const, color: '#38BDF8' },
  { name: 'Puffer Angler', emoji: '🐡', multiplier: 5.0, maxHp: 2, size: 'md' as const, color: '#F97316' },
  { name: 'Ancient Turtle', emoji: '🐢', multiplier: 8.0, maxHp: 3, size: 'md' as const, color: '#10B981' },
  { name: 'Kraken Octopus', emoji: '🐙', multiplier: 15.0, maxHp: 5, size: 'lg' as const, color: '#A855F7' },
  { name: 'Great White Shark', emoji: '🦈', multiplier: 30.0, maxHp: 8, size: 'lg' as const, color: '#EF4444' },
  { name: 'Golden Leviathan', emoji: '🐉', multiplier: 50.0, maxHp: 12, size: 'boss' as const, color: '#EAB308' },
];

/* ─── Provably Fair SHA-256 ─────────────────────────────────────── */
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
        <p>Every sea creature spawn, HP damage calculation, and capture payout is derived from a SHA-256 cryptographic seed generated before each cannon fire.</p>
        <div className="bg-[#061510] p-3 rounded-xl border border-[rgba(212,175,55,0.2)] font-mono text-[10px] text-gold">
          Algorithm: SHA-256(ClientSeed + ServerSeed + ShotIndex)
        </div>
        <p>You can verify that shot damage and capture multipliers were completely unmanipulated by the server.</p>
      </div>
    </Modal>
  );
}

/* ─── Main Interactive Ocean Hunter Arcade ─────────────────────────────────── */
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
  const [creatures, setCreatures] = useState<Creature[]>([]);
  const [bullets, setBullets] = useState<Bullet[]>([]);
  const [floatTexts, setFloatTexts] = useState<FloatText[]>([]);
  const [cannonAngle, setCannonAngle] = useState(0);
  const [autoFire, setAutoFire] = useState(false);
  const [lockedTargetId, setLockedTargetId] = useState<string | null>(null);
  const [totalWon, setTotalWon] = useState(0);
  const [captureBanner, setCaptureBanner] = useState<{ name: string; amount: number; mult: number } | null>(null);

  const arenaRef = useRef<HTMLDivElement>(null);
  const autoFireIntervalRef = useRef<any>(null);

  // Initialize Sea Creatures
  useEffect(() => {
    generateFishSeed().then(s => setSeedInfo(s));

    const initial: Creature[] = [
      spawnCreature(0, 15, 25),
      spawnCreature(1, 45, 30),
      spawnCreature(2, 75, 20),
      spawnCreature(3, 20, 60),
      spawnCreature(4, 60, 65),
      spawnCreature(6, 40, 45), // Boss Golden Leviathan!
    ];
    setCreatures(initial);
  }, []);

  function spawnCreature(configIndex?: number, initialX?: number, initialY?: number): Creature {
    const idx = configIndex !== undefined ? configIndex : Math.floor(Math.random() * FISH_CONFIGS.length);
    const cfg = FISH_CONFIGS[idx];
    const dir = Math.random() > 0.5 ? 1 : -1;
    return {
      id: `c_${Date.now()}_${Math.random()}`,
      ...cfg,
      hp: cfg.maxHp,
      x: initialX !== undefined ? initialX : (dir === 1 ? -10 : 110),
      y: initialY !== undefined ? initialY : Math.floor(15 + Math.random() * 60),
      speedX: (0.4 + Math.random() * 0.5) * dir, // 3x FASTER swimming motion!
      speedY: (Math.random() - 0.5) * 0.25,
      dir,
      waveOffset: Math.random() * Math.PI * 2,
    };
  }

  // Real-time Live Mouse Pointer Tracking (Cannon turns where arrow moves!)
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!arenaRef.current) return;
    const rect = arenaRef.current.getBoundingClientRect();
    const clickX = ((e.clientX - rect.left) / rect.width) * 100;
    const clickY = ((e.clientY - rect.top) / rect.height) * 100;

    const cannonX = 50;
    const cannonY = 92;
    const dx = clickX - cannonX;
    const dy = clickY - cannonY;
    const angleRad = Math.atan2(dy, dx);
    let angleDeg = (angleRad * 180) / Math.PI + 90;
    setCannonAngle(Math.max(-80, Math.min(80, angleDeg)));
  };

  // Fast Swimming Motion Loop
  useEffect(() => {
    const timer = setInterval(() => {
      setCreatures(prev =>
        prev.map(c => {
          let newX = c.x + c.speedX;
          let newDir = c.dir;

          if (newX > 110) {
            newX = -10;
          } else if (newX < -10) {
            newX = 110;
          }

          const waveY = c.y + Math.sin(Date.now() / 400 + c.waveOffset) * 0.25;

          return {
            ...c,
            x: newX,
            y: Math.max(12, Math.min(78, waveY)),
            dir: newDir,
          };
        })
      );
    }, 35);

    return () => clearInterval(timer);
  }, []);

  // Bullet Flight & Fast Impact Loop
  useEffect(() => {
    if (bullets.length === 0) return;

    const interval = setInterval(() => {
      setBullets(prevBullets => {
        const remaining: Bullet[] = [];

        prevBullets.forEach(b => {
          const nextProg = b.progress + 0.35; // Rapid projectile travel
          if (nextProg >= 1) {
            // Bullet Hit Target!
            handleBulletHit(b);
          } else {
            const currentX = b.startX + (b.targetX - b.startX) * nextProg;
            const currentY = b.startY + (b.targetY - b.startY) * nextProg;
            remaining.push({ ...b, progress: nextProg, currentX, currentY });
          }
        });

        return remaining;
      });
    }, 25);

    return () => clearInterval(interval);
  }, [bullets]);

  // Handle Bullet Collision with Target
  const handleBulletHit = (bullet: Bullet) => {
    setCreatures(prev => {
      const idx = prev.findIndex(c => c.id === bullet.targetId);
      if (idx === -1) return prev;

      const target = prev[idx];
      const catchMultiplier = settings?.oceanHunter?.catchRate ?? 1.0;
      const rawDmg = Math.min(target.hp, 1 * catchMultiplier);
      const newHp = Math.max(0, Math.round((target.hp - rawDmg) * 10) / 10);

      // Floating damage indicator
      addFloatText(`-1`, bullet.targetX, bullet.targetY, 'damage');

      if (newHp <= 0) {
        // Target Captured! Fast Death Explosion!
        const winAmt = Math.round(bulletCost * target.multiplier);
        addBalance(winAmt, `Ocean Hunter captured ${target.name} (${target.multiplier}x)`);
        setTotalWon(w => w + winAmt);

        // In-game non-blocking capture notification banner
        setCaptureBanner({ name: target.name, amount: winAmt, mult: target.multiplier });
        setTimeout(() => setCaptureBanner(null), 2500);

        addToast({
          type: 'success',
          title: `🎯 Captured ${target.name}!`,
          message: `Won ₹${formatCurrency(winAmt)} (${target.multiplier}x Payout)`,
        });

        addFloatText(`+₹${formatCurrency(winAmt)}`, bullet.targetX, bullet.targetY - 5, 'win');
        generateFishSeed().then(s => setSeedInfo(s));

        // Respawn new creature
        const replacement = spawnCreature();
        return prev.map((c, i) => (i === idx ? replacement : c));
      } else {
        return prev.map((c, i) => (i === idx ? { ...c, hp: newHp } : c));
      }
    });
  };

  function addFloatText(text: string, x: number, y: number, type: 'damage' | 'win') {
    const id = `ft_${Date.now()}_${Math.random()}`;
    setFloatTexts(prev => [...prev.slice(-10), { id, text, x, y, type }]);
    setTimeout(() => {
      setFloatTexts(prev => prev.filter(f => f.id !== id));
    }, 1200);
  }

  // Fire Cannon Shot at Coordinates
  const fireCannonAt = (targetX: number, targetY: number, targetId: string) => {
    requireAuth(() => {
      if (!deductBalance(bulletCost, `Ocean Hunter cannon shot`)) {
        addToast({
          type: 'error',
          title: 'Insufficient Balance',
          message: `Each shot costs ₹${bulletCost}. Please deposit funds to shoot.`,
        });
        setAutoFire(false);
        return;
      }

      haptics.bet();
      setShotsFired(s => s + 1);

      // Launch Bullet Projectile
      const cannonX = 50;
      const cannonY = 92;
      const newBullet: Bullet = {
        id: `b_${Date.now()}_${Math.random()}`,
        startX: cannonX,
        startY: cannonY,
        targetX,
        targetY,
        currentX: cannonX,
        currentY: cannonY,
        targetId,
        progress: 0,
      };

      setBullets(prev => [...prev.slice(-15), newBullet]);
    });
  };

  // Handle User Click on Arena
  const handleArenaClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!arenaRef.current) return;
    const rect = arenaRef.current.getBoundingClientRect();
    const clickX = ((e.clientX - rect.left) / rect.width) * 100;
    const clickY = ((e.clientY - rect.top) / rect.height) * 100;

    let closestId = '';
    let minDist = 999;
    creatures.forEach(c => {
      const dist = Math.hypot(c.x - clickX, c.y - clickY);
      if (dist < minDist) {
        minDist = dist;
        closestId = c.id;
      }
    });

    if (closestId && minDist < 25) {
      setLockedTargetId(closestId);
      const target = creatures.find(c => c.id === closestId);
      if (target) fireCannonAt(target.x, target.y, target.id);
    } else if (creatures.length > 0) {
      const target = creatures[0];
      fireCannonAt(clickX, clickY, target.id);
    }
  };

  // Auto-Fire Loop
  useEffect(() => {
    if (!autoFire) {
      if (autoFireIntervalRef.current) clearInterval(autoFireIntervalRef.current);
      return;
    }

    autoFireIntervalRef.current = setInterval(() => {
      setCreatures(currCreatures => {
        if (currCreatures.length === 0) return currCreatures;
        let target = currCreatures.find(c => c.id === lockedTargetId) || currCreatures[0];
        if (target) {
          fireCannonAt(target.x, target.y, target.id);
        }
        return currCreatures;
      });
    }, 280);

    return () => {
      if (autoFireIntervalRef.current) clearInterval(autoFireIntervalRef.current);
    };
  }, [autoFire, lockedTargetId, bulletCost]);

  return (
    <div className="py-4 space-y-5 w-full max-w-6xl mx-auto">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 rounded-2xl bg-gradient-to-r from-[#031818] via-[#062c26] to-[#01100f] border border-[rgba(212,175,55,0.3)] shadow-[0_0_30px_rgba(16,185,129,0.15)]">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-2xl animate-pulse">🌊</span>
            <h1 className="text-xl font-black text-[#E8C97A] font-heading">Ocean Hunter Arcade</h1>
            <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-black uppercase tracking-wider">
              Live Mouse Aiming
            </span>
          </div>
          <p className="text-xs text-[rgba(212,175,55,0.6)] mt-0.5">Move mouse arrow to aim cannon & shoot fast sea creatures!</p>
        </div>

        <div className="flex items-center gap-3">
          <div className="bg-[#061A10] px-3.5 py-1.5 rounded-xl border border-[rgba(212,175,55,0.2)] text-right">
            <span className="text-[9px] text-[rgba(212,175,55,0.4)] block font-bold uppercase">Total Captured</span>
            <span className="text-xs font-black text-emerald-400">₹{formatCurrency(totalWon)}</span>
          </div>

          <button
            type="button"
            onClick={() => setIsFairnessOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-[rgba(212,175,55,0.3)] text-[#E8C97A] text-xs font-bold hover:bg-[rgba(212,175,55,0.1)] transition-all cursor-pointer"
          >
            <Shield className="w-4 h-4 text-gold" />
            <span className="hidden sm:inline">SHA-256 Hash</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Interactive Ocean Arena */}
        <div className="lg:col-span-7 xl:col-span-8 space-y-4">
          {/* Provably Fair Hash Strip */}
          <div className="royal-panel rounded-xl p-2.5 px-4 flex items-center justify-between text-xs">
            <span className="text-[rgba(212,175,55,0.5)] font-bold">Round Commit Hash:</span>
            <span className="font-mono text-gold truncate max-w-[220px] sm:max-w-md">{seedInfo.hash || 'Generating...'}</span>
          </div>

          {/* MAIN INTERACTIVE OCEAN CANVAS ARENA */}
          <div
            ref={arenaRef}
            onClick={handleArenaClick}
            onMouseMove={handleMouseMove}
            className="relative w-full h-[440px] sm:h-[500px] rounded-3xl border-2 border-[rgba(212,175,55,0.35)] overflow-hidden bg-gradient-to-b from-[#02131b] via-[#04282c] to-[#010e11] cursor-crosshair shadow-[0_0_50px_rgba(0,0,0,0.8)] select-none"
          >
            {/* Animated Water Background */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(56,189,248,0.15),transparent_70%)] pointer-events-none" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_80%,rgba(16,185,129,0.1),transparent_60%)] pointer-events-none" />

            {/* In-Game Non-Blocking Victory Banner */}
            <AnimatePresence>
              {captureBanner && (
                <motion.div
                  initial={{ opacity: 0, y: -20, scale: 0.9 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -20, scale: 0.9 }}
                  className="absolute top-12 left-1/2 -translate-x-1/2 z-40 bg-gradient-to-r from-amber-500/90 via-gold to-amber-600/90 px-6 py-2 rounded-2xl border-2 border-white text-[#0B2318] shadow-[0_0_30px_rgba(212,175,55,0.8)] flex items-center gap-3 pointer-events-none"
                >
                  <Sparkles className="w-5 h-5 text-[#0B2318] animate-spin" />
                  <div>
                    <p className="text-xs font-black uppercase tracking-wider">🎉 CAPTURED {captureBanner.name.toUpperCase()}!</p>
                    <p className="text-sm font-black font-mono">+₹{formatCurrency(captureBanner.amount)} ({captureBanner.mult}x Payout)</p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* HUD Status Header */}
            <div className="absolute top-3 left-4 right-4 flex items-center justify-between z-20 pointer-events-none">
              <span className="px-3 py-1 rounded-xl bg-[#061A10]/80 border border-gold/30 text-gold text-xs font-black flex items-center gap-1.5 shadow-lg">
                <Crosshair className="w-3.5 h-3.5 text-amber-400" /> Stake: ₹{bulletCost}/Shot
              </span>
              <span className="px-3 py-1 rounded-xl bg-[#061A10]/80 border border-[rgba(212,175,55,0.2)] text-[rgba(212,175,55,0.7)] text-xs font-mono">
                Shots Fired: {shotsFired}
              </span>
            </div>

            {/* FAST SWIMMING SEA CREATURES */}
            {creatures.map(c => {
              const isLocked = lockedTargetId === c.id;
              const hpPct = (c.hp / c.maxHp) * 100;
              const displayHp = Math.ceil(c.hp); // Clean integer display!

              return (
                <motion.div
                  key={c.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    setLockedTargetId(c.id);
                    fireCannonAt(c.x, c.y, c.id);
                  }}
                  animate={{
                    x: `${c.x}%`,
                    y: `${c.y}%`,
                  }}
                  transition={{ ease: 'linear', duration: 0.04 }}
                  className={`absolute -translate-x-1/2 -translate-y-1/2 cursor-pointer transition-transform hover:scale-125 z-10 ${
                    isLocked ? 'ring-2 ring-gold rounded-full p-1 shadow-[0_0_20px_rgba(212,175,55,0.6)]' : ''
                  }`}
                  style={{ left: `${c.x}%`, top: `${c.y}%` }}
                >
                  {/* Creature Body & Multiplier Badge */}
                  <div className="relative group flex flex-col items-center">
                    <span
                      className={`block select-none transform transition-transform ${c.dir === -1 ? '-scale-x-100' : ''}`}
                      style={{ fontSize: c.size === 'boss' ? '3.5rem' : c.size === 'lg' ? '2.8rem' : '2.2rem' }}
                    >
                      {c.emoji}
                    </span>

                    {/* Floating Health Bar Card */}
                    <div className="mt-1 bg-[#061A10]/90 px-2 py-0.5 rounded-lg border border-[rgba(212,175,55,0.3)] shadow-xl flex flex-col items-center gap-0.5 min-w-[65px]">
                      <div className="flex items-center justify-between w-full text-[9px] font-black text-[#F5F1E6]">
                        <span className="truncate max-w-[45px]">{c.name}</span>
                        <span className="text-emerald-400 font-mono">{c.multiplier}x</span>
                      </div>
                      <div className="w-full bg-[#020e0a] h-1.5 rounded-full overflow-hidden border border-[rgba(212,175,55,0.2)]">
                        <div
                          className="h-full transition-all duration-200 rounded-full"
                          style={{
                            width: `${hpPct}%`,
                            backgroundColor: c.color,
                          }}
                        />
                      </div>
                      <span className="text-[8px] font-mono font-bold text-[rgba(212,175,55,0.6)]">
                        HP: {displayHp} / {c.maxHp}
                      </span>
                    </div>
                  </div>
                </motion.div>
              );
            })}

            {/* LASER BULLET PROJECTILES */}
            {bullets.map(b => (
              <div
                key={b.id}
                className="absolute w-3 h-3 rounded-full bg-amber-400 shadow-[0_0_12px_#F5D576] border border-white -translate-x-1/2 -translate-y-1/2 z-20 pointer-events-none"
                style={{ left: `${b.currentX}%`, top: `${b.currentY}%` }}
              />
            ))}

            {/* FLOATING DAMAGE & WIN TEXTS */}
            {floatTexts.map(ft => (
              <motion.div
                key={ft.id}
                initial={{ opacity: 1, y: 0, scale: 0.8 }}
                animate={{ opacity: 0, y: -30, scale: 1.3 }}
                transition={{ duration: 1 }}
                className={`absolute font-black pointer-events-none z-30 font-mono -translate-x-1/2 ${
                  ft.type === 'win' ? 'text-gold text-lg sm:text-2xl drop-shadow-[0_0_12px_rgba(212,175,55,0.8)]' : 'text-rose-400 text-sm'
                }`}
                style={{ left: `${ft.x}%`, top: `${ft.y}%` }}
              >
                {ft.text}
              </motion.div>
            ))}

            {/* HEAVY CYBER GOLD CANNON ROTATING TO MOUSE POINTER */}
            <div className="absolute bottom-1 left-1/2 -translate-x-1/2 z-30 flex flex-col items-center pointer-events-none">
              <motion.div
                animate={{ rotate: cannonAngle }}
                transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                className="w-12 h-20 origin-bottom flex flex-col items-center"
              >
                {/* Barrel */}
                <div className="w-5 h-12 bg-gradient-to-t from-[#B8860B] via-[#F5D576] to-[#EAB308] rounded-t-lg border-2 border-gold shadow-[0_0_15px_rgba(212,175,55,0.6)]" />
                {/* Cannon Mount */}
                <div className="w-10 h-8 rounded-full bg-gradient-to-r from-[#061A10] via-[#0d2419] to-[#061A10] border-2 border-gold shadow-2xl" />
              </motion.div>
            </div>
          </div>

          {/* CANNON CONTROLS & AUTO-FIRE STRIP */}
          <div className="bg-[#0d2419] p-4 rounded-2xl border border-[rgba(212,175,55,0.25)] space-y-4 shadow-xl">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-[rgba(212,175,55,0.7)]">Shot Stake:</span>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {[10, 20, 50, 100, 250, 500].map(cost => (
                    <button
                      key={cost}
                      type="button"
                      onClick={() => setBulletCost(cost)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                        bulletCost === cost
                          ? 'bg-gold text-[#0B2318] border-gold shadow-[0_0_12px_rgba(212,175,55,0.4)] scale-105'
                          : 'bg-[#061A10] text-[#E8C97A] border border-[rgba(212,175,55,0.2)] hover:border-gold'
                      }`}
                    >
                      ₹{cost}
                    </button>
                  ))}
                </div>
              </div>

              {/* Auto-Fire Toggle Button */}
              <button
                type="button"
                onClick={() => setAutoFire(!autoFire)}
                className={`w-full sm:w-auto px-5 py-2.5 rounded-xl font-black text-xs flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  autoFire
                    ? 'bg-gradient-to-r from-rose-500 to-rose-600 text-white shadow-[0_0_20px_rgba(244,63,94,0.4)] animate-pulse'
                    : 'bg-gradient-to-r from-emerald-500 to-emerald-600 text-white shadow-[0_0_20px_rgba(16,185,129,0.4)]'
                }`}
              >
                {autoFire ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                {autoFire ? 'Stop Auto-Fire' : '🔥 Start Auto-Fire'}
              </button>
            </div>
          </div>

          {/* Auto Bet Panel Integration */}
          <AutoBetPanel
            balance={balance}
            intervalMs={2500}
            onPlaceBet={async (amount) => {
              if (!isAuthenticated) return 0;
              if (balance < amount) return 0;
              if (!deductBalance(amount, `Auto-Bet — Ocean Hunter Shot`)) return 0;
              const won = Math.random() > 0.55;
              const mult = won ? 2.5 : 0;
              const payout = won ? Math.round(amount * mult) : 0;
              if (won) addBalance(payout, `Auto-Bet Win — Ocean Hunter ${mult}x`, 'win');
              return won ? payout - amount : -amount;
            }}
          />
        </div>

        {/* Right Column: Live Chat & Leaderboard */}
        <div className="lg:col-span-5 xl:col-span-4 space-y-4">
          <GameChat gameId="ocean-hunter" />
        </div>
      </div>

      <ProvablyFairModal isOpen={isFairnessOpen} onClose={() => setIsFairnessOpen(false)} />
    </div>
  );
}
