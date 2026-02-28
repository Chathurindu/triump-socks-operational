'use client';
import { useState } from 'react';
import Link from 'next/link';
import { Menu, X } from 'lucide-react';

const NAV = [
  { label: 'Home', href: '/' },
  { label: 'Products', href: '/products' },
  { label: 'About', href: '/about' },
  { label: 'Contact', href: '/contact' },
];

export default function PublicNavbar() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 bg-white/90 dark:bg-gray-900/90 backdrop-blur border-b border-gray-100 dark:border-gray-800">
      <div className="max-w-7xl mx-auto px-6 flex items-center justify-between h-16">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2">
          <span className="w-9 h-9 rounded-lg bg-amber-600 flex items-center justify-center text-white font-bold text-sm">TS</span>
          <span className="font-bold text-gray-800 dark:text-white text-lg">Triumph Socks</span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-6">
          {NAV.map((n) => (
            <Link key={n.href} href={n.href} className="text-sm text-gray-600 dark:text-gray-300 hover:text-amber-600 dark:hover:text-amber-400 font-medium transition-colors">{n.label}</Link>
          ))}
        </nav>

        {/* CTA */}
        <div className="hidden md:flex items-center gap-3">
          <Link href="/contact" className="text-sm font-medium px-4 py-2 rounded-lg border border-amber-600 text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors">Order Now</Link>
          <Link href="/login" className="text-sm font-medium px-4 py-2 rounded-lg bg-amber-600 text-white hover:bg-amber-700 transition-colors">Staff Login</Link>
        </div>

        {/* Mobile toggle */}
        <button onClick={() => setOpen(!open)} className="md:hidden p-2 text-gray-600 dark:text-gray-300">
          {open ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="md:hidden bg-white dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800 px-6 py-4 flex flex-col gap-4">
          {NAV.map((n) => (
            <Link key={n.href} href={n.href} onClick={() => setOpen(false)} className="text-sm text-gray-700 dark:text-gray-200 font-medium">{n.label}</Link>
          ))}
          <Link href="/contact" onClick={() => setOpen(false)} className="text-sm font-semibold text-amber-600">Order Now</Link>
          <Link href="/login" onClick={() => setOpen(false)} className="text-sm font-semibold text-gray-500">Staff Login</Link>
        </div>
      )}
    </header>
  );
}
