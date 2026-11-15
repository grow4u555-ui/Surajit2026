import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { onAuthStateChanged, signInWithPopup, signOut, type User } from 'firebase/auth';
import { auth, googleProvider } from '../lib/firebase';
import { DEFAULT_STORE_SETTINGS } from '../lib/catalogSeedData';
import { getEffectivePrice } from '../lib/formatters';
import {
  checkIsAdminUser,
  clearUserCartInFirestore,
  removeCartItemFromFirestore,
  subscribeCategories,
  subscribeProducts,
  subscribeStoreSettings,
  subscribeUserCart,
  syncCartItemToFirestore,
  upsertUserProfile,
} from '../services/firestoreService';
import type {
  CartItem,
  Category,
  Product,
  StoreSettings,
  UserProfile,
} from '../types/store';

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info';
  message: string;
}

export interface EnrichedCartItem extends CartItem {
  product: Product;
  unitPrice: number;
  originalPrice: number;
  image: string;
  maxStock: number;
}

interface StoreContextValue {
  user: User | null;
  userProfile: UserProfile | null;
  isAdmin: boolean;
  authReady: boolean;
  products: Product[];
  productsLoading: boolean;
  categories: Category[];
  storeSettings: StoreSettings;
  cartItems: EnrichedCartItem[];
  cartCount: number;
  cartSubtotal: number;
  cartOriginalSubtotal: number;
  cartDiscountSavings: number;
  shippingCost: number;
  cartTotal: number;
  isCartOpen: boolean;
  setIsCartOpen: (open: boolean) => void;
  addToCart: (product: Product, selectedColor: string, quantity?: number, openDrawer?: boolean) => void;
  updateCartQuantity: (itemId: string, quantity: number) => void;
  changeCartVariation: (itemId: string, newColor: string) => void;
  removeFromCart: (itemId: string) => void;
  clearCart: () => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  toasts: ToastMessage[];
  showToast: (message: string, type?: ToastMessage['type']) => void;
  dismissToast: (id: string) => void;
  refreshUserProfile: (profile: UserProfile) => void;
}

const LOCAL_CART_KEY = 'kora_loom_cart_v1';

const StoreContext = createContext<StoreContextValue | undefined>(undefined);

function makeCartItemId(productId: string, colorName: string): string {
  const safeColor = colorName.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 48) || 'default';
  return `${productId}__${safeColor}`.slice(0, 128);
}

