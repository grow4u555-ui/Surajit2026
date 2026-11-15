import { useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { Menu, ShoppingBag, User as UserIcon, X, LogOut } from 'lucide-react';
import { useStore } from '../context/StoreContext';

export function Navbar() {
  const { user, isAdmin, cartCount, setIsCartOpen, signInWithGoogle, logout, storeSettings } =
    useStore();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    `text-sm transition-colors whitespace-nowrap shrink-0 pb-0.5 border-b ${
      isActive
        ? 'text-[#C8A96A] border-[#C8A96A]'
        : 'text-[#B8AFA2] border-transparent hover:text-[#F4EFE6]'
    }`;

  return (
    <header className="sticky top-0 z-40 bg-[#12100E]/92 backdrop-blur-md border-b border-[#2E2822]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-8">
        {/* Zone 1: Single-line Brand Wordmark */}
        <Link
          to="/"
          className="font-serif text-2xl font-semibold tracking-tight text-[#F4EFE6] whitespace-nowrap shrink-0"
        >
          {storeSettings.storeName}
        </Link>

        {/* Zone 2: Clean single-line nav links */}
        <nav className="hidden md:flex items-center gap-7">
          <NavLink to="/" end className={navLinkClass}>
            Home
          </NavLink>
          <NavLink to="/shop" className={navLinkClass}>
            Shop
          </NavLink>
          <Link
            to="/#story"
            className="text-sm text-[#B8AFA2] hover:text-[#F4EFE6] transition-colors whitespace-nowrap shrink-0 pb-0.5 border-b border-transparent"
          >
            Our Craft
          </Link>
          <NavLink to="/orders" className={navLinkClass}>
            Orders
          </NavLink>
          {isAdmin && (
            <NavLink to="/admin" className={navLinkClass}>
              Admin
            </NavLink>
          )}
        </nav>

        {/* Zone 3: Bag & Account Action */}
        <div className="flex items-center gap-3 shrink-0">
          {user ? (
            <div className="hidden sm:flex items-center gap-2">
              <span className="text-xs text-[#B8AFA2] max-w-[130px] truncate">
                {user.displayName || user.email}
              </span>
              <button
                type="button"
                onClick={() => void logout()}
                title="Sign out"
                aria-label="Sign out"
                className="p-2 text-[#B8AFA2] hover:text-[#F4EFE6] transition-colors rounded-md"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => void signInWithGoogle()}
              className="hidden sm:inline-flex items-center gap-1.5 text-sm text-[#B8AFA2] hover:text-[#F4EFE6] transition-colors whitespace-nowrap shrink-0 px-2.5 py-1.5"
            >
              <UserIcon className="w-4 h-4" />
              <span>Sign In</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setIsCartOpen(true)}
            aria-label="Open shopping bag"
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#C8A96A] hover:bg-[#D9BE84] text-[#12100E] text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0"
          >
            <ShoppingBag className="w-4 h-4" />
            <span className="tabular-nums">Bag ({cartCount})</span>
          </button>

          <button
            type="button"
            onClick={() => setMobileMenuOpen((v) => !v)}
            aria-label="Toggle navigation menu"
            className="md:hidden p-2 text-[#F4EFE6] hover:text-[#C8A96A] transition-colors"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Navigation Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-[#2E2822] bg-[#161310] px-5 py-4 space-y-3">
          <div className="flex flex-col space-y-2.5">
            <NavLink
              to="/"
              end
              onClick={() => setMobileMenuOpen(false)}
              className="text-sm text-[#F4EFE6] py-1"
            >
              Home
            </NavLink>
            <NavLink
              to="/shop"
              onClick={() => setMobileMenuOpen(false)}
              className="text-sm text-[#F4EFE6] py-1"
            >
              Shop
            </NavLink>
            <Link
              to="/#story"
              onClick={() => setMobileMenuOpen(false)}
              className="text-sm text-[#F4EFE6] py-1"
            >
              Our Craft
            </Link>
            <NavLink
              to="/orders"
              onClick={() => setMobileMenuOpen(false)}
              className="text-sm text-[#F4EFE6] py-1"
            >
              Orders
            </NavLink>
            {isAdmin && (
              <NavLink
                to="/admin"
                onClick={() => setMobileMenuOpen(false)}
                className="text-sm text-[#C8A96A] py-1"
              >
                Admin Panel
              </NavLink>
            )}
          </div>
          <div className="pt-3 border-t border-[#2E2822]">
            {user ? (
              <div className="flex items-center justify-between text-xs text-[#B8AFA2]">
                <span className="truncate">{user.email}</span>
                <button
                  type="button"
                  onClick={() => {
                    void logout();
                    setMobileMenuOpen(false);
                  }}
                  className="text-[#C8A96A] font-medium"
                >
                  Sign Out
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => {
                  void signInWithGoogle();
                  setMobileMenuOpen(false);
                }}
                className="w-full py-2.5 text-sm font-medium text-[#12100E] bg-[#F4EFE6] rounded-md"
              >
                Sign In with Google
              </button>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
