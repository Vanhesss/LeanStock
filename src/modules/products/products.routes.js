const { Router } = require('express');
const { productsController } = require('./products.controller');
const { authenticate } = require('../../middleware/authenticate');
const { authorize } = require('../../middleware/authorize');
const { validate } = require('../../middleware/validate');
const { createProductSchema, updateProductSchema, productQuerySchema } = require('./products.schema');

const router = Router();

// All product routes require authentication
router.use(authenticate);

// GET /products — all authenticated users
router.get('/', validate(productQuerySchema, 'query'), productsController.list);

// GET /products/:id
router.get('/:id', productsController.getById);

// POST /products — Admin only
router.post('/', authorize('ADMIN'), validate(createProductSchema), productsController.create);

// PATCH /products/:id — Admin only
router.patch('/:id', authorize('ADMIN'), validate(updateProductSchema), productsController.update);

module.exports = router;
