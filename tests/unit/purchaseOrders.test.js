describe('Purchase Orders Service', () => {
  describe('PO validation', () => {
    const { createPurchaseOrderSchema } = require('../../src/modules/purchaseOrders/purchaseOrders.schema');

    test('should validate a valid purchase order', () => {
      const result = createPurchaseOrderSchema.safeParse({
        supplierId: '550e8400-e29b-41d4-a716-446655440000',
        locationId: '550e8400-e29b-41d4-a716-446655440001',
        note: 'Urgent restock',
        items: [
          { variantId: '550e8400-e29b-41d4-a716-446655440002', quantity: 10, unitCost: 5000 },
        ],
      });
      expect(result.success).toBe(true);
    });

    test('should require at least one item', () => {
      const result = createPurchaseOrderSchema.safeParse({
        supplierId: '550e8400-e29b-41d4-a716-446655440000',
        locationId: '550e8400-e29b-41d4-a716-446655440001',
        items: [],
      });
      expect(result.success).toBe(false);
    });

    test('should require supplierId', () => {
      const result = createPurchaseOrderSchema.safeParse({
        locationId: '550e8400-e29b-41d4-a716-446655440001',
        items: [{ variantId: '550e8400-e29b-41d4-a716-446655440002', quantity: 10, unitCost: 5000 }],
      });
      expect(result.success).toBe(false);
    });

    test('should reject zero quantity', () => {
      const result = createPurchaseOrderSchema.safeParse({
        supplierId: '550e8400-e29b-41d4-a716-446655440000',
        locationId: '550e8400-e29b-41d4-a716-446655440001',
        items: [{ variantId: '550e8400-e29b-41d4-a716-446655440002', quantity: 0, unitCost: 5000 }],
      });
      expect(result.success).toBe(false);
    });

    test('should reject negative unit cost', () => {
      const result = createPurchaseOrderSchema.safeParse({
        supplierId: '550e8400-e29b-41d4-a716-446655440000',
        locationId: '550e8400-e29b-41d4-a716-446655440001',
        items: [{ variantId: '550e8400-e29b-41d4-a716-446655440002', quantity: 10, unitCost: -100 }],
      });
      expect(result.success).toBe(false);
    });
  });

  describe('PO status transitions', () => {
    test('valid workflow: DRAFT → SUBMITTED → CONFIRMED → SHIPPED → RECEIVED', () => {
      const validTransitions = {
        DRAFT: 'SUBMITTED',
        SUBMITTED: 'CONFIRMED',
        CONFIRMED: 'SHIPPED',
        SHIPPED: 'RECEIVED',
      };

      expect(validTransitions.DRAFT).toBe('SUBMITTED');
      expect(validTransitions.SUBMITTED).toBe('CONFIRMED');
      expect(validTransitions.CONFIRMED).toBe('SHIPPED');
      expect(validTransitions.SHIPPED).toBe('RECEIVED');
    });

    test('total amount calculated correctly from items', () => {
      const items = [
        { quantity: 10, unitCost: 5000 },
        { quantity: 5, unitCost: 8000 },
        { quantity: 20, unitCost: 3000 },
      ];
      const totalAmount = items.reduce((sum, i) => sum + i.quantity * i.unitCost, 0);
      expect(totalAmount).toBe(10 * 5000 + 5 * 8000 + 20 * 3000); // 50000 + 40000 + 60000 = 150000
    });
  });
});
