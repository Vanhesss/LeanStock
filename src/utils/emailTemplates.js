const { env } = require('../config/env');

function verificationEmail(firstName, token) {
  const link = `${env.APP_URL}/api/v1/auth/verify-email?token=${token}`;
  return {
    subject: 'Verify your LeanStock account',
    html: `
      <h2>Welcome to LeanStock, ${firstName}!</h2>
      <p>Please verify your email address by clicking the link below:</p>
      <p><a href="${link}" style="padding:12px 24px;background:#2563eb;color:#fff;text-decoration:none;border-radius:6px;">Verify Email</a></p>
      <p>Or copy this link: ${link}</p>
      <p>This link expires in 24 hours.</p>
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
