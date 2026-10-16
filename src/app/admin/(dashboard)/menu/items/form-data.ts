import "server-only";
import { db } from "@/lib/db";
import { toRupees } from "@/lib/money";

export async function getItemFormOptions() {
  const [categories, addOns] = await Promise.all([
    db.category.findMany({ orderBy: { sortOrder: "asc" }, select: { id: true, name: true } }),
    db.addOn.findMany({ orderBy: { sortOrder: "asc" }, select: { id: true, name: true, pricePaise: true } }),
  ]);
  return {
    categories,
    addOns: addOns.map((a) => ({ id: a.id, name: a.name, price: toRupees(a.pricePaise) })),
  };
}
