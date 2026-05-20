const prisma = require('../../config/prisma');
const { parsePagination, buildPaginationMeta, decodeCursor } = require('../../utils/pagination');
const { sendEmail } = require('../../config/email');
const { lowStockAlertEmail } = require('../../utils/emailTemplates');

class ForecastingService {
  /**
   * Predictive reorder suggestions using simple moving average (SMA) on sales data.
   * For each variant+location, calculates average daily sales over last N days,
   * projects demand for the lead time period, and suggests reorder if projected
   * demand exceeds current available stock.
   */
  async getReorderSuggestions(tenantId, query) {
    const windowDays = parseInt(query.windowDays) || 30;
    const leadTimeDays = parseInt(query.leadTimeDays) || 14;
    const safetyStockMultiplier = parseFloat(query.safetyStockMultiplier) || 1.5;

    const windowStart = new Date();
    windowStart.setDate(windowStart.getDate() - windowDays);

    // Get all inventory records with their sales in the window
    const inventoryRecords = await prisma.inventory.findMany({
      where: { tenantId, onHand: { gt: 0 } },
      include: {
        variant: {
          select: {
            id: true,
            sku: true,
            size: true,
            product: { select: { model: true, colorway: true, brand: { select: { name: true } } } },
            sales: {
              where: {
                tenantId,
                soldAt: { gte: windowStart },
              },
              select: { quantity: true, soldAt: true },
            },
          },
        },
        location: { select: { id: true, name: true } },
      },
    });

    const suggestions = [];

    for (const inv of inventoryRecords) {
      const sales = inv.variant.sales.filter(
        (s) => s.soldAt >= windowStart
      );

      const totalSold = sales.reduce((sum, s) => sum + s.quantity, 0);
      const avgDailySales = totalSold / windowDays;

      if (avgDailySales === 0) continue; // No sales = no reorder needed

      const projectedDemand = Math.ceil(avgDailySales * leadTimeDays);
      const safetyStock = Math.ceil(avgDailySales * leadTimeDays * (safetyStockMultiplier - 1));
      const reorderPoint = projectedDemand + safetyStock;
      const available = inv.onHand - inv.reservedQuantity;

      if (available <= reorderPoint) {
        const suggestedQuantity = Math.max(reorderPoint - available + projectedDemand, 1);

        suggestions.push({
          variantId: inv.variant.id,
          sku: inv.variant.sku,
          size: inv.variant.size,
          productModel: inv.variant.product.model,
          brandName: inv.variant.product.brand.name,
          colorway: inv.variant.product.colorway,
          locationId: inv.location.id,
          locationName: inv.location.name,
          currentOnHand: inv.onHand,
          reserved: inv.reservedQuantity,
          available,
          avgDailySales: Math.round(avgDailySales * 100) / 100,
          totalSoldInWindow: totalSold,
          projectedDemand,
          safetyStock,
          reorderPoint,
          suggestedOrderQuantity: suggestedQuantity,
          urgency: available <= projectedDemand / 2 ? 'CRITICAL' : available <= projectedDemand ? 'HIGH' : 'MEDIUM',
        });
      }
    }

    // Sort by urgency (CRITICAL > HIGH > MEDIUM)
    const urgencyOrder = { CRITICAL: 0, HIGH: 1, MEDIUM: 2 };
    suggestions.sort((a, b) => urgencyOrder[a.urgency] - urgencyOrder[b.urgency]);

    return {
      data: suggestions,
      meta: {
        windowDays,
        leadTimeDays,
        safetyStockMultiplier,
        totalSuggestions: suggestions.length,
        criticalCount: suggestions.filter((s) => s.urgency === 'CRITICAL').length,
      },
    };
  }

  /**
   * Sales velocity analysis — moving average trend per variant over time.
   * Returns weekly sales buckets and trend direction.
   */
  async getSalesVelocity(tenantId, query) {
    const weeks = parseInt(query.weeks) || 8;
    const variantId = query.variantId;
    const locationId = query.locationId;

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - weeks * 7);

    const where = { tenantId, soldAt: { gte: startDate } };
    if (variantId) where.variantId = variantId;
    if (locationId) where.locationId = locationId;

    const sales = await prisma.sale.findMany({
      where,
      select: { quantity: true, soldAt: true, variantId: true },
      orderBy: { soldAt: 'asc' },
    });

    // Bucket sales into weekly periods
    const weeklyBuckets = [];
    for (let i = 0; i < weeks; i++) {
      const weekStart = new Date(startDate);
      weekStart.setDate(weekStart.getDate() + i * 7);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 7);

      const weekSales = sales.filter((s) => s.soldAt >= weekStart && s.soldAt < weekEnd);
      const totalQuantity = weekSales.reduce((sum, s) => sum + s.quantity, 0);

      weeklyBuckets.push({
        weekNumber: i + 1,
        startDate: weekStart.toISOString().split('T')[0],
        endDate: weekEnd.toISOString().split('T')[0],
        totalQuantity,
      });
    }

    // Calculate simple linear regression for trend
    const n = weeklyBuckets.length;
    const sumX = weeklyBuckets.reduce((s, _, i) => s + i, 0);
    const sumY = weeklyBuckets.reduce((s, b) => s + b.totalQuantity, 0);
    const sumXY = weeklyBuckets.reduce((s, b, i) => s + i * b.totalQuantity, 0);
    const sumX2 = weeklyBuckets.reduce((s, _, i) => s + i * i, 0);

    const slope = n > 1 ? (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX) : 0;
    const trend = slope > 0.5 ? 'INCREASING' : slope < -0.5 ? 'DECREASING' : 'STABLE';

    return {
      data: {
        weeklyBuckets,
        trend,
        slope: Math.round(slope * 100) / 100,
        averageWeeklySales: Math.round((sumY / n) * 100) / 100,
      },
    };
  }

  /**
   * Check low-stock items and send alert emails to managers.
   */
  async checkLowStockAlerts(tenantId) {
    const lowStockThreshold = 3;

    const lowStockItems = await prisma.inventory.findMany({
      where: {
        tenantId,
        onHand: { gt: 0, lt: lowStockThreshold },
      },
      include: {
        variant: { select: { sku: true, product: { select: { model: true } } } },
        location: { select: { name: true } },
      },
    });

    if (lowStockItems.length === 0) return { alertsSent: 0 };

    // Find managers to notify
    const managers = await prisma.user.findMany({
      where: { tenantId, role: { in: ['ADMIN', 'MANAGER'] }, isActive: true, isEmailVerified: true },
      select: { email: true, firstName: true },
    });

    for (const manager of managers) {
      sendEmail({
        to: manager.email,
        ...lowStockAlertEmail(manager.firstName, lowStockItems.map((i) => ({
          sku: i.variant.sku,
          productModel: i.variant.product.model,
          locationName: i.location.name,
          onHand: i.onHand,
        }))),
      });
    }

    return { alertsSent: managers.length, lowStockCount: lowStockItems.length };
  }
}

const forecastingService = new ForecastingService();

module.exports = { ForecastingService, forecastingService };
