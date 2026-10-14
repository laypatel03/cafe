import { getCurrentUser } from "@/lib/auth/dal";
import { toCsv } from "@/lib/csv";
import { getMoneyBook } from "@/lib/data/money-book";
import { toRupees } from "@/lib/money";
import { margin, type MoneyRow, resolveMonth } from "@/lib/money-book";

export const dynamic = "force-dynamic";

const COLUMNS: [keyof MoneyRow, string][] = [
  ["cash", "Cash sales (₹)"],
  ["upi", "Google Pay / UPI sales (₹)"],
  ["credit", "Credit card sales (₹)"],
  ["debit", "Debit card sales (₹)"],
  ["sales", "Total sales (₹)"],
  ["cardFees", "Card fees (₹)"],
  ["expenses", "Expenses (₹)"],
  ["profit", "Profit (₹)"],
  ["cashExpenses", "Cash expenses (₹)"],
  ["cashLeft", "Cash left from the day (₹)"],
];

const money = (r: MoneyRow) => COLUMNS.map(([k]) => toRupees(r[k] as number));

/** Owner only: one month of the money book, a row per day, as a CSV file for Excel or Google Sheets. */
export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "Please log in again." }, { status: 401 });
  if (user.role !== "OWNER")
    return Response.json({ error: "Only the owner can download the money book." }, { status: 403 });

  const month = resolveMonth(new URL(req.url).searchParams.get("month") ?? undefined);
  const book = await getMoneyBook(month);
  const t = book.monthTotal;
  const csv = toCsv([
    ["Date", ...COLUMNS.map(([, label]) => label)],
    ...book.days.map((d) => [d.key, ...money(d)]),
    ["Total", ...money(t)],
    [],
    ["Profit margin (%)", Math.round(margin(t) * 1000) / 10],
    [
      "Card fees used",
      `credit ${book.fees.creditBps / 100}%, debit ${book.fees.debitBps / 100}% (set in Admin → Money book)`,
    ],
  ]);
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="healthy-hunger-money-book-${month}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
