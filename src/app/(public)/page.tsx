import Link from 'next/link';
import { db } from '@/lib/db';

async function getFeaturedProducts() {
  try {
    const { rows } = await db.query(`SELECT p.*, pc.name AS category_name FROM products p LEFT JOIN product_categories pc ON pc.id = p.category_id WHERE p.is_active = true ORDER BY p.name LIMIT 6`);
    return rows;
  } catch { return []; }
}

const STATS = [
  { value: '15+', label: 'Years of Experience' },
  { value: '50+', label: 'Product Variants' },
  { value: '500+', label: 'Happy Clients' },
  { value: '1M+', label: 'Pairs Sold' },
];

const FEATURES = [
  { icon: '🧵', title: 'Premium Materials', desc: 'We source only the finest cotton, wool, and synthetic blends for superior comfort.' },
  { icon: '🏭', title: 'Modern Factory', desc: 'State-of-the-art manufacturing equipment ensures consistent quality at scale.' },
  { icon: '📦', title: 'Bulk Orders', desc: 'Flexible MOQ for wholesale and retail clients. Fast turnaround times guaranteed.' },
  { icon: '🎨', title: 'Custom Branding', desc: 'Private label and custom design services for your brand identity.' },
  { icon: '🌍', title: 'Export Ready', desc: 'We export to 20+ countries with full compliance documentation.' },
  { icon: '♻️', title: 'Sustainable', desc: 'Committed to eco-friendly production processes and responsible sourcing.' },
];

export default async function HomePage() {
  const products = await getFeaturedProducts();

  return (
    <>
      {/* Hero */}
      <section className="bg-gradient-to-br from-gray-900 via-gray-800 to-amber-900 text-white">
        <div className="max-w-7xl mx-auto px-6 py-24 flex flex-col md:flex-row items-center gap-12">
          <div className="flex-1 anim-fade-up">
            <span className="inline-block bg-amber-600/20 text-amber-400 text-xs font-semibold px-3 py-1 rounded-full mb-4 tracking-wider uppercase anim-fade-in">Premium Sock Manufacturer — Sri Lanka</span>
            <h1 className="text-4xl md:text-6xl font-extrabold leading-tight mb-6">
              Step Into <span className="text-amber-400">Comfort</span> &amp; Style
            </h1>
            <p className="text-gray-300 text-lg mb-8 max-w-xl leading-relaxed">
              Triumph Socks crafts world-class socks for retail, wholesale, and custom orders. Proudly made in Sri Lanka and trusted by leading retailers and fashion brands worldwide.
            </p>
            <div className="flex flex-wrap gap-4">
              <Link href="/products" className="px-8 py-3 bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded-lg transition-colors text-sm">
                Explore Products
              </Link>
              <Link href="/contact" className="px-8 py-3 border border-white/30 hover:border-white text-white font-semibold rounded-lg transition-colors text-sm">
                Get a Quote
              </Link>
            </div>
          </div>

          {/* Hero visual */}
          <div className="flex-1 hidden md:flex justify-center anim-scale-in anim-d3">
            <div className="w-72 h-72 rounded-full bg-amber-600/10 border border-amber-600/20 flex items-center justify-center hover:scale-105 transition-transform duration-500">
              <span className="text-9xl">🧦</span>
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="bg-amber-600">
        <div className="max-w-7xl mx-auto px-6 py-10 grid grid-cols-2 md:grid-cols-4 gap-6">
          {STATS.map((s) => (
            <div key={s.label} className="text-center text-white">
              <div className="text-4xl font-extrabold">{s.value}</div>
              <div className="text-amber-100 text-sm mt-1">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="max-w-7xl mx-auto px-6 py-20">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white">Why Choose Triumph?</h2>
          <p className="text-gray-500 dark:text-gray-400 mt-3 max-w-xl mx-auto text-sm">Everything you need from a reliable sock manufacturer — quality, speed, and service.</p>
        </div>
        <div className="grid md:grid-cols-3 gap-6">
          {FEATURES.map((f, i) => (
            <div key={f.title} className={`p-6 rounded-2xl border border-gray-100 dark:border-gray-800 hover:shadow-lg hover:-translate-y-1 transition-all duration-300 anim-fade-up anim-d${Math.min(i+1,6)}`}>
              <div className="text-4xl mb-3">{f.icon}</div>
              <h3 className="font-semibold text-gray-800 dark:text-white mb-2">{f.title}</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Featured Products */}
      {products.length > 0 && (
        <section className="bg-gray-50 dark:bg-gray-900/50">
          <div className="max-w-7xl mx-auto px-6 py-20">
            <div className="flex items-center justify-between mb-10">
              <div>
                <h2 className="text-3xl font-bold text-gray-900 dark:text-white">Featured Products</h2>
                <p className="text-gray-500 dark:text-gray-400 mt-2 text-sm">Our best-selling socks loved by customers worldwide.</p>
              </div>
              <Link href="/products" className="text-sm font-semibold text-amber-600 hover:underline">View All →</Link>
            </div>
            <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-6">
              {products.map((p: any) => (
                <div key={p.id} className="bg-white dark:bg-gray-800 rounded-2xl overflow-hidden border border-gray-100 dark:border-gray-700 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group anim-fade-up">
                  <div className="h-44 bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-900/20 dark:to-amber-900/10 flex items-center justify-center">
                    <span className="text-7xl group-hover:scale-110 transition-transform">🧦</span>
                  </div>
                  <div className="p-4">
                    <span className="text-xs text-amber-600 font-medium uppercase tracking-wide">{p.category_name}</span>
                    <h3 className="font-semibold text-gray-800 dark:text-white mt-1">{p.name}</h3>
                    <p className="text-xs text-gray-400 mt-1 line-clamp-2">{p.description}</p>
                    <div className="mt-3 flex items-center justify-between">
                      <span className="font-bold text-amber-600 text-lg">Rs {Number(p.unit_price).toFixed(2)}</span>
                      <Link href="/contact" className="text-xs px-3 py-1 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors">Order</Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* CTA Banner */}
      <section className="bg-gradient-to-r from-amber-600 to-amber-700">
        <div className="max-w-4xl mx-auto px-6 py-16 text-center text-white">
          <h2 className="text-3xl font-bold mb-4">Ready to Place a Bulk Order?</h2>
          <p className="text-amber-100 mb-8 text-sm max-w-xl mx-auto">Contact us today to discuss your requirements. We offer competitive pricing, custom packaging, and private label options.</p>
          <Link href="/contact" className="px-10 py-3 bg-white text-amber-700 font-semibold rounded-lg hover:bg-amber-50 transition-colors text-sm inline-block">
            Contact Us Now
          </Link>
        </div>
      </section>
    </>
  );
}
