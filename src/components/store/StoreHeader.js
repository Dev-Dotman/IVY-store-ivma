'use client';
import { useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Search, ShoppingCart, User, Menu, Heart, LogOut, Package } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useCart } from '@/contexts/CartContext';
import SignInModal from '../auth/SignInModal';
import SignUpModal from '../auth/SignUpModal';
import useStoreStore from '@/stores/storeStore';

export default function StoreHeader() {
  const router = useRouter();
  const pathname = usePathname();
  const { customer, isAuthenticated, isLoading: authLoading, logout, setRedirectAfterLogin } = useAuth();
  const { getCartCount } = useCart();
  
  // Get store from Zustand store
  const { currentStore } = useStoreStore();
  const primaryColor = currentStore?.branding?.primaryColor || '#0D9488';
  
  const [showSignIn, setShowSignIn] = useState(false);
  const [showSignUp, setShowSignUp] = useState(false);
  const [showAccountMenu, setShowAccountMenu] = useState(false);

  // Extract store slug from pathname
  const storeSlug = pathname.split('/')[1];

  const handleSignOut = async () => {
    await logout();
    setShowAccountMenu(false);
  };

  const handleSwitchToSignUp = () => {
    setShowSignIn(false);
    setShowSignUp(true);
  };

  const handleSwitchToSignIn = () => {
    setShowSignUp(false);
    setShowSignIn(true);
  };

  const handleCartClick = () => {
    if (authLoading) {
      return;
    }
    
    if (!isAuthenticated) {
      setRedirectAfterLogin(`/${storeSlug}/cart`);
      setShowSignIn(true);
    } else {
      router.push(`/${storeSlug}/cart`);
    }
  };

  const handleWishlistClick = () => {
    if (authLoading) {
      return;
    }
    
    if (!isAuthenticated) {
      setRedirectAfterLogin(`/${storeSlug}/wishlist`);
      setShowSignIn(true);
    } else {
      router.push(`/${storeSlug}/wishlist`);
    }
  };
  
  return (
    <>
      <header className="sticky top-0 z-50 bg-white border-b border-gray-100">
        {/* Top announcement bar */}
        <div 
          className="text-white text-center py-2 px-4 text-sm font-medium" 
          style={{ backgroundColor: primaryColor }}
        >
          Free shipping on orders over $50 • Shop now!
        </div>

        {/* Main header */}
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="flex items-center justify-between py-4 gap-6">
            
            {/* Left: Logo & Mobile Menu */}
            <div className="flex items-center gap-4">
              <button className="md:hidden p-2 hover:bg-gray-50 rounded-xl transition-colors">
                <Menu className="w-5 h-5 text-gray-600" />
              </button>
              
              <div className="flex items-center gap-3">
                {currentStore?.branding?.logo ? (
                  <img 
                    src={currentStore.branding.logo} 
                    alt={currentStore.storeName} 
                    className="h-8 w-auto object-contain" 
                  />
                ) : (
                  <div 
                    className="h-8 w-8 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: primaryColor }}
                  >
                    <span className="text-white font-semibold text-sm">
                      {currentStore?.storeName?.charAt(0)?.toUpperCase() || 'S'}
                    </span>
                  </div>
                )}
                <h1 className="text-xl font-semibold text-gray-900">
                  {currentStore?.storeName || 'Store'}
                </h1>
              </div>
            </div>

            {/* Center: Search Bar */}
            <div className="flex-1 max-w-2xl">
              <div className="relative flex items-center space-x-2">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Search for products..."
                  className="w-full px-4 py-3 pl-11 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:bg-white transition-colors"
                  style={{ '--tw-ring-color': primaryColor }}
                />
              </div>
            </div>

            {/* Right: Actions */}
            <div className="flex items-center gap-2">
              <button 
                onClick={handleWishlistClick}
                className="hidden md:flex items-center gap-2 px-3 py-2 text-gray-600 hover:bg-gray-50 rounded-xl transition-colors"
              >
                <Heart className="w-5 h-5" />
                <span className="text-sm font-medium hidden lg:inline">Wishlist</span>
              </button>
              
              {/* Account Button - Changes based on auth state */}
              {isAuthenticated ? (
                <div className="relative">
                  <button 
                    onClick={() => setShowAccountMenu(!showAccountMenu)}
                    className="hidden md:flex items-center gap-2 px-3 py-2 text-gray-600 hover:bg-gray-50 rounded-xl transition-colors"
                  >
                    <User className="w-5 h-5" />
                    <span className="text-sm font-medium hidden lg:inline">
                      {customer?.firstName || 'Account'}
                    </span>
                  </button>

                  {/* Account Dropdown Menu */}
                  {showAccountMenu && (
                    <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-lg border border-gray-100 py-2 z-50">
                      <div className="px-4 py-3 border-b border-gray-100">
                        <p className="text-sm font-semibold text-gray-900">
                          {customer?.fullName || `${customer?.firstName} ${customer?.lastName}`}
                        </p>
                        <p className="text-xs text-gray-500 mt-0.5">{customer?.email}</p>
                      </div>
                      
                      <button 
                        onClick={() => {
                          setShowAccountMenu(false);
                          // Navigate to store-specific orders page
                          router.push(`/${storeSlug}/orders`);
                        }}
                        className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                      >
                        <Package className="w-4 h-4" />
                        My Orders
                      </button>
                      
                      <button 
                        onClick={() => {
                          setShowAccountMenu(false);
                          router.push(`/${storeSlug}/wishlist`);
                        }}
                        className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                      >
                        <Heart className="w-4 h-4" />
                        Wishlist
                      </button>
                      
                      <button className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2">
                        <User className="w-4 h-4" />
                        Profile Settings
                      </button>
                      
                      <div className="border-t border-gray-100 mt-2 pt-2">
                        <button 
                          onClick={handleSignOut}
                          className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                        >
                          <LogOut className="w-4 h-4" />
                          Sign Out
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <button 
                  onClick={() => setShowSignIn(true)}
                  className="hidden md:flex items-center gap-2 px-3 py-2 text-gray-600 hover:bg-gray-50 rounded-xl transition-colors"
                >
                  <User className="w-5 h-5" />
                  <span className="text-sm font-medium hidden lg:inline">Sign In</span>
                </button>
              )}
              
              <button 
                onClick={handleCartClick}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-white font-medium transition-colors hover:opacity-90"
                style={{ backgroundColor: primaryColor }}
              >
                <div className="relative flex">
                  <ShoppingCart className="w-5 h-5" />
                  {getCartCount() > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-600 text-white text-xs w-4 h-4 rounded-full flex items-center justify-center font-semibold">
                      {getCartCount()}
                    </span>
                  )}
                </div>
                <span className="hidden sm:inline">Cart</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Modals */}
      <SignInModal
        isOpen={showSignIn}
        onClose={() => setShowSignIn(false)}
        onSwitchToSignUp={handleSwitchToSignUp}
        onSuccess={() => {
          setShowSignIn(false);
          // Navigate to store-specific redirect if set
          const redirect = sessionStorage.getItem('redirectAfterLogin');
          if (redirect && redirect.includes(storeSlug)) {
            router.push(redirect);
            sessionStorage.removeItem('redirectAfterLogin');
          }
        }}
      />

      <SignUpModal
        isOpen={showSignUp}
        onClose={() => setShowSignUp(false)}
        onSuccess={() => {
          setShowSignUp(false);
          // Navigate to store-specific redirect if set
          const redirect = sessionStorage.getItem('redirectAfterLogin');
          if (redirect && redirect.includes(storeSlug)) {
            router.push(redirect);
            sessionStorage.removeItem('redirectAfterLogin');
          }
        }}
        onSwitchToSignIn={handleSwitchToSignIn}
      />

      {/* Close account menu when clicking outside */}
      {showAccountMenu && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={() => setShowAccountMenu(false)}
        />
      )}
    </>
  );

}