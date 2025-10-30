import { NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongodb";
import Customer from "@/models/Customer";
import { sendVerificationEmail } from "@/lib/email";

export async function POST(request) {
  try {
    await connectToDatabase();

    const body = await request.json();
    const { email } = body;

    if (!email) {
      return NextResponse.json(
        { success: false, message: "Email is required" },
        { status: 400 }
      );
    }

    const customer = await Customer.findOne({
      email: email.toLowerCase().trim(),
      isVerified: false,
    });

    if (!customer) {
      return NextResponse.json(
        { success: false, message: "Customer not found or already verified" },
        { status: 404 }
      );
    }

    // Generate new verification code
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    const verificationTokenExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    customer.verificationToken = verificationCode;
    customer.verificationTokenExpiry = verificationTokenExpiry;
    await customer.save();

    // Send verification email
    await sendVerificationEmail(email, customer.firstName, verificationCode);

    return NextResponse.json(
      {
        success: true,
        message: "Verification code sent successfully",
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Resend verification error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to resend verification code" },
      { status: 500 }
    );
  }
}
