-- AlterEnum
ALTER TYPE "WaKind" ADD VALUE 'WELCOME';

-- AlterTable
ALTER TABLE "CafeSettings" ADD COLUMN     "waWelcomeEnabled" BOOLEAN NOT NULL DEFAULT true;
