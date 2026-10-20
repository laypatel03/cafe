import type { MetadataRoute } from "next";
import { connection } from "next/server";
import { ARTICLES } from "@/lib/articles";
import { getCafeDetails } from "@/lib/data/menu";
import { SITE_URL } from "@/lib/site-url";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // per request: the blog is listed only while it's switched on (Settings → Editing)
  await connection();
  const { blogEnabled } = await getCafeDetails();
  const url = (path: string) => new URL(path, SITE_URL).toString();
  return [
    { url: url("/"), changeFrequency: "weekly", priority: 1 },
    { url: url("/menu"), changeFrequency: "daily", priority: 0.9 },
    ...(blogEnabled
      ? [
          { url: url("/blog"), changeFrequency: "weekly" as const, priority: 0.7 },
          ...ARTICLES.map((a) => ({
            url: url(`/blog/${a.slug}`),
            lastModified: a.published,
            changeFrequency: "monthly" as const,
            priority: 0.6,
          })),
        ]
      : []),
    { url: url("/privacy"), changeFrequency: "yearly", priority: 0.2 },
  ];
}
