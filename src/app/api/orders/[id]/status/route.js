import { NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongodb";
import Order from "@/models/Order";
import Store from "@/models/Store";
import { verifyCustomerSession } from "@/lib/auth";

export async function PATCH(request, { params }) {
  try {
    await connectToDatabase();

    const customerId = await verifyCustomerSession(request);
    if (!customerId) {
      return NextResponse.json(
        { success: false, message: "Authentication required" },
        { status: 401 }
      );
    }

    const { id } = await params;
    const { status, note = '' } = await request.json();

    const order = await Order.findOne({
      _id: id,
      customer: customerId
    });

    if (!order) {
      return NextResponse.json(
        { success: false, message: "Order not found" },
        { status: 404 }
      );
    }

    // Update order status
    await order.updateStatus(status, note, 'customer');

    // If order is being marked as delivered, we could update additional metrics
    if (status === 'delivered') {
      // Update store metrics for successful order completion
      const storeIds = [...new Set(order.items.map(item => item.store.toString()))];
      
      for (const storeId of storeIds) {
        await Store.findByIdAndUpdate(storeId, {
          $set: {
            'ivmaWebsite.metrics.lastVisit': new Date()
          }
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: "Order status updated successfully",
      order: {
        _id: order._id,
        orderNumber: order.orderNumber,
        status: order.status
      }
    });

  } catch (error) {
    console.error("Error updating order status:", error);
    return NextResponse.json(
      { success: false, message: "Failed to update order status" },
      { status: 500 }
    );
  }
}
