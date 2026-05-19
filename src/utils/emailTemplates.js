const { env } = require('../config/env');

function verificationEmail(firstName, code) {
  return {
    subject: `${code} — Your LeanStock verification code`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;padding:32px;">
        <h2 style="color:#1e293b;margin-bottom:8px;">Welcome to LeanStock, ${firstName}!</h2>
        <p style="color:#475569;">Enter this code to verify your email address:</p>
        <div style="text-align:center;margin:32px 0;">
          <span style="font-size:36px;font-weight:bold;letter-spacing:8px;color:#2563eb;background:#eff6ff;padding:16px 32px;border-radius:12px;display:inline-block;">${code}</span>
        </div>
        <p style="color:#64748b;font-size:14px;">This code expires in 15 minutes. If you didn't create a LeanStock account, you can safely ignore this email.</p>
      </div>
    `,
  };
}

function passwordResetEmail(firstName, token) {
  const link = `${env.APP_URL}/api/v1/auth/reset-password?token=${token}`;
  return {
    subject: 'Reset your LeanStock password',
    html: `
      <h2>Password Reset Request</h2>
      <p>Hi ${firstName}, we received a request to reset your password.</p>
      <p><a href="${link}" style="padding:12px 24px;background:#2563eb;color:#fff;text-decoration:none;border-radius:6px;">Reset Password</a></p>
      <p>Or copy this link: ${link}</p>
      <p>This link expires in 1 hour. If you didn't request this, ignore this email.</p>
    `,
  };
}

function saleConfirmationEmail(staffEmail, saleDetails) {
  return {
    subject: `Sale Confirmed — ${saleDetails.sku}`,
    html: `
      <h2>Sale Recorded</h2>
      <p><strong>SKU:</strong> ${saleDetails.sku}</p>
      <p><strong>Quantity:</strong> ${saleDetails.quantity}</p>
      <p><strong>Total:</strong> $${(saleDetails.totalPrice / 100).toFixed(2)}</p>
      <p><strong>Location:</strong> ${saleDetails.locationName}</p>
      <p><strong>Date:</strong> ${new Date().toISOString()}</p>
    `,
  };
}

function reservationCreatedEmail(staffEmail, reservation) {
  return {
    subject: `Reservation Created — ${reservation.customerName}`,
    html: `
      <h2>New Reservation</h2>
      <p><strong>Customer:</strong> ${reservation.customerName}</p>
      <p><strong>Phone:</strong> ${reservation.customerPhone || 'N/A'}</p>
      <p><strong>SKU:</strong> ${reservation.sku}</p>
      <p><strong>Quantity:</strong> ${reservation.quantity}</p>
      <p><strong>Expires:</strong> ${reservation.expiresAt}</p>
    `,
  };
}

function transferShippedEmail(managerEmail, transfer) {
  return {
    subject: `Transfer #${transfer.id.slice(0, 8)} Shipped`,
    html: `
      <h2>Transfer In Transit</h2>
      <p><strong>From:</strong> ${transfer.sourceLocation}</p>
      <p><strong>To:</strong> ${transfer.destLocation}</p>
      <p><strong>Items:</strong> ${transfer.itemCount} line items</p>
      <p>The transfer is now in transit and awaiting receipt confirmation.</p>
    `,
  };
}

module.exports = {
  verificationEmail,
  passwordResetEmail,
  saleConfirmationEmail,
  reservationCreatedEmail,
  transferShippedEmail,
};
