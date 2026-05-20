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
    const mask = (s) => (s ? `${s.slice(0, 4)}...${s.slice(-4)}` : '(empty)');
    return {
      GMAIL_USER: env.GMAIL_USER || '(empty)',
      GMAIL_AP: mask(env.GMAIL_AP),
      GMAIL_AP_LENGTH: (env.GMAIL_AP || '').length,
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
