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

    // Get ALL batches for this product (including potentially depleted ones)
    const allBatches = await InventoryBatch.find({
      productId: id,
      status: 'active' // Only get active status batches
    })
    .sort({ dateReceived: 1 }) // FIFO ordering
    .lean();

    const store = await Store.findOne({ userId: product.userId }).lean();

    if (!store) {
      return NextResponse.json(
        { success: false, message: "Store not found" },
        { status: 404 }
      );
    }

    // Calculate actual remaining quantities and filter truly active batches
    const activeBatches = allBatches
      .map(batch => {
        // Calculate actual remaining quantity
        const actualQuantityRemaining = batch.quantityIn - batch.quantitySold;
        return {
          ...batch,
          quantityRemaining: Math.max(0, actualQuantityRemaining) // Ensure non-negative
        };
      })
      .filter(batch => batch.quantityRemaining > 0); // Only include batches with actual stock

    // Calculate batch-based pricing and availability
    let currentPrice = product.sellingPrice; // fallback to inventory price
    let currentCostPrice = product.costPrice; // fallback to inventory cost
    let totalAvailableQuantity = 0;
    let priceRange = { min: null, max: null };
    let hasBatches = activeBatches.length > 0;
    let currentBatch = null;

    if (hasBatches) {
      // Calculate total available quantity from all truly active batches
      totalAvailableQuantity = activeBatches.reduce((sum, batch) => sum + batch.quantityRemaining, 0);
      
      // Get current price from the FIRST batch that has actual stock (FIFO)
      currentBatch = activeBatches[0]; // This is the oldest batch with stock
      if (currentBatch) {
        currentPrice = currentBatch.sellingPrice;
        currentCostPrice = currentBatch.costPrice;
      }
      
      // Calculate price range across all active batches
      const prices = activeBatches.map(batch => batch.sellingPrice);
      priceRange = {
        min: Math.min(...prices),
        max: Math.max(...prices)
      };
    } else {
      // No active batches with stock, use inventory stock if batch system not in use
      totalAvailableQuantity = product.quantityInStock;
    }

    // Prepare enhanced product data
    const enhancedProduct = {
      ...product,
      // Override pricing with batch-based pricing
      sellingPrice: currentPrice,
      
      // Override quantity with batch-based quantity
      quantityInStock: totalAvailableQuantity,
      
      // Batch information - only include batches with actual stock
      batches: activeBatches.map(batch => ({
        _id: batch._id,
        batchCode: batch.batchCode,
        quantityIn: batch.quantityIn,
        quantitySold: batch.quantitySold,
        quantityRemaining: batch.quantityRemaining,
        sellingPrice: batch.sellingPrice,
        dateReceived: batch.dateReceived,
        expiryDate: batch.expiryDate,
        supplier: batch.supplier,
        isExpired: batch.expiryDate ? new Date() > batch.expiryDate : false,
        daysUntilExpiry: batch.expiryDate ? Math.ceil((batch.expiryDate - new Date()) / (1000 * 60 * 60 * 24)) : null,
        isCurrentBatch: currentBatch ? batch._id.toString() === currentBatch._id.toString() : false
      })),
      
      // Batch metadata
      batchInfo: {
        hasBatches,
        totalBatches: activeBatches.length,
        totalAvailableQuantity,
        currentBatchId: currentBatch?._id,
        currentBatchCode: currentBatch?.batchCode,
        priceRange: hasBatches ? priceRange : null,
        oldestBatchDate: hasBatches ? activeBatches[0]?.dateReceived : null,
        newestBatchDate: hasBatches ? activeBatches[activeBatches.length - 1]?.dateReceived : null,
        averagePrice: hasBatches ? activeBatches.reduce((sum, batch) => sum + batch.sellingPrice, 0) / activeBatches.length : currentPrice
      },
      
      // Remove cost price from client response for security
      costPrice: undefined,
      batchCostPrice: undefined
    };

    return NextResponse.json({
      success: true,
      product: enhancedProduct,
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
