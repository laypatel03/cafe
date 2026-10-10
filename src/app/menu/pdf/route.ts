import { renderToBuffer } from "@react-pdf/renderer";
import { getCafeDetails, getPublicMenu } from "@/lib/data/menu";
import { MenuPdf } from "@/lib/menu-pdf/document";
import { menuUrl } from "@/lib/qr";

/**
 * The menu as an A4 PDF, built from the dashboard's menu on every request – a price or item
 * changed in Admin → Menu shows here straight away. The "PDF menu" QR code points here.
 */
export async function GET() {
  const [menu, cafe] = await Promise.all([getPublicMenu(), getCafeDetails()]);
  const pdf = await renderToBuffer(MenuPdf({ menu, cafe, menuUrl: menuUrl() }));

  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      // inline: phones open it in their PDF viewer instead of only downloading it
      "Content-Disposition": 'inline; filename="healthy-hunger-menu.pdf"',
      "Cache-Control": "no-cache",
    },
  });
}
