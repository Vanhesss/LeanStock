const nodemailer = require('nodemailer');
const { env } = require('./env');
const logger = require('../utils/logger');

let transporter;

function getTransporter() {
  if (transporter) return transporter;

  const gmailUser = (env.GMAIL_USER || '').trim();
  const gmailPass = (env.GMAIL_AP || '').trim();

  logger.info(
    { user: gmailUser, passLen: gmailPass.length, passPreview: gmailPass.slice(0, 4) },
    'Creating Gmail transporter',
  );

  transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: {
      user: gmailUser,
      pass: gmailPass,
    },
  });

  return transporter;
}

/**
 * Send email — tries BullMQ queue first, falls back to direct delivery.
 */
function sendEmail({ to, subject, html }) {
  try {
    const { emailQueue } = require('./queue');
    emailQueue.add('send-email', { to, subject, html }).catch((err) => {
      logger.warn({ error: err.message, to, subject }, 'Queue failed, sending email directly');
      deliverEmail({ to, subject, html }).catch((e) => {
        logger.error({ error: e.message, to, subject }, 'Direct email delivery also failed');
      });
    });
  } catch (err) {
    logger.warn({ error: err.message, to }, 'Queue unavailable, sending email directly');
    deliverEmail({ to, subject, html }).catch((e) => {
      logger.error({ error: e.message, to, subject }, 'Direct email delivery failed');
    });
  }
}

/**
 * Actually send email via Gmail OAuth2 (called by the email worker).
 */
async function deliverEmail({ to, subject, html }) {
  const mailOptions = {
    from: `"LeanStock" <${(env.GMAIL_USER || '').trim()}>`,
    to,
    subject,
    html,
  };

  const info = await getTransporter().sendMail(mailOptions);
  logger.info({ messageId: info.messageId, to }, 'Email delivered');
  return info;
}

module.exports = { sendEmail, deliverEmail, getTransporter };
