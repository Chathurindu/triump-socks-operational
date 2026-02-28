import Link from 'next/link';
import { db } from '@/lib/db';

async function getProducts() {
  try {
    const { rows } = await db.query(`
      SELECT p.*, pc.name AS category_name
      FROM products p LEFT JOIN product_categories pc ON pc.id = p.category_id
      WHERE p.is_active = true ORDER BY pc.name, p.name
    `);
    return rows;
  } catch { return []; }
}

async function getCategories() {
  try {
    const { rows } = await db.query(`SELECT * FROM product_categories ORDER BY name`);
    return rows;
  } catch { return []; }
}

export default async function ProductsPage({ searchParams }: { searchParams: Promise<{ cat?: string }> }) {
  const [products, categories] = await Promise.all([getProducts(), getCategories()]);
  const { cat: catFilter } = await searchParams;
  const filtered  = catFilter ? products.filter((p: any) => p.category_name === catFilter) : products;

  return (
    <>
      {/* Header */}
      <section className="bg-gradient-to-br from-gray-900 to-gray-800 text-white py-16">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <h1 className="text-4xl font-bold mb-3">Our Products</h1>
          <p className="text-gray-400 max-w-lg mx-auto text-sm">Browse our full range of premium socks. Custom sizes, colors, and branding available on request.</p>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-6 py-12">
        {/* Category filters */}
        <div className="flex flex-wrap gap-2 mb-8">
          <Link href="/products" className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${!catFilter ? 'bg-amber-600 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-amber-50 dark:hover:bg-amber-900/20'}`}>
            All Products
          </Link>
          {categories.map((c: any) => (
            <Link key={c.id} href={`/products?cat=${encodeURIComponent(c.name)}`}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${catFilter === c.name ? 'bg-amber-600 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-amber-50'}`}>
              {c.name}
            </Link>
          ))}
        </div>

        {/* Product grid */}
        <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {filtered.map((p: any) => (
            <div key={p.id} className="bg-white dark:bg-gray-800 rounded-2xl overflow-hidden border border-gray-100 dark:border-gray-700 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group anim-fade-up">
              <div className="h-48 bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-900/20 dark:to-amber-900/10 flex items-center justify-center">
                <span className="text-8xl group-hover:scale-110 transition-transform">🧦</span>
              </div>
              <div className="p-4">
                <span className="text-xs text-amber-600 font-medium">{p.category_name}</span>
                <h3 className="font-semibold text-gray-800 dark:text-white mt-1 text-sm">{p.name}</h3>
                {p.description && <p className="text-xs text-gray-400 mt-1 line-clamp-2 leading-relaxed">{p.description}</p>}
                <div className="mt-3 flex items-center justify-between">
                  <span className="font-bold text-amber-600">Rs {Number(p.unit_price).toFixed(2)}</span>
                  <span className="text-xs text-gray-400">per pair</span>
                </div>
                {p.sku && <p className="text-xs text-gray-300 dark:text-gray-500 mt-1">SKU: {p.sku}</p>}
                <Link href="/contact" className="mt-3 w-full block text-center text-xs py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg transition-colors font-medium">
                  Request Quote
                </Link>
              </div>
            </div>
          ))}
        </div>

        {filtered.length === 0 && (
          <div className="text-center py-20 text-gray-400">
            <span className="text-6xl block mb-4">🧦</span>
            <p>No products found in this category.</p>
          </div>
        )}
      </section>

      {/* Bulk order CTA */}
      <section className="bg-amber-600 py-12 mt-8">
        <div className="max-w-4xl mx-auto px-6 text-center text-white">
          <h2 className="text-2xl font-bold mb-3">Need a Custom Order?</h2>
          <p className="text-amber-100 text-sm mb-6">We manufacture custom socks with your logo, colors, and packaging. MOQ as low as 500 pairs.</p>
          <Link href="/contact" className="px-8 py-3 bg-white text-amber-700 font-semibold rounded-lg hover:bg-amber-50 transition-colors text-sm inline-block">Get Started</Link>
        </div>
      </section>
    </>
  );
}
