const { Router } = require('express');
const { reservationsController } = require('./reservations.controller');
const { validate } = require('../../middleware/validate');
const { authenticate } = require('../../middleware/authenticate');
const { createReservationSchema } = require('./reservations.schema');

const router = Router();

// All reservation routes require authentication
router.use(authenticate);

// GET /reservations — list reservations
router.get('/', reservationsController.list);

// POST /reservations — create reservation (any authenticated staff)
router.post('/', validate(createReservationSchema), reservationsController.create);

// PATCH /reservations/:id/cancel — cancel an active reservation
router.patch('/:id/cancel', reservationsController.cancel);

// PATCH /reservations/:id/convert — convert reservation to sale
router.patch('/:id/convert', reservationsController.convertToSale);

module.exports = router;
