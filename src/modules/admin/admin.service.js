const prisma = require('../../config/prisma');
const { getQueues, deadStockQueue, reservationExpiryQueue } = require('../../config/queue');
const { parsePagination, buildPaginationMeta, decodeCursor } = require('../../utils/pagination');

class AdminService {
  // ──────────── Users ────────────
  async listUsers(tenantId, query) {
    const { cursor, limit } = parsePagination(query);
    const cursorObj = cursor ? decodeCursor(cursor) : null;

    const where = { tenantId };
    if (query.role) where.role = query.role;
    if (query.isActive !== undefined) where.isActive = query.isActive === 'true';

    const [items, total] = await Promise.all([
      prisma.user.findMany({
        where: {
          ...where,
          ...(cursorObj ? { id: { lt: cursorObj.id } } : {}),
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
          location: { select: { name: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
      }),
      prisma.user.count({ where }),
    ]);

    const data = items.map((u) => ({
      ...u,
      locationName: u.location?.name || null,
      location: undefined,
    }));

    return { data, meta: buildPaginationMeta(items, total, limit) };
  }

  async updateUser(tenantId, userId, data) {
    const user = await prisma.user.findFirst({ where: { id: userId, tenantId } });
    if (!user) {
      const { NotFoundError } = require('../../utils/errors');
      throw new NotFoundError('User', userId);
    }

    if (data.locationId) {
      const location = await prisma.location.findFirst({
        where: { id: data.locationId, tenantId },
      });
      if (!location) {
        const { NotFoundError } = require('../../utils/errors');
        throw new NotFoundError('Location', data.locationId);
      }
    }

    return prisma.user.update({
      where: { id: userId },
      data,
      select: {
        id: true, email: true, firstName: true, lastName: true,
        role: true, locationId: true, isActive: true, isEmailVerified: true, createdAt: true,
        location: { select: { name: true } },
      },
    });
  }

  async deleteUser(tenantId, userId, requestingUserId) {
    const { AppError, NotFoundError } = require('../../utils/errors');

    if (userId === requestingUserId) {
      throw new AppError(400, 'CANNOT_DELETE_SELF', 'You cannot delete your own account');
    }

    const user = await prisma.user.findFirst({ where: { id: userId, tenantId } });
    if (!user) {
      throw new NotFoundError('User', userId);
    }

    await prisma.user.delete({ where: { id: userId } });
    return { message: 'User deleted successfully' };
  }

  // ──────────── Locations ────────────
  async listLocations(tenantId, query) {
    const { cursor, limit } = parsePagination(query);
    const cursorObj = cursor ? decodeCursor(cursor) : null;

    const where = { tenantId };
    if (query.type) where.type = query.type;

    const [items, total] = await Promise.all([
      prisma.location.findMany({
        where: {
          ...where,
          ...(cursorObj ? { id: { lt: cursorObj.id } } : {}),
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
      }),
      prisma.location.count({ where }),
    ]);

    return { data: items, meta: buildPaginationMeta(items, total, limit) };
  }

  async createLocation(tenantId, data) {
    return prisma.location.create({
      data: {
        tenantId,
        name: data.name,
        type: data.type,
        address: data.address || null,
        city: data.city || null,
      },
    });
  }

  // ──────────── Brands ────────────
  async listBrands(tenantId, query) {
    const { cursor, limit } = parsePagination(query);
    const cursorObj = cursor ? decodeCursor(cursor) : null;

    const where = { tenantId };

    const [items, total] = await Promise.all([
      prisma.brand.findMany({
        where: {
          ...where,
          ...(cursorObj ? { id: { lt: cursorObj.id } } : {}),
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
      }),
      prisma.brand.count({ where }),
    ]);

    return { data: items, meta: buildPaginationMeta(items, total, limit) };
  }

  async createBrand(tenantId, data) {
    return prisma.brand.create({
      data: {
        tenantId,
        name: data.name,
      },
    });
  }

  // ──────────── Audit Logs ────────────
  async listAuditLogs(tenantId, query) {
    const { cursor, limit } = parsePagination(query);
    const cursorObj = cursor ? decodeCursor(cursor) : null;

    const where = { tenantId };
    if (query.entity) where.entity = query.entity;
    if (query.action) where.action = query.action;
    if (query.userId) where.userId = query.userId;

    const [items, total] = await Promise.all([
      prisma.auditLog.findMany({
        where: {
          ...where,
          ...(cursorObj ? { id: { lt: cursorObj.id } } : {}),
        },
        include: {
          user: { select: { email: true, firstName: true, lastName: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
      }),
      prisma.auditLog.count({ where }),
    ]);

    return { data: items, meta: buildPaginationMeta(items, total, limit) };
  }

  // ──────────── Price History ────────────
  async listPriceHistory(tenantId, query) {
    const { cursor, limit } = parsePagination(query);
    const cursorObj = cursor ? decodeCursor(cursor) : null;

    const where = { tenantId };
    if (query.variantId) where.variantId = query.variantId;

    const [items, total] = await Promise.all([
      prisma.priceHistory.findMany({
        where: {
          ...where,
          ...(cursorObj ? { id: { lt: cursorObj.id } } : {}),
        },
        include: {
          variant: { select: { sku: true, product: { select: { model: true } } } },
          location: { select: { name: true } },
        },
        orderBy: { appliedAt: 'desc' },
        take: limit,
      }),
      prisma.priceHistory.count({ where }),
    ]);

    return { data: items, meta: buildPaginationMeta(items, total, limit) };
  }

  // ──────────── Email Config Diagnostic ────────────
  getEmailConfig() {
    const { env } = require('../../config/env');
    const raw = env.GMAIL_AP || '';
    const trimmed = raw.trim();
    const mask = (s) => (s ? `${s.slice(0, 4)}...${s.slice(-4)}` : '(empty)');
    return {
      GMAIL_USER: env.GMAIL_USER || '(empty)',
      GMAIL_USER_LENGTH: (env.GMAIL_USER || '').length,
      GMAIL_AP: mask(trimmed),
      GMAIL_AP_RAW_LENGTH: raw.length,
      GMAIL_AP_TRIMMED_LENGTH: trimmed.length,
      GMAIL_AP_HAS_WHITESPACE: raw !== trimmed,
      GMAIL_AP_FIRST_CHAR_CODE: raw.charCodeAt(0) || null,
      GMAIL_AP_LAST_CHAR_CODE: raw.charCodeAt(raw.length - 1) || null,
    };
  }

  // ──────────── Queue / Jobs ────────────
  async getQueueStatus() {
    const queues = getQueues();
    const status = {};
    for (const [name, queue] of Object.entries(queues)) {
      const counts = await queue.getJobCounts();
      const failedJobs = await queue.getJobs(['failed'], 0, 5);
      status[name] = {
        ...counts,
        recentErrors: failedJobs.map((j) => ({
          id: j.id,
          failedReason: j.failedReason,
          data: { to: j.data?.to, subject: j.data?.subject },
          timestamp: j.timestamp,
        })),
      };
    }
    return status;
  }

  async triggerDeadStockDecay() {
    const job = await deadStockQueue.add('manual-decay', { triggeredBy: 'admin' });
    return { jobId: job.id, queue: 'dead-stock-decay', status: 'enqueued' };
  }

  async triggerReservationExpiry() {
    const job = await reservationExpiryQueue.add('manual-expiry', { triggeredBy: 'admin' });
    return { jobId: job.id, queue: 'reservation-expiry', status: 'enqueued' };
  }
}

const adminService = new AdminService();

module.exports = { AdminService, adminService };
