'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Home, ArrowLeft, Search, Frown } from 'lucide-react';

/* Floating yarn thread particle */
function YarnParticle({ delay, x, size }: { delay: number; x: number; size: number }) {
  return (
    <div
      className="absolute rounded-full opacity-20 dark:opacity-10"
      style={{
        width: size,
        height: size,
        left: `${x}%`,
        bottom: '-20px',
        background: `hsl(${35 + Math.random() * 20}, 90%, 55%)`,
        animation: `float-up ${6 + Math.random() * 4}s ease-in-out ${delay}s infinite`,
      }}
    />
  );
}

export default function NotFound() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden bg-gradient-to-br from-slate-50 via-amber-50/30 to-slate-100 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950">
      {/* Background grid pattern */}
      <div
        className="absolute inset-0 opacity-[0.03] dark:opacity-[0.05]"
        style={{
          backgroundImage: `linear-gradient(rgba(0,0,0,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.1) 1px, transparent 1px)`,
          backgroundSize: '40px 40px',
        }}
      />

      {/* Floating particles */}
      {mounted && Array.from({ length: 12 }).map((_, i) => (
        <YarnParticle key={i} delay={i * 0.5} x={5 + (i * 8)} size={6 + Math.random() * 10} />
      ))}

      {/* Glowing orb background */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-amber-400/10 dark:bg-amber-500/5 blur-[100px] pointer-events-none" />

      {/* Content */}
      <div className={`relative z-10 text-center px-6 transition-all duration-1000 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
        {/* Animated 404 number */}
        <div className="relative mb-6">
          <h1
            className="text-[10rem] sm:text-[14rem] font-black leading-none tracking-tighter select-none"
            style={{
              background: 'linear-gradient(135deg, #d97706, #f59e0b, #fbbf24, #d97706)',
              backgroundSize: '300% 300%',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              animation: 'gradient-shift 4s ease infinite',
            }}
          >
            404
          </h1>
          {/* Sock icon bouncing in the 0 */}
          <div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
            style={{ animation: 'bounce-gentle 2s ease-in-out infinite' }}
          >
            <span className="text-5xl sm:text-7xl select-none" role="img" aria-label="sock">🧦</span>
          </div>
        </div>

        {/* Sad face icon */}
        <div
          className={`flex justify-center mb-4 transition-all duration-700 delay-300 ${mounted ? 'opacity-100 scale-100' : 'opacity-0 scale-50'}`}
        >
          <div className="w-14 h-14 rounded-2xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center"
            style={{ animation: 'wiggle 3s ease-in-out infinite' }}>
            <Frown size={28} className="text-amber-600 dark:text-amber-400" />
          </div>
        </div>

        {/* Text */}
        <h2
          className={`text-2xl sm:text-3xl font-bold text-slate-800 dark:text-slate-100 mb-3 transition-all duration-700 delay-500 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
        >
          Oops! This page got lost
        </h2>
        <p
          className={`text-sm sm:text-base text-slate-500 dark:text-slate-400 max-w-md mx-auto mb-8 leading-relaxed transition-all duration-700 delay-700 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
        >
          Looks like this thread unraveled. The page you&apos;re looking for doesn&apos;t exist or has been moved to a different shelf.
        </p>

        {/* Action buttons */}
        {/* <div
          className={`flex flex-col sm:flex-row items-center justify-center gap-3 transition-all duration-700 delay-[900ms] ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
        >
          <Link
            href="/dashboard"
            className="group flex items-center gap-2 px-6 py-3 bg-amber-600 hover:bg-amber-700 text-white text-sm font-semibold rounded-xl shadow-lg shadow-amber-500/20 hover:shadow-xl hover:shadow-amber-500/30 transition-all duration-300 hover:-translate-y-0.5"
          >
            <Home size={16} className="transition-transform group-hover:-translate-x-0.5" />
            Go to Dashboard
          </Link>
          <button
            onClick={() => window.history.back()}
            className="group flex items-center gap-2 px-6 py-3 bg-white dark:bg-gray-800 hover:bg-slate-50 dark:hover:bg-gray-700 text-slate-700 dark:text-slate-200 text-sm font-semibold rounded-xl border border-slate-200 dark:border-gray-700 shadow-sm hover:shadow transition-all duration-300 hover:-translate-y-0.5"
          >
            <ArrowLeft size={16} className="transition-transform group-hover:-translate-x-1" />
            Go Back
          </button>
        </div> */}

        {/* Helpful links */}
        {/* <div
          className={`mt-12 flex flex-wrap justify-center gap-4 text-xs text-slate-400 dark:text-slate-500 transition-all duration-700 delay-[1100ms] ${mounted ? 'opacity-100' : 'opacity-0'}`}
        >
          <span className="text-slate-300 dark:text-slate-600">Quick links:</span>
          {[
            { href: '/dashboard', label: 'Dashboard' },
            { href: '/inventory', label: 'Inventory' },
            { href: '/production', label: 'Production' },
            { href: '/sales', label: 'Sales' },
            { href: '/hr/employees', label: 'HR' },
            { href: '/finance', label: 'Finance' },
          ].map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="hover:text-amber-600 dark:hover:text-amber-400 transition-colors underline underline-offset-2"
            >
              {link.label}
            </Link>
          ))}
        </div> */}
      </div>

      {/* Triumph branding */}
      <div
        className={`absolute bottom-6 text-center transition-all duration-700 delay-[1300ms] ${mounted ? 'opacity-100' : 'opacity-0'}`}
      >
        <div className="flex items-center justify-center gap-2 text-xs text-slate-400 dark:text-slate-500">
          <div className="w-5 h-5 rounded-md bg-amber-600 flex items-center justify-center">
            <span className="text-white font-bold text-[0.5rem]">TS</span>
          </div>
          Triumph Socks — Enterprise Management System
        </div>
      </div>

      {/* Animations */}
      <style jsx>{`
        @keyframes float-up {
          0%, 100% { transform: translateY(0) rotate(0deg); opacity: 0; }
          10% { opacity: 0.2; }
          90% { opacity: 0.2; }
          50% { transform: translateY(-100vh) rotate(360deg); }
        }
        @keyframes gradient-shift {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
        @keyframes bounce-gentle {
          0%, 100% { transform: translate(-50%, -50%) translateY(0); }
          50% { transform: translate(-50%, -50%) translateY(-12px); }
        }
        @keyframes wiggle {
          0%, 100% { transform: rotate(0deg); }
          25% { transform: rotate(-5deg); }
          75% { transform: rotate(5deg); }
        }
      `}</style>
    </div>
  );
}
