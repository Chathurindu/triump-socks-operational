'use client';
import { usePathname } from 'next/navigation';
import Image from 'next/image';
import { Moon, Sun } from 'lucide-react';
import { useEffect, useState } from 'react';
import { NotificationCenter } from '@/components/layout/NotificationCenter';

const routeLabels: Record<string, string> = {
  '/dashboard':           'Dashboard',
  '/inventory':           'Inventory',
  '/production':          'Production',
  '/sales':               'Sales',
  '/purchases':           'Purchases',
  '/suppliers':           'Suppliers',
  '/customers':           'Customers',
  '/machines':            'Machines',
  '/finance':             'Finance',
  '/analytics':           'Analytics',
  '/settings':            'Settings',
  '/hr/employees':        'Employees',
  '/hr/attendance':       'Attendance',
  '/hr/payroll':          'Payroll',
  '/hr/leave':            'Leave',
};

export default function MobileHeader() {
  const pathname = usePathname();
  const [dark, setDark] = useState(false);

  useEffect(() => {
    setDark(document.documentElement.classList.contains('dark'));
  }, []);

  const toggleDark = () => {
    const isDark = document.documentElement.classList.toggle('dark');
    setDark(isDark);
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
  };

  const label = Object.entries(routeLabels)
    .find(([k]) => pathname === k || pathname.startsWith(k + '/'))
    ?.[1] ?? 'Triumph';

  return (
    <header className="mobile-header md:hidden">
      {/* Logo + title */}
      <div className="flex items-center gap-2.5">
        <Image src="/logo.jpeg" alt="Triumph Socks" width={28} height={28} className="rounded-lg shadow-sm" />
        <span className="font-semibold text-sm text-slate-800 dark:text-[var(--dark-text)]">
          {label}
        </span>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1">
        <button
          onClick={toggleDark}
          className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 dark:text-[var(--dark-text-2)] dark:hover:bg-[var(--dark-surface)] transition-colors"
        >
          {dark ? <Sun size={16} /> : <Moon size={16} />}
        </button>
        <NotificationCenter />
      </div>
    </header>
  );
}
