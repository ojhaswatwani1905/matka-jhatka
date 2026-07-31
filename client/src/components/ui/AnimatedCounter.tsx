import { useEffect, useState } from 'react';
import { useSpring, useMotionValue } from 'framer-motion';

interface AnimatedCounterProps {
  value: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  duration?: number;
  className?: string;
}

export default function AnimatedCounter({
  value,
  prefix = '',
  suffix = '',
  decimals = 0,
  duration = 1.5,
  className = '',
}: AnimatedCounterProps) {
  const motionValue = useMotionValue(0);
  const spring = useSpring(motionValue, {
    stiffness: 50,
    damping: 20,
    duration: duration * 1000,
  });

  const [displayValue, setDisplayValue] = useState(() => {
    const num = decimals > 0 ? (value || 0).toFixed(decimals) : Math.floor(value || 0).toLocaleString('en-IN');
    return `${prefix}${num}${suffix}`;
  });

  useEffect(() => {
    motionValue.set(value);
  }, [value, motionValue]);

  useEffect(() => {
    const unsubscribe = spring.on('change', (latest) => {
      const val = typeof latest === 'number' && !isNaN(latest) ? latest : 0;
      const num = decimals > 0
        ? val.toFixed(decimals)
        : Math.floor(val).toLocaleString('en-IN');
      setDisplayValue(`${prefix}${num}${suffix}`);
    });
    return () => unsubscribe();
  }, [spring, prefix, suffix, decimals]);

  return <span className={className}>{displayValue}</span>;
}
