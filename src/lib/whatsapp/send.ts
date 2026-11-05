import "server-only";
import { renderToBuffer } from "@react-pdf/renderer";
import { Prisma } from "@/generated/prisma/client";
import {
  type BillDoc,
  BillPdf,
  DuesStatementPdf,
  type PdfCafe,
  PaymentReceiptPdf,
  type ReceiptDoc,
  type StatementDoc,
} from "@/lib/bill-pdf/document";
import { mergeBillLines } from "@/lib/billing";
import { getCafeDetails } from "@/lib/data/menu";
import { owedOrdersWhere } from "@/lib/data/owed";
import { db } from "@/lib/db";
import { publish } from "@/lib/realtime";
import { statementGroups, withShortBills } from "@/lib/dues-statement";
import { balanceOf, shortBillsDue } from "@/lib/data/customer-balance";
import { toRupees } from "@/lib/money";
import { CAFE_TZ, formatINR, startOfCafeDay } from "@/lib/format";
import { payLaterSendAt } from "@/lib/pay-later-notes";
import {
  billMessage,
  dueReminderMessage,
  payLaterMessage,
  paymentReceivedMessage,
  type WaMessage,
  googleReviewUrl,
  waLink,
  welcomeMessage,
} from "./messages";
import { payLaterTemplateReady, paymentTemplateReady, welcomeTemplateReady, whatsapp } from "./index";
import { withLiveText } from "./templates";

// Sending bills and due reminders: build the PDF, send it, and keep every attempt in WhatsAppMessage.

/** `link`: WhatsApp isn't connected – a wa.me link with the text (no PDF) for staff to send by hand. */
export type SendResult = { ok: true } | { ok: false; error: string; link?: string; skipped?: boolean };

type Who = { auto: boolean; byId?: string | null };

const MAX_ATTEMPTS = 3;

const BILLS_OFF = "Bills on WhatsApp are off for this guest (their customer page).";

async function pdfCafe(): Promise<PdfCafe> {
  const c = await getCafeDetails();
  return { name: c.name, tagline: c.tagline, address: c.address, phone: c.phone };
}

const items = (rows: { itemName: string; unitPricePaise: number; quantity: number; addOns: unknown }[]) =>
  rows.map((i) => ({ ...i, addOns: i.addOns as { name: string }[] }));

/** The bill as it goes in the PDF, with the guest it belongs to. */
export async function getBillDoc(billId: string) {
  const bill = await db.bill.findUnique({
    where: { id: billId },
    include: {
      orders: {
        where: { deletedAt: null },
        orderBy: { number: "asc" },
        select: { number: true, customerId: true, customerPhone: true, items: true },
      },
    },
  });
  if (!bill) return null;
  const doc: BillDoc = {
    cafe: await pdfCafe(),
    number: bill.number,
    createdAt: bill.createdAt,
    type: bill.type,
    guestName: bill.customerName,
    orderNumbers: bill.orders.map((o) => o.number),
    lines: mergeBillLines(bill.orders.flatMap((o) => items(o.items))),
    subtotalPaise: bill.subtotalPaise,
    taxBasisPoints: bill.taxBasisPoints,
    taxPaise: bill.taxPaise,
    totalPaise: bill.totalPaise,
    status: bill.paidAt
      ? { kind: "PAID", method: bill.paymentMethod, at: bill.paidAt }
      : bill.payLaterAt
        ? { kind: "PAY_LATER" }
        : { kind: "UNPAID" },
  };
  const customerId =
    bill.orders.find((o) => o.customerPhone === bill.customerPhone)?.customerId ??
    bill.orders.find((o) => o.customerId)?.customerId ??
    null;
  return { doc, phone: bill.customerPhone, voided: !!bill.voidedAt, customerId };
}

