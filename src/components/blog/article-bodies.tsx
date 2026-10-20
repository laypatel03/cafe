import Link from "next/link";
import type { ReactNode } from "react";
import { HIGH_PROTEIN_MIN_G, LIGHT_MAX_KCAL, type MenuItem } from "@/lib/menu-types";

type Menu = Map<string, MenuItem>;

/** "33 g protein, 490 kcal" for a dish, from the live menu (empty if it's off the menu). */
function Nums({ menu, id }: { menu: Menu; id: string }) {
  const d = menu.get(id);
  return d ? (
    <span className="tabular">
      {d.protein} g protein, {d.kcal} kcal
    </span>
  ) : null;
}

/** A dish's name linking to it on the menu. */
function DishLink({ menu, id, children }: { menu: Menu; id: string; children?: ReactNode }) {
  const d = menu.get(id);
  if (!d) return <>{children}</>;
  return (
    <Link
      href={`/menu?item=${id}`}
      className="font-semibold text-brand-text underline-offset-2 hover:underline"
    >
      {children ?? d.name}
    </Link>
  );
}

/** `wide`: too much text to squeeze onto a phone, so it scrolls sideways there instead. */
function Table({ head, rows, wide = false }: { head: string[]; rows: ReactNode[][]; wide?: boolean }) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-border">
      <table className={`w-full text-left text-[15px] ${wide ? "min-w-xl" : ""}`}>
        <thead className="bg-muted text-sm">
          <tr>
            {head.map((h) => (
              <th key={h} className="px-3 py-2.5 font-semibold sm:px-4">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-t border-border">
              {r.map((c, j) => (
                <td key={j} className="px-3 py-2.5 align-top sm:px-4">
                  {c}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Dish · protein · calories (+ extra columns), skipping dishes that are off the menu. */
function DishTable({
  menu,
  ids,
  extra,
}: {
  menu: Menu;
  ids: string[];
  extra?: { head: string; cell: (d: MenuItem) => ReactNode };
}) {
  const dishes = ids.map((id) => menu.get(id)).filter((d) => !!d);
  return (
    <Table
      head={["Dish", ...(extra ? [extra.head] : []), "Protein", "Calories"]}
      rows={dishes.map((d) => [
        <DishLink key="n" menu={menu} id={d.id} />,
        ...(extra ? [extra.cell(d)] : []),
        <span key="p" className="tabular">
          {d.protein} g
        </span>,
        <span key="k" className="tabular">
          {d.kcal} kcal
        </span>,
      ])}
    />
  );
}

const HowMuchProtein = ({ menu }: { menu: Menu }) => (
  <>
    <p>
      Most adults need about <strong>0.8 g of protein for every kg they weigh</strong>, every day. That is the
      figure Indian dietary guidelines (ICMR-NIN) use for healthy adults. If you weigh 60 kg, that is roughly
      50 g a day. If you work out regularly, many people aim higher – often 1.2 to 1.6 g per kg – but it is
      worth checking with a dietitian or your trainer for your own needs.
    </p>
    <h2>Why vegetarians fall short</h2>
    <p>
      A typical Indian vegetarian day leans on roti, rice and sabzi. These fill you up but carry little
      protein. One plain roti has about 3 g. A katori of dal has about 6–7 g. It adds up slower than most
      people think, and breakfast is often the meal with the least.
    </p>
    <h2>Spread it through the day</h2>
    <p>
      Your body uses protein best in steady amounts, not all at dinner. A simple target is{" "}
      <strong>15–25 g per meal</strong>. That is easier to reach than it sounds:
    </p>
    <ul>
      <li>A bowl of paneer and chickpeas at lunch</li>
      <li>A sprouts or chana chaat as an evening snack instead of fried namkeen</li>
      <li>Oats cooked in milk, with nuts and seeds, for breakfast</li>
    </ul>
    <h2>What 25 g looks like at Healthy Hunger</h2>
    <p>Every dish on our menu shows its protein, so you can count as you order:</p>
    <DishTable menu={menu} ids={["s-soya-paneer", "s-hp-meal", "s-soya-masala", "c-peanut", "o-classic"]} />
  </>
);

const VegProteins = ({ menu }: { menu: Menu }) => (
  <>
    <p>
      You do not need meat or protein powder to eat a high-protein meal. These five everyday Indian
      ingredients do most of the work in our kitchen. The figures below are approximate, per 100 g.
    </p>
    <Table
      wide
      head={["Ingredient", "Protein (approx.)", "Why we like it", "Find it in"]}
      rows={[
        [
          "Soya chunks (dry)",
          "~50 g",
          "The most protein of any common veg food; soaks up masala well",
          <>
            <DishLink menu={menu} id="s-soya-paneer" />, <DishLink menu={menu} id="s-soya-masala" />
          </>,
        ],
        [
          "Paneer",
          "~18 g",
          "Filling, mild, and also gives calcium",
          <>
            <DishLink menu={menu} id="s-hp-meal" />, <DishLink menu={menu} id="c-chana" />
          </>,
        ],
        [
          "Peanuts (roasted)",
          "~25 g",
          "Cheap, crunchy, and adds healthy fats",
          <>
            <DishLink menu={menu} id="c-peanut" />, <DishLink menu={menu} id="s-quinoa-peanut-chaat" />
          </>,
        ],
        [
          "Kabuli & kala chana (dry)",
          "~18–20 g",
          "Protein plus fibre, so you stay full longer",
          <>
            <DishLink menu={menu} id="s-mediterranean" />, <DishLink menu={menu} id="c-chana" />
          </>,
        ],
        [
          "Quinoa (dry)",
          "~14 g",
          "A grain that brings more protein than rice",
          <>
            <DishLink menu={menu} id="s-hp-meal" />, <DishLink menu={menu} id="s-quinoa-peanut-chaat" />
          </>,
        ],
      ]}
    />
    <h2>Mix them for a better meal</h2>
    <p>
      Plant proteins work best in combination. Pulses (chana, rajma, moong) pair well with grains (rice,
      quinoa, bread), and dairy like paneer and curd rounds things out. That is why most of our bowls put two
      or three of these together rather than relying on one.
    </p>
    <h2>A note on portions</h2>
    <p>
      Peanuts and paneer are rich in fat as well as protein. They are good fats in moderate amounts, but if
      you are watching calories, look at the kcal next to each dish – the{" "}
      <DishLink menu={menu} id="c-chana" /> gives <Nums menu={menu} id="c-chana" />, while the{" "}
      <DishLink menu={menu} id="c-peanut" /> gives <Nums menu={menu} id="c-peanut" />.
    </p>
  </>
);

const Sprouts = () => (
  <>
    <p>
      Sprouting is one of the oldest tricks in the Indian kitchen. Soak whole moong, matki (moth) or kulthi
      (horse gram) overnight, drain, and leave them covered for a day. A small tail appears, and the dry pulse
      turns into something fresh, crunchy and quick to eat.
    </p>
    <h2>What changes when a pulse sprouts</h2>
    <ul>
      <li>
        <strong>Easier to digest.</strong> Many people find sprouts lighter on the stomach than the same pulse
        cooked as dal.
      </li>
      <li>
        <strong>Fresh crunch, no long cooking.</strong> Sprouts need only a light steam or a quick toss, so
        they keep their bite.
      </li>
      <li>
        <strong>Protein and fibre stay.</strong> You still get the pulse&apos;s protein and fibre, in a form
        that works as a snack, not just a side.
      </li>
    </ul>
    <h2>Why three kinds</h2>
    <p>
      Each sprout brings its own texture. Moong is soft and sweet, matki is small and nutty, and kulthi is
      firm with an earthy taste. Mixing them makes the bowl more interesting to eat – and gives a wider spread
      of nutrients than any one alone.
    </p>
    <h2>How we keep them fresh</h2>
    <p>
      Sprouts are best eaten the day they are ready. We sprout in small batches, keep them chilled, and add
      the lemon and chutney only when you order.
    </p>
  </>
);

const Oats = ({ menu }: { menu: Menu }) => (
  <>
    <p>
      Oats have a reputation as bland diet food. Made well, they are one of the easiest breakfasts to get
      right: filling, quick, and gentle on the stomach in the morning.
    </p>
    <h2>What oats bring</h2>
    <ul>
      <li>
        <strong>Slow, steady energy.</strong> Oats are a whole grain with soluble fibre, which digests slowly,
        so you stay full until lunch rather than snacking at 11.
      </li>
      <li>
        <strong>A base for protein.</strong> On their own, oats have a moderate amount of protein (about 13 g
        per 100 g dry, approximate). Cooked in milk and topped with nuts, seeds or peanut butter, a single
        bowl reaches 15–17 g.
      </li>
      <li>
        <strong>Easy to vary.</strong> Sweet with banana and honey, warming with apple and cinnamon, or
        chocolatey with cocoa and peanut butter.
      </li>
    </ul>
    <h2>Hot or overnight?</h2>
    <p>
      Our <strong>hot oats</strong> are cooked fresh in milk when you order – comforting on a cool morning.
      Our <strong>overnight oats</strong> soak in milk and curd for hours and are served chilled. The soak
      makes them soft and creamy without cooking, and the curd adds a little tang and extra protein.
    </p>
    <DishTable
      menu={menu}
      ids={["o-classic", "o-pb-choco", "o-on-choco-pb", "o-on-dry-fruits", "o-on-cold-coffee"]}
      extra={{ head: "Type", cell: (d) => (d.category === "oats-overnight" ? "Overnight" : "Hot") }}
    />
  </>
);

const ReadingTheMenu = ({ menu }: { menu: Menu }) => (
  <>
    <p>
      Every dish on our menu shows its protein and calories, so you can choose with your goal in mind, not
      guesswork. Here is what each part means.
    </p>
    <h2>The numbers</h2>
    <ul>
      <li>
        <strong>Protein (g)</strong> is for the whole portion you are served, not per 100 g.
      </li>
      <li>
        <strong>Calories (kcal)</strong> are for the same portion.
      </li>
      <li>
        Both are worked out from the recipe and ingredient amounts, so treat them as close estimates. Add-ons
        (like extra paneer) change them.
      </li>
    </ul>
    <h2>The labels and filters</h2>
    <ul>
      <li>
        <strong>{HIGH_PROTEIN_MIN_G} g+ protein</strong> – dishes with{" "}
        <strong>{HIGH_PROTEIN_MIN_G} g of protein or more</strong> per portion.
      </li>
      <li>
        <strong>Under {LIGHT_MAX_KCAL} kcal</strong> – dishes with fewer than {LIGHT_MAX_KCAL} calories.
      </li>
      <li>
        <strong>Bestseller</strong> – the dishes our guests order most.
      </li>
      <li>
        <strong>Veg mark</strong> – everything we serve is 100% vegetarian.
      </li>
    </ul>
    <p>On the QR menu you can tap these filters to show only matching dishes.</p>
    <h2>Ordering for your goal</h2>
    <Table
      head={["If you want…", "Look for", "For example"]}
      rows={[
        ["A filling meal after the gym", "20 g+ protein", "s-soya-paneer"],
        ["A light evening snack", `Under ${LIGHT_MAX_KCAL} kcal`, "c-chana"],
        ["The most protein for fewer calories", "Both filters together", "c-edamame"],
        ["A quick breakfast", "Oats", "o-classic"],
      ]
        .filter(([, , id]) => menu.has(id))
        .map(([want, look, id]) => [
          want,
          look,
          <>
            <DishLink menu={menu} id={id} /> – <Nums menu={menu} id={id} />
          </>,
        ])}
    />
  </>
);

export const ARTICLE_BODIES: Record<string, (props: { menu: Menu }) => ReactNode> = {
  "how-much-protein-do-you-need": HowMuchProtein,
  "vegetarian-proteins-we-cook-with": VegProteins,
  "ingredient-spotlight-sprouts": Sprouts,
  "oats-hot-bowls-and-overnight-jars": Oats,
  "how-to-read-our-menu": ReadingTheMenu,
};
