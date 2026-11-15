import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, SlidersHorizontal, X } from 'lucide-react';
import { ProductCard } from '../components/ProductCard';
import { useStore } from '../context/StoreContext';
import { getEffectivePrice } from '../lib/formatters';

type PriceRange = 'all' | 'under5k' | '5kto15k' | 'over15k';
type SortOption = 'featured' | 'newest' | 'price_asc' | 'price_desc';

export function ShopPage() {
  const { products, productsLoading, categories } = useStore();
  const [searchParams, setSearchParams] = useSearchParams();

  const initialCategory = searchParams.get('category') || 'All';
  const [selectedCategory, setSelectedCategory] = useState(initialCategory);
  const [searchQuery, setSearchQuery] = useState('');
  const [priceRange, setPriceRange] = useState<PriceRange>('all');
  const [sortBy, setSortBy] = useState<SortOption>('featured');
  const [inStockOnly, setInStockOnly] = useState(false);

  useEffect(() => {
    const paramCat = searchParams.get('category');
    if (paramCat) {
      setSelectedCategory(paramCat);
    }
  }, [searchParams]);

  const categoryNames = useMemo(() => {
    const set = new Set<string>(['All']);
    categories.forEach((c) => set.add(c.name));
    products.forEach((p) => set.add(p.category));
    return Array.from(set);
  }, [categories, products]);

  const filteredProducts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    const list = products.filter((p) => {
      if (selectedCategory !== 'All' && p.category !== selectedCategory) {
        return false;
      }
      if (inStockOnly && p.stockQuantity <= 0) {
        return false;
      }
      if (q) {
        const hay = `${p.name} ${p.description} ${p.category} ${p.sku} ${p.materials || ''}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      const price = getEffectivePrice(p);
      if (priceRange === 'under5k' && price >= 5000) return false;
      if (priceRange === '5kto15k' && (price < 5000 || price > 15000)) return false;
      if (priceRange === 'over15k' && price <= 15000) return false;

      return true;
    });

    return [...list].sort((a, b) => {
      if (sortBy === 'price_asc') return getEffectivePrice(a) - getEffectivePrice(b);
      if (sortBy === 'price_desc') return getEffectivePrice(b) - getEffectivePrice(a);
      if (sortBy === 'newest') {
        const aTime = a.createdAt?.toMillis?.() || 0;
        const bTime = b.createdAt?.toMillis?.() || 0;
        return bTime - aTime;
      }
      // featured / popularity
      const aScore = (a.featured ? 2 : 0) + (a.bestSeller ? 1 : 0);
      const bScore = (b.featured ? 2 : 0) + (b.bestSeller ? 1 : 0);
      return bScore - aScore;
    });
  }, [inStockOnly, priceRange, products, searchQuery, selectedCategory, sortBy]);

  function handleCategorySelect(cat: string) {
    setSelectedCategory(cat);
    if (cat === 'All') {
      searchParams.delete('category');
      setSearchParams(searchParams);
    } else {
      setSearchParams({ category: cat });
    }
  }

  function resetFilters() {
    setSelectedCategory('All');
    setSearchQuery('');
    setPriceRange('all');
    setSortBy('featured');
    setInStockOnly(false);
    setSearchParams({});
  }

  return (
    <div className="min-h-[80vh] bg-[#12100E] text-[#F4EFE6]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
        <div className="border-b border-[#2E2822] pb-8 mb-8 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-[#C8A96A] mb-2">
              Studio Catalog
            </p>
            <h1 className="font-serif text-4xl sm:text-5xl text-[#F4EFE6]">
              {selectedCategory === 'All' ? 'All Handcrafted Objects' : selectedCategory}
            </h1>
          </div>
          <p className="text-sm text-[#B8AFA2] tabular-nums">
            Showing {filteredProducts.length} of {products.length} pieces
          </p>
        </div>

        {/* Filter & Search Toolbar */}
        <div className="space-y-4 mb-10">
          <div className="flex flex-col lg:flex-row gap-4 justify-between">
            {/* Search Input */}
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-[#857B6E] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search vessels, lamps, materials, SKU..."
                className="w-full pl-10 pr-9 py-2.5 bg-[#1A1714] border border-[#2E2822] focus:border-[#C8A96A] rounded-md text-sm text-[#F4EFE6] placeholder:text-[#857B6E]"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  aria-label="Clear search"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#857B6E] hover:text-[#F4EFE6]"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Price, Stock & Sort Controls */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="inline-flex items-center gap-2 text-xs text-[#857B6E]">
                <SlidersHorizontal className="w-3.5 h-3.5 text-[#C8A96A]" />
                <span>Filter:</span>
              </div>

              <select
                aria-label="Filter by price range"
                value={priceRange}
                onChange={(e) => setPriceRange(e.target.value as PriceRange)}
                className="px-3 py-2 bg-[#1A1714] border border-[#2E2822] focus:border-[#C8A96A] rounded-md text-xs text-[#F4EFE6]"
              >
                <option value="all">All Prices</option>
                <option value="under5k">Under ₹5,000</option>
                <option value="5kto15k">₹5,000 – ₹15,000</option>
                <option value="over15k">Above ₹15,000</option>
              </select>

              <select
                aria-label="Sort products"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
                className="px-3 py-2 bg-[#1A1714] border border-[#2E2822] focus:border-[#C8A96A] rounded-md text-xs text-[#F4EFE6]"
              >
                <option value="featured">Sort: Featured</option>
                <option value="newest">Sort: Newest</option>
                <option value="price_asc">Price: Low to High</option>
                <option value="price_desc">Price: High to Low</option>
              </select>

              <label className="inline-flex items-center gap-2 px-3 py-2 bg-[#1A1714] border border-[#2E2822] rounded-md text-xs text-[#B8AFA2] cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={inStockOnly}
                  onChange={(e) => setInStockOnly(e.target.checked)}
                  className="accent-[#C8A96A]"
                />
                <span>In Stock Only</span>
              </label>
            </div>
          </div>

          {/* Category Tabs */}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            {categoryNames.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => handleCategorySelect(cat)}
                className={`px-4 py-2 text-xs font-medium rounded-md border transition-colors whitespace-nowrap shrink-0 ${
                  selectedCategory === cat
                    ? 'bg-[#C8A96A] border-[#C8A96A] text-[#12100E]'
                    : 'bg-[#1A1714] border-[#2E2822] text-[#B8AFA2] hover:text-[#F4EFE6] hover:border-[#857B6E]'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Product Grid */}
        {productsLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-7">
            {[1, 2, 3, 4, 5, 6].map((n) => (
              <div
                key={n}
                className="aspect-[4/4.3] rounded-lg bg-[#1A1714] border border-[#2E2822] animate-pulse"
              />
            ))}
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="rounded-lg border border-[#2E2822] bg-[#1A1714] p-14 text-center space-y-4">
            <h2 className="font-serif text-2xl text-[#F4EFE6]">No matching pieces found</h2>
            <p className="text-sm text-[#B8AFA2] max-w-md mx-auto">
              Try clearing your search or widening the selected category and price range.
            </p>
            <button
              type="button"
              onClick={resetFilters}
              className="px-5 py-2.5 bg-[#C8A96A] text-[#12100E] text-sm font-semibold rounded-md hover:bg-[#D9BE84] transition-colors"
            >
              Reset All Filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-7">
            {filteredProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
