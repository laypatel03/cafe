// Fills the LOCAL database with made-up customers, orders and bills for testing the dashboard.
//   pnpm db:demo            add ~60 customers and ~200 orders over the last 45 days
//   pnpm db:demo --clear    remove everything this script added
// Demo customers all have phone numbers starting 90000, which is how --clear finds them.
// Refuses to run in production. Run `pnpm db:seed` first so there is a menu to order from.
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, type OrderStatus, type PaymentMethod } from "../src/generated/prisma/client";

if (process.env.NODE_ENV === "production") {
  console.error("Demo data is for local development only.");
  process.exit(1);
}

const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });
const PHONE_PREFIX = "90000";
const DAYS = 45;
const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
const MINUTE = 60_000;

// seeded so every run gives the same shape of data
let seed = 20261016;
const rand = () => (seed = (seed * 1664525 + 1013904223) % 2 ** 32) / 2 ** 32;
const int = (min: number, max: number) => min + Math.floor(rand() * (max - min + 1));
const pick = <T>(list: readonly T[]) => list[Math.floor(rand() * list.length)];
const chance = (p: number) => rand() < p;

const FIRST = [
  "Aarav",
  "Vivaan",
  "Aditya",
  "Diya",
  "Ananya",
  "Ishaan",
  "Kavya",
  "Riya",
  "Arjun",
  "Saanvi",
  "Rohan",
  "Meera",
  "Kabir",
  "Priya",
  "Dev",
  "Neha",
  "Yash",
  "Pooja",
  "Karan",
  "Sneha",
  "Manav",
  "Tanvi",
  "Harsh",
  "Nisha",
  "Rahul",
  "Aisha",
  "Siddharth",
  "Zara",
  "Varun",
  "Isha",
];
const LAST = [
  "Patel",
  "Shah",
  "Mehta",
  "Desai",
  "Joshi",
  "Sharma",
  "Iyer",
  "Reddy",
  "Nair",
  "Gupta",
  "Kapoor",
  "Singh",
  "Trivedi",
  "Rao",
  "Bhatt",
];
const NOTES = ["Less spicy please", "No onion", "Extra sauce on the side", "Pack cutlery", "Less oil"];
const CANCEL_REASONS = ["Guest left", "Item sold out", "Ordered twice by mistake"];
const FLOW: OrderStatus[] = ["NEW", "ACCEPTED", "PREPARING", "READY", "SERVED", "PAID"];
const PAY: PaymentMethod[] = ["UPI", "UPI", "UPI", "CASH", "CASH", "CREDIT_CARD", "DEBIT_CARD"];

/** A time on an IST calendar day, `daysAgo` before today. */
function istTime(daysAgo: number, hour: number, minute: number) {
  const today = new Date(Date.now() + IST_OFFSET_MS);
  const utcMidnight = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate() - daysAgo);
  return new Date(utcMidnight - IST_OFFSET_MS + (hour * 60 + minute) * MINUTE);
}

async function clear() {
  const where = { customerPhone: { startsWith: PHONE_PREFIX } };
  const orders = await db.order.deleteMany({ where });
  const bills = await db.bill.deleteMany({ where });
  const customers = await db.customer.deleteMany({ where: { phone: { startsWith: PHONE_PREFIX } } });
  console.log(`Removed ${orders.count} demo orders, ${bills.count} bills, ${customers.count} customers.`);
}

