import "server-only";
import path from "node:path";
import { Font } from "@react-pdf/renderer";

// Figtree (OFL, see menu-pdf/fonts/OFL.txt) – the site's body face; it has the ₹ sign, the PDF base
// fonts don't. Shared by every PDF (menu, bill, dues statement); importing this registers it once.
const fontDir = path.join(process.cwd(), "src/lib/menu-pdf/fonts");
Font.register({
  family: "Figtree",
  fonts: [
    { src: path.join(fontDir, "Figtree-Regular.ttf"), fontWeight: 400 },
    { src: path.join(fontDir, "Figtree-SemiBold.ttf"), fontWeight: 600 },
    { src: path.join(fontDir, "Figtree-Bold.ttf"), fontWeight: 700 },
    { src: path.join(fontDir, "Figtree-ExtraBold.ttf"), fontWeight: 800 },
  ],
});
// Keep words whole (react-pdf hyphenates by default).
Font.registerHyphenationCallback((word) => [word]);

export const PDF_FONT = "Figtree";
