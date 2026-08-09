const { z } = require('zod');

// prisma/schema.prisma `enum ItemStatus` ilə sync saxlanılmalıdır.
const ITEM_STATUS_VALUES = ['DRAFT', 'ACTIVE', 'INACTIVE', 'SOLD'];

// Prisma `orderBy`-a birbaşa user input verilməməlidir — yalnız bu whitelist
// üzərindən keçən sahələr sıralamada istifadə oluna bilər.
const SORTABLE_FIELDS = ['createdAt', 'updatedAt', 'price', 'title'];

const MAX_LIMIT = 100;
const DEFAULT_LIMIT = 20;
const DEFAULT_PAGE = 1;
const MAX_IMAGES = 20;
const MIN_IMAGES = 3;
const MAX_VIDEOS = 3;

// Azərbaycan mobil nömrə formatları: +994501234567, 994501234567, 0501234567
const PHONE_REGEX = /^(\+?994|0)(10|50|51|55|60|70|77|99)\d{7}$/;

const createItemSchema = z.object({
  title: z
    .string({ required_error: 'Başlıq tələb olunur.' })
    .trim()
    .min(5, 'Başlıq ən azı 5 simvol olmalıdır.')
    .max(200, 'Başlıq ən çox 200 simvol ola bilər.'),
  description: z
    .string({ required_error: 'Açıqlama tələb olunur.' })
    .trim()
    .min(20, 'Açıqlama ən azı 20 simvol olmalıdır.')
    .max(2000, 'Açıqlama ən çox 2000 simvol ola bilər.'),
  price: z
    .number({ required_error: 'Qiymət tələb olunur.', invalid_type_error: 'Qiymət rəqəm olmalıdır.' })
    .positive('Qiymət 0-dan böyük olmalıdır.')
    .max(1_000_000_000, 'Qiymət həddindən artıq böyükdür.'),
  category: z
    .string({ required_error: 'Kateqoriya tələb olunur.' })
    .trim()
    .min(1, 'Kateqoriya seçilməlidir.')
    .max(100, 'Kateqoriya adı çox uzundur.'),
  phone: z
    .string({ required_error: 'Əlaqə nömrəsi tələb olunur.' })
    .trim()
    .regex(PHONE_REGEX, 'Düzgün nömrə daxil edin (məs. 0501234567).'),
  images: z
    .array(z.string(), { required_error: 'Şəkillər tələb olunur.' })
    .min(MIN_IMAGES, `Ən azı ${MIN_IMAGES} şəkil əlavə edin.`)
    .max(MAX_IMAGES, `Maksimum ${MAX_IMAGES} şəkil əlavə edə bilərsiniz.`),
  videos: z
    .array(z.string())
    .max(MAX_VIDEOS, `Maksimum ${MAX_VIDEOS} video əlavə edə bilərsiniz.`)
    .optional()
    .default([]),
  status: z.enum(ITEM_STATUS_VALUES).optional(),
});

// Qismən yeniləmə — bütün sahələr optional, amma ən azı biri göndərilməlidir.
const updateItemSchema = createItemSchema
  .partial()
  .refine((data) => Object.keys(data).length > 0, {
    message: 'Yeniləmək üçün ən azı bir sahə göndərilməlidir.',
  });

// Query-string dəyərləri ("1", "10") number-ə çevrilir, çünki req.query
// hər zaman string kimi gəlir.
const toNumber = (val) => {
  if (val === undefined || val === '') return undefined;
  const n = Number(val);
  return Number.isNaN(n) ? val : n;
};

const queryItemsSchema = z.object({
  search: z.string().trim().max(200).optional(),
  category: z.string().trim().max(100).optional(),
  status: z.enum(ITEM_STATUS_VALUES).optional(),
  minPrice: z.preprocess(toNumber, z.number().nonnegative().optional()),
  maxPrice: z.preprocess(toNumber, z.number().nonnegative().optional()),
  page: z.preprocess(toNumber, z.number().int().positive().optional().default(DEFAULT_PAGE)),
  limit: z.preprocess(
    toNumber,
    z.number().int().positive().max(MAX_LIMIT).optional().default(DEFAULT_LIMIT)
  ),
  sort: z.enum(SORTABLE_FIELDS).optional().default('createdAt'),
  order: z.enum(['asc', 'desc']).optional().default('desc'),
}).refine(
  (data) =>
    data.minPrice === undefined ||
    data.maxPrice === undefined ||
    data.minPrice <= data.maxPrice,
  { message: 'minPrice, maxPrice-dan böyük ola bilməz.', path: ['minPrice'] }
);

const idParamSchema = z.object({
  id: z.preprocess(
    toNumber,
    z.number({ invalid_type_error: 'id rəqəm olmalıdır.' }).int().positive()
  ),
});

module.exports = {
  createItemSchema,
  updateItemSchema,
  queryItemsSchema,
  idParamSchema,
  ITEM_STATUS_VALUES,
  SORTABLE_FIELDS,
  MAX_LIMIT,
  DEFAULT_LIMIT,
  DEFAULT_PAGE,
  MAX_VIDEOS,
};
