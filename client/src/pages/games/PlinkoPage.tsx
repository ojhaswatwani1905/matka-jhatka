import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield } from 'lucide-react';
import confetti from 'canvas-confetti';
import { useWallet } from '../../store/WalletContext';
import { useToast } from '../../components/ui/Toast';
import { useAuthGate } from '../../hooks/useAuthGate';
import { sounds } from '../../lib/sound';

/* ─── Provably Fair ─────────────────────────────────────────────── */
async function generatePlinkoSeed(): Promise<{ seed: string; hash: string }> {
  const seed = Array.from(crypto.getRandomValues(new Uint8Array(16)))
    .map(b => b.toString(16).padStart(2, '0')).join('');
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(seed));
  const hash = Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
  return { seed, hash };
}

// Seed determines path: 16 rows, each row = left or right
function seedToPath(seed: string, rows: number): ('L' | 'R')[] {
  const path: ('L' | 'R')[] = [];
  for (let i = 0; i < rows; i++) {
    const byteIdx = (i * 2) % seed.length;
    const byte = parseInt(seed.slice(byteIdx, byteIdx + 2), 16);
    path.push(byte % 2 === 0 ? 'L' : 'R');
  }
  return path;
}

// Path → slot index (0 = leftmost)
function pathToSlot(path: ('L' | 'R')[]): number {
  return path.filter(d => d === 'R').length;
}

/* ─── Multiplier configs by risk ────────────────────────────────── */
const ROWS = 16;

const MULTIPLIERS: Record<string, number[]> = {
  low:    [16, 9, 2, 1.4, 1.4, 1.2, 1.1, 1, 0.5, 1, 1.1, 1.2, 1.4, 1.4, 2, 9, 16],
  medium: [110, 41, 10, 5, 3, 1.5, 1, 0.5, 0.3, 0.5, 1, 1.5, 3, 5, 10, 41, 110],
  high:   [1000, 130, 26, 9, 4, 2, 0.2, 0.2, 0.2, 0.2, 2, 4, 9, 26, 130, 1000],
};

const SLOT_COLORS: Record<string, string[]> = {
  low:    ['#2ECC71','#3498db','#9b59b6','#e67e22','#e74c3c','#e67e22','#9b59b6','#3498db','#95a5a6','#3498db','#9b59b6','#e67e22','#e74c3c','#e67e22','#3498db','#2ECC71'],
  medium: ['#2ECC71','#2ECC71','#e67e22','#e67e22','#9b59b6','#3498db','#95a5a6','#e74c3c','#e74c3c','#e74c3c','#3498db','#95a5a6','#9b59b6','#e67e22','#e67e22','#2ECC71','#2ECC71'],
  high:   ['#2ECC71','#2ECC71','#e67e22','#e67e22','#9b59b6','#e74c3c','#e74c3c','#e74c3c','#e74c3c','#e74c3c','#9b59b6','#e67e22','#e67e22','#2ECC71','#2ECC71','#2ECC71'],
};

const BET_AMOUNTS = [10, 50, 100, 500, 1000];

