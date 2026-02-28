import Link from 'next/link';

export default function PublicFooter() {
  return (
    <footer className="bg-gray-900 text-gray-300">
      <div className="max-w-7xl mx-auto px-6 py-12 grid grid-cols-1 md:grid-cols-4 gap-8">
        {/* Brand */}
        <div className="col-span-1 md:col-span-2">
          <div className="flex items-center gap-2 mb-3">
            <span className="w-9 h-9 rounded-lg bg-amber-600 flex items-center justify-center text-white font-bold text-sm">TS</span>
            <span className="font-bold text-white text-lg">Triumph Socks</span>
          </div>
          <p className="text-sm leading-relaxed text-gray-400 max-w-sm">
            Manufacturing premium quality socks since 2005, proudly made in Sri Lanka. Trusted by retailers, wholesalers, and distributors worldwide.
          </p>
          <div className="mt-4 text-sm text-gray-500">
            <p>📍 289, Maligathanna, Veyangoda, Sri Lanka</p>
            <p className="mt-1">📞 +94 77 000 0000</p>
            <p className="mt-1">✉️ info@triumphsocks.com</p>
          </div>
        </div>

        {/* Quick links */}
        <div>
          <h4 className="font-semibold text-white mb-3 text-sm">Quick Links</h4>
          <ul className="space-y-2 text-sm">
            {[['Home', '/'], ['Products', '/products'], ['About Us', '/about'], ['Contact', '/contact']].map(([label, href]) => (
              <li key={href}><Link href={href} className="hover:text-amber-400 transition-colors">{label}</Link></li>
            ))}
          </ul>
        </div>

        {/* Services */}
        <div>
          <h4 className="font-semibold text-white mb-3 text-sm">Services</h4>
          <ul className="space-y-2 text-sm text-gray-400">
            <li>Bulk Manufacturing</li>
            <li>Custom Branding</li>
            <li>Private Label</li>
            <li>Export Services</li>
            <li>Wholesale Supply</li>
          </ul>
        </div>
      </div>

      <div className="border-t border-gray-800 max-w-7xl mx-auto px-6 py-4 flex flex-col md:flex-row items-center justify-between text-xs text-gray-500 gap-2">
        <span>© {new Date().getFullYear()} Triumph Socks, Veyangoda, Sri Lanka. All rights reserved.</span>
        <span>Designed for excellence in every stitch.</span>
      </div>
    </footer>
  );
}
