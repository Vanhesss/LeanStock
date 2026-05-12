const prisma = require('../config/prisma');
const { env } = require('../config/env');
const logger = require('../utils/logger');

/**
 * Dead Stock Decay Job
 *
 * Scans inventory for items that haven't sold in DEAD_STOCK_THRESHOLD_DAYS days.
 * Applies DEAD_STOCK_MARKDOWN_PERCENT% discount if at least DEAD_STOCK_INTERVAL_HOURS
 * hours have passed since the last markdown. Respects a price floor of
 * DEAD_STOCK_PRICE_FLOOR_PERCENT% of the original MSRP.
 *
 * All parameters are configurable via environment variables — NOT hardcoded.
 */
async function runDeadStockDecay() {
  const thresholdDays = env.DEAD_STOCK_THRESHOLD_DAYS;
  const markdownPercent = env.DEAD_STOCK_MARKDOWN_PERCENT;
  const intervalHours = env.DEAD_STOCK_INTERVAL_HOURS;
  const priceFloorPercent = env.DEAD_STOCK_PRICE_FLOOR_PERCENT;

  logger.info({ thresholdDays, markdownPercent, intervalHours, priceFloorPercent }, 'Dead stock decay job started');

  const thresholdDate = new Date(Date.now() - thresholdDays * 24 * 60 * 60 * 1000);
  const intervalDate = new Date(Date.now() - intervalHours * 60 * 60 * 1000);

  // Find dead stock candidates using Prisma ORM
  const candidates = await prisma.inventory.findMany({
    where: {
      onHand: { gt: 0 },
      variant: {
        product: {
          excludeFromMarkdown: false,
          isActive: true,
        },
      },
      OR: [
        { lastSoldAt: { lt: thresholdDate } },
        {
          lastSoldAt: null,
          receivedAt: { lt: thresholdDate },
        },
      ],
      AND: [
        {
          OR: [
            { lastMarkdownAt: null },
            { lastMarkdownAt: { lt: intervalDate } },
          ],
        },
      ],
    },
    include: {
      variant: {
        include: {
          product: {
            include: {
              brand: { select: { name: true } },
            },
          },
        },
      },
    },
  });

  let markedDown = 0;

  for (const item of candidates) {
    const currentPrice = item.currentPrice;
    const msrpPrice = item.variant.product.msrpPrice;
    const priceFloor = Math.floor(msrpPrice * priceFloorPercent / 100);

    // Skip items already at or below price floor
    if (currentPrice <= priceFloor) continue;

    // Calculate new price: reduce by markdownPercent
    let newPrice = Math.floor(currentPrice * (1 - markdownPercent / 100));

    // Enforce price floor
    if (newPrice < priceFloor) {
      newPrice = priceFloor;
    }

    // Skip if price wouldn't change
    if (newPrice >= currentPrice) continue;

    const daysSinceLastSale = Math.floor(
      (Date.now() - (item.lastSoldAt || item.receivedAt).getTime()) / (1000 * 60 * 60 * 24)
    );

    await prisma.$transaction(async (tx) => {
      // Update inventory price
      await tx.inventory.update({
        where: { id: item.id },
        data: {
          currentPrice: newPrice,
          lastMarkdownAt: new Date(),
        },
      });

      // Record in price history
      await tx.priceHistory.create({
        data: {
          tenantId: item.tenantId,
          variantId: item.variantId,
          locationId: item.locationId,
          oldPrice: currentPrice,
          newPrice: newPrice,
          reason: `dead_stock_decay (${daysSinceLastSale} days without sale)`,
        },
      });
    });

    markedDown++;
    logger.info(
      { sku: item.variant.sku, oldPrice: currentPrice, newPrice, daysWithoutSale: daysSinceLastSale },
      'Applied dead stock markdown'
    );
  }

  logger.info({ processed: candidates.length, markedDown }, 'Dead stock decay job completed');
  return { processed: candidates.length, marked: markedDown };
}

module.exports = { runDeadStockDecay };
