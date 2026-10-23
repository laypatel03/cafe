import { canAccess, getCurrentUser } from "@/lib/auth/dal";
import { sseResponse } from "@/lib/realtime";

export const dynamic = "force-dynamic";

/** Live push for the dashboard: a `change` ping whenever a selection or order changes. */
export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user || !canAccess(user.role, "team")) return new Response("Please log in again.", { status: 401 });
  return sseResponse(req.signal, {
    filter: (e) => ({ event: "change", data: { type: e.type } }),
  });
}
