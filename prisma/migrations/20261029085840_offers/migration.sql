-- CreateTable
CREATE TABLE "Offer" (
    "id" TEXT NOT NULL,
    "menuItemId" TEXT NOT NULL,
    "pricePaise" INTEGER NOT NULL,
    "title" TEXT NOT NULL DEFAULT '',
    "startsOn" TEXT NOT NULL,
    "endsOn" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Offer_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Offer_endsOn_idx" ON "Offer"("endsOn");

-- AddForeignKey
ALTER TABLE "Offer" ADD CONSTRAINT "Offer_menuItemId_fkey" FOREIGN KEY ("menuItemId") REFERENCES "MenuItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
