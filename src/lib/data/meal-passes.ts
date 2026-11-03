import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import { today } from "@/lib/data/cash";
import { db } from "@/lib/db";
import {
  type MealPart,
  mealsLeft,
  type MealsLeft,
  type PassStatus,
  passStatus,
  readParts,
} from "@/lib/meal-pass";

/** Uses that count against a pass: not on cancelled or deleted orders (those give the meal back). */
export const COUNTED_USES = {
  order: { deletedAt: null, status: { not: "CANCELLED" } },
} satisfies Prisma.MealPassUseWhereInput;

const passInclude = {
  uses: { where: COUNTED_USES, select: { part: true } },
} satisfies Prisma.MealPassInclude;

type PassRow = Prisma.MealPassGetPayload<{ include: typeof passInclude }>;
export type PassWithLeft = Omit<PassRow, "uses" | "parts"> & {
  parts: MealPart[];
  left: MealsLeft;
  status: PassStatus;
  used: number;
};

const withLeft = (p: PassRow, day: string): PassWithLeft => {
  const { uses, ...row } = p;
  const pass = { ...row, parts: readParts(row.parts) };
  const left = mealsLeft(pass, uses);
  return {
    ...pass,
    left,
    used: uses.length,
    status: passStatus({ ...pass, refunded: !!pass.refundedAt }, left, day),
  };
};

export async function getPasses(where: Prisma.MealPassWhereInput, day = today()) {
  const rows = await db.mealPass.findMany({ where, orderBy: { number: "desc" }, include: passInclude });
  return rows.map((p) => withLeft(p, day));
}

/** The pass a customer can use today: running, not refunded, meals left; the one ending first. */
export async function activePassFor(customerId: string, day = today()) {
  const passes = await getPasses(
    { customerId, refundedAt: null, startsOn: { lte: day }, endsOn: { gte: day } },
    day,
  );
  return (
    passes.filter((p) => p.status === "active").sort((a, b) => a.endsOn.localeCompare(b.endsOn))[0] ?? null
  );
}

export type LivePass = { number: number; planName: string; endsOn: string; parts: string[]; left: MealsLeft };

/** Active passes for the live board, by customer. */
export async function livePasses(customerIds: string[]): Promise<Record<string, LivePass>> {
  const day = today();
  const ids = [...new Set(customerIds)];
  if (!ids.length) return {};
  const passes = await getPasses(
    { customerId: { in: ids }, refundedAt: null, startsOn: { lte: day }, endsOn: { gte: day } },
    day,
  );
  const out: Record<string, LivePass> = {};
  for (const p of passes
    .filter((x) => x.status === "active")
    .sort((a, b) => b.endsOn.localeCompare(a.endsOn)))
    out[p.customerId!] = {
      number: p.number,
      planName: p.planName,
      endsOn: p.endsOn,
      parts: p.parts.map((x) => x.name),
      left: p.left,
    };
  return out;
}
