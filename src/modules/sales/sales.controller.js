const { salesService } = require('./sales.service');

class SalesController {
  async create(req, res, next) {
    try {
      const sale = await salesService.create(req.user.tenantId, req.body, req.user.userId);
      res.status(201).json({ success: true, data: sale });
    } catch (error) {
      next(error);
    }
  }

  async list(req, res, next) {
    try {
      const result = await salesService.list(req.user.tenantId, req.query);
      res.status(200).json({ success: true, ...result });
    } catch (error) {
      next(error);
    }
  }

  async getById(req, res, next) {
    try {
      const sale = await salesService.getById(req.user.tenantId, req.params.id);
      res.status(200).json({ success: true, data: sale });
    } catch (error) {
      next(error);
    }
  }
}

const salesController = new SalesController();

module.exports = { SalesController, salesController };
