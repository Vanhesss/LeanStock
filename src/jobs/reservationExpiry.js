const prisma = require('../config/prisma');
const logger = require('../utils/logger');

/**
 * Reservation Expiry Job
 *
 * Runs every hour. Finds ACTIVE reservations past their expiresAt date,
 * marks them as EXPIRED, and releases the reserved inventory quantity.
 */
async function runReservationExpiry() {
  const now = new Date();

  const expired = await prisma.reservation.findMany({
    where: {
      status: 'ACTIVE',
      expiresAt: { lt: now },
    },
  });

  if (expired.length === 0) {
    logger.info('Reservation expiry: no expired reservations found');
    return { expired: 0 };
  }

  let processed = 0;

  for (const reservation of expired) {
    await prisma.$transaction(async (tx) => {
      await tx.reservation.update({
        where: { id: reservation.id },
        data: { status: 'EXPIRED' },
      });

      await tx.inventory.update({
        where: {
          variantId_locationId: {
            variantId: reservation.variantId,
            locationId: reservation.locationId,
          },
        },
        data: { reservedQuantity: { decrement: reservation.quantity } },
      });
    });

    processed++;
  }

  logger.info({ processed }, 'Reservation expiry job completed');
  return { expired: processed };
}

module.exports = { runReservationExpiry };
