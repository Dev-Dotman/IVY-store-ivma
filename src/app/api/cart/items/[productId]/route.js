import { NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongodb";
import Cart from "@/models/Cart";
import { verifyCustomerSession } from "@/lib/auth";

// PATCH - Update item quantity
export async function PATCH(request, { params }) {
  try {
    await connectToDatabase();

    const customerId = await verifyCustomerSession(request);

    if (!customerId) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    const { productId } = await params;
    const body = await request.json();
    const { quantity } = body;

    if (!quantity || quantity < 0) {
      return NextResponse.json(
        { success: false, message: "Invalid quantity" },
        { status: 400 }
      );
    }

    const cart = await Cart.findOne({ customer: customerId });

    if (!cart) {
      return NextResponse.json(
        { success: false, message: "Cart not found" },
        { status: 404 }
      );
    }

    // Update quantity (removes item if quantity is 0)
    await cart.updateItemQuantity(productId, quantity);

    // Populate cart
    await cart.populate([
      { path: 'items.product', select: 'productName sku quantityInStock sellingPrice image' },
      { path: 'items.store', select: 'storeName storeSlug branding' }
    ]);

    return NextResponse.json({
      success: true,
      message: "Cart updated successfully",
      cart
    });
  } catch (error) {
    console.error("Error updating cart item:", error);
    return NextResponse.json(
      { success: false, message: "Failed to update cart item" },
      { status: 500 }
    );
  }
}

// DELETE - Remove item from cart
export async function DELETE(request, { params }) {
  try {
    await connectToDatabase();

    const customerId = await verifySession(request);

    if (!customerId) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    const { productId } = await params;

    const cart = await Cart.findOne({ customer: customerId });

    if (!cart) {
      return NextResponse.json(
        { success: false, message: "Cart not found" },
        { status: 404 }
      );
    }

    await cart.removeItem(productId);

    // Populate cart
    await cart.populate([
      { path: 'items.product', select: 'productName sku quantityInStock sellingPrice image' },
      { path: 'items.store', select: 'storeName storeSlug branding' }
    ]);

    return NextResponse.json({
      success: true,
      message: "Item removed from cart",
      cart
    });
  } catch (error) {
    console.error("Error removing cart item:", error);
    return NextResponse.json(
      { success: false, message: "Failed to remove item" },
      { status: 500 }
    );
  }
}
