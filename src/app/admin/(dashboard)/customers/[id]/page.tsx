import { ArrowLeft, CircleAlert, MessageCircle, Plus, ReceiptText } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  CustomerNotesForm,
  DeleteCustomerButton,
  StopOffersButton,
} from "@/components/admin/customer-profile-actions";
import { EditCustomerButton } from "@/components/admin/customer-edit-dialog";
import { OrderStatusBadge } from "@/components/admin/order-status-badge";
import { RemindersSwitch, SendReminderButton } from "@/components/admin/whatsapp/wa-buttons";
import { Button } from "@/components/ui/button";
import { requireUser } from "@/lib/auth/dal";
import { favouriteItems } from "@/lib/customer-stats";
import { getEditSwitches } from "@/lib/data/edit-switches";
import { owedByCustomer } from "@/lib/data/owed";
import { db } from "@/lib/db";
import { formatINR } from "@/lib/format";
import { toRupees } from "@/lib/money";
import { nextScheduled } from "@/lib/reminder-schedule";
import { cn } from "@/lib/utils";
import { getReminderSettings } from "@/lib/whatsapp/reminders";

export const metadata = { title: "Customer" };

const WA_FREQUENCY = {
  WEEKLY: "On · every week",
  MONTHLY: "On · every month",
  OFF: "Scheduled reminders off",
};

const RECENT = 20;
const date = (d: Date) => d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
const dateTime = (d: Date) => d.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });

/** Owner only: one guest's visits, spend, favourite dishes, notes, consent and orders. */
export default async function CustomerPage({ params }: PageProps<"/admin/customers/[id]">) {
  await requireUser("OWNER");
  const { id } = await params;
  const customer = await db.customer.findUnique({ where: { id } });
  if (!customer) notFound();

  const [orders, lines, orderTotal, switches, owedMap, lastReminder] = await Promise.all([
    db.order.findMany({
      where: { customerId: id },
      orderBy: { createdAt: "desc" },
      take: RECENT,
      include: { items: { select: { itemName: true, quantity: true } }, bill: { select: { number: true } } },
    }),
    db.orderItem.findMany({
      // other items (discounts and such) aren't dishes, so they're never a favourite
      where: { order: { customerId: id }, custom: false },
      select: { itemName: true, quantity: true, order: { select: { status: true } } },
    }),
    db.order.count({ where: { customerId: id } }),
    getEditSwitches(),
    owedByCustomer([id]),
    db.whatsAppMessage.findFirst({
      where: { customerId: id, kind: "DUE_REMINDER", status: { not: "FAILED" } },
      orderBy: { createdAt: "desc" },
      select: { createdAt: true, auto: true },
    }),
  ]);
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
          </p>
          <Button asChild size="sm" variant="outline" className="rounded-full">
            <Link href={`/admin/orders?q=${customer.phone}&pay=PENDING`}>Show unpaid orders</Link>
          </Button>
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
              WhatsApp reminders
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
                ? "Due reminders are paused for this guest. Bills are still sent."
                : owes
                  ? nextReminder
                    ? `${formatINR(toRupees(owes.paise))} still to pay goes in the next reminder: ${dateTime(nextReminder)}.`
                    : `${formatINR(toRupees(owes.paise))} still to pay. Scheduled reminders are off in Settings – send one now.`
                  : "All paid up – nothing to remind them about."}
          </p>
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
          <ul className="divide-y divide-border rounded-3xl border border-border bg-card">
            {orders.map((o) => (
              <li key={o.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3 text-sm">
                <Link href={`/admin/orders?q=${o.number}`} className="font-semibold hover:underline">
                  #{o.number}
                </Link>
                <span className="text-muted-foreground">{o.type === "PARCEL" ? "Takeaway" : "Dine-in"}</span>
                <span className="text-muted-foreground">{dateTime(o.createdAt)}</span>
                <OrderStatusBadge status={o.status} />
                <span className="min-w-0 flex-1 truncate text-muted-foreground">
                  {o.items.map((i) => `${i.quantity}× ${i.itemName}`).join(", ")}
                </span>
                <span className="tabular font-semibold">{formatINR(toRupees(o.totalPaise))}</span>
                {o.bill && <span className="text-xs text-muted-foreground">Bill #{o.bill.number}</span>}
              </li>
            ))}
          </ul>
        )}
        {orderTotal > RECENT && (
          <p className="text-center text-xs text-muted-foreground">
            Showing the latest {RECENT} – see Full history for the rest.
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
