-- CreateEnum
CREATE TYPE "DropType" AS ENUM ('ticket', 'goods');
CREATE TYPE "DropStatus" AS ENUM ('draft', 'upcoming', 'on_sale', 'sold_out', 'closed');

-- CreateTable: Drop
CREATE TABLE "Drop" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT,
    "description" TEXT,
    "type" "DropType" NOT NULL,
    "status" "DropStatus" NOT NULL DEFAULT 'draft',
    "heroUrl" TEXT,
    "videoUrl" TEXT,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Drop_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Drop_slug_key" ON "Drop"("slug");

-- CreateTable: DropImage
CREATE TABLE "DropImage" (
    "id" TEXT NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "alt" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "dropId" TEXT NOT NULL,

    CONSTRAINT "DropImage_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "DropImage" ADD CONSTRAINT "DropImage_dropId_fkey"
    FOREIGN KEY ("dropId") REFERENCES "Drop"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable: GoodsVariant
CREATE TABLE "GoodsVariant" (
    "id" TEXT NOT NULL,
    "dropId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "price" INTEGER NOT NULL,
    "stock" INTEGER NOT NULL DEFAULT 0,
    "soldCount" INTEGER NOT NULL DEFAULT 0,
    "options" JSONB,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GoodsVariant_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "GoodsVariant" ADD CONSTRAINT "GoodsVariant_dropId_fkey"
    FOREIGN KEY ("dropId") REFERENCES "Drop"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Add dropId to TicketTier (nullable first, then we'll handle)
ALTER TABLE "TicketTier" ADD COLUMN "dropId" TEXT;

ALTER TABLE "TicketTier" ADD CONSTRAINT "TicketTier_dropId_fkey"
    FOREIGN KEY ("dropId") REFERENCES "Drop"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Add dropId to Order (nullable first)
ALTER TABLE "Order" ADD COLUMN "dropId" TEXT;

ALTER TABLE "Order" ADD CONSTRAINT "Order_dropId_fkey"
    FOREIGN KEY ("dropId") REFERENCES "Drop"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Add goodsVariantId to OrderItem
ALTER TABLE "OrderItem" ADD COLUMN "goodsVariantId" TEXT;

ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_goodsVariantId_fkey"
    FOREIGN KEY ("goodsVariantId") REFERENCES "GoodsVariant"("id") ON DELETE SET NULL ON UPDATE CASCADE;
