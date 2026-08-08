const itemService = require('../services/item.service');
const asyncHandler = require('../utils/asyncHandler');
const { serializeItem, serializeItems } = require('../utils/serializeItem');

// POST /api/items (qorunan — requireAuth)
const create = asyncHandler(async (req, res) => {
  const ownerId = req.user?.id;
  const item = await itemService.createItem(req.body, ownerId);

  res.status(201).json({
    success: true,
    message: 'Elanınız uğurla yerləşdirildi!',
    data: serializeItem(item),
  });
});

// GET /api/items
// ?search=&category=&status=&minPrice=&maxPrice=&page=&limit=&sort=&order=
const getAll = asyncHandler(async (req, res) => {
  const { items, pagination } = await itemService.listItems(req.query);

  res.status(200).json({
    success: true,
    data: serializeItems(items),
    pagination,
  });
});

// GET /api/items/:id
const getOne = asyncHandler(async (req, res) => {
  const item = await itemService.getItemById(req.params.id);

  res.status(200).json({
    success: true,
    data: serializeItem(item),
  });
});

// PATCH /api/items/:id (qorunan — requireAuth)
const update = asyncHandler(async (req, res) => {
  const item = await itemService.updateItem(req.params.id, req.body, req.user);

  res.status(200).json({
    success: true,
    message: 'Elan yeniləndi.',
    data: serializeItem(item),
  });
});

// DELETE /api/items/:id (qorunan — requireAuth)
const remove = asyncHandler(async (req, res) => {
  const item = await itemService.deleteItem(req.params.id, req.user);

  res.status(200).json({
    success: true,
    message: 'Elan silindi.',
    data: serializeItem(item),
  });
});

module.exports = { create, getAll, getOne, update, remove };
