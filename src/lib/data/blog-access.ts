import "server-only";
import { getCurrentUser } from "@/lib/auth/dal";
import { getCafeDetails } from "@/lib/data/menu";

/**
 * Who may see the Blog right now: everyone (switched on in Settings → Editing), only logged-in
 * staff as a preview (switched off), or nobody.
 */
export async function blogAccess(): Promise<"public" | "preview" | "hidden"> {
  if ((await getCafeDetails()).blogEnabled) return "public";
  return (await getCurrentUser()) ? "preview" : "hidden";
}
