const { createWorker } = require('../config/queue');
const { runReservationExpiry } = require('../jobs/reservationExpiry');
const logger = require('../utils/logger');

function startReservationExpiryWorker() {
  const worker = createWorker('reservation-expiry', async (job) => {
    logger.info({ jobId: job.id }, 'Processing reservation expiry job');
    const result = await runReservationExpiry();
    return result;
  });

  logger.info('Reservation expiry worker started');
  return worker;
}

module.exports = { startReservationExpiryWorker };
