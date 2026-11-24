import { LiveBoard } from "@/components/admin/live-board";
import { requireUser } from "@/lib/auth/dal";
import { db } from "@/lib/db";
import { getLiveBoard } from "@/lib/data/live";
import { getMenuWithOffers } from "@/lib/data/offers";

// same segment as the dashboard layout, so its title template does not apply here
export const metadata = { title: { absolute: "Live orders · Dashboard" } };

export default async function LiveOrdersPage() {
  const user = await requireUser();
  const [board, menu, me] = await Promise.all([
    getLiveBoard(user.role),
    getMenuWithOffers(),
    db.staffUser.findUnique({ where: { id: user.id }, select: { orderAlerts: true } }),
  ]);
  return (
    <LiveBoard initial={board} menu={menu} isOwner={user.role === "OWNER"} alerts={me?.orderAlerts ?? true} />
  );
}
