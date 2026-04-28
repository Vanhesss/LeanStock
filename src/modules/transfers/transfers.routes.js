const { Router } = require('express');
const { transfersController } = require('./transfers.controller');
const { authenticate } = require('../../middleware/authenticate');
const { authorize } = require('../../middleware/authorize');
const { validate } = require('../../middleware/validate');
const { createTransferSchema, transferQuerySchema, rejectTransferSchema } = require('./transfers.schema');

const router = Router();

router.use(authenticate);

// GET /transfers — Manager+
router.get('/', authorize('MANAGER'), validate(transferQuerySchema, 'query'), transfersController.list);

// POST /transfers — Manager+
router.post('/', authorize('MANAGER'), validate(createTransferSchema), transfersController.create);

// PATCH /transfers/:id/approve — Manager+
router.patch('/:id/approve', authorize('MANAGER'), transfersController.approve);

// PATCH /transfers/:id/reject — Manager+
router.patch('/:id/reject', authorize('MANAGER'), validate(rejectTransferSchema), transfersController.reject);

// PATCH /transfers/:id/ship — Manager+ (SELECT FOR UPDATE inside)
router.patch('/:id/ship', authorize('MANAGER'), transfersController.ship);

// PATCH /transfers/:id/receive — Manager+
router.patch('/:id/receive', authorize('MANAGER'), transfersController.receive);

module.exports = router;
