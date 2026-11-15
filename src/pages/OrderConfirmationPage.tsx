import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { doc, onSnapshot } from 'firebase/firestore';
import { CheckCircle2, ArrowRight, Package } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { formatCurrency } from '../lib/formatters';
import { resolveProductImage } from '../lib/studioAssets';
import type { Order } from '../types/store';

export function OrderConfirmationPage() {
  const { orderId } = useParams<{ orderId: string }>();
  const { user, authReady, storeSettings } = useStore();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authReady || !user || !orderId) {
      if (authReady) setLoading(false);
      return;
    }

    const unsub = onSnapshot(
      doc(db, 'orders', orderId),
      (snap) => {
        if (snap.exists()) {
          setOrder({ ...snap.data(), id: snap.id } as Order);
        } else {
          setOrder(null);
        }
        setLoading(false);
      },
      (err) => {
        setLoading(false);
        handleFirestoreError(err, OperationType.GET, `orders/${orderId}`);
      },
    );

    return () => unsub();
  }, [authReady, orderId, user]);

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-20">
        <div className="h-64 rounded-lg bg-[#1A1714] border border-[#2E2822] animate-pulse" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-24 text-center space-y-4">
        <h1 className="font-serif text-3xl text-[#F4EFE6]">Order Receipt Unavailable</h1>
        <p className="text-sm text-[#B8AFA2]">
          Sign in with the account used at checkout to view your order receipt.
        </p>
        <Link
          to="/orders"
          className="inline-block px-6 py-3 bg-[#C8A96A] text-[#12100E] text-sm font-semibold rounded-md"
        >
          View My Orders
        </Link>
      </div>
    );
  }

  return (
    <div className="bg-[#12100E] text-[#F4EFE6] py-14">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 space-y-8">
        <div className="p-8 rounded-lg border border-[#C8A96A]/40 bg-[#1A1714] space-y-4">
          <div className="flex items-center gap-3 text-[#C8A96A]">
            <CheckCircle2 className="w-6 h-6" />
            <span className="text-xs uppercase tracking-[0.18em]">Order Confirmed</span>
          </div>
          <h1 className="font-serif text-3xl sm:text-4xl text-[#F4EFE6]">
            Thank You, {order.customerName}
          </h1>
          <p className="text-sm text-[#B8AFA2] leading-relaxed">
            Your order <span className="font-mono text-[#F4EFE6]">{order.orderNumber}</span> has been recorded and our studio team is preparing your pieces for insured dispatch.
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 border-t border-[#2E2822] text-xs">
            <div>
              <p className="text-[#857B6E]">Order ID</p>
              <p className="font-mono text-[#F4EFE6] mt-1">{order.orderNumber}</p>
            </div>
            <div>
              <p className="text-[#857B6E]">Status</p>
              <p className="text-[#C8A96A] font-medium mt-1">{order.status}</p>
            </div>
            <div>
              <p className="text-[#857B6E]">Payment</p>
              <p className="text-[#F4EFE6] mt-1">
                {order.paymentMethod} ({order.paymentStatus})
              </p>
            </div>
            <div>
              <p className="text-[#857B6E]">Total</p>
              <p className="text-[#F4EFE6] font-semibold tabular-nums mt-1">
                {formatCurrency(order.totalAmount, storeSettings.currencySymbol)}
              </p>
            </div>
          </div>
        </div>

        <div className="p-6 sm:p-8 rounded-lg border border-[#2E2822] bg-[#1A1714] space-y-6">
          <div className="flex items-center gap-2 text-[#F4EFE6]">
            <Package className="w-4 h-4 text-[#C8A96A]" />
            <h2 className="font-serif text-2xl">Itemized Summary</h2>
          </div>

          <div className="divide-y divide-[#2E2822]">
            {order.items.map((item, idx) => (
              <div key={`${item.productId}-${idx}`} className="py-4 flex items-center gap-4">
                <img
                  src={resolveProductImage(item.image)}
                  alt={item.name}
                  referrerPolicy="no-referrer"
                  className="w-16 h-16 object-cover rounded border border-[#2E2822] bg-[#12100E]"
                />
                <div className="flex-1 min-w-0">
                  <p className="font-serif text-lg text-[#F4EFE6] truncate">{item.name}</p>
                  <p className="text-xs text-[#857B6E]">
                    {item.selectedColor} · Qty {item.quantity} · SKU {item.sku}
                  </p>
                </div>
                <span className="text-sm font-semibold tabular-nums text-[#F4EFE6]">
                  {formatCurrency(item.unitPrice * item.quantity, storeSettings.currencySymbol)}
                </span>
              </div>
            ))}
          </div>

          <div className="pt-4 border-t border-[#2E2822] grid grid-cols-1 sm:grid-cols-2 gap-6 text-sm">
            <div>
              <h3 className="text-xs uppercase tracking-[0.14em] text-[#857B6E] mb-2">
                Shipping Destination
              </h3>
              <p className="text-[#F4EFE6]">{order.customerName}</p>
              <p className="text-[#B8AFA2]">{order.shippingAddress.line1}</p>
              {order.shippingAddress.line2 && (
                <p className="text-[#B8AFA2]">{order.shippingAddress.line2}</p>
              )}
              <p className="text-[#B8AFA2]">
                {order.shippingAddress.city}, {order.shippingAddress.state} —{' '}
                <span className="font-mono">{order.shippingAddress.pinCode}</span>
              </p>
              <p className="text-[#857B6E] mt-1">{order.customerPhone}</p>
            </div>

            <div className="space-y-2 sm:text-right">
              <div className="flex sm:justify-end justify-between gap-8 text-[#B8AFA2]">
                <span>Subtotal</span>
                <span className="tabular-nums text-[#F4EFE6]">
                  {formatCurrency(order.subtotal, storeSettings.currencySymbol)}
                </span>
              </div>
              <div className="flex sm:justify-end justify-between gap-8 text-[#B8AFA2]">
                <span>Shipping</span>
                <span className="tabular-nums text-[#F4EFE6]">
                  {order.shippingCost === 0
                    ? 'Complimentary'
                    : formatCurrency(order.shippingCost, storeSettings.currencySymbol)}
                </span>
              </div>
              <div className="flex sm:justify-end justify-between gap-8 pt-2 border-t border-[#2E2822] text-base font-semibold text-[#F4EFE6]">
                <span>Total</span>
                <span className="tabular-nums text-[#C8A96A]">
                  {formatCurrency(order.totalAmount, storeSettings.currencySymbol)}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4">
          <Link
            to="/orders"
            className="text-sm text-[#C8A96A] hover:underline"
          >
            View All My Orders
          </Link>
          <Link
            to="/shop"
            className="inline-flex items-center gap-2 px-6 py-3 bg-[#C8A96A] hover:bg-[#D9BE84] text-[#12100E] text-sm font-semibold rounded-md transition-colors"
          >
            <span>Continue Exploring</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}
