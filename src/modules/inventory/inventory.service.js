const prisma = require('../../config/prisma');
const { NotFoundError, ConflictError } = require('../../utils/errors');
const { parsePagination, buildPaginationMeta, decodeCursor } = require('../../utils/pagination');

class InventoryService {
  async list(tenantId, query) {
    const { cursor, limit } = parsePagination(query);
    const cursorObj = cursor ? decodeCursor(cursor) : null;
    const filters = [{ tenantId }, { locationId: query.locationId }];

    if (query.lowStock === 'true') {
      filters.push({ onHand: { lt: 3 } });
    }

    if (query.search) {
      filters.push({
        OR: [
          { variant: { sku: { contains: query.search, mode: 'insensitive' } } },
          { variant: { product: { model: { contains: query.search, mode: 'insensitive' } } } },
          { variant: { product: { colorway: { contains: query.search, mode: 'insensitive' } } } },
          { location: { name: { contains: query.search, mode: 'insensitive' } } },
        ],
      });
    }

    const where = { AND: filters };

    const [items, total] = await Promise.all([
      prisma.inventory.findMany({
        where: {
          ...where,
          ...(cursorObj ? { id: { lt: cursorObj.id } } : {}),
        },
        include: {
          variant: {
            include: {
              product: {
                include: { brand: { select: { name: true } } },
              },
            },
          },
          location: { select: { name: true } },
        },
        orderBy: { id: 'desc' },
        take: limit,
      }),
      prisma.inventory.count({ where }),
    ]);

    const data = items.map((i) => ({
      id: i.id,
      variantId: i.variantId,
      locationId: i.locationId,
      sku: i.variant.sku,
      size: i.variant.size,
      productModel: i.variant.product.model,
      brandName: i.variant.product.brand.name,
      colorway: i.variant.product.colorway,
      onHand: i.onHand,
      reservedQuantity: i.reservedQuantity,
      available: i.onHand - i.reservedQuantity,
      currentPrice: i.currentPrice,
      lastSoldAt: i.lastSoldAt,
      locationName: i.location.name,
    }));

    return { data, meta: buildPaginationMeta(items, total, limit) };
  }

  async receiveStock(tenantId, data, userId) {
    // Verify location exists
    const location = await prisma.location.findFirst({
      where: { id: data.locationId, tenantId },
    });
    if (!location) throw new NotFoundError('Location', data.locationId);

    const results = await prisma.$transaction(async (tx) => {
      const received = [];

      for (const item of data.items) {
        // Verify variant exists
        const variant = await tx.productVariant.findUnique({
          where: { id: item.variantId },
          include: { product: true },
        });
        if (!variant) throw new NotFoundError('ProductVariant', item.variantId);
        if (variant.product.tenantId !== tenantId) {
          throw new NotFoundError('ProductVariant', item.variantId);
        }

        // Upsert inventory record
        const inventory = await tx.inventory.upsert({
          where: {
            variantId_locationId: {
              variantId: item.variantId,
              locationId: data.locationId,
            },
          },
          update: {
            onHand: { increment: item.quantity },
          },
          create: {
            tenantId,
            variantId: item.variantId,
            locationId: data.locationId,
            onHand: item.quantity,
            currentPrice: variant.product.msrpPrice,
          },
        });

        // Audit log
        await tx.auditLog.create({
          data: {
            tenantId,
            userId,
            action: 'RECEIVE_STOCK',
            entity: 'inventory',
            entityId: inventory.id,
            newValue: { variantId: item.variantId, quantity: item.quantity, locationId: data.locationId },
          },
        });

        received.push(inventory);
      }

      return received;
    });

    return results;
  }

  async adjustStock(tenantId, data, userId) {
    // Use interactive transaction with SELECT FOR UPDATE to prevent race conditions
    return prisma.$transaction(async (tx) => {
      // Lock the inventory row
      const [inventory] = await tx.$queryRaw`
        SELECT * FROM inventory
        WHERE variant_id = ${data.variantId}
          AND location_id = ${data.locationId}
          AND tenant_id = ${tenantId}
        FOR UPDATE
      `;

      if (!inventory) {
        throw new NotFoundError('Inventory record');
      }

      const newOnHand = inventory.on_hand + data.adjustment;
      if (newOnHand < 0) {
        throw new ConflictError('Adjustment would result in negative stock', {
          currentOnHand: inventory.on_hand,
          adjustment: data.adjustment,
        });
      }

      const updated = await tx.inventory.update({
        where: { id: inventory.id },
        data: { onHand: newOnHand },
      });

      // Audit log
      await tx.auditLog.create({
        data: {
          tenantId,
          userId,
          action: 'ADJUST_STOCK',
          entity: 'inventory',
          entityId: inventory.id,
          oldValue: { onHand: inventory.on_hand },
          newValue: { onHand: newOnHand, reason: data.reason, adjustment: data.adjustment },
        },
      });

      return updated;
    });
  }
}

const inventoryService = new InventoryService();

module.exports = { InventoryService, inventoryService };