function readLocalCart(): CartItem[] {
  try {
    const raw = localStorage.getItem(LOCAL_CART_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeLocalCart(items: CartItem[]): void {
  try {
    localStorage.setItem(LOCAL_CART_KEY, JSON.stringify(items));
  } catch {
    // ignore storage quota errors
  }
}

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [authReady, setAuthReady] = useState(false);

  const [products, setProducts] = useState<Product[]>([]);
  const [productsLoading, setProductsLoading] = useState(true);
  const [categories, setCategories] = useState<Category[]>([]);
  const [storeSettings, setStoreSettings] = useState<StoreSettings>({ ...DEFAULT_STORE_SETTINGS });

  const [rawCart, setRawCart] = useState<CartItem[]>(() => readLocalCart());
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const showToast = useCallback((message: string, type: ToastMessage['type'] = 'info') => {
    const id = `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    setToasts((prev) => [...prev, { id, type, message }]);
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4200);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Subscribe to public storefront collections (products, categories, storeSettings)
  useEffect(() => {
    const unsubProducts = subscribeProducts((items) => {
      setProducts(items);
      setProductsLoading(false);
    });
    const unsubCategories = subscribeCategories((cats) => {
      setCategories(cats);
    });
    const unsubSettings = subscribeStoreSettings((settings) => {
      setStoreSettings(settings);
    });
    return () => {
      unsubProducts();
      unsubCategories();
      unsubSettings();
    };
  }, []);

  // Auth listener & Firestore cart sync
  useEffect(() => {
    let unsubCart: (() => void) | undefined;

    const unsubAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (unsubCart) {
        unsubCart();
        unsubCart = undefined;
      }

      if (firebaseUser) {
        try {
          const adminFlag = await checkIsAdminUser(firebaseUser.uid, firebaseUser.email);
          setIsAdmin(adminFlag);

          const profile = await upsertUserProfile({
            uid: firebaseUser.uid,
            name: firebaseUser.displayName || 'Valued Guest',
            email: firebaseUser.email || '',
          });
          setUserProfile(profile);

          // Merge any guest localStorage cart items into Firestore cart once
          const localItems = readLocalCart();
          if (localItems.length > 0) {
            for (const item of localItems) {
              await syncCartItemToFirestore(firebaseUser.uid, item).catch(() => {});
            }
            writeLocalCart([]);
          }

          unsubCart = subscribeUserCart(firebaseUser.uid, (cloudCart) => {
            setRawCart(cloudCart);
          });
        } catch (err) {
          console.error('Auth sync error:', err);
        }
      } else {
        setIsAdmin(false);
        setUserProfile(null);
        setRawCart(readLocalCart());
      }
      setAuthReady(true);
    });

    return () => {
      unsubAuth();
      if (unsubCart) unsubCart();
    };
  }, []);

  const signInWithGoogle = useCallback(async () => {
    try {
      await signInWithPopup(auth, googleProvider);
      showToast('Signed in successfully.', 'success');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unable to sign in.';
      if (!msg.includes('popup-closed-by-user')) {
        showToast('Sign-in could not be completed. Please try again.', 'error');
      }
    }
  }, [showToast]);

  const logout = useCallback(async () => {
    await signOut(auth);
    showToast('Signed out.', 'info');
  }, [showToast]);

  const addToCart = useCallback(
    (product: Product, selectedColor: string, quantity = 1, openDrawer = true) => {
      const variation = product.colorVariations?.find((v) => v.name === selectedColor);
      const maxStock = variation ? variation.stock : product.stockQuantity;
      if (maxStock <= 0) {
        showToast('This variation is currently out of stock.', 'error');
        return;
      }

      const id = makeCartItemId(product.id, selectedColor);
      const existing = rawCart.find((i) => i.id === id);
      const nextQty = Math.min(maxStock, (existing?.quantity || 0) + quantity);

      const newItem: CartItem = {
        id,
        productId: product.id,
        selectedColor,
        quantity: nextQty,
      };

      if (user) {
        void syncCartItemToFirestore(user.uid, newItem).catch(() => {
          showToast('Could not update cart in cloud.', 'error');
        });
      } else {
        const updated = existing
          ? rawCart.map((i) => (i.id === id ? newItem : i))
          : [...rawCart, newItem];
        setRawCart(updated);
        writeLocalCart(updated);
      }

      showToast(`Added ${product.name} to your bag.`, 'success');
      if (openDrawer) setIsCartOpen(true);
    },
    [rawCart, showToast, user],
  );

  const updateCartQuantity = useCallback(
    (itemId: string, quantity: number) => {
      const item = rawCart.find((i) => i.id === itemId);
      if (!item) return;

      if (quantity <= 0) {
        if (user) {
          void removeCartItemFromFirestore(user.uid, itemId);
        } else {
          const updated = rawCart.filter((i) => i.id !== itemId);
          setRawCart(updated);
          writeLocalCart(updated);
        }
        return;
      }

      const product = products.find((p) => p.id === item.productId);
      const variation = product?.colorVariations?.find((v) => v.name === item.selectedColor);
      const maxStock = variation ? variation.stock : product?.stockQuantity ?? 99;
      const clampedQty = Math.max(1, Math.min(maxStock, quantity));

      const updatedItem: CartItem = { ...item, quantity: clampedQty };
      if (user) {
        void syncCartItemToFirestore(user.uid, updatedItem);
      } else {
        const updated = rawCart.map((i) => (i.id === itemId ? updatedItem : i));
        setRawCart(updated);
        writeLocalCart(updated);
      }
    },
    [products, rawCart, user],
  );

  const changeCartVariation = useCallback(
    (itemId: string, newColor: string) => {
      const item = rawCart.find((i) => i.id === itemId);
      if (!item || item.selectedColor === newColor) return;

      const product = products.find((p) => p.id === item.productId);
      if (!product) return;

      const variation = product.colorVariations?.find((v) => v.name === newColor);
      const maxStock = variation ? variation.stock : product.stockQuantity;
      if (maxStock <= 0) {
        showToast(`${newColor} is currently out of stock.`, 'error');
        return;
      }

      const newId = makeCartItemId(product.id, newColor);
      const targetExisting = rawCart.find((i) => i.id === newId);
      const mergedQty = Math.min(
        maxStock,
        item.quantity + (targetExisting ? targetExisting.quantity : 0),
      );
      const newItem: CartItem = {
        id: newId,
        productId: product.id,
        selectedColor: newColor,
        quantity: mergedQty,
      };

      if (user) {
        void removeCartItemFromFirestore(user.uid, itemId).then(() =>
          syncCartItemToFirestore(user.uid, newItem),
        );
      } else {
        const filtered = rawCart.filter((i) => i.id !== itemId && i.id !== newId);
        const updated = [...filtered, newItem];
        setRawCart(updated);
        writeLocalCart(updated);
      }
    },
    [products, rawCart, showToast, user],
  );

  const removeFromCart = useCallback(
    (itemId: string) => {
      if (user) {
        void removeCartItemFromFirestore(user.uid, itemId);
      } else {
        const updated = rawCart.filter((i) => i.id !== itemId);
        setRawCart(updated);
        writeLocalCart(updated);
      }
    },
    [rawCart, user],
  );

  const clearCart = useCallback(async () => {
    if (user) {
      await clearUserCartInFirestore(
        user.uid,
        rawCart.map((i) => i.id),
      );
    } else {
      setRawCart([]);
      writeLocalCart([]);
    }
  }, [rawCart, user]);

  const cartItems = useMemo<EnrichedCartItem[]>(() => {
    const enriched: EnrichedCartItem[] = [];
    for (const item of rawCart) {
      const product = products.find((p) => p.id === item.productId);
      if (!product) continue;
      const variation = product.colorVariations?.find((v) => v.name === item.selectedColor);
      const image =
        (variation && variation.images && variation.images[0]) ||
        product.images[0] ||
        '';
      const maxStock = variation ? variation.stock : product.stockQuantity;
      const unitPrice = getEffectivePrice(product);
      enriched.push({
        ...item,
        product,
        unitPrice,
        originalPrice: product.price,
        image,
        maxStock,
      });
    }
    return enriched;
  }, [products, rawCart]);

  const cartCount = useMemo(
    () => cartItems.reduce((sum, item) => sum + item.quantity, 0),
    [cartItems],
  );

  const cartSubtotal = useMemo(
    () => cartItems.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0),
    [cartItems],
  );

  const cartOriginalSubtotal = useMemo(
    () => cartItems.reduce((sum, item) => sum + item.originalPrice * item.quantity, 0),
    [cartItems],
  );

  const cartDiscountSavings = Math.max(0, cartOriginalSubtotal - cartSubtotal);

  const shippingCost = useMemo(() => {
    if (cartSubtotal === 0) return 0;
    if (cartSubtotal >= storeSettings.freeShippingThreshold) return 0;
    return storeSettings.shippingFee;
  }, [cartSubtotal, storeSettings.freeShippingThreshold, storeSettings.shippingFee]);

  const cartTotal = cartSubtotal + shippingCost;

  const value: StoreContextValue = {
    user,
    userProfile,
    isAdmin,
    authReady,
    products,
    productsLoading,
    categories,
    storeSettings,
    cartItems,
    cartCount,
    cartSubtotal,
    cartOriginalSubtotal,
    cartDiscountSavings,
    shippingCost,
    cartTotal,
    isCartOpen,
    setIsCartOpen,
    addToCart,
    updateCartQuantity,
    changeCartVariation,
    removeFromCart,
    clearCart,
    signInWithGoogle,
    logout,
    toasts,
    showToast,
    dismissToast,
    refreshUserProfile: setUserProfile,
  };

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): StoreContextValue {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used inside StoreProvider');
  return ctx;
}
