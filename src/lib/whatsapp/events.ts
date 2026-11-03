import "server-only";
import { db } from "@/lib/db";
import { DELIVERY_RANK, type WebhookEvents } from "./webhook";

/** Applies what WhatsApp reported: status moves forward only; STOP / START set the guest's opt-out. */
export async function applyWebhook(events: WebhookEvents) {
  for (const st of events.statuses) {
    const row = await db.whatsAppMessage.findUnique({
      where: { waId: st.waId },
      select: { id: true, status: true },
    });
    if (!row || DELIVERY_RANK[st.status] <= DELIVERY_RANK[row.status]) continue;
    await db.whatsAppMessage.update({
      where: { id: row.id },
      data: { status: st.status, ...(st.error && { error: st.error }) },
    });
  }
  if (events.optOuts.length)
    await db.customer.updateMany({
      where: { phone: { in: events.optOuts }, whatsappOptOutAt: null },
      data: { whatsappOptOutAt: new Date() },
    });
  if (events.optIns.length)
    await db.customer.updateMany({
      where: { phone: { in: events.optIns } },
      data: { whatsappOptOutAt: null },
    });
}
