import { ArrowUpRight, MapPin, Phone } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { LogoIcon } from "@/components/brand/logo";
import type { CafeDetails } from "@/lib/data/menu";

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L0 24l6.335-1.662c1.746.953 3.71 1.455 5.711 1.456h.005c6.554 0 11.89-5.335 11.893-11.893a11.82 11.82 0 00-3.48-8.413z" />
    </svg>
  );
}

function InstagramIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
    </svg>
  );
}

export function SiteFooter({ cafe }: { cafe: CafeDetails }) {
  const address =
    cafe.address && cafe.address !== "Address to be confirmed"
      ? cafe.address
      : "Chocolate Heaven Building Chikli, 301–310, Bilimora – Chikhli Rd, opp Olive Hospital Chikhli, Nandarkha, Bilimora, Gujarat 396325";

  return (
    <footer id="footer" className="border-t border-white/10 bg-[#07240d] text-white dark:bg-[#041307]">
      <div className="mx-auto max-w-7xl px-4 pt-10 pb-8 sm:px-6 lg:px-8">
        {/* Main 4-Column Grid: Brand, Explore (first nav), Location, Contact */}
        <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-4 lg:gap-10">
          {/* Column 1: Brand */}
          <div className="flex flex-col">
            <Link href="/" className="group inline-flex items-center" aria-label="Healthy Hunger – Home">
              <LogoIcon
                className="h-12 w-auto transition-transform duration-200 select-none group-hover:scale-105"
                alt="Healthy Hunger"
              />
            </Link>
            <p className="mt-3 text-xs leading-relaxed text-white/75">
              Mindfully prepared real-food meals, protein-rich bowls, fresh sourdough melts, and guilt-free
              street chaats in Bilimora.
            </p>
          </div>

          {/* Column 2: Explore (Placed First) */}
          <div className="flex flex-col">
            <div className="text-xs font-black tracking-wider text-[#ffb900] uppercase">
              <span>Explore</span>
            </div>
            <nav className="mt-3 flex flex-col space-y-2 text-xs font-semibold text-white/85">
              <Link href="/menu" className="transition-colors hover:text-[#ffb900]">
                Full Menu & Prices
              </Link>
              <Link href="/#promise" className="transition-colors hover:text-[#ffb900]">
                Our Promise & Food Standard
              </Link>
              <Link href="/#visit" className="transition-colors hover:text-[#ffb900]">
                Dine-In Space & Ambiance
              </Link>
              {cafe.blogEnabled && (
                <Link
                  href="/blog"
                  className="inline-flex items-center gap-1.5 transition-colors hover:text-[#ffb900]"
                >
                  <span>Blog & Nutrition Stories</span>
                  <span className="rounded-full bg-emerald-500/20 px-1.5 py-0.5 text-[9px] font-bold text-emerald-300">
                    New
                  </span>
                </Link>
              )}
              <Link href="/privacy" className="transition-colors hover:text-[#ffb900]">
                Privacy & Allergen Policy
              </Link>
            </nav>
          </div>

          {/* Column 3: Café Location */}
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5 text-xs font-black tracking-wider text-[#ffb900] uppercase">
              <MapPin className="size-3.5" />
              <span>Café Location</span>
            </div>
            <p className="mt-3 text-xs leading-relaxed text-white/80">{address}</p>
            {cafe.mapUrl && (
              <a
                href={cafe.mapUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-2.5 inline-flex items-center gap-1 text-xs font-bold text-emerald-400 transition-colors hover:text-emerald-300 hover:underline"
              >
                <span>Get Directions on Maps</span>
                <ArrowUpRight className="size-3.5" />
              </a>
            )}
          </div>

          {/* Column 4: Contact & Orders */}
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5 text-xs font-black tracking-wider text-[#ffb900] uppercase">
              <Phone className="size-3.5" />
              <span>Contact & Orders</span>
            </div>
            <div className="mt-3 space-y-2.5 text-xs">
              {cafe.whatsapp && (
                <div>
                  <span className="block text-[11px] font-medium text-white/60">WhatsApp Order:</span>
                  <a
                    href={`https://wa.me/${cafe.whatsapp}`}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-0.5 inline-flex items-center gap-2 font-bold text-white transition-colors hover:text-emerald-400"
                  >
                    <WhatsAppIcon className="size-4 text-emerald-400" />
                    <span>+{cafe.whatsapp}</span>
                  </a>
                </div>
              )}
              {cafe.phone && (
                <div>
                  <span className="block text-[11px] font-medium text-white/60">Direct Call:</span>
                  <a
                    href={`tel:${cafe.phone.replace(/\s/g, "")}`}
                    className="mt-0.5 inline-flex items-center gap-2 font-bold text-white transition-colors hover:text-emerald-400"
                  >
                    <Phone className="size-3.5 text-white/70" />
                    <span>{cafe.phone}</span>
                  </a>
                </div>
              )}
              {cafe.instagram && (
                <div>
                  <span className="block text-[11px] font-medium text-white/60">Instagram:</span>
                  <a
                    href={`https://instagram.com/${cafe.instagram}`}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-0.5 inline-flex items-center gap-2 font-bold text-white transition-colors hover:text-pink-400"
                  >
                    <InstagramIcon className="size-4 text-pink-400" />
                    <span>@{cafe.instagram}</span>
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Bottom Bar: Copyright */}
        <div className="mt-8 flex flex-col items-center justify-between gap-2 border-t border-white/10 pt-4 text-center text-xs font-medium text-white/60 sm:flex-row sm:text-left">
          <div>
            © {new Date().getFullYear()} {cafe.name || "Healthy Hunger"}. All rights reserved.
          </div>
          {cafe.fssaiLicence && (
            <div className="inline-flex items-center gap-2 rounded-md bg-white px-2.5 py-1 text-[#0f1f15]">
              <Image src="/brand/fssai.webp" alt="FSSAI" width={334} height={183} className="h-4 w-auto" />
              <span className="font-semibold">Lic. No. {cafe.fssaiLicence}</span>
            </div>
          )}
        </div>
      </div>
    </footer>
  );
}
