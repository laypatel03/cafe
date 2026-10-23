import { canAccess, getCurrentUser } from "@/lib/auth/dal";
import { getLiveBoard } from "@/lib/data/live";

export const dynamic = "force-dynamic";

/** Snapshot of the live board; the dashboard re-fetches it whenever the stream says something changed. */
export async function GET() {
  const user = await getCurrentUser();
  if (!user || !canAccess(user.role, "team"))
    return Response.json({ error: "Please log in again." }, { status: 401 });
  return Response.json(await getLiveBoard(user.role), { headers: { "Cache-Control": "no-store" } });
}
