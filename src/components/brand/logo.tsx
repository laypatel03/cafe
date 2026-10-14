import Image from "next/image";
import { cn } from "@/lib/utils";

// Source artwork: doc/brand-palette.jpg (colours and lettering) and doc/brand-guide.jpg (HH mark). Cut-outs live in public/brand.
const WORDMARK = { src: "/brand/hh-wordmark.webp", width: 1000, height: 247 };
const NAME = { src: "/brand/hh-name.webp", width: 640, height: 128 };
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
      className={cn("h-10 w-auto select-none", className)}
      draggable={false}
      // served as-is: the image optimiser's re-compression softens the letter edges
      unoptimized
    />
  );
}

/** Just "Healthy Hunger" from the logo artwork (no tagline), for headers. Size it with a height class. */
export function BrandName({ className }: { className?: string }) {
  return (
    <Image
      src={NAME.src}
      width={NAME.width}
      height={NAME.height}
      alt="Healthy Hunger"
      className={cn("inline-block h-6 w-auto select-none", className)}
      draggable={false}
      // served as-is: the image optimiser's re-compression softens the letter edges
      unoptimized
    />
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
      // served as-is: the image optimiser's re-compression softens the letter edges
      unoptimized
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
