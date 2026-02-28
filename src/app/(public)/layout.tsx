import type { Metadata } from 'next';
import PublicNavbar from '@/components/public/PublicNavbar';
import PublicFooter from '@/components/public/PublicFooter';

export const metadata: Metadata = {
  title: 'Triumph Socks — Premium Quality Socks',
  description: 'Triumph Socks manufactures and exports premium quality socks for every occasion. Wholesale, retail, and custom orders welcome.',
};

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-white dark:bg-gray-950">
      <PublicNavbar />
      <main className="flex-1">{children}</main>
      <PublicFooter />
    </div>
  );
}
