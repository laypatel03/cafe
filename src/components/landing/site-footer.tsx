import Link from "next/link";
import { BrandName, LogoIcon } from "@/components/brand/logo";
import type { CafeDetails } from "@/lib/data/menu";

export function SiteFooter({ cafe }: { cafe: CafeDetails }) {
  return (
    <footer className="bg-[#0b3213] dark:bg-[#06180a] text-white border-t border-white/10">
      <div className="mx-auto flex max-w-7xl flex-col gap-8 px-4 sm:px-6 lg:px-8 py-12 md:flex-row md:items-end md:justify-between">
        <div>
          <span className="inline-flex items-center gap-3">
            <LogoIcon className="h-10" alt="Healthy Hunger" />
            <BrandName className="h-9" />
          </span>
          <p className="mt-2 tagline text-xs text-[#ffb900] tracking-widest uppercase font-extrabold">
            — Eat well, live well —
          </p>
          <p className="mt-2 text-xs text-white/70 max-w-sm leading-relaxed">
            100% vegetarian café engineered for clean athletic macros, cold-pressed purity, and wholesome satiety.
          </p>
        </div>
        <nav className="flex flex-wrap gap-x-6 gap-y-2.5 text-sm font-bold text-white/85">
          <Link href="/menu" className="hover:text-[#ffb900] transition-colors">
            Menu
          </Link>
          {cafe.instagram && (
            <a
              href={`https://instagram.com/${cafe.instagram}`}
              target="_blank"
              rel="noreferrer"
              className="hover:text-[#ffb900] transition-colors"
            >
              Instagram
            </a>
          )}
          {cafe.whatsapp && (
            <a
              href={`https://wa.me/${cafe.whatsapp}`}
              target="_blank"
              rel="noreferrer"
              className="hover:text-[#ffb900] transition-colors"
            >
              WhatsApp
            </a>
          )}
          <Link href="/privacy" className="hover:text-[#ffb900] transition-colors">
            Privacy
          </Link>
        </nav>
      </div>
      <div className="border-t border-white/10 py-5 text-center text-xs font-medium text-white/60">
        © {new Date().getFullYear()} {cafe.name || "Healthy Hunger"}. 100% Vegetarian Café · All rights reserved.
      </div>
    </footer>
  );
}
