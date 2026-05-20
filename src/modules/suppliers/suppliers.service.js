const prisma = require('../../config/prisma');
const { NotFoundError, ConflictError } = require('../../utils/errors');
const { parsePagination, buildPaginationMeta, decodeCursor } = require('../../utils/pagination');

class SuppliersService {
  async list(tenantId, query) {
    const { cursor, limit } = parsePagination(query);
    const cursorObj = cursor ? decodeCursor(cursor) : null;

    const where = { tenantId };
    if (query.search) {
      where.name = { contains: query.search, mode: 'insensitive' };
    }

    const [items, total] = await Promise.all([
      prisma.supplier.findMany({
        where: {
          ...where,
          ...(cursorObj ? { id: { lt: cursorObj.id } } : {}),
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
      }),
      prisma.supplier.count({ where }),
    ]);

    return { data: items, meta: buildPaginationMeta(items, total, limit) };
  }

  async getById(tenantId, id) {
    const supplier = await prisma.supplier.findFirst({
      where: { id, tenantId },
      include: {
        purchaseOrders: {
          take: 10,
          orderBy: { createdAt: 'desc' },
          select: { id: true, orderNumber: true, status: true, totalAmount: true, createdAt: true },
        },
      },
    });
    if (!supplier) throw new NotFoundError('Supplier', id);
    return supplier;
  }

  async create(tenantId, data) {
    const existing = await prisma.supplier.findFirst({
      where: { tenantId, name: data.name },
    });
    if (existing) throw new ConflictError('Supplier with this name already exists');

    return prisma.supplier.create({
      data: { tenantId, ...data },
    });
  }

  async update(tenantId, id, data) {
    const supplier = await prisma.supplier.findFirst({ where: { id, tenantId } });
    if (!supplier) throw new NotFoundError('Supplier', id);

    return prisma.supplier.update({
      where: { id },
      data,
    });
  }
}

const suppliersService = new SuppliersService();

module.exports = { SuppliersService, suppliersService };
