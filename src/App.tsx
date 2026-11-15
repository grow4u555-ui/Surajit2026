/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect } from 'react';
import { BrowserRouter, Route, Routes, useLocation } from 'react-router-dom';
import { CartDrawer } from './components/CartDrawer';
import { Footer } from './components/Footer';
import { Navbar } from './components/Navbar';
import { ToastContainer } from './components/ToastContainer';
import { StoreProvider } from './context/StoreContext';
import { AdminDashboard } from './pages/AdminDashboard';
import { CheckoutPage } from './pages/CheckoutPage';
import { HomePage } from './pages/HomePage';
import { MyOrdersPage } from './pages/MyOrdersPage';
import { OrderConfirmationPage } from './pages/OrderConfirmationPage';
import { ProductDetailPage } from './pages/ProductDetailPage';
import { ShopPage } from './pages/ShopPage';

function ScrollToTop() {
  const { pathname, hash } = useLocation();
  useEffect(() => {
    if (hash) {
      const target = document.getElementById(hash.slice(1));
      if (target) {
        target.scrollIntoView({ behavior: 'smooth' });
        return;
      }
    }
    window.scrollTo(0, 0);
  }, [pathname, hash]);
  return null;
}

class AppErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; message: string }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, message: error.message };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#12100E] text-[#F4EFE6] flex items-center justify-center p-6">
          <div className="max-w-md w-full p-8 rounded-lg border border-[#2E2822] bg-[#1A1714] text-center space-y-4">
            <h1 className="font-serif text-3xl">Something Went Wrong</h1>
            <p className="text-sm text-[#B8AFA2]">
              An unexpected error interrupted the studio view. Reload to continue.
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="px-5 py-2.5 bg-[#C8A96A] text-[#12100E] text-sm font-semibold rounded-md"
            >
              Reload Studio
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  return (
    <AppErrorBoundary>
      <BrowserRouter>
        <StoreProvider>
          <ScrollToTop />
          <div className="min-h-screen flex flex-col bg-[#12100E] text-[#F4EFE6]">
            <Navbar />
            <main className="flex-1">
              <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="/shop" element={<ShopPage />} />
                <Route path="/product/:productId" element={<ProductDetailPage />} />
                <Route path="/checkout" element={<CheckoutPage />} />
                <Route path="/order-confirmation/:orderId" element={<OrderConfirmationPage />} />
                <Route path="/orders" element={<MyOrdersPage />} />
                <Route path="/admin" element={<AdminDashboard />} />
                <Route path="*" element={<HomePage />} />
              </Routes>
            </main>
            <Footer />
            <CartDrawer />
            <ToastContainer />
          </div>
        </StoreProvider>
      </BrowserRouter>
    </AppErrorBoundary>
  );
}
