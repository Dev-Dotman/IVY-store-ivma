import { NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongodb";
import { verifyCustomerSession } from "@/lib/auth";
import Order from "@/models/Order";
import Cart from "@/models/Cart";
import Inventory from "@/models/Inventory";
import InventoryBatch from "@/models/InventoryBatch";
import Store from "@/models/Store";

export async function POST(request) {
  try {
    await connectToDatabase();

    const customerId = await verifyCustomerSession(request);
    if (!customerId) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    const { cartId, shippingAddress, customerNotes, paymentMethod = 'cash_to_vendor', itemIds } = await request.json();

    // Validate shipping address
    if (!shippingAddress || !shippingAddress.firstName || !shippingAddress.phone || !shippingAddress.city || !shippingAddress.state) {
      return NextResponse.json(
        { success: false, message: "Complete shipping address is required" },
        { status: 400 }
      );
    }

    // Get cart with populated items
    const cart = await Cart.findOne({ _id: cartId, customer: customerId })
      .populate('items.product')
      .populate('items.store');

    if (!cart || cart.items.length === 0) {
      return NextResponse.json(
        { success: false, message: "Cart is empty" },
        { status: 400 }
      );
    }

    // Filter items if itemIds provided (for per-store checkout)
    let itemsToProcess = cart.items;
    if (itemIds && Array.isArray(itemIds) && itemIds.length > 0) {
      itemsToProcess = cart.items.filter(item => 
        itemIds.includes(item._id.toString())
      );
      
      if (itemsToProcess.length === 0) {
        return NextResponse.json(
          { success: false, message: "No valid items found for checkout" },
          { status: 400 }
        );
      }
    }

    // Validate stock and prepare order items
    const orderItems = [];
    const stockUpdates = []; // Track stock updates for rollback if needed

    for (const cartItem of itemsToProcess) {
      const product = await Inventory.findById(cartItem.product);
      
      if (!product) {
        return NextResponse.json(
          { success: false, message: `Product ${cartItem.productSnapshot.productName} not found` },
          { status: 404 }
        );
      }

      // Check if product has variants
      if (cartItem.variant && cartItem.variant.variantId) {
        // Variant product - check variant stock
        const variant = product.variants.find(v => 
          v._id.toString() === cartItem.variant.variantId.toString()
        );

        if (!variant) {
          return NextResponse.json(
            { success: false, message: `Variant ${cartItem.variant.color} - ${cartItem.variant.size} not found` },
            { status: 404 }
          );
        }

        if (variant.quantityInStock < cartItem.quantity) {
          return NextResponse.json(
            { 
              success: false, 
              message: `Insufficient stock for ${cartItem.productSnapshot.productName} (${cartItem.variant.color} - ${cartItem.variant.size}). Available: ${variant.quantityInStock}` 
            },
            { status: 400 }
          );
        }

        // Get batches for this variant (FIFO)
        const batches = await InventoryBatch.find({
          productId: product._id,
          status: 'active',
          hasVariants: true,
          'variants.variantId': cartItem.variant.variantId
        }).sort({ dateReceived: 1 }).lean();

        // Prepare stock update for variant with batch tracking
        stockUpdates.push({
          productId: product._id,
          variantId: variant._id,
          size: cartItem.variant.size,
          color: cartItem.variant.color,
          quantityToDeduct: cartItem.quantity,
          isVariant: true,
          batches: batches // Include batches for FIFO deduction
        });
      } else {
        // Simple product - check main stock
        if (product.quantityInStock < cartItem.quantity) {
          return NextResponse.json(
            { 
              success: false, 
              message: `Insufficient stock for ${cartItem.productSnapshot.productName}. Available: ${product.quantityInStock}` 
            },
            { status: 400 }
          );
        }

        // Get batches for simple product (FIFO)
        const batches = await InventoryBatch.find({
          productId: product._id,
          status: 'active',
          hasVariants: false
        }).sort({ dateReceived: 1 }).lean();

        // Prepare stock update for simple product
        stockUpdates.push({
          productId: product._id,
          quantityToDeduct: cartItem.quantity,
          isVariant: false,
          batches: batches // Include batches for FIFO deduction
        });
      }

      // Get store details with social media info
      const store = await Store.findById(cartItem.store);

      // Prepare order item with batch info
      orderItems.push({
        product: cartItem.product._id,
        productSnapshot: {
          productName: cartItem.productSnapshot.productName,
          sku: cartItem.productSnapshot.sku,
          image: cartItem.variant?.image || cartItem.productSnapshot.image,
          category: cartItem.productSnapshot.category,
          unitOfMeasure: cartItem.productSnapshot.unitOfMeasure,
          brand: cartItem.productSnapshot.brand,
          hasVariants: cartItem.productSnapshot.hasVariants || false
        },
        variant: cartItem.variant ? {
          variantId: cartItem.variant.variantId,
          color: cartItem.variant.color,
          size: cartItem.variant.size,
          sku: cartItem.variant.sku,
          image: cartItem.variant.image
        } : undefined,
        quantity: cartItem.quantity,
        price: cartItem.price,
        subtotal: cartItem.subtotal,
        store: cartItem.store._id,
        storeSnapshot: {
          storeName: store.storeName,
          storeSlug: store.ivmaWebsite?.websitePath || store.slug,
          storePhone: store.storePhone,
          storeEmail: store.storeEmail,
          storeAddress: {
            street: store.address?.street,
            city: store.address?.city,
            state: store.address?.state,
            country: store.address?.country
          },
          onlineStoreInfo: {
            website: store.onlineStoreInfo?.website || '',
            socialMedia: {
              instagram: store.onlineStoreInfo?.socialMedia?.instagram || '',
              facebook: store.onlineStoreInfo?.socialMedia?.facebook || '',
              twitter: store.onlineStoreInfo?.socialMedia?.twitter || '',
              tiktok: store.onlineStoreInfo?.socialMedia?.tiktok || '',
              whatsapp: store.onlineStoreInfo?.socialMedia?.whatsapp || store.storePhone || ''
            }
          },
          branding: {
            logo: store.branding?.logo,
            primaryColor: store.branding?.primaryColor,
            secondaryColor: store.branding?.secondaryColor
          }
        },
        seller: product.userId,
        itemStatus: 'pending',
        batchId: cartItem.batch?.batchId || null,
        batchCode: cartItem.batch?.batchCode || null
      });
    }

    // Calculate totals for filtered items
    const subtotal = itemsToProcess.reduce((sum, item) => sum + item.subtotal, 0);
    const totalAmount = subtotal; // Add tax, shipping if needed

    // Create order
    const order = new Order({
      customer: customerId,
      customerSnapshot: {
        firstName: shippingAddress.firstName,
        lastName: shippingAddress.lastName,
        email: shippingAddress.email || '',
        phone: shippingAddress.phone
      },
      items: orderItems,
      subtotal: subtotal,
      tax: 0,
      shippingFee: 0,
      discount: 0,
      couponDiscount: 0,
      totalAmount: totalAmount,
      status: 'pending',
      shippingAddress: {
        firstName: shippingAddress.firstName,
        lastName: shippingAddress.lastName,
        phone: shippingAddress.phone,
        street: shippingAddress.street || '',
        city: shippingAddress.city,
        state: shippingAddress.state,
        country: shippingAddress.country || 'Nigeria',
        postalCode: shippingAddress.postalCode || '',
        landmark: shippingAddress.landmark || ''
      },
      paymentInfo: {
        method: paymentMethod,
        provider: 'manual',
        status: 'pending'
      },
      customerNotes: customerNotes || '',
      orderSource: 'web'
    });

    await order.save();

    // Deduct stock using FIFO - handle both variants and simple products
    try {
      for (const update of stockUpdates) {
        let remainingToDeduct = update.quantityToDeduct;
        
        if (update.isVariant) {
          // VARIANT PRODUCT - Deduct from batches using FIFO for specific variant
          console.log(`Deducting ${remainingToDeduct} units of variant ${update.color}-${update.size} from batches`);
          
          // Process batches in FIFO order (already sorted by dateReceived)
          for (const batchData of update.batches) {
            if (remainingToDeduct <= 0) break;
            
            // Get the actual batch document (not lean)
            const batch = await InventoryBatch.findById(batchData._id);
            if (!batch) continue;
            
            // Find the specific variant in this batch
            const batchVariant = batch.variants.find(v => 
              v.variantId && v.variantId.toString() === update.variantId.toString()
            );
            
            if (!batchVariant || batchVariant.quantityRemaining <= 0) {
              continue; // Skip if variant not found or no stock
            }
            
            // Calculate how much to deduct from this batch variant
            const quantityFromThisBatch = Math.min(remainingToDeduct, batchVariant.quantityRemaining);
            
            // Deduct from batch variant using the batch's method
            await batch.sellFromBatch(quantityFromThisBatch, update.size, update.color);
            
            remainingToDeduct -= quantityFromThisBatch;
            
            console.log(`Deducted ${quantityFromThisBatch} from batch ${batch.batchCode} variant ${update.color}-${update.size}. Remaining to deduct: ${remainingToDeduct}`);
          }
          
          // Update Inventory variant stock
          const product = await Inventory.findById(update.productId);
          const variantIndex = product.variants.findIndex(v => 
            v._id.toString() === update.variantId.toString()
          );
          
          if (variantIndex !== -1) {
            product.variants[variantIndex].quantityInStock -= update.quantityToDeduct;
            product.variants[variantIndex].soldQuantity = (product.variants[variantIndex].soldQuantity || 0) + update.quantityToDeduct;
            
            // Recalculate main product stock from all variants
            const totalVariantStock = product.variants.reduce((sum, v) => sum + (v.quantityInStock || 0), 0);
            product.quantityInStock = totalVariantStock;
            
            await product.save();
          }
          
        } else {
          // SIMPLE PRODUCT - Deduct from batches using FIFO
          console.log(`Deducting ${remainingToDeduct} units from simple product batches`);
          
          // Process batches in FIFO order
          for (const batchData of update.batches) {
            if (remainingToDeduct <= 0) break;
            
            const batch = await InventoryBatch.findById(batchData._id);
            if (!batch || batch.quantityRemaining <= 0) continue;
            
            // Calculate how much to deduct from this batch
            const quantityFromThisBatch = Math.min(remainingToDeduct, batch.quantityRemaining);
            
            // Deduct from batch
            await batch.sellFromBatch(quantityFromThisBatch);
            
            remainingToDeduct -= quantityFromThisBatch;
            
            console.log(`Deducted ${quantityFromThisBatch} from batch ${batch.batchCode}. Remaining to deduct: ${remainingToDeduct}`);
          }
          
          // Update simple product stock
          const product = await Inventory.findById(update.productId);
          product.quantityInStock -= update.quantityToDeduct;
          product.soldQuantity = (product.soldQuantity || 0) + update.quantityToDeduct;
          await product.save();
        }
      }
    } catch (stockError) {
      console.error("Error updating stock:", stockError);
      return NextResponse.json(
        { success: false, message: `Stock update failed: ${stockError.message}` },
        { status: 500 }
      );
    }

    // Clear cart or remove processed items
    if (itemIds && itemIds.length > 0) {
      // Remove only processed items
      cart.items = cart.items.filter(item => 
        !itemIds.includes(item._id.toString())
      );
      await cart.save();
    } else {
      // Clear entire cart
      await cart.clearCart();
    }

    return NextResponse.json({
      success: true,
      message: "Order created successfully",
      order: {
        _id: order._id,
        orderNumber: order.orderNumber,
        totalAmount: order.totalAmount,
        stores: order.stores,
        status: order.status
      }
    });

  } catch (error) {
    console.error("Error creating order:", error);
    return NextResponse.json(
      { success: false, message: "Failed to create order", error: error.message },
      { status: 500 }
    );
  }
}
