import "server-only";
import { allBalances } from "@/lib/data/customer-balance";
import { owedByCustomer } from "@/lib/data/owed";
import { db } from "@/lib/db";
import { type ReminderSettings, reminderDue } from "@/lib/reminder-schedule";
import { whatsappReady } from "./index";
import { sendDueReminder } from "./send";

export async function getReminderSettings(): Promise<ReminderSettings & { minPaise: number }> {
  const s = await db.cafeSettings.findUniqueOrThrow({
    where: { id: 1 },
    select: {
      dueReminders: true,
      reminderWeekday: true,
      reminderMonthDay: true,
      reminderHour: true,
      reminderMinPaise: true,
    },
  });
  return {
    frequency: s.dueReminders,
    weekday: s.reminderWeekday,
    monthDay: s.reminderMonthDay,
    hour: s.reminderHour,
    minPaise: s.reminderMinPaise,
  };
}

export type ReminderRun =
  | { ran: false; reason: string }
  | { ran: true; periodKey: string; sent: number; failed: number; skipped: number; errors: string[] };

/**
 * The scheduled run (called every hour): when the set day and hour have come, every guest who owes
 * (unpaid orders and paying less together) at least the minimum – not paused, not opted out – gets one reminder for this week or month.
 */
export async function runDueReminders(now = new Date()): Promise<ReminderRun> {
  const set = await getReminderSettings();
  if (set.frequency === "OFF") return { ran: false, reason: "Reminders are off in Settings." };
  const due = reminderDue(set, now);
  if (!due) return { ran: false, reason: "Not time for reminders yet." };
  if (!whatsappReady()) return { ran: false, reason: "WhatsApp isn't connected (WHATSAPP_TOKEN)." };

  // what each guest owes: unpaid orders plus paying less (a minus balance)
  const [owed, balances] = await Promise.all([owedByCustomer(), allBalances()]);
  const total = new Map([...owed].map(([id, o]) => [id, o.paise]));
  for (const [id, b] of balances) if (b < 0) total.set(id, (total.get(id) ?? 0) - b);
  const ids = [...total].filter(([, paise]) => paise >= Math.max(set.minPaise, 1)).map(([id]) => id);
  const guests = await db.customer.findMany({
    where: { id: { in: ids }, remindersPaused: false, whatsappOptOutAt: null },
    select: { id: true, name: true },
  });

  const run = {
    ran: true as const,
    periodKey: due.periodKey,
    sent: 0,
    failed: 0,
    skipped: 0,
    errors: [] as string[],
  };
  // one at a time – a small café has a handful, and it keeps well inside WhatsApp's rate limits
  for (const g of guests) {
    const res = await sendDueReminder(g.id, { auto: true, periodKey: due.periodKey });
    if (res.ok) run.sent++;
    else if (res.skipped) run.skipped++;
    else {
      run.failed++;
      run.errors.push(`${g.name}: ${res.error}`);
    }
  }
  return run;
}
