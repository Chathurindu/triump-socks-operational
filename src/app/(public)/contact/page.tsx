import type { Metadata } from 'next';
import { getPageMeta, getSectionWithItems, getServices } from '@/lib/cms';
import ContactClient from './ContactClient';

/* ── SEO metadata from CMS ─────────────────────────────── */
export async function generateMetadata(): Promise<Metadata> {
  const page = await getPageMeta('contact');
  return {
    title: page?.meta_title || 'Contact Triumph Socks — Get a Quote',
    description: page?.meta_description || 'Ready to place an order? Contact us today.',
    openGraph: page?.og_image ? { images: [page.og_image] } : undefined,
  };
}

export default async function ContactPage() {
  const [
    { section: hero },
    { section: infoSection, items: contactInfo },
    { section: servicesSection, items: serviceItems },
    { section: cta },
    services,
  ] = await Promise.all([
    getSectionWithItems('contact', 'hero'),
    getSectionWithItems('contact', 'info'),
    getSectionWithItems('contact', 'services'),
    getSectionWithItems('contact', 'cta'),
    getServices(),
  ]);

  return (
    <ContactClient
      hero={hero ? { title: hero.title, subtitle: hero.subtitle } : null}
      contactInfo={contactInfo.map(i => ({ icon: i.icon || '', title: i.title || '', detail: i.description || '' }))}
      serviceItems={serviceItems.map(i => i.title || '')}
      cta={cta ? { title: cta.title, subtitle: cta.subtitle, cta_text: cta.cta_text, cta_link: cta.cta_link } : null}
      services={services.map(s => s.title)}
    />
  );
}
