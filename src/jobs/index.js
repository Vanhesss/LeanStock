const cron = require('node-cron');
const { deadStockQueue, reservationExpiryQueue } = require('../config/queue');
const { startEmailWorker } = require('../workers/emailWorker');
const { startDeadStockWorker } = require('../workers/deadStockWorker');
const { startReservationExpiryWorker } = require('../workers/reservationExpiryWorker');
const logger = require('../utils/logger');

/**
 * Start all background workers and cron schedules.
 *
 * Workers process jobs from Redis-backed BullMQ queues.
 * Cron schedules enqueue recurring jobs at fixed intervals.
 *
 * Schedule:
 *   - Dead stock decay: every 6 hours (0 *\/6 * * *)
 *   - Reservation expiry: every hour (0 * * * *)
 *   - Email: processed immediately when enqueued
 */
function startScheduledJobs() {
  // Start BullMQ workers
  startEmailWorker();
  startDeadStockWorker();
  startReservationExpiryWorker();

  // Dead stock decay — every 6 hours
  cron.schedule('0 */6 * * *', async () => {
    try {
      await deadStockQueue.add('scheduled-decay', { triggeredBy: 'cron' });
      logger.info('Dead stock decay job enqueued (cron)');
    } catch (error) {
      logger.error({ error }, 'Failed to enqueue dead stock decay job');
    }
  });

  // Reservation expiry — every hour
  cron.schedule('0 * * * *', async () => {
    try {
      await reservationExpiryQueue.add('scheduled-expiry', { triggeredBy: 'cron' });
      logger.info('Reservation expiry job enqueued (cron)');
    } catch (error) {
      logger.error({ error }, 'Failed to enqueue reservation expiry job');
    }
  });

  logger.info('Background workers started | Cron schedules: dead stock decay (6h), reservation expiry (1h)');
}

module.exports = { startScheduledJobs };
