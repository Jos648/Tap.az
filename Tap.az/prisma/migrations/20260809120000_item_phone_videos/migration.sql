-- Şəhər/Region sahəsi silinir
ALTER TABLE "items" DROP COLUMN IF EXISTS "location";

-- Telefon nömrəsi sahəsi əlavə olunur (mövcud sətirlər üçün boş default,
-- sonra default silinir ki, yeni yazılarda mütləq göndərilsin)
ALTER TABLE "items" ADD COLUMN "phone" VARCHAR(30) NOT NULL DEFAULT '';
ALTER TABLE "items" ALTER COLUMN "phone" DROP DEFAULT;

-- Video linklərini saxlamaq üçün massiv sahəsi əlavə olunur
ALTER TABLE "items" ADD COLUMN "videos" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
