import { NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongodb";
import { verifyCustomerSession } from "@/lib/auth";
import Wishlist from "@/models/Wishlist";

// DELETE - Remove item from wishlist
export async function DELETE(request, { params }) {
  try {
    await connectToDatabase();
    
    const customerId = await verifyCustomerSession(request);
    if (!customerId) {
      return NextResponse.json(
        { success: false, message: "Authentication required" },
        { status: 401 }
      );
    }

    const { productId } = await params;

    const wishlist = await Wishlist.findOne({ customer: customerId });
    if (!wishlist) {
      return NextResponse.json(
        { success: false, message: "Wishlist not found" },
        { status: 404 }
      );
    }

    await wishlist.removeItem(productId);

    return NextResponse.json({
      success: true,
      message: "Item removed from wishlist",
      wishlist
    });
  } catch (error) {
    console.error("Error removing from wishlist:", error);
    return NextResponse.json(
      { success: false, message: "Failed to remove item from wishlist" },
      { status: 500 }
    );
  }
}

// PUT - Update wishlist item
export async function PUT(request, { params }) {
  try {
    await connectToDatabase();
    
    const customerId = await verifyCustomerSession(request);
    if (!customerId) {
      return NextResponse.json(
        { success: false, message: "Authentication required" },
        { status: 401 }
      );
    }

    const { productId } = await params;
    const body = await request.json();
    const { priority, notes, notifications } = body;

    const wishlist = await Wishlist.findOne({ customer: customerId });
    if (!wishlist) {
      return NextResponse.json(
        { success: false, message: "Wishlist not found" },
        { status: 404 }
      );
    }

    // Update item properties
    if (priority !== undefined) {
      await wishlist.updateItemPriority(productId, priority);
    }
    if (notes !== undefined) {
      await wishlist.updateItemNotes(productId, notes);
    }
    if (notifications !== undefined) {
      await wishlist.updateNotificationSettings(productId, notifications);
    }

    return NextResponse.json({
      success: true,
      message: "Wishlist item updated",
      wishlist
    });
  } catch (error) {
    console.error("Error updating wishlist item:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Failed to update wishlist item" },
      { status: 500 }
    );
  }
}
