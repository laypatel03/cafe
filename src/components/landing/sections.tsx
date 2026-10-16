import { ArrowRight, AtSign, Clock, Dumbbell, Leaf, MapPin, MessageCircle, Phone, Sun } from "lucide-react";
import Link from "next/link";
import { NutritionLabel } from "@/components/brand/nutrition-label";
import { Reveal } from "@/components/brand/reveal";
import { TiltCard } from "@/components/brand/tilt-card";
import { VegMark } from "@/components/brand/veg-mark";
import { ArticleCard } from "@/components/blog/article-card";
import { Button } from "@/components/ui/button";
import type { Article } from "@/lib/articles";
import type { CafeDetails } from "@/lib/data/menu";
import { formatINR } from "@/lib/format";
import type { MenuItem } from "@/lib/menu-types";

function SectionHeading({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <div className="mb-10">
      <p className="tagline text-xs text-hh-green dark:text-hh-green-light">{eyebrow}</p>
      <h2 className="mt-2 text-4xl font-bold text-balance md:text-5xl">{title}</h2>
    </div>
  );
}

export function TodaysPick({ item }: { item: MenuItem }) {
  return (
    <section className="mx-auto max-w-6xl px-5 py-24">
      <Reveal>
        <TiltCard
          max={5}
          className="grid gap-8 overflow-hidden rounded-[2rem] border border-border bg-card p-6 shadow-[0_30px_60px_-30px_rgba(14,85,24,0.35)] md:grid-cols-[1.4fr_1fr] md:p-10"
        >
          <div className="translate-z-10">
            <p className="tagline text-xs text-hh-green dark:text-hh-green-light">Today&apos;s pick</p>
            <h2 className="mt-2 flex items-center gap-3 text-4xl font-bold md:text-5xl">
              <VegMark className="size-5" /> {item.name}
            </h2>
            <p className="mt-4 max-w-lg text-lg text-muted-foreground">{item.description}</p>
            <ul className="mt-5 flex flex-wrap gap-2">
              {[...new Set(item.ingredients)].map((ing) => (
                <li
                  key={ing}
                  className="rounded-full bg-secondary px-3 py-1 text-sm text-secondary-foreground"
                >
                  {ing}
                </li>
              ))}
            </ul>
            <div className="mt-8 flex items-center gap-4">
              <span className="tabular text-3xl font-semibold text-brand-text">{formatINR(item.price)}</span>
              <Button
                asChild
                size="lg"
                className="h-11 rounded-full bg-cta px-5 font-semibold text-cta-foreground hover:bg-hh-orange-light"
              >
                <Link href={`/menu?item=${item.id}`}>
                  Order this <ArrowRight data-icon="inline-end" />
                </Link>
              </Button>
            </div>
          </div>
          <div className="flex items-center md:justify-end">
            <NutritionLabel
              protein={item.protein}
              kcal={item.kcal}
              className="w-full max-w-60 translate-z-20 bg-card"
            />
          </div>
        </TiltCard>
      </Reveal>
    </section>
  );
}

const promises = [
  {
    icon: Leaf,
    title: "100% vegetarian",
    body: "No meat, no eggs, ever. One kitchen, one promise.",
  },
  {
    icon: Dumbbell,
    title: "Protein from real food",
    body: "Paneer, yoghurt, chana, sprouts, nuts – not just powder.",
  },
  {
    icon: Sun,
    title: "Fresh daily",
    body: "Bowls and salads are made every morning in small batches.",
  },
];

