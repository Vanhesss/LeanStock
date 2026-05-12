const { createWorker } = require('../config/queue');
const { deliverEmail } = require('../config/email');
const logger = require('../utils/logger');

function startEmailWorker() {
  const worker = createWorker('email', async (job) => {
    const { to, subject, html } = job.data;
    logger.info({ to, subject, jobId: job.id }, 'Processing email job');
    await deliverEmail({ to, subject, html });
    return { to, subject, deliveredAt: new Date().toISOString() };
  }, { concurrency: 3 });

  logger.info('Email worker started (concurrency: 3)');
  return worker;
}

module.exports = { startEmailWorker };
