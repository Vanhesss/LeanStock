describe('Suppliers Service', () => {
  describe('Supplier validation', () => {
    const { createSupplierSchema, updateSupplierSchema } = require('../../src/modules/suppliers/suppliers.schema');

    test('should validate a valid supplier', () => {
      const result = createSupplierSchema.safeParse({
        name: 'Nike Distribution KZ',
        email: 'orders@nike.kz',
        phone: '+7-777-123-4567',
        address: '123 Supply St, Almaty',
      });
      expect(result.success).toBe(true);
    });

    test('should require supplier name', () => {
      const result = createSupplierSchema.safeParse({});
      expect(result.success).toBe(false);
    });

    test('should reject empty name', () => {
      const result = createSupplierSchema.safeParse({ name: '' });
      expect(result.success).toBe(false);
    });

    test('should reject invalid email format', () => {
      const result = createSupplierSchema.safeParse({
        name: 'Test Supplier',
        email: 'not-an-email',
      });
      expect(result.success).toBe(false);
    });

    test('should allow update with partial fields', () => {
      const result = updateSupplierSchema.safeParse({ phone: '+7-777-999-0000' });
      expect(result.success).toBe(true);
    });

    test('should allow deactivation via update', () => {
      const result = updateSupplierSchema.safeParse({ isActive: false });
      expect(result.success).toBe(true);
    });
  });
});
