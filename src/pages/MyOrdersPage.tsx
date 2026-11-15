import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Package } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { formatCurrency } from '../lib/formatters';
import { resolveProductImage } from '../lib/studioAssets';
import {
  cancelPendingOrderCustomer,
  subscribeUserOrders,
} from '../services/firestoreService';
import type { Order } from '../types/store';

export function MyOrdersPage() {
  const { user, authReady, signInWithGoogle, storeSettings, showToast } = useStore();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  useEffect(() => {
    if (!authReady) return;
    if (!user) {
      setOrders([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const unsub = subscribeUserOrders(user.uid, (list) => {
      setOrders(list);
      setLoading(false);
    });
    return () => unsub();
  }, [authReady, user]);

  async function handleCancelOrder(orderId: string) {
    setCancellingId(orderId);
    try {
      await cancelPendingOrderCustomer(orderId);
      showToast('Order cancelled.', 'info');
    } catch {
      showToast('Unable to cancel order right now.', 'error');
    } finally {
      setCancellingId(null);
    }
  }

  return (
    <div className="min-h-[75vh] bg-[#12100E] text-[#F4EFE6] py-12 sm:py-16">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        <div className="border-b border-[#2E2822] pb-6">
          <p className="text-xs uppercase tracking-[0.18em] text-[#C8A96A] mb-2">
            Client Account
          </p>
          <h1 className="font-serif text-4xl text-[#F4EFE6]">Your Orders</h1>
        </div>

        {!user && authReady ? (
          <div className="p-10 rounded-lg border border-[#2E2822] bg-[#1A1714] text-center space-y-4">
            <Package className="w-10 h-10 text-[#C8A96A] mx-auto stroke-[1.25]" />
            <h2 className="font-serif text-2xl text-[#F4EFE6]">Sign In to View Order History</h2>
            <p className="text-sm text-[#B8AFA2] max-w-md mx-auto">
              Access your past purchases, live shipment statuses, and printable receipts.
            </p>
            <button
              type="button"
              onClick={() => void signInWithGoogle()}
              className="px-6 py-3 bg-[#C8A96A] hover:bg-[#D9BE84] text-[#12100E] text-sm font-semibold rounded-md transition-colors"
            >
              Sign In with Google
            </button>
          </div>
        ) : loading ? (
          <div className="space-y-4">
            {[1, 2].map((n) => (
              <div key={n} className="h-40 rounded-lg bg-[#1A1714] border border-[#2E2822] animate-pulse" />
            ))}
          </div>
        ) : orders.length === 0 ? (
          <div className="p-12 rounded-lg border border-[#2E2822] bg-[#1A1714] text-center space-y-4">
            <h2 className="font-serif text-2xl text-[#F4EFE6]">No Orders Placed Yet</h2>
            <p className="text-sm text-[#B8AFA2]">
              Explore our small-batch ceramics, brass lighting, and hand-loomed textiles.
            </p>
            <Link
              to="/shop"
              className="inline-block px-6 py-3 bg-[#C8A96A] text-[#12100E] text-sm font-semibold rounded-md"
            >
              Visit Shop
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            {orders.map((order) => (
              <article
                key={order.id}
                className="rounded-lg border border-[#2E2822] bg-[#1A1714] p-6 space-y-5"
              >
                <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-[#2E2822] text-sm">
                  <div className="space-y-1">
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-[#F4EFE6] font-semibold">
                        {order.orderNumber}
                      </span>
                      <span className="text-xs text-[#857B6E]">
                        {order.createdAt?.toDate?.()?.toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        }) || 'Just now'}
                      </span>
                    </div>
                    <p className="text-xs text-[#B8AFA2]">
                      {order.paymentMethod} · Payment {order.paymentStatus} · Order{' '}
                      <span className="text-[#C8A96A] font-medium">{order.status}</span>
                    </p>
                  </div>

                  <div className="flex items-center gap-4">
                    <span className="text-base font-semibold tabular-nums text-[#F4EFE6]">
                      {formatCurrency(order.totalAmount, storeSettings.currencySymbol)}
                    </span>
                    <Link
                      to={`/order-confirmation/${order.id}`}
                      className="text-xs text-[#C8A96A] hover:underline"
                    >
                      Receipt
                    </Link>
                    {order.status === 'Pending' && (
                      <button
                        type="button"
                        disabled={cancellingId === order.id}
                        onClick={() => void handleCancelOrder(order.id)}
                        className="text-xs text-[#E08A7B] hover:underline disabled:opacity-50"
                      >
                        {cancellingId === order.id ? 'Cancelling...' : 'Cancel Order'}
                      </button>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {order.items.map((item, idx) => (
                    <div key={`${item.productId}-${idx}`} className="flex items-center gap-3">
                      <img
                        src={resolveProductImage(item.image)}
                        alt={item.name}
                        referrerPolicy="no-referrer"
                        className="w-12 h-12 object-cover rounded border border-[#2E2822]"
                      />
                      <div className="min-w-0">
                        <p className="text-sm text-[#F4EFE6] truncate">{item.name}</p>
                        <p className="text-xs text-[#857B6E]">
                          {item.selectedColor} · Qty {item.quantity}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