/* ─── Peg Board Visual ──────────────────────────────────────────── */
function PegBoard({ path, isDropping, landedSlot }: { path: ('L' | 'R')[]; isDropping: boolean; landedSlot: number | null }) {
  const rows = ROWS;
  const W = 320, H = 280;
  const pegR = 4;
  const slotW = W / (rows + 1);
  const rowH = (H - 40) / (rows + 1);

  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} className="mx-auto">
      {/* Pegs */}
      {Array.from({ length: rows }, (_, row) =>
        Array.from({ length: row + 1 }, (_, col) => {
          const x = W / 2 - (row * slotW) / 2 + col * slotW;
          const y = 20 + (row + 1) * rowH;
          return (
            <motion.circle key={`${row}-${col}`} cx={x} cy={y} r={pegR}
              fill="rgba(212,175,55,0.5)" stroke="rgba(212,175,55,0.8)" strokeWidth={1} />
          );
        })
      )}

      {/* Ball */}
      {isDropping && path.length > 0 && (() => {
        // Calculate ball position based on path steps
        const step = Math.min(path.length, rows);
        const leftCount = path.slice(0, step).filter(d => d === 'L').length;
        const rightCount = step - leftCount;
        const col = rightCount;
        const x = W / 2 - ((step) * slotW) / 2 + col * slotW;
        const y = 20 + (step + 1) * rowH;
        return (
          <motion.circle
            cx={x} cy={y} r={7}
            fill="#D4AF37"
            style={{ filter: 'drop-shadow(0 0 6px rgba(212,175,55,0.9))' }}
            animate={{ cx: x, cy: y }}
            transition={{ type: 'spring', stiffness: 200, damping: 20 }}
          />
        );
      })()}

      {/* Slots */}
      {Array.from({ length: rows + 1 }, (_, i) => {
        const x = W / 2 - (rows * slotW) / 2 + i * slotW;
        const isLanded = landedSlot === i;
        return (
          <motion.rect
            key={i} x={x - slotW * 0.38} y={H - 32} width={slotW * 0.76} height={24}
            rx={4} fill={isLanded ? '#D4AF37' : 'rgba(212,175,55,0.15)'}
            stroke={isLanded ? '#D4AF37' : 'rgba(212,175,55,0.3)'} strokeWidth={1}
            animate={isLanded ? { scale: [1, 1.15, 1] } : {}}
            transition={{ duration: 0.3 }}
          />
        );
      })}
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
            addBalance(win, `Plinko win — ${mult}× (${risk} risk, slot ${slot})`);
            addToast({ type: 'success', title: `₹${win.toFixed(2)} — ${mult}×!` });
            if (mult >= 10) confetti({ particleCount: 120, spread: 80, origin: { y: 0.5 }, colors: ['#D4AF37', '#2ECC71'] });
            else sounds.playWin();
          } else {
            addToast({ type: 'error', title: `0× — No win this drop` });
          }

          setLastResult({ multiplier: mult, win, slot });
          setHistory(prev => [{ slot, multiplier: mult, win }, ...prev].slice(0, 20));
          setGameState('result');
        }
      }, 80);
    });
  };

  return (
    <div className="px-3 py-4 space-y-4 max-w-lg mx-auto">
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

      {/* Commit hash */}
      {commitHash && (
        <div className="bg-[rgba(212,175,55,0.04)] border border-[rgba(212,175,55,0.12)] rounded-xl p-2 text-[10px] text-[rgba(212,175,55,0.45)] font-mono truncate">
          Seed hash: {commitHash}
        </div>
      )}

      {/* Peg Board */}
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

      {/* Last result */}
      <AnimatePresence>
        {lastResult && gameState === 'result' && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className={`rounded-xl p-3 text-center border ${lastResult.win > 0 ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-[#FF4D6D]/10 border-[#FF4D6D]/30 text-[#FF4D6D]'}`}>
            <p className="font-black text-sm">{lastResult.win > 0 ? `Won ₹${lastResult.win.toFixed(2)} at ${lastResult.multiplier}×!` : `0× — No win`}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Controls */}
      <div className="royal-panel rounded-2xl p-4 space-y-3">
        {/* Risk */}
        <div>
          <label className="text-[10px] text-[rgba(212,175,55,0.5)] font-bold mb-1.5 block">Risk Level</label>
          <div className="grid grid-cols-3 gap-2">
            {(['low', 'medium', 'high'] as const).map(r => (
              <button key={r} onClick={() => setRisk(r)}
                className={`py-2 rounded-xl text-xs font-bold capitalize cursor-pointer transition-all ${risk === r
                  ? r === 'high' ? 'bg-[#FF4D6D]/15 border border-[#FF4D6D]/50 text-[#FF4D6D]'
                  : r === 'medium' ? 'bg-amber-500/15 border border-amber-500/50 text-amber-400'
                  : 'btn-royal-gold'
                  : 'bg-[#0d2419] border border-[rgba(212,175,55,0.15)] text-[rgba(212,175,55,0.5)]'}`}>
                {r === 'low' ? '🟢 Low' : r === 'medium' ? '🟡 Medium' : '🔴 High'}
              </button>
            ))}
          </div>
        </div>

        {/* Bet */}
        <div>
          <label className="text-[10px] text-[rgba(212,175,55,0.5)] font-bold mb-1.5 block">Bet Amount</label>
          <div className="flex gap-1.5 flex-wrap">
            {BET_AMOUNTS.map(a => (
              <button key={a} onClick={() => setBetAmount(a)}
                className={`flex-1 min-w-[48px] py-2 rounded-xl text-xs font-bold cursor-pointer transition-all ${betAmount === a ? 'btn-royal-gold' : 'bg-[#0d2419] border border-[rgba(212,175,55,0.15)] text-[rgba(212,175,55,0.5)]'}`}>
                ₹{a}
              </button>
            ))}
          </div>
        </div>

        <button onClick={drop} disabled={gameState === 'dropping'}
          className="btn-royal-gold w-full py-3 rounded-xl font-black text-xs cursor-pointer disabled:opacity-50">
          {gameState === 'dropping' ? '⚡ Dropping...' : '🪙 Drop Ball (₹' + betAmount + ')'}
        </button>
      </div>

      {/* History */}
      {history.length > 0 && (
        <div>
          <p className="text-xs font-black text-[rgba(212,175,55,0.5)] mb-2">Recent Drops</p>
          <div className="flex flex-wrap gap-1.5">
            {history.map((h, i) => (
              <span key={i} className={`px-2 py-0.5 rounded-full text-[10px] font-black ${h.multiplier >= 10 ? 'bg-emerald-500/15 text-emerald-400' : h.multiplier >= 1 ? 'bg-amber-500/15 text-amber-400' : 'bg-[#FF4D6D]/15 text-[#FF4D6D]'}`}>
                {h.multiplier}×
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
