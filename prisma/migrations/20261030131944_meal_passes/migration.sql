-- CreateEnum
CREATE TYPE "MealKind" AS ENUM ('BOWL', 'SMOOTHIE');

-- AlterTable
ALTER TABLE "CafeSettings" ADD COLUMN     "mealPassRefundsEnabled" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "OrderItem" ADD COLUMN     "mealPassUseId" TEXT;

-- CreateTable
CREATE TABLE "MealPlan" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "pricePaise" INTEGER NOT NULL,
    "bowls" INTEGER NOT NULL,
    "smoothies" INTEGER NOT NULL,
    "bowlCategoryId" TEXT,
    "bowlCapPaise" INTEGER NOT NULL DEFAULT 0,
    "smoothieCategoryId" TEXT,
    "smoothieCapPaise" INTEGER NOT NULL DEFAULT 0,
    "days" INTEGER NOT NULL DEFAULT 30,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MealPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MealPass" (
    "id" TEXT NOT NULL,
    "number" SERIAL NOT NULL,
    "customerId" TEXT,
    "customerName" TEXT NOT NULL,
    "customerPhone" TEXT,
    "planId" TEXT,
    "planName" TEXT NOT NULL,
    "pricePaise" INTEGER NOT NULL,
    "bowls" INTEGER NOT NULL,
    "smoothies" INTEGER NOT NULL,
    "bowlCategoryId" TEXT,
    "bowlCapPaise" INTEGER NOT NULL,
    "smoothieCategoryId" TEXT,
    "smoothieCapPaise" INTEGER NOT NULL,
    "startsOn" TEXT NOT NULL,
    "endsOn" TEXT NOT NULL,
    "method" "PaymentMethod" NOT NULL,
    "saleId" TEXT,
    "soldById" TEXT,
    "refundedAt" TIMESTAMP(3),
    "refundPaise" INTEGER,
    "refundMethod" "PaymentMethod",
    "refundNote" TEXT,
    "refundSaleId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MealPass_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MealPassUse" (
    "id" TEXT NOT NULL,
    "passId" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "kind" "MealKind" NOT NULL,
    "menuItemId" TEXT,
    "coveredPaise" INTEGER NOT NULL,
    "usedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MealPassUse_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MealPass_number_key" ON "MealPass"("number");

-- CreateIndex
CREATE UNIQUE INDEX "MealPass_saleId_key" ON "MealPass"("saleId");

-- CreateIndex
CREATE UNIQUE INDEX "MealPass_refundSaleId_key" ON "MealPass"("refundSaleId");

-- CreateIndex
CREATE INDEX "MealPass_customerId_idx" ON "MealPass"("customerId");

-- CreateIndex
CREATE INDEX "MealPass_endsOn_idx" ON "MealPass"("endsOn");

-- CreateIndex
CREATE INDEX "MealPassUse_passId_idx" ON "MealPassUse"("passId");

-- CreateIndex
CREATE INDEX "MealPassUse_orderId_idx" ON "MealPassUse"("orderId");

-- CreateIndex
CREATE UNIQUE INDEX "OrderItem_mealPassUseId_key" ON "OrderItem"("mealPassUseId");

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_mealPassUseId_fkey" FOREIGN KEY ("mealPassUseId") REFERENCES "MealPassUse"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MealPlan" ADD CONSTRAINT "MealPlan_bowlCategoryId_fkey" FOREIGN KEY ("bowlCategoryId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MealPlan" ADD CONSTRAINT "MealPlan_smoothieCategoryId_fkey" FOREIGN KEY ("smoothieCategoryId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MealPass" ADD CONSTRAINT "MealPass_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MealPass" ADD CONSTRAINT "MealPass_planId_fkey" FOREIGN KEY ("planId") REFERENCES "MealPlan"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MealPass" ADD CONSTRAINT "MealPass_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "ExtraSale"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MealPass" ADD CONSTRAINT "MealPass_soldById_fkey" FOREIGN KEY ("soldById") REFERENCES "StaffUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MealPass" ADD CONSTRAINT "MealPass_refundSaleId_fkey" FOREIGN KEY ("refundSaleId") REFERENCES "ExtraSale"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MealPassUse" ADD CONSTRAINT "MealPassUse_passId_fkey" FOREIGN KEY ("passId") REFERENCES "MealPass"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MealPassUse" ADD CONSTRAINT "MealPassUse_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MealPassUse" ADD CONSTRAINT "MealPassUse_usedById_fkey" FOREIGN KEY ("usedById") REFERENCES "StaffUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

