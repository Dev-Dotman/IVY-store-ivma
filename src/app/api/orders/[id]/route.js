import { NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongodb";
import Order from "@/models/Order";
import { verifyCustomerSession } from "@/lib/auth";

export async function GET(request, { params }) {
  try {
    await connectToDatabase();

    const customerId = await verifyCustomerSession(request);
    if (!customerId) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    const { id } = await params;

    const order = await Order.findOne({
      _id: id,
      customer: customerId
    })
    .populate('items.product', 'productName sku image category')
    .populate('items.store', 'storeName storePhone storeEmail onlineStoreInfo branding')
    .lean();

    if (!order) {
      return NextResponse.json(
        { success: false, message: "Order not found" },
        { status: 404 }
      );
    }

    // Ensure social media data is present in response
    // The data should already be in storeSnapshot from when the order was created
    // But we can enhance it if needed from the current store data
    if (order.items) {
      order.items = order.items.map(item => {
        // If social media data is missing from snapshot, get it from populated store
        if (!item.storeSnapshot?.onlineStoreInfo?.socialMedia && item.store?.onlineStoreInfo?.socialMedia) {
          item.storeSnapshot = {
            ...item.storeSnapshot,
            onlineStoreInfo: {
              website: item.store.onlineStoreInfo.website || '',
              socialMedia: {
                instagram: item.store.onlineStoreInfo.socialMedia.instagram || '',
                facebook: item.store.onlineStoreInfo.socialMedia.facebook || '',
                twitter: item.store.onlineStoreInfo.socialMedia.twitter || '',
                tiktok: item.store.onlineStoreInfo.socialMedia.tiktok || '',
                whatsapp: item.store.onlineStoreInfo.socialMedia.whatsapp || item.store.storePhone || ''
              }
            }
          };
        }
        return item;
      });
    }

    // Also enhance stores array if social media data is missing
    if (order.stores) {
      order.stores = order.stores.map(storeGroup => {
        if (!storeGroup.storeSnapshot?.onlineStoreInfo?.socialMedia) {
          // Find the corresponding store from items to get social media data
          const sampleItem = order.items.find(item => 
            item.store._id.toString() === storeGroup.store.toString()
          );
          
          if (sampleItem?.storeSnapshot?.onlineStoreInfo?.socialMedia) {
            storeGroup.storeSnapshot = {
              ...storeGroup.storeSnapshot,
              onlineStoreInfo: sampleItem.storeSnapshot.onlineStoreInfo
            };
          }
        }
        return storeGroup;
      });
    }

    return NextResponse.json({
      success: true,
      order
    });
  } catch (error) {
    console.error("Error fetching order:", error);
    return NextResponse.json(
      { success: false, message: "Failed to fetch order" },
      { status: 500 }
    );
  }
}
