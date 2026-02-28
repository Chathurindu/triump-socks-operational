import type { Metadata } from 'next';
import PublicNavbar from '@/components/public/PublicNavbar';
import PublicFooter from '@/components/public/PublicFooter';
import { getSettings } from '@/lib/cms';

export async function generateMetadata(): Promise<Metadata> {
  const s = await getSettings(['seo_default_title', 'seo_default_description', 'seo_og_image', 'site_name']);
  return {
    title: s.seo_default_title || s.site_name || 'Triumph Socks — Premium Quality Socks',
    description: s.seo_default_description || 'Triumph Socks manufactures and exports premium quality socks.',
    openGraph: s.seo_og_image ? { images: [s.seo_og_image] } : undefined,
  };
}

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-white dark:bg-gray-950">
      <PublicNavbar />
      <main className="flex-1">{children}</main>
      <PublicFooter />
    </div>
  );
}
