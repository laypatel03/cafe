import Link from "next/link";
import { BrandName, LogoIcon } from "@/components/brand/logo";
import type { CafeDetails } from "@/lib/data/menu";

export function SiteFooter({ cafe }: { cafe: CafeDetails }) {
  return (
    <footer className="bg-surface text-surface-foreground">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-5 py-10 md:flex-row md:items-end md:justify-between">
        <div>
          <span className="inline-flex items-center gap-3 rounded-2xl bg-white px-4 py-3">
            <LogoIcon className="h-10" alt="" />
            <BrandName className="h-9" />
          </span>
          <p className="mt-2 tagline text-[11px] text-white/75">Eat well, live well</p>
        </div>
        <nav className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-white/85">
          <Link href="/menu" className="hover:text-white">
            Menu
          </Link>
          <a href={`https://instagram.com/${cafe.instagram}`} className="hover:text-white">
            Instagram
          </a>
          <a href={`https://wa.me/${cafe.whatsapp}`} className="hover:text-white">
            WhatsApp
          </a>
          <Link href="/privacy" className="hover:text-white">
            Privacy
          </Link>
        </nav>
      </div>
      <div className="border-t border-white/10 py-4 text-center text-xs text-white/70">
        © {new Date().getFullYear()} {cafe.name}. All items are vegetarian.
      </div>
    </footer>
  );
}
