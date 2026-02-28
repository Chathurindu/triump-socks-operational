import Link from 'next/link';

const TEAM = [
  { name: 'Saman Perera', role: 'Founder & CEO', since: '2005' },
  { name: 'Dilani Silva', role: 'Head of Production', since: '2008' },
  { name: 'Ruwan Fernando', role: 'Sales Director', since: '2010' },
  { name: 'Nadeesha Jayawardena', role: 'Quality Manager', since: '2012' },
];

const VALUES = [
  { icon: '🏆', title: 'Quality First', desc: 'Every pair goes through rigorous quality checks before leaving our factory.' },
  { icon: '🤝', title: 'Integrity', desc: 'We build long-term partnerships based on trust, transparency, and fair pricing.' },
  { icon: '💡', title: 'Innovation', desc: 'Continuously investing in new technologies and sustainable manufacturing.' },
  { icon: '🌱', title: 'Sustainability', desc: 'Committed to reducing environmental impact across our entire supply chain.' },
];

const MILESTONES = [
  { year: '2005', event: 'Founded in Veyangoda, Sri Lanka with 10 machines and 20 employees.' },
  { year: '2008', event: 'Expanded factory to 5,000 sq ft. Reached 100 employees.' },
  { year: '2012', event: 'Launched export division. First international shipment to UK.' },
  { year: '2016', event: 'Opened new production facility. Capacity: 200,000 pairs/month.' },
  { year: '2020', event: 'Launched eco-friendly product line using recycled materials.' },
  { year: '2024', event: 'Serving 500+ clients across 20+ countries with 300+ staff.' },
];

export default function AboutPage() {
  return (
    <>
      {/* Hero */}
      <section className="bg-gradient-to-br from-gray-900 to-amber-900 text-white py-20">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <h1 className="text-4xl md:text-5xl font-extrabold mb-4">About Triumph Socks</h1>
          <p className="text-gray-300 max-w-xl mx-auto text-sm leading-relaxed">
            A passion for quality craftsmanship, a commitment to our people, and a vision to be the most trusted sock manufacturer in South Asia.
          </p>
        </div>
      </section>

      {/* Mission / Vision */}
      <section className="max-w-7xl mx-auto px-6 py-16 grid md:grid-cols-2 gap-10">
        <div className="p-8 rounded-2xl bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800">
          <h2 className="text-2xl font-bold text-amber-700 dark:text-amber-400 mb-3">Our Mission</h2>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed text-sm">
            To manufacture and deliver premium quality socks that provide exceptional comfort, durability, and value. We strive to be the preferred partner for retailers, wholesalers, and brands seeking reliable supply with consistent quality.
          </p>
        </div>
        <div className="p-8 rounded-2xl bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700">
          <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-3">Our Vision</h2>
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed text-sm">
            To become the leading sock manufacturer and exporter in South Asia by 2030 — recognized for innovation, sustainability, and partnerships that create mutual growth for our clients and communities.
          </p>
        </div>
      </section>

      {/* Values */}
      <section className="bg-gray-50 dark:bg-gray-900/50 py-16">
        <div className="max-w-7xl mx-auto px-6">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white text-center mb-10">Our Core Values</h2>
          <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-6">
            {VALUES.map((v) => (
              <div key={v.title} className="text-center p-6 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700">
                <div className="text-5xl mb-3">{v.icon}</div>
                <h3 className="font-semibold text-gray-800 dark:text-white mb-2">{v.title}</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">{v.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Timeline */}
      <section className="max-w-4xl mx-auto px-6 py-16">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white text-center mb-12">Our Journey</h2>
        <div className="relative border-l-2 border-amber-200 dark:border-amber-800 pl-8 space-y-8">
          {MILESTONES.map((m) => (
            <div key={m.year} className="relative">
              <span className="absolute -left-[2.6rem] top-0 w-8 h-8 rounded-full bg-amber-600 text-white text-xs font-bold flex items-center justify-center">{m.year.slice(2)}</span>
              <p className="font-bold text-amber-600">{m.year}</p>
              <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">{m.event}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Team */}
      <section className="bg-gray-50 dark:bg-gray-900/50 py-16">
        <div className="max-w-7xl mx-auto px-6">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white text-center mb-10">Leadership Team</h2>
          <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-6">
            {TEAM.map((t) => (
              <div key={t.name} className="text-center p-6 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700">
                <div className="w-16 h-16 rounded-full bg-amber-600 text-white font-bold text-xl flex items-center justify-center mx-auto mb-3">
                  {t.name.split(' ').map(n => n[0]).join('')}
                </div>
                <h3 className="font-semibold text-gray-800 dark:text-white text-sm">{t.name}</h3>
                <p className="text-xs text-amber-600 mt-1">{t.role}</p>
                <p className="text-xs text-gray-400 mt-1">Since {t.since}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-amber-600 py-12">
        <div className="max-w-4xl mx-auto px-6 text-center text-white">
          <h2 className="text-2xl font-bold mb-3">Partner With Us</h2>
          <p className="text-amber-100 text-sm mb-6">Join hundreds of satisfied customers who trust Triumph Socks for their supply needs.</p>
          <Link href="/contact" className="px-8 py-3 bg-white text-amber-700 font-semibold rounded-lg hover:bg-amber-50 transition-colors text-sm inline-block">Get In Touch</Link>
        </div>
      </section>
    </>
  );
}
