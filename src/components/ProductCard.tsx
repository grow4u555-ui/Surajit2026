import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ShoppingBag } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { formatCurrency, getEffectivePrice } from '../lib/formatters';
import { resolveProductImage } from '../lib/studioAssets';
import type { Product } from '../types/store';

interface ProductCardProps {
  product: Product;
}

export function ProductCard({ product }: ProductCardProps) {
  const { addToCart, storeSettings } = useStore();
  const [selectedVariationIdx, setSelectedVariationIdx] = useState(0);
  const [imgError, setImgError] = useState(false);

  const variations = product.colorVariations || [];
  const activeVariation = variations[selectedVariationIdx] || variations[0];
  const rawImage =
    (activeVariation && activeVariation.images && activeVariation.images[0]) ||
    product.images[0];
  const displayImage = resolveProductImage(rawImage);

  const effectivePrice = getEffectivePrice(product);
  const hasDiscount = effectivePrice < product.price;
  const activeStock = activeVariation ? activeVariation.stock : product.stockQuantity;
  const stockLabel =
    activeStock <= 0
      ? 'Sold Out'
      : activeStock <= 4
        ? `Low Stock (${activeStock} left)`
        : 'In Stock';

  return (
    <article className="group flex flex-col bg-[#1A1714] border border-[#2E2822] rounded-lg overflow-hidden transition-transform duration-200 hover:-translate-y-0.5 hover:border-[#C8A96A]/40">
      <Link
        to={`/product/${product.id}`}
        className="relative aspect-[4/3] w-full overflow-hidden bg-[#14110F] block"
      >
        {!imgError ? (
          <img
            src={displayImage}
            alt={`${product.name}${activeVariation ? ` in ${activeVariation.name}` : ''}`}
            referrerPolicy="no-referrer"
            onError={() => setImgError(true)}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-[#231F1B] to-[#14110F] p-6 text-center">
            <span className="font-serif text-lg text-[#C8A96A]">{product.name}</span>
          </div>
        )}
      </Link>

      <div className="flex flex-col flex-1 p-5 gap-3">
        <div className="flex items-center justify-between gap-2 text-xs text-[#857B6E]">
          <div className="flex items-center gap-1.5 truncate">
            <span className="uppercase tracking-[0.12em] text-[#B8AFA2]">{product.category}</span>
            <span aria-hidden="true">·</span>
            <span className={activeStock <= 0 ? 'text-[#E08A7B]' : 'text-[#857B6E]'}>
              {stockLabel}
            </span>
          </div>
        </div>

        <Link
          to={`/product/${product.id}`}
          className="font-serif text-xl leading-snug text-[#F4EFE6] group-hover:text-[#C8A96A] transition-colors line-clamp-2"
        >
          {product.name}
        </Link>

        {variations.length > 0 && (
          <div className="flex items-center gap-2 pt-0.5">
            {variations.map((v, idx) => (
              <button
                key={v.name}
                type="button"
                onClick={() => {
                  setSelectedVariationIdx(idx);
                  setImgError(false);
                }}
                title={v.name}
                aria-label={`Select ${v.name}`}
                className={`w-4 h-4 rounded-full border transition-all ${
                  idx === selectedVariationIdx
                    ? 'border-[#C8A96A] scale-110 ring-2 ring-[#C8A96A]/30'
                    : 'border-[#F4EFE6]/25 hover:border-[#F4EFE6]/60'
                }`}
                style={{ backgroundColor: v.hex || '#857B6E' }}
              />
            ))}
            <span className="text-xs text-[#857B6E] truncate ml-1">
              {activeVariation?.name}
            </span>
          </div>
        )}

        <div className="mt-auto pt-3 border-t border-[#2E2822] flex items-center justify-between gap-3">
          <div className="flex items-baseline gap-2 tabular-nums">
            <span className="text-base font-semibold text-[#F4EFE6]">
              {formatCurrency(effectivePrice, storeSettings.currencySymbol)}
            </span>
            {hasDiscount && (
              <span className="text-xs text-[#857B6E] line-through">
                {formatCurrency(product.price, storeSettings.currencySymbol)}
              </span>
            )}
          </div>

          <button
            type="button"
            disabled={activeStock <= 0}
            onClick={() =>
              addToCart(product, activeVariation?.name || 'Standard', 1, true)
            }
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium rounded-md border border-[#C8A96A]/50 text-[#F4EFE6] hover:bg-[#C8A96A] hover:text-[#12100E] hover:border-[#C8A96A] transition-colors disabled:opacity-40 disabled:pointer-events-none whitespace-nowrap shrink-0"
          >
            <ShoppingBag className="w-3.5 h-3.5" />
            <span>{activeStock <= 0 ? 'Sold Out' : 'Add'}</span>
          </button>
        </div>
      </div>
    </article>
  );
}
