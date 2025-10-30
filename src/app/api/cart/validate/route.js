import { NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongodb";
import Cart from "@/models/Cart";
import { verifySession } from "@/lib/auth";

export async function POST(request) {
  try {
    await connectToDatabase();

    const customerId = await verifySession(request);

    if (!customerId) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    const cart = await Cart.findOne({ customer: customerId });

    if (!cart || cart.isEmpty) {
      return NextResponse.json(
        { success: false, message: "Cart is empty" },
        { status: 400 }
      );
    }

    // Validate stock availability
    const validation = await cart.validateStockAvailability();

    return NextResponse.json({
      success: true,
      isValid: validation.isValid,
      unavailableItems: validation.unavailableItems
    });
  } catch (error) {
    console.error("Error validating cart:", error);
    return NextResponse.json(
      { success: false, message: "Failed to validate cart" },
      { status: 500 }
    );
  }
}
