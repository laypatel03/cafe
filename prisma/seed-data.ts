// The café's menu, from the owner's printed menu "Healthy Hunger Menu – Navratri" (11 Oct 2026).
// `pnpm db:seed` only adds what is missing; `pnpm menu:load` overwrites the menu with this file
// (photos are kept). Day to day, the owner edits the menu in the dashboard.
//
// Not on the printed menus, so filled in here:
// - Cold drinks are sold at MRP, so they are in `hiddenUntilPriced`: added but hidden from guests
//   until the owner enters the MRP as the price and shows them.
// - Navratri Special has no protein or calories on the printed menu, so they are 0 (the site
//   then leaves the numbers out).
// - Two-size dishes (toasts, smoothies) are separate items. The 250 ml smoothies' protein and
//   kcal are scaled from the 350 ml figures – the menu gives no numbers for the small size.
// - Add-ons have no nutrition on the menu, so theirs is 0.
import type { AddOn, Category, CategorySlug, MenuItem, MenuTag } from "../src/lib/menu-types";

export const categories: Category[] = [
  { slug: "salads", name: "Salads & bowls" },
  { slug: "chaat", name: "Chaat" },
  { slug: "sandwiches", name: "Sandwiches" },
  { slug: "toast", name: "Healthy toasts" },
  { slug: "oats-bowls", name: "Oats – hot" },
  { slug: "oats-overnight", name: "Oats – overnight (chilled)" },
  { slug: "smoothies", name: "Smoothies & bowls" },
  { slug: "drinks", name: "Tea & coffee" },
  { slug: "cold-drinks", name: "Cold drinks" },
  { slug: "navratri", name: "Navratri special" },
];

const addOn = (id: string, name: string, price: number): AddOn => ({
  id,
  name,
  price,
  protein: 0,
  kcal: 0,
  available: true,
});

export const addOns: AddOn[] = [
  addOn("ao-paneer", "Extra paneer", 40),
  addOn("ao-sweet-corn", "Sweet corn", 30),
  addOn("ao-cheese", "Extra cheese", 50),
  addOn("ao-peanut-butter", "Peanut butter", 30),
  addOn("ao-seasonal-fruit", "Seasonal fruit", 30),
  addOn("ao-honey", "Extra honey", 10),
  addOn("ao-coffee-shot", "Extra coffee shot", 20),
  addOn("ao-large", "Large size", 20),
];

const TEA_ADDONS = ["ao-honey", "ao-large"];
const COFFEE_ADDONS = ["ao-honey", "ao-coffee-shot", "ao-large"];

type Row = {
  id: string;
  name: string;
  description: string;
  ingredients: string[];
  price: number;
  protein: number;
  kcal: number;
  tags?: MenuTag[];
  available?: boolean;
  addOnIds?: string[];
};

const section = (category: CategorySlug, defaults: Partial<Row>, rows: Row[]): MenuItem[] =>
  rows.map((r) => ({
    category,
    isVeg: true,
    tags: [],
    available: true,
    addOnIds: [],
    ...defaults,
    ...r,
  }));

/** Comma-separated ingredient line from the menu → list. */
const list = (s: string) => s.split(",").map((x) => x.trim());

