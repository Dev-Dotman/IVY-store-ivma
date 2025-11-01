"use client";
import { useState, useEffect, useMemo } from "react";
import StoreHeader from "./store/StoreHeader";
import StoreFooter from "./store/StoreFooter";
import ProductCard from "./store/ProductCard";
import ProductCardMobile from "./store/ProductCardMobile";
import CategoryFilterModal from "./store/CategoryFilterModal";
import PriceFilterModal from "./store/PriceFilterModal";
import AvailabilityFilterModal from "./store/AvailabilityFilterModal";
import MobileFilterDropdown from "./ui/MobileFilterDropdown";
import { ChevronDown } from "lucide-react";
import { useCart } from "@/contexts/CartContext";
import useStoreStore from "@/stores/storeStore";

export default function StoreWebsite({ store }) {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  
  // Filter states
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedPrice, setSelectedPrice] = useState("all");
  const [selectedAvailability, setSelectedAvailability] = useState("all");
  
  // Modal states
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showPriceModal, setShowPriceModal] = useState(false);
  const [showAvailabilityModal, setShowAvailabilityModal] = useState(false);

  const { addToCart } = useCart();

  // Set store in Zustand
  const { setStore } = useStoreStore();

  // Get branding colors from store or use defaults
  const primaryColor = store.branding?.primaryColor || "#0D9488";
  const secondaryColor = store.branding?.secondaryColor || "#F3F4F6";

  // Screen size detection function
  const detectScreenSize = () => {
    if (typeof window !== 'undefined') {
      return window.innerWidth < 768; // 768px is the md breakpoint in Tailwind
    }
    return false;
  };

  // Screen size detection effect
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(detectScreenSize());
    };

    // Set initial value
    setIsMobile(detectScreenSize());

    // Add event listener
    window.addEventListener('resize', handleResize);

    // Cleanup
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Fetch inventory products
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/stores/${store._id}/products`);
        const data = await response.json();

        if (data.success) {
          setProducts(data.data);
        }
      } catch (error) {
        console.error("Error fetching products:", error);
      } finally {
        setLoading(false);
      }
    };

    if (store._id) {
      fetchProducts();
    }
  }, [store._id]);

  // Set store in Zustand when component mounts
  useEffect(() => {
    if (store) {
      setStore(store);
    }
  }, [store, setStore]);

  // Get unique categories from products
  const categoryOptions = useMemo(() => {
    const categories = [...new Set(products.map((p) => p.category))];
    return [
      { value: "all", label: "All Categories" },
      ...categories.map((cat) => ({ value: cat, label: cat })),
    ];
  }, [products]);

  // Price range options
  const priceOptions = [
    { value: "all", label: "All Prices" },
    { value: "0-5000", label: "Under ₦5,000" },
    { value: "5000-20000", label: "₦5,000 - ₦20,000" },
    { value: "20000-50000", label: "₦20,000 - ₦50,000" },
    { value: "50000+", label: "Above ₦50,000" },
  ];

  // Availability options
  const availabilityOptions = [
    { value: "all", label: "All Products" },
    { value: "in-stock", label: "In Stock" },
    { value: "low-stock", label: "Low Stock" },
    { value: "out-of-stock", label: "Out of Stock" },
  ];

  // Filter products
  const filteredProducts = useMemo(() => {
    let filtered = [...products];

    // Filter by category
    if (selectedCategory !== "all") {
      filtered = filtered.filter((p) => p.category === selectedCategory);
    }

    // Filter by price
    if (selectedPrice !== "all") {
      const [min, max] = selectedPrice.split("-").map((v) => v.replace("+", ""));
      filtered = filtered.filter((p) => {
        if (max) {
          return p.sellingPrice >= Number(min) && p.sellingPrice <= Number(max);
        } else {
          return p.sellingPrice >= Number(min);
        }
      });
    }

    // Filter by availability
    if (selectedAvailability !== "all") {
      filtered = filtered.filter((p) => {
        if (selectedAvailability === "in-stock") {
          return p.quantityInStock > p.reorderLevel;
        } else if (selectedAvailability === "low-stock") {
          return p.quantityInStock > 0 && p.quantityInStock <= p.reorderLevel;
        } else if (selectedAvailability === "out-of-stock") {
          return p.quantityInStock === 0;
        }
        return true;
      });
    }

    return filtered;
  }, [products, selectedCategory, selectedPrice, selectedAvailability]);

  // Get current filter labels
  const getCategoryLabel = () => {
    const option = categoryOptions.find(c => c.value === selectedCategory);
    return option?.label || "Category";
  };

  const getPriceLabel = () => {
    const option = priceOptions.find(p => p.value === selectedPrice);
    return option?.label || "Price";
  };

  const getAvailabilityLabel = () => {
    const option = availabilityOptions.find(a => a.value === selectedAvailability);
    return option?.label || "Availability";
  };

  return (
    <div className="min-h-screen bg-white relative">
      {/* Subtle Background Shapes */}
      {!isMobile && ( <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full opacity-20 blur-3xl" style={{ backgroundColor: primaryColor }} />
        <div className="absolute -bottom-32 -left-32 w-80 h-80 rounded-full opacity-20 blur-3xl" style={{ backgroundColor: primaryColor }} />
        <div className="absolute top-20 left-20 w-64 h-64 rounded-full opacity-15 blur-2xl" style={{ backgroundColor: secondaryColor }} />
        <div className="absolute top-1/2 -right-20 w-56 h-56 rounded-full opacity-15 blur-2xl" style={{ backgroundColor: primaryColor }} />
        <div className="absolute bottom-40 right-1/4 w-40 h-40 rounded-full opacity-10 blur-xl" style={{ backgroundColor: secondaryColor }} />
        <div className="absolute top-1/3 left-1/4 w-48 h-48 rounded-full opacity-10 blur-xl" style={{ backgroundColor: primaryColor }} />
      </div> )}

      <StoreHeader store={store} />

      <main className="max-w-7xl mx-auto px-6 lg:px-8 py-8 relative z-10 min-h-screen">
        {/* Mobile Store Banner - Only visible on mobile */}
        {isMobile && (
          <div className="mb-6 -mx-6 relative rounded-xl overflow-hidden rounded-none">
            {/* Banner Background */}
            <div 
              className="h-32 relative"
              style={{
                backgroundImage: store.branding?.banner 
                  ? `url(${store.branding.banner})` 
                  : `linear-gradient(135deg, ${primaryColor}20, ${primaryColor}40)`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                backgroundColor: store.branding?.banner ? 'transparent' : `${primaryColor}10`
              }}
            >
              {/* Semi-transparent blur overlay */}
              <div 
                className="absolute inset-0 backdrop-blur-sm"
                style={{ 
                  backgroundColor: `${primaryColor}20`,
                  backdropFilter: 'blur(8px) saturate(120%)'
                }}
              />
              
              {/* Store Info Overlay */}
              <div className="absolute inset-0 flex flex-col justify-center px-6">
                <div className="flex items-center gap-3 mb-2">
                  {store.branding?.logo && (
                    <img 
                      src={store.branding.logo} 
                      alt={store.storeName} 
                      className="h-8 w-auto object-contain bg-white/20 backdrop-blur-sm rounded-lg p-1" 
                    />
                  )}
                  <h1 className="text-xl font-bold text-white drop-shadow-lg">
                    Welcome to {store.storeName}
                  </h1>
                </div>
                
                {store.storeDescription && (
                  <p className="text-white/90 text-sm leading-relaxed drop-shadow-md line-clamp-2">
                    {store.storeDescription}
                  </p>
                )}
                
                {/* Store Type Badge */}
                <div className="mt-2">
                  <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-white/20 backdrop-blur-sm text-white border border-white/30">
                    {store.storeType === 'physical' ? '🏪 Physical Store' : '🌐 Online Store'}
                  </span>
                </div>
              </div>
              
              {/* Decorative gradient overlay */}
              <div 
                className="absolute inset-0 opacity-30"
                style={{
                  background: `linear-gradient(45deg, ${primaryColor}60, transparent 70%)`
                }}
              />
            </div>
          </div>
        )}

        {/* Filters Bar */}
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 mb-8">
          {/* Mobile Filter Dropdown - Only visible on mobile */}
          {isMobile && ( <div className="w-full sm:hidden">
            <MobileFilterDropdown
              categoryOptions={categoryOptions}
              priceOptions={priceOptions}
              availabilityOptions={availabilityOptions}
              selectedCategory={selectedCategory}
              selectedPrice={selectedPrice}
              selectedAvailability={selectedAvailability}
              onCategorySelect={setSelectedCategory}
              onPriceSelect={setSelectedPrice}
              onAvailabilitySelect={setSelectedAvailability}
              // Add modal trigger functions
              onCategoryModalOpen={() => setShowCategoryModal(true)}
              onPriceModalOpen={() => setShowPriceModal(true)}
              onAvailabilityModalOpen={() => setShowAvailabilityModal(true)}
              primaryColor={primaryColor}
              secondaryColor={secondaryColor}
            />
          </div>)}

          {/* Desktop Filter Buttons - Hidden on mobile */}
          { !isMobile && ( <div className="flex flex-wrap gap-2">
            <button 
              onClick={() => {
                console.log('Opening category modal');
                setShowCategoryModal(true);
              }}
              className="px-4 py-2 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:opacity-90 transition-colors flex items-center gap-2"
              style={{ backgroundColor: secondaryColor }}
            >
              {getCategoryLabel()}
              <ChevronDown className="w-4 h-4" />
            </button>
            <button 
              onClick={() => {
                console.log('Opening price modal');
                setShowPriceModal(true);
              }}
              className="px-4 py-2 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:opacity-90 transition-colors flex items-center gap-2"
              style={{ backgroundColor: secondaryColor }}
            >
              {getPriceLabel()}
              <ChevronDown className="w-4 h-4" />
            </button>
            <button 
              onClick={() => {
                console.log('Opening availability modal');
                setShowAvailabilityModal(true);
              }}
              className="px-4 py-2 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:opacity-90 transition-colors flex items-center gap-2"
              style={{ backgroundColor: secondaryColor }}
            >
              {getAvailabilityLabel()}
              <ChevronDown className="w-4 h-4" />
            </button>
          </div>)}
        </div>

        {/* Products Section */}
        <div>
          <div className="flex items-center justify-between mb-6 ">
            <h3 className="text-2xl font-semibold text-gray-900">
              {isMobile ? 'Products' : ''}
            </h3>
            <span className="text-sm text-gray-600">
              {filteredProducts.length} {filteredProducts.length === 1 ? 'product' : 'products'}
            </span>
          </div>

          {loading ? (
            <div className="text-center py-20">
              <div
                className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-gray-200"
                style={{ borderTopColor: primaryColor }}
              ></div>
              <p className="mt-4 text-sm text-gray-600">Loading products...</p>
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="text-center py-20">
              <div className="text-8xl mb-4">📦</div>
              <h4 className="text-xl font-semibold text-gray-900 mb-2">
                No Products Found
              </h4>
              <p className="text-sm text-gray-600">
                Try adjusting your filters to see more products
              </p>
            </div>
          ) : (
            <div className={`grid ${
              isMobile 
                ? 'grid-cols-2 gap-3' 
                : 'grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8 '
            }`}>
              {filteredProducts.map((product) => (
                isMobile ? (
                  <ProductCardMobile
                    key={product._id}
                    product={product}
                    primaryColor={primaryColor}
                    secondaryColor={secondaryColor}
                    currency={store.settings?.currency || "NGN"}
                  />
                ) : (
                  <ProductCard
                    key={product._id}
                    product={product}
                    primaryColor={primaryColor}
                    secondaryColor={secondaryColor}
                    currency={store.settings?.currency || "NGN"}
                  />
                )
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Store Footer */}
      <StoreFooter />

      {/* Filter Modals - Outside main to avoid z-index stacking context issues */}
      {/* Debug: Modal States */}
      {/* <div className="fixed bottom-4 right-4 bg-white p-4 rounded-lg shadow-lg text-xs z-[10000] border border-gray-300">
        <div className="font-bold mb-2">🐛 Modal Debug</div>
        <div>Category: {showCategoryModal ? '✅ OPEN' : '❌ CLOSED'}</div>
        <div>Price: {showPriceModal ? '✅ OPEN' : '❌ CLOSED'}</div>
        <div>Availability: {showAvailabilityModal ? '✅ OPEN' : '❌ CLOSED'}</div>
      </div> */}

      <CategoryFilterModal
        isOpen={showCategoryModal}
        onClose={() => setShowCategoryModal(false)}
        categories={categoryOptions}
        selectedCategory={selectedCategory}
        onSelect={setSelectedCategory}
      />

      <PriceFilterModal
        isOpen={showPriceModal}
        onClose={() => setShowPriceModal(false)}
        priceRanges={priceOptions}
        selectedPrice={selectedPrice}
        onSelect={setSelectedPrice}
      />

      <AvailabilityFilterModal
        isOpen={showAvailabilityModal}
        onClose={() => setShowAvailabilityModal(false)}
        availabilityOptions={availabilityOptions}
        selectedAvailability={selectedAvailability}
        onSelect={setSelectedAvailability}
      />
    </div>
  );
}
