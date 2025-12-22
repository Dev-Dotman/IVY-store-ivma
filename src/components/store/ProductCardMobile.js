'use client';
import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Heart, ShoppingCart, Sparkles } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useIsInWishlist, useWishlistMutations } from '@/hooks/useWishlist';

export default function ProductCardMobile({ product, primaryColor, currency, secondaryColor }) {
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated } = useAuth();
  const [imageLoaded, setImageLoaded] = useState(false);
  
  // Use TanStack Query hooks
  const liked = useIsInWishlist(product._id);
  const { addToWishlist, removeFromWishlist } = useWishlistMutations();

  const formatPrice = (price) => {
    if (currency === 'NGN') {
      return `₦${price?.toLocaleString()}`;
    }
    return `$${price?.toLocaleString()}`;
  };

  const handleProductClick = () => {
    const storeSlug = pathname.split('/')[1];
    router.push(`/${storeSlug}/product/${product._id}`);
  };

  const handleWishlistToggle = async (e) => {
    e.stopPropagation();
    
    if (!isAuthenticated) {
      const storeSlug = pathname.split('/')[1];
      router.push(`/${storeSlug}?signin=true`);
      return;
    }

    try {
      if (liked) {
        await removeFromWishlist.mutateAsync(product._id);
      } else {
        await addToWishlist.mutateAsync({
          productId: product._id,
          priority: 'medium',
          notes: ''
        });
      }
    } catch (error) {
      console.error('Error updating wishlist:', error);
    }
  };

  const isUpdating = addToWishlist.isPending || removeFromWishlist.isPending;
  const isLowStock = product.quantityInStock > 0 && product.quantityInStock <= product.reorderLevel;
  const isOutOfStock = product.quantityInStock <= 0;

  return (
    <div 
      className="bg-white rounded-2xl overflow-hidden border border-gray-100 hover:border-gray-200 hover:shadow-xl transition-all duration-300 group cursor-pointer active:scale-[0.98]"
      onClick={handleProductClick}
    >
      {/* Image Container - Enhanced with gradient overlay */}
      <div className="relative">
        <div 
          className="relative w-full aspect-square overflow-hidden"
          style={{ 
            backgroundColor: secondaryColor || '#F3F4F6'
          }}
        >
          {product.image ? (
            <>
              {/* Loading skeleton with modern shimmer */}
              {!imageLoaded && (
                <div className="absolute inset-0 bg-gradient-to-br from-gray-100 to-gray-200">
                  <div 
                    className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent"
                    style={{ 
                      backgroundSize: '200% 100%',
                      animation: 'shimmer 1.5s infinite'
                    }} 
                  />
                </div>
              )}
              
              {/* Product Image with zoom effect */}
              <img 
                src={product.image} 
                alt={product.productName} 
                className={`w-full h-full object-cover transition-all duration-500 group-hover:scale-105 ${
                  imageLoaded ? 'opacity-100' : 'opacity-0'
                }`}
                onLoad={() => setImageLoaded(true)}
                onError={() => setImageLoaded(true)}
              />

              {/* Subtle gradient overlay on hover */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            </>
          ) : (
            <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
              <span className="text-4xl opacity-40">📦</span>
            </div>
          )}
          
          {/* Stock Badges - Redesigned */}
          {isOutOfStock && (
            <div className="absolute top-2 left-2 bg-gradient-to-r from-red-600 to-red-500 text-white text-[10px] font-bold px-2.5 py-1 rounded-full shadow-lg backdrop-blur-sm">
              SOLD OUT
            </div>
          )}
          {isLowStock && (
            <div className="absolute top-2 left-2 flex items-center gap-1 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-[10px] font-bold px-2.5 py-1 rounded-full shadow-lg backdrop-blur-sm">
              <Sparkles className="w-2.5 h-2.5" />
              HURRY
            </div>
          )}

          {/* Wishlist Button - Enhanced */}
          {isAuthenticated && (
            <button
              onClick={handleWishlistToggle}
              disabled={isUpdating}
              className="absolute top-2 right-2 w-9 h-9 bg-white/95 backdrop-blur-md rounded-full flex items-center justify-center hover:bg-white hover:scale-110 transition-all shadow-lg disabled:opacity-50 z-10 border border-gray-100"
            >
              {isUpdating ? (
                <div className="w-3.5 h-3.5 border-2 border-gray-300 border-t-transparent rounded-full animate-spin" />
              ) : (
                <Heart 
                  className={`w-4.5 h-4.5 transition-all duration-200 ${liked ? 'scale-110' : ''}`}
                  style={liked ? { color: primaryColor } : { color: '#9CA3AF' }}
                  strokeWidth={liked ? 0 : 2.5}
                  fill={liked ? primaryColor : 'none'}
                />
              )}
            </button>
          )}
        </div>
      </div>

      {/* Content - Refined spacing and typography */}
      <div className="p-3 space-y-2">
        {/* Category Badge - More prominent */}
        {/* <div className="flex items-center justify-between">
          <span 
            className="text-[10px] font-semibold px-2 py-0.5 rounded-md uppercase tracking-wide"
            style={{ 
              backgroundColor: `${primaryColor}15`,
              color: primaryColor 
            }}
          >
            {product.category}
          </span>
        </div> */}

        {/* Title - Better line height */}
        <h3 className="text-sm font-bold text-gray-900 line-clamp-2 leading-tight min-h-[2.5rem]">
          {product.productName}
        </h3>

        {/* Price - More prominent with better visual hierarchy */}
        <div className="flex items-baseline gap-1.5 pt-1">
          <span 
            className="text-lg font-black tracking-tight"
            style={{ color: primaryColor }}
          >
            {formatPrice(product.sellingPrice)}
          </span>
          <span className="text-[10px] text-gray-400 font-medium">
            / {product.unitOfMeasure || 'unit'}
          </span>
        </div>

        {/* Action Button - Modern gradient style */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleProductClick();
          }}
          className="w-full py-2.5 rounded-xl text-xs font-bold transition-all duration-200 active:scale-95 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          style={{
            backgroundColor: isOutOfStock ? '#E5E7EB' : primaryColor,
            color: isOutOfStock ? '#9CA3AF' : 'white'
          }}
          disabled={isOutOfStock}
        >
          {isOutOfStock ? (
            'OUT OF STOCK'
          ) : (
            <>
              <ShoppingCart className="w-3.5 h-3.5" />
              <span>ADD TO CART</span>
            </>
          )}
        </button>
      </div>

      {/* Bottom accent line */}
      <div 
        className="h-0.5 w-0 group-hover:w-full transition-all duration-300 mx-auto"
        style={{ backgroundColor: primaryColor }}
      />

      <style jsx>{`
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
      `}</style>
    </div>
  );
}
