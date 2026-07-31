import type { ReactNode } from 'react';
import { motion, type HTMLMotionProps } from 'framer-motion';
import { cn } from '../../lib/utils';

interface CardProps extends HTMLMotionProps<'div'> {
  children: ReactNode;
  variant?: 'default' | 'glass' | 'gradient' | 'elevated';
  hover?: boolean;
  glow?: 'gold' | 'green' | 'red' | 'violet' | 'none';
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

const paddingStyles = {
  none: '',
  sm: 'p-3',
  md: 'p-4 sm:p-5',
  lg: 'p-6 sm:p-8',
};

export default function Card({
  children,
  variant = 'default',
  hover = true,
  glow = 'none',
  padding = 'md',
  className,
  ...props
}: CardProps) {
  const glowMap = {
    gold: 'glow-gold',
    green: 'glow-green',
    red: 'glow-red',
    violet: 'glow-violet',
    none: '',
  };

  const variantMap = {
    default: 'bg-surface border border-border rounded-[var(--radius-lg)]',
    glass: 'glass rounded-[var(--radius-lg)]',
    gradient: 'gradient-card border border-border rounded-[var(--radius-lg)]',
    elevated: 'bg-surface-light shadow-premium border border-border-light rounded-[var(--radius-lg)]',
  };

  return (
    <motion.div
      whileHover={hover ? { y: -4, transition: { duration: 0.2 } } : undefined}
      className={cn(
        variantMap[variant],
        paddingStyles[padding],
        glowMap[glow],
        'transition-shadow duration-300',
        className
      )}
      {...props}
    >
      {children}
    </motion.div>
  );
}
