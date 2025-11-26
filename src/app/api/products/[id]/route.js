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

    // Get ALL batches for this product, sorted by FIFO (dateReceived ascending)
    const batches = await InventoryBatch.find({
      productId: id,
      status: 'active'
    }).sort({ dateReceived: 1 }).lean(); // FIFO order - oldest first

    // Calculate actual remaining quantities BEFORE filtering
    const batchesWithActualRemaining = batches.map(batch => {
      const actualQuantityRemaining = (batch.quantityIn || 0) - (batch.quantitySold || 0);
      return {
        ...batch,
        actualQuantityRemaining: Math.max(0, actualQuantityRemaining)
      };
    });

    // Filter to ONLY batches that have stock
    const activeBatches = batchesWithActualRemaining.filter(batch => batch.actualQuantityRemaining > 0);

    // Find the current active batch using FIFO logic (first batch with stock)
    const currentActiveBatch = activeBatches.length > 0 ? activeBatches[0] : null;

    const store = await Store.findOne({ userId: product.userId }).lean();

    if (!store) {
      return NextResponse.json(
        { success: false, message: "Store not found" },
        { status: 404 }
      );
    }

    // Calculate batch-based pricing and availability
    let currentPrice = product.sellingPrice; // fallback
    let currentCostPrice = product.costPrice; // fallback
    let totalAvailableQuantity = 0;
    let priceRange = { min: null, max: null };
    let hasBatches = activeBatches.length > 0;
    let currentBatch = null;

    if (currentActiveBatch) {
      // Use the FIRST batch with stock (FIFO) for current pricing
      currentBatch = currentActiveBatch;
      currentPrice = currentActiveBatch.sellingPrice;
      currentCostPrice = currentActiveBatch.costPrice;
      
      // Calculate total available quantity from all batches with stock
      totalAvailableQuantity = activeBatches.reduce((sum, batch) => sum + batch.actualQuantityRemaining, 0);
      
      // Calculate price range across all active batches
      const prices = activeBatches.map(batch => batch.sellingPrice);
      priceRange = {
        min: Math.min(...prices),
        max: Math.max(...prices)
      };
    } else {
      // No active batches with stock, use inventory stock if batch system not in use
      totalAvailableQuantity = product.quantityInStock || 0;
    }

    // Calculate weighted averages across all batches (for reference)
    const totalQuantityIn = batchesWithActualRemaining.reduce((sum, batch) => sum + (batch.quantityIn || 0), 0);
    const weightedSellingSum = batchesWithActualRemaining.reduce((sum, batch) => 
      sum + ((batch.sellingPrice || 0) * (batch.quantityIn || 0)), 0
    );
    const averageSellingPrice = totalQuantityIn > 0 ? weightedSellingSum / totalQuantityIn : currentPrice;

    // Prepare enhanced product data
    const enhancedProduct = {
      ...product,
      // Override pricing with CURRENT BATCH pricing (FIFO)
      sellingPrice: currentPrice,
      
      // Override quantity with total available from all batches
      quantityInStock: totalAvailableQuantity,
      
      // Batch information - only include batches with actual stock
      batches: activeBatches.map(batch => ({
        _id: batch._id,
        batchCode: batch.batchCode,
        quantityIn: batch.quantityIn,
        quantitySold: batch.quantitySold,
        quantityRemaining: batch.actualQuantityRemaining,
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
        hasBatches: hasBatches,
        totalBatches: activeBatches.length,
        totalAvailableQuantity,
        currentBatchId: currentBatch?._id,
        currentBatchCode: currentBatch?.batchCode,
        currentBatchRemaining: currentBatch ? currentBatch.actualQuantityRemaining : 0,
        priceRange: activeBatches.length > 0 ? priceRange : null,
        oldestBatchDate: activeBatches.length > 0 ? activeBatches[0]?.dateReceived : null,
        newestBatchDate: activeBatches.length > 0 ? activeBatches[activeBatches.length - 1]?.dateReceived : null,
        averagePrice: averageSellingPrice,
        methodology: 'FIFO - First In, First Out (oldest batches sold first)',
        debugInfo: {
          totalBatchesFound: batches.length,
          batchesWithStock: activeBatches.length,
          currentBatchPrice: currentPrice,
          fallbackPrice: product.sellingPrice
        }
      },
      
      // Pricing information
      pricing: {
        current: currentPrice, // Current selling price from FIFO batch
        average: averageSellingPrice, // Weighted average across all batches
        hasVariablePricing: priceRange && priceRange.min !== priceRange.max,
        range: priceRange
      },
      
      // Remove sensitive pricing from client response
      costPrice: undefined,
      batchCostPrice: undefined
    };

    return NextResponse.json({
      success: true,
      product: enhancedProduct,
      store,
      batchInfo: {
        note: 'Pricing reflects current active batch using FIFO methodology',
        methodology: 'First In, First Out (FIFO) - oldest batches are sold first',
        currentBatch: currentBatch ? {
          batchCode: currentBatch.batchCode,
          remaining: currentBatch.actualQuantityRemaining,
          price: currentPrice,
          dateReceived: currentBatch.dateReceived
        } : null
      }
    });
  } catch (error) {
    console.error("Error fetching product:", error);
    return NextResponse.json(
      { success: false, message: "Failed to fetch product" },
      { status: 500 }
    );
  }
}
