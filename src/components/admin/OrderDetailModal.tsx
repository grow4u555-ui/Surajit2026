import { useState } from 'react';
import { X } from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { formatCurrency } from '../../lib/formatters';
import { resolveProductImage } from '../../lib/studioAssets';
import { updateOrderAdmin } from '../../services/firestoreService';
import type { Order, OrderStatus, PaymentStatus } from '../../types/store';

interface OrderDetailModalProps {
  order: Order;
  onClose: () => void;
}

const ORDER_STATUSES: OrderStatus[] = [
  'Pending',
  'Confirmed',
  'Processing',
  'Shipped',
  'Delivered',
  'Cancelled',
];

const PAYMENT_STATUSES: PaymentStatus[] = ['Pending', 'Paid', 'Failed', 'Refunded'];

export function OrderDetailModal({ order, onClose }: OrderDetailModalProps) {
  const { storeSettings, showToast } = useStore();
  const [status, setStatus] = useState<OrderStatus>(order.status);
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>(order.paymentStatus);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    try {
      await updateOrderAdmin({
        orderId: order.id,
        status,
        paymentStatus,
      });
      showToast(`Order ${order.orderNumber} updated.`, 'success');
      onClose();
    } catch {
      showToast('Unable to update order status.', 'error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
      <div className="w-full max-w-2xl max-h-[90vh] bg-[#161310] border border-[#2E2822] rounded-lg flex flex-col overflow-hidden shadow-2xl">
        <div className="px-6 py-4 border-b border-[#2E2822] flex items-center justify-between">
          <div>
            <p className="text-xs font-mono text-[#C8A96A]">{order.orderNumber}</p>
            <h2 className="font-serif text-2xl text-[#F4EFE6]">Order Inspection</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="p-1.5 text-[#857B6E] hover:text-[#F4EFE6]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6 text-sm">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 p-4 rounded-lg bg-[#12100E] border border-[#2E2822]">
            <div className="space-y-1">
              <p className="text-xs uppercase tracking-[0.12em] text-[#857B6E]">Customer</p>
              <p className="font-medium text-[#F4EFE6]">{order.customerName}</p>
              <p className="text-[#B8AFA2]">{order.customerEmail}</p>
              <p className="text-[#B8AFA2]">{order.customerPhone}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs uppercase tracking-[0.12em] text-[#857B6E]">Shipping Address</p>
              <p className="text-[#B8AFA2]">{order.shippingAddress.line1}</p>
              {order.shippingAddress.line2 && (
                <p className="text-[#B8AFA2]">{order.shippingAddress.line2}</p>
              )}
              <p className="text-[#B8AFA2]">
                {order.shippingAddress.city}, {order.shippingAddress.state} —{' '}
                <span className="font-mono">{order.shippingAddress.pinCode}</span>
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="text-xs uppercase tracking-[0.14em] text-[#857B6E]">
              Ordered Items ({order.items.length})
            </h3>
            <div className="divide-y divide-[#2E2822] border border-[#2E2822] rounded-lg bg-[#12100E]">
              {order.items.map((item, idx) => (
                <div key={idx} className="p-3.5 flex items-center gap-3.5">
                  <img
                    src={resolveProductImage(item.image)}
                    alt={item.name}
                    referrerPolicy="no-referrer"
                    className="w-12 h-12 object-cover rounded border border-[#2E2822]"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-[#F4EFE6] font-medium truncate">{item.name}</p>
                    <p className="text-xs text-[#857B6E]">
                      {item.selectedColor} · Qty {item.quantity} · SKU {item.sku}
                    </p>
                  </div>
                  <span className="tabular-nums font-medium text-[#F4EFE6]">
                    {formatCurrency(item.unitPrice * item.quantity, storeSettings.currencySymbol)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <div>
              <label className="block text-xs text-[#B8AFA2] mb-1.5">Order Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as OrderStatus)}
                className="w-full px-3.5 py-2.5 bg-[#12100E] border border-[#2E2822] focus:border-[#C8A96A] rounded-md text-sm text-[#F4EFE6]"
              >
                {ORDER_STATUSES.map((st) => (
                  <option key={st} value={st}>
                    {st}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs text-[#B8AFA2] mb-1.5">
                Payment Status ({order.paymentMethod})
              </label>
              <select
                value={paymentStatus}
                onChange={(e) => setPaymentStatus(e.target.value as PaymentStatus)}
                className="w-full px-3.5 py-2.5 bg-[#12100E] border border-[#2E2822] focus:border-[#C8A96A] rounded-md text-sm text-[#F4EFE6]"
              >
                {PAYMENT_STATUSES.map((ps) => (
                  <option key={ps} value={ps}>
                    {ps}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {order.razorpayPaymentId && (
            <p className="text-xs font-mono text-[#857B6E]">
              Razorpay Payment ID: {order.razorpayPaymentId}
            </p>
          )}
        </div>

        <div className="px-6 py-4 border-t border-[#2E2822] flex items-center justify-between">
          <div className="text-sm">
            <span className="text-[#857B6E]">Order Total: </span>
            <span className="font-semibold text-[#C8A96A] tabular-nums">
              {formatCurrency(order.totalAmount, storeSettings.currencySymbol)}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-[#2E2822] text-sm text-[#B8AFA2] rounded-md"
            >
              Close
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={() => void handleSave()}
              className="px-5 py-2 bg-[#C8A96A] hover:bg-[#D9BE84] text-[#12100E] text-sm font-semibold rounded-md disabled:opacity-50"
            >
              {saving ? 'Updating...' : 'Update Order'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
