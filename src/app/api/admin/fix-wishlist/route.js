import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import mongoose from 'mongoose';

export async function GET(request) {
  try {
    await connectDB();
    
    const db = mongoose.connection.db;
    const collection = db.collection('wishlists');

    // Drop the problematic index
    try {
      await collection.dropIndex('shareCode_1');
      console.log('Dropped shareCode_1 index');
    } catch (error) {
      console.log('Index may not exist:', error.message);
    }

    // Create the new sparse index
    await collection.createIndex(
      { shareCode: 1 }, 
      { unique: true, sparse: true, name: 'shareCode_1_sparse' }
    );

    return NextResponse.json({
      success: true,
      message: 'Wishlist index fixed successfully'
    });
  } catch (error) {
    console.error('Error fixing wishlist index:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
