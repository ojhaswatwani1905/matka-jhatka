import type { InputHTMLAttributes } from 'react';
import { forwardRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Eye, EyeOff } from 'lucide-react';
import { cn } from '../../lib/utils';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, icon, rightIcon, type, className, ...props }, ref) => {
    const [showPassword, setShowPassword] = useState(false);
    const isPassword = type === 'password';

    return (
      <div className="w-full">
        {label && (
          <label className="block text-xs font-bold text-[rgba(212,175,55,0.75)] mb-1.5">{label}</label>
        )}
        <div className="relative group">
          {icon && (
            <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[rgba(212,175,55,0.45)] group-focus-within:text-gold transition-colors">
              {icon}
            </div>
          )}
          <input
            ref={ref}
            type={isPassword && showPassword ? 'text' : type}
            className={cn(
              'w-full bg-[#0E2A1E] border border-[rgba(212,175,55,0.25)] rounded-xl px-4 py-3 text-[#F5F1E6] text-sm',
              'placeholder:text-[rgba(212,175,55,0.3)] transition-all duration-200',
              'focus:outline-none focus:border-[#D4AF37] focus:ring-1 focus:ring-[rgba(212,175,55,0.3)]',
              'hover:border-[rgba(212,175,55,0.4)]',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              icon ? 'pl-10' : undefined,
              (isPassword || rightIcon) ? 'pr-12' : undefined,
              error ? 'border-[rgba(255,77,109,0.5)] focus:border-[rgba(255,77,109,0.7)] focus:ring-[rgba(255,77,109,0.2)]' : undefined,
              className
            )}
            {...props}
          />
          {isPassword && (
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[rgba(212,175,55,0.45)] hover:text-gold transition-colors cursor-pointer"
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          )}
          {rightIcon && !isPassword && (
            <div className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[rgba(212,175,55,0.45)]">
              {rightIcon}
            </div>
          )}
        </div>
        {error && (
          <motion.p
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-1.5 text-xs text-[#FF4D6D]"
          >
            {error}
          </motion.p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
export default Input;
