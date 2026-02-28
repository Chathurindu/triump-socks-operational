'use client';
import { useState } from 'react';
import Link from 'next/link';

interface ContactClientProps {
  hero: { title: string | null; subtitle: string | null } | null;
  contactInfo: { icon: string; title: string; detail: string }[];
  serviceItems: string[];
  cta: { title: string | null; subtitle: string | null; cta_text: string | null; cta_link: string | null } | null;
  services: string[];
}

export default function ContactClient({ hero, contactInfo, serviceItems, cta }: ContactClientProps) {
  const [form, setForm] = useState({ name: '', email: '', phone: '', orderType: 'wholesale', message: '' });
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    await new Promise((r) => setTimeout(r, 1000));
    setSent(true);
    setLoading(false);
  };

  return (
    <>
      {/* Hero — from CMS */}
      <section className="bg-gradient-to-br from-gray-900 to-gray-800 text-white py-16">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <h1 className="text-4xl font-bold mb-3">{hero?.title || 'Contact Us'}</h1>
          <p className="text-gray-400 text-sm max-w-md mx-auto">{hero?.subtitle || 'Ready to place an order or have questions? We\'d love to hear from you.'}</p>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-6 py-16 grid md:grid-cols-2 gap-12">
        {/* Contact info — from CMS */}
        <div>
          <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-6">Get In Touch</h2>
          <div className="space-y-5 mb-10">
            {contactInfo.map((item) => (
              <div key={item.title} className="flex items-start gap-4">
                <span className="text-2xl">{item.icon}</span>
                <div>
                  <p className="font-semibold text-sm text-gray-800 dark:text-white">{item.title}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{item.detail}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Services — from CMS */}
          {serviceItems.length > 0 && (
            <div className="p-6 bg-amber-50 dark:bg-amber-900/20 rounded-2xl border border-amber-100 dark:border-amber-800">
              <h3 className="font-semibold text-amber-800 dark:text-amber-400 mb-3">We Offer</h3>
              <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-300">
                {serviceItems.map((s) => (
                  <li key={s} className="flex items-center gap-2"><span className="text-amber-600">✓</span>{s}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Contact form */}
        <div>
          {sent ? (
            <div className="h-full flex flex-col items-center justify-center text-center py-12">
              <span className="text-6xl mb-4">✅</span>
              <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-2">Message Sent!</h3>
              <p className="text-gray-500 dark:text-gray-400 text-sm">Thank you for reaching out. Our team will contact you within 24 hours.</p>
              <button onClick={() => setSent(false)} className="mt-6 px-6 py-2 bg-amber-600 text-white rounded-lg text-sm hover:bg-amber-700 transition-colors">
                Send Another
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="triumph-label">Full Name *</label>
                  <input className="triumph-input" required placeholder="Your name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                </div>
                <div>
                  <label className="triumph-label">Email *</label>
                  <input className="triumph-input" type="email" required placeholder="you@example.com" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                </div>
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="triumph-label">Phone</label>
                  <input className="triumph-input" placeholder="+94..." value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                </div>
                <div>
                  <label className="triumph-label">Order Type</label>
                  <select className="triumph-input" value={form.orderType} onChange={(e) => setForm({ ...form, orderType: e.target.value })}>
                    <option value="wholesale">Wholesale</option>
                    <option value="retail">Retail</option>
                    <option value="custom">Custom / Private Label</option>
                    <option value="export">Export</option>
                    <option value="other">Other Inquiry</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="triumph-label">Message *</label>
                <textarea className="triumph-input min-h-[120px] resize-none" required placeholder="Describe your requirements, quantities, and any specific needs..." value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} />
              </div>
              <button type="submit" disabled={loading}
                className="w-full py-3 bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded-lg transition-colors disabled:opacity-60 text-sm">
                {loading ? 'Sending...' : 'Send Message'}
              </button>
              <p className="text-xs text-gray-400 text-center">We respect your privacy. Your information will never be shared.</p>
            </form>
          )}
        </div>
      </section>

      {/* CTA — from CMS */}
      {cta && (
        <section className="bg-gray-50 dark:bg-gray-900/50 py-12">
          <div className="max-w-4xl mx-auto px-6 text-center">
            <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-3">{cta.title}</h2>
            {cta.subtitle && <p className="text-gray-500 dark:text-gray-400 text-sm mb-6">{cta.subtitle}</p>}
            {cta.cta_text && (
              <Link href={cta.cta_link || '#'} className="px-8 py-3 bg-amber-600 text-white font-semibold rounded-lg hover:bg-amber-700 transition-colors text-sm inline-block">
                {cta.cta_text}
              </Link>
            )}
          </div>
        </section>
      )}
    </>
  );
}
