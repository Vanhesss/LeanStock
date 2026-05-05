const cron = require('node-cron');
const { runDeadStockDecay } = require('./deadStockDecay');
const { runReservationExpiry } = require('./reservationExpiry');
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

  // Reservation expiry — every hour
  cron.schedule('0 * * * *', async () => {
    try {
      await runReservationExpiry();
    } catch (error) {
      logger.error({ error }, 'Reservation expiry job failed');
    }
  });

  logger.info('Scheduled jobs started (dead stock decay: 6h, reservation expiry: 1h)');
}

module.exports = { startScheduledJobs };
