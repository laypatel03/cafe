"use client";

import { ShoppingBag, Utensils } from "lucide-react";
import { motion, useMotionValueEvent, useScroll } from "motion/react";
import Link from "next/link";
import { useState } from "react";
import { LogoIcon } from "@/components/brand/logo";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { useCart } from "@/lib/cart-store";
import { cn } from "@/lib/utils";

/** `showBlog`: the Blog link, only while the blog is switched on (or on the blog pages themselves). */
export function SiteHeader({ showBlog = false }: { showBlog?: boolean }) {
  const { scrollY } = useScroll();
  const [scrolled, setScrolled] = useState(false);
  useMotionValueEvent(scrollY, "change", (y) => setScrolled(y > 20));

  const count = useCart((s) => s.lines.reduce((n, l) => n + l.quantity, 0));
  const kind = useCart((s) => s.kind);

  return (
    <motion.header
      initial={{ y: -24, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className={cn(
        "fixed top-0 left-0 z-50 w-full transition-all duration-300",
        scrolled
          ? "border-b border-[#d8e8dc] bg-white/95 shadow-[0_2px_14px_rgba(0,87,19,0.06)] backdrop-blur-md dark:border-[#24392b] dark:bg-[#0e1a12]/95"
          : "border-b border-transparent bg-white/80 backdrop-blur-sm dark:bg-[#0e1a12]/80",
      )}
    >
      <div className="mx-auto flex h-20 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        {/* Brand Logo & Tagline */}
        <div className="flex items-center gap-8">
          <Link href="/" className="group flex items-center gap-3" aria-label="Healthy Hunger – Home">
            <LogoIcon
              className="h-10 w-auto transition-transform duration-200 select-none group-hover:scale-105 sm:h-11"
              priority
            />
            <div className="hidden flex-col sm:flex">
              <span className="text-xl leading-none font-extrabold tracking-tight text-[#0f1f15] transition-colors group-hover:text-[#055c1b] dark:text-[#eef5ef] dark:group-hover:text-[#98f992]">
                Healthy Hunger
              </span>
              <span className="mt-1 text-[11px] font-bold tracking-wider text-[#055c1b] uppercase dark:text-[#98f992]">
                100% Vegetarian Cafe
              </span>
            </div>
          </Link>

          {/* Desktop Nav Links */}
          <nav className="hidden items-center gap-1.5 rounded-full border border-[#d2e8d8] bg-[#e7f4eb] p-1.5 md:flex dark:border-[#24392b] dark:bg-[#16251b]">
            <Link
              href="/menu"
              className="rounded-full px-5 py-2 text-sm font-bold text-[#273a2f] transition-colors hover:bg-white/80 hover:text-[#055c1b] dark:text-[#cde5d3] dark:hover:bg-[#1f3325] dark:hover:text-[#98f992]"
            >
              Menu
            </Link>
            {/* "/#…" so the links also work from the blog pages */}
            <Link
              href="/#promise"
              className="rounded-full px-5 py-2 text-sm font-bold text-[#273a2f] transition-colors hover:bg-white/80 hover:text-[#055c1b] dark:text-[#cde5d3] dark:hover:bg-[#1f3325] dark:hover:text-[#98f992]"
            >
              Our Promise
            </Link>
            {showBlog && (
              <Link
                href="/blog"
                className="rounded-full px-5 py-2 text-sm font-bold text-[#273a2f] transition-colors hover:bg-white/80 hover:text-[#055c1b] dark:text-[#cde5d3] dark:hover:bg-[#1f3325] dark:hover:text-[#98f992]"
              >
                Blog
              </Link>
            )}
            <Link
              href="/#visit"
              className="rounded-full px-5 py-2 text-sm font-bold text-[#273a2f] transition-colors hover:bg-white/80 hover:text-[#055c1b] dark:text-[#cde5d3] dark:hover:bg-[#1f3325] dark:hover:text-[#98f992]"
            >
              Visit Us
            </Link>
          </nav>
        </div>

        {/* Right Action Tools */}
        <div className="flex items-center gap-2.5 sm:gap-3">
          {/* Table Pill */}
          <div className="hidden items-center gap-1.5 rounded-full border border-[#cbe2d2] bg-white px-3.5 py-1.5 text-[#0f1f15] shadow-xs sm:flex dark:border-[#24392b] dark:bg-[#16251b] dark:text-[#eef5ef]">
            <Utensils className="size-4 text-[#055c1b] dark:text-[#98f992]" aria-hidden />
            <span className="text-xs font-bold tracking-tight">
              {kind === "PARCEL" ? "Takeaway" : "Dine-in"}
            </span>
          </div>

          {/* Cart Button */}
          <Link
            href="/menu#sticky-cart"
            className="relative flex items-center gap-2 rounded-full bg-[#ea580c] px-4 py-2 text-sm font-bold text-white shadow-sm transition-all hover:bg-[#c2410c] hover:shadow active:scale-95"
            aria-label={`Cart with ${count} items`}
          >
            <ShoppingBag className="size-4.5 text-white" aria-hidden />
            <span className="hidden font-bold text-white sm:inline">Cart</span>
            {count > 0 && (
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white text-xs font-black text-[#ea580c] shadow-xs">
                {count}
              </span>
            )}
          </Link>

          {/* Theme Toggle */}
          <ThemeToggle />
        </div>
      </div>
    </motion.header>
  );
}
