# Security Specification & Payload-First TDD

## 1. Data Invariants
1. **Default Deny**: No Firestore document outside explicitly matched paths can be read or written.
2. **Product Integrity**: Products are publicly readable, but creation and deletion are strictly limited to verified administrators (`isAdmin()`). Customers may only decrement `stockQuantity` (and matching variation stock) strictly downwards (`incoming.stockQuantity < existing.stockQuantity && incoming.stockQuantity >= 0`) while keeping all pricing, SKU, and metadata immutable.
3. **PII Isolation**: User documents (`users/{userId}`) contain email, phone, and address PII. Only the owning verified user or an admin can `get` a user profile; only admins can `list` users.
4. **Privilege Escalation Prevention**: Users creating or updating their own `users/{userId}` document are strictly constrained to `role == 'customer'` unless the requester already passes `isAdmin()`.
5. **Order Ownership & State Integrity**: Orders (`orders/{orderId}`) must bind `userId == request.auth.uid`, initialize at `status == 'Pending'`, enforce `request.time` timestamps, and prevent customer tampering with totals, items, or payment status. Terminal statuses (`Delivered`, `Cancelled`) are locked against non-admin edits.
6. **Verified Identity**: All authenticated writes require `request.auth.token.email_verified == true`.
7. **Query Enforcement**: Every `allow list` on private/PII collections (`orders`, `users`) enforces `resource.data.userId == request.auth.uid || isAdmin()`.

## 2. The "Dirty Dozen" Attack Payloads
1. **Shadow Field Injection on Product Create**: `{ ...validProduct, isVerified: true }` -> `PERMISSION_DENIED` (blocked by `keys().hasOnly`).
2. **Self-Assigned Admin Role on Profile Create**: `{ uid: attackerUid, name: "Mallory", email: "m@x.com", role: "admin", createdAt: serverTimestamp, updatedAt: serverTimestamp }` -> `PERMISSION_DENIED` (`role == 'customer'` enforced for non-admins).
3. **Unverified Email Admin Spoof**: Token with `email: "james.disusa123@gmail.com"` and `email_verified: false` -> `PERMISSION_DENIED` (`email_verified == true` required).
4. **Oversized ID Poisoning**: Document ID of 200 characters or containing `/` or spaces -> `PERMISSION_DENIED` (`isValidId()` regex & length guard).
5. **Cross-User Order Read (`get`/`list`)**: User A querying `orders` without `where('userId', '==', userA)` or fetching User B's order -> `PERMISSION_DENIED` (`resource.data.userId == request.auth.uid`).
6. **Price Manipulation on Order Update**: Customer updating `orders/{id}` to change `totalAmount: 1` or `paymentStatus: 'Paid'` -> `PERMISSION_DENIED` (`affectedKeys().hasOnly(['status', 'updatedAt'])`).
7. **Post-Delivery State Tampering**: Customer attempting to change a `Delivered` order back to `Pending` or `Cancelled` -> `PERMISSION_DENIED` (terminal state lock).
8. **Fake Timestamp Injection**: Client passing `createdAt: Timestamp.fromMillis(0)` instead of `serverTimestamp()` -> `PERMISSION_DENIED` (`== request.time`).
9. **Blanket User PII Read**: Authenticated non-admin attempting `getDocs(collection(db, 'users'))` -> `PERMISSION_DENIED` (`allow list: if isAdmin()`).
10. **Stock Inflation Attack**: Non-admin attempting to update product `stockQuantity` upward or change `price` -> `PERMISSION_DENIED` (`incoming.stockQuantity < existing.stockQuantity` & `affectedKeys().hasOnly`).
11. **Unbounded Array Exhaustion**: Sending 50 image URLs in `images` on product create -> `PERMISSION_DENIED` (`data.images.size() <= 12`).
12. **Cart Cross-User Mutation**: User A writing to `/users/{userB}/cart/{itemId}` -> `PERMISSION_DENIED` (`isOwner(userId)`).

## 3. Verification Test Runner (`firestore.rules.test.ts`)
See `/firestore.rules.test.ts` for the complete emulator assertion suite covering all 12 adversarial payloads.
