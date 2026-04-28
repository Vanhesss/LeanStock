const redis = require('../config/redis');
const { env } = require('../config/env');
const { AppError } = require('../utils/errors');

const rateLimiter = (maxRequests) => {
  const limit = maxRequests || env.RATE_LIMIT_AUTH;

  return async (req, res, next) => {
    if (env.NODE_ENV === 'test' || process.env.JEST_WORKER_ID) {
      return next();
    }

    try {
      const ip = req.ip || req.socket.remoteAddress || 'unknown';
      const key = `rl:${req.path}:${ip}`;
      const windowSeconds = 60;

      const current = await redis.incr(key);
      if (current === 1) {
        await redis.expire(key, windowSeconds);
      }

      const ttl = await redis.ttl(key);

      res.setHeader('X-RateLimit-Limit', limit);
      res.setHeader('X-RateLimit-Remaining', Math.max(0, limit - current));
      res.setHeader('X-RateLimit-Reset', Math.ceil(Date.now() / 1000) + ttl);

      if (current > limit) {
        return next(
          new AppError(429, 'RATE_LIMIT_EXCEEDED', 'Too many requests. Please try again later.', {
            retryAfter: ttl,
          })
        );
      }

      next();
    } catch (error) {
      // If Redis is down, allow the request through
      next();
    }
  };
};

module.exports = { rateLimiter };
