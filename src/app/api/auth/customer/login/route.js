import { NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongodb";
import Customer from "@/models/Customer";
import { verifyPassword, createSession } from "@/lib/auth";

export async function POST(request) {
  try {
    await connectToDatabase();

    const body = await request.json();
    const { email, password } = body;

    console.log('Login attempt for email:', email);

    // Validation
    if (!email || !password) {
      return NextResponse.json(
        { success: false, message: "Email and password are required" },
        { status: 400 }
      );
    }

    // Find customer
    const customer = await Customer.findByEmail(email);

    if (!customer) {
      console.log('Customer not found:', email);
      return NextResponse.json(
        { success: false, message: "Invalid email or password" },
        { status: 401 }
      );
    }

    console.log('Customer found:', customer._id);

    // Check if account is locked
    if (customer.isLocked) {
      return NextResponse.json(
        { 
          success: false, 
          message: "Account is temporarily locked. Please try again later." 
        },
        { status: 403 }
      );
    }

    // Verify password
    const isPasswordValid = await verifyPassword(password, customer.password);

    if (!isPasswordValid) {
      console.log('Invalid password for:', email);
      await customer.incrementLoginAttempts();
      return NextResponse.json(
        { success: false, message: "Invalid email or password" },
        { status: 401 }
      );
    }

    console.log('Password verified for:', email);

    // Check if email is verified
    if (!customer.isVerified) {
      return NextResponse.json(
        { 
          success: false, 
          message: "Please verify your email before signing in",
          requiresVerification: true 
        },
        { status: 403 }
      );
    }

    // Update last login
    await customer.updateLastLogin();

    console.log('Creating session for customer:', customer._id);

    // Create response first
    const response = NextResponse.json(
      {
        success: true,
        message: "Login successful",
        customer: customer.toJSON()
      },
      { status: 200 }
    );

    // Create session and set cookie
    await createSession(customer._id.toString(), request, response);

    console.log('Session created and cookie set');

    return response;
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json(
      { success: false, message: "Login failed. Please try again." },
      { status: 500 }
    );
  }
}
