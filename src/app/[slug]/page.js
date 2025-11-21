"use client";
import { useEffect, useState } from "react";
import { use } from "react";
import { useRouter } from "next/navigation";
import StoreWebsite from "@/components/StoreWebsite";
import useStoreStore from "@/stores/storeStore";
import Head from "next/head";

export default function StorePage({ params }) {
  const router = useRouter();
  const resolvedParams = use(params);
  const { currentStore, isLoading, error, fetchStore } = useStoreStore();
  const [initialLoading, setInitialLoading] = useState(true);

  useEffect(() => {
    const loadStore = async () => {
      console.log('Loading store for slug:', resolvedParams.slug);
      
      try {
        const store = await fetchStore(resolvedParams.slug);
        
        if (!store) {
          console.log('Store not found, redirecting to 404');
          router.push('/404');
        } else {
          // Update favicon and metadata dynamically
          updateFavicon(store.branding?.logo);
          updateMetadata(store);
        }
      } catch (error) {
        console.error('Error loading store:', error);
      } finally {
        setInitialLoading(false);
      }
    };

    if (resolvedParams.slug) {
      loadStore();
    }
  }, [resolvedParams.slug, fetchStore, router]);

  const updateFavicon = (logoUrl) => {
    if (!logoUrl) return;
    
    // Remove existing favicon
    const existingFavicon = document.querySelector("link[rel*='icon']");
    if (existingFavicon) {
      existingFavicon.remove();
    }
    
    // Add new favicon
    const link = document.createElement('link');
    link.rel = 'icon';
    link.href = logoUrl;
    document.head.appendChild(link);
  };

  const updateMetadata = (store) => {
    if (!store) return;
    
    const seoSettings = store.ivmaWebsite?.seoSettings || {};
    const title = seoSettings.metaTitle || `${store.storeName} - Quality Products Online`;
    const description = seoSettings.metaDescription || `Shop quality products at ${store.storeName}. ${store.storeDescription}`;
    const keywords = seoSettings.keywords?.join(', ') || '';
    
    // Update document title
    document.title = title;
    
    // Update or create meta tags
    updateMetaTag('description', description);
    if (keywords) {
      updateMetaTag('keywords', keywords);
    }
    
    // Update Open Graph tags
    updateMetaTag('og:title', title, 'property');
    updateMetaTag('og:description', description, 'property');
    if (store.branding?.banner || store.branding?.logo) {
      updateMetaTag('og:image', store.branding?.banner || store.branding?.logo, 'property');
    }
    
    // Update Twitter Card tags
    updateMetaTag('twitter:title', title);
    updateMetaTag('twitter:description', description);
    if (store.branding?.banner || store.branding?.logo) {
      updateMetaTag('twitter:image', store.branding?.banner || store.branding?.logo);
    }
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

  // Show loading state
  if (initialLoading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-16 w-16 border-4 border-gray-200 border-t-black mb-4"></div>
          <p className="text-gray-600">Loading store...</p>
        </div>
      </div>
    );
  }

  // Show error state
  if (error || !currentStore) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-md">
          <div className="text-8xl mb-4">🏪</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Store Not Found</h2>
          <p className="text-gray-600 mb-6">
            {error || "The store you're looking for doesn't exist or is not available."}
          </p>
          <button
            onClick={() => router.push('/')}
            className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-600 text-white rounded-xl font-semibold hover:bg-emerald-700 transition-colors"
          >
            Go to Home
          </button>
        </div>
      </div>
    );
  }

  return <StoreWebsite store={currentStore} />;
}
