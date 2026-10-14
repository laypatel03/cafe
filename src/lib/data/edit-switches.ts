import "server-only";
import { db } from "@/lib/db";

export type EditSwitches = { orders: boolean; customers: boolean };

/** The owner's Settings → Editing switches. Read fresh every time, so turning one off takes effect at once. */
export async function getEditSwitches(): Promise<EditSwitches> {
  const s = await db.cafeSettings.findUnique({
    where: { id: 1 },
    select: { orderEditsEnabled: true, customerEditsEnabled: true },
  });
  return { orders: s?.orderEditsEnabled ?? false, customers: s?.customerEditsEnabled ?? false };
}
