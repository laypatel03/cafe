import { MessageCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { WaLine } from "@/lib/whatsapp/live-status";

// always with words, never colour alone
const TONE = {
  ok: "text-hh-green dark:text-hh-green-light",
  wait: "text-muted-foreground",
  bad: "text-destructive",
  off: "text-muted-foreground",
};

/** One line on a Live orders card: what went to the guest on WhatsApp, or why nothing did. */
export function WaStatusLine({ wa, className }: { wa: WaLine | null; className?: string }) {
  if (!wa) return null;
  return (
    <p className={cn("flex items-start gap-1.5 text-xs font-semibold", TONE[wa.tone], className)}>
      <MessageCircle className="mt-px size-3.5 shrink-0" aria-hidden />
      <span>{wa.text}</span>
    </p>
  );
}
