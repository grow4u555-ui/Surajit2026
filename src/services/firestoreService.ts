import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
  type Unsubscribe,
} from 'firebase/firestore';
import { getDownloadURL, ref, uploadBytesResumable } from 'firebase/storage';
import { db, handleFirestoreError, OperationType, storage } from '../lib/firebase';
import {
  DEFAULT_STORE_SETTINGS,
  STARTER_CATEGORIES,
  STARTER_PRODUCTS,
} from '../lib/catalogSeedData';
import type {
  CartItem,
  Category,
  Order,
  OrderStatus,
  PaymentStatus,
  Product,
  ShippingAddress,
  StoreSettings,
  UserProfile,
} from '../types/store';

export function subscribeProducts(onData: (products: Product[]) => void): Unsubscribe {
  const q = query(collection(db, 'products'), orderBy('createdAt', 'desc'));
  return onSnapshot(
    q,
    (snap) => {
      const items = snap.docs.map((d) => ({ ...d.data(), id: d.id }) as Product);
      onData(items);
    },
    (err) => handleFirestoreError(err, OperationType.LIST, 'products'),
  );
}

export function subscribeCategories(onData: (categories: Category[]) => void): Unsubscribe {
  const q = query(collection(db, 'categories'), orderBy('displayOrder', 'asc'));
  return onSnapshot(
    q,
    (snap) => {
      const items = snap.docs.map((d) => ({ ...d.data(), id: d.id }) as Category);
      onData(items);
    },
    (err) => handleFirestoreError(err, OperationType.LIST, 'categories'),
  );
}

export function subscribeStoreSettings(onData: (settings: StoreSettings) => void): Unsubscribe {
  const refDoc = doc(db, 'storeSettings', 'main');
  return onSnapshot(
    refDoc,
    (snap) => {
      if (snap.exists()) {
        const data = { ...snap.data(), id: snap.id } as StoreSettings;
        if (
          data.storeName === 'Kora & Loom' &&
          data.contactEmail === 'atelier@koraandloom.in'
        ) {
          onData({ ...DEFAULT_STORE_SETTINGS });
        } else {
          onData(data);
        }
      } else {
        onData({ ...DEFAULT_STORE_SETTINGS });
      }
    },
    (err) => handleFirestoreError(err, OperationType.GET, 'storeSettings/main'),
  );
}

export function subscribeUserOrders(
  userId: string,
  onData: (orders: Order[]) => void,
): Unsubscribe {
  const q = query(collection(db, 'orders'), where('userId', '==', userId));
  return onSnapshot(
    q,
    (snap) => {
      const items = snap.docs
        .map((d) => ({ ...d.data(), id: d.id }) as Order)
        .sort((a, b) => {
          const aMs = a.createdAt?.toMillis?.() || 0;
          const bMs = b.createdAt?.toMillis?.() || 0;
          return bMs - aMs;
        });
      onData(items);
    },
    (err) => handleFirestoreError(err, OperationType.LIST, 'orders'),
  );
}

export function subscribeAllOrders(onData: (orders: Order[]) => void): Unsubscribe {
  const q = query(collection(db, 'orders'), orderBy('createdAt', 'desc'));
  return onSnapshot(
    q,
    (snap) => {
      const items = snap.docs.map((d) => ({ ...d.data(), id: d.id }) as Order);
      onData(items);
    },
    (err) => handleFirestoreError(err, OperationType.LIST, 'orders'),
  );
}

export function subscribeAllUsers(onData: (users: UserProfile[]) => void): Unsubscribe {
  const q = query(collection(db, 'users'), orderBy('createdAt', 'desc'));
  return onSnapshot(
    q,
    (snap) => {
      const items = snap.docs.map((d) => ({ ...d.data(), uid: d.id }) as UserProfile);
      onData(items);
    },
    (err) => handleFirestoreError(err, OperationType.LIST, 'users'),
  );
}

export function subscribeSubscribers(
  onData: (subs: { id: string; email: string; createdAt?: unknown }[]) => void,
): Unsubscribe {
  const q = query(collection(db, 'newsletterSubscribers'), orderBy('createdAt', 'desc'));
  return onSnapshot(
    q,
    (snap) => {
      const items = snap.docs.map((d) => ({
        id: d.id,
        email: String(d.data().email || ''),
        createdAt: d.data().createdAt,
      }));
      onData(items);
    },
    (err) => handleFirestoreError(err, OperationType.LIST, 'newsletterSubscribers'),
  );
}

