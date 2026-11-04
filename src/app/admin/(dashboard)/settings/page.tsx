import { SettingsScreen } from "@/components/admin/settings/settings-screen";
import { requireUser } from "@/lib/auth/dal";
import { db } from "@/lib/db";
import { nextScheduled } from "@/lib/reminder-schedule";
import { googleReviewUrl, welcomeTemplateReady, whatsappReady } from "@/lib/whatsapp";
import { syncTemplates } from "@/lib/whatsapp/templates";

export const metadata = { title: "Settings" };

export default async function SettingsPage() {
  const me = await requireUser("website");
  const isOwner = me.role === "OWNER";
  const [settings, staff, items] = await Promise.all([
    db.cafeSettings.findUniqueOrThrow({ where: { id: 1 } }),
    // developers manage the website, not logins
    !isOwner
      ? []
      : db.staffUser.findMany({
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
      isOwner={isOwner}
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
        googlePlaceId: settings.googlePlaceId,
        reviewsKeySet: Boolean(process.env.GOOGLE_MAPS_API_KEY),
        hours: (settings.hours as { days: string; time: string }[]) ?? [],
        todaysPickId: settings.todaysPickId ?? "",
      }}
      edits={{
        orders: settings.orderEditsEnabled,
        customers: settings.customerEditsEnabled,
        passRefunds: settings.mealPassRefundsEnabled,
        ordering: settings.orderingEnabled,
        blog: settings.blogEnabled,
      }}
      wa={
        isOwner
          ? {
              bills: settings.waBillsEnabled,
              welcome: settings.waWelcomeEnabled,
              welcomeReady: welcomeTemplateReady(),
              reviewUrl: settings.googlePlaceId ? googleReviewUrl(settings.googlePlaceId) : null,
              templates: await syncTemplates(),
              frequency: settings.dueReminders,
              weekday: settings.reminderWeekday,
              monthDay: settings.reminderMonthDay,
              hour: settings.reminderHour,
              minPaise: settings.reminderMinPaise,
              connected: whatsappReady(),
              webhook: Boolean(process.env.WHATSAPP_VERIFY_TOKEN && process.env.WHATSAPP_APP_SECRET),
              schedule: Boolean(process.env.CRON_SECRET),
              next:
                nextScheduled(
                  {
                    frequency: settings.dueReminders,
                    weekday: settings.reminderWeekday,
                    monthDay: settings.reminderMonthDay,
                    hour: settings.reminderHour,
                  },
                  new Date(),
                )?.toISOString() ?? null,
            }
          : null
      }
      staff={staff.map((s) => ({ ...s, lastLoginAt: s.lastLoginAt?.toISOString() ?? null }))}
      items={items}
    />
  );
}
