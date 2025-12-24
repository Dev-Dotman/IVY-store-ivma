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

    // Prepare product data (don't pass price - let it use batch pricing)
    const productData = {
      productId,
      notes
    };

    // Add item to cart with variant info - will automatically use batch pricing
    cart = await cart.addItem(productData, quantity, variantData);

    // Log successful addition with pricing info
    console.log(`Item added to cart with batch pricing:`, {
      productId,
      quantity,
      variant: variantData,
      batchInfo: cart.items[cart.items.length - 1].batch
    });

    return NextResponse.json({
      success: true,
      cart,
      message: variantData 
        ? `${color} - ${size} added to cart successfully`
        : "Item added to cart successfully",
      pricingInfo: cart.items[cart.items.length - 1].batch ? {
        usingBatchPricing: true,
        batchCode: cart.items[cart.items.length - 1].batch.batchCode,
        price: cart.items[cart.items.length - 1].price
      } : {
        usingBatchPricing: false,
        price: cart.items[cart.items.length - 1].price
      }
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
