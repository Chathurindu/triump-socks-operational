'use client';
import { cn } from '@/lib/utils';
import { ButtonHTMLAttributes, forwardRef } from 'react';

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline';
type Size    = 'xs' | 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  icon?: React.ReactNode;
}

const variants: Record<Variant, string> = {
  primary:   'bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white shadow-sm dark:bg-amber-500 dark:hover:bg-amber-600 dark:active:bg-amber-700 dark:text-white',
  secondary: 'bg-gray-100 hover:bg-gray-200 active:bg-gray-300 text-gray-800 dark:bg-slate-700 dark:hover:bg-slate-600 dark:active:bg-slate-500 dark:text-gray-100',
  danger:    'bg-red-600 hover:bg-red-700 active:bg-red-800 text-white dark:bg-red-500 dark:hover:bg-red-600 dark:active:bg-red-700 dark:text-white',
  ghost:     'bg-transparent hover:bg-gray-100 active:bg-gray-200 text-gray-700 dark:hover:bg-white/10 dark:active:bg-white/15 dark:text-gray-200',
  outline:   'border border-gray-300 dark:border-slate-500 hover:bg-gray-50 dark:hover:bg-white/5 active:bg-gray-100 dark:active:bg-white/10 text-gray-700 dark:text-gray-200',
};

const sizes: Record<Size, string> = {
  xs: 'px-2 py-1 text-xs gap-1',
  sm: 'px-2.5 py-1.5 text-xs gap-1.5',
  md: 'px-3.5 py-2 text-sm gap-2',
  lg: 'px-5 py-2.5 text-sm gap-2',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', loading, icon, children, className, disabled, ...props }, ref) => (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cn(
        'inline-flex items-center justify-center font-medium rounded-lg transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/50 active:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100 select-none',
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    >
      {loading ? (
        <svg className="animate-spin h-3.5 w-3.5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
        </svg>
      ) : icon}
      {children}
    </button>
  )
);

Button.displayName = 'Button';
