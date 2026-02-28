import Link from 'next/link';
import Image from 'next/image';
import { getAllSettings, getServices } from '@/lib/cms';

export default async function PublicFooter() {
  const [settings, services] = await Promise.all([getAllSettings(), getServices()]);

  const siteName = settings.site_name || 'Triumph Socks';
  const tagline = settings.site_tagline || 'Premium Sock Manufacturer';
  const address = settings.footer_address || '289, Maligathanna, Veyangoda, Sri Lanka';
  const phone = settings.footer_phone || '+94 77 000 0000';
  const email = settings.footer_email || 'info@triumphsocks.com';
  const footerText = settings.footer_text || `© ${new Date().getFullYear()} Triumph Socks. All rights reserved.`;
  const socials = [
    { key: 'social_facebook', icon: 'Facebook' },
    { key: 'social_instagram', icon: 'Instagram' },
    { key: 'social_twitter', icon: 'X / Twitter' },
    { key: 'social_linkedin', icon: 'LinkedIn' },
    { key: 'social_youtube', icon: 'YouTube' },
    { key: 'social_tiktok', icon: 'TikTok' },
  ].filter(s => settings[s.key]);

  return (
    <footer className="bg-gray-900 text-gray-300">
      <div className="max-w-7xl mx-auto px-6 py-12 grid grid-cols-1 md:grid-cols-4 gap-8">
        {/* Brand — from CMS settings */}
        <div className="col-span-1 md:col-span-2">
          <div className="flex items-center gap-2 mb-3">
            <Image src="/logo.jpeg" alt="Triumph Socks" width={36} height={36} className="rounded-lg" />
            <span className="font-bold text-white text-lg">{siteName}</span>
          </div>
          <p className="text-sm leading-relaxed text-gray-300 max-w-sm">
            {tagline}. Manufacturing premium quality socks since 2005, proudly made in Sri Lanka.
          </p>
          <div className="mt-4 text-sm text-gray-400">
            <p>📍 {address}</p>
            <p className="mt-1">📞 {phone}</p>
            <p className="mt-1">✉️ {email}</p>
          </div>
          {socials.length > 0 && (
            <div className="flex gap-3 mt-4">
              {socials.map((s) => (
                <a key={s.key} href={settings[s.key]} target="_blank" rel="noopener noreferrer" className="text-xs text-gray-400 hover:text-amber-400 transition-colors">
                  {s.icon}
                </a>
              ))}
            </div>
          )}
        </div>

        {/* Quick links */}
        <div>
          <h3 className="font-semibold text-white mb-3 text-sm">Quick Links</h3>
          <ul className="space-y-2 text-sm">
            {[['Home', '/'], ['Products', '/products'], ['About Us', '/about'], ['Contact', '/contact']].map(([label, href]) => (
              <li key={href}><Link href={href} className="hover:text-amber-400 transition-colors">{label}</Link></li>
            ))}
          </ul>
        </div>

        {/* Services — from CMS */}
        <div>
          <h3 className="font-semibold text-white mb-3 text-sm">Services</h3>
          <ul className="space-y-2 text-sm text-gray-400">
            {services.length > 0
              ? services.map((s) => <li key={s.id}>{s.title}</li>)
              : ['Bulk Manufacturing', 'Custom Branding', 'Private Label', 'Export Services', 'Wholesale Supply'].map(s => <li key={s}>{s}</li>)
            }
          </ul>
        </div>
      </div>

      <div className="border-t border-gray-800 max-w-7xl mx-auto px-6 py-4 flex flex-col md:flex-row items-center justify-between text-xs text-gray-400 gap-2">
        <span>{footerText}</span>
        <span>Designed for excellence in every stitch.</span>
      </div>
    </footer>
  );
}
