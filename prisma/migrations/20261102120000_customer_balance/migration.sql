
-- CreateEnum
CREATE TYPE "BalanceKind" AS ENUM ('PAID_EXTRA', 'PAID_LESS', 'PAID_BACK', 'RETURNED', 'SETTLED');

-- AlterTable
ALTER TABLE "OrderItem" ADD COLUMN     "balanceEntryId" TEXT;

-- CreateTable
CREATE TABLE "CustomerBalanceEntry" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "kind" "BalanceKind" NOT NULL,
    "amountPaise" INTEGER NOT NULL,
    "method" "PaymentMethod",
    "billId" TEXT,
    "orderId" TEXT,
    "saleId" TEXT,
    "note" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CustomerBalanceEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CustomerBalanceEntry_saleId_key" ON "CustomerBalanceEntry"("saleId");

-- CreateIndex
CREATE INDEX "CustomerBalanceEntry_customerId_idx" ON "CustomerBalanceEntry"("customerId");

-- CreateIndex
CREATE INDEX "CustomerBalanceEntry_orderId_idx" ON "CustomerBalanceEntry"("orderId");

-- CreateIndex
CREATE UNIQUE INDEX "OrderItem_balanceEntryId_key" ON "OrderItem"("balanceEntryId");

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_balanceEntryId_fkey" FOREIGN KEY ("balanceEntryId") REFERENCES "CustomerBalanceEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerBalanceEntry" ADD CONSTRAINT "CustomerBalanceEntry_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerBalanceEntry" ADD CONSTRAINT "CustomerBalanceEntry_billId_fkey" FOREIGN KEY ("billId") REFERENCES "Bill"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerBalanceEntry" ADD CONSTRAINT "CustomerBalanceEntry_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerBalanceEntry" ADD CONSTRAINT "CustomerBalanceEntry_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "ExtraSale"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerBalanceEntry" ADD CONSTRAINT "CustomerBalanceEntry_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "StaffUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

