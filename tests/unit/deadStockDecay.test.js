/**
 * Unit tests for dead stock decay business logic.
 * Tests the pricing formula without database.
 */

describe('Dead Stock Decay Formula', () => {
  const calculateDecay = (
    currentPrice,
    msrpPrice,
    markdownPercent,
    priceFloorPercent
  ) => {
    const priceFloor = Math.floor(msrpPrice * priceFloorPercent / 100);
    let newPrice = Math.floor(currentPrice * (1 - markdownPercent / 100));
    if (newPrice < priceFloor) newPrice = priceFloor;
    return newPrice;
  };

  test('should apply 10% markdown correctly', () => {
    const result = calculateDecay(65000, 65000, 10, 40);
    expect(result).toBe(58500); // 65000 * 0.9 = 58500
  });

  test('should apply second markdown on already discounted price', () => {
    const result = calculateDecay(58500, 65000, 10, 40);
    expect(result).toBe(52650); // 58500 * 0.9 = 52650
  });

  test('should respect price floor at 40% of MSRP', () => {
    const result = calculateDecay(27000, 65000, 10, 40);
    // 27000 * 0.9 = 24300, but floor is 26000 (65000 * 0.4)
    expect(result).toBe(26000);
  });

  test('should not go below price floor', () => {
    const result = calculateDecay(26000, 65000, 10, 40);
    // 26000 * 0.9 = 23400, floor = 26000
    expect(result).toBe(26000);
  });

  test('should handle different markdown percentages', () => {
    const result = calculateDecay(50000, 50000, 15, 40);
    expect(result).toBe(42500); // 50000 * 0.85 = 42500
  });

  test('should handle zero markdown', () => {
    const result = calculateDecay(65000, 65000, 0, 40);
    expect(result).toBe(65000);
  });

  test('should handle small prices correctly (integer math)', () => {
    const result = calculateDecay(1000, 1000, 10, 40);
    expect(result).toBe(900);
  });

  test('should handle 100% price floor (never discount)', () => {
    const result = calculateDecay(65000, 65000, 10, 100);
    // Floor = 65000, discounted = 58500, but floor wins
    expect(result).toBe(65000);
  });
});

describe('Dead Stock Eligibility', () => {
  const isEligible = (
    daysSinceLastSale,
    hoursSinceLastMarkdown,
    currentPrice,
    msrpPrice,
    thresholdDays,
    intervalHours,
    priceFloorPercent,
    excludeFromMarkdown
  ) => {
    if (excludeFromMarkdown) return false;
    if (daysSinceLastSale <= thresholdDays) return false;
    if (hoursSinceLastMarkdown !== null && hoursSinceLastMarkdown < intervalHours) return false;
    if (currentPrice <= msrpPrice * priceFloorPercent / 100) return false;
    return true;
  };

  test('should be eligible after 31 days without sale', () => {
    expect(isEligible(31, null, 65000, 65000, 30, 72, 40, false)).toBe(true);
  });

  test('should NOT be eligible at exactly 30 days', () => {
    expect(isEligible(30, null, 65000, 65000, 30, 72, 40, false)).toBe(false);
  });

  test('should NOT be eligible if markdown was < 72 hours ago', () => {
    expect(isEligible(45, 24, 58500, 65000, 30, 72, 40, false)).toBe(false);
  });

  test('should be eligible if markdown was >= 72 hours ago', () => {
    expect(isEligible(45, 72, 58500, 65000, 30, 72, 40, false)).toBe(true);
  });

  test('should NOT be eligible if excluded from markdown', () => {
    expect(isEligible(90, null, 65000, 65000, 30, 72, 40, true)).toBe(false);
  });

  test('should NOT be eligible if already at price floor', () => {
    expect(isEligible(90, null, 26000, 65000, 30, 72, 40, false)).toBe(false);
  });
});
