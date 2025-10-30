"use client";
import { createContext, useContext, useState, useEffect } from "react";
import { useAuth } from "./AuthContext";

const CartContext = createContext();

export function CartProvider({ children }) {
  const { customer, isAuthenticated, isLoading: authLoading } = useAuth();
  const [cart, setCart] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState(null);

  // Fetch cart when user is authenticated
  useEffect(() => {
    const fetchCart = async () => {
      // Wait for auth to finish loading
      if (authLoading) {
        return;
      }

      if (!isAuthenticated) {
        setCart(null);
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        const response = await fetch("/api/cart", {
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          }
        });

        if (response.ok) {
          const data = await response.json();
          if (data.success) {
            setCart(data.cart);
            setFetchError(null);
          } else {
            console.error("Cart fetch failed:", data.message);
            setFetchError(data.message);
          }
        } else if (response.status === 401) {
          console.log("User not authenticated, skipping cart fetch");
          setCart(null);
        } else {
          console.error("Cart fetch error:", response.status);
        }
      } catch (error) {
        console.error("Error fetching cart:", error);
        setFetchError(error.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCart();
  }, [isAuthenticated, authLoading, customer]);

  const addToCart = async (productId, quantity, notes = '') => {
    if (!isAuthenticated) {
      throw new Error("Please sign in to add items to cart");
    }

    try {
      const response = await fetch("/api/cart/items", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: 'include',
        body: JSON.stringify({ productId, quantity, notes }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setCart(data.cart);
        return { success: true, cart: data.cart };
      } else {
        return { success: false, error: data.message };
      }
    } catch (error) {
      console.error("Error adding to cart:", error);
      return { success: false, error: "Failed to add item to cart" };
    }
  };

  const removeFromCart = async (productId) => {
    if (!isAuthenticated) return;

    try {
      const response = await fetch(`/api/cart/items/${productId}`, {
        method: "DELETE",
        credentials: 'include'
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setCart(data.cart);
        return { success: true };
      }
    } catch (error) {
      console.error("Error removing from cart:", error);
      return { success: false, error: "Failed to remove item" };
    }
  };

  const updateQuantity = async (productId, newQuantity) => {
    if (!isAuthenticated) return;

    try {
      const response = await fetch(`/api/cart/items/${productId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: 'include',
        body: JSON.stringify({ quantity: newQuantity }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setCart(data.cart);
        return { success: true };
      }
    } catch (error) {
      console.error("Error updating quantity:", error);
      return { success: false, error: "Failed to update quantity" };
    }
  };

  const clearCart = async () => {
    if (!isAuthenticated) return;

    try {
      const response = await fetch("/api/cart", {
        method: "DELETE",
        credentials: 'include'
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setCart(null);
        return { success: true };
      }
    } catch (error) {
      console.error("Error clearing cart:", error);
      return { success: false, error: "Failed to clear cart" };
    }
  };

  const getCartTotal = () => {
    if (!cart) return 0;
    return cart.total || 0;
  };

  const getCartCount = () => {
    if (!cart) return 0;
    return cart.itemCount || 0;
  };

  const validateCart = async () => {
    if (!isAuthenticated || !cart) return { isValid: true, unavailableItems: [] };

    try {
      const response = await fetch("/api/cart/validate", {
        method: "POST",
        credentials: 'include'
      });

      const data = await response.json();

      if (response.ok) {
        return {
          isValid: data.isValid,
          unavailableItems: data.unavailableItems || []
        };
      }
    } catch (error) {
      console.error("Error validating cart:", error);
    }

    return { isValid: true, unavailableItems: [] };
  };

  const value = {
    cart,
    isLoading,
    fetchError,
    addToCart,
    removeFromCart,
    updateQuantity,
    clearCart,
    getCartTotal,
    getCartCount,
    validateCart
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
}
