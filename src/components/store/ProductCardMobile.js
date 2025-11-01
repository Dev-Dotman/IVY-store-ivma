'use client';
import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Heart, Tag } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

export default function ProductCardMobile({ product, primaryColor, currency, secondaryColor }) {
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated } = useAuth();
  const [liked, setLiked] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [addingToWishlist, setAddingToWishlist] = useState(false);
  const [checkingWishlist, setCheckingWishlist] = useState(false);

  // Check if item is in user's wishlist when component mounts
  useEffect(() => {
    const checkWishlistStatus = async () => {
      if (!isAuthenticated || !product._id) return;
      
      setCheckingWishlist(true);
      try {
        const response = await fetch('/api/wishlist', {
          credentials: 'include'
        });
        const data = await response.json();
        
        if (response.ok && data.success && data.wishlist?.items) {
          const isInWishlist = data.wishlist.items.some(item => 
            (item.product._id || item.product) === product._id
          );
          setLiked(isInWishlist);
        }
      } catch (error) {
        console.error('Error checking wishlist status:', error);
      } finally {
        setCheckingWishlist(false);
      }
    };

    checkWishlistStatus();
  }, [isAuthenticated, product._id]);

  const formatPrice = (price) => {
    if (currency === 'NGN') {
      return `₦${price?.toLocaleString()}`;
    }
    return `$${price?.toLocaleString()}`;
  };

  const handleProductClick = () => {
    // Extract store slug from current pathname
    const storeSlug = pathname.split('/')[1];
    router.push(`/${storeSlug}/product/${product._id}`);
  };

  const handleWishlistToggle = async (e) => {
    e.stopPropagation();
    
    if (!isAuthenticated) {
      // Redirect to sign in
      const storeSlug = pathname.split('/')[1];
      router.push(`/${storeSlug}?signin=true`);
      return;
    }

    setAddingToWishlist(true);
    
    try {
      if (liked) {
        // Remove from wishlist
        const response = await fetch(`/api/wishlist/${product._id}`, {
          method: 'DELETE',
          credentials: 'include'
        });
        
        if (response.ok) {
          setLiked(false);
        } else {
          console.error('Failed to remove from wishlist');
        }
      } else {
        // Add to wishlist
        const response = await fetch('/api/wishlist', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({
            productId: product._id,
            priority: 'medium',
            notes: '',
            notifications: {
              priceDropAlert: true,
              backInStockAlert: true
            }
          })
        });
        
        if (response.ok) {
          setLiked(true);
        } else {
          console.error('Failed to add to wishlist');
        }
      }
    } catch (error) {
      console.error('Error updating wishlist:', error);
    } finally {
      setAddingToWishlist(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl overflow-hidden border border-gray-100 hover:shadow-lg transition-all duration-200 group cursor-pointer"
         onClick={handleProductClick}>
      {/* Image Container - No padding on mobile */}
      <div className="p-0">
        <div className="relative w-full aspect-square rounded-none overflow-hidden"
          style={{ 
            backgroundColor: secondaryColor || '#F3F4F6'
          }}
        >
          {product.image ? (
            <>
              {/* Loading skeleton with glassmorphism */}
              {!imageLoaded && (
                <div className="absolute inset-0 bg-gradient-to-br from-gray-100/80 to-gray-200/80 backdrop-blur-sm animate-pulse">
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer" 
                       style={{ 
                         backgroundSize: '200% 100%',
                         animation: 'shimmer 2s infinite'
                       }} 
                  />
                </div>
              )}
              
              <img 
                src={product.image} 
                alt={product.productName} 
                className={`absolute inset-0 w-full h-full object-cover object-center transition-opacity duration-300 ${
                  imageLoaded ? 'opacity-100' : 'opacity-0'
                }`}
                onLoad={() => setImageLoaded(true)}
                onError={() => setImageLoaded(true)}
              />
            </>
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-3xl">📦</span>
            </div>
          )}
          
          {/* Stock Badge - Smaller for mobile */}
          {product.quantityInStock <= 0 && (
            <div className="absolute top-2 left-2 bg-red-600 text-white text-xs font-semibold px-2 py-0.5 rounded-full">
              Out of Stock
            </div>
          )}
          {product.quantityInStock > 0 && product.quantityInStock <= product.reorderLevel && (
            <div className="absolute top-2 left-2 bg-yellow-500 text-white text-xs font-semibold px-2 py-0.5 rounded-full">
              Low Stock
            </div>
          )}
        </div>
      </div>

      {/* Content - Compact mobile padding */}
      <div className="px-3 pb-3">
        {/* Title - Smaller text for mobile */}
        <h3 className="text-lg font-semibold text-gray-900 mb-1 line-clamp-1">
          {product.productName}
        </h3>
        
        {/* Category - Smaller text for mobile */}
        <p className="text-xs text-gray-500 mb-2">
          {product.category}
        </p>

        {/* Price Row - No location on mobile */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-1">
            <Tag className="w-3 h-3 text-gray-500" />
            <span className="text-xs font-medium text-gray-900">
             {formatPrice(product.sellingPrice)}
            </span>
          </div>
          
          {/* Wishlist button moved to top right area */}
          {isAuthenticated && (
            <button
              onClick={handleWishlistToggle}
              disabled={addingToWishlist || checkingWishlist}
              className="w-6 h-6 bg-gray-50 rounded-lg flex items-center justify-center hover:bg-gray-100 transition-colors disabled:opacity-50"
            >
              {addingToWishlist || checkingWishlist ? (
                <div className="w-2.5 h-2.5 border border-gray-400 border-t-transparent rounded-full animate-spin" />
              ) : (
                <Heart 
                  className={`w-3 h-3 transition-all duration-200 ${liked ? 'fill-current scale-110' : 'text-gray-600'}`}
                  style={liked ? { color: primaryColor } : {}}
                  strokeWidth={liked ? 0 : 2}
                  fill={liked ? primaryColor : 'none'}
                />
              )}
            </button>
          )}
        </div>

        {/* Single Button Row - Simplified for mobile */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleProductClick();
          }}
          className="w-full py-1 mb-2 bg-gray-900 text-white rounded-lg text-xs font-medium hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={product.quantityInStock <= 0}
        >
          {product.quantityInStock <= 0 ? 'Not Available' : 'Add to Cart'}
        </button>
      </div>

      <style jsx>{`
        @keyframes shimmer {
          0% {
            background-position: -200% 0;
          }
          100% {
            background-position: 200% 0;
          }
        }
        .animate-shimmer {
          animation: shimmer 2s infinite;
        }
      `}</style>
    </div>
  );
}
