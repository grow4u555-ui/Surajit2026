import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Check } from 'lucide-react';
import { ProductCard } from '../components/ProductCard';
import { useStore } from '../context/StoreContext';
import { resolveProductImage, STUDIO_IMAGES } from '../lib/studioAssets';
import {
  seedStarterCatalogToFirestore,
  subscribeNewsletter,
} from '../services/firestoreService';

type ShowcaseTab = 'featured' | 'bestSeller' | 'newArrival';

const TESTIMONIALS = [
  {
    quote:
      'We specified six Kora amphoras and the Vespera alabaster lamps for a South Mumbai residence. The stoneware glaze depth under evening light feels genuinely architectural.',
    author: 'Meera Deshmukh',
    role: 'Principal Interior Architect, Atelier Vastu',
  },
  {
    quote:
      'Every piece arrived double-crated with zero plastic foam. The hand-loomed linen throws softened beautifully within days and anchor our reading room.',
    author: 'Rohan Malhotra',
    role: 'Homeowner & Collector, Bengaluru',
  },
];

export function HomePage() {
  const { products, productsLoading, categories, isAdmin, showToast } = useStore();
  const [activeTab, setActiveTab] = useState<ShowcaseTab>('featured');
  const [newsletterEmail, setNewsletterEmail] = useState('');
  const [subscribing, setSubscribing] = useState(false);
  const [subscribed, setSubscribed] = useState(false);
  const [seeding, setSeeding] = useState(false);

  const showcasedProducts = useMemo(() => {
    const filtered = products.filter((p) => {
      if (activeTab === 'featured') return p.featured;
      if (activeTab === 'bestSeller') return p.bestSeller;
      return p.newArrival;
    });
    return (filtered.length > 0 ? filtered : products).slice(0, 6);
  }, [activeTab, products]);

  async function handleNewsletterSubmit(e: React.FormEvent) {
    e.preventDefault();
    const clean = newsletterEmail.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean)) {
      showToast('Please enter a valid email address.', 'error');
      return;
    }
    setSubscribing(true);
    try {
      await subscribeNewsletter(clean);
      setSubscribed(true);
      setNewsletterEmail('');
      showToast('Thank you for joining the studio journal.', 'success');
    } catch {
      showToast('Unable to save subscription right now. Please try again.', 'error');
    } finally {
      setSubscribing(false);
    }
  }

  async function handleSeedCatalog() {
    setSeeding(true);
    try {
      await seedStarterCatalogToFirestore();
      showToast('Starter artisanal collection published to Firestore.', 'success');
    } catch {
      showToast('Could not initialize catalog. Verify admin sign-in.', 'error');
    } finally {
      setSeeding(false);
    }
  }

  return (
    <div className="bg-[#12100E] text-[#F4EFE6]">
      {/* Hero Section */}
      <section className="relative min-h-[82vh] flex items-center overflow-hidden border-b border-[#2E2822]">
        <img
          src={STUDIO_IMAGES.heroAtelierLiving}
          alt="Handcrafted ceramic amphoras and woven linen throw inside an architectural living room"
          referrerPolicy="no-referrer"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#12100E]/95 via-[#12100E]/72 to-[#12100E]/25" />

        <div className="relative z-10 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-24">
          <div className="max-w-xl space-y-6">
            <p className="text-xs uppercase tracking-[0.2em] text-[#C8A96A]">
              Handcrafted Home Objects
            </p>
            <h1 className="font-serif text-4xl sm:text-5xl lg:text-6xl leading-[1.08] tracking-tight text-[#F4EFE6]">
              Quiet Objects Shaped by Earth, Brass &amp; Loom
            </h1>
            <p className="text-base sm:text-lg text-[#D5CEC2] leading-relaxed">
              Small-batch stoneware vessels, carved walnut pedestals, alabaster lighting, and hand-loomed textiles made for enduring living spaces.
            </p>
            <div className="flex flex-wrap items-center gap-4 pt-2">
              <Link
                to="/shop"
                className="inline-flex items-center gap-2 px-7 py-3.5 bg-[#C8A96A] hover:bg-[#D9BE84] text-[#12100E] text-sm font-semibold rounded-md transition-colors whitespace-nowrap"
              >
                <span>Explore Collection</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
              <a
                href="#story"
                className="inline-flex items-center px-6 py-3.5 border border-[#F4EFE6]/30 hover:border-[#C8A96A] text-[#F4EFE6] text-sm font-medium rounded-md transition-colors whitespace-nowrap"
              >
                Our Craft
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Shop by Category */}
      {categories.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 border-b border-[#2E2822]">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-10">
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-[#C8A96A] mb-2">
                Disciplines
              </p>
              <h2 className="font-serif text-3xl sm:text-4xl text-[#F4EFE6]">
                Shop by Material &amp; Craft
              </h2>
            </div>
            <Link
              to="/shop"
              className="text-sm text-[#B8AFA2] hover:text-[#C8A96A] inline-flex items-center gap-1.5 transition-colors whitespace-nowrap"
            >
              <span>View all objects</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {categories.map((cat) => (
              <Link
                key={cat.id}
                to={`/shop?category=${encodeURIComponent(cat.name)}`}
                className="group relative aspect-[4/3] rounded-lg overflow-hidden border border-[#2E2822] bg-[#1A1714]"
              >
                <img
                  src={resolveProductImage(cat.imageUrl)}
                  alt={cat.name}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#12100E]/90 via-[#12100E]/35 to-transparent" />
                <div className="absolute bottom-0 inset-x-0 p-5">
                  <h3 className="font-serif text-2xl text-[#F4EFE6] group-hover:text-[#C8A96A] transition-colors">
                    {cat.name}
                  </h3>
                  {cat.description && (
                    <p className="text-xs text-[#B8AFA2] mt-1 line-clamp-1">
                      {cat.description}
                    </p>
                  )}
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Curated Product Collection (Featured / Best Sellers / New Arrivals) */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 border-b border-[#2E2822]">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-[#C8A96A] mb-2">
              Studio Editions
            </p>
            <h2 className="font-serif text-3xl sm:text-4xl text-[#F4EFE6]">
              Curated Pieces for the Home
            </h2>
          </div>

          <div className="inline-flex items-center gap-1 p-1 bg-[#1A1714] border border-[#2E2822] rounded-lg self-start">
            {(
              [
                { id: 'featured', label: 'Featured' },
                { id: 'bestSeller', label: 'Best Sellers' },
                { id: 'newArrival', label: 'New Arrivals' },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                  activeTab === tab.id
                    ? 'bg-[#C8A96A] text-[#12100E]'
                    : 'text-[#B8AFA2] hover:text-[#F4EFE6]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {productsLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-7">
            {[1, 2, 3].map((n) => (
              <div
                key={n}
                className="aspect-[4/4.3] rounded-lg bg-[#1A1714] border border-[#2E2822] animate-pulse"
              />
            ))}
          </div>
        ) : showcasedProducts.length === 0 ? (
          <div className="rounded-lg border border-[#2E2822] bg-[#1A1714] p-12 text-center space-y-4">
            <h3 className="font-serif text-2xl text-[#F4EFE6]">
              Studio Catalog Awaiting Publication
            </h3>
            <p className="text-sm text-[#B8AFA2] max-w-md mx-auto">
              No products have been published to Cloud Firestore yet. Sign in as the studio administrator to add products or publish the starter artisanal collection.
            </p>
            {isAdmin ? (
              <button
                type="button"
                disabled={seeding}
                onClick={() => void handleSeedCatalog()}
                className="px-6 py-3 bg-[#C8A96A] hover:bg-[#D9BE84] text-[#12100E] text-sm font-semibold rounded-md transition-colors disabled:opacity-50"
              >
                {seeding ? 'Publishing to Firestore...' : 'Publish Curated Starter Collection'}
              </button>
            ) : (
              <Link
                to="/admin"
                className="inline-block px-6 py-3 border border-[#C8A96A]/50 text-[#F4EFE6] text-sm rounded-md hover:border-[#C8A96A]"
              >
                Open Admin Studio
              </Link>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-7">
            {showcasedProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </section>

      {/* Brand Story & Craft Provenance */}
      <section id="story" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 border-b border-[#2E2822]">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-stretch">
          <div className="lg:col-span-6 rounded-lg overflow-hidden border border-[#2E2822] bg-[#1A1714]">
            <img
              src={STUDIO_IMAGES.storyArtisanPottery}
              alt="Potter hands shaping stoneware clay on a wheel in natural studio light"
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover min-h-[340px]"
            />
          </div>

          <div className="lg:col-span-6 flex flex-col justify-center space-y-6 lg:pl-4">
            <p className="text-xs uppercase tracking-[0.18em] text-[#C8A96A]">
              Studio Provenance
            </p>
            <h2 className="font-serif text-3xl sm:text-4xl leading-tight text-[#F4EFE6]">
              Slow Making in an Age of Instant Objects
            </h2>
            <p className="text-base text-[#B8AFA2] leading-relaxed">
              Founded in Kolkata, AmarBazar partners directly with family-run pottery kilns in Pondicherry, pit-loom weavers in Kutch, and brass casters in Moradabad. Every vessel and textile carries subtle variations of the hand that shaped it.
            </p>
            <p className="text-base text-[#B8AFA2] leading-relaxed">
              We produce strictly in numbered small batches—never mass warehousing—so raw materials remain honest, kiln firing stays local, and artisans earn fair studio commissions.
            </p>

            <div className="grid grid-cols-3 gap-4 pt-6 border-t border-[#2E2822]">
              <div>
                <p className="font-serif text-2xl sm:text-3xl text-[#C8A96A] tabular-nums">42</p>
                <p className="text-xs text-[#857B6E] mt-1">Artisan Families</p>
              </div>
              <div>
                <p className="font-serif text-2xl sm:text-3xl text-[#C8A96A] tabular-nums">100%</p>
                <p className="text-xs text-[#857B6E] mt-1">Natural Materials</p>
              </div>
              <div>
                <p className="font-serif text-2xl sm:text-3xl text-[#C8A96A] tabular-nums">7–14d</p>
                <p className="text-xs text-[#857B6E] mt-1">Insured Dispatch</p>
              </div>
            </div>
          </div>
        </div>

        {/* Client Testimonials adjacent to Craft Proof */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-14 pt-12 border-t border-[#2E2822]">
          {TESTIMONIALS.map((t) => (
            <blockquote key={t.author} className="space-y-4 bg-[#1A1714] border border-[#2E2822] rounded-lg p-7">
              <p className="font-serif text-xl leading-relaxed text-[#F4EFE6]">
                “{t.quote}”
              </p>
              <footer className="text-xs text-[#B8AFA2]">
                <span className="font-semibold text-[#C8A96A]">{t.author}</span>
                <span className="mx-2 text-[#857B6E]" aria-hidden="true">·</span>
                <span className="text-[#857B6E]">{t.role}</span>
              </footer>
            </blockquote>
          ))}
        </div>
      </section>

      {/* Newsletter Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="rounded-lg border border-[#2E2822] bg-[#1A1714] px-6 py-12 sm:px-12 flex flex-col lg:flex-row lg:items-center justify-between gap-8">
          <div className="max-w-lg space-y-2">
            <p className="text-xs uppercase tracking-[0.18em] text-[#C8A96A]">
              Atelier Journal
            </p>
            <h2 className="font-serif text-3xl text-[#F4EFE6]">
              Early Access to Small-Batch Kiln Releases
            </h2>
            <p className="text-sm text-[#B8AFA2]">
              Receive seasonal release notes and studio open-house invitations. No automated clutter.
            </p>
          </div>

          <form
            onSubmit={(e) => void handleNewsletterSubmit(e)}
            className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto lg:min-w-[420px]"
          >
            <label htmlFor="newsletter-email" className="sr-only">
              Email address
            </label>
            <input
              id="newsletter-email"
              type="email"
              required
              value={newsletterEmail}
              onChange={(e) => setNewsletterEmail(e.target.value)}
              placeholder="you@domain.com"
              className="flex-1 px-4 py-3 bg-[#12100E] border border-[#2E2822] focus:border-[#C8A96A] rounded-md text-sm text-[#F4EFE6] placeholder:text-[#857B6E]"
            />
            <button
              type="submit"
              disabled={subscribing || subscribed}
              className="px-6 py-3 bg-[#C8A96A] hover:bg-[#D9BE84] text-[#12100E] text-sm font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 inline-flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {subscribed ? (
                <>
                  <Check className="w-4 h-4" />
                  <span>Subscribed</span>
                </>
              ) : subscribing ? (
                <span>Joining...</span>
              ) : (
                <span>Subscribe</span>
              )}
            </button>
          </form>
        </div>
      </section>
    </div>
  );
}
