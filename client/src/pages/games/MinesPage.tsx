import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield } from 'lucide-react';
import confetti from 'canvas-confetti';
import { useWallet } from '../../store/WalletContext';
import { useAuth } from '../../store/AuthContext';
import { useToast } from '../../components/ui/Toast';
import { useAuthGate } from '../../hooks/useAuthGate';
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
          ? 'bg-[#0d2419] border-[rgba(212,175,55,0.2)] hover:border-gold hover:bg-[rgba(212,175,55,0.1)]'
          : state === 'gem'
          ? 'bg-emerald-500/20 border-emerald-500/50 shadow-[0_0_15px_rgba(46,204,113,0.3)]'
          : 'bg-[#FF4D6D]/20 border-[#FF4D6D]/50 shadow-[0_0_15px_rgba(255,77,109,0.3)]'
      }`}
    >
      <AnimatePresence mode="wait">
        {state === 'gem' && (
          <motion.span key="gem" initial={{ scale: 0, rotate: -30 }} animate={{ scale: 1, rotate: 0 }}>
            💎
          </motion.span>
        )}
        {state === 'mine' && (
          <motion.span key="mine" initial={{ scale: 0 }} animate={{ scale: 1, rotate: [0, 10, -10, 0] }}>
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
  const { isAuthenticated } = useAuth();
  const { addToast } = useToast();
  const { requireAuth } = useAuthGate();

  const [gridSize, setGridSize] = useState(25);
  const [mineCount, setMineCount] = useState(3);
  const [betAmount, setBetAmount] = useState(100);
  const [currentBet, setCurrentBet] = useState(100);
  const [gameState, setGameState] = useState<'idle' | 'playing' | 'won' | 'busted'>('idle');
  const [tiles, setTiles] = useState<TileState[]>(() => Array(25).fill('hidden'));
  const [minePositions, setMinePositions] = useState<Set<number>>(new Set());
  const [revealed, setRevealed] = useState(0);
  const [commitHash, setCommitHash] = useState('');
  const [, setSeed] = useState('');

  const currentMultiplier = revealed > 0 ? calcMultiplier(revealed, gridSize, mineCount) : 1;

  const startGame = useCallback(() => {
    requireAuth(async () => {
      if (!deductBalance(betAmount, `Mines bet (${gridSize} tiles, ${mineCount} mines)`)) {
        addToast({ type: 'error', title: 'Insufficient balance' });
        return;
      }
      const { seed: s, hash: h } = await generateMineSeed();
      const pos = seedToMinePositions(s, gridSize, mineCount);
      setSeed(s);
      setCommitHash(h);
      setMinePositions(pos);
      setTiles(Array(gridSize).fill('hidden'));
      setRevealed(0);
      setCurrentBet(betAmount);
      setGameState('playing');
      sounds.playChip();
      addToast({ type: 'info', title: 'Game Started', message: 'Dodge mines & cash out anytime!' });
    });
  }, [betAmount, gridSize, mineCount, deductBalance, addToast, requireAuth]);

  const handleTileClick = useCallback((idx: number) => {
    if (gameState !== 'playing' || tiles[idx] !== 'hidden') return;

    if (minePositions.has(idx)) {
      // BUSTED
      sounds.playLoss();
      setGameState('busted');
      setTiles(prev => {
        const next = [...prev];
        minePositions.forEach(m => { next[m] = 'mine'; });
        return next;
      });
      addToast({ type: 'error', title: '💥 BOOM! Hit a mine', message: `Lost ₹${currentBet}` });
    } else {
      // SAFE GEM
      const newRevealed = revealed + 1;
      setRevealed(newRevealed);
      setTiles(prev => { const next = [...prev]; next[idx] = 'gem'; return next; });
      sounds.playChip();

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
    setTiles(prev => {
      const next = [...prev];
      minePositions.forEach(m => { if (next[m] === 'hidden') next[m] = 'mine'; });
      return next;
    });
  }, [revealed, gridSize, mineCount, currentBet, addBalance, addToast, minePositions]);

  const cols = gridSize === 25 ? 5 : 4;

  return (
    <div className="py-4 space-y-5 w-full max-w-6xl mx-auto">
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

      {/* 2-Column Desktop Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Board & Bet Controls */}
        <div className="lg:col-span-7 xl:col-span-8 space-y-4">
          {commitHash && (
            <div className="bg-[rgba(212,175,55,0.04)] border border-[rgba(212,175,55,0.12)] rounded-xl p-2.5 text-[10px] text-[rgba(212,175,55,0.45)] font-mono truncate">
              Seed Hash: {commitHash}
            </div>
          )}

          {/* Mines Grid Frame */}
          <div className="royal-panel rounded-2xl p-4 flex flex-col items-center">
            <div
              className="grid gap-2 w-full max-w-sm"
              style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
            >
              {tiles.map((st, i) => (
                <Tile key={i} state={st} onClick={() => handleTileClick(i)} disabled={gameState !== 'playing'} />
              ))}
            </div>

            {gameState === 'playing' && (
              <div className="mt-4 flex justify-between w-full max-w-sm text-xs text-[rgba(212,175,55,0.6)]">
                <span>💎 Gems found: <span className="font-black text-gold">{revealed}</span></span>
                <span>💣 Mines: <span className="font-black text-[#FF4D6D]">{mineCount}</span></span>
                <span>Mult: <span className="font-black text-gold">{currentMultiplier.toFixed(2)}×</span></span>
              </div>
            )}
          </div>

          {/* Bet Panel */}
          <div className="royal-panel rounded-2xl p-4 space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] text-[rgba(212,175,55,0.5)] font-bold mb-1 block">Grid Size</label>
                <div className="flex gap-1.5">
                  {GRID_OPTIONS.map(g => (
                    <button key={g.total} onClick={() => { setGridSize(g.total); setTiles(Array(g.total).fill('hidden')); setGameState('idle'); }}
                      disabled={gameState === 'playing'}
                      className={`flex-1 py-1.5 rounded-lg text-xs font-bold ${gridSize === g.total ? 'bg-[rgba(212,175,55,0.2)] text-gold border border-[rgba(212,175,55,0.4)]' : 'bg-[#0d2419] text-[rgba(212,175,55,0.4)]'}`}>
                      {g.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-[10px] text-[rgba(212,175,55,0.5)] font-bold mb-1 block">Mines Count</label>
                <select value={mineCount} onChange={e => setMineCount(+e.target.value)} disabled={gameState === 'playing'}
                  className="w-full bg-[#0d2419] border border-[rgba(212,175,55,0.2)] rounded-xl px-2.5 py-1.5 text-xs text-[#F5F1E6] focus:outline-none">
                  {MINE_OPTIONS.map(m => (
                    <option key={m} value={m}>{m} Mines</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Quick Amounts */}
            <div className="flex gap-1.5 flex-wrap">
              {BET_AMOUNTS.map(amt => (
                <button key={amt} onClick={() => setBetAmount(amt)} disabled={gameState === 'playing'}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-bold ${betAmount === amt ? 'btn-royal-gold' : 'bg-[#0d2419] border border-[rgba(212,175,55,0.15)] text-[rgba(212,175,55,0.6)]'}`}>
                  ₹{amt}
                </button>
              ))}
            </div>

            {/* Start / Cashout Button */}
            {gameState !== 'playing' ? (
              <button onClick={startGame} className="btn-royal-gold w-full py-3 rounded-xl font-black text-sm cursor-pointer">
                Start Game (₹{betAmount})
              </button>
            ) : (
              <button onClick={() => cashOut()} disabled={revealed === 0}
                className="w-full py-3 rounded-xl font-black text-sm bg-emerald-500/20 border border-emerald-500/50 text-emerald-400 hover:bg-emerald-500/30 disabled:opacity-40 cursor-pointer">
                Cash Out ₹{(currentBet * currentMultiplier).toFixed(2)} ({currentMultiplier.toFixed(2)}×)
              </button>
            )}
          </div>

          <AutoBetPanel
            balance={balance}
            disabled={gameState === 'playing'}
            intervalMs={4000}
            onPlaceBet={async (amount) => {
              if (!isAuthenticated) return 0;
              if (balance < amount) return 0;
              deductBalance(amount, `Auto-Bet — Mines`);
              const won = Math.random() > 0.45;
              const mult = won ? parseFloat((1.3 + Math.random() * 4).toFixed(2)) : 0;
              const payout = won ? Math.round(amount * mult) : 0;
              if (won) addBalance(payout, `Auto-Bet Win — Mines ${mult}×`, 'win');
              return won ? payout - amount : -amount;
            }}
          />
        </div>

        {/* Right Column: Live Chat & Game Info */}
        <div className="lg:col-span-5 xl:col-span-4 space-y-4">
          <GameChat gameId="mines" />
        </div>
      </div>
    </div>
  );
}
