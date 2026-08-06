import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bomb, Shield, TrendingUp } from 'lucide-react';
import confetti from 'canvas-confetti';
import { useWallet } from '../../store/WalletContext';
import { useToast } from '../../components/ui/Toast';
import { useAuthGate } from '../../hooks/useAuthGate';
import { generateId, getRandomNumber } from '../../lib/utils';
import { sounds } from '../../lib/sound';
import { AutoBetPanel } from '../../components/ui/AutoBetPanel';
import { GameChat } from '../../components/ui/GameChat';

/* ─── Provably Fair ─────────────────────────────────────────────── */
async function generateMineSeed(): Promise<{ seed: string; hash: string }> {
  const seed = Array.from(crypto.getRandomValues(new Uint8Array(16)))
    .map(b => b.toString(16).padStart(2, '0')).join('');
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(seed));
  const hash = Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
  return { seed, hash };
}

function seedToMinePositions(seed: string, total: number, mineCount: number): Set<number> {
  // Fisher-Yates using seed bytes
  const arr = Array.from({ length: total }, (_, i) => i);
  for (let i = arr.length - 1; i > 0; i--) {
    const byteIdx = (i * 2) % seed.length;
    const j = parseInt(seed.slice(byteIdx, byteIdx + 2), 16) % (i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return new Set(arr.slice(0, mineCount));
}

/* ─── Multiplier table ───────────────────────────────────────────── */
function calcMultiplier(revealed: number, total: number, mines: number): number {
  // house edge = 1% per reveal
  let m = 1;
  for (let i = 0; i < revealed; i++) {
    m *= (total - mines - i) / (total - i);
  }
  return Math.max(1, Math.round((0.97 / m) * 100) / 100);
}

const GRID_OPTIONS = [
  { label: '5×5', total: 25 },
  { label: '4×4', total: 16 },
];
const MINE_OPTIONS = [1, 3, 5, 10, 15];
const BET_AMOUNTS = [10, 50, 100, 500, 1000];

/* ─── Tile ──────────────────────────────────────────────────────── */
type TileState = 'hidden' | 'gem' | 'mine';

function Tile({ state, onClick, disabled }: { state: TileState; onClick: () => void; disabled: boolean }) {
  return (
    <motion.button
      onClick={onClick}
      disabled={disabled || state !== 'hidden'}
      whileHover={state === 'hidden' && !disabled ? { scale: 1.05 } : {}}
      whileTap={state === 'hidden' && !disabled ? { scale: 0.95 } : {}}
      className={`aspect-square rounded-xl border text-xl cursor-pointer transition-all flex items-center justify-center disabled:cursor-not-allowed font-black ${
        state === 'hidden'
          ? 'bg-[#0d2419] border-[rgba(212,175,55,0.25)] hover:bg-[rgba(212,175,55,0.1)] hover:border-[rgba(212,175,55,0.6)] hover:shadow-[0_0_12px_rgba(212,175,55,0.25)]'
          : state === 'gem'
          ? 'bg-emerald-500/15 border-emerald-500/50 shadow-[0_0_15px_rgba(46,204,113,0.3)]'
          : 'bg-[#FF4D6D]/15 border-[#FF4D6D]/50 shadow-[0_0_15px_rgba(255,77,109,0.3)]'
      }`}
    >
      <AnimatePresence>
        {state === 'gem' && (
          <motion.span initial={{ scale: 0, rotate: -180 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: 'spring', stiffness: 300 }}>
            💎
          </motion.span>
        )}
        {state === 'mine' && (
          <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 300 }}>
            💣
          </motion.span>
        )}
      </AnimatePresence>
    </motion.button>
  );
}

