import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ItemForm } from "@/components/admin/menu/item-form";
import { requireUser } from "@/lib/auth/dal";
import { getMenuItemForEdit } from "@/lib/data/admin-menu";
import { getItemFormOptions } from "../form-data";

export const metadata = { title: "Edit item" };

export default async function EditItemPage({ params }: PageProps<"/admin/menu/items/[id]">) {
  await requireUser("OWNER");
  const { id } = await params;
  const [item, options] = await Promise.all([getMenuItemForEdit(id), getItemFormOptions()]);
  if (!item) notFound();
  return (
    <div className="mx-auto max-w-5xl">
      <Link
        href="/admin/menu"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="size-4" aria-hidden /> Menu
      </Link>
      <h1 className="mt-2 mb-6 text-3xl font-bold">{item.name}</h1>
      <ItemForm {...options} item={item} />
    </div>
  );
}
