import { NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongodb";
import Cart from "@/models/Cart";
import Inventory from "@/models/Inventory";
import Store from "@/models/Store";
import { verifyCustomerSession } from "@/lib/auth";

// POST - Add item to cart
export async function POST(request) {
  try {
    await connectToDatabase();

    const customerId = await verifyCustomerSession(request);

    if (!customerId) {
      console.log('Add to cart: No valid customer session');
      return NextResponse.json(
        { success: false, message: "Please sign in to add items to cart" },
        { status: 401 }
      );
    }

    console.log('Add to cart: Customer ID:', customerId);

    const body = await request.json();
    const { productId, quantity, notes } = body;

    // Validate input
    if (!productId || !quantity || quantity < 1) {
      return NextResponse.json(
        { success: false, message: "Invalid product or quantity" },
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

    // Check product availability
    if (!product.webVisibility || product.status !== 'Active') {
      return NextResponse.json(
        { success: false, message: "Product is not available" },
        { status: 400 }
      );
    }

    // Check stock availability
    if (product.quantityInStock < quantity) {
      return NextResponse.json(
        { 
          success: false, 
          message: `Only ${product.quantityInStock} items available in stock`,
          availableQuantity: product.quantityInStock
        },
        { status: 400 }
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

    // Get or create cart
    let cart = await Cart.findOne({ customer: customerId });

    if (!cart) {
      cart = await Cart.create({ customer: customerId });
    }

    // Prepare item data
    const itemData = {
      product: product._id,
      quantity,
      price: product.sellingPrice,
      store: store._id,
      productSnapshot: {
        productName: product.productName,
        sku: product.sku,
        category: product.category,
        image: product.image,
        unitOfMeasure: product.unitOfMeasure
      },
      storeSnapshot: {
        storeName: store.storeName,
        storeSlug: store.storeSlug
      },
      notes: notes || ''
    };

    // Add item to cart
    await cart.addItem(itemData);

    // Populate cart before returning
    await cart.populate([
      { path: 'items.product', select: 'productName sku quantityInStock sellingPrice image' },
      { path: 'items.store', select: 'storeName storeSlug branding' }
    ]);

    return NextResponse.json({
      success: true,
      message: "Item added to cart successfully",
      cart
    });
  } catch (error) {
    console.error("Error adding item to cart:", error);
    return NextResponse.json(
      { success: false, message: "Failed to add item to cart" },
      { status: 500 }
    );
  }
}
