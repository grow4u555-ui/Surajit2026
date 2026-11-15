import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Minus, Plus, ShoppingBag, ShieldCheck, Truck } from 'lucide-react';
import { ProductCard } from '../components/ProductCard';
import { useStore } from '../context/StoreContext';
import { formatCurrency, getEffectivePrice } from '../lib/formatters';
import { resolveProductImage } from '../lib/studioAssets';

export function ProductDetailPage() {
  const { productId } = useParams<{ productId: string }>();
  const navigate = useNavigate();
  const { products, productsLoading, addToCart, storeSettings } = useStore();

  const product = useMemo(
    () => products.find((p) => p.id === productId || p.slug === productId),
    [products, productId],
  );

  const [selectedColorIdx, setSelectedColorIdx] = useState(0);
  const [selectedImageIdx, setSelectedImageIdx] = useState(0);
  const [quantity, setQuantity] = useState(1);

  // Reset selected variation & gallery index when switching products
  useEffect(() => {
    setSelectedColorIdx(0);
    setSelectedImageIdx(0);
    setQuantity(1);
  }, [productId]);

  const variations = product?.colorVariations || [];
  const activeVariation = variations[selectedColorIdx] || variations[0];

  // Dynamically switch gallery images when the selected color variation changes
  const activeGalleryImages = useMemo(() => {
    if (!product) return [];
    if (activeVariation && activeVariation.images && activeVariation.images.length > 0) {
      return activeVariation.images;
    }
    return product.images || [];
  }, [activeVariation, product]);

  const mainImage = resolveProductImage(
    activeGalleryImages[selectedImageIdx] || activeGalleryImages[0],
  );

  const availableStock = activeVariation
    ? activeVariation.stock
    : product?.stockQuantity ?? 0;

  const relatedProducts = useMemo(() => {
    if (!product) return [];
    return products
      .filter((p) => p.id !== product.id && p.category === product.category)
      .slice(0, 3);
  }, [product, products]);

  function handleColorSelect(index: number) {
    setSelectedColorIdx(index);
    setSelectedImageIdx(0);
    const nextVar = variations[index];
    const nextMax = nextVar ? nextVar.stock : product?.stockQuantity ?? 1;
    setQuantity((q) => Math.max(1, Math.min(q, Math.max(1, nextMax))));
  }

  if (productsLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
          <div className="lg:col-span-7 aspect-[4/3] rounded-lg bg-[#1A1714] animate-pulse" />
          <div className="lg:col-span-5 h-96 rounded-lg bg-[#1A1714] animate-pulse" />
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-24 text-center space-y-5">
        <h1 className="font-serif text-4xl text-[#F4EFE6]">Object Not Found</h1>
        <p className="text-sm text-[#B8AFA2]">
          This piece may have been retired or moved from the current studio collection.
        </p>
        <Link
          to="/shop"
          className="inline-flex items-center gap-2 px-6 py-3 bg-[#C8A96A] text-[#12100E] text-sm font-semibold rounded-md"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Return to Shop</span>
        </Link>
      </div>
    );
  }

  const effectivePrice = getEffectivePrice(product);
  const hasDiscount = effectivePrice < product.price;
  const savingsPct = hasDiscount
    ? Math.round(((product.price - effectivePrice) / product.price) * 100)
    : 0;

  const selectedColorName = activeVariation?.name || 'Standard';

  return (
    <div className="bg-[#12100E] text-[#F4EFE6]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
        <nav className="flex items-center gap-2 text-xs text-[#857B6E] mb-8">
          <Link to="/shop" className="hover:text-[#C8A96A] transition-colors inline-flex items-center gap-1.5">
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Shop</span>
          </Link>
          <span aria-hidden="true">/</span>
          <Link
            to={`/shop?category=${encodeURIComponent(product.category)}`}
            className="hover:text-[#C8A96A] transition-colors"
          >
            {product.category}
          </Link>
          <span aria-hidden="true">/</span>
          <span className="text-[#B8AFA2] truncate">{product.name}</span>
        </nav>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-start">
          {/* Left Sticky Image Gallery */}
          <div className="lg:col-span-7 lg:sticky lg:top-24 space-y-4">
            <div className="aspect-[4/3] w-full rounded-lg overflow-hidden bg-[#1A1714] border border-[#2E2822]">
              <img
                src={mainImage}
                alt={`${product.name} — ${selectedColorName}`}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover transition-opacity duration-300"
              />
            </div>

            {activeGalleryImages.length > 1 && (
              <div className="grid grid-cols-4 sm:grid-cols-5 gap-3">
                {activeGalleryImages.map((imgUrl, idx) => (
                  <button
                    key={`${selectedColorName}-${idx}`}
                    type="button"
                    onClick={() => setSelectedImageIdx(idx)}
                    className={`aspect-[4/3] rounded-md overflow-hidden border transition-all bg-[#1A1714] ${
                      idx === selectedImageIdx
                        ? 'border-[#C8A96A] ring-1 ring-[#C8A96A]'
                        : 'border-[#2E2822] opacity-70 hover:opacity-100'
                    }`}
                  >
                    <img
                      src={resolveProductImage(imgUrl)}
                      alt={`${product.name} view ${idx + 1}`}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Right Contiguous Purchase Module */}
          <div className="lg:col-span-5 space-y-6">
            <div className="space-y-3 border-b border-[#2E2822] pb-6">
              <div className="flex items-center justify-between text-xs text-[#857B6E]">
                <span className="uppercase tracking-[0.16em] text-[#C8A96A]">
                  {product.category}
                </span>
                <span className="font-mono">{product.sku}</span>
              </div>

              <h1 className="font-serif text-3xl sm:text-4xl leading-tight text-[#F4EFE6]">
                {product.name}
              </h1>

              <div className="flex items-baseline gap-3 pt-1 tabular-nums">
                <span className="text-2xl font-semibold text-[#F4EFE6]">
                  {formatCurrency(effectivePrice, storeSettings.currencySymbol)}
                </span>
                {hasDiscount && (
                  <>
                    <span className="text-base text-[#857B6E] line-through">
                      {formatCurrency(product.price, storeSettings.currencySymbol)}
                    </span>
                    <span className="text-xs text-[#C8A96A] font-medium">
                      Save {savingsPct}%
                    </span>
                  </>
                )}
              </div>

              <p className="text-xs text-[#B8AFA2]">
                {availableStock <= 0
                  ? 'Currently Sold Out in this finish'
                  : availableStock <= 4
                    ? `Limited Studio Stock — Only ${availableStock} remaining`
                    : `In Stock (${availableStock} available for dispatch)`}
              </p>
            </div>

            <p className="text-sm sm:text-base text-[#B8AFA2] leading-relaxed">
              {product.description}
            </p>

            {/* Color Variations Selector */}
            {variations.length > 0 && (
              <div className="space-y-3 pt-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="uppercase tracking-[0.14em] text-[#857B6E]">
                    Finish / Color
                  </span>
                  <span className="text-[#F4EFE6] font-medium">{selectedColorName}</span>
                </div>

                <div className="flex flex-wrap gap-3">
                  {variations.map((v, idx) => {
                    const isSelected = idx === selectedColorIdx;
                    return (
                      <button
                        key={v.name}
                        type="button"
                        onClick={() => handleColorSelect(idx)}
                        className={`inline-flex items-center gap-2.5 px-3.5 py-2 rounded-md border text-xs transition-all ${
                          isSelected
                            ? 'border-[#C8A96A] bg-[#1E1A16] text-[#F4EFE6]'
                            : 'border-[#2E2822] bg-[#161310] text-[#B8AFA2] hover:border-[#857B6E]'
                        }`}
                      >
                        <span
                          className="w-4 h-4 rounded-full border border-white/20 shrink-0"
                          style={{ backgroundColor: v.hex || '#857B6E' }}
                        />
                        <span>{v.name}</span>
                        {v.stock <= 0 && (
                          <span className="text-[#E08A7B]">(Sold out)</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Quantity + Primary Purchase Actions */}
            <div className="space-y-4 pt-2">
              <div className="flex items-center gap-4">
                <span className="text-xs uppercase tracking-[0.14em] text-[#857B6E]">
                  Quantity
                </span>
                <div className="inline-flex items-center border border-[#2E2822] rounded-md bg-[#1A1714]">
                  <button
                    type="button"
                    disabled={quantity <= 1}
                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                    aria-label="Decrease quantity"
                    className="px-3.5 py-2.5 text-[#B8AFA2] hover:text-[#F4EFE6] disabled:opacity-40"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="px-4 text-sm font-medium tabular-nums text-[#F4EFE6]">
                    {quantity}
                  </span>
                  <button
                    type="button"
                    disabled={quantity >= availableStock}
                    onClick={() => setQuantity((q) => Math.min(availableStock, q + 1))}
                    aria-label="Increase quantity"
                    className="px-3.5 py-2.5 text-[#B8AFA2] hover:text-[#F4EFE6] disabled:opacity-40"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  disabled={availableStock <= 0}
                  onClick={() => addToCart(product, selectedColorName, quantity, true)}
                  className="py-3.5 px-6 border border-[#C8A96A] text-[#F4EFE6] hover:bg-[#C8A96A]/15 text-sm font-semibold rounded-md inline-flex items-center justify-center gap-2 transition-colors disabled:opacity-40 disabled:pointer-events-none"
                >
                  <ShoppingBag className="w-4 h-4" />
                  <span>Add to Bag</span>
                </button>

                <button
                  type="button"
                  disabled={availableStock <= 0}
                  onClick={() => {
                    addToCart(product, selectedColorName, quantity, false);
                    navigate('/checkout');
                  }}
                  className="py-3.5 px-6 bg-[#C8A96A] hover:bg-[#D9BE84] text-[#12100E] text-sm font-semibold rounded-md transition-colors disabled:opacity-40 disabled:pointer-events-none"
                >
                  Buy Now
                </button>
              </div>
            </div>

            {/* Materials & Dimensions Specifications */}
            {(product.materials || product.dimensions) && (
              <div className="pt-6 border-t border-[#2E2822] space-y-3 text-sm">
                {product.materials && (
                  <div className="grid grid-cols-3 gap-2">
                    <span className="text-xs uppercase tracking-[0.12em] text-[#857B6E]">
                      Materials
                    </span>
                    <span className="col-span-2 text-[#B8AFA2]">{product.materials}</span>
                  </div>
                )}
                {product.dimensions && (
                  <div className="grid grid-cols-3 gap-2">
                    <span className="text-xs uppercase tracking-[0.12em] text-[#857B6E]">
                      Dimensions
                    </span>
                    <span className="col-span-2 text-[#B8AFA2]">{product.dimensions}</span>
                  </div>
                )}
              </div>
            )}

            <div className="pt-4 border-t border-[#2E2822] space-y-2.5 text-xs text-[#B8AFA2]">
              <div className="flex items-center gap-2.5">
                <Truck className="w-4 h-4 text-[#C8A96A] shrink-0" />
                <span>
                  Complimentary insured shipping above{' '}
                  {formatCurrency(
                    storeSettings.freeShippingThreshold,
                    storeSettings.currencySymbol,
                  )}
                </span>
              </div>
              <div className="flex items-center gap-2.5">
                <ShieldCheck className="w-4 h-4 text-[#C8A96A] shrink-0" />
                <span>Cash on Delivery &amp; Verified Online Checkout available across India</span>
              </div>
            </div>
          </div>
        </div>

        {/* Related Products */}
        {relatedProducts.length > 0 && (
          <section className="mt-20 pt-14 border-t border-[#2E2822]">
            <h2 className="font-serif text-3xl text-[#F4EFE6] mb-8">
              Complementary Pieces
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-7">
              {relatedProducts.map((rel) => (
                <ProductCard key={rel.id} product={rel} />
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
