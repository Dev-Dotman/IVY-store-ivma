import { NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongodb";
import { verifyCustomerSession } from "@/lib/auth";
import Cart from "@/models/Cart";
import Inventory from "@/models/Inventory";

// GET - Get customer's cart
export async function GET(request) {
  try {
    await connectToDatabase();

    let customerId;
    try {
      customerId = await verifyCustomerSession(request);
    } catch (sessionError) {
      console.warn('Session verification failed:', sessionError.message);
      return NextResponse.json(
        { success: false, message: "Authentication required" },
        { status: 401 }
      );
    }

    if (!customerId) {
      return NextResponse.json(
        { success: false, message: "Authentication required" },
        { status: 401 }
      );
    }

    // Get or create cart with retry logic
    let cart;
    let retries = 3;

    while (retries > 0) {
      try {
        cart = await Cart.getOrCreateCart(customerId);
        break;
      } catch (error) {
        if (error.code === 11000 && retries > 1) {
          // If duplicate key error, wait a bit and retry
          await new Promise(resolve => setTimeout(resolve, 100));
          retries--;
          continue;
        }
        throw error;
      }
    }

    return NextResponse.json({
      success: true,
      cart
    });
  } catch (error) {
    console.error("Error fetching cart:", error);
    return NextResponse.json(
      { 
        success: false, 
        message: "Failed to fetch cart",
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      },
      { status: 500 }
    );
  }
}

// DELETE - Clear cart
export async function DELETE(request) {
  try {
    await connectToDatabase();

    const customerId = await verifyCustomerSession(request);

    if (!customerId) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    const cart = await Cart.findOne({ customer: customerId });

    if (!cart) {
      return NextResponse.json(
        { success: false, message: "Cart not found" },
        { status: 404 }
      );
    }

    await cart.clearCart();

    return NextResponse.json({
      success: true,
      message: "Cart cleared successfully"
    });
  } catch (error) {
    console.error("Error clearing cart:", error);
    return NextResponse.json(
      { success: false, message: "Failed to clear cart" },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    await connectToDatabase();

    const customerId = await verifyCustomerSession(request);
    if (!customerId) {
      return NextResponse.json(
        { success: false, message: "Authentication required" },
        { status: 401 }
      );
    }

    const { productId, quantity = 1 } = await request.json();

    if (!productId) {
      return NextResponse.json(
        { success: false, message: "Product ID is required" },
        { status: 400 }
      );
    }

    // Get or create cart
    let cart = await Cart.getOrCreateCart(customerId);

    // Add item to cart
    cart = await cart.addItem(productId, quantity);

    return NextResponse.json({
      success: true,
      cart,
      message: "Item added to cart successfully"
    });
  } catch (error) {
    console.error("Error adding to cart:", error);
    return NextResponse.json(
      { 
        success: false, 
        message: error.message || "Failed to add item to cart",
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      },
      { status: 500 }
    );
  }
}
