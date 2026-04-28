const { z } = require('zod');

const createProductSchema = z.object({
  brandId: z.string().uuid(),
  model: z.string().min(1).max(200),
  colorway: z.string().min(1).max(100),
  msrpPrice: z.number().int().positive(),
  sizes: z.array(z.number().min(20).max(55)).min(1, 'At least one size is required'),
});

const updateProductSchema = z.object({
  model: z.string().min(1).max(200).optional(),
  colorway: z.string().min(1).max(100).optional(),
  msrpPrice: z.number().int().positive().optional(),
  isActive: z.boolean().optional(),
  excludeFromMarkdown: z.boolean().optional(),
});

const productQuerySchema = z.object({
  brandId: z.string().uuid().optional(),
  search: z.string().optional(),
  isActive: z.enum(['true', 'false']).optional(),
  cursor: z.string().optional(),
  limit: z.string().regex(/^\d+$/).optional(),
});

module.exports = { createProductSchema, updateProductSchema, productQuerySchema };
