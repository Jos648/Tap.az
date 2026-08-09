const { z } = require('zod');

const createReviewSchema = z.object({
  rating: z
    .number({ required_error: 'Xal (1-5) tələb olunur.', invalid_type_error: 'Xal rəqəm olmalıdır.' })
    .int('Xal tam ədəd olmalıdır.')
    .min(1, 'Xal ən azı 1 olmalıdır.')
    .max(5, 'Xal ən çox 5 ola bilər.'),
  comment: z.string().trim().max(500, 'Rəy ən çox 500 simvol ola bilər.').optional(),
});

const toNumber = (val) => {
  if (val === undefined || val === '') return undefined;
  const n = Number(val);
  return Number.isNaN(n) ? val : n;
};

const sellerIdParamSchema = z.object({
  sellerId: z.preprocess(
    toNumber,
    z.number({ invalid_type_error: 'sellerId rəqəm olmalıdır.' }).int().positive()
  ),
});

module.exports = { createReviewSchema, sellerIdParamSchema };
