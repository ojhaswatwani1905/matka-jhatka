import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plane, TrendingUp, Users, Shield, Volume2, VolumeX, History } from 'lucide-react';
import confetti from 'canvas-confetti';
import { useWallet } from '../../store/WalletContext';
import { useToast } from '../../components/ui/Toast';
import { useAuthGate } from '../../hooks/useAuthGate';
import { generateId, generatePeriod, getRandomNumber, formatCurrency } from '../../lib/utils';
import { sounds } from '../../lib/sound';

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
  // Use first 8 hex chars → number → map to crash range 1.00–100x
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

/* ─── Crash Chart ──────────────────────────────────────────────── */
function CrashChart({ multiplier, crashed, phase }: { multiplier: number; crashed: boolean; phase: 'betting' | 'flying' | 'crashed' }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pointsRef = useRef<{ x: number; y: number }[]>([]);

  useEffect(() => {
    if (phase === 'betting') { pointsRef.current = []; }
  }, [phase]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const W = canvas.width, H = canvas.height;
    ctx.clearRect(0, 0, W, H);

    if (phase === 'flying' || phase === 'crashed') {
      const t = Math.min(multiplier, 20);
      const xFrac = Math.min((Date.now() % 10000) / 10000, 1);
      pointsRef.current.push({ x: xFrac, y: Math.log(t) / Math.log(20) });
      if (pointsRef.current.length > 120) pointsRef.current.shift();
    }

    if (pointsRef.current.length < 2) return;
    const pts = pointsRef.current;
    const minX = pts[0].x, maxX = pts[pts.length - 1].x;
    const rng = Math.max(maxX - minX, 0.01);

    const toCanvas = (p: { x: number; y: number }) => ({
      cx: 40 + ((p.x - minX) / rng) * (W - 60),
      cy: H - 30 - p.y * (H - 50),
    });

    // Gradient fill
    const grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, crashed ? 'rgba(255,77,109,0.25)' : 'rgba(212,175,55,0.25)');
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.beginPath();
    const first = toCanvas(pts[0]);
    ctx.moveTo(first.cx, H - 30);
    ctx.lineTo(first.cx, first.cy);
    pts.forEach(p => { const c = toCanvas(p); ctx.lineTo(c.cx, c.cy); });
    const last = toCanvas(pts[pts.length - 1]);
    ctx.lineTo(last.cx, H - 30);
    ctx.closePath();
    ctx.fillStyle = grad;
    ctx.fill();

    // Line
    ctx.beginPath();
    ctx.strokeStyle = crashed ? '#FF4D6D' : '#D4AF37';
    ctx.lineWidth = 2.5;
    ctx.lineJoin = 'round';
    pts.forEach((p, i) => { const c = toCanvas(p); i === 0 ? ctx.moveTo(c.cx, c.cy) : ctx.lineTo(c.cx, c.cy); });
    ctx.stroke();

    // Plane icon at end
    if (phase !== 'crashed') {
      const end = toCanvas(pts[pts.length - 1]);
      ctx.fillStyle = '#D4AF37';
      ctx.font = '20px serif';
      ctx.fillText('✈', end.cx - 10, end.cy - 5);
    }
  });

  return (
    <div className="relative w-full rounded-2xl overflow-hidden border border-[rgba(212,175,55,0.2)]"
      style={{ background: 'linear-gradient(180deg, #0a1e12 0%, #061A10 100%)', height: 220 }}>
      <canvas ref={canvasRef} width={600} height={220} className="w-full h-full" />

      {/* Multiplier overlay */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        {phase === 'betting' && (
          <div className="text-center space-y-1">
            <p className="text-xs text-[rgba(212,175,55,0.5)] font-bold uppercase tracking-wider">Waiting for players...</p>
            <div className="w-2 h-2 rounded-full bg-[#D4AF37] mx-auto animate-pulse" />
          </div>
        )}
        {(phase === 'flying' || phase === 'crashed') && (
          <motion.div
            key={phase}
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="text-center"
          >
            <div className={`text-5xl font-black font-heading ${crashed ? 'text-[#FF4D6D]' : 'text-[#D4AF37]'}`}
              style={{ textShadow: crashed ? '0 0 30px rgba(255,77,109,0.8)' : '0 0 30px rgba(212,175,55,0.8)' }}>
              {multiplier.toFixed(2)}×
            </div>
            {crashed && <p className="text-[#FF4D6D] font-black text-sm mt-1">CRASHED!</p>}
          </motion.div>
        )}
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
  const intervalRef = useRef<ReturnType<typeof setInterval>>();

  const stopFlight = useCallback((cp: number, didCrash: boolean) => {
    clearInterval(intervalRef.current);
    setPhase('crashed');
    setMultiplier(cp);
    setHistory(prev => [{ multiplier: cp, crashed: didCrash }, ...prev].slice(0, 20));

    setMyBet(prev => {
      if (prev && !prev.cashedAt) {
        addToast({ type: 'error', title: `Crashed at ${cp.toFixed(2)}×`, message: `Lost ₹${prev.amount}` });
      }
      return null;
    });

    setLiveBets(prev => prev.map(b => !b.cashedAt ? { ...b, status: 'lost' as const } : b));

    // New round after 4s
    setTimeout(async () => {
      const newSeed = generateSeed();
      const hash = await hashSeed(newSeed);
      const cp2 = seedToCrashPoint(newSeed);
      setSeed(newSeed);
      setCommitHash(hash);
      setCrashPoint(cp2);
      setMultiplier(1.00);
      setPhase('betting');
      setCountdown(5);
      setLiveBets(generateMockBets());
    }, 4000);
  }, [addToast]);

  function generateMockBets(): LiveBet[] {
    return Array.from({ length: getRandomNumber(4, 8) }, () => ({
      id: generateId(),
      user: MOCK_USERS[getRandomNumber(0, MOCK_USERS.length - 1)],
      bet: getRandomNumber(1, 10) * 50,
      status: 'active' as const,
    }));
  }

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
      setPhase('flying');
      return;
    }
    const t = setTimeout(() => setCountdown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [phase, countdown]);

  // Flight multiplier
  useEffect(() => {
    if (phase !== 'flying') return;
    const start = Date.now();
    intervalRef.current = setInterval(() => {
      const elapsed = (Date.now() - start) / 1000;
      const m = Math.round(Math.pow(1.0023, elapsed * 60) * 100) / 100;
      setMultiplier(m);

      // Auto cashout
      const acp = parseFloat(autoCashout);
      if (!isNaN(acp) && m >= acp) {
        handleCashOut(m);
        return;
      }

      // Mock cashouts
      setLiveBets(prev => prev.map(b => {
        if (b.status === 'active' && m >= getRandomNumber(110, 300) / 100 && Math.random() < 0.02) {
          return { ...b, cashedAt: m, status: 'won' as const };
        }
        return b;
      }));

      if (m >= crashPoint) {
        stopFlight(crashPoint, true);
      }
    }, 100);
    return () => clearInterval(intervalRef.current);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, crashPoint]);

  const placeBet = () => {
    requireAuth(() => {
      if (phase !== 'betting') { addToast({ type: 'warning', title: 'Round in progress' }); return; }
      if (!deductBalance(betAmount, `Aviator bet`)) { addToast({ type: 'error', title: 'Insufficient balance' }); return; }
      setMyBet({ amount: betAmount });
      if (soundOn) sounds.playChip();
      addToast({ type: 'info', title: `Bet placed: ₹${betAmount}`, message: 'Cash out before it crashes!' });
    });
  };

  const handleCashOut = useCallback((atMultiplier?: number) => {
    const m = atMultiplier ?? multiplier;
    setMyBet(prev => {
      if (!prev || prev.cashedAt) return prev;
      const win = Math.floor(prev.amount * m * 100) / 100;
      addBalance(win, `Aviator cashout at ${m.toFixed(2)}×`);
      addToast({ type: 'success', title: `Cashed out! ₹${win.toFixed(2)}`, message: `${m.toFixed(2)}× multiplier` });
      if (soundOn) sounds.playWin();
      confetti({ particleCount: 80, spread: 60, origin: { y: 0.5 }, colors: ['#D4AF37', '#2ECC71'] });
      return { ...prev, cashedAt: m };
    });
  }, [multiplier, addBalance, addToast, soundOn]);

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

      {/* Commit hash */}
      <div className="bg-[rgba(212,175,55,0.04)] border border-[rgba(212,175,55,0.12)] rounded-xl p-2.5 text-[10px] text-[rgba(212,175,55,0.45)] font-mono truncate">
        Next round hash: {commitHash}
      </div>

      {/* Crash chart */}
      <CrashChart multiplier={multiplier} crashed={phase === 'crashed'} phase={phase} />

      {/* Countdown */}
      {phase === 'betting' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center">
          <p className="text-gold font-black text-sm">Starting in <span className="text-2xl">{countdown}</span>s</p>
        </motion.div>
      )}

      {/* Round History strip */}
      <div className="flex gap-1.5 overflow-x-auto scrollbar-none">
        {history.map((h, i) => (
          <span key={i} className={`shrink-0 px-2 py-0.5 rounded-full text-[10px] font-black ${h.multiplier < 2 ? 'bg-[#FF4D6D]/15 text-[#FF4D6D]' : h.multiplier < 5 ? 'bg-amber-500/15 text-amber-400' : 'bg-emerald-500/15 text-emerald-400'}`}>
            {h.multiplier.toFixed(2)}×
          </span>
        ))}
        {history.length === 0 && <span className="text-xs text-[rgba(212,175,55,0.3)]">No history yet</span>}
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
              className={`flex-1 py-2 rounded-lg text-xs font-bold capitalize cursor-pointer transition-all ${activeTab === t ? 'bg-[rgba(212,175,55,0.18)] text-gold border border-[rgba(212,175,55,0.35)]' : 'text-[rgba(212,175,55,0.4)]'}`}>
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
              <div key={i} className={`text-center py-2 rounded-xl text-xs font-black ${h.multiplier < 2 ? 'bg-[#FF4D6D]/10 text-[#FF4D6D] border border-[#FF4D6D]/20' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'}`}>
                {h.multiplier.toFixed(2)}×
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
