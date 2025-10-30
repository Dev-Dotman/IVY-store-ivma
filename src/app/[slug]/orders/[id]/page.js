"use client";
import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle, Package, ShoppingBag, ArrowLeft, MapPin, Phone, Calendar, MessageCircle, Clock, X } from "lucide-react";
import useStoreStore from "@/stores/storeStore";
import { useAuth } from "@/contexts/AuthContext";
import WhatsAppContactModal from "@/components/orders/WhatsAppContactModal";
import StoreSocialsModal from "@/components/orders/StoreSocialsModal";

export default function StoreOrderDetailsPage({ params }) {
  const router = useRouter();
  const resolvedParams = use(params);
  const { customer } = useAuth();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showWhatsAppModal, setShowWhatsAppModal] = useState(false);
  const [showStoreSocialsModal, setShowStoreSocialsModal] = useState(false);
  const [selectedStore, setSelectedStore] = useState(null);

  // Get store from Zustand store
  const { currentStore, fetchStore } = useStoreStore();

  // Fetch store if not loaded
  useEffect(() => {
    if (resolvedParams.slug && (!currentStore || currentStore.ivmaWebsite?.websitePath !== resolvedParams.slug)) {
      fetchStore(resolvedParams.slug);
    }
  }, [resolvedParams.slug, currentStore, fetchStore]);

  // Fetch order data
  useEffect(() => {
    const fetchOrder = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/orders/${resolvedParams.id}`, {
          credentials: 'include'
        });
        const data = await response.json();

        if (response.ok && data.success) {
          setOrder(data.order);
        } else {
          setError(data.message || 'Order not found');
        }
      } catch (error) {
        console.error("Error fetching order:", error);
        setError('Failed to load order details');
      } finally {
        setLoading(false);
      }
    };

    if (resolvedParams.id) {
      fetchOrder();
    }
  }, [resolvedParams.id]);

  // Show WhatsApp modal for pending orders
  useEffect(() => {
    if (order && order.status === 'pending' && order.stores?.length > 0) {
      // Show modal after a short delay
      const timer = setTimeout(() => {
        setShowWhatsAppModal(true);
      }, 1000);
      
      return () => clearTimeout(timer);
    }
  }, [order]);

  // Store colors with fallbacks
  const primaryColor = currentStore?.branding?.primaryColor || '#0D9488';
  const secondaryColor = currentStore?.branding?.secondaryColor || '#F3F4F6';
  const currency = currentStore?.settings?.currency || 'NGN';

  const formatWhatsAppMessage = (storeName, orderNumber, customerName, itemCount) => {
    return encodeURIComponent(
      `Hi ${storeName}! 👋\n\n` +
      `I placed an order through your IVMA store and would like to confirm the details:\n\n` +
      `📦 Order #${orderNumber}\n` +
      `👤 Customer: ${customerName}\n` +
      `📋 Items: ${itemCount} ${itemCount === 1 ? 'item' : 'items'}\n\n` +
      `Could you please confirm my order and let me know:\n` +
      `• Order status and estimated preparation time\n` +
      `• Delivery/pickup details\n` +
      `• Any special instructions\n\n` +
      `Thank you! 😊`
    );
  };

  const openWhatsApp = (storePhone, storeName, itemCount) => {
    console.log('Opening WhatsApp with:', { storePhone, storeName, itemCount });
    
    if (!storePhone) {
      alert(`Sorry, ${storeName} doesn't have a WhatsApp number available.`);
      return;
    }

    // Clean and format phone number
    const cleanPhone = storePhone.replace(/\s/g, '').replace(/^0/, '234');
    const formattedPhone = cleanPhone.startsWith('+') ? cleanPhone.substring(1) : cleanPhone;
    
    console.log('Formatted phone:', formattedPhone);
    
    const customerName = `${customer?.firstName || ''} ${customer?.lastName || ''}`.trim();
    const message = formatWhatsAppMessage(storeName, order?.orderNumber, customerName, itemCount);
    
    // Open WhatsApp
    const whatsappUrl = `https://wa.me/${formattedPhone}?text=${message}`;
    console.log('WhatsApp URL:', whatsappUrl);
    
    // Try to open in new window/tab
    const newWindow = window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
    
    // Fallback: if popup blocked, try direct navigation
    if (!newWindow || newWindow.closed || typeof newWindow.closed == 'undefined') {
      window.location.href = whatsappUrl;
    }
  };

  const handleMessageVendor = (storeGroup) => {
    setSelectedStore(storeGroup);
    setShowStoreSocialsModal(true);
  };

  const handleContactAllVendors = () => {
    setShowWhatsAppModal(true);
  };

  // Format price with currency
  const formatPrice = (price) => {
    if (currency === 'NGN') {
      return `₦${price?.toLocaleString()}`;
    }
    return `$${price?.toLocaleString()}`;
  };

  // Format date to readable string
  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Get status color class
  const getStatusColor = (status) => {
    const colors = {
      pending: 'bg-yellow-100 text-yellow-800',
      confirmed: 'bg-blue-100 text-blue-800',
      processing: 'bg-purple-100 text-purple-800',
      shipped: 'bg-indigo-100 text-indigo-800',
      delivered: 'bg-green-100 text-green-800',
      cancelled: 'bg-red-100 text-red-800',
      refunded: 'bg-gray-100 text-gray-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  if (loading || !currentStore) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div 
            className="animate-spin rounded-full h-16 w-16 border-4 border-gray-200 border-t-4 mb-4 mx-auto"
            style={{ borderTopColor: primaryColor }}
          ></div>
          <p className="text-gray-600">Loading order details...</p>
        </div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-md">
          <div className="text-8xl mb-4">📦</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">{error || 'Order Not Found'}</h2>
          <p className="text-gray-600 mb-6">
            We couldn't find the order you're looking for.
          </p>
          <button
            onClick={() => router.push(`/${resolvedParams.slug}`)}
            className="inline-flex items-center gap-2 px-6 py-3 text-white rounded-xl font-semibold hover:opacity-90 transition-opacity"
            style={{ backgroundColor: primaryColor }}
          >
            <ArrowLeft className="w-5 h-5" />
            Back to Store
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 lg:py-12">
      <div className="max-w-4xl mx-auto px-6">
        {/* Success Header with Store Colors */}
        <div className="text-center mb-8">
          <div 
            className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4"
            style={{ backgroundColor: `${primaryColor}20` }}
          >
            <CheckCircle className="w-12 h-12" style={{ color: primaryColor }} />
          </div>
          <h1 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-2">
            Order Details
          </h1>
          <p className="text-gray-600 text-lg">
            Thank you for shopping with {currentStore?.storeName || 'us'}
          </p>
        </div>

        {/* Order Number & Status Card */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6 mb-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
            <div>
              <p className="text-sm text-gray-500 mb-1">Order Number</p>
              <p className="text-2xl font-bold text-gray-900">{order.orderNumber}</p>
            </div>
            <div className="flex items-center gap-3">
              <span className={`px-4 py-2 rounded-full font-semibold text-sm ${getStatusColor(order.status)}`}>
                {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
              </span>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-gray-100">
            <div className="flex items-center gap-3">
              <Calendar className="w-5 h-5 text-gray-400" />
              <div>
                <p className="text-xs text-gray-500">Order Date</p>
                <p className="text-sm font-medium text-gray-900">
                  {formatDate(order.createdAt)}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Package className="w-5 h-5 text-gray-400" />
              <div>
                <p className="text-xs text-gray-500">Total Items</p>
                <p className="text-sm font-medium text-gray-900">{order.itemCount} items</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <ShoppingBag className="w-5 h-5 text-gray-400" />
              <div>
                <p className="text-xs text-gray-500">Total Amount</p>
                <p className="text-lg font-bold" style={{ color: primaryColor }}>
                  {formatPrice(order.totalAmount)}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Shipping Address */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <MapPin className="w-5 h-5" />
            Delivery Address
          </h2>
          <div className="bg-gray-50 rounded-xl p-4">
            <p className="font-semibold text-gray-900 mb-1">
              {order.shippingAddress.firstName} {order.shippingAddress.lastName}
            </p>
            <p className="text-gray-600 text-sm mb-2">
              {order.shippingAddress.city}, {order.shippingAddress.state}
            </p>
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Phone className="w-4 h-4" />
              <span>{order.shippingAddress.phone}</span>
            </div>
          </div>
        </div>

        {/* Store Groups - Enhanced with Store Socials Modal */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Orders Sent To:</h2>
          <div className="space-y-4">
            {order.stores?.map((storeGroup, idx) => (
              <div key={idx} className="border border-gray-200 rounded-xl p-4 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 text-lg">
                      {storeGroup.storeName}
                    </h3>
                    <p className="text-sm text-gray-500 mt-1">
                      {storeGroup.itemCount} {storeGroup.itemCount === 1 ? 'item' : 'items'}
                    </p>
                    
                    {/* Display available social media platforms */}
                    {storeGroup.storeSnapshot?.onlineStoreInfo?.socialMedia && (
                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-xs text-gray-400">Available on:</span>
                        <div className="flex gap-1">
                          {Object.entries(storeGroup.storeSnapshot.onlineStoreInfo.socialMedia)
                            .filter(([platform, handle]) => handle && handle.trim() !== '')
                            .slice(0, 3)
                            .map(([platform]) => (
                              <div key={platform} className="w-4 h-4 rounded bg-gray-200 flex items-center justify-center">
                                <span className="text-[8px] font-bold text-gray-600">
                                  {platform.charAt(0).toUpperCase()}
                                </span>
                              </div>
                            ))}
                          {Object.values(storeGroup.storeSnapshot.onlineStoreInfo.socialMedia)
                            .filter(handle => handle && handle.trim() !== '').length > 3 && (
                            <span className="text-xs text-gray-400">+more</span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-gray-900 mb-2">
                      {formatPrice(storeGroup.subtotal)}
                    </p>
                    <span className={`inline-block mb-3 px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(storeGroup.status)}`}>
                      {storeGroup.status}
                    </span>
                    
                    {/* Message Vendor Button - Now opens Store Socials Modal */}
                    <button
                      onClick={() => handleMessageVendor(storeGroup)}
                      className="flex items-center gap-2 px-4 py-2 text-white rounded-lg font-medium hover:opacity-90 transition-opacity text-sm"
                      style={{ backgroundColor: '#25D366' }}
                    >
                      <MessageCircle className="w-4 h-4" />
                      <span>Message Vendor</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Order Items */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Order Items</h2>
          <div className="space-y-4">
            {order.items?.map((item, idx) => (
              <div key={idx} className="flex gap-4 p-4 border border-gray-100 rounded-xl">
                <div className="w-20 h-20 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                  {item.productSnapshot?.image ? (
                    <img 
                      src={item.productSnapshot.image} 
                      alt={item.productSnapshot.productName}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-2xl">
                      📦
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold text-gray-900 mb-1">
                    {item.productSnapshot?.productName}
                  </h4>
                  <p className="text-sm text-gray-500 mb-2">
                    Quantity: {item.quantity} × {formatPrice(item.price)}
                  </p>
                  <p className="text-lg font-bold text-gray-900">
                    {formatPrice(item.subtotal)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Order Summary */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Order Summary</h2>
          <div className="space-y-3">
            <div className="flex justify-between text-gray-600">
              <span>Subtotal</span>
              <span className="font-semibold text-gray-900">{formatPrice(order.subtotal)}</span>
            </div>
            {order.discount > 0 && (
              <div className="flex justify-between text-gray-600">
                <span>Discount</span>
                <span className="font-semibold text-red-600">-{formatPrice(order.discount)}</span>
              </div>
            )}
            {order.shippingFee > 0 && (
              <div className="flex justify-between text-gray-600">
                <span>Shipping Fee</span>
                <span className="font-semibold text-gray-900">{formatPrice(order.shippingFee)}</span>
              </div>
            )}
            <div className="border-t border-gray-200 pt-3 flex justify-between">
              <span className="text-lg font-bold text-gray-900">Total</span>
              <span className="text-2xl font-bold" style={{ color: primaryColor }}>
                {formatPrice(order.totalAmount)}
              </span>
            </div>
          </div>
        </div>

        {/* Payment Information Card - Fixed */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Payment Information</h3>
          <div className="space-y-4">
            <div>
              <p className="text-sm text-gray-500">Payment Method</p>
              <p className="text-base font-medium text-gray-900">
                {order.paymentInfo?.method ? order.paymentInfo.method.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()) : 'Cash to Vendor'}
              </p>
            </div>
            {order.paymentInfo?.transactionId && (
              <div>
                <p className="text-sm text-gray-500">Transaction ID</p>
                <p className="text-base font-medium text-gray-900">{order.paymentInfo.transactionId}</p>
              </div>
            )}
            {order.paymentInfo?.reference && (
              <div>
                <p className="text-sm text-gray-500">Payment Reference</p>
                <p className="text-base font-medium text-gray-900">{order.paymentInfo.reference}</p>
              </div>
            )}
            <div>
              <p className="text-sm text-gray-500">Payment Status</p>
              <p className="text-base font-medium text-gray-900">
                {order.paymentInfo?.status ? 
                  order.paymentInfo.status.charAt(0).toUpperCase() + order.paymentInfo.status.slice(1) : 
                  'Pending'
                }
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons with Store Colors */}
        <div className="flex flex-col sm:flex-row gap-4">
          <button
            onClick={() => router.push(`/${resolvedParams.slug}`)}
            className="flex-1 py-4 border-2 border-gray-300 rounded-xl text-gray-700 font-semibold hover:bg-gray-50 transition-all flex items-center justify-center gap-2"
          >
            <ArrowLeft className="w-5 h-5" />
            Back to Store
          </button>
          
          {/* Contact All Vendors Button */}
          {order.stores?.length > 1 && (
            <button
              onClick={handleContactAllVendors}
              className="flex-1 py-4 text-white rounded-xl font-semibold hover:opacity-90 transition-all flex items-center justify-center gap-2"
              style={{ backgroundColor: '#25D366' }}
            >
              <MessageCircle className="w-5 h-5" />
              Contact All Vendors
            </button>
          )}
          
          <button
            onClick={() => router.push(`/${resolvedParams.slug}/orders`)}
            className="flex-1 py-4 text-white rounded-xl font-semibold hover:opacity-90 transition-all flex items-center justify-center gap-2"
            style={{ backgroundColor: primaryColor }}
          >
            <ShoppingBag className="w-5 h-5" />
            View All Orders
          </button>
        </div>

        {/* Additional Info */}
        <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-xl">
          <p className="text-sm text-blue-800">
            <strong>Note:</strong> You will receive order confirmations via WhatsApp from each store. 
            If you have any questions about your order, please contact the respective store directly using the message buttons above.
          </p>
        </div>
      </div>

      {/* WhatsApp Contact Modal for Multiple Vendors */}
      <WhatsAppContactModal
        isOpen={showWhatsAppModal}
        onClose={() => setShowWhatsAppModal(false)}
        order={order}
        primaryColor={primaryColor}
        formatPrice={formatPrice}
        openWhatsApp={openWhatsApp}
      />

      {/* Store Socials Modal for Individual Vendor */}
      <StoreSocialsModal
        isOpen={showStoreSocialsModal}
        onClose={() => {
          setShowStoreSocialsModal(false);
          setSelectedStore(null);
        }}
        store={selectedStore}
        orderNumber={order?.orderNumber}
        customerName={`${customer?.firstName || ''} ${customer?.lastName || ''}`.trim()}
        itemCount={selectedStore?.itemCount}
        primaryColor={primaryColor}
        formatPrice={formatPrice}
      />
    </div>
  );
}
