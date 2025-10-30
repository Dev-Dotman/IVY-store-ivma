"use client";
import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Trash2, Plus, Minus, ShoppingBag, Tag, CheckCircle, AlertCircle, MessageCircle, Phone, Store, Clock } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useCart } from "@/contexts/CartContext";
import CustomDropdown from "@/components/ui/CustomDropdown";
import useStoreStore from "@/stores/storeStore";
import WhatsAppContactModal from "@/components/orders/WhatsAppContactModal";

export default function StoreCartPage({ params }) {
  const router = useRouter();
  const store = router.state?.store;
  const resolvedParams = use(params);
  const { isAuthenticated, customer } = useAuth();
  const { cart, isLoading, removeFromCart, updateQuantity, getCartTotal, getCartCount, clearCart } = useCart();
  
  // Get store from Zustand store
  const { currentStore, fetchStore } = useStoreStore();
  
  // Cart functionality state
  const [couponCode, setCouponCode] = useState("");
  const [isApplyingCoupon, setIsApplyingCoupon] = useState(false);
  const [updatingItemId, setUpdatingItemId] = useState(null);
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);
  const [orderError, setOrderError] = useState(null);
  const [shippingAddress, setShippingAddress] = useState({
    phone: '',
    city: '',
    state: ''
  });
  const [isValidatingWhatsApp, setIsValidatingWhatsApp] = useState(false);
  const [whatsAppValidated, setWhatsAppValidated] = useState(false);
  
  // New state for WhatsApp contact modal
  const [showWhatsAppModal, setShowWhatsAppModal] = useState(false);
  const [orderStores, setOrderStores] = useState([]);
  const [orderNumber, setOrderNumber] = useState('');
  const [redirectingToWhatsApp, setRedirectingToWhatsApp] = useState(false);

  // Fetch store if not loaded
  useEffect(() => {
    if (resolvedParams.slug && (!currentStore || currentStore.ivmaWebsite?.websitePath !== resolvedParams.slug)) {
      fetchStore(resolvedParams.slug);
    }
  }, [resolvedParams.slug, currentStore, fetchStore]);

  // Nigerian states array
  const nigerianStates = [
    'Abia', 'Adamawa', 'Akwa Ibom', 'Anambra', 'Bauchi', 'Bayelsa', 'Benue', 'Borno',
    'Cross River', 'Delta', 'Ebonyi', 'Edo', 'Ekiti', 'Enugu', 'FCT', 'Gombe', 'Imo',
    'Jigawa', 'Kaduna', 'Kano', 'Katsina', 'Kebbi', 'Kogi', 'Kwara', 'Lagos', 'Nasarawa',
    'Niger', 'Ogun', 'Ondo', 'Osun', 'Oyo', 'Plateau', 'Rivers', 'Sokoto', 'Taraba',
    'Yobe', 'Zamfara'
  ];

  const stateOptions = nigerianStates.map(state => ({
    value: state,
    label: state
  }));

  // Redirect if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push(`/${resolvedParams.slug}`);
    }
  }, [isAuthenticated, isLoading, router, resolvedParams.slug]);

  // Store colors with fallbacks
  console.log('store; ', currentStore);
  const primaryColor = currentStore?.branding?.primaryColor || '#0D9488';
  const secondaryColor = currentStore?.branding?.secondaryColor || '#F3F4F6';
  const currency = currentStore?.settings?.currency || 'NGN';

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div 
            className="inline-block animate-spin rounded-full h-16 w-16 border-4 border-gray-200 border-t-4 mb-4"
            style={{ borderTopColor: primaryColor }}
          ></div>
          <p className="text-gray-600">Loading your cart...</p>
        </div>
      </div>
    );
  }

  if (!cart || cart.items?.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white border-b border-gray-100">
          <div className="max-w-7xl mx-auto px-6 lg:px-8 py-4">
            <button
              onClick={() => router.push(`/${resolvedParams.slug}`)}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              <span className="font-medium">Continue Shopping</span>
            </button>
          </div>
        </div>

        {/* Empty Cart */}
        <div className="max-w-7xl mx-auto px-6 lg:px-8 py-16">
          <div className="text-center max-w-md mx-auto">
            <div className="text-8xl mb-6">🛒</div>
            <h2 className="text-3xl font-bold text-gray-900 mb-3">Your Cart is Empty</h2>
            <p className="text-gray-600 mb-8">
              Looks like you haven't added anything to your cart yet. Start shopping to fill it up!
            </p>
            <button
              onClick={() => router.push(`/${resolvedParams.slug}`)}
              className="inline-flex items-center gap-2 px-8 py-4 text-white rounded-xl font-semibold hover:opacity-90 transition-opacity"
              style={{ backgroundColor: primaryColor }}
            >
              <ShoppingBag className="w-5 h-5" />
              Start Shopping
            </button>
          </div>
        </div>
      </div>
    );
  }

  const formatPrice = (price) => {
    if (currency === 'NGN') {
      return `₦${price?.toLocaleString()}`;
    }
    return `$${price?.toLocaleString()}`;
  };

  // ...existing handlers...
  const handleQuantityChange = async (productId, newQuantity) => {
    if (newQuantity < 1) return;
    
    setUpdatingItemId(productId);
    await updateQuantity(productId, newQuantity);
    setUpdatingItemId(null);
  };

  const handleRemoveItem = async (productId) => {
    if (confirm("Are you sure you want to remove this item from your cart?")) {
      await removeFromCart(productId);
    }
  };

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) return;
    
    setIsApplyingCoupon(true);
    setTimeout(() => {
      setIsApplyingCoupon(false);
      alert("Coupon functionality coming soon!");
    }, 1000);
  };

  const handleShippingAddressChange = (e) => {
    const { name, value } = e.target;
    setShippingAddress(prev => ({
      ...prev,
      [name]: value
    }));
    
    if (name === 'phone') {
      setWhatsAppValidated(false);
    }
  };

  const validateWhatsAppNumber = async () => {
    if (!shippingAddress.phone || shippingAddress.phone.trim() === '') {
      setOrderError('Please enter a phone number');
      return;
    }

    setIsValidatingWhatsApp(true);
    setOrderError(null);

    try {
      const formattedPhone = shippingAddress.phone.replace(/\s/g, '');
      const nigerianPhoneRegex = /^(\+234|0)[789]\d{9}$/;
      
      if (!nigerianPhoneRegex.test(formattedPhone)) {
        setOrderError('Please enter a valid Nigerian phone number (e.g., 08012345678 or +2348012345678)');
        setIsValidatingWhatsApp(false);
        return;
      }

      setWhatsAppValidated(true);
      setOrderError(null);
    } catch (error) {
      setOrderError('Failed to validate phone number');
    } finally {
      setIsValidatingWhatsApp(false);
    }
  };

  const handlePlaceOrder = () => {
    setShippingAddress({
      phone: customer?.phone || '',
      city: '',
      state: ''
    });
    setWhatsAppValidated(false);
    setShowOrderModal(true);
    setOrderError(null);
  };

  const formatWhatsAppMessage = (storeName, orderNumber, customerName, itemCount) => {
    return encodeURIComponent(
      `Hi ${storeName}! 👋\n\n` +
      `I just placed an order through your IVMA store:\n` +
      `Order #${orderNumber}\n` +
      `Customer: ${customerName}\n` +
      `Items: ${itemCount}\n\n` +
      `Please confirm my order and let me know the estimated delivery time. Thank you! 😊`
    );
  };

  const openWhatsApp = (storePhone, storeName, itemCount) => {
    if (!storePhone) {
      alert(`Sorry, ${storeName} doesn't have a WhatsApp number available.`);
      return;
    }

    // Clean and format phone number
    const cleanPhone = storePhone.replace(/\s/g, '').replace(/^0/, '234');
    const formattedPhone = cleanPhone.startsWith('+') ? cleanPhone.substring(1) : cleanPhone;
    
    const customerName = `${customer?.firstName || ''} ${customer?.lastName || ''}`.trim();
    const message = formatWhatsAppMessage(storeName, orderNumber, customerName, itemCount);
    
    // Open WhatsApp
    const whatsappUrl = `https://wa.me/${formattedPhone}?text=${message}`;
    window.open(whatsappUrl, '_blank');
  };

  const handleConfirmOrder = async () => {
    if (!shippingAddress.phone || !shippingAddress.city || !shippingAddress.state) {
      setOrderError('Please provide your phone number, city, and state');
      return;
    }

    if (!whatsAppValidated) {
      setOrderError('Please validate your WhatsApp number first');
      return;
    }

    setIsPlacingOrder(true);
    setOrderError(null);

    try {
      const response = await fetch("/api/orders/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: 'include',
        body: JSON.stringify({
          cartId: cart._id,
          shippingAddress: {
            firstName: customer.firstName,
            lastName: customer.lastName,
            phone: shippingAddress.phone,
            city: shippingAddress.city,
            state: shippingAddress.state,
            country: 'Nigeria'
          },
          customerNotes: ""
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        await clearCart();
        setShowOrderModal(false);
        
        // Set order data for WhatsApp contact
        setOrderNumber(data.order.orderNumber);
        setOrderStores(data.order.stores || []);
        
        // Check if single store or multiple stores
        const stores = data.order.stores || [];
        
        if (stores.length === 1) {
          // Single store - auto-redirect to WhatsApp
          const store = stores[0];
          if (store.storeSnapshot?.storePhone) {
            setRedirectingToWhatsApp(true);
            
            // Show brief loading then redirect
            setTimeout(() => {
              openWhatsApp(
                store.storeSnapshot.storePhone, 
                store.storeSnapshot.storeName || store.storeName,
                store.itemCount
              );
              setRedirectingToWhatsApp(false);
              
              // Navigate to order details after WhatsApp redirect
              setTimeout(() => {
                router.push(`/${resolvedParams.slug}/orders/${data.order._id}`);
              }, 2000);
            }, 1500);
          } else {
            // No phone number, go directly to order details
            router.push(`/${resolvedParams.slug}/orders/${data.order._id}`);
          }
        } else if (stores.length > 1) {
          // Multiple stores - show WhatsApp contact modal
          setShowWhatsAppModal(true);
        } else {
          // No stores (shouldn't happen), go to order details
          router.push(`/${resolvedParams.slug}/orders/${data.order._id}`);
        }
      } else {
        setOrderError(data.message || "Failed to place order");
      }
    } catch (error) {
      console.error("Error placing order:", error);
      setOrderError("An error occurred while placing your order. Please try again.");
    } finally {
      setIsPlacingOrder(false);
    }
  };

  const handleWhatsAppModalClose = () => {
    setShowWhatsAppModal(false);
    
    // Navigate to order details after closing modal
    if (orderNumber) {
      // Find the order ID from the stores data or use orderNumber to navigate
      router.push(`/${resolvedParams.slug}/orders`);
    }
  };

  // Group items by store
  const itemsByStore = cart.items?.reduce((acc, item) => {
    const storeId = item.store?._id || item.store;
    if (!acc[storeId]) {
      acc[storeId] = {
        store: item.store,
        storeSnapshot: item.storeSnapshot,
        items: []
      };
    }
    acc[storeId].items.push(item);
    return acc;
  }, {}) || {};

  const storeGroups = Object.values(itemsByStore);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header with Store Branding */}
      <div className="bg-white border-b border-gray-100 sticky top-0 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push(`/${resolvedParams.slug}`)}
                className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors group"
              >
                <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
                <span className="font-medium">{store?.storeName || 'Store'}</span>
              </button>
              <span className="text-gray-300">›</span>
              <span className="font-medium text-gray-900">Cart</span>
            </div>
            <div className="flex items-center gap-2">
              <ShoppingBag className="w-5 h-5 text-gray-600" />
              <span className="font-semibold text-gray-900">{getCartCount()} Items</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">YOUR CART</h1>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Cart Items */}
          <div className="lg:col-span-2 space-y-6">
            {storeGroups.map((storeGroup, idx) => (
              <div key={idx} className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                {storeGroup.storeSnapshot && (
                  <div 
                    className="px-6 py-3 border-b border-gray-100"
                    style={{ backgroundColor: `${primaryColor}10` }}
                  >
                    <p className="font-semibold text-gray-900">
                      From: {storeGroup.storeSnapshot.storeName}
                    </p>
                  </div>
                )}

                <div className="divide-y divide-gray-100">
                  {storeGroup.items.map((item) => (
                    <div key={item._id} className="p-6">
                      <div className="flex gap-4">
                        <div className="flex-shrink-0">
                          <div className="w-32 h-32 rounded-xl overflow-hidden" style={{ backgroundColor: secondaryColor }}>
                            {item.productSnapshot?.image ? (
                              <img
                                src={item.productSnapshot.image}
                                alt={item.productSnapshot?.productName}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-4xl">
                                📦
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="flex-1 min-w-0">
                          {/* ...existing item details... */}
                          <div className="flex items-start justify-between gap-4 mb-2">
                            <div>
                              <h3 className="text-lg font-semibold text-gray-900 mb-1">
                                {item.productSnapshot?.productName}
                              </h3>
                              {item.productSnapshot?.category && (
                                <p className="text-sm text-gray-500">
                                  Category: {item.productSnapshot.category}
                                </p>
                              )}
                              {item.productSnapshot?.sku && (
                                <p className="text-xs text-gray-400 mt-1">
                                  SKU: {item.productSnapshot.sku}
                                </p>
                              )}
                            </div>
                            <button
                              onClick={() => handleRemoveItem(item.product._id || item.product)}
                              className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                              title="Remove item"
                            >
                              <Trash2 className="w-5 h-5" />
                            </button>
                          </div>

                          <p className="text-2xl font-bold mb-4" style={{ color: primaryColor }}>
                            {formatPrice(item.price)}
                          </p>

                          <div className="flex items-center gap-4">
                            <div className="flex items-center border border-gray-300 rounded-xl overflow-hidden">
                              <button
                                onClick={() => handleQuantityChange(item.product._id || item.product, item.quantity - 1)}
                                disabled={item.quantity <= 1 || updatingItemId === (item.product._id || item.product)}
                                className="px-4 py-2 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                              >
                                <Minus className="w-4 h-4 text-gray-600" />
                              </button>
                              <span className="px-6 py-2 font-semibold text-gray-900 min-w-[60px] text-center">
                                {item.quantity}
                              </span>
                              <button
                                onClick={() => handleQuantityChange(item.product._id || item.product, item.quantity + 1)}
                                disabled={updatingItemId === (item.product._id || item.product)}
                                className="px-4 py-2 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                              >
                                <Plus className="w-4 h-4 text-gray-600" />
                              </button>
                            </div>

                            {updatingItemId === (item.product._id || item.product) && (
                              <span className="text-sm text-gray-500">Updating...</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Order Summary with Store Colors */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden sticky top-24">
              <div className="p-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Order Summary</h2>

                {/* ...existing summary with store color theming... */}
                <div className="space-y-4 mb-6">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Subtotal</span>
                    <span className="text-lg font-semibold text-gray-900">
                      {formatPrice(cart.subtotal || 0)}
                    </span>
                  </div>

                  {cart.discount > 0 && (
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Discount</span>
                      <span className="text-lg font-semibold text-red-600">
                        -{formatPrice(cart.discount)}
                      </span>
                    </div>
                  )}

                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Delivery Fee</span>
                    <span className="text-lg font-semibold text-gray-900">
                      {formatPrice(cart.shipping || 0)}
                    </span>
                  </div>

                  <div className="border-t border-gray-200 pt-4">
                    <div className="flex items-center justify-between">
                      <span className="text-lg font-semibold text-gray-900">Total</span>
                      <span className="text-2xl font-bold" style={{ color: primaryColor }}>
                        {formatPrice(cart.total || 0)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Promo Code */}
                <div className="mb-6">
                  <div className="flex gap-2">
                    <div className="flex-1 relative">
                      <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="text"
                        value={couponCode}
                        onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                        placeholder="Add promo code"
                        className="w-full pl-10 pr-3 py-3 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 text-gray-900"
                        style={{ '--tw-ring-color': primaryColor }}
                      />
                    </div>
                    <button
                      onClick={handleApplyCoupon}
                      disabled={isApplyingCoupon || !couponCode.trim()}
                      className="px-6 py-3 bg-gray-900 text-white rounded-xl font-semibold hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isApplyingCoupon ? "..." : "Apply"}
                    </button>
                  </div>
                </div>

                {/* Place Order Button */}
                <button
                  onClick={handlePlaceOrder}
                  className="w-full py-4 text-white rounded-xl font-semibold hover:opacity-90 transition-opacity flex items-center justify-center gap-2 text-lg"
                  style={{ backgroundColor: primaryColor }}
                >
                  <CheckCircle className="w-5 h-5" />
                  Place Order
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Order Confirmation Modal with Store Colors */}
      {showOrderModal && (
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4" style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}>
          <div className="bg-white rounded-2xl max-w-md max-h-[95vh] w-full overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div 
              className="text-center p-6 flex-shrink-0"
              style={{ backgroundColor: `${primaryColor}10` }}
            >
              <div 
                className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
                style={{ backgroundColor: `${primaryColor}20` }}
              >
                <ShoppingBag className="w-8 h-8" style={{ color: primaryColor }} />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">Complete Your Order</h3>
              <p className="text-gray-600">
                Provide delivery details to proceed
              </p>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-6">
              {/* ...existing form content with store colors... */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Customer Name
                  </label>
                  <input
                    type="text"
                    value={`${customer?.firstName} ${customer?.lastName}`}
                    disabled
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl text-gray-900"
                    style={{ backgroundColor: secondaryColor }}
                  />
                </div>

                {/* WhatsApp validation */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    WhatsApp Phone Number *
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="tel"
                      name="phone"
                      value={shippingAddress.phone}
                      onChange={handleShippingAddressChange}
                      placeholder="08012345678 or +2348012345678"
                      disabled={whatsAppValidated}
                      className={`flex-1 px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 text-gray-900 ${
                        whatsAppValidated ? 'bg-green-50 border-green-300' : 'border-gray-300 bg-white'
                      }`}
                      style={{ '--tw-ring-color': primaryColor }}
                    />
                    {!whatsAppValidated ? (
                      <button
                        onClick={validateWhatsAppNumber}
                        disabled={isValidatingWhatsApp}
                        className="px-6 py-3 text-white rounded-xl font-medium hover:opacity-90 transition-opacity disabled:opacity-50 flex-shrink-0"
                        style={{ backgroundColor: primaryColor }}
                      >
                        {isValidatingWhatsApp ? 'Validating...' : 'Validate'}
                      </button>
                    ) : (
                      <div className="flex items-center px-4 bg-green-50 border border-green-300 rounded-xl flex-shrink-0">
                        <CheckCircle className="w-5 h-5 text-green-600" />
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    We'll send your order updates via WhatsApp
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    State *
                  </label>
                  <CustomDropdown
                    options={stateOptions}
                    value={shippingAddress.state}
                    onChange={(value) => handleShippingAddressChange({ 
                      target: { name: 'state', value } 
                    })}
                    placeholder="Select your state"
                    backgroundColor="#FFFFFF"
                    error={false}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    City *
                  </label>
                  <input
                    type="text"
                    name="city"
                    value={shippingAddress.city}
                    onChange={handleShippingAddressChange}
                    placeholder="Enter your city"
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 bg-white text-gray-900"
                    style={{ '--tw-ring-color': primaryColor }}
                  />
                </div>
              </div>

              {/* Order Summary */}
              <div className="bg-gray-50 rounded-xl p-4 mb-6 mt-6">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Total Items:</span>
                    <span className="font-semibold text-gray-900">{getCartCount()}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Stores:</span>
                    <span className="font-semibold text-gray-900">{storeGroups.length}</span>
                  </div>
                  <div className="border-t border-gray-200 my-2"></div>
                  <div className="flex justify-between">
                    <span className="font-semibold text-gray-900">Total Amount:</span>
                    <span className="text-xl font-bold" style={{ color: primaryColor }}>
                      {formatPrice(cart.total || 0)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Error Message */}
              {orderError && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4 flex items-start gap-2">
                  <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <p className="text-red-600 text-sm">{orderError}</p>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="p-6 border-t border-gray-100 flex-shrink-0">
              <div className="flex gap-3">
                <button
                  onClick={() => setShowOrderModal(false)}
                  disabled={isPlacingOrder}
                  className="flex-1 py-3 border-2 border-gray-300 rounded-xl text-gray-700 font-semibold hover:bg-gray-50 transition-all disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmOrder}
                  disabled={isPlacingOrder || !whatsAppValidated || !shippingAddress.city || !shippingAddress.state}
                  className="flex-1 py-3 text-white rounded-xl font-semibold hover:opacity-90 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                  style={{ backgroundColor: primaryColor }}
                >
                  {isPlacingOrder ? (
                    <>
                      <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Placing Order...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-5 h-5" />
                      Confirm Order
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* WhatsApp Auto-Redirect Modal */}
      {redirectingToWhatsApp && (
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4" style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}>
          <div className="bg-white rounded-2xl max-w-md w-full p-8 text-center">
            <div 
              className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6"
              style={{ backgroundColor: `${primaryColor}20` }}
            >
              <MessageCircle className="w-10 h-10" style={{ color: primaryColor }} />
            </div>
            
            <h3 className="text-2xl font-bold text-gray-900 mb-4">Order Placed Successfully! 🎉</h3>
            <p className="text-gray-600 mb-6">
              Redirecting you to WhatsApp to contact the store for faster order fulfillment...
            </p>
            
            <div className="flex items-center justify-center gap-3 text-sm text-gray-500">
              <div 
                className="w-4 h-4 border-2 border-t-transparent rounded-full animate-spin"
                style={{ borderColor: primaryColor, borderTopColor: 'transparent' }}
              ></div>
              <span>Opening WhatsApp...</span>
            </div>
          </div>
        </div>
      )}

      {/* WhatsApp Contact Modal for Multiple Stores */}
      {showWhatsAppModal && (
        <WhatsAppContactModal
          isOpen={showWhatsAppModal}
          onClose={handleWhatsAppModalClose}
          order={{ stores: orderStores, orderNumber }}
          primaryColor={primaryColor}
          formatPrice={formatPrice}
          openWhatsApp={openWhatsApp}
        />
      )}

      {/* ...existing other modals... */}
    </div>
  );
}
