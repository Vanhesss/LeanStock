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
  const thresholdDays = env.DEAD_STOCK_THRESHOLD_DAYS;    // default: 30
  const markdownPercent = env.DEAD_STOCK_MARKDOWN_PERCENT; // default: 10
  const intervalHours = env.DEAD_STOCK_INTERVAL_HOURS;     // default: 72
  const priceFloorPercent = env.DEAD_STOCK_PRICE_FLOOR_PERCENT; // default: 40

  logger.info({ thresholdDays, markdownPercent, intervalHours, priceFloorPercent }, 'Dead stock decay job started');

  // Find dead stock candidates using raw SQL (matches blueprint query)
  const candidates = await prisma.$queryRaw`
    SELECT
      i.id AS inventory_id,
      i.current_price,
      i.last_markdown_at,
      i.variant_id,
      i.location_id,
      i.tenant_id,
      p.msrp_price,
      p.model AS product_model,
      b.name AS brand_name,
      pv.sku,
      EXTRACT(DAY FROM NOW() - COALESCE(i.last_sold_at, i.received_at)) AS days_without_sale
    FROM inventory i
    JOIN product_variants pv ON pv.id = i.variant_id
    JOIN products p ON p.id = pv.product_id
    JOIN brands b ON b.id = p.brand_id
    WHERE i.on_hand > 0
      AND p.exclude_from_markdown = false
      AND p.is_active = true
      AND EXTRACT(DAY FROM NOW() - COALESCE(i.last_sold_at, i.received_at)) > ${thresholdDays}
      AND (
        i.last_markdown_at IS NULL
        OR EXTRACT(HOUR FROM NOW() - i.last_markdown_at) >= ${intervalHours}
      )
      AND i.current_price > (p.msrp_price * ${priceFloorPercent} / 100)
    ORDER BY days_without_sale DESC
  `;

  let markedDown = 0;

  for (const item of candidates) {
    const currentPrice = Number(item.current_price);
    const msrpPrice = Number(item.msrp_price);
    const priceFloor = Math.floor(msrpPrice * priceFloorPercent / 100);

    // Calculate new price: reduce by markdownPercent
    let newPrice = Math.floor(currentPrice * (1 - markdownPercent / 100));

    // Enforce price floor
    if (newPrice < priceFloor) {
      newPrice = priceFloor;
    }

    // Skip if price wouldn't change
    if (newPrice >= currentPrice) continue;

    await prisma.$transaction(async (tx) => {
      // Update inventory price
      await tx.inventory.update({
        where: { id: item.inventory_id },
        data: {
          currentPrice: newPrice,
          lastMarkdownAt: new Date(),
        },
      });

      // Record in price history
      await tx.priceHistory.create({
        data: {
          tenantId: item.tenant_id,
          variantId: item.variant_id,
          locationId: item.location_id,
          oldPrice: currentPrice,
          newPrice: newPrice,
          reason: `dead_stock_decay (${item.days_without_sale} days without sale)`,
        },
      });
    });

    markedDown++;
    logger.info(
      { sku: item.sku, oldPrice: currentPrice, newPrice, daysWithoutSale: Number(item.days_without_sale) },
      'Applied dead stock markdown'
    );
  }

  logger.info({ processed: candidates.length, markedDown }, 'Dead stock decay job completed');
  return { processed: candidates.length, marked: markedDown };
}

module.exports = { runDeadStockDecay };
