import { Sidebar } from '@/components/layout/Sidebar';
import { TopBar }  from '@/components/layout/TopBar';
import MobileHeader from '@/components/layout/MobileHeader';
import MobileNav    from '@/components/layout/MobileNav';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[var(--dark-bg)]">
      {/* ── Desktop layout ── */}
      <div className="desktop-sidebar">
        <Sidebar />
      </div>
      <div className="desktop-topbar">
        <TopBar />
      </div>
      <main
        className="desktop-main pt-14 min-h-screen"
        style={{ paddingLeft: 'var(--sidebar-width)' }}
      >
        <div className="p-5 page-content">{children}</div>
      </main>

      {/* ── Mobile layout ── */}
      <MobileHeader />
      <div className="mobile-content">
        <div className="page-content">{children}</div>
      </div>
      <MobileNav />
    </div>
  );
}