export function subscribeUserCart(
  userId: string,
  onData: (items: CartItem[]) => void,
): Unsubscribe {
  const q = query(collection(db, 'users', userId, 'cart'));
  return onSnapshot(
    q,
    (snap) => {
      const items = snap.docs.map((d) => ({ ...d.data(), id: d.id }) as CartItem);
      onData(items);
    },
    (err) => handleFirestoreError(err, OperationType.LIST, `users/${userId}/cart`),
  );
}

export async function syncCartItemToFirestore(userId: string, item: CartItem): Promise<void> {
  const path = `users/${userId}/cart/${item.id}`;
  try {
    await setDoc(doc(db, 'users', userId, 'cart', item.id), {
      id: item.id,
      productId: item.productId,
      selectedColor: item.selectedColor,
      quantity: Math.max(1, Math.min(99, Math.floor(item.quantity))),
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

export async function removeCartItemFromFirestore(userId: string, itemId: string): Promise<void> {
  const path = `users/${userId}/cart/${itemId}`;
  try {
    await deleteDoc(doc(db, 'users', userId, 'cart', itemId));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
  }
}

export async function clearUserCartInFirestore(userId: string, itemIds: string[]): Promise<void> {
  if (itemIds.length === 0) return;
  try {
    const batch = writeBatch(db);
    for (const itemId of itemIds) {
      batch.delete(doc(db, 'users', userId, 'cart', itemId));
    }
    await batch.commit();
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `users/${userId}/cart`);
  }
}

export async function upsertUserProfile(params: {
  uid: string;
  name: string;
  email: string;
  phone?: string;
  address?: ShippingAddress;
}): Promise<UserProfile> {
  const refDoc = doc(db, 'users', params.uid);
  try {
    const snap = await getDoc(refDoc);
    if (!snap.exists()) {
      const newProfile: Record<string, unknown> = {
        uid: params.uid,
        name: params.name.slice(0, 120) || 'Guest Customer',
        email: params.email.slice(0, 180),
        role: 'customer',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };
      if (params.phone) newProfile.phone = params.phone.slice(0, 24);
      if (params.address) newProfile.address = params.address;
      await setDoc(refDoc, newProfile);
      const created = await getDoc(refDoc);
      return created.data() as UserProfile;
    }

    if (params.phone || params.address || params.name) {
      const updates: Record<string, unknown> = {
        updatedAt: serverTimestamp(),
      };
      if (params.name) updates.name = params.name.slice(0, 120);
      if (params.phone !== undefined) updates.phone = params.phone.slice(0, 24);
      if (params.address !== undefined) updates.address = params.address;
      await updateDoc(refDoc, updates);
    }
    const latest = await getDoc(refDoc);
    return latest.data() as UserProfile;
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `users/${params.uid}`);
  }
}

export async function checkIsAdminUser(uid: string, email?: string | null): Promise<boolean> {
  if (email && email.toLowerCase() === 'james.disusa123@gmail.com') {
    return true;
  }
  try {
    const snap = await getDoc(doc(db, 'admins', uid));
    return snap.exists();
  } catch {
    return false;
  }
}

export async function saveProduct(
  productData: Omit<Product, 'createdAt' | 'updatedAt'>,
  isNew: boolean,
): Promise<void> {
  const path = `products/${productData.id}`;
  try {
    const cleanPayload: Record<string, unknown> = {
      id: productData.id,
      name: productData.name.trim().slice(0, 140),
      slug: productData.slug.trim().slice(0, 160),
      description: productData.description.trim().slice(0, 4000),
      category: productData.category.trim().slice(0, 80),
      price: Number(productData.price),
      discountPrice:
        productData.discountPrice !== undefined &&
        productData.discountPrice !== null &&
        Number(productData.discountPrice) > 0
          ? Number(productData.discountPrice)
          : null,
      images: productData.images.slice(0, 12),
      colorVariations: productData.colorVariations.slice(0, 10).map((v) => ({
        name: v.name.trim().slice(0, 80),
        hex: v.hex.trim().slice(0, 16),
        images: v.images.slice(0, 12),
        stock: Math.max(0, Math.floor(Number(v.stock))),
      })),
      stockQuantity: Math.max(0, Math.floor(Number(productData.stockQuantity))),
      sku: productData.sku.trim().slice(0, 64),
      featured: Boolean(productData.featured),
      bestSeller: Boolean(productData.bestSeller),
      newArrival: Boolean(productData.newArrival),
      materials: productData.materials ? productData.materials.trim().slice(0, 300) : null,
      dimensions: productData.dimensions ? productData.dimensions.trim().slice(0, 200) : null,
      updatedAt: serverTimestamp(),
    };

    if (isNew) {
      cleanPayload.createdAt = serverTimestamp();
      await setDoc(doc(db, 'products', productData.id), cleanPayload);
    } else {
      await updateDoc(doc(db, 'products', productData.id), cleanPayload);
    }
  } catch (err) {
    handleFirestoreError(err, isNew ? OperationType.CREATE : OperationType.UPDATE, path);
  }
}

export async function deleteProduct(productId: string): Promise<void> {
  const path = `products/${productId}`;
  try {
    await deleteDoc(doc(db, 'products', productId));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
  }
}

export async function saveCategory(
  category: Omit<Category, 'createdAt' | 'updatedAt'>,
  isNew: boolean,
): Promise<void> {
  const path = `categories/${category.id}`;
  try {
    const payload: Record<string, unknown> = {
      id: category.id,
      name: category.name.trim().slice(0, 80),
      slug: category.slug.trim().slice(0, 100),
      description: category.description ? category.description.trim().slice(0, 500) : null,
      imageUrl: category.imageUrl ? category.imageUrl.trim().slice(0, 1200) : null,
      displayOrder: Math.max(0, Math.floor(Number(category.displayOrder))),
      updatedAt: serverTimestamp(),
    };
    if (isNew) {
      payload.createdAt = serverTimestamp();
      await setDoc(doc(db, 'categories', category.id), payload);
    } else {
      await updateDoc(doc(db, 'categories', category.id), payload);
    }
  } catch (err) {
    handleFirestoreError(err, isNew ? OperationType.CREATE : OperationType.UPDATE, path);
  }
}

export async function deleteCategory(categoryId: string): Promise<void> {
  try {
    await deleteDoc(doc(db, 'categories', categoryId));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, `categories/${categoryId}`);
  }
}

export async function saveStoreSettings(
  settings: Omit<StoreSettings, 'updatedAt'>,
): Promise<void> {
  const path = `storeSettings/${settings.id}`;
  try {
    await setDoc(doc(db, 'storeSettings', settings.id), {
      id: settings.id,
      storeName: settings.storeName.trim().slice(0, 100),
      tagline: settings.tagline ? settings.tagline.trim().slice(0, 240) : null,
      contactEmail: settings.contactEmail.trim().slice(0, 180),
      contactPhone: settings.contactPhone ? settings.contactPhone.trim().slice(0, 32) : null,
      studioAddress: settings.studioAddress ? settings.studioAddress.trim().slice(0, 300) : null,
      shippingFee: Math.max(0, Number(settings.shippingFee)),
      freeShippingThreshold: Math.max(0, Number(settings.freeShippingThreshold)),
      currencySymbol: settings.currencySymbol.trim().slice(0, 8) || '₹',
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

export async function placeOrderWithStockUpdate(params: {
  order: Omit<Order, 'createdAt' | 'updatedAt'>;
  cartItemIdsToClear: string[];
}): Promise<string> {
  const { order, cartItemIdsToClear } = params;
  const orderRef = doc(db, 'orders', order.id);

  try {
    await runTransaction(db, async (transaction) => {
      // Aggregate quantities per productId in case multiple color variations of same product are ordered
      const productMap = new Map<
        string,
        { ref: ReturnType<typeof doc>; data: Product; items: typeof order.items }
      >();

      for (const item of order.items) {
        const existingEntry = productMap.get(item.productId);
        if (existingEntry) {
          existingEntry.items.push(item);
        } else {
          const pRef = doc(db, 'products', item.productId);
          const pSnap = await transaction.get(pRef);
          if (!pSnap.exists()) {
            throw new Error(`Product "${item.name}" is no longer available.`);
          }
          productMap.set(item.productId, {
            ref: pRef,
            data: pSnap.data() as Product,
            items: [item],
          });
        }
      }

      // Verify stock and prepare updates
      for (const { ref: pRef, data: pData, items } of productMap.values()) {
        const totalOrderedQty = items.reduce((sum, i) => sum + i.quantity, 0);
        if (pData.stockQuantity < totalOrderedQty) {
          throw new Error(
            `Insufficient stock for "${pData.name}". Available: ${pData.stockQuantity}.`,
          );
        }

        const updatedVariations = (pData.colorVariations || []).map((v) => {
          const orderedForColor = items
            .filter((i) => i.selectedColor === v.name)
            .reduce((sum, i) => sum + i.quantity, 0);
          if (orderedForColor > 0) {
            if (v.stock < orderedForColor) {
              throw new Error(
                `Insufficient stock for "${pData.name}" (${v.name}). Available: ${v.stock}.`,
              );
            }
            return { ...v, stock: v.stock - orderedForColor };
          }
          return v;
        });

        transaction.update(pRef, {
          stockQuantity: pData.stockQuantity - totalOrderedQty,
          colorVariations: updatedVariations,
          updatedAt: serverTimestamp(),
        });
      }

      // Create the order document
      const orderPayload: Record<string, unknown> = {
        ...order,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };
      transaction.set(orderRef, orderPayload);

      // Clear user cart items in the same atomic transaction
      for (const cartItemId of cartItemIdsToClear) {
        transaction.delete(doc(db, 'users', order.userId, 'cart', cartItemId));
      }
    });

    return order.id;
  } catch (err) {
    if (err instanceof Error && !err.message.includes('permission')) {
      throw err;
    }
    handleFirestoreError(err, OperationType.WRITE, `orders/${order.id}`);
  }
}

export async function updateOrderAdmin(params: {
  orderId: string;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
}): Promise<void> {
  const path = `orders/${params.orderId}`;
  try {
    await updateDoc(doc(db, 'orders', params.orderId), {
      status: params.status,
      paymentStatus: params.paymentStatus,
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, path);
  }
}

export async function cancelPendingOrderCustomer(orderId: string): Promise<void> {
  const path = `orders/${orderId}`;
  try {
    await updateDoc(doc(db, 'orders', orderId), {
      status: 'Cancelled',
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, path);
  }
}

export async function subscribeNewsletter(email: string): Promise<void> {
  const cleanEmail = email.trim().toLowerCase();
  const id = `sub_${cleanEmail.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 96)}`;
  const path = `newsletterSubscribers/${id}`;
  try {
    await setDoc(doc(db, 'newsletterSubscribers', id), {
      id,
      email: cleanEmail,
      createdAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, path);
  }
}

export async function uploadProductImage(
  productId: string,
  file: File,
  onProgress?: (pct: number) => void,
): Promise<string> {
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const storageRef = ref(storage, `products/${productId}/${Date.now()}_${safeName}`);
  return new Promise((resolve, reject) => {
    const task = uploadBytesResumable(storageRef, file);
    task.on(
      'state_changed',
      (snap) => {
        if (onProgress && snap.totalBytes > 0) {
          onProgress(Math.round((snap.bytesTransferred / snap.totalBytes) * 100));
        }
      },
      (error) => reject(error),
      async () => {
        try {
          const url = await getDownloadURL(task.snapshot.ref);
          resolve(url);
        } catch (err) {
          reject(err);
        }
      },
    );
  });
}

export async function seedStarterCatalogToFirestore(): Promise<void> {
  try {
    const batch = writeBatch(db);
    for (const cat of STARTER_CATEGORIES) {
      batch.set(doc(db, 'categories', cat.id), {
        ...cat,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
    for (const prod of STARTER_PRODUCTS) {
      batch.set(doc(db, 'products', prod.id), {
        ...prod,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
    batch.set(doc(db, 'storeSettings', 'main'), {
      ...DEFAULT_STORE_SETTINGS,
      updatedAt: serverTimestamp(),
    });
    await batch.commit();
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, 'products');
  }
}
