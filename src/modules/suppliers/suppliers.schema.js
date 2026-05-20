const { z } = require('zod');

const createSupplierSchema = z.object({
  name: z.string().min(1).max(200),
  email: z.string().email().optional(),
  phone: z.string().max(50).optional(),
  address: z.string().max(500).optional(),
});

const updateSupplierSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  email: z.string().email().optional(),
  phone: z.string().max(50).optional(),
  address: z.string().max(500).optional(),
  isActive: z.boolean().optional(),
});

const suppliersQuerySchema = z.object({
  cursor: z.string().optional(),
  limit: z.string().optional(),
  search: z.string().optional(),
});

module.exports = { createSupplierSchema, updateSupplierSchema, suppliersQuerySchema };
