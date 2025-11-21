"use client";
import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Plus, Minus, ShoppingCart, Heart, MapPin, Tag, Package, Star, Share2, Check } from "lucide-react";
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
  const [shareSuccess, setShareSuccess] = useState(false);
  
  // Add wishlist states
  const [addingToWishlist, setAddingToWishlist] = useState(false);
  const [checkingWishlist, setCheckingWishlist] = useState(false);

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
          // Update favicon and metadata when product is loaded
          updateProductFavicon(data.product.image);
          updateProductMetadata(data.product);
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

  // Update favicon for product
  const updateProductFavicon = (productImage) => {
    if (!productImage) return;
    
    // Remove existing favicon
    const existingFavicon = document.querySelector("link[rel*='icon']");
    if (existingFavicon) {
      existingFavicon.remove();
    }
    
    // Add new favicon with product image
    const link = document.createElement('link');
    link.rel = 'icon';
    link.href = productImage;
    document.head.appendChild(link);
  };

  // Update metadata for product
  const updateProductMetadata = (product) => {
    if (!product) return;
    
    const storeName = currentStore?.storeName || 'Store';
    const title = `${product.productName} - ${storeName}`;
    const description = product.description 
      ? `${product.description.substring(0, 155)}...` 
      : `Buy ${product.productName} at ${storeName}. Category: ${product.category}. Price: ${formatPrice(product.sellingPrice)}`;
    const keywords = [
      product.productName,
      product.category,
      product.brand,
      storeName,
      'buy online',
      'shop'
    ].filter(Boolean).join(', ');
    
    // Update document title
    document.title = title;
    
    // Update or create meta tags
    updateMetaTag('description', description);
    updateMetaTag('keywords', keywords);
    
    // Update Open Graph tags for social sharing
    updateMetaTag('og:title', title, 'property');
    updateMetaTag('og:description', description, 'property');
    updateMetaTag('og:type', 'product', 'property');
    if (product.image) {
      updateMetaTag('og:image', product.image, 'property');
    }
    updateMetaTag('og:url', window.location.href, 'property');
    
    // Product-specific Open Graph tags
    updateMetaTag('product:price:amount', product.sellingPrice.toString(), 'property');
    updateMetaTag('product:price:currency', currentStore?.settings?.currency || 'NGN', 'property');
    if (product.quantityInStock > 0) {
      updateMetaTag('product:availability', 'in stock', 'property');
    } else {
      updateMetaTag('product:availability', 'out of stock', 'property');
    }
    updateMetaTag('product:category', product.category, 'property');
    if (product.brand) {
      updateMetaTag('product:brand', product.brand, 'property');
    }
    
    // Update Twitter Card tags
    updateMetaTag('twitter:card', 'summary_large_image');
    updateMetaTag('twitter:title', title);
    updateMetaTag('twitter:description', description);
    if (product.image) {
      updateMetaTag('twitter:image', product.image);
    }
    
    // Add structured data (JSON-LD) for rich snippets
    addStructuredData(product, storeName);
  };

  const updateMetaTag = (name, content, attribute = 'name') => {
    let element = document.querySelector(`meta[${attribute}="${name}"]`);
    if (!element) {
      element = document.createElement('meta');
      element.setAttribute(attribute, name);
      document.head.appendChild(element);
    }
    element.setAttribute('content', content);
  };

  // Add structured data for SEO
  const addStructuredData = (product, storeName) => {
    // Remove existing structured data
    const existingScript = document.querySelector('script[type="application/ld+json"]');
    if (existingScript) {
      existingScript.remove();
    }
    
    const structuredData = {
      "@context": "https://schema.org/",
      "@type": "Product",
      "name": product.productName,
      "image": product.image || '',
      "description": product.description || `${product.productName} available at ${storeName}`,
      "sku": product.sku,
      "brand": {
        "@type": "Brand",
        "name": product.brand || storeName
      },
      "offers": {
        "@type": "Offer",
        "url": window.location.href,
        "priceCurrency": currentStore?.settings?.currency || 'NGN',
        "price": product.sellingPrice,
        "availability": product.quantityInStock > 0 
          ? "https://schema.org/InStock" 
          : "https://schema.org/OutOfStock",
        "seller": {
          "@type": "Organization",
          "name": storeName
        }
      }
    };
    
    if (product.category) {
      structuredData.category = product.category;
    }
    
    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.text = JSON.stringify(structuredData);
    document.head.appendChild(script);
  };

  // Check if item is in user's wishlist when component mounts
  useEffect(() => {
    const checkWishlistStatus = async () => {
      if (!isAuthenticated || !product?._id) return;
      
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
  }, [isAuthenticated, product?._id]);

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

  // Update handleShare function to include store slug
  const handleShare = async () => {
    const productUrl = `${window.location.origin}/${resolvedParams.slug}/product/${product._id}`;
    
    try {
      // Try using the Web Share API first (mobile devices)
      if (navigator.share) {
        await navigator.share({
          title: product.productName,
          text: `Check out ${product.productName} at ${currentStore?.storeName}`,
          url: productUrl,
        });
      } else {
        // Fallback to clipboard
        await navigator.clipboard.writeText(productUrl);
        setShareSuccess(true);
        
        // Reset success state after 2 seconds
        setTimeout(() => {
          setShareSuccess(false);
        }, 2000);
      }
    } catch (error) {
      // If clipboard API fails, create a temporary textarea
      const textArea = document.createElement('textarea');
      textArea.value = productUrl;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      textArea.style.top = '-999999px';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      
      try {
        document.execCommand('copy');
        setShareSuccess(true);
        setTimeout(() => {
          setShareSuccess(false);
        }, 2000);
      } catch (err) {
        console.error('Failed to copy link:', err);
      } finally {
        document.body.removeChild(textArea);
      }
    }
  };

  // Add proper wishlist toggle handler
  const handleWishlistToggle = async () => {
    if (!isAuthenticated) {
      // Redirect to sign in with current product page as redirect
      router.push(`/${resolvedParams.slug}?signin=true`);
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

                {/* Wishlist and Share Buttons - Updated with proper wishlist handling */}
                <div className="absolute top-3 sm:top-6 right-3 sm:right-6 flex gap-2">
                  {/* Share Button */}
                  <button
                    onClick={handleShare}
                    className="w-10 h-10 sm:w-14 sm:h-14 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center shadow-lg hover:scale-110 hover:bg-white transition-all"
                    title="Share product"
                  >
                    {shareSuccess ? (
                      <Check 
                        className="w-5 h-5 sm:w-6 sm:h-6 text-green-600"
                      />
                    ) : (
                      <Share2 
                        className="w-5 h-5 sm:w-6 sm:h-6 text-gray-600"
                      />
                    )}
                  </button>

                  {/* Wishlist Button - Updated with proper functionality */}
                  <button
                    onClick={handleWishlistToggle}
                    disabled={addingToWishlist || checkingWishlist}
                    className="w-10 h-10 sm:w-14 sm:h-14 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center shadow-lg hover:scale-110 hover:bg-white transition-all disabled:opacity-50"
                    title={isAuthenticated ? (liked ? "Remove from wishlist" : "Add to wishlist") : "Sign in to add to wishlist"}
                  >
                    {addingToWishlist || checkingWishlist ? (
                      <div className="w-4 h-4 sm:w-5 sm:h-5 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Heart 
                        className={`w-5 h-5 sm:w-6 sm:h-6 transition-all duration-200 ${liked ? 'fill-current scale-110' : ''}`}
                        style={liked ? { color: primaryColor } : { color: '#6B7280' }}
                        strokeWidth={liked ? 0 : 2}
                        fill={liked ? primaryColor : 'none'}
                      />
                    )}
                  </button>
                </div>
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

      {/* Success Toast for Share - Mobile optimized */}
      {shareSuccess && (
        <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-50 bg-green-600 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2 animate-fade-in">
          <Check className="w-4 h-4" />
          <span className="text-sm font-medium">Link copied to clipboard!</span>
        </div>
      )}

      <style jsx>{`
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translate(-50%, -10px);
          }
          to {
            opacity: 1;
            transform: translate(-50%, 0);
          }
        }
        .animate-fade-in {
          animation: fade-in 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}
