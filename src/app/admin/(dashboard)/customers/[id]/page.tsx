import { ArrowLeft, ChevronRight, CircleAlert, MessageCircle, Plus, ReceiptText } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  CustomerNotesForm,
  DeleteCustomerButton,
  StopOffersButton,
} from "@/components/admin/customer-profile-actions";
import { EditCustomerButton } from "@/components/admin/customer-edit-dialog";
import { OrderStatusBadge } from "@/components/admin/order-status-badge";
import { RecordPaymentButton } from "@/components/admin/orders/record-payment-button";
import { PaidDifference } from "@/components/admin/paid-difference";
import { BillsSwitch, RemindersSwitch, SendReminderButton } from "@/components/admin/whatsapp/wa-buttons";
import { Button } from "@/components/ui/button";
import { requireUser } from "@/lib/auth/dal";
import {
  BalanceEntryForm,
  ClearBalanceButton,
  DeleteBalanceButton,
} from "@/components/admin/balance-entry-form";
import { SellPassForm } from "@/components/admin/passes/pass-forms";
import { BALANCE_KIND_LABEL, balanceState } from "@/lib/customer-balance";
import { favouriteItems } from "@/lib/customer-stats";
import { COUNTED_BALANCE, shortBillsDue } from "@/lib/data/customer-balance";
import { today as todayKey } from "@/lib/data/cash";
import { getPasses } from "@/lib/data/meal-passes";
import { getEditSwitches } from "@/lib/data/edit-switches";
import { owedByCustomer, owedOrdersWhere } from "@/lib/data/owed";
import type { BalanceKind, PaymentMethod } from "@/generated/prisma/enums";
import { db } from "@/lib/db";
import { CAFE_TZ, formatINR } from "@/lib/format";
import { type MealPart, mealsSummary, readParts } from "@/lib/meal-pass";
import { toRupees } from "@/lib/money";
import { PAYMENT_LABEL } from "@/lib/payments";
import { nextScheduled } from "@/lib/reminder-schedule";
import { cn } from "@/lib/utils";
import { getReminderSettings } from "@/lib/whatsapp/reminders";

export const metadata = { title: "Customer" };

const WA_FREQUENCY = {
  WEEKLY: "On · every week",
  MONTHLY: "On · every month",
  OFF: "Scheduled reminders off",
};

/** rows loaded (newest first), shown by month – the latest month open, older ones folded */
const BALANCE_ROWS = 300;
const ORDER_ROWS = 300;
const monthKey = (d: Date) =>
  new Intl.DateTimeFormat("en-CA", { timeZone: CAFE_TZ, year: "numeric", month: "2-digit" }).format(d);
const monthName = (d: Date) =>
  d.toLocaleDateString("en-IN", { timeZone: CAFE_TZ, month: "long", year: "numeric" });

/** Rows (newest first) in month groups, newest month first. */
function byMonth<T>(rows: T[], at: (r: T) => Date) {
  const groups: { key: string; label: string; rows: T[] }[] = [];
  for (const r of rows) {
    const key = monthKey(at(r));
    if (groups.at(-1)?.key !== key) groups.push({ key, label: monthName(at(r)), rows: [] });
    groups.at(-1)!.rows.push(r);
  }
  return groups;
}
const planMeals = (parts: MealPart[]) =>
  mealsSummary(
    parts,
    parts.map((p) => p.meals),
  );
const date = (d: Date) => d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
const dateTime = (d: Date) => d.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });

