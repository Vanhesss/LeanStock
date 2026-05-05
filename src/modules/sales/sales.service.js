const prisma = require('../../config/prisma');
const { NotFoundError, ConflictError } = require('../../utils/errors');
const { parsePagination, buildPaginationMeta, decodeCursor } = require('../../utils/pagination');
const { sendEmail } = require('../../config/email');
const { saleConfirmationEmail } = require('../../utils/emailTemplates');

class SalesService {
  async create(tenantId, data, userId) {
    return prisma.$transaction(async (tx) => {
      // Lock inventory row to prevent overselling
      const [inventory] = await tx.$queryRaw`
        SELECT i.*, pv.sku, l.name AS location_name
        FROM inventory i
        JOIN product_variants pv ON pv.id = i.variant_id
        JOIN locations l ON l.id = i.location_id
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
        throw new ConflictError('Insufficient stock', {
          available,
          requested: data.quantity,
        });
      }

      // Decrement stock
      await tx.inventory.update({
        where: { id: inventory.id },
        data: {
          onHand: { decrement: data.quantity },
          lastSoldAt: new Date(),
        },
      });

      const totalPrice = data.unitPrice * data.quantity;

      // Create sale record
      const sale = await tx.sale.create({
        data: {
          tenantId,
          variantId: data.variantId,
          locationId: data.locationId,
          soldBy: userId,
          quantity: data.quantity,
          unitPrice: data.unitPrice,
          totalPrice,
        },
        include: {
          variant: { include: { product: { include: { brand: true } } } },
          location: { select: { name: true } },
          staff: { select: { email: true, firstName: true, lastName: true } },
        },
      });

      // Audit log
      await tx.auditLog.create({
        data: {
          tenantId,
          userId,
          action: 'CREATE_SALE',
          entity: 'sale',
          entityId: sale.id,
          newValue: { variantId: data.variantId, quantity: data.quantity, totalPrice },
        },
      });

      // Send sale confirmation email (async, non-blocking)
      sendEmail({
        to: sale.staff.email,
        ...saleConfirmationEmail(sale.staff.email, {
          sku: inventory.sku,
          quantity: data.quantity,
          totalPrice,
          locationName: inventory.location_name,
        }),
      });

      return {
        id: sale.id,
        variantId: sale.variantId,
        locationId: sale.locationId,
        sku: sale.variant.sku,
        productModel: sale.variant.product.model,
        brandName: sale.variant.product.brand.name,
        quantity: sale.quantity,
        unitPrice: sale.unitPrice,
        totalPrice: sale.totalPrice,
        soldBy: `${sale.staff.firstName} ${sale.staff.lastName}`,
        locationName: sale.location.name,
        soldAt: sale.soldAt,
      };
    });
  }

  async list(tenantId, query) {
    const { cursor, limit } = parsePagination(query);
    const cursorObj = cursor ? decodeCursor(cursor) : null;

    const filters = [{ tenantId }];
    if (query.locationId) filters.push({ locationId: query.locationId });
    if (query.variantId) filters.push({ variantId: query.variantId });
    if (query.startDate || query.endDate) {
      const dateFilter = {};
      if (query.startDate) dateFilter.gte = new Date(query.startDate);
      if (query.endDate) dateFilter.lte = new Date(query.endDate);
      filters.push({ soldAt: dateFilter });
    }

    const where = { AND: filters };

    const [items, total] = await Promise.all([
      prisma.sale.findMany({
        where: {
          ...where,
          ...(cursorObj ? { id: { lt: cursorObj.id } } : {}),
        },
        include: {
          variant: { include: { product: { include: { brand: { select: { name: true } } } } } },
          location: { select: { name: true } },
          staff: { select: { firstName: true, lastName: true } },
        },
        orderBy: { soldAt: 'desc' },
        take: limit,
      }),
      prisma.sale.count({ where }),
    ]);

    const data = items.map((s) => ({
      id: s.id,
      sku: s.variant.sku,
      productModel: s.variant.product.model,
      brandName: s.variant.product.brand.name,
      quantity: s.quantity,
      unitPrice: s.unitPrice,
      totalPrice: s.totalPrice,
      soldBy: `${s.staff.firstName} ${s.staff.lastName}`,
      locationName: s.location.name,
      soldAt: s.soldAt,
    }));

    return { data, meta: buildPaginationMeta(items, total, limit) };
  }

  async getById(tenantId, id) {
    const sale = await prisma.sale.findFirst({
      where: { id, tenantId },
      include: {
        variant: { include: { product: { include: { brand: true } } } },
        location: { select: { name: true } },
        staff: { select: { firstName: true, lastName: true, email: true } },
      },
    });

    if (!sale) throw new NotFoundError('Sale', id);

    return {
      id: sale.id,
      variantId: sale.variantId,
      locationId: sale.locationId,
      sku: sale.variant.sku,
      size: sale.variant.size,
      productModel: sale.variant.product.model,
      brandName: sale.variant.product.brand.name,
      colorway: sale.variant.product.colorway,
      quantity: sale.quantity,
      unitPrice: sale.unitPrice,
      totalPrice: sale.totalPrice,
      soldBy: `${sale.staff.firstName} ${sale.staff.lastName}`,
      staffEmail: sale.staff.email,
      locationName: sale.location.name,
      soldAt: sale.soldAt,
    };
  }
}

const salesService = new SalesService();

module.exports = { SalesService, salesService };
