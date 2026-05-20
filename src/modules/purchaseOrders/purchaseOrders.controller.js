const { purchaseOrdersService } = require('./purchaseOrders.service');

class PurchaseOrdersController {
  async list(req, res, next) {
    try {
      const result = await purchaseOrdersService.list(req.user.tenantId, req.query);
      res.json({ success: true, ...result });
    } catch (error) {
      next(error);
    }
  }

  async getById(req, res, next) {
    try {
      const po = await purchaseOrdersService.getById(req.user.tenantId, req.params.id);
      res.json({ success: true, data: po });
    } catch (error) {
      next(error);
    }
  }

  async create(req, res, next) {
    try {
      const po = await purchaseOrdersService.create(req.user.tenantId, req.body, req.user.userId);
      res.status(201).json({ success: true, data: po });
    } catch (error) {
      next(error);
    }
  }

  async submit(req, res, next) {
    try {
      const po = await purchaseOrdersService.submit(req.user.tenantId, req.params.id);
      res.json({ success: true, data: po });
    } catch (error) {
      next(error);
    }
  }

  async confirm(req, res, next) {
    try {
      const po = await purchaseOrdersService.confirm(req.user.tenantId, req.params.id);
      res.json({ success: true, data: po });
    } catch (error) {
      next(error);
    }
  }

  async markShipped(req, res, next) {
    try {
      const po = await purchaseOrdersService.markShipped(req.user.tenantId, req.params.id);
      res.json({ success: true, data: po });
    } catch (error) {
      next(error);
    }
  }

  async receive(req, res, next) {
    try {
      const po = await purchaseOrdersService.receive(req.user.tenantId, req.params.id, req.user.userId);
      res.json({ success: true, data: po });
    } catch (error) {
      next(error);
    }
  }

  async cancel(req, res, next) {
    try {
      const po = await purchaseOrdersService.cancel(req.user.tenantId, req.params.id);
      res.json({ success: true, data: po });
    } catch (error) {
      next(error);
    }
  }
}

const purchaseOrdersController = new PurchaseOrdersController();

module.exports = { PurchaseOrdersController, purchaseOrdersController };
