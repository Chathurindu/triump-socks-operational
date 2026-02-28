'use client';
import { Bell, Search } from 'lucide-react';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { usePathname } from 'next/navigation';

const pageTitles: Record<string, string> = {
  '/dashboard':    'Dashboard',
  '/inventory':    'Inventory Management',
  '/production':   'Production Orders',
  '/purchases':    'Purchase Orders',
  '/sales':        'Sales Orders',
  '/suppliers':    'Suppliers',
  '/customers':    'Customers',
  '/machines':     'Machines',
  '/hr/employees': 'Employees',
  '/hr/attendance':'Attendance',
  '/hr/payroll':   'Payroll',
  '/hr/leave':     'Leave Management',
  '/finance':      'Finance & Accounts',
  '/analytics':    'Analytics & Insights',
  '/settings':     'Settings',
};

export function TopBar() {
  const pathname = usePathname();
  const title = pageTitles[pathname] ?? 'Triumph Socks';

  return (
    <header
      className="fixed top-0 right-0 z-20 flex items-center justify-between px-5 border-b border-gray-200 dark:border-[var(--dark-border)] bg-white/95 dark:bg-[rgba(7,16,30,0.92)] backdrop-blur-md"
      style={{ left: 'var(--sidebar-width)', height: 'var(--header-height)' }}
    >
      <div className="flex items-center gap-3">
        <h1 className="text-sm font-semibold text-gray-800 dark:text-gray-200">{title}</h1>
      </div>

      <div className="flex items-center gap-2">
        {/* Search */}
        <div className="relative hidden sm:block">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            placeholder="Quick search…"
            className="pl-8 pr-3 py-1.5 text-xs w-48 triumph-input"
          />
        </div>

        {/* Notifications */}
        <button className="relative w-8 h-8 flex items-center justify-center rounded-lg text-gray-500 hover:text-gray-800 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800 transition-colors">
          <Bell size={15} />
          <span className="absolute top-1 right-1 w-2 h-2 bg-amber-500 rounded-full border border-white dark:border-gray-900" />
        </button>

        <ThemeToggle />
      </div>
    </header>
  );
}