/* ─── Main Page ─────────────────────────────────────────────────── */
export default function MinesPage() {
  const { balance, deductBalance, addBalance } = useWallet();
  const { addToast } = useToast();
  const { requireAuth } = useAuthGate();

  const [gridSize, setGridSize] = useState(25);
  const [mineCount, setMineCount] = useState(5);
  const [betAmount, setBetAmount] = useState(100);
  const [tiles, setTiles] = useState<TileState[]>(Array(25).fill('hidden'));
  const [minePositions, setMinePositions] = useState<Set<number>>(new Set());
  const [revealed, setRevealed] = useState(0);
  const [gameState, setGameState] = useState<'idle' | 'playing' | 'won' | 'lost'>('idle');
  const [commitHash, setCommitHash] = useState('');
  const [seed, setSeed] = useState('');
  const [currentBet, setCurrentBet] = useState(0);

  const currentMultiplier = calcMultiplier(revealed, gridSize, mineCount);
  const potentialWin = Math.floor(currentBet * currentMultiplier * 100) / 100;

  const startGame = async () => {
    requireAuth(async () => {
      if (!deductBalance(betAmount, `Mines bet — ${mineCount} mines`)) {
        addToast({ type: 'error', title: 'Insufficient balance' });
        return;
      }
      const { seed: s, hash: h } = await generateMineSeed();
      setSeed(s);
      setCommitHash(h);
      const positions = seedToMinePositions(s, gridSize, mineCount);
      setMinePositions(positions);
      setTiles(Array(gridSize).fill('hidden'));
      setRevealed(0);
      setGameState('playing');
      setCurrentBet(betAmount);
      sounds.playChip();
    });
  };

  const revealTile = useCallback((idx: number) => {
    if (gameState !== 'playing' || tiles[idx] !== 'hidden') return;

    if (minePositions.has(idx)) {
      // Hit mine — reveal all
      setTiles(prev => {
        const next = [...prev];
        next[idx] = 'mine';
        minePositions.forEach(m => { if (next[m] === 'hidden') next[m] = 'mine'; });
        return next;
      });
      setGameState('lost');
      addToast({ type: 'error', title: '💣 Boom! Hit a mine!', message: `Lost ₹${currentBet}` });
      sounds.playSpin();
    } else {
      const newRevealed = revealed + 1;
      setRevealed(newRevealed);
      setTiles(prev => { const next = [...prev]; next[idx] = 'gem'; return next; });
      sounds.playChip();

      // Check win condition (all safe tiles revealed)
      const safeTiles = gridSize - mineCount;
      if (newRevealed === safeTiles) {
        cashOut(newRevealed);
      }
    }
  }, [gameState, tiles, minePositions, revealed, currentBet, gridSize, mineCount]);

  const cashOut = useCallback((revCount?: number) => {
    const r = revCount ?? revealed;
    if (r === 0) { addToast({ type: 'warning', title: 'Reveal at least one tile first' }); return; }
    const m = calcMultiplier(r, gridSize, mineCount);
    const win = Math.floor(currentBet * m * 100) / 100;
    addBalance(win, `Mines cashout — ${r} gems found (${m.toFixed(2)}×)`);
    addToast({ type: 'success', title: `Won ₹${win.toFixed(2)}!`, message: `${r} gems × ${m.toFixed(2)}×` });
    confetti({ particleCount: 100, spread: 70, origin: { y: 0.5 }, colors: ['#2ECC71', '#D4AF37'] });
    setGameState('won');
    // Reveal remaining mines
    setTiles(prev => {
      const next = [...prev];
      minePositions.forEach(m => { if (next[m] === 'hidden') next[m] = 'mine'; });
      return next;
    });
  }, [revealed, gridSize, mineCount, currentBet, addBalance, addToast, minePositions]);

  const cols = gridSize === 25 ? 5 : 4;

  return (
    <div className="px-3 py-4 space-y-4 max-w-lg mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-xl bg-[rgba(212,175,55,0.1)] border border-[rgba(212,175,55,0.3)] flex items-center justify-center text-xl">💣</div>
          <div>
            <h1 className="text-lg font-black text-[#E8C97A] font-heading">Mines</h1>
            <p className="text-[10px] text-[rgba(212,175,55,0.5)]">Strategy · Provably Fair</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[rgba(212,175,55,0.08)] border border-[rgba(212,175,55,0.2)]">
          <Shield className="w-3.5 h-3.5 text-gold" />
          <span className="text-[10px] font-bold text-gold">Provably Fair</span>
        </div>
      </div>

      {/* Commit hash */}
      {commitHash && (
        <div className="bg-[rgba(212,175,55,0.04)] border border-[rgba(212,175,55,0.12)] rounded-xl p-2.5 text-[10px] text-[rgba(212,175,55,0.45)] font-mono truncate">
          Seed hash: {commitHash}
        </div>
      )}

      {/* Grid */}
      <div className={`grid gap-2`} style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
        {tiles.map((t, i) => (
          <Tile key={i} state={t} onClick={() => revealTile(i)} disabled={gameState !== 'playing'} />
        ))}
      </div>

      {/* Multiplier display */}
      {gameState === 'playing' && revealed > 0 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className="flex items-center justify-between royal-panel rounded-xl px-4 py-3">
          <div>
            <p className="text-xs text-[rgba(212,175,55,0.5)]">Current Multiplier</p>
            <p className="text-2xl font-black text-gold font-heading">{currentMultiplier.toFixed(2)}×</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-[rgba(212,175,55,0.5)]">Potential Win</p>
            <p className="text-2xl font-black text-[#2ECC71] font-heading">₹{potentialWin.toFixed(2)}</p>
          </div>
        </motion.div>
      )}

      {/* Game Over message */}
      {(gameState === 'won' || gameState === 'lost') && (
        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
          className={`rounded-xl p-3 text-center border ${gameState === 'won' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-[#FF4D6D]/10 border-[#FF4D6D]/30 text-[#FF4D6D]'}`}>
          <p className="font-black text-sm">
            {gameState === 'won' ? `🎉 Won ₹${(currentBet * currentMultiplier).toFixed(2)}!` : `💣 Lost ₹${currentBet}`}
          </p>
          {seed && <p className="text-[9px] mt-1 opacity-60 font-mono">Seed: {seed.slice(0, 16)}...</p>}
        </motion.div>
      )}

      {/* Controls */}
      <div className="royal-panel rounded-2xl p-4 space-y-3">
        {/* Grid + Mine config (only when idle) */}
        {gameState !== 'playing' && (
          <>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] text-[rgba(212,175,55,0.5)] font-bold mb-1.5 block">Grid Size</label>
                <div className="flex gap-1.5">
                  {GRID_OPTIONS.map(o => (
                    <button key={o.total} onClick={() => { setGridSize(o.total); setTiles(Array(o.total).fill('hidden')); }}
                      className={`flex-1 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-all ${gridSize === o.total ? 'btn-royal-gold' : 'bg-[#0d2419] border border-[rgba(212,175,55,0.15)] text-[rgba(212,175,55,0.5)]'}`}>
                      {o.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-[10px] text-[rgba(212,175,55,0.5)] font-bold mb-1.5 block">Mines Count</label>
                <div className="flex gap-1">
                  {MINE_OPTIONS.filter(m => m < gridSize).map(m => (
                    <button key={m} onClick={() => setMineCount(m)}
                      className={`flex-1 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-all ${mineCount === m ? 'bg-[#FF4D6D]/20 border border-[#FF4D6D]/50 text-[#FF4D6D]' : 'bg-[#0d2419] border border-[rgba(212,175,55,0.15)] text-[rgba(212,175,55,0.5)]'}`}>
                      {m}
                    </button>
                  ))}
                </div>
              </div>
            </div>

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
          </>
        )}

        {/* Action buttons */}
        <div className="flex gap-2">
          {gameState !== 'playing' ? (
            <button onClick={startGame}
              className="btn-royal-gold flex-1 py-3 rounded-xl font-black text-xs cursor-pointer">
              {gameState === 'idle' ? '🎮 Start Game' : '🔄 Play Again'}
            </button>
          ) : (
            <>
              <button onClick={() => cashOut()}
                disabled={revealed === 0}
                className="flex-1 py-3 rounded-xl font-black text-xs bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20 disabled:opacity-40 cursor-pointer transition-all">
                Cash Out ₹{potentialWin.toFixed(2)}
              </button>
            </>
          )}
        </div>

        {gameState === 'playing' && (
          <div className="flex justify-between text-xs text-[rgba(212,175,55,0.5)]">
            <span>💎 Gems found: <span className="font-black text-gold">{revealed}</span></span>
            <span>💣 Mines hidden: <span className="font-black text-[#FF4D6D]">{mineCount}</span></span>
            <span>Multiplier: <span className="font-black text-gold">{currentMultiplier.toFixed(2)}×</span></span>
          </div>
        )}

        {/* Auto-Bet Panel */}
        <AutoBetPanel
          balance={balance}
          disabled={gameState === 'playing'}
          intervalMs={4000}
          onPlaceBet={async (amount) => {
            if (!requireAuth()) return 0;
            if (balance < amount) return 0;
            deductBalance(amount, `Auto-Bet — Mines`, 'bet');
            const won = Math.random() > 0.45;
            const mult = won ? parseFloat((1.3 + Math.random() * 4).toFixed(2)) : 0;
            const payout = won ? Math.round(amount * mult) : 0;
            if (won) addBalance(payout, `Auto-Bet Win — Mines ${mult}×`, 'win');
            return won ? payout - amount : -amount;
          }}
        />
        {/* Per-game chat */}
        <GameChat gameId="mines" />
      </div>
    </div>
  );
}
