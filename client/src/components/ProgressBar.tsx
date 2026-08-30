import clsx from 'clsx';

interface Props {
  value: number; // 0-100
  status?: 'waiting' | 'downloading' | 'paused' | 'completed' | 'failed' | 'cancelled' | 'parsing';
  showStripe?: boolean;
  size?: 'sm' | 'md';
}

export function ProgressBar({ value, status = 'downloading', showStripe, size = 'md' }: Props) {
  const v = Math.min(100, Math.max(0, value));
  const isActive = status === 'downloading' || status === 'parsing';
  return (
    <div
      className={clsx(
        'w-full overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800',
        size === 'sm' ? 'h-1.5' : 'h-2',
      )}
    >
      <div
        className={clsx(
          'h-full rounded-full transition-all duration-300 ease-out',
          status === 'completed' && 'bg-emerald-500',
          status === 'failed' && 'bg-red-500',
          status === 'cancelled' && 'bg-zinc-400',
          status === 'paused' && 'bg-orange-500',
          (status === 'downloading' || status === 'parsing' || status === 'waiting') && 'bg-brand-500',
          isActive && showStripe !== false && 'progress-striped',
        )}
        style={{ width: `${v}%` }}
      />
    </div>
  );
}