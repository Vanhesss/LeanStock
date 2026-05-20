const { suppliersService } = require('./suppliers.service');

class SuppliersController {
  async list(req, res, next) {
    try {
      const result = await suppliersService.list(req.user.tenantId, req.query);
      res.json({ success: true, ...result });
    } catch (error) {
      next(error);
    }
  }

  async getById(req, res, next) {
    try {
      const supplier = await suppliersService.getById(req.user.tenantId, req.params.id);
      res.json({ success: true, data: supplier });
    } catch (error) {
      next(error);
    }
  }

  async create(req, res, next) {
    try {
      const supplier = await suppliersService.create(req.user.tenantId, req.body);
      res.status(201).json({ success: true, data: supplier });
    } catch (error) {
      next(error);
    }
  }

  async update(req, res, next) {
    try {
      const supplier = await suppliersService.update(req.user.tenantId, req.params.id, req.body);
      res.json({ success: true, data: supplier });
    } catch (error) {
      next(error);
    }
  }
}

const suppliersController = new SuppliersController();

module.exports = { SuppliersController, suppliersController };
