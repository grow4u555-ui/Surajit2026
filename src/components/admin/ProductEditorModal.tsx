import { useState } from 'react';
import { Plus, Trash2, Upload, X } from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { slugify } from '../../lib/formatters';
import { resolveProductImage, STUDIO_ASSET_OPTIONS } from '../../lib/studioAssets';
import { saveProduct, uploadProductImage } from '../../services/firestoreService';
import type { ColorVariation, Product } from '../../types/store';

interface ProductEditorModalProps {
  product: Product | null;
  onClose: () => void;
}

export function ProductEditorModal({ product, onClose }: ProductEditorModalProps) {
  const { categories, showToast } = useStore();
  const isNew = !product;

  const [productId] = useState(
    () => product?.id || `prod_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
  );
  const [name, setName] = useState(product?.name || '');
  const [slug, setSlug] = useState(product?.slug || '');
  const [sku, setSku] = useState(product?.sku || `KL-${Math.floor(100 + Math.random() * 900)}`);
  const [category, setCategory] = useState(
    product?.category || categories[0]?.name || 'Ceramics',
  );
  const [price, setPrice] = useState(product?.price?.toString() || '');
  const [discountPrice, setDiscountPrice] = useState(
    product?.discountPrice ? product.discountPrice.toString() : '',
  );
  const [stockQuantity, setStockQuantity] = useState(
    product?.stockQuantity?.toString() || '10',
  );
  const [materials, setMaterials] = useState(product?.materials || '');
  const [dimensions, setDimensions] = useState(product?.dimensions || '');
  const [description, setDescription] = useState(product?.description || '');
  const [featured, setFeatured] = useState(product?.featured ?? true);
  const [bestSeller, setBestSeller] = useState(product?.bestSeller ?? false);
  const [newArrival, setNewArrival] = useState(product?.newArrival ?? true);

  const [images, setImages] = useState<string[]>(product?.images || []);
  const [newImageUrl, setNewImageUrl] = useState('');
  const [colorVariations, setColorVariations] = useState<ColorVariation[]>(
    product?.colorVariations || [],
  );

  const [uploadingTarget, setUploadingTarget] = useState<string | null>(null);
  const [uploadPct, setUploadPct] = useState(0);
  const [saving, setSaving] = useState(false);

  async function handleMainFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setUploadingTarget('main');
    try {
      const urls: string[] = [];
      for (const file of Array.from(files)) {
        const url = await uploadProductImage(productId, file, (pct) => setUploadPct(pct));
        urls.push(url);
      }
      setImages((prev) => [...prev, ...urls].slice(0, 12));
      showToast('Image uploaded to Firebase Storage.', 'success');
    } catch {
      showToast(
        'Storage upload failed. Ensure Firebase Storage is enabled in your Firebase project.',
        'error',
      );
    } finally {
      setUploadingTarget(null);
      setUploadPct(0);
      e.target.value = '';
    }
  }

  async function handleVariationFileUpload(
    varIdx: number,
    e: React.ChangeEvent<HTMLInputElement>,
  ) {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setUploadingTarget(`var-${varIdx}`);
    try {
      const urls: string[] = [];
      for (const file of Array.from(files)) {
        const url = await uploadProductImage(productId, file, (pct) => setUploadPct(pct));
        urls.push(url);
      }
      setColorVariations((prev) =>
        prev.map((v, i) =>
          i === varIdx ? { ...v, images: [...v.images, ...urls].slice(0, 12) } : v,
        ),
      );
      showToast('Variation image uploaded.', 'success');
    } catch {
      showToast(
        'Storage upload failed. You can also paste an image URL or select a studio asset.',
        'error',
      );
    } finally {
      setUploadingTarget(null);
      setUploadPct(0);
      e.target.value = '';
    }
  }

  function addColorVariation() {
    setColorVariations((prev) => [
      ...prev,
      {
        name: `Finish ${prev.length + 1}`,
        hex: '#C8A96A',
        images: [],
        stock: 5,
      },
    ]);
  }

  function updateVariation(idx: number, patch: Partial<ColorVariation>) {
    setColorVariations((prev) =>
      prev.map((v, i) => (i === idx ? { ...v, ...patch } : v)),
    );
  }

  function removeVariation(idx: number) {
    setColorVariations((prev) => prev.filter((_, i) => i !== idx));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const numPrice = Number(price);
    const numDiscount = discountPrice ? Number(discountPrice) : null;

    if (!name.trim() || !description.trim() || !Number.isFinite(numPrice) || numPrice <= 0) {
      showToast('Please enter a valid product name, description, and price.', 'error');
      return;
    }
    if (numDiscount !== null && (numDiscount <= 0 || numDiscount > numPrice)) {
      showToast('Discount price must be greater than 0 and less than regular price.', 'error');
      return;
    }

    const fallbackImage =
      images[0] || colorVariations.find((v) => v.images.length > 0)?.images[0];
    if (!fallbackImage) {
      showToast('Please add at least one product image.', 'error');
      return;
    }

    const finalImages = images.length > 0 ? images : [fallbackImage];
    const computedStock =
      colorVariations.length > 0
        ? colorVariations.reduce((sum, v) => sum + Math.max(0, Math.floor(v.stock)), 0)
        : Math.max(0, Math.floor(Number(stockQuantity) || 0));

    setSaving(true);
    try {
      await saveProduct(
        {
          id: productId,
          name: name.trim(),
          slug: (slug.trim() || slugify(name)).slice(0, 160),
          description: description.trim(),
          category: category.trim(),
          price: numPrice,
          discountPrice: numDiscount,
          images: finalImages,
          colorVariations,
          stockQuantity: computedStock,
          sku: sku.trim(),
          featured,
          bestSeller,
          newArrival,
          materials: materials.trim() || null,
          dimensions: dimensions.trim() || null,
        },
        isNew,
      );
      showToast(isNew ? 'Product created in Firestore.' : 'Product updated.', 'success');
      onClose();
    } catch {
      showToast('Could not save product. Verify admin permissions.', 'error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
      <div className="w-full max-w-4xl max-h-[90vh] bg-[#161310] border border-[#2E2822] rounded-lg flex flex-col overflow-hidden shadow-2xl">
        <div className="px-6 py-4 border-b border-[#2E2822] flex items-center justify-between">
          <h2 className="font-serif text-2xl text-[#F4EFE6]">
            {isNew ? 'Add New Handcrafted Product' : `Edit ${product.name}`}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="p-1.5 text-[#857B6E] hover:text-[#F4EFE6]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={(e) => void handleSubmit(e)} className="flex-1 overflow-y-auto p-6 space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-[#B8AFA2] mb-1">Product Name *</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (isNew) setSlug(slugify(e.target.value));
                }}
                className="w-full px-3.5 py-2 bg-[#12100E] border border-[#2E2822] focus:border-[#C8A96A] rounded-md text-sm text-[#F4EFE6]"
              />
            </div>

            <div>
              <label className="block text-xs text-[#B8AFA2] mb-1">URL Slug *</label>
              <input
                type="text"
                required
                value={slug}
                onChange={(e) => setSlug(slugify(e.target.value))}
                className="w-full px-3.5 py-2 bg-[#12100E] border border-[#2E2822] focus:border-[#C8A96A] rounded-md text-sm text-[#F4EFE6] font-mono"
              />
            </div>

            <div>
              <label className="block text-xs text-[#B8AFA2] mb-1">Category *</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3.5 py-2 bg-[#12100E] border border-[#2E2822] focus:border-[#C8A96A] rounded-md text-sm text-[#F4EFE6]"
              >
                {Array.from(
                  new Set([
                    ...categories.map((c) => c.name),
                    'Ceramics',
                    'Lighting',
                    'Textiles',
                    'Wood & Brass',
                  ]),
                ).map((catName) => (
                  <option key={catName} value={catName}>
                    {catName}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs text-[#B8AFA2] mb-1">SKU *</label>
              <input
                type="text"
                required
                value={sku}
                onChange={(e) => setSku(e.target.value)}
                className="w-full px-3.5 py-2 bg-[#12100E] border border-[#2E2822] focus:border-[#C8A96A] rounded-md text-sm text-[#F4EFE6] font-mono"
              />
            </div>

            <div>
              <label className="block text-xs text-[#B8AFA2] mb-1">Regular Price (₹) *</label>
              <input
                type="number"
                min={1}
                required
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="w-full px-3.5 py-2 bg-[#12100E] border border-[#2E2822] focus:border-[#C8A96A] rounded-md text-sm text-[#F4EFE6] tabular-nums"
              />
            </div>

            <div>
              <label className="block text-xs text-[#B8AFA2] mb-1">
                Discount Price (₹, optional)
              </label>
              <input
                type="number"
                min={0}
                value={discountPrice}
                onChange={(e) => setDiscountPrice(e.target.value)}
                placeholder="Leave blank for none"
                className="w-full px-3.5 py-2 bg-[#12100E] border border-[#2E2822] focus:border-[#C8A96A] rounded-md text-sm text-[#F4EFE6] tabular-nums"
              />
            </div>

            <div>
              <label className="block text-xs text-[#B8AFA2] mb-1">
                Stock Quantity {colorVariations.length > 0 ? '(Auto-summed from colors)' : '*'}
              </label>
              <input
                type="number"
                min={0}
                disabled={colorVariations.length > 0}
                value={
                  colorVariations.length > 0
                    ? colorVariations.reduce((s, v) => s + Math.max(0, v.stock), 0)
                    : stockQuantity
                }
                onChange={(e) => setStockQuantity(e.target.value)}
                className="w-full px-3.5 py-2 bg-[#12100E] border border-[#2E2822] rounded-md text-sm text-[#F4EFE6] tabular-nums disabled:opacity-60"
              />
            </div>

            <div>
              <label className="block text-xs text-[#B8AFA2] mb-1">Materials</label>
              <input
                type="text"
                value={materials}
                onChange={(e) => setMaterials(e.target.value)}
                placeholder="Stoneware clay, solid brushed brass..."
                className="w-full px-3.5 py-2 bg-[#12100E] border border-[#2E2822] focus:border-[#C8A96A] rounded-md text-sm text-[#F4EFE6]"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs text-[#B8AFA2] mb-1">Dimensions</label>
              <input
                type="text"
                value={dimensions}
                onChange={(e) => setDimensions(e.target.value)}
                placeholder="34 cm H x 22 cm Dia"
                className="w-full px-3.5 py-2 bg-[#12100E] border border-[#2E2822] focus:border-[#C8A96A] rounded-md text-sm text-[#F4EFE6]"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs text-[#B8AFA2] mb-1">Description *</label>
              <textarea
                rows={3}
                required
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3.5 py-2 bg-[#12100E] border border-[#2E2822] focus:border-[#C8A96A] rounded-md text-sm text-[#F4EFE6]"
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-6 pt-2">
            <label className="inline-flex items-center gap-2 text-xs text-[#F4EFE6] cursor-pointer">
              <input
                type="checkbox"
                checked={featured}
                onChange={(e) => setFeatured(e.target.checked)}
                className="accent-[#C8A96A]"
              />
              <span>Featured on Homepage</span>
            </label>
            <label className="inline-flex items-center gap-2 text-xs text-[#F4EFE6] cursor-pointer">
              <input
                type="checkbox"
                checked={bestSeller}
                onChange={(e) => setBestSeller(e.target.checked)}
                className="accent-[#C8A96A]"
              />
              <span>Best Seller</span>
            </label>
            <label className="inline-flex items-center gap-2 text-xs text-[#F4EFE6] cursor-pointer">
              <input
                type="checkbox"
                checked={newArrival}
                onChange={(e) => setNewArrival(e.target.checked)}
                className="accent-[#C8A96A]"
              />
              <span>New Arrival</span>
            </label>
          </div>

          {/* Primary Product Images */}
          <div className="pt-4 border-t border-[#2E2822] space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="font-serif text-xl text-[#F4EFE6]">Main Product Gallery</h3>
              <label className="inline-flex items-center gap-2 px-3.5 py-2 bg-[#1E1A16] border border-[#C8A96A]/50 hover:border-[#C8A96A] rounded-md text-xs text-[#F4EFE6] cursor-pointer">
                <Upload className="w-3.5 h-3.5 text-[#C8A96A]" />
                <span>
                  {uploadingTarget === 'main'
                    ? `Uploading (${uploadPct}%)...`
                    : 'Upload to Firebase Storage'}
                </span>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={(e) => void handleMainFileUpload(e)}
                  className="sr-only"
                />
              </label>
            </div>

            <div className="flex flex-wrap gap-2">
              <input
                type="text"
                value={newImageUrl}
                onChange={(e) => setNewImageUrl(e.target.value)}
                placeholder="Or paste image URL (https://...)"
                className="flex-1 min-w-[200px] px-3 py-2 bg-[#12100E] border border-[#2E2822] rounded-md text-xs text-[#F4EFE6]"
              />
              <button
                type="button"
                onClick={() => {
                  if (newImageUrl.trim()) {
                    setImages((prev) => [...prev, newImageUrl.trim()].slice(0, 12));
                    setNewImageUrl('');
                  }
                }}
                className="px-3.5 py-2 bg-[#231F1B] border border-[#2E2822] text-xs text-[#F4EFE6] rounded-md hover:border-[#C8A96A]"
              >
                Add URL
              </button>
              <select
                value=""
                onChange={(e) => {
                  if (e.target.value) {
                    setImages((prev) => [...prev, e.target.value].slice(0, 12));
                  }
                }}
                className="px-3 py-2 bg-[#12100E] border border-[#2E2822] rounded-md text-xs text-[#B8AFA2]"
              >
                <option value="">+ Pick Studio Asset</option>
                {STUDIO_ASSET_OPTIONS.map((opt) => (
                  <option key={opt.path} value={opt.path}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {images.length > 0 && (
              <div className="grid grid-cols-4 sm:grid-cols-6 gap-3 pt-1">
                {images.map((img, idx) => (
                  <div key={`${img}-${idx}`} className="relative group aspect-square rounded overflow-hidden border border-[#2E2822]">
                    <img
                      src={resolveProductImage(img)}
                      alt={`Product ${idx + 1}`}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => setImages((prev) => prev.filter((_, i) => i !== idx))}
                      aria-label="Remove image"
                      className="absolute top-1 right-1 p-1 bg-black/75 text-[#E08A7B] rounded opacity-90 hover:opacity-100"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Color Variations & Variation-Specific Images */}
          <div className="pt-4 border-t border-[#2E2822] space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-serif text-xl text-[#F4EFE6]">
                  Color Variations &amp; Specific Images
                </h3>
                <p className="text-xs text-[#857B6E]">
                  Customers see each color&apos;s gallery automatically when they switch finishes.
                </p>
              </div>
              <button
                type="button"
                onClick={addColorVariation}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-[#C8A96A] text-[#12100E] text-xs font-semibold rounded-md hover:bg-[#D9BE84]"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Color</span>
              </button>
            </div>

            <div className="space-y-4">
              {colorVariations.map((variation, vIdx) => (
                <div
                  key={vIdx}
                  className="p-4 rounded-lg border border-[#2E2822] bg-[#12100E] space-y-3"
                >
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
                    <div className="sm:col-span-5">
                      <label className="block text-[11px] text-[#857B6E] mb-1">
                        Color / Finish Name
                      </label>
                      <input
                        type="text"
                        required
                        value={variation.name}
                        onChange={(e) => updateVariation(vIdx, { name: e.target.value })}
                        className="w-full px-3 py-1.5 bg-[#1A1714] border border-[#2E2822] rounded text-xs text-[#F4EFE6]"
                      />
                    </div>

                    <div className="sm:col-span-3">
                      <label className="block text-[11px] text-[#857B6E] mb-1">Swatch Hex</label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={variation.hex}
                          onChange={(e) => updateVariation(vIdx, { hex: e.target.value })}
                          className="w-8 h-8 rounded border border-[#2E2822] bg-transparent cursor-pointer"
                        />
                        <input
                          type="text"
                          value={variation.hex}
                          onChange={(e) => updateVariation(vIdx, { hex: e.target.value })}
                          className="flex-1 px-2 py-1.5 bg-[#1A1714] border border-[#2E2822] rounded text-xs font-mono text-[#F4EFE6]"
                        />
                      </div>
                    </div>

                    <div className="sm:col-span-3">
                      <label className="block text-[11px] text-[#857B6E] mb-1">Stock</label>
                      <input
                        type="number"
                        min={0}
                        value={variation.stock}
                        onChange={(e) =>
                          updateVariation(vIdx, { stock: Math.max(0, Number(e.target.value) || 0) })
                        }
                        className="w-full px-3 py-1.5 bg-[#1A1714] border border-[#2E2822] rounded text-xs text-[#F4EFE6] tabular-nums"
                      />
                    </div>

                    <div className="sm:col-span-1 flex justify-end">
                      <button
                        type="button"
                        onClick={() => removeVariation(vIdx)}
                        aria-label="Delete variation"
                        className="p-2 text-[#857B6E] hover:text-[#E08A7B]"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <label className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#1A1714] border border-[#2E2822] hover:border-[#C8A96A] rounded text-xs text-[#F4EFE6] cursor-pointer">
                      <Upload className="w-3 h-3 text-[#C8A96A]" />
                      <span>
                        {uploadingTarget === `var-${vIdx}`
                          ? `Uploading (${uploadPct}%)...`
                          : 'Upload Color Image'}
                      </span>
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={(e) => void handleVariationFileUpload(vIdx, e)}
                        className="sr-only"
                      />
                    </label>

                    <select
                      value=""
                      onChange={(e) => {
                        if (e.target.value) {
                          updateVariation(vIdx, {
                            images: [...variation.images, e.target.value].slice(0, 12),
                          });
                        }
                      }}
                      className="px-2.5 py-1.5 bg-[#1A1714] border border-[#2E2822] rounded text-xs text-[#B8AFA2]"
                    >
                      <option value="">+ Add Studio Photo</option>
                      {STUDIO_ASSET_OPTIONS.map((opt) => (
                        <option key={opt.path} value={opt.path}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {variation.images.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {variation.images.map((vImg, imgIdx) => (
                        <div
                          key={`${vImg}-${imgIdx}`}
                          className="relative w-16 h-16 rounded overflow-hidden border border-[#2E2822]"
                        >
                          <img
                            src={resolveProductImage(vImg)}
                            alt={`${variation.name} ${imgIdx + 1}`}
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-cover"
                          />
                          <button
                            type="button"
                            onClick={() =>
                              updateVariation(vIdx, {
                                images: variation.images.filter((_, i) => i !== imgIdx),
                              })
                            }
                            aria-label="Remove variation image"
                            className="absolute top-0.5 right-0.5 p-0.5 bg-black/80 text-[#E08A7B] rounded"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="pt-4 border-t border-[#2E2822] flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 border border-[#2E2822] text-sm text-[#B8AFA2] hover:text-[#F4EFE6] rounded-md"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 bg-[#C8A96A] hover:bg-[#D9BE84] text-[#12100E] text-sm font-semibold rounded-md disabled:opacity-50"
            >
              {saving ? 'Saving...' : isNew ? 'Create Product' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
