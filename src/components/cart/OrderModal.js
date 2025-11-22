"use client";
import { useState, useEffect } from "react";
import { X, MapPin, Phone, User, Mail, Package, AlertCircle } from "lucide-react";

export default function OrderModal({ 
  isOpen, 
  onClose, 
  onConfirm, 
  cartItems, 
  totalAmount,
  primaryColor 
}) {
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    deliveryAddress: {
      street: "",
      city: "",
      state: "",
      postalCode: "",
    },
    notes: "",
  });
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Lock body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      // Set CSS variable for dynamic viewport height
      const setVH = () => {
        const vh = window.innerHeight * 0.01;
        document.documentElement.style.setProperty('--vh', `${vh}px`);
      };
      
      setVH();
      window.addEventListener('resize', setVH);
      
      return () => {
        document.body.style.overflow = 'unset';
        window.removeEventListener('resize', setVH);
      };
    }
  }, [isOpen]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    if (name.startsWith("deliveryAddress.")) {
      const addressField = name.split(".")[1];
      setFormData((prev) => ({
        ...prev,
        deliveryAddress: {
          ...prev.deliveryAddress,
          [addressField]: value,
        },
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        [name]: value,
      }));
    }

    // Clear error when user starts typing
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.firstName.trim()) newErrors.firstName = "First name is required";
    if (!formData.lastName.trim()) newErrors.lastName = "Last name is required";
    if (!formData.email.trim()) {
      newErrors.email = "Email is required";
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = "Invalid email format";
    }
    if (!formData.phone.trim()) {
      newErrors.phone = "Phone number is required";
    } else if (!/^(\+234|0)[789]\d{9}$/.test(formData.phone.replace(/\s/g, ""))) {
      newErrors.phone = "Invalid Nigerian phone number";
    }
    if (!formData.deliveryAddress.street.trim())
      newErrors.street = "Street address is required";
    if (!formData.deliveryAddress.city.trim())
      newErrors.city = "City is required";
    if (!formData.deliveryAddress.state.trim())
      newErrors.state = "State is required";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      await onConfirm(formData);
    } catch (error) {
      console.error("Order submission error:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
      style={{ 
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        backdropFilter: 'blur(4px)'
      }}
      onClick={onClose}
    >
      {/* Modal Container - Mobile optimized with dynamic viewport height */}
      <div
        className="bg-white w-full sm:max-w-2xl sm:rounded-2xl shadow-2xl flex flex-col"
        style={{
          maxHeight: 'calc(var(--vh, 1vh) * 100)',
          height: 'auto',
          minHeight: '50vh'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Fixed Header */}
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-200 bg-white sm:rounded-t-2xl flex-shrink-0">
          <div className="flex items-center gap-3">
            <div 
              className="w-10 h-10 rounded-full flex items-center justify-center"
              style={{ backgroundColor: `${primaryColor}20` }}
            >
              <Package className="w-5 h-5" style={{ color: primaryColor }} />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-gray-900">
                Complete Your Order
              </h2>
              <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
                {cartItems?.length || 0} item{cartItems?.length !== 1 ? 's' : ''} • {totalAmount}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto overscroll-contain">
          <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4 sm:space-y-6">
            {/* Personal Information */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <User className="w-4 h-4 text-gray-500" />
                <h3 className="text-sm font-semibold text-gray-900">
                  Personal Information
                </h3>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                {/* First Name */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1.5">
                    First Name *
                  </label>
                  <input
                    type="text"
                    name="firstName"
                    value={formData.firstName}
                    onChange={handleChange}
                    disabled={isSubmitting}
                    className={`w-full px-3 py-2.5 text-sm border rounded-lg focus:ring-2 focus:ring-offset-0 transition-colors disabled:opacity-50 ${
                      errors.firstName
                        ? "border-red-300 focus:ring-red-500"
                        : "border-gray-300 focus:ring-emerald-500"
                    }`}
                    placeholder="John"
                  />
                  {errors.firstName && (
                    <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      {errors.firstName}
                    </p>
                  )}
                </div>

                {/* Last Name */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1.5">
                    Last Name *
                  </label>
                  <input
                    type="text"
                    name="lastName"
                    value={formData.lastName}
                    onChange={handleChange}
                    disabled={isSubmitting}
                    className={`w-full px-3 py-2.5 text-sm border rounded-lg focus:ring-2 focus:ring-offset-0 transition-colors disabled:opacity-50 ${
                      errors.lastName
                        ? "border-red-300 focus:ring-red-500"
                        : "border-gray-300 focus:ring-emerald-500"
                    }`}
                    placeholder="Doe"
                  />
                  {errors.lastName && (
                    <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      {errors.lastName}
                    </p>
                  )}
                </div>

                {/* Email */}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-gray-700 mb-1.5">
                    Email Address *
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      disabled={isSubmitting}
                      className={`w-full pl-10 pr-3 py-2.5 text-sm border rounded-lg focus:ring-2 focus:ring-offset-0 transition-colors disabled:opacity-50 ${
                        errors.email
                          ? "border-red-300 focus:ring-red-500"
                          : "border-gray-300 focus:ring-emerald-500"
                      }`}
                      placeholder="john@example.com"
                    />
                  </div>
                  {errors.email && (
                    <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      {errors.email}
                    </p>
                  )}
                </div>

                {/* Phone */}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-gray-700 mb-1.5">
                    Phone Number *
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleChange}
                      disabled={isSubmitting}
                      className={`w-full pl-10 pr-3 py-2.5 text-sm border rounded-lg focus:ring-2 focus:ring-offset-0 transition-colors disabled:opacity-50 ${
                        errors.phone
                          ? "border-red-300 focus:ring-red-500"
                          : "border-gray-300 focus:ring-emerald-500"
                      }`}
                      placeholder="0801 234 5678"
                    />
                  </div>
                  {errors.phone && (
                    <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      {errors.phone}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Delivery Address */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <MapPin className="w-4 h-4 text-gray-500" />
                <h3 className="text-sm font-semibold text-gray-900">
                  Delivery Address
                </h3>
              </div>

              <div className="space-y-3 sm:space-y-4">
                {/* Street */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1.5">
                    Street Address *
                  </label>
                  <input
                    type="text"
                    name="deliveryAddress.street"
                    value={formData.deliveryAddress.street}
                    onChange={handleChange}
                    disabled={isSubmitting}
                    className={`w-full px-3 py-2.5 text-sm border rounded-lg focus:ring-2 focus:ring-offset-0 transition-colors disabled:opacity-50 ${
                      errors.street
                        ? "border-red-300 focus:ring-red-500"
                        : "border-gray-300 focus:ring-emerald-500"
                    }`}
                    placeholder="123 Main Street"
                  />
                  {errors.street && (
                    <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      {errors.street}
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3 sm:gap-4">
                  {/* City */}
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1.5">
                      City *
                    </label>
                    <input
                      type="text"
                      name="deliveryAddress.city"
                      value={formData.deliveryAddress.city}
                      onChange={handleChange}
                      disabled={isSubmitting}
                      className={`w-full px-3 py-2.5 text-sm border rounded-lg focus:ring-2 focus:ring-offset-0 transition-colors disabled:opacity-50 ${
                        errors.city
                          ? "border-red-300 focus:ring-red-500"
                          : "border-gray-300 focus:ring-emerald-500"
                      }`}
                      placeholder="Lagos"
                    />
                    {errors.city && (
                      <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        {errors.city}
                      </p>
                    )}
                  </div>

                  {/* State */}
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1.5">
                      State *
                    </label>
                    <input
                      type="text"
                      name="deliveryAddress.state"
                      value={formData.deliveryAddress.state}
                      onChange={handleChange}
                      disabled={isSubmitting}
                      className={`w-full px-3 py-2.5 text-sm border rounded-lg focus:ring-2 focus:ring-offset-0 transition-colors disabled:opacity-50 ${
                        errors.state
                          ? "border-red-300 focus:ring-red-500"
                          : "border-gray-300 focus:ring-emerald-500"
                      }`}
                      placeholder="Lagos"
                    />
                    {errors.state && (
                      <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        {errors.state}
                      </p>
                    )}
                  </div>
                </div>

                {/* Postal Code */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1.5">
                    Postal Code (Optional)
                  </label>
                  <input
                    type="text"
                    name="deliveryAddress.postalCode"
                    value={formData.deliveryAddress.postalCode}
                    onChange={handleChange}
                    disabled={isSubmitting}
                    className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:ring-offset-0 transition-colors disabled:opacity-50"
                    placeholder="100001"
                  />
                </div>
              </div>
            </div>

            {/* Order Notes */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">
                Order Notes (Optional)
              </label>
              <textarea
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                disabled={isSubmitting}
                rows={3}
                className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:ring-offset-0 transition-colors disabled:opacity-50 resize-none"
                placeholder="Any special instructions or requests..."
              />
            </div>
          </form>
        </div>

        {/* Fixed Footer */}
        <div className="border-t border-gray-200 p-4 sm:p-6 bg-gray-50 sm:rounded-b-2xl flex-shrink-0">
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="w-full sm:w-auto px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-100 transition-colors disabled:opacity-50 text-sm"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="w-full sm:flex-1 py-3 px-6 text-white rounded-lg font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm"
              style={{ backgroundColor: primaryColor }}
            >
              {isSubmitting ? (
                <>
                  <svg
                    className="animate-spin h-4 w-4"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  Processing...
                </>
              ) : (
                <>
                  <Package className="w-4 h-4" />
                  Place Order • {totalAmount}
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      <style jsx>{`
        @supports (height: 100dvh) {
          .modal-container {
            max-height: 100dvh;
          }
        }
      `}</style>
    </div>
  );
}
