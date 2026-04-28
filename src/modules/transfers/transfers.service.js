const prisma = require('../../config/prisma');
const { NotFoundError, ConflictError, AppError } = require('../../utils/errors');
const { parsePagination, buildPaginationMeta, decodeCursor } = require('../../utils/pagination');

class TransfersService {
  async list(tenantId, query) {
    const { cursor, limit } = parsePagination(query);
    const cursorObj = cursor ? decodeCursor(cursor) : null;

    const where = { tenantId };
    if (query.status) where.status = query.status;
    if (query.locationId) {
      where.OR = [
        { sourceLocId: query.locationId },
        { destLocId: query.locationId },
      ];
    }

    const [items, total] = await Promise.all([
      prisma.transfer.findMany({
        where: {
          ...where,
          ...(cursorObj ? { id: { lt: cursorObj.id } } : {}),
        },
        include: {
          sourceLocation: { select: { id: true, name: true } },
          destLocation: { select: { id: true, name: true } },
          items: {
            include: {
              variant: {
                select: { sku: true, size: true, product: { select: { model: true } } },
              },
            },
          },
        },
        orderBy: { id: 'desc' },
        take: limit,
      }),
      prisma.transfer.count({ where }),
    ]);

    return { data: items, meta: buildPaginationMeta(items, total, limit) };
  }

  async create(tenantId, userId, data) {
    if (data.sourceLocationId === data.destLocationId) {
      throw new AppError(400, 'BAD_REQUEST', 'Source and destination locations must be different');
    }

    // Verify both locations exist
    const [source, dest] = await Promise.all([
      prisma.location.findFirst({ where: { id: data.sourceLocationId, tenantId } }),
      prisma.location.findFirst({ where: { id: data.destLocationId, tenantId } }),
    ]);
    if (!source) throw new NotFoundError('Source location', data.sourceLocationId);
    if (!dest) throw new NotFoundError('Destination location', data.destLocationId);

    // Verify stock availability at source (no lock needed yet — just validation)
    for (const item of data.items) {
      const inv = await prisma.inventory.findFirst({
        where: { variantId: item.variantId, locationId: data.sourceLocationId, tenantId },
      });
      if (!inv || inv.onHand - inv.reservedQuantity < item.quantity) {
        throw new ConflictError('Insufficient available stock at source location', {
          variantId: item.variantId,
          available: inv ? inv.onHand - inv.reservedQuantity : 0,
          requested: item.quantity,
        });
      }
    }

    const transfer = await prisma.transfer.create({
      data: {
        tenantId,
        sourceLocId: data.sourceLocationId,
        destLocId: data.destLocationId,
        requestedBy: userId,
        note: data.note,
        items: {
          create: data.items.map((i) => ({
            variantId: i.variantId,
            quantity: i.quantity,
          })),
        },
      },
      include: {
        sourceLocation: { select: { id: true, name: true } },
        destLocation: { select: { id: true, name: true } },
        items: { include: { variant: { select: { sku: true, size: true } } } },
      },
    });

    return transfer;
  }

  async approve(tenantId, transferId, userId) {
    const transfer = await prisma.transfer.findFirst({
      where: { id: transferId, tenantId },
    });
    if (!transfer) throw new NotFoundError('Transfer', transferId);
    if (transfer.status !== 'PENDING') {
      throw new ConflictError('Transfer is not in PENDING status', { currentStatus: transfer.status });
    }

    return prisma.transfer.update({
      where: { id: transferId },
      data: { status: 'APPROVED', reviewedBy: userId },
      include: {
        sourceLocation: { select: { id: true, name: true } },
        destLocation: { select: { id: true, name: true } },
        items: true,
      },
    });
  }

  async reject(tenantId, transferId, userId, reason) {
    const transfer = await prisma.transfer.findFirst({
      where: { id: transferId, tenantId },
    });
    if (!transfer) throw new NotFoundError('Transfer', transferId);
    if (transfer.status !== 'PENDING') {
      throw new ConflictError('Transfer is not in PENDING status', { currentStatus: transfer.status });
    }

    return prisma.transfer.update({
      where: { id: transferId },
      data: { status: 'REJECTED', reviewedBy: userId, rejectionReason: reason },
    });
  }

  /**
   * Ship transfer — atomically decrement stock at source using SELECT FOR UPDATE.
   * This prevents overselling when two managers ship simultaneously.
   */
  async ship(tenantId, transferId) {
    return prisma.$transaction(async (tx) => {
      const transfer = await tx.transfer.findFirst({
        where: { id: transferId, tenantId },
        include: { items: true },
      });
      if (!transfer) throw new NotFoundError('Transfer', transferId);
      if (transfer.status !== 'APPROVED') {
        throw new ConflictError('Transfer must be APPROVED before shipping', {
          currentStatus: transfer.status,
        });
      }

      // Lock and decrement source inventory for each item
      for (const item of transfer.items) {
        // SELECT FOR UPDATE — locks the row until transaction completes
        const [inv] = await tx.$queryRaw`
          SELECT id, on_hand, reserved_quantity
          FROM inventory
          WHERE variant_id = ${item.variantId}
            AND location_id = ${transfer.sourceLocId}
            AND tenant_id = ${tenantId}
          FOR UPDATE
        `;

        if (!inv) {
          throw new NotFoundError('Inventory record for variant ' + item.variantId);
        }

        const available = inv.on_hand - inv.reserved_quantity;
        if (available < item.quantity) {
          throw new ConflictError('Insufficient stock to ship', {
            variantId: item.variantId,
            available,
            requested: item.quantity,
          });
        }

        // Decrement stock at source
        await tx.inventory.update({
          where: { id: inv.id },
          data: { onHand: { decrement: item.quantity } },
        });
      }

      // Update transfer status
      return tx.transfer.update({
        where: { id: transferId },
        data: { status: 'IN_TRANSIT' },
        include: {
          sourceLocation: { select: { name: true } },
          destLocation: { select: { name: true } },
          items: { include: { variant: { select: { sku: true } } } },
        },
      });
    });
  }

  /**
   * Receive transfer — atomically increment stock at destination.
   */
  async receive(tenantId, transferId) {
    return prisma.$transaction(async (tx) => {
      const transfer = await tx.transfer.findFirst({
        where: { id: transferId, tenantId },
        include: { items: { include: { variant: { include: { product: true } } } } },
      });
      if (!transfer) throw new NotFoundError('Transfer', transferId);
      if (transfer.status !== 'IN_TRANSIT') {
        throw new ConflictError('Transfer must be IN_TRANSIT to receive', {
          currentStatus: transfer.status,
        });
      }

      for (const item of transfer.items) {
        // Upsert inventory at destination
        await tx.inventory.upsert({
          where: {
            variantId_locationId: {
              variantId: item.variantId,
              locationId: transfer.destLocId,
            },
          },
          update: {
            onHand: { increment: item.quantity },
          },
          create: {
            tenantId,
            variantId: item.variantId,
            locationId: transfer.destLocId,
            onHand: item.quantity,
            currentPrice: item.variant.product.msrpPrice,
          },
        });
      }

      return tx.transfer.update({
        where: { id: transferId },
        data: { status: 'COMPLETED' },
        include: {
          sourceLocation: { select: { name: true } },
          destLocation: { select: { name: true } },
          items: { include: { variant: { select: { sku: true } } } },
        },
      });
    });
  }
}

const transfersService = new TransfersService();

module.exports = { TransfersService, transfersService };
