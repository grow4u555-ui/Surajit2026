import { useNavigate } from 'react-router-dom';
import { Minus, Plus, ShoppingBag, Trash2, X, ArrowRight } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { formatCurrency } from '../lib/formatters';
import { resolveProductImage } from '../lib/studioAssets';

export function CartDrawer() {
  const navigate = useNavigate();
  const {
    isCartOpen,
    setIsCartOpen,
    cartItems,
    cartCount,
    cartSubtotal,
    cartDiscountSavings,
    shippingCost,
    cartTotal,
    storeSettings,
    updateCartQuantity,
    changeCartVariation,
    removeFromCart,
  } = useStore();

  if (!isCartOpen) return null;

  const remainingForFreeShipping = Math.max(
    0,
    storeSettings.freeShippingThreshold - cartSubtotal,
  );

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div
        className="fixed inset-0 bg-black/70 backdrop-blur-xs transition-opacity"
        onClick={() => setIsCartOpen(false)}
      />

      <aside
        aria-label="Shopping Bag"
        className="relative z-10 w-full max-w-md bg-[#161310] border-l border-[#2E2822] h-full flex flex-col shadow-2xl"
      >
        <div className="px-6 py-5 border-b border-[#2E2822] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <ShoppingBag className="w-4 h-4 text-[#C8A96A]" />
            <h2 className="font-serif text-2xl text-[#F4EFE6]">
              Your Bag ({cartCount})
            </h2>
          </div>
          <button
            type="button"
            onClick={() => setIsCartOpen(false)}
            aria-label="Close bag"
            className="p-2 text-[#B8AFA2] hover:text-[#F4EFE6] rounded-md transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {cartItems.length > 0 && storeSettings.freeShippingThreshold > 0 && (
          <div className="px-6 py-3 bg-[#1A1714] border-b border-[#2E2822] text-xs text-[#B8AFA2]">
            {remainingForFreeShipping === 0 ? (
              <span className="text-[#C8A96A]">
                Complimentary insured shipping unlocked for your order.
              </span>
            ) : (
              <span>
                Add{' '}
                <strong className="text-[#F4EFE6] tabular-nums">
                  {formatCurrency(remainingForFreeShipping, storeSettings.currencySymbol)}
                </strong>{' '}
                more for complimentary shipping.
              </span>
            )}
          </div>
        )}

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {cartItems.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center py-16">
              <ShoppingBag className="w-10 h-10 text-[#857B6E] mb-4 stroke-[1.25]" />
              <p className="font-serif text-2xl text-[#F4EFE6] mb-2">Your bag is empty</p>
              <p className="text-sm text-[#B8AFA2] max-w-xs mb-6">
                Explore wheel-thrown ceramics, alabaster lighting, and hand-loomed throws crafted in small batches.
              </p>
              <button
                type="button"
                onClick={() => {
                  setIsCartOpen(false);
                  navigate('/shop');
                }}
                className="px-6 py-2.5 bg-[#C8A96A] text-[#12100E] text-sm font-semibold rounded-md hover:bg-[#D9BE84] transition-colors"
              >
                Explore Collection
              </button>
            </div>
          ) : (
            cartItems.map((item) => {
              const variations = item.product.colorVariations || [];
              return (
                <div
                  key={item.id}
                  className="flex gap-4 pb-5 border-b border-[#2E2822] last:border-b-0"
                >
                  <img
                    src={resolveProductImage(item.image)}
                    alt={item.product.name}
                    referrerPolicy="no-referrer"
                    className="w-20 h-20 object-cover rounded-md bg-[#1A1714] border border-[#2E2822] shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setIsCartOpen(false);
                          navigate(`/product/${item.product.id}`);
                        }}
                        className="font-serif text-lg text-[#F4EFE6] hover:text-[#C8A96A] text-left leading-tight truncate"
                      >
                        {item.product.name}
                      </button>
                      <button
                        type="button"
                        onClick={() => removeFromCart(item.id)}
                        aria-label={`Remove ${item.product.name}`}
                        className="text-[#857B6E] hover:text-[#E08A7B] p-1 transition-colors shrink-0"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    {variations.length > 1 ? (
                      <div className="mt-1.5">
                        <label className="sr-only" htmlFor={`var-${item.id}`}>
                          Finish variation
                        </label>
                        <select
                          id={`var-${item.id}`}
                          value={item.selectedColor}
                          onChange={(e) => changeCartVariation(item.id, e.target.value)}
                          className="text-xs bg-[#1A1714] border border-[#2E2822] text-[#B8AFA2] rounded px-2 py-1 focus:border-[#C8A96A]"
                        >
                          {variations.map((v) => (
                            <option key={v.name} value={v.name} disabled={v.stock <= 0}>
                              {v.name} {v.stock <= 0 ? '(Sold Out)' : ''}
                            </option>
                          ))}
                        </select>
                      </div>
                    ) : (
                      <p className="text-xs text-[#857B6E] mt-1">{item.selectedColor}</p>
                    )}

                    <div className="mt-3 flex items-center justify-between">
                      <div className="inline-flex items-center border border-[#2E2822] rounded-md bg-[#1A1714]">
                        <button
                          type="button"
                          onClick={() => updateCartQuantity(item.id, item.quantity - 1)}
                          aria-label="Decrease quantity"
                          className="px-2.5 py-1.5 text-[#B8AFA2] hover:text-[#F4EFE6] transition-colors"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span className="px-2.5 text-xs font-medium tabular-nums text-[#F4EFE6]">
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          disabled={item.quantity >= item.maxStock}
                          onClick={() => updateCartQuantity(item.id, item.quantity + 1)}
                          aria-label="Increase quantity"
                          className="px-2.5 py-1.5 text-[#B8AFA2] hover:text-[#F4EFE6] transition-colors disabled:opacity-40"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <span className="text-sm font-semibold tabular-nums text-[#F4EFE6]">
                        {formatCurrency(
                          item.unitPrice * item.quantity,
                          storeSettings.currencySymbol,
                        )}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {cartItems.length > 0 && (
          <div className="px-6 py-5 border-t border-[#2E2822] bg-[#14110F] space-y-3">
            <div className="space-y-1.5 text-sm">
              <div className="flex justify-between text-[#B8AFA2]">
                <span>Subtotal</span>
                <span className="tabular-nums text-[#F4EFE6]">
                  {formatCurrency(cartSubtotal, storeSettings.currencySymbol)}
                </span>
              </div>
              {cartDiscountSavings > 0 && (
                <div className="flex justify-between text-[#C8A96A] text-xs">
                  <span>Collection Savings</span>
                  <span className="tabular-nums">
                    -{formatCurrency(cartDiscountSavings, storeSettings.currencySymbol)}
                  </span>
                </div>
              )}
              <div className="flex justify-between text-[#B8AFA2]">
                <span>Shipping</span>
                <span className="tabular-nums text-[#F4EFE6]">
                  {shippingCost === 0
                    ? 'Complimentary'
                    : formatCurrency(shippingCost, storeSettings.currencySymbol)}
                </span>
              </div>
              <div className="flex justify-between pt-2.5 border-t border-[#2E2822] text-base font-semibold text-[#F4EFE6]">
                <span>Estimated Total</span>
                <span className="tabular-nums">
                  {formatCurrency(cartTotal, storeSettings.currencySymbol)}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                setIsCartOpen(false);
                navigate('/checkout');
              }}
              className="w-full py-3 px-5 bg-[#C8A96A] hover:bg-[#D9BE84] text-[#12100E] font-semibold text-sm rounded-md inline-flex items-center justify-center gap-2 transition-colors"
            >
              <span>Proceed to Checkout</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </aside>
    </div>
  );
}
