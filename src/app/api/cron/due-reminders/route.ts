import { timingSafeEqual } from "node:crypto";
import { runDueReminders } from "@/lib/whatsapp/reminders";
import { runPayLaterNotes } from "@/lib/whatsapp/send";

export const dynamic = "force-dynamic";

const sameSecret = (given: string, secret: string) => {
  const a = Buffer.from(given);
  const b = Buffer.from(secret);
  return a.length === b.length && timingSafeEqual(a, b);
};

/**
 * Called every 5 minutes by the server's timer (scripts/whatsapp/): the pay-later thank-yous once it's
 * 30 minutes past closing, and the due reminders on their day and hour. `Authorization: Bearer
 * <CRON_SECRET>`. Safe to call any number of times – each note and reminder goes once.
 */
export async function POST(req: Request) {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return Response.json({ error: "Set CRON_SECRET in .env first." }, { status: 503 });
  const given = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  if (!sameSecret(given, secret)) return Response.json({ error: "Wrong secret." }, { status: 401 });
  return Response.json({ payLater: await runPayLaterNotes(), reminders: await runDueReminders() });
}
