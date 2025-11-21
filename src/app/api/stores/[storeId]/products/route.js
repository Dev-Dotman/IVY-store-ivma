import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Store from '@/models/Store';
import Inventory from '@/models/Inventory';

export async function GET(request, { params }) {
  try {
    await connectDB();
    
    const { storeId } = await params;
    
    // Get the store
    const store = await Store.findById(storeId);
    if (!store) {
      return NextResponse.json({
        success: false,
        message: 'Store not found'
      }, { status: 404 });
    }

    console.log(`Fetching products for store: ${store.storeName} (userID: ${store.userId})`);

    // Get active inventory items for this user that are web visible
    const products = await Inventory.find({
      userId: store.userId,
      status: 'Active',
      webVisibility: true,
      quantityInStock: { $gt: 0 } // Only show items in stock
    })
    .select('productName description category sku brand unitOfMeasure quantityInStock reorderLevel sellingPrice costPrice image')
    .sort({ productName: 1 })
    .lean();

    return NextResponse.json({
      success: true,
      data: products,
      count: products.length
    });
    
  } catch (error) {
    console.error('Error fetching store products:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to fetch products',
      error: error.message
    }, { status: 500 });
  }
}
