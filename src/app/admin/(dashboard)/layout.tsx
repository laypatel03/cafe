import type { Metadata } from "next";
import { AdminMobileBar, AdminSidebar } from "@/components/admin/admin-nav";
import { OfflineBanner } from "@/components/admin/offline-banner";
import { requireUser } from "@/lib/auth/dal";

export const metadata: Metadata = {
  title: { default: "Dashboard", template: "%s · Dashboard" },
  robots: { index: false },
};

export default async function DashboardLayout({ children }: LayoutProps<"/admin">) {
  const user = await requireUser("anyone");
  return (
    <div className="flex min-h-svh bg-background">
      <AdminSidebar user={user} />
      <div className="flex min-w-0 flex-1 flex-col">
        <OfflineBanner />
        <AdminMobileBar user={user} />
        <main className="flex-1 px-4 py-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
