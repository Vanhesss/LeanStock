const { Router } = require('express');
const { inventoryController } = require('./inventory.controller');
const { authenticate } = require('../../middleware/authenticate');
const { authorize } = require('../../middleware/authorize');
const { validate } = require('../../middleware/validate');
const { inventoryQuerySchema, receiveStockSchema, adjustStockSchema } = require('./inventory.schema');

const router = Router();

router.use(authenticate);

// GET /inventory — all roles
router.get('/', validate(inventoryQuerySchema, 'query'), inventoryController.list);

// POST /inventory/receive — Manager+
router.post('/receive', authorize('MANAGER'), validate(receiveStockSchema), inventoryController.receiveStock);

// POST /inventory/adjust — Manager+
router.post('/adjust', authorize('MANAGER'), validate(adjustStockSchema), inventoryController.adjustStock);

module.exports = router;
