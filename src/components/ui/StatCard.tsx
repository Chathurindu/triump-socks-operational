import { cn } from '@/lib/utils';
import { LucideIcon, TrendingDown, TrendingUp } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  change?: number;
  icon: LucideIcon;
  iconColor?: string;
  description?: string;
  prefix?: string;
  animDelay?: string; // e.g. 'anim-d1', 'anim-d2'
}

export function StatCard({ title, value, change, icon: Icon, iconColor = 'amber', description, prefix, animDelay }: StatCardProps) {
  const iconBg: Record<string, string> = {
    amber:  'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400',
    blue:   'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
    green:  'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400',
    red:    'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400',
    purple: 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400',
    gray:   'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
  };

  const isPositive = (change ?? 0) >= 0;

  return (
    <div className={cn('triumph-card p-4 flex flex-col gap-3 anim-fade-up', animDelay)}>
      <div className="flex items-start justify-between">
        <div className={cn('p-2 rounded-lg', iconBg[iconColor] ?? iconBg.amber)}>
          <Icon size={16} />
        </div>
        {change !== undefined && (
          <span className={cn(
            'inline-flex items-center gap-0.5 text-[0.68rem] font-medium px-1.5 py-0.5 rounded-md',
            isPositive
              ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
              : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
          )}>
            {isPositive ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
            {Math.abs(change).toFixed(1)}%
          </span>
        )}
      </div>
      <div>
        <p className="text-[0.7rem] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">{title}</p>
        <p className="text-xl font-bold text-gray-900 dark:text-gray-100 stat-value mt-0.5">
          {prefix}{typeof value === 'number' ? value.toLocaleString() : value}
        </p>
        {description && (
          <p className="text-[0.7rem] text-gray-400 dark:text-gray-500 mt-0.5">{description}</p>
        )}
      </div>
    </div>
  );
}
