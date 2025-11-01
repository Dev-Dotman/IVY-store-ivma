"use client";
import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Plus, Minus, ShoppingCart, Heart, MapPin, Tag, Package, Star } from "lucide-react";
import { useCart } from "@/contexts/CartContext";
import { useAuth } from "@/contexts/AuthContext";
import useStoreStore from "@/stores/storeStore";

export default function ProductDetailsPage({ params }) {
  const router = useRouter();
  const { addToCart } = useCart();
  const { isAuthenticated } = useAuth();
  const resolvedParams = use(params);
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [isAddingToCart, setIsAddingToCart] = useState(false);
  const [liked, setLiked] = useState(false);
  const [showSignInPrompt, setShowSignInPrompt] = useState(false);

  // Get store from Zustand store
  const { currentStore, fetchStore } = useStoreStore();

  // Fetch store if not loaded
  useEffect(() => {
    if (resolvedParams.slug && (!currentStore || currentStore.ivmaWebsite?.websitePath !== resolvedParams.slug)) {
      fetchStore(resolvedParams.slug);
    }
  }, [resolvedParams.slug, currentStore, fetchStore]);

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/products/${resolvedParams.id}`);
        const data = await response.json();

        if (data.success) {
          setProduct(data.product);
        }
      } catch (error) {
        console.error("Error fetching product:", error);
      } finally {
        setLoading(false);
      }
    };

    if (resolvedParams.id) {
      fetchProduct();
    }
  }, [resolvedParams.id]);

  // Store colors with fallbacks
  const primaryColor = currentStore?.branding?.primaryColor || '#0D9488';
  const secondaryColor = currentStore?.branding?.secondaryColor || '#F3F4F6';
  const currency = currentStore?.settings?.currency || 'NGN';

  if (loading || !currentStore) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div 
            className="inline-block animate-spin rounded-full h-16 w-16 border-4 border-gray-200 mb-4"
            style={{ borderTopColor: primaryColor }}
          ></div>
          <p className="text-gray-600 text-sm">Loading product...</p>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-md">
          <div className="text-8xl mb-4">📦</div>
          <h2 className="text-3xl font-bold text-gray-900 mb-3">Product Not Found</h2>
          <p className="text-gray-600 mb-6">The product you're looking for doesn't exist or has been removed.</p>
          <button
            onClick={() => router.push(`/${resolvedParams.slug}`)}
            className="inline-flex items-center gap-2 px-6 py-3 text-white rounded-xl font-medium hover:opacity-90 transition-opacity"
            style={{ backgroundColor: primaryColor }}
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Store
          </button>
        </div>
      </div>
    );
  }

  const maxQuantity = product.quantityInStock || 0;
  const isOutOfStock = maxQuantity === 0;
  const isLowStock = maxQuantity > 0 && maxQuantity <= product.reorderLevel;

  const formatPrice = (price) => {
    if (currency === 'NGN') {
      return `₦${price?.toLocaleString()}`;
    }
    return `$${price?.toLocaleString()}`;
  };

  const handleQuantityChange = (newQuantity) => {
    if (newQuantity < 1) return;
    if (newQuantity > maxQuantity) {
      setQuantity(maxQuantity);
      return;
    }
    setQuantity(newQuantity);
  };

  const handleAddToCart = async () => {
    // Check if user is authenticated
    if (!isAuthenticated) {
      setShowSignInPrompt(true);
      return;
    }

    setIsAddingToCart(true);

    try {
      const result = await addToCart(product._id, quantity);

      if (result.success) {
        // Show success message
        alert("Item added to cart successfully!");
        setQuantity(1);
        
        // Optional: Navigate back to store or stay on page
        // router.push(`/${resolvedParams.slug}`);
      } else {
        alert(result.error || "Failed to add item to cart");
      }
    } catch (error) {
      console.error("Error adding to cart:", error);
      alert("Please sign in to add items to cart");
    } finally {
      setIsAddingToCart(false);
    }
  };

  const totalPrice = product.sellingPrice * quantity;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile-First Header */}
      <div className="bg-white border-b border-gray-100 sticky top-0 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 sm:py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => router.push(`/${resolvedParams.slug}`)}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors group"
            >
              <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
              <span className="font-medium">Back to {currentStore?.storeName || 'Store'}</span>
            </button>
            
            {/* Store Logo - smaller on mobile */}
            {currentStore?.branding?.logo && (
              <img 
                src={currentStore.branding.logo} 
                alt={currentStore.storeName} 
                className="h-6 sm:h-8 w-auto object-contain opacity-60" 
              />
            )}
          </div>
        </div>
      </div>

      {/* Mobile-Optimized Product Details */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8 lg:py-12">
        <div className="bg-white rounded-2xl sm:rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
          
          {/* Mobile: Single Column Layout, Desktop: Two Column */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-0">
            
            {/* Image Section - Mobile optimized */}
            <div className="p-4 sm:p-8 lg:p-12 bg-gradient-to-br from-gray-50 to-white order-1 lg:order-1">
              <div 
                className="relative w-full aspect-square rounded-xl sm:rounded-2xl overflow-hidden shadow-lg mb-4 sm:mb-6"
                style={{ backgroundColor: secondaryColor }}
              >
                {product.image ? (
                  <img 
                    src={product.image} 
                    alt={product.productName}
                    className="w-full h-full object-cover hover:scale-105 transition-transform duration-500"
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center">
                      <span className="text-6xl sm:text-8xl mb-2 sm:mb-4 block">📦</span>
                      <p className="text-gray-500 text-xs sm:text-sm">No image available</p>
                    </div>
                  </div>
                )}

                {/* Stock Badge - responsive sizing */}
                {isOutOfStock && (
                  <div className="absolute top-3 sm:top-6 left-3 sm:left-6 bg-red-600 text-white text-xs sm:text-sm font-semibold px-2 sm:px-4 py-1 sm:py-2 rounded-full shadow-lg backdrop-blur-sm">
                    Out of Stock
                  </div>
                )}
                {isLowStock && !isOutOfStock && (
                  <div className="absolute top-3 sm:top-6 left-3 sm:left-6 bg-yellow-500 text-white text-xs sm:text-sm font-semibold px-2 sm:px-4 py-1 sm:py-2 rounded-full shadow-lg backdrop-blur-sm">
                    Only {maxQuantity} left
                  </div>
                )}

                {/* Wishlist Button - responsive sizing */}
                <button
                  onClick={() => setLiked(!liked)}
                  className="absolute top-3 sm:top-6 right-3 sm:right-6 w-10 h-10 sm:w-14 sm:h-14 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center shadow-lg hover:scale-110 hover:bg-white transition-all"
                >
                  <Heart 
                    className={`w-5 h-5 sm:w-6 sm:h-6 ${liked ? 'fill-current' : ''}`}
                    style={liked ? { color: primaryColor } : { color: '#6B7280' }}
                    strokeWidth={liked ? 0 : 2}
                    fill={liked ? primaryColor : 'none'}
                  />
                </button>
              </div>

              {/* Product Stats Cards - Mobile: horizontal scroll, Desktop: grid */}
              <div className="flex gap-3 sm:grid sm:grid-cols-3 sm:gap-4 overflow-x-auto sm:overflow-visible pb-2 sm:pb-0">
                <div className="bg-white border border-gray-100 rounded-xl sm:rounded-2xl p-3 sm:p-4 text-center hover:shadow-md transition-shadow flex-shrink-0 min-w-[100px] sm:min-w-0">
                  <Package className="w-5 h-5 sm:w-6 sm:h-6 text-gray-400 mx-auto mb-1 sm:mb-2" />
                  <p className="text-xs text-gray-500 mb-1">In Stock</p>
                  <p className="text-sm sm:text-lg font-bold text-gray-900">{maxQuantity}</p>
                </div>
                <div className="bg-white border border-gray-100 rounded-xl sm:rounded-2xl p-3 sm:p-4 text-center hover:shadow-md transition-shadow flex-shrink-0 min-w-[100px] sm:min-w-0">
                  <Tag className="w-5 h-5 sm:w-6 sm:h-6 text-gray-400 mx-auto mb-1 sm:mb-2" />
                  <p className="text-xs text-gray-500 mb-1">Category</p>
                  <p className="text-xs sm:text-sm font-semibold text-gray-900 truncate">{product.category}</p>
                </div>
                <div className="bg-white border border-gray-100 rounded-xl sm:rounded-2xl p-3 sm:p-4 text-center hover:shadow-md transition-shadow flex-shrink-0 min-w-[100px] sm:min-w-0">
                  <MapPin className="w-5 h-5 sm:w-6 sm:h-6 text-gray-400 mx-auto mb-1 sm:mb-2" />
                  <p className="text-xs text-gray-500 mb-1">Location</p>
                  <p className="text-xs sm:text-sm font-semibold text-gray-900 truncate">{product.location || 'Store'}</p>
                </div>
              </div>
            </div>

            {/* Product Information - Mobile: order-2, takes full width on mobile */}
            <div className="p-4 sm:p-8 lg:p-12 flex flex-col order-2 lg:order-2">
              
              {/* Product Header - Mobile optimized */}
              <div className="mb-6 sm:mb-8">
                {/* Category Badge */}
                <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-gray-100 rounded-full text-xs font-medium text-gray-700 mb-3 sm:mb-4">
                  <Tag className="w-3 h-3" />
                  {product.category}
                </div>
                
                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 mb-2 sm:mb-3 leading-tight">
                  {product.productName}
                </h1>
                
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-xs sm:text-sm text-gray-500">
                  <span>SKU: <span className="font-mono font-medium text-gray-700">{product.sku || 'N/A'}</span></span>
                  {product.brand && (
                    <>
                      <span className="hidden sm:inline">•</span>
                      <span>Brand: <span className="font-medium text-gray-700">{product.brand}</span></span>
                    </>
                  )}
                </div>
              </div>

              {/* Price Section - Mobile optimized */}
              <div className="mb-6 sm:mb-8 pb-6 sm:pb-8 border-b border-gray-100">
                <p className="text-sm text-gray-500 mb-2">Price</p>
                <div className="flex items-baseline gap-3">
                  <p className="text-3xl sm:text-4xl lg:text-5xl font-bold" style={{ color: primaryColor }}>
                    {formatPrice(product.sellingPrice)}
                  </p>
                </div>
              </div>

              {/* Description - Mobile: collapsible on very small screens */}
              {product.description && (
                <div className="mb-6 sm:mb-8">
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Product Description</h3>
                  <p className="text-sm sm:text-base text-gray-600 leading-relaxed">
                    {product.description}
                  </p>
                </div>
              )}

              {/* Quantity Selector - Mobile optimized */}
              <div className="mb-6 sm:mb-8">
                <label className="text-lg font-semibold text-gray-900 mb-3 sm:mb-4 block">
                  Select Quantity
                </label>
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4">
                  <div className="flex items-center bg-gray-50 border-2 border-gray-200 rounded-xl sm:rounded-2xl overflow-hidden hover:border-gray-300 transition-colors">
                    <button
                      onClick={() => handleQuantityChange(quantity - 1)}
                      disabled={quantity <= 1 || isOutOfStock}
                      className="px-4 sm:px-6 py-3 sm:py-4 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    >
                      <Minus className="w-4 h-4 sm:w-5 sm:h-5 text-gray-700" />
                    </button>
                    <input
                      type="number"
                      value={quantity}
                      onChange={(e) => handleQuantityChange(parseInt(e.target.value) || 1)}
                      disabled={isOutOfStock}
                      className="w-16 sm:w-20 text-center text-lg sm:text-xl font-bold text-gray-900 bg-transparent focus:outline-none"
                      min="1"
                      max={maxQuantity}
                    />
                    <button
                      onClick={() => handleQuantityChange(quantity + 1)}
                      disabled={quantity >= maxQuantity || isOutOfStock}
                      className="px-4 sm:px-6 py-3 sm:py-4 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    >
                      <Plus className="w-4 h-4 sm:w-5 sm:h-5 text-gray-700" />
                    </button>
                  </div>
                  <p className="text-sm text-gray-600">
                    <span className="font-semibold text-gray-900">{maxQuantity}</span> items available
                  </p>
                </div>
              </div>

              {/* Total Price Summary - Mobile optimized */}
              <div className="bg-gradient-to-r from-gray-50 to-gray-100/50 rounded-xl sm:rounded-2xl p-4 sm:p-6 mb-6 sm:mb-8">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-gray-600 text-base sm:text-lg">Total Price</span>
                  <span className="text-2xl sm:text-3xl font-bold text-gray-900">
                    {formatPrice(totalPrice)}
                  </span>
                </div>
                <p className="text-sm text-gray-500">
                  {quantity} {quantity === 1 ? 'item' : 'items'} × {formatPrice(product.sellingPrice)}
                </p>
              </div>

              {/* Action Buttons - Mobile: stacked, Desktop: side by side */}
              <div className="flex flex-col sm:flex-row gap-3 mt-auto">
                <button
                  onClick={handleAddToCart}
                  disabled={isOutOfStock || isAddingToCart}
                  className="w-full py-4 sm:py-5 px-6 rounded-xl sm:rounded-2xl text-white text-base sm:text-lg font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 hover:shadow-lg hover:scale-[1.02] active:scale-[0.98]"
                  style={{ backgroundColor: primaryColor }}
                >
                  {isAddingToCart ? (
                    <>
                      <svg className="animate-spin h-5 w-5 sm:h-6 sm:w-6 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Adding...
                    </>
                  ) : isOutOfStock ? (
                    'Out of Stock'
                  ) : (
                    <>
                      <ShoppingCart className="w-5 h-5 sm:w-6 sm:h-6" />
                      Add to Cart
                    </>
                  )}
                </button>

                <button
                  onClick={() => router.push(`/${resolvedParams.slug}`)}
                  className="w-full py-4 sm:py-5 px-6 border-2 border-gray-200 rounded-xl sm:rounded-2xl text-gray-700 text-base sm:text-lg font-semibold hover:bg-gray-50 hover:border-gray-300 transition-all"
                >
                  Continue Shopping
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Additional Product Information - Mobile optimized */}
        {(product.supplier || product.notes) && (
          <div className="mt-6 sm:mt-8 bg-white rounded-2xl sm:rounded-3xl shadow-sm border border-gray-100 p-4 sm:p-8">
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4 sm:mb-6">Additional Information</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
              {product.supplier && (
                <div>
                  <p className="text-sm text-gray-500 mb-1">Supplier</p>
                  <p className="text-gray-900 font-medium">{product.supplier}</p>
                </div>
              )}
              {product.unitOfMeasure && (
                <div>
                  <p className="text-sm text-gray-500 mb-1">Unit of Measure</p>
                  <p className="text-gray-900 font-medium">{product.unitOfMeasure}</p>
                </div>
              )}
            </div>
            {product.notes && (
              <div className="mt-4 sm:mt-6 pt-4 sm:pt-6 border-t border-gray-100">
                <p className="text-sm text-gray-500 mb-2">Notes</p>
                <p className="text-sm sm:text-base text-gray-600 leading-relaxed">{product.notes}</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Sign In Prompt Modal - Mobile optimized */}
      {showSignInPrompt && (
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4" style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}>
          <div className="bg-white rounded-xl sm:rounded-2xl max-w-md w-full p-4 sm:p-6 mx-4">
            <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-2 sm:mb-3">Sign In Required</h3>
            <p className="text-sm sm:text-base text-gray-600 mb-4 sm:mb-6">
              Please sign in to add items to your cart and complete your purchase.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => {
                  setShowSignInPrompt(false);
                  router.push(`/${resolvedParams.slug}?signin=true`);
                }}
                className="w-full py-3 rounded-xl text-white font-semibold transition-all"
                style={{ backgroundColor: primaryColor }}
              >
                Sign In
              </button>
              <button
                onClick={() => setShowSignInPrompt(false)}
                className="w-full py-3 border-2 border-gray-300 rounded-xl text-gray-700 font-semibold hover:bg-gray-50 transition-all"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
