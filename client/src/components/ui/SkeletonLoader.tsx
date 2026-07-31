import { cn } from '../../lib/utils';

interface SkeletonProps {
  className?: string;
  variant?: 'text' | 'circular' | 'rectangular' | 'rounded';
  width?: string | number;
  height?: string | number;
  lines?: number;
}

function SkeletonLine({ className, width, height, variant = 'rounded' }: Omit<SkeletonProps, 'lines'>) {
  const variantStyles = {
    text: 'rounded-md',
    circular: 'rounded-full',
    rectangular: 'rounded-none',
    rounded: 'rounded-[var(--radius-md)]',
  };

  return (
    <div
      className={cn('skeleton', variantStyles[variant], className)}
      style={{
        width: width || '100%',
        height: height || (variant === 'text' ? '16px' : '48px'),
      }}
    />
  );
}

export default function SkeletonLoader({ lines = 1, ...props }: SkeletonProps) {
  if (lines > 1) {
    return (
      <div className="space-y-3">
        {Array.from({ length: lines }).map((_, i) => (
          <SkeletonLine
            key={i}
            {...props}
            width={i === lines - 1 ? '60%' : '100%'}
            variant="text"
          />
        ))}
      </div>
    );
  }

  return <SkeletonLine {...props} />;
}

// Preset skeleton patterns
export function GameCardSkeleton() {
  return (
    <div className="bg-surface border border-border rounded-[var(--radius-lg)] p-4 space-y-3">
      <SkeletonLoader variant="rounded" height={120} />
      <SkeletonLoader variant="text" width="70%" />
      <SkeletonLoader variant="text" width="40%" />
    </div>
  );
}

export function WalletCardSkeleton() {
  return (
    <div className="bg-surface border border-border rounded-[var(--radius-xl)] p-6 space-y-4">
      <SkeletonLoader variant="text" width="30%" />
      <SkeletonLoader variant="text" height={32} width="50%" />
      <div className="flex gap-3 mt-4">
        <SkeletonLoader variant="rounded" height={44} />
        <SkeletonLoader variant="rounded" height={44} />
      </div>
    </div>
  );
}

export function TableRowSkeleton({ cols = 4 }: { cols?: number }) {
  return (
    <div className="flex items-center gap-4 p-4">
      {Array.from({ length: cols }).map((_, i) => (
        <SkeletonLoader key={i} variant="text" height={14} />
      ))}
    </div>
  );
}
