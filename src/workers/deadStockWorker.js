const { createWorker } = require('../config/queue');
const { runDeadStockDecay } = require('../jobs/deadStockDecay');
const logger = require('../utils/logger');

function startDeadStockWorker() {
  const worker = createWorker('dead-stock-decay', async (job) => {
    logger.info({ jobId: job.id }, 'Processing dead stock decay job');
    const result = await runDeadStockDecay();
    return result;
  });

  logger.info('Dead stock decay worker started');
  return worker;
}

module.exports = { startDeadStockWorker };
