import { useEffect, useRef, useState } from 'react';

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
  duration = 1200,
  className = '',
}: AnimatedCounterProps) {
  const [display, setDisplay] = useState(() => format(value, decimals, prefix, suffix));
  const rafRef    = useRef<number | null>(null);
  const startRef  = useRef<number | null>(null);
  const fromRef   = useRef(value);

  function format(v: number, d: number, pre: string, suf: string) {
    const num = d > 0 ? v.toFixed(d) : Math.floor(v).toLocaleString('en-IN');
    return `${pre}${num}${suf}`;
  }

  useEffect(() => {
    const from  = fromRef.current;
    const to    = value;
    if (from === to) return;

    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    startRef.current = null;

    const step = (timestamp: number) => {
      if (!startRef.current) startRef.current = timestamp;
      const elapsed  = timestamp - startRef.current;
      const progress = Math.min(elapsed / duration, 1);
      // ease out cubic
      const eased    = 1 - Math.pow(1 - progress, 3);
      const current  = from + (to - from) * eased;
      setDisplay(format(current, decimals, prefix, suffix));

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(step);
      } else {
        fromRef.current = to;
        setDisplay(format(to, decimals, prefix, suffix));
      }
    };

    rafRef.current = requestAnimationFrame(step);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [value, decimals, prefix, suffix, duration]);

  return <span className={className}>{display}</span>;
}