async function main() {
  if (process.argv.includes("--clear")) return clear();
  if (await db.customer.count({ where: { phone: { startsWith: PHONE_PREFIX } } })) {
    console.log("Demo data is already there. Run `pnpm db:demo --clear` first to make it again.");
    return;
  }

  const [items, staff, settings] = await Promise.all([
    db.menuItem.findMany({ where: { visible: true }, include: { addOns: true } }),
    db.staffUser.findMany({ where: { active: true }, select: { id: true } }),
    db.cafeSettings.findUnique({ where: { id: 1 } }),
  ]);
  if (items.length === 0) throw new Error("No menu found – run `pnpm db:seed` first.");
  const taxBps = settings?.taxBasisPoints ?? 0;
  const staffId = () => (staff.length ? pick(staff).id : null);

  const customers = Array.from({ length: 60 }, (_, i) => ({
    name: `${pick(FIRST)} ${pick(LAST)}`,
    phone: `${PHONE_PREFIX}${String(10000 + i).slice(-5)}`,
    email: chance(0.4) ? `guest${i + 1}@example.com` : null,
    marketingConsent: chance(0.5),
    // a few regulars come back often; most visit once or twice
    weight: i < 10 ? 6 : i < 25 ? 2 : 1,
    stats: { orderCount: 0, totalSpendPaise: 0, first: null as Date | null, last: null as Date | null },
  }));
  const weighted = customers.flatMap((c) => Array<typeof c>(c.weight).fill(c));

  const ids = new Map<string, string>();
  for (const c of customers) {
    const row = await db.customer.create({
      data: { name: c.name, phone: c.phone, email: c.email, marketingConsent: c.marketingConsent },
    });
    ids.set(c.phone, row.id);
  }

  let orderCount = 0;
  let billCount = 0;

  /** One order with its items and status history. Returns its id and subtotal. */
  async function createOrder(
    c: (typeof customers)[number],
    type: "DINE_IN" | "PARCEL",
    at: Date,
    finalStatus: OrderStatus,
  ) {
    const lines = Array.from({ length: int(1, 3) }, () => {
      const item = pick(items);
      const addOns = item.addOns.length && chance(0.3) ? [pick(item.addOns)] : [];
      const unit = item.pricePaise + addOns.reduce((s, a) => s + a.pricePaise, 0);
      const quantity = chance(0.2) ? 2 : 1;
      return {
        menuItemId: item.id,
        itemName: item.name,
        unitPricePaise: unit,
        quantity,
        addOns: addOns.map((a) => ({ id: a.id, name: a.name, pricePaise: a.pricePaise })),
        lineTotalPaise: unit * quantity,
      };
    });
    const subtotalPaise = lines.reduce((s, l) => s + l.lineTotalPaise, 0);
    const taxPaise = Math.round((subtotalPaise * taxBps) / 10_000);

    const path: OrderStatus[] =
      finalStatus === "CANCELLED" ? ["NEW", "CANCELLED"] : FLOW.slice(0, FLOW.indexOf(finalStatus) + 1);
    const order = await db.order.create({
      data: {
        type,
        status: finalStatus,
        customerId: ids.get(c.phone),
        customerName: c.name,
        customerPhone: c.phone,
        note: chance(0.15) ? pick(NOTES) : null,
        subtotalPaise,
        taxPaise,
        totalPaise: subtotalPaise + taxPaise,
        cancelReason: finalStatus === "CANCELLED" ? pick(CANCEL_REASONS) : null,
        createdById: staffId(),
        createdAt: at,
        updatedAt: new Date(at.getTime() + path.length * 6 * MINUTE),
        items: { create: lines },
        statusLogs: {
          create: path.map((to, i) => ({
            fromStatus: i === 0 ? null : path[i - 1],
            toStatus: to,
            changedById: staffId(),
            createdAt: new Date(at.getTime() + i * 6 * MINUTE),
          })),
        },
      },
    });
    orderCount++;
    return { id: order.id, subtotalPaise, end: new Date(at.getTime() + path.length * 6 * MINUTE) };
  }

  for (let daysAgo = DAYS; daysAgo >= 0; daysAgo--) {
    const isToday = daysAgo === 0;
    const weekday = istTime(daysAgo, 12, 0).getUTCDay();
    const visits = isToday ? 6 : int(2, 5) + (weekday === 0 || weekday === 6 ? 2 : 0);
    const times = Array.from({ length: visits }, () => int(9 * 60, 21 * 60)).sort((a, b) => a - b);

    for (const [v, minuteOfDay] of times.entries()) {
      const c = pick(weighted);
      const type = chance(0.65) ? "DINE_IN" : "PARCEL";
      const at = istTime(daysAgo, Math.floor(minuteOfDay / 60), minuteOfDay % 60);

      // today's last few visits are still open, so the live orders screen has something to show
      if (isToday && v >= visits - 3) {
        await createOrder(c, type, at, pick(["NEW", "ACCEPTED", "PREPARING", "READY"] as OrderStatus[]));
        continue;
      }
      if (chance(0.05)) {
        await createOrder(c, type, at, "CANCELLED");
        continue;
      }

      // dine-in guests sometimes order a second round on the same bill
      const rounds = type === "DINE_IN" && chance(0.25) ? 2 : 1;
      const payLater = chance(0.04);
      const orders = [];
      for (let r = 0; r < rounds; r++)
        orders.push(
          await createOrder(c, type, new Date(at.getTime() + r * 25 * MINUTE), payLater ? "SERVED" : "PAID"),
        );

      const subtotalPaise = orders.reduce((s, o) => s + o.subtotalPaise, 0);
      const taxPaise = Math.round((subtotalPaise * taxBps) / 10_000);
      const billedAt = orders[orders.length - 1].end;
      const bill = await db.bill.create({
        data: {
          type,
          customerName: c.name,
          customerPhone: c.phone,
          subtotalPaise,
          taxBasisPoints: taxBps,
          taxPaise,
          totalPaise: subtotalPaise + taxPaise,
          paymentMethod: payLater ? null : pick(PAY),
          paidAt: payLater ? null : billedAt,
          payLaterAt: payLater ? billedAt : null,
          createdById: staffId(),
          createdAt: billedAt,
          orders: { connect: orders.map((o) => ({ id: o.id })) },
        },
      });
      billCount++;
      if (payLater) continue;
      c.stats.orderCount++;
      c.stats.totalSpendPaise += bill.totalPaise;
      c.stats.first ??= at;
      c.stats.last = billedAt;
    }
  }

  for (const c of customers) {
    const first = c.stats.first ?? istTime(int(0, DAYS), 12, 0);
    await db.customer.update({
      where: { phone: c.phone },
      data: {
        orderCount: c.stats.orderCount,
        totalSpendPaise: c.stats.totalSpendPaise,
        firstVisitAt: first,
        lastVisitAt: c.stats.last ?? first,
        consentAt: c.marketingConsent ? first : null,
        createdAt: first,
      },
    });
  }

  console.log(
    `Added ${customers.length} customers, ${orderCount} orders and ${billCount} bills over ${DAYS} days.`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
