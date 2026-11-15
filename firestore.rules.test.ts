/**
 * Security Rule Verification Spec for Kora & Loom Firestore Rules.
 * Covers the "Dirty Dozen" adversarial payloads defined in security_spec.md.
 */

export const DIRTY_DOZEN_CASES = [
  {
    name: '1. Shadow Field Injection on Product Create',
    path: 'products/prod_1',
    operation: 'create',
    expected: 'PERMISSION_DENIED',
    payload: { id: 'prod_1', name: 'Vase', isVerified: true },
  },
  {
    name: '2. Self-Assigned Admin Role on Profile Create',
    path: 'users/attacker_uid',
    operation: 'create',
    expected: 'PERMISSION_DENIED',
    payload: { uid: 'attacker_uid', name: 'Mallory', email: 'm@example.com', role: 'admin' },
  },
  {
    name: '3. Unverified Email Admin Spoof',
    path: 'products/prod_2',
    operation: 'create',
    auth: { uid: 'spoof', email: 'james.disusa123@gmail.com', email_verified: false },
    expected: 'PERMISSION_DENIED',
  },
  {
    name: '4. Oversized ID Poisoning',
    path: `products/${'a'.repeat(200)}`,
    operation: 'create',
    expected: 'PERMISSION_DENIED',
  },
  {
    name: '5. Cross-User Order List Query',
    path: 'orders',
    operation: 'list',
    auth: { uid: 'user_a', email_verified: true },
    expected: 'PERMISSION_DENIED',
  },
  {
    name: '6. Price Manipulation on Order Update',
    path: 'orders/order_1',
    operation: 'update',
    expected: 'PERMISSION_DENIED',
    payload: { totalAmount: 1, paymentStatus: 'Paid' },
  },
  {
    name: '7. Post-Delivery State Tampering',
    path: 'orders/order_delivered',
    operation: 'update',
    expected: 'PERMISSION_DENIED',
    payload: { status: 'Cancelled' },
  },
  {
    name: '8. Fake Timestamp Injection',
    path: 'orders/order_2',
    operation: 'create',
    expected: 'PERMISSION_DENIED',
    payload: { createdAt: '1970-01-01T00:00:00Z' },
  },
  {
    name: '9. Blanket User PII Read',
    path: 'users',
    operation: 'list',
    auth: { uid: 'user_a', email_verified: true },
    expected: 'PERMISSION_DENIED',
  },
  {
    name: '10. Stock Inflation Attack',
    path: 'products/prod_1',
    operation: 'update',
    auth: { uid: 'user_a', email_verified: true },
    expected: 'PERMISSION_DENIED',
    payload: { stockQuantity: 999999 },
  },
  {
    name: '11. Unbounded Array Exhaustion',
    path: 'products/prod_3',
    operation: 'create',
    expected: 'PERMISSION_DENIED',
    payload: { images: Array(50).fill('https://example.com/img.jpg') },
  },
  {
    name: '12. Cart Cross-User Mutation',
    path: 'users/user_b/cart/item_1',
    operation: 'create',
    auth: { uid: 'user_a', email_verified: true },
    expected: 'PERMISSION_DENIED',
  },
];
