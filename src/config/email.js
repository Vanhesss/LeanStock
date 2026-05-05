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
 * Send email asynchronously (fire-and-forget).
 * Does not block the caller — logs errors instead of throwing.
 */
function sendEmail({ to, subject, html }) {
  const mailOptions = {
    from: `"LeanStock" <${env.SMTP_FROM}>`,
    to,
    subject,
    html,
  };

  // Fire-and-forget: don't await, just log result
  transporter.sendMail(mailOptions).then((info) => {
    logger.info({ messageId: info.messageId, to }, 'Email sent');
  }).catch((error) => {
    logger.error({ error: error.message, to, subject }, 'Email send failed');
  });
}

module.exports = { sendEmail, transporter };
