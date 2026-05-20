const { z } = require('zod');

const createPurchaseOrderSchema = z.object({
  supplierId: z.string().uuid(),
  locationId: z.string().uuid(),
  note: z.string().max(1000).optional(),
  items: z
    .array(
      z.object({
        variantId: z.string().uuid(),
        quantity: z.number().int().positive(),
        unitCost: z.number().int().positive(),
      })
    )
    .min(1, 'At least one item is required'),
});

const purchaseOrdersQuerySchema = z.object({
  cursor: z.string().optional(),
  limit: z.string().optional(),
  status: z.enum(['DRAFT', 'SUBMITTED', 'CONFIRMED', 'SHIPPED', 'RECEIVED', 'CANCELLED']).optional(),
  supplierId: z.string().uuid().optional(),
});

module.exports = { createPurchaseOrderSchema, purchaseOrdersQuerySchema };
