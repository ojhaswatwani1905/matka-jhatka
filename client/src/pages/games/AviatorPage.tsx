import { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Plane, Users, Shield, Volume2, VolumeX, History } from 'lucide-react';
import confetti from 'canvas-confetti';
import { useWallet } from '../../store/WalletContext';
import { useToast } from '../../components/ui/Toast';
import { useAuthGate } from '../../hooks/useAuthGate';
import { generateId, getRandomNumber } from '../../lib/utils';
import { sounds } from '../../lib/sound';
import { AutoBetPanel } from '../../components/ui/AutoBetPanel';
import { GameChat } from '../../components/ui/GameChat';

const BET_AMOUNTS = [10, 50, 100, 500, 1000];

/* ─── Provably Fair ────────────────────────────────────────────── */
function generateSeed(): string {
  return Array.from(crypto.getRandomValues(new Uint8Array(16)))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

async function hashSeed(seed: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(seed));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

function seedToCrashPoint(seed: string): number {
  const n = parseInt(seed.slice(0, 8), 16);
  const r = n / 0xffffffff; // 0–1
  if (r < 0.03) return 1.00; // 3% instant crash
  const crash = Math.max(1.00, 0.99 / (1 - r));
  return Math.min(100, Math.round(crash * 100) / 100);
}

/* ─── Types ────────────────────────────────────────────────────── */
interface LiveBet {
  id: string; user: string; bet: number; cashedAt?: number; status: 'active' | 'won' | 'lost';
}

interface RoundHistory {
  multiplier: number; crashed: boolean;
}

const MOCK_USERS = ['Raj***91', 'Priya***42', 'Amit***77', 'Sona***15', 'Vikram***33', 'Neha***08', 'Rohit***66'];

/* ─── Color Tier Helper for Multiplier Chips ──────────────────── */
function getMultiplierChipClass(mult: number): string {
  if (mult < 2.00) {
    return 'bg-cyan-950/70 text-cyan-300 border border-cyan-500/40 shadow-[0_0_8px_rgba(45,212,191,0.15)]';
  } else if (mult < 10.00) {
    return 'bg-[rgba(212,175,55,0.15)] text-[#E8C97A] border border-[rgba(212,175,55,0.4)] shadow-[0_0_10px_rgba(212,175,55,0.2)]';
  } else {
    return 'bg-fuchsia-950/90 text-fuchsia-300 border border-fuchsia-500/60 font-black shadow-[0_0_14px_rgba(236,72,153,0.35)] animate-pulse';
  }
}

/* ─── Crash Chart ──────────────────────────────────────────────── */
function CrashChart({ multiplier, crashed, phase, liveBets = [] }: { multiplier: number; crashed: boolean; phase: 'betting' | 'flying' | 'crashed'; liveBets?: LiveBet[] }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const startTimeRef = useRef<number>(0);

  useEffect(() => {
    if (phase === 'betting') {
      startTimeRef.current = 0;
    } else if (phase === 'flying' && startTimeRef.current === 0) {
      startTimeRef.current = Date.now();
    }
  }, [phase]);

  // Draw canvas with exponential curve + plane rotation + filled area
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const W = canvas.width, H = canvas.height;
    ctx.clearRect(0, 0, W, H);

    const originX = 35;
    const originY = H - 25;

    if (phase === 'betting') {
      // Draw idle flat line at origin
      ctx.beginPath();
      ctx.strokeStyle = 'rgba(212,175,55,0.3)';
      ctx.lineWidth = 2;
      ctx.moveTo(originX, originY);
      ctx.lineTo(originX + 40, originY);
      ctx.stroke();
      return;
    }

    // Flying or Crashed phase
    if (startTimeRef.current === 0) startTimeRef.current = Date.now();
    const elapsed = (Date.now() - startTimeRef.current) / 1000;

    // Exponential arc progress math
    const progressX = Math.min(1.0, elapsed / 7.5);
    const progressY = Math.min(1.0, Math.log(multiplier) / Math.log(12.0));

    const targetX = originX + progressX * (W - 85);
    const targetY = originY - progressY * (H - 55);

    // Control point for exponential sweep curve: flat near start, steep at end
    const controlX = originX + (targetX - originX) * 0.72;
    const controlY = originY;

    // 1. Solid gradient wedge fill under the curve down to origin Y
    ctx.beginPath();
    ctx.moveTo(originX, originY);
    ctx.quadraticCurveTo(controlX, controlY, targetX, targetY);
    ctx.lineTo(targetX, originY);
    ctx.closePath();

    const fillGrad = ctx.createLinearGradient(originX, 0, targetX, 0);
    if (crashed) {
      fillGrad.addColorStop(0, 'rgba(255, 77, 109, 0.05)');
      fillGrad.addColorStop(1, 'rgba(255, 77, 109, 0.55)');
    } else {
      fillGrad.addColorStop(0, 'rgba(212, 175, 55, 0.05)');
      fillGrad.addColorStop(1, 'rgba(212, 175, 55, 0.55)');
    }
    ctx.fillStyle = fillGrad;
    ctx.fill();

    // 2. Vertical drop line from plane tip to bottom baseline (like real Aviator)
    ctx.beginPath();
    ctx.strokeStyle = crashed ? 'rgba(255, 77, 109, 0.45)' : 'rgba(212, 175, 55, 0.45)';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([3, 3]);
    ctx.moveTo(targetX, targetY);
    ctx.lineTo(targetX, originY);
    ctx.stroke();
    ctx.setLineDash([]); // reset

    // 3. Accelerating stroke curve line
    ctx.beginPath();
    ctx.strokeStyle = crashed ? '#FF4D6D' : '#D4AF37';
    ctx.lineWidth = 3.5;
    ctx.lineCap = 'round';
    ctx.moveTo(originX, originY);
    ctx.quadraticCurveTo(controlX, controlY, targetX, targetY);
    ctx.stroke();

    // 4. Plane icon rotated to match exact tangent slope angle at current point
    if (phase === 'flying') {
      const tangentDx = targetX - controlX;
      const tangentDy = targetY - controlY;
      const angle = Math.atan2(tangentDy, tangentDx);

      ctx.save();
      ctx.translate(targetX, targetY);
      ctx.rotate(angle);
      ctx.fillStyle = crashed ? '#FF4D6D' : '#FFE57F';
      ctx.font = 'bold 24px sans-serif';
      ctx.fillText('✈', -6, 6);
      ctx.restore();
    }
  }, [multiplier, crashed, phase]);

  return (
    <div className="relative w-full rounded-2xl overflow-hidden border border-[rgba(212,175,55,0.25)] bg-[#04140D] shadow-2xl" style={{ height: 230 }}>
      {/* Radial light-ray background fanning out from bottom-left origin */}
      <div
        className="absolute inset-0 pointer-events-none opacity-20"
        style={{
          background: 'repeating-conic-gradient(from -20deg at 5% 95%, rgba(46,204,113,0.3) 0deg 8deg, transparent 8deg 16deg)',
        }}
      />

      <canvas ref={canvasRef} width={600} height={230} className="w-full h-full relative z-10" />

      {/* Multiplier overlay */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
        {phase === 'betting' && (
          <div className="text-center space-y-1">
            <p className="text-xs text-[rgba(212,175,55,0.6)] font-bold uppercase tracking-widest">NEXT ROUND STARTING</p>
            <div className="w-2.5 h-2.5 rounded-full bg-[#D4AF37] mx-auto animate-ping" />
          </div>
        )}
        {(phase === 'flying' || phase === 'crashed') && (
          <motion.div
            key={phase}
            initial={{ scale: 0.85, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="text-center"
          >
            <div className={`text-6xl font-black font-heading ${crashed ? 'text-[#FF4D6D]' : 'text-[#FFE57F]'}`}
              style={{ textShadow: crashed ? '0 0 35px rgba(255,77,109,0.85)' : '0 0 35px rgba(212,175,55,0.85)' }}>
              {multiplier.toFixed(2)}×
            </div>
            {crashed && <p className="text-[#FF4D6D] font-black text-sm tracking-widest uppercase mt-1">FLEW AWAY!</p>}
          </motion.div>
        )}
      </div>

      {/* Overlapping live bet player avatars in bottom-right corner */}
      <div className="absolute bottom-2.5 right-3 flex items-center -space-x-2 z-20 pointer-events-none">
        {liveBets.slice(0, 4).map((b, i) => (
          <div
            key={b.id || i}
            className="w-6 h-6 rounded-full bg-[#0d2419] border-2 border-gold/40 flex items-center justify-center text-[9px] font-black text-gold shadow-md"
            title={b.user}
          >
            {b.user[0]}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Main Page ────────────────────────────────────────────────── */
export default function AviatorPage() {
  const { balance, deductBalance, addBalance } = useWallet();
  const { addToast } = useToast();
  const { requireAuth } = useAuthGate();

  const [phase, setPhase] = useState<'betting' | 'flying' | 'crashed'>('betting');
  const [multiplier, setMultiplier] = useState(1.00);
  const [betAmount, setBetAmount] = useState(100);
  const [autoCashout, setAutoCashout] = useState('');
  const [myBet, setMyBet] = useState<{ amount: number; cashedAt?: number } | null>(null);
  const [liveBets, setLiveBets] = useState<LiveBet[]>([]);
  const [history, setHistory] = useState<RoundHistory[]>([]);
  const [countdown, setCountdown] = useState(5);
  const [soundOn, setSoundOn] = useState(true);
  const [commitHash, setCommitHash] = useState('');
  const [seed, setSeed] = useState('');
  const [crashPoint, setCrashPoint] = useState(2.0);
  const [activeTab, setActiveTab] = useState<'live' | 'history'>('live');

  // Single-execution guard & refs to eliminate double-firing side effects
  const isStoppingRef = useRef(false);
  const myBetRef = useRef<{ amount: number; cashedAt?: number } | null>(null);
  myBetRef.current = myBet;
  const phaseRef = useRef(phase);
  phaseRef.current = phase;
  const soundOnRef = useRef(soundOn);
  soundOnRef.current = soundOn;
  const intervalRef = useRef<ReturnType<typeof setInterval>>();

  function generateMockBets(): LiveBet[] {
    return Array.from({ length: getRandomNumber(4, 8) }, () => ({
      id: generateId(),
      user: MOCK_USERS[getRandomNumber(0, MOCK_USERS.length - 1)],
      bet: getRandomNumber(1, 10) * 50,
      status: 'active' as const,
    }));
  }

  const stopFlight = useCallback((cp: number, didCrash: boolean) => {
    // Single-execution guard
    if (isStoppingRef.current) return;
    isStoppingRef.current = true;

    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    setPhase('crashed');
    setMultiplier(cp);
    setHistory(prev => [{ multiplier: cp, crashed: didCrash }, ...prev].slice(0, 20));

    // Handle loss toast DIRECTLY on ref, NOT inside state updater callback
    const activeBet = myBetRef.current;
    if (activeBet && !activeBet.cashedAt) {
      addToast({ type: 'error', title: `Crashed at ${cp.toFixed(2)}×`, message: `Lost ₹${activeBet.amount}` });
    }
    setMyBet(null);

    setLiveBets(prev => prev.map(b => !b.cashedAt ? { ...b, status: 'lost' as const } : b));

    // Prepare next round after 4s
    setTimeout(async () => {
      const newSeed = generateSeed();
      const hash = await hashSeed(newSeed);
      const cp2 = seedToCrashPoint(newSeed);
      setSeed(newSeed);
      setCommitHash(hash);
      setCrashPoint(cp2);
      setMultiplier(1.00);
      isStoppingRef.current = false;
      setPhase('betting');
      setCountdown(5);
      setLiveBets(generateMockBets());
    }, 4000);
  }, [addToast]);

  // Init
  useEffect(() => {
    (async () => {
      const s = generateSeed();
      const h = await hashSeed(s);
      const cp = seedToCrashPoint(s);
      setSeed(s);
      setCommitHash(h);
      setCrashPoint(cp);
      setLiveBets(generateMockBets());
    })();
  }, []);

  // Countdown timer
  useEffect(() => {
    if (phase !== 'betting') return;
    if (countdown <= 0) {
      isStoppingRef.current = false;
      setPhase('flying');
      return;
    }
    const t = setTimeout(() => setCountdown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [phase, countdown]);

  // Flight multiplier loop
  useEffect(() => {
    if (phase !== 'flying') return;
    const start = Date.now();

    intervalRef.current = setInterval(() => {
      if (isStoppingRef.current) return;

      const elapsed = (Date.now() - start) / 1000;
      const m = Math.round(Math.pow(1.0023, elapsed * 60) * 100) / 100;
      setMultiplier(m);

      // Check crash condition
      if (m >= crashPoint) {
        stopFlight(crashPoint, true);
        return;
      }

      // Auto cashout
      const acp = parseFloat(autoCashout);
      if (!isNaN(acp) && m >= acp) {
        handleCashOut(m);
      }

      // Mock live bets cashouts
      setLiveBets(prev => prev.map(b => {
        if (b.status === 'active' && m >= getRandomNumber(110, 300) / 100 && Math.random() < 0.02) {
          return { ...b, cashedAt: m, status: 'won' as const };
        }
        return b;
      }));
    }, 100);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [phase, crashPoint, autoCashout, stopFlight]);

  const placeBet = () => {
    requireAuth(() => {
      if (phase !== 'betting') { addToast({ type: 'warning', title: 'Round in progress' }); return; }
      if (!deductBalance(betAmount, `Aviator bet`)) { addToast({ type: 'error', title: 'Insufficient balance' }); return; }
      setMyBet({ amount: betAmount });
      if (soundOnRef.current) sounds.playChip();
      addToast({ type: 'info', title: `Bet placed: ₹${betAmount}`, message: 'Cash out before it crashes!' });
    });
  };

  const handleCashOut = useCallback((atMultiplier?: number) => {
    const activeBet = myBetRef.current;
    if (!activeBet || activeBet.cashedAt || phaseRef.current !== 'flying') return;

    const m = atMultiplier ?? multiplier;
    const win = Math.floor(activeBet.amount * m * 100) / 100;

    myBetRef.current = { ...activeBet, cashedAt: m };
    setMyBet({ ...activeBet, cashedAt: m });

    addBalance(win, `Aviator cashout at ${m.toFixed(2)}×`);
    addToast({ type: 'success', title: `Cashed out! ₹${win.toFixed(2)}`, message: `${m.toFixed(2)}× multiplier` });
    if (soundOnRef.current) sounds.playWin();
    confetti({ particleCount: 80, spread: 60, origin: { y: 0.5 }, colors: ['#D4AF37', '#2ECC71'] });
  }, [multiplier, addBalance, addToast]);

  const inputCls = 'w-full bg-[#0d2419] border border-[rgba(212,175,55,0.2)] rounded-xl px-3 py-2.5 text-sm text-[#F5F1E6] focus:outline-none focus:border-[rgba(212,175,55,0.5)] transition-colors placeholder-[rgba(212,175,55,0.25)]';

  return (
    <div className="px-3 py-4 space-y-4 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-xl bg-[rgba(212,175,55,0.1)] border border-[rgba(212,175,55,0.3)] flex items-center justify-center">
            <Plane className="w-5 h-5 text-gold" />
          </div>
          <div>
            <h1 className="text-lg font-black text-[#E8C97A] font-heading">Aviator</h1>
            <p className="text-[10px] text-[rgba(212,175,55,0.5)]">Crash Multiplier · Provably Fair</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setSoundOn(s => !s)} className="w-8 h-8 rounded-lg bg-[rgba(212,175,55,0.08)] flex items-center justify-center text-[rgba(212,175,55,0.5)] hover:text-gold cursor-pointer transition-colors">
            {soundOn ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[rgba(212,175,55,0.08)] border border-[rgba(212,175,55,0.2)]">
            <Shield className="w-3.5 h-3.5 text-gold" />
            <span className="text-[10px] font-bold text-gold">Provably Fair</span>
          </div>
        </div>
      </div>

      {/* Top compact recent multiplier ticker strip */}
      <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none py-1.5 px-2 rounded-xl bg-[#061510] border border-[rgba(212,175,55,0.15)]">
        <span className="text-[9px] font-black text-[rgba(212,175,55,0.4)] uppercase tracking-wider shrink-0 mr-1">History:</span>
        {history.map((h, i) => (
          <span key={i} className={`shrink-0 px-2 py-0.5 rounded-full text-[10px] font-mono ${getMultiplierChipClass(h.multiplier)}`}>
            {h.multiplier.toFixed(2)}×
          </span>
        ))}
        {history.length === 0 && <span className="text-[10px] text-[rgba(212,175,55,0.3)]">No history rounds recorded yet</span>}
      </div>

      {/* Commit hash */}
      <div className="bg-[rgba(212,175,55,0.04)] border border-[rgba(212,175,55,0.12)] rounded-xl p-2.5 text-[10px] text-[rgba(212,175,55,0.45)] font-mono truncate">
        Next round hash: {commitHash}
      </div>

      {/* Crash chart */}
      <CrashChart multiplier={multiplier} crashed={phase === 'crashed'} phase={phase} liveBets={liveBets} />

      {/* Countdown */}
      {phase === 'betting' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center">
          <p className="text-gold font-black text-sm">Starting in <span className="text-2xl">{countdown}</span>s</p>
        </motion.div>
      )}

      {/* Round History strip */}
      <div className="flex gap-1.5 overflow-x-auto scrollbar-none">
        {history.map((h, i) => (
          <span key={i} className={`shrink-0 px-2.5 py-0.5 rounded-full text-[10px] font-mono ${getMultiplierChipClass(h.multiplier)}`}>
            {h.multiplier.toFixed(2)}×
          </span>
        ))}
      </div>

      {/* Bet Panel */}
      <div className="royal-panel rounded-2xl p-4 space-y-3">
        {/* Bet amounts */}
        <div className="flex gap-2 flex-wrap">
          {BET_AMOUNTS.map(amt => (
            <button key={amt} onClick={() => setBetAmount(amt)}
              className={`flex-1 min-w-[50px] py-2 rounded-xl text-xs font-bold cursor-pointer transition-all ${betAmount === amt ? 'btn-royal-gold' : 'bg-[#0d2419] border border-[rgba(212,175,55,0.15)] text-[rgba(212,175,55,0.6)] hover:text-gold'}`}>
              ₹{amt}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-[10px] text-[rgba(212,175,55,0.5)] font-bold mb-1 block">Bet Amount</label>
            <input type="number" value={betAmount} onChange={e => setBetAmount(+e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className="text-[10px] text-[rgba(212,175,55,0.5)] font-bold mb-1 block">Auto Cashout at ×</label>
            <input type="number" step="0.1" value={autoCashout} onChange={e => setAutoCashout(e.target.value)} placeholder="e.g. 2.00" className={inputCls} />
          </div>
        </div>

        {/* Action buttons */}
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={placeBet}
            disabled={phase !== 'betting' || !!myBet}
            className="btn-royal-gold py-3 rounded-xl font-black text-xs cursor-pointer disabled:opacity-50"
          >
            {myBet ? `Bet: ₹${myBet.amount}` : 'Place Bet'}
          </button>
          <button
            onClick={() => handleCashOut()}
            disabled={phase !== 'flying' || !myBet || !!myBet.cashedAt}
            className="py-3 rounded-xl font-black text-xs bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20 disabled:opacity-40 cursor-pointer transition-all"
          >
            {myBet?.cashedAt ? `Cashed ${myBet.cashedAt.toFixed(2)}×` : `Cash Out ${multiplier.toFixed(2)}×`}
          </button>
        </div>

        {myBet && !myBet.cashedAt && phase === 'flying' && (
          <div className="text-center text-xs font-bold text-gold animate-pulse">
            Win: ₹{(myBet.amount * multiplier).toFixed(2)} if you cash out now
          </div>
        )}
      </div>

      {/* Live Bets / History tabs */}
      <div>
        <div className="flex gap-1 bg-[#0d2419] rounded-xl p-1 mb-3 border border-[rgba(212,175,55,0.12)]">
          {(['live', 'history'] as const).map(t => (
            <button key={t} onClick={() => setActiveTab(t)}
              className={`flex-1 py-2 rounded-lg text-xs font-bold capitalize cursor-pointer transition-all ${activeTab === t ? 'bg-[rgba(212,175,55,0.18)] text-[#E8C97A] border border-[rgba(212,175,55,0.35)]' : 'text-[rgba(212,175,55,0.4)]'}`}>
              {t === 'live' ? <span className="flex items-center justify-center gap-1.5"><Users className="w-3.5 h-3.5" /> Live Bets</span> : <span className="flex items-center justify-center gap-1.5"><History className="w-3.5 h-3.5" /> Round History</span>}
            </button>
          ))}
        </div>

        {activeTab === 'live' && (
          <div className="space-y-1.5">
            {liveBets.map(b => (
              <div key={b.id} className="flex items-center gap-2 royal-panel rounded-xl px-3 py-2 text-xs">
                <div className="w-7 h-7 rounded-lg bg-[rgba(212,175,55,0.08)] flex items-center justify-center font-black text-gold text-[10px]">{b.user[0]}</div>
                <span className="flex-1 font-bold text-[#F5F1E6]">{b.user}</span>
                <span className="text-[rgba(212,175,55,0.6)]">₹{b.bet}</span>
                {b.status === 'won' && <span className="text-emerald-400 font-black">{b.cashedAt?.toFixed(2)}×</span>}
                {b.status === 'lost' && <span className="text-[#FF4D6D] font-black">Lost</span>}
                {b.status === 'active' && <span className="text-amber-400 font-black animate-pulse">{multiplier.toFixed(2)}×</span>}
              </div>
            ))}
          </div>
        )}

        {activeTab === 'history' && (
          <div className="grid grid-cols-5 gap-1.5">
            {history.map((h, i) => (
              <div key={i} className={`text-center py-2 rounded-xl text-xs font-black ${getMultiplierChipClass(h.multiplier)}`}>
                {h.multiplier.toFixed(2)}×
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Auto-Bet Panel */}
      <AutoBetPanel
        balance={balance}
        disabled={phase !== 'betting'}
        intervalMs={6000}
        onPlaceBet={async (amount) => {
          if (!requireAuth()) return 0;
          if (balance < amount) return 0;
          deductBalance(amount, `Auto-Bet — Aviator`, 'bet');
          // Simulate: 40% chance win at 1.5–3x
          const won = Math.random() > 0.6;
          const mult = won ? parseFloat((1.5 + Math.random() * 1.5).toFixed(2)) : 0;
          const payout = won ? Math.round(amount * mult) : 0;
          if (won) addBalance(payout, `Auto-Bet Win — Aviator ${mult}×`, 'win');
          return won ? payout - amount : -amount;
        }}
      />

      {/* Per-game chat */}
      <GameChat gameId="aviator" />
    </div>
  );
}
