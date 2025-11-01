'use client';
import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { 
  MapPin, 
  Phone, 
  Mail, 
  Clock, 
  Instagram, 
  Facebook, 
  Twitter, 
  MessageCircle,
  Globe,
  Heart,
  ShoppingBag,
  Package,
  ArrowUp
} from 'lucide-react';
import useStoreStore from '@/stores/storeStore';

export default function StoreFooter() {
  const router = useRouter();
  const pathname = usePathname();
  const { currentStore } = useStoreStore();
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Screen size detection function
  const detectScreenSize = () => {
    if (typeof window !== 'undefined') {
      return window.innerWidth < 768; // 768px is the md breakpoint in Tailwind
    }
    return false;
  };

  // Screen size detection effect - MOVED TO TOP
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

  // Extract store slug from pathname
  const storeSlug = pathname.split('/')[1];

  // Store colors with fallbacks
  const primaryColor = currentStore?.branding?.primaryColor || '#0D9488';
  const secondaryColor = currentStore?.branding?.secondaryColor || '#F3F4F6';

  // Scroll to top functionality
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Handle social media links
  const openSocialLink = (platform, handle) => {
    if (!handle) return;
    
    let url = '';
    switch (platform) {
      case 'instagram':
        url = `https://instagram.com/${handle.replace('@', '')}`;
        break;
      case 'facebook':
        url = `https://facebook.com/${handle.replace('@', '')}`;
        break;
      case 'twitter':
        url = `https://twitter.com/${handle.replace('@', '')}`;
        break;
      case 'whatsapp':
        // Clean phone number and format for WhatsApp
        const cleanPhone = handle.replace(/\s/g, '').replace(/^0/, '234');
        const formattedPhone = cleanPhone.startsWith('+') ? cleanPhone.substring(1) : cleanPhone;
        url = `https://wa.me/${formattedPhone}`;
        break;
      case 'website':
        url = handle.startsWith('http') ? handle : `https://${handle}`;
        break;
    }
    
    if (url) {
      window.open(url, '_blank');
    }
  };

  // Early return AFTER all hooks
  if (!currentStore) return null;

  const quickLinks = [
    { label: 'Browse Products', path: `/${storeSlug}`, icon: Package },
    { label: 'My Cart', path: `/${storeSlug}/cart`, icon: ShoppingBag },
    { label: 'Wishlist', path: `/${storeSlug}/wishlist`, icon: Heart },
    { label: 'My Orders', path: `/${storeSlug}/orders`, icon: Package },
  ];

  const socialMediaLinks = [
    { 
      platform: 'instagram', 
      handle: currentStore.onlineStoreInfo?.socialMedia?.instagram,
      icon: Instagram 
    },
    { 
      platform: 'facebook', 
      handle: currentStore.onlineStoreInfo?.socialMedia?.facebook,
      icon: Facebook 
    },
    { 
      platform: 'twitter', 
      handle: currentStore.onlineStoreInfo?.socialMedia?.twitter,
      icon: Twitter 
    },
    { 
      platform: 'whatsapp', 
      handle: currentStore.onlineStoreInfo?.socialMedia?.whatsapp || currentStore.storePhone,
      icon: MessageCircle 
    },
    { 
      platform: 'website', 
      handle: currentStore.onlineStoreInfo?.website,
      icon: Globe 
    },
  ].filter(link => link.handle && link.handle.trim() !== '');

  return (
    <footer className="bg-white border-t border-gray-100 mt-auto">
      {/* Main Footer Content */}
      <div className="max-w-7xl mx-auto pt-12 px-6 lg:px-8 py-12 bg-white" style={{ backgroundColor: 'white', backdropFilter: isMobile ? 'saturate(180%) blur(20px)' : 'none' }}>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          
          {/* Store Information */}
          <div className="lg:col-span-2">
            <div className="flex items-center gap-3 mb-6 sm:mt-6">
              {currentStore.branding?.logo ? (
                <img 
                  src={currentStore.branding.logo} 
                  alt={currentStore.storeName} 
                  className="h-10 w-auto object-contain" 
                />
              ) : (
                <div 
                  className="h-10 w-10 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: primaryColor }}
                >
                  <span className="text-white font-bold text-lg">
                    {currentStore.storeName?.charAt(0)?.toUpperCase() || 'S'}
                  </span>
                </div>
              )}
              <div>
                <h3 className="text-xl font-bold text-gray-900">
                  {currentStore.storeName}
                </h3>
                <p className="text-sm text-gray-500">
                  {currentStore.storeType === 'physical' ? 'Physical Store' : 'Online Store'}
                </p>
              </div>
            </div>

            {/* Store Description */}
            {currentStore.storeDescription && (
              <p className="text-gray-600 mb-6 leading-relaxed">
                {currentStore.storeDescription}
              </p>
            )}

            {/* Contact Information */}
            <div className="space-y-3">
              {/* Physical Address (only for physical stores) */}
              {currentStore.storeType === 'physical' && currentStore.fullAddress && (
                <div className="flex items-start gap-3">
                  <MapPin className="w-5 h-5 text-gray-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">Store Address</p>
                    <p className="text-sm text-gray-600">{currentStore.fullAddress}</p>
                  </div>
                </div>
              )}

              {/* Phone */}
              {currentStore.storePhone && (
                <div className="flex items-center gap-3">
                  <Phone className="w-5 h-5 text-gray-500 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">Phone</p>
                    <a 
                      href={`tel:${currentStore.storePhone}`}
                      className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
                    >
                      {currentStore.storePhone}
                    </a>
                  </div>
                </div>
              )}

              {/* Email */}
              {currentStore.storeEmail && (
                <div className="flex items-center gap-3">
                  <Mail className="w-5 h-5 text-gray-500 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">Email</p>
                    <a 
                      href={`mailto:${currentStore.storeEmail}`}
                      className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
                    >
                      {currentStore.storeEmail}
                    </a>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-lg font-semibold text-gray-900 mb-4">Quick Links</h4>
            <ul className="space-y-3">
              {quickLinks.map((link, index) => {
                const IconComponent = link.icon;
                return (
                  <li key={index}>
                    <button
                      onClick={() => router.push(link.path)}
                      className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 transition-colors group"
                    >
                      <IconComponent className="w-4 h-4 group-hover:scale-110 transition-transform" />
                      {link.label}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>

          {/* Social Media & Additional Info */}
          <div>
            <h4 className="text-lg font-semibold text-gray-900 mb-4">Connect With Us</h4>
            
            {/* Social Media Links */}
            {socialMediaLinks.length > 0 && (
              <div className="mb-6">
                <p className="text-sm text-gray-600 mb-3">Follow us on social media</p>
                <div className="flex flex-wrap gap-3">
                  {socialMediaLinks.map((social, index) => {
                    const IconComponent = social.icon;
                    return (
                      <button
                        key={index}
                        onClick={() => openSocialLink(social.platform, social.handle)}
                        className="w-10 h-10 rounded-lg flex items-center justify-center border border-gray-200 hover:border-gray-300 transition-colors group"
                        style={{ 
                          '--hover-bg': `${primaryColor}10`,
                          '--hover-border': primaryColor ,
                          color: primaryColor,
                          borderColor: secondaryColor
                        }}
                        onMouseEnter={(e) => {
                          e.target.style.backgroundColor = `${primaryColor}10`;
                          e.target.style.borderColor = primaryColor;
                        }}
                        onMouseLeave={(e) => {
                          e.target.style.backgroundColor = '';
                          e.target.style.borderColor = '';
                        }}
                      >
                        <IconComponent 
                          className="w-5 h-5 text-gray-600 group-hover:scale-110 transition-transform"
                          style={{ color: 'inherit' }}
                        />
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Store Hours */}
            <div className="mb-4">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="w-4 h-4 text-gray-500" />
                <p className="text-sm font-medium text-gray-900">Store Hours</p>
              </div>
              <p className="text-sm text-gray-600">
                {currentStore.storeType === 'physical' 
                  ? 'Mon - Sat: 9:00 AM - 6:00 PM' 
                  : 'Available 24/7 Online'}
              </p>
            </div>

            {/* Delivery Areas (for online stores) */}
            {currentStore.storeType === 'online' && currentStore.onlineStoreInfo?.deliveryAreas?.length > 0 && (
              <div>
                <p className="text-sm font-medium text-gray-900 mb-2">Delivery Areas</p>
                <div className="flex flex-wrap gap-1">
                  {currentStore.onlineStoreInfo.deliveryAreas.slice(0, 3).map((area, index) => (
                    <span 
                      key={index}
                      className="text-xs px-2 py-1 rounded-full text-gray-600"
                      style={{ backgroundColor: `${primaryColor}10` }}
                    >
                      {area}
                    </span>
                  ))}
                  {currentStore.onlineStoreInfo.deliveryAreas.length > 3 && (
                    <span 
                      className="text-xs px-2 py-1 rounded-full text-gray-600"
                      style={{ backgroundColor: `${primaryColor}10` }}
                    >
                      +{currentStore.onlineStoreInfo.deliveryAreas.length - 3} more
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div 
        className="border-t border-gray-100"
        style={{ backgroundColor: `${primaryColor}05` }}
      >
        <div className="max-w-7xl mx-auto px-6 lg:px-8 py-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            
            {/* Copyright & IVMA Branding */}
            <div className="text-center sm:text-left">
              <p className="text-sm text-gray-600">
                © {new Date().getFullYear()} {currentStore.storeName}. All rights reserved.
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Powered by{' '}
                <a 
                  href="https://ivma.ng" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="font-medium hover:underline"
                  style={{ color: primaryColor }}
                >
                  IVMA
                </a>
                {' '}• Building digital stores for Nigerian businesses
              </p>
            </div>

            {/* Scroll to Top Button */}
            <button
              onClick={scrollToTop}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors hover:opacity-80"
              style={{ 
                backgroundColor: primaryColor,
                color: 'white'
              }}
            >
              <ArrowUp className="w-4 h-4" />
              <span className="hidden sm:inline">Back to Top</span>
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
}
