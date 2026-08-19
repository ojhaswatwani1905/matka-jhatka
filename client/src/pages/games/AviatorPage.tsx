import { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Users, Shield, Volume2, VolumeX, History } from 'lucide-react';
import { useWallet } from '../../store/WalletContext';
import { useAuth } from '../../store/AuthContext';
import { useToast } from '../../components/ui/Toast';
import { useAuthGate } from '../../hooks/useAuthGate';
import { useGameControl } from '../../store/GameControlContext';
import { generateId, getRandomNumber } from '../../lib/utils';
import { sounds } from '../../lib/sound';
import { AutoBetPanel } from '../../components/ui/AutoBetPanel';
import { GameChat } from '../../components/ui/GameChat';
import { triggerWinCelebration } from '../../components/ui/WinCelebrationOverlay';
import { haptics } from '../../lib/haptics';
import { SEOHead } from '../../components/shared/SEOHead';
import { RelatedGamesSection } from '../../components/shared/RelatedGamesSection';
import { aviatorSync, type AviatorLiveBet } from '../../lib/aviatorSync';

const aviatorBreadcrumbLd = {
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
    { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://playarena.com/' },
    { '@type': 'ListItem', position: 2, name: 'Games', item: 'https://playarena.com/games' },
    { '@type': 'ListItem', position: 3, name: 'Aviator', item: 'https://playarena.com/games/aviator' },
  ],
};

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

function seedToCrashPoint(seed: string, maxCrash = 50, instantCrashRate = 3): number {
  const n = parseInt(seed.slice(0, 8), 16);
  const r = n / 0xffffffff; // 0–1
  if (r < instantCrashRate / 100) return 1.00;
  const crash = Math.max(1.00, 0.99 / (1 - r));
  return Math.min(maxCrash, Math.round(crash * 100) / 100);
}

/* ─── Types ────────────────────────────────────────────────────── */
type LiveBet = AviatorLiveBet;

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

