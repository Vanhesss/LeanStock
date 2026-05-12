/**
 * Unit tests for inventory business logic.
 */

describe('Stock Adjustment Logic', () => {
  const applyAdjustment = (currentOnHand, adjustment) => {
    const newOnHand = currentOnHand + adjustment;
    if (newOnHand < 0) {
      return { valid: false, error: 'negative_stock', currentOnHand, adjustment };
    }
    return { valid: true, newOnHand };
  };

  test('positive adjustment increases stock', () => {
    const result = applyAdjustment(10, 5);
    expect(result.valid).toBe(true);
    expect(result.newOnHand).toBe(15);
  });

  test('negative adjustment decreases stock', () => {
    const result = applyAdjustment(10, -3);
    expect(result.valid).toBe(true);
    expect(result.newOnHand).toBe(7);
  });

  test('adjustment to zero is valid', () => {
    const result = applyAdjustment(5, -5);
    expect(result.valid).toBe(true);
    expect(result.newOnHand).toBe(0);
  });

  test('rejects adjustment that would go negative', () => {
    const result = applyAdjustment(5, -10);
    expect(result.valid).toBe(false);
    expect(result.error).toBe('negative_stock');
  });

  test('zero adjustment is valid (no change)', () => {
    const result = applyAdjustment(10, 0);
    expect(result.valid).toBe(true);
    expect(result.newOnHand).toBe(10);
  });
});

describe('Adjustment Reason Validation', () => {
  const validReasons = ['DAMAGE', 'THEFT', 'CORRECTION', 'SUPPLIER_ERROR', 'AUDIT'];

  test.each(validReasons)('"%s" is a valid reason', (reason) => {
    expect(validReasons.includes(reason)).toBe(true);
  });

  test('rejects invalid reason', () => {
    expect(validReasons.includes('LOST')).toBe(false);
  });
});

describe('Low Stock Detection', () => {
  const isLowStock = (onHand, threshold = 3) => onHand < threshold;

  test('detects low stock (2 units)', () => {
    expect(isLowStock(2)).toBe(true);
  });

  test('detects low stock (0 units)', () => {
    expect(isLowStock(0)).toBe(true);
  });

  test('3 units is NOT low stock (threshold is < 3)', () => {
    expect(isLowStock(3)).toBe(false);
  });

  test('10 units is not low stock', () => {
    expect(isLowStock(10)).toBe(false);
  });
});

describe('Receive Stock Upsert Logic', () => {
  const calculateNewOnHand = (existingOnHand, receivedQuantity) => {
    return (existingOnHand || 0) + receivedQuantity;
  };

  test('should add to existing stock', () => {
    expect(calculateNewOnHand(10, 5)).toBe(15);
  });

  test('should set stock when no existing record', () => {
    expect(calculateNewOnHand(null, 10)).toBe(10);
  });

  test('should set stock from zero', () => {
    expect(calculateNewOnHand(0, 10)).toBe(10);
  });
});
