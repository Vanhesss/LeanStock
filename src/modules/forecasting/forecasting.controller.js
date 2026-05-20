const { forecastingService } = require('./forecasting.service');

class ForecastingController {
  async getReorderSuggestions(req, res, next) {
    try {
      const result = await forecastingService.getReorderSuggestions(req.user.tenantId, req.query);
      res.json({ success: true, ...result });
    } catch (error) {
      next(error);
    }
  }

  async getSalesVelocity(req, res, next) {
    try {
      const result = await forecastingService.getSalesVelocity(req.user.tenantId, req.query);
      res.json({ success: true, ...result });
    } catch (error) {
      next(error);
    }
  }

  async checkLowStockAlerts(req, res, next) {
    try {
      const result = await forecastingService.checkLowStockAlerts(req.user.tenantId);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }
}

const forecastingController = new ForecastingController();

module.exports = { ForecastingController, forecastingController };
