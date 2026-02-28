import Link from 'next/link';
import Image from 'next/image';
import type { Metadata } from 'next';
import { getSectionWithItems, getPageMeta, getWebsiteProducts } from '@/lib/cms';

/* ── SEO metadata from CMS ─────────────────────────────── */
export async function generateMetadata(): Promise<Metadata> {
  const page = await getPageMeta('home');
  return {
    title: page?.meta_title || 'Triumph Socks — Premium Sock Manufacturer in Sri Lanka',
    description: page?.meta_description || 'Step into comfort & style. Triumph Socks crafts world-class socks.',
    openGraph: page?.og_image ? { images: [page.og_image] } : undefined,
  };
}

export const revalidate = 60; // ISR: regenerate every 60s

export default async function HomePage() {
  const [
    { section: hero },
    { section: statsSection, items: stats },
    { section: featuresSection, items: features },
    { section: productsSection },
    { section: cta },
    products,
  ] = await Promise.all([
    getSectionWithItems('home', 'hero'),
    getSectionWithItems('home', 'stats'),
    getSectionWithItems('home', 'features'),
    getSectionWithItems('home', 'products_featured'),
    getSectionWithItems('home', 'cta'),
    getWebsiteProducts({ featured: true, limit: 6 }),
  ]);

  return (
    <>
      {/* Hero */}
      <section className="bg-gradient-to-br from-gray-900 via-gray-800 to-amber-900 text-white">
        <div className="max-w-7xl mx-auto px-6 py-24 flex flex-col md:flex-row items-center gap-12">
          <div className="flex-1 anim-fade-up">
            {hero?.content && (
              <span className="inline-block bg-amber-600/20 text-amber-400 text-xs font-semibold px-3 py-1 rounded-full mb-4 tracking-wider uppercase anim-fade-in">{hero.content}</span>
            )}
            <h1 className="text-4xl md:text-6xl font-extrabold leading-tight mb-6">
              {hero?.title ? formatHeroTitle(hero.title) : <>Step Into <span className="text-amber-400">Comfort</span> &amp; Style</>}
            </h1>
            {hero?.subtitle && (
              <p className="text-gray-300 text-lg mb-8 max-w-xl leading-relaxed">{hero.subtitle}</p>
            )}
            <div className="flex flex-wrap gap-4">
              <Link href={hero?.cta_link || '/products'} className="px-8 py-3 bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded-lg transition-colors text-sm">
                {hero?.cta_text || 'Explore Products'}
              </Link>
              <Link href="/contact" className="px-8 py-3 border border-white/30 hover:border-white text-white font-semibold rounded-lg transition-colors text-sm">
                Get a Quote
              </Link>
            </div>
          </div>
          <div className="flex-1 hidden md:flex justify-center anim-scale-in anim-d3">
            {hero?.image_url ? (
              <div className="w-72 h-72 rounded-full overflow-hidden border-4 border-amber-600/30">
                <Image src={hero.image_url} alt={hero.title || 'Triumph Socks'} width={288} height={288} priority fetchPriority="high" className="object-cover w-full h-full" />
              </div>
            ) : (
              <div className="w-72 h-72 rounded-full bg-amber-600/10 border border-amber-600/20 flex items-center justify-center hover:scale-105 transition-transform duration-500">
                <span className="text-9xl">🧦</span>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Stats */}
      {stats.length > 0 && (
        <section className="bg-amber-600">
          <div className="max-w-7xl mx-auto px-6 py-10 grid grid-cols-2 md:grid-cols-4 gap-6">
            {stats.map((s) => (
              <div key={s.id} className="text-center text-white">
                <div className="text-4xl font-extrabold">{s.value}</div>
                <div className="text-amber-100 text-sm mt-1">{s.title}</div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Features */}
      {features.length > 0 && (
        <section className="max-w-7xl mx-auto px-6 py-20">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white">{featuresSection?.title || 'Why Choose Triumph?'}</h2>
            {featuresSection?.subtitle && (
              <p className="text-gray-500 dark:text-gray-400 mt-3 max-w-xl mx-auto text-sm">{featuresSection.subtitle}</p>
            )}
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {features.map((f, i) => (
              <div key={f.id} className={`p-6 rounded-2xl border border-gray-100 dark:border-gray-800 hover:shadow-lg hover:-translate-y-1 transition-all duration-300 anim-fade-up anim-d${Math.min(i+1,6)}`}>
                <div className="text-4xl mb-3">{f.icon || '✨'}</div>
                <h3 className="font-semibold text-gray-800 dark:text-white mb-2">{f.title}</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">{f.description}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Featured Products from CMS */}
      {products.length > 0 && (
        <section className="bg-gray-50 dark:bg-gray-900/50">
          <div className="max-w-7xl mx-auto px-6 py-20">
            <div className="flex items-center justify-between mb-10">
              <div>
                <h2 className="text-3xl font-bold text-gray-900 dark:text-white">{productsSection?.title || 'Featured Products'}</h2>
                {productsSection?.subtitle && (
                  <p className="text-gray-500 dark:text-gray-400 mt-2 text-sm">{productsSection.subtitle}</p>
                )}
              </div>
              <Link href="/products" className="text-sm font-semibold text-amber-600 hover:underline">View All →</Link>
            </div>
            <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-6">
              {products.map((p: any) => (
                <div key={p.id} className="bg-white dark:bg-gray-800 rounded-2xl overflow-hidden border border-gray-100 dark:border-gray-700 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group anim-fade-up">
                  {p.is_featured && (
                    <div className="bg-amber-500 text-white text-center text-[10px] font-bold py-0.5">★ FEATURED</div>
                  )}
                  <ProductImage src={p.image_url} alt={p.name} />
                  <div className="p-4">
                    <span className="text-xs text-amber-600 font-medium uppercase tracking-wide">{p.category_name}</span>
                    <h3 className="font-semibold text-gray-800 dark:text-white mt-1">{p.name}</h3>
                    <p className="text-xs text-gray-400 mt-1 line-clamp-2">{p.short_description || p.description}</p>
                    {p.tags && p.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {p.tags.slice(0, 3).map((t: string) => (
                          <span key={t} className="text-[10px] bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-1.5 py-0.5 rounded">{t}</span>
                        ))}
                      </div>
                    )}
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

      {/* CTA Banner — from CMS */}
      {cta && (
        <section className="bg-gradient-to-r from-amber-600 to-amber-700">
          <div className="max-w-4xl mx-auto px-6 py-16 text-center text-white">
            <h2 className="text-3xl font-bold mb-4">{cta.title}</h2>
            {cta.subtitle && <p className="text-amber-100 mb-8 text-sm max-w-xl mx-auto">{cta.subtitle}</p>}
            {cta.cta_text && (
              <Link href={cta.cta_link || '/contact'} className="px-10 py-3 bg-white text-amber-700 font-semibold rounded-lg hover:bg-amber-50 transition-colors text-sm inline-block">
                {cta.cta_text}
              </Link>
            )}
          </div>
        </section>
      )}
    </>
  );
}

/* ── Helper: highlight first key word in hero title ─────── */
function formatHeroTitle(title: string) {
  // Look for text between * markers for highlighting: *Comfort* → <span className="text-amber-400">Comfort</span>
  const parts = title.split(/\*([^*]+)\*/);
  if (parts.length > 1) {
    return parts.map((part, i) =>
      i % 2 === 1 ? <span key={i} className="text-amber-400">{part}</span> : part
    );
  }
  // Default: highlight last 2 words
  const words = title.split(' ');
  if (words.length > 2) {
    return <>{words.slice(0, -2).join(' ')} <span className="text-amber-400">{words.slice(-2).join(' ')}</span></>;
  }
  return title;
}

/* ── Product Image ──────────────────────────────────────── */
function ProductImage({ src, alt }: { src?: string; alt: string }) {
  if (src) {
    return (
      <div className="h-44 relative bg-gray-100 dark:bg-gray-900 overflow-hidden">
        <Image src={src} alt={alt} fill sizes="(max-width:640px) 100vw, (max-width:1024px) 50vw, 33vw" className="object-cover group-hover:scale-105 transition-transform duration-500" />
      </div>
    );
  }
  return (
    <div className="h-44 bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-900/20 dark:to-amber-900/10 flex items-center justify-center">
      <svg className="w-14 h-14 text-amber-300 dark:text-amber-700 group-hover:scale-110 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    </div>
  );
}
