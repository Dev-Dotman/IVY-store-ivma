import { NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongodb";
import { verifyCustomerSession } from "@/lib/auth";
import Order from "@/models/Order";

export async function GET(request) {
  try {
    await connectToDatabase();

    const customerId = await verifyCustomerSession(request);
    if (!customerId) {
      return NextResponse.json(
        { success: false, message: "Authentication required" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page')) || 1;
    const limit = parseInt(searchParams.get('limit')) || 10;
    const skip = (page - 1) * limit;

    // Handle multiple status filters
    const statusParams = searchParams.getAll('status');
    console.log('Status params received:', statusParams);

    // Build query
    const query = { customer: customerId };

    if (statusParams.length > 0) {
      query.status = { $in: statusParams };
    }

    console.log('Final query:', JSON.stringify(query));

    // Fetch orders with pagination
    const orders = await Order.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('items.store', 'storeName storePhone storeEmail')
      .populate('items.product', 'productName sku image')
      .lean();

    console.log(`Found ${orders.length} orders for customer ${customerId}`);

    // Get total count for pagination
    const totalOrders = await Order.countDocuments(query);

    // Get order statistics
    const stats = await Order.getOrderStats(customerId);

    // Calculate pagination info
    const totalPages = Math.ceil(totalOrders / limit);
    const pagination = {
      currentPage: page,
      totalPages,
      totalItems: totalOrders,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1
    };

    return NextResponse.json({
      success: true,
      orders,
      stats,
      pagination
    });
  } catch (error) {
    console.error("Error fetching orders:", error);
    return NextResponse.json(
      { success: false, message: "Failed to fetch orders" },
      { status: 500 }
    );
  }
}
