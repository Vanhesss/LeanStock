const nodemailer = require('nodemailer');
const { env } = require('./env');
const logger = require('../utils/logger');

let transporter;

function getTransporter() {
  if (transporter) return transporter;

  const gmailUser = (env.GMAIL_USER || '').trim();
  const gmailPass = (env.GMAIL_AP || '').trim();

  logger.info(
    { user: gmailUser, passLen: gmailPass.length },
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
 * Send email directly via SMTP (no queue dependency).
 */
function sendEmail({ to, subject, html }) {
  deliverEmail({ to, subject, html }).catch((e) => {
    logger.error({ error: e.message, to, subject }, 'Email delivery failed');
  });
}

/**
 * Actually send email via Gmail SMTP.
 */
async function deliverEmail({ to, subject, html }) {
  const mailOptions = {
    from: `"LeanStock" <${(env.GMAIL_USER || '').trim()}>`,
    to,
    subject,
    html,
  };

  logger.info({ to, subject }, 'Sending email...');
  const info = await getTransporter().sendMail(mailOptions);
  logger.info({ messageId: info.messageId, to }, 'Email delivered');
  return info;
}

module.exports = { sendEmail, deliverEmail, getTransporter };