/** Everything a guest still owes, as it goes in the dues statement. */
export async function getStatementDoc(customerId: string) {
  const customer = await db.customer.findUnique({ where: { id: customerId } });
  if (!customer) return null;
  const orders = await db.order.findMany({
    where: { ...owedOrdersWhere(), customerId },
    include: { items: true, bill: { select: { number: true, createdAt: true } } },
  });
  const unpaid = statementGroups(
    orders.map((o) => ({
      number: o.number,
      createdAt: o.createdAt,
      totalPaise: o.totalPaise,
      items: items(o.items),
      bill: o.bill,
    })),
  );
  // plus what they owe from paying less: what's left of each short bill, and any hand-entered amount
  const [balance, due] = await Promise.all([balanceOf(customerId), shortBillsDue([customerId])]);
  const shortBills = due.size
    ? await db.bill.findMany({
        where: { id: { in: [...due.keys()] } },
        include: { orders: { where: { deletedAt: null }, select: { number: true, items: true } } },
      })
    : [];
  const shorts = shortBills.map((b) => ({
    number: b.number,
    createdAt: b.createdAt,
    totalPaise: b.totalPaise,
    paidPaise: b.totalPaise - (due.get(b.id) ?? 0),
    leftPaise: due.get(b.id) ?? 0,
    orderNumbers: b.orders.map((o) => o.number),
    items: items(b.orders.flatMap((o) => o.items)),
  }));
  const owedOnBalance = Math.max(0, -balance);
  const { groups, totalPaise } = withShortBills(
    unpaid,
    shorts,
    owedOnBalance - shorts.reduce((n, b) => n + b.leftPaise, 0),
    (paise) => formatINR(toRupees(paise)),
  );
  const doc: StatementDoc = {
    cafe: await pdfCafe(),
    guestName: customer.name,
    asOf: new Date(),
    groups,
    totalPaise,
  };
  return { doc, customer, orders: orders.length + shorts.length };
}

/** Sends one message with its PDF and records how it went on the log row. */
async function deliver(
  logId: string,
  phone: string,
  msg: WaMessage,
  pdf: () => Promise<Buffer>,
  filename: string,
) {
  const wa = whatsapp();
  if (!wa) return { ok: false as const, error: "WhatsApp isn't connected." };
  let result: SendResult;
  try {
    const res = await wa.sendTemplateWithPdf(phone, msg, { bytes: new Uint8Array(await pdf()), filename });
    if (res.ok) {
      await db.whatsAppMessage.update({
        where: { id: logId },
        data: { status: "SENT", waId: res.id, error: null },
      });
      return { ok: true as const };
    }
    result = { ok: false, error: res.error };
  } catch (e) {
    console.error("WhatsApp send failed", e);
    result = { ok: false, error: "Couldn't make the PDF or send it – see the server log." };
  }
  await db.whatsAppMessage.update({ where: { id: logId }, data: { status: "FAILED", error: result.error } });
  return result;
}

/** Sends a bill PDF to the guest on the bill. */
export async function sendBill(billId: string, who: Who): Promise<SendResult> {
  const found = await getBillDoc(billId);
  if (!found) return { ok: false, error: "Bill not found." };
  const { doc, phone, voided, customerId } = found;
  if (voided) return { ok: false, error: `Bill #${doc.number} is void.` };
  if (!phone) return { ok: false, error: "There's no phone number on this bill.", skipped: true };
  const guest = customerId
    ? await db.customer.findUnique({
        where: { id: customerId },
        select: { whatsappOptOutAt: true, waBillsPaused: true },
      })
    : null;
  if (guest?.whatsappOptOutAt)
    return { ok: false, error: "This guest replied STOP – no WhatsApp messages.", skipped: true };
  if (guest?.waBillsPaused) return { ok: false, error: BILLS_OFF, skipped: true };

  const msg = await withLiveText(
    billMessage({
      guestName: doc.guestName,
      cafeName: doc.cafe.name,
      number: doc.number,
      totalPaise: doc.totalPaise,
      status:
        doc.status.kind === "PAY_LATER"
          ? { kind: "PAY_LATER" }
          : { kind: "PAID", method: doc.status.kind === "PAID" ? doc.status.method : null },
    }),
  );
  if (!whatsapp())
    return { ok: false, error: "WhatsApp isn't connected yet.", link: waLink(phone, msg.text) };

  const log = await db.whatsAppMessage.create({
    data: {
      kind: "BILL",
      customerId,
      billId,
      phone,
      guestName: doc.guestName,
      text: msg.text,
      amountPaise: doc.totalPaise,
      auto: who.auto,
      sentById: who.byId ?? null,
    },
  });
  return deliver(log.id, phone, msg, () => renderToBuffer(BillPdf({ bill: doc })), `Bill-${doc.number}.pdf`);
}

