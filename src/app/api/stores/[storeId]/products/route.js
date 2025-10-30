import { NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongodb";
import Store from "@/models/Store";
import Inventory from "@/models/Inventory";
import InventoryBatch from "@/models/InventoryBatch";

export async function GET(request, { params }) {
  try {
    await connectToDatabase();

    const { storeId } = await params;

    // Find the store
    const store = await Store.findById(storeId).lean();

    if (!store) {
      return NextResponse.json(
        { success: false, message: "Store not found" },
        { status: 404 }
      );
    }

    // Get all active, web-visible products for this store's user
    const products = await Inventory.find({
      userId: store.userId,
      status: "Active",
      webVisibility: true,
    })
      .sort({ createdAt: -1 })
      .lean();

    // Optionally enrich with batch data for each product
    const productsWithBatches = await Promise.all(
      products.map(async (product) => {
        const activeBatches = await InventoryBatch.countDocuments({
          productId: product._id,
          status: "active",
          quantityRemaining: { $gt: 0 },
        });

        return {
          ...product,
          hasBatches: activeBatches > 0,
        };
      })
    );

    return NextResponse.json({
      success: true,
      data: productsWithBatches,
    });
  } catch (error) {
    console.error("Error fetching store products:", error);
    return NextResponse.json(
      { success: false, message: "Failed to fetch products" },
      { status: 500 }
    );
  }
}
