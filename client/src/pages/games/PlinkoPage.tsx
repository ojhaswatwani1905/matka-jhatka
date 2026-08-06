import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield } from 'lucide-react';
import confetti from 'canvas-confetti';
import { useWallet } from '../../store/WalletContext';
import { useToast } from '../../components/ui/Toast';
import { useAuthGate } from '../../hooks/useAuthGate';
import { generateId } from '../../lib/utils';
import { sounds } from '../../lib/sound';
import { AutoBetPanel } from '../../components/ui/AutoBetPanel';
import { GameChat } from '../../components/ui/GameChat';

/* ─── Risk Tables ───────────────────────────────────────────────── */
const ROWS = 8;
const MULTIPLIERS = {
  low:    [5.6, 2.1, 1.1, 1.0, 0.5, 1.0, 1.1, 2.1, 5.6],
  medium: [13,  3.0, 1.3, 0.7, 0.4, 0.7, 1.3, 3.0, 13],
  high:   [29,  4.0, 1.5, 0.3, 0.2, 0.3, 1.5, 4.0, 29],
};

const BET_AMOUNTS = [10, 50, 100, 500, 1000];

/* ─── Provably Fair ─────────────────────────────────────────────── */
async function generatePlinkoSeed(): Promise<{ seed: string; hash: string }> {
  const seed = Array.from(crypto.getRandomValues(new Uint8Array(16)))
    .map(b => b.toString(16).padStart(2, '0')).join('');
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(seed));
  const hash = Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
  return { seed, hash };
}

function seedToPath(seed: string, rows: number): ('L' | 'R')[] {
  const path: ('L' | 'R')[] = [];
  for (let i = 0; i < rows; i++) {
    const byte = parseInt(seed.slice((i * 2) % seed.length, (i * 2) % seed.length + 2), 16);
    path.push(byte % 2 === 0 ? 'L' : 'R');
  }
  return path;
}

function pathToSlot(path: ('L' | 'R')[]): number {
  return path.filter(dir => dir === 'R').length;
}

/* ─── SVG Peg Board ─────────────────────────────────────────────── */
function PegBoard({ path, isDropping, landedSlot }: { path: ('L' | 'R')[]; isDropping: boolean; landedSlot: number | null }) {
  const W = 360, H = 220;
  const topY = 20, rowH = (H - 40) / (ROWS + 1);

  // Compute ball coordinates at each step
  const ballPositions: { x: number; y: number }[] = [];
  let col = 0;
  ballPositions.push({ x: W / 2, y: topY });
  path.forEach((dir, i) => {
    if (dir === 'R') col++;
    const r = i + 1;
    const count = r + 1;
    const startX = W / 2 - (count - 1) * 16;
    ballPositions.push({ x: startX + col * 32, y: topY + r * rowH });
  });

  const lastPos = ballPositions[ballPositions.length - 1] ?? { x: W / 2, y: topY };

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto max-h-[220px]">
      {/* Pegs */}
      {Array.from({ length: ROWS + 1 }, (_, r) => {
        const count = r + 1;
        const startX = W / 2 - (count - 1) * 16;
        const y = topY + r * rowH;
        return Array.from({ length: count }, (_, c) => (
          <circle
            key={`${r}-${c}`}
            cx={startX + c * 32}
            cy={y}
            r={r === 0 ? 4 : 3}
            fill={r === 0 ? '#D4AF37' : 'rgba(212,175,55,0.4)'}
          />
        ));
      })}

      {/* Ball path trail */}
      {isDropping && ballPositions.length > 1 && (
        <polyline
          points={ballPositions.map(p => `${p.x},${p.y}`).join(' ')}
          fill="none"
          stroke="rgba(212,175,55,0.3)"
          strokeWidth="2"
          strokeDasharray="4 2"
        />
      )}

      {/* Falling Ball */}
      {isDropping && (
        <motion.circle
          cx={lastPos.x}
          cy={lastPos.y}
          r={7}
          fill="#FFE57F"
          stroke="#D4AF37"
          strokeWidth="2"
          style={{ filter: 'drop-shadow(0 0 8px rgba(212,175,55,0.9))' }}
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ repeat: Infinity, duration: 0.2 }}
        />
      )}

      {/* Landed flash */}
      {landedSlot !== null && !isDropping && (
        <circle
          cx={lastPos.x}
          cy={lastPos.y}
          r={8}
          fill="#2ECC71"
          style={{ filter: 'drop-shadow(0 0 10px rgba(46,204,113,0.9))' }}
        />
      )}
    </svg>
  );
}

