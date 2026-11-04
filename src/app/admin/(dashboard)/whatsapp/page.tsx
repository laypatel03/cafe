import Link from "next/link";
import { z } from "zod";
import { Pager } from "@/components/admin/pager";
import { RetryWhatsAppButton } from "@/components/admin/whatsapp/wa-buttons";
import { Button } from "@/components/ui/button";
import type { Prisma } from "@/generated/prisma/client";
import type { WaStatus } from "@/generated/prisma/enums";
import { requireUser } from "@/lib/auth/dal";
import { db } from "@/lib/db";
import { CAFE_TZ, formatINR, startOfCafeDay } from "@/lib/format";
import { toRupees } from "@/lib/money";
import { clampPage, resolvePerPage } from "@/lib/paging";
import { cn } from "@/lib/utils";
import { whatsapp, whatsappBusinessAccountId, whatsappReady } from "@/lib/whatsapp";

export const metadata = { title: "WhatsApp" };

const Filters = z.object({
  show: z.enum(["all", "failed", "BILL", "DUE_REMINDER", "WELCOME"]).catch("all"),
  page: z.coerce.number().int().min(1).max(10000).catch(1),
  per: z.string().optional().catch(undefined),
});

const SHOW: {
  id: z.infer<typeof Filters>["show"];
  label: string;
  where: Prisma.WhatsAppMessageWhereInput;
}[] = [
  { id: "all", label: "All", where: {} },
  { id: "failed", label: "Failed", where: { status: "FAILED" } },
  { id: "BILL", label: "Bills", where: { kind: { in: ["BILL", "PAY_LATER", "PAYMENT_RECEIVED"] } } },
  { id: "DUE_REMINDER", label: "Reminders", where: { kind: "DUE_REMINDER" } },
  { id: "WELCOME", label: "Welcome", where: { kind: "WELCOME" } },
];

// always with a word, never colour alone
const STATUS: Record<WaStatus, { label: string; className: string }> = {
  SENDING: { label: "Sending", className: "bg-muted text-muted-foreground" },
  SENT: { label: "Sent", className: "bg-secondary text-secondary-foreground" },
  DELIVERED: { label: "Delivered", className: "bg-secondary text-secondary-foreground" },
  READ: { label: "Read", className: "bg-hh-green/15 text-hh-green" },
  FAILED: { label: "Failed", className: "bg-destructive/10 text-destructive" },
};

// always with a word, never colour alone
const QUALITY: Record<string, { label: string; className: string }> = {
  GREEN: { label: "Good", className: "text-hh-green" },
  YELLOW: { label: "Medium – some guests are blocking or reporting", className: "text-brand-text" },
  RED: { label: "Low – sending may be limited soon", className: "text-destructive" },
  UNKNOWN: { label: "Not rated yet", className: "text-muted-foreground" },
};

/** Start of this month in café time. */
function startOfCafeMonth(now = new Date()) {
  const today = startOfCafeDay(now);
  const india = new Date(today.getTime() + 330 * 60_000);
  return new Date(today.getTime() - (india.getUTCDate() - 1) * 86_400_000);
}

/** The café's number as Meta sees it, what Meta charged this month, and our own counts. */
async function getAccount() {
  const wa = whatsapp();
  const accountId = whatsappBusinessAccountId();
  const month = startOfCafeMonth();
  const now = new Date();
  const [info, spend, counts] = await Promise.all([
    wa?.numberInfo() ?? null,
    wa && accountId ? wa.spend(accountId, month, now) : null,
    db.whatsAppMessage.groupBy({
      by: ["kind", "status"],
      where: { createdAt: { gte: month } },
      _count: true,
    }),
  ]);
  const count = (kind?: "BILL" | "DUE_REMINDER", failed = false) =>
    counts
      .filter((c) => (!kind || c.kind === kind) && (c.status === "FAILED") === failed)
      .reduce((n, c) => n + c._count, 0);
  return {
    info,
    spend,
    accountId,
    month: { bills: count("BILL"), reminders: count("DUE_REMINDER"), failed: count(undefined, true) },
  };
}

