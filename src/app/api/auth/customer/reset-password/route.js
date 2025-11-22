import { NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongodb";
import Customer from "@/models/Customer";
import { hashPassword } from "@/lib/auth";
import crypto from "crypto";

export async function POST(request) {
  try {
    await connectToDatabase();

    const { token, password } = await request.json();

    // Validation
    if (!token || !password) {
      return NextResponse.json(
        { success: false, message: "Token and password are required" },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { success: false, message: "Password must be at least 8 characters long" },
        { status: 400 }
      );
    }

    // Hash the token to compare with stored hash
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    // Find customer with valid token
    const customer = await Customer.findOne({
      passwordResetToken: hashedToken,
      passwordResetExpiry: { $gt: Date.now() },
      isActive: true
    });

    if (!customer) {
      return NextResponse.json(
        { 
          success: false, 
          message: "Invalid or expired reset token. Please request a new password reset link." 
        },
        { status: 400 }
      );
    }

    // Hash new password
    const hashedPassword = await hashPassword(password);

    // Update password and clear reset token
    customer.password = hashedPassword;
    customer.passwordResetToken = null;
    customer.passwordResetExpiry = null;
    customer.loginAttempts = 0;
    customer.lockUntil = null;
    await customer.save();

    return NextResponse.json(
      { 
        success: true, 
        message: "Password reset successful! You can now sign in with your new password." 
      },
      { status: 200 }
    );

  } catch (error) {
    console.error("Reset password error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to reset password. Please try again." },
      { status: 500 }
    );
  }
}
