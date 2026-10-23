import { MenuManager } from "@/components/admin/menu/menu-manager";
import { canAccess, requireUser } from "@/lib/auth/dal";
import { getAdminMenu } from "@/lib/data/admin-menu";

export const metadata = { title: "Menu" };

export default async function AdminMenuPage() {
  const user = await requireUser("anyone");
  const menu = await getAdminMenu();
  return <MenuManager menu={menu} isOwner={canAccess(user.role, "website")} />;
}
