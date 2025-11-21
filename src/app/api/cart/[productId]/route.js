import { NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongodb";
import Cart from "@/models/Cart";
import { verifyCustomerSession } from "@/lib/auth";

export async function DELETE(request, { params }) {
  try {
    await connectToDatabase();

    // Verify customer session
    const customerId = await verifyCustomerSession(request);
    if (!customerId) {
      return NextResponse.json(
        { success: false, message: "Authentication required" },
        { status: 401 }
      );
    }

    const { productId } = await params;

    // Find customer's cart
    const cart = await Cart.findOne({ customer: customerId }).populate({
      path: 'items.product',
      select: 'productName sku image category sellingPrice quantityInStock reorderLevel'
    });

    if (!cart) {
      return NextResponse.json(
        { success: false, message: "Cart not found" },
        { status: 404 }
      );
    }

    // Find the item to remove
    const itemIndex = cart.items.findIndex(item => 
      (item.product._id || item.product).toString() === productId
    );

    if (itemIndex === -1) {
      return NextResponse.json(
        { success: false, message: "Item not found in cart" },
        { status: 404 }
      );
    }

    // Remove the item
    cart.items.splice(itemIndex, 1);

    // Recalculate cart totals
    cart.recalculateSubtotal();

    // Save the cart
    await cart.save();

    // Populate the cart for response
    await cart.populate({
      path: 'items.product',
      select: 'productName sku image category sellingPrice quantityInStock reorderLevel'
    });

    await cart.populate({
      path: 'items.store',
      select: 'storeName storePhone storeEmail address branding'
    });

    return NextResponse.json({
      success: true,
      message: "Item removed from cart successfully",
      cart: cart.toJSON()
    });

  } catch (error) {
    console.error("Error removing item from cart:", error);
    return NextResponse.json(
      { success: false, message: "Failed to remove item from cart" },
      { status: 500 }
    );
  }
}