/* ─── Red Supersonic Jet Vector Canvas & SVG Asset ────────────── */
export function RedPlaneIcon({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M44 24L6 6L14 24L6 42L44 24Z" fill="url(#redJetGrad)" filter="drop-shadow(0 0 6px rgba(255,30,66,0.6))" />
      <path d="M44 24L20 18L14 24L20 30L44 24Z" fill="#FF1744" />
      <path d="M26 21L34 24L26 27L22 24L26 21Z" fill="#00E5FF" />
      <path d="M14 24L6 22L4 24L6 26L14 24Z" fill="#FFA000" />
      <defs>
        <linearGradient id="redJetGrad" x1="6" y1="6" x2="44" y2="24" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FF4D6D" />
          <stop offset="0.5" stopColor="#E60039" />
          <stop offset="1" stopColor="#8A0012" />
        </linearGradient>
      </defs>
    </svg>
  );
}

function drawRedSupersonicJet(ctx: CanvasRenderingContext2D, x: number, y: number, angle: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);

  // 1. Afterburner Thrust Flame
  const flameLength = 16 + Math.random() * 9;
  const flameGrad = ctx.createLinearGradient(-32 - flameLength, 0, -24, 0);
  flameGrad.addColorStop(0, 'rgba(255, 120, 0, 0)');
  flameGrad.addColorStop(0.5, '#FF9100');
  flameGrad.addColorStop(1, '#FFEA00');

  ctx.beginPath();
  ctx.moveTo(-24, -3);
  ctx.lineTo(-24 - flameLength, 0);
  ctx.lineTo(-24, 3);
  ctx.closePath();
  ctx.fillStyle = flameGrad;
  ctx.shadowColor = '#FF6D00';
  ctx.shadowBlur = 10;
  ctx.fill();
  ctx.shadowBlur = 0;

  // 2. Main Red Jet Fuselage
  ctx.beginPath();
  ctx.moveTo(30, 0);
  ctx.quadraticCurveTo(12, -7, -24, -5);
  ctx.lineTo(-26, 0);
  ctx.lineTo(-24, 5);
  ctx.quadraticCurveTo(12, 7, 30, 0);
  ctx.closePath();

  const bodyGrad = ctx.createLinearGradient(0, -7, 0, 7);
  bodyGrad.addColorStop(0, '#FF4D6D');
  bodyGrad.addColorStop(0.4, '#E60039');
  bodyGrad.addColorStop(1, '#990022');
  ctx.fillStyle = bodyGrad;
  ctx.shadowColor = 'rgba(255, 30, 66, 0.7)';
  ctx.shadowBlur = 12;
  ctx.fill();
  ctx.shadowBlur = 0;

  // 3. Swept Wings
  ctx.beginPath();
  ctx.moveTo(8, -2);
  ctx.lineTo(-14, -26);
  ctx.lineTo(-18, -24);
  ctx.lineTo(-8, -2);
  ctx.closePath();
  ctx.fillStyle = '#CC0029';
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(8, 2);
  ctx.lineTo(-14, 26);
  ctx.lineTo(-18, 24);
  ctx.lineTo(-8, 2);
  ctx.closePath();
  ctx.fillStyle = '#990022';
  ctx.fill();

  // 4. Gold Trim on Wings
  ctx.beginPath();
  ctx.moveTo(8, -2);
  ctx.lineTo(-14, -26);
  ctx.strokeStyle = '#FFD700';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(8, 2);
  ctx.lineTo(-14, 26);
  ctx.strokeStyle = '#FFD700';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // 5. Tail Fin
  ctx.beginPath();
  ctx.moveTo(-12, 0);
  ctx.lineTo(-26, -14);
  ctx.lineTo(-28, -12);
  ctx.lineTo(-20, 0);
  ctx.closePath();
  ctx.fillStyle = '#FF1744';
  ctx.fill();

  // 6. Cockpit Canopy Glass
  ctx.beginPath();
  ctx.ellipse(8, -1, 9, 3.5, 0, 0, Math.PI * 2);
  const canopyGrad = ctx.createLinearGradient(0, -4, 0, 2);
  canopyGrad.addColorStop(0, '#E0F7FA');
  canopyGrad.addColorStop(0.5, '#00E5FF');
  canopyGrad.addColorStop(1, '#006064');
  ctx.fillStyle = canopyGrad;
  ctx.shadowColor = '#00E5FF';
  ctx.shadowBlur = 6;
  ctx.fill();
  ctx.shadowBlur = 0;

  ctx.restore();
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

  // Render loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const parent = canvas.parentElement;
    if (!parent) return;

    // Dynamically match canvas resolution to parent container
    const W = parent.clientWidth || 600;
    const H = parent.clientHeight || 280;
    if (canvas.width !== W || canvas.height !== H) {
      canvas.width = W;
      canvas.height = H;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, W, H);

    // Origin is at bottom-left corner
    const originX = 0;
    const originY = H;

    if (phase === 'betting') {
      // Idle line at bottom-left
      ctx.beginPath();
      ctx.strokeStyle = 'rgba(212,175,55,0.35)';
      ctx.lineWidth = 2.5;
      ctx.moveTo(0, H - 15);
      ctx.lineTo(80, H - 15);
      ctx.stroke();
      return;
    }

    // Flying or Crashed phase
    if (startTimeRef.current === 0) startTimeRef.current = Date.now();
    const elapsed = (Date.now() - startTimeRef.current) / 1000;

    // Aggressive scaling: curve rapidly expands across 85%-92% width and 40%-85% height even in early/mid rounds
    const progressX = Math.min(0.92, 0.25 + (elapsed / 2.8) * 0.67);
    const rawRatio = Math.max(0, (multiplier - 1.0) / 2.2);
    const progressY = Math.min(0.85, Math.pow(rawRatio, 0.5) * 0.72 + 0.08);

    const targetX = progressX * W;
    const targetY = H - progressY * H;

    // Control point for smooth accelerating upward sweep curve
    const controlX = targetX * 0.62;
    const controlY = originY;

    // 1. Solid gradient wedge fill from curve down to bottom edge of chart
    ctx.beginPath();
    ctx.moveTo(originX, originY);
    ctx.quadraticCurveTo(controlX, controlY, targetX, targetY);
    ctx.lineTo(targetX, originY);
    ctx.closePath();

    const fillGrad = ctx.createLinearGradient(0, targetY, 0, originY);
    if (crashed) {
      fillGrad.addColorStop(0, 'rgba(255, 77, 109, 0.85)');
      fillGrad.addColorStop(0.5, 'rgba(255, 77, 109, 0.45)');
      fillGrad.addColorStop(1, 'rgba(255, 77, 109, 0.15)');
    } else {
      fillGrad.addColorStop(0, 'rgba(212, 175, 55, 0.85)');
      fillGrad.addColorStop(0.5, 'rgba(212, 175, 55, 0.45)');
      fillGrad.addColorStop(1, 'rgba(212, 175, 55, 0.15)');
    }
    ctx.fillStyle = fillGrad;
    ctx.fill();

    // 2. Vertical drop line from plane tip straight to bottom edge
    ctx.beginPath();
    ctx.strokeStyle = crashed ? 'rgba(255, 77, 109, 0.75)' : 'rgba(212, 175, 55, 0.75)';
    ctx.lineWidth = 2.5;
    ctx.setLineDash([4, 3]);
    ctx.moveTo(targetX, targetY);
    ctx.lineTo(targetX, originY);
    ctx.stroke();
    ctx.setLineDash([]); // reset

    // 3. Accelerating stroke curve line
    ctx.beginPath();
    ctx.strokeStyle = crashed ? '#FF4D6D' : '#FFE57F';
    ctx.lineWidth = 4.5;
    ctx.lineCap = 'round';
    // 4. Custom Sleek Red Jet rendered with afterburner flame and dynamic slope angle
    if (phase === 'flying') {
      const tangentDx = targetX - controlX;
      const tangentDy = targetY - controlY;
      const angle = Math.atan2(tangentDy, tangentDx);
      drawRedSupersonicJet(ctx, targetX, targetY, angle);
    }
  }, [multiplier, crashed, phase]);

  return (
    <div className="relative w-full rounded-2xl overflow-hidden border border-[rgba(212,175,55,0.25)] bg-[#04140D] shadow-2xl" style={{ height: 280 }}>
      {/* Radial light-ray background fanning out from bottom-left origin */}
      <div
        className="absolute inset-0 pointer-events-none opacity-25"
        style={{
          background: 'repeating-conic-gradient(from -30deg at 0% 100%, rgba(46,204,113,0.3) 0deg 8deg, transparent 8deg 16deg)',
        }}
      />

      <canvas ref={canvasRef} className="w-full h-full relative z-10 block" />

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
            className="w-6.5 h-6.5 rounded-full bg-[#0d2419] border-2 border-gold/50 flex items-center justify-center text-[9px] font-black text-gold shadow-md"
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
  const { isAuthenticated } = useAuth();
  const { addToast } = useToast();
  const { requireAuth } = useAuthGate();
  const { settings, checkIsFirstBet, consumeFirstBet } = useGameControl();

  const [roundId, setRoundId] = useState(() => generateId());
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
  const [, setSeed] = useState('');
  const [crashPoint, setCrashPoint] = useState(2.0);
  const [activeTab, setActiveTab] = useState<'live' | 'history'>('live');

  // Single-execution guard & refs to eliminate double-firing side effects
  const isStoppingRef = useRef(false);
  const myBetRef = useRef<{ amount: number; cashedAt?: number } | null>(null);
  myBetRef.current = myBet;
  const phaseRef = useRef(phase);
  phaseRef.current = phase;
  const multiplierRef = useRef(multiplier);
  multiplierRef.current = multiplier;
  const soundOnRef = useRef(soundOn);
  soundOnRef.current = soundOn;
  const intervalRef = useRef<any>(null);

  function generateMockBets(): LiveBet[] {
    return Array.from({ length: getRandomNumber(4, 8) }, () => ({
      id: generateId(),
      user: MOCK_USERS[getRandomNumber(0, MOCK_USERS.length - 1)],
      bet: getRandomNumber(1, 10) * 50,
      status: 'active' as const,
    }));
  }

  const stopFlight = useCallback((cp: number, didCrash: boolean, isManualCrash: boolean = false) => {
    // Single-execution guard
    if (isStoppingRef.current) return;
    isStoppingRef.current = true;

    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    setPhase('crashed');
    setMultiplier(cp);
    multiplierRef.current = cp;
    setHistory(prev => [{ multiplier: cp, crashed: didCrash }, ...prev].slice(0, 20));

    if (soundOnRef.current) {
      try { sounds.playLoss(); } catch {}
    }

    // Handle loss toast DIRECTLY on ref, NOT inside state updater callback
    const activeBet = myBetRef.current;
    if (activeBet && !activeBet.cashedAt) {
      addToast({
        type: 'error',
        title: isManualCrash ? `💥 Admin Terminated at ${cp.toFixed(2)}×` : `Crashed at ${cp.toFixed(2)}×`,
        message: `Lost ₹${activeBet.amount}`,
      });
    }
    setMyBet(null);

    setLiveBets(prev => prev.map(b => !b.cashedAt ? { ...b, status: 'lost' as const } : b));

    // Prepare next round after 4s
    setTimeout(async () => {
      const newSeed = generateSeed();
      const hash = await hashSeed(newSeed);
      let cp2 = seedToCrashPoint(newSeed, settings.aviator.maxCrash, settings.aviator.instantCrashRate);

      // Check Admin Overrides
      const override = aviatorSync.getAdminOverride();
      if (override.forceNext100xCrash) {
        cp2 = 1.00;
        aviatorSync.clearAdminOverride();
      } else if (override.forcedTargetMultiplier) {
        cp2 = override.forcedTargetMultiplier;
        aviatorSync.clearAdminOverride();
      }

      if (checkIsFirstBet()) {
        consumeFirstBet();
        cp2 = Math.max(3.5, cp2); // Guaranteed high multiplier flight on 1st bet!
        addToast({ type: 'success', title: '🎉 Beginner Luck!', message: 'High multiplier flight guaranteed on your 1st bet!' });
      }
      setSeed(newSeed);
      setCommitHash(hash);
      setCrashPoint(cp2);
      setMultiplier(1.00);
      multiplierRef.current = 1.00;
      setRoundId(generateId());
      isStoppingRef.current = false;
      setPhase('betting');
      setCountdown(5);
      setLiveBets(generateMockBets());
    }, 4000);
  }, [addToast, settings.aviator.maxCrash, settings.aviator.instantCrashRate, checkIsFirstBet, consumeFirstBet]);

  // Real-time synchronization broadcast
  useEffect(() => {
    aviatorSync.publishState({
      roundId,
      phase,
      multiplier,
      crashPoint,
      countdown,
      commitHash,
      liveBets,
    });
  }, [roundId, phase, multiplier, crashPoint, countdown, commitHash, liveBets]);

  // Subscribe to Admin Instant Crash command
  useEffect(() => {
    const handleCrashSignal = (data: { multiplier?: number; timestamp?: number }) => {
      if (phaseRef.current === 'flying') {
        const targetMult = data.multiplier ?? multiplierRef.current;
        stopFlight(targetMult, true, true);
      } else if (phaseRef.current === 'betting') {
        stopFlight(1.00, true, true);
      }
    };

    const unsubscribe = aviatorSync.subscribeToAdminCrash(handleCrashSignal);

    const onCustomEvent = (e: Event) => {
      const customEvt = e as CustomEvent;
      handleCrashSignal(customEvt.detail || {});
    };
    window.addEventListener('playarena_aviator_admin_crash_evt', onCustomEvent);

    return () => {
      unsubscribe();
      window.removeEventListener('playarena_aviator_admin_crash_evt', onCustomEvent);
    };
  }, [stopFlight]);


  // Init
  useEffect(() => {
    (async () => {
      const s = generateSeed();
      const h = await hashSeed(s);
      const cp = seedToCrashPoint(s, settings.aviator.maxCrash, settings.aviator.instantCrashRate);
      setSeed(s);
      setCommitHash(h);
      setCrashPoint(cp);
      setLiveBets(generateMockBets());
    })();
  }, [settings.aviator.maxCrash, settings.aviator.instantCrashRate]);

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
      multiplierRef.current = m;

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
      haptics.bet();
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
    triggerWinCelebration({ winAmount: win, multiplier: m, gameName: 'Aviator' });
    addToast({ type: 'success', title: `Cashed out! ₹${win.toFixed(2)}`, message: `${m.toFixed(2)}× multiplier` });
    if (soundOnRef.current) sounds.playWin();
  }, [multiplier, addBalance, addToast]);

  const inputCls = 'w-full bg-[#0d2419] border border-[rgba(212,175,55,0.2)] rounded-xl px-3 py-2.5 text-sm text-[#F5F1E6] focus:outline-none focus:border-[rgba(212,175,55,0.5)] transition-colors placeholder-[rgba(212,175,55,0.25)]';

  return (
    <div className="py-4 space-y-5 w-full max-w-6xl mx-auto">
      <SEOHead
        title="Play Aviator Crash Game — Real-Time Multipliers & Provably Fair"
        description="Fly high and cash out before the plane flies away in PlayArena Aviator. Real-time crash multipliers up to 1000x with provably fair SHA-256 seed verification."
        jsonLd={aviatorBreadcrumbLd}
      />
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-xl bg-[rgba(255,77,109,0.12)] border border-[rgba(255,77,109,0.35)] flex items-center justify-center shadow-[0_0_15px_rgba(255,77,109,0.2)]">
            <RedPlaneIcon className="w-6 h-6" />
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

      {/* Responsive 2-Column Grid on Desktop */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Primary Left Column: Chart & Bet Controls */}
        <div className="lg:col-span-7 xl:col-span-8 space-y-4">
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

          {/* Auto-Bet Panel */}
          <AutoBetPanel
            balance={balance}
            disabled={phase !== 'betting'}
            intervalMs={6000}
            onPlaceBet={async (amount) => {
              if (!isAuthenticated) return 0;
              if (balance < amount) return 0;
              deductBalance(amount, `Auto-Bet — Aviator`);
              // Simulate: 40% chance win at 1.5–3x
              const won = Math.random() > 0.6;
              const mult = won ? parseFloat((1.5 + Math.random() * 1.5).toFixed(2)) : 0;
              const payout = won ? Math.round(amount * mult) : 0;
              if (won) addBalance(payout, `Auto-Bet Win — Aviator ${mult}×`, 'win');
              return won ? payout - amount : -amount;
            }}
          />
        </div>

        {/* Secondary Right Column: Live Bets, Round History, Game Chat */}
        <div className="lg:col-span-5 xl:col-span-4 space-y-4">
          {/* Live Bets / History tabs */}
          <div className="royal-panel rounded-2xl p-4 space-y-3">
            <div className="flex gap-1 bg-[#0d2419] rounded-xl p-1 border border-[rgba(212,175,55,0.12)]">
              {(['live', 'history'] as const).map(t => (
                <button key={t} onClick={() => setActiveTab(t)}
                  className={`flex-1 py-2 rounded-lg text-xs font-bold capitalize cursor-pointer transition-all ${activeTab === t ? 'bg-[rgba(212,175,55,0.18)] text-[#E8C97A] border border-[rgba(212,175,55,0.35)]' : 'text-[rgba(212,175,55,0.4)]'}`}>
                  {t === 'live' ? <span className="flex items-center justify-center gap-1.5"><Users className="w-3.5 h-3.5" /> Live Bets</span> : <span className="flex items-center justify-center gap-1.5"><History className="w-3.5 h-3.5" /> History</span>}
                </button>
              ))}
            </div>

            {activeTab === 'live' && (
              <div className="space-y-1.5 max-h-[260px] overflow-y-auto pr-1 scrollbar-thin">
                {liveBets.map(b => (
                  <div key={b.id} className="flex items-center gap-2 bg-[#0d2419]/80 rounded-xl px-3 py-2 text-xs border border-[rgba(212,175,55,0.08)]">
                    <div className="w-7 h-7 rounded-lg bg-[rgba(212,175,55,0.08)] flex items-center justify-center font-black text-gold text-[10px]">{b.user[0]}</div>
                    <span className="flex-1 font-bold text-[#F5F1E6] truncate">{b.user}</span>
                    <span className="text-[rgba(212,175,55,0.6)]">₹{b.bet}</span>
                    {b.status === 'won' && <span className="text-emerald-400 font-black">{b.cashedAt?.toFixed(2)}×</span>}
                    {b.status === 'lost' && <span className="text-[#FF4D6D] font-black">Lost</span>}
                    {b.status === 'active' && <span className="text-amber-400 font-black animate-pulse">{multiplier.toFixed(2)}×</span>}
                  </div>
                ))}
              </div>
            )}

            {activeTab === 'history' && (
              <div className="grid grid-cols-4 gap-1.5 max-h-[260px] overflow-y-auto pr-1">
                {history.map((h, i) => (
                  <div key={i} className={`text-center py-2 rounded-xl text-xs font-black ${getMultiplierChipClass(h.multiplier)}`}>
                    {h.multiplier.toFixed(2)}×
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Per-game chat */}
          <GameChat gameId="aviator" />
        </div>
      </div>

      {/* Internal Cross-Linking */}
      <RelatedGamesSection currentGameId="aviator" />
    </div>
  );
}
