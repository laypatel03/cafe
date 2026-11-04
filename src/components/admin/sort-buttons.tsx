import { ArrowDownUp } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

/** One-tap list order above a list: plain links (the sort lives in the URL), the current one filled. */
export function SortButtons({
  options,
  current,
}: {
  options: { key: string; label: string; href: string }[];
  current: string;
}) {
  return (
    <nav aria-label="Sort" className="flex flex-wrap items-center gap-1.5">
      <span className="flex items-center gap-1 text-sm text-muted-foreground">
        <ArrowDownUp className="size-4" aria-hidden /> Sort
      </span>
      {options.map((o) => (
        <Button
          key={o.key}
          asChild
          size="sm"
          variant={o.key === current ? "default" : "outline"}
          className="h-8 rounded-full"
        >
          <Link href={o.href} aria-current={o.key === current ? "true" : undefined} scroll={false}>
            {o.label}
          </Link>
        </Button>
      ))}
    </nav>
  );
}
