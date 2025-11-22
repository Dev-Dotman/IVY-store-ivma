import nodemailer from 'nodemailer';

// Create transporter
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: parseInt(process.env.EMAIL_PORT),
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
});

// Verify transporter configuration
export async function verifyEmailConnection() {
  try {
    await transporter.verify();
    console.log('Email server is ready');
    return true;
  } catch (error) {
    console.error('Email server error:', error);
    return false;
  }
}

// Send verification email
export async function sendVerificationEmail(email, firstName, verificationCode) {
  const mailOptions = {
    from: process.env.EMAIL_FROM,
    to: email,
    subject: 'Verify Your IVMA Store Account',
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #0D9488 0%, #059669 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
            .code-box { background: white; border: 2px solid #0D9488; border-radius: 8px; padding: 20px; text-align: center; margin: 20px 0; }
            .code { font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #0D9488; }
            .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
            .button { display: inline-block; padding: 12px 30px; background: #0D9488; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Welcome to IVMA Store! 🎉</h1>
            </div>
            <div class="content">
              <p>Hi ${firstName},</p>
              <p>Thank you for signing up! To complete your registration, please verify your email address using the code below:</p>
              
              <div class="code-box">
                <div class="code">${verificationCode}</div>
              </div>
              
              <p>This code will expire in <strong>10 minutes</strong>.</p>
              
              <p>If you didn't create an account with IVMA Store, please ignore this email.</p>
              
              <p>Best regards,<br>The IVMA Store Team</p>
            </div>
            <div class="footer">
              <p>© ${new Date().getFullYear()} IVMA Store. All rights reserved.</p>
              <p>This is an automated email. Please do not reply.</p>
            </div>
          </div>
        </body>
      </html>
    `,
    text: `Hi ${firstName},\n\nThank you for signing up! Your verification code is: ${verificationCode}\n\nThis code will expire in 10 minutes.\n\nIf you didn't create an account with IVMA Store, please ignore this email.\n\nBest regards,\nThe IVMA Store Team`,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('Verification email sent:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Error sending verification email:', error);
    return { success: false, error: error.message };
  }
}

// Send welcome email
export async function sendWelcomeEmail(email, firstName) {
  const mailOptions = {
    from: process.env.EMAIL_FROM,
    to: email,
    subject: 'Welcome to IVMA Store!',
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #0D9488 0%, #059669 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
            .button { display: inline-block; padding: 12px 30px; background: #0D9488; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Welcome Aboard! 🎉</h1>
            </div>
            <div class="content">
              <p>Hi ${firstName},</p>
              <p>Your email has been verified successfully! You're now part of the IVMA Store community.</p>
              <p>Start exploring amazing products from local artisans and vendors.</p>
              <a href="${process.env.NEXTAUTH_URL}" class="button">Start Shopping</a>
              <p>If you have any questions, feel free to reach out to our support team.</p>
              <p>Happy shopping!<br>The IVMA Store Team</p>
            </div>
            <div class="footer">
              <p>© ${new Date().getFullYear()} IVMA Store. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Error sending welcome email:', error);
    return { success: false, error: error.message };
  }
}

// Send password reset email
export async function sendPasswordResetEmail(email, name, resetUrl, expiryMinutes) {
  const mailOptions = {
    from: process.env.EMAIL_FROM || 'noreply@ivmastore.com',
    to: email,
    subject: 'Reset Your Password - IVMA Store',
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Reset Your Password</title>
        </head>
        <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f5f5f5;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 20px;">
            <tr>
              <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                  
                  <!-- Header -->
                  <tr>
                    <td style="background: linear-gradient(135deg, #0D9488 0%, #14B8A6 100%); padding: 40px 30px; text-align: center;">
                      <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: bold;">🔒 Password Reset</h1>
                    </td>
                  </tr>
                  
                  <!-- Content -->
                  <tr>
                    <td style="padding: 40px 30px;">
                      <p style="margin: 0 0 20px; font-size: 16px; color: #333333; line-height: 1.6;">
                        Hi ${name},
                      </p>
                      
                      <p style="margin: 0 0 20px; font-size: 16px; color: #333333; line-height: 1.6;">
                        We received a request to reset your password for your IVMA Store account. Click the button below to create a new password:
                      </p>
                      
                      <!-- Reset Button -->
                      <table width="100%" cellpadding="0" cellspacing="0" style="margin: 30px 0;">
                        <tr>
                          <td align="center">
                            <a href="${resetUrl}" 
                               style="display: inline-block; padding: 16px 40px; background-color: #0D9488; color: #ffffff; text-decoration: none; border-radius: 8px; font-size: 16px; font-weight: bold;">
                              Reset Password
                            </a>
                          </td>
                        </tr>
                      </table>
                      
                      <p style="margin: 20px 0; font-size: 14px; color: #666666; line-height: 1.6;">
                        Or copy and paste this link into your browser:
                      </p>
                      
                      <p style="margin: 0 0 20px; padding: 12px; background-color: #f5f5f5; border-radius: 4px; font-size: 12px; color: #666666; word-break: break-all;">
                        ${resetUrl}
                      </p>
                      
                      <div style="margin: 30px 0; padding: 16px; background-color: #FEF3C7; border-left: 4px solid #F59E0B; border-radius: 4px;">
                        <p style="margin: 0; font-size: 14px; color: #92400E; line-height: 1.6;">
                          <strong>⏱️ Important:</strong> This link will expire in ${expiryMinutes} minutes for security reasons.
                        </p>
                      </div>
                      
                      <p style="margin: 20px 0 0; font-size: 14px; color: #666666; line-height: 1.6;">
                        If you didn't request a password reset, please ignore this email. Your password will remain unchanged.
                      </p>
                    </td>
                  </tr>
                  
                  <!-- Footer -->
                  <tr>
                    <td style="background-color: #f5f5f5; padding: 30px; text-align: center; border-top: 1px solid #e5e5e5;">
                      <p style="margin: 0 0 10px; font-size: 14px; color: #666666;">
                        Need help? Contact us at 
                        <a href="mailto:support@ivmastore.com" style="color: #0D9488; text-decoration: none;">support@ivmastore.com</a>
                      </p>
                      <p style="margin: 0; font-size: 12px; color: #999999;">
                        © ${new Date().getFullYear()} IVMA Store. All rights reserved.
                      </p>
                    </td>
                  </tr>
                  
                </table>
              </td>
            </tr>
          </table>
        </body>
      </html>
    `,
    text: `
Hi ${name},

We received a request to reset your password for your IVMA Store account.

Click the link below to reset your password:
${resetUrl}

This link will expire in ${expiryMinutes} minutes for security reasons.

If you didn't request a password reset, please ignore this email. Your password will remain unchanged.

Need help? Contact us at support@ivmastore.com

© ${new Date().getFullYear()} IVMA Store. All rights reserved.
    `.trim()
  };

  return await transporter.sendMail(mailOptions);
}

// Send new order notification to store owner
export async function sendNewOrderNotification(storeEmail, storeName, order) {
  const mailOptions = {
    from: process.env.EMAIL_FROM || 'noreply@ivmastore.com',
    to: storeEmail,
    subject: `New Order #${order.orderNumber} - ${storeName}`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>New Order Notification</title>
        </head>
        <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f5f5f5;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 20px;">
            <tr>
              <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                  
                  <!-- Header -->
                  <tr>
                    <td style="background: linear-gradient(135deg, #0D9488 0%, #14B8A6 100%); padding: 40px 30px; text-align: center;">
                      <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: bold;">🎉 New Order Received!</h1>
                    </td>
                  </tr>
                  
                  <!-- Content -->
                  <tr>
                    <td style="padding: 40px 30px;">
                      <p style="margin: 0 0 20px; font-size: 16px; color: #333333; line-height: 1.6;">
                        Hi ${storeName},
                      </p>
                      
                      <p style="margin: 0 0 20px; font-size: 16px; color: #333333; line-height: 1.6;">
                        Great news! You have received a new order through your IVMA store.
                      </p>
                      
                      <!-- Order Details Box -->
                      <div style="margin: 30px 0; padding: 20px; background-color: #F0FDFA; border-left: 4px solid #0D9488; border-radius: 4px;">
                        <h2 style="margin: 0 0 15px; font-size: 18px; color: #0D9488;">Order Details</h2>
                        <table width="100%" cellpadding="5" cellspacing="0">
                          <tr>
                            <td style="font-size: 14px; color: #666666; padding: 5px 0;">Order Number:</td>
                            <td style="font-size: 14px; color: #333333; font-weight: bold; padding: 5px 0;">#${order.orderNumber}</td>
                          </tr>
                          <tr>
                            <td style="font-size: 14px; color: #666666; padding: 5px 0;">Customer:</td>
                            <td style="font-size: 14px; color: #333333; padding: 5px 0;">${order.customerSnapshot.firstName} ${order.customerSnapshot.lastName}</td>
                          </tr>
                          <tr>
                            <td style="font-size: 14px; color: #666666; padding: 5px 0;">Phone:</td>
                            <td style="font-size: 14px; color: #333333; padding: 5px 0;">${order.customerSnapshot.phone}</td>
                          </tr>
                          <tr>
                            <td style="font-size: 14px; color: #666666; padding: 5px 0;">Total Items:</td>
                            <td style="font-size: 14px; color: #333333; padding: 5px 0;">${order.storeItemCount}</td>
                          </tr>
                          <tr>
                            <td style="font-size: 14px; color: #666666; padding: 5px 0;">Order Total:</td>
                            <td style="font-size: 18px; color: #0D9488; font-weight: bold; padding: 5px 0;">₦${order.storeTotal.toLocaleString()}</td>
                          </tr>
                        </table>
                      </div>

                      <!-- Items List -->
                      <h3 style="margin: 20px 0 15px; font-size: 16px; color: #333333;">Ordered Items:</h3>
                      <table width="100%" cellpadding="10" cellspacing="0" style="border: 1px solid #e5e5e5; border-radius: 4px;">
                        <thead>
                          <tr style="background-color: #f9f9f9;">
                            <th style="text-align: left; font-size: 12px; color: #666666; padding: 10px;">Product</th>
                            <th style="text-align: center; font-size: 12px; color: #666666; padding: 10px;">Qty</th>
                            <th style="text-align: right; font-size: 12px; color: #666666; padding: 10px;">Price</th>
                          </tr>
                        </thead>
                        <tbody>
                          ${order.storeItems.map(item => `
                            <tr style="border-top: 1px solid #e5e5e5;">
                              <td style="font-size: 14px; color: #333333; padding: 10px;">${item.productSnapshot.productName}</td>
                              <td style="text-align: center; font-size: 14px; color: #333333; padding: 10px;">${item.quantity}</td>
                              <td style="text-align: right; font-size: 14px; color: #333333; padding: 10px;">₦${item.subtotal.toLocaleString()}</td>
                            </tr>
                          `).join('')}
                        </tbody>
                      </table>

                      <!-- Shipping Address -->
                      <div style="margin: 30px 0; padding: 20px; background-color: #f9f9f9; border-radius: 4px;">
                        <h3 style="margin: 0 0 10px; font-size: 16px; color: #333333;">📍 Delivery Address</h3>
                        <p style="margin: 0; font-size: 14px; color: #666666; line-height: 1.6;">
                          ${order.shippingAddress.firstName} ${order.shippingAddress.lastName}<br>
                          ${order.shippingAddress.city}, ${order.shippingAddress.state}<br>
                          Phone: ${order.shippingAddress.phone}
                        </p>
                      </div>

                      ${order.customerNotes ? `
                      <div style="margin: 20px 0; padding: 15px; background-color: #FEF3C7; border-left: 4px solid #F59E0B; border-radius: 4px;">
                        <h3 style="margin: 0 0 10px; font-size: 14px; color: #92400E;">📝 Customer Notes:</h3>
                        <p style="margin: 0; font-size: 14px; color: #92400E; line-height: 1.6;">${order.customerNotes}</p>
                      </div>
                      ` : ''}

                      <!-- Action Button -->
                      <table width="100%" cellpadding="0" cellspacing="0" style="margin: 30px 0;">
                        <tr>
                          <td align="center">
                            <a href="${process.env.NEXT_PUBLIC_BASE_URL || 'https://ivma.ng'}/dashboard/orders/${order._id}" 
                               style="display: inline-block; padding: 16px 40px; background-color: #0D9488; color: #ffffff; text-decoration: none; border-radius: 8px; font-size: 16px; font-weight: bold;">
                              View Order Details
                            </a>
                          </td>
                        </tr>
                      </table>

                      <div style="margin: 30px 0; padding: 16px; background-color: #DBEAFE; border-left: 4px solid #3B82F6; border-radius: 4px;">
                        <p style="margin: 0; font-size: 14px; color: #1E40AF; line-height: 1.6;">
                          <strong>💡 Next Steps:</strong><br>
                          1. Contact the customer via WhatsApp to confirm the order<br>
                          2. Prepare the items for delivery<br>
                          3. Update the order status in your dashboard<br>
                          4. Arrange delivery or pickup with the customer
                        </p>
                      </div>
                      
                      <p style="margin: 20px 0 0; font-size: 14px; color: #666666; line-height: 1.6;">
                        Thank you for using IVMA Store to manage your business!
                      </p>
                    </td>
                  </tr>
                  
                  <!-- Footer -->
                  <tr>
                    <td style="background-color: #f5f5f5; padding: 30px; text-align: center; border-top: 1px solid #e5e5e5;">
                      <p style="margin: 0 0 10px; font-size: 14px; color: #666666;">
                        Need help? Contact us at 
                        <a href="mailto:support@ivmastore.com" style="color: #0D9488; text-decoration: none;">support@ivmastore.com</a>
                      </p>
                      <p style="margin: 0; font-size: 12px; color: #999999;">
                        © ${new Date().getFullYear()} IVMA Store. All rights reserved.
                      </p>
                    </td>
                  </tr>
                  
                </table>
              </td>
            </tr>
          </table>
        </body>
      </html>
    `,
    text: `
Hi ${storeName},

Great news! You have received a new order through your IVMA store.

Order Details:
- Order Number: #${order.orderNumber}
- Customer: ${order.customerSnapshot.firstName} ${order.customerSnapshot.lastName}
- Phone: ${order.customerSnapshot.phone}
- Total Items: ${order.storeItemCount}
- Order Total: ₦${order.storeTotal.toLocaleString()}

Ordered Items:
${order.storeItems.map(item => `- ${item.productSnapshot.productName} (${item.quantity}x) - ₦${item.subtotal.toLocaleString()}`).join('\n')}

Delivery Address:
${order.shippingAddress.firstName} ${order.shippingAddress.lastName}
${order.shippingAddress.city}, ${order.shippingAddress.state}
Phone: ${order.shippingAddress.phone}

${order.customerNotes ? `Customer Notes: ${order.customerNotes}\n` : ''}

Next Steps:
1. Contact the customer via WhatsApp to confirm the order
2. Prepare the items for delivery
3. Update the order status in your dashboard
4. Arrange delivery or pickup with the customer

View full order details: ${process.env.NEXT_PUBLIC_BASE_URL || 'https://ivma.ng'}/dashboard/orders/${order._id}

Thank you for using IVMA Store!

© ${new Date().getFullYear()} IVMA Store. All rights reserved.
    `.trim()
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`Order notification sent to ${storeEmail}:`, info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error(`Error sending order notification to ${storeEmail}:`, error);
    return { success: false, error: error.message };
  }
}