/** Owner only: one guest's visits, spend, favourite dishes, notes, consent and orders. */
export default async function CustomerPage({ params }: PageProps<"/admin/customers/[id]">) {
  await requireUser("OWNER");
  const { id } = await params;
  const customer = await db.customer.findUnique({ where: { id } });
  if (!customer) notFound();

  const [
    orders,
    lines,
    orderTotal,
    switches,
    owedMap,
    passes,
    plans,
    balanceEntries,
    balanceSum,
    lastReminder,
  ] = await Promise.all([
    db.order.findMany({
      where: { customerId: id },
      orderBy: { createdAt: "desc" },
      take: ORDER_ROWS,
      include: {
        items: { select: { itemName: true, quantity: true } },
        bill: {
          select: {
            id: true,
            number: true,
            totalPaise: true,
            differencePaise: true,
            paidAt: true,
            voidedAt: true,
            _count: { select: { orders: { where: { deletedAt: null } } } },
          },
        },
      },
    }),
    db.orderItem.findMany({
      // other items (discounts and such) aren't dishes, so they're never a favourite
      where: { order: { customerId: id }, custom: false },
      select: { itemName: true, quantity: true, order: { select: { status: true } } },
    }),
    db.order.count({ where: { customerId: id } }),
    getEditSwitches(),
    owedByCustomer([id]),
    getPasses({ customerId: id }),
    db.mealPlan.findMany({ where: { active: true }, orderBy: { pricePaise: "asc" } }),
    db.customerBalanceEntry.findMany({
      where: { customerId: id },
      orderBy: { createdAt: "desc" },
      take: BALANCE_ROWS,
      include: {
        bill: { select: { number: true } },
        order: { select: { number: true, status: true, deletedAt: true } },
        deletedBy: { select: { name: true } },
      },
    }),
    db.customerBalanceEntry.aggregate({
      where: { customerId: id, ...COUNTED_BALANCE },
      _sum: { amountPaise: true },
    }),
    db.whatsAppMessage.findFirst({
      where: { customerId: id, kind: "DUE_REMINDER", status: { not: "FAILED" } },
      orderBy: { createdAt: "desc" },
      select: { createdAt: true, auto: true },
    }),
  ]);
  const balance = balanceSum._sum.amountPaise ?? 0;
  // the balance after each entry, worked back from today's (newest first); uncounted ones change nothing
  const counted = (e: (typeof balanceEntries)[number]) =>
    !e.deletedAt && !(e.order && (e.order.deletedAt || e.order.status === "CANCELLED"));
  const balanceRows: ((typeof balanceEntries)[number] & { after: number; counted: boolean })[] = [];
  for (let i = 0, after = balance; i < balanceEntries.length; i++) {
    const e = balanceEntries[i];
    balanceRows.push({ ...e, after, counted: counted(e) });
    if (counted(e)) after -= e.amountPaise;
  }
  const dueBills = balance < 0 ? await shortBillsDue([id]) : new Map<string, number>();
  // what makes up "Still to pay": unpaid bills (paid with Record payment) and orders not billed yet
  const unpaidOrders = owedMap.get(id)
    ? await db.order.findMany({
        where: { ...owedOrdersWhere(), customerId: id },
        orderBy: { number: "asc" },
        select: {
          number: true,
          totalPaise: true,
          bill: { select: { id: true, number: true, totalPaise: true, payLaterAt: true } },
        },
      })
    : [];
  const unpaidBills = [
    ...new Map(unpaidOrders.filter((o) => o.bill).map((o) => [o.bill!.id, o.bill!])).values(),
  ];
  const unbilled = unpaidOrders.filter((o) => !o.bill);
  const today = todayKey();
  const shortDay = (d: string) =>
    new Date(`${d}T12:00:00`).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
  const owes = owedMap.get(id);
  const reminderSettings = await getReminderSettings();
  const waState = customer.whatsappOptOutAt ? "stopped" : customer.remindersPaused ? "paused" : "on";
  const nextReminder = nextScheduled(reminderSettings, new Date());
  const favourites = favouriteItems(lines.map((l) => ({ ...l, status: l.order.status })));
  const average = customer.orderCount > 0 ? Math.round(customer.totalSpendPaise / customer.orderCount) : 0;

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <Button asChild variant="ghost" size="sm" className="-ml-2 rounded-full">
        <Link href="/admin/customers">
          <ArrowLeft data-icon="inline-start" /> Customers
        </Link>
      </Button>

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">{customer.name}</h1>
          <p className="tabular text-muted-foreground">
            <a href={`tel:+91${customer.phone}`} className="hover:underline">
              {customer.phone}
            </a>
            {customer.email && ` · ${customer.email}`}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <Button
            asChild
            className="rounded-full bg-cta font-bold text-cta-foreground hover:bg-hh-orange-light"
          >
            <Link href={`/admin/counter-order?customer=${customer.id}`}>
              <Plus data-icon="inline-start" /> New order
            </Link>
          </Button>
          {switches.customers && (
            <EditCustomerButton
              customer={{
                id: customer.id,
                name: customer.name,
                phone: customer.phone,
                email: customer.email,
              }}
            />
          )}
          {customer.marketingConsent ? (
            <>
              <span className="rounded-full bg-secondary px-3 py-1 font-semibold text-secondary-foreground">
                Offers OK{customer.consentAt && ` since ${date(customer.consentAt)}`}
              </span>
              <StopOffersButton id={customer.id} name={customer.name} />
            </>
          ) : (
            <span className="rounded-full bg-muted px-3 py-1 text-muted-foreground">No offers</span>
          )}
        </div>
      </div>

      {owes && (
        <div
          role="status"
          className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-3xl border border-hh-orange/40 bg-hh-orange/10 px-4 py-3"
        >
          <CircleAlert className="size-5 shrink-0 text-brand-text" aria-hidden />
          <p className="flex-1 text-sm">
            <span className="font-semibold">
              Still to pay: <span className="tabular">{formatINR(toRupees(owes.paise))}</span>
            </span>{" "}
            · {owes.orders} unpaid {owes.orders === 1 ? "order" : "orders"} from earlier days or on pay later
            {balance < 0 && (
              <>
                {" "}
                · plus <span className="tabular font-semibold">{formatINR(toRupees(-balance))}</span> from
                paying less
              </>
            )}
          </p>
          <Button asChild size="sm" variant="outline" className="rounded-full">
            <Link href={`/admin/orders?q=${customer.phone}&pay=OWED`}>Show what they owe</Link>
          </Button>
          {/* paying these clears "Still to pay" – the balance below is only money paid more or less */}
          {(unpaidBills.length > 0 || unbilled.length > 0) && (
            <ul className="w-full divide-y divide-hh-orange/20 rounded-2xl bg-background/60 text-sm">
              {unpaidBills.map((b) => (
                <li key={b.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2">
                  <span className="font-semibold">Bill #{b.number}</span>
                  <span className="text-muted-foreground">{b.payLaterAt ? "pay later" : "not paid"}</span>
                  <span className="ml-auto tabular font-semibold">{formatINR(toRupees(b.totalPaise))}</span>
                  <RecordPaymentButton bill={{ id: b.id, number: b.number, totalPaise: b.totalPaise }} />
                </li>
              ))}
              {unbilled.map((o) => (
                <li key={o.number} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2">
                  <span className="font-semibold">Order #{o.number}</span>
                  <span className="text-muted-foreground">not billed yet – bill it in Order history</span>
                  <span className="ml-auto tabular font-semibold">{formatINR(toRupees(o.totalPaise))}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <section
        aria-labelledby="wa-h"
        className={cn(
          "flex flex-wrap items-center gap-x-4 gap-y-3 rounded-3xl border-2 px-4 py-4 shadow-sm",
          waState === "on" &&
            "border-hh-green/60 bg-hh-green/10 dark:border-hh-green-light dark:bg-hh-green/30 dark:shadow-hh-green/20",
          waState === "paused" && "border-hh-orange/50 bg-hh-orange/10",
          waState === "stopped" && "border-border bg-muted",
        )}
      >
        <span
          className={cn(
            "flex size-11 shrink-0 items-center justify-center rounded-full text-white",
            waState === "stopped" ? "bg-muted-foreground" : "bg-hh-green",
          )}
          aria-hidden
        >
          <MessageCircle className="size-6" />
        </span>
        <div className="min-w-0 flex-1 space-y-1 text-sm">
          <div className="flex flex-wrap items-center gap-2">
            <h2 id="wa-h" className="text-base font-bold">
              WhatsApp
            </h2>
            <span
              className={cn(
                "rounded-full px-2.5 py-0.5 text-xs font-semibold",
                waState === "on" && "bg-hh-green text-white",
                waState === "paused" && "bg-hh-orange text-black",
                waState === "stopped" && "bg-destructive/10 text-destructive",
              )}
            >
              {waState === "on"
                ? WA_FREQUENCY[reminderSettings.frequency]
                : waState === "paused"
                  ? "Paused"
                  : "Replied STOP"}
            </span>
          </div>
          <p>
            {waState === "stopped"
              ? `Replied STOP on ${date(customer.whatsappOptOutAt!)} – no bills or reminders on WhatsApp until they send START.`
              : waState === "paused"
                ? `Due reminders are paused for this guest.${customer.waBillsPaused ? "" : " Bills are still sent."}`
                : owes
                  ? nextReminder
                    ? `${formatINR(toRupees(owes.paise))} still to pay goes in the next reminder: ${dateTime(nextReminder)}.`
                    : `${formatINR(toRupees(owes.paise))} still to pay. Scheduled reminders are off in Settings – send one now.`
                  : balance < 0
                    ? `Owes ${formatINR(toRupees(-balance))} from paying less (see Balance below) – reminders only cover unpaid bills.`
                    : "All paid up – nothing to remind them about."}
          </p>
          {owes && balance < 0 && waState !== "stopped" && (
            <p className="font-semibold">
              Also owes {formatINR(toRupees(-balance))} from paying less (see Balance) – not in reminders.
            </p>
          )}
          {waState !== "stopped" && customer.waBillsPaused && (
            <p className="font-semibold">Bills aren&apos;t sent on WhatsApp to this guest.</p>
          )}
          {lastReminder && (
            <p className="text-xs text-muted-foreground">
              Last reminder: {dateTime(lastReminder.createdAt)}
              {lastReminder.auto ? " (scheduled)" : ""}
            </p>
          )}
        </div>
        {waState !== "stopped" && (
          <div className="flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-2 text-sm font-semibold">
              <BillsSwitch customer={{ id: customer.id, on: !customer.waBillsPaused }} />
              Bills
            </label>
            <label className="flex items-center gap-2 text-sm font-semibold">
              <RemindersSwitch customer={{ id: customer.id, on: !customer.remindersPaused }} />
              Reminders
            </label>
            {owes && <SendReminderButton customer={{ id: customer.id, name: customer.name }} prominent />}
          </div>
        )}
      </section>

      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          ["Visits", String(customer.orderCount)],
          ["Total spend", formatINR(toRupees(customer.totalSpendPaise))],
          ["Average bill", formatINR(toRupees(average))],
          ["Customer since", date(customer.firstVisitAt)],
        ].map(([k, v]) => (
          <div key={k} className="rounded-2xl border border-border bg-card px-4 py-3">
            <dt className="text-xs text-muted-foreground">{k}</dt>
            <dd className="tabular text-xl font-bold">{v}</dd>
          </div>
        ))}
      </dl>

      <div className="grid gap-4 md:grid-cols-2">
        <section className="rounded-3xl border border-border bg-card p-4" aria-labelledby="fav-h">
          <h2 id="fav-h" className="mb-2 font-bold">
            Favourites
          </h2>
          {favourites.length === 0 ? (
            <p className="text-sm text-muted-foreground">No orders yet.</p>
          ) : (
            <ol className="space-y-1 text-sm">
              {favourites.map((f) => (
                <li key={f.name} className="flex gap-2">
                  <span className="w-8 shrink-0 tabular font-bold text-brand-text">{f.quantity}×</span>
                  {f.name}
                </li>
              ))}
            </ol>
          )}
          <p className="mt-3 text-xs text-muted-foreground">Last visit {date(customer.lastVisitAt)}</p>
        </section>
        <section className="rounded-3xl border border-border bg-card p-4" aria-labelledby="notes-h">
          <h2 id="notes-h" className="mb-2 font-bold">
            Staff notes
          </h2>
          <CustomerNotesForm id={customer.id} notes={customer.notes} />
        </section>
      </div>

      <section className="rounded-3xl border border-border bg-card p-4" aria-labelledby="balance-h">
        <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="balance-h" className="font-bold">
            Balance
          </h2>
          <p
            className={
              balanceState(balance) === "credit"
                ? "text-lg font-bold text-hh-green dark:text-hh-green-light"
                : balanceState(balance) === "owes"
                  ? "text-lg font-bold text-brand-text"
                  : "text-lg font-bold text-muted-foreground"
            }
          >
            {balanceState(balance) === "credit"
              ? `Credit ${formatINR(toRupees(balance))} – paid extra`
              : balanceState(balance) === "owes"
                ? `Owes ${formatINR(toRupees(-balance))} – paid less`
                : "Settled – ₹0"}
          </p>
        </div>
        <div className="mb-3">
          <ClearBalanceButton customerId={customer.id} balance={balance} />
        </div>
        <p className="mb-3 text-xs text-muted-foreground">
          Money paid more or less than a bill. Paid it all? Tap the button above. Or on their next visit, the
          bill shows &ldquo;Add owed&rdquo; / &ldquo;Use credit&rdquo;. Part payments or advances: add an
          entry by hand below.
        </p>
        {balanceRows.length > 0 && (
          <div className="mb-4 overflow-hidden rounded-2xl border border-border">
            <div className="hidden grid-cols-[8.5rem_1fr_6rem_7.5rem] gap-3 bg-muted/60 px-3 py-1.5 text-xs font-semibold text-muted-foreground sm:grid">
              <span>When</span>
              <span>What</span>
              <span className="text-right">Amount</span>
              <span className="text-right">Balance after</span>
            </div>
            {byMonth(balanceRows, (e) => e.createdAt).map((m, i) => (
              <MonthGroup
                key={m.key}
                open={i === 0}
                label={m.label}
                meta={`${m.rows.length} ${m.rows.length === 1 ? "entry" : "entries"}`}
                right={`End of month: ${afterWords(m.rows[0].after)}`}
              >
                <BalanceRows rows={m.rows} />
              </MonthGroup>
            ))}
          </div>
        )}
        <details className="rounded-2xl border border-dashed border-border">
          <summary className="cursor-pointer px-3 py-2 text-sm font-semibold">+ Add an entry by hand</summary>
          <div className="border-t border-border p-3">
            <BalanceEntryForm customerId={customer.id} />
          </div>
        </details>
      </section>

      <section className="rounded-3xl border border-border bg-card p-4" aria-labelledby="pass-h">
        <h2 id="pass-h" className="mb-2 font-bold">
          Meal pass
        </h2>
        {passes.length > 0 && (
          <ul className="mb-4 divide-y divide-border rounded-2xl border border-border">
            {passes.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2 text-sm">
                <span className="font-semibold">
                  #{p.number} {p.planName}
                </span>
                <span
                  className={
                    p.status === "active"
                      ? "rounded-full bg-hh-green/15 px-2 py-0.5 text-xs font-bold text-hh-green capitalize dark:text-hh-green-light"
                      : "rounded-full bg-muted px-2 py-0.5 text-xs font-bold text-muted-foreground capitalize"
                  }
                >
                  {p.status}
                </span>
                <span className="order-last min-w-0 basis-full text-muted-foreground sm:order-none sm:flex-1 sm:basis-0">
                  {mealsSummary(p.parts, p.left)} left · {shortDay(p.startsOn)} – {shortDay(p.endsOn)}
                </span>
                <span className="ml-auto tabular">{formatINR(toRupees(p.pricePaise))}</span>
              </li>
            ))}
          </ul>
        )}
        <SellPassForm
          customerId={customer.id}
          today={today}
          plans={plans.map((p) => ({
            id: p.id,
            name: p.name,
            pricePaise: p.pricePaise,
            summary: `${planMeals(readParts(p.parts))} in ${p.days} days`,
          }))}
        />
      </section>

      <section className="space-y-3" aria-labelledby="orders-h">
        <div className="flex items-center justify-between gap-3">
          <h2 id="orders-h" className="text-lg font-bold">
            Orders <span className="text-sm font-normal text-muted-foreground">{orderTotal}</span>
          </h2>
          <Button asChild size="sm" variant="outline" className="rounded-full">
            <Link href={`/admin/orders?q=${customer.phone}`}>
              <ReceiptText data-icon="inline-start" /> Full history
            </Link>
          </Button>
        </div>
        {orders.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-border p-5 text-center text-sm text-muted-foreground">
            No orders yet.
          </p>
        ) : (
          <div className="overflow-hidden rounded-3xl border border-border bg-card">
            {byMonth(orders, (o) => o.createdAt).map((m, i) => (
              <MonthGroup
                key={m.key}
                open={i === 0}
                label={m.label}
                meta={`${m.rows.length} ${m.rows.length === 1 ? "order" : "orders"}`}
                right={formatINR(
                  toRupees(
                    m.rows
                      .filter((o) => !o.deletedAt && o.status !== "CANCELLED")
                      .reduce((n, o) => n + o.totalPaise, 0),
                  ),
                )}
              >
                <ul className="divide-y divide-border">
                  {m.rows.map((o) => (
                    <li key={o.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3 text-sm">
                      <Link href={`/admin/orders?q=${o.number}`} className="font-semibold hover:underline">
                        #{o.number}
                      </Link>
                      <span className="text-muted-foreground">
                        {o.type === "PARCEL" ? "Takeaway" : "Dine-in"}
                      </span>
                      <span className="text-muted-foreground">{dateTime(o.createdAt)}</span>
                      <OrderStatusBadge status={o.status} />
                      <span className="min-w-0 flex-1 truncate text-muted-foreground">
                        {o.items.map((i) => `${i.quantity}× ${i.itemName}`).join(", ")}
                      </span>
                      <span className="text-right">
                        <span className="block tabular font-semibold">
                          {formatINR(toRupees(o.totalPaise))}
                        </span>
                        {o.bill && (
                          <PaidDifference
                            bill={{ ...o.bill, orders: o.bill._count.orders }}
                            duePaise={dueBills.get(o.bill.id)}
                            className="text-xs"
                          />
                        )}
                      </span>
                      {o.bill && <span className="text-xs text-muted-foreground">Bill #{o.bill.number}</span>}
                    </li>
                  ))}
                </ul>
              </MonthGroup>
            ))}
          </div>
        )}
        {orderTotal > ORDER_ROWS && (
          <p className="text-center text-xs text-muted-foreground">
            Showing the latest {ORDER_ROWS} – see Full history for the rest.
          </p>
        )}
      </section>

      <section className="flex flex-wrap items-center justify-between gap-3 rounded-3xl border border-dashed border-destructive/40 p-4">
        <p className="text-sm text-muted-foreground">
          The guest can ask for their data to be deleted (see the privacy note).
        </p>
        <DeleteCustomerButton id={customer.id} name={customer.name} />
      </section>
    </div>
  );
}

const signed = (paise: number) => `${paise > 0 ? "+" : "−"}${formatINR(toRupees(Math.abs(paise)))}`;
const afterWords = (paise: number) =>
  paise > 0
    ? `Credit ${formatINR(toRupees(paise))}`
    : paise < 0
      ? `Owes ${formatINR(toRupees(-paise))}`
      : "₹0";

/** Balance entries as rows: when, what (and its bill, order, method, note), amount, and the balance after. */
function BalanceRows({
  rows,
}: {
  rows: {
    id: string;
    createdAt: Date;
    kind: BalanceKind;
    amountPaise: number;
    method: PaymentMethod | null;
    note: string | null;
    bill: { number: number } | null;
    order: { number: number } | null;
    deletedAt: Date | null;
    deletedBy: { name: string } | null;
    after: number;
    counted: boolean;
  }[];
}) {
  return (
    <ul className="divide-y divide-border">
      {rows.map((e) => (
        <li
          key={e.id}
          className={cn(
            "grid grid-cols-[1fr_auto] gap-x-3 gap-y-0.5 px-3 py-2 text-sm sm:grid-cols-[8.5rem_1fr_6rem_7.5rem] sm:items-center",
            e.deletedAt && "bg-destructive/10",
          )}
        >
          <span className="text-xs text-muted-foreground sm:order-none">{dateTime(e.createdAt)}</span>
          <span className="row-span-2 self-center text-right sm:order-3 sm:row-span-1">
            <span
              className={cn(
                "tabular font-semibold",
                e.deletedAt
                  ? "text-destructive line-through"
                  : !e.counted
                    ? "text-muted-foreground line-through"
                    : e.amountPaise > 0
                      ? "text-hh-green dark:text-hh-green-light"
                      : "text-brand-text",
              )}
            >
              {signed(e.amountPaise)}
            </span>
            <span className="block text-xs text-muted-foreground sm:hidden">→ {afterWords(e.after)}</span>
          </span>
          <span className="min-w-0 sm:order-2">
            {e.deletedAt && (
              <span className="mr-1.5 rounded-full bg-destructive px-2 py-0.5 text-xs font-semibold text-white">
                Deleted
              </span>
            )}
            <span className={cn("font-semibold", e.deletedAt && "text-destructive line-through")}>
              {BALANCE_KIND_LABEL[e.kind]}
            </span>
            <span className={e.deletedAt ? "text-destructive" : "text-muted-foreground"}>
              {[
                e.bill && ` · bill #${e.bill.number}`,
                e.order && ` · order #${e.order.number}`,
                e.method && ` · ${PAYMENT_LABEL[e.method]}`,
                e.note && ` · ${e.note}`,
                e.deletedAt
                  ? ` · deleted ${dateTime(e.deletedAt)}${e.deletedBy ? ` by ${e.deletedBy.name}` : ""} – not counted`
                  : !e.counted && " · order cancelled – not counted",
              ]
                .filter(Boolean)
                .join("")}
            </span>
            {/* hand entries only – ones from a bill are changed through the bill */}
            {!e.deletedAt && !e.bill && !e.order && e.kind !== "SETTLED" && (
              <DeleteBalanceButton
                id={e.id}
                label={`${BALANCE_KIND_LABEL[e.kind]} ${signed(e.amountPaise)}`}
              />
            )}
          </span>
          <span className="hidden text-right tabular text-xs text-muted-foreground sm:order-4 sm:block">
            {afterWords(e.after)}
          </span>
        </li>
      ))}
    </ul>
  );
}

/** A month heading that folds its rows away; `right` sits at the end of the heading. */
function MonthGroup({
  open,
  label,
  meta,
  right,
  children,
}: {
  open: boolean;
  label: string;
  meta: string;
  right: string;
  children: React.ReactNode;
}) {
  return (
    <details open={open} className="group border-t border-border first:border-t-0">
      <summary className="flex cursor-pointer list-none flex-wrap items-center gap-x-2 bg-muted/40 px-3 py-2 text-sm hover:bg-muted/70 [&::-webkit-details-marker]:hidden">
        <ChevronRight className="size-4 shrink-0 transition-transform group-open:rotate-90" aria-hidden />
        <span className="font-semibold">{label}</span>
        <span className="text-muted-foreground">{meta}</span>
        <span className="ml-auto tabular text-xs font-semibold text-muted-foreground">{right}</span>
      </summary>
      {children}
    </details>
  );
}
