const prisma = require('../config/prisma');
const ApiError = require('../utils/apiError');

const reviewerSelect = { select: { id: true, username: true } };

/**
 * Satıcıya (User) rəy yazır. Öz-özünə rəy yazmaq qadağandır.
 */
async function createReview(sellerId, reviewerId, data) {
  if (reviewerId && reviewerId === sellerId) {
    throw ApiError.badRequest('Özünüzə rəy yaza bilməzsiniz.');
  }

  const seller = await prisma.user.findUnique({ where: { id: sellerId } });
  if (!seller) {
    throw ApiError.notFound('Satıcı tapılmadı.');
  }

  return prisma.review.create({
    data: {
      rating: data.rating,
      comment: data.comment || null,
      sellerId,
      reviewerId: reviewerId ?? null,
    },
    include: { reviewer: reviewerSelect },
  });
}

/**
 * Satıcının bütün rəylərini + orta xalı və sayını qaytarır.
 */
async function getSellerReviews(sellerId) {
  const [reviews, aggregate] = await Promise.all([
    prisma.review.findMany({
      where: { sellerId },
      include: { reviewer: reviewerSelect },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.review.aggregate({
      where: { sellerId },
      _avg: { rating: true },
      _count: { rating: true },
    }),
  ]);

  return {
    reviews,
    averageRating: aggregate._avg.rating ? Number(aggregate._avg.rating.toFixed(1)) : null,
    reviewCount: aggregate._count.rating,
  };
}

module.exports = { createReview, getSellerReviews };
