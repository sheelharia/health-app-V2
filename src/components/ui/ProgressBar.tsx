import { clsx } from 'clsx';

interface ProgressBarProps {
  value: number; // 0-100
  color?: 'teal' | 'orange' | 'red' | 'green';
  size?: 'sm' | 'md';
  className?: string;
}

export function ProgressBar({ value, color = 'teal', size = 'md', className }: ProgressBarProps) {
  const colors = {
    teal: 'bg-brand-600',
    green: 'bg-green-500',
    orange: 'bg-orange-500',
    red: 'bg-red-500',
  };

  const sizes = {
    sm: 'h-1.5',
    md: 'h-3',
  };

  return (
    <div className={clsx('w-full bg-gray-200 rounded-full overflow-hidden', sizes[size], className)}>
      <div
        className={clsx('h-full rounded-full transition-all duration-500', colors[color])}
        style={{ width: `${Math.min(Math.max(value, 0), 100)}%` }}
      />
    </div>
  );
}
