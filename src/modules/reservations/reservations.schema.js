const { z } = require('zod');

const createReservationSchema = z.object({
  variantId: z.string().uuid(),
  locationId: z.string().uuid(),
  quantity: z.number().int().min(1).max(10).default(1),
  customerName: z.string().min(1).max(200),
  customerPhone: z.string().min(5).max(20).optional(),
});

const listReservationsQuery = z.object({
  locationId: z.string().uuid().optional(),
  status: z.enum(['ACTIVE', 'CONVERTED', 'CANCELLED', 'EXPIRED']).optional(),
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

module.exports = { createReservationSchema, listReservationsQuery };
