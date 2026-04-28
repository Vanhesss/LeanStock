const { inventoryService } = require('./inventory.service');

class InventoryController {
  async list(req, res, next) {
    try {
      const result = await inventoryService.list(req.user.tenantId, req.query);
      res.json({ success: true, ...result });
    } catch (error) {
      next(error);
    }
  }

  async receiveStock(req, res, next) {
    try {
      const result = await inventoryService.receiveStock(req.user.tenantId, req.body, req.user.userId);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async adjustStock(req, res, next) {
    try {
      const result = await inventoryService.adjustStock(req.user.tenantId, req.body, req.user.userId);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }
}

const inventoryController = new InventoryController();

module.exports = { InventoryController, inventoryController };
