import Link from 'next/link';
import Image from 'next/image';
import type { Metadata } from 'next';
import { getPageMeta, getSectionWithItems, getWebsiteProducts, getProductCategories } from '@/lib/cms';

/* ── SEO metadata from CMS ─────────────────────────────── */
export async function generateMetadata(): Promise<Metadata> {
  const page = await getPageMeta('products');
  return {
    title: page?.meta_title || 'Our Products — Triumph Socks',
    description: page?.meta_description || 'Browse our premium range of custom socks.',
    openGraph: page?.og_image ? { images: [page.og_image] } : undefined,
  };
}

/* ── Page ───────────────────────────────────────────────── */
export default async function ProductsPage({ searchParams }: { searchParams: Promise<{ cat?: string }> }) {
  const [products, categories, featured, { section: hero }, { section: cta }] = await Promise.all([
    getWebsiteProducts(),
    getProductCategories(),
    getWebsiteProducts({ featured: true, limit: 6 }),
    getSectionWithItems('products', 'hero'),
    getSectionWithItems('products', 'cta'),
  ]);
  const { cat: catFilter } = await searchParams;
  const filtered = catFilter ? products.filter((p: any) => p.category_name === catFilter) : products;

  return (
    <>
      {/* Hero — from CMS */}
      <section className="bg-gradient-to-br from-gray-900 to-gray-800 text-white py-20">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">{hero?.title || 'Our Products'}</h1>
          <p className="text-gray-400 max-w-xl mx-auto text-sm leading-relaxed">{hero?.subtitle || 'Browse our full range of premium socks.'}</p>
        </div>
      </section>

      {/* Featured Products Highlight */}
      {!catFilter && featured.length > 0 && (
        <section className="max-w-7xl mx-auto px-6 pt-12">
          <div className="flex items-center gap-3 mb-6">
            <span className="text-amber-500 text-xl">★</span>
            <h2 className="text-xl font-bold text-gray-800 dark:text-white">Featured Products</h2>
            <div className="flex-1 h-px bg-gradient-to-r from-amber-200 to-transparent dark:from-amber-800" />
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {featured.map((p: any) => (
              <div key={`feat-${p.id}`} className="relative bg-white dark:bg-gray-800 rounded-2xl overflow-hidden border-2 border-amber-200 dark:border-amber-700 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group">
                <div className="absolute top-3 right-3 z-10 bg-amber-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow">★ FEATURED</div>
                <ProductImage src={p.image_url} alt={p.name} tall />
                <div className="p-5">
                  <span className="text-xs text-amber-600 font-medium">{p.category_name}</span>
                  <h3 className="font-bold text-gray-800 dark:text-white mt-1">{p.name}</h3>
                  {(p.short_description || p.description) && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 line-clamp-2 leading-relaxed">{p.short_description || p.description}</p>
                  )}
                  {p.tags && p.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {p.tags.slice(0, 3).map((t: string) => (
                        <span key={t} className="text-[10px] bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 px-2 py-0.5 rounded-full">{t}</span>
                      ))}
                    </div>
                  )}
                  <div className="mt-3 flex items-center justify-between">
                    <span className="text-lg font-bold text-amber-600">Rs {Number(p.unit_price).toFixed(2)}</span>
                    <span className="text-xs text-gray-400">per pair</span>
                  </div>
                  <Link href="/contact" className="mt-3 w-full block text-center text-xs py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg transition-colors font-semibold">
                    Request Quote
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* All Products */}
      <section className="max-w-7xl mx-auto px-6 py-12">
        {/* Category filters */}
        <div className="flex flex-wrap gap-2 mb-8">
          <Link href="/products" className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${!catFilter ? 'bg-amber-600 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-amber-50 dark:hover:bg-amber-900/20'}`}>
            All Products
          </Link>
          {categories.map((c: any) => (
            <Link key={c.id} href={`/products?cat=${encodeURIComponent(c.name)}`}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${catFilter === c.name ? 'bg-amber-600 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-amber-50 dark:hover:bg-amber-900/20'}`}>
              {c.name}
            </Link>
          ))}
        </div>

        {/* Product grid */}
        <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {filtered.map((p: any) => (
            <div key={p.id} className="bg-white dark:bg-gray-800 rounded-2xl overflow-hidden border border-gray-100 dark:border-gray-700 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group anim-fade-up">
              {p.is_featured && (
                <div className="bg-amber-500 text-white text-center text-[10px] font-bold py-0.5">★ FEATURED</div>
              )}
              <ProductImage src={p.image_url} alt={p.name} />
              <div className="p-4">
                <span className="text-xs text-amber-600 font-medium">{p.category_name}</span>
                <h3 className="font-semibold text-gray-800 dark:text-white mt-1 text-sm">{p.name}</h3>
                {(p.short_description || p.description) && (
                  <p className="text-xs text-gray-400 mt-1 line-clamp-2 leading-relaxed">{p.short_description || p.description}</p>
                )}
                {p.tags && p.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {p.tags.slice(0, 3).map((t: string) => (
                      <span key={t} className="text-[10px] bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-1.5 py-0.5 rounded">{t}</span>
                    ))}
                  </div>
                )}
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
            <span className="text-6xl block mb-4">📦</span>
            <p className="font-medium">No products found in this category.</p>
            <Link href="/products" className="text-amber-600 text-sm mt-2 inline-block hover:underline">View all products →</Link>
          </div>
        )}
      </section>

      {/* CTA — from CMS */}
      {cta && (
        <section className="bg-amber-600 py-12 mt-8">
          <div className="max-w-4xl mx-auto px-6 text-center text-white">
            <h2 className="text-2xl font-bold mb-3">{cta.title}</h2>
            {cta.subtitle && <p className="text-amber-100 text-sm mb-6">{cta.subtitle}</p>}
            {cta.cta_text && (
              <Link href={cta.cta_link || '/contact'} className="px-8 py-3 bg-white text-amber-700 font-semibold rounded-lg hover:bg-amber-50 transition-colors text-sm inline-block">{cta.cta_text}</Link>
            )}
          </div>
        </section>
      )}
    </>
  );
}

/* ── Product Image Component ────────────────────────────── */
function ProductImage({ src, alt, tall }: { src?: string; alt: string; tall?: boolean }) {
  const h = tall ? 'h-56' : 'h-48';
  if (src) {
    return (
      <div className={`${h} relative bg-gray-100 dark:bg-gray-900 overflow-hidden`}>
        <Image
          src={src}
          alt={alt}
          fill
          sizes="(max-width:640px) 100vw, (max-width:1024px) 50vw, 25vw"
          className="object-cover group-hover:scale-105 transition-transform duration-500"
        />
      </div>
    );
  }
  return (
    <div className={`${h} bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-900/20 dark:to-amber-900/10 flex items-center justify-center`}>
      <svg className="w-16 h-16 text-amber-300 dark:text-amber-700 group-hover:scale-110 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    </div>
  );
}
