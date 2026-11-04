"use client";

import { LoaderCircle, MessageCircle, RotateCw, Send } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";
import {
  retryWhatsApp,
  sendReminderNow,
  setBillsOn,
  setRemindersOn,
} from "@/app/admin/(dashboard)/whatsapp/actions";
import { ActionSwitch } from "@/components/admin/action-switch";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { SendResult } from "@/lib/whatsapp/send";

/**
 * Runs a send and says how it went. WhatsApp not connected yet → opens WhatsApp on this phone with
 * the text filled in (no PDF), for staff to press Send.
 */
function useSend(send: () => Promise<SendResult>, done: string) {
  const [pending, start] = useTransition();
  const router = useRouter();
  const run = () =>
    start(async () => {
      const res = await send();
      if (res.ok) {
        toast.success(done);
        router.refresh();
      } else if (res.link) {
        toast.info("WhatsApp isn't connected yet – sending the text from this phone instead (no PDF).");
        window.open(res.link, "_blank", "noopener");
      } else toast.error(res.error);
    });
  return [pending, run] as const;
}

/** Owner: send this guest their dues and the statement PDF now. */
export function SendReminderButton({
  customer,
  prominent = false,
}: {
  customer: { id: string; name: string };
  /** filled WhatsApp-green button, for the customer page */
  prominent?: boolean;
}) {
  const [pending, run] = useSend(() => sendReminderNow(customer.id), `Reminder sent to ${customer.name}`);
  return (
    <Button
      size={prominent ? "lg" : "sm"}
      variant={prominent ? "default" : "outline"}
      className={cn(
        "rounded-full",
        prominent &&
          "bg-cta px-5 text-base font-bold text-cta-foreground shadow-lg ring-2 shadow-hh-orange/30 ring-hh-orange/40 ring-offset-2 ring-offset-transparent hover:bg-hh-orange-light",
      )}
      disabled={pending}
      onClick={run}
    >
      {pending ? (
        <LoaderCircle className="animate-spin" aria-hidden />
      ) : prominent ? (
        <Send data-icon="inline-start" />
      ) : (
        <MessageCircle data-icon="inline-start" />
      )}
      Send reminder now
    </Button>
  );
}

/** Owner: send a failed message again. */
export function RetryWhatsAppButton({ id }: { id: string }) {
  const [pending, run] = useSend(() => retryWhatsApp(id), "Sent again");
  return (
    <Button size="sm" variant="outline" className="rounded-full" disabled={pending} onClick={run}>
      {pending ? (
        <LoaderCircle className="animate-spin" aria-hidden />
      ) : (
        <RotateCw data-icon="inline-start" />
      )}
      Retry
    </Button>
  );
}

/** Owner: due reminders on or paused for one guest. */
export function RemindersSwitch({ customer }: { customer: { id: string; on: boolean } }) {
  return (
    <ActionSwitch
      checked={customer.on}
      action={(on) => setRemindersOn(customer.id, on)}
      label="Due reminders"
      successMessage={(on) => (on ? "Reminders on" : "Reminders paused")}
    />
  );
}

/** Owner: bills on WhatsApp on or off for one guest. */
export function BillsSwitch({ customer }: { customer: { id: string; on: boolean } }) {
  return (
    <ActionSwitch
      checked={customer.on}
      action={(on) => setBillsOn(customer.id, on)}
      label="Bills on WhatsApp"
      successMessage={(on) => (on ? "Bills will be sent on WhatsApp" : "No bills on WhatsApp for this guest")}
    />
  );
}
