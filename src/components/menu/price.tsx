import { formatINR } from "@/lib/format";
import type { MenuItem } from "@/lib/menu-types";
import { cn } from "@/lib/utils";

/** What the guest pays; during an offer, in orange with the regular price struck through. */
export function Price({
  item,
  className,
}: {
  item: Pick<MenuItem, "price" | "wasPrice">;
  className?: string;
}) {
  if (item.wasPrice === undefined)
    return (
      <span className={cn("tabular font-black text-[#0f1f15] dark:text-[#eef5ef]", className)}>
        {formatINR(item.price)}
      </span>
    );
  return (
    <span className="inline-flex items-baseline gap-1.5">
      <span className={cn("tabular font-black text-[#C2410C] dark:text-[#FF8A00]", className)}>
        <span className="sr-only">Offer price </span>
        {formatINR(item.price)}
      </span>
      <s className="tabular text-sm font-semibold text-[#5a6f61] decoration-[1.5px] dark:text-[#a7b8ac]">
        <span className="sr-only">regular price </span>
        {formatINR(item.wasPrice)}
      </s>
    </span>
  );
}

/** Small "Offer" tag for photos. */
export function OfferTag({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full bg-[#FF8A00] px-2.5 py-0.5 text-[10px] font-black tracking-wider text-[#1a1206] uppercase shadow-sm",
        className,
      )}
    >
      Offer
    </span>
  );
}
