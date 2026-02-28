import { cn } from '@/lib/utils';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  title?: string;
  action?: React.ReactNode;
  noPad?: boolean;
}

export function Card({ children, className, title, action, noPad }: CardProps) {
  return (
    <div className={cn('triumph-card', className)}>
      {(title || action) && (
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-700">
          {title && <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200">{title}</h3>}
          {action && <div className="flex items-center gap-2">{action}</div>}
        </div>
      )}
      <div className={cn(!noPad && 'p-4')}>{children}</div>
    </div>
  );
}

export function CardGrid({ children, cols = 4, className }: {
  children: React.ReactNode;
  cols?: 2 | 3 | 4 | 5;
  className?: string;
}) {
  const colMap = { 2: 'grid-cols-1 sm:grid-cols-2', 3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3', 4: 'grid-cols-2 sm:grid-cols-2 lg:grid-cols-4', 5: 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-5' };
  return <div className={cn('grid gap-4', colMap[cols], className)}>{children}</div>;
}
