-- CreateEnum
CREATE TYPE "ItemStatus" AS ENUM ('DRAFT', 'ACTIVE', 'INACTIVE', 'SOLD');

-- CreateTable
CREATE TABLE "items" (
    "id" SERIAL NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "description" VARCHAR(2000),
    "price" DECIMAL(12,2) NOT NULL,
    "category" VARCHAR(100) NOT NULL,
    "location" VARCHAR(200),
    "images" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "status" "ItemStatus" NOT NULL DEFAULT 'ACTIVE',
    "ownerId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "items_category_idx" ON "items"("category");

-- CreateIndex
CREATE INDEX "items_status_idx" ON "items"("status");

-- CreateIndex
CREATE INDEX "items_createdAt_idx" ON "items"("createdAt");

-- AddForeignKey
ALTER TABLE "items" ADD CONSTRAINT "items_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
