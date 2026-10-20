import type { Metadata, Viewport } from "next";
import { Baloo_2, Figtree, IBM_Plex_Mono, Plus_Jakarta_Sans } from "next/font/google";
import { ThemeProvider } from "@/components/theme/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { SITE_URL } from "@/lib/site-url";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

// Rounded, friendly display face named in the brand guide
const baloo = Baloo_2({
  variable: "--font-baloo",
  subsets: ["latin"],
  weight: ["600", "700", "800"],
});

const figtree = Figtree({
  variable: "--font-figtree",
  subsets: ["latin"],
});

const plexMono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  metadataBase: SITE_URL,
  applicationName: "Healthy Hunger",
  openGraph: { type: "website", siteName: "Healthy Hunger", locale: "en_IN" },
  twitter: { card: "summary_large_image" },
  title: {
    default: "Healthy Hunger – Eat well, live well | 100% veg café",
    template: "%s · Healthy Hunger",
  },
  description:
    "Salads, chaats, sandwiches and oats bowls with protein from real food. 100% vegetarian, made in our kitchen every day.",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fbf9f1" },
    { media: "(prefers-color-scheme: dark)", color: "#0e1a12" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${jakarta.variable} ${baloo.variable} ${figtree.variable} ${plexMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          {children}
          <Toaster position="top-center" />
        </ThemeProvider>
      </body>
    </html>
  );
}
