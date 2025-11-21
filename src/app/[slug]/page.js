"use client";
import { useEffect, useState } from "react";
import { use } from "react";
import { useRouter } from "next/navigation";
import StoreWebsite from "@/components/StoreWebsite";
import useStoreStore from "@/stores/storeStore";

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
          // Could redirect to a 404 page or show not found message
          router.push('/404');
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
