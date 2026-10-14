-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "PaymentMethod" ADD VALUE 'CREDIT_CARD';
ALTER TYPE "PaymentMethod" ADD VALUE 'DEBIT_CARD';

-- AlterTable
ALTER TABLE "CafeSettings" ADD COLUMN     "creditCardFeeBps" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "debitCardFeeBps" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "ExtraSale" (
    "id" TEXT NOT NULL,
    "soldAt" TIMESTAMP(3) NOT NULL,
    "method" "PaymentMethod" NOT NULL,
    "amountPaise" INTEGER NOT NULL,
    "note" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExtraSale_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ExtraSale_soldAt_idx" ON "ExtraSale"("soldAt");

-- AddForeignKey
ALTER TABLE "ExtraSale" ADD CONSTRAINT "ExtraSale_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "StaffUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;
