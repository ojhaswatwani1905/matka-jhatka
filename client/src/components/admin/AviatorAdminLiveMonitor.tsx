import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Zap, AlertOctagon, Eye, Activity, RotateCcw } from 'lucide-react';
import { aviatorSync, type AviatorLiveState } from '../../lib/aviatorSync';
import { useToast } from '../ui/Toast';
import { formatCurrency } from '../../lib/utils';
import { RedPlaneIcon } from '../../pages/games/AviatorPage';

export function AviatorAdminLiveMonitor() {
  const { addToast } = useToast();
  const [liveState, setLiveState] = useState<AviatorLiveState | null>(null);
  const [force100x, setForce100x] = useState(false);
  const [customTarget, setCustomTarget] = useState<string>('');
  const [isCrashing, setIsCrashing] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const startTimeRef = useRef<number>(0);

  // Subscribe to live state updates
  useEffect(() => {
    const unsub = aviatorSync.subscribeToState((state) => {
      setLiveState(state);
    });

    const current = aviatorSync.getCurrentState();
    if (current) setLiveState(current);

    const override = aviatorSync.getAdminOverride();
    if (override.forceNext100xCrash) setForce100x(true);
    if (override.forcedTargetMultiplier) setCustomTarget(String(override.forcedTargetMultiplier));

    return unsub;
  }, []);

  // Update canvas timer ref
  useEffect(() => {
    if (liveState?.phase === 'betting') {
      startTimeRef.current = 0;
    } else if (liveState?.phase === 'flying' && startTimeRef.current === 0) {
      startTimeRef.current = Date.now();
    }
  }, [liveState?.phase]);

  // Live Canvas Preview Render Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const parent = canvas.parentElement;
    if (!parent) return;

    let animId: number;

    const render = () => {
      const W = parent.clientWidth || 480;
      const H = parent.clientHeight || 220;
      if (canvas.width !== W || canvas.height !== H) {
        canvas.width = W;
        canvas.height = H;
      }

      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.clearRect(0, 0, W, H);

      const phase = liveState?.phase || 'betting';
      const multiplier = liveState?.multiplier || 1.00;
      const crashed = phase === 'crashed';

      const originX = 0;
      const originY = H;

      if (phase === 'betting') {
        // Flat runway line
        ctx.beginPath();
        ctx.strokeStyle = 'rgba(212,175,55,0.4)';
        ctx.lineWidth = 3;
        ctx.moveTo(0, H - 20);
        ctx.lineTo(80, H - 20);
        ctx.stroke();

        // Small stationary plane
        ctx.save();
        ctx.translate(75, H - 24);
        ctx.fillStyle = '#FF1744';
        ctx.beginPath();
        ctx.moveTo(14, 0);
        ctx.lineTo(-12, -7);
        ctx.lineTo(-6, 0);
        ctx.lineTo(-12, 7);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
        return;
      }

      if (startTimeRef.current === 0) startTimeRef.current = Date.now();
      const elapsed = (Date.now() - startTimeRef.current) / 1000;

      const progressX = Math.min(0.90, 0.20 + (elapsed / 3.0) * 0.70);
      const rawRatio = Math.max(0, (multiplier - 1.0) / 2.2);
      const progressY = Math.min(0.82, Math.pow(rawRatio, 0.52) * 0.72 + 0.10);

      const targetX = progressX * W;
      const targetY = H - progressY * H;
      const controlX = targetX * 0.60;
      const controlY = originY;

      // Fill area under flight curve
      ctx.beginPath();
      ctx.moveTo(originX, originY);
      ctx.quadraticCurveTo(controlX, controlY, targetX, targetY);
      ctx.lineTo(targetX, originY);
      ctx.closePath();

      const fillGrad = ctx.createLinearGradient(0, targetY, 0, originY);
      if (crashed) {
        fillGrad.addColorStop(0, 'rgba(255, 77, 109, 0.65)');
        fillGrad.addColorStop(1, 'rgba(255, 77, 109, 0.05)');
      } else {
        fillGrad.addColorStop(0, 'rgba(212, 175, 55, 0.65)');
        fillGrad.addColorStop(1, 'rgba(212, 175, 55, 0.05)');
      }
      ctx.fillStyle = fillGrad;
      ctx.fill();

      // Dash drop line to floor
      ctx.beginPath();
      ctx.strokeStyle = crashed ? 'rgba(255, 77, 109, 0.7)' : 'rgba(212, 175, 55, 0.7)';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 4]);
      ctx.moveTo(targetX, targetY);
      ctx.lineTo(targetX, originY);
      ctx.stroke();
      ctx.setLineDash([]);

      // Glowing flight curve
      ctx.beginPath();
      ctx.strokeStyle = crashed ? '#FF4D6D' : '#FFE57F';
      ctx.lineWidth = 3.5;
      ctx.lineCap = 'round';
      ctx.moveTo(originX, originY);
      ctx.quadraticCurveTo(controlX, controlY, targetX, targetY);
      ctx.stroke();

      // Jet icon on trajectory tip
      ctx.save();
      ctx.translate(targetX, targetY);
      const angle = Math.atan2(targetY - controlY, targetX - controlX) * 0.5 - 0.2;
      ctx.rotate(angle);

      // Jet flame
      if (!crashed) {
        ctx.beginPath();
        ctx.moveTo(-16, -2);
        ctx.lineTo(-24 - Math.random() * 8, 0);
        ctx.lineTo(-16, 2);
        ctx.closePath();
        ctx.fillStyle = '#FF9100';
        ctx.shadowColor = '#FF6D00';
        ctx.shadowBlur = 8;
        ctx.fill();
        ctx.shadowBlur = 0;
      }

      // Jet body
      ctx.beginPath();
      ctx.moveTo(18, 0);
      ctx.quadraticCurveTo(6, -6, -14, -4);
      ctx.lineTo(-14, 4);
      ctx.quadraticCurveTo(6, 6, 18, 0);
      ctx.closePath();
      ctx.fillStyle = crashed ? '#990022' : '#FF1744';
      ctx.shadowColor = crashed ? 'rgba(255, 77, 109, 0.8)' : 'rgba(255, 23, 68, 0.8)';
      ctx.shadowBlur = 10;
      ctx.fill();
      ctx.shadowBlur = 0;

      // Jet wing
      ctx.beginPath();
      ctx.moveTo(4, -1);
      ctx.lineTo(-8, -14);
      ctx.lineTo(-11, -12);
      ctx.lineTo(-4, -1);
      ctx.closePath();
      ctx.fillStyle = '#CC0029';
      ctx.fill();

      ctx.restore();

      if (phase === 'flying') {
        animId = requestAnimationFrame(render);
      }
    };

    render();

    return () => {
      if (animId) cancelAnimationFrame(animId);
    };
  }, [liveState]);

  // Handle Instant Crash
  const handleInstantCrash = () => {
    setIsCrashing(true);
    const currentMult = liveState?.phase === 'flying' ? liveState.multiplier : 1.00;

    // Trigger instant crash via sync engine across all tabs & backend
    aviatorSync.triggerAdminInstantCrash(currentMult);

    addToast({
      type: 'error',
      title: `💥 INSTANT CRASH TRIGGERED!`,
      message: `Aviator flight terminated at ${currentMult.toFixed(2)}×. All player screens crashed immediately.`,
    });

    setTimeout(() => {
      setIsCrashing(false);
    }, 1200);
  };

  // Toggle Force 1.00x next round
  const handleToggleForce100x = () => {
    const nextVal = !force100x;
    setForce100x(nextVal);
    aviatorSync.setAdminOverride({
      forceNext100xCrash: nextVal,
      forcedTargetMultiplier: nextVal ? 1.00 : customTarget ? parseFloat(customTarget) : null,
    });

    addToast({
      type: nextVal ? 'warning' : 'info',
      title: nextVal ? '⚡ Force 1.00x Crash ACTIVE' : 'Standard Flight Restored',
      message: nextVal
        ? 'Next Aviator round will immediately crash at 1.00x on takeoff.'
        : 'Next round will use standard RNG crash rules.',
    });
  };

  // Set custom target multiplier
  const handleApplyCustomTarget = (targetVal: number) => {
    setCustomTarget(String(targetVal));
    setForce100x(false);
    aviatorSync.setAdminOverride({
      forceNext100xCrash: false,
      forcedTargetMultiplier: targetVal,
    });

    addToast({
      type: 'success',
      title: `🎯 Next Crash Set to ${targetVal.toFixed(2)}×`,
      message: `Next round will fly up to exactly ${targetVal.toFixed(2)}× before terminating.`,
    });
  };

  // Clear all overrides
  const handleClearOverride = () => {
    setForce100x(false);
    setCustomTarget('');
    aviatorSync.clearAdminOverride();
    addToast({
      type: 'info',
      title: 'Overrides Cleared',
      message: 'Aviator will operate under normal RTP settings.',
    });
  };

  const phase = liveState?.phase || 'betting';
  const multiplier = liveState?.multiplier || 1.00;
  const isFlying = phase === 'flying';
  const isBetting = phase === 'betting';
  const isCrashed = phase === 'crashed';

  const totalBetsVolume = (liveState?.liveBets || []).reduce((acc, b) => acc + b.bet, 0);
  const activeBetsCount = (liveState?.liveBets || []).length;
  const currentHouseLiability = isFlying
    ? (liveState?.liveBets || [])
        .filter((b) => b.status === 'active')
        .reduce((acc, b) => acc + b.bet * multiplier, 0)
    : 0;

  return (
    <div className="royal-panel rounded-2xl p-5 border border-[rgba(212,175,55,0.25)] bg-gradient-to-b from-[#081f14] to-[#04120a] shadow-2xl space-y-5">
      {/* Top Header with Live Flight Radar Status */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[rgba(212,175,55,0.12)] pb-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-rose-600/20 to-amber-600/20 border border-rose-500/40 flex items-center justify-center shadow-[0_0_15px_rgba(244,63,94,0.25)]">
            <RedPlaneIcon className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-black text-[#E8C97A] font-heading tracking-wide">
                Aviator Real-Time Cockpit & Killswitch
              </h2>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-black bg-rose-500/20 border border-rose-500/40 text-rose-300">
                LIVE INTERCEPT
              </span>
            </div>
            <p className="text-xs text-[rgba(212,175,55,0.6)]">
              Real-time user flight preview & authoritative manual crash override controls
            </p>
          </div>
        </div>

        {/* Live Status Badge */}
        <div className="flex items-center gap-2">
          {isFlying && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-black shadow-[0_0_15px_rgba(16,185,129,0.3)] animate-pulse">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
              <span>IN FLIGHT · {multiplier.toFixed(2)}×</span>
            </div>
          )}
          {isBetting && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-amber-500/15 border border-amber-500/35 text-amber-300 text-xs font-black">
              <Activity className="w-3.5 h-3.5 animate-spin" />
              <span>BETTING COUNTDOWN · {liveState?.countdown ?? 5}s</span>
            </div>
          )}
          {isCrashed && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-300 text-xs font-black shadow-[0_0_12px_rgba(244,63,94,0.3)]">
              <AlertOctagon className="w-3.5 h-3.5" />
              <span>FLEW AWAY · {multiplier.toFixed(2)}×</span>
            </div>
          )}
        </div>
      </div>

      {/* Main Grid: Live Radar View vs Tactical Controls */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left Column: Live Visual Radar Chart (7 cols) */}
        <div className="lg:col-span-7 space-y-3">
          <div
            className="relative w-full rounded-2xl overflow-hidden border border-[rgba(212,175,55,0.25)] bg-[#030e09] shadow-inner flex flex-col justify-between"
            style={{ height: 240 }}
          >
            {/* Radar Grid Backdrop */}
            <div
              className="absolute inset-0 pointer-events-none opacity-20"
              style={{
                background:
                  'repeating-conic-gradient(from -30deg at 0% 100%, rgba(46,204,113,0.3) 0deg 8deg, transparent 8deg 16deg)',
              }}
            />

            {/* Top Info Bar inside Radar */}
            <div className="relative z-20 flex items-center justify-between p-3 text-[11px] font-mono text-[rgba(212,175,55,0.7)] bg-[#061510]/80 border-b border-[rgba(212,175,55,0.1)]">
              <div className="flex items-center gap-2">
                <Eye className="w-3.5 h-3.5 text-gold" />
                <span>Player View Stream</span>
              </div>
              <div className="flex items-center gap-3">
                <span>
                  Secret Target:{' '}
                  <strong className="text-gold font-bold">
                    {liveState?.crashPoint ? `${liveState.crashPoint.toFixed(2)}×` : 'Auto'}
                  </strong>
                </span>
                <span>
                  Pool: <strong className="text-emerald-400 font-bold">{formatCurrency(totalBetsVolume)}</strong>
                </span>
              </div>
            </div>

            {/* Interactive Canvas Plane Visual */}
            <canvas ref={canvasRef} className="w-full h-full relative z-10 block" />

            {/* Live Center Multiplier Overlay */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
              {isBetting && (
                <div className="text-center space-y-1">
                  <p className="text-[11px] text-amber-400/80 font-black uppercase tracking-widest">
                    ROUND TAKEOFF IN
                  </p>
                  <p className="text-4xl font-black font-heading text-gold animate-pulse">
                    {liveState?.countdown ?? 5}s
                  </p>
                </div>
              )}
              {(isFlying || isCrashed) && (
                <motion.div
                  key={phase}
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="text-center"
                >
                  <div
                    className={`text-5xl lg:text-6xl font-black font-heading tracking-tight ${
                      isCrashed ? 'text-[#FF4D6D]' : 'text-[#FFE57F]'
                    }`}
                    style={{
                      textShadow: isCrashed
                        ? '0 0 35px rgba(255,77,109,0.9)'
                        : '0 0 35px rgba(212,175,55,0.9)',
                    }}
                  >
                    {multiplier.toFixed(2)}×
                  </div>
                  {isCrashed && (
                    <p className="text-[#FF4D6D] font-black text-xs tracking-widest uppercase mt-1 animate-bounce">
                      💥 FLEW AWAY (CRASHED)
                    </p>
                  )}
                  {isFlying && (
                    <p className="text-emerald-400 font-bold text-[11px] tracking-wider uppercase mt-1">
                      ● LIVE FLIGHT ACTIVE
                    </p>
                  )}
                </motion.div>
              )}
            </div>

            {/* Bottom mini telemetry */}
            <div className="relative z-20 flex items-center justify-between p-2 px-3 text-[10px] font-mono text-[rgba(212,175,55,0.5)] bg-[#061510]/80 border-t border-[rgba(212,175,55,0.1)] truncate">
              <span>Hash: {liveState?.commitHash ? `${liveState.commitHash.slice(0, 24)}...` : 'Synchronizing...'}</span>
              <span>{activeBetsCount} active players in round</span>
            </div>
          </div>
        </div>

        {/* Right Column: High-Impact Killswitch & Override Controls (5 cols) */}
        <div className="lg:col-span-5 flex flex-col justify-between space-y-4">
          {/* 💥 BIG INSTANT CRASH BUTTON */}
          <div className="space-y-2">
            <button
              onClick={handleInstantCrash}
              disabled={!isFlying || isCrashing}
              className={`w-full py-4 px-4 rounded-2xl font-heading font-black text-base transition-all duration-200 flex items-center justify-center gap-3 shadow-2xl cursor-pointer ${
                isFlying
                  ? 'bg-gradient-to-r from-red-600 via-rose-600 to-red-700 text-white hover:from-red-500 hover:to-rose-600 border-2 border-red-400 shadow-[0_0_30px_rgba(239,68,68,0.7)] animate-pulse active:scale-[0.98]'
                  : 'bg-[#14231b] text-[rgba(212,175,55,0.3)] border border-[rgba(212,175,55,0.1)] cursor-not-allowed opacity-60'
              }`}
            >
              <AlertOctagon className={`w-6 h-6 ${isFlying ? 'animate-spin' : ''}`} />
              <div className="text-left">
                <div className="text-sm font-black tracking-wider uppercase">
                  {isCrashing
                    ? 'CRASHING NOW...'
                    : isFlying
                    ? `💥 CRASH NOW (${multiplier.toFixed(2)}×)`
                    : '💥 CRASH NOW (Instant Killswitch)'}
                </div>
                <div className="text-[10px] font-normal opacity-80 font-sans">
                  {isFlying
                    ? 'Instantly terminate flight & crash all player bets!'
                    : 'Armed and ready. Enables automatically upon takeoff.'}
                </div>
              </div>
            </button>
            <p className="text-[10px] text-center text-[rgba(212,175,55,0.4)]">
              ⚠️ Triggering instant crash terminates all live user rounds immediately with zero delay.
            </p>
          </div>

          {/* Quick Tactical Rigging / Forced Multipliers */}
          <div className="bg-[#061510] border border-[rgba(212,175,55,0.15)] rounded-xl p-3.5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#E8C97A] flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-gold" /> Next Round Target Override
              </span>
              {(force100x || customTarget) && (
                <button
                  onClick={handleClearOverride}
                  className="text-[10px] text-rose-400 hover:underline cursor-pointer flex items-center gap-1"
                >
                  <RotateCcw className="w-3 h-3" /> Reset Overrides
                </button>
              )}
            </div>

            {/* 1.00x Force Crash Toggle */}
            <div className="flex items-center justify-between p-2 rounded-lg bg-[#0d2419] border border-[rgba(212,175,55,0.1)]">
              <div>
                <span className="text-xs font-bold text-[#F5F1E6] block">⚡ Force 1.00× Instant Crash</span>
                <span className="text-[10px] text-[rgba(212,175,55,0.5)]">
                  Crashes at 0.0s upon takeoff (100% house profit)
                </span>
              </div>
              <button
                onClick={handleToggleForce100x}
                className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer ${
                  force100x
                    ? 'bg-red-500 text-white shadow-[0_0_12px_rgba(239,68,68,0.7)] ring-2 ring-red-300'
                    : 'bg-[#061510] text-[rgba(212,175,55,0.6)] border border-[rgba(212,175,55,0.2)] hover:text-gold'
                }`}
              >
                {force100x ? 'ARMED' : 'ARM'}
              </button>
            </div>

            {/* Custom Multiplier Quick Buttons */}
            <div>
              <label className="text-[10px] text-[rgba(212,175,55,0.5)] font-bold mb-1.5 block">
                Pre-Set Next Max Multiplier Cap:
              </label>
              <div className="grid grid-cols-4 gap-1.5">
                {[1.1, 1.25, 1.5, 2.0].map((val) => (
                  <button
                    key={val}
                    onClick={() => handleApplyCustomTarget(val)}
                    className={`py-1.5 rounded-lg text-xs font-mono font-black transition-all cursor-pointer ${
                      customTarget === String(val) && !force100x
                        ? 'btn-royal-gold shadow-[0_0_10px_rgba(212,175,55,0.4)]'
                        : 'bg-[#0d2419] border border-[rgba(212,175,55,0.15)] text-[rgba(212,175,55,0.7)] hover:text-gold'
                    }`}
                  >
                    {val.toFixed(2)}×
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Telemetry Summary Strip */}
          <div className="grid grid-cols-3 gap-2 text-center text-xs">
            <div className="p-2 rounded-xl bg-[#061510] border border-[rgba(212,175,55,0.1)]">
              <span className="text-[10px] text-[rgba(212,175,55,0.5)] block">Current Multiplier</span>
              <span className="font-mono font-black text-gold text-sm">{multiplier.toFixed(2)}×</span>
            </div>
            <div className="p-2 rounded-xl bg-[#061510] border border-[rgba(212,175,55,0.1)]">
              <span className="text-[10px] text-[rgba(212,175,55,0.5)] block">Active Bet Pool</span>
              <span className="font-mono font-black text-emerald-400 text-sm">
                {formatCurrency(totalBetsVolume)}
              </span>
            </div>
            <div className="p-2 rounded-xl bg-[#061510] border border-[rgba(212,175,55,0.1)]">
              <span className="text-[10px] text-[rgba(212,175,55,0.5)] block">House Liability</span>
              <span className="font-mono font-black text-rose-400 text-sm">
                {formatCurrency(currentHouseLiability)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
