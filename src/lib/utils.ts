import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { format, formatDistanceToNow, parseISO } from 'date-fns';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number, symbol = 'Rs') {
  return `${symbol}${new Intl.NumberFormat('en-BD', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)}`;
}

export function formatNumber(num: number) {
  return new Intl.NumberFormat('en-BD').format(num);
}

export function formatDate(dateStr: string | Date, fmt = 'dd MMM yyyy') {
  try {
    const d = typeof dateStr === 'string' ? parseISO(dateStr) : dateStr;
    return format(d, fmt);
  } catch {
    return String(dateStr);
  }
}

export function timeAgo(dateStr: string) {
  try {
    return formatDistanceToNow(parseISO(dateStr), { addSuffix: true });
  } catch {
    return dateStr;
  }
}

export function getInitials(name: string) {
  return name
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

export function statusColor(status: string): string {
  const map: Record<string, string> = {
    active:      'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    present:     'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    completed:   'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    delivered:   'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    paid:        'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    operational: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    received:    'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    in_progress: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    shipped:     'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    confirmed:   'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    partial:     'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    pending:     'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    planned:     'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    late:        'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
    'on-leave':  'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
    absent:      'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    cancelled:   'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    terminated:  'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    retired:     'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    unpaid:      'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    maintenance: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
    idle:        'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400',
  };
  return map[status] ?? 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400';
}

export function getMonthName(month: number) {
  return new Date(2000, month - 1).toLocaleString('default', { month: 'long' });
}

export function calculateGrowth(current: number, previous: number) {
  if (previous === 0) return 100;
  return ((current - previous) / previous) * 100;
}

export function slugify(text: string) {
  return text.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]/g, '');
}

export function truncate(text: string, length = 40) {
  if (text.length <= length) return text;
  return text.slice(0, length) + '…';
}
