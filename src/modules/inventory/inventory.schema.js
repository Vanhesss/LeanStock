const { z } = require('zod');

const inventoryQuerySchema = z.object({
  locationId: z.string().uuid(),
  search: z.string().optional(),
  lowStock: z.enum(['true', 'false']).optional(),
  cursor: z.string().optional(),
  limit: z.string().regex(/^\d+$/).optional(),
});

const receiveStockSchema = z.object({
  locationId: z.string().uuid(),
  items: z
    .array(
      z.object({
        variantId: z.string().uuid(),
        quantity: z.number().int().positive(),
      })
    )
    .min(1),
});

const adjustStockSchema = z.object({
  variantId: z.string().uuid(),
  locationId: z.string().uuid(),
  adjustment: z.number().int(),
  reason: z.enum(['DAMAGE', 'THEFT', 'CORRECTION', 'SUPPLIER_ERROR', 'AUDIT']),
});

module.exports = { inventoryQuerySchema, receiveStockSchema, adjustStockSchema };
