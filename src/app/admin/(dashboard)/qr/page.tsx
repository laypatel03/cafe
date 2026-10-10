import { FileText, Printer } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { requireUser } from "@/lib/auth/dal";
import { menuPdfUrl, menuUrl, qrSvg, siteUrlIsLocal } from "@/lib/qr";

export const metadata = { title: "QR code" };

/**
 * The café QR: every guest scans it, picks dine-in or takeaway and orders.
 * The PDF QR is view-only – it opens the menu as a PDF built from the live menu.
 */
export default async function QrPage() {
  await requireUser("OWNER");
  const url = menuUrl();
  const pdfUrl = menuPdfUrl();
  const [qr, pdfQr] = await Promise.all([qrSvg(url), qrSvg(pdfUrl)]);
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">QR code</h1>
          <p className="text-sm text-muted-foreground">
            One code for everyone – put it on tables, the counter and flyers. Guests choose dine-in or
            takeaway and order with their name and number.
          </p>
        </div>
        <Button asChild className="rounded-full">
          <Link href="/admin/print/qr" target="_blank">
            <Printer data-icon="inline-start" /> Print cards
          </Link>
        </Button>
      </div>
      {siteUrlIsLocal() && (
        <p className="rounded-2xl bg-destructive/10 px-4 py-3 text-sm font-semibold text-destructive">
          This code points to localhost – don&apos;t print it until the site is live (set SITE_URL).
        </p>
      )}
      <div className="flex flex-col items-center gap-4 rounded-3xl border border-border bg-card p-8">
        <div
          className="w-56 rounded-2xl bg-white p-4 [&_svg]:h-auto [&_svg]:w-full"
          role="img"
          aria-label={`QR code for ${url}`}
          dangerouslySetInnerHTML={{ __html: qr }}
        />
        <p className="text-sm break-all text-muted-foreground">{url}</p>
      </div>

      <div className="flex flex-wrap items-end justify-between gap-3 pt-4">
        <div>
          <h2 className="text-2xl font-bold">PDF menu QR</h2>
          <p className="text-sm text-muted-foreground">
            Opens the menu as a PDF on the guest&apos;s phone – view only, no ordering. It&apos;s made from
            your menu each time, so a price you change under Menu shows in the PDF straight away.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline" className="rounded-full">
            <a href="/menu/pdf" target="_blank" rel="noopener">
              <FileText data-icon="inline-start" /> Open PDF
            </a>
          </Button>
          <Button asChild className="rounded-full">
            <Link href="/admin/print/qr?for=pdf" target="_blank">
              <Printer data-icon="inline-start" /> Print cards
            </Link>
          </Button>
        </div>
      </div>
      <div className="flex flex-col items-center gap-4 rounded-3xl border border-border bg-card p-8">
        <div
          className="w-56 rounded-2xl bg-white p-4 [&_svg]:h-auto [&_svg]:w-full"
          role="img"
          aria-label={`QR code for ${pdfUrl}`}
          dangerouslySetInnerHTML={{ __html: pdfQr }}
        />
        <p className="text-sm break-all text-muted-foreground">{pdfUrl}</p>
      </div>
    </div>
  );
}
