"use client";

import { ShoppingBag, Utensils, User } from "lucide-react";
import { motion, useMotionValueEvent, useScroll } from "motion/react";
import Link from "next/link";
import { useState } from "react";
import { LogoIcon } from "@/components/brand/logo";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { useCart } from "@/lib/cart-store";
import { cn } from "@/lib/utils";

export function SiteHeader() {
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
        "fixed top-0 left-0 w-full z-50 transition-all duration-300",
        scrolled
          ? "bg-white/95 dark:bg-[#0e1a12]/95 backdrop-blur-md border-b border-[#d8e8dc] dark:border-[#24392b] shadow-[0_2px_14px_rgba(0,87,19,0.06)]"
          : "bg-white/80 dark:bg-[#0e1a12]/80 backdrop-blur-sm border-b border-transparent"
      )}
    >
      <div className="h-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-4">
        {/* Brand Logo & Tagline */}
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center gap-3 group" aria-label="Healthy Hunger – Home">
            <LogoIcon className="h-11 w-auto select-none group-hover:scale-105 transition-transform duration-200" priority />
            <div className="flex flex-col">
              <span className="text-xl font-extrabold text-[#0f1f15] dark:text-[#eef5ef] tracking-tight leading-none group-hover:text-[#055c1b] dark:group-hover:text-[#98f992] transition-colors">
                Healthy Hunger
              </span>
              <span className="text-[11px] font-bold text-[#055c1b] dark:text-[#98f992] uppercase tracking-wider mt-1">
                100% Vegetarian Cafe
              </span>
            </div>
          </Link>

          {/* Desktop Nav Links */}
          <nav className="hidden md:flex items-center gap-1.5 bg-[#e7f4eb] dark:bg-[#16251b] p-1.5 rounded-full border border-[#d2e8d8] dark:border-[#24392b]">
            <Link
              href="/menu"
              className="px-5 py-2 rounded-full font-bold text-sm text-[#273a2f] dark:text-[#cde5d3] hover:text-[#055c1b] dark:hover:text-[#98f992] hover:bg-white/80 dark:hover:bg-[#1f3325] transition-colors"
            >
              Menu
            </Link>
            <a
              href="#promise"
              className="px-5 py-2 rounded-full font-bold text-sm text-[#273a2f] dark:text-[#cde5d3] hover:text-[#055c1b] dark:hover:text-[#98f992] hover:bg-white/80 dark:hover:bg-[#1f3325] transition-colors"
            >
              Our Promise
            </a>
            <a
              href="#visit"
              className="px-5 py-2 rounded-full font-bold text-sm text-[#273a2f] dark:text-[#cde5d3] hover:text-[#055c1b] dark:hover:text-[#98f992] hover:bg-white/80 dark:hover:bg-[#1f3325] transition-colors"
            >
              Visit Us
            </a>
          </nav>
        </div>

        {/* Right Action Tools */}
        <div className="flex items-center gap-2.5 sm:gap-3">
          {/* Table Pill */}
          <div className="hidden sm:flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white dark:bg-[#16251b] border border-[#cbe2d2] dark:border-[#24392b] text-[#0f1f15] dark:text-[#eef5ef] shadow-xs">
            <Utensils className="size-4 text-[#055c1b] dark:text-[#98f992]" aria-hidden />
            <span className="text-xs font-bold tracking-tight">
              {kind === "PARCEL" ? "Takeaway" : "Dine-in"}
            </span>
          </div>

          {/* Cart Button */}
          <Link
            href="/menu#sticky-cart"
            className="relative flex items-center gap-2 px-4 py-2 rounded-full bg-[#ea580c] hover:bg-[#c2410c] text-white font-bold text-sm shadow-sm hover:shadow transition-all active:scale-95"
            aria-label={`Cart with ${count} items`}
          >
            <ShoppingBag className="size-4.5 text-white" aria-hidden />
            <span className="hidden sm:inline text-white font-bold">Cart</span>
            {count > 0 && (
              <span className="w-5 h-5 rounded-full bg-white text-[#ea580c] text-xs flex items-center justify-center font-black shadow-xs">
                {count}
              </span>
            )}
          </Link>

          {/* Theme Toggle */}
          <ThemeToggle />

          {/* Admin shortcut */}
          <Link
            href="/admin"
            className="w-9 h-9 rounded-full bg-[#055c1b] dark:bg-[#0c6b25] hover:bg-[#0e5518] text-white flex items-center justify-center shadow-xs transition-colors"
            title="Staff Dashboard"
            aria-label="Staff Dashboard"
          >
            <User className="size-4 text-white" aria-hidden />
          </Link>
        </div>
      </div>
    </motion.header>
  );
}
