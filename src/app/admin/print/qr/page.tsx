import type { Metadata } from "next";
import { LogoWordmark } from "@/components/brand/logo";
import { requireUser } from "@/lib/auth/dal";
import { menuPdfUrl, menuUrl, qrSvg, siteUrlIsLocal } from "@/lib/qr";
import { PrintButton } from "../print-button";

export const metadata: Metadata = { title: "QR cards", robots: { index: false } };

/**
 * Four copies of the café QR card per A4 sheet. Outside the dashboard layout so nothing else prints.
 * `?for=pdf` prints the view-only PDF menu code instead of the ordering one.
 */
export default async function PrintQrPage({ searchParams }: PageProps<"/admin/print/qr">) {
  await requireUser("website");
  const pdf = (await searchParams).for === "pdf";
  const url = pdf ? menuPdfUrl() : menuUrl();
  const qr = await qrSvg(url);

  return (
    <div className="min-h-svh bg-muted print:bg-white">
      <style>{`@page { size: A4; margin: 10mm; }`}</style>
      <div className="mx-auto flex max-w-[190mm] flex-wrap items-center justify-between gap-3 px-4 py-5 print:hidden">
        <div>
          <h1 className="text-2xl font-bold">QR cards</h1>
          <p className="text-sm text-muted-foreground">
            Four cards per A4 sheet – one for each table, the counter or the door. Cut along the dotted lines.
          </p>
          {siteUrlIsLocal() && (
            <p className="mt-1 text-sm font-semibold text-destructive">
              These codes point to localhost – don&apos;t print them until the site is live.
            </p>
          )}
        </div>
        <PrintButton />
      </div>

      <div className="mx-auto grid max-w-[190mm] grid-cols-2 bg-white print:max-w-none">
        {[1, 2, 3, 4].map((n) => (
          <section
            key={n}
            className="flex h-[138mm] break-inside-avoid flex-col items-center justify-between border border-dashed border-[#c8c2b6] px-[10mm] py-[9mm] text-center text-[#1c2b22]"
          >
            <LogoWordmark className="h-auto w-[62mm]" />
            <div>
              <p className="font-heading text-[7mm] leading-none font-bold">
                {pdf ? "Scan for our menu" : "Scan to order"}
              </p>
              <p className="mt-[2mm] text-[3.4mm] text-[#566b5d]">
                {pdf ? "Protein & calories on every item" : "Dine-in or takeaway · from your phone"}
              </p>
            </div>
            <div
              className="w-[52mm] [&_svg]:h-auto [&_svg]:w-full"
              dangerouslySetInnerHTML={{ __html: qr }}
            />
            <p className="text-[2.8mm] break-all text-[#566b5d]">{url}</p>
          </section>
        ))}
      </div>
    </div>
  );
}
