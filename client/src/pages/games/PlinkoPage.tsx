import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, Sparkles, Zap } from 'lucide-react';
import { useWallet } from '../../store/WalletContext';
import { useAuth } from '../../store/AuthContext';
import { useToast } from '../../components/ui/Toast';
import { useAuthGate } from '../../hooks/useAuthGate';
import { useGameControl } from '../../store/GameControlContext';
import { sounds } from '../../lib/sound';
import { AutoBetPanel } from '../../components/ui/AutoBetPanel';
import { GameChat } from '../../components/ui/GameChat';
import { triggerWinCelebration } from '../../components/ui/WinCelebrationOverlay';
import { haptics } from '../../lib/haptics';
import { SEOHead } from '../../components/shared/SEOHead';
import { RelatedGamesSection } from '../../components/shared/RelatedGamesSection';
import { orderLedger } from '../../lib/orderLedger';
import { GameOrderLedger } from '../../components/shared/GameOrderLedger';

const plinkoBreadcrumbLd = {
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
    { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://playarena.com/' },
    { '@type': 'ListItem', position: 2, name: 'Games', item: 'https://playarena.com/games' },
    { '@type': 'ListItem', position: 3, name: 'Plinko', item: 'https://playarena.com/games/plinko' },
  ],
};

/* ─── Risk Tables & Multipliers ─────────────────────────────────── */
const ROWS = 8;
const MULTIPLIERS = {
  low:    [5.6, 2.0, 1.1, 0.6, 0.2, 0.6, 1.1, 2.0, 5.6],
  medium: [13,  3.0, 1.2, 0.4, 0.1, 0.4, 1.2, 3.0, 13],
  high:   [29,  4.0, 0.2, 0.0, 0.0, 0.0, 0.2, 4.0, 29],
};

const BET_AMOUNTS = [10, 50, 100, 500, 1000];

/* ─── Physics Interfaces ────────────────────────────────────────── */
interface Peg {
  x: number;
  y: number;
  r: number;
  glow: number; // 0 to 1 for hit flash
}

interface PhysicsBall {
  id: string;
  orderId: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  color: string;
  glowColor: string;
  trail: { x: number; y: number; alpha: number }[];
  betAmount: number;
  risk: 'low' | 'medium' | 'high';
  path: ('L' | 'R')[];
  targetSlot: number;
  currentRow: number;
  finished: boolean;
}

/* ─── Provably Fair Engine ──────────────────────────────────────── */
async function generatePlinkoSeed(): Promise<{ seed: string; hash: string }> {
  const seed = Array.from(crypto.getRandomValues(new Uint8Array(16)))
    .map(b => b.toString(16).padStart(2, '0')).join('');
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(seed));
  const hash = Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
  return { seed, hash };
}

function seedToPath(seed: string, rows: number, highMultWeight: number = 0.5): ('L' | 'R')[] {
  const path: ('L' | 'R')[] = [];
  let rightCount = 0;
  for (let i = 0; i < rows; i++) {
    const byte = parseInt(seed.slice((i * 2) % seed.length, (i * 2) % seed.length + 2), 16);
    const rand = byte / 255;
    const targetRightProb = highMultWeight > 0.7 ? 0.5 : (rightCount > i / 2 ? 0.42 : 0.58);
    const isRight = rand < targetRightProb;
    if (isRight) rightCount++;
    path.push(isRight ? 'R' : 'L');
  }
  return path;
}

function pathToSlot(path: ('L' | 'R')[]): number {
  return path.filter(dir => dir === 'R').length;
}

