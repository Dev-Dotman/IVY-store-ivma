import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const useStoreStore = create(
  persist(
    (set, get) => ({
      // Store state
      currentStore: null,
      isLoading: false,
      error: null,
      
      // Actions
      setStore: (store) => set({ 
        currentStore: store, 
        error: null 
      }),
      
      setLoading: (loading) => set({ isLoading: loading }),
      
      setError: (error) => set({ error }),
      
      clearStore: () => set({ 
        currentStore: null, 
        error: null,
        isLoading: false 
      }),
      
      // Fetch store by slug
      fetchStore: async (slug) => {
        set({ isLoading: true, error: null });
        
        try {
          const response = await fetch(`/api/stores/public/${slug}`);
          const data = await response.json();
          
          if (response.ok && data.success) {
            set({ 
              currentStore: data.store, 
              isLoading: false,
              error: null 
            });
            return data.store;
          } else {
            set({ 
              error: data.message || 'Store not found',
              isLoading: false,
              currentStore: null 
            });
            return null;
          }
        } catch (error) {
          console.error('Error fetching store:', error);
          set({ 
            error: 'Failed to load store',
            isLoading: false,
            currentStore: null 
          });
          return null;
        }
      },
      
      // Update store colors
      updateStoreColors: (primaryColor, secondaryColor) => {
        const currentStore = get().currentStore;
        if (currentStore) {
          set({
            currentStore: {
              ...currentStore,
              branding: {
                ...currentStore.branding,
                primaryColor,
                secondaryColor
              }
            }
          });
        }
      },
      
      // Get store colors with fallbacks
      getStoreColors: () => {
        const store = get().currentStore;
        return {
          primaryColor: store?.branding?.primaryColor || '#0D9488',
          secondaryColor: store?.branding?.secondaryColor || '#F3F4F6',
          currency: store?.settings?.currency || 'NGN'
        };
      }
    }),
    {
      name: 'ivma-store-storage',
      partialize: (state) => ({ 
        currentStore: state.currentStore 
      })
    }
  )
);

export default useStoreStore;
