'use client';
import { useState, useEffect, FormEvent } from 'react';
import { signIn, useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import Image from 'next/image';
import { ThemeToggle } from '@/components/ui/ThemeToggle';

export default function LoginPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [email, setEmail]         = useState('');
  const [password, setPassword]   = useState('');
  const [showPw, setShowPw]       = useState(false);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState('');

  /* If already authenticated, redirect to dashboard */
  useEffect(() => {
    if (status === 'authenticated') {
      router.replace('/dashboard');
    }
  }, [status, router]);

  /* Show nothing while checking session */
  if (status === 'loading' || status === 'authenticated') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
        <Loader2 size={24} className="animate-spin text-amber-600" />
      </div>
    );
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');

    const res = await signIn('credentials', {
      email,
      password,
      redirect: false,
    });

    setLoading(false);
    if (res?.ok) {
      router.push('/dashboard');
    } else {
      setError('Invalid email or password. Please try again.');
    }
  }

  return (
    <div className="min-h-screen flex bg-gray-50 dark:bg-gray-950">
      {/* Left brand panel */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between p-10 relative overflow-hidden"
           style={{ background: 'linear-gradient(135deg,#1a1f2e 0%,#2d3448 100%)' }}>
        <div className="absolute inset-0 opacity-10" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23fff' fill-opacity='1' fill-rule='evenodd'%3E%3Ccircle cx='30' cy='30' r='2'/%3E%3C/g%3E%3C/svg%3E")`,
        }} />
        <div className="relative">
          <div className="flex items-center gap-3 mb-12">
            <Image src="/logo.jpeg" alt="Triumph Socks" width={40} height={40} className="rounded-xl" />
            <div>
              <p className="text-white font-black text-lg leading-tight">Triumph Socks</p>
              <p className="text-gray-400 text-xs">Enterprise Management System</p>
            </div>
          </div>

          <h2 className="text-4xl font-black text-white leading-tight mb-4">
            Manage your entire<br />
            <span className="text-amber-400">socks empire</span><br />
            from one place.
          </h2>
          <p className="text-gray-400 text-sm leading-relaxed max-w-sm">
            Track production, inventory, HR, finance, and analytics—all in a single
            powerful platform built for Triumph Socks.
          </p>
        </div>

        <div className="relative grid grid-cols-3 gap-3">
          {[
            { label: 'Employees', value: '15+' },
            { label: 'Products',  value: '11' },
            { label: 'Machines',  value: '8' },
          ].map((s) => (
            <div key={s.label} className="bg-white/10 rounded-xl p-3 text-center">
              <p className="text-white font-black text-xl">{s.value}</p>
              <p className="text-gray-400 text-xs">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Right login form */}
      <div className="w-full lg:w-1/2 flex flex-col">
        <div className="flex justify-end p-4">
          <div className="flex items-center gap-3">
            <a href="/" className="text-xs text-gray-500 hover:text-gray-800 dark:hover:text-gray-200 transition-colors">
              ← View Website
            </a>
            <ThemeToggle />
          </div>
        </div>

        <div className="flex-1 flex items-center justify-center px-8 py-6">
          <div className="w-full max-w-sm">
            <div className="mb-7">
              <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">Sign in to your account</h1>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Use your assigned credentials to continue</p>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-xs text-red-700 dark:text-red-400">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="triumph-label">Email address</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@triumphsocks.com"
                  className="triumph-input"
                  autoComplete="email"
                />
              </div>

              <div>
                <label className="triumph-label">Password</label>
                <div className="relative">
                  <input
                    type={showPw ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="triumph-input pr-10"
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    tabIndex={-1}
                    onClick={() => setShowPw(!showPw)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-amber-600 hover:bg-amber-700 text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-60 disabled:cursor-not-allowed mt-2"
              >
                {loading && <Loader2 size={14} className="animate-spin" />}
                {loading ? 'Signing in…' : 'Sign In'}
              </button>
            </form>

            {/* Demo accounts */}
            <div className="mt-6 p-3 bg-gray-50 dark:bg-gray-800/60 rounded-lg border border-gray-200 dark:border-gray-700">
              <p className="text-[0.68rem] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
                Demo Accounts (password: password123)
              </p>
              <div className="space-y-1">
                {[
                  ['admin@triumphsocks.com',   'Admin'],
                  ['manager@triumphsocks.com', 'Manager'],
                  ['hr@triumphsocks.com',       'HR'],
                  ['finance@triumphsocks.com',  'Finance'],
                ].map(([e, r]) => (
                  <button
                    key={e}
                    type="button"
                    onClick={() => { setEmail(e); setPassword('password123'); }}
                    className="w-full flex items-center justify-between px-2 py-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  >
                    <span className="text-xs text-gray-600 dark:text-gray-300">{e}</span>
                    <span className="text-[0.65rem] text-amber-600 dark:text-amber-400 font-medium">{r}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
