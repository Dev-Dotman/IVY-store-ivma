import { NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongodb";
import Customer from "@/models/Customer";
import { createSession } from "@/lib/auth";
import { sendWelcomeEmail } from "@/lib/email";

export async function POST(request) {
  try {
    await connectToDatabase();

    const body = await request.json();
    const { email, code } = body;

    if (!email || !code) {
      return NextResponse.json(
        { success: false, message: "Email and verification code are required" },
        { status: 400 }
      );
    }

    const customer = await Customer.findOne({
      email: email.toLowerCase().trim(),
      verificationToken: code,
      verificationTokenExpiry: { $gt: new Date() },
    });

    if (!customer) {
      return NextResponse.json(
        { success: false, message: "Invalid or expired verification code" },
        { status: 400 }
      );
    }

    // Verify customer
    customer.isVerified = true;
    customer.verificationToken = null;
    customer.verificationTokenExpiry = null;
    await customer.save();

    // Send welcome email
    await sendWelcomeEmail(customer.email, customer.firstName);

    // Create session
    const response = NextResponse.json(
      {
        success: true,
        message: "Email verified successfully",
        customer: customer.toJSON(),
      },
      { status: 200 }
    );

    await createSession(customer._id.toString(), request, response);

    return response;
  } catch (error) {
    console.error("Verification error:", error);
    return NextResponse.json(
      { success: false, message: "Verification failed. Please try again." },
      { status: 500 }
    );
  }
}
