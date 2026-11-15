import { Link } from 'react-router-dom';
import { useStore } from '../context/StoreContext';

export function Footer() {
  const { storeSettings, categories } = useStore();

  return (
    <footer className="bg-[#0E0C0A] border-t border-[#2E2822] text-[#B8AFA2]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10">
          <div className="md:col-span-1 space-y-3">
            <Link to="/" className="font-serif text-2xl text-[#F4EFE6] block">
              {storeSettings.storeName}
            </Link>
            <p className="text-sm leading-relaxed text-[#857B6E]">
              {storeSettings.tagline || 'Quiet objects shaped by hand, earth, and fire.'}
            </p>
          </div>

          <div className="space-y-3">
            <h3 className="font-sans text-xs uppercase tracking-[0.14em] text-[#F4EFE6] font-semibold">
              Collections
            </h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link to="/shop" className="hover:text-[#C8A96A] transition-colors">
                  All Objects
                </Link>
              </li>
              {categories.slice(0, 4).map((cat) => (
                <li key={cat.id}>
                  <Link
                    to={`/shop?category=${encodeURIComponent(cat.name)}`}
                    className="hover:text-[#C8A96A] transition-colors"
                  >
                    {cat.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div className="space-y-3">
            <h3 className="font-sans text-xs uppercase tracking-[0.14em] text-[#F4EFE6] font-semibold">
              Client Care
            </h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link to="/orders" className="hover:text-[#C8A96A] transition-colors">
                  Track Orders
                </Link>
              </li>
              <li>
                <Link to="/checkout" className="hover:text-[#C8A96A] transition-colors">
                  Shipping &amp; Checkout
                </Link>
              </li>
              <li>
                <Link to="/#story" className="hover:text-[#C8A96A] transition-colors">
                  Studio Provenance
                </Link>
              </li>
              <li>
                <Link to="/admin" className="hover:text-[#C8A96A] transition-colors">
                  Admin Studio
                </Link>
              </li>
            </ul>
          </div>

          <div className="space-y-3">
            <h3 className="font-sans text-xs uppercase tracking-[0.14em] text-[#F4EFE6] font-semibold">
              Atelier Contact
            </h3>
            <div className="space-y-2 text-sm text-[#857B6E]">
              <p className="text-[#B8AFA2]">{storeSettings.contactEmail}</p>
              {storeSettings.contactPhone && <p>{storeSettings.contactPhone}</p>}
              {storeSettings.studioAddress && (
                <p className="leading-relaxed">{storeSettings.studioAddress}</p>
              )}
            </div>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-[#2E2822] flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#857B6E]">
          <p>
            © {new Date().getFullYear()} {storeSettings.storeName}. Handcrafted in small batches.
          </p>
          <p>Insured domestic shipping · Cash on Delivery &amp; Verified Online Payments</p>
        </div>
      </div>
    </footer>
  );
}
