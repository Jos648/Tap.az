const express = require('express');
const router = express.Router();

const itemController = require('../controllers/item.controller');
const validate = require('../middleware/validate.middleware');
const { requireAuth } = require('../middleware/auth.middleware');
const {
  createItemSchema,
  updateItemSchema,
  queryItemsSchema,
  idParamSchema,
} = require('../validators/item.validators');

// Route -> (Auth) -> Validation -> Controller -> Service -> Prisma

// Elan yaratmaq üçün giriş tələb olunur (JWT)
router.post('/', requireAuth, validate(createItemSchema, 'body'), itemController.create);

// Siyahı və detal hər kəsə açıqdır
router.get('/', validate(queryItemsSchema, 'query'), itemController.getAll);
router.get('/:id', validate(idParamSchema, 'params'), itemController.getOne);

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
