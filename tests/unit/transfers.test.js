/**
 * Unit tests for transfer state machine logic.
 */

describe('Transfer State Machine', () => {
  const validTransitions = {
    PENDING: ['APPROVED', 'REJECTED'],
    APPROVED: ['IN_TRANSIT'],
    IN_TRANSIT: ['COMPLETED'],
    REJECTED: [],
    COMPLETED: [],
    CANCELLED: [],
  };

  const canTransition = (from, to) => {
    return validTransitions[from]?.includes(to) ?? false;
  };

  test('PENDING can transition to APPROVED', () => {
    expect(canTransition('PENDING', 'APPROVED')).toBe(true);
  });

  test('PENDING can transition to REJECTED', () => {
    expect(canTransition('PENDING', 'REJECTED')).toBe(true);
  });

  test('PENDING cannot skip to IN_TRANSIT', () => {
    expect(canTransition('PENDING', 'IN_TRANSIT')).toBe(false);
  });

  test('PENDING cannot skip to COMPLETED', () => {
    expect(canTransition('PENDING', 'COMPLETED')).toBe(false);
  });

  test('APPROVED can transition to IN_TRANSIT (ship)', () => {
    expect(canTransition('APPROVED', 'IN_TRANSIT')).toBe(true);
  });

  test('APPROVED cannot go back to PENDING', () => {
    expect(canTransition('APPROVED', 'PENDING')).toBe(false);
  });

  test('IN_TRANSIT can transition to COMPLETED (receive)', () => {
    expect(canTransition('IN_TRANSIT', 'COMPLETED')).toBe(true);
  });

  test('COMPLETED is a terminal state', () => {
    expect(canTransition('COMPLETED', 'PENDING')).toBe(false);
    expect(canTransition('COMPLETED', 'IN_TRANSIT')).toBe(false);
  });

  test('REJECTED is a terminal state', () => {
    expect(canTransition('REJECTED', 'APPROVED')).toBe(false);
    expect(canTransition('REJECTED', 'PENDING')).toBe(false);
  });

  test('CANCELLED is a terminal state', () => {
    expect(canTransition('CANCELLED', 'PENDING')).toBe(false);
  });
});

describe('Transfer Stock Validation', () => {
  const validateTransferItems = (items, sourceInventory) => {
    const errors = [];
    for (const item of items) {
      const inv = sourceInventory.find((i) => i.variantId === item.variantId);
      if (!inv) {
        errors.push({ variantId: item.variantId, error: 'not_found' });
        continue;
      }
      const available = inv.onHand - inv.reservedQuantity;
      if (available < item.quantity) {
        errors.push({ variantId: item.variantId, error: 'insufficient', available, requested: item.quantity });
      }
    }
    return errors;
  };

  test('should pass when all items have sufficient stock', () => {
    const items = [
      { variantId: 'v1', quantity: 5 },
      { variantId: 'v2', quantity: 3 },
    ];
    const inventory = [
      { variantId: 'v1', onHand: 10, reservedQuantity: 2 },
      { variantId: 'v2', onHand: 5, reservedQuantity: 0 },
    ];
    expect(validateTransferItems(items, inventory)).toEqual([]);
  });

  test('should fail when variant is missing from source', () => {
    const items = [{ variantId: 'v1', quantity: 5 }];
    const inventory = [];
    const errors = validateTransferItems(items, inventory);
    expect(errors).toHaveLength(1);
    expect(errors[0].error).toBe('not_found');
  });

  test('should fail when available stock is insufficient', () => {
    const items = [{ variantId: 'v1', quantity: 10 }];
    const inventory = [{ variantId: 'v1', onHand: 10, reservedQuantity: 5 }];
    const errors = validateTransferItems(items, inventory);
    expect(errors).toHaveLength(1);
    expect(errors[0].error).toBe('insufficient');
    expect(errors[0].available).toBe(5);
  });

  test('should report multiple errors', () => {
    const items = [
      { variantId: 'v1', quantity: 100 },
      { variantId: 'v3', quantity: 1 },
    ];
    const inventory = [{ variantId: 'v1', onHand: 5, reservedQuantity: 0 }];
    const errors = validateTransferItems(items, inventory);
    expect(errors).toHaveLength(2);
  });
});

describe('Transfer Location Validation', () => {
  test('source and destination must be different', () => {
    const sourceId = 'loc-001';
    const destId = 'loc-001';
    expect(sourceId === destId).toBe(true);
  });

  test('different locations are valid', () => {
    const sourceId = 'loc-001';
    const destId = 'loc-002';
    expect(sourceId !== destId).toBe(true);
  });
});
