const { Router } = require('express');
const { suppliersController } = require('./suppliers.controller');
const { authenticate } = require('../../middleware/authenticate');
const { authorize } = require('../../middleware/authorize');
const { validate } = require('../../middleware/validate');
const { createSupplierSchema, updateSupplierSchema, suppliersQuerySchema } = require('./suppliers.schema');

const router = Router();

router.use(authenticate);

router.get('/', authorize('MANAGER'), validate(suppliersQuerySchema, 'query'), suppliersController.list);
router.get('/:id', authorize('MANAGER'), suppliersController.getById);
router.post('/', authorize('ADMIN'), validate(createSupplierSchema), suppliersController.create);
router.patch('/:id', authorize('ADMIN'), validate(updateSupplierSchema), suppliersController.update);

module.exports = router;
