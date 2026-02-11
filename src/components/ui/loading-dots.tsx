'use client';

import { cn } from '@/lib/utils';

const sizeClasses = {
  sm: 'h-1.5 w-1.5',
  md: 'h-2 w-2',
  lg: 'h-2.5 w-2.5',
};

/**
 * Loading dots indicator (three bouncing dots). Use this instead of spinners
 * for consistent loading UX across the app.
 */
export function LoadingDots({
  className,
  size = 'md',
  style,
}: {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  style?: React.CSSProperties;
}) {
  const dotClass = sizeClasses[size];
  return (
    <span
      className={cn('inline-flex items-center justify-center gap-1', className)}
      role="status"
      aria-label="Loading"
      style={style}
    >
      <span className={cn('rounded-full bg-current animate-loading-dots-bounce', dotClass)} />
      <span
        className={cn('rounded-full bg-current animate-loading-dots-bounce', dotClass)}
        style={{ animationDelay: '0.2s' }}
      />
      <span
        className={cn('rounded-full bg-current animate-loading-dots-bounce', dotClass)}
        style={{ animationDelay: '0.4s' }}
      />
    </span>
  );
}
