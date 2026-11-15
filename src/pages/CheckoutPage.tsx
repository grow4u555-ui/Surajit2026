import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AlertTriangle, CheckCircle2, CreditCard, Lock, Truck } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { formatCurrency } from '../lib/formatters';
import { resolveProductImage } from '../lib/studioAssets';
import {
  placeOrderWithStockUpdate,
  upsertUserProfile,
} from '../services/firestoreService';
import type { Order, PaymentMethod } from '../types/store';

interface RazorpayStatus {
  configured: boolean;
  keyId: string | null;
  mode: 'test' | 'live' | 'unconfigured';
}

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => {
      open: () => void;
    };
  }
}

const INDIAN_STATES = [
  'Andhra Pradesh',
  'Assam',
  'Bihar',
  'Chandigarh',
  'Chhattisgarh',
  'Delhi',
  'Goa',
  'Gujarat',
  'Haryana',
  'Himachal Pradesh',
  'Jammu & Kashmir',
  'Jharkhand',
  'Karnataka',
  'Kerala',
  'Madhya Pradesh',
  'Maharashtra',
  'Odisha',
  'Punjab',
  'Rajasthan',
  'Tamil Nadu',
  'Telangana',
  'Uttar Pradesh',
  'Uttarakhand',
  'West Bengal',
];

