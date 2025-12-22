import { NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongodb";
import { verifyCustomerSession } from "@/lib/auth";
import Order from "@/models/Order";
import Cart from "@/models/Cart";
import Inventory from "@/models/Inventory";
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

    const { cartId, shippingAddress, customerNotes, paymentMethod = 'cash_to_vendor' } = await request.json();

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

    // Validate stock and prepare order items
    const orderItems = [];
    const stockUpdates = []; // Track stock updates for rollback if needed

    for (const cartItem of cart.items) {
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

        // Prepare stock update for variant
        stockUpdates.push({
          productId: product._id,
          variantId: variant._id,
          quantityToDeduct: cartItem.quantity,
          isVariant: true
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

        // Prepare stock update for simple product
        stockUpdates.push({
          productId: product._id,
          quantityToDeduct: cartItem.quantity,
          isVariant: false
        });
      }

      // Get store details with social media info
      const store = await Store.findById(cartItem.store);

      // Prepare order item with variant info
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
        itemStatus: 'pending'
      });
    }

    // Create order
    const order = new Order({
      customer: customerId,
      customerSnapshot: {
        firstName: shippingAddress.firstName,
        lastName: shippingAddress.lastName,
        phone: shippingAddress.phone
      },
      items: orderItems,
      subtotal: cart.subtotal,
      tax: cart.tax || 0,
      shippingFee: cart.shipping || 0,
      discount: cart.discount || 0,
      couponDiscount: cart.couponDiscount || 0,
      totalAmount: cart.total,
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

    // Deduct stock - handle both variants and simple products
    try {
      for (const update of stockUpdates) {
        const product = await Inventory.findById(update.productId);
        
        if (update.isVariant) {
          // Update variant stock
          const variantIndex = product.variants.findIndex(v => 
            v._id.toString() === update.variantId.toString()
          );
          
          if (variantIndex !== -1) {
            product.variants[variantIndex].quantityInStock -= update.quantityToDeduct;
            
            // Also update main product stock (sum of all variants)
            const totalVariantStock = product.variants.reduce((sum, v) => sum + (v.quantityInStock || 0), 0);
            product.quantityInStock = totalVariantStock;
          }
        } else {
          // Update simple product stock
          product.quantityInStock -= update.quantityToDeduct;
        }
        
        await product.save();
      }
    } catch (stockError) {
      console.error("Error updating stock:", stockError);
      // Stock update failed - we should ideally rollback the order here
      // For now, we'll log it and continue
    }

    // Clear cart
    await cart.clearCart();

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
      { success: false, message: "Failed to create order" },
      { status: 500 }
    );
  }
}
