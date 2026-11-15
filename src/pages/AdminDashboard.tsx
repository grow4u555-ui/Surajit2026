import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Edit3,
  Lock,
  Plus,
  Search,
  Sparkles,
  Trash2,
} from 'lucide-react';
import { OrderDetailModal } from '../components/admin/OrderDetailModal';
import { ProductEditorModal } from '../components/admin/ProductEditorModal';
import { useStore } from '../context/StoreContext';
import { formatCurrency, getEffectivePrice, slugify } from '../lib/formatters';
import { resolveProductImage, STUDIO_ASSET_OPTIONS } from '../lib/studioAssets';
import {
  deleteCategory,
  deleteProduct,
  saveCategory,
  saveProduct,
  saveStoreSettings,
  seedStarterCatalogToFirestore,
  subscribeAllOrders,
  subscribeAllUsers,
  subscribeSubscribers,
} from '../services/firestoreService';
import type { Category, Order, Product, UserProfile } from '../types/store';

type AdminTab =
  | 'overview'
  | 'products'
  | 'orders'
  | 'categories'
  | 'customers'
  | 'settings';

export function AdminDashboard() {
  const {
    user,
    isAdmin,
    authReady,
    products,
    categories,
    storeSettings,
    signInWithGoogle,
    showToast,
  } = useStore();

  const [activeTab, setActiveTab] = useState<AdminTab>('overview');
  const [orders, setOrders] = useState<Order[]>([]);
  const [customers, setCustomers] = useState<UserProfile[]>([]);
  const [subscribers, setSubscribers] = useState<{ id: string; email: string }[]>([]);

  const [editingProduct, setEditingProduct] = useState<Product | null | undefined>(undefined);
  const [confirmDeleteProduct, setConfirmDeleteProduct] = useState<Product | null>(null);
  const [inspectingOrder, setInspectingOrder] = useState<Order | null>(null);

  const [orderSearch, setOrderSearch] = useState('');
  const [orderStatusFilter, setOrderStatusFilter] = useState<string>('All');
  const [productSearch, setProductSearch] = useState('');

  // Category form state
  const [catName, setCatName] = useState('');
  const [catDesc, setCatDesc] = useState('');
  const [catImage, setCatImage] = useState(STUDIO_ASSET_OPTIONS[0].path);
  const [catOrder, setCatOrder] = useState('1');
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);

  // Settings form state
  const [settingsForm, setSettingsForm] = useState(storeSettings);
  const [savingSettings, setSavingSettings] = useState(false);
  const [seeding, setSeeding] = useState(false);

  useEffect(() => {
    setSettingsForm(storeSettings);
  }, [storeSettings]);

  useEffect(() => {
    if (!authReady || !isAdmin) return;
    const unsubOrders = subscribeAllOrders(setOrders);
    const unsubUsers = subscribeAllUsers(setCustomers);
    const unsubSubs = subscribeSubscribers(setSubscribers);
    return () => {
      unsubOrders();
      unsubUsers();
      unsubSubs();
    };
  }, [authReady, isAdmin]);

  const metrics = useMemo(() => {
    const totalRevenue = orders
      .filter((o) => o.status !== 'Cancelled')
      .reduce((sum, o) => sum + o.totalAmount, 0);
    const pendingOrders = orders.filter((o) => o.status === 'Pending').length;
    const lowStockProducts = products.filter((p) => p.stockQuantity <= 5);
    return {
      totalOrders: orders.length,
      totalProducts: products.length,
      totalRevenue,
      pendingOrders,
      lowStockCount: lowStockProducts.length,
      lowStockProducts,
    };
  }, [orders, products]);

  const filteredOrders = useMemo(() => {
    const q = orderSearch.trim().toLowerCase();
    return orders.filter((o) => {
      if (orderStatusFilter !== 'All' && o.status !== orderStatusFilter) return false;
      if (!q) return true;
      return (
        o.orderNumber.toLowerCase().includes(q) ||
        o.customerName.toLowerCase().includes(q) ||
        o.customerEmail.toLowerCase().includes(q)
      );
    });
  }, [orderSearch, orderStatusFilter, orders]);

  const filteredProducts = useMemo(() => {
    const q = productSearch.trim().toLowerCase();
    if (!q) return products;
    return products.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q),
    );
  }, [productSearch, products]);

  async function handleSeedStarter() {
    setSeeding(true);
    try {
      await seedStarterCatalogToFirestore();
      showToast('Starter catalog and categories published to Firestore.', 'success');
    } catch {
      showToast('Failed to publish starter catalog.', 'error');
    } finally {
      setSeeding(false);
    }
  }

  async function handleToggleFlag(
    product: Product,
    flag: 'featured' | 'bestSeller' | 'newArrival',
  ) {
    try {
      await saveProduct(
        {
          ...product,
          [flag]: !product[flag],
        },
        false,
      );
      showToast(`Updated ${product.name}.`, 'success');
    } catch {
      showToast('Could not update product flag.', 'error');
    }
  }

  async function handleDeleteConfirmed() {
    if (!confirmDeleteProduct) return;
    try {
      await deleteProduct(confirmDeleteProduct.id);
      showToast(`Deleted ${confirmDeleteProduct.name}.`, 'info');
      setConfirmDeleteProduct(null);
    } catch {
      showToast('Unable to delete product.', 'error');
    }
  }

  async function handleSaveCategory(e: React.FormEvent) {
    e.preventDefault();
    if (!catName.trim()) return;
    const id = editingCategory?.id || `cat_${slugify(catName).replace(/-/g, '_')}`;
    try {
      await saveCategory(
        {
          id,
          name: catName.trim(),
          slug: slugify(catName),
          description: catDesc.trim() || null,
          imageUrl: catImage.trim() || null,
          displayOrder: Math.max(0, Number(catOrder) || 0),
        },
        !editingCategory,
      );
      showToast(editingCategory ? 'Category updated.' : 'Category added.', 'success');
      setCatName('');
      setCatDesc('');
      setCatOrder('1');
      setEditingCategory(null);
    } catch {
      showToast('Unable to save category.', 'error');
    }
  }

  async function handleSaveSettings(e: React.FormEvent) {
    e.preventDefault();
    setSavingSettings(true);
    try {
      await saveStoreSettings({
        id: 'main',
        storeName: settingsForm.storeName,
        tagline: settingsForm.tagline || null,
        contactEmail: settingsForm.contactEmail,
        contactPhone: settingsForm.contactPhone || null,
        studioAddress: settingsForm.studioAddress || null,
        shippingFee: Number(settingsForm.shippingFee) || 0,
        freeShippingThreshold: Number(settingsForm.freeShippingThreshold) || 0,
        currencySymbol: settingsForm.currencySymbol || '₹',
      });
      showToast('Store settings saved to Firestore.', 'success');
    } catch {
      showToast('Could not save store settings.', 'error');
    } finally {
      setSavingSettings(false);
    }
  }

  if (!authReady) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-24">
        <div className="h-48 rounded-lg bg-[#1A1714] border border-[#2E2822] animate-pulse" />
      </div>
    );
  }

  if (!user || !isAdmin) {
    return (
      <div className="min-h-[75vh] flex items-center justify-center px-4 py-20">
        <div className="max-w-md w-full p-8 rounded-lg border border-[#2E2822] bg-[#1A1714] text-center space-y-5">
          <Lock className="w-9 h-9 text-[#C8A96A] mx-auto stroke-[1.5]" />
          <h1 className="font-serif text-3xl text-[#F4EFE6]">Admin Studio Access</h1>
          <p className="text-sm text-[#B8AFA2] leading-relaxed">
            {user
              ? `Signed in as ${user.email}, which does not have administrator privileges.`
              : 'Sign in with your authorized studio administrator Google account to manage products, inventory, orders, and store configuration.'}
          </p>
          {!user && (
            <button
              type="button"
              onClick={() => void signInWithGoogle()}
              className="w-full py-3 bg-[#C8A96A] hover:bg-[#D9BE84] text-[#12100E] text-sm font-semibold rounded-md transition-colors"
            >
              Sign In as Administrator
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[85vh] bg-[#12100E] text-[#F4EFE6] py-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-[#2E2822] pb-6">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-[#C8A96A] mb-1">
              Studio Operations
            </p>
            <h1 className="font-serif text-4xl text-[#F4EFE6]">Admin Dashboard</h1>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {products.length === 0 && (
              <button
                type="button"
                disabled={seeding}
                onClick={() => void handleSeedStarter()}
                className="inline-flex items-center gap-2 px-4 py-2.5 border border-[#C8A96A] text-[#C8A96A] hover:bg-[#C8A96A] hover:text-[#12100E] text-xs font-semibold rounded-md transition-colors"
              >
                <Sparkles className="w-4 h-4" />
                <span>{seeding ? 'Publishing...' : 'Publish Starter Catalog'}</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => setEditingProduct(null)}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#C8A96A] hover:bg-[#D9BE84] text-[#12100E] text-xs font-semibold rounded-md transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Add Product</span>
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-1 p-1 bg-[#1A1714] border border-[#2E2822] rounded-lg overflow-x-auto">
          {(
            [
              { id: 'overview', label: 'Overview' },
              { id: 'products', label: `Products (${products.length})` },
              { id: 'orders', label: `Orders (${orders.length})` },
              { id: 'categories', label: `Categories (${categories.length})` },
              { id: 'customers', label: `Customers (${customers.length})` },
              { id: 'settings', label: 'Store Settings' },
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

        {/* OVERVIEW TAB */}
        {activeTab === 'overview' && (
          <div className="space-y-8">
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
              <div className="p-5 rounded-lg border border-[#2E2822] bg-[#1A1714]">
                <p className="text-xs text-[#857B6E]">Total Revenue</p>
                <p className="font-serif text-3xl text-[#C8A96A] tabular-nums mt-2">
                  {formatCurrency(metrics.totalRevenue, storeSettings.currencySymbol)}
                </p>
              </div>
              <div className="p-5 rounded-lg border border-[#2E2822] bg-[#1A1714]">
                <p className="text-xs text-[#857B6E]">Total Orders</p>
                <p className="font-serif text-3xl text-[#F4EFE6] tabular-nums mt-2">
                  {metrics.totalOrders}
                </p>
              </div>
              <div className="p-5 rounded-lg border border-[#2E2822] bg-[#1A1714]">
                <p className="text-xs text-[#857B6E]">Pending Orders</p>
                <p className="font-serif text-3xl text-[#F4EFE6] tabular-nums mt-2">
                  {metrics.pendingOrders}
                </p>
              </div>
              <div className="p-5 rounded-lg border border-[#2E2822] bg-[#1A1714]">
                <p className="text-xs text-[#857B6E]">Catalog Products</p>
                <p className="font-serif text-3xl text-[#F4EFE6] tabular-nums mt-2">
                  {metrics.totalProducts}
                </p>
              </div>
              <div className="p-5 rounded-lg border border-[#2E2822] bg-[#1A1714]">
                <p className="text-xs text-[#857B6E]">Low Stock Alerts</p>
                <p className="font-serif text-3xl text-[#E08A7B] tabular-nums mt-2">
                  {metrics.lowStockCount}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              <div className="lg:col-span-7 rounded-lg border border-[#2E2822] bg-[#1A1714] p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="font-serif text-2xl text-[#F4EFE6]">Recent Orders</h2>
                  <button
                    type="button"
                    onClick={() => setActiveTab('orders')}
                    className="text-xs text-[#C8A96A] hover:underline"
                  >
                    Manage all
                  </button>
                </div>

                {orders.length === 0 ? (
                  <p className="text-sm text-[#857B6E] py-6">No customer orders received yet.</p>
                ) : (
                  <div className="divide-y divide-[#2E2822]">
                    {orders.slice(0, 6).map((ord) => (
                      <div
                        key={ord.id}
                        className="py-3.5 flex items-center justify-between gap-4 text-sm"
                      >
                        <div className="min-w-0">
                          <p className="font-mono text-xs text-[#C8A96A]">{ord.orderNumber}</p>
                          <p className="text-[#F4EFE6] truncate">{ord.customerName}</p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="tabular-nums font-medium text-[#F4EFE6]">
                            {formatCurrency(ord.totalAmount, storeSettings.currencySymbol)}
                          </p>
                          <p className="text-xs text-[#857B6E]">{ord.status}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="lg:col-span-5 rounded-lg border border-[#2E2822] bg-[#1A1714] p-6 space-y-4">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-[#C8A96A]" />
                  <h2 className="font-serif text-2xl text-[#F4EFE6]">Low Stock Products</h2>
                </div>

                {metrics.lowStockProducts.length === 0 ? (
                  <p className="text-sm text-[#857B6E] py-6">
                    All catalog pieces have healthy studio stock levels.
                  </p>
                ) : (
                  <div className="divide-y divide-[#2E2822]">
                    {metrics.lowStockProducts.map((p) => (
                      <div key={p.id} className="py-3 flex items-center justify-between gap-3 text-sm">
                        <div className="min-w-0">
                          <p className="text-[#F4EFE6] truncate">{p.name}</p>
                          <p className="text-xs font-mono text-[#857B6E]">{p.sku}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setEditingProduct(p)}
                          className="text-xs text-[#C8A96A] tabular-nums hover:underline shrink-0"
                        >
                          {p.stockQuantity} left · Restock
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* PRODUCTS TAB */}
        {activeTab === 'products' && (
          <div className="space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="relative max-w-sm w-full">
                <Search className="w-4 h-4 text-[#857B6E] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                  placeholder="Search products by name, SKU, category..."
                  className="w-full pl-9 pr-3 py-2 bg-[#1A1714] border border-[#2E2822] focus:border-[#C8A96A] rounded-md text-xs text-[#F4EFE6]"
                />
              </div>
            </div>

            <div className="overflow-x-auto rounded-lg border border-[#2E2822] bg-[#1A1714]">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-[#2E2822] text-xs uppercase tracking-wider text-[#857B6E]">
                  <tr>
                    <th className="px-4 py-3.5">Product</th>
                    <th className="px-4 py-3.5">Category</th>
                    <th className="px-4 py-3.5">Price</th>
                    <th className="px-4 py-3.5">Stock</th>
                    <th className="px-4 py-3.5">Homepage Flags</th>
                    <th className="px-4 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#2E2822]">
                  {filteredProducts.map((p) => (
                    <tr key={p.id} className="hover:bg-[#1E1A16]/60">
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-3">
                          <img
                            src={resolveProductImage(p.images[0])}
                            alt={p.name}
                            referrerPolicy="no-referrer"
                            className="w-11 h-11 object-cover rounded border border-[#2E2822]"
                          />
                          <div>
                            <p className="text-[#F4EFE6] font-medium">{p.name}</p>
                            <p className="text-xs font-mono text-[#857B6E]">
                              {p.sku} · {p.colorVariations?.length || 0} finishes
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-[#B8AFA2]">{p.category}</td>
                      <td className="px-4 py-3.5 tabular-nums text-[#F4EFE6]">
                        {formatCurrency(getEffectivePrice(p), storeSettings.currencySymbol)}
                        {p.discountPrice ? (
                          <span className="block text-xs text-[#857B6E] line-through">
                            {formatCurrency(p.price, storeSettings.currencySymbol)}
                          </span>
                        ) : null}
                      </td>
                      <td className="px-4 py-3.5 tabular-nums">
                        <span className={p.stockQuantity <= 4 ? 'text-[#E08A7B]' : 'text-[#F4EFE6]'}>
                          {p.stockQuantity}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex flex-wrap gap-2 text-xs">
                          <button
                            type="button"
                            onClick={() => void handleToggleFlag(p, 'featured')}
                            className={`px-2 py-1 rounded border ${
                              p.featured
                                ? 'border-[#C8A96A] text-[#C8A96A]'
                                : 'border-[#2E2822] text-[#857B6E]'
                            }`}
                          >
                            Featured
                          </button>
                          <button
                            type="button"
                            onClick={() => void handleToggleFlag(p, 'bestSeller')}
                            className={`px-2 py-1 rounded border ${
                              p.bestSeller
                                ? 'border-[#C8A96A] text-[#C8A96A]'
                                : 'border-[#2E2822] text-[#857B6E]'
                            }`}
                          >
                            Best Seller
                          </button>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <div className="inline-flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setEditingProduct(p)}
                            aria-label={`Edit ${p.name}`}
                            className="p-2 text-[#B8AFA2] hover:text-[#C8A96A]"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteProduct(p)}
                            aria-label={`Delete ${p.name}`}
                            className="p-2 text-[#857B6E] hover:text-[#E08A7B]"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ORDERS TAB */}
        {activeTab === 'orders' && (
          <div className="space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="relative max-w-sm w-full">
                <Search className="w-4 h-4 text-[#857B6E] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={orderSearch}
                  onChange={(e) => setOrderSearch(e.target.value)}
                  placeholder="Search order ID, customer name, email..."
                  className="w-full pl-9 pr-3 py-2 bg-[#1A1714] border border-[#2E2822] focus:border-[#C8A96A] rounded-md text-xs text-[#F4EFE6]"
                />
              </div>

              <select
                value={orderStatusFilter}
                onChange={(e) => setOrderStatusFilter(e.target.value)}
                className="px-3.5 py-2 bg-[#1A1714] border border-[#2E2822] rounded-md text-xs text-[#F4EFE6]"
              >
                <option value="All">All Order Statuses</option>
                <option value="Pending">Pending</option>
                <option value="Confirmed">Confirmed</option>
                <option value="Processing">Processing</option>
                <option value="Shipped">Shipped</option>
                <option value="Delivered">Delivered</option>
                <option value="Cancelled">Cancelled</option>
              </select>
            </div>

            <div className="overflow-x-auto rounded-lg border border-[#2E2822] bg-[#1A1714]">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-[#2E2822] text-xs uppercase tracking-wider text-[#857B6E]">
                  <tr>
                    <th className="px-4 py-3.5">Order ID</th>
                    <th className="px-4 py-3.5">Customer</th>
                    <th className="px-4 py-3.5">Payment</th>
                    <th className="px-4 py-3.5">Status</th>
                    <th className="px-4 py-3.5">Total</th>
                    <th className="px-4 py-3.5 text-right">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#2E2822]">
                  {filteredOrders.map((ord) => (
                    <tr key={ord.id} className="hover:bg-[#1E1A16]/60">
                      <td className="px-4 py-3.5 font-mono text-xs text-[#C8A96A]">
                        {ord.orderNumber}
                      </td>
                      <td className="px-4 py-3.5">
                        <p className="text-[#F4EFE6]">{ord.customerName}</p>
                        <p className="text-xs text-[#857B6E]">{ord.customerEmail}</p>
                      </td>
                      <td className="px-4 py-3.5 text-xs text-[#B8AFA2]">
                        {ord.paymentMethod} · {ord.paymentStatus}
                      </td>
                      <td className="px-4 py-3.5 text-xs text-[#F4EFE6] font-medium">
                        {ord.status}
                      </td>
                      <td className="px-4 py-3.5 tabular-nums text-[#F4EFE6]">
                        {formatCurrency(ord.totalAmount, storeSettings.currencySymbol)}
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <button
                          type="button"
                          onClick={() => setInspectingOrder(ord)}
                          className="px-3 py-1.5 border border-[#C8A96A]/50 text-xs text-[#F4EFE6] hover:bg-[#C8A96A] hover:text-[#12100E] rounded transition-colors"
                        >
                          Manage
                        </button>
                      </td>
                    </tr>
                  ))}
                  {filteredOrders.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-4 py-10 text-center text-sm text-[#857B6E]">
                        No orders match your filter.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* CATEGORIES TAB */}
        {activeTab === 'categories' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <form
              onSubmit={(e) => void handleSaveCategory(e)}
              className="lg:col-span-5 p-6 rounded-lg border border-[#2E2822] bg-[#1A1714] space-y-4 self-start"
            >
              <h2 className="font-serif text-2xl text-[#F4EFE6]">
                {editingCategory ? `Edit ${editingCategory.name}` : 'Add Category'}
              </h2>
              <div>
                <label className="block text-xs text-[#B8AFA2] mb-1">Category Name *</label>
                <input
                  type="text"
                  required
                  value={catName}
                  onChange={(e) => setCatName(e.target.value)}
                  placeholder="Ceramics"
                  className="w-full px-3.5 py-2 bg-[#12100E] border border-[#2E2822] rounded-md text-sm text-[#F4EFE6]"
                />
              </div>
              <div>
                <label className="block text-xs text-[#B8AFA2] mb-1">Description</label>
                <textarea
                  rows={2}
                  value={catDesc}
                  onChange={(e) => setCatDesc(e.target.value)}
                  className="w-full px-3.5 py-2 bg-[#12100E] border border-[#2E2822] rounded-md text-sm text-[#F4EFE6]"
                />
              </div>
              <div>
                <label className="block text-xs text-[#B8AFA2] mb-1">Cover Image</label>
                <select
                  value={catImage}
                  onChange={(e) => setCatImage(e.target.value)}
                  className="w-full px-3.5 py-2 bg-[#12100E] border border-[#2E2822] rounded-md text-sm text-[#F4EFE6]"
                >
                  {STUDIO_ASSET_OPTIONS.map((opt) => (
                    <option key={opt.path} value={opt.path}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-[#B8AFA2] mb-1">Display Order</label>
                <input
                  type="number"
                  min={0}
                  value={catOrder}
                  onChange={(e) => setCatOrder(e.target.value)}
                  className="w-full px-3.5 py-2 bg-[#12100E] border border-[#2E2822] rounded-md text-sm text-[#F4EFE6] tabular-nums"
                />
              </div>
              <div className="flex items-center gap-3 pt-2">
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-[#C8A96A] text-[#12100E] text-xs font-semibold rounded-md hover:bg-[#D9BE84]"
                >
                  {editingCategory ? 'Update Category' : 'Add Category'}
                </button>
                {editingCategory && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingCategory(null);
                      setCatName('');
                      setCatDesc('');
                    }}
                    className="text-xs text-[#857B6E] hover:text-[#F4EFE6]"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </form>

            <div className="lg:col-span-7 space-y-3">
              {categories.map((cat) => (
                <div
                  key={cat.id}
                  className="p-4 rounded-lg border border-[#2E2822] bg-[#1A1714] flex items-center justify-between gap-4"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <img
                      src={resolveProductImage(cat.imageUrl)}
                      alt={cat.name}
                      referrerPolicy="no-referrer"
                      className="w-14 h-14 object-cover rounded border border-[#2E2822]"
                    />
                    <div className="min-w-0">
                      <p className="font-serif text-xl text-[#F4EFE6]">{cat.name}</p>
                      <p className="text-xs text-[#857B6E] truncate">
                        Order {cat.displayOrder} · {cat.description}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingCategory(cat);
                        setCatName(cat.name);
                        setCatDesc(cat.description || '');
                        setCatImage(cat.imageUrl || STUDIO_ASSET_OPTIONS[0].path);
                        setCatOrder(String(cat.displayOrder));
                      }}
                      className="p-2 text-[#B8AFA2] hover:text-[#C8A96A]"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => void deleteCategory(cat.id)}
                      className="p-2 text-[#857B6E] hover:text-[#E08A7B]"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* CUSTOMERS TAB */}
        {activeTab === 'customers' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-8 rounded-lg border border-[#2E2822] bg-[#1A1714] overflow-x-auto">
              <div className="px-6 py-4 border-b border-[#2E2822]">
                <h2 className="font-serif text-2xl text-[#F4EFE6]">Registered Customers</h2>
              </div>
              <table className="w-full text-left text-sm">
                <thead className="border-b border-[#2E2822] text-xs uppercase text-[#857B6E]">
                  <tr>
                    <th className="px-5 py-3">Customer</th>
                    <th className="px-5 py-3">Phone</th>
                    <th className="px-5 py-3">City</th>
                    <th className="px-5 py-3 text-right">Orders</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#2E2822]">
                  {customers.map((c) => {
                    const orderCount = orders.filter((o) => o.userId === c.uid).length;
                    return (
                      <tr key={c.uid}>
                        <td className="px-5 py-3">
                          <p className="text-[#F4EFE6]">{c.name}</p>
                          <p className="text-xs text-[#857B6E]">{c.email}</p>
                        </td>
                        <td className="px-5 py-3 text-xs text-[#B8AFA2]">{c.phone || '—'}</td>
                        <td className="px-5 py-3 text-xs text-[#B8AFA2]">
                          {c.address?.city || '—'}
                        </td>
                        <td className="px-5 py-3 text-right tabular-nums text-[#F4EFE6]">
                          {orderCount}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="lg:col-span-4 rounded-lg border border-[#2E2822] bg-[#1A1714] p-6 space-y-4 self-start">
              <h2 className="font-serif text-2xl text-[#F4EFE6]">
                Newsletter ({subscribers.length})
              </h2>
              <div className="divide-y divide-[#2E2822] max-h-96 overflow-y-auto">
                {subscribers.map((s) => (
                  <p key={s.id} className="py-2.5 text-xs text-[#B8AFA2] truncate">
                    {s.email}
                  </p>
                ))}
                {subscribers.length === 0 && (
                  <p className="text-xs text-[#857B6E]">No subscribers yet.</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* SETTINGS TAB */}
        {activeTab === 'settings' && (
          <form
            onSubmit={(e) => void handleSaveSettings(e)}
            className="max-w-2xl p-6 sm:p-8 rounded-lg border border-[#2E2822] bg-[#1A1714] space-y-5"
          >
            <h2 className="font-serif text-2xl text-[#F4EFE6]">Store &amp; Shipping Settings</h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-[#B8AFA2] mb-1">Store Name *</label>
                <input
                  type="text"
                  required
                  value={settingsForm.storeName}
                  onChange={(e) =>
                    setSettingsForm({ ...settingsForm, storeName: e.target.value })
                  }
                  className="w-full px-3.5 py-2 bg-[#12100E] border border-[#2E2822] rounded-md text-sm text-[#F4EFE6]"
                />
              </div>
              <div>
                <label className="block text-xs text-[#B8AFA2] mb-1">Currency Symbol *</label>
                <input
                  type="text"
                  required
                  value={settingsForm.currencySymbol}
                  onChange={(e) =>
                    setSettingsForm({ ...settingsForm, currencySymbol: e.target.value })
                  }
                  className="w-full px-3.5 py-2 bg-[#12100E] border border-[#2E2822] rounded-md text-sm text-[#F4EFE6]"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs text-[#B8AFA2] mb-1">Brand Tagline</label>
                <input
                  type="text"
                  value={settingsForm.tagline || ''}
                  onChange={(e) =>
                    setSettingsForm({ ...settingsForm, tagline: e.target.value })
                  }
                  className="w-full px-3.5 py-2 bg-[#12100E] border border-[#2E2822] rounded-md text-sm text-[#F4EFE6]"
                />
              </div>
              <div>
                <label className="block text-xs text-[#B8AFA2] mb-1">Contact Email *</label>
                <input
                  type="email"
                  required
                  value={settingsForm.contactEmail}
                  onChange={(e) =>
                    setSettingsForm({ ...settingsForm, contactEmail: e.target.value })
                  }
                  className="w-full px-3.5 py-2 bg-[#12100E] border border-[#2E2822] rounded-md text-sm text-[#F4EFE6]"
                />
              </div>
              <div>
                <label className="block text-xs text-[#B8AFA2] mb-1">Contact Phone</label>
                <input
                  type="text"
                  value={settingsForm.contactPhone || ''}
                  onChange={(e) =>
                    setSettingsForm({ ...settingsForm, contactPhone: e.target.value })
                  }
                  className="w-full px-3.5 py-2 bg-[#12100E] border border-[#2E2822] rounded-md text-sm text-[#F4EFE6]"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs text-[#B8AFA2] mb-1">Studio Address</label>
                <input
                  type="text"
                  value={settingsForm.studioAddress || ''}
                  onChange={(e) =>
                    setSettingsForm({ ...settingsForm, studioAddress: e.target.value })
                  }
                  className="w-full px-3.5 py-2 bg-[#12100E] border border-[#2E2822] rounded-md text-sm text-[#F4EFE6]"
                />
              </div>
              <div>
                <label className="block text-xs text-[#B8AFA2] mb-1">Flat Shipping Fee (₹)</label>
                <input
                  type="number"
                  min={0}
                  value={settingsForm.shippingFee}
                  onChange={(e) =>
                    setSettingsForm({
                      ...settingsForm,
                      shippingFee: Number(e.target.value) || 0,
                    })
                  }
                  className="w-full px-3.5 py-2 bg-[#12100E] border border-[#2E2822] rounded-md text-sm text-[#F4EFE6] tabular-nums"
                />
              </div>
              <div>
                <label className="block text-xs text-[#B8AFA2] mb-1">
                  Free Shipping Threshold (₹)
                </label>
                <input
                  type="number"
                  min={0}
                  value={settingsForm.freeShippingThreshold}
                  onChange={(e) =>
                    setSettingsForm({
                      ...settingsForm,
                      freeShippingThreshold: Number(e.target.value) || 0,
                    })
                  }
                  className="w-full px-3.5 py-2 bg-[#12100E] border border-[#2E2822] rounded-md text-sm text-[#F4EFE6] tabular-nums"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={savingSettings}
              className="px-6 py-2.5 bg-[#C8A96A] hover:bg-[#D9BE84] text-[#12100E] text-sm font-semibold rounded-md disabled:opacity-50"
            >
              {savingSettings ? 'Saving...' : 'Save Settings'}
            </button>
          </form>
        )}
      </div>

      {/* Product Create/Edit Modal */}
      {editingProduct !== undefined && (
        <ProductEditorModal
          product={editingProduct}
          onClose={() => setEditingProduct(undefined)}
        />
      )}

      {/* Order Inspection Modal */}
      {inspectingOrder && (
        <OrderDetailModal
          order={inspectingOrder}
          onClose={() => setInspectingOrder(null)}
        />
      )}

      {/* Delete Confirmation Modal */}
      {confirmDeleteProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75">
          <div className="max-w-sm w-full p-6 rounded-lg border border-[#2E2822] bg-[#1A1714] space-y-4">
            <h3 className="font-serif text-2xl text-[#F4EFE6]">Delete Product?</h3>
            <p className="text-sm text-[#B8AFA2]">
              Permanently remove <strong>{confirmDeleteProduct.name}</strong> from your Firestore catalog?
            </p>
            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setConfirmDeleteProduct(null)}
                className="px-4 py-2 border border-[#2E2822] text-xs text-[#B8AFA2] rounded-md"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void handleDeleteConfirmed()}
                className="px-4 py-2 bg-[#C95F50] text-white text-xs font-semibold rounded-md"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
