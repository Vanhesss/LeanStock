const { z } = require('zod');

const createTransferSchema = z.object({
  sourceLocationId: z.string().uuid(),
  destLocationId: z.string().uuid(),
  items: z
    .array(
      z.object({
        variantId: z.string().uuid(),
        quantity: z.number().int().positive(),
      })
    )
    .min(1),
  note: z.string().optional(),
});

const transferQuerySchema = z.object({
  status: z.enum(['PENDING', 'APPROVED', 'REJECTED', 'IN_TRANSIT', 'COMPLETED', 'CANCELLED']).optional(),
  locationId: z.string().uuid().optional(),
  cursor: z.string().optional(),
  limit: z.string().regex(/^\d+$/).optional(),
});

const rejectTransferSchema = z.object({
  reason: z.string().min(1, 'Rejection reason is required'),
});

module.exports = { createTransferSchema, transferQuerySchema, rejectTransferSchema };
