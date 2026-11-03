-- A bill paid over or under its total keeps the difference on the bill, so the money book and
-- cash drawer count what was actually received (instead of a ± extra sale).
ALTER TABLE "Bill" ADD COLUMN "differencePaise" INTEGER NOT NULL DEFAULT 0;

UPDATE "Bill" b SET "differencePaise" = e."amountPaise"
FROM "CustomerBalanceEntry" e
WHERE e."billId" = b."id" AND e."kind" IN ('PAID_EXTRA', 'PAID_LESS');

-- the ± extra sales those entries made are now counted through the bill
DELETE FROM "ExtraSale" s
USING "CustomerBalanceEntry" e
WHERE e."saleId" = s."id" AND e."billId" IS NOT NULL AND e."kind" IN ('PAID_EXTRA', 'PAID_LESS');
