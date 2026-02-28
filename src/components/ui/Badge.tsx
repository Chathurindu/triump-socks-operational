import { cn, statusColor } from '@/lib/utils';

interface BadgeProps {
  status?: string;
  label?: string;
  variant?: 'status' | 'outline' | 'solid';
  className?: string;
  color?: 'amber' | 'blue' | 'green' | 'red' | 'gray' | 'purple';
}

const colorMap = {
  amber:  'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  blue:   'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  green:  'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  red:    'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  gray:   'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400',
  purple: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
};

export function Badge({ status, label, variant = 'status', color, className }: BadgeProps) {
  const text = label ?? status ?? '';
  const cls  = variant === 'status' && status
    ? statusColor(status)
    : color
      ? colorMap[color]
      : colorMap.gray;

  return (
    <span className={cn(
      'inline-flex items-center px-1.5 py-0.5 rounded-md text-[0.68rem] font-medium',
      cls,
      className,
    )}>
      {text.replace(/_/g, ' ')}
    </span>
  );
}
