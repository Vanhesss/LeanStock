const prisma = require('../../config/prisma');
const { env } = require('../../config/env');
const { NotFoundError, ConflictError, AppError } = require('../../utils/errors');
const { parsePagination, buildPaginationMeta, decodeCursor } = require('../../utils/pagination');
const { sendEmail } = require('../../config/email');
const { reservationCreatedEmail } = require('../../utils/emailTemplates');

class ReservationsService {
  async create(tenantId, data, userId) {
    return prisma.$transaction(async (tx) => {
      // Lock inventory row
      const [inventory] = await tx.$queryRaw`
        SELECT i.*, pv.sku
        FROM inventory i
        JOIN product_variants pv ON pv.id = i.variant_id
        WHERE i.variant_id = ${data.variantId}
          AND i.location_id = ${data.locationId}
          AND i.tenant_id = ${tenantId}
        FOR UPDATE
      `;

      if (!inventory) {
        throw new NotFoundError('Inventory record');
      }

      const available = inventory.on_hand - inventory.reserved_quantity;
      if (available < data.quantity) {
        throw new ConflictError('Insufficient available stock for reservation', {
          available,
          requested: data.quantity,
        });
      }

      // Increment reserved quantity
      await tx.inventory.update({
        where: { id: inventory.id },
        data: { reservedQuantity: { increment: data.quantity } },
      });

      const expiresAt = new Date(Date.now() + env.RESERVATION_TTL_HOURS * 60 * 60 * 1000);

      const reservation = await tx.reservation.create({
        data: {
          tenantId,
          variantId: data.variantId,
          locationId: data.locationId,
          reservedBy: userId,
          quantity: data.quantity,
          customerName: data.customerName,
          customerPhone: data.customerPhone || null,
          expiresAt,
        },
        include: {
          variant: { include: { product: true } },
          location: { select: { name: true } },
          staff: { select: { email: true, firstName: true } },
        },
      });

      // Audit log
      await tx.auditLog.create({
        data: {
          tenantId,
          userId,
          action: 'CREATE_RESERVATION',
          entity: 'reservation',
          entityId: reservation.id,
          newValue: { variantId: data.variantId, quantity: data.quantity, customerName: data.customerName },
        },
      });

      // Send email notification (async)
      sendEmail({
        to: reservation.staff.email,
        ...reservationCreatedEmail(reservation.staff.email, {
          customerName: data.customerName,
          customerPhone: data.customerPhone,
          sku: inventory.sku,
          quantity: data.quantity,
          expiresAt: expiresAt.toISOString(),
        }),
      });

      return {
        id: reservation.id,
        variantId: reservation.variantId,
        locationId: reservation.locationId,
        sku: inventory.sku,
        productModel: reservation.variant.product.model,
        quantity: reservation.quantity,
        customerName: reservation.customerName,
        customerPhone: reservation.customerPhone,
        status: reservation.status,
        expiresAt: reservation.expiresAt,
        locationName: reservation.location.name,
        createdAt: reservation.createdAt,
      };
    });
  }

  async list(tenantId, query) {
    const { cursor, limit } = parsePagination(query);
    const cursorObj = cursor ? decodeCursor(cursor) : null;

    const filters = [{ tenantId }];
    if (query.locationId) filters.push({ locationId: query.locationId });
    if (query.status) filters.push({ status: query.status });

    const where = { AND: filters };

    const [items, total] = await Promise.all([
      prisma.reservation.findMany({
        where: {
          ...where,
          ...(cursorObj ? { id: { lt: cursorObj.id } } : {}),
        },
        include: {
          variant: { include: { product: { include: { brand: { select: { name: true } } } } } },
          location: { select: { name: true } },
          staff: { select: { firstName: true, lastName: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
      }),
      prisma.reservation.count({ where }),
    ]);

    const data = items.map((r) => ({
      id: r.id,
      sku: r.variant.sku,
      productModel: r.variant.product.model,
      brandName: r.variant.product.brand.name,
      quantity: r.quantity,
      customerName: r.customerName,
      customerPhone: r.customerPhone,
      status: r.status,
      expiresAt: r.expiresAt,
      locationName: r.location.name,
      reservedBy: `${r.staff.firstName} ${r.staff.lastName}`,
      createdAt: r.createdAt,
    }));

    return { data, meta: buildPaginationMeta(items, total, limit) };
  }

  async cancel(tenantId, id, userId) {
    const reservation = await prisma.reservation.findFirst({
      where: { id, tenantId },
    });

    if (!reservation) throw new NotFoundError('Reservation', id);
    if (reservation.status !== 'ACTIVE') {
      throw new AppError(400, 'INVALID_STATUS', `Cannot cancel reservation with status ${reservation.status}`);
    }

    return prisma.$transaction(async (tx) => {
      const updated = await tx.reservation.update({
        where: { id },
        data: { status: 'CANCELLED' },
      });

      // Release reserved quantity
      await tx.inventory.update({
        where: {
          variantId_locationId: {
            variantId: reservation.variantId,
            locationId: reservation.locationId,
          },
        },
        data: { reservedQuantity: { decrement: reservation.quantity } },
      });

      await tx.auditLog.create({
        data: {
          tenantId,
          userId,
          action: 'CANCEL_RESERVATION',
          entity: 'reservation',
          entityId: id,
          oldValue: { status: 'ACTIVE' },
          newValue: { status: 'CANCELLED' },
        },
      });

      return updated;
    });
  }

  async convertToSale(tenantId, id, userId) {
    const reservation = await prisma.reservation.findFirst({
      where: { id, tenantId },
      include: { variant: { include: { product: true } } },
    });

    if (!reservation) throw new NotFoundError('Reservation', id);
    if (reservation.status !== 'ACTIVE') {
      throw new AppError(400, 'INVALID_STATUS', `Cannot convert reservation with status ${reservation.status}`);
    }

    return prisma.$transaction(async (tx) => {
      // Lock inventory
      const [inventory] = await tx.$queryRaw`
        SELECT * FROM inventory
        WHERE variant_id = ${reservation.variantId}
          AND location_id = ${reservation.locationId}
        FOR UPDATE
      `;

      // Update reservation status
      await tx.reservation.update({
        where: { id },
        data: { status: 'CONVERTED' },
      });

      // Decrement on_hand and reserved_quantity
      await tx.inventory.update({
        where: { id: inventory.id },
        data: {
          onHand: { decrement: reservation.quantity },
          reservedQuantity: { decrement: reservation.quantity },
          lastSoldAt: new Date(),
        },
      });

      // Create the sale
      const currentPrice = Number(inventory.current_price);
      const sale = await tx.sale.create({
        data: {
          tenantId,
          variantId: reservation.variantId,
          locationId: reservation.locationId,
          soldBy: userId,
          quantity: reservation.quantity,
          unitPrice: currentPrice,
          totalPrice: currentPrice * reservation.quantity,
        },
      });

      await tx.auditLog.create({
        data: {
          tenantId,
          userId,
          action: 'CONVERT_RESERVATION',
          entity: 'reservation',
          entityId: id,
          newValue: { saleId: sale.id, status: 'CONVERTED' },
        },
      });

      return { reservation: { id, status: 'CONVERTED' }, sale };
    });
  }
}

const reservationsService = new ReservationsService();

module.exports = { ReservationsService, reservationsService };
