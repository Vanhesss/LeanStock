const { transfersService } = require('./transfers.service');

class TransfersController {
  async list(req, res, next) {
    try {
      const result = await transfersService.list(req.user.tenantId, req.query);
      res.json({ success: true, ...result });
    } catch (error) {
      next(error);
    }
  }

  async create(req, res, next) {
    try {
      const transfer = await transfersService.create(req.user.tenantId, req.user.userId, req.body);
      res.status(201).json({ success: true, data: transfer });
    } catch (error) {
      next(error);
    }
  }

  async approve(req, res, next) {
    try {
      const transfer = await transfersService.approve(req.user.tenantId, req.params.id, req.user.userId);
      res.json({ success: true, data: transfer });
    } catch (error) {
      next(error);
    }
  }

  async reject(req, res, next) {
    try {
      const transfer = await transfersService.reject(
        req.user.tenantId, req.params.id, req.user.userId, req.body.reason
      );
      res.json({ success: true, data: transfer });
    } catch (error) {
      next(error);
    }
  }

  async ship(req, res, next) {
    try {
      const transfer = await transfersService.ship(req.user.tenantId, req.params.id);
      res.json({ success: true, data: transfer });
    } catch (error) {
      next(error);
    }
  }

  async receive(req, res, next) {
    try {
      const transfer = await transfersService.receive(req.user.tenantId, req.params.id);
      res.json({ success: true, data: transfer });
    } catch (error) {
      next(error);
    }
  }
}

const transfersController = new TransfersController();

module.exports = { TransfersController, transfersController };
