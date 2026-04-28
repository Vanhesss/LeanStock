const { authService } = require('./auth.service');

class AuthController {
  async login(req, res, next) {
    try {
      const { email, password } = req.body;
      const result = await authService.login(email, password);
      res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async register(req, res, next) {
    try {
      const data = req.body;
      const tenantId = req.user.tenantId;
      const user = await authService.register(data, tenantId);
      res.status(201).json({ success: true, data: user });
    } catch (error) {
      next(error);
    }
  }

  async refresh(req, res, next) {
    try {
      const { refreshToken } = req.body;
      const tokens = await authService.refresh(refreshToken);
      res.status(200).json({ success: true, data: tokens });
    } catch (error) {
      next(error);
    }
  }

  async logout(req, res, next) {
    try {
      const userId = req.user.userId;
      const token = req.headers.authorization.split(' ')[1];
      await authService.logout(userId, token);
      res.status(200).json({ success: true, data: { message: 'Successfully logged out' } });
    } catch (error) {
      next(error);
    }
  }
}

const authController = new AuthController();

module.exports = { AuthController, authController };
