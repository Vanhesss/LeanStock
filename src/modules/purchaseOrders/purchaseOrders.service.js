const crypto = require('crypto');
const prisma = require('../../config/prisma');
const { NotFoundError, ConflictError } = require('../../utils/errors');
const { parsePagination, buildPaginationMeta, decodeCursor } = require('../../utils/pagination');
const { sendEmail } = require('../../config/email');
const { purchaseOrderConfirmationEmail, lowStockAlertEmail } = require('../../utils/emailTemplates');

class PurchaseOrdersService {
  async list(tenantId, query) {
    const { cursor, limit } = parsePagination(query);
    const cursorObj = cursor ? decodeCursor(cursor) : null;

    const where = { tenantId };
    if (query.status) where.status = query.status;
    if (query.supplierId) where.supplierId = query.supplierId;

    const [items, total] = await Promise.all([
      prisma.purchaseOrder.findMany({
        where: {
          ...where,
          ...(cursorObj ? { id: { lt: cursorObj.id } } : {}),
        },
        include: {
          supplier: { select: { name: true } },
          location: { select: { name: true } },
          orderer: { select: { firstName: true, lastName: true } },
          items: {
            include: {
              variant: { select: { sku: true, size: true, product: { select: { model: true } } } },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
      }),
      prisma.purchaseOrder.count({ where }),
    ]);

    return { data: items, meta: buildPaginationMeta(items, total, limit) };
  }

  async getById(tenantId, id) {
    const po = await prisma.purchaseOrder.findFirst({
      where: { id, tenantId },
      include: {
        supplier: true,
        location: { select: { name: true } },
        orderer: { select: { firstName: true, lastName: true, email: true } },
        items: {
          include: {
            variant: { select: { sku: true, size: true, product: { select: { model: true, colorway: true } } } },
          },
        },
      },
    });
    if (!po) throw new NotFoundError('PurchaseOrder', id);
    return po;
  }

  async create(tenantId, data, userId) {
    // Verify supplier and location exist
    const [supplier, location] = await Promise.all([
      prisma.supplier.findFirst({ where: { id: data.supplierId, tenantId } }),
      prisma.location.findFirst({ where: { id: data.locationId, tenantId } }),
    ]);
    if (!supplier) throw new NotFoundError('Supplier', data.supplierId);
    if (!location) throw new NotFoundError('Location', data.locationId);

    const totalAmount = data.items.reduce((sum, i) => sum + i.quantity * i.unitCost, 0);
    const orderNumber = `PO-${Date.now()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;

    const po = await prisma.purchaseOrder.create({
      data: {
        tenantId,
        supplierId: data.supplierId,
        locationId: data.locationId,
        orderedBy: userId,
        orderNumber,
        totalAmount,
        note: data.note,
        items: {
          create: data.items.map((i) => ({
            variantId: i.variantId,
            quantity: i.quantity,
            unitCost: i.unitCost,
          })),
        },
      },
      include: {
        supplier: { select: { name: true } },
        location: { select: { name: true } },
        items: { include: { variant: { select: { sku: true } } } },
      },
    });

    return po;
  }

  async submit(tenantId, id) {
    return this._transition(tenantId, id, 'DRAFT', 'SUBMITTED');
  }

  async confirm(tenantId, id) {
    const po = await this._transition(tenantId, id, 'SUBMITTED', 'CONFIRMED');

    // Send PO confirmation email to orderer
    const orderer = await prisma.user.findUnique({ where: { id: po.orderedBy } });
    if (orderer) {
      const fullPo = await this.getById(tenantId, id);
      sendEmail({
        to: orderer.email,
        ...purchaseOrderConfirmationEmail(orderer.firstName, {
          orderNumber: po.orderNumber,
          supplierName: fullPo.supplier.name,
          locationName: fullPo.location.name,
          itemCount: fullPo.items.length,
          totalAmount: po.totalAmount,
        }),
      });
    }

    return po;
  }

  async markShipped(tenantId, id) {
    return this._transition(tenantId, id, 'CONFIRMED', 'SHIPPED');
  }

  async receive(tenantId, id, userId) {
    const po = await prisma.purchaseOrder.findFirst({
      where: { id, tenantId },
      include: { items: { include: { variant: { include: { product: true } } } } },
    });
    if (!po) throw new NotFoundError('PurchaseOrder', id);
    if (po.status !== 'SHIPPED') {
      throw new ConflictError('Purchase order must be SHIPPED to receive', { currentStatus: po.status });
    }

    return prisma.$transaction(async (tx) => {
      // Receive inventory for each item
      for (const item of po.items) {
        await tx.inventory.upsert({
          where: {
            variantId_locationId: {
              variantId: item.variantId,
              locationId: po.locationId,
            },
          },
          update: { onHand: { increment: item.quantity } },
          create: {
            tenantId,
            variantId: item.variantId,
            locationId: po.locationId,
            onHand: item.quantity,
            currentPrice: item.variant.product.msrpPrice,
          },
        });

        await tx.auditLog.create({
          data: {
            tenantId,
            userId,
            action: 'PO_RECEIVE_STOCK',
            entity: 'purchase_order',
            entityId: id,
            newValue: { variantId: item.variantId, quantity: item.quantity },
          },
        });
      }

      return tx.purchaseOrder.update({
        where: { id },
        data: { status: 'RECEIVED' },
        include: {
          supplier: { select: { name: true } },
          location: { select: { name: true } },
          items: { include: { variant: { select: { sku: true } } } },
        },
      });
    }, { isolationLevel: 'Serializable' });
  }

  async cancel(tenantId, id) {
    const po = await prisma.purchaseOrder.findFirst({ where: { id, tenantId } });
    if (!po) throw new NotFoundError('PurchaseOrder', id);
    if (po.status === 'RECEIVED' || po.status === 'CANCELLED') {
      throw new ConflictError('Cannot cancel a received or already cancelled PO', { currentStatus: po.status });
    }

    return prisma.purchaseOrder.update({
      where: { id },
      data: { status: 'CANCELLED' },
    });
  }

  async _transition(tenantId, id, expectedStatus, newStatus) {
    const po = await prisma.purchaseOrder.findFirst({ where: { id, tenantId } });
    if (!po) throw new NotFoundError('PurchaseOrder', id);
    if (po.status !== expectedStatus) {
      throw new ConflictError(`Purchase order must be ${expectedStatus} to transition to ${newStatus}`, {
        currentStatus: po.status,
      });
    }

    return prisma.purchaseOrder.update({
      where: { id },
      data: { status: newStatus },
    });
  }
}

const purchaseOrdersService = new PurchaseOrdersService();

module.exports = { PurchaseOrdersService, purchaseOrdersService };
