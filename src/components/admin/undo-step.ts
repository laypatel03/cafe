import { toast } from "sonner";
import { undoOrderStep } from "@/app/admin/(dashboard)/actions";

/** Take back an order's last step and say so; used by the Undo buttons and toasts on the live board. */
export async function undoStep(order: { id: string; number: number }, onChanged: () => void) {
  const res = await undoOrderStep(order.id);
  if (res.ok) {
    toast.success(`#${order.number} · “${res.label}” undone`);
    onChanged();
  } else toast.error(res.error);
}
