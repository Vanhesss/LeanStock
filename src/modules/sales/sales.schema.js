const { z } = require('zod');

const createSaleSchema = z.object({
  variantId: z.string().uuid(),
  locationId: z.string().uuid(),
  quantity: z.number().int().min(1).max(100),
  unitPrice: z.number().int().min(1),
});

const listSalesQuery = z.object({
  locationId: z.string().uuid().optional(),
  variantId: z.string().uuid().optional(),
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
});

module.exports = { createSaleSchema, listSalesQuery };
