"use client";

import { GoogleAnalytics } from "@next/third-parties/google";
import { usePathname } from "next/navigation";
import { useEffect } from "react";

/** Google Analytics on the public site only; staff screens are never counted. */
export function SiteAnalytics({ gaId }: { gaId: string }) {
  const isAdmin = usePathname().startsWith("/admin");
  // gtag stays loaded after a client-side move into /admin, so switch it off there too
  useEffect(() => {
    (window as unknown as Record<string, boolean>)[`ga-disable-${gaId}`] = isAdmin;
  }, [gaId, isAdmin]);
  // a visit that starts on an admin page never loads it at all
  if (isAdmin) return null;
  return <GoogleAnalytics gaId={gaId} />;
}
