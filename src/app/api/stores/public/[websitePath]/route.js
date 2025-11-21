import { NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongodb";
import Store from "@/models/Store";

export async function GET(request, { params }) {
  try {
    await connectToDatabase();

    const { websitePath } = await params;

    console.log('Fetching public store data for path:', websitePath);

    // Find store by website path
    const store = await Store.findOne({
      'ivmaWebsite.websitePath': websitePath,
      'ivmaWebsite.status': 'active',
      'ivmaWebsite.isEnabled': true,
      isActive: true
    }).lean();

    if (!store) {
      console.log('Store not found for path:', websitePath);
      return NextResponse.json(
        { success: false, message: "Store not found or not active" },
        { status: 404 }
      );
    }

    console.log('Store found:', store.storeName);

    // Update website metrics (view count)
    try {
      await Store.findByIdAndUpdate(store._id, {
        $inc: {
          'ivmaWebsite.metrics.totalViews': 1,
          'ivmaWebsite.metrics.monthlyViews': 1
        },
        $set: {
          'ivmaWebsite.metrics.lastVisit': new Date()
        }
      });
    } catch (metricsError) {
      console.log('Failed to update metrics, but continuing:', metricsError.message);
    }

    // Remove sensitive information before sending to client
    const publicStore = {
      _id: store._id,
      storeName: store.storeName,
      storeDescription: store.storeDescription,
      storeType: store.storeType,
      storePhone: store.storePhone,
      storeEmail: store.storeEmail,
      address: store.address,
      onlineStoreInfo: store.onlineStoreInfo,
      settings: {
        currency: store.settings?.currency || 'NGN',
        timezone: store.settings?.timezone || 'Africa/Lagos'
      },
      branding: store.branding,
      ivmaWebsite: {
        websitePath: store.ivmaWebsite.websitePath,
        status: store.ivmaWebsite.status,
        seoSettings: store.ivmaWebsite.seoSettings,
        customization: store.ivmaWebsite.customization
      },
      // Virtual fields
      fullAddress: store.storeType === 'physical' ? 
        [store.address?.street, store.address?.city, store.address?.state, store.address?.country]
          .filter(part => part && part.trim() !== '')
          .join(', ') : '',
      websiteUrl: store.ivmaWebsite.domain?.customDomain ? 
        `${store.ivmaWebsite.domain.sslEnabled ? 'https' : 'http'}://${store.ivmaWebsite.domain.customDomain}` :
        `https://${store.ivmaWebsite.websitePath}.ivma.ng`
    };

    return NextResponse.json({
      success: true,
      store: publicStore
    });

  } catch (error) {
    console.error("Error fetching public store data:", error);
    return NextResponse.json(
      { success: false, message: "Failed to fetch store data" },
      { status: 500 }
    );
  }
}
