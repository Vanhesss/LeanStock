const { reservationsService } = require('./reservations.service');

class ReservationsController {
  async create(req, res, next) {
    try {
      const reservation = await reservationsService.create(req.user.tenantId, req.body, req.user.userId);
      res.status(201).json({ success: true, data: reservation });
    } catch (error) {
      next(error);
    }
  }

  async list(req, res, next) {
    try {
      const result = await reservationsService.list(req.user.tenantId, req.query);
      res.status(200).json({ success: true, ...result });
    } catch (error) {
      next(error);
    }
  }

  async cancel(req, res, next) {
    try {
      const result = await reservationsService.cancel(req.user.tenantId, req.params.id, req.user.userId);
      res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async convertToSale(req, res, next) {
    try {
      const result = await reservationsService.convertToSale(req.user.tenantId, req.params.id, req.user.userId);
      res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }
}

const reservationsController = new ReservationsController();

module.exports = { ReservationsController, reservationsController };