/**
 * Takes the log row for this guest's reminder (or welcome) in `periodKey`: a new one, or a failed one
 * to try again. Null = already sent (or being sent) this period.
 */
async function claimPeriod(
  customerId: string,
  periodKey: string,
  data: Prisma.WhatsAppMessageUncheckedCreateInput,
) {
  try {
    return await db.whatsAppMessage.create({ data: { ...data, periodKey } });
  } catch (e) {
    if (!(e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002")) throw e;
  }
  // only one run can take it back: a FAILED row, or one stuck in SENDING (the server stopped mid-send)
  const stuck = new Date(Date.now() - 30 * 60_000);
  const retried = await db.whatsAppMessage.updateManyAndReturn({
    where: {
      customerId,
      kind: data.kind,
      periodKey,
      attempts: { lt: MAX_ATTEMPTS },
      OR: [{ status: "FAILED" }, { status: "SENDING", updatedAt: { lt: stuck } }],
    },
    data: { ...data, status: "SENDING", error: null, attempts: { increment: 1 } },
  });
  return retried[0] ?? null;
}

/** Sends a guest their dues: the amount in the message and the statement PDF. */
export async function sendDueReminder(
  customerId: string,
  who: Who & { periodKey?: string },
): Promise<SendResult> {
  const found = await getStatementDoc(customerId);
  if (!found) return { ok: false, error: "Customer not found." };
  const { doc, customer, orders } = found;
  if (customer.whatsappOptOutAt)
    return { ok: false, error: `${customer.name} replied STOP – no WhatsApp messages.`, skipped: true };
  if (doc.totalPaise <= 0)
    return { ok: false, error: `${customer.name} doesn't owe anything now.`, skipped: true };

  const msg = await withLiveText(
    dueReminderMessage({
      guestName: customer.name,
      cafeName: doc.cafe.name,
      duePaise: doc.totalPaise,
      orders,
    }),
  );
  if (!whatsapp())
    return { ok: false, error: "WhatsApp isn't connected yet.", link: waLink(customer.phone, msg.text) };

  const data = {
    kind: "DUE_REMINDER" as const,
    customerId,
    phone: customer.phone,
    guestName: customer.name,
    text: msg.text,
    amountPaise: doc.totalPaise,
    auto: who.auto,
    sentById: who.byId ?? null,
  };
  const log = who.periodKey
    ? await claimPeriod(customerId, who.periodKey, data)
    : await db.whatsAppMessage.create({ data });
  if (!log) return { ok: false, error: "Already reminded this period.", skipped: true };

  const day = new Date().toISOString().slice(0, 10);
  return deliver(
    log.id,
    customer.phone,
    msg,
    () => renderToBuffer(DuesStatementPdf({ doc })),
    `Dues-${day}.pdf`,
  );
}

/**
 * A guest's bills put on pay later (one café day): one short thank-you with the total added to their
 * account – no PDF (the weekly reminder carries the statement). Bills paid since are left out.
 */
export async function sendPayLaterNote(billIds: string[], who: Who): Promise<SendResult> {
  const bills = await db.bill.findMany({
    where: { id: { in: billIds }, voidedAt: null, paidAt: null, payLaterAt: { not: null } },
    orderBy: { number: "asc" },
    include: { orders: { select: { customerId: true, customerPhone: true } } },
  });
  if (bills.length === 0) return { ok: false, error: "Those bills aren't on pay later now.", skipped: true };
  const phone = bills.find((b) => b.customerPhone)?.customerPhone;
  if (!phone) return { ok: false, error: "There's no phone number on this bill.", skipped: true };
  const orders = bills.flatMap((b) => b.orders);
  const customerId =
    orders.find((o) => o.customerPhone === phone)?.customerId ??
    orders.find((o) => o.customerId)?.customerId ??
    null;
  const customer = customerId ? await db.customer.findUnique({ where: { id: customerId } }) : null;
  if (customer?.whatsappOptOutAt)
    return { ok: false, error: `${customer.name} replied STOP – no WhatsApp messages.`, skipped: true };
  if (customer?.waBillsPaused) return { ok: false, error: BILLS_OFF, skipped: true };

  const guestName = customer?.name ?? bills[0].customerName;
  const totalPaise = bills.reduce((n, b) => n + b.totalPaise, 0);
  const msg = await withLiveText(
    payLaterMessage({ guestName, cafeName: (await getCafeDetails()).name, totalPaise }),
  );
  const wa = whatsapp();
  if (!wa) return { ok: false, error: "WhatsApp isn't connected yet.", link: waLink(phone, msg.text) };

  const log = await db.whatsAppMessage.create({
    data: {
      kind: "PAY_LATER",
      customerId,
      billId: bills[0].id,
      billIds: bills.map((b) => b.id),
      phone,
      guestName,
      text: msg.text,
      amountPaise: totalPaise,
      auto: who.auto,
      sentById: who.byId ?? null,
    },
  });
  const res = await wa.sendTemplate(phone, msg);
  await db.whatsAppMessage.update({
    where: { id: log.id },
    data: res.ok ? { status: "SENT", waId: res.id } : { status: "FAILED", error: res.error },
  });
  return res.ok ? { ok: true } : { ok: false, error: res.error };
}

export type PayLaterRun =
  | { ran: false; reason: string }
  | { ran: true; sent: number; failed: number; skipped: number; errors: string[] };

/**
 * Called with the reminders (every hour): once it's 30 minutes past closing, each guest who
 * put bills on pay later that day – and hasn't paid them since – gets one thank-you for all of them.
 * Looks at today and yesterday (hours past midnight); a bill already in a note is never sent again.
 */
export async function runPayLaterNotes(now = new Date()): Promise<PayLaterRun> {
  if (!whatsapp()) return { ran: false, reason: "WhatsApp isn't connected (WHATSAPP_TOKEN)." };
  if (!payLaterTemplateReady()) return { ran: false, reason: "WHATSAPP_PAYLATER_TEMPLATE isn't set." };
  const settings = await db.cafeSettings.findUnique({ where: { id: 1 }, select: { waBillsEnabled: true } });
  if (!settings?.waBillsEnabled) return { ran: false, reason: "Bills on WhatsApp are off in Settings." };
  const { hours } = await getCafeDetails();
  const today = startOfCafeDay(now);
  const days = [new Date(today.getTime() - 86_400_000), today].filter((d) => payLaterSendAt(hours, d) <= now);
  if (days.length === 0) return { ran: false, reason: "Not 30 minutes past closing yet." };

  const run = { ran: true as const, sent: 0, failed: 0, skipped: 0, errors: [] as string[] };
  for (const day of days) {
    const bills = await db.bill.findMany({
      where: {
        paidAt: null,
        voidedAt: null,
        customerPhone: { not: null },
        payLaterAt: { gte: day, lt: new Date(day.getTime() + 86_400_000) },
      },
      select: { id: true, customerPhone: true },
    });
    if (bills.length === 0) continue;
    const ids = bills.map((b) => b.id);
    const noted = await db.whatsAppMessage.findMany({
      where: { kind: "PAY_LATER", OR: [{ billIds: { hasSome: ids } }, { billId: { in: ids } }] },
      select: { billId: true, billIds: true },
    });
    const done = new Set(noted.flatMap((m) => [...m.billIds, ...(m.billId ? [m.billId] : [])]));
    const byGuest = new Map<string, string[]>();
    for (const b of bills)
      if (!done.has(b.id)) byGuest.set(b.customerPhone!, [...(byGuest.get(b.customerPhone!) ?? []), b.id]);
    for (const guestBills of byGuest.values()) {
      const res = await sendPayLaterNote(guestBills, { auto: true });
      if (res.ok) run.sent++;
      else if (res.skipped) run.skipped++;
      else {
        run.failed++;
        run.errors.push(res.error);
      }
    }
  }
  if (run.sent || run.failed) await publish({ type: "resync" });
  return run;
}

/**
 * Pay-later bills paid off (one or several at once): one message with how much came in and what's
 * still due, and a receipt PDF of those bills. Sent only once its template is set in .env.
 */
export async function sendPaymentReceived(billIds: string[], who: Who): Promise<SendResult> {
  const bills = await db.bill.findMany({
    where: { id: { in: billIds }, voidedAt: null, paidAt: { not: null } },
    orderBy: { number: "asc" },
    include: {
      orders: {
        where: { deletedAt: null },
        include: { items: true },
      },
    },
  });
  if (bills.length === 0) return { ok: false, error: "Those bills aren't paid.", skipped: true };
  const phone = bills.find((b) => b.customerPhone)?.customerPhone;
  if (!phone) return { ok: false, error: "There's no phone number on these bills.", skipped: true };
  const orders = bills.flatMap((b) => b.orders);
  const customerId =
    orders.find((o) => o.customerPhone === phone)?.customerId ??
    orders.find((o) => o.customerId)?.customerId ??
    null;
  const customer = customerId ? await db.customer.findUnique({ where: { id: customerId } }) : null;
  if (customer?.whatsappOptOutAt)
    return { ok: false, error: `${customer.name} replied STOP – no WhatsApp messages.`, skipped: true };
  if (customer?.waBillsPaused) return { ok: false, error: BILLS_OFF, skipped: true };

  const { groups } = statementGroups(
    orders.map((o) => ({
      number: o.number,
      createdAt: o.createdAt,
      totalPaise: o.totalPaise,
      items: items(o.items),
      bill: bills.find((b) => b.id === o.billId) ?? null,
    })),
  );
  // the bill totals are what was charged (tax included)
  const receivedPaise = bills.reduce((n, b) => n + b.totalPaise, 0);
  const stillDuePaise = customerId ? ((await getStatementDoc(customerId))?.doc.totalPaise ?? 0) : 0;
  const methods = [...new Set(bills.map((b) => b.paymentMethod))];
  const guestName = customer?.name ?? bills[0].customerName;
  const doc: ReceiptDoc = {
    cafe: await pdfCafe(),
    guestName,
    paidAt: bills.reduce((t, b) => (b.paidAt! > t ? b.paidAt! : t), bills[0].paidAt!),
    method: methods.length === 1 ? methods[0] : null,
    groups: groups.map((g) => ({
      ...g,
      amountPaise: bills.find((b) => `Bill #${b.number}` === g.label)?.totalPaise ?? g.amountPaise,
    })),
    receivedPaise,
    stillDuePaise,
  };
  const msg = await withLiveText(
    paymentReceivedMessage({
      guestName,
      cafeName: doc.cafe.name,
      receivedPaise,
      bills: bills.length,
      stillDuePaise,
    }),
  );
  if (!whatsapp())
    return { ok: false, error: "WhatsApp isn't connected yet.", link: waLink(phone, msg.text) };

  const log = await db.whatsAppMessage.create({
    data: {
      kind: "PAYMENT_RECEIVED",
      customerId,
      billId: bills[0].id,
      billIds: bills.map((b) => b.id),
      phone,
      guestName,
      text: msg.text,
      amountPaise: receivedPaise,
      auto: who.auto,
      sentById: who.byId ?? null,
    },
  });
  const day = new Date().toISOString().slice(0, 10);
  return deliver(log.id, phone, msg, () => renderToBuffer(PaymentReceiptPdf({ doc })), `Receipt-${day}.pdf`);
}

/**
 * After a payment at the counter (one bill, or several pay-later bills at once), when the owner's
 * switch is on and WhatsApp is connected: a bill paid straight away goes as its PDF; pay-later bills
 * being paid off get one "payment received" for all of them. Runs after the response (`after()`).
 */
export async function autoSendPayment(billIds: string[], byId: string) {
  if (!whatsapp()) return;
  const [s, bills] = await Promise.all([
    db.cafeSettings.findUnique({ where: { id: 1 }, select: { waBillsEnabled: true } }),
    db.bill.findMany({ where: { id: { in: billIds } }, select: { id: true, payLaterAt: true } }),
  ]);
  if (!s?.waBillsEnabled) return;
  const later = bills.filter((b) => b.payLaterAt).map((b) => b.id);
  const now = bills.filter((b) => !b.payLaterAt).map((b) => b.id);
  const results = await Promise.all([
    ...now.map((id) => sendBill(id, { auto: true, byId })),
    later.length && paymentTemplateReady() ? sendPaymentReceived(later, { auto: true, byId }) : null,
  ]);
  for (const res of results)
    if (res && !res.ok && !res.skipped) console.warn(`WhatsApp after payment not sent: ${res.error}`);
  // Live orders shows how it went
  await publish({ type: "resync" });
}

/** The welcome goes once per guest – one key for all time. */
const WELCOME_KEY = "first-visit";
/** after the first bill is paid or put on pay later, so it lands once they've eaten (the hourly timer adds up to an hour) */
const WELCOME_DELAY_MS = 60 * 60_000;
/** India time; outside these hours it waits for the morning */
const WELCOME_HOURS = { from: 9, to: 21 };

/** Thanks a first-time guest and asks for a Google review. Once per guest (a failed one may be retried). */
export async function sendWelcome(customerId: string, who: Who): Promise<SendResult> {
  const customer = await db.customer.findUnique({ where: { id: customerId } });
  if (!customer) return { ok: false, error: "Customer not found." };
  if (customer.whatsappOptOutAt)
    return { ok: false, error: `${customer.name} replied STOP – no WhatsApp messages.`, skipped: true };
  const cafe = await getCafeDetails();
  if (!cafe.googlePlaceId)
    return { ok: false, error: "Add the Google Place ID in Settings → Café first.", skipped: true };
  const msg = await withLiveText(
    welcomeMessage({
      guestName: customer.name,
      cafeName: cafe.name,
      reviewUrl: googleReviewUrl(cafe.googlePlaceId),
    }),
  );
  const wa = whatsapp();
  if (!wa)
    return { ok: false, error: "WhatsApp isn't connected yet.", link: waLink(customer.phone, msg.text) };

  const log = await claimPeriod(customerId, WELCOME_KEY, {
    kind: "WELCOME",
    customerId,
    phone: customer.phone,
    guestName: customer.name,
    text: msg.text,
    amountPaise: 0,
    auto: who.auto,
    sentById: who.byId ?? null,
  });
  if (!log) return { ok: false, error: `${customer.name} already got the welcome message.`, skipped: true };
  const res = await wa.sendTemplate(customer.phone, msg);
  await db.whatsAppMessage.update({
    where: { id: log.id },
    data: res.ok ? { status: "SENT", waId: res.id, error: null } : { status: "FAILED", error: res.error },
  });
  return res.ok ? { ok: true } : { ok: false, error: res.error };
}

export type WelcomeRun = PayLaterRun;

const cafeHour = (d: Date) =>
  Number(
    new Intl.DateTimeFormat("en-GB", { hour: "numeric", hourCycle: "h23", timeZone: CAFE_TZ }).format(d),
  );

/**
 * Called with the reminders (every hour): guests whose first visit was in the last two days get
 * the welcome an hour after their first bill (paid or pay later), between 9 am and 9 pm India time.
 * Guests who were customers before never get one (only new records count).
 */
export async function runWelcomes(now = new Date()): Promise<WelcomeRun> {
  if (!whatsapp()) return { ran: false, reason: "WhatsApp isn't connected (WHATSAPP_TOKEN)." };
  if (!welcomeTemplateReady()) return { ran: false, reason: "WHATSAPP_WELCOME_TEMPLATE isn't set." };
  const settings = await db.cafeSettings.findUnique({ where: { id: 1 }, select: { waWelcomeEnabled: true } });
  if (!settings?.waWelcomeEnabled) return { ran: false, reason: "Welcome messages are off in Settings." };
  if (!(await getCafeDetails()).googlePlaceId)
    return { ran: false, reason: "No Google Place ID in Settings." };
  const hour = cafeHour(now);
  if (hour < WELCOME_HOURS.from || hour >= WELCOME_HOURS.to)
    return { ran: false, reason: "Outside 9 am – 9 pm." };

  const before = new Date(now.getTime() - WELCOME_DELAY_MS);
  const billed = {
    voidedAt: null,
    OR: [{ paidAt: { lte: before } }, { payLaterAt: { lte: before } }],
  } satisfies Prisma.BillWhereInput;
  const guests = await db.customer.findMany({
    where: {
      firstVisitAt: { gte: new Date(now.getTime() - 2 * 86_400_000) },
      whatsappOptOutAt: null,
      waMessages: { none: { kind: "WELCOME" } },
      orders: { some: { deletedAt: null, bill: { is: billed } } },
    },
    select: { id: true },
    take: 50,
  });
  const run = { ran: true as const, sent: 0, failed: 0, skipped: 0, errors: [] as string[] };
  for (const g of guests) {
    const res = await sendWelcome(g.id, { auto: true });
    if (res.ok) run.sent++;
    else if (res.skipped) run.skipped++;
    else {
      run.failed++;
      run.errors.push(res.error);
    }
  }
  return run;
}
