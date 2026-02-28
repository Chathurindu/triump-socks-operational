import Link from 'next/link';
import Image from 'next/image';
import type { Metadata } from 'next';
import { getSectionWithItems, getPageMeta, getSection } from '@/lib/cms';

/* ── SEO metadata from CMS ─────────────────────────────── */
export async function generateMetadata(): Promise<Metadata> {
  const page = await getPageMeta('about');
  return {
    title: page?.meta_title || 'About Triumph Socks — Our Story & Values',
    description: page?.meta_description || 'A passion for quality craftsmanship.',
    openGraph: page?.og_image ? { images: [page.og_image] } : undefined,
  };
}

export default async function AboutPage() {
  const [
    { section: hero },
    mission,
    vision,
    { section: valuesSection, items: values },
    { section: milestonesSection, items: milestones },
    { section: teamSection, items: team },
    { section: cta },
  ] = await Promise.all([
    getSectionWithItems('about', 'hero'),
    getSection('about', 'mission'),
    getSection('about', 'vision'),
    getSectionWithItems('about', 'values'),
    getSectionWithItems('about', 'milestones'),
    getSectionWithItems('about', 'team'),
    getSectionWithItems('about', 'cta'),
  ]);

  return (
    <>
      {/* Hero */}
      <section className="bg-gradient-to-br from-gray-900 to-amber-900 text-white py-20">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <h1 className="text-4xl md:text-5xl font-extrabold mb-4">{hero?.title || 'About Triumph Socks'}</h1>
          {hero?.subtitle && (
            <p className="text-gray-300 max-w-xl mx-auto text-sm leading-relaxed">{hero.subtitle}</p>
          )}
        </div>
      </section>

      {/* Mission / Vision */}
      {(mission || vision) && (
        <section className="max-w-7xl mx-auto px-6 py-16 grid md:grid-cols-2 gap-10">
          {mission && (
            <div className="p-8 rounded-2xl bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800">
              <h2 className="text-2xl font-bold text-amber-700 dark:text-amber-400 mb-3">{mission.title || 'Our Mission'}</h2>
              <p className="text-gray-600 dark:text-gray-300 leading-relaxed text-sm">{mission.content}</p>
            </div>
          )}
          {vision && (
            <div className="p-8 rounded-2xl bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700">
              <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-3">{vision.title || 'Our Vision'}</h2>
              <p className="text-gray-600 dark:text-gray-300 leading-relaxed text-sm">{vision.content}</p>
            </div>
          )}
        </section>
      )}

      {/* Values */}
      {values.length > 0 && (
        <section className="bg-gray-50 dark:bg-gray-900/50 py-16">
          <div className="max-w-7xl mx-auto px-6">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white text-center mb-10">{valuesSection?.title || 'Our Core Values'}</h2>
            <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-6">
              {values.map((v) => (
                <div key={v.id} className="text-center p-6 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700">
                  <div className="text-5xl mb-3">{v.icon || '✨'}</div>
                  <h3 className="font-semibold text-gray-800 dark:text-white mb-2">{v.title}</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">{v.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Timeline */}
      {milestones.length > 0 && (
        <section className="max-w-4xl mx-auto px-6 py-16">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white text-center mb-12">{milestonesSection?.title || 'Our Journey'}</h2>
          <div className="relative border-l-2 border-amber-200 dark:border-amber-800 pl-8 space-y-8">
            {milestones.map((m) => (
              <div key={m.id} className="relative">
                <span className="absolute -left-[2.6rem] top-0 w-8 h-8 rounded-full bg-amber-600 text-white text-xs font-bold flex items-center justify-center">{(m.title || '').slice(2)}</span>
                <p className="font-bold text-amber-600">{m.title}</p>
                <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">{m.description}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Team */}
      {team.length > 0 && (
        <section className="bg-gray-50 dark:bg-gray-900/50 py-16">
          <div className="max-w-7xl mx-auto px-6">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white text-center mb-10">{teamSection?.title || 'Leadership Team'}</h2>
            <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-6">
              {team.map((t) => {
                const extra = (typeof t.extra === 'string' ? JSON.parse(t.extra) : t.extra) || {};
                return (
                  <div key={t.id} className="text-center p-6 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700">
                    {t.image_url ? (
                      <div className="w-16 h-16 rounded-full mx-auto mb-3 overflow-hidden relative">
                        <Image src={t.image_url} alt={t.title || ''} fill className="object-cover" sizes="64px" />
                      </div>
                    ) : (
                      <div className="w-16 h-16 rounded-full bg-amber-600 text-white font-bold text-xl flex items-center justify-center mx-auto mb-3">
                        {(t.title || '').split(' ').map((n: string) => n[0]).join('')}
                      </div>
                    )}
                    <h3 className="font-semibold text-gray-800 dark:text-white text-sm">{t.title}</h3>
                    <p className="text-xs text-amber-600 mt-1">{t.subtitle}</p>
                    {extra.since && <p className="text-xs text-gray-400 mt-1">Since {extra.since}</p>}
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* CTA */}
      {cta && (
        <section className="bg-amber-600 py-12">
          <div className="max-w-4xl mx-auto px-6 text-center text-white">
            <h2 className="text-2xl font-bold mb-3">{cta.title}</h2>
            {cta.subtitle && <p className="text-amber-100 text-sm mb-6">{cta.subtitle}</p>}
            {cta.cta_text && (
              <Link href={cta.cta_link || '/contact'} className="px-8 py-3 bg-white text-amber-700 font-semibold rounded-lg hover:bg-amber-50 transition-colors text-sm inline-block">
                {cta.cta_text}
              </Link>
            )}
          </div>
        </section>
      )}
    </>
  );
}
