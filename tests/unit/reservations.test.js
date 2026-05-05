/**
 * Unit tests for reservation business logic.
 */

describe('Reservation Expiry Calculation', () => {
  const calculateExpiry = (ttlHours) => {
    const now = Date.now();
    return new Date(now + ttlHours * 60 * 60 * 1000);
  };

  test('should expire in 24 hours by default', () => {
    const expiry = calculateExpiry(24);
    const diff = (expiry - Date.now()) / (1000 * 60 * 60);
    expect(Math.round(diff)).toBe(24);
  });

  test('should respect custom TTL', () => {
    const expiry = calculateExpiry(48);
    const diff = (expiry - Date.now()) / (1000 * 60 * 60);
    expect(Math.round(diff)).toBe(48);
  });

  test('should be in the future', () => {
    const expiry = calculateExpiry(1);
    expect(expiry > new Date()).toBe(true);
  });
});

describe('Reservation Status Transitions', () => {
  const validTransitions = {
    ACTIVE: ['CANCELLED', 'CONVERTED', 'EXPIRED'],
    CANCELLED: [],
    CONVERTED: [],
    EXPIRED: [],
  };

  const canTransition = (from, to) => {
    return validTransitions[from]?.includes(to) || false;
  };

  test('ACTIVE can be cancelled', () => {
    expect(canTransition('ACTIVE', 'CANCELLED')).toBe(true);
  });

  test('ACTIVE can be converted', () => {
    expect(canTransition('ACTIVE', 'CONVERTED')).toBe(true);
  });

  test('ACTIVE can expire', () => {
    expect(canTransition('ACTIVE', 'EXPIRED')).toBe(true);
  });

  test('CANCELLED cannot transition', () => {
    expect(canTransition('CANCELLED', 'ACTIVE')).toBe(false);
    expect(canTransition('CANCELLED', 'CONVERTED')).toBe(false);
  });

  test('CONVERTED cannot transition', () => {
    expect(canTransition('CONVERTED', 'CANCELLED')).toBe(false);
  });

  test('EXPIRED cannot transition', () => {
    expect(canTransition('EXPIRED', 'ACTIVE')).toBe(false);
  });
});

describe('Reservation Stock Lock', () => {
  const canReserve = (onHand, currentReserved, requestedQuantity) => {
    return (onHand - currentReserved) >= requestedQuantity;
  };

  test('should allow reservation when stock available', () => {
    expect(canReserve(10, 3, 2)).toBe(true);
  });

  test('should reject when available equals zero', () => {
    expect(canReserve(10, 10, 1)).toBe(false);
  });

  test('should allow exact remaining', () => {
    expect(canReserve(10, 8, 2)).toBe(true);
  });

  test('should reject when request exceeds available', () => {
    expect(canReserve(10, 7, 5)).toBe(false);
  });
});
