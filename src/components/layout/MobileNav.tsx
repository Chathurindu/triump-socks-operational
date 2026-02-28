'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, Package, Users, DollarSign, Settings
} from 'lucide-react';

const tabs = [
  { href: '/dashboard',  label: 'Home',      Icon: LayoutDashboard },
  { href: '/inventory',  label: 'Stock',     Icon: Package },
  { href: '/hr/employees', label: 'HR',       Icon: Users },
  { href: '/finance',    label: 'Finance',   Icon: DollarSign },
  { href: '/settings',   label: 'Settings',  Icon: Settings },
];

export default function MobileNav() {
  const pathname = usePathname();

  return (
    <nav className="mobile-bottom-nav md:hidden">
      {tabs.map(({ href, label, Icon }) => {
        const active = pathname === href || pathname.startsWith(href + '/');
        return (
          <Link key={href} href={href} className={`mobile-tab-btn ${active ? 'active' : ''}`}>
            <span className="tab-icon-wrap">
              <Icon size={18} strokeWidth={active ? 2.2 : 1.8} />
            </span>
            <span>{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
