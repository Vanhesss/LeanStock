const { Router } = require('express');
const { adminController } = require('./admin.controller');
const { authenticate } = require('../../middleware/authenticate');
const { authorize } = require('../../middleware/authorize');
const { validate } = require('../../middleware/validate');
const {
  createLocationSchema,
  createBrandSchema,
  usersQuerySchema,
  auditLogsQuerySchema,
  priceHistoryQuerySchema,
  locationsQuerySchema,
  updateUserSchema,
} = require('./admin.schema');

const router = Router();

// All admin routes require authentication + ADMIN role
router.use(authenticate);
router.use(authorize('ADMIN'));

// ──────────── Users ────────────
router.get('/users', validate(usersQuerySchema, 'query'), adminController.listUsers);
router.patch('/users/:id', validate(updateUserSchema), adminController.updateUser);
router.delete('/users/:id', adminController.deleteUser);

// ──────────── Locations ────────────
router.get('/locations', validate(locationsQuerySchema, 'query'), adminController.listLocations);
router.post('/locations', validate(createLocationSchema), adminController.createLocation);

// ──────────── Brands ────────────
router.get('/brands', adminController.listBrands);
router.post('/brands', validate(createBrandSchema), adminController.createBrand);

// ──────────── Audit Logs ────────────
router.get('/audit-logs', validate(auditLogsQuerySchema, 'query'), adminController.listAuditLogs);

// ──────────── Price History ────────────
router.get('/price-history', validate(priceHistoryQuerySchema, 'query'), adminController.listPriceHistory);

// ──────────── Email Config Diagnostic ────────────
router.get('/email-config', adminController.getEmailConfig);

// ──────────── Queue / Background Jobs ────────────
router.get('/queues', adminController.getQueueStatus);
router.post('/jobs/dead-stock-decay', adminController.triggerDeadStockDecay);
router.post('/jobs/reservation-expiry', adminController.triggerReservationExpiry);

module.exports = router;
