const { adminService } = require('./admin.service');

class AdminController {
  async listUsers(req, res, next) {
    try {
      const result = await adminService.listUsers(req.user.tenantId, req.query);
      res.json({ success: true, ...result });
    } catch (error) {
      next(error);
    }
  }

  async updateUser(req, res, next) {
    try {
      const user = await adminService.updateUser(req.user.tenantId, req.params.id, req.body);
      res.json({ success: true, data: user });
    } catch (error) {
      next(error);
    }
  }

  async deleteUser(req, res, next) {
    try {
      const result = await adminService.deleteUser(req.user.tenantId, req.params.id, req.user.userId);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async listLocations(req, res, next) {
    try {
      const result = await adminService.listLocations(req.user.tenantId, req.query);
      res.json({ success: true, ...result });
    } catch (error) {
      next(error);
    }
  }

  async createLocation(req, res, next) {
    try {
      const location = await adminService.createLocation(req.user.tenantId, req.body);
      res.status(201).json({ success: true, data: location });
    } catch (error) {
      next(error);
    }
  }

  async listBrands(req, res, next) {
    try {
      const result = await adminService.listBrands(req.user.tenantId, req.query);
      res.json({ success: true, ...result });
    } catch (error) {
      next(error);
    }
  }

  async createBrand(req, res, next) {
    try {
      const brand = await adminService.createBrand(req.user.tenantId, req.body);
      res.status(201).json({ success: true, data: brand });
    } catch (error) {
      next(error);
    }
  }

  async listAuditLogs(req, res, next) {
    try {
      const result = await adminService.listAuditLogs(req.user.tenantId, req.query);
      res.json({ success: true, ...result });
    } catch (error) {
      next(error);
    }
  }

  async listPriceHistory(req, res, next) {
    try {
      const result = await adminService.listPriceHistory(req.user.tenantId, req.query);
      res.json({ success: true, ...result });
    } catch (error) {
      next(error);
    }
  }

  async getEmailConfig(req, res, next) {
    try {
      const config = adminService.getEmailConfig();
      res.json({ success: true, data: config });
    } catch (error) {
      next(error);
    }
  }

  async getQueueStatus(req, res, next) {
    try {
      const status = await adminService.getQueueStatus();
      res.json({ success: true, data: status });
    } catch (error) {
      next(error);
    }
  }

  async triggerDeadStockDecay(req, res, next) {
    try {
      const result = await adminService.triggerDeadStockDecay();
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async triggerReservationExpiry(req, res, next) {
    try {
      const result = await adminService.triggerReservationExpiry();
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }
}

const adminController = new AdminController();

module.exports = { AdminController, adminController };
