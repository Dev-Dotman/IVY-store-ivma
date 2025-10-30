import { NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongodb";
import { verifyCustomerSession } from "@/lib/auth";
import Wishlist from "@/models/Wishlist";
import Inventory from "@/models/Inventory";
import Store from "@/models/Store";
import Customer from "@/models/Customer";

// GET - Fetch customer's wishlist
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

    let wishlist = await Wishlist.getCustomerWishlist(customerId);
    
    if (!wishlist) {
      // Create a default wishlist if none exists
      const customer = await Customer.findById(customerId);
      const customerSnapshot = {
        firstName: customer.firstName,
        lastName: customer.lastName,
        email: customer.email,
        phone: customer.phone
      };
      
      wishlist = await Wishlist.createWishlist(customerId, customerSnapshot);
    }

    return NextResponse.json({
      success: true,
      wishlist
    });
  } catch (error) {
    console.error("Error fetching wishlist:", error);
    return NextResponse.json(
      { success: false, message: "Failed to fetch wishlist" },
      { status: 500 }
    );
  }
}

// POST - Add item to wishlist
export async function POST(request) {
  try {
    await connectToDatabase();
    
    const customerId = await verifyCustomerSession(request);
    if (!customerId) {
      return NextResponse.json(
        { success: false, message: "Authentication required" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { productId, priority = 'medium', notes = '', notifications = {} } = body;

    if (!productId) {
      return NextResponse.json(
        { success: false, message: "Product ID is required" },
        { status: 400 }
      );
    }

    // Get product details
    const product = await Inventory.findById(productId);
    if (!product) {
      return NextResponse.json(
        { success: false, message: "Product not found" },
        { status: 404 }
      );
    }

    // Get store details
    const store = await Store.findOne({ userId: product.userId });
    if (!store) {
      return NextResponse.json(
        { success: false, message: "Store not found" },
        { status: 404 }
      );
    }

    // Get customer's wishlist or create one
    let wishlist = await Wishlist.findOne({ customer: customerId });
    
    if (!wishlist) {
      const customer = await Customer.findById(customerId);
      const customerSnapshot = {
        firstName: customer.firstName,
        lastName: customer.lastName,
        email: customer.email,
        phone: customer.phone
      };
      
      wishlist = await Wishlist.createWishlist(customerId, customerSnapshot);
    }

    // Add item to wishlist
    await wishlist.addItem(product, store, product.userId, {
      priority,
      notes,
      notifications
    });

    return NextResponse.json({
      success: true,
      message: "Item added to wishlist",
      wishlist
    });
  } catch (error) {
    console.error("Error adding to wishlist:", error);
    return NextResponse.json(
      { success: false, message: "Failed to add item to wishlist" },
      { status: 500 }
    );
  }
}

// PUT - Update wishlist settings
export async function PUT(request) {
  try {
    await connectToDatabase();
    
    const customerId = await verifyCustomerSession(request);
    if (!customerId) {
      return NextResponse.json(
        { success: false, message: "Authentication required" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { name, description, isPublic } = body;

    const wishlist = await Wishlist.findOne({ customer: customerId });
    if (!wishlist) {
      return NextResponse.json(
        { success: false, message: "Wishlist not found" },
        { status: 404 }
      );
    }

    // Update wishlist properties
    if (name !== undefined) wishlist.name = name;
    if (description !== undefined) wishlist.description = description;
    if (isPublic !== undefined) {
      if (isPublic) {
        await wishlist.makePublic();
      } else {
        await wishlist.makePrivate();
      }
    } else {
      await wishlist.save();
    }

    return NextResponse.json({
      success: true,
      message: "Wishlist updated successfully",
      wishlist
    });
  } catch (error) {
    console.error("Error updating wishlist:", error);
    return NextResponse.json(
      { success: false, message: "Failed to update wishlist" },
      { status: 500 }
    );
  }
}
