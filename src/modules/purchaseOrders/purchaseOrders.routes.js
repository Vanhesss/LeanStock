const { Router } = require('express');
const { purchaseOrdersController } = require('./purchaseOrders.controller');
const { authenticate } = require('../../middleware/authenticate');
const { authorize } = require('../../middleware/authorize');
const { validate } = require('../../middleware/validate');
const { createPurchaseOrderSchema, purchaseOrdersQuerySchema } = require('./purchaseOrders.schema');

const router = Router();

router.use(authenticate);
router.use(authorize('MANAGER'));

router.get('/', validate(purchaseOrdersQuerySchema, 'query'), purchaseOrdersController.list);
router.get('/:id', purchaseOrdersController.getById);
router.post('/', validate(createPurchaseOrderSchema), purchaseOrdersController.create);
router.patch('/:id/submit', purchaseOrdersController.submit);
router.patch('/:id/confirm', purchaseOrdersController.confirm);
router.patch('/:id/ship', purchaseOrdersController.markShipped);
router.patch('/:id/receive', purchaseOrdersController.receive);
router.patch('/:id/cancel', purchaseOrdersController.cancel);

module.exports = router;
