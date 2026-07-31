import { forwardRef } from 'react';
import { motion, type HTMLMotionProps } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import { cn } from '../../lib/utils';

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline' | 'neon-green' | 'neon-red' | 'violet';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends Omit<HTMLMotionProps<'button'>, 'children'> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  fullWidth?: boolean;
  children: React.ReactNode;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary: 'bg-gradient-to-r from-gold to-gold-dark text-navy-950 font-bold shadow-lg hover:shadow-gold/25',
  secondary: 'bg-surface-light text-white border border-border-light hover:bg-surface-lighter',
  danger: 'bg-gradient-to-r from-neon-red to-neon-red-dark text-white font-bold',
  ghost: 'bg-transparent text-white hover:bg-white/5',
  outline: 'bg-transparent text-violet-light border border-violet/30 hover:bg-violet/10',
  'neon-green': 'bg-gradient-to-r from-neon-green to-neon-green-dark text-navy-950 font-bold',
  'neon-red': 'bg-gradient-to-r from-neon-red to-neon-red-dark text-white font-bold',
  violet: 'bg-gradient-to-r from-violet to-violet-dark text-white font-bold',
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: 'px-4 py-2 text-sm rounded-lg',
  md: 'px-6 py-3 text-base rounded-xl',
  lg: 'px-8 py-4 text-lg rounded-2xl',
};

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', isLoading, fullWidth, className, children, disabled, ...props }, ref) => {
    return (
      <motion.button
        ref={ref}
        whileHover={{ scale: disabled || isLoading ? 1 : 1.02, y: disabled || isLoading ? 0 : -1 }}
        whileTap={{ scale: disabled || isLoading ? 1 : 0.97 }}
        transition={{ type: 'spring', stiffness: 400, damping: 17 }}
        className={cn(
          'relative inline-flex items-center justify-center gap-2 font-semibold transition-all duration-200 cursor-pointer select-none',
          variantStyles[variant],
          sizeStyles[size],
          fullWidth && 'w-full',
          (disabled || isLoading) && 'opacity-50 cursor-not-allowed',
          className
        )}
        disabled={disabled || isLoading}
        {...props}
      >
        {isLoading && <Loader2 className="w-5 h-5 animate-spin" />}
        {children}
      </motion.button>
    );
  }
);

Button.displayName = 'Button';
export default Button;
