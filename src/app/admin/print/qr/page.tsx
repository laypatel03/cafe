import type { Metadata } from "next";
import * as z from "zod";
import { LogoWordmark } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { requireUser } from "@/lib/auth/dal";
import { menuPdfUrl, menuUrl, qrSvg, siteUrlIsLocal } from "@/lib/qr";
import { PrintButton } from "../print-button";

export const metadata: Metadata = { title: "QR card", robots: { index: false } };

// A4 minus the 10 mm print margin, in inches
const MAX_W = 7.4;
const MAX_H = 10.8;
const inches = (fallback: number, max: number) =>
  z.coerce
    .number()
    .min(1.5)
    .max(max)
    .catch(fallback)
    .transform((n) => Math.round(n * 10) / 10);
const SizeSchema = z.object({ w: inches(3.7, MAX_W), h: inches(5.4, MAX_H) });

/**
 * One café QR card per A4 sheet, in a size the owner picks (inches, `?w=&h=`). Text and code scale
 * with the card's shorter side. Outside the dashboard layout so nothing else prints.
 * `?for=pdf` prints the view-only PDF menu code instead of the ordering one.
 */
export default async function PrintQrPage({ searchParams }: PageProps<"/admin/print/qr">) {
  await requireUser("website");
  const params = await searchParams;
  const pdf = params.for === "pdf";
  const { w, h } = SizeSchema.parse(params);
  // everything scales with the shorter side; the code gets what's left after the text (~62 % of it)
  const side = Math.min(w, h);
  const u = (pct: number) => `${((side * pct) / 100).toFixed(3)}in`;
  const qrSize = Math.min(side * 0.55, h - side * 0.62).toFixed(3);
  const url = pdf ? menuPdfUrl() : menuUrl();
  const qr = await qrSvg(url);

  return (
    <div className="min-h-svh bg-muted print:bg-white">
      <style>{`@page { size: A4; margin: 10mm; }`}</style>
      <div className="mx-auto flex max-w-[190mm] flex-wrap items-end justify-between gap-4 px-4 py-5 print:hidden">
        <div>
          <h1 className="text-2xl font-bold">QR card</h1>
          <p className="text-sm text-muted-foreground">
            One card per A4 sheet – set its size, then print more copies for each table, the counter or the
            door.
          </p>
          {siteUrlIsLocal() && (
            <p className="mt-1 text-sm font-semibold text-destructive">
              This code points to localhost – don&apos;t print it until the site is live.
            </p>
          )}
        </div>
        {/* plain GET form: the size lives in the URL, nothing is saved */}
        <form className="flex flex-wrap items-end gap-2">
          {pdf && <input type="hidden" name="for" value="pdf" />}
          <div className="grid gap-1">
            <Label htmlFor="qr-w">Width (inch)</Label>
            <Input
              id="qr-w"
              name="w"
              type="number"
              step="0.1"
              min="1.5"
              max={MAX_W}
              defaultValue={w}
              className="h-10 w-24"
            />
          </div>
          <div className="grid gap-1">
            <Label htmlFor="qr-h">Height (inch)</Label>
            <Input
              id="qr-h"
              name="h"
              type="number"
              step="0.1"
              min="1.5"
              max={MAX_H}
              defaultValue={h}
              className="h-10 w-24"
            />
          </div>
          <Button type="submit" variant="outline" className="h-10 rounded-full">
            Set size
          </Button>
          <PrintButton />
        </form>
      </div>

      <div className="mx-auto flex max-w-[190mm] justify-center bg-white py-[10mm] print:max-w-none print:py-0">
        <section
          style={{ width: `${w}in`, height: `${h}in`, padding: `${u(9)} ${u(10)}` }}
          className="flex break-inside-avoid flex-col items-center justify-between overflow-hidden border border-dashed border-[#c8c2b6] text-center text-[#1c2b22]"
        >
          <div className="shrink-0" style={{ width: u(65) }}>
            <LogoWordmark className="h-auto w-full" />
          </div>
          <div>
            <p className="font-heading leading-none font-bold" style={{ fontSize: u(7.4) }}>
              {pdf ? "Scan for our menu" : "Scan to order"}
            </p>
            <p className="text-[#566b5d]" style={{ fontSize: u(3.6), marginTop: u(2) }}>
              {pdf ? "Protein & calories on every item" : "Dine-in or takeaway · from your phone"}
            </p>
          </div>
          <div
            className="[&_svg]:h-auto [&_svg]:w-full"
            style={{ width: `${qrSize}in` }}
            dangerouslySetInnerHTML={{ __html: qr }}
          />
          <p className="break-all text-[#566b5d]" style={{ fontSize: u(3) }}>
            {url}
          </p>
        </section>
      </div>
    </div>
  );
}
