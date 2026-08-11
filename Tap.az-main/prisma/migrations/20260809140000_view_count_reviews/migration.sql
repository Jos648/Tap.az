-- Baxış sayı sahəsi əlavə olunur
ALTER TABLE "items" ADD COLUMN "viewCount" INTEGER NOT NULL DEFAULT 0;

-- Satıcı rəyləri (reviews) cədvəli
CREATE TABLE "reviews" (
    "id" SERIAL NOT NULL,
    "rating" SMALLINT NOT NULL,
    "comment" VARCHAR(500),
    "sellerId" INTEGER NOT NULL,
    "reviewerId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reviews_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "reviews_sellerId_idx" ON "reviews"("sellerId");

ALTER TABLE "reviews" ADD CONSTRAINT "reviews_sellerId_fkey"
    FOREIGN KEY ("sellerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "reviews" ADD CONSTRAINT "reviews_reviewerId_fkey"
    FOREIGN KEY ("reviewerId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
