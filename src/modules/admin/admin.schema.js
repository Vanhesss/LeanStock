const { z } = require('zod');

const createLocationSchema = z.object({
  body: z.object({
    name: z.string().min(1).max(200),
    type: z.enum(['STORE', 'WAREHOUSE']),
    address: z.string().max(500).optional(),
    city: z.string().max(100).optional(),
  }),
});

const createBrandSchema = z.object({
  body: z.object({
    name: z.string().min(1).max(100),
  }),
});

const usersQuerySchema = z.object({
  query: z.object({
    cursor: z.string().optional(),
    limit: z.string().optional(),
    role: z.enum(['ADMIN', 'MANAGER', 'STAFF']).optional(),
    isActive: z.enum(['true', 'false']).optional(),
  }),
});

const auditLogsQuerySchema = z.object({
  query: z.object({
    cursor: z.string().optional(),
    limit: z.string().optional(),
    entity: z.string().optional(),
    action: z.string().optional(),
    userId: z.string().uuid().optional(),
  }),
});

const priceHistoryQuerySchema = z.object({
  query: z.object({
    cursor: z.string().optional(),
    limit: z.string().optional(),
    variantId: z.string().uuid().optional(),
  }),
});

const locationsQuerySchema = z.object({
  query: z.object({
    cursor: z.string().optional(),
    limit: z.string().optional(),
    type: z.enum(['STORE', 'WAREHOUSE']).optional(),
  }),
});

module.exports = {
  createLocationSchema,
  createBrandSchema,
  usersQuerySchema,
  auditLogsQuerySchema,
  priceHistoryQuerySchema,
  locationsQuerySchema,
};
