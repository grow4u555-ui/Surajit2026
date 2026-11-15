import type { Product } from '../types/store';

export function formatCurrency(amount: number, symbol = '₹'): string {
  const safe = Number.isFinite(amount) ? amount : 0;
  return `${symbol}${safe.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
}

export function getEffectivePrice(product: Product): number {
  if (
    product.discountPrice !== undefined &&
    product.discountPrice !== null &&
    product.discountPrice > 0 &&
    product.discountPrice < product.price
  ) {
    return product.discountPrice;
  }
  return product.price;
}

export function getVariationStock(product: Product, colorName: string): number {
  if (!product.colorVariations || product.colorVariations.length === 0) {
    return product.stockQuantity;
  }
  const found = product.colorVariations.find((v) => v.name === colorName);
  return found ? found.stock : product.stockQuantity;
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}