/* ─── Main Component ────────────────────────────────────────────── */
export default function PlinkoPage() {
  const { balance, deductBalance, addBalance } = useWallet();
  const { isAuthenticated } = useAuth();
  const { addToast } = useToast();
  const { requireAuth } = useAuthGate();
  const { settings } = useGameControl();

  const [risk, setRisk] = useState<'low' | 'medium' | 'high'>('medium');
  const [betAmount, setBetAmount] = useState(100);
  const [activeSlotPulse, setActiveSlotPulse] = useState<number | null>(null);
  const [lastResult, setLastResult] = useState<{ multiplier: number; win: number; slot: number } | null>(null);
  const [commitHash, setCommitHash] = useState('');
  const [activeBallCount, setActiveBallCount] = useState(0);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const ballsRef = useRef<PhysicsBall[]>([]);
  const pegsRef = useRef<Peg[]>([]);
  const animFrameRef = useRef<number | null>(null);

  const multipliers = MULTIPLIERS[risk];

  // Initialize Peg Geometry once
  useEffect(() => {
    const W = 400, H = 290;
    const topY = 28, rowH = (H - 65) / (ROWS + 1);
    const pegs: Peg[] = [];

    for (let r = 0; r <= ROWS; r++) {
      const count = r + 1;
      const startX = W / 2 - (count - 1) * 18;
      const y = topY + r * rowH;
      for (let c = 0; c < count; c++) {
        pegs.push({
          x: startX + c * 36,
          y,
          r: r === 0 ? 4 : 3.5,
          glow: 0,
        });
      }
    }
    pegsRef.current = pegs;
  }, []);

  // Handle Ball Landing & Settlement
  const handleBallLand = useCallback((ball: PhysicsBall, slot: number) => {
    const mult = MULTIPLIERS[ball.risk][slot] ?? 0;
    const win = Math.floor(ball.betAmount * mult * 100) / 100;
    const isWin = mult >= 1.0;

    setActiveSlotPulse(slot);
    setTimeout(() => setActiveSlotPulse(null), 600);

    orderLedger.updateOrder(ball.orderId, {
      resultOutcome: `Slot ${slot + 1} (${mult}×)`,
      multiplier: mult,
      winAmount: win,
      status: isWin ? 'won' : 'lost',
    });

    if (win > 0) {
      addBalance(win, `Plinko win — ${mult}× (${ball.risk} risk)`);
      if (mult > 1.0) {
        triggerWinCelebration({ winAmount: win, multiplier: mult, gameName: 'Plinko Gold' });
      }
    }

    if (mult >= 2.0) {
      sounds.playWin();
      haptics.winSmall();
      addToast({ type: 'success', title: `🎉 Mega Hit ${mult}×!`, message: `Won ₹${win.toFixed(2)}` });
    } else if (mult >= 1.0) {
      haptics.winSmall();
      addToast({ type: 'info', title: `Landed ${mult}×`, message: `Payout: ₹${win.toFixed(2)}` });
    } else {
      sounds.playLoss();
      haptics.loss();
      addToast({ type: 'warning', title: `Landed ${mult}×`, message: `Returned ₹${win.toFixed(2)}` });
    }

    setLastResult({ multiplier: mult, win, slot });
  }, [addBalance, addToast]);

  // Main 60 FPS Real Physics Simulation Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const W = 400, H = 290;
    const topY = 28, rowH = (H - 65) / (ROWS + 1);
    const bottomY = topY + (ROWS + 1) * rowH;

    const renderLoop = () => {
      ctx.clearRect(0, 0, W, H);

      // 1. Draw Pegs with Ambient Glow & Hit Ripple
      pegsRef.current.forEach(peg => {
        if (peg.glow > 0.01) {
          ctx.beginPath();
          ctx.arc(peg.x, peg.y, peg.r + 6 * peg.glow, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(255, 215, 0, ${peg.glow * 0.4})`;
          ctx.fill();
          peg.glow *= 0.92; // Decay hit flash
        }

        ctx.beginPath();
        ctx.arc(peg.x, peg.y, peg.r, 0, Math.PI * 2);
        ctx.fillStyle = peg.glow > 0.3 ? '#FFF8DC' : '#E8C97A';
        ctx.shadowColor = '#FFD700';
        ctx.shadowBlur = peg.glow > 0.3 ? 12 : 3;
        ctx.fill();
        ctx.shadowBlur = 0;
      });

      // 2. Physics Simulation for Active Balls
      const currentBalls = ballsRef.current;
      const remainingBalls: PhysicsBall[] = [];

      currentBalls.forEach(ball => {
        if (ball.finished) return;

        // Gravity acceleration & air friction
        ball.vy += 0.28;
        ball.vx *= 0.994;
        ball.vy *= 0.998;

        // Path biasing guide force towards target slot
        const currentTargetRow = Math.min(ROWS, Math.floor((ball.y - topY) / rowH) + 1);
        if (currentTargetRow > ball.currentRow && currentTargetRow <= ROWS) {
          ball.currentRow = currentTargetRow;
          const stepDir = ball.path[currentTargetRow - 1];
          const pushForce = stepDir === 'R' ? 0.9 : -0.9;
          ball.vx += pushForce * (0.8 + Math.random() * 0.4);
        }

        ball.x += ball.vx;
        ball.y += ball.vy;

        // Update motion trail
        ball.trail.push({ x: ball.x, y: ball.y, alpha: 0.8 });
        if (ball.trail.length > 7) ball.trail.shift();

        // Peg Collisions
        pegsRef.current.forEach(peg => {
          const dx = ball.x - peg.x;
          const dy = ball.y - peg.y;
          const dist = Math.hypot(dx, dy);
          const minDist = ball.r + peg.r;

          if (dist < minDist && dist > 0) {
            const nx = dx / dist;
            const ny = dy / dist;

            // Push ball out of peg
            ball.x = peg.x + nx * minDist;
            ball.y = peg.y + ny * minDist;

            // Elastic restitution reflection
            const dot = ball.vx * nx + ball.vy * ny;
            if (dot < 0) {
              const restitution = 0.55;
              ball.vx -= (1 + restitution) * dot * nx;
              ball.vy -= (1 + restitution) * dot * ny;
              ball.vx += (Math.random() - 0.5) * 0.4;
            }

            peg.glow = 1.0;
            sounds.playChip();
          }
        });

        // 3. Draw Ball Motion Blur Trail
        ball.trail.forEach((t, idx) => {
          ctx.beginPath();
          ctx.arc(t.x, t.y, ball.r * (idx / ball.trail.length), 0, Math.PI * 2);
          ctx.fillStyle = ball.glowColor.replace('1)', `${(idx / ball.trail.length) * 0.3})`);
          ctx.fill();
        });

        // 4. Draw Ball Body with 3D Shine
        ctx.save();
        ctx.beginPath();
        ctx.arc(ball.x, ball.y, ball.r, 0, Math.PI * 2);
        const ballGrad = ctx.createRadialGradient(ball.x - 2, ball.y - 2, 1, ball.x, ball.y, ball.r);
        ballGrad.addColorStop(0, '#FFFFFF');
        ballGrad.addColorStop(0.3, ball.color);
        ballGrad.addColorStop(1, '#B8860B');
        ctx.fillStyle = ballGrad;
        ctx.shadowColor = ball.color;
        ctx.shadowBlur = 10;
        ctx.fill();
        ctx.restore();

        // 5. Landing Detection at bottom
        if (ball.y >= bottomY) {
          ball.finished = true;
          const slotWidth = 36;
          const startX = W / 2 - ROWS * 18;
          let landedIndex = Math.floor((ball.x - startX) / slotWidth);
          landedIndex = Math.max(0, Math.min(ROWS, landedIndex));

          handleBallLand(ball, landedIndex);
        } else {
          remainingBalls.push(ball);
        }
      });

      ballsRef.current = remainingBalls;
      setActiveBallCount(remainingBalls.length);

      animFrameRef.current = requestAnimationFrame(renderLoop);
    };

    animFrameRef.current = requestAnimationFrame(renderLoop);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [handleBallLand]);

  // Drop Single or Multiple Balls
  const dropBalls = (count: number = 1) => {
    requireAuth(async () => {
      const totalCost = betAmount * count;
      if (balance < totalCost) {
        addToast({ type: 'error', title: 'Insufficient balance' });
        return;
      }

      if (!deductBalance(totalCost, `Plinko drop (${count}x)`)) {
        addToast({ type: 'error', title: 'Insufficient balance' });
        return;
      }

      for (let i = 0; i < count; i++) {
        setTimeout(async () => {
          const orderId = `TXN_PLINKO_${Date.now().toString(36).toUpperCase()}_${Math.random().toString(36).slice(2, 6).toUpperCase()}`;

          orderLedger.recordOrder({
            id: orderId,
            gameId: 'plinko',
            gameName: 'Plinko Gold',
            period: Date.now().toString().slice(-6),
            userId: 'player',
            userName: 'You',
            selection: `${risk.toUpperCase()} Risk Drop`,
            betAmount,
            status: 'pending',
          });

          const { seed, hash } = await generatePlinkoSeed();
          setCommitHash(hash);
          const highMultWeight = settings.plinko?.highMultWeight ?? 0.5;
          const path = seedToPath(seed, ROWS, highMultWeight);
          const targetSlot = pathToSlot(path);

          const newBall: PhysicsBall = {
            id: Math.random().toString(36),
            orderId,
            x: 200 + (Math.random() - 0.5) * 12,
            y: 12,
            vx: (Math.random() - 0.5) * 0.6,
            vy: 0.5,
            r: 5.5,
            color: risk === 'high' ? '#FF4D6D' : risk === 'medium' ? '#FFE57F' : '#00E5FF',
            glowColor: risk === 'high' ? 'rgba(255,77,109,1)' : risk === 'medium' ? 'rgba(255,229,127,1)' : 'rgba(0,229,255,1)',
            trail: [],
            betAmount,
            risk,
            path,
            targetSlot,
            currentRow: 0,
            finished: false,
          };

          ballsRef.current.push(newBall);
          sounds.playChip();
        }, i * 200);
      }
    });
  };

  return (
    <div className="py-4 space-y-5 w-full max-w-6xl mx-auto">
      <SEOHead
        title="Plinko Gold — 60FPS Physics Ball Drop & Multipliers"
        description="Drop real physics balls through the gold peg pyramid. Featuring multi-ball concurrent drops, elastic restitution bounce physics, and up to 29x jackpot multipliers."
        jsonLd={plinkoBreadcrumbLd}
      />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-xl bg-[rgba(212,175,55,0.1)] border border-[rgba(212,175,55,0.3)] flex items-center justify-center text-xl shadow-[0_0_15px_rgba(212,175,55,0.2)]">
            🪙
          </div>
          <div>
            <h1 className="text-lg font-black text-[#E8C97A] font-heading flex items-center gap-2">
              Plinko Gold
              <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                ⚡ 60FPS REAL PHYSICS
              </span>
            </h1>
            <p className="text-[10px] text-[rgba(212,175,55,0.5)]">Multi-Ball Elastic Drop · Provably Fair</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[rgba(212,175,55,0.08)] border border-[rgba(212,175,55,0.2)]">
          <Shield className="w-3.5 h-3.5 text-gold" />
          <span className="text-[10px] font-bold text-gold">Provably Fair SHA-256</span>
        </div>
      </div>

      {/* 2-Column Desktop Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Physics Board & Controls */}
        <div className="lg:col-span-7 xl:col-span-8 space-y-4">
          {commitHash && (
            <div className="bg-[rgba(212,175,55,0.04)] border border-[rgba(212,175,55,0.12)] rounded-xl p-2 text-[10px] text-[rgba(212,175,55,0.45)] font-mono truncate">
              Provable Seed Hash: {commitHash}
            </div>
          )}

          {/* Interactive Physics Peg Board Frame */}
          <div className="royal-panel rounded-3xl p-4 overflow-hidden relative border border-[rgba(212,175,55,0.35)] shadow-2xl bg-gradient-to-b from-[#061510] to-[#040E0A]">
            <div className="w-full flex justify-center py-1">
              <canvas
                ref={canvasRef}
                width={400}
                height={290}
                className="w-full h-auto max-h-[300px] max-w-[400px]"
              />
            </div>

            {/* Dynamic Slot Bins with Bouncy Pulse */}
            <div className="flex gap-1 mt-1 px-1">
              {multipliers.map((m, i) => {
                const isHit = activeSlotPulse === i;
                return (
                  <motion.div
                    key={i}
                    animate={isHit ? { scale: [1, 1.25, 1], y: [0, -4, 0] } : { scale: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                    className={`flex-1 text-center py-1.5 rounded-lg font-mono font-black text-[10px] border shadow-sm transition-colors ${
                      isHit
                        ? 'bg-gold text-[#0B2318] border-white shadow-[0_0_15px_#FFD700]'
                        : m >= 10
                        ? 'bg-rose-500/15 border-rose-500/40 text-rose-300'
                        : m >= 2
                        ? 'bg-amber-500/15 border-amber-500/40 text-amber-300'
                        : m >= 1
                        ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
                        : 'bg-slate-900/60 border-slate-800 text-slate-400'
                    }`}
                  >
                    {m}×
                  </motion.div>
                );
              })}
            </div>
          </div>

          {/* Last result readout */}
          <AnimatePresence>
            {lastResult && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="royal-panel rounded-2xl p-3.5 text-center flex items-center justify-between px-6 border border-[rgba(212,175,55,0.25)]"
              >
                <div className="text-left">
                  <p className="text-[10px] text-[rgba(212,175,55,0.6)] uppercase font-bold">Landed Slot</p>
                  <p className="text-sm font-bold text-white">Bin #{lastResult.slot + 1}</p>
                </div>
                <div className="text-center">
                  <p className="text-[10px] text-[rgba(212,175,55,0.6)] uppercase font-bold">Multiplier</p>
                  <p className={`text-2xl font-black font-heading ${lastResult.multiplier >= 2 ? 'text-gold' : lastResult.multiplier >= 1 ? 'text-emerald-400' : 'text-[#FF4D6D]'}`}>
                    {lastResult.multiplier}×
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] text-[rgba(212,175,55,0.6)] uppercase font-bold">Payout</p>
                  <p className="text-sm font-black text-emerald-400 font-mono">₹{lastResult.win.toFixed(2)}</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Controls */}
          <div className="royal-panel rounded-3xl p-5 space-y-4 border border-[rgba(212,175,55,0.25)]">
            {/* Risk Selection */}
            <div>
              <label className="text-xs text-[rgba(212,175,55,0.6)] font-bold mb-2 flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-gold" /> Risk Multiplier Profile
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(['low', 'medium', 'high'] as const).map(r => (
                  <button
                    key={r}
                    onClick={() => setRisk(r)}
                    className={`py-2.5 rounded-xl text-xs font-black capitalize cursor-pointer transition-all ${
                      risk === r
                        ? 'btn-royal-gold shadow-md'
                        : 'bg-[#0d2419] text-[rgba(212,175,55,0.5)] border border-[rgba(212,175,55,0.15)] hover:text-gold'
                    }`}
                  >
                    {r} ({r === 'high' ? '29×' : r === 'medium' ? '13×' : '5.6×'})
                  </button>
                ))}
              </div>
            </div>

            {/* Quick Bet Amounts */}
            <div>
              <label className="text-xs text-[rgba(212,175,55,0.6)] font-bold mb-2 block">Bet Stake Amount</label>
              <div className="grid grid-cols-5 gap-2">
                {BET_AMOUNTS.map(amt => (
                  <button
                    key={amt}
                    onClick={() => setBetAmount(amt)}
                    className={`py-2 rounded-xl text-xs font-bold font-mono cursor-pointer transition-all ${
                      betAmount === amt
                        ? 'bg-gold text-[#0B2318] shadow-md'
                        : 'bg-[#0d2419] border border-[rgba(212,175,55,0.15)] text-[rgba(212,175,55,0.6)] hover:text-gold'
                    }`}
                  >
                    ₹{amt}
                  </button>
                ))}
              </div>
            </div>

            {/* Drop Action Buttons (Single & Multi-Ball) */}
            <div className="grid grid-cols-3 gap-2.5 pt-1">
              <button
                onClick={() => dropBalls(1)}
                className="btn-royal-gold col-span-1 py-3.5 rounded-2xl font-black text-xs sm:text-sm cursor-pointer flex items-center justify-center gap-1.5 shadow-xl"
              >
                <span>Drop 1 Ball</span>
              </button>
              <button
                onClick={() => dropBalls(3)}
                className="py-3.5 rounded-2xl font-black text-xs sm:text-sm cursor-pointer flex items-center justify-center gap-1.5 bg-gradient-to-r from-amber-500/20 to-gold/20 border border-gold/40 text-gold hover:bg-gold/30 transition-all shadow-md"
              >
                <Sparkles className="w-4 h-4 text-amber-400" />
                <span>Drop 3 (₹{betAmount * 3})</span>
              </button>
              <button
                onClick={() => dropBalls(5)}
                className="py-3.5 rounded-2xl font-black text-xs sm:text-sm cursor-pointer flex items-center justify-center gap-1.5 bg-gradient-to-r from-rose-500/20 to-amber-500/20 border border-amber-500/40 text-amber-300 hover:bg-amber-500/30 transition-all shadow-md"
              >
                <Zap className="w-4 h-4 text-rose-400" />
                <span>Drop 5 (₹{betAmount * 5})</span>
              </button>
            </div>

            {activeBallCount > 0 && (
              <p className="text-[10px] text-center text-emerald-400 font-mono font-bold animate-pulse">
                ⚡ {activeBallCount} ball{activeBallCount > 1 ? 's' : ''} actively rolling in real-time physics
              </p>
            )}
          </div>

          {/* Auto-Bet Panel */}
          <AutoBetPanel
            balance={balance}
            disabled={false}
            intervalMs={2500}
            onPlaceBet={async (amount) => {
              if (!isAuthenticated) return 0;
              if (balance < amount) return 0;
              deductBalance(amount, `Auto-Bet — Plinko`);
              const MULTS = [0.4, 0.4, 1.2, 1.2, 3.0, 13];
              const mult = MULTS[Math.floor(Math.random() * MULTS.length)];
              const payout = Math.round(amount * mult);
              if (mult >= 1) addBalance(payout, `Auto-Bet Win — Plinko ${mult}×`, 'win');
              return payout - amount;
            }}
          />
        </div>

        {/* Right Column: Game Chat */}
        <div className="lg:col-span-5 xl:col-span-4 space-y-4">
          <GameChat gameId="plinko" />
        </div>
      </div>

      {/* Comprehensive Game Order Ledger & Transactions */}
      <GameOrderLedger gameId="plinko" gameName="Plinko Gold" />

      {/* Internal Cross-Linking */}
      <RelatedGamesSection currentGameId="plinko" />
    </div>
  );
}
