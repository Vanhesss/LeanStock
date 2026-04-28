const { productsService } = require('./products.service');

class ProductsController {
  async list(req, res, next) {
    try {
      const result = await productsService.list(req.user.tenantId, req.query);
      res.json({ success: true, ...result });
    } catch (error) {
      next(error);
    }
  }

  async getById(req, res, next) {
    try {
      const product = await productsService.getById(req.user.tenantId, req.params.id);
      res.json({ success: true, data: product });
    } catch (error) {
      next(error);
    }
  }

  async create(req, res, next) {
    try {
      const product = await productsService.create(req.user.tenantId, req.body);
      res.status(201).json({ success: true, data: product });
    } catch (error) {
      next(error);
    }
  }

  async update(req, res, next) {
    try {
      const product = await productsService.update(req.user.tenantId, req.params.id, req.body);
      res.json({ success: true, data: product });
    } catch (error) {
      next(error);
    }
  }
}

const productsController = new ProductsController();

module.exports = { ProductsController, productsController };
