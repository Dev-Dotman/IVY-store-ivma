import { NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongodb";
import { verifyCustomerSession } from "@/lib/auth";
import Cart from "@/models/Cart";

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

    const { productId, quantity = 1, variantId, color, size, notes } = await request.json();

    if (!productId) {
      return NextResponse.json(
        { success: false, message: "Product ID is required" },
        { status: 400 }
      );
    }

    if (quantity < 1) {
      return NextResponse.json(
        { success: false, message: "Quantity must be at least 1" },
        { status: 400 }
      );
    }

    // Prepare variant data if provided
    let variantData = null;
    if (variantId && color && size) {
      variantData = {
        variantId,
        color,
        size
      };
    }

    // Get or create cart
    let cart = await Cart.getOrCreateCart(customerId);

    // Prepare product data
    const productData = {
      productId,
      notes
    };

    // Add item to cart with variant info
    cart = await cart.addItem(productData, quantity, variantData);

    return NextResponse.json({
      success: true,
      cart,
      message: variantData 
        ? `${color} - ${size} added to cart successfully`
        : "Item added to cart successfully"
    });
  } catch (error) {
    console.error("Error adding to cart:", error);
    
    // Handle specific error types
    if (error.message.includes('Product not found') || error.message.includes('Variant not found')) {
      return NextResponse.json(
        { success: false, message: error.message },
        { status: 404 }
      );
    }
    
    if (error.message.includes('not available') || 
        error.message.includes('stock') || 
        error.message.includes('variant selection')) {
      return NextResponse.json(
        { success: false, message: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { 
        success: false, 
        message: "Failed to add item to cart",
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      },
      { status: 500 }
    );
  }
}
