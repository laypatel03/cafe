import Image from "next/image";
import { cn } from "@/lib/utils";

// Source artwork: doc/brand-guide.jpg. Cut-outs live in public/brand.
const WORDMARK = { src: "/brand/hh-wordmark.webp", width: 1228, height: 309 };
const ICON = { src: "/brand/hh-icon-512.webp", width: 512, height: 391 };

type Props = { className?: string; priority?: boolean };

/** "Healthy Hunger – Eat well, live well" glossy wordmark. Size it with a height class. */
export function LogoWordmark({ className, priority }: Props) {
  return (
    <Image
      src={WORDMARK.src}
      width={WORDMARK.width}
      height={WORDMARK.height}
      alt="Healthy Hunger – Eat well, live well"
      priority={priority}
      // the artwork has no outline, so a faint light halo keeps it readable on dark backgrounds
      className={cn("h-10 w-auto select-none dark:drop-shadow-[0_0_10px_rgba(255,255,255,0.22)]", className)}
      draggable={false}
    />
  );
}

/**
 * "Healthy Hunger" set in the logo's style: rounded bold type, "Healthy" in the greens and "Hunger"
 * in the oranges, each with the logo's light-to-deep gradient. For places where the name is text.
 */
export function BrandName({ className }: { className?: string }) {
  return (
    <span className={cn("font-heading font-extrabold tracking-tight whitespace-nowrap", className)}>
      <span className="bg-linear-to-b from-hh-green-light to-hh-green bg-clip-text text-transparent">
        Healthy
      </span>
      <span className="bg-linear-to-b from-hh-orange-light to-hh-orange bg-clip-text text-transparent">
        Hunger
      </span>
    </span>
  );
}

/** The HH leaf-and-bite mark. Size it with a height class. */
export function LogoIcon({ className, priority, alt = "Healthy Hunger" }: Props & { alt?: string }) {
  return (
    <Image
      src={ICON.src}
      width={ICON.width}
      height={ICON.height}
      alt={alt}
      priority={priority}
      className={cn("h-10 w-auto select-none", className)}
      draggable={false}
    />
  );
}

/** "— EAT WELL, LIVE WELL —" */
export function Tagline({ className }: { className?: string }) {
  return (
    <p className={cn("flex items-center gap-3 tagline text-xs text-hh-green", className)}>
      <span aria-hidden className="h-0.5 w-8 rounded-full bg-current" />
      Eat well, live well
      <span aria-hidden className="h-0.5 w-8 rounded-full bg-current" />
    </p>
  );
}
