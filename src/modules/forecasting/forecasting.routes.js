const { Router } = require('express');
const { forecastingController } = require('./forecasting.controller');
const { authenticate } = require('../../middleware/authenticate');
const { authorize } = require('../../middleware/authorize');
const { validate } = require('../../middleware/validate');
const { reorderQuerySchema, velocityQuerySchema } = require('./forecasting.schema');

const router = Router();

router.use(authenticate);
router.use(authorize('MANAGER'));

router.get('/reorder', validate(reorderQuerySchema, 'query'), forecastingController.getReorderSuggestions);
router.get('/velocity', validate(velocityQuerySchema, 'query'), forecastingController.getSalesVelocity);
router.post('/low-stock-alerts', forecastingController.checkLowStockAlerts);

module.exports = router;
