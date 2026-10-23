import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { ItemForm } from "@/components/admin/menu/item-form";
import { requireUser } from "@/lib/auth/dal";
import { getItemFormOptions } from "../form-data";

export const metadata = { title: "Add item" };

export default async function NewItemPage({ searchParams }: PageProps<"/admin/menu/items/new">) {
  await requireUser("website");
  const [{ category }, options] = await Promise.all([searchParams, getItemFormOptions()]);
  return (
    <div className="mx-auto max-w-5xl">
      <Link
        href="/admin/menu"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="size-4" aria-hidden /> Menu
      </Link>
      <h1 className="mt-2 mb-6 text-3xl font-bold">Add item</h1>
      <ItemForm {...options} defaultCategoryId={typeof category === "string" ? category : undefined} />
    </div>
  );
}
