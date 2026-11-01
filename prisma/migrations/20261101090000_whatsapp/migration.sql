-- CreateEnum
CREATE TYPE "ReminderFrequency" AS ENUM ('OFF', 'WEEKLY', 'MONTHLY');

-- CreateEnum
CREATE TYPE "WaKind" AS ENUM ('BILL', 'DUE_REMINDER');

-- CreateEnum
CREATE TYPE "WaStatus" AS ENUM ('SENDING', 'SENT', 'DELIVERED', 'READ', 'FAILED');

-- AlterTable
ALTER TABLE "Customer" ADD COLUMN     "remindersPaused" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "whatsappOptOutAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "CafeSettings" ADD COLUMN     "dueReminders" "ReminderFrequency" NOT NULL DEFAULT 'WEEKLY',
ADD COLUMN     "reminderHour" INTEGER NOT NULL DEFAULT 11,
ADD COLUMN     "reminderMinPaise" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "reminderMonthDay" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "reminderWeekday" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "waBillsEnabled" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE "WhatsAppMessage" (
    "id" TEXT NOT NULL,
    "kind" "WaKind" NOT NULL,
    "status" "WaStatus" NOT NULL DEFAULT 'SENDING',
    "customerId" TEXT,
    "billId" TEXT,
    "phone" TEXT NOT NULL,
    "guestName" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "amountPaise" INTEGER NOT NULL,
    "waId" TEXT,
    "error" TEXT,
    "periodKey" TEXT,
    "attempts" INTEGER NOT NULL DEFAULT 1,
    "auto" BOOLEAN NOT NULL DEFAULT false,
    "sentById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WhatsAppMessage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "WhatsAppMessage_waId_key" ON "WhatsAppMessage"("waId");

-- CreateIndex
CREATE INDEX "WhatsAppMessage_createdAt_idx" ON "WhatsAppMessage"("createdAt");

-- CreateIndex
CREATE INDEX "WhatsAppMessage_billId_idx" ON "WhatsAppMessage"("billId");

-- CreateIndex
CREATE UNIQUE INDEX "WhatsAppMessage_customerId_kind_periodKey_key" ON "WhatsAppMessage"("customerId", "kind", "periodKey");

-- AddForeignKey
ALTER TABLE "WhatsAppMessage" ADD CONSTRAINT "WhatsAppMessage_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WhatsAppMessage" ADD CONSTRAINT "WhatsAppMessage_billId_fkey" FOREIGN KEY ("billId") REFERENCES "Bill"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WhatsAppMessage" ADD CONSTRAINT "WhatsAppMessage_sentById_fkey" FOREIGN KEY ("sentById") REFERENCES "StaffUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