export function OurPromise() {
  return (
    <section id="promise" className="bg-surface text-surface-foreground">
      <div className="mx-auto max-w-6xl px-5 py-24">
        <div className="mb-10">
          <p className="tagline text-xs text-surface-accent">Our promise</p>
          <h2 className="mt-2 text-4xl font-bold text-balance md:text-5xl">
            Eat well, without the guesswork.
          </h2>
        </div>
        <div className="grid gap-5 md:grid-cols-3">
          {promises.map((p, i) => (
            <Reveal key={p.title} delay={i * 0.08}>
              <TiltCard className="h-full rounded-3xl border border-white/15 bg-white/[0.06] p-7 backdrop-blur-sm">
                <div className="mb-6 inline-flex size-14 translate-z-12 items-center justify-center rounded-2xl bg-gradient-to-br from-hh-orange-light to-hh-orange shadow-lg shadow-black/25">
                  <p.icon className="size-7 text-hh-ink" aria-hidden />
                </div>
                <h3 className="text-2xl font-semibold">{p.title}</h3>
                <p className="mt-2 text-white/80">{p.body}</p>
              </TiltCard>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

export function Bestsellers({ items }: { items: MenuItem[] }) {
  return (
    <section className="py-24">
      <div className="mx-auto max-w-6xl px-5">
        <SectionHeading eyebrow="Bestsellers" title="What everyone orders." />
      </div>
      <div className="mx-auto flex max-w-6xl snap-x snap-mandatory [scrollbar-width:none] gap-5 overflow-x-auto px-5 pb-6">
        {items.map((item, i) => (
          <Reveal
            key={item.id}
            delay={i * 0.06}
            className="w-[78%] shrink-0 snap-start sm:w-[46%] lg:w-[31%]"
          >
            <TiltCard className="flex h-full flex-col rounded-3xl border border-border bg-card p-6 shadow-[0_20px_40px_-28px_rgba(14,85,24,0.4)]">
              <div className="flex items-center gap-2">
                <VegMark />
                <span className="rounded-full bg-accent px-2 py-0.5 text-xs font-semibold text-brand-text">
                  Bestseller
                </span>
              </div>
              <h3 className="mt-4 text-2xl font-semibold">{item.name}</h3>
              <p className="mt-2 flex-1 text-sm text-muted-foreground">{item.description}</p>
              <div className="mt-5 flex items-end justify-between tabular">
                <span className="text-sm text-muted-foreground">
                  {item.protein} g protein · {item.kcal} kcal
                </span>
                <span className="text-xl font-semibold text-brand-text">{formatINR(item.price)}</span>
              </div>
            </TiltCard>
          </Reveal>
        ))}
      </div>
      <div className="mx-auto mt-4 max-w-6xl px-5">
        <Button asChild variant="outline" className="h-11 rounded-full px-5">
          <Link href="/menu">
            See the full menu <ArrowRight data-icon="inline-end" />
          </Link>
        </Button>
      </div>
    </section>
  );
}

export function FromOurKitchen({ articles }: { articles: Article[] }) {
  return (
    <section className="mx-auto max-w-6xl px-5 pb-24">
      <SectionHeading eyebrow="From our kitchen" title="Eat well, knowing why." />
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {articles.map((a, i) => (
          <Reveal key={a.slug} delay={i * 0.06}>
            <ArticleCard article={a} />
          </Reveal>
        ))}
      </div>
      <Button asChild variant="outline" className="mt-8 h-11 rounded-full px-5">
        <Link href="/blog">
          All articles <ArrowRight data-icon="inline-end" />
        </Link>
      </Button>
    </section>
  );
}

export function VisitUs({ cafe }: { cafe: CafeDetails }) {
  const links = [
    cafe.phone && { icon: Phone, label: cafe.phone, href: `tel:${cafe.phone.replace(/\s/g, "")}` },
    cafe.whatsapp && { icon: MessageCircle, label: "WhatsApp us", href: `https://wa.me/${cafe.whatsapp}` },
    cafe.instagram && {
      icon: AtSign,
      label: `@${cafe.instagram}`,
      href: `https://instagram.com/${cafe.instagram}`,
    },
  ].filter((l) => !!l);
  return (
    <section id="visit" className="mx-auto max-w-6xl px-5 pb-24">
      <SectionHeading eyebrow="Visit us" title="Come hungry." />
      <div className="grid gap-5 md:grid-cols-2">
        <Reveal>
          <a
            href={cafe.mapUrl}
            target="_blank"
            rel="noreferrer"
            className="group flex h-full flex-col justify-between rounded-3xl bg-surface p-7 text-surface-foreground transition-transform hover:-translate-y-1"
          >
            <MapPin className="size-8 text-surface-accent" aria-hidden />
            <div className="mt-10">
              <p className="text-2xl font-semibold">{cafe.address}</p>
              <p className="mt-2 inline-flex items-center gap-1 text-white/80 group-hover:text-white">
                Open in Google Maps <ArrowRight className="size-4" aria-hidden />
              </p>
            </div>
          </a>
        </Reveal>
        <Reveal delay={0.08}>
          <div className="h-full rounded-3xl border border-border bg-card p-7">
            <h3 className="flex items-center gap-2 text-lg font-semibold">
              <Clock className="size-5 text-hh-green dark:text-hh-green-light" aria-hidden /> Hours
            </h3>
            <dl className="mt-3 space-y-1">
              {cafe.hours.map((h) => (
                <div
                  key={h.days}
                  className="flex justify-between gap-4 border-b border-border py-2 last:border-0"
                >
                  <dt>{h.days}</dt>
                  <dd className="tabular text-muted-foreground">{h.time}</dd>
                </div>
              ))}
            </dl>
            <ul className="mt-6 flex flex-wrap gap-2">
              {links.map((l) => (
                <li key={l.href}>
                  <a
                    href={l.href}
                    className="inline-flex items-center gap-2 rounded-full bg-secondary px-4 py-2 text-sm text-secondary-foreground hover:bg-accent"
                  >
                    <l.icon className="size-4" aria-hidden /> {l.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
