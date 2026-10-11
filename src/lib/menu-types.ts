/** Categories are owner-editable, so slugs are free text; these are the seeded ones. */
export type CategorySlug = string;

export type Category = {
  slug: CategorySlug;
  name: string;
};

export type AddOn = {
  id: string;
  name: string;
  price: number;
  protein: number;
  kcal: number;
  available: boolean;
};

export type MenuTag = "bestseller" | "high-protein";

export type MenuItem = {
  id: string;
  category: CategorySlug;
  name: string;
  description: string;
  ingredients: string[];
  price: number;
  protein: number;
  kcal: number;
  tags: MenuTag[];
  isVeg: boolean;
  available: boolean;
  /** URL of the uploaded photo, if any */
  photo?: string;
  addOnIds: string[];
};

export const HIGH_PROTEIN_MIN_G = 15;
export const LIGHT_MAX_KCAL = 300;

export function isHighProtein(item: Pick<MenuItem, "protein">) {
  return item.protein >= HIGH_PROTEIN_MIN_G;
}

export function isLight(item: Pick<MenuItem, "kcal">) {
  return item.kcal > 0 && item.kcal < LIGHT_MAX_KCAL;
}

/** Items can be listed without protein and calories (entered as 0) – the menu then leaves them out. */
export function hasNutrition(item: Pick<MenuItem, "protein" | "kcal">) {
  return item.protein > 0 || item.kcal > 0;
}
