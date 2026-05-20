const { z } = require('zod');

const createLocationSchema = z.object({
  name: z.string().min(1).max(200),
  type: z.enum(['STORE', 'WAREHOUSE']),
  address: z.string().max(500).optional(),
  city: z.string().max(100).optional(),
});

const createBrandSchema = z.object({
  name: z.string().min(1).max(100),
});

const usersQuerySchema = z.object({
  cursor: z.string().optional(),
  limit: z.string().optional(),
  role: z.enum(['ADMIN', 'MANAGER', 'STAFF']).optional(),
  isActive: z.enum(['true', 'false']).optional(),
});

const auditLogsQuerySchema = z.object({
  cursor: z.string().optional(),
  limit: z.string().optional(),
  entity: z.string().optional(),
  action: z.string().optional(),
  userId: z.string().uuid().optional(),
});

const priceHistoryQuerySchema = z.object({
  cursor: z.string().optional(),
  limit: z.string().optional(),
  variantId: z.string().uuid().optional(),
});

const locationsQuerySchema = z.object({
  cursor: z.string().optional(),
  limit: z.string().optional(),
  type: z.enum(['STORE', 'WAREHOUSE']).optional(),
});

const updateUserSchema = z.object({
  firstName: z.string().min(1).max(100).optional(),
  lastName: z.string().min(1).max(100).optional(),
  role: z.enum(['ADMIN', 'MANAGER', 'STAFF']).optional(),
  locationId: z.string().uuid().nullable().optional(),
  isActive: z.boolean().optional(),
});

module.exports = {
  createLocationSchema,
  createBrandSchema,
  usersQuerySchema,
  auditLogsQuerySchema,
  priceHistoryQuerySchema,
  locationsQuerySchema,
  updateUserSchema,
};
