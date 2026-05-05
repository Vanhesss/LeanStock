/**
 * Unit tests for sales business logic.
 */

describe('Sale Price Calculation', () => {
  const calculateTotal = (unitPrice, quantity) => unitPrice * quantity;

  test('should calculate total for single item', () => {
    expect(calculateTotal(65000, 1)).toBe(65000);
  });

  test('should calculate total for multiple items', () => {
    expect(calculateTotal(48000, 3)).toBe(144000);
  });

  test('should handle minimum quantity', () => {
    expect(calculateTotal(55000, 1)).toBe(55000);
  });
});

describe('Stock Availability Check', () => {
  const checkAvailability = (onHand, reservedQuantity, requestedQuantity) => {
    const available = onHand - reservedQuantity;
    return available >= requestedQuantity;
  };

  test('should allow sale when stock is sufficient', () => {
    expect(checkAvailability(10, 2, 5)).toBe(true);
  });

  test('should reject sale when stock is insufficient', () => {
    expect(checkAvailability(10, 8, 5)).toBe(false);
  });

  test('should allow sale for exact remaining stock', () => {
    expect(checkAvailability(10, 5, 5)).toBe(true);
  });

  test('should reject when all stock is reserved', () => {
    expect(checkAvailability(10, 10, 1)).toBe(false);
  });

  test('should allow when no reservations exist', () => {
    expect(checkAvailability(10, 0, 10)).toBe(true);
  });
});

describe('Sale Date Filtering', () => {
  const isInRange = (saleDate, startDate, endDate) => {
    const sale = new Date(saleDate);
    if (startDate && sale < new Date(startDate)) return false;
    if (endDate && sale > new Date(endDate)) return false;
    return true;
  };

  test('should include sale within range', () => {
    expect(isInRange('2026-05-03T10:00:00Z', '2026-05-01', '2026-05-05')).toBe(true);
  });

  test('should exclude sale before start', () => {
    expect(isInRange('2026-04-30T10:00:00Z', '2026-05-01', '2026-05-05')).toBe(false);
  });

  test('should exclude sale after end', () => {
    expect(isInRange('2026-05-06T10:00:00Z', '2026-05-01', '2026-05-05')).toBe(false);
  });

  test('should include when no filters', () => {
    expect(isInRange('2026-05-03T10:00:00Z', null, null)).toBe(true);
  });
});
