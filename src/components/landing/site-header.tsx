"use client";

import { motion, useMotionValueEvent, useScroll } from "motion/react";
import Link from "next/link";
import { useState } from "react";
import { LogoIcon, LogoWordmark } from "@/components/brand/logo";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** `showBlog`: the Blog link, only while the blog is switched on (or on the blog pages themselves). */
export function SiteHeader({ showBlog = false }: { showBlog?: boolean }) {
  const { scrollY } = useScroll();
  const [solid, setSolid] = useState(false);
  useMotionValueEvent(scrollY, "change", (y) => setSolid(y > 40));

  return (
    <motion.header
      initial={{ y: -24, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="fixed inset-x-0 top-3 z-50 px-3"
    >
      <div
        className={cn(
          "mx-auto flex h-14 max-w-6xl items-center justify-between rounded-full border px-3 pl-4 transition-all duration-300",
          solid
            ? "border-border/70 bg-background/80 shadow-lg shadow-hh-green-deep/5 backdrop-blur-xl"
            : "border-transparent bg-transparent",
        )}
      >
        <Link href="/" className="flex items-center gap-2" aria-label="Healthy Hunger – home">
          <LogoIcon className="h-8" alt="" />
          <LogoWordmark className={cn("hidden h-7 transition-opacity sm:block", !solid && "sm:opacity-0")} />
        </Link>
        <nav className="flex items-center gap-1">
          {/* "/#…" so the links also work from the blog pages */}
          <Link
            href="/#promise"
            className="hidden rounded-full px-3 py-2 text-sm font-medium hover:bg-muted sm:block"
          >
            Our promise
          </Link>
          {showBlog && (
            <Link href="/blog" className="rounded-full px-3 py-2 text-sm font-medium hover:bg-muted">
              Blog
            </Link>
          )}
          <Link
            href="/#visit"
            className="hidden rounded-full px-3 py-2 text-sm font-medium hover:bg-muted sm:block"
          >
            Visit
          </Link>
          <ThemeToggle />
          <Button asChild className="h-9 rounded-full px-4 font-semibold">
            <Link href="/menu">Menu</Link>
          </Button>
        </nav>
      </div>
    </motion.header>
  );
}
