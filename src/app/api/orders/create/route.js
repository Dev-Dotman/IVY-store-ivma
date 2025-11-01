import { NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongodb";
import Order from "@/models/Order";
import Cart from "@/models/Cart";
import Inventory from "@/models/Inventory";
import InventoryBatch from "@/models/InventoryBatch";
import Store from "@/models/Store";
import Customer from "@/models/Customer";
import { verifyCustomerSession } from "@/lib/auth";

export async function POST(request) {
  try {
    await connectToDatabase();

    const customerId = await verifyCustomerSession(request);

    if (!customerId) {
      return NextResponse.json(
        { success: false, message: "Unauthorized. Please sign in." },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { cartId, customerNotes, shippingAddress } = body;

    // Get customer details
    const customer = await Customer.findById(customerId);
    if (!customer) {
      return NextResponse.json(
        { success: false, message: "Customer not found" },
        { status: 404 }
      );
    }

    // Get cart with populated items
    const cart = await Cart.findOne({ _id: cartId, customer: customerId })
      .populate('items.product')
      .populate('items.store');

    if (!cart || !cart.items || cart.items.length === 0) {
      return NextResponse.json(
        { success: false, message: "Cart is empty" },
        { status: 400 }
      );
    }

    // Validate stock availability
    const stockValidation = await cart.validateStockAvailability();
    if (!stockValidation.isValid) {
      return NextResponse.json(
        { 
          success: false, 
          message: "Some items are no longer available",
          unavailableItems: stockValidation.unavailableItems
        },
        { status: 400 }
      );
    }

    // Validate shipping address
    if (!shippingAddress || !shippingAddress.phone || !shippingAddress.city || !shippingAddress.state) {
      return NextResponse.json(
        { success: false, message: "Complete shipping address is required" },
        { status: 400 }
      );
    }

    // Validate phone number format
    const phoneRegex = /^(\+234|0)[789]\d{9}$/;
    const formattedPhone = shippingAddress.phone.replace(/\s/g, '');
    if (!phoneRegex.test(formattedPhone)) {
      return NextResponse.json(
        { success: false, message: "Invalid phone number format" },
        { status: 400 }
      );
    }

    // Prepare shipping address with customer details
    const orderShippingAddress = {
      firstName: customer.firstName,
      lastName: customer.lastName,
      phone: formattedPhone,
      street: `${shippingAddress.city}, ${shippingAddress.state}`, // Combine for compatibility
      city: shippingAddress.city,
      state: shippingAddress.state,
      country: 'Nigeria'
    };

    // Prepare order items with enhanced snapshots
    const orderItems = await Promise.all(cart.items.map(async (item) => {
      const product = item.product;
      const store = await Store.findById(item.store);

      return {
        product: product._id,
        productSnapshot: {
          productName: product.productName,
          sku: product.sku,
          image: product.image,
          category: product.category,
          unitOfMeasure: product.unitOfMeasure
        },
        quantity: item.quantity,
        price: item.price,
        subtotal: item.subtotal,
        store: store._id,
        storeSnapshot: {
          storeName: store.storeName,
          storeSlug: store.ivmaWebsite?.websitePath || store.storeName,
          storePhone: store.storePhone,
          storeEmail: store.storeEmail,
          storeAddress: {
            street: store.address?.street,
            city: store.address?.city,
            state: store.address?.state,
            country: store.address?.country
          },
          // Add social media information
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
          // Add branding information for UI consistency
          branding: {
            logo: store.branding?.logo || '',
            primaryColor: store.branding?.primaryColor || '#0D9488',
            secondaryColor: store.branding?.secondaryColor || '#F3F4F6'
          }
        },
        seller: store.userId,
        itemStatus: 'pending'
      };
    }));

    
    // Create order
    const order = new Order({
      customer: customerId,
      customerSnapshot: {
        firstName: customer.firstName,
        lastName: customer.lastName,
        email: customer.email,
        phone: formattedPhone
      },
      items: orderItems,
      subtotal: cart.subtotal,
      tax: cart.tax,
      shippingFee: cart.shipping,
      discount: cart.discount,
      couponDiscount: cart.couponDiscount,
      totalAmount: cart.total,
      shippingAddress: orderShippingAddress,
      paymentInfo: {
        method: 'cash_to_vendor',
        provider: 'manual',
        status: 'pending'
      },
      couponCode: cart.couponCode,
      customerNotes: customerNotes || '',
      orderSource: 'web'
    });

    await order.save();

    // Add initial timeline event
    await order.addTimelineEvent('pending', 'Order created', 'customer');

    // Update inventory for each item
    for (const item of cart.items) {
      const product = await Inventory.findById(item.product);
      if (product) {
        // Record sale using FIFO from batches
        const batches = await InventoryBatch.find({
          productId: item.product,
          status: 'active',
          quantityRemaining: { $gt: 0 }
        }).sort({ dateReceived: 1 }); // FIFO

        let remainingQuantity = item.quantity;
        
        for (const batch of batches) {
          if (remainingQuantity <= 0) break;
          
          const quantityFromBatch = Math.min(batch.quantityRemaining, remainingQuantity);
          await batch.sellFromBatch(quantityFromBatch);
          remainingQuantity -= quantityFromBatch;
        }

        // Update main inventory
        await product.recordSale(item.quantity);
      }
    }

    // Update customer shopping stats
    await customer.updateShoppingStats(order.totalAmount);

    // Update store metrics for each store
    const storeIds = [...new Set(orderItems.map(item => item.store.toString()))];
    for (const storeId of storeIds) {
      const store = await Store.findById(storeId);
      if (store) {
        const storeItems = orderItems.filter(item => item.store.toString() === storeId);
        const storeTotal = storeItems.reduce((sum, item) => sum + item.subtotal, 0);
        await store.updateSalesMetrics(storeTotal);
      }

      if (store.ivmaWebsite && store.ivmaWebsite.isEnabled) {
          await Store.findByIdAndUpdate(storeId, {
            $inc: {
              'ivmaWebsite.metrics.totalOrders': 1
            },
            $set: {
              'ivmaWebsite.metrics.lastVisit': new Date()
            }
          });
        }
    }

    // Clear the cart
    await cart.clearCart();

    // TODO: Send email/SMS notifications to customer and store owners

    return NextResponse.json({
      success: true,
      message: "Order placed successfully",
      order: {
        _id: order._id,
        orderNumber: order.orderNumber,
        totalAmount: order.totalAmount,
        itemCount: order.itemCount,
        status: order.status,
        stores: order.stores // Include stores with social media data
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
