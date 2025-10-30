import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Store from '@/models/Store';
import Product from '@/models/Product';
import User from '@/models/User';

export async function GET(request, { params }) {
  try {
    await connectDB();
    
    const { slug } = await params;
    
    // Find store by website path with active status
    const store = await Store.findOne({
      'ivmaWebsite.websitePath': slug,
      'ivmaWebsite.status': 'active',
    //   'ivmaWebsite.isEnabled': true,
      isActive: true
    }).populate('userId', 'name email');
    
    if (!store) {
      console.log(`Store not found for slug: ${slug}`);
      return NextResponse.json(
        { error: 'Store not found or inactive' },
        { status: 404 }
      );
    }
    
    // Get store products
    const products = await Product.find({
      seller: store.userId._id,
      status: 'active'
    }).select('name description price images category inventory ratings');
    
    // Update website metrics (page view)
    await store.updateWebsiteMetrics(1, false);
    
    console.log(`Store found: ${store.storeName} with ${products.length} products`);
    
    // Return store data with products
    return NextResponse.json({
      ...store.toObject(),
      products: products
    });
    
  } catch (error) {
    console.error('Error fetching store:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
