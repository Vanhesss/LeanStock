const { z } = require('zod');

const reorderQuerySchema = z.object({
  windowDays: z.string().optional(),
  leadTimeDays: z.string().optional(),
  safetyStockMultiplier: z.string().optional(),
});

const velocityQuerySchema = z.object({
  weeks: z.string().optional(),
  variantId: z.string().uuid().optional(),
  locationId: z.string().uuid().optional(),
});

module.exports = { reorderQuerySchema, velocityQuerySchema };
