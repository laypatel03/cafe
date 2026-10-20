-- Data only: take unproven nutrition / "natural" claims out of dish descriptions (same wording as
-- prisma/seed-data.ts). Only the exact old phrases are replaced, so the owner's other menu edits stay.
UPDATE "MenuItem" SET "description" = replace("description", 'Vegan and gluten-free. 300 g.', 'Made without dairy or wheat, in a kitchen that uses both. 300 g.');
UPDATE "MenuItem" SET "description" = replace("description", 'Light and low-fat. 1 cup (~190 g).', '1 cup (~190 g).');
UPDATE "MenuItem" SET "description" = replace("description", 'Thick, creamy and naturally sweet.', 'Thick and creamy, with dates for sweetness.');
UPDATE "MenuItem" SET "description" = replace("description", 'Thick, chocolatey and naturally sweet.', 'Thick and chocolatey, with banana for sweetness.');
UPDATE "MenuItem" SET "description" = replace("description", 'Gentle green tea with natural honey and fresh lemon – a light, wellness-focused cup.', 'Green tea with honey and lemon.');
UPDATE "MenuItem" SET "description" = replace("description", 'sweetened with natural honey.', 'sweetened with honey.');
UPDATE "MenuItem" SET "ingredients" = array_replace("ingredients", 'natural honey', 'honey');
UPDATE "MenuItem" SET "ingredients" = array_replace("ingredients", 'fresh lemon', 'lemon');
