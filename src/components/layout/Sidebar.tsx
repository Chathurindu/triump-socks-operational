'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, Package, Factory, Users, DollarSign,
  BarChart3, Settings, ShoppingCart, Truck, Wrench,
  ChevronDown, CircleUserRound, LogOut, Landmark,
  Shield, Globe, Activity,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { signOut, useSession } from 'next-auth/react';
import { useState } from 'react';
import { getInitials } from '@/lib/utils';

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  {
    label: 'Operations', icon: Factory, children: [
      { href: '/production', label: 'Production', icon: Factory },
      { href: '/inventory',  label: 'Inventory',  icon: Package },
      { href: '/machines',   label: 'Machines',   icon: Wrench },
    ],
  },
  {
    label: 'Trade', icon: ShoppingCart, children: [
      { href: '/purchases', label: 'Purchases', icon: ShoppingCart },
      { href: '/sales',     label: 'Sales',     icon: Truck },
      { href: '/suppliers', label: 'Suppliers',  icon: CircleUserRound },
      { href: '/customers', label: 'Customers',  icon: CircleUserRound },
    ],
  },
  {
    label: 'Human Resources', icon: Users, children: [
      { href: '/hr/employees',  label: 'Employees',  icon: Users },
      { href: '/hr/attendance', label: 'Attendance', icon: Users },
      { href: '/hr/payroll',    label: 'Payroll',    icon: DollarSign },
      { href: '/hr/leave',      label: 'Leave',      icon: Users },
    ],
  },
  { href: '/finance',   label: 'Finance',   icon: DollarSign },
  { href: '/finance/tax-calculator', label: 'Tax Calculator', icon: Landmark },
  { href: '/analytics', label: 'Analytics', icon: BarChart3 },
  {
    label: 'Administration', icon: Shield, children: [
      { href: '/admin/users',    label: 'User Management', icon: Users },
      { href: '/admin/cms',      label: 'Website CMS',     icon: Globe },
      { href: '/admin/activity', label: 'Activity Logs',   icon: Activity },
    ],
  },
  { href: '/settings',  label: 'Settings',  icon: Settings },
];

type NavChild = { href: string; label: string; icon: typeof LayoutDashboard };
type NavGroup = { label: string; icon: typeof LayoutDashboard; children: NavChild[] };
type NavSingle = { href: string; label: string; icon: typeof LayoutDashboard };

function isGroup(item: NavSingle | NavGroup): item is NavGroup {
  return 'children' in item;
}

export function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [openGroup, setOpenGroup] = useState<string | null>(
    navItems.find((n) => isGroup(n) && n.children.some((c) => pathname.startsWith(c.href))) ? 
    (navItems.find((n) => isGroup(n) && n.children.some((c) => pathname.startsWith(c.href))) as NavGroup)?.label ?? null
    : null
  );

  return (
    <aside
      style={{ width: 'var(--sidebar-width)' }}
      className="fixed top-0 left-0 h-full flex flex-col z-30 overflow-hidden"
    >
      <div className="flex flex-col h-full sidebar-bg">
        {/* Logo */}
        <div className="px-4 py-3.5 border-b border-white/10 flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-amber-600 flex items-center justify-center flex-shrink-0">
              <span className="text-white font-bold text-xs">TS</span>
            </div>
            <div>
              <p className="text-white font-bold text-sm leading-tight">Triumph Socks</p>
              <p className="text-gray-400 text-[0.62rem]">Operations</p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-0.5">
          {navItems.map((item) => {
            if (isGroup(item)) {
              const isOpen = openGroup === item.label;
              const GroupIcon = item.icon;
              return (
                <div key={item.label}>
                  <button
                    onClick={() => setOpenGroup(isOpen ? null : item.label)}
                    className="sidebar-link w-full justify-between"
                  >
                    <span className="flex items-center gap-2.5">
                      <GroupIcon size={14} />
                      {item.label}
                    </span>
                    <ChevronDown size={12} className={cn('transition-transform', isOpen && 'rotate-180')} />
                  </button>
                  {isOpen && (
                    <div className="ml-4 mt-0.5 space-y-0.5 border-l border-white/10 pl-3">
                      {item.children.map((child) => {
                        const ChildIcon = child.icon;
                        return (
                          <Link
                            key={child.href}
                            href={child.href}
                            className={cn('sidebar-link', pathname.startsWith(child.href) && 'active')}
                          >
                            <ChildIcon size={13} />
                            {child.label}
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            }
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn('sidebar-link', pathname === item.href && 'active')}
              >
                <Icon size={14} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* User */}
        <div className="px-3 py-3 border-t border-white/10 flex-shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-amber-600 flex items-center justify-center flex-shrink-0">
              <span className="text-white text-[0.6rem] font-bold">
                {getInitials(session?.user?.name ?? 'User')}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-xs font-medium truncate">{session?.user?.name}</p>
              <p className="text-gray-400 text-[0.6rem] capitalize">{(session?.user as any)?.role ?? 'Staff'}</p>
            </div>
            <button
              onClick={() => signOut({ callbackUrl: '/login' })}
              className="text-gray-400 hover:text-gray-200 transition-colors"
              title="Sign out"
            >
              <LogOut size={13} />
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
}
