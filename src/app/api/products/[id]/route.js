import { NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongodb";
import Inventory from "@/models/Inventory";
import InventoryBatch from "@/models/InventoryBatch";
import Store from "@/models/Store";

export async function GET(request, { params }) {
  try {
    await connectToDatabase();

    const { id } = await params;

    // Fetch product from Inventory model
    const product = await Inventory.findById(id).lean();

    if (!product) {
      return NextResponse.json(
        { success: false, message: "Product not found" },
        { status: 404 }
      );
    }

    // Check if product is visible on web
    if (!product.webVisibility) {
      return NextResponse.json(
        { success: false, message: "Product not available" },
        { status: 404 }
      );
    }

    // Get active batches for this product to confirm stock availability
    const activeBatches = await InventoryBatch.find({
      productId: id,
      status: 'active',
      quantityRemaining: { $gt: 0 }
    })
    .sort({ dateReceived: 1 }) // FIFO
    .lean();

    // Get the store/user information
    const store = await Store.findOne({ userId: product.userId }).lean();

    if (!store) {
      return NextResponse.json(
        { success: false, message: "Store not found" },
        { status: 404 }
      );
    }

    // Calculate total available quantity from batches
    const totalBatchQuantity = activeBatches.reduce((sum, batch) => sum + batch.quantityRemaining, 0);

    // Prepare product data with batch information
    const productData = {
      ...product,
      costPrice: undefined, // Remove cost price from client response
      batches: activeBatches,
      batchQuantity: totalBatchQuantity,
      hasBatches: activeBatches.length > 0
    };

    return NextResponse.json({
      success: true,
      product: productData,
      store,
    });
  } catch (error) {
    console.error("Error fetching product:", error);
    return NextResponse.json(
      { success: false, message: "Failed to fetch product" },
      { status: 500 }
    );
  }
}
