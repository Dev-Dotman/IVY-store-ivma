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

    // Fetch all active inventory items for this store
    const products = await Inventory.find({
      userId: store.userId,
      status: "Active",
      webVisibility: true,
    })
      .sort({ createdAt: -1 })
      .lean();

    // Enhance each product with correct batch information
    const enhancedProducts = await Promise.all(
      products.map(async (product) => {
        // Get ALL active batches and calculate actual remaining quantities
        const allBatches = await InventoryBatch.find({
          productId: product._id,
          status: "active",
        })
          .sort({ dateReceived: 1 })
          .lean();

        // Calculate actual remaining quantities and filter truly active batches
        const activeBatches = allBatches
          .map((batch) => {
            const actualQuantityRemaining = batch.quantityIn - batch.quantitySold;
            return {
              ...batch,
              quantityRemaining: Math.max(0, actualQuantityRemaining),
            };
          })
          .filter((batch) => batch.quantityRemaining > 0);

        let currentPrice = product.sellingPrice;
        let totalAvailableQuantity = 0;
        let hasBatches = activeBatches.length > 0;

        if (hasBatches) {
          // Calculate total available quantity from batches with actual stock
          totalAvailableQuantity = activeBatches.reduce(
            (sum, batch) => sum + batch.quantityRemaining,
            0
          );

          // Get current price from first batch with actual stock (FIFO)
          const currentBatch = activeBatches[0];
          if (currentBatch) {
            currentPrice = currentBatch.sellingPrice;
          }
        } else {
          // No batches with stock, use inventory stock
          totalAvailableQuantity = product.quantityInStock;
        }

        // Return enhanced product
        return {
          ...product,
          sellingPrice: currentPrice,
          quantityInStock: totalAvailableQuantity,
          hasBatches,
          activeBatchCount: activeBatches.length,
          // Remove sensitive data
          costPrice: undefined,
        };
      })
    );

    // Filter out products with no stock
    // const availableProducts = enhancedProducts.filter(
    //   (product) => product.quantityInStock > 0
    // );

    const availableProducts = enhancedProducts;

    return NextResponse.json({
      success: true,
      data: availableProducts,
      total: availableProducts.length,
      store: {
        _id: store._id,
        storeName: store.storeName,
        storeSlug: store.ivmaWebsite?.websitePath,
      },
    });
  } catch (error) {
    console.error("Error fetching store products:", error);
    return NextResponse.json(
      { success: false, message: "Failed to fetch products" },
      { status: 500 }
    );
  }
}
