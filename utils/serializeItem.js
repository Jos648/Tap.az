/**
 * Prisma `price` sahəsini Decimal obyekti kimi qaytarır — JSON-a göndərmədən
 * əvvəl adi JS number-ə çeviririk ki, frontend "650" kimi gözlədiyi formatı
 * alsın (Decimal-in nested strukturunu yox).
 *
 * `owner` relation-u include olunubsa, frontend-in gözlədiyi sadə `owner`
 * (email) sahəsini də əlavə edirik.
 */
function serializeItem(item) {
  if (!item) return item;

  const { owner, ownerId, ...rest } = item;

  return {
    ...rest,
    ownerId,
    price: Number(item.price),
    owner: owner ? owner.email : undefined,
    ownerUsername: owner ? owner.username : undefined,
  };
}

function serializeItems(items) {
  return items.map(serializeItem);
}

module.exports = { serializeItem, serializeItems };
