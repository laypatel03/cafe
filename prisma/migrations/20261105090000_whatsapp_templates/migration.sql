-- CreateTable
CREATE TABLE "WhatsAppTemplate" (
    "key" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "footer" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'APPROVED',
    "reason" TEXT,
    "submittedAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WhatsAppTemplate_pkey" PRIMARY KEY ("key")
);
