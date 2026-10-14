-- AlterTable
ALTER TABLE "CafeSettings" ADD COLUMN     "orderEditsEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "customerEditsEnabled" BOOLEAN NOT NULL DEFAULT false;
