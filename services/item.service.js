const prisma = require('../config/prisma');
const ApiError = require('../utils/apiError');

const ownerSelect = { select: { id: true, username: true, email: true } };

/**
 * Yeni elan yaradır. `ownerId` ayrıca ötürülür (client body-də ownerId-ə
 * heç vaxt etibar edilmir) — bunu requireAuth middleware-i JWT-dən çıxarıb
 * req.user.id kimi verir.
 */
async function createItem(data, ownerId) {
  return prisma.item.create({
    data: {
      title: data.title,
      description: data.description,
      price: data.price,
      category: data.category,
      location: data.location,
      images: data.images ?? [],
      status: data.status, // undefined -> Prisma schema default-u (ACTIVE) tətbiq olunur
      ownerId: ownerId ?? null,
    },
    include: { owner: ownerSelect },
  });
}

/**
 * Axtarış + filtrlər + pagination + sıralama tətbiq edərək elanları
 * siyahılayır (bu ardıcıllıqla).
 */
async function listItems(query) {
  const { search, category, status, minPrice, maxPrice, page, limit, sort, order } = query;

  const searchClause = search
    ? {
        OR: [
          { title: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
        ],
      }
    : {};

  const filterClause = {
    ...(category ? { category } : {}),
    ...(status ? { status } : { status: 'ACTIVE' }), // default olaraq yalnız aktiv elanlar göstərilir
    ...(minPrice !== undefined || maxPrice !== undefined
      ? {
          price: {
            ...(minPrice !== undefined ? { gte: minPrice } : {}),
            ...(maxPrice !== undefined ? { lte: maxPrice } : {}),
          },
        }
      : {}),
  };

  const where = { ...searchClause, ...filterClause };
  const skip = (page - 1) * limit;
  const orderBy = { [sort]: order };

  const [items, totalItems] = await Promise.all([
    prisma.item.findMany({ where, orderBy, skip, take: limit, include: { owner: ownerSelect } }),
    prisma.item.count({ where }),
  ]);

  return {
    items,
    pagination: {
      page,
      limit,
      totalItems,
      totalPages: Math.max(Math.ceil(totalItems / limit), totalItems === 0 ? 0 : 1),
    },
  };
}

async function getItemById(id) {
  const item = await prisma.item.findUnique({
    where: { id },
    include: { owner: ownerSelect },
  });
  if (!item) {
    throw ApiError.notFound(`Elan tapılmadı (id = ${id}).`);
  }
  return item;
}

/**
 * Elanı qismən yeniləyir, sahiblik yoxlaması ilə (requireAuth vasitəsilə
 * bütün item route-ları qorunduğu üçün `requester` həmişə mövcuddur).
 */
async function updateItem(id, data, requester) {
  const existing = await getItemById(id);
  assertCanModify(existing, requester);

  return prisma.item.update({
    where: { id },
    data,
    include: { owner: ownerSelect },
  });
}

async function deleteItem(id, requester) {
  const existing = await getItemById(id);
  assertCanModify(existing, requester);

  return prisma.item.delete({ where: { id }, include: { owner: ownerSelect } });
}

/**
 * Sahiblik yoxlaması: yalnız elanın sahibi (və ya admin, əgər role sistemi
 * varsa) elanı dəyişə/silə bilər.
 */
function assertCanModify(item, requester) {
  if (!requester) return;
  const isOwner = item.ownerId !== null && item.ownerId === requester.id;
  const isAdmin = requester.role === 'admin';
  if (!isOwner && !isAdmin) {
    throw ApiError.forbidden('Bu elanı dəyişdirmək/silmək üçün icazəniz yoxdur.');
  }
}

module.exports = {
  createItem,
  listItems,
  getItemById,
  updateItem,
  deleteItem,
};
