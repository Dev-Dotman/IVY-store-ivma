import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Inventory from '@/models/Inventory';
import InventoryBatch from '@/models/InventoryBatch';
import Store from '@/models/Store';

export async function GET(request, { params }) {
  try {
    await connectDB();
    const { storeId } = await params;

    const store = await Store.findById(storeId).lean();
    
    if (!store) {
      return NextResponse.json(
        { success: false, message: 'Store not found' },
        { status: 404 }
      );
    }

    // Get products for this store (user)
    const products = await Inventory.find({
      userId: store.userId,
      status: 'Active',
      webVisibility: true
    }).lean();

    // Enhance products with batch pricing
    const enhancedProducts = await Promise.all(
      products.map(async (product) => {
        try {
          // Get batches for this product, sorted by FIFO
          const batches = await InventoryBatch.find({
            productId: product._id,
            status: 'active'
          }).sort({ dateReceived: 1 }).lean();

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

          // Find current active batch (FIFO - first batch with stock)
          const currentActiveBatch = activeBatches.length > 0 ? activeBatches[0] : null;

          // Use batch pricing if available
          if (currentActiveBatch) {
            return {
              ...product,
              sellingPrice: currentActiveBatch.sellingPrice,
              quantityInStock: activeBatches.reduce((sum, batch) => sum + batch.actualQuantityRemaining, 0),
              batchInfo: {
                currentBatchCode: currentActiveBatch.batchCode,
                currentBatchPrice: currentActiveBatch.sellingPrice,
                totalBatches: activeBatches.length
              }
            };
          }

          // No active batches, return product as-is
          return product;
        } catch (batchError) {
          console.error(`Error processing batches for product ${product._id}:`, batchError);
          return product; // Return product without batch enhancement if error
        }
      })
    );

    return NextResponse.json({
      success: true,
      data: enhancedProducts
    });

  } catch (error) {
    console.error('Error fetching store products:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch products' },
      { status: 500 }
    );
  }
}
