import { SettingsScreen } from "@/components/admin/settings/settings-screen";
import { requireUser } from "@/lib/auth/dal";
import { db } from "@/lib/db";

export const metadata = { title: "Settings" };

export default async function SettingsPage() {
  const me = await requireUser("OWNER");
  const [settings, staff, items] = await Promise.all([
    db.cafeSettings.findUniqueOrThrow({ where: { id: 1 } }),
    db.staffUser.findMany({
      orderBy: [{ active: "desc" }, { role: "desc" }, { name: "asc" }],
      select: {
        id: true,
        name: true,
        username: true,
        phone: true,
        role: true,
        active: true,
        lastLoginAt: true,
      },
    }),
    db.menuItem.findMany({
      where: { visible: true },
      orderBy: [{ category: { sortOrder: "asc" } }, { sortOrder: "asc" }],
      select: { id: true, name: true },
    }),
  ]);
  return (
    <SettingsScreen
      meId={me.id}
      cafe={{
        name: settings.name,
        tagline: settings.tagline,
        address: settings.address,
        mapUrl: settings.mapUrl,
        phone: settings.phone,
        whatsapp: settings.whatsapp,
        instagram: settings.instagram,
        fssaiLicence: settings.fssaiLicence,
        gaMeasurementId: settings.gaMeasurementId,
        hours: (settings.hours as { days: string; time: string }[]) ?? [],
        todaysPickId: settings.todaysPickId ?? "",
      }}
      edits={{
        orders: settings.orderEditsEnabled,
        customers: settings.customerEditsEnabled,
        ordering: settings.orderingEnabled,
        blog: settings.blogEnabled,
      }}
      staff={staff.map((s) => ({ ...s, lastLoginAt: s.lastLoginAt?.toISOString() ?? null }))}
      items={items}
    />
  );
}
