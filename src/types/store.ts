import type { Timestamp } from 'firebase/firestore';

export interface ColorVariation {
  name: string;
  hex: string;
  images: string[];
  stock: number;
}

export interface Product {
  id: string;
  name: string;
  slug: string;
  description: string;
  category: string;
  price: number;
  discountPrice?: number | null;
  images: string[];
  colorVariations: ColorVariation[];
  stockQuantity: number;
  sku: string;
  featured: boolean;
  bestSeller: boolean;
  newArrival: boolean;
  materials?: string | null;
  dimensions?: string | null;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  imageUrl?: string | null;
  displayOrder: number;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export interface CartItem {
  id: string;
  productId: string;
  selectedColor: string;
  quantity: number;
  updatedAt?: Timestamp;
}

export interface ShippingAddress {
  line1: string;
  line2?: string | null;
  city: string;
  state: string;
  pinCode: string;
  country?: string | null;
}

export interface OrderItem {
  productId: string;
  name: string;
  sku: string;
  selectedColor: string;
  quantity: number;
  unitPrice: number;
  image: string;
}

export type PaymentMethod = 'COD' | 'RAZORPAY';
export type PaymentStatus = 'Pending' | 'Paid' | 'Failed' | 'Refunded';
export type OrderStatus =
  | 'Pending'
  | 'Confirmed'
  | 'Processing'
  | 'Shipped'
  | 'Delivered'
  | 'Cancelled';

export interface Order {
  id: string;
  orderNumber: string;
  userId: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  shippingAddress: ShippingAddress;
  items: OrderItem[];
  subtotal: number;
  shippingCost: number;
  discountTotal: number;
  totalAmount: number;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  razorpayOrderId?: string | null;
  razorpayPaymentId?: string | null;
  status: OrderStatus;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export interface UserProfile {
  uid: string;
  name: string;
  email: string;
  phone?: string | null;
  address?: ShippingAddress | null;
  role: 'customer' | 'admin';
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export interface StoreSettings {
  id: string;
  storeName: string;
  tagline?: string | null;
  contactEmail: string;
  contactPhone?: string | null;
  studioAddress?: string | null;
  shippingFee: number;
  freeShippingThreshold: number;
  currencySymbol: string;
  updatedAt?: Timestamp;
}

export interface NewsletterSubscriber {
  id: string;
  email: string;
  createdAt?: Timestamp;
}