const when = (d: Date) =>
  d.toLocaleString("en-IN", { timeZone: CAFE_TZ, dateStyle: "medium", timeStyle: "short" });

/** Owner only: every WhatsApp message the café sent, and what happened to it. */
export default async function WhatsAppPage({ searchParams }: PageProps<"/admin/whatsapp">) {
  await requireUser("OWNER");
  const raw = await searchParams;
  const f = Filters.parse(
    Object.fromEntries(Object.entries(raw).map(([k, v]) => [k, Array.isArray(v) ? v[0] : v || undefined])),
  );
  const where = SHOW.find((s) => s.id === f.show)!.where;
  const perPage = resolvePerPage(f.per, 25);
  const [total, failed, account] = await Promise.all([
    db.whatsAppMessage.count({ where }),
    db.whatsAppMessage.count({ where: { status: "FAILED" } }),
    getAccount(),
  ]);
  const { page, pages } = clampPage(f.page, total, perPage);
  const messages = await db.whatsAppMessage.findMany({
    where,
    orderBy: { createdAt: "desc" },
    skip: (page - 1) * perPage,
    take: perPage,
    include: { bill: { select: { number: true } }, sentBy: { select: { name: true } } },
  });
  const href = (to: { page: number; perPage: number }, show = f.show) => {
    const p = new URLSearchParams({
      ...(show !== "all" && { show }),
      ...(to.perPage !== 25 && { per: String(to.perPage) }),
      ...(to.page > 1 && { page: String(to.page) }),
    });
    return `/admin/whatsapp${p.size ? `?${p}` : ""}`;
  };

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">WhatsApp</h1>
          <p className="text-sm text-muted-foreground">
            Bills and due reminders sent to guests, and whether they arrived.
            {failed > 0 && ` ${failed} failed – open one to see why, and retry.`}
          </p>
        </div>
        <Button asChild variant="outline" className="rounded-full">
          <Link href="/admin/settings">Reminder settings</Link>
        </Button>
      </div>

      {!whatsappReady() && (
        <p role="status" className="rounded-3xl border border-hh-orange/40 bg-hh-orange/10 px-4 py-3 text-sm">
          The café&apos;s WhatsApp number isn&apos;t connected yet, so nothing is sent by itself. See Settings
          → WhatsApp.
        </p>
      )}

      {account.info && (
        <section
          aria-labelledby="wa-account-h"
          className="space-y-3 rounded-3xl border border-border bg-card p-5"
        >
          <h2 id="wa-account-h" className="font-semibold">
            Account
          </h2>
          {!account.info.ok ? (
            <p className="text-sm text-destructive">
              Couldn&apos;t read the account from WhatsApp: {account.info.error}
            </p>
          ) : (
            <dl className="grid gap-3 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-muted-foreground">Number</dt>
                <dd className="font-semibold">
                  <span className="tabular">{account.info.info.number}</span> · {account.info.info.name}
                  {!account.info.info.live && " (test mode)"}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Quality</dt>
                <dd
                  className={cn(
                    "font-semibold",
                    (QUALITY[account.info.info.quality] ?? QUALITY.UNKNOWN).className,
                  )}
                >
                  {(QUALITY[account.info.info.quality] ?? QUALITY.UNKNOWN).label}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Daily limit</dt>
                <dd className="font-semibold">
                  {account.info.info.dailyLimit
                    ? `${account.info.info.dailyLimit} guests a day (starting chats)`
                    : "Not set yet"}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Sent this month</dt>
                <dd className="font-semibold">
                  {account.month.bills} {account.month.bills === 1 ? "bill" : "bills"} ·{" "}
                  {account.month.reminders} {account.month.reminders === 1 ? "reminder" : "reminders"}
                  {account.month.failed > 0 && (
                    <span className="text-destructive"> · {account.month.failed} failed</span>
                  )}
                </dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-muted-foreground">Charged by Meta this month</dt>
                <dd className="font-semibold">
                  {!account.accountId ? (
                    <span className="font-normal text-muted-foreground">
                      Add WHATSAPP_BUSINESS_ACCOUNT_ID to .env (WhatsApp Manager → Account tools) to see it
                      here.
                    </span>
                  ) : account.spend && !account.spend.ok ? (
                    <span className="font-normal text-destructive">
                      Couldn&apos;t read it: {account.spend.error}
                    </span>
                  ) : account.spend?.ok ? (
                    <span className="tabular">
                      {account.spend.spend.cost.toLocaleString("en-IN", { maximumFractionDigits: 2 })}{" "}
                      (account currency) · {account.spend.spend.messages} charged{" "}
                      {account.spend.spend.messages === 1 ? "message" : "messages"}
                    </span>
                  ) : null}
                </dd>
              </div>
            </dl>
          )}
          <p className="text-xs text-muted-foreground">
            WhatsApp doesn&apos;t keep a prepaid balance: Meta charges the card in WhatsApp Manager → Billing.
            See your payment method and invoices there.
          </p>
        </section>
      )}

      <nav aria-label="Show" className="flex flex-wrap gap-2">
        {SHOW.map((s) => (
          <Button
            key={s.id}
            asChild
            size="sm"
            variant={s.id === f.show ? "default" : "outline"}
            className="rounded-full"
          >
            <Link href={href({ page: 1, perPage }, s.id)} aria-current={s.id === f.show ? "page" : undefined}>
              {s.label}
              {s.id === "failed" && failed > 0 && ` (${failed})`}
            </Link>
          </Button>
        ))}
      </nav>

      {messages.length === 0 ? (
        <p className="rounded-3xl border border-border bg-card p-5 text-sm text-muted-foreground">
          No messages yet.
        </p>
      ) : (
        <ul className="divide-y divide-border rounded-3xl border border-border bg-card">
          {messages.map((m) => (
            <li key={m.id} className="space-y-1 px-4 py-3">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <span
                  className={cn(
                    "rounded-full px-2.5 py-0.5 text-xs font-semibold",
                    STATUS[m.status].className,
                  )}
                >
                  {STATUS[m.status].label}
                </span>
                <p className="flex-1 font-semibold">
                  {m.kind === "WELCOME"
                    ? "Welcome + review link"
                    : m.kind === "DUE_REMINDER"
                      ? "Due reminder"
                      : m.kind === "PAYMENT_RECEIVED"
                        ? `Payment received · ${m.billIds.length} ${m.billIds.length === 1 ? "bill" : "bills"}`
                        : `${m.kind === "PAY_LATER" ? "Pay later note" : "Bill"}${m.bill ? ` #${m.bill.number}` : ""}`}{" "}
                  ·{" "}
                  {m.customerId ? (
                    <Link href={`/admin/customers/${m.customerId}`} className="hover:underline">
                      {m.guestName}
                    </Link>
                  ) : (
                    m.guestName
                  )}{" "}
                  <span className="tabular font-normal text-muted-foreground">{m.phone}</span>
                </p>
                <span className="tabular font-semibold">{formatINR(toRupees(m.amountPaise))}</span>
                {m.status === "FAILED" && <RetryWhatsAppButton id={m.id} />}
              </div>
              <p className="text-xs text-muted-foreground">
                {when(m.createdAt)} ·{" "}
                {m.auto
                  ? m.kind === "BILL"
                    ? "sent on payment"
                    : "scheduled"
                  : `sent by ${m.sentBy?.name ?? "staff"}`}
                {m.attempts > 1 && ` · try ${m.attempts}`}
              </p>
              {m.error && <p className="text-sm text-destructive">{m.error}</p>}
              <details className="text-sm">
                <summary className="cursor-pointer text-muted-foreground">Message</summary>
                <p className="mt-1 rounded-2xl bg-secondary px-3 py-2 whitespace-pre-line text-secondary-foreground">
                  {m.text}
                </p>
              </details>
            </li>
          ))}
        </ul>
      )}
      {total > 0 && (
        <Pager page={page} pages={pages} total={total} perPage={perPage} noun="messages" href={href} sizes />
      )}
    </div>
  );
}
