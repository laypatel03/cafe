import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { ArticleCard } from "@/components/blog/article-card";
import { BlogPreviewBanner } from "@/components/blog/preview-banner";
import { SiteFooter } from "@/components/landing/site-footer";
import { SiteHeader } from "@/components/landing/site-header";
import { ARTICLES } from "@/lib/articles";
import { blogAccess } from "@/lib/data/blog-access";
import { getCafeDetails } from "@/lib/data/menu";

export const metadata: Metadata = {
  title: "Blog",
  description:
    "Short reads on vegetarian protein, the ingredients we cook with, and how to eat well at Healthy Hunger.",
  alternates: { canonical: "/blog" },
};

export default async function BlogPage() {
  // per request like the home page, so builds don't need the database for the footer
  await connection();
  const access = await blogAccess();
  if (access === "hidden") notFound();
  const cafe = await getCafeDetails();
  const articles = [...ARTICLES].sort((a, b) => b.published.localeCompare(a.published));
  return (
    <>
      <SiteHeader showBlog />
      <main className="mx-auto max-w-6xl px-5 pt-28 pb-24">
        {access === "preview" && <BlogPreviewBanner />}
        <p className="tagline text-xs text-hh-green dark:text-hh-green-light">From our kitchen</p>
        <h1 className="mt-2 text-4xl font-bold text-balance md:text-5xl">Eat well, knowing why.</h1>
        <p className="mt-4 max-w-2xl text-lg text-muted-foreground">
          Short reads on vegetarian protein, the ingredients we cook with, and how to order for your goal.
        </p>
        <ul className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {articles.map((a, i) => (
            <li key={a.slug}>
              <ArticleCard article={a} priority={i < 3} />
            </li>
          ))}
        </ul>
      </main>
      <SiteFooter cafe={cafe} />
    </>
  );
}
