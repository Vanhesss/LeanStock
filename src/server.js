const app = require('./app');
const { env } = require('./config/env');
const prisma = require('./config/prisma');
const redis = require('./config/redis');
const { startScheduledJobs } = require('./jobs');
const logger = require('./utils/logger');

async function main() {
  // Verify database connection
  try {
    await prisma.$connect();
    logger.info('✅ Database connected');
  } catch (error) {
    logger.error('❌ Database connection failed');
    process.exit(1);
  }

  // Verify Redis connection
  try {
    await redis.ping();
    logger.info('✅ Redis connected');
  } catch (error) {
    logger.error('❌ Redis connection failed');
    process.exit(1);
  }

  // Start scheduled jobs
  startScheduledJobs();

  // Start HTTP server
  const server = app.listen(env.PORT, () => {
    logger.info(`🚀 LeanStock API running on port ${env.PORT}`);
    logger.info(`📄 Swagger docs: http://localhost:${env.PORT}/docs`);
  });

  // Graceful shutdown
  const shutdown = async () => {
    logger.info('Shutting down...');
    server.close();
    await prisma.$disconnect();
    redis.disconnect();
    process.exit(0);
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

main();
