import { NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongodb";
import Cart from "@/models/Cart";
import Inventory from "@/models/Inventory";
import InventoryBatch from "@/models/InventoryBatch";
import Store from "@/models/Store";
import { verifyCustomerSession } from "@/lib/auth";

// POST - Add item to cart
export async function POST(request) {
  try {
    await connectToDatabase();

    const customerId = await verifyCustomerSession(request);

    if (!customerId) {
      console.log('Add to cart: No valid customer session');
      return NextResponse.json(
        { success: false, message: "Please sign in to add items to cart" },
        { status: 401 }
      );
    }

    console.log('Add to cart: Customer ID:', customerId);

    const body = await request.json();
    const { productId, quantity, notes } = body;

    // Validate input
    if (!productId || !quantity || quantity < 1) {
      return NextResponse.json(
        { success: false, message: "Invalid product or quantity" },
        { status: 400 }
      );
    }

    // Get the product
    const product = await Inventory.findById(productId);
    if (!product) {
      return NextResponse.json(
        { success: false, message: "Product not found" },
        { status: 404 }
      );
    }

    if (!product.webVisibility || product.status !== 'Active') {
      return NextResponse.json(
        { success: false, message: "Product is not available" },
        { status: 400 }
      );
    }

    // Get ALL active batches and calculate actual remaining quantities
    const allBatches = await InventoryBatch.find({
      productId: productId,
      status: 'active'
    })
    .sort({ dateReceived: 1 }) // FIFO ordering
    .lean();

    // Calculate actual remaining quantities and filter truly active batches
    const activeBatches = allBatches
      .map(batch => {
        const actualQuantityRemaining = batch.quantityIn - batch.quantitySold;
        return {
          ...batch,
          quantityRemaining: Math.max(0, actualQuantityRemaining)
        };
      })
      .filter(batch => batch.quantityRemaining > 0);

    let currentPrice = product.sellingPrice;
    let totalAvailableQuantity = 0;
    let hasBatches = activeBatches.length > 0;

    if (hasBatches) {
      // Calculate availability from batches with actual stock
      totalAvailableQuantity = activeBatches.reduce((sum, batch) => sum + batch.quantityRemaining, 0);
      
      // Get current price from the first batch that actually has stock (FIFO)
      const currentBatch = activeBatches[0];
      if (currentBatch) {
        currentPrice = currentBatch.sellingPrice;
      }
    } else {
      // Use inventory stock if no batches with stock
      totalAvailableQuantity = product.quantityInStock;
    }

    // Check stock availability
    if (totalAvailableQuantity < quantity) {
      return NextResponse.json(
        { success: false, message: `Only ${totalAvailableQuantity} items available` },
        { status: 400 }
      );
    }

    // Get store details
    const store = await Store.findOne({ userId: product.userId });

    if (!store) {
      return NextResponse.json(
        { success: false, message: "Store not found" },
        { status: 404 }
      );
    }

    // Get or create cart
    let cart = await Cart.getOrCreateCart(customerId);

    // Prepare cart item data with correct batch-based pricing
    const cartItemData = {
      product: productId,
      quantity: quantity,
      price: currentPrice, // Use current batch price
      subtotal: quantity * currentPrice,
      store: store._id,
      productSnapshot: {
        productName: product.productName,
        sku: product.sku,
        category: product.category,
        image: product.image,
        unitOfMeasure: product.unitOfMeasure,
        hasBatches: hasBatches,
        batchPrice: hasBatches ? currentPrice : null,
        inventoryPrice: product.sellingPrice
      },
      storeSnapshot: {
        storeName: store.storeName,
        storeSlug: store.ivmaWebsite?.websitePath || store.storeName
      },
      notes: ''
    };

    // Add item to cart
    cart = await cart.addItem(cartItemData);

    return NextResponse.json({
      success: true,
      cart,
      message: "Item added to cart successfully",
      priceInfo: {
        usedBatchPrice: hasBatches,
        currentPrice: currentPrice,
        originalPrice: product.sellingPrice,
        availableQuantity: totalAvailableQuantity
      }
    });
  } catch (error) {
    console.error("Error adding item to cart:", error);
    return NextResponse.json(
      { success: false, message: "Failed to add item to cart" },
      { status: 500 }
    );
  }
}
