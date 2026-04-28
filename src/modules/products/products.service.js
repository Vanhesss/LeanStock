const crypto = require('crypto');
const prisma = require('../../config/prisma');
const { NotFoundError } = require('../../utils/errors');
const { parsePagination, buildPaginationMeta, decodeCursor } = require('../../utils/pagination');

class ProductsService {
  async list(tenantId, query) {
    const { cursor, limit } = parsePagination(query);
    const cursorObj = cursor ? decodeCursor(cursor) : null;

    const where = { tenantId };
    if (query.brandId) where.brandId = query.brandId;
    if (query.isActive !== undefined) where.isActive = query.isActive === 'true';
    if (query.search) {
      where.OR = [
        { model: { contains: query.search, mode: 'insensitive' } },
        { variants: { some: { sku: { contains: query.search, mode: 'insensitive' } } } },
      ];
    }

    const [items, total] = await Promise.all([
      prisma.product.findMany({
        where: {
          ...where,
          ...(cursorObj ? { id: { lt: cursorObj.id } } : {}),
        },
        include: {
          brand: { select: { id: true, name: true } },
          variants: { select: { id: true, sku: true, size: true }, orderBy: { size: 'asc' } },
        },
        orderBy: { id: 'desc' },
        take: limit,
      }),
      prisma.product.count({ where }),
    ]);

    return {
      data: items,
      meta: buildPaginationMeta(items, total, limit),
    };
  }

  async getById(tenantId, id) {
    const product = await prisma.product.findFirst({
      where: { id, tenantId },
      include: {
        brand: { select: { id: true, name: true } },
        variants: {
          select: { id: true, sku: true, size: true },
          orderBy: { size: 'asc' },
        },
      },
    });

    if (!product) throw new NotFoundError('Product', id);
    return product;
  }

  async create(tenantId, data) {
    // Verify brand exists for this tenant
    const brand = await prisma.brand.findFirst({
      where: { id: data.brandId, tenantId },
    });
    if (!brand) throw new NotFoundError('Brand', data.brandId);

    // Generate SKU prefix
    const brandPrefix = brand.name.substring(0, 3).toUpperCase();
    const modelCode = data.model.replace(/\s+/g, '').substring(0, 4).toUpperCase();
    const colorCode = data.colorway.substring(0, 3).toUpperCase();
    const skuSeed = crypto.randomUUID().slice(0, 8).toUpperCase();

    const product = await prisma.product.create({
      data: {
        tenantId,
        brandId: data.brandId,
        model: data.model,
        colorway: data.colorway,
        msrpPrice: data.msrpPrice,
        variants: {
          create: data.sizes.map((size) => ({
            sku: `${brandPrefix}-${modelCode}-${colorCode}-${skuSeed}-${size}`,
            size,
          })),
        },
      },
      include: {
        brand: { select: { id: true, name: true } },
        variants: { select: { id: true, sku: true, size: true }, orderBy: { size: 'asc' } },
      },
    });

    return product;
  }

  async update(tenantId, id, data) {
    const product = await prisma.product.findFirst({ where: { id, tenantId } });
    if (!product) throw new NotFoundError('Product', id);

    return prisma.product.update({
      where: { id },
      data,
      include: {
        brand: { select: { id: true, name: true } },
        variants: { select: { id: true, sku: true, size: true }, orderBy: { size: 'asc' } },
      },
    });
  }
}

const productsService = new ProductsService();

module.exports = { ProductsService, productsService };
