// Blog articles on the public site. The text lives in components/blog/article-bodies.tsx;
// dish numbers in them come from the live menu, so they stay right when a recipe changes.

export type Article = {
  slug: string;
  title: string;
  /** one sentence for the list, search results and link previews */
  description: string;
  /** yyyy-mm-dd */
  published: string;
  readMinutes: number;
  cover: { src: string; alt: string; credit: string; creditUrl: string };
  /** the closing "Try it" line and the dishes shown under it (menu item ids) */
  tryIt: { text: string; dishIds: string[] };
};

export const ARTICLES: Article[] = [
  {
    slug: "how-much-protein-do-you-need",
    title: "How much protein do you actually need?",
    description: "A simple way to work out your daily protein, and how to get there on a vegetarian plate.",
    published: "2026-10-16",
    readMinutes: 2,
    cover: {
      src: "/blog/protein-bowl.webp",
      alt: "A bowl of chickpeas, avocado, sweet potato, tomatoes and greens",
      credit: "Anna Pelzer",
      creditUrl: "https://unsplash.com/photos/IGfIGP5ONV0",
    },
    tryIt: {
      text: "Start with the Air-Fried Soya & Paneer Bowl – one bowl covers more than half a 60 kg adult's daily need.",
      dishIds: ["s-soya-paneer", "s-hp-meal", "o-classic"],
    },
  },
  {
    slug: "vegetarian-proteins-we-cook-with",
    title: "Five vegetarian proteins we cook with every day",
    description:
      "Paneer, soya, chana, peanuts and quinoa – what each one brings, and where to find it on our menu.",
    published: "2026-10-16",
    readMinutes: 3,
    cover: {
      src: "/blog/chickpea-bowl.webp",
      alt: "A bowl of roasted chickpeas, edamame, yogurt and fresh vegetables",
      credit: "Odiseo Castrejon",
      creditUrl: "https://unsplash.com/photos/1SPu0KT-Ejg",
    },
    tryIt: {
      text: "The High Protein Bowl brings paneer, chana and quinoa together in one bowl.",
      dishIds: ["s-hp-meal", "c-chana", "s-quinoa-peanut-chaat"],
    },
  },
  {
    slug: "ingredient-spotlight-sprouts",
    title: "Ingredient spotlight: sprouts",
    description: "Why we sprout moong, matki and kulthi, and what it does to a simple bowl of dal.",
    published: "2026-10-16",
    readMinutes: 2,
    cover: {
      src: "/blog/sprouts-chaat.webp",
      alt: "Sprouted moong and peanut chaat with tomato, onion and coriander",
      credit: "Sumeet B",
      creditUrl: "https://unsplash.com/photos/RBZOEB_Ea4s",
    },
    tryIt: {
      text: "Mixed Sprouts Chaat – moong, matki and kulthi sprouts with peanuts, crunchy veggies, chutney and pomegranate.",
      dishIds: ["c-sprouts"],
    },
  },
  {
    slug: "oats-hot-bowls-and-overnight-jars",
    title: "Oats, but not boring: hot bowls and overnight jars",
    description:
      "Why oats make a good breakfast, and how milk, nuts and peanut butter turn them into a high-protein meal.",
    published: "2026-10-16",
    readMinutes: 2,
    cover: {
      src: "/blog/peanut-butter-oats.webp",
      alt: "A bowl of oats topped with banana, strawberries, seeds and peanut butter",
      credit: "Esra Afşar",
      creditUrl: "https://unsplash.com/photos/6UhG-TExmms",
    },
    tryIt: {
      text: "The Classic Banana Honey Oats – the lightest of our high-protein oats.",
      dishIds: ["o-classic", "o-on-choco-pb"],
    },
  },
  {
    slug: "how-to-read-our-menu",
    title: "How to read our menu: protein, calories and the labels",
    description:
      "What the numbers and tags on every Healthy Hunger dish mean, and how to use them to order for your goal.",
    published: "2026-10-16",
    readMinutes: 2,
    cover: {
      src: "/blog/chana-chaat.webp",
      alt: "Close-up of kala chana chaat with tomato, onion and coriander",
      credit: "Zoshua Colah",
      creditUrl: "https://unsplash.com/photos/DHiil-gDSLA",
    },
    tryIt: {
      text: "Next time you scan the QR, tap High protein and Light together – the Roasted Edamame Chaat is the standout.",
      dishIds: ["c-edamame", "c-chana"],
    },
  },
];

export const getArticle = (slug: string) => ARTICLES.find((a) => a.slug === slug);

/** "16 October 2026" */
export const articleDate = (iso: string) =>
  new Date(`${iso}T12:00:00Z`).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