function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (window.Razorpay) {
      resolve(true);
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

export function CheckoutPage() {
  const navigate = useNavigate();
  const {
    user,
    userProfile,
    authReady,
    cartItems,
    cartSubtotal,
    cartDiscountSavings,
    shippingCost,
    cartTotal,
    storeSettings,
    signInWithGoogle,
    showToast,
    refreshUserProfile,
  } = useStore();

  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [line1, setLine1] = useState('');
  const [line2, setLine2] = useState('');
  const [city, setCity] = useState('');
  const [stateName, setStateName] = useState('Maharashtra');
  const [pinCode, setPinCode] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('COD');

  const [razorpayStatus, setRazorpayStatus] = useState<RazorpayStatus>({
    configured: false,
    keyId: null,
    mode: 'unconfigured',
  });
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/payments/razorpay/status')
      .then((r) => {
        if (!r.ok) throw new Error('API unavailable');
        return r.json();
      })
      .then((data: RazorpayStatus) => setRazorpayStatus(data))
      .catch(() => {
        setRazorpayStatus({ configured: false, keyId: null, mode: 'unconfigured' });
      });
  }, []);

  useEffect(() => {
    if (userProfile) {
      setCustomerName((prev) => prev || userProfile.name || '');
      setCustomerEmail((prev) => prev || userProfile.email || '');
      setCustomerPhone((prev) => prev || userProfile.phone || '');
      if (userProfile.address) {
        setLine1((prev) => prev || userProfile.address?.line1 || '');
        setLine2((prev) => prev || userProfile.address?.line2 || '');
        setCity((prev) => prev || userProfile.address?.city || '');
        setStateName((prev) => prev || userProfile.address?.state || 'Maharashtra');
        setPinCode((prev) => prev || userProfile.address?.pinCode || '');
      }
    } else if (user) {
      setCustomerName((prev) => prev || user.displayName || '');
      setCustomerEmail((prev) => prev || user.email || '');
    }
  }, [user, userProfile]);

  function validateForm(): string | null {
    if (customerName.trim().length < 2) return 'Please enter your full name.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail.trim())) {
      return 'Please enter a valid email address.';
    }
    const cleanPhone = customerPhone.replace(/[^0-9+]/g, '');
    if (cleanPhone.length < 10) {
      return 'Please enter a valid 10-digit mobile number.';
    }
    if (line1.trim().length < 5) return 'Please enter your complete street address.';
    if (city.trim().length < 2) return 'Please enter your city.';
    if (stateName.trim().length < 2) return 'Please select your state.';
    if (!/^[1-9][0-9]{5}$/.test(pinCode.trim())) {
      return 'Please enter a valid 6-digit Indian PIN code.';
    }
    return null;
  }

  async function finalizeOrder(params: {
    method: PaymentMethod;
    paymentStatus: 'Pending' | 'Paid';
    razorpayOrderId?: string;
    razorpayPaymentId?: string;
  }) {
    if (!user) return;
    const orderId = `ord_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const orderNumber = `KL-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

    const shippingAddress = {
      line1: line1.trim(),
      line2: line2.trim() || null,
      city: city.trim(),
      state: stateName.trim(),
      pinCode: pinCode.trim(),
      country: 'India',
    };

    const orderPayload: Omit<Order, 'createdAt' | 'updatedAt'> = {
      id: orderId,
      orderNumber,
      userId: user.uid,
      customerName: customerName.trim(),
      customerEmail: customerEmail.trim(),
      customerPhone: customerPhone.trim(),
      shippingAddress,
      items: cartItems.map((item) => ({
        productId: item.productId,
        name: item.product.name,
        sku: item.product.sku,
        selectedColor: item.selectedColor,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        image: item.image,
      })),
      subtotal: cartSubtotal,
      shippingCost,
      discountTotal: cartDiscountSavings,
      totalAmount: cartTotal,
      paymentMethod: params.method,
      paymentStatus: params.paymentStatus,
      status: 'Pending',
      ...(params.razorpayOrderId ? { razorpayOrderId: params.razorpayOrderId } : {}),
      ...(params.razorpayPaymentId ? { razorpayPaymentId: params.razorpayPaymentId } : {}),
    };

    await placeOrderWithStockUpdate({
      order: orderPayload,
      cartItemIdsToClear: cartItems.map((c) => c.id),
    });

    const updatedProfile = await upsertUserProfile({
      uid: user.uid,
      name: customerName.trim(),
      email: customerEmail.trim(),
      phone: customerPhone.trim(),
      address: shippingAddress,
    });
    refreshUserProfile(updatedProfile);

    showToast(`Order ${orderNumber} placed successfully.`, 'success');
    navigate(`/order-confirmation/${orderId}`);
  }

  async function handleSubmitOrder(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);

    if (!user) {
      setFormError('Please sign in with Google before placing your order.');
      return;
    }

    const validationErr = validateForm();
    if (validationErr) {
      setFormError(validationErr);
      return;
    }

    if (paymentMethod === 'RAZORPAY' && !razorpayStatus.configured) {
      setFormError(
        'Online payment is unavailable because Razorpay API credentials are not yet configured. Please choose Cash on Delivery.',
      );
      return;
    }

    setSubmitting(true);

    try {
      if (paymentMethod === 'COD') {
        await finalizeOrder({
          method: 'COD',
          paymentStatus: 'Pending',
        });
        return;
      }

      // Real Razorpay flow (requires server RAZORPAY_KEY_ID + RAZORPAY_KEY_SECRET)
      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded || !window.Razorpay || !razorpayStatus.keyId) {
        throw new Error('Unable to load Razorpay Checkout script. Please try again.');
      }

      const orderRes = await fetch('/api/payments/razorpay/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: cartTotal,
          receipt: `kl_${Date.now()}`,
        }),
      });
      const rzpOrder = await orderRes.json();
      if (!orderRes.ok) {
        throw new Error(rzpOrder.error || 'Could not initialize Razorpay order.');
      }

      const rzp = new window.Razorpay({
        key: razorpayStatus.keyId,
        amount: rzpOrder.amount,
        currency: rzpOrder.currency,
        name: storeSettings.storeName,
        description: 'Handcrafted Home Decor Order',
        order_id: rzpOrder.id,
        prefill: {
          name: customerName.trim(),
          email: customerEmail.trim(),
          contact: customerPhone.trim(),
        },
        theme: { color: '#C8A96A' },
        modal: {
          ondismiss: () => {
            setSubmitting(false);
            showToast('Payment window closed before completion.', 'info');
          },
        },
        handler: async (response: {
          razorpay_order_id: string;
          razorpay_payment_id: string;
          razorpay_signature: string;
        }) => {
          try {
            const verifyRes = await fetch('/api/payments/razorpay/verify', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(response),
            });
            const verifyData = await verifyRes.json();
            if (!verifyRes.ok || !verifyData.verified) {
              throw new Error(verifyData.error || 'Payment verification failed.');
            }
            await finalizeOrder({
              method: 'RAZORPAY',
              paymentStatus: 'Paid',
              razorpayOrderId: response.razorpay_order_id,
              razorpayPaymentId: response.razorpay_payment_id,
            });
          } catch (err) {
            const msg = err instanceof Error ? err.message : 'Payment verification failed.';
            setFormError(msg);
            showToast(msg, 'error');
            setSubmitting(false);
          }
        },
      });

      rzp.open();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unable to place order.';
      setFormError(msg);
      showToast(msg, 'error');
      setSubmitting(false);
    }
  }

  if (cartItems.length === 0) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-24 text-center space-y-5">
        <h1 className="font-serif text-4xl text-[#F4EFE6]">Your Bag is Empty</h1>
        <p className="text-sm text-[#B8AFA2]">
          Select handcrafted objects from the studio collection before proceeding to checkout.
        </p>
        <Link
          to="/shop"
          className="inline-block px-6 py-3 bg-[#C8A96A] text-[#12100E] text-sm font-semibold rounded-md"
        >
          Browse Collection
        </Link>
      </div>
    );
  }

  return (
    <div className="bg-[#12100E] text-[#F4EFE6] py-12 sm:py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="border-b border-[#2E2822] pb-6 mb-10">
          <p className="text-xs uppercase tracking-[0.18em] text-[#C8A96A] mb-2">
            Checkout
          </p>
          <h1 className="font-serif text-4xl text-[#F4EFE6]">
            Shipping &amp; Payment
          </h1>
        </div>

        {authReady && !user && (
          <div className="mb-10 p-6 rounded-lg border border-[#C8A96A]/40 bg-[#1A1714] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="font-serif text-2xl text-[#F4EFE6]">
                Sign in to Confirm &amp; Track Your Order
              </h2>
              <p className="text-sm text-[#B8AFA2] mt-1">
                Verify your identity with Google so your order receipt, shipping address, and delivery updates remain securely accessible.
              </p>
            </div>
            <button
              type="button"
              onClick={() => void signInWithGoogle()}
              className="px-6 py-3 bg-[#C8A96A] hover:bg-[#D9BE84] text-[#12100E] text-sm font-semibold rounded-md whitespace-nowrap shrink-0 transition-colors"
            >
              Sign In with Google
            </button>
          </div>
        )}

        <form onSubmit={(e) => void handleSubmitOrder(e)} className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          {/* Left Column: Customer & Shipping Form */}
          <div className="lg:col-span-7 space-y-8">
            <section className="p-6 sm:p-8 rounded-lg border border-[#2E2822] bg-[#1A1714] space-y-5">
              <h2 className="font-serif text-2xl text-[#F4EFE6]">Contact &amp; Delivery Address</h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs text-[#B8AFA2] mb-1.5">Full Name *</label>
                  <input
                    type="text"
                    required
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="Ananya Sharma"
                    className="w-full px-3.5 py-2.5 bg-[#12100E] border border-[#2E2822] focus:border-[#C8A96A] rounded-md text-sm text-[#F4EFE6]"
                  />
                </div>

                <div>
                  <label className="block text-xs text-[#B8AFA2] mb-1.5">Email Address *</label>
                  <input
                    type="email"
                    required
                    value={customerEmail}
                    onChange={(e) => setCustomerEmail(e.target.value)}
                    placeholder="you@domain.com"
                    className="w-full px-3.5 py-2.5 bg-[#12100E] border border-[#2E2822] focus:border-[#C8A96A] rounded-md text-sm text-[#F4EFE6]"
                  />
                </div>

                <div>
                  <label className="block text-xs text-[#B8AFA2] mb-1.5">Mobile Number *</label>
                  <input
                    type="tel"
                    required
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    placeholder="+91 98200 12345"
                    className="w-full px-3.5 py-2.5 bg-[#12100E] border border-[#2E2822] focus:border-[#C8A96A] rounded-md text-sm text-[#F4EFE6]"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs text-[#B8AFA2] mb-1.5">
                    Street Address / House &amp; Building *
                  </label>
                  <input
                    type="text"
                    required
                    value={line1}
                    onChange={(e) => setLine1(e.target.value)}
                    placeholder="Flat 402, Pali Hill Residences, Bandra West"
                    className="w-full px-3.5 py-2.5 bg-[#12100E] border border-[#2E2822] focus:border-[#C8A96A] rounded-md text-sm text-[#F4EFE6]"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs text-[#B8AFA2] mb-1.5">
                    Landmark / Apartment Suite (Optional)
                  </label>
                  <input
                    type="text"
                    value={line2}
                    onChange={(e) => setLine2(e.target.value)}
                    placeholder="Opposite Botanical Courtyard"
                    className="w-full px-3.5 py-2.5 bg-[#12100E] border border-[#2E2822] focus:border-[#C8A96A] rounded-md text-sm text-[#F4EFE6]"
                  />
                </div>

                <div>
                  <label className="block text-xs text-[#B8AFA2] mb-1.5">City *</label>
                  <input
                    type="text"
                    required
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="Mumbai"
                    className="w-full px-3.5 py-2.5 bg-[#12100E] border border-[#2E2822] focus:border-[#C8A96A] rounded-md text-sm text-[#F4EFE6]"
                  />
                </div>

                <div>
                  <label className="block text-xs text-[#B8AFA2] mb-1.5">State *</label>
                  <select
                    value={stateName}
                    onChange={(e) => setStateName(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-[#12100E] border border-[#2E2822] focus:border-[#C8A96A] rounded-md text-sm text-[#F4EFE6]"
                  >
                    {INDIAN_STATES.map((st) => (
                      <option key={st} value={st}>
                        {st}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs text-[#B8AFA2] mb-1.5">PIN Code *</label>
                  <input
                    type="text"
                    required
                    maxLength={6}
                    value={pinCode}
                    onChange={(e) => setPinCode(e.target.value.replace(/[^0-9]/g, ''))}
                    placeholder="400050"
                    className="w-full px-3.5 py-2.5 bg-[#12100E] border border-[#2E2822] focus:border-[#C8A96A] rounded-md text-sm text-[#F4EFE6] font-mono"
                  />
                </div>
              </div>
            </section>

            {/* Payment Method Selection */}
            <section className="p-6 sm:p-8 rounded-lg border border-[#2E2822] bg-[#1A1714] space-y-5">
              <h2 className="font-serif text-2xl text-[#F4EFE6]">Payment Method</h2>

              <div className="space-y-3">
                <label
                  className={`flex items-start gap-3.5 p-4 rounded-lg border cursor-pointer transition-colors ${
                    paymentMethod === 'COD'
                      ? 'border-[#C8A96A] bg-[#211D18]'
                      : 'border-[#2E2822] bg-[#12100E] hover:border-[#857B6E]'
                  }`}
                >
                  <input
                    type="radio"
                    name="paymentMethod"
                    checked={paymentMethod === 'COD'}
                    onChange={() => setPaymentMethod('COD')}
                    className="mt-1 accent-[#C8A96A]"
                  />
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-[#F4EFE6] inline-flex items-center gap-2">
                        <Truck className="w-4 h-4 text-[#C8A96A]" />
                        Cash on Delivery (COD)
                      </span>
                      <span className="text-xs text-[#C8A96A] tabular-nums">
                        Pay {formatCurrency(cartTotal, storeSettings.currencySymbol)} on arrival
                      </span>
                    </div>
                    <p className="text-xs text-[#B8AFA2] mt-1">
                      Pay in cash or via courier UPI upon insured doorstep delivery.
                    </p>
                  </div>
                </label>

                <label
                  className={`flex items-start gap-3.5 p-4 rounded-lg border cursor-pointer transition-colors ${
                    paymentMethod === 'RAZORPAY'
                      ? 'border-[#C8A96A] bg-[#211D18]'
                      : 'border-[#2E2822] bg-[#12100E] hover:border-[#857B6E]'
                  }`}
                >
                  <input
                    type="radio"
                    name="paymentMethod"
                    checked={paymentMethod === 'RAZORPAY'}
                    onChange={() => setPaymentMethod('RAZORPAY')}
                    className="mt-1 accent-[#C8A96A]"
                  />
                  <div className="flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-semibold text-[#F4EFE6] inline-flex items-center gap-2">
                        <CreditCard className="w-4 h-4 text-[#C8A96A]" />
                        Online Payment (Razorpay — UPI, Cards, NetBanking)
                      </span>
                      <span className="text-xs text-[#857B6E]">
                        {razorpayStatus.configured
                          ? razorpayStatus.mode === 'test'
                            ? 'Test Mode Ready'
                            : 'Live Mode Ready'
                          : 'Credentials Required'}
                      </span>
                    </div>
                    <p className="text-xs text-[#B8AFA2] mt-1">
                      Verified server-side HMAC signature payment processing via Razorpay India.
                    </p>

                    {paymentMethod === 'RAZORPAY' && !razorpayStatus.configured && (
                      <div className="mt-3 p-3.5 rounded-md border border-[#C8A96A]/40 bg-[#1A1510] flex items-start gap-2.5 text-xs text-[#D5CEC2]">
                        <AlertTriangle className="w-4 h-4 text-[#C8A96A] shrink-0 mt-0.5" />
                        <div className="space-y-1">
                          <p className="font-semibold text-[#F4EFE6]">
                            Razorpay API Keys Not Yet Configured
                          </p>
                          <p>
                            To activate Razorpay payments, configure <code className="font-mono text-[#C8A96A]">RAZORPAY_KEY_ID</code> and <code className="font-mono text-[#C8A96A]">RAZORPAY_KEY_SECRET</code> in your server environment secrets (e.g. <code className="font-mono">rzp_test_...</code> for test mode). Select Cash on Delivery to place a verified order now.
                          </p>
                        </div>
                      </div>
                    )}

                    {paymentMethod === 'RAZORPAY' && razorpayStatus.configured && (
                      <div className="mt-3 flex items-center gap-2 text-xs text-[#C8A96A]">
                        <CheckCircle2 className="w-4 h-4" />
                        <span>
                          Razorpay {razorpayStatus.mode === 'test' ? 'Test' : 'Live'} gateway connected and ready.
                        </span>
                      </div>
                    )}
                  </div>
                </label>
              </div>
            </section>
          </div>

          {/* Right Column: Order Summary */}
          <div className="lg:col-span-5">
            <div className="lg:sticky lg:top-24 p-6 sm:p-8 rounded-lg border border-[#2E2822] bg-[#1A1714] space-y-6">
              <h2 className="font-serif text-2xl text-[#F4EFE6]">Order Summary</h2>

              <div className="space-y-4 max-h-80 overflow-y-auto pr-1">
                {cartItems.map((item) => (
                  <div key={item.id} className="flex items-center gap-3.5">
                    <img
                      src={resolveProductImage(item.image)}
                      alt={item.product.name}
                      referrerPolicy="no-referrer"
                      className="w-14 h-14 object-cover rounded border border-[#2E2822] bg-[#12100E] shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-[#F4EFE6] truncate">
                        {item.product.name}
                      </p>
                      <p className="text-xs text-[#857B6E]">
                        {item.selectedColor} · Qty {item.quantity}
                      </p>
                    </div>
                    <span className="text-sm font-medium tabular-nums text-[#F4EFE6]">
                      {formatCurrency(item.unitPrice * item.quantity, storeSettings.currencySymbol)}
                    </span>
                  </div>
                ))}
              </div>

              <div className="pt-4 border-t border-[#2E2822] space-y-2 text-sm">
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
                  <span>Insured Shipping</span>
                  <span className="tabular-nums text-[#F4EFE6]">
                    {shippingCost === 0
                      ? 'Complimentary'
                      : formatCurrency(shippingCost, storeSettings.currencySymbol)}
                  </span>
                </div>
                <div className="flex justify-between pt-3 border-t border-[#2E2822] text-lg font-semibold text-[#F4EFE6]">
                  <span>Total Payable</span>
                  <span className="tabular-nums text-[#C8A96A]">
                    {formatCurrency(cartTotal, storeSettings.currencySymbol)}
                  </span>
                </div>
              </div>

              {formError && (
                <div className="p-3.5 rounded-md bg-[#2A1715] border border-[#E08A7B]/40 text-xs text-[#F4EFE6]">
                  {formError}
                </div>
              )}

              <button
                type="submit"
                disabled={
                  submitting ||
                  !user ||
                  (paymentMethod === 'RAZORPAY' && !razorpayStatus.configured)
                }
                className="w-full py-3.5 px-6 bg-[#C8A96A] hover:bg-[#D9BE84] text-[#12100E] font-semibold text-sm rounded-md inline-flex items-center justify-center gap-2 transition-colors disabled:opacity-45 disabled:pointer-events-none"
              >
                <Lock className="w-4 h-4" />
                <span>
                  {submitting
                    ? 'Processing Order...'
                    : paymentMethod === 'COD'
                      ? `Place Order (${formatCurrency(cartTotal, storeSettings.currencySymbol)})`
                      : `Pay ${formatCurrency(cartTotal, storeSettings.currencySymbol)} via Razorpay`}
                </span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
