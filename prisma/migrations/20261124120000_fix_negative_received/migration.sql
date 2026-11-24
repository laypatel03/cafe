-- Paid bills whose total was edited down after a short payment, before the balance followed edits:
-- what came in (total + difference) works out below ₹0, which can't be. Nothing negative was
-- received, so it was ₹0: the difference becomes -total and the guest's entry follows.
-- Entries first – they find their bills by the same test before the bills are fixed.
DELETE FROM "CustomerBalanceEntry" e
  USING "Bill" b
  WHERE e."billId" = b."id" AND e."kind" IN ('PAID_LESS', 'PAID_EXTRA') AND e."deletedAt" IS NULL
    AND b."paidAt" IS NOT NULL AND b."voidedAt" IS NULL
    AND b."totalPaise" + b."differencePaise" < 0 AND b."totalPaise" = 0;

UPDATE "CustomerBalanceEntry" e
  SET "amountPaise" = -b."totalPaise", "kind" = 'PAID_LESS'
  FROM "Bill" b
  WHERE e."billId" = b."id" AND e."kind" IN ('PAID_LESS', 'PAID_EXTRA') AND e."deletedAt" IS NULL
    AND b."paidAt" IS NOT NULL AND b."voidedAt" IS NULL
    AND b."totalPaise" + b."differencePaise" < 0 AND b."totalPaise" > 0;

UPDATE "Bill"
  SET "differencePaise" = -"totalPaise"
  WHERE "paidAt" IS NOT NULL AND "voidedAt" IS NULL AND "totalPaise" + "differencePaise" < 0;
