import { useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';

interface SpinWheelProps {
  isOpen: boolean;
  onClose: () => void;
  onSpin: (reward: number) => void;
  canSpin: boolean;
  cooldownLeft: string; // "4h 12m" or ""
}

/* ─── Segment config ─────────────────────────────────────────────── */
const SEGMENTS = [
  { label: '₹50',    reward: 50,    color: '#2ECC71', probability: 0.30 },
  { label: '₹100',   reward: 100,   color: '#3498db', probability: 0.25 },
  { label: '₹200',   reward: 200,   color: '#9b59b6', probability: 0.18 },
  { label: '₹500',   reward: 500,   color: '#D4AF37', probability: 0.12 },
  { label: '₹25',    reward: 25,    color: '#e67e22', probability: 0.08 },
  { label: '₹1,000', reward: 1000,  color: '#e74c3c', probability: 0.05 },
  { label: '₹10',    reward: 10,    color: '#1abc9c', probability: 0.015 },
  { label: '₹5,000', reward: 5000,  color: '#FF4D6D', probability: 0.005 },
];

function weightedRandom(): number {
  const r = Math.random();
  let cumulative = 0;
  for (let i = 0; i < SEGMENTS.length; i++) {
    cumulative += SEGMENTS[i].probability;
    if (r < cumulative) return i;
  }
  return 0;
}

const TOTAL = SEGMENTS.length;
const SLICE_DEG = 360 / TOTAL;

export { SEGMENTS };

export function SpinWheelModal({ isOpen, onClose, onSpin, canSpin, cooldownLeft }: SpinWheelProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rotationRef = useRef(0);
  const animRef = useRef<number>();
  const isSpinningRef = useRef(false);

  const drawWheel = useCallback((rotation: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const W = canvas.width, H = canvas.height;
    const cx = W / 2, cy = H / 2, r = W / 2 - 8;
    ctx.clearRect(0, 0, W, H);

    // Outer glow ring
    const grd = ctx.createRadialGradient(cx, cy, r - 10, cx, cy, r + 5);
    grd.addColorStop(0, 'rgba(212,175,55,0.6)');
    grd.addColorStop(1, 'rgba(212,175,55,0)');
    ctx.beginPath(); ctx.arc(cx, cy, r + 5, 0, Math.PI * 2);
    ctx.fillStyle = grd; ctx.fill();

    SEGMENTS.forEach((seg, i) => {
      const start = ((i * SLICE_DEG) + rotation) * (Math.PI / 180);
      const end = (((i + 1) * SLICE_DEG) + rotation) * (Math.PI / 180);

      // Slice
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, r, start, end);
      ctx.closePath();
      ctx.fillStyle = seg.color;
      ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,0.3)';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Text
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(start + (SLICE_DEG / 2) * (Math.PI / 180));
      ctx.textAlign = 'right';
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 11px sans-serif';
      ctx.fillText(seg.label, r - 10, 4);
      ctx.restore();
    });

    // Center hub
    const hubGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, 24);
    hubGrad.addColorStop(0, '#F5D576');
    hubGrad.addColorStop(1, '#B8860B');
    ctx.beginPath(); ctx.arc(cx, cy, 24, 0, Math.PI * 2);
    ctx.fillStyle = hubGrad; ctx.fill();
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = '#0B2318';
    ctx.font = 'bold 10px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('SPIN', cx, cy);
  }, []);

  useEffect(() => {
    if (isOpen) drawWheel(rotationRef.current);
  }, [isOpen, drawWheel]);

  const spin = useCallback(() => {
    if (isSpinningRef.current || !canSpin) return;
    isSpinningRef.current = true;

    const targetSegmentIdx = weightedRandom();
    // Calculate target rotation: spin 5-8 full turns + land exactly on segment
    const extraSpins = (5 + Math.floor(Math.random() * 4)) * 360;
    const segCenter = targetSegmentIdx * SLICE_DEG + SLICE_DEG / 2;
    // Pointer is at top (270°), so we need 270° - segCenter to land segment at top
    const needed = ((270 - segCenter) % 360 + 360) % 360;
    const targetRot = rotationRef.current + extraSpins + needed - (rotationRef.current % 360);

    const duration = 4500;
    const startTime = performance.now();
    const startRot = rotationRef.current;

    function easeOut(t: number) { return 1 - Math.pow(1 - t, 4); }

    function animate(now: number) {
      const elapsed = now - startTime;
      const t = Math.min(elapsed / duration, 1);
      rotationRef.current = startRot + (targetRot - startRot) * easeOut(t);
      drawWheel(rotationRef.current);

      if (t < 1) {
        animRef.current = requestAnimationFrame(animate);
      } else {
        isSpinningRef.current = false;
        const reward = SEGMENTS[targetSegmentIdx].reward;
        onSpin(reward);
        confetti({ particleCount: 100, spread: 70, origin: { y: 0.3 }, colors: ['#D4AF37', '#2ECC71', '#FF4D6D'] });
      }
    }
    animRef.current = requestAnimationFrame(animate);
  }, [canSpin, drawWheel, onSpin]);

  useEffect(() => () => { if (animRef.current) cancelAnimationFrame(animRef.current); }, []);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)' }}
          onClick={e => { if (e.target === e.currentTarget) onClose(); }}
        >
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
            className="royal-panel rounded-3xl p-6 w-full max-w-sm space-y-5 relative overflow-hidden"
          >
            {/* Gold top border */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-[#D4AF37] to-transparent" />

            <div className="text-center">
              <h2 className="text-xl font-black text-[#E8C97A] font-heading">🎰 Daily Spin</h2>
              <p className="text-xs text-[rgba(212,175,55,0.5)] mt-1">Spin once every 24 hours — free rewards!</p>
            </div>

            {/* Pointer */}
            <div className="relative flex justify-center">
              <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1 z-10 w-0 h-0"
                style={{
                  borderLeft: '8px solid transparent',
                  borderRight: '8px solid transparent',
                  borderTop: '20px solid #D4AF37',
                  filter: 'drop-shadow(0 2px 4px rgba(212,175,55,0.5))',
                }} />
              <canvas ref={canvasRef} width={280} height={280} className="cursor-pointer" onClick={spin} />
            </div>

            {/* CTA */}
            {canSpin ? (
              <button onClick={spin} disabled={isSpinningRef.current}
                className="btn-royal-gold w-full py-3.5 rounded-xl font-black text-sm cursor-pointer">
                🎰 Spin Now — Free!
              </button>
            ) : (
              <div className="text-center space-y-1">
                <p className="text-xs font-bold text-[rgba(212,175,55,0.5)]">Next spin available in</p>
                <p className="text-lg font-black text-gold font-heading">⏱ {cooldownLeft}</p>
                <p className="text-[10px] text-[rgba(212,175,55,0.35)]">Come back tomorrow for another spin!</p>
              </div>
            )}

            {/* Segment rewards legend */}
            <div className="grid grid-cols-4 gap-1.5">
              {SEGMENTS.map(s => (
                <div key={s.label} className="text-center py-1.5 rounded-xl text-[9px] font-bold"
                  style={{ background: `${s.color}22`, color: s.color, border: `1px solid ${s.color}44` }}>
                  {s.label}
                </div>
              ))}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
