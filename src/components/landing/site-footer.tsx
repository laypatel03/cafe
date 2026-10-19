import Link from "next/link";
import { BrandName, LogoIcon } from "@/components/brand/logo";
import type { CafeDetails } from "@/lib/data/menu";

export function SiteFooter({ cafe }: { cafe: CafeDetails }) {
  return (
    <footer className="border-t border-white/10 bg-[#0b3213] text-white dark:bg-[#06180a]">
      <div className="mx-auto flex max-w-7xl flex-col gap-8 px-4 py-12 sm:px-6 md:flex-row md:items-end md:justify-between lg:px-8">
        <div>
          <span className="inline-flex items-center gap-3">
            <LogoIcon className="h-10" alt="Healthy Hunger" />
            <BrandName className="h-9" />
          </span>
          <p className="mt-2 tagline text-xs font-extrabold tracking-widest text-[#ffb900] uppercase">
            — Eat well, live well —
          </p>
          <p className="mt-2 max-w-sm text-xs leading-relaxed text-white/70">
            100% vegetarian café engineered for clean athletic macros, cold-pressed purity, and wholesome
            satiety.
          </p>
        </div>
        <nav className="flex flex-wrap gap-x-6 gap-y-2.5 text-sm font-bold text-white/85">
          <Link href="/menu" className="transition-colors hover:text-[#ffb900]">
            Menu
          </Link>
          {cafe.instagram && (
            <a
              href={`https://instagram.com/${cafe.instagram}`}
              target="_blank"
              rel="noreferrer"
              className="transition-colors hover:text-[#ffb900]"
            >
              Instagram
            </a>
          )}
          {cafe.whatsapp && (
            <a
              href={`https://wa.me/${cafe.whatsapp}`}
              target="_blank"
              rel="noreferrer"
              className="transition-colors hover:text-[#ffb900]"
            >
              WhatsApp
            </a>
          )}
          {cafe.blogEnabled && (
            <Link href="/blog" className="transition-colors hover:text-[#ffb900]">
              Blog
            </Link>
          )}
          <Link href="/privacy" className="transition-colors hover:text-[#ffb900]">
            Privacy
          </Link>
        </nav>
      </div>
      <div className="border-t border-white/10 py-5 text-center text-xs font-medium text-white/60">
        © {new Date().getFullYear()} {cafe.name || "Healthy Hunger"}. 100% Vegetarian Café · All rights
        reserved.
      </div>
    </footer>
  );
}