/* ─── Main Page ─────────────────────────────────────────────────── */
export default function PlinkoPage() {
  const { balance, deductBalance, addBalance } = useWallet();
  const { addToast } = useToast();
  const { requireAuth } = useAuthGate();

  const [risk, setRisk] = useState<'low' | 'medium' | 'high'>('medium');
  const [betAmount, setBetAmount] = useState(100);
  const [gameState, setGameState] = useState<'idle' | 'dropping' | 'result'>('idle');
  const [path, setPath] = useState<('L' | 'R')[]>([]);
  const [animPath, setAnimPath] = useState<('L' | 'R')[]>([]);
  const [landedSlot, setLandedSlot] = useState<number | null>(null);
  const [lastResult, setLastResult] = useState<{ multiplier: number; win: number; slot: number } | null>(null);
  const [commitHash, setCommitHash] = useState('');
  const [history, setHistory] = useState<{ slot: number; multiplier: number; win: number }[]>([]);
  const animIntervalRef = useRef<ReturnType<typeof setInterval>>();

  const multipliers = MULTIPLIERS[risk];

  const drop = () => {
    requireAuth(async () => {
      if (gameState === 'dropping') return;
      if (!deductBalance(betAmount, `Plinko bet — ${risk} risk`)) {
        addToast({ type: 'error', title: 'Insufficient balance' });
        return;
      }
      sounds.playChip();

      const { seed, hash } = await generatePlinkoSeed();
      setCommitHash(hash);
      const fullPath = seedToPath(seed, ROWS);
      setPath(fullPath);
      const slot = pathToSlot(fullPath);
      setLandedSlot(null);
      setAnimPath([]);
      setGameState('dropping');

      // Animate ball step by step
      let step = 0;
      animIntervalRef.current = setInterval(() => {
        step++;
        setAnimPath(fullPath.slice(0, step));
        if (step >= ROWS) {
          clearInterval(animIntervalRef.current);
          setLandedSlot(slot);
          const mult = multipliers[slot] ?? 0;
          const win = Math.floor(betAmount * mult * 100) / 100;
          if (win > 0) {
            addBalance(win, `Plinko win — ${mult}× (${risk} risk)`);
          }
          if (mult >= 1) {
            sounds.playWin();
            addToast({ type: 'success', title: `Landed ${mult}×!`, message: `Won ₹${win.toFixed(2)}` });
            if (mult >= 5) confetti({ particleCount: 80, spread: 60, origin: { y: 0.5 } });
          } else {
            addToast({ type: 'info', title: `Landed ${mult}×`, message: `Return ₹${win.toFixed(2)}` });
          }
          setLastResult({ multiplier: mult, win, slot });
          setHistory(prev => [{ slot, multiplier: mult, win }, ...prev].slice(0, 15));
          setGameState('result');
        }
      }, 150);
    });
  };

  return (
    <div className="py-4 space-y-5 w-full max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-xl bg-[rgba(212,175,55,0.1)] border border-[rgba(212,175,55,0.3)] flex items-center justify-center text-xl">🪙</div>
          <div>
            <h1 className="text-lg font-black text-[#E8C97A] font-heading">Plinko Gold</h1>
            <p className="text-[10px] text-[rgba(212,175,55,0.5)]">Physics Drop · Provably Fair</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[rgba(212,175,55,0.08)] border border-[rgba(212,175,55,0.2)]">
          <Shield className="w-3.5 h-3.5 text-gold" />
          <span className="text-[10px] font-bold text-gold">Provably Fair</span>
        </div>
      </div>

      {/* 2-Column Desktop Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Board & Bet Controls */}
        <div className="lg:col-span-7 xl:col-span-8 space-y-4">
          {commitHash && (
            <div className="bg-[rgba(212,175,55,0.04)] border border-[rgba(212,175,55,0.12)] rounded-xl p-2 text-[10px] text-[rgba(212,175,55,0.45)] font-mono truncate">
              Seed hash: {commitHash}
            </div>
          )}

          {/* Peg Board Frame */}
          <div className="royal-panel rounded-2xl p-4 overflow-hidden">
            <PegBoard path={animPath} isDropping={gameState === 'dropping'} landedSlot={landedSlot} />

            {/* Slot multiplier labels */}
            <div className="flex gap-0.5 mt-2 overflow-hidden">
              {multipliers.map((m, i) => (
                <motion.div key={i}
                  animate={landedSlot === i ? { scale: [1, 1.3, 1], opacity: 1 } : { scale: 1, opacity: 0.7 }}
                  className="flex-1 text-center text-[8px] font-black py-0.5 rounded"
                  style={{ color: m >= 10 ? '#2ECC71' : m >= 2 ? '#D4AF37' : m >= 1 ? 'rgba(212,175,55,0.6)' : '#FF4D6D', background: landedSlot === i ? 'rgba(212,175,55,0.2)' : 'transparent' }}>
                  {m}×
                </motion.div>
              ))}
            </div>
          </div>

          {/* Last result readout */}
          <AnimatePresence>
            {lastResult && (
              <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className="royal-panel rounded-xl p-3 text-center">
                <p className="text-xs text-[rgba(212,175,55,0.6)]">Landed Multiplier</p>
                <p className={`text-2xl font-black font-heading ${lastResult.multiplier >= 2 ? 'text-gold' : lastResult.multiplier >= 1 ? 'text-emerald-400' : 'text-[#FF4D6D]'}`}>
                  {lastResult.multiplier}× <span className="text-xs font-normal text-[rgba(212,175,55,0.6)]">(Payout: ₹{lastResult.win})</span>
                </p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Controls */}
          <div className="royal-panel rounded-2xl p-4 space-y-3">
            {/* Risk Selection */}
            <div>
              <label className="text-[10px] text-[rgba(212,175,55,0.5)] font-bold mb-1.5 block">Risk Level</label>
              <div className="flex gap-2">
                {(['low', 'medium', 'high'] as const).map(r => (
                  <button key={r} onClick={() => setRisk(r)} disabled={gameState === 'dropping'}
                    className={`flex-1 py-2 rounded-xl text-xs font-bold capitalize cursor-pointer transition-all ${risk === r ? 'bg-[rgba(212,175,55,0.2)] text-gold border border-[rgba(212,175,55,0.4)]' : 'bg-[#0d2419] text-[rgba(212,175,55,0.4)] hover:text-gold'}`}>
                    {r}
                  </button>
                ))}
              </div>
            </div>

            {/* Quick Bet Amounts */}
            <div className="flex gap-2 flex-wrap">
              {BET_AMOUNTS.map(amt => (
                <button key={amt} onClick={() => setBetAmount(amt)} disabled={gameState === 'dropping'}
                  className={`flex-1 min-w-[50px] py-2 rounded-xl text-xs font-bold cursor-pointer transition-all ${betAmount === amt ? 'btn-royal-gold' : 'bg-[#0d2419] border border-[rgba(212,175,55,0.15)] text-[rgba(212,175,55,0.6)] hover:text-gold'}`}>
                  ₹{amt}
                </button>
              ))}
            </div>

            {/* Drop Button */}
            <button
              onClick={drop}
              disabled={gameState === 'dropping'}
              className="btn-royal-gold w-full py-3.5 rounded-xl font-black text-sm cursor-pointer disabled:opacity-50"
            >
              {gameState === 'dropping' ? 'Ball Dropping...' : `Drop Ball (₹${betAmount})`}
            </button>
          </div>

          {/* Auto-Bet */}
          <AutoBetPanel
            balance={balance}
            disabled={gameState === 'dropping'}
            intervalMs={3500}
            onPlaceBet={async (amount) => {
              if (!requireAuth()) return 0;
              if (balance < amount) return 0;
              deductBalance(amount, `Auto-Bet — Plinko`, 'bet');
              const MULTS = [0.5, 0.5, 1, 1, 2, 2, 5, 16];
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
    </div>
  );
}
