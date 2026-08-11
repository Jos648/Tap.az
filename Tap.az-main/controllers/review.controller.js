const reviewService = require('../services/review.service');
const asyncHandler = require('../utils/asyncHandler');

function serializeReview(review) {
  if (!review) return review;
  const { reviewer, reviewerId, ...rest } = review;
  return {
    ...rest,
    reviewerId,
    reviewerUsername: reviewer ? reviewer.username : 'Anonim',
  };
}

// POST /api/reviews/:sellerId (qorunan — requireAuth)
const create = asyncHandler(async (req, res) => {
  const sellerId = req.params.sellerId;
  const reviewerId = req.user?.id;
  const review = await reviewService.createReview(sellerId, reviewerId, req.body);

  res.status(201).json({
    success: true,
    message: 'Rəyiniz üçün təşəkkürlər!',
    data: serializeReview(review),
  });
});

// GET /api/reviews/:sellerId
const getBySeller = asyncHandler(async (req, res) => {
  const sellerId = req.params.sellerId;
  const { reviews, averageRating, reviewCount } = await reviewService.getSellerReviews(sellerId);

  res.status(200).json({
    success: true,
    data: reviews.map(serializeReview),
    averageRating,
    reviewCount,
  });
});

module.exports = { create, getBySeller };
