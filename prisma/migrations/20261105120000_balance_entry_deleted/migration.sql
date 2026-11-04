-- AlterTable
ALTER TABLE "CustomerBalanceEntry" ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "deletedById" TEXT;

-- AddForeignKey
ALTER TABLE "CustomerBalanceEntry" ADD CONSTRAINT "CustomerBalanceEntry_deletedById_fkey" FOREIGN KEY ("deletedById") REFERENCES "StaffUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;
