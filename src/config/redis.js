const Redis = require('ioredis');
const { env } = require('./env');

class MemoryRedis {
  constructor() {
    this.store = new Map();
    this.expirations = new Map();
  }

  on() {}

  disconnect() {}

  async ping() {
    return 'PONG';
  }

  purgeExpired(key) {
    const expiresAt = this.expirations.get(key);
    if (expiresAt && expiresAt <= Date.now()) {
      this.store.delete(key);
      this.expirations.delete(key);
    }
  }

  async get(key) {
    this.purgeExpired(key);
    return this.store.has(key) ? this.store.get(key) : null;
  }

  async set(key, value, mode, ttlSeconds) {
    this.store.set(key, String(value));

    if (mode === 'EX' && Number.isFinite(ttlSeconds)) {
      this.expirations.set(key, Date.now() + ttlSeconds * 1000);
    } else {
      this.expirations.delete(key);
    }

    return 'OK';
  }

  async del(...keys) {
    let deleted = 0;

    for (const key of keys) {
      this.purgeExpired(key);
      if (this.store.delete(key)) {
        deleted += 1;
      }
      this.expirations.delete(key);
    }

    return deleted;
  }

  async incr(key) {
    this.purgeExpired(key);
    const current = Number.parseInt(this.store.get(key) || '0', 10) + 1;
    this.store.set(key, String(current));
    return current;
  }

  async expire(key, ttlSeconds) {
    this.purgeExpired(key);
    if (!this.store.has(key)) return 0;
    this.expirations.set(key, Date.now() + ttlSeconds * 1000);
    return 1;
  }

  async ttl(key) {
    this.purgeExpired(key);
    if (!this.store.has(key)) return -2;

    const expiresAt = this.expirations.get(key);
    if (!expiresAt) return -1;

    return Math.max(0, Math.ceil((expiresAt - Date.now()) / 1000));
  }

  async keys(pattern) {
    const regex = new RegExp(`^${pattern.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*')}$`);
    const matches = [];

    for (const key of this.store.keys()) {
      this.purgeExpired(key);
      if (this.store.has(key) && regex.test(key)) {
        matches.push(key);
      }
    }

    return matches;
  }
}

const useMemoryRedis = env.NODE_ENV === 'test' || Boolean(process.env.JEST_WORKER_ID);

const redis = useMemoryRedis
  ? new MemoryRedis()
  : new Redis(env.REDIS_URL, {
      maxRetriesPerRequest: 3,
      retryStrategy(times) {
        if (times > 3) return null;
        return Math.min(times * 200, 2000);
      },
    });

redis.on('error', (err) => {
  console.error('Redis connection error:', err.message);
});

redis.on('connect', () => {
  if (env.NODE_ENV !== 'test') {
    console.log('✅ Redis connected');
  }
});

module.exports = redis;
