const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const { env } = require('../../config/env');
const prisma = require('../../config/prisma');
const redis = require('../../config/redis');
const { sendEmail } = require('../../config/email');
const { verificationEmail, passwordResetEmail } = require('../../utils/emailTemplates');
const { UnauthorizedError, ConflictError, NotFoundError, AppError } = require('../../utils/errors');

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

    if (!user.isEmailVerified) {
      // Send a new verification code automatically
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      const codeExpires = new Date(Date.now() + 15 * 60 * 1000); // 15 min

      await prisma.user.update({
        where: { id: user.id },
        data: {
          emailVerificationToken: code,
          emailVerificationExpires: codeExpires,
        },
      });

      const emailContent = verificationEmail(user.firstName, code);
      sendEmail({ to: user.email, ...emailContent });

      throw new AppError(403, 'EMAIL_NOT_VERIFIED', 'Please verify your email before logging in');
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
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    const verificationExpires = new Date(Date.now() + 15 * 60 * 1000); // 15 min

    const user = await prisma.user.create({
      data: {
        tenantId: adminTenantId,
        email: data.email,
        password: hashedPassword,
        firstName: data.firstName,
        lastName: data.lastName,
        role: data.role,
        locationId: data.locationId || null,
        isEmailVerified: false,
        emailVerificationToken: verificationCode,
        emailVerificationExpires: verificationExpires,
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        locationId: true,
        isActive: true,
        isEmailVerified: true,
        createdAt: true,
      },
    });

    // Send verification email with 6-digit code
    const emailContent = verificationEmail(data.firstName, verificationCode);
    sendEmail({ to: data.email, ...emailContent });

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

  async verifyEmail(email, code) {
    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      throw new AppError(400, 'INVALID_CODE', 'Invalid or expired verification code');
    }

    if (
      user.emailVerificationToken !== code ||
      !user.emailVerificationExpires ||
      user.emailVerificationExpires < new Date()
    ) {
      throw new AppError(400, 'INVALID_CODE', 'Invalid or expired verification code');
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        isEmailVerified: true,
        emailVerificationToken: null,
        emailVerificationExpires: null,
      },
    });

    return { message: 'Email verified successfully' };
  }

  async resendVerificationCode(email) {
    const user = await prisma.user.findUnique({ where: { email } });

    if (!user || !user.isActive) {
      // Don't reveal whether user exists
      return { message: 'If the account exists, a new code has been sent' };
    }

    if (user.isEmailVerified) {
      return { message: 'Email is already verified' };
    }

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const codeExpires = new Date(Date.now() + 15 * 60 * 1000); // 15 min

    await prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerificationToken: code,
        emailVerificationExpires: codeExpires,
      },
    });

    const emailContent = verificationEmail(user.firstName, code);
    sendEmail({ to: email, ...emailContent });

    return { message: 'If the account exists, a new code has been sent' };
  }

  async forgotPassword(email) {
    const user = await prisma.user.findUnique({ where: { email } });

    // Always return success to prevent email enumeration
    if (!user || !user.isActive) {
      return { message: 'If an account exists with this email, a reset link has been sent' };
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordResetToken: resetToken,
        passwordResetExpires: resetExpires,
      },
    });

    const emailContent = passwordResetEmail(user.firstName, resetToken);
    sendEmail({ to: email, ...emailContent });

    return { message: 'If an account exists with this email, a reset link has been sent' };
  }

  async resetPassword(token, newPassword) {
    const user = await prisma.user.findFirst({
      where: {
        passwordResetToken: token,
        passwordResetExpires: { gt: new Date() },
      },
    });

    if (!user) {
      throw new AppError(400, 'INVALID_TOKEN', 'Invalid or expired reset token');
    }

    const hashedPassword = await bcrypt.hash(newPassword, 12);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        passwordResetToken: null,
        passwordResetExpires: null,
      },
    });

    // Invalidate all refresh tokens for this user
    try {
      const keys = await redis.keys(`rt:${user.id}:*`);
      if (keys.length > 0) await redis.del(...keys);
    } catch {
      // Best-effort token cleanup
    }

    return { message: 'Password reset successfully' };
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
