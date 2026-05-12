const { Queue, Worker, QueueEvents } = require('bullmq');
const { env } = require('./env');
const logger = require('../utils/logger');

const isTest = env.NODE_ENV === 'test' || Boolean(process.env.JEST_WORKER_ID);

// Parse Redis URL for BullMQ connection config
function parseRedisUrl(url) {
  try {
    const parsed = new URL(url);
    return {
      host: parsed.hostname,
      port: Number(parsed.port) || 6379,
      password: parsed.password || undefined,
    };
  } catch {
    return { host: '127.0.0.1', port: 6379 };
  }
}

const connection = parseRedisUrl(env.REDIS_URL);

// In-memory queue for test environment
class MemoryQueue {
  constructor(name) {
    this.name = name;
    this.jobs = [];
    this.processor = null;
  }
  async add(jobName, data, opts) {
    const job = { id: `${this.name}-${Date.now()}`, name: jobName, data, opts, status: 'completed', returnvalue: null, failedReason: null, timestamp: Date.now() };
    if (this.processor) {
      try {
        job.returnvalue = await this.processor(job);
      } catch (err) {
        job.status = 'failed';
        job.failedReason = err.message;
      }
    }
    this.jobs.push(job);
    return job;
  }
  async getJobs(statuses) {
    if (!statuses) return this.jobs;
    return this.jobs.filter((j) => statuses.includes(j.status));
  }
  async getJobCounts() {
    const counts = { completed: 0, failed: 0, waiting: 0, active: 0, delayed: 0 };
    for (const j of this.jobs) counts[j.status] = (counts[j.status] || 0) + 1;
    return counts;
  }
  async close() {}
  async obliterate() { this.jobs = []; }
}

class MemoryWorker {
  constructor(name, processor) {
    this.name = name;
    this.processor = processor;
    // Link to queue's processor
    if (queues[name]) queues[name].processor = processor;
  }
  on() { return this; }
  async close() {}
}

const queues = {};

function createQueue(name) {
  if (queues[name]) return queues[name];
  if (isTest) {
    queues[name] = new MemoryQueue(name);
  } else {
    queues[name] = new Queue(name, { connection });
  }
  return queues[name];
}

function createWorker(name, processor, opts = {}) {
  if (isTest) {
    const worker = new MemoryWorker(name, processor);
    return worker;
  }
  const worker = new Worker(name, processor, { connection, ...opts });
  worker.on('completed', (job) => {
    logger.info({ queue: name, jobId: job.id, jobName: job.name }, 'Job completed');
  });
  worker.on('failed', (job, err) => {
    logger.error({ queue: name, jobId: job?.id, jobName: job?.name, error: err.message }, 'Job failed');
  });
  return worker;
}

// Pre-create standard queues
const emailQueue = createQueue('email');
const deadStockQueue = createQueue('dead-stock-decay');
const reservationExpiryQueue = createQueue('reservation-expiry');

function getQueues() {
  return { email: emailQueue, 'dead-stock-decay': deadStockQueue, 'reservation-expiry': reservationExpiryQueue };
}

module.exports = {
  createQueue,
  createWorker,
  emailQueue,
  deadStockQueue,
  reservationExpiryQueue,
  getQueues,
  connection,
};
