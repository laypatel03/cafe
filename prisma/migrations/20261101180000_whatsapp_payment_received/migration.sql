-- AlterEnum
ALTER TYPE "WaKind" ADD VALUE 'PAYMENT_RECEIVED';

-- AlterTable
ALTER TABLE "WhatsAppMessage" ADD COLUMN     "billIds" TEXT[] DEFAULT ARRAY[]::TEXT[];
