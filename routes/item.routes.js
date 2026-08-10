const express = require('express');
const router = express.Router();

const itemController = require('../controllers/item.controller');
const validate = require('../middleware/validate.middleware');
const { requireAuth, optionalAuth } = require('../middleware/auth.middleware');
const { itemCreateLimiter, publicReadLimiter } = require('../middleware/rateLimit.middleware');
const {
  createItemSchema,
  updateItemSchema,
  queryItemsSchema,
  idParamSchema,
} = require('../validators/item.validators');

// Route -> (Auth) -> Validation -> Controller -> Service -> Prisma

// Elan yaratmaq üçün giriş tələb olunur (JWT) + spam qarşısı üçün rate limit
router.post('/', requireAuth, itemCreateLimiter, validate(createItemSchema, 'body'), itemController.create);

// Siyahı və detal hər kəsə açıqdır, amma optionalAuth token varsa oxuyur ki,
// telefon nömrəsi yalnız giriş etmiş istifadəçilərə tam göstərilsin
// (anonim sorğularda maskalanır — bax utils/serializeItem.js).
router.get('/', optionalAuth, publicReadLimiter, validate(queryItemsSchema, 'query'), itemController.getAll);
router.get('/:id', optionalAuth, publicReadLimiter, validate(idParamSchema, 'params'), itemController.getOne);

// Yeniləmə/silmə üçün giriş + sahiblik tələb olunur (service qatında yoxlanılır)
router.patch(
  '/:id',
  requireAuth,
  validate(idParamSchema, 'params'),
  validate(updateItemSchema, 'body'),
  itemController.update
);

router.delete(
  '/:id',
  requireAuth,
  validate(idParamSchema, 'params'),
  itemController.remove
);

module.exports = router;
