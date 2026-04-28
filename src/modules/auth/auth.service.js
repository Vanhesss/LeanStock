const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const { env } = require('../../config/env');
const prisma = require('../../config/prisma');
const redis = require('../../config/redis');
const { UnauthorizedError, ConflictError, NotFoundError } = require('../../utils/errors');

class AuthService {
  async login(email, password) {
    const user = await prisma.user.findUnique({ where: { email } });

    if (!user || !user.isActive) {
      throw new UnauthorizedError('Invalid email or password');
    }

    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      throw new UnauthorizedError('Invalid email or password');
    }

    const tokens = this.generateTokens({
      userId: user.id,
      tenantId: user.tenantId,
      role: user.role,
      locationId: user.locationId,
    });

    // Store refresh token in Redis
    try {
      await redis.set(
        `rt:${user.id}:${tokens.refreshToken}`,
        '1',
        'EX',
        7 * 24 * 60 * 60 // 7 days
      );
    } catch {
      // Authentication still works without Redis; token revocation becomes best-effort.
    }

    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        locationId: user.locationId,
        isActive: user.isActive,
        createdAt: user.createdAt,
      },
    };
  }

  async register(data, adminTenantId) {
    const existing = await prisma.user.findUnique({ where: { email: data.email } });
    if (existing) {
      throw new ConflictError('A user with this email already exists');
    }

    if (data.locationId) {
      const location = await prisma.location.findFirst({
        where: { id: data.locationId, tenantId: adminTenantId },
      });
      if (!location) {
        throw new NotFoundError('Location', data.locationId);
      }
    }

    const hashedPassword = await bcrypt.hash(data.password, 12);

    const user = await prisma.user.create({
      data: {
        tenantId: adminTenantId,
        email: data.email,
        password: hashedPassword,
        firstName: data.firstName,
        lastName: data.lastName,
        role: data.role,
        locationId: data.locationId || null,
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        locationId: true,
        isActive: true,
        createdAt: true,
      },
    });

    return user;
  }

  async refresh(refreshToken) {
    let payload;
    try {
      payload = jwt.verify(refreshToken, env.JWT_REFRESH_SECRET);
    } catch {
      throw new UnauthorizedError('Invalid or expired refresh token');
    }

    // Check if refresh token exists in Redis
    try {
      const exists = await redis.get(`rt:${payload.userId}:${refreshToken}`);
      if (!exists) {
        throw new UnauthorizedError('Refresh token has been revoked');
      }

      // Invalidate old refresh token
      await redis.del(`rt:${payload.userId}:${refreshToken}`);
    } catch (error) {
      if (error instanceof UnauthorizedError) {
        throw error;
      }
    }

    // Verify user still exists and is active
    const user = await prisma.user.findUnique({ where: { id: payload.userId } });
    if (!user || !user.isActive) {
      throw new UnauthorizedError('User account is deactivated');
    }

    // Generate new token pair
    const tokens = this.generateTokens({
      userId: user.id,
      tenantId: user.tenantId,
      role: user.role,
      locationId: user.locationId,
    });

    // Store new refresh token
    try {
      await redis.set(
        `rt:${user.id}:${tokens.refreshToken}`,
        '1',
        'EX',
        7 * 24 * 60 * 60
      );
    } catch {
      // Best-effort token persistence when Redis is unavailable.
    }

    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    };
  }

  async logout(userId, accessToken) {
    // Blacklist the access token for its remaining TTL
    try {
      const decoded = jwt.decode(accessToken);
      if (decoded?.exp) {
        const ttl = decoded.exp - Math.floor(Date.now() / 1000);
        if (ttl > 0) {
          await redis.set(`bl:${accessToken}`, '1', 'EX', ttl);
        }
      }

      const keys = await redis.keys(`rt:${userId}:*`);
      if (keys.length > 0) {
        await redis.del(...keys);
      }
    } catch {
      // Logout becomes best-effort when Redis is unavailable.
    }
  }

  generateTokens(payload) {
    const accessToken = jwt.sign(payload, env.JWT_ACCESS_SECRET, {
      expiresIn: env.JWT_ACCESS_EXPIRES_IN,
    });

    const refreshToken = jwt.sign(payload, env.JWT_REFRESH_SECRET, {
      expiresIn: env.JWT_REFRESH_EXPIRES_IN,
    });

    return { accessToken, refreshToken };
  }
}

const authService = new AuthService();

module.exports = { AuthService, authService };
