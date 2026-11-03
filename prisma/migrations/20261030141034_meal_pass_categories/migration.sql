-- Meal plans and passes: several categories per meal kind (was one), keeping what was set.
ALTER TABLE "MealPlan" ADD COLUMN "bowlCategoryIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
                       ADD COLUMN "smoothieCategoryIds" TEXT[] DEFAULT ARRAY[]::TEXT[];
UPDATE "MealPlan" SET "bowlCategoryIds" = ARRAY["bowlCategoryId"] WHERE "bowlCategoryId" IS NOT NULL;
UPDATE "MealPlan" SET "smoothieCategoryIds" = ARRAY["smoothieCategoryId"] WHERE "smoothieCategoryId" IS NOT NULL;
ALTER TABLE "MealPlan" DROP CONSTRAINT "MealPlan_bowlCategoryId_fkey",
                       DROP CONSTRAINT "MealPlan_smoothieCategoryId_fkey",
                       DROP COLUMN "bowlCategoryId",
                       DROP COLUMN "smoothieCategoryId";

ALTER TABLE "MealPass" ADD COLUMN "bowlCategoryIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
                       ADD COLUMN "smoothieCategoryIds" TEXT[] DEFAULT ARRAY[]::TEXT[];
UPDATE "MealPass" SET "bowlCategoryIds" = ARRAY["bowlCategoryId"] WHERE "bowlCategoryId" IS NOT NULL;
UPDATE "MealPass" SET "smoothieCategoryIds" = ARRAY["smoothieCategoryId"] WHERE "smoothieCategoryId" IS NOT NULL;
ALTER TABLE "MealPass" DROP COLUMN "bowlCategoryId",
                       DROP COLUMN "smoothieCategoryId";

-- A dish from outside the plan's categories, counted as a meal at the counter.
ALTER TABLE "MealPassUse" ADD COLUMN "swap" BOOLEAN NOT NULL DEFAULT false;
