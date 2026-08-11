/**
 * Telefonu qismən gizlədir (məs. "0501234567" -> "050*****67").
 * Yalnız giriş etməmiş (anonim) sorğularda istifadə olunur ki, nömrələr
 * kütləvi şəkildə (bulk scraping) toplana bilməsin.
 */
function maskPhone(phone) {
  if (!phone) return phone;
  if (phone.length <= 5) return '*'.repeat(phone.length);
  const visibleStart = phone.slice(0, 3);
  const visibleEnd = phone.slice(-2);
  const maskedMiddle = '*'.repeat(Math.max(phone.length - 5, 3));
  return `${visibleStart}${maskedMiddle}${visibleEnd}`;
}

/**
 * Prisma `price` sahəsini Decimal obyekti kimi qaytarır — JSON-a göndərmədən
 * əvvəl adi JS number-ə çeviririk ki, frontend "650" kimi gözlədiyi formatı
 * alsın (Decimal-in nested strukturunu yox).
 *
 * TƏHLÜKƏSİZLİK: `owner` relation-u include olunsa belə, email ictimai
 * API cavabına ƏLAVƏ EDİLMİR — bu, istifadəçi e-poçtlarının kütləvi
 * toplanmasının (scraping / spam) qarşısını alır. Yalnız `ownerUsername`,
 * `ownerId` və `ownerVerified` göndərilir.
 *
 * `viewerAuthenticated=false` olduqda telefon nömrəsi maskalanır —
 * tam nömrəni yalnız giriş etmiş istifadəçilər görür.
 */
function serializeItem(item, viewerAuthenticated = false) {
  if (!item) return item;

  const { owner, ownerId, phone, ...rest } = item;

  return {
    ...rest,
    ownerId,
    price: Number(item.price),
    ownerUsername: owner ? owner.username : undefined,
    ownerVerified: owner ? owner.isVerified : false,
    phone: viewerAuthenticated ? phone : maskPhone(phone),
    phoneMasked: !viewerAuthenticated,
  };
}

function serializeItems(items, viewerAuthenticated = false) {
  return items.map((item) => serializeItem(item, viewerAuthenticated));
}

module.exports = { serializeItem, serializeItems };
