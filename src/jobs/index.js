const cron = require('node-cron');
const { runDeadStockDecay } = require('./deadStockDecay');
const logger = require('../utils/logger');

function startScheduledJobs() {
  // Dead stock decay — every 6 hours
  cron.schedule('0 */6 * * *', async () => {
    try {
      await runDeadStockDecay();
    } catch (error) {
      logger.error({ error }, 'Dead stock decay job failed');
    }
  });

  logger.info('📅 Scheduled jobs started');
}

module.exports = { startScheduledJobs };
