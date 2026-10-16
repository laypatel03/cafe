import { EyeOff } from "lucide-react";
import Link from "next/link";

/** Shown to logged-in staff while the blog is switched off for guests. */
export function BlogPreviewBanner() {
  return (
    <p
      role="status"
      className="mb-6 flex flex-wrap items-center gap-x-2 gap-y-1 rounded-2xl bg-hh-orange/15 px-4 py-3 text-sm"
    >
      <EyeOff className="size-4 text-brand-text" aria-hidden />
      <span className="font-semibold">Preview – guests can&apos;t see the blog yet.</span>
      <Link
        href="/admin/settings"
        className="font-semibold text-brand-text underline-offset-2 hover:underline"
      >
        Turn it on in Settings → Editing
      </Link>
    </p>
  );
}
