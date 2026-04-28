const { Router } = require('express');
const { authController } = require('./auth.controller');
const { validate } = require('../../middleware/validate');
const { authenticate } = require('../../middleware/authenticate');
const { authorize } = require('../../middleware/authorize');
const { rateLimiter } = require('../../middleware/rateLimiter');
const { loginSchema, refreshSchema, registerSchema } = require('./auth.schema');

const router = Router();

// POST /auth/login — public, rate limited
router.post('/login', rateLimiter(), validate(loginSchema), authController.login);

// POST /auth/register — admin/manager only
router.post(
  '/register',
  authenticate,
  authorize('ADMIN', 'MANAGER'),
  validate(registerSchema),
  authController.register
);

// POST /auth/refresh — public, rate limited
router.post('/refresh', rateLimiter(), validate(refreshSchema), authController.refresh);

// POST /auth/logout — authenticated
router.post('/logout', authenticate, authController.logout);

module.exports = router;
