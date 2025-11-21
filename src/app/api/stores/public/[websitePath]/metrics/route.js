import { NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongodb";
import Store from "@/models/Store";

export async function POST(request, { params }) {
  try {
    await connectToDatabase();

    const { websitePath } = await params;
    const body = await request.json();
    const { views = 1, isOrder = false } = body;

    // Find and update store metrics
    const updateQuery = {
      $inc: {
        'ivmaWebsite.metrics.totalViews': views,
        'ivmaWebsite.metrics.monthlyViews': views
      },
      $set: {
        'ivmaWebsite.metrics.lastVisit': new Date()
      }
    };

    if (isOrder) {
      updateQuery.$inc['ivmaWebsite.metrics.totalOrders'] = 1;
    }

    await Store.findOneAndUpdate(
      {
        'ivmaWebsite.websitePath': websitePath,
        'ivmaWebsite.status': 'active',
        isActive: true
      },
      updateQuery
    );

    return NextResponse.json({
      success: true,
      message: "Metrics updated successfully"
    });

  } catch (error) {
    console.error("Error updating store metrics:", error);
    return NextResponse.json(
      { success: false, message: "Failed to update metrics" },
      { status: 500 }
    );
  }
}
