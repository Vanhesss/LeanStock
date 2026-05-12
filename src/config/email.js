const nodemailer = require('nodemailer');
const { env } = require('./env');
const logger = require('../utils/logger');

const transporter = nodemailer.createTransport({
  host: env.SMTP_HOST,
  port: env.SMTP_PORT,
  secure: env.SMTP_PORT === 465,
  auth: {
    user: env.SMTP_USER,
    pass: env.SMTP_PASS,
  },
});

/**
 * Send email asynchronously via BullMQ queue.
 * The API endpoint does NOT block waiting for the email service to respond.
 */
function sendEmail({ to, subject, html }) {
  // Lazy-require to avoid circular dependency
  const { emailQueue } = require('./queue');
  emailQueue.add('send-email', { to, subject, html }).catch((err) => {
    logger.error({ error: err.message, to, subject }, 'Failed to enqueue email');
  });
}

/**
 * Actually send email via SMTP (called by the email worker).
 */
async function deliverEmail({ to, subject, html }) {
  const mailOptions = {
    from: `"LeanStock" <${env.SMTP_FROM}>`,
    to,
    subject,
    html,
  };

  const info = await transporter.sendMail(mailOptions);
  logger.info({ messageId: info.messageId, to }, 'Email delivered');
  return info;
}

module.exports = { sendEmail, deliverEmail, transporter };
