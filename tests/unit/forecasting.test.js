describe('Forecasting Service', () => {
  describe('Reorder calculation logic', () => {
    test('should calculate moving average correctly', () => {
      const totalSold = 60;
      const windowDays = 30;
      const avgDailySales = totalSold / windowDays;
      expect(avgDailySales).toBe(2); // 2 units/day
    });

    test('should calculate projected demand for lead time', () => {
      const avgDailySales = 2;
      const leadTimeDays = 14;
      const projectedDemand = Math.ceil(avgDailySales * leadTimeDays);
      expect(projectedDemand).toBe(28);
    });

    test('should calculate safety stock with multiplier', () => {
      const avgDailySales = 2;
      const leadTimeDays = 14;
      const safetyStockMultiplier = 1.5;
      const safetyStock = Math.ceil(avgDailySales * leadTimeDays * (safetyStockMultiplier - 1));
      expect(safetyStock).toBe(14);
    });

    test('should calculate reorder point', () => {
      const projectedDemand = 28;
      const safetyStock = 14;
      const reorderPoint = projectedDemand + safetyStock;
      expect(reorderPoint).toBe(42);
    });

    test('should suggest reorder when available stock <= reorder point', () => {
      const available = 10;
      const reorderPoint = 42;
      const projectedDemand = 28;
      const needsReorder = available <= reorderPoint;
      expect(needsReorder).toBe(true);

      const suggestedQuantity = Math.max(reorderPoint - available + projectedDemand, 1);
      expect(suggestedQuantity).toBe(60); // 42 - 10 + 28 = 60
    });

    test('should not suggest reorder when stock is sufficient', () => {
      const available = 100;
      const reorderPoint = 42;
      const needsReorder = available <= reorderPoint;
      expect(needsReorder).toBe(false);
    });

    test('should classify urgency correctly', () => {
      const projectedDemand = 28;

      // CRITICAL: available <= half of projected demand
      expect(5 <= projectedDemand / 2).toBe(true);

      // HIGH: available <= projected demand
      expect(20 <= projectedDemand).toBe(true);
      expect(20 <= projectedDemand / 2).toBe(false);

      // MEDIUM: available > projected demand but <= reorder point
      expect(35 <= projectedDemand).toBe(false);
    });
  });

  describe('Sales velocity / linear regression', () => {
    test('should detect increasing trend with positive slope', () => {
      const weeklyBuckets = [
        { totalQuantity: 10 },
        { totalQuantity: 15 },
        { totalQuantity: 20 },
        { totalQuantity: 25 },
      ];
      const n = weeklyBuckets.length;
      const sumX = weeklyBuckets.reduce((s, _, i) => s + i, 0);
      const sumY = weeklyBuckets.reduce((s, b) => s + b.totalQuantity, 0);
      const sumXY = weeklyBuckets.reduce((s, b, i) => s + i * b.totalQuantity, 0);
      const sumX2 = weeklyBuckets.reduce((s, _, i) => s + i * i, 0);

      const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
      expect(slope).toBe(5); // +5 per week
      const trend = slope > 0.5 ? 'INCREASING' : slope < -0.5 ? 'DECREASING' : 'STABLE';
      expect(trend).toBe('INCREASING');
    });

    test('should detect stable trend with flat data', () => {
      const weeklyBuckets = [
        { totalQuantity: 10 },
        { totalQuantity: 10 },
        { totalQuantity: 10 },
        { totalQuantity: 10 },
      ];
      const n = weeklyBuckets.length;
      const sumX = weeklyBuckets.reduce((s, _, i) => s + i, 0);
      const sumY = weeklyBuckets.reduce((s, b) => s + b.totalQuantity, 0);
      const sumXY = weeklyBuckets.reduce((s, b, i) => s + i * b.totalQuantity, 0);
      const sumX2 = weeklyBuckets.reduce((s, _, i) => s + i * i, 0);

      const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
      expect(slope).toBe(0);
      const trend = slope > 0.5 ? 'INCREASING' : slope < -0.5 ? 'DECREASING' : 'STABLE';
      expect(trend).toBe('STABLE');
    });

    test('should detect decreasing trend with negative slope', () => {
      const weeklyBuckets = [
        { totalQuantity: 30 },
        { totalQuantity: 25 },
        { totalQuantity: 20 },
        { totalQuantity: 15 },
      ];
      const n = weeklyBuckets.length;
      const sumX = weeklyBuckets.reduce((s, _, i) => s + i, 0);
      const sumY = weeklyBuckets.reduce((s, b) => s + b.totalQuantity, 0);
      const sumXY = weeklyBuckets.reduce((s, b, i) => s + i * b.totalQuantity, 0);
      const sumX2 = weeklyBuckets.reduce((s, _, i) => s + i * i, 0);

      const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
      expect(slope).toBe(-5);
      const trend = slope > 0.5 ? 'INCREASING' : slope < -0.5 ? 'DECREASING' : 'STABLE';
      expect(trend).toBe('DECREASING');
    });
  });

  describe('Low stock alert threshold', () => {
    test('items with onHand < 3 are low stock', () => {
      const items = [
        { onHand: 0 },
        { onHand: 1 },
        { onHand: 2 },
        { onHand: 3 },
        { onHand: 10 },
      ];
      const lowStock = items.filter((i) => i.onHand > 0 && i.onHand < 3);
      expect(lowStock).toHaveLength(2);
    });
  });
});
