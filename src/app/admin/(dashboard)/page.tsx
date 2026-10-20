import { LiveBoard } from "@/components/admin/live-board";
import { requireUser } from "@/lib/auth/dal";
import { getLiveBoard } from "@/lib/data/live";
import { getPublicMenu } from "@/lib/data/menu";

// same segment as the dashboard layout, so its title template does not apply here
export const metadata = { title: { absolute: "Live orders · Dashboard" } };

export default async function LiveOrdersPage() {
  const user = await requireUser();
  const [board, menu] = await Promise.all([getLiveBoard(user.role), getPublicMenu()]);
  return <LiveBoard initial={board} menu={menu} isOwner={user.role === "OWNER"} />;
}
