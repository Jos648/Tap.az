const express = require('express');
const router = express.Router();

const reviewController = require('../controllers/review.controller');
const validate = require('../middleware/validate.middleware');
const { requireAuth } = require('../middleware/auth.middleware');
const { createReviewSchema, sellerIdParamSchema } = require('../validators/review.validators');

// Satıcının rəylərini hər kəs görə bilər
router.get('/:sellerId', validate(sellerIdParamSchema, 'params'), reviewController.getBySeller);

// Rəy yazmaq üçün giriş tələb olunur
router.post(
  '/:sellerId',
  requireAuth,
  validate(sellerIdParamSchema, 'params'),
  validate(createReviewSchema, 'body'),
  reviewController.create
);

module.exports = router;
