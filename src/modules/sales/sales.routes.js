const { Router } = require('express');
const { salesController } = require('./sales.controller');
const { validate } = require('../../middleware/validate');
const { authenticate } = require('../../middleware/authenticate');
const { createSaleSchema } = require('./sales.schema');

const router = Router();

// All sales routes require authentication
router.use(authenticate);

// GET /sales — list sales (all authenticated users)
router.get('/', salesController.list);

// GET /sales/:id — get sale by ID
router.get('/:id', salesController.getById);

// POST /sales — record a sale (Staff+)
router.post('/', validate(createSaleSchema), salesController.create);

module.exports = router;
