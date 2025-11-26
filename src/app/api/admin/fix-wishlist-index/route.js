import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import mongoose from 'mongoose';

export async function GET() {
  try {
    await connectDB();
    
    const db = mongoose.connection.db;
    const collection = db.collection('wishlists');

    const results = [];

    // Get current indexes
    const currentIndexes = await collection.indexes();
    results.push({ step: 'current_indexes', data: currentIndexes });

    // Drop old shareCode_1 index
    try {
      await collection.dropIndex('shareCode_1');
      results.push({ step: 'drop_shareCode_1', success: true });
    } catch (error) {
      results.push({ step: 'drop_shareCode_1', error: error.message, code: error.code });
    }

    // Drop sparse version if exists
    try {
      await collection.dropIndex('shareCode_1_sparse');
      results.push({ step: 'drop_shareCode_1_sparse', success: true });
    } catch (error) {
      results.push({ step: 'drop_shareCode_1_sparse', error: error.message, code: error.code });
    }

    // Create new sparse index
    await collection.createIndex(
      { shareCode: 1 }, 
      { unique: true, sparse: true, name: 'shareCode_1_sparse' }
    );
    results.push({ step: 'create_sparse_index', success: true });

    // Get updated indexes
    const updatedIndexes = await collection.indexes();
    results.push({ step: 'updated_indexes', data: updatedIndexes });

    return NextResponse.json({
      success: true,
      message: 'Wishlist index fixed successfully',
      results
    });
  } catch (error) {
    console.error('Error fixing wishlist index:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
