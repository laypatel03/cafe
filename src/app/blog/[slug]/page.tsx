import { ChevronLeft } from "lucide-react";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { ArticleCard, TryDishCard } from "@/components/blog/article-card";
import { ARTICLE_BODIES } from "@/components/blog/article-bodies";
import { BlogPreviewBanner } from "@/components/blog/preview-banner";
import { SiteFooter } from "@/components/landing/site-footer";
import { SiteHeader } from "@/components/landing/site-header";
import { ARTICLES, articleDate, getArticle } from "@/lib/articles";
import { blogAccess } from "@/lib/data/blog-access";
import { getCafeDetails, getPublicMenu } from "@/lib/data/menu";

export async function generateMetadata({ params }: PageProps<"/blog/[slug]">): Promise<Metadata> {
  const a = getArticle((await params).slug);
  const access = await blogAccess();
  if (!a || access === "hidden") return {};
  return {
    title: a.title,
    ...(access === "preview" && { robots: { index: false } }),
    description: a.description,
    alternates: { canonical: `/blog/${a.slug}` },
    openGraph: {
      type: "article",
      title: a.title,
      description: a.description,
      publishedTime: a.published,
      images: [{ url: a.cover.src, width: 1600, height: 1000, alt: a.cover.alt }],
    },
  };
}

export default async function ArticlePage({ params }: PageProps<"/blog/[slug]">) {
  const { slug } = await params;
  const a = getArticle(slug);
  const Body = ARTICLE_BODIES[slug];
  if (!a || !Body) notFound();

  await connection();
  const access = await blogAccess();
  if (access === "hidden") notFound();
  const [{ items }, cafe] = await Promise.all([getPublicMenu(), getCafeDetails()]);
  const menu = new Map(items.map((m) => [m.id, m]));
  const tryDishes = a.tryIt.dishIds.map((id) => menu.get(id)).filter((d) => !!d);
  const more = ARTICLES.filter((x) => x.slug !== a.slug).slice(0, 3);

  return (
    <>
      <SiteHeader showBlog />
      <main className="pt-24 pb-24">
        <article className="mx-auto max-w-3xl px-5">
          {access === "preview" && <BlogPreviewBanner />}
          <Link
            href="/blog"
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <ChevronLeft className="size-4" aria-hidden /> All articles
          </Link>
          <h1 className="mt-4 text-4xl leading-tight font-bold text-balance md:text-5xl">{a.title}</h1>
          <p className="mt-3 text-lg text-muted-foreground">{a.description}</p>
          <p className="mt-3 text-sm text-muted-foreground">
            {articleDate(a.published)} · {a.readMinutes} min read
          </p>

          <figure className="mt-8">
            <div className="relative aspect-[16/10] overflow-hidden rounded-3xl bg-muted">
              <Image
                src={a.cover.src}
                alt={a.cover.alt}
                fill
                priority
                sizes="(min-width: 768px) 720px, 100vw"
                className="object-cover"
              />
            </div>
            <figcaption className="mt-2 text-xs text-muted-foreground">
              Photo:{" "}
              <a
                href={a.cover.creditUrl}
                target="_blank"
                rel="noreferrer"
                className="underline-offset-2 hover:underline"
              >
                {a.cover.credit} on Unsplash
              </a>
            </figcaption>
          </figure>

          <div className="mt-10 space-y-5 text-[17px] leading-relaxed [&_h2]:pt-5 [&_h2]:text-2xl [&_h2]:font-bold [&_li]:ml-5 [&_li]:list-disc [&_li]:pl-1 [&_strong]:font-semibold [&_ul]:space-y-2">
            <Body menu={menu} />
          </div>

          {tryDishes.length > 0 && (
            <section aria-labelledby="try-h" className="mt-12 rounded-3xl bg-accent/60 p-5 md:p-7">
              <h2 id="try-h" className="text-2xl font-bold">
                Try it
              </h2>
              <p className="mt-2 text-muted-foreground">{a.tryIt.text}</p>
              <ul className="mt-5 grid gap-3">
                {tryDishes.map((d) => (
                  // min-w-0: a grid item otherwise grows to fit a long dish name
                  <li key={d.id} className="min-w-0">
                    <TryDishCard item={d} />
                  </li>
                ))}
              </ul>
            </section>
          )}
        </article>

        <section aria-labelledby="more-h" className="mx-auto mt-20 max-w-6xl px-5">
          <h2 id="more-h" className="text-2xl font-bold">
            More from our kitchen
          </h2>
          <ul className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {more.map((x) => (
              <li key={x.slug}>
                <ArticleCard article={x} />
              </li>
            ))}
          </ul>
        </section>
      </main>
      <SiteFooter cafe={cafe} />
    </>
  );
}
