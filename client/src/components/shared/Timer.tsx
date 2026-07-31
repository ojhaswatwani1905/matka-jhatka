import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

interface TimerProps {
  duration: number; // total seconds
  onComplete?: () => void;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

export default function Timer({ duration, onComplete, size = 'md', showLabel = true }: TimerProps) {
  const [timeLeft, setTimeLeft] = useState(duration);

  useEffect(() => {
    setTimeLeft(duration);
  }, [duration]);

  useEffect(() => {
    if (timeLeft <= 0) {
      setTimeout(() => onComplete?.(), 0);
      return;
    }

    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          setTimeout(() => onComplete?.(), 0);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [timeLeft, onComplete]);

  const progress = timeLeft / duration;
  const isUrgent = timeLeft <= 10;

  const sizeMap = {
    sm: { ring: 56, stroke: 3, text: 'text-lg', label: 'text-[9px]' },
    md: { ring: 80, stroke: 4, text: 'text-2xl', label: 'text-xs' },
    lg: { ring: 110, stroke: 5, text: 'text-3xl', label: 'text-sm' },
  };

  const s = sizeMap[size];
  const radius = (s.ring - s.stroke * 2) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - progress);

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative" style={{ width: s.ring, height: s.ring }}>
        {/* Background ring */}
        <svg className="w-full h-full -rotate-90" viewBox={`0 0 ${s.ring} ${s.ring}`}>
          <circle
            cx={s.ring / 2}
            cy={s.ring / 2}
            r={radius}
            fill="none"
            stroke="rgba(255,255,255,0.06)"
            strokeWidth={s.stroke}
          />
          <motion.circle
            cx={s.ring / 2}
            cy={s.ring / 2}
            r={radius}
            fill="none"
            stroke={isUrgent ? '#FF3B5C' : '#8B5CF6'}
            strokeWidth={s.stroke}
            strokeLinecap="round"
            strokeDasharray={circumference}
            animate={{ strokeDashoffset }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
          />
        </svg>

        {/* Time display */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <motion.span
            key={timeLeft}
            initial={{ scale: 1.2, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className={`${s.text} font-bold font-heading tabular-nums ${
              isUrgent ? 'text-neon-red' : 'text-white'
            }`}
          >
            {minutes > 0 ? `${minutes}:${String(seconds).padStart(2, '0')}` : seconds}
          </motion.span>
        </div>

        {/* Urgent glow */}
        {isUrgent && (
          <div className="absolute inset-0 rounded-full animate-pulse-glow" style={{
            boxShadow: '0 0 20px rgba(255, 59, 92, 0.3)',
          }} />
        )}
      </div>
      {showLabel && (
        <span className={`${s.label} text-navy-500 font-medium`}>
          {timeLeft > 0 ? 'Time Left' : 'Expired'}
        </span>
      )}
    </div>
  );
}
