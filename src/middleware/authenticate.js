const jwt = require('jsonwebtoken');
const { env } = require('../config/env');
const redis = require('../config/redis');
const { UnauthorizedError } = require('../utils/errors');

const authenticate = async (req, _res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedError('Missing or invalid authorization header');
    }

    const token = authHeader.split(' ')[1];

    // Check if token is blacklisted
    try {
      const isBlacklisted = await redis.get(`bl:${token}`);
      if (isBlacklisted) {
        throw new UnauthorizedError('Token has been revoked');
      }
    } catch (error) {
      if (error instanceof UnauthorizedError) {
        throw error;
      }
    }

    const payload = jwt.verify(token, env.JWT_ACCESS_SECRET);

    req.user = {
      userId: payload.userId,
      tenantId: payload.tenantId,
      role: payload.role,
      locationId: payload.locationId,
    };

    next();
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      next(error);
    } else if (error instanceof jwt.JsonWebTokenError) {
      next(new UnauthorizedError('Invalid token'));
    } else if (error instanceof jwt.TokenExpiredError) {
      next(new UnauthorizedError('Token expired'));
    } else {
      next(error);
    }
  }
};

module.exports = { authenticate };