export const menuItems: MenuItem[] = [
  ...section("navratri", {}, [
    {
      id: "n-pani-puri",
      name: "Pani Puri",
      description: "",
      ingredients: [],
      price: 49,
      protein: 0,
      kcal: 0,
    },
    {
      id: "n-fruit-bowl",
      name: "Seasonal Fruit Bowl (200 g)",
      description: "",
      ingredients: [],
      price: 69,
      protein: 0,
      kcal: 0,
    },
  ]),

  ...section("salads", {}, [
    {
      id: "s-quinoa-peanut-chaat",
      name: "Quinoa Peanut Chaat Salad",
      description: "Quinoa, paneer, chickpeas & pomegranate with honey-balsamic dressing. 310 g.",
      ingredients: list(
        "Quinoa, kabuli chana, paneer, cucumber, red & yellow bell peppers, pomegranate, red onion, green chilli, fresh coriander, roasted peanuts, balsamic vinegar, honey, olive oil, lemon juice, sesame seeds",
      ),
      price: 179,
      protein: 19,
      kcal: 465,
    },
    {
      id: "s-mediterranean",
      name: "Mediterranean Bowl",
      description:
        "Hummus, crispy roasted chickpeas, fresh veggies & lemon-herb dressing. Vegan and gluten-free. 300 g.",
      ingredients: list(
        "Kabuli chana, tahini, garlic, lemon juice, olive oil, cucumber, tomato, black olives, lettuce, fresh parsley / coriander",
      ),
      price: 269,
      protein: 15,
      kcal: 410,
    },
    {
      id: "s-mexican-mania",
      name: "Mexican Rice Bowl",
      description: "Mexican rice, rajma beans, corn, salsa, sour cream, cheese & nachos. 345 g.",
      ingredients: list(
        "Basmati rice, tomato puree, onion, garlic, green capsicum, rajma, sweet corn, butter, tomato, fresh coriander, lemon juice, pickled jalapeño, sour cream (hung curd + mayo), cheese, iceberg lettuce, nachos",
      ),
      price: 169,
      protein: 15,
      kcal: 555,
    },
    {
      id: "s-hp-meal",
      name: "High Protein Bowl",
      description: "Quinoa, pan-seared paneer, roasted chickpeas, broccoli & hummus. 340 g.",
      ingredients: list(
        "Quinoa, paneer, kabuli chana, broccoli, lettuce, hummus (chickpeas, tahini, garlic, lemon juice, olive oil), lemon juice, olive oil",
      ),
      price: 179,
      protein: 25,
      kcal: 520,
    },
    {
      id: "s-soya-paneer",
      name: "Air-Fried Soya & Paneer Bowl",
      description:
        "Crispy air-fried soya, seasoned vegetables & sautéed paneer. Our highest-protein bowl, low on oil. 340 g.",
      ingredients: list(
        "Soya chunks, curd, cornflour, red, yellow & green bell peppers, onion, broccoli, carrot, paneer, lemon juice, fresh coriander",
      ),
      price: 179,
      protein: 33,
      kcal: 490,
    },
    {
      id: "s-soya-masala",
      name: "Soybean Masala",
      description:
        "Mini soya sautéed with onion, tomato & ginger-garlic, served with 2 toasted brown bread slices. 320 g.",
      ingredients: list(
        "Mini soya chunks, onion, tomato, ginger-garlic paste, green chilli, butter, fresh coriander, lemon juice, brown bread",
      ),
      price: 149,
      protein: 25,
      kcal: 490,
    },
  ]),

  ...section("chaat", {}, [
    {
      id: "c-sprouts",
      name: "Mixed Sprouts Chaat",
      description:
        "Moong, moth and horse gram sprouts with crunchy veggies and chutney. Fibre-rich. 1 bowl (~250 g).",
      ingredients: list(
        "Moong sprouts, moth (matki) sprouts, horse gram (kulthi) sprouts, roasted peanuts, cucumber, tomato, onion, carrot, beetroot, coriander-mint chutney, lemon juice, pomegranate seeds, boondi",
      ),
      price: 69,
      protein: 13,
      kcal: 275,
    },
    {
      id: "c-peanut",
      name: "Masala Peanut Chaat",
      description: "Roasted shingdana tossed with fresh veggies, pomegranate and lemon. 1 cup (~190 g).",
      ingredients: list(
        "Roasted peanuts (shingdana), cucumber, tomato, onion, pomegranate seeds, fresh coriander, lemon juice, olive oil",
      ),
      price: 69,
      protein: 18,
      kcal: 480,
    },
    {
      id: "c-chana",
      name: "Kala Chana Paneer Chaat",
      description: "Boiled kala chana and paneer with a yogurt dressing. 1 bowl (~275 g).",
      ingredients: list(
        "Boiled kala chana, paneer cubes, boiled cauliflower florets, tomato, cucumber, onion, whisked yogurt (curd), fresh coriander (dhana), lemon juice",
      ),
      price: 69,
      protein: 17,
      kcal: 290,
    },
    {
      id: "c-makhana",
      name: "Masala Makhana Chaat",
      description:
        "Roasted fox nuts with veggies and mint-coriander curd chutney. Light and low-fat. 1 cup (~190 g).",
      ingredients: list(
        "Makhana (fox nuts), ghee, tomato, cucumber, onion, mint-coriander curd chutney, pomegranate seeds, fresh coriander",
      ),
      price: 89,
      protein: 7,
      kcal: 220,
    },
    {
      id: "c-edamame",
      name: "Roasted Edamame Chaat",
      description:
        "Roasted salted edamame with fresh veggies and pomegranate. Our highest-protein chaat. 1 cup (~145 g).",
      ingredients: list("Roasted salted edamame, cucumber, tomato, onion, pomegranate seeds"),
      price: 99,
      protein: 21,
      kcal: 230,
    },
    {
      id: "c-sweet-corn",
      name: "Air-Fryer Peri Peri Corn Chaat",
      description:
        "Air-fried (not deep-fried) sweet corn with a honey-garlic Greek yogurt dressing. 1 bowl (~280 g).",
      ingredients: list(
        "Sweet corn kernels, olive oil, cherry tomatoes, cucumber, onion, Greek yogurt, honey, lemon juice, garlic",
      ),
      price: 99,
      protein: 10,
      kcal: 275,
    },
  ]),

  ...section("sandwiches", {}, [
    {
      id: "w-veg-exotic",
      name: "Exotic Veg Sandwich",
      description:
        "Brown bread with green chutney, crunchy exotic veggies, paneer and melted mozzarella. High protein, no butter.",
      ingredients: list(
        "Brown bread, green chutney, lettuce, baby corn, red & yellow bell peppers, broccoli, paneer, mozzarella cheese",
      ),
      price: 169,
      protein: 23,
      kcal: 430,
    },
    {
      id: "w-pb-banana",
      name: "Peanut Butter Banana Sandwich",
      description: "Crunchy & smooth peanut butter with banana, raisins, walnuts and a honey drizzle.",
      ingredients: list(
        "Brown bread, crunchy & smooth peanut butter, banana, raisins (kismis), honey, walnuts, mixed seeds (chia, flax, sesame)",
      ),
      price: 119,
      protein: 17,
      kcal: 570,
    },
    {
      id: "w-red-velvet",
      name: "Red Velvet Sandwich",
      description:
        "Beetroot hummus, cream cheese and hung curd with crunchy fresh veggies on olive-oil-toasted multigrain.",
      ingredients: list(
        "Multigrain bread, red hummus (hummus + beetroot), cream cheese, hung curd, lemon juice, cucumber, carrot, green bell pepper, onion, extra virgin olive oil",
      ),
      price: 149,
      protein: 14,
      kcal: 400,
    },
  ]),

  ...section("toast", {}, [
    {
      id: "t-avocado",
      name: "Desi Avocado Paneer Toast – full plate (2 slices)",
      description:
        "Smashed avocado, crumbled low-fat paneer, fresh tomato and red onion, brightened with lemon and finished with toasted seeds.",
      ingredients: list(
        "Multigrain bread, avocado, low-fat paneer, tomato, red onion, lemon juice, olive oil, pumpkin & sunflower seeds, fresh coriander, green chilli",
      ),
      price: 249,
      protein: 19,
      kcal: 470,
      addOnIds: ["ao-paneer"],
    },
    {
      id: "t-avocado-single",
      name: "Desi Avocado Paneer Toast – single slice",
      description:
        "Smashed avocado, crumbled low-fat paneer, fresh tomato and red onion, brightened with lemon and finished with toasted seeds.",
      ingredients: list(
        "Multigrain bread, avocado, low-fat paneer, tomato, red onion, lemon juice, olive oil, pumpkin & sunflower seeds, fresh coriander, green chilli",
      ),
      price: 179,
      protein: 10,
      kcal: 235,
      addOnIds: ["ao-paneer"],
    },
    {
      id: "t-cheese-paneer",
      name: "Hariyali Paneer Cheese Melt – full plate (2 slices)",
      description:
        "Open-faced multigrain toast with our house dhaniya-pudina chutney, paneer, capsicum, onion and tomato, blanketed in mozzarella and grilled until golden.",
      ingredients: list(
        "Multigrain bread, dhaniya-pudina green chutney, low-fat paneer, Amul mozzarella cheese, green capsicum, onion, tomato, Amul butter",
      ),
      price: 249,
      protein: 27,
      kcal: 465,
      addOnIds: ["ao-sweet-corn", "ao-cheese"],
    },
    {
      id: "t-hariyali-single",
      name: "Hariyali Paneer Cheese Melt – single slice",
      description:
        "Open-faced multigrain toast with our house dhaniya-pudina chutney, paneer, capsicum, onion and tomato, blanketed in mozzarella and grilled until golden.",
      ingredients: list(
        "Multigrain bread, dhaniya-pudina green chutney, low-fat paneer, Amul mozzarella cheese, green capsicum, onion, tomato, Amul butter",
      ),
      price: 129,
      protein: 14,
      kcal: 233,
      addOnIds: ["ao-sweet-corn", "ao-cheese"],
    },
  ]),

  ...section("oats-bowls", {}, [
    {
      id: "o-classic",
      name: "Classic Banana Honey Oats",
      description: "Hot oats cooked fresh in milk with banana, honey, dry fruits & seeds. 1 bowl (~300 g).",
      ingredients: list(
        "Quaker oats, Amul Taaza milk, banana, honey, almonds, cashews, raisins, pumpkin seeds",
      ),
      price: 99,
      protein: 17,
      kcal: 340,
    },
    {
      id: "o-apple-cinnamon",
      name: "Apple Cinnamon Walnut Oats",
      description: "Hot oats cooked fresh in milk, topped with soft-stewed apple and walnuts.",
      ingredients: list("Quaker oats, Amul Taaza milk, apple (with skin), honey or jaggery, walnuts"),
      price: 119,
      protein: 12,
      kcal: 380,
    },
    {
      id: "o-pb-choco",
      name: "Peanut Butter Choco Oats",
      description: "Hot cocoa oats cooked fresh in milk, topped with banana & crunchy peanut butter.",
      ingredients: list(
        "Quaker oats, Amul Taaza milk, Hershey's unsweetened cocoa, MyFitness crunchy peanut butter, banana, honey",
      ),
      price: 129,
      protein: 17,
      kcal: 450,
      tags: ["bestseller"],
    },
  ]),

  ...section("oats-overnight", {}, [
    {
      id: "o-on-dry-fruits",
      name: "Dry Fruits Overnight Bowl",
      description: "Overnight oats with milk, dry fruits & seeds, served chilled. Serves 1.",
      ingredients: list(
        "Quaker oats, black kishmish (raisins), anjeer (dried fig), walnut kernels, pumpkin seeds, almonds, Amul Taaza milk, chia seeds",
      ),
      price: 139,
      protein: 13,
      kcal: 306,
    },
    {
      id: "o-on-choco-pb",
      name: "Choco Peanut Butter Overnight Oats",
      description: "Chocolate overnight oats served chilled, topped with banana & crunchy peanut butter.",
      ingredients: list(
        "Pintola oats, Amul Taaza milk, curd, Hershey's unsweetened cocoa, MyFitness crunchy peanut butter, honey, banana",
      ),
      price: 129,
      protein: 16,
      kcal: 400,
    },
    {
      id: "o-on-cold-coffee",
      name: "Cold Coffee Overnight Oats",
      description: "Coffee overnight oats served chilled with a light dusting of cocoa. Contains caffeine.",
      ingredients: list(
        "Pintola oats, Amul Taaza milk, Nescafé Classic coffee, curd, Hershey's unsweetened cocoa, jaggery or honey, chia seeds",
      ),
      price: 99,
      protein: 13,
      kcal: 340,
    },
  ]),

  ...section("smoothies", {}, [
    {
      id: "m-apple-oats",
      name: "Apple Oats Smoothie (350 ml)",
      description:
        "Crisp apple blended with rolled oats, dates, nuts and chia in chilled milk. Thick, creamy and naturally sweet.",
      ingredients: list(
        "Apple (with skin), rolled oats, chilled toned milk, honey, dates, chia seeds, almonds, walnuts",
      ),
      price: 179,
      protein: 13,
      kcal: 410,
      addOnIds: ["ao-peanut-butter"],
    },
    {
      id: "m-apple-oats-small",
      name: "Apple Oats Smoothie – small (250 ml)",
      description:
        "Crisp apple blended with rolled oats, dates, nuts and chia in chilled milk. Thick, creamy and naturally sweet.",
      ingredients: list(
        "Apple (with skin), rolled oats, chilled toned milk, honey, dates, chia seeds, almonds, walnuts",
      ),
      price: 129,
      protein: 9, // scaled from 350 ml
      kcal: 293,
      addOnIds: ["ao-peanut-butter"],
    },
    {
      id: "m-choco-pb",
      name: "Chocolate Peanut Butter Smoothie (350 ml)",
      description:
        "Rich cocoa and creamy peanut butter blended with frozen banana, muesli and nuts. Thick, chocolatey and naturally sweet.",
      ingredients: list(
        "Amul Taaza toned milk, frozen banana, muesli, unsweetened cocoa, peanut butter, almonds, cashews, walnuts, dates, chocolate syrup, roasted peanuts",
      ),
      price: 189,
      protein: 18,
      kcal: 510,
      addOnIds: ["ao-peanut-butter"],
    },
    {
      id: "m-choco-pb-small",
      name: "Chocolate Peanut Butter Smoothie – small (250 ml)",
      description:
        "Rich cocoa and creamy peanut butter blended with frozen banana, muesli and nuts. Thick, chocolatey and naturally sweet.",
      ingredients: list(
        "Amul Taaza toned milk, frozen banana, muesli, unsweetened cocoa, peanut butter, almonds, cashews, walnuts, dates, chocolate syrup, roasted peanuts",
      ),
      price: 139,
      protein: 13, // scaled from 350 ml
      kcal: 364,
      addOnIds: ["ao-peanut-butter"],
    },
    {
      id: "m-banana-chia",
      name: "Banana Chia Healthy Bowl",
      description:
        "Overnight chia and oats with banana, layered with thick curd and topped with walnuts, dates and roasted seeds. ≈ 350 g.",
      ingredients: list(
        "Chia seeds, rolled oats, toned milk, banana, curd (dahi), flax, pumpkin & sunflower seeds, walnuts, dates, honey",
      ),
      price: 189,
      protein: 16,
      kcal: 520,
      addOnIds: ["ao-seasonal-fruit", "ao-peanut-butter"],
    },
  ]),

  ...section("drinks", {}, [
    {
      id: "d-lemon-ginger-tea",
      name: "Lemon Ginger Tea",
      description: "Warming fresh ginger with zesty lemon – perfect for monsoon and winter. No milk.",
      ingredients: list("Fresh ginger, lemon"),
      price: 49,
      protein: 0,
      kcal: 48,
      addOnIds: TEA_ADDONS,
    },
    {
      id: "d-green-tea",
      name: "Honey Lemon Green Tea",
      description: "Gentle green tea with natural honey and fresh lemon – a light, wellness-focused cup.",
      ingredients: list("Green tea, natural honey, fresh lemon"),
      price: 69,
      protein: 0,
      kcal: 68,
      addOnIds: TEA_ADDONS,
    },
    {
      id: "d-blue-tea",
      name: "Blue Tea with Lemon & Chia",
      description:
        "Warm butterfly pea flower tea with honey and soaked chia seeds – turns from blue to purple when the lemon is poured in.",
      ingredients: list("Butterfly pea flower, honey, chia seeds, lemon"),
      price: 79,
      protein: 0,
      kcal: 86,
      addOnIds: TEA_ADDONS,
    },
    {
      id: "d-coffee-lemon",
      name: "Black Coffee with Lemon",
      description: "Strong black coffee with a squeeze of fresh lemon and a lemon slice.",
      ingredients: list("Black coffee, fresh lemon"),
      price: 39,
      protein: 0,
      kcal: 3,
      addOnIds: COFFEE_ADDONS,
    },
    {
      id: "d-coffee-honey",
      name: "Black Coffee with Honey",
      description: "Strong black coffee sweetened with natural honey.",
      ingredients: list("Black coffee, natural honey"),
      price: 49,
      protein: 0,
      kcal: 32,
      addOnIds: COFFEE_ADDONS,
    },
    {
      id: "d-coffee-honey-lemon",
      name: "Black Coffee with Honey + Lemon",
      description: "Honey and fresh lemon together for a sweet-tangy cup.",
      ingredients: list("Black coffee, natural honey, fresh lemon"),
      price: 59,
      protein: 0,
      kcal: 35,
      addOnIds: COFFEE_ADDONS,
    },
  ]),

  // Sold at the MRP printed on the pack – the owner enters the price. See hiddenUntilPriced.
  ...section("cold-drinks", {}, [
    {
      id: "d-diet-coke",
      name: "Diet Coke (Can)",
      description: "Served chilled, sold at the MRP printed on the can.",
      ingredients: [],
      price: 0,
      protein: 0,
      kcal: 1,
    },
    {
      id: "d-water",
      name: "Packaged Drinking Water",
      description: "Kinley / Bisleri / Aquafina, sold at the MRP printed on the bottle.",
      ingredients: [],
      price: 0,
      protein: 0,
      kcal: 0,
    },
  ]),
];

/** Added but hidden from guests: sold at MRP, so the owner enters the price first. */
export const hiddenUntilPriced = ["d-diet-coke", "d-water"];

export const todaysPickId = "s-hp-meal";

// Café details – placeholders until the owner fills them in under Settings.
export const cafe = {
  name: "Healthy Hunger",
  promise: "100% veg. Protein from real food.",
  address: "Address to be confirmed",
  mapUrl: "https://maps.google.com/?q=Healthy+Hunger+Cafe",
  phone: "+91 98000 00000",
  whatsapp: "919800000000",
  instagram: "healthyhunger",
  hours: [
    { days: "Mon – Sat", time: "7:30 am – 10:30 pm" },
    { days: "Sunday", time: "8:00 am – 9:00 pm" },
  ],
};
