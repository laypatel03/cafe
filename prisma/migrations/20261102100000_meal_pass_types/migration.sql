-- Meal passes: fixed bowl/smoothie parts become a list of meal types ("parts").
ALTER TABLE "MealPlan" ADD COLUMN "parts" JSONB NOT NULL DEFAULT '[]';
ALTER TABLE "MealPass" ADD COLUMN "parts" JSONB NOT NULL DEFAULT '[]';

UPDATE "MealPlan" SET "parts" = (
  SELECT COALESCE(jsonb_agg(x.p ORDER BY x.o), '[]'::jsonb) FROM (
    SELECT 1 AS o, jsonb_build_object('name', 'Bowl', 'meals', "bowls", 'categoryIds', to_jsonb("bowlCategoryIds"), 'capPaise', "bowlCapPaise") AS p WHERE "bowls" > 0
    UNION ALL
    SELECT 2, jsonb_build_object('name', 'Smoothie', 'meals', "smoothies", 'categoryIds', to_jsonb("smoothieCategoryIds"), 'capPaise', "smoothieCapPaise") WHERE "smoothies" > 0
  ) x
);
UPDATE "MealPass" SET "parts" = (
  SELECT COALESCE(jsonb_agg(x.p ORDER BY x.o), '[]'::jsonb) FROM (
    SELECT 1 AS o, jsonb_build_object('name', 'Bowl', 'meals', "bowls", 'categoryIds', to_jsonb("bowlCategoryIds"), 'capPaise', "bowlCapPaise") AS p WHERE "bowls" > 0
    UNION ALL
    SELECT 2, jsonb_build_object('name', 'Smoothie', 'meals', "smoothies", 'categoryIds', to_jsonb("smoothieCategoryIds"), 'capPaise', "smoothieCapPaise") WHERE "smoothies" > 0
  ) x
);

-- uses point at a part by position: bowls first, smoothies after them (or first on a smoothie-only pass)
ALTER TABLE "MealPassUse" ADD COLUMN "part" INTEGER;
ALTER TABLE "MealPassUse" ADD COLUMN "partName" TEXT;
UPDATE "MealPassUse" u SET
  "part" = CASE WHEN u."kind" = 'BOWL' OR p."bowls" = 0 THEN 0 ELSE 1 END,
  "partName" = CASE WHEN u."kind" = 'BOWL' THEN 'Bowl' ELSE 'Smoothie' END
FROM "MealPass" p WHERE p."id" = u."passId";
ALTER TABLE "MealPassUse" ALTER COLUMN "part" SET NOT NULL;
ALTER TABLE "MealPassUse" ALTER COLUMN "partName" SET NOT NULL;
ALTER TABLE "MealPassUse" DROP COLUMN "kind";
DROP TYPE "MealKind";

ALTER TABLE "MealPlan" DROP COLUMN "bowls", DROP COLUMN "smoothies", DROP COLUMN "bowlCategoryIds", DROP COLUMN "bowlCapPaise", DROP COLUMN "smoothieCategoryIds", DROP COLUMN "smoothieCapPaise";
ALTER TABLE "MealPass" DROP COLUMN "bowls", DROP COLUMN "smoothies", DROP COLUMN "bowlCategoryIds", DROP COLUMN "bowlCapPaise", DROP COLUMN "smoothieCategoryIds", DROP COLUMN "smoothieCapPaise";
